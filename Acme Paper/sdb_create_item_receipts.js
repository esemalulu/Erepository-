/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
*/
define(["N/log", "N/record", "N/search", "N/https", "N/runtime"],
    function (log, record, search, https, runtime) {
        const CREDENTIALS = { merchantId: "A5G6J", user: "AcmePaper", secret: "UK19aMfMn4LFMhBxOkuYgRlFTOWFjhp3", oauth_domain: "https://auth.ware2go.io", base_url: "https://openapi.ware2go.io" };
        function getInputData() {
            try {
                return search.load({
                    id: 'customsearch6191',
                });
            } catch (error) {
                log.error('Error loading the search: ', error)
            }
        }
        function map(context) {
            try {
                var conection = createConection(CREDENTIALS);

                let data = JSON.parse(context.value);
                if (!data) return;
                // log.debug('data', data);

                let dataValues = data.values;
                if (!dataValues) return;
                // log.debug('dataValues', dataValues);

                var orderId = data.id;
                // log.debug('orderId', orderId);

                var status = getOrderStatus(dataValues.tranid, conection);
                log.debug(orderId + ' status', status);

                if (status == 'RECEIVED') {
                    try {
                        var receiptRecord = record.transform({
                            fromType: record.Type.PURCHASE_ORDER,
                            fromId: orderId,
                            toType: record.Type.ITEM_RECEIPT
                        });
                        log.debug('receipt record', receiptRecord.save());
                    } catch (error) {
                        if (error.message.indexOf('Multi-Location Inventory') != -1) {
                            log.debug('receipt from multiple locations', 'Starting multiple fulfills');

                            receiptMultipleLocations(orderId);
                        } else log.error("ERROR: ", error);
                    }
                }
            } catch (error) {
                log.error('Error sending order ' + orderId, error);
            }
        }

        //#region --------------------------------- AUXILIAR FUNCTIONS ---------------------------------
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
        //#region Connection Functions
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
                return response;
            } catch (error) {
                log.error("ERROR createConection: ", error);
            }
        }

        function getOrderStatus(orderId, conection) {
            var response = https.get({
                url: CREDENTIALS.base_url + "/v1/merchants/" + CREDENTIALS.merchantId + "/inbound_shipments/" + orderId,
                headers: {
                    accept: 'application/json',
                    authorization: 'Bearer ' + conection.access_token
                },
            });
            var body = response.body;
            log.debug('response', body);

            return JSON.parse(body).status;
        }
        //#endregion Connection Functions

        //#endregion

        return {
            getInputData: getInputData,
            map: map,
            // reduce: reduce,
            // summarize: summarize
        };
    }
);