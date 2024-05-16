/**
 *@NApiVersion 2.x
 *@NScriptType Suitelet
 */

define(['N/ui/serverWidget', 'N/email', 'N/runtime', 'N/search', 'N/record'],
    function (ui, email, runtime, search, record) {
        function onRequest(context) {
            try {
                if (context.request.method === 'GET') {
                    var request = context.request;
                    var params = context.request.parameters;
                    var customer = params.customer;
                    var form = createForm(customer);
                    context.response.writePage(form);
                }
                else {
                    var request = context.request;
                    var response = getResponseObject(request);
                    context.response.write(response);
                }
            }
            catch (error) {
                log.error('Error in Main', error.toString());
            }
        }

        function getResponseObject(request) {
            try {
                var responseObj = "<script type='text/javascript'> ";
                var lineCount = request.getLineCount({group: 'custpage_line_history'});
                for (var i = 0; i < lineCount; i++) {
                    var item = request.getSublistValue({
                        group: 'custpage_line_history',
                        name: 'custpage_item',
                        line: i
                    });
                    var quantity = request.getSublistValue({
                        group: 'custpage_line_history',
                        name: 'custpage_order_qty',
                        line: i
                    });
                    var rate = request.getSublistValue({
                        group: 'custpage_line_history',
                        name: 'custpage_item_price',
                        line: i
                    });
                    var itemDescription = request.getSublistValue({
                        group: 'custpage_line_history',
                        name: 'custpage_description',
                        line: i
                    });
                    var selected = request.getSublistValue({
                        group: 'custpage_line_history',
                        name: 'custpage_selected',
                        line: i
                    });
                    if (selected == 'F') {
                        continue;
                    }
                    responseObj = responseObj + "window.parent.nlapiSelectNewLineItem('item');";
                    responseObj = responseObj + "window.parent.nlapiSetCurrentLineItemValue('item','item'," + item +", true, true);";
                    responseObj = responseObj + "window.parent.nlapiSetCurrentLineItemValue('item','quantity'," + quantity + ", true, true);";
                    responseObj = responseObj + "window.parent.nlapiSetCurrentLineItemValue('item','description','"+itemDescription+"', true, true);";
                    responseObj = responseObj + "window.parent.nlapiSetCurrentLineItemValue('item','price',-1, true, true);";
                    responseObj = responseObj + "window.parent.nlapiSetCurrentLineItemValue('item','rate'," + rate + ", true, true);";
                    responseObj = responseObj + "if(window.parent.nlapiGetCurrentLineItemValue('item','item')) { window.parent.nlapiCommitLineItem('item'); }";
                }
                responseObj = responseObj + "window.top.Ext.WindowMgr.getActive().close();</script>";
                return responseObj;
            }
            catch (error) {
                log.error('Error in getResponseObject', error.toString());
            }
        }

        function populateSublist(customerHistory, customer) {
            try {
                var customerHistoryArr = getSalesHistory(customer);
                for (var i = 0; i < customerHistoryArr.length; i++) {
                    if (!isEmpty(customerHistoryArr[i].item)) {
                        customerHistory.setSublistValue({
                            id: 'custpage_item',
                            line: i,
                            value: customerHistoryArr[i].item
                        });
                    }
                    if (!isEmpty(customerHistoryArr[i].itemDescription)) {
                        customerHistory.setSublistValue({
                            id: 'custpage_description',
                            line: i,
                            value: customerHistoryArr[i].itemDescription
                        });
                    }
                    if (!isEmpty(customerHistoryArr[i].invoiceNo)) {
                        customerHistory.setSublistValue({
                            id: 'custpage_invoice',
                            line: i,
                            value: customerHistoryArr[i].invoiceNo
                        });
                    }
                    if (!isEmpty(customerHistoryArr[i].date)) {
                        customerHistory.setSublistValue({
                            id: 'custpage_invoice_date',
                            line: i,
                            value: customerHistoryArr[i].date
                        });
                    }
                    if (!isEmpty(customerHistoryArr[i].unit)) {
                        customerHistory.setSublistValue({
                            id: 'custpage_uom',
                            line: i,
                            value: customerHistoryArr[i].unit
                        });
                    }
                    if (!isEmpty(customerHistoryArr[i].quantity)) {
                        customerHistory.setSublistValue({
                            id: 'custpage_order_qty',
                            line: i,
                            value: customerHistoryArr[i].quantity
                        });
                    }
                    if (!isEmpty(customerHistoryArr[i].rate)) {
                        customerHistory.setSublistValue({
                            id: 'custpage_item_price',
                            line: i,
                            value: customerHistoryArr[i].rate
                        });
                    }
                    if (!isEmpty(customerHistoryArr[i].profit)) {
                        customerHistory.setSublistValue({
                            id: 'custpage_item_profit',
                            line: i,
                            value: customerHistoryArr[i].profit
                        });
                    }
                }
            }
            catch (error) {
                log.error('Error in populateSublist', error.toString());
            }
        }

        function createForm(customer) {
            try {
                var form = ui.createForm({
                    title: 'Customer History'
                });
                var customerFld = form.addField({
                    id: 'custpage_customer',
                    type: ui.FieldType.SELECT,
                    source: 'customer',
                    label: 'Customer'
                });
                customerFld.defaultValue = customer;
                customerFld.updateDisplayType({
                    displayType: ui.FieldDisplayType.INLINE
                });
                var itemFilterFld = form.addField({
                    id: 'custpage_item_filter',
                    type: ui.FieldType.TEXT,
                    label: 'Item'
                });
                var customerHistory = form.addSublist({
                    id: 'custpage_line_history',
                    label: 'Customer History',
                    type: ui.SublistType.LIST
                });
                var itemFld = customerHistory.addField({
                    id: 'custpage_item',
                    type: ui.FieldType.SELECT,
                    label: 'Item',
                    source: 'item'
                });
                itemFld.updateDisplayType({
                    displayType: ui.FieldDisplayType.INLINE
                });
                var descriptionFld = customerHistory.addField({
                    id: 'custpage_description',
                    type: ui.FieldType.TEXTAREA,
                    label: 'Description'
                });
                descriptionFld.updateDisplayType({
                    displayType: ui.FieldDisplayType.ENTRY
                });
                var invoiceFld = customerHistory.addField({
                    id: 'custpage_invoice',
                    type: ui.FieldType.TEXT,
                    label: 'Invoice'
                });
                invoiceFld.updateDisplayType({
                    displayType: ui.FieldDisplayType.INLINE
                });
                var invoiceDateFld = customerHistory.addField({
                    id: 'custpage_invoice_date',
                    type: ui.FieldType.DATE,
                    label: 'Invoice Date'
                });
                invoiceDateFld.updateDisplayType({
                    displayType: ui.FieldDisplayType.INLINE
                });
                var uomFld = customerHistory.addField({
                    id: 'custpage_uom',
                    type: ui.FieldType.TEXT,
                    label: 'Unit'
                });
                uomFld.updateDisplayType({
                    displayType: ui.FieldDisplayType.INLINE
                });
                var quantityFld = customerHistory.addField({
                    id: 'custpage_order_qty',
                    type: ui.FieldType.INTEGER,
                    label: 'Order Quantity'
                });
                quantityFld.updateDisplayType({
                    displayType: ui.FieldDisplayType.ENTRY
                });
                var priceFld = customerHistory.addField({
                    id: 'custpage_item_price',
                    type: ui.FieldType.CURRENCY,
                    label: 'Order Price'
                });
                priceFld.updateDisplayType({
                    displayType: ui.FieldDisplayType.ENTRY
                });
                var profitFld = customerHistory.addField({
                    id: 'custpage_item_profit',
                    type: ui.FieldType.FLOAT,
                    label: 'Gross Profit'
                });
                profitFld.updateDisplayType({
                    displayType: ui.FieldDisplayType.INLINE
                });
                var selected = customerHistory.addField({
                    id: 'custpage_selected',
                    type: ui.FieldType.CHECKBOX,
                    label: 'SELECTED'
                });
                form.addButton({
                    id: 'custpage_search_btn',
                    label: 'Search'
                });
                form.addSubmitButton({
                    label: 'Submit'
                });
                populateSublist(customerHistory, customer);
                return form;
            }
            catch (error) {
                log.error('Error in createForm', error.toString());
            }
        }

        function getSalesHistory(customer) {
            try {
                var itemsArr = [];
                var customerHistoryArr = [];
                var historySearch = search.create({
                    type: "transaction",
                    filters: [
                        ["name", "anyof", customer],
                        "AND",
                        ["mainline", "is", "F"],
                        "AND",
                        ["taxline", "is", "F"],
                        "AND",
                        ["cogs", "is", "F"],
                        "AND",
                        ["shipping", "is", "F"],
                        "AND",
                        ["type", "anyof", "CustInvc"],
                        "AND",
                        ["status", "anyof", "CustInvc:A", "CustInvc:B"],
                        "AND",
                        ["item.type", "anyof", "InvtPart", "Group", "Kit", "OthCharge", "NonInvtPart", "Service"]
                    ],
                    columns: [
                        search.createColumn({name: "item", label: "Item", summary: "GROUP"}),
                        search.createColumn({name: "memo", label: "Memo",  summary: "MAX"}),
                        search.createColumn({name: "tranid", label: "Document Number", summary: "MAX"}),
                        search.createColumn({
                            name: "trandate",
                            sort: search.Sort.DESC,
                            label: "Date",
							summary: "MAX"
                        }),
                        search.createColumn({name: "unit", label: "Units", summary: "MAX"}),
                        search.createColumn({name: "quantity", label: "Quantity", summary: "MAX"}),
                        search.createColumn({name: "rate", label: "Item Rate", summary: "MAX"}),
                        search.createColumn({name: "estgrossprofit", label: "Est. Gross Profit (Line)", summary: "MAX"})
                    ]
                });
                try {
                    var pagedData = historySearch.runPaged({
                        pageSize: 1000
                    });
                    for (var i = 0; i * 1000 < pagedData.count; i++) {
                        pagedData.fetch({
                            index: i
                        }).data.forEach(function (result) {
                            var obj = {};
                            var item = result.getValue({name: 'item', summary: "GROUP"});
                            var itemDescription = result.getValue({name: 'memo', summary: "MAX"});
                            var invoiceNo = result.getValue({name: 'tranid', summary: "MAX"});
                            var unit = result.getValue({name: 'unit', summary: "MAX"});
                            var quantity = result.getValue({name: 'quantity', summary: "MAX"});
                            var rate = result.getValue({name: 'rate', summary: "MAX"});
                            var date = result.getValue({name: 'trandate', summary: "MAX"});
                            var profit = result.getValue({name: 'estgrossprofit', summary: "MAX"});
                            if (itemsArr.indexOf(item) == -1) {
                                var obj = {
                                    item: item,
                                    itemDescription: itemDescription,
                                    invoiceNo: invoiceNo,
                                    unit: unit,
                                    quantity: quantity,
                                    rate: rate,
                                    date: date,
                                    profit: profit
                                };
                                customerHistoryArr.push(obj);
                            }
                            return true;
                        });
                    }
                }
                catch (e) {
                    log.error('Error in Sales History Loop', e.toString());
                }
                return customerHistoryArr;
            }
            catch (error) {
                log.error('Error in getSalesHistory', error.toString());
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

        function forceParseFloat(stValue) {
            var flValue = parseFloat(stValue);
            if (isNaN(flValue) || (Infinity == stValue)) {
                return 0.00;
            }
            return flValue;
        }

        return {
            onRequest: onRequest
        };
    });