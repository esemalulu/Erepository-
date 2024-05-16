/**
 * @NApiVersion 2.1
 * @NScriptType clientScript
 * @NModuleScope Public
 */

define(["N/search", 'N/record', 'N/runtime'], function (search, record, runtime) {


    function fieldChanged(context) {
        try {
            //Set location from Header location on post sourcing
            var objRecord = context.currentRecord;
            var sublistName = context.sublistId;
            var sublistFieldName = context.fieldId;
            var currentRecord = context.currentRecord;
            var loc = currentRecord.getValue({ fieldId: 'location' });
            var recordType = currentRecord.type;
            var userObj = runtime.getCurrentUser();
            log.debug('fieldChanged user id', userObj.id)
            log.debug('fieldChanged recordType', recordType)

          // if (userObj.id != 84418 && recordType == "estimate") return;
            /*	dialog.alert({
                    title: 'I am an Alert',
                    message: 'Record Type' + recordType
                });
                if (context.fieldId == 'entity' && recordType != record.Type.PURCHASE_ORDER) {
                log.debug("context.fieldId=", context.fieldId);
                var shippingaddress = currentRecord.getSubrecord({ fieldId: 'shippingaddress' });
                log.debug("shippingaddress=", shippingaddress);
                if (_logValidation(shippingaddress)) {
                    var shipZone = shippingaddress.getValue({ fieldId: 'custrecord_ship_zone' });
                    var shipRoute = shippingaddress.getValue({ fieldId: 'custrecord_route' });
                    var shipStop = shippingaddress.getValue({ fieldId: 'custrecord_stop' });
                    log.debug("shipZone=", shipZone);
                    log.debug("Route=", shipRoute);
                    log.debug("shipZone=", shipZone);
                    if (_logValidation(shipZone)) {
                        currentRecord.setValue({ fieldId: 'location', value: shipZone });
                    } else
                        currentRecord.setValue({ fieldId: 'location', value: '' });
      
                    if (_logValidation(shipRoute)) {
                        currentRecord.setValue({ fieldId: 'custbody_aps_route', value: shipRoute });
                    } else
                        currentRecord.setValue({ fieldId: 'custbody_aps_route', value: '' });
                    if (_logValidation(shipStop)) {
                        currentRecord.setValue({ fieldId: 'custbody_aps_stop', value: shipStop });
                    } else
                        currentRecord.setValue({ fieldId: 'custbody_aps_stop', value: '' });
                }
            } */

            if (sublistName == 'item' && sublistFieldName == 'item') {
                var rate1;
                var item = objRecord.getCurrentSublistValue({
                    sublistId: "item",
                    fieldId: "item"
                });
                log.debug('item', item)
                console.log('item', item)

                if (!isEmpty(item)) {
                    var invoiceSearchObj = search.create({
                        type: "salesorder",
                        filters:
                            [
                                ["mainline", "is", "F"],
                                "AND",
                                ["type", "anyof", "SalesOrd"],
                                "AND",
                                ["shipping", "is", "F"],
                                "AND",
                                ["taxline", "is", "F"],
                                "AND",
                                ["item", "anyof", item],
                                "AND",
                                ["formulanumeric: {quantityuom}", "greaterthan", "0"]
                            ],
                        columns:
                            [
                                search.createColumn({ name: "rate", label: "Item Rate" }),
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
                    invoiceSearchObj.run().each(function (result) {
                        rate1 = result.getValue({ name: "formulanumeric", label: "Formula (Numeric)" })
                        // rate1 = rate1.toFixed(2).toString();
                        return false;
                    });
                    /*	if(!rate1){
                             rate1 = objRecord.getCurrentSublistValue({
                         sublistId: "item", 
                         fieldId: "rate"
                         });
                        } */
                    console.log('RATE 1', rate1)
                    if (rate1 != undefined && recordType != record.Type.PURCHASE_ORDER) {
                        objRecord.setCurrentSublistValue({
                            sublistId: "item",
                            fieldId: "custcol_last_sold_price",
                            value: parseFloat(rate1).toFixed(2)
                        });
                    }
                    /*objRecord.setCurrentSublistValue({
                      sublistId: "item",
                      fieldId: "location",
                      value: loc,
                      ignoreFieldChange: false
                    });*/

                }
            }

            /* //Duplicate Item check script inserted
            var rec = context.currentRecord;
            var sublistName = context.sublistId;
            var fieldName = context.fieldId;
            var line = context.line;
            var recordType = rec.type;
      
                dialog.alert({
                    title: 'I am an Alert',
                    message: 'Record Type' + recordType
                }); 
      
            //This check is only for Sales Order  	
            if (recordType != record.Type.PURCHASE_ORDER) {
      
      
                if (sublistName == 'item' && fieldName == 'item') {
      
      
                    var item = rec.getCurrentSublistValue({ sublistId: 'item', fieldId: 'item' });
                    var itemType = rec.getCurrentSublistValue({ sublistId: 'item', fieldId: 'itemtype' });
                    log.debug("itemType=", itemType);
                    if (itemType == 'Description' || itemType == 'Discount' || itemType == 'Subtotal' || itemType == 'Markup') {
                        return;
                    }
                    if (isEmpty(item)) {
                        return;
                    }
                    var customer = rec.getValue({ fieldId: 'entity' });
                    var lastSale = getLastSale(customer, item);
                    if (!isEmpty(lastSale)) {
                        window.alert('This item is a duplicate from your latest Order No. ' + lastSale.orderNo + ', dated ' + lastSale.date + '.');
                    }
      
      
                    //Restricted Item logic goes here                	
                    var restricedItemCheck = rec.getCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_acme_restricted_item' });
                    if (restricedItemCheck == false) {
                        return;
                    }
                    var item = rec.getCurrentSublistValue({ sublistId: 'item', fieldId: 'item' });
                    var customer = rec.getValue({ fieldId: 'entity' });
                    var restrictedItem = checkRestrictedItem(customer, item);
                    if (restrictedItem == false) {
                        window.alert('The item you are adding is a restricted item for the customer.');
                    }
                }
            }// Check END for Only Sales Order */
        }
        catch (error) {
            console.log('Error: ' + error.toString());
            log.error('Error fieldChanged: ' + objRecord.id, error.toString())
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


    function postSourcing(context) {
        try {
            var currentRec = context.currentRecord;
            var sublistName = context.sublistId;
            var fieldName = context.fieldId;

            var recordType = currentRec.type;
            var userObj = runtime.getCurrentUser();
            log.debug('postSourcing user id', userObj.id)
            log.debug('postSourcing recordType', recordType)
           // if (userObj.id != 84418 && recordType == "estimate") return;

            log.debug('tp price', "fieldName")
            if (sublistName === "item" && fieldName == "item" && !isNaN(currentRec.getCurrentSublistValue({ sublistId: "item", fieldId: "item" }))) {

                var item = currentRec.getCurrentSublistValue({
                    sublistId: "item",
                    fieldId: "item"
                });
                var customer = currentRec.getValue({ fieldId: "entity" });
                var date = currentRec.getText({ fieldId: "trandate" });
                if (customer == 96580) {
                    currentRec.setCurrentSublistValue({
                        sublistId: "item",
                        fieldId: "price",
                        value: -1,
                        ignoreFieldChange: true,
                    });
                    return
                }

                if (isEmpty(item) || isEmpty(customer) || isEmpty(date)) {
                    return;
                }
                var price = getContractPrice(customer, item, date);
                /*
                quien mierda hizo esto????
                if(tpprice) {
                    price.price = tpprice;   
                    price.rate = tpprice;   
                }
                log.debug('tp price', tpprice)
                if(tpprice) {
                    price.price = tpprice;   
                }
                */
                //Fabian codigo en set timeout
                //  setTimeout(function () {
                if (price == null) {
                    try {
                        var customer = currentRec.getValue("entity");
                        if (!isItemInCustomerPricing(customer, item)) {
                            var itemLookup = search.lookupFields({
                                type: search.Type.ITEM,
                                id: item,
                                columns: ["class"]
                            });
                            var classText = itemLookup?.class[0]?.text;
                            if (classText) {
                                currentRec.setCurrentSublistText({
                                    sublistId: "item",
                                    fieldId: "price",
                                    text: classText,
                                });
                            }
                        }
                    } catch (err) {
                        console.log(err)
                        log.error('Error postSourcing: ', err.toString())
                    }
                } else {
                    currentRec.setCurrentSublistValue({
                        sublistId: "item",
                        fieldId: "price",
                        value: -1,
                    });
                    currentRec.setCurrentSublistValue({
                        sublistId: "item",
                        fieldId: "custcol_acc_contract_pricing",
                        value: true,
                    });
                    currentRec.setCurrentSublistValue({
                        sublistId: "item",
                        fieldId: "units",
                        value: price.unit,
                        ignoreFieldChange: true,
                    });
                    currentRec.setCurrentSublistValue({
                        sublistId: "item",
                        fieldId: "rate",
                        value: price.price,
                    });
                    currentRec.setCurrentSublistValue({
                        sublistId: "item",
                        fieldId: "custcol_sdb_contract_number",
                        value: price.contractNumber,
                    });
                    var unitConversion = currentRec.getCurrentSublistValue({
                        sublistId: "item",
                        fieldId: "unitconversionrate",
                    });
                    console.log('unitConversion', unitConversion)
                    console.log('price', price)

                    log.debug("unitConversion", unitConversion);
                    log.debug("calculation", price.price / unitConversion);
                    log.debug("price.price", price.price);
                    currentRec.setCurrentSublistValue({
                        sublistId: "item",
                        fieldId: "custcol_acc_contract_unit_price",
                        value: price.price / unitConversion,
                    });
                }
                //}, 500);


            } else if (sublistName == "item" && fieldName == "units") {
                var contractPricingRate = currentRec.getCurrentSublistValue({
                    sublistId: "item",
                    fieldId: "custcol_acc_contract_pricing",
                });
                if (contractPricingRate != true && contractPricingRate != 'T') {
                    return;
                }
                var unitConversionRate = currentRec.getCurrentSublistValue({
                    sublistId: "item",
                    fieldId: "unitconversionrate",
                });
                var unitRate = currentRec.getCurrentSublistValue({
                    sublistId: "item",
                    fieldId: "custcol_acc_contract_unit_price",
                });
                console.log("calculation fieldChanged", unitConversionRate * unitRate);
                currentRec.setCurrentSublistValue({
                    sublistId: "item",
                    fieldId: "rate",
                    value: unitConversionRate * unitRate,
                });
            }// end if

        } catch (error) {
            console.log("Error: " + error.toString());
            log.error('Error postSourcing2: ', error.toString())
        }
    }

    function getLowestCPCValue(customer, item) {
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
                ],
                columns: [
                    search.createColumn({
                        name: "custrecord_acme_cpc_item_header",
                        join: "CUSTRECORD_ACME_CPC_ITEM_HEADER",
                        sort: search.Sort.ASC,
                    }),
                    search.createColumn({
                        name: "custrecord_acc_cpcl_sale_unit",
                        join: "CUSTRECORD_ACME_CPC_ITEM_HEADER",
                    }),
                    search.createColumn({
                        name: "custrecord_acme_cpc_line_price",
                        join: "CUSTRECORD_ACME_CPC_ITEM_HEADER",
                        sort: search.Sort.ASC,
                    }),
                ],
            });
            var searchResult = contractPricingSearch.run().getRange({
                start: 0,
                end: 100,
            });
            if (searchResult.length < 1) {
                return null;
            } else {
                log.debug("searchResult", searchResult);
                var cpcarray = new Array();

                for (var i = 0; i < searchResult.length; ++i) {
                    log.debug("i is", i);

                    cpcarray.push(searchResult[i].getValue({
                        name: "custrecord_acme_cpc_item_header",
                        join: "CUSTRECORD_ACME_CPC_ITEM_HEADER",
                    }));

                    log.debug("cpcarray", cpcarray);
                }//for loop ended	


                var unit = searchResult[0].getValue({
                    name: "custrecord_acc_cpcl_sale_unit",
                    join: "CUSTRECORD_ACME_CPC_ITEM_HEADER",
                });
                log.debug("unit", unit);
                Array.min = function (cpcarray) {
                    return Math.min.apply(Math, cpcarray);
                };

                var lowestcpc = Array.min(cpcarray);


                log.debug("lowestcpc", lowestcpc);
                return lowestcpc;
            }
        } catch (error) {
            console.log("Error in getContractPrice: " + error.toString());
            log.error("Error in getContractPrice:", error)
        }
    }

    function getContractPrice(customer, item, date) {
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
                    "AND",
                    [
                        "custrecord_acme_cpc_start_date",
                        "onorbefore",
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

                ],
            });
            log.debug('result', 'after search')
            contractPricingSearch.run().each(result => {
                log.debug('result', result)
            });
            var searchResult = contractPricingSearch.run().getRange({
                start: 0,
                end: 1000,
            });
            log.debug('after search', searchResult)
            if (searchResult.length < 1) {
                return null;
            } else {
                log.debug("searchResult", searchResult);

                var unit = searchResult[0].getValue({
                    name: "custrecord_acc_cpcl_sale_unit",
                    join: "CUSTRECORD_ACME_CPC_ITEM_HEADER",
                });
                log.debug("unit", unit);

                var price = searchResult[0].getValue({
                    name: "custrecord_acme_cpc_line_price",
                    join: "CUSTRECORD_ACME_CPC_ITEM_HEADER",
                });

                var contractNumber = searchResult[0].id

                return { price: price, unit: unit, contractNumber: contractNumber };

            }
        } catch (error) {
            console.log("Error in getContractPrice: " + error.toString());
            log.error("Error in getContractPrice:", error)
        }
    }

    function isEmpty(stValue) {
        if (stValue == "" || stValue == null || stValue == undefined) {
            return true;
        } else {
            if (stValue instanceof String) {
                if (stValue == "") {
                    return true;
                }
            } else if (stValue instanceof Array) {
                if (stValue.length == 0) {
                    return true;
                }
            }

            return false;
        }
    }

    function searchAll(objSavedSearch) {
        var arrReturnSearchResults = [];
        var objResultset = objSavedSearch.run();
        var intSearchIndex = 0;
        var objResultSlice = null;
        var maxSearchReturn = 1000;

        var maxResults = 0;

        do {
            var start = intSearchIndex;
            var end = intSearchIndex + maxSearchReturn;
            if (maxResults && maxResults <= end) {
                end = maxResults;
            }
            objResultSlice = objResultset.getRange(start, end);

            if (!objResultSlice) {
                break;
            }

            arrReturnSearchResults = arrReturnSearchResults.concat(objResultSlice);
            intSearchIndex = intSearchIndex + objResultSlice.length;

            if (maxResults && maxResults == intSearchIndex) {
                break;
            }
        } while (objResultSlice.length >= maxSearchReturn);

        return arrReturnSearchResults;
    }
    return {
        postSourcing: postSourcing,
        fieldChanged: fieldChanged
    };
});
