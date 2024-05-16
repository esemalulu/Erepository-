/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */

define(['N/search', 'N/log', 'N/record', 'N/ui/serverWidget', 'N/runtime'], function (search, log, record, serverWidget, runtime) {


    const OPTION_FILTERS = [{ text: 'Have Enough', value: 'yes' }, { text: 'Not Enough', value: 'no' }, { text: 'No Filter', value: 'noFilter' }]

    const FORMFIELDS = {};
    FORMFIELDS.FILTER = 'custpage_sort';
    FORMFIELDS.SELECT = 'custpage_sort_select';
    FORMFIELDS.BUYERFILTER = 'custpage_buyers';

    const ORDERSUBLIST = {};
    ORDERSUBLIST.SUBLIST = 'custpage_sublist';
    ORDERSUBLIST.INTERNAL_ID = 'custpage_col_internal_id';
    ORDERSUBLIST.VIEW = 'custpage_col_view_so';
    ORDERSUBLIST.ORDER_NUMBER = 'custpage_col_order_number';
    ORDERSUBLIST.DATE = 'custpage_col_date';
    ORDERSUBLIST.ENTERED_BY = 'custpage_col_entered_by';
    ORDERSUBLIST.SALES_REP = 'custpage_col_sales_rep';
    ORDERSUBLIST.CUSTOMER = 'custpage_col_customer';
    ORDERSUBLIST.VENDOR = 'custpage_col_vendor';
    ORDERSUBLIST.VENDOR_PART = 'custpage_col_vendor_part';
    ORDERSUBLIST.ITEM = 'custpage_col_item';
    ORDERSUBLIST.DESCRIPTION = 'custpage_col_description';
    ORDERSUBLIST.QTY_ON_ORDER = 'custpage_col_qty_on_order';
    ORDERSUBLIST.BUYER = 'custpage_col_buyer';
    ORDERSUBLIST.DNR = 'custpage_col_dnr';
    ORDERSUBLIST.HAVE_ENOUGH = 'custpage_col_have_enough'


    const ORDERSUBLIST_LABEL = {};
    ORDERSUBLIST_LABEL.SUBLIST = 'Sales orders with Special order items for Buyers';
    ORDERSUBLIST_LABEL.INTERNAL_ID = 'SO ID';
    ORDERSUBLIST_LABEL.VIEW = 'VIEW';
    ORDERSUBLIST_LABEL.ORDER_NUMBER = 'ORDER NUMBER';
    ORDERSUBLIST_LABEL.DATE = 'DATE';
    ORDERSUBLIST_LABEL.ENTERED_BY = 'ENTERED BY';
    ORDERSUBLIST_LABEL.SALES_REP = 'SALES REP';
    ORDERSUBLIST_LABEL.CUSTOMER = 'CUSTOMER';
    ORDERSUBLIST_LABEL.VENDOR = 'VENDOR';
    ORDERSUBLIST_LABEL.VENDOR_PART = 'VENDOR PART';
    ORDERSUBLIST_LABEL.ITEM = 'ITEM';
    ORDERSUBLIST_LABEL.DESCRIPTION = 'DESCRIPTION';
    ORDERSUBLIST_LABEL.QTY_ON_ORDER = 'QTY ON ORDER';
    ORDERSUBLIST_LABEL.BUYER = 'BUYER';
    ORDERSUBLIST_LABEL.DNR = 'DNR';
    ORDERSUBLIST_LABEL.HAVE_ENOUGH = 'Have Enough To Fulfill';
    ORDERSUBLIST_LABEL.FILTER = 'FILTER';

    function onRequest(context) {
        try {
            var request = context.request;
            var response = context.response;
            var buyersSortParam = request.parameters.custpage_buyers
            var sortOptionParam = context?.request?.parameters?.custom_param_sortOption;
            if (!sortOptionParam) sortOptionParam = 'noFilter'

            if (request.method == 'GET') {

                var form = serverWidget.createForm({
                    title: 'Sales orders with Special order items for Buyers',
                    hideNavBar: false
                });
                form.clientScriptModulePath = "SuiteScripts/SDB-sort-results.js"
                var orderSublist = addSublistField(form);

                var sales_order_internal_ids = getInternalIdOfSpecialSalesOrder(sortOptionParam, buyersSortParam);
                var data_special_sales_order = getDataOfSpecialSalesOrder(sales_order_internal_ids, sortOptionParam, buyersSortParam)
                addSublistData(orderSublist, data_special_sales_order, sortOptionParam)

                //Buyers filter added 3-20-24//
                var buyersFld = form.addField({
                    id: FORMFIELDS.BUYERFILTER,
                    type: serverWidget.FieldType.SELECT,
                    label: 'Buyers',
                    source: 'employee'
                });
                //*-*-*-*-*-*-*-*-*-*-*-*-*-*//

                var sortOption = form.addField({ id: FORMFIELDS.SELECT, type: 'SELECT', label: 'Have Enough To Fulfill' });
                form.addButton({ id: FORMFIELDS.FILTER, label: ORDERSUBLIST_LABEL.FILTER });
                for (let i = 0; i < OPTION_FILTERS.length; i++) {
                    if (OPTION_FILTERS[i].value == sortOptionParam) {
                        sortOption.addSelectOption({
                            value: OPTION_FILTERS[i].value,
                            text: OPTION_FILTERS[i].text,
                            isSelected: true
                        });
                    } else {
                        sortOption.addSelectOption({
                            value: OPTION_FILTERS[i].value,
                            text: OPTION_FILTERS[i].text
                        });
                    }
                }
                response.writePage(form);
            }
        } catch (error) {
            log.debug('onRequest: ', error)
        }
    }



    function getInternalIdOfSpecialSalesOrder(sortOptionParam, buyersSortParam) {
        try {
            var searchFilters = [
                ["type", "anyof", "SalesOrd"],
                "AND",
                ["custbody_dropship_order", "is", "F"],
                "AND",
                ["item.custitem_dnr", "anyof", "2", "3"],
                "AND",
                ["status", "anyof", "SalesOrd:E", "SalesOrd:B", "SalesOrd:D"],
            ];
            if (sortOptionParam == 'yes') {
                // log.debug('yes filter added')
                searchFilters.push("AND");
                searchFilters.push(["formulatext: CASE WHEN ({item.quantityonhand} + {item.quantitybackordered}) > {quantity} THEN 1 ELSE 0 END", "startswith", "1"]);
            }

            if (sortOptionParam == 'no') {
                // log.debug('NO filter added')
                searchFilters.push("AND");
                searchFilters.push(["formulatext: CASE WHEN ({item.quantityonhand} + {item.quantitybackordered}) > {quantity} THEN 1 ELSE 0 END", "startswith", "0"]);
            }

            if (buyersSortParam) {
                searchFilters.push("AND");
                searchFilters.push(["item.custitem_buyer", "anyof", buyersSortParam]);
            }

            var salesorderSearchObj = search.create({
                type: "salesorder",
                filters: searchFilters,
                columns: [
                    search.createColumn({
                        name: "internalid",
                        summary: "GROUP",
                        label: "Internal ID"
                    })
                ]
            });

            var internalIds = [];

            salesorderSearchObj.run().each(function (result) {
                var internalId = result.getValue({
                    name: 'internalid',
                    summary: 'GROUP'
                });
                internalIds.push(internalId);
                return true;
            });
            return internalIds;
        } catch (error) {
            log.debug('ERROR: getInternalIdOfSpecialSalesOrder', error)
        }
    }


    function getDataOfSpecialSalesOrder(salesOrderIds, sortOptionParam, buyersSortParam) {
        try {
            if (!salesOrderIds || salesOrderIds.length <= 0) return { results: [], itemIds: salesOrderIds }
            var ordersIds = salesOrderIds;
            var results = [];
            var last_iteration_length = 0;
            for (let i = 0; i <= ordersIds.length && last_iteration_length != ordersIds.length; i++) {
                var searchFilters = [
                    ["type", "anyof", "SalesOrd"],
                    "AND",
                    ["internalid", "anyof", ordersIds],
                    "AND",
                    ["custbody_dropship_order", "is", "F"],
                    "AND",
                    ["item.custitem_dnr", "anyof", "2", "3"],
                    "AND",
                    ["status", "anyof", "SalesOrd:E", "SalesOrd:B", "SalesOrd:D"],
                ];
                if (sortOptionParam == 'yes') {
                    // log.debug('yes filter added')
                    searchFilters.push("AND");
                    searchFilters.push(["formulatext: CASE WHEN ({item.quantityonhand} + {item.quantitybackordered}) > {quantity} THEN 1 ELSE 0 END", "startswith", "1"]);
                }

                if (sortOptionParam == 'no') {
                    // log.debug('NO filter added')
                    searchFilters.push("AND");
                    searchFilters.push(["formulatext: CASE WHEN ({item.quantityonhand} + {item.quantitybackordered}) > {quantity} THEN 1 ELSE 0 END", "startswith", "0"]);
                }

                if (buyersSortParam) {
                    searchFilters.push("AND");
                    searchFilters.push(["item.custitem_buyer", "anyof", buyersSortParam]);
                }

                last_iteration_length = ordersIds.length;
                var salesorderSearchObj = search.create({
                    type: "salesorder",
                    filters: searchFilters,
                    columns:
                        [
                            search.createColumn({ name: "tranid", label: "Sales Order Number" }),
                            search.createColumn({ name: "trandate", label: "Date" }),
                            search.createColumn({ name: "custbody_aps_entered_by", label: "ENTERED BY" }),
                            search.createColumn({ name: "salesrep", label: "Sales Rep" }),
                            search.createColumn({ name: "mainname", label: "Customer" }),
                            search.createColumn({
                                name: "othervendor",
                                join: "item",
                                label: "Vendor"
                            }),
                            search.createColumn({
                                name: "vendorname",
                                join: "item",
                                label: "Vendor part#"
                            }),
                            search.createColumn({ name: "item", label: "Item" }),
                            search.createColumn({
                                name: "displayname",
                                join: "item",
                                label: "Description"
                            }),
                            search.createColumn({ name: "quantity", label: "Qty On Order" }),
                            search.createColumn({
                                name: "custitem_buyer",
                                join: "item",
                                label: "Buyer"
                            }),
                            search.createColumn({
                                name: "custitem_dnr",
                                join: "item",
                                label: "DNR"
                            }),
                            search.createColumn({ name: "internalid", label: "Internal ID" }),
                            search.createColumn({
                                name: "formulatext",
                                formula: "CASE WHEN ({item.quantityonhand} + {item.quantitybackordered}) > {quantity} THEN 'Yes' ELSE 'No' END",
                                label: "Formula (Text)"
                            })
                        ]
                });

                var search_sale_order_values = salesorderSearchObj.run().getRange({ start: 0, end: 1000 })
                for (let i = 0; i < ordersIds.length; i++) {
                    var orderIdCompare = ordersIds[i];
                    var indexOfSO = search_sale_order_values.findIndex(so => so.id == orderIdCompare);
                    if (indexOfSO != -1) {
                        ordersIds = ordersIds.filter(so => so != orderIdCompare)
                        var resultObj = search_sale_order_values[indexOfSO]
                        var result_obj_string = JSON.stringify(resultObj)
                        var result_obj_json = JSON.parse(result_obj_string)
                        var soObject = {
                            internalId: result_obj_json?.id,
                            orderNumber: result_obj_json?.values?.tranid,
                            date: result_obj_json?.values?.trandate,
                            enteredBy: result_obj_json?.values?.custbody_aps_entered_by[0]?.text,
                            salesRep: result_obj_json?.values?.salesrep[0]?.text,
                            customer: result_obj_json?.values?.mainname[0]?.text,
                            vendor: result_obj_json?.values['item.othervendor'][0]?.text,
                            vendorPart: result_obj_json?.values['item.vendorname'],
                            item: result_obj_json?.values?.item[0]?.text,
                            description: result_obj_json?.values['item.displayname'],
                            quantity: result_obj_json?.values?.quantity,
                            buyer: result_obj_json?.values['item.custitem_buyer'][0]?.text,
                            dnr: result_obj_json?.values['item.custitem_dnr'][0]?.text,
                            haveEnough: result_obj_json?.values['formulatext']
                        }
                        // var index = results.findIndex(so => so.internalId==soObject.internalId && so.item == soObject.item);
                        // if(index==-1)results.push(soObject)
                        results.push(soObject)
                    }
                }
            }

            return results
        } catch (error) {
            log.debug("getDataOfSpecialSalesOrder", error);
        }
    }

    function addSublistField(form) {
        try {
            var orderSublist = form.addSublist({
                id: ORDERSUBLIST.SUBLIST,
                label: ORDERSUBLIST_LABEL.SUBLIST,
                type: serverWidget.SublistType.LIST,
            });
            orderSublist.addField({
                id: ORDERSUBLIST.VIEW,
                label: ORDERSUBLIST_LABEL.VIEW,
                type: serverWidget.FieldType.URL
            }).linkText = 'View';

            orderSublist.addField({
                id: ORDERSUBLIST.INTERNAL_ID,
                label: ORDERSUBLIST_LABEL.INTERNAL_ID,
                type: serverWidget.FieldType.TEXT,
            });
            orderSublist.addField({
                id: ORDERSUBLIST.ORDER_NUMBER,
                label: ORDERSUBLIST_LABEL.ORDER_NUMBER,
                type: serverWidget.FieldType.TEXT,
            });
            orderSublist.addField({
                id: ORDERSUBLIST.DATE,
                label: ORDERSUBLIST_LABEL.DATE,
                type: serverWidget.FieldType.TEXT
            });
            orderSublist.addField({
                id: ORDERSUBLIST.ENTERED_BY,
                label: ORDERSUBLIST_LABEL.ENTERED_BY,
                type: serverWidget.FieldType.TEXT
            });
            orderSublist.addField({
                id: ORDERSUBLIST.SALES_REP,
                label: ORDERSUBLIST_LABEL.SALES_REP,
                type: serverWidget.FieldType.TEXT
            });
            orderSublist.addField({
                id: ORDERSUBLIST.CUSTOMER,
                label: ORDERSUBLIST_LABEL.CUSTOMER,
                type: serverWidget.FieldType.TEXT
            });
            orderSublist.addField({
                id: ORDERSUBLIST.VENDOR,
                label: ORDERSUBLIST_LABEL.VENDOR,
                type: serverWidget.FieldType.TEXT
            });
            orderSublist.addField({
                id: ORDERSUBLIST.VENDOR_PART,
                label: ORDERSUBLIST_LABEL.VENDOR_PART,
                type: serverWidget.FieldType.TEXT
            });

            orderSublist.addField({
                id: ORDERSUBLIST.ITEM,
                label: ORDERSUBLIST_LABEL.ITEM,
                type: serverWidget.FieldType.TEXT
            });
            orderSublist.addField({
                id: ORDERSUBLIST.DESCRIPTION,
                label: ORDERSUBLIST_LABEL.DESCRIPTION,
                type: serverWidget.FieldType.TEXT
            });
            orderSublist.addField({
                id: ORDERSUBLIST.QTY_ON_ORDER,
                label: ORDERSUBLIST_LABEL.QTY_ON_ORDER,
                type: serverWidget.FieldType.TEXT
            });
            orderSublist.addField({
                id: ORDERSUBLIST.BUYER,
                label: ORDERSUBLIST_LABEL.BUYER,
                type: serverWidget.FieldType.TEXT
            });
            orderSublist.addField({
                id: ORDERSUBLIST.DNR,
                label: ORDERSUBLIST_LABEL.DNR,
                type: serverWidget.FieldType.TEXT
            });
            orderSublist.addField({
                id: ORDERSUBLIST.HAVE_ENOUGH,
                label: ORDERSUBLIST_LABEL.HAVE_ENOUGH,
                type: serverWidget.FieldType.TEXT
            });
            return orderSublist;

        } catch (error) {
            log.debug("addSublistField", error)
        }
    }

    function addSublistData(orderSublist, results, option) {
        try {
            log.debug('results.length', results.length + ' option ' + option)
            if (!results) return
            for (var i = 0; i < results.length; i++) {

                var account = runtime.accountId
                if (account.includes("_")) {
                    account = account.replace("_", "-")
                }
                var urlValue = `https://${account}.app.netsuite.com/app/accounting/transactions/salesord.nl?id=${results[i].internalId}&whence=`
                orderSublist.setSublistValue({
                    id: ORDERSUBLIST.VIEW,
                    line: i,
                    value: urlValue
                })
                orderSublist.setSublistValue({
                    id: ORDERSUBLIST.INTERNAL_ID,
                    line: i,
                    value: (results[i] && results[i].internalId) ? results[i]?.internalId : 'N/A'
                });
                orderSublist.setSublistValue({
                    id: ORDERSUBLIST.ORDER_NUMBER,
                    line: i,
                    value: (results[i] && results[i].orderNumber) ? results[i]?.orderNumber : 'N/A'
                });
                orderSublist.setSublistValue({
                    id: ORDERSUBLIST.DATE,
                    line: i,
                    value: (results[i] && results[i].date) ? results[i]?.date : 'N/A'
                });
                orderSublist.setSublistValue({
                    id: ORDERSUBLIST.ENTERED_BY,
                    line: i,
                    value: (results[i] && results[i].enteredBy) ? results[i]?.enteredBy : 'N/A'
                });
                orderSublist.setSublistValue({
                    id: ORDERSUBLIST.SALES_REP,
                    line: i,
                    value: (results[i] && results[i].salesRep) ? results[i]?.salesRep : 'N/A'
                });
                orderSublist.setSublistValue({
                    id: ORDERSUBLIST.CUSTOMER,
                    line: i,
                    value: (results[i] && results[i].customer) ? results[i]?.customer : 'N/A'
                });
                orderSublist.setSublistValue({
                    id: ORDERSUBLIST.VENDOR,
                    line: i,
                    value: (results[i] && results[i].vendor) ? results[i]?.vendor : 'N/A'
                });
                orderSublist.setSublistValue({
                    id: ORDERSUBLIST.VENDOR_PART,
                    line: i,
                    value: (results[i] && results[i].vendorPart) ? results[i]?.vendorPart : 'N/A'
                });

                orderSublist.setSublistValue({
                    id: ORDERSUBLIST.ITEM,
                    line: i,
                    value: (results[i] && results[i].item) ? results[i]?.item : 'N/A'
                });
                orderSublist.setSublistValue({
                    id: ORDERSUBLIST.DESCRIPTION,
                    line: i,
                    value: (results[i] && results[i].description) ? results[i]?.description : 'N/A'
                });
                orderSublist.setSublistValue({
                    id: ORDERSUBLIST.QTY_ON_ORDER,
                    line: i,
                    value: (results[i] && results[i].quantity) ? results[i]?.quantity : 'N/A'
                });
                orderSublist.setSublistValue({
                    id: ORDERSUBLIST.BUYER,
                    line: i,
                    value: (results[i] && results[i].buyer) ? results[i]?.buyer : 'N/A'
                });
                orderSublist.setSublistValue({
                    id: ORDERSUBLIST.DNR,
                    line: i,
                    value: (results[i] && results[i].dnr) ? results[i]?.dnr : 'N/A'
                });
                orderSublist.setSublistValue({
                    id: ORDERSUBLIST.HAVE_ENOUGH,
                    line: i,
                    value: (results[i] && results[i].haveEnough) ? results[i]?.haveEnough : 'N/A'
                });

            }
            return;
        } catch (error) {
            log.debug("error addSublistDataTransactionResults", error)
        }
    }

    return {
        onRequest: onRequest
    };
});
