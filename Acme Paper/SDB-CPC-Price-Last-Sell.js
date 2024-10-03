/**
 *@NApiVersion 2.1
 *@NScriptType WorkflowActionScript
 */
define(["N/search", "N/log", "N/record", "N/runtime"], function (search, log, record, runtime) {
    function onAction(context) {
        try {
            var objRecord = context.newRecord;//record.load({ type: "salesorder", id: context.newRecord.id })
            var countItems = objRecord.getLineCount("item");
            var customer = objRecord.getValue({ fieldId: "entity" });
            var date = objRecord.getText({ fieldId: "trandate" });
            var user = runtime.getCurrentUser();
            log.debug('USER INFO: ', user);

            var SPS_NETWORK = "84216";
            var enteredById = objRecord.getValue("custbody_aps_entered_by");
            if (String(enteredById) == SPS_NETWORK && context.type == 'create') return;
            let arrayItems = [];
            var recordType = objRecord.type;
            for (var i = 0; i < countItems; i++) {
                arrayItems[i] = objRecord.getSublistValue({
                    sublistId: "item",
                    fieldId: "item",
                    line: i
                });
            };
            if (!arrayItems.length) return;
            var priceLevels = getPriceLevels();
            var objectItems = getItemsRates(arrayItems);
            objectItems = getContracts(objectItems, customer, arrayItems, date);
            log.debug('ENTRY INFO: ', { objectItems, priceLevels });
            for (var x = 0; x < countItems; x++) {
                try {
                    var itemId = objRecord.getSublistValue({
                        sublistId: 'item',
                        fieldId: 'item',
                        line: x
                    });
                    var manuallyModifiedRate = objRecord.getSublistValue({
                        sublistId: 'item',
                        fieldId: 'custcol_sdb_rate_manually_modified',
                        line: x
                    });
                    if (manuallyModifiedRate === true || manuallyModifiedRate == "T") continue;

                    var spsPurchasePrice = objRecord.getSublistValue({
                        sublistId: 'item',
                        fieldId: 'custcol_sps_purchaseprice',
                        line: x
                    })
                    objRecord.selectLine({
                        sublistId: 'item',
                        line: x
                    })
                    var lineNumber = x;
                    var currentObject = objectItems[itemId];

                    if (String(enteredById) == SPS_NETWORK && currentObject.rate && spsPurchasePrice) currentObject.rate = spsPurchasePrice //Add when has spsPurchasePrice 22/4
                    if (String(enteredById) == SPS_NETWORK && spsPurchasePrice) currentObject.price = spsPurchasePrice //Add when has spsPurchasePrice 22/4
                    if ((recordType != record.Type.PURCHASE_ORDER) && (currentObject?.rate)) {
                        objRecord.setCurrentSublistValue({
                            sublistId: "item",
                            fieldId: "custcol_last_sold_price",
                            value: parseFloat(currentObject.rate).toFixed(2)
                        });
                    }
                    if (!currentObject?.price) {
                        try {
                            if (!isItemInCustomerPricing(customer, itemId)) {
                                var blockPriceOverride = objRecord.getSublistValue({
                                    sublistId: 'item',
                                    fieldId: 'custcol_sdb_block_price_override',
                                    line: x
                                });
                                //Only set the price based on item category the first time it runs.
                                //This checks if the block price override checkbox is false, then
                                //it sets the checkbox to true, so if this runs on an edit, this part
                                //wont run unless someone manually unchecks the checkbox
                                var pricelevel = objRecord.getSublistValue({
                                    sublistId: "item",
                                    fieldId: "price",
                                    line: x
                                });
                                log.audit("price level before", pricelevel)
                                log.audit("context", context.type)
                                if (blockPriceOverride == false || blockPriceOverride == "F") {
                                    if (pricelevel == -1 && context.type == 'create') continue;
                                    var itemLookup = search.lookupFields({
                                        type: search.Type.ITEM,
                                        id: itemId,
                                        columns: ["class"]
                                    });
                                    var classText = itemLookup?.class[0]?.text;
                                    if (!priceLevels[classText]) continue
                                    objRecord.setCurrentSublistValue({
                                        sublistId: "item",
                                        fieldId: "price",
                                        value: priceLevels[classText],
                                    });
                                    objRecord.setCurrentSublistValue({
                                        sublistId: "item",
                                        fieldId: "custcol_sdb_block_price_override",
                                        value: true,
                                    });
                                }
                            }
                        }
                        catch (err) {
                            log.error("ERROR: setting price based on category", err);
                            continue;
                        }
                    }
                    else if (currentObject) {
                        log.debug('LINE INFO: ', currentObject);
                        objRecord.setCurrentSublistValue({
                            sublistId: "item",
                            fieldId: "price",
                            value: -1

                        });
                        objRecord.setCurrentSublistValue({
                            sublistId: "item",
                            fieldId: "custcol_acc_contract_pricing",
                            value: true
                        });
                        if (currentObject.unit)
                            objRecord.setCurrentSublistValue({
                                sublistId: "item",
                                fieldId: "units",
                                value: currentObject.unit
                            });

                        var rebateSellPrice = objRecord.getCurrentSublistValue({
                            sublistId: "item",
                            fieldId: "custcol_rebate_sale_price"
                        });
                        if (!rebateSellPrice) {
                            objRecord.setCurrentSublistValue({
                                sublistId: "item",
                                fieldId: "rate",
                                value: currentObject.price
                            });
                        }
                        objRecord.setCurrentSublistValue({
                            sublistId: "item",
                            fieldId: "custcol_sdb_contract_number",
                            value: currentObject.contractNumber
                        });
                        var unitConversion = objRecord.getSublistValue({
                            sublistId: "item",
                            fieldId: "unitconversionrate",
                            line: lineNumber
                        });
                        if (unitConversion) {
                            objRecord.setCurrentSublistValue({
                                sublistId: "item",
                                fieldId: "custcol_acc_contract_unit_price",
                                value: currentObject.price / unitConversion
                            });
                        }

                    }
                    objRecord.commitLine("item");
                } catch (error) {
                    log.error('ERROR: commitLine', error);
                }
            }
            //var idRecord = objRecord.save()

        }
        catch (error) {
            log.error('ERROR: onAction', error);
        }
    }

    function isItemInCustomerPricing(customer, item) {
        try {
            if (!customer || !item) return false;
            var customerSearchObj = search.create({
                type: "customer",
                filters:
                    [
                        ["internalid", "anyof", customer],
                        "AND",
                        ["pricingitem", "anyof", item]
                    ],
                columns:
                    [
                        search.createColumn({ name: "pricingitem", label: "Pricing Item" })
                    ]
            });
            var countResult = customerSearchObj.runPaged().count;
            return countResult >= 1;
        } catch (error) {
            return false;
        }
    }

    function getContracts(objectItems, customer, item, date) {
        try {
            var contractPricingSearch = search.create({
                type: "customrecord_acme_cust_price_contracts",
                filters: [
                    [
                        "custrecord_acme_cpc_cust_header.custrecord_acme_cpc_line_customer",
                        "anyof",
                        customer,
                    ],
                    "AND",
                    [
                        "custrecord_acme_cpc_item_header.custrecord_acme_cpc_line_item",
                        "anyof",
                        item,
                    ],
                    "AND",
                    [
                        "custrecord_acme_cpc_end_date",
                        "onorafter",
                        date,
                    ],

                ],
                columns: [

                    search.createColumn({
                        name: "custrecord_acc_cpcl_sale_unit",
                        join: "CUSTRECORD_ACME_CPC_ITEM_HEADER",
                    }),
                    search.createColumn({
                        name: "custrecord_acme_cpc_line_price",
                        join: "CUSTRECORD_ACME_CPC_ITEM_HEADER",
                    }),
                    search.createColumn({
                        name: "custrecord_acme_cpc_line_item",
                        join: "CUSTRECORD_ACME_CPC_ITEM_HEADER",
                    }),

                ],
            });
            var searchResult = contractPricingSearch.run().getRange({
                start: 0,
                end: 1000,
            });
            if (searchResult && searchResult.length < 1) {
                return objectItems;
            } else {
                for (var i = 0; i < searchResult.length; i++) {
                    var unit = searchResult[i].getValue({
                        name: "custrecord_acc_cpcl_sale_unit",
                        join: "CUSTRECORD_ACME_CPC_ITEM_HEADER",
                    });
                    var price = searchResult[i].getValue({
                        name: "custrecord_acme_cpc_line_price",
                        join: "CUSTRECORD_ACME_CPC_ITEM_HEADER",
                    });
                    var item = searchResult[i].getValue({
                        name: "custrecord_acme_cpc_line_item",
                        join: "CUSTRECORD_ACME_CPC_ITEM_HEADER",
                    });
                    var contractNumber = searchResult[i].id
                    if (objectItems[item]) {
                        objectItems[item]["price"] = price;
                        objectItems[item]["unit"] = unit;
                        objectItems[item]["contractNumber"] = contractNumber;
                    }
                }
                return objectItems;

            }
        } catch (error) {
            log.error("ERROR: getContracts", error)
        }
    }

    function getItemsRates(items) {
        try {
            var objectReturn = {};
            var newItems = [];
            newItems = newItems.concat(items);
            var orderItems = getOrderIds(items);
            log.debug('orderItems', orderItems);
            var invoiceSearchObj = getItemsInformation(items, orderItems);
            var pagedData = invoiceSearchObj.runPaged({
                pageSize: 1000
            });
            pagedData.pageRanges.forEach(function (pageRange) {
                var page = pagedData.fetch({ index: pageRange.index });
                page.data.forEach(function (result) {
                    var index = newItems.indexOf(result.getValue("item"));
                    if (index != -1) {
                        objectReturn[result.getValue("item")] = { rate: result.getValue({ name: "formulanumeric", label: "Formula (Numeric)" }) }
                        newItems.splice(index, 1)
                    }
                });
            });

            return objectReturn;
        } catch (error) {
            log.error('ERROR: getItemsRates', error);
        }
    }

    function getOrderIds(items) {
        try {
            var salesorderSearchObj = search.create({
                type: "salesorder",
                filters:
                    [
                        ["type", "anyof", "SalesOrd"],
                        "AND",
                        ["mainline", "is", "F"],
                        "AND",
                        ["shipping", "is", "F"],
                        "AND",
                        ["taxline", "is", "F"],
                        "AND",
                        ["item", "anyof", items],
                        "AND",
                        ["formulanumeric: {quantityuom}", "greaterthan", "0"]
                    ],
                columns:
                    [
                        search.createColumn({
                            name: "item",
                            summary: "GROUP",
                            label: "Item"
                        }),
                        search.createColumn({
                            name: "internalid",
                            summary: "MAX",
                            label: "Internal ID"
                        })
                    ]
            });
            var salesOrdersIsd = [];
            salesorderSearchObj.run().each(function (result) {
                var orderId = result.getValue({ name: 'internalid', summary: 'MAX' });
                salesOrdersIsd.push(orderId);
                return true;
            });
            return salesOrdersIsd;
        } catch (error) {
            log.error('ERROR: getOrderIds', error);
        }
    }

    function getItemsInformation(items, orderIds) {
        try {
            return search.create({
                type: "salesorder",
                filters:
                    [
                        ["internalid", "anyof", orderIds],
                        "AND",
                        ["mainline", "is", "F"],
                        "AND",
                        ["type", "anyof", "SalesOrd"],
                        "AND",
                        ["shipping", "is", "F"],
                        "AND",
                        ["taxline", "is", "F"],
                        "AND",
                        ["item", "anyof", items],
                        "AND",
                        ["formulanumeric: {quantityuom}", "greaterthan", "0"]
                    ],
                columns:
                    [
                        search.createColumn({ name: "rate", label: "Item Rate" }),
                        search.createColumn({ name: "item", label: "item" }),
                        search.createColumn({
                            name: "datecreated",
                            sort: search.Sort.DESC,
                            label: "Date Created"
                        }),
                        search.createColumn({
                            name: "formulanumeric",
                            formula: "({rate}*{quantity})/{quantityuom}",
                            label: "Formula (Numeric)"
                        }),
                        search.createColumn({ name: "entity", label: "Name" })
                    ]
            });
        } catch (error) {
            log.error('ERROR: getItemsInformation', error);
        }
    }

    function getPriceLevels() {
        try {
            var res = {};
            var pricelevelSearchObj = search.create({
                type: "pricelevel",
                filters:
                    [
                    ],
                columns:
                    [
                        search.createColumn({
                            name: "name",
                            sort: search.Sort.ASC,
                            label: "Name"
                        })
                    ]
            });
            pricelevelSearchObj.run().each(function (result) {
                res[result.getValue("name")] = result.id
                return true;
            });
            return res
        } catch (error) {
            log.error("ERROR: getPriceLevels", error);
        }
    }
    return {
        onAction: onAction
    }
});
