/**
 * @NApiVersion 2.0
 * @NScriptType clientscript
 *
 */
define(['N/search', 'N/ui/dialog', 'N/record'],
    function (search, dialog, record) {


        /* function _logValidation(value) {
            if (value != null && value != '' && value != undefined && value != 'undefined' && value != 'NaN') {
                return true
            } else {
                return false;
            }
        }

        function fieldChanged(context) {


            //Setting location on field change
            var currentRecord = context.currentRecord;
            var sublistName = context.sublistId;
            var fieldName = context.fieldId;
            var count = currentRecord.getLineCount('item');
            var loc = currentRecord.getValue({ fieldId: 'location' });
            var recordType = currentRecord.type;
            log.debug("fieldName=", fieldName);
            log.debug("loc=", loc);

            if (fieldName == 'shipaddress' && recordType != record.Type.PURCHASE_ORDER) {
                log.debug("shippingaddress=", shippingaddress);
                var shippingaddress = currentRecord.getSubrecord({ fieldId: 'shippingaddress' });
                if (shippingaddress) {
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
            }

            if (fieldName == 'location' && sublistName != 'item') {

                    dialog.alert({
                        title: 'I am an Alert',
                        message: 'Loc chnaged.' + loc
                    }); 
                	
                    dialog.alert({
                        title: 'I am an Alert',
                        message: 'count = .' + count
                    });    


                for (var i = 0; i < count; i++) {

                    currentRecord.selectLine({ sublistId: 'item', line: i });

                    currentRecord.setCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'location',
                        value: loc,
                        ignoreFieldChange: true
                    });

                    currentRecord.commitLine({ sublistId: 'item' });

                }

            }

        } */

        function fieldChanged(context) {
            try {


                //Set location from Header location on post sourcing
                var objRecord = context.currentRecord;
                var sublistName = context.sublistId;
                var sublistFieldName = context.fieldId;
                var currentRecord = context.currentRecord;
                var loc = currentRecord.getValue({ fieldId: 'location' });
                var recordType = currentRecord.type;

                /*	dialog.alert({
                        title: 'I am an Alert',
                        message: 'Record Type' + recordType
                    }); */



                /* if (context.fieldId == 'entity' && recordType != record.Type.PURCHASE_ORDER) {
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

                debugger;
                console.log('restricted items script')
                if (sublistName == 'item' && sublistFieldName == 'item') {
                    var rate1;
                    var item = objRecord.getCurrentSublistValue({
                        sublistId: "item",
                        fieldId: "item"
                    });
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
                                    ["item", "anyof", item]
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
                            // .run().each has a limit of 4,000 results
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

                        objRecord.setCurrentSublistValue({
                            sublistId: "item",
                            fieldId: "location",
                            value: loc,
                            ignoreFieldChange: false
                        });

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
            }
        }

        //duplicate item added
        /* function validateLine(context) {
            try {
                var rec = context.currentRecord;
                var sublistName = context.sublistId;
                var fieldName = context.fieldId;
                var recordType = rec.type;


                //This check is only for Sales Order  


                if (recordType != record.Type.PURCHASE_ORDER) {

                    if (sublistName == 'item' && fieldName == 'item') {
                        var item = rec.getCurrentSublistValue({ sublistId: 'item', fieldId: 'item' });
                        var lineCount = rec.getLineCount({ sublistId: 'item' });
                        var itemFound = false;
                        var line = rec.getCurrentSublistIndex({
                            sublistId: 'item'
                        });
                        for (var i = 0; i < lineCount; i++) {
                            if (i == line) {
                                continue
                            }
                            var itemLine = rec.getSublistValue({ sublistId: 'item', fieldId: 'item', line: i });
                            if (itemLine == item) {
                                itemFound = true;
                                break;
                            }
                        }
                        if (itemFound == true) {
                            window.alert('A duplicate item has been added.')
                        }
                    }

                }
                return true;
            }
            catch (error) {
                console.log('Error: ' + error.toString());
            }
        } */

        //Check Last Sale
        function getLastSale(customer, item) {
            try {
                var lastSaleSearch = search.create({
                    type: "salesorder",
                    filters:
                        [
                            ["name", "anyof", customer],
                            "AND",
                            ["mainline", "is", "F"],
                            "AND",
                            ["type", "anyof", "SalesOrd"],
                            "AND",
                            ["status", "anyof", "SalesOrd:B", "SalesOrd:E", "SalesOrd:A", "SalesOrd:D"],
                            "AND",
                            ["item", "anyof", item],
                            "AND",
                            ["formulanumeric: case when {quantity} != {quantityshiprecv} then 1 else 0 end", "equalto", "1"]
                        ],
                    columns:
                        [
                            search.createColumn({
                                name: "tranid",
                                sort: search.Sort.DESC,
                            }),
                            search.createColumn({ name: "trandate" })
                        ]
                });
                var lastSaleSearchResult = lastSaleSearch.run().getRange({
                    start: 0,
                    end: 1
                });
                if (lastSaleSearchResult.length < 1) {
                    return null;
                }
                else {
                    return { orderNo: lastSaleSearchResult[0].getValue({ name: 'tranid' }), date: lastSaleSearchResult[0].getValue({ name: 'trandate' }) };
                }
            }
            catch (error) {
                log.error('Error in getLastSale', error.toString());
            }
        }


        function checkRestrictedItem(customer, item) {
            try {
                var restrictedSearch = search.create({
                    type: "customrecord_acme_restricted_items",
                    filters: [
                        ["custrecord_acme_ri_customer", "anyof", customer],
                        "AND",
                        ["custrecord_acme_ri_item", "anyof", item]
                    ],
                    columns: [
                        search.createColumn({ name: "custrecord_acme_ri_item" }),
                        search.createColumn({ name: "custrecord_acme_ri_customer" })
                    ]
                });
                var restrictedSearchResult = restrictedSearch.run().getRange({
                    start: 0,
                    end: 1
                });
                if (restrictedSearchResult.length < 1) {
                    return false;
                }
                else {
                    return true;
                }
            }
            catch (error) {
                log.error('Error in getLastSale', error.toString());
            }
        }

        function isEmpty(stValue) {
            if ((stValue == '') || (stValue == null) || (stValue == undefined)) {
                return true;
            }
            else {
                if (stValue instanceof String) {
                    if ((stValue == '')) {
                        return true;
                    }
                }
                else if (stValue instanceof Array) {
                    if (stValue.length == 0) {
                        return true;
                    }
                }
                return false;
            }
        }

        return {
            //      lineInit: lineInitfun,
            // postSourcing: postSourcing,
            //validateLine: validateLine,
            fieldChanged: fieldChanged
        };
    })
    ;