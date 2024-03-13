/**
 *@NApiVersion 2.x
 *@NScriptType Suitelet
 */
define(['N/record', 'N/error', 'N/search'],
    function (record, error, search) {
        function onRequest(context) {
            if (context.request.method === 'GET') {
                try {
                    var sointid = context.request.parameters.sointid;
                    var soaction = context.request.parameters.soaction;
                    log.debug({
                        title: 'sointid / soaction',
                        details: JSON.stringify({
                            sointid: sointid,
                            soaction: soaction
                        })
                    });

                    var confirmationMessage = '';

                    /*
                     * This action looks at oneprice renewal sales orders,
                     * inspects any licenses on the order to see if any update is needed to those licenses for migration,
                     * then populate product tokens on those licenses when needed.
                     * Currently IVM-SUB and IDR-SUB migrations are supported.
                    */
                    if (soaction == 'migrate-to-oneprice') {
                        log.debug({
                            title: 'evaluating sales order for oneprice migration - ' + sointid
                        });

                        var soRec = record.load({
                            type: 'salesorder',
                            id: sointid,
                            isDynamic: false
                        });

                        for (var i = 0; i < soRec.getLineCount({ sublistId: 'item' }); i++) {
                            var oneItemFlow = soRec.getSublistValue({ sublistId: 'item', fieldId: 'custcolr7_one_item_flow', line: i });
                            var isACL = soRec.getSublistValue({ sublistId: 'item', fieldId: 'custcolr7transautocreatelicense', line: i });
                            var productToken = soRec.getSublistValue({ sublistId: 'item', fieldId: 'custcolr7producttoken', line: i });
                            var productKey = soRec.getSublistValue({ sublistId: 'item', fieldId: 'custcolr7itemmsproductkey', line: i });

                            log.debug({
                                title: 'oneItemFlow / isACL / productToken / productKey',
                                details: JSON.stringify({
                                    oneItemFlow: oneItemFlow,
                                    isACL: isACL,
                                    productToken: productToken,
                                    productKey: productKey
                                })
                            });

                            if (oneItemFlow == 3 && isACL == true) {
                                if (productToken == '' || productKey == '') {
                                    throw error.create({
                                        name: 'LICENSE_NOT_READY_TO_MIGRATE',
                                        message: 'A product token or product key is missing on the sales order line.'
                                    });
                                }

                                //find the license
                                var lfmColumns = [];
                                lfmColumns.push(search.createColumn({ name: 'custrecordr7licfmnexposelicense' }));
                                lfmColumns.push(search.createColumn({ name: 'custrecordr7licfmuserinsightplatlicrec' }));
                                lfmColumns.push(search.createColumn({ name: 'custrecordr7licfmmetasploitlicenserec' }));

                                var lfmFilters = [];
                                lfmFilters.push(search.createFilter({ name: 'custrecordr7licfmproductkey', operator: search.Operator.IS, values: productKey }));
                                var lfmSearch = search.create({
                                    type: 'customrecordr7licensefeaturemanagement',
                                    filters: lfmFilters,
                                    columns: lfmColumns
                                }).run().getRange({ start: 0, end: 1 });
                                var nexposeLicId = lfmSearch[0].getValue({ name: 'custrecordr7licfmnexposelicense' });
                                var insightLicId = lfmSearch[0].getValue({ name: 'custrecordr7licfmuserinsightplatlicrec' });
                                var metasploitLicId = lfmSearch[0].getValue({ name: 'custrecordr7licfmmetasploitlicenserec' });
                                log.debug({
                                    title: 'nexposeLicId / insightLicId',
                                    details: JSON.stringify({
                                        nexposeLicId: nexposeLicId,
                                        insightLicId: insightLicId,
                                        metasploitLicId: metasploitLicId
                                    })
                                });

                                //throw error.create({
                                //    name: 'STOP_HERE',
                                //    message: 'Process ended :)'
                                //});

                                //NEXPOSE
                                if (productToken && nexposeLicId != '') {
                                    var nexposeLicRec = record.load({
                                        type: 'customrecordr7nexposelicensing',
                                        id: nexposeLicId,
                                        isDynamic: false
                                    });
                                    var nexposeCurrentProdToken = nexposeLicRec.getValue({
                                        fieldId: 'custrecordr7nxproducttoken'
                                    });
                                    if (nexposeCurrentProdToken == '') {
                                        nexposeLicRec.setValue({
                                            fieldId: 'custrecordr7nxproducttoken',
                                            value: productToken
                                        });
                                        nexposeLicRec.save();
                                        log.debug('Updated NXL' + nexposeLicId, 'Added productToken ' + productToken);
                                        confirmationMessage += 'Updated NXL' + nexposeLicId + ' - Added productToken ' + productToken + '\n';
                                    }
                                    else {
                                        if (nexposeCurrentProdToken != productToken) {
                                            throw error.create({
                                                name: 'LICENSE_PRODUCT_TOKEN_CONFLICT',
                                                message: 'A license on the order has a conflicting product token. License has ' + nexposeCurrentProdToken + ' and Sales Order line has ' + productToken
                                            });
                                        }
                                    }
                                }

                                //INSIGHT
                                if (productToken && insightLicId != '') {
                                    var insightLicRec = record.load({
                                        type: 'customrecordr7insightplatform',
                                        id: insightLicId,
                                        isDynamic: false
                                    });
                                    var insightCurrentProdToken = insightLicRec.getValue({
                                        fieldId: 'custrecordr7inpproducttoken'
                                    });
                                    if (insightCurrentProdToken == '') {
                                        insightLicRec.setValue({
                                            fieldId: 'custrecordr7inpproducttoken',
                                            value: productToken
                                        });
                                        insightLicRec.save();
                                        log.debug('Updated INP' + insightLicId, 'Added productToken ' + productToken);
                                        confirmationMessage += 'Updated INP' + insightLicId + ' - Added productToken ' + productToken + '\n';
                                    }
                                    else {
                                        if (insightCurrentProdToken != productToken) {
                                            throw error.create({
                                                name: 'LICENSE_PRODUCT_TOKEN_CONFLICT',
                                                message: 'A license on the order has a conflicting product token. License has ' + insightCurrentProdToken + ' and Sales Order line has ' + productToken
                                            });
                                        }
                                    }
                                }

                                //METASPLOIT
                                if (productToken && metasploitLicId != '') {
                                    var metaSploitLicRec = record.load({
                                        type: 'customrecordr7metasploitlicensing',
                                        id: metasploitLicId,
                                        isDynamic: false
                                    });
                                    var metaSploitCurrentProdToken = metaSploitLicRec.getValue({
                                        fieldId: 'custrecordr7msproducttoken'
                                    });
                                    if (metaSploitCurrentProdToken == '') {
                                        metaSploitLicRec.setValue({
                                            fieldId: 'custrecordr7msproducttoken',
                                            value: productToken
                                        });
                                        metaSploitLicRec.save();
                                        log.debug('Updated MSL' + metasploitLicId, 'Added productToken ' + productToken);
                                        confirmationMessage += 'Updated MSL' + metasploitLicId + ' - Added productToken ' + productToken + '\n';
                                    }
                                    else {
                                        if (metaSploitCurrentProdToken != productToken) {
                                            throw error.create({
                                                name: 'LICENSE_PRODUCT_TOKEN_CONFLICT',
                                                message: 'A license on the order has a conflicting product token. License has ' + metaSploitCurrentProdToken + ' and Sales Order line has ' + productToken
                                            });
                                        }
                                    }
                                }


                            }
                        }

                        log.debug({
                            title: 'finished evaluating sales order ' + sointid
                        });

                        if (confirmationMessage == '') {
                            confirmationMessage = 'Finished evaluating sales order. No OnePrice migrations are required on this order.';
                        }

                        context.response.write(confirmationMessage);
                    }
                }
                catch (e) {
                    log.error({
                        title: 'error',
                        details: JSON.stringify(e)
                    });
                    context.response.write(e.name + '\n' + e.message + '\n');
                }

            }
        }
        return {
            onRequest: onRequest
        };
    });