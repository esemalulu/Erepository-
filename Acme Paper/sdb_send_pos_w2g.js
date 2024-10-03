/**
 *@NApiVersion 2.1
 *@NScriptType Suitelet
 */
define(["N/record", "N/https"], function (record, https) {
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
            var conection = createConection(CREDENTIALS);
            var params = context.request.parameters;
            var orderIds = [params.orderId];

            var response = '';
            orderIds.forEach(function (id) {
                response += JSON.stringify(createPurchaseOrder(CREDENTIALS, conection, id));
            })

            context.response.write(response.indexOf("error") > -1 ? "Order Sent to W2G" : response);
            context.response.write("<script>window.close();</script>");
        } catch (error) {
            context.response.write(error);
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

    function createPurchaseOrder(CREDENTIALS, conection, orderId) {
        try {
            log.debug('id', orderId)
            var purchaseorder = record.load({
                type: record.Type.PURCHASE_ORDER,
                id: orderId,
                isDynamic: true

            });
            var orderObj = getOrderObj(purchaseorder, CREDENTIALS, conection);
            log.debug('orderObj', orderObj);
            var response = https.post({
                url: CREDENTIALS.base_url + "/v1/merchants/" + CREDENTIALS.merchantId + "/inbound_shipments",
                body: JSON.stringify(orderObj),
                headers: {
                    accept: 'application/json',
                    'content-type': 'application/json',
                    authorization: 'Bearer ' + conection.access_token
                },
            });
            try {
                response = JSON.parse(response.body);
                if (response.status) {
                    purchaseorder.setValue({
                        fieldId: 'custbody_sent_to_w2g',
                        value: true
                    });
                    purchaseorder.save();
                }
            } catch (error) {
                log.error("ERROR parse createpurchaseorder: ", error);
                return { error: error };
            }
            log.debug('RESPONSE createpurchaseorder: ', response);
            return response;
        } catch (error) {
            log.error("ERROR createpurchaseorder: ", error);
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

    function getOrderObj(purchaseOrder, CREDENTIALS, conection) {
        try {
            var arrItems = [];
            var itemLines = purchaseOrder.getLineCount({ sublistId: 'item' });
            for (var i = 0; i < itemLines; i++) {
                var upc = purchaseOrder.getSublistValue({
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

                arrItems.push({
                    skuId: '' + sku,
                    quantity: purchaseOrder.getSublistValue({
                        sublistId: 'item',
                        fieldId: 'quantity',
                        line: i,
                    }),
                    unitsPerPackage: 1, //??

                    skuName: purchaseOrder.getSublistValue({
                        sublistId: 'item',
                        fieldId: 'description',
                        line: i,
                    }),
                    upc: upc || "0000000000" + purchaseOrder.getSublistValue({
                        sublistId: 'item',
                        fieldId: 'item',
                        line: i,
                    }),
                    unitPrice: purchaseOrder.getSublistValue({
                        sublistId: 'item',
                        fieldId: 'rate',
                        line: i,
                    })
                });

                arrItems.forEach(item => {
                    delete item.unitPrice;
                    delete item.upc;
                    delete item.skuName;
                });
            }
            createItems(arrItems, CREDENTIALS, conection);

            var locationsMapping = {
                132: 2108, //NV
                131: 2104, //PA
                130: 2105  //TX
            };
            var netsuiteLocation = purchaseOrder.getValue({ fieldId: 'location' });

            var objToReturn = {
                destinationFacility: {
                    id: locationsMapping[netsuiteLocation] || "" //??
                },
                estimatedDeliveryDate: new Date(purchaseOrder.getValue({
                    fieldId: 'duedate'
                })).toISOString(), //"yyyy-mm-dd" ??
                items: arrItems,
                referenceId: purchaseOrder.getValue({ fieldId: 'tranid' })
            }
            return objToReturn;
        } catch (error) {
            log.error("ERROR getOrderObj: ", error);
        }

    }
    //#endregion
    return {
        onRequest: onRequest,
    };
});
