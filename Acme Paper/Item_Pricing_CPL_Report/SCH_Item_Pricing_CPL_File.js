/**
 *@NApiVersion 2.x
 *@NScriptType ScheduledScript
 */
define(['N/search', 'N/file', 'N/url','N/runtime'], function(search, file, url, runtime) {

    const PAGE_SIZE = 1000;

    const FILTERS = {};
    FILTERS.INACTIVE = 'isinactive';
    FILTERS.PRICING_LEVEL = 'itempricinglevel';
    FILTERS.INTERNALID = 'internalid';
    FILTERS.COMMODITY_CODE = 'custitem_acc_commodity_code';
    FILTERS.VENDOR = 'othervendor';

    const COLUMNS = {};
    COLUMNS.NAME = 'altname';
    COLUMNS.PRICING_ITEM = 'pricingitem';
    COLUMNS.PRICING_LEVEL = 'itempricinglevel';
    COLUMNS.UNIT_PRICING = 'itempricingunitprice';
    COLUMNS.COMMODITY_CODE = 'custitem_acc_commodity_code';
    COLUMNS.VENDOR = 'othervendor';
    COLUMNS.DISPLAY_NAME = 'displayname';
    COLUMNS.ITEM_ID = 'itemid';

    const ITEMSUBLIST_LABEL = {};
    ITEMSUBLIST_LABEL.SUBLIST = 'ITEM PRICING';
    ITEMSUBLIST_LABEL.CUSTOMER = 'CUSTOMER';
    ITEMSUBLIST_LABEL.ITEM = 'ITEM';
    ITEMSUBLIST_LABEL.VENDOR = 'VENDOR';
    ITEMSUBLIST_LABEL.COMMODITY_CODE = 'COMMODITY CODE';
    ITEMSUBLIST_LABEL.PRICING_LEVEL = 'PRICE Level';
    ITEMSUBLIST_LABEL.UNIT_PRICING = 'UNIT PRICE';

    const FORMFIELDS = {};
    FORMFIELDS.CUSTOMER = 'custpage_customer';
    FORMFIELDS.VENDOR = 'custpage_vendor';
    FORMFIELDS.COMMODITY_CODE = 'custpage_commodity_code';
    FORMFIELDS.PAGE_ID = 'custpage_pageid';
    FORMFIELDS.DOWNLOAD = 'custpage_download';

    const ITEMSUBLIST = {};
    ITEMSUBLIST.SUBLIST = 'custpage_sublist';
    ITEMSUBLIST.CUSTOMER = 'custpage_col_customer';
    ITEMSUBLIST.ITEM = 'custpage_col_item';
    ITEMSUBLIST.VENDOR = 'custpage_col_vendor';
    ITEMSUBLIST.COMMODITY_CODE = 'custpage_col_commodity_code';
    ITEMSUBLIST.PRICING_LEVEL = 'custpage_col_price_level';
    ITEMSUBLIST.UNIT_PRICING = 'custpage_col_unit_price';


    const FORMFIELDLABEL = {};
    FORMFIELDLABEL.CUSTOMER = 'CUSTOMER';
    FORMFIELDLABEL.VENDOR = 'VENDOR';
    FORMFIELDLABEL.COMMODITY_CODE = 'COMMODITY CODE';
    FORMFIELDLABEL.PAGE_ID = 'PAGE INDEX';
    FORMFIELDLABEL.DOWNLOAD = 'DOWNLOAD';

    function execute(context) {

        var scriptObj = runtime.getCurrentScript();
        var customer = scriptObj.getParameter({name: 'custscript_customer'});
        var vendor = scriptObj.getParameter({name: 'custscript_vendor'});
        var commodityCode = scriptObj.getParameter({name: 'custscript_commodity_code'});
        var retriveSearch = runSearch(customer, PAGE_SIZE);
        var itemList = getAllItems(vendor, commodityCode);
        if(_logValidation(retriveSearch) && _logValidation(itemList)){
            var fileId = createCSVFile(retriveSearch, itemList);
        }
    }


     // Run the seaved search and return page data
     function runSearch (customer, searchPageSize){

        try {
            var filterExp = [];
            filterExp.push([FILTERS.INACTIVE, search.Operator.IS,"F"]);
            filterExp.push("AND");
            filterExp.push([FILTERS.PRICING_LEVEL, search.Operator.NONEOF,"@NONE@"]);

            if(_logValidation(customer)){
                filterExp.push("AND");
                filterExp.push([FILTERS.INTERNALID, search.Operator.ANYOF, customer]);
            }
            
            var searchObj = search.create({
                type: search.Type.CUSTOMER,
                filters: filterExp,
                columns:
                [
                   search.createColumn({name: COLUMNS.NAME, label: "Name"}),
                   search.createColumn({name: COLUMNS.PRICING_ITEM, label: "Pricing Item"}),
                   search.createColumn({name: COLUMNS.PRICING_LEVEL, label: "Item Pricing Level"}),
                   search.createColumn({name: COLUMNS.UNIT_PRICING, label: "Item Pricing Unit Price"})
                ]
             });

             COLUMNSLIST = searchObj.columns;
             var searchCount = searchObj.runPaged().count;
             log.debug('Customer Pricing Search', 'Result Count: '+searchCount);
             if(searchCount> 0){
                 return searchObj.runPaged({pageSize: searchPageSize});
             }

        } catch (error) {
            log.debug('Pricing Search Error', error);
        }
    }

    // Get All the Item...
    function getAllItems(vendor, commodityCode){
        var itemList = [];
        try {
            var filterExp = [];
            filterExp.push(["isinactive","is","F"]);
            
            if(_logValidation(vendor)){
                filterExp.push("AND");
                filterExp.push([FILTERS.VENDOR, search.Operator.ANYOF, vendor]);
            }

            if(_logValidation(commodityCode)){
                filterExp.push("AND");
                filterExp.push([FILTERS.COMMODITY_CODE, search.Operator.ANYOF, commodityCode]);
            }

            var itemSearchObj = search.create({
                type: search.Type.ITEM,
                filters: filterExp,
                columns: //
                [
                    search.createColumn({name: COLUMNS.ITEM_ID, label: "Acme Code"}),
                   search.createColumn({name: COLUMNS.DISPLAY_NAME, label: "Display Name"}),
                   search.createColumn({name: COLUMNS.VENDOR, label: "Vendor"}),
                   search.createColumn({name: COLUMNS.COMMODITY_CODE, label: "Commodity Code"})
                ]
             });

             var searchResultCount = itemSearchObj.runPaged().count;
             log.debug("item Search","Result Count: "+searchResultCount);

             var pageData = itemSearchObj.runPaged();
             pageData.pageRanges.forEach(function (pageRange){
                 var searchPage = pageData.fetch({index: pageRange.index});
                 searchPage.data.forEach(function (result){
                     if(result){
                        itemList.push({
                            'id': result.id,
                            'itemid': result.getValue({name: COLUMNS.ITEM_ID}),
                            'displayname': result.getValue({name: COLUMNS.DISPLAY_NAME}),
                            'vendor': result.getText({name: COLUMNS.VENDOR}),
                            'commodity_code': result.getText({name: COLUMNS.COMMODITY_CODE})
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

    // Create CSV file From the search result to download on the "Download" bitton click...
    function createCSVFile(pageData, itemList){
        try {
            var fileData = [];
            var firstRow = [ITEMSUBLIST_LABEL.CUSTOMER, ITEMSUBLIST_LABEL.ITEM, ITEMSUBLIST_LABEL.VENDOR, ITEMSUBLIST_LABEL.COMMODITY_CODE,
                ITEMSUBLIST_LABEL.PRICING_LEVEL, ITEMSUBLIST_LABEL.UNIT_PRICING];
            
            fileData.push(firstRow);
            
            pageData.pageRanges.forEach(function (pageRange){
                var searchPage = pageData.fetch({index: pageRange.index});
                searchPage.data.forEach(function (result){
                    if(_logValidation(result)){
                        var row = [];
                        var itemId = result.getValue({name: COLUMNS.PRICING_ITEM});
                        var itemFilter = itemList.filter(function (i){
                            return i.itemid == itemId;
                        });
                        if(_logValidation(itemFilter)){
                            var itemName = itemFilter[0].displayname;
                            itemName = itemName.replace(',',' ');
                            var vendor = itemFilter[0].vendor;
                            vendor = vendor.replace(',',' ');
                            var commodityCode = itemFilter[0].commodity_code;
                            commodityCode = commodityCode.replace(',',' ');
                            var customer = result.getValue({name: COLUMNS.NAME});
                            customer = customer.replace(',',' ');
                            row.push(customer||' ');
                            row.push(itemName||' ');
                            row.push(vendor||' ');
                            row.push(commodityCode||' ');
                            row.push('Custom');
                            row.push(result.getValue({name: COLUMNS.UNIT_PRICING})||0.00);
                            fileData.push(row);
                        }
                    }
                    return true;
                });
            });
            log.debug('fileData', fileData.length);
            if(fileData.length > 2){
                var contents = '';
                for(var i=0; i<fileData.length; i++){
                    contents += fileData[i].toString()+'\n';
                }
                var date = new Date();
                var fileObj = file.create({
                    name: 'Customer_Item_Pricing_CPL'+date+'.csv',
                    fileType: file.Type.CSV,
                    contents: contents,
                    description: 'This file contain the Customer Item Pricing details.',
                    encoding: file.Encoding.UTF8
                });
                fileObj.folder = 9590;
                var fileId = fileObj.save();
                return fileId;
            }
            
        } catch (error) {
            log.debug('Createing CSV File Error', error);
        }
    }

    // validate the field values...
    function _logValidation(value){
    	if(value != null && value != '' && value != undefined && value != 'undefined' && value != 'NaN'){
    		return true
    	}else{
    		return false;
    	}
    }

    return {
        execute: execute
    }
});
