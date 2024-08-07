/**
 *@NApiVersion 2.1
 *@NScriptType Suitelet
 */
 define(["N/search", "N/record", "N/https"], function (search, record, https) {
    function onRequest(context) {
        try {
            log.debug('STATUS', 'INIT');
            let body = context.request.body && JSON.parse(context.request.body);
            log.debug('body', body);
            let params = context.request.parameters;
            log.debug('parameters', params);

            //#region ------ START ------ //
            if (body.data?.eventType == 'SHIPMENT_DELIVERED' || body.data?.eventType ==  'SHIPMENT_IN_TRANSIT') {

                var salesOrderNumbers = [params.path.match(/\/([^\/]*)$/)[1], body.data.salesOrderNumber];
                log.debug('Sales Order', salesOrderNumbers);

                var salesOrders = getSalesOrderFromTheOrderNumber(salesOrderNumbers);
                log.debug('Orders found', salesOrders);

                salesOrders.forEach(order => {
                    var trackerIds = getTrackerIds(salesOrderNumbers[0] || salesOrderNumbers[1]);

                    try {
                        var fullfilmentRecord = record.transform({
                            fromType: record.Type.SALES_ORDER,
                            fromId: order,
                            toType: record.Type.ITEM_FULFILLMENT,
                            // defaultValues: { }
                        });
                        fullfilmentRecord.setValue({
                            fieldId: 'memo',
                            value: trackerIds.toString()
                        });
                        log.debug('fullfilment record', fullfilmentRecord.save());
                    } catch (error) {
                        if (error.message.indexOf('Multi-Location Inventory') != -1) {
                            log.debug('Fullfilment from multiple locations', 'Starting multiple fulfills');

                            fullfilMultipleLocations(order);
                        } else log.error("ERROR: ", error);
                    }
                });
            } else if (body.data?.eventType == 'ASN_CLOSED') {

                var purchaseOrdersNumbers = [params.path.match(/\/([^\/]*)$/)[1], body.data.asnNumber];
                log.debug('Purchase Order', purchaseOrdersNumbers);
              
                var purchaseOrders = getPurchaseOrderFromTheOrderNumber(purchaseOrdersNumbers);
                log.debug('Orders found', purchaseOrders);

                purchaseOrders.forEach(order => {
                    try {
                        var receiptRecord = record.transform({
                            fromType: record.Type.PURCHASE_ORDER,
                            fromId: order,
                            toType: record.Type.ITEM_RECEIPT
                        });
                        log.debug('receipt record', receiptRecord.save());
                    } catch (error) {
                        if (error.message.indexOf('Multi-Location Inventory') != -1) {
                            log.debug('receipt from multiple locations', 'Starting multiple fulfills');

                            receiptMultipleLocations(order);
                        } else log.error("ERROR: ", error);
                    }
                });
            }
            //#endregion ----------------- //
        } catch (error) {
            log.error("ERROR: ", error);
        }
    }

    //#region --------------------------------------- AUXILIAR FUNCTIONS -------------------------------------------

    function createConection(CREDENTIALS) {
        try {
            var response = https.post({
                url: CREDENTIALS.oauth_domain + "/auth/realms/ware2go/protocol/openid-connect/token",
                body: {
                    grant_type: 'client_credentials',
                    client_secret: CREDENTIALS.secret,
                    client_id: CREDENTIALS.user
                },
                headers: {
                    accept: 'application/json',
                    'content-type': 'application/x-www-form-urlencoded'
                },
            });
            try {
                response = JSON.parse(response.body);
            } catch (error) {
                log.error("ERROR parse createConection: ", error);
                return { error: error };
            }
            log.debug('RESPONSE createConection: ', response)
            return response;
        } catch (error) {
            log.error("ERROR createConection: ", error);
        }
    }

    //#region SALES ORDERS FUNCTIONS
    function getSalesOrderFromTheOrderNumber(salesOrderNumbers) {
        var SalesOrders = [];
        var salesorderSearchObj = search.create({
            type: "salesorder",
            filters:
                [
                    ["type", "anyof", "SalesOrd"],
                    "AND",
                    ["tranid", "anyof", salesOrderNumbers[0], salesOrderNumbers[1]],
                    "AND",
                    ["mainline", "is", "T"]
                ],
            columns:
                [
                    search.createColumn({ name: "internalid", label: "Internal ID" })
                ]
        });
        salesorderSearchObj.run().each(function (result) {
            var id = result.getValue("internalid");
            if (id) SalesOrders.push(id);

            return true;
        });

        return SalesOrders;
    }

    function fullfilMultipleLocations(orderId) {
        var locations = getOrderLocations(orderId);
        log.debug('Locations', locations);

        var fullfilmentPerLocation = []
        locations.forEach(location => {
            var fullfilmentRecordForLocation = record.transform({
                fromType: record.Type.SALES_ORDER,
                fromId: orderId,
                toType: record.Type.ITEM_FULFILLMENT
            });
            selectLocationItems(location, fullfilmentRecordForLocation);

            var trackerIds = getTrackerIds(orderNumber);
            fullfilmentRecordForLocation.setValue({
                fieldId: 'memo',
                value: trackerIds.toString()
            });

            fullfilmentPerLocation.push(fullfilmentRecordForLocation.save());
        });

        log.debug('fullfilment records', fullfilmentPerLocation);
    }

    function getTrackerIds(orderNumber) {
        try {
            const CREDENTIALS = { merchantId: "A5G6J", user: "AcmePaper", secret: "UK19aMfMn4LFMhBxOkuYgRlFTOWFjhp3", oauth_domain: "https://auth.ware2go.io", base_url: "https://openapi.ware2go.io" };
            var conection = createConection(CREDENTIALS);
            var response = https.get({
                url: CREDENTIALS.base_url + "/v1/merchants/" + CREDENTIALS.merchantId + "/orders/" + orderNumber,
                headers: {
                    accept: 'application/json',
                    'content-type': 'application/json',
                    authorization: 'Bearer ' + conection.access_token
                },
            });
            log.debug('GET tracking number response ' + response.code, response.body);

            let packages = JSON.parse(response.body).packages;
            log.debug('packages', packages);

            let trackingNumbers = packages.map(item => item.trackingNumber + ': ' + item.contents.map(content => content.sku).toString());
            log.debug('tracking numbers', trackingNumbers);

            return trackingNumbers;
        } catch (error) {
            log.error('Error getting tracking number in order' + orderNumber, error);
        }
    }

    //#endregion

    //#region PURCHASE ORDERS FUNCTIONS
    function getPurchaseOrderFromTheOrderNumber(purchaseOrdersNumbers) {
        var PurchaseOrders = [];
        var purchaseOrderorderSearchObj = search.create({
            type: "purchaseorder",
            filters:
                [
                    ["type", "anyof", "PurchOrd"],
                    "AND",
                    ["tranid", "anyof", purchaseOrdersNumbers[0], purchaseOrdersNumbers[1]],
                    "AND",
                    ["mainline", "is", "T"]
                ],
            columns:
                [
                    search.createColumn({ name: "internalid", label: "Internal ID" })
                ]
        });
        purchaseOrderorderSearchObj.run().each(function (result) {
            var id = result.getValue("internalid");
            if (id) PurchaseOrders.push(id);

            return true;
        });

        return PurchaseOrders;
    }


    function receiptMultipleLocations(orderId) {
        var locations = getOrderLocations(orderId);
        log.debug('Locations', locations);

        var receiptPerLocation = []
        locations.forEach(location => {
            var receiptRecordForLocation = record.transform({
                fromType: record.Type.PURCHASE_ORDER,
                fromId: orderId,
                toType: record.Type.ITEM_RECEIPT
            });
            selectLocationItems(location, receiptRecordForLocation);

            receiptPerLocation.push(receiptRecordForLocation.save());
        });

        log.debug('receipt records', receiptPerLocation);
    }
    //#endregion

    function selectLocationItems(location, fullfilmentRecord) {
        try {
            var lineCount = fullfilmentRecord.getLineCount({
                sublistId: 'item'
            });

            for (var i = 0; i < lineCount; i++) {
                var itemLocation = fullfilmentRecord.getSublistValue({
                    sublistId: 'item',
                    fieldId: 'location',
                    line: i
                });

                var shouldFulfill = (itemLocation == location);

                fullfilmentRecord.setSublistValue({
                    sublistId: 'item',
                    fieldId: 'itemreceive',
                    line: i,
                    value: shouldFulfill
                });
            }
        } catch (error) {
            log.error('error in fullfilment for location: ' + location, error);
        }
    }

    function getOrderLocations(orderId) {
        var locations = [];
        var transactionSearchObj = search.create({
            type: "transaction",
            filters:
                [
                    ["internalid", "anyof", orderId]
                ],
            columns:
                [
                    search.createColumn({
                        name: "location",
                        summary: "GROUP",
                        label: "Warehouse"
                    })
                ]
        });

        transactionSearchObj.run().each(function (result) {
            var location = result.getValue({
                name: "location",
                summary: "GROUP"
            });
            if (location) locations.push(location);

            return true;
        });

        return locations;
    }

    //#endregion
    return {
        onRequest: onRequest,
    };
});
