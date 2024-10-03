/**
 *@NApiVersion 2.x
 *@NScriptType Suitelet
 *@author Saurabh Singh 
 *@description 24/07/21 This script is created to show the Customer Item Pricing report through SuiteLet. It also has the function to download the 
 * report as CSV file. Suitelet will use the pagination to show more than 100 line details.
 */
define(['N/ui/serverWidget', 'N/search', 'N/file', 'N/url', 'N/task'], function (serverWidget, search, file, url, task) {

    const FILTERS = {};
    FILTERS.INACTIVE = 'isinactive';
    FILTERS.PRICING_LEVEL = 'itempricinglevel';
    FILTERS.INTERNALID = 'internalid';
    FILTERS.COMMODITY_CODE = 'custitem_acc_commodity_code';
    FILTERS.VENDOR = 'othervendor';
    FILTERS.ITEM = 'pricingitem'

    const COLUMNS = {};
    COLUMNS.NAME = 'altname';
    COLUMNS.PRICING_ITEM = 'pricingitem';
    COLUMNS.PRICING_LEVEL = 'itempricinglevel';
    COLUMNS.UNIT_PRICING = 'itempricingunitprice';
    COLUMNS.COMMODITY_CODE = 'custitem_acc_commodity_code';
    COLUMNS.VENDOR = 'othervendor';
    COLUMNS.DISPLAY_NAME = 'displayname';
    COLUMNS.ITEM_ID = 'itemid';

    const FORMFIELDS = {};
    FORMFIELDS.CUSTOMER = 'custpage_customer';
    FORMFIELDS.VENDOR = 'custpage_vendor';
    FORMFIELDS.COMMODITY_CODE = 'custpage_commodity_code';
    FORMFIELDS.PAGE_ID = 'custpage_pageid';
    FORMFIELDS.DOWNLOAD = 'custpage_download';

    FORMFIELDS.ITEM = 'custpage_item';
    FORMFIELDS.UPDATE_BUTTON = 'custpage_update';
    FORMFIELDS.INCREASE_PRICE = 'custpage_increase_price';
    FORMFIELDS.CHECK_ALL = 'custpage_check_all';

    const ITEMSUBLIST = {};
    ITEMSUBLIST.SUBLIST = 'custpage_sublist';
    ITEMSUBLIST.CUSTOMER = 'custpage_col_customer';
    ITEMSUBLIST.ITEM = 'custpage_col_item';
    ITEMSUBLIST.VENDOR = 'custpage_col_vendor';
    ITEMSUBLIST.COMMODITY_CODE = 'custpage_col_commodity_code';
    ITEMSUBLIST.PRICING_LEVEL = 'custpage_col_price_level';
    ITEMSUBLIST.UNIT_PRICING = 'custpage_col_unit_price';
    ITEMSUBLIST.UPDATE_PRICE = 'custpage_col_update_price';


    const FORMFIELDLABEL = {};
    FORMFIELDLABEL.CUSTOMER = 'CUSTOMER';
    FORMFIELDLABEL.VENDOR = 'VENDOR';
    FORMFIELDLABEL.COMMODITY_CODE = 'COMMODITY CODE';
    FORMFIELDLABEL.PAGE_ID = 'PAGE INDEX';
    FORMFIELDLABEL.DOWNLOAD = 'DOWNLOAD';

    FORMFIELDLABEL.ITEM = 'ITEM';
    FORMFIELDLABEL.INCREASE_PRICE = 'INCREASE PRICE %'
    FORMFIELDLABEL.UPDATE_BUTTON = 'UPDATE PRICE';
    FORMFIELDLABEL.CHECK_ALL = 'CHECK ALL ITEMS'

    const ITEMSUBLIST_LABEL = {};
    ITEMSUBLIST_LABEL.SUBLIST = 'ITEM PRICING';
    ITEMSUBLIST_LABEL.CUSTOMER = 'CUSTOMER';
    ITEMSUBLIST_LABEL.ITEM = 'ITEM';
    ITEMSUBLIST_LABEL.VENDOR = 'VENDOR';
    ITEMSUBLIST_LABEL.COMMODITY_CODE = 'COMMODITY CODE';
    ITEMSUBLIST_LABEL.PRICING_LEVEL = 'PRICE Level';
    ITEMSUBLIST_LABEL.UNIT_PRICING = 'UNIT PRICE';
    ITEMSUBLIST_LABEL.UPDATE_PRICE = 'UPDATE UNIT PRICE'

    var COLUMNSLIST = [];
    const PAGE_SIZE = 100;
    const CLIENT_SCRIPT_PATH = '/SuiteScripts/Item_Pricing_CPL_Report/CSE_Search_Pagination.js';
    const SOURCE_CUSTOMER = 'customer';
    const SOURCE_VENDOR = 'vendor';
    const SOURCE_COMMODITY_CODE = 'customrecord_acc_commodity_code';
    const SOURCE_ITEM = 'item';

    function onRequest(context) {
        try {
            var request = context.request;
            var response = context.response;
            if (request.method == 'GET') {
                var form = serverWidget.createForm({
                    title: 'Item Pricing CPL',
                    hideNavBar: false
                });

                // Set the Client script Path...
                form.clientScriptModulePath = CLIENT_SCRIPT_PATH;

                // Get all the request parameters values....
                var scriptId = request.parameters.script;
                var deploymentId = request.parameters.deploy;
                var pageId = parseInt(request.parameters.custpage_pageid) || 0
                var vendor = request.parameters.custpage_vendor;
                var commodityCode = request.parameters.custpage_commodity_code;
                var customer = request.parameters.custpage_customer;
                var item = request.parameters.custpage_item;
                // customer = 80681;
                var CSV = request.parameters.csv;

                log.debug('Parameters', 'scriptId: ' + scriptId + ', deploymentId: ' + deploymentId + ', pageId: ' + pageId + ', vendor: ' + vendor +
                    ', commodityCode: ' + commodityCode + ', customer: ' + customer + ', CSV: ' + CSV + ' Item ' + item);

                // Create Field to apply filters on search reqsults....
                var vendorField = form.addField({
                    id: FORMFIELDS.VENDOR,
                    label: FORMFIELDLABEL.VENDOR,
                    type: serverWidget.FieldType.SELECT,
                    source: SOURCE_VENDOR
                });

                var commodityCodeField = form.addField({
                    id: FORMFIELDS.COMMODITY_CODE,
                    label: FORMFIELDLABEL.COMMODITY_CODE,
                    type: serverWidget.FieldType.SELECT,
                    source: SOURCE_COMMODITY_CODE
                });

                var customerField = form.addField({
                    id: FORMFIELDS.CUSTOMER,
                    label: FORMFIELDLABEL.CUSTOMER,
                    type: serverWidget.FieldType.SELECT,
                    source: SOURCE_CUSTOMER
                });


                var itemField = form.addField({
                    id: FORMFIELDS.ITEM,
                    label: FORMFIELDLABEL.ITEM,
                    type: serverWidget.FieldType.SELECT,
                    source: SOURCE_ITEM
                });

                var percentIncreaseField = form.addField({
                    id: FORMFIELDS.INCREASE_PRICE,
                    label: FORMFIELDLABEL.INCREASE_PRICE,
                    type: serverWidget.FieldType.CURRENCY,
                });

                var checkAllField = form.addField({
                    id: FORMFIELDS.CHECK_ALL,
                    label: FORMFIELDLABEL.CHECK_ALL,
                    type: serverWidget.FieldType.CHECKBOX,
                });

                // Set the Selected values...
                if (_logValidation(customer)) {
                    customerField.defaultValue = customer
                }
                if (_logValidation(vendor)) {
                    vendorField.defaultValue = vendor
                }
                if (_logValidation(commodityCode)) {
                    commodityCodeField.defaultValue = commodityCode
                }
                if (_logValidation(item)) {
                    itemField.defaultValue = item
                }

                // Add Sublist..
                var itemSublist = addSublistField(form);
                // Get All the Items List based on selected Filter value...
                var itemList = getAllItems(item,vendor, commodityCode);

                // Run Search and determine page counts....
                var retriveSearch = runSearch(item,customer, PAGE_SIZE);
                log.audit("retriveSearch", retriveSearch);
                if(_logValidation(retriveSearch)){
                log.debug('retriveSearch', retriveSearch.count);
                var results;
                var pageCount = 1;
                if (_logValidation(vendor) || _logValidation(commodityCode)) {
                    log.debug('Showing Result', 'Only for selected Vendor: ' + vendor + ', & CommodityCode: ' + commodityCode);
                    // Search having filter for Item search...
                    results = fetchAllSearchResult(retriveSearch, itemList);
                    if (_logValidation(results)) {
                        pageCount = Math.ceil(results.length / PAGE_SIZE);
                    }
                } else {
                    try {
                        pageCount = Math.ceil(retriveSearch.count / PAGE_SIZE);
                        log.debug('Showing Result', 'only for Page ID: ' + pageId);
                        // Get Subset of data to be shown on the page...
                        results = fetchSearchResult(retriveSearch, itemList, pageId);
                    } catch (error) {
                        log.debug('error', error);
                    }

                }
                log.debug('pageCount', pageCount);
                // Set Page ID to correct value if out of index...
                if (!pageId || pageId == '' || pageId < 0)
                    pageId = 0;
                else if (pageId >= pageCount)
                    pageId = pageCount - 1;

                // Add Drop-down and option to navigate to specific page...
                var selectOptions = form.addField({
                    id: FORMFIELDS.PAGE_ID,
                    label: FORMFIELDLABEL.PAGE_ID,
                    type: serverWidget.FieldType.SELECT
                });
                log.debug('pageCount', pageCount);
                for (var i = 0; i < pageCount; i++) {
                    if (i == pageId) {
                        selectOptions.addSelectOption({
                            value: 'pageid_' + i,
                            text: ((i * PAGE_SIZE) + 1) + ' _ ' + ((i + 1) * PAGE_SIZE),
                            isSelected: true
                        });
                    } else {
                        selectOptions.addSelectOption({
                            value: 'pageid_' + i,
                            text: ((i * PAGE_SIZE) + 1) + ' _ ' + ((i + 1) * PAGE_SIZE),
                        });
                    }
                }

                log.audit("results", results)
                if (_logValidation(results)) {
                    log.debug('Final List Count', results.length);
                    addSublistData(itemSublist, results);
                    form.addButton({
                        id: FORMFIELDS.DOWNLOAD,
                        label: FORMFIELDLABEL.DOWNLOAD,
                        functionName: 'downloadCSV()'
                    });

                    if (CSV == 'true') {
                        runScheduledScript(customer, vendor, commodityCode)
                    }

                    form.addButton({
                        id: FORMFIELDS.UPDATE_BUTTON,
                        label: FORMFIELDLABEL.UPDATE_BUTTON,
                        functionName: 'showPriceModal()'
                    });

                    response.writePage(form);

                    }

                }
            }
            if (request.method == 'POST') {
                var vendor = request.parameters.custpage_vendor;
                var commodityCode = request.parameters.custpage_commodity_code;
                var customer = request.parameters.custpage_customer;
                var itemParam = request.parameters.custpage_item;
                var updateCustomers = request.parameters.custpage_update_customers;
                // customer = 80681;

                if (updateCustomers) {
                    var dataToUpdate = request.body;
                    var customersToUpdate = dataToUpdate ? JSON.parse(dataToUpdate) : [];
                    var percentageIncrease = request.parameters.custpage_increase_percentage
                    log.audit("percentageIncrease", percentageIncrease)
                    if (!customersToUpdate || customersToUpdate.length == 0) return;
                    var data = {}
                    for (var i = 0; i < customersToUpdate.length; i++) {
                        var customer = customersToUpdate[i].customer;
                        var item = customersToUpdate[i].item;
                        var newPrice = customersToUpdate[i].newPrice;
                        var unitPrice = customersToUpdate[i].unitPrice;
                        if (!data[customer]) {
                            data[customer] = [];
                        }
                        data[customer].push({
                            customer: customer,
                            item: item,
                            newPrice: newPrice,
                            unitPrice:unitPrice
                        })
                    }
                    var mrTask = task.create({
                        taskType: task.TaskType.MAP_REDUCE,
                        scriptId: "customscript_sdb_update_unit_price_cpl",
                        deploymentId: "customdeploy_sdb_update_unit_price_cpl",
                        params: {
                            'custscript_data_to_update': JSON.stringify(data),
                            'custscript_increase_percentage': percentageIncrease
                        },
                    });
                    var taskId = mrTask.submit();
                    log.debug("taskId", taskId)
                } else {
                    var itemList = getAllItems(itemParam,vendor, commodityCode);
                    var retriveSearch = runSearch(itemParam,customer, PAGE_SIZE);
                    if (_logValidation(retriveSearch)) {
                        log.debug('retriveSearch', retriveSearch.count);
                        var results;
                        var pageCount = 1;
                        results = fetchAllSearchResult(retriveSearch, itemList);
                        response.write(JSON.stringify(results));
                    }
                }
            }
        } catch (error) {
            log.error("OnRequest error", error)
        }
    }

    // Add Sublist and it's field on the Form....
    function addSublistField(form) {
        try {
            var itemSublist = form.addSublist({
                id: ITEMSUBLIST.SUBLIST,
                label: ITEMSUBLIST_LABEL.SUBLIST,
                type: serverWidget.SublistType.LIST
            });

            var customer = itemSublist.addField({
                id: ITEMSUBLIST.CUSTOMER,
                label: ITEMSUBLIST_LABEL.CUSTOMER,
                type: serverWidget.FieldType.SELECT,
                source: SOURCE_CUSTOMER
            });
            customer.updateDisplayType({
                displayType: serverWidget.FieldDisplayType.INLINE
            });

            var item = itemSublist.addField({
                id: ITEMSUBLIST.ITEM,
                label: ITEMSUBLIST_LABEL.ITEM,
                type: serverWidget.FieldType.SELECT,
                source: SOURCE_ITEM
            });
            item.updateDisplayType({
                displayType: serverWidget.FieldDisplayType.INLINE
            });

            var vendor = itemSublist.addField({
                id: ITEMSUBLIST.VENDOR,
                label: ITEMSUBLIST_LABEL.VENDOR,
                type: serverWidget.FieldType.SELECT,
                source: SOURCE_VENDOR
            });
            vendor.updateDisplayType({
                displayType: serverWidget.FieldDisplayType.INLINE
            });

            var commodityCode = itemSublist.addField({
                id: ITEMSUBLIST.COMMODITY_CODE,
                label: ITEMSUBLIST_LABEL.COMMODITY_CODE,
                type: serverWidget.FieldType.SELECT,
                source: SOURCE_COMMODITY_CODE
            });
            commodityCode.updateDisplayType({
                displayType: serverWidget.FieldDisplayType.INLINE
            });

            var priceLevel = itemSublist.addField({
                id: ITEMSUBLIST.PRICING_LEVEL,
                label: ITEMSUBLIST_LABEL.PRICING_LEVEL,
                type: serverWidget.FieldType.TEXT
            });

            var unitPrice = itemSublist.addField({
                id: ITEMSUBLIST.UNIT_PRICING,
                label: ITEMSUBLIST_LABEL.UNIT_PRICING,
                type: serverWidget.FieldType.CURRENCY
            });

            var increasePrice = itemSublist.addField({
                id: ITEMSUBLIST.UPDATE_PRICE,
                label: ITEMSUBLIST_LABEL.UPDATE_PRICE,
                type: serverWidget.FieldType.CHECKBOX,
            });

            return itemSublist;
        } catch (error) {
            log.error("addSublistFields error", error)
        }
    }

    // Run the seaved search and return page data
    function runSearch(item,customer, searchPageSize) {
        try {
            var filterExp = [];
            filterExp.push([FILTERS.INACTIVE, search.Operator.IS, "F"]);
            filterExp.push("AND");
            filterExp.push([FILTERS.PRICING_LEVEL, search.Operator.NONEOF, "@NONE@"]);

            if (_logValidation(customer)) {
                filterExp.push("AND");
                filterExp.push([FILTERS.INTERNALID, search.Operator.ANYOF, customer]);
            }
            if (_logValidation(item)) {
                filterExp.push("AND");
                filterExp.push([FILTERS.ITEM, search.Operator.ANYOF, item]);
            }

            var searchObj = search.create({
                type: search.Type.CUSTOMER,
                filters: filterExp,
                columns:
                    [
                        search.createColumn({ name: COLUMNS.NAME, label: "Name" }),
                        search.createColumn({ name: COLUMNS.PRICING_ITEM, label: "Pricing Item" }),
                        search.createColumn({ name: COLUMNS.PRICING_LEVEL, label: "Item Pricing Level" }),
                        search.createColumn({ name: COLUMNS.UNIT_PRICING, label: "Item Pricing Unit Price" })
                    ]
            });

            COLUMNSLIST = searchObj.columns;
            var searchCount = searchObj.runPaged().count;
            log.debug('Customer Pricing Search', 'Result Count: ' + searchCount);
            if (searchCount > 0) {
                return searchObj.runPaged({ pageSize: searchPageSize });
            }

        } catch (error) {
            log.error('Pricing Search Error', error);
        }
    }

    // Get All the Item...
    function getAllItems(item,vendor, commodityCode) {
        var itemList = [];
        try {
            var filterExp = [];
            filterExp.push(["isinactive", "is", "F"]);

            if (_logValidation(item)) {
                filterExp.push("AND");
                filterExp.push([FILTERS.INTERNALID, search.Operator.ANYOF, item]);
            }
            if (_logValidation(vendor)) {
                filterExp.push("AND");
                filterExp.push([FILTERS.VENDOR, search.Operator.ANYOF, vendor]);
            }

            if (_logValidation(commodityCode)) {
                filterExp.push("AND");
                filterExp.push([FILTERS.COMMODITY_CODE, search.Operator.ANYOF, commodityCode]);
            }

            var itemSearchObj = search.create({
                type: search.Type.ITEM,
                filters: filterExp,
                columns: //
                    [
                        search.createColumn({ name: COLUMNS.ITEM_ID, label: "Acme Code" }),
                        search.createColumn({ name: COLUMNS.DISPLAY_NAME, label: "Display Name" }),
                        search.createColumn({ name: COLUMNS.VENDOR, label: "Vendor" }),
                        search.createColumn({ name: COLUMNS.COMMODITY_CODE, label: "Commodity Code" })
                    ]
            });

            var searchResultCount = itemSearchObj.runPaged().count;
            log.debug("item Search", "Result Count: " + searchResultCount);

            var pageData = itemSearchObj.runPaged();
            pageData.pageRanges.forEach(function (pageRange) {
                var searchPage = pageData.fetch({ index: pageRange.index });
                searchPage.data.forEach(function (result) {
                    if (result) {
                        itemList.push({
                            'id': result.id,
                            'itemid': result.getValue({ name: COLUMNS.ITEM_ID }),
                            'displayname': result.getValue({ name: COLUMNS.DISPLAY_NAME }),
                            'vendor': result.getValue({ name: COLUMNS.VENDOR }),
                            'commodity_code': result.getValue({ name: COLUMNS.COMMODITY_CODE })
                        });
                    }
                    return true;
                });
            });
        } catch (error) {
            log.debug('Item Search Error', error);
        }

        return itemList;
    }

    // Getting subset of data to be shown on the page...
    function fetchSearchResult(pagedData, itemList, pageIndex) {
        try {
            log.debug('Fetch Result', 'only for Page index: ' + pageIndex);
            var searchPage = pagedData.fetch({
                index: pageIndex
            });

            var results = new Array();
            searchPage.data.forEach(function (res) {

                var itemId = res.getValue({ name: COLUMNS.PRICING_ITEM });
                var itemFilter = itemList.filter(function (i) {
                    return i.itemid == itemId;
                });
                if (_logValidation(itemFilter)) {
                    //log.debug('Item', 'Item: '+itemFilter[0].id+', Result: '+itemId);
                    var customer = res.id;
                    var vendor = itemFilter[0].vendor;
                    var commodityCode = itemFilter[0].commodity_code;
                    var item = itemFilter[0].id;
                    var pricingLevel = res.getText({ name: COLUMNS.PRICING_LEVEL }) || 'Custom';
                    var unitPrice = res.getValue({ name: COLUMNS.UNIT_PRICING }) || 0.00;

                    results.push({
                        'customer': customer,
                        'item': item,
                        'vendor': vendor,
                        'commodityCode': commodityCode,
                        'pricelevel': pricingLevel,
                        'unitPrice': unitPrice
                    });
                }
                return true
            });
            return results;
        } catch (error) {
            log.error("fetchSearchResult error", error)
        }
    }

    // Fetch All the result....
    function fetchAllSearchResult(pagedData, itemList) {
        try {
            log.debug('Fetch Result', 'Fetching all the results for item Count: ' + itemList.length);
            var results = new Array();
            pagedData.pageRanges.forEach(function (pageRange) {
                var searchPage = pagedData.fetch({ index: pageRange.index });

                searchPage.data.forEach(function (res) {

                    var itemId = res.getValue({ name: COLUMNS.PRICING_ITEM });
                    var itemFilter = itemList.filter(function (i) {
                        return i.itemid == itemId;
                    });
                    if (_logValidation(itemFilter)) {
                        //log.debug('Item', 'Item: '+itemFilter[0].id+', Result: '+itemId);
                        var customer = res.id;
                        var vendor = itemFilter[0].vendor;
                        var commodityCode = itemFilter[0].commodity_code;
                        var item = itemFilter[0].id;
                        var pricingLevel = res.getText({ name: COLUMNS.PRICING_LEVEL }) || 'Custom';
                        var unitPrice = res.getValue({ name: COLUMNS.UNIT_PRICING }) || 0.00;

                        results.push({
                            'customer': customer,
                            'item': item,
                            'vendor': vendor,
                            'commodityCode': commodityCode,
                            'pricelevel': pricingLevel,
                            'unitPrice': unitPrice
                        });
                    }
                    return true
                });
            });

            return results;
        } catch (error) {
            log.error("fetchAllSearchResult error", error)
        }
    }

    // Add Filtered Data to the sublist to show on the page...
    function addSublistData(itemSublist, results) {
        try {
            log.debug('Data Subset', 'Start adding Data subset for total Line ' + results.length);

            for (var line = 0; line < results.length; line++) {
                //log.debug('results: '+line,results[line]);
                if (_logValidation(results[line].customer)) {
                    itemSublist.setSublistValue({
                        id: ITEMSUBLIST.CUSTOMER,
                        line: line,
                        value: results[line].customer
                    });
                }

                if (_logValidation(results[line].item)) {
                    itemSublist.setSublistValue({
                        id: ITEMSUBLIST.ITEM,
                        line: line,
                        value: results[line].item
                    });
                }

                if (_logValidation(results[line].vendor)) {
                    itemSublist.setSublistValue({
                        id: ITEMSUBLIST.VENDOR,
                        line: line,
                        value: results[line].vendor
                    });
                }

                if (_logValidation(results[line].commodityCode)) {
                    itemSublist.setSublistValue({
                        id: ITEMSUBLIST.COMMODITY_CODE,
                        line: line,
                        value: results[line].commodityCode
                    });
                }

                itemSublist.setSublistValue({
                    id: ITEMSUBLIST.PRICING_LEVEL,
                    line: line,
                    value: results[line].pricelevel
                });

                itemSublist.setSublistValue({
                    id: ITEMSUBLIST.UNIT_PRICING,
                    line: line,
                    value: results[line].unitPrice
                });
            }
            log.debug('Data Subset', 'End adding Data subset');
        } catch (error) {
            log.error("AddSublistData error", error)
        }
    }

    // Create CSV file From the search result to download on the "Download" bitton click...
    function createCSVFile(pageData, itemList) {
        try {
            var fileData = [];
            var firstRow = [ITEMSUBLIST_LABEL.CUSTOMER, ITEMSUBLIST_LABEL.ITEM, ITEMSUBLIST_LABEL.VENDOR, ITEMSUBLIST_LABEL.COMMODITY_CODE,
            ITEMSUBLIST_LABEL.PRICING_LEVEL, ITEMSUBLIST_LABEL.UNIT_PRICING];

            fileData.push(firstRow);

            pageData.pageRanges.forEach(function (pageRange) {
                var searchPage = pageData.fetch({ index: pageRange.index });
                searchPage.data.forEach(function (result) {
                    if (_logValidation(result)) {
                        var row = [];
                        var itemId = result.getValue({ name: COLUMNS.PRICING_ITEM });
                        var itemFilter = itemList.filter(function (i) {
                            return i.itemid == itemId;
                        });
                        if (_logValidation(itemFilter)) {
                            var itemName = itemFilter[0].displayname;
                            var vendor = itemFilter[0].vendor;
                            var commodityCode = itemFilter[0].commodity_code;
                            row.push(result.getValue({ name: COLUMNS.NAME }) || ' ');
                            row.push(itemName || ' ');
                            row.push(vendor || ' ');
                            row.push(commodityCode || ' ');
                            row.push('Custom');
                            row.push(result.getValue({ name: COLUMNS.PRICING_ITEM }) || 0.00);
                            fileData.push(row);
                        }
                    }
                    return true;
                });
            });

            if (fileData.length > 2) {
                var contents = '';
                for (var i = 0; i < fileData.length; i++) {
                    contents += fileData[i].toString() + '\n';
                }
                var fileObj = file.create({
                    name: 'Customer_Item_Pricing_CPL.csv',
                    fileType: file.Type.CSV,
                    contents: contents,
                    description: 'This file contain the Customer Item Pricing details.',
                    encoding: file.Encoding.UTF8
                });
                return fileObj;
            }

        } catch (error) {
            log.debug('Createing CSV File Error', error);
        }
    }

    // validate the field values...
    function _logValidation(value) {
        if (value != null && value != '' && value != undefined && value != 'undefined' && value != 'NaN') {
            return true
        } else {
            return false;
        }
    }

    // Call the schdeuled script to create CSV file and save it to file Cabinate...
    function runScheduledScript(customer, vendor, commodityCode) {
        try {
            var scheduleTask = task.create({
                taskType: task.TaskType.SCHEDULED_SCRIPT,
                deploymentId: 'customdeploy_sch_item_pricing_report_fil',
                params: {
                    'custscript_customer': customer,
                    'custscript_vendor': vendor,
                    'custscript_commodity_code': commodityCode
                },
                scriptId: 'customscript_sch_item_pricing_report_fil'
            });
            var taskId = scheduleTask.submit();
        } catch (error) {
            log.debug('Error on Creating task', error);
        }
    }

    // Add Page Indexing....
    function addPageIndex(retriveSearch) {

    }

    return {
        onRequest: onRequest
    }
});