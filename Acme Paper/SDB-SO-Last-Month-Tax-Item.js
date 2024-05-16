/**
 *@NApiVersion 2.1
 *@NScriptType Suitelet
 */
 define(['N/ui/serverWidget', 'N/search','N/runtime','N/record','N/file'], function (serverWidget, search,runtime,record,file) {

    const ORDERSUBLIST = {};
    ORDERSUBLIST.SUBLIST = 'custpage_sublist';
    ORDERSUBLIST.ORDER = 'custpage_col_order_id';
    ORDERSUBLIST.ORDER_NUMBER = 'custpage_col_order_number'
    ORDERSUBLIST.VIEW = 'custpage_col_view';
    ORDERSUBLIST.DATE = 'custpage_col_date';
    ORDERSUBLIST.ITEM_ID = 'custpage_col_item_id';
    ORDERSUBLIST.ITEM_NAME = 'custpage_col_item_name';
    ORDERSUBLIST.TAXED = 'custpage_col_item_taxed';
    ORDERSUBLIST.TAX_TYPE_ON_ORDER = 'custpage_col_item_tax_type_on_order';
    ORDERSUBLIST.TAX_RATE_ON_ORDER = 'custpage_col_item_tax_rate_on_order';
    ORDERSUBLIST.SHOULD_BE_TAXED = 'custpage_col_should_be_taxed';
    ORDERSUBLIST.CORRECT_TAX_TYPE_TEXT = 'custpage_col_correct_tax_type_name';
    ORDERSUBLIST.CORRECT_TAX_RATE = 'custpage_col_correct_tax_rate';



    const ORDERSUBLIST_LABEL = {};
    ORDERSUBLIST_LABEL.SUBLIST = 'Orders Items Tax';
    ORDERSUBLIST_LABEL.ORDER = 'ORDER';
    ORDERSUBLIST_LABEL.ORDER_NUMBER = 'ORDER NUMBER'
    ORDERSUBLIST_LABEL.VIEW = 'VIEW';
    ORDERSUBLIST_LABEL.DATE = 'DATE';
    ORDERSUBLIST_LABEL.ITEM_ID = 'ITEM ID';
    ORDERSUBLIST_LABEL.ITEM_NAME = 'ITEM NAME';
    ORDERSUBLIST_LABEL.TAXED = 'TAXED?';
    ORDERSUBLIST_LABEL.TAX_TYPE_ON_ORDER = 'TAX TYPE ON ORDER?';
    ORDERSUBLIST_LABEL.TAX_RATE_ON_ORDER = 'TAX RATE ON ORDER?';
    ORDERSUBLIST_LABEL.SHOULD_BE_TAXED = 'SHOULD BE TAXED';
    ORDERSUBLIST_LABEL.CORRECT_TAX_TYPE_TEXT = 'CORRECT TAX TYPE';
    ORDERSUBLIST_LABEL.CORRECT_TAX_RATE = 'CORRECT TAX RATE';

    function onRequest(context) {
        try {
            var request = context.request;
            var response = context.response;
            if (request.method == 'GET') {
               
                var pageNum = context.request?.parameters?.custpage_gotopage_select || 1;
                var pageSize = context.request?.parameters?.pageSize || 20; 
                var downloadExcel = context.request?.parameters?.custpage_download_excel; 
                if(downloadExcel && downloadExcel=='true') downloadExcelFile(context);

                var form = createFormAndSublist(pageNum);
                var ordersIdLastMonthSearch = getOrdersIdsLastMonth();

                var startIndex = (pageNum - 1) * pageSize;
                var endIndex = startIndex + pageSize - 1;

                var taxCodes = getTaxCodesData();
                var orderIdsResult = ordersIdLastMonthSearch.run().getRange({start: startIndex,end: endIndex});
                var orderIdsResultSearch = JSON.parse(JSON.stringify(orderIdsResult));
                var dataToSublist = mapperDataSearch(orderIdsResultSearch,taxCodes);

                setSublistValues(form,dataToSublist)
                var reamingUnits = runtime.getCurrentScript().getRemainingUsage()
                log.debug('remaining units',reamingUnits)
                response.writePage(form);
                }           
        } catch (error) {
            log.error("onReques", error)
        }
    }


    function  getTaxCodesData(){
        try {
            var arrToReturn = [];
            var salestaxitemSearchObj = search.create({
                type: "salestaxitem",
                filters:
                [
                   ["isinactive","is","F"]
                ],
                columns:
                [
                   search.createColumn({name: "internalid", label: "Internal ID"}),
                   search.createColumn({name: "name", label: "Name"}),
                   search.createColumn({name: "rate", label: "Rate"}),
                   search.createColumn({name: "taxtype", label: "Tax Type"})
                ]
             });
             salestaxitemSearchObj.run().each(function(result){
                var taxId = result.getValue('internalid');
                var taxName = result.getValue('name')
                var taxRate = result.getValue('rate')
                var taxType = result.getValue('taxtype')
                arrToReturn.push({taxId:taxId,taxName:taxName,taxRate:taxRate,taxType:taxType})
                return true;
             });
             return arrToReturn;
        } catch (error) {
            log.error('getTaxCodesData',error)
        }
    }

    function downloadExcelFile(context) {
        try {
            var excelFile = file.load({
                id: '2308150'
            })
            log.debug('excelFile',excelFile)
            context.response.writeFile({
                file: excelFile
            });
        } catch (error) {
            log.error('downloadExcelFile error',error)
        }
    }

    function getOrdersIdsLastMonth(){
        try {
            var salesorderSearchObj = search.create({
                type: "salesorder",
                filters:
                [
                //    ["datecreated","within","lastmonth"], 
                   ["datecreated","within","03/01/2024 12:00 am","03/31/2024 11:59 pm"],
                   "AND", 
                   ["type","anyof","SalesOrd"], 
                   "AND", 
                   ["mainline","is","T"]
                ],
                columns:
                [
                   search.createColumn({name: "internalid", label: "Internal ID"})
                ]
             });
             return salesorderSearchObj;
        } catch (error) {
            log.error('getOrdersIdsLastMonth',error)
        }
    }

    function mapperDataSearch(search,taxCodes) {
        try {
            var ordersIds = [];
            let arrayResult = [];
            search.forEach(element => {
                var orderId   = element?.id;
                if(orderId)ordersIds.push(orderId);
            });
            //Array with SO objects with customerId, customerTaxType and Array of items id
            var ordersData = getOrdersData(ordersIds)
            arrayResult = proccessEachOrder(ordersData,taxCodes)
            return arrayResult;
        } catch (error) {
            log.error('mapperDataSearch error:',error)
        }
    }
    function proccessEachOrder(ordersData,taxCodes) {
        try {
            var arrToReturn = [];
            ordersData.forEach(order => {
                var taxInfo = getTaxTypeMappingOfCustomer(order.orderItemsId, order.customerTaxType);
                var objToAdd = processOrderItemLines(order,taxInfo,taxCodes)
                objToAdd.forEach(element => {
                    arrToReturn.push(element)
                });
            });
            return arrToReturn;
        } catch (error) {
            log.error('proccessEachOrder error:',error)
        }
    }
    
    function processOrderItemLines(order,taxInfo,taxCodes){
        try {
            var orderLinesObjects = [];
            var orderItems = order.orderItemsId
            var taxCode = getTaxCode(order);
            for (let i = 0; i < orderItems.length; i++) {
                var orderItem = orderItems[i];
                var itemId = orderItem.itemId;
                var itemTaxType = orderItems[i].itemTaxType
                var lineObj = {orderId:order.orderId,orderNumber:order.orderNumber,datecreated:order.datecreated,orderItemId:itemId,orderItemName:orderItem.itemName,itemWasTaxedOnOrder:orderItem.itemWasTaxedOnOrder,itemTaxTypeOnOrder: orderItem.itemTaxTypeOnOrder,orderItenTaxText:null, itemTaxRateOnOrder: orderItem.itemTaxRateOnOrder, itemShouldBeTaxed:false,itemCorrectTaxType:null,itemCorrectTaxRate:null,itemSellPriceOnOrder:orderItem.itemSellPriceOnOrder}

                if(!itemId){
                    orderLinesObjects.push(lineObj);
                    continue
                }
                if (!itemTaxType){
                    orderLinesObjects.push(lineObj);
                    continue
                } 
               
                var taxItem = taxInfo.find(function (item) {
                    return item.itemTax == itemTaxType;
                });
                if (!taxItem) {
                    orderLinesObjects.push(lineObj);
                    continue
                }
                if(taxItem && taxItem?.isTaxable){
                    lineObj.itemShouldBeTaxed=true;
                    lineObj.itemCorrectTaxType = taxCode.taxCode;
                    lineObj.orderItenTaxText = taxCode.taxText;
                    var correctTaxRate = getCorrectTaxRate(lineObj,taxCodes);
                    lineObj.itemCorrectTaxRate = correctTaxRate;
                } 
                orderLinesObjects.push(lineObj);
            }  
            return orderLinesObjects;
        } catch (error) {
            log.error('processOrderItemLines(order)',error)
        }
    }
    function getCorrectTaxRate(item,taxCodes){
        try {
            // var itemSellPrice = item.itemSellPriceOnOrder;
            var itemCorrectTaxId = item.itemCorrectTaxType;
            var itemCorrectTaxObj = taxCodes.find(tax => tax.taxId == itemCorrectTaxId );
            if(!itemCorrectTaxObj)return null;
            var correctTaxRateString = itemCorrectTaxObj.taxRate;
            // var correctTaxRateFormated = correctTaxRateString.replace("%", "");
            // var correctTaxRate = parseFloat(correctTaxRateFormated);
            // var itemCorrectTaxRate =  (correctTaxRate / itemSellPrice) * 100;
            // return itemCorrectTaxRate.toFixed(2);
            return correctTaxRateString;
        } catch (error) {
            log.error('getCorrectTaxRate',error)
        }
    }
    function getTaxCode(order) {
        try {
            var scriptObj = runtime.getCurrentScript();
            var avaTax = scriptObj.getParameter("custscript_sdb_tax_code_ava_");

            var currentState = order.shipstate;

            var taxCode = getSaleTax(currentState);
            return taxCode.taxCode !== -1 ? taxCode : avaTax;
        } catch (error) {
            log.error('getTaxCode',error)
        }
    }
    function getSaleTax(stateShortName) {
        var taxCode = {
            taxCode : -1,
            taxText : null
        }
        search.create({
            type: "customrecord_sdb_sale_tax",
            filters:
                [
                    ["custrecord_sdb_sale_tax_state.shortname", "startswith", stateShortName],
                    "AND",
                    ["isinactive", "is", "F"],
                    "AND",
                    ["custrecord_sdb_sale_tax_tax_code", "noneof", "@NONE@"]
                ],
            columns:
                [
                    search.createColumn({ name: "custrecord_sdb_sale_tax_tax_code", label: "Tax Code" })
                ]
        }).run().each(function(res) {
            taxCode.taxCode = res.getValue("custrecord_sdb_sale_tax_tax_code");
            taxCode.taxText = res.getText("custrecord_sdb_sale_tax_tax_code");
        });
        return taxCode;
    }
    function getTaxTypeMappingOfCustomer(itemIds, customerTaxType) {
        var arrToReturn = [];
        if (!itemIds.length || !customerTaxType) return arrToReturn;
        var itemTaxSearch = search.create({
            type: "customrecord_cust_item_taxtypemapping",
            filters:
                [
                    ["isinactive", "is", "F"],
                    "AND",
                    ["custrecord_cittm_customer_tax_type", "is", customerTaxType],
                ],
            columns:
                [
                    "custrecord_cittm_customer_tax_type",
                    "custrecord_cittm_item_tax_type",
                    "custrecord_cittm_taxable"
                ]
        });
        itemTaxSearch.run().each(function (result) {
            arrToReturn.push({
                customerTax: result.getValue("custrecord_cittm_customer_tax_type"),
                itemTax: result.getValue("custrecord_cittm_item_tax_type"),
                isTaxable: result.getValue("custrecord_cittm_taxable")
            })
            return true;
        });
        return arrToReturn;
    }
    
    function getOrdersData(ordersIds) {
        try {
            var ordersData = [];
            ordersIds.forEach(element => {
                ordersData.push({orderId: element, customerId:null, customerTaxType:null,orderItemsId:[],shipstate:null, datecreated:null})
            });
            var salesorderSearchObj = search.create({
                type: "salesorder",
                filters:
                [
                // ["datecreated","within","lastmonth"], 
                   ["datecreated","within","03/01/2024 12:00 am","03/31/2024 11:59 pm"],
                   "AND", 
                   ["type","anyof","SalesOrd"], 
                   "AND", 
                   ["internalid","anyof",ordersIds]
                ],
                columns:
                [
                   search.createColumn({name: "internalid", label: "SO ID"}),
                   search.createColumn({
                      name: "internalid",
                      join: "customerMain",
                      label: "CUSTOMER ID"
                   }),
                   search.createColumn({
                    name: "custentity_tax_type",
                    join: "customerMain",
                    label: "Customer Tax Type"
                    }),
                   search.createColumn({
                      name: "internalid",
                      join: "item",
                      label: "ITEM ID"
                   }),
                   search.createColumn({
                      name: "type",
                      join: "item",
                      label: "Type"
                   }),
                   search.createColumn({
                    name: "custitem_tax_type",
                    join: "item",
                    label: "Item Tax Type"
                    }),
                    search.createColumn({name: "shipstate", label: "Shipping State/Province"}),
                    search.createColumn({name: "datecreated", label: "Date Created"}),
                    search.createColumn({name: "taxcode", label: "SO TAX ITEM"}),
                    search.createColumn({name: "custcol_ava_taxamount", label: "Tax Amount"}),
                    search.createColumn({name: "rate", label: "Item Rate"}),
                    search.createColumn({name: "quantity", label: "Quantity"}),
                    search.createColumn({name: "item", label: "Item"}),
                    search.createColumn({name: "tranid", label: "Document Number"})
                ]
             });
             salesorderSearchObj.run().each(function(result){
                var orderObj = ordersData.find(order => order.orderId == result.id);
                var resultString = JSON.stringify(result);
                var resultJson = JSON.parse(resultString)
                var customerTaxType = resultJson.values["customerMain.custentity_tax_type"][0]?.value;
                var customerId = resultJson.values["customerMain.internalid"][0]?.value;
                var shipstate = resultJson.values.shipstate;
                var orderNumber = resultJson.values.tranid;
                var datecreated =  resultJson.values.datecreated;
                if(!orderObj.orderNumber) orderObj.orderNumber = orderNumber;
                if(!orderObj.datecreated) orderObj.datecreated = datecreated;
                if(!orderObj.shipstate) orderObj.shipstate = shipstate;
                if(!orderObj.customerId) orderObj.customerId = customerId;
                if(customerTaxType) orderObj.customerTaxType = customerTaxType;
                var itemType = resultJson.values["item.type"][0]?.value;
                if(itemType && itemType!='TaxItem'){
                    var itemName = resultJson.values.item[0].text;
                    var itemId = resultJson.values["item.internalid"][0]?.value;
                    var itemTaxType = resultJson.values["item.custitem_tax_type"][0]?.value;
                    var orderItemTaxType = resultJson.values.taxcode;
                    var orderItemTaxAmount = resultJson.values.custcol_ava_taxamount;
                    var orderItemSellPrice = resultJson.values.rate;
                    var orderItemQuantity = resultJson.values.quantity;
                    var itemWasTaxedOnOrder = false;
                    if(orderItemQuantity>1) orderItemSellPrice = orderItemSellPrice * orderItemQuantity;
                    var taxRateOnOrder = null;
                    if(orderItemTaxAmount && orderItemSellPrice)taxRateOnOrder = (orderItemTaxAmount / orderItemSellPrice) * 100;
                    if(orderItemTaxType) itemWasTaxedOnOrder = true;
                    orderObj.orderItemsId.push({itemId:itemId,itemName:itemName, itemTaxType:itemTaxType,itemWasTaxedOnOrder:itemWasTaxedOnOrder,itemTaxRateOnOrder:taxRateOnOrder,itemTaxTypeOnOrder:orderItemTaxType,itemSellPriceOnOrder:orderItemSellPrice});
                }
                return true;
             });
             return ordersData;
        } catch (error) {
            log.error('getOrdersData error:',error)
        }
    }


    function createFormAndSublist(pageNum){
        try {
            var form = serverWidget.createForm({title: 'Orders Items Tax',hideNavBar: false});
            form.clientScriptModulePath = 'SuiteScripts/SDB-SO-Last-Month-Tax-Item_CS.js';
            form.addButton({id: "custpage_search",label: "Search",functionName: "searchOrders()"});
            // form.addButton({id: "custpage_generate_excel",label: "Generate Excel",functionName: "generateExcel()"});
            form.addButton({id: "custpage_download_excel",label: "Download Excel",functionName: "downloadExcel()"});

            var ordersIdLastMonthSearch = getOrdersIdsLastMonth();
            var totalOrdersCount = ordersIdLastMonthSearch.runPaged().count;
            var totalPages = totalOrdersCount / 20;

            var pageOption = form.addField({ id:'custpage_gotopage_select', type: 'SELECT', label: 'PAGES' });
            for (var i = 0; i < totalPages; i++) {
                    pageOption.addSelectOption({
                        value: i+1,
                        text: `Page ${i+1}`,
                        isSelected: pageNum==i+1?true:false 
                    });
            }

            var orderSublist = form.addSublist({
                id: ORDERSUBLIST.SUBLIST,
                label: ORDERSUBLIST_LABEL.SUBLIST,
                type: serverWidget.SublistType.LIST,
            });
            orderSublist.addField({
                id : ORDERSUBLIST.VIEW,
                label : ORDERSUBLIST_LABEL.VIEW,
                type : serverWidget.FieldType.URL
            }).linkText = 'View';
            orderSublist.addField({
                id: ORDERSUBLIST.DATE,
                label: ORDERSUBLIST_LABEL.DATE,
                type: serverWidget.FieldType.TEXT,
            });
            orderSublist.addField({
                id: ORDERSUBLIST.ORDER,
                label: ORDERSUBLIST_LABEL.ORDER,
                type: serverWidget.FieldType.TEXT,
            });
            orderSublist.addField({
                id: ORDERSUBLIST.ORDER_NUMBER,
                label: ORDERSUBLIST_LABEL.ORDER_NUMBER,
                type: serverWidget.FieldType.TEXT,
            });
            orderSublist.addField({
                id: ORDERSUBLIST.ITEM_ID,
                label: ORDERSUBLIST_LABEL.ITEM_ID,
                type: serverWidget.FieldType.TEXT
            });
            orderSublist.addField({
                id: ORDERSUBLIST.ITEM_NAME,
                label: ORDERSUBLIST_LABEL.ITEM_NAME,
                type: serverWidget.FieldType.TEXT
            });
            orderSublist.addField({
                id: ORDERSUBLIST.TAXED,
                label: ORDERSUBLIST_LABEL.TAXED,
                type: serverWidget.FieldType.TEXT
            });
            orderSublist.addField({
                id: ORDERSUBLIST.TAX_TYPE_ON_ORDER,
                label: ORDERSUBLIST_LABEL.TAX_TYPE_ON_ORDER,
                type: serverWidget.FieldType.TEXT
            });
            orderSublist.addField({
                id: ORDERSUBLIST.TAX_RATE_ON_ORDER,
                label: ORDERSUBLIST_LABEL.TAX_RATE_ON_ORDER,
                type: serverWidget.FieldType.TEXT
            });
            orderSublist.addField({
                id: ORDERSUBLIST.SHOULD_BE_TAXED,
                label: ORDERSUBLIST_LABEL.SHOULD_BE_TAXED,
                type: serverWidget.FieldType.TEXT
            });
            // orderSublist.addField({
            //     id: ORDERSUBLIST.CORRECT_TAX_TYPE,
            //     label: ORDERSUBLIST_LABEL.CORRECT_TAX_TYPE,
            //     type: serverWidget.FieldType.TEXT
            // });
            orderSublist.addField({
                id: ORDERSUBLIST.CORRECT_TAX_TYPE_TEXT,
                label: ORDERSUBLIST_LABEL.CORRECT_TAX_TYPE_TEXT,
                type: serverWidget.FieldType.TEXT
            });
            orderSublist.addField({
                id: ORDERSUBLIST.CORRECT_TAX_RATE,
                label: ORDERSUBLIST_LABEL.CORRECT_TAX_RATE,
                type: serverWidget.FieldType.TEXT
            });
            
            return form;
        } catch (error) {
            log.error("createFormAndSublist", error)
        }
    }
    function setSublistValues(form,results) {
        try {
            var orderSublist = form.getSublist({id: ORDERSUBLIST.SUBLIST})
            var account = runtime.accountId
            if(account.includes("_"))account = account.replace("_","-")
            for (var i = 0; i < results.length; i++) {
                orderSublist.setSublistValue({
                    id: ORDERSUBLIST.ORDER,
                    line: i,
                    value: results[i].orderId ? results[i].orderId : '-None-'
                });
                orderSublist.setSublistValue({
                    id: ORDERSUBLIST.ORDER_NUMBER,
                    line: i,
                    value: results[i].orderNumber ? results[i].orderNumber : '-None-'
                });
                orderSublist.setSublistValue({
                    id: ORDERSUBLIST.VIEW,
                    line: i,
                    value: 'https://'+account+'.app.netsuite.com/app/accounting/transactions/salesord.nl?id='+results[i].orderId
                });
                orderSublist.setSublistValue({
                    id: ORDERSUBLIST.DATE,
                    line: i,
                    value: results[i].datecreated ? results[i].datecreated : '-None-'
                });
                orderSublist.setSublistValue({
                    id: ORDERSUBLIST.ITEM_ID,
                    line: i,
                    value: results[i].orderItemId ? results[i].orderItemId : '-None-'
                });
                orderSublist.setSublistValue({
                    id: ORDERSUBLIST.ITEM_NAME,
                    line: i,
                    value: results[i].orderItemName ? results[i].orderItemName : '-None-'
                });
                orderSublist.setSublistValue({
                    id: ORDERSUBLIST.TAXED,
                    line: i,
                    value: results[i].itemWasTaxedOnOrder==true ? 'YES' : 'NO'
                });
                orderSublist.setSublistValue({
                    id: ORDERSUBLIST.TAX_TYPE_ON_ORDER,
                    line: i,
                    value: (results[i].itemTaxTypeOnOrder && results[i].itemTaxTypeOnOrder[0].text) ?   results[i].itemTaxTypeOnOrder[0].text : '-None-'
                });
                // var itemTaxRateOnOrder = results[i].itemTaxRateOnOrder ? Math.floor(results[i].itemTaxRateOnOrder) : '0%';
                // return numero % 1 >= 0.5 ? Math.ceil(numero) : Math.floor(numero);
                var itemTaxRateOnOrder = (results[i].itemTaxRateOnOrder && results[i].itemTaxRateOnOrder % 1 >= 0.5) ? Math.ceil(results[i].itemTaxRateOnOrder) : (results[i].itemTaxRateOnOrder && results[i].itemTaxRateOnOrder % 1 < 0.5)? Math.floor(results[i].itemTaxRateOnOrder) : '0%';
                (itemTaxRateOnOrder !=null&& itemTaxRateOnOrder!='0%' && itemTaxRateOnOrder>0) ? itemTaxRateOnOrder = itemTaxRateOnOrder + '.00%' : itemTaxRateOnOrder = itemTaxRateOnOrder 
                orderSublist.setSublistValue({
                    id: ORDERSUBLIST.TAX_RATE_ON_ORDER,
                    line: i,
                    value: itemTaxRateOnOrder
                });
                orderSublist.setSublistValue({
                    id: ORDERSUBLIST.SHOULD_BE_TAXED,
                    line: i,
                    value: results[i].itemShouldBeTaxed==true ? 'YES' : 'NO'
                });
                // orderSublist.setSublistValue({
                //     id: ORDERSUBLIST.CORRECT_TAX_TYPE,
                //     line: i,
                //     value: results[i].itemCorrectTaxType ? results[i].itemCorrectTaxType : 'N/A'
                // });
                orderSublist.setSublistValue({
                    id: ORDERSUBLIST.CORRECT_TAX_TYPE_TEXT,
                    line: i,
                    value: results[i].orderItenTaxText ? results[i].orderItenTaxText : '-None-'
                });

                // var itemCorrectTaxRate = results[i].itemCorrectTaxRate ? Math.floor(results[i].itemCorrectTaxRate) : '0%';
                var itemCorrectTaxRate = results[i].itemCorrectTaxRate ? results[i].itemCorrectTaxRate  : '0%'
                orderSublist.setSublistValue({
                    id: ORDERSUBLIST.CORRECT_TAX_RATE,
                    line: i,
                    value: (itemCorrectTaxRate!='0%') ? itemCorrectTaxRate  : '0%'
                });
                
            }
            return;
        } catch (error) {
            log.error("error addSublistDataTransactionResults", error)
        }
    }



    return {
        onRequest: onRequest
    }
});




