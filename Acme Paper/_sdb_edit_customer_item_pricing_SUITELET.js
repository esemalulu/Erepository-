/**
 *@NApiVersion 2.1
 *@NScriptType Suitelet
 */
 define(['N/ui/serverWidget', 'N/search', 'N/record', 'N/file','N/runtime'], function (serverWidget, search, record, file,runtime) {

    const OPTION_FILTERS = [{text:'ITEM',value:'item',type:'number'},{text:'PRICE LEVEL',value:'priceLevel',type:'number'},{text:'CURRENT SELL',value:'currentSell',type:'number'},{text:'COMMODITY',value:'commodity',type:'text'},{text:'WH AVAIL',value:'whAvail',type:'number'},{text:'UNIT COST',value:'unitCost',type:'number'},{text:'CURRENT GP%',value:'currentGp',type:'number'},{text:'LAST SELL',value:'lastSell',type:'number'},{text:'LAST COST',value:'lastCost',type:'number'},{text:'LAST QUANTITY',value:'lastQuantity',type:'number'},{text:'LAST SALE DATE',value:'saleDate',type:'date'},{text:'LAST GP%',value:'lastGp',type:'number'},{text:'COST TYPE',value:'costType',type:'text'}]
    
    const FORMFIELDS = {};
    FORMFIELDS.SAVE = 'custpage_save';
    FORMFIELDS.CANCEL = 'custpage_cancel';
    FORMFIELDS.SORT = 'custpage_sort';
    FORMFIELDS.SELECT = 'custpage_sort_select';
    FORMFIELDS.ASCENDING_SORT   = 'custpage_ascending_sort';
    FORMFIELDS.DOWNLOAD_EXCEL = 'custpage_download_excel';

    const ITEMSUBLIST = {};
    ITEMSUBLIST.SUBLIST = 'custpage_sublist';
    ITEMSUBLIST.CUSTOMER = 'custpage_col_customer';
    ITEMSUBLIST.ITEM = 'custpage_col_item';
    ITEMSUBLIST.PRICING_LEVEL = 'custpage_col_price_level';
    ITEMSUBLIST.CURRENT_SELL = 'custpage_col_current_sell';
    ITEMSUBLIST.COMMODITY = 'custpage_commodity';
    ITEMSUBLIST.WH_AVAIL = 'custpage_wh_avail';
    ITEMSUBLIST.UNIT_COST = 'custpage_unit_cost';
    ITEMSUBLIST.CURRENT_GP ='custpage_current_gp';
    ITEMSUBLIST.LAST_SELL ='custpage_last_sell';
    ITEMSUBLIST.LAST_COST ='custpage_last_cost';
    ITEMSUBLIST.LAST_QUANTITY ='custpage_last_quantity';
    ITEMSUBLIST.LAST_SALE_DATE ='custpage_last_sale_date';
    ITEMSUBLIST.LAST_GP ='custpage_last_gp';
    ITEMSUBLIST.COST_TYPE = 'custpage_cost_type'

    const FORMFIELDLABEL = {};
    FORMFIELDLABEL.SAVE = 'SAVE';
    FORMFIELDLABEL.CANCEL = 'CANCEL';
    FORMFIELDLABEL.SORT = 'SORT';
    FORMFIELDLABEL.DOWNLOAD_EXCEL = "GENERATE EXCEL";

    const ITEMSUBLIST_LABEL = {};
    ITEMSUBLIST_LABEL.SUBLIST = 'ITEM PRICING';
    ITEMSUBLIST_LABEL.CUSTOMER = 'CUSTOMER';
    ITEMSUBLIST_LABEL.ITEM = 'ITEM';
    ITEMSUBLIST_LABEL.PRICING_LEVEL = 'PRICE Level';
    ITEMSUBLIST_LABEL.CURRENT_SELL = 'Current Sell';
    ITEMSUBLIST_LABEL.COMMODITY = 'COMMODITY';
    ITEMSUBLIST_LABEL.WH_AVAIL = 'WH AVAIL C/S';
    ITEMSUBLIST_LABEL.UNIT_COST = 'UNIT COST C/S' ;
    ITEMSUBLIST_LABEL.CURRENT_GP = 'CURRENT GP%';
    ITEMSUBLIST_LABEL.LAST_SELL = 'LAST SELL C/S';
    ITEMSUBLIST_LABEL.LAST_COST = 'LAST COST C/S';
    ITEMSUBLIST_LABEL.LAST_QUANTITY = 'LAST QUANTITY C/S';
    ITEMSUBLIST_LABEL.LAST_SALE_DATE = 'LAST SALE DATE';
    ITEMSUBLIST_LABEL.LAST_GP = 'LAST GP%';
    ITEMSUBLIST_LABEL.COST_TYPE = 'COST TYPE';

    const SOURCE_CUSTOMER = 'customer';
    const SOURCE_ITEM = 'item';
    const SOURCE_PRICE_LEVEL = [];

    function onRequest(context) {
        try {
            var request = context.request;
            var response = context.response;
            var downloadExcel = context?.request?.parameters?.download_excel;
            var customerParam = context?.request?.parameters?.custom_param_customer;
            if (request.method == 'GET') {
                var sortOptionParam = context?.request?.parameters?.custom_param_sortOption;
                var isAscendingSortParam = context?.request?.parameters?.custom_param_isAscendingSort;

                var form = serverWidget.createForm({title: 'Item Pricing CPL',hideNavBar: false});
                form.clientScriptModulePath = "SuiteScripts/sdb_item_pricing.js"

                if (customerParam) {
                    //set price level options to price level select field
                    setPriceLevelOptionsToSelectField();
                    //Create sublist
                    var itemSublist = addSublistField(form);
                    var retriveSearch = runSearch(customerParam);
                    // log.debug("retriveSearch",retriveSearch)
                    var sortedResults = sortResults(retriveSearch,sortOptionParam,isAscendingSortParam);
                    if ((sortedResults)) {
                        addSublistData(itemSublist,sortedResults,customerParam)
                    }
                    form.addButton({
                        id: FORMFIELDS.SAVE,
                        label: FORMFIELDLABEL.SAVE,
                    });
                    form.addButton({
                        id: FORMFIELDS.CANCEL,
                        label: FORMFIELDLABEL.CANCEL,
                        functionName: 'cancelEdition(' + customerParam + ')'
                    });
                    form.addButton({
                        id: FORMFIELDS.DOWNLOAD_EXCEL,
                        label: FORMFIELDLABEL.DOWNLOAD_EXCEL,
                        functionName: 'downloadExcel()'
                    });
                    var sortOption = form.addField({ id:FORMFIELDS.SELECT, type: 'SELECT', label: 'Sort Criteria (Descending default)' });
                    var isAscendingSort = form.addField({id:FORMFIELDS.ASCENDING_SORT,type:'CHECKBOX',label:'Ascending Sort'})
                    form.addButton({id: FORMFIELDS.SORT,label: FORMFIELDLABEL.SORT});
                    if(isAscendingSortParam=='true') isAscendingSort.defaultValue='T'
                    for (let i = 0; i < OPTION_FILTERS.length; i++) {
                        if(OPTION_FILTERS[i].value==sortOptionParam){
                            sortOption.addSelectOption({
                                value: OPTION_FILTERS[i].value,
                                text: OPTION_FILTERS[i].text,
                                isSelected:true
                            });
                        }else{
                            sortOption.addSelectOption({
                                value: OPTION_FILTERS[i].value,
                                text: OPTION_FILTERS[i].text
                            });
                        }
                    }
                    response.writePage(form);
                }
            }else if(downloadExcel && request.method === "POST" && customerParam){
                log.debug({
                    title: "customerparam",
                    details: customerParam
                })
                var customer = record.load({
                    type: record.Type.CUSTOMER,
                    id: Number(customerParam)
                });
                var customerName = customer.getValue({
                    fieldId: "entitytitle"
                }).replaceAll(","," ");
                var response = JSON.parse(request.body);
                var xmlString = `${ITEMSUBLIST_LABEL.CUSTOMER},${ITEMSUBLIST_LABEL.ITEM},${ITEMSUBLIST_LABEL.PRICING_LEVEL},${ITEMSUBLIST_LABEL.COMMODITY},${ITEMSUBLIST_LABEL.CURRENT_SELL},${ITEMSUBLIST_LABEL.UNIT_COST},${ITEMSUBLIST_LABEL.CURRENT_GP},${ITEMSUBLIST_LABEL.LAST_SALE_DATE},${ITEMSUBLIST_LABEL.LAST_SELL},${ITEMSUBLIST_LABEL.LAST_COST},${ITEMSUBLIST_LABEL.LAST_GP},${ITEMSUBLIST_LABEL.LAST_QUANTITY},${ITEMSUBLIST_LABEL.WH_AVAIL},${ITEMSUBLIST_LABEL.COST_TYPE}\n`;
                response.forEach((customRow) => {
                    log.debug({
                        title: 'customrow',
                        details: customRow
                    });
                    xmlString += `${customerName},${customRow.item.replaceAll(","," ")},${customRow.priceLevel},${customRow.commodity},${customRow.currentSell},${customRow.unitCost},${customRow.currentGp},${customRow.saleDate},${customRow.lastSell},${customRow.lastCost},${customRow.lastGp},${customRow.lastQuantity},${customRow.whAvail},${customRow.costType}\n`;
                });
                try {
                    var scriptObj = runtime.getCurrentScript();
                    var folderId = scriptObj.getParameter({ name: 'custscript_sdb_excel_folder_id' });
                    var fileName = "Item_pricing_excel.csv";
                    var newFile = file.create({
                        name: fileName,
                        fileType: file.Type.CSV,
                        contents: xmlString,
                        folder: folderId
                    });
                    var fileId = newFile.save();
                    newFile = file.load({
                        id: fileId
                    });
                    context.response.write(JSON.stringify(newFile.url));
                } catch (error) {
                    log.error({
                        title: "error file",
                        details: error
                    });
                }
            }
            if (request.method == 'POST') {

                var custom_param_data = context?.request?.parameters?.custom_param_data
                var custom_param_data_json = JSON.parse(custom_param_data)

                var customer_id = custom_param_data_json?.custom_param_customer_id
                var new_item_pricing_list = custom_param_data_json?.custom_param_item_pricing_to_insert;
                var items_pricing_to_remove = custom_param_data_json?.custom_param_item_pricing_to_remove;

                if (new_item_pricing_list && new_item_pricing_list.length > 0 && customer_id) {
                    log.debug(" ", "-----------------UPDATE / INSERT LINE -----------------------")
                    var customerLoaded = record.load({
                        type: record.Type.CUSTOMER,
                        id: customer_id,
                        isDynamic: true,
                    });
                    for (let i = 0; i < new_item_pricing_list.length; i++) {
                        var itemLine = customerLoaded.findSublistLineWithValue({
                            sublistId: 'itempricing',
                            fieldId: 'item',
                            value: new_item_pricing_list[i].item
                        });
                        //-----------------Update CURRENT Item Line-------------------
                        if (itemLine != -1) {
                            try {
                                log.debug("UPDATE LINE ", itemLine)
                                var lineSelected = customerLoaded.selectLine({sublistId: 'itempricing',line: itemLine})

                                if (customerLoaded.getCurrentSublistValue({ sublistId: 'itempricing', fieldId: 'item', line: lineSelected }) != new_item_pricing_list[i].item) {
                                    customerLoaded.setCurrentSublistValue({ sublistId: 'itempricing',fieldId: 'item',line: lineSelected,value: new_item_pricing_list[i].item});
                                }
                                customerLoaded.setCurrentSublistValue({sublistId: 'itempricing',fieldId: 'level',line: lineSelected,value: new_item_pricing_list[i].priceLevel});
                                customerLoaded.setCurrentSublistValue({sublistId: 'itempricing',fieldId: 'price',line: lineSelected,value: new_item_pricing_list[i].currentsell});
                                customerLoaded.commitLine({sublistId: 'itempricing'});
                            } catch (error) {
                                log.debug("Update Current Lines Error: ", error)
                            }
                        } else {
                            //-----------------Add NEW Line for the Item -------------------
                            try {
                                customerLoaded.selectNewLine({sublistId: 'itempricing'});
                                customerLoaded.setCurrentSublistValue({sublistId: 'itempricing',fieldId: 'item', value: new_item_pricing_list[i].item,forceSyncSourcing: true});
                                customerLoaded.setCurrentSublistValue({sublistId: 'itempricing',fieldId: 'level',value: new_item_pricing_list[i].priceLevel,forceSyncSourcing: true});
                                customerLoaded.setCurrentSublistValue({sublistId: 'itempricing',fieldId: 'price',value: new_item_pricing_list[i].currentsell,forceSyncSourcing: true});
                                customerLoaded.commitLine({sublistId: 'itempricing'});
                            } catch (error) {
                                log.debug("insert new line error: ", error)
                            }
                        }
                    }
                    customerLoaded.save({ignoreMandatoryFields: true});
                }
                if(items_pricing_to_remove && items_pricing_to_remove.length>0 && customer_id){
                    //---------------------------REMOVE ITEMS-------------------------
                    log.debug('items_pricing_to_remove',items_pricing_to_remove)
                    var customerLoaded = record.load({
                        type: record.Type.CUSTOMER,
                        id: customer_id,
                        isDynamic: true,
                    });
                    for (let i = 0; i < items_pricing_to_remove.length; i++) {
                        var itemLineToRemove = customerLoaded.findSublistLineWithValue({
                            sublistId: 'itempricing',
                            fieldId: 'item',
                            value: items_pricing_to_remove[i]
                        });
                        if(itemLineToRemove!=-1){
                            try {
                                customerLoaded.removeLine({
                                    sublistId: 'itempricing',
                                    line: itemLineToRemove,
                                    ignoreRecalc: true
                                });
                            } catch (error) {
                                log.debug('Error removing line', itemLineToRemove + 'Error: '+ error)
                            }
                        }
                    }
                    customerLoaded.save({
                        ignoreMandatoryFields: true
                    });
                }
            }
        } catch (error) {
            log.debug("onReques", error)
        }
    }

    function sortResults(resultsReturn,sortOptionParam,isAscendingSortParam){
        try {
            var sortOptionType = OPTION_FILTERS.find(option => option.value==sortOptionParam)
            if(!sortOptionType)return resultsReturn;
            log.debug('sortOptionParam',sortOptionParam)
                if(sortOptionType.type=='number'){
                    //Order by number
                    if(isAscendingSortParam==true || isAscendingSortParam=='T' ||isAscendingSortParam=='true'){
                        resultsReturn = resultsReturn.sort((p1, p2) => (Number(p1[sortOptionParam]) > Number(p2[sortOptionParam])) ? 1 : Number((p1[sortOptionParam]) < Number(p2[sortOptionParam])) ? -1 : 0);
                    }else{
                        resultsReturn = resultsReturn.sort((p1, p2) => (Number(p1[sortOptionParam]) < Number(p2[sortOptionParam])) ? 1 : Number((p1[sortOptionParam]) > Number(p2[sortOptionParam])) ? -1 : 0);
                    }
                }else if(sortOptionType.type=='text'){
                    //Order by text
                    if(isAscendingSortParam==true || isAscendingSortParam=='T' ||isAscendingSortParam=='true'){
                        resultsReturn = resultsReturn.sort((p1, p2) => (p1[sortOptionParam] > p2[sortOptionParam]) ? 1 : (p1[sortOptionParam] < p2[sortOptionParam]) ? -1 : 0);
                    }else{
                        resultsReturn = resultsReturn.sort((p1, p2) => (p1[sortOptionParam] < p2[sortOptionParam]) ? 1 : (p1[sortOptionParam] > p2[sortOptionParam]) ? -1 : 0);
                    }
                }else if(sortOptionType.type=='date'){
                    //Order by date
                    if(isAscendingSortParam==true || isAscendingSortParam=='T' ||isAscendingSortParam=='true'){
                        resultsReturn = resultsReturn.sort((p1, p2) => (new Date(p1[sortOptionParam]) > new Date(p2[sortOptionParam])) ? 1 : (new Date(p1[sortOptionParam]) < new Date(p2[sortOptionParam])) ? -1 : -1);
                    }else{
                        resultsReturn = resultsReturn.sort((p1, p2) => (new Date(p1[sortOptionParam]) < new Date(p2[sortOptionParam])) ? 1 : (new Date(p1[sortOptionParam]) > new Date(p2[sortOptionParam])) ? -1 : 0);
                    }
                }
                return resultsReturn
        } catch (error) {
            log.debug("sortResults error",error)
        }
    }

    // Add Sublist and it's field on the Form....
    function addSublistField(form) {
        try {
            var itemSublist = form.addSublist({
                id: ITEMSUBLIST.SUBLIST,
                label: ITEMSUBLIST_LABEL.SUBLIST,
                type: serverWidget.SublistType.INLINEEDITOR,
            });

            var customer = itemSublist.addField({
                id: ITEMSUBLIST.CUSTOMER,
                label: ITEMSUBLIST_LABEL.CUSTOMER,
                type: serverWidget.FieldType.SELECT,
                source: SOURCE_CUSTOMER
            });
            customer.updateDisplayType({
                displayType: serverWidget.FieldDisplayType.DISABLED
            });

            var item = itemSublist.addField({
                id: ITEMSUBLIST.ITEM,
                label: ITEMSUBLIST_LABEL.ITEM,
                type: serverWidget.FieldType.SELECT,
                source: SOURCE_ITEM
            });
            item.updateDisplayType({
                displayType: serverWidget.FieldDisplayType.NORMAL
            });
            item.isMandatory = true;
            try {
                var priceLevel = itemSublist.addField({
                    id: ITEMSUBLIST.PRICING_LEVEL,
                    label: ITEMSUBLIST_LABEL.PRICING_LEVEL,
                    type: serverWidget.FieldType.SELECT
                });

                for (let i = 0; i < SOURCE_PRICE_LEVEL.length; i++) {
                    priceLevel.addSelectOption({
                        value: SOURCE_PRICE_LEVEL[i].id,
                        text: SOURCE_PRICE_LEVEL[i].name
                    });
                }
                priceLevel.updateDisplayType({
                    displayType: serverWidget.FieldDisplayType.NORMAL
                });
            } catch (error) {
                log.debug("priceLevel errror", error)
            }

            var commodity = itemSublist.addField({
                id: ITEMSUBLIST.COMMODITY,
                label: ITEMSUBLIST_LABEL.COMMODITY,
                type: serverWidget.FieldType.TEXT
            });
            commodity.updateDisplayType({
                displayType: serverWidget.FieldDisplayType.DISABLED
            });
            
            var currentSell = itemSublist.addField({
                id: ITEMSUBLIST.CURRENT_SELL,
                label: ITEMSUBLIST_LABEL.CURRENT_SELL,
                type: serverWidget.FieldType.TEXT
            });
            currentSell.updateDisplayType({
                displayType: serverWidget.FieldDisplayType.ENTRY
            });
            var unit_cost =itemSublist.addField({
                id: ITEMSUBLIST.UNIT_COST,
                label: ITEMSUBLIST_LABEL.UNIT_COST,
                type: serverWidget.FieldType.TEXT
            });
            unit_cost.updateDisplayType({
                displayType: serverWidget.FieldDisplayType.DISABLED
            });

            var current_gp = itemSublist.addField({
                id: ITEMSUBLIST.CURRENT_GP,
                label: ITEMSUBLIST_LABEL.CURRENT_GP,
                type: serverWidget.FieldType.TEXT
            });
            var last_sale_date =itemSublist.addField({
                id: ITEMSUBLIST.LAST_SALE_DATE,
                label: ITEMSUBLIST_LABEL.LAST_SALE_DATE,
                type: serverWidget.FieldType.TEXT
            });
            last_sale_date.updateDisplayType({
                displayType: serverWidget.FieldDisplayType.DISABLED
            });

            var last_sell =itemSublist.addField({
                id: ITEMSUBLIST.LAST_SELL,
                label: ITEMSUBLIST_LABEL.LAST_SELL,
                type: serverWidget.FieldType.TEXT
            });
            last_sell.updateDisplayType({
                displayType: serverWidget.FieldDisplayType.DISABLED
            });
                  
            var last_cost =itemSublist.addField({
                id: ITEMSUBLIST.LAST_COST,
                label: ITEMSUBLIST_LABEL.LAST_COST,
                type: serverWidget.FieldType.TEXT
            });
            last_cost.updateDisplayType({
                displayType: serverWidget.FieldDisplayType.DISABLED
            });

            var last_gp =itemSublist.addField({
                id: ITEMSUBLIST.LAST_GP,
                label: ITEMSUBLIST_LABEL.LAST_GP,
                type: serverWidget.FieldType.TEXT
            });
            last_gp.updateDisplayType({
                displayType: serverWidget.FieldDisplayType.DISABLED
            });

            var last_quantity =itemSublist.addField({
                id: ITEMSUBLIST.LAST_QUANTITY,
                label: ITEMSUBLIST_LABEL.LAST_QUANTITY,
                type: serverWidget.FieldType.TEXT
            });
            last_quantity.updateDisplayType({
                displayType: serverWidget.FieldDisplayType.DISABLED
            });

            var wh_avail = itemSublist.addField({
                id: ITEMSUBLIST.WH_AVAIL,
                label: ITEMSUBLIST_LABEL.WH_AVAIL,
                type: serverWidget.FieldType.TEXT
            });
            wh_avail.updateDisplayType({
                displayType: serverWidget.FieldDisplayType.DISABLED
            });
            
            var costType = itemSublist.addField({
                id: ITEMSUBLIST.COST_TYPE,
                label: ITEMSUBLIST_LABEL.COST_TYPE,
                type: serverWidget.FieldType.TEXT
            });
            costType.updateDisplayType({
                displayType: serverWidget.FieldDisplayType.DISABLED
            });


            itemSublist.updateUniqueFieldId({
                id: ITEMSUBLIST.ITEM
            })

            return itemSublist;
        } catch (error) {
            log.debug("addSublistField", error)
        }
    }

    function runSearch(customer) {
        try {
            var result = [];
            var itemIds = []; 
            var customerLoaded = record.load({type: record.Type.CUSTOMER,id:customer})
            var sublistCount = customerLoaded.getLineCount({
                sublistId: 'itempricing'
            })
            for (let i = 0; i < sublistCount; i++) {
                var itemId = customerLoaded.getSublistValue({sublistId: 'itempricing',fieldId: 'item',line: i});
                itemIds.push(itemId);
                var obj = {
                    item: itemId,
                    itemText: customerLoaded.getSublistText({sublistId: 'itempricing',fieldId: 'item',line: i}).substring(0, customerLoaded.getSublistText({sublistId: 'itempricing',fieldId: 'item',line: i}).indexOf(' ')),
                    priceLevel: customerLoaded.getSublistValue({sublistId: 'itempricing',fieldId: 'level',line: i}),
                    currentSell: customerLoaded.getSublistValue({sublistId: 'itempricing',fieldId: 'price',line: i}),
                    commodity: customerLoaded.getSublistValue({sublistId: 'itempricing',fieldId: 'custpage_commodity',line: i}),
                    //If the customer not have value for the column ("N/A") we set Number.MIN_VALUE to be able to sort the value("N/A") like a number value
                    whAvail: customerLoaded.getSublistValue({sublistId: 'itempricing',fieldId: 'custpage_wh_avail',line: i})=="N/A"?Number.MIN_VALUE:customerLoaded.getSublistValue({sublistId: 'itempricing',fieldId: 'custpage_wh_avail',line: i}),
                    unitCost: customerLoaded.getSublistValue({sublistId: 'itempricing',fieldId: 'custpage_unit_cost',line: i})=="N/A"?Number.MIN_VALUE:customerLoaded.getSublistValue({sublistId: 'itempricing',fieldId: 'custpage_unit_cost',line: i}),
                    currentGp: customerLoaded.getSublistValue({sublistId: 'itempricing',fieldId: 'custpage_current_gp',line: i})=="N/A"?Number.MIN_VALUE:customerLoaded.getSublistValue({sublistId: 'itempricing',fieldId: 'custpage_current_gp',line: i}),
                    lastSell: customerLoaded.getSublistValue({sublistId: 'itempricing',fieldId: 'custpage_last_sell',line: i})=="N/A"?Number.MIN_VALUE:customerLoaded.getSublistValue({sublistId: 'itempricing',fieldId: 'custpage_last_sell',line: i}),
                    lastCost: customerLoaded.getSublistValue({sublistId: 'itempricing',fieldId: 'custpage_last_cost',line: i})=="N/A"?Number.MIN_VALUE:customerLoaded.getSublistValue({sublistId: 'itempricing',fieldId: 'custpage_last_cost',line: i}),
                    lastQuantity: customerLoaded.getSublistValue({sublistId: 'itempricing',fieldId: 'custpage_last_quantity',line: i})=="N/A"?Number.MIN_VALUE:customerLoaded.getSublistValue({sublistId: 'itempricing',fieldId: 'custpage_last_quantity',line: i}),
                    saleDate: (customerLoaded.getSublistValue({sublistId: 'itempricing',fieldId: 'custpage_last_sale_date',line: i})=="N/A") ||!customerLoaded.getSublistValue({sublistId: 'itempricing',fieldId: 'custpage_last_sale_date',line: i}) ?'01/01/1980':customerLoaded.getSublistValue({sublistId: 'itempricing',fieldId: 'custpage_last_sale_date',line: i}),
                    lastGp: customerLoaded.getSublistValue({sublistId: 'itempricing',fieldId: 'custpage_last_gp',line: i})=="N/A"?Number.MIN_VALUE:customerLoaded.getSublistValue({sublistId: 'itempricing',fieldId: 'custpage_last_gp',line: i}),
                    costType : 'Item Defined Cost'
                }
                result.push(obj)
            }
            searchRebateCosts(result, customer,itemIds)
            return result
        } catch (error) {
            log.debug('Pricing Search Error', error);
        }
    }

    
    function searchRebateCosts(itemPricingData,customerId,itemIds) {
        try {
            var rebateCostItemSearch = search.create({
                type: "customrecord_rebate_parent",
                filters:
                    [
                        ["isinactive", "is", "F"],
                        "AND",
                        ["custrecord_rebate_start_date", "onorbefore", "today"],
                        "AND",
                        ["custrecord_rebate_end_date", "onorafter", "today"],
                        "AND",
                        ["custrecord_rebate_customer_rebate_parent.custrecord_rebate_customer_customer", "anyof", customerId],
                        "AND",
                        ["custrecord_rebate_items_parent.custrecord_rebate_items_item", "anyof", itemIds]
                    ],
                columns:
                    [
                        search.createColumn({name: "custrecord_rebate_items_item",join: "CUSTRECORD_REBATE_ITEMS_PARENT",label: "Item"}),
                        search.createColumn({name: "custrecord_rebate_item_defined_cost",join: "CUSTRECORD_REBATE_ITEMS_PARENT",label: "Item Defined Cost"}),
                        search.createColumn({name: "custrecord_rebate_items_rebate_cost",join: "CUSTRECORD_REBATE_ITEMS_PARENT",label: "Rebate Cost"})
                    ]
            });
            rebateCostItemSearch.run().each(function (result) {
                var itemId = result.getValue({ name: "custrecord_rebate_items_item", join: "CUSTRECORD_REBATE_ITEMS_PARENT" })
                var itemObj = itemPricingData.find(obj => obj.item == itemId);
                log.debug("rebate cost item obj", itemObj);
                itemObj.costType = "Contracted Cost"
                return true;
            });
        } catch (error) {
            log.error('Error in searchRebateCosts', error)
        }
    }


    // Add Filtered Data to the sublist to show on the page...
    function addSublistData(itemSublist, results,customer) {
        try {
            for (var i = 0; i < results.length; i++) {
                if ((customer)) {
                    itemSublist.setSublistValue({
                        id: ITEMSUBLIST.CUSTOMER,
                        line: i,
                        value: customer
                    });
                }
                if ((results[i].item)) {
                    itemSublist.setSublistValue({
                        id: ITEMSUBLIST.ITEM,
                        line: i,
                        value: results[i].item
                    });
                }
                var actual_price_level_index = SOURCE_PRICE_LEVEL.findIndex(obj => obj.id == results[i].priceLevel)
                itemSublist.setSublistValue({
                    id: ITEMSUBLIST.PRICING_LEVEL,
                    line: i,
                    value: SOURCE_PRICE_LEVEL[actual_price_level_index]?.id ? SOURCE_PRICE_LEVEL[actual_price_level_index]?.id : -1
                });

                itemSublist.setSublistValue({
                    id: ITEMSUBLIST.CURRENT_SELL,
                    line: i,
                    value: results[i].currentSell || 'N/A'
                });

                itemSublist.setSublistValue({
                    id: ITEMSUBLIST.COMMODITY,
                    line: i,
                    value: results[i].commodity || 'N/A'
                });
                itemSublist.setSublistValue({
                    id: ITEMSUBLIST.WH_AVAIL,
                    line: i,
                    value: (results[i].whAvail&& results[i].whAvail>Number.MIN_VALUE) ? results[i].whAvail : 'N/A'
                });
                itemSublist.setSublistValue({
                    id: ITEMSUBLIST.UNIT_COST,
                    line: i,
                    value: (results[i].unitCost&& results[i].unitCost>Number.MIN_VALUE) ? results[i].unitCost : 'N/A'
                });
                itemSublist.setSublistValue({
                    id: ITEMSUBLIST.CURRENT_GP,
                    line: i,
                    value: (results[i].currentGp && results[i].currentGp>Number.MIN_VALUE) ? results[i].currentGp : 'N/A'
                });
                itemSublist.setSublistValue({
                    id: ITEMSUBLIST.LAST_SELL,
                    line: i,
                    value: (results[i].lastSell && results[i].lastSell>Number.MIN_VALUE) ? results[i].lastSell : 'N/A'
                });
                itemSublist.setSublistValue({
                    id: ITEMSUBLIST.LAST_COST,
                    line: i,
                    value: (results[i].lastCost && results[i].lastCost>Number.MIN_VALUE) ? results[i].lastCost : 'N/A'
                });
                itemSublist.setSublistValue({
                    id: ITEMSUBLIST.LAST_QUANTITY,
                    line: i,
                    value: (results[i].lastQuantity && results[i].lastQuantity>Number.MIN_VALUE) ? results[i].lastQuantity : 'N/A'
                });
                itemSublist.setSublistValue({
                    id: ITEMSUBLIST.LAST_SALE_DATE,
                    line: i,
                    value: (results[i].saleDate&& new Date(results[i].saleDate)>new Date("01/01/1980")) ? results[i].saleDate : 'N/A'
                });
                itemSublist.setSublistValue({
                    id: ITEMSUBLIST.LAST_GP,
                    line: i,
                    value: (results[i].lastGp && results[i].lastGp>Number.MIN_VALUE) ? results[i].lastGp : 'N/A'
                });
                itemSublist.setSublistValue({
                    id: ITEMSUBLIST.COST_TYPE,
                    line: i,
                    value: results[i].costType || 'N/A'
                });
            }
            log.debug('Data Subset', 'End adding Data subset');
        } catch (error) {
            log.debug("error addSublistData",error)
        }
    }

    //Add price level options to select field
    function setPriceLevelOptionsToSelectField() {
        try {
            var price_level_search = search.create({
                type: "pricelevel",
                filters:
                    [
                        ["isinactive", "is", "F"]
                    ],
                columns:
                    [
                        search.createColumn({name: "name",sort: search.Sort.ASC,label: "Name"}),
                        search.createColumn({ name: "internalid", label: "Internal ID" }),
                        search.createColumn({ name: "externalid", label: "External ID" })
                    ]
            });
            price_level_search.run().each(function(result){
                var price_level_obj = {
                    name: result.getValue('name'),
                    id: result.getValue('internalid'),
                }
                SOURCE_PRICE_LEVEL.push(price_level_obj)
                return true;
            });
            //Custom price level is not accesible by save search results
            var custom_price_level = {name: 'Custom',id: -1}
            SOURCE_PRICE_LEVEL.push(custom_price_level)
        } catch (error) {
            log.debug("setPriceLevelOptionsToSelectField", error)
        }
    }


    return {
        onRequest: onRequest
    }
});



