/**
 *@NApiVersion 2.1
 *@NScriptType MapReduceScript
 */
define(["N/search", "N/record", "N/log", "N/encode", "N/file", "N/email", "N/runtime", "N/query"], function (search, record, log, encode, file, email, runtime, query) {

    function getInputData() {
        try {
            let scriptObj = runtime.getCurrentScript();
            let fileId = scriptObj.getParameter('custscript_sdb_id_file');

            let fileData = file.load({
                id: fileId
            });

            return fileData;
        }
        catch (error) {
            log.error('error en get inputdata', error);
        }

    }
    function map(context) {
        try {
            if (context.key == 0) return;
            let lineValues = context.value.split(',');
            let infoItem = searchItemBySapCode_2(lineValues[1]);
            log.audit('infoItem', infoItem);
            let keys = {
                contractID: lineValues[0],
                sapCode: lineValues[1],
                itemId: infoItem.id || '',
                price: lineValues[2],
            };
            log.debug('keys', keys);
            let statusCode = searchLineItemRecord(keys);
            log.debug('update number', context.key)

            context.write({
                key: context.key,
                value: Number(statusCode)
            });

        }
        catch (error) {
            error('error at the map line:', Number(context.
                log.key) + ' ' + error.message);
        }
    }
    function summarize(summaryContext) {
        let groups = {};
        log.debug('summaryContext', summaryContext.mapSummary);
        summaryContext.output.iterator().each(function (key, value) {
            if (!groups[value]) {
                groups[value] = [];
            }
            groups[value].push(value);
            return true;
        });
        log.audit('groups create', groups?.['1']?.length)
        log.audit('groups update', groups?.['2']?.length)
        log.audit('groups faild', groups?.['3']?.length)

        record.submitFields({
            type: 'customrecord_sdb_update_item_price',
            id: 1,
            values: {
                custrecord_sdb_all_rows: groups?.['1']?.length || 0,
                custrecord_sdb_update_item_count: groups?.['2']?.length || 0,
                custrecord_sdb_count_item_error: groups?.['3']?.length || 0,
            }
        })
        log.debug('groups', groups);
    }
    function searchContractByCustomer(objCsv) {
        var customrecord_acme_cust_price_contractsSearchObj = search.create({
            type: "customrecord_acme_cust_price_contracts",
            filters:
                [
                    ["custrecord_acme_cpc_cust_header.custrecord_acme_cpc_line_customer", "anyof", objCsv.customer]
                ],
            columns:
                [
                    search.createColumn({
                        name: "name",
                        sort: search.Sort.ASC,
                        label: "ID"
                    })
                ]
        });
        var searchResultCount = customrecord_acme_cust_price_contractsSearchObj.runPaged().count;
        log.debug("searchContractByCustomerresult count", searchResultCount);
        // Dont RESULT SKIP LINE    
        if (searchResultCount <= 0) return;
        var ids = [];
        customrecord_acme_cust_price_contractsSearchObj.run().each(function (result) {
            ids.push(result.id);
            //Get id Subrecord line contract
            let idSubrecordLine = searchContractByLinePrice(result.id, objCsv.sapCode);
            if (!idSubrecordLine) {
                // If subrecordLine dont exist Create line record with asociate parent
                createRecordLine(result.id, objCsv);
                return
            }
            record.submitFields({
                type: 'customrecord_acme_cust_price_contract_ln',
                id: idSubrecordLine,
                values: {
                    custrecord_acme_cpc_line_price: objCsv.price
                },
                options: {
                    enablesourcing: true,
                }
            });
            log.debug('Update record', idSubrecordLine);

            return true;
        });
        log.debug('ids', ids)
    }
    function searchContractByLinePrice(idRcd, idSap) {
        var customrecord_acme_cust_price_contractsSearchObj = search.create({
            type: "customrecord_acme_cust_price_contracts",
            filters:
                [
                    ["internalid", "anyof", idRcd],
                    "AND",
                    ["custrecord_acme_cpc_item_header.custrecord_sap_code", "is", idSap]
                ],
            columns:
                [
                    search.createColumn({
                        name: "name",
                        sort: search.Sort.ASC,
                        label: "ID"
                    }),
                    search.createColumn({
                        name: "internalid",
                        join: "CUSTRECORD_ACME_CPC_ITEM_HEADER",
                        label: "Internal ID"
                    })

                ]
        });
        var searchResultCount = customrecord_acme_cust_price_contractsSearchObj.runPaged().count;
        log.debug("customrecord_acme_cust_price_contractsSearchObj result count", searchResultCount);
        var idSubRecord = false;
        if (searchResultCount <= 0) return idSubRecord;
        customrecord_acme_cust_price_contractsSearchObj.run().each(function (result) {
            // .run().each has a limit of 4,000 results 
            idSubRecord = result.getValue({
                name: "internalid", // Nombre del campo que deseas recuperar del join
                join: "CUSTRECORD_ACME_CPC_ITEM_HEADER"
            });
            log.debug('idSubRecord', idSubRecord)
            return true;
        });
        return idSubRecord
    }
    function searchCustomerId(entityID) {
        var itemSearchObj = search.create({
            type: "customer",
            filters:
                [
                    ["entityid", "is", entityID]
                ],
            columns:
                [
                    search.createColumn({ name: "internalid", label: "Internal ID" })
                ]
        });
        var searchResultCount = itemSearchObj.runPaged().count;
        log.debug("customer result count", searchResultCount);
        let idItem;
        itemSearchObj.run().each(function (result) {
            idItem = result.id;
            log.debug('idItem', idItem);
            return true;
        });
        return idItem;
    }

    function createRecordLine(objCsv) {
        try {
            var recordLine = record.create({
                type: 'customrecord_acme_cust_price_contract_ln',
                isDynamic: true,
            });
            recordLine.setValue({
                fieldId: 'custrecord_acme_cpc_line_item', // Reemplaza 'fieldId' con el ID del campo real
                value: objCsv.itemId // El valor que deseas establecer
            });

            recordLine.setValue({
                fieldId: 'custrecord_sap_code',
                value: objCsv.sapCode
            });

            recordLine.setValue({
                fieldId: 'custrecord_acme_cpc_line_price',
                value: objCsv.price
            });

            recordLine.setValue({
                fieldId: 'custrecord_acme_cpc_item_header',
                value: objCsv.contractID
            });

            let recordId = recordLine.save({});
            log.debug('recordId create', recordId)
        } catch (error) {
            log.debug('error en la funcion createRecordLine', error);
        }

    }

    // ----------------- NEW FEACTURES -----------------
    // function searchItemBySapCode(sapCode) {
    //     try {
    //         var itemSearchObj = search.create({
    //             type: "item",
    //             filters:
    //                 [
    //                     ["custitem_acc_sap_code", "is", sapCode]
    //                 ],
    //             columns:
    //                 [
    //                     search.createColumn({
    //                         name: "itemid",
    //                         sort: search.Sort.ASC,
    //                         label: "Name"
    //                     }),
    //                     search.createColumn({ name: "vendor", label: "Preferred Vendor" }),
    //                     search.createColumn({ name: "custitem_acc_commodity_code", label: "Commodity Code" })
    //                 ]
    //         });
    //         var searchResultCount = itemSearchObj.runPaged().count;
    //         log.debug("itemSearchObj result count sapCode. item", searchResultCount);
    //         let item = {};
    //         itemSearchObj.run().each(function (result) {
    //             item.id = result.id;
    //             item.vendorPrefered = result.getValue('vendor');
    //             item.commodity = result.getValue('custitem_acc_commodity_code');
    //             return true;
    //         });
    //         // log.debug('item', item);
    //         return item;
    //     } catch (error) {
    //         log.debug('searchItemBySapCode',);
    //     }
    // }

    function searchItemBySapCode_2(sapCode) {
        try {
            var customrecord_sdb_acme_upc_sap_uomSearchObj = search.create({
                type: "customrecord_sdb_acme_upc_sap_uom",
                filters:
                    [
                        ["custrecord_sdb_acme_sap", "is", sapCode]
                    ],
                columns:
                    [
                        search.createColumn({
                            name: "internalid",
                            join: "CUSTRECORD_SDB_ACME_ITEM",
                            label: "Internal ID"
                        }),
                        search.createColumn({
                            name: "type",
                            join: "CUSTRECORD_SDB_ACME_ITEM",
                            label: "Type"
                        }),
                        search.createColumn({ name: "custrecord_sdb_acme_item", label: "Item" })
                    ]
            });
            var searchResultCount = customrecord_sdb_acme_upc_sap_uomSearchObj.runPaged().count;
            log.debug("itemSearchObj result count sapCode. item", searchResultCount);
            let item = {};
            customrecord_sdb_acme_upc_sap_uomSearchObj.run().each(function (result) {
                item.id = result.getValue('custrecord_sdb_acme_item');
                return true;
            });
            // log.debug('item', item);
            return item;
        } catch (error) {
            log.error('searchItemBySapCode',);
        }
    }
    function searchLineItemRecord(lineValues) {
        try {
            var customrecord_acme_cust_price_contractsSearchObj = search.create({
                type: "customrecord_acme_cust_price_contracts",
                filters:
                    [
                        // ["internalid", "anyof", lineValues.contractID],
                        ["idtext", "is", lineValues.contractID],//add 13/04/24
                        "AND",
                        ["custrecord_acme_cpc_item_header.custrecord_acme_cpc_line_item", "anyof", lineValues.itemId]
                    ],
                columns:
                    [
                        search.createColumn({
                            name: "custrecord_acme_cpc_line_item",
                            join: "CUSTRECORD_ACME_CPC_ITEM_HEADER",
                            label: "Item"
                        }),
                        search.createColumn({
                            name: "internalid",
                            join: "CUSTRECORD_ACME_CPC_ITEM_HEADER",
                            label: "Internal ID"
                        })
                    ]
            });
            var searchResultCount = customrecord_acme_cust_price_contractsSearchObj.runPaged().count;
            // log.debug("customrecord_acme_cust_price_contractsSearchObj result count", searchResultCount);
            if (searchResultCount === 0) {
                lineValues.contractID = searchLineItemRecordByName(lineValues);
                log.audit('create record opara la linea', lineValues);
                createRecordLine(lineValues);
                return 1;
            } else {
                customrecord_acme_cust_price_contractsSearchObj.run().each(function (result) {

                    let resultData = JSON.parse(JSON.stringify(result));
                    let resultId = resultData.values?.["CUSTRECORD_ACME_CPC_ITEM_HEADER.internalid"][0]?.value;

                    log.debug('result', resultId);
                    if (!resultId) return true;
                    record.submitFields({
                        type: 'customrecord_acme_cust_price_contract_ln',
                        id: resultId,
                        values: {
                            custrecord_acme_cpc_line_price: lineValues.price
                        },
                        options: {
                            enablesourcing: true,
                        }
                    });
                    log.audit('update price correctly', resultId);

                    return true;
                });
                return 2
            }
        } catch (error) {
            log.error('error if not result and broke,', error.message)
            return 3;
        }
    }

    //Search CPC by name
    function searchLineItemRecordByName(lineValues) {
        try {
            var customrecord_acme_cust_price_contractsSearchObj = search.create({
                type: "customrecord_acme_cust_price_contracts",
                filters:
                    [
                        ["idtext", "is", lineValues.contractID],//add 13/04/24
                        "AND",
                        ["isinactive", "is", "F"]
                    ],
                columns:
                    [
                        search.createColumn({
                            name: "custrecord_acme_cpc_line_item",
                            join: "CUSTRECORD_ACME_CPC_ITEM_HEADER",
                            label: "Item"
                        }),
                        search.createColumn({
                            name: "internalid",
                            join: "CUSTRECORD_ACME_CPC_ITEM_HEADER",
                            label: "Internal ID"
                        })
                    ]
            });
            var searchResultCount = customrecord_acme_cust_price_contractsSearchObj.runPaged().count;
            log.debug("customrecord_acme_cust_price_contractsSearchObj result count", searchResultCount);
            if (searchResultCount === 0) return
            var rcdId = '';
            customrecord_acme_cust_price_contractsSearchObj.run().each(function (result) {
                rcdId = result.id
                return true;
            });
            log.debug("rcdId", rcdId);
            return rcdId
        } catch (error) {
            log.error('error if not result and broke,', error.message)
        }
    }


    return {
        getInputData: getInputData,
        map: map,
        summarize: summarize
    }
});
