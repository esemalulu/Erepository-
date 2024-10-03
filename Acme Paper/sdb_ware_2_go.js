/**
 *@NApiVersion 2.1
 *@NScriptType Suitelet
 */
 define(["N/search", "N/record", "N/https"], function (search, record, https) {
    const itemsMapper = {
        sku: {
            1129636: "WC09",
            1129637: "WC12"
        }
    }

    function onRequest(context) {
        try {
            log.debug('STATUS', 'INIT');
            const CREDENTIALS = { merchantId: "A5G6J", user: "AcmePaper", secret: "UK19aMfMn4LFMhBxOkuYgRlFTOWFjhp3", oauth_domain: "https://auth.ware2go.io", base_url: "https://openapi.ware2go.io" };
            var conection = createConection(context, CREDENTIALS);
            var params = context.request.parameters;
            var orderIds = [params.orderId];
          log.debug('INIT: ', {orderIds, conection, CREDENTIALS})
            orderIds.forEach(function (id) {
               createSalesOrder(context, CREDENTIALS, conection, id);
            })
            // getOrganization(context, CREDENTIALS, conection);
            context.response.write('Order sent to Ware 2 Go');
            context.response.write("<script>window.close();</script>");
        } catch (error) {
            context.response.write(error);
            log.error("ERROR: ", error);
        }
    }

    //--------------------------------------- AUXILIAR FUNCTIONS -------------------------------------------


    function createConection(context, CREDENTIALS) {
        try {
            var response = https.post({
                url: CREDENTIALS.oauth_domain + "/auth/realms/ware2go/protocol/openid-connect/token",
                body: {
                    grant_type: 'client_credentials',
                    client_secret: CREDENTIALS.secret, //'PFGNALt3GuDPQb6T2wP4Z6vXWEj3G8vU',
                    client_id: CREDENTIALS.user //'AcmePaper'
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

    function createSalesOrder(context, CREDENTIALS, conection, orderId) {
        try {
            var salesOrder = record.load({
                type: 'salesorder',
                id: orderId,
                isDynamic: true

            });
            var orderObj = getOrderObj(salesOrder, CREDENTIALS, conection);
            log.debug('orderObj', orderObj);
            var response = https.post({
                url: CREDENTIALS.base_url + "/v1/merchants/" + CREDENTIALS.merchantId + "/orders",
                body: JSON.stringify(orderObj),
                headers: {
                    accept: 'application/json',
                    'content-type': 'application/json',
                    authorization: 'Bearer ' + conection.access_token
                },
            });
            try {
                response = JSON.parse(response.body);
            } catch (error) {
                log.error("ERROR parse createSalesOrder: ", error);
                return { error: error };
            }
            log.debug('RESPONSE createSalesOrder: ', response);
        } catch (error) {
            log.error("ERROR createSalesOrder: ", error);
        }
    }

    function itemExist(skuId, CREDENTIALS, conection) {
        try {
            var response = https.get({
                url: CREDENTIALS.base_url + "/v1/merchants/" + CREDENTIALS.merchantId + "/inventory/" + skuId,
                headers: {
                    accept: 'application/json',
                    authorization: 'Bearer ' + conection.access_token
                },
            });
            try {
                response = JSON.parse(response.body);
                log.debug('response itemExist', response);
                return response && response.meta && !response.error;
            } catch (error) {
                log.error("ERROR parse itemExist: ", error);
                return false;
            }
        } catch (error) {
            log.error("ERROR itemExist: ", error);
        }
    }

    function createItems(arrItems, CREDENTIALS, conection) {
        try {
            arrItems.forEach(function (item) {
                if (itemExist(item.skuId, CREDENTIALS, conection)) return;
                var request = {
                    "unitCost": {
                        "amount": 1,
                        "currencyCode": "USD"
                    },
                    "unitPrice": {
                        "amount": item.unitPrice,
                        "currencyCode": "USD"
                    },
                    "skuType": "FINISHED_GOOD",
                    "skuId": item.skuId,
                    "upc": item.upc,
                    "skuName": item.skuName,
                    "length": 1,
                    "width": 1,
                    "height": 1,
                    "weight": 1
                }
                log.debug('CREATE ITEM', request);
                var response = https.post({
                    url: CREDENTIALS.base_url + "/v1/merchants/" + CREDENTIALS.merchantId + "/inventory",
                    body: JSON.stringify(request),
                    headers: {
                        accept: 'application/json',
                        'content-type': 'application/json',
                        authorization: 'Bearer ' + conection.access_token
                    },
                });
                try {
                    response = JSON.parse(response.body);
                } catch (error) {
                    log.error("ERROR parse createItems: ", error);
                    return { error: error };
                }
                log.debug('RESPONSE createItems: ', response)
            });
        } catch (error) {
            log.error("ERROR createItems: ", error);
        }
    }

    function getOrderObj(salesOrder, CREDENTIALS, conection) {
        try {
            var arrItems = [];
            var itemLines = salesOrder.getLineCount({ sublistId: 'item' })
            for (var i = 0; i < itemLines; i++) {
                var upc = salesOrder.getSublistValue({
                    sublistId: 'item',
                    fieldId: 'custcol_sps_upc',
                    line: i,
                });
                while (upc && upc.length < 12) {
                    upc = "0" + upc;
                }

                var sku = search.lookupFields({
                    type: 'item',
                    id: salesOrder.getSublistValue({
                        sublistId: 'item',
                        fieldId: 'item',
                        line: i,
                    }),
                    columns: 'itemid'
                }).itemid;

                if (itemsMapper.sku[sku]) {
                    log.debug('Changing items SKU id', 'from: ' + sku + ' to: ' + itemsMapper.sku[sku]);
                    sku = itemsMapper.sku[sku];
                }
                // log.debug('SKU', sku)

                arrItems.push({
                    skuId: '' + sku,
                    skuName: salesOrder.getSublistValue({
                        sublistId: 'item',
                        fieldId: 'description',
                        line: i,
                    }),
                    unitQuantity: salesOrder.getSublistValue({
                        sublistId: 'item',
                        fieldId: 'quantity',
                        line: i,
                    }),
                    upc: upc || "0000000000" + salesOrder.getSublistValue({
                        sublistId: 'item',
                        fieldId: 'item',
                        line: i,
                    }),
                    // upc: salesOrder.getSublistValue({
                    //     sublistId: 'item',
                    //     fieldId: 'custcol_sps_upc',
                    //     line: i,
                    // }),
                    unitPrice: salesOrder.getSublistValue({
                        sublistId: 'item',
                        fieldId: 'rate',
                        line: i,
                    })
                });
            }
            createItems(arrItems, CREDENTIALS, conection);
            var shippingAddrSubRecord = salesOrder.getSubrecord('shippingaddress');
            var billingAddrSubRecord = salesOrder.getSubrecord('shippingaddress');
            var objToReturn = {
                warehouseFacility: { id: salesOrder.getValue('location'), name: salesOrder.getText('location') },
                shippingSpeed: 'ECONOMY',
                referenceId: salesOrder.getValue('tranid'),
                purchaseOrderNumber: salesOrder.getValue('otherrefnum'),
                // customerId: salesOrder.getValue('entity'), //it would set retail compliance to Yes
                skuQuantities: arrItems,
                priority: 'STANDARD',
                companyName: salesOrder.getText('entity') ?? "",
                attnTo: salesOrder.getValue('shipattention') ?? "",
                address1: shippingAddrSubRecord.getValue('addr1') ?? "",
                address2: shippingAddrSubRecord.getValue('addr2') ?? "",
                city: shippingAddrSubRecord.getValue('city') ?? "",
                state: shippingAddrSubRecord.getValue('state') ?? "",
                zipCode: shippingAddrSubRecord.getValue('zip') ?? "",
                country: shippingAddrSubRecord.getValue('country') ?? "",
                billToName: salesOrder.getValue('billaddress')?.split('\n')[0] ?? "",
                billToAddress1: billingAddrSubRecord.getValue('addr1') ?? "",
                billToAddress2: billingAddrSubRecord.getValue('addr2') ?? "",
                billToCity: billingAddrSubRecord.getValue('city') ?? "",
                billToState: billingAddrSubRecord.getValue('state') ?? "",
                billToZipCode: billingAddrSubRecord.getValue('zip') ?? "",
                billToCountry: billingAddrSubRecord.getValue('country') ?? "",
                notes: salesOrder.getValue('custbody_invoice_comments') ?? ""
            }
            return objToReturn
        } catch (error) {
            log.error("ERROR getOrderObj: ", error);
        }

    }
    return {
        onRequest: onRequest,
    };
});
