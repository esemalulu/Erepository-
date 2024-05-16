/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */
define(["N/log","N/record","N/search","N/runtime",'N/encode','N/file'], function (log,record,search,runtime,encode,file) {

    function getInputData(context) {
        try {
             createCsvFile();
             var salesorderSearchObj = search.create({
                type: "salesorder",
                filters:
                [
                   ["type","anyof","SalesOrd"], 
                   "AND", 
                   ["datecreated","within","03/01/2024 12:00 am","03/31/2024 11:59 pm"], 
                   "AND", 
                   ["mainline","is","T"],
                ],
                columns:
                [
                   search.createColumn({name: "internalid", label: "Internal ID"})
                ]
            });
             var resultsReturn = [];
             var pagedData = salesorderSearchObj.runPaged({pageSize: 220});
             var pagesCount = pagedData.pageRanges.length;
             var start = 0;
             var end = 220;
             for (let i = 0; i < pagesCount; i++) {
                var resultSet = salesorderSearchObj.run();
                var results = resultSet.getRange({ start: start, end: end  });
                var orderIds = [];
                results.forEach(element => {orderIds.push(element.id)});
                resultsReturn[i]=orderIds;
                start = end;
                end = end+220;
             }
             return resultsReturn;
        } catch (error) {
            log.error('getInputData ERRRO',error);
        }
    }


    function map(context) {
        try {      
            var recordValue = JSON.parse(context.value);
            var orderIds = recordValue;
            var ordersData = [];
            orderIds.forEach(element => {
                ordersData.push({orderId: element, customerId:null, customerTaxType:null,orderItemsId:[],shipstate:null, datecreated:null})
            });
            var salesorderSearchObj = search.create({
                type: "salesorder",
                filters:
                [
                   ["datecreated","within","03/01/2024 12:00 am","03/31/2024 11:59 pm"],
                   "AND", 
                   ["type","anyof","SalesOrd"], 
                   "AND", 
                   ["internalid","anyof",orderIds]
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
             var searchResultCount = salesorderSearchObj.runPaged().count;
              for (let i = 0; i < searchResultCount; i=i+1000) {  
                 var resultSet = salesorderSearchObj.run();
                 var start = i;
                 var end  = start + 1000;
                 var results = resultSet.getRange({ start: start, end: end  });
                 results.forEach(result => {
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
                       var itemName = resultJson.values.item[0]?.text;
                       var itemId = resultJson.values["item.internalid"][0]?.value;
                       var itemTaxType = resultJson.values["item.custitem_tax_type"][0]?.value;
                       var orderItemTaxType = resultJson.values.taxcode[0]?.text;
                       var orderItemTaxAmount = resultJson.values.custcol_ava_taxamount;
                       var orderItemSellPrice = resultJson.values.rate;
                       var orderItemQuantity = resultJson.values.quantity;
                       var itemWasTaxedOnOrder = false;
                       if(orderItemQuantity>1) orderItemSellPrice = orderItemSellPrice * orderItemQuantity;
                       var taxRateOnOrder = null;
                       if(orderItemTaxAmount && orderItemSellPrice){
                        taxRateOnOrder = (orderItemTaxAmount / orderItemSellPrice) * 100;
                        taxRateOnOrder = taxRateOnOrder % 1 >= 0.5 ? Math.ceil(taxRateOnOrder) : (taxRateOnOrder % 1 < 0.5)? Math.floor(taxRateOnOrder) : '0%';
                       }
                       if(taxRateOnOrder==null)taxRateOnOrder = '0%'
                       if(orderItemTaxType) itemWasTaxedOnOrder = true;
                       orderObj.orderItemsId.push({itemId:itemId,itemName:itemName, itemTaxType:itemTaxType,itemWasTaxedOnOrder:itemWasTaxedOnOrder,itemTaxRateOnOrder:taxRateOnOrder,itemTaxTypeOnOrder:orderItemTaxType,itemSellPriceOnOrder:orderItemSellPrice});
                   }
                   return true;
                 });
              }      
            context.write({
                key: context.key,
                value: ordersData
            });
        } catch (error) {
            log.debug('map' , error);
        }

    }
   function reduce (context) {
        try {
            var taxCodes = [];
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
                taxCodes.push({taxId:taxId,taxName:taxName,taxRate:taxRate,taxType:taxType})
                return true;
             });
            var ordersLinesObj = [];
            var values = context.values;
            var valuesJson = JSON.parse(values);
            valuesJson.forEach(order => {
                var taxInfo = getTaxTypeMappingOfCustomer(order.orderItemsId, order.customerTaxType);
                var objToAdd = processOrderItemLines(order,taxInfo,taxCodes)
                objToAdd.forEach(element => {
                    ordersLinesObj.push(element)
                });
            });
            var csvFile = searchFileByName();
            createCsvString(csvFile ,ordersLinesObj)
        } catch (e) {
            log.error('Reduce Error',e)
        }
    }
 
    function processOrderItemLines(order,taxInfo,taxCodes){
        try {
            var orderLinesObjects = [];
            var orderItems = order.orderItemsId;
            var taxCode = getTaxCode(order);
            for (let i = 0; i < orderItems.length; i++) {
                var orderItem = orderItems[i];
                var itemId = orderItem.itemId;
                var itemTaxType = orderItems[i].itemTaxType
                var lineObj = {orderId:order.orderId,orderNumber:order.orderNumber,datecreated:order.datecreated,orderItemId:itemId,orderItemName:orderItem.itemName,itemWasTaxedOnOrder:orderItem.itemWasTaxedOnOrder,itemTaxTypeOnOrder: orderItem.itemTaxTypeOnOrder,itemCorrectTaxTypeText:'-None-', itemTaxRateOnOrder: orderItem.itemTaxRateOnOrder, itemShouldBeTaxed:false,itemCorrectTaxType:'-None-',itemCorrectTaxRate:'-None-',itemSellPriceOnOrder:orderItem.itemSellPriceOnOrder}

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
                    if(!taxCode?.taxCode) log.debug('Tax code', 'Tax Code ' + taxCode + ' order ' + order)
                    lineObj.itemCorrectTaxType = taxCode?.taxCode;
                    lineObj.itemCorrectTaxTypeText = taxCode?.taxText;
                    var correctTaxRate = getCorrectTaxRate(lineObj,taxCodes);
                    if(!correctTaxRate) correctTaxRate = '-None-'
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
            var itemCorrectTaxId = item.itemCorrectTaxType;
            var itemCorrectTaxObj = taxCodes.find(tax => tax.taxId == itemCorrectTaxId );
            if(!itemCorrectTaxObj)return null;
            var correctTaxRateString = itemCorrectTaxObj.taxRate;
            return correctTaxRateString;
        } catch (error) {
            log.error('getCorrectTaxRate',error)
        }
    }
    function getTaxCode(order) {
        try {
            var scriptObj = runtime.getCurrentScript();
            var avaTax = scriptObj.getParameter("custscript_sdb_tax_code_avatax");

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
        try {
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
        } catch (error) {
            log.error('getTaxTypeMappingOfCustomer ERROR',error)
        }
    }
  

    function searchFileByName() {
        let idFolder;
        let fileSearchObj = search.create({
            type: "file",
            filters:
                [
                    ["folder", "anyof", "-15"],
                    "AND",
                    ["name","contains","Last-Month-Orders-Tax-Report"]
                ],
            columns:
                [
                    search.createColumn({
                        name: "name",
                        sort: search.Sort.ASC,
                        label: "Name"
                    }),
                    search.createColumn({ name: "internalid", label: "Internal ID" })
                ]
        });
        fileSearchObj.run().each(function (result) {
            idFolder = result.getValue('internalid');
            return false;
        });
        return idFolder;
    }
    function getCurrencyFile(id) {
        let fileLoaded = file.load({
            id: id
        });
        return fileLoaded;
    }
   
    function createCsvFile(){
        // try {
            var alreadyExistsFile = searchFileByName();
            if(alreadyExistsFile) return alreadyExistsFile;
            let fileName = 'Last-Month-Orders-Tax-Report.csv'
            var csvString = 'Date Created,Order Number ,Item ID,Item Name,Taxed?,Tax Type On Order?,Tax Rate On Order?,Should Be Taxed ,Correct Tax Type,Correct Tax Rate';
            let objXlsFile = file.create({
                name: fileName,
                fileType: file.Type.CSV,
                contents: csvString
            });
            objXlsFile.folder = -15;
            var newFileId = objXlsFile.save();
            return newFileId;
        // } catch (error) {
        //     log.error('createCsvFile error',error)
        // }
    }

    function createCsvString(csvFile,objJson) {
        // try {
            var fileLoaded = getCurrencyFile(csvFile);
            var newContent='\n';
            objJson.forEach(soObj => {
                newContent +=
                soObj.datecreated + ',' +
                soObj.orderNumber + ',' +
                soObj.orderItemId + ',' +
                soObj.orderItemName + ',' +
                soObj.itemWasTaxedOnOrder + ',' +
                soObj.itemTaxTypeOnOrder + ',' +
                // soObj.itemCorrectTaxTypeText + ',' +
                soObj.itemTaxRateOnOrder + ',' +
                soObj.itemShouldBeTaxed + ',' +
                // soObj.itemCorrectTaxType + ',' +
                soObj.itemCorrectTaxTypeText + ',' +
                soObj.itemCorrectTaxRate + '\n'
            });     
            fileLoaded.appendLine({
                value:newContent
            })
            fileLoaded.save()
        // } catch (error) {
        //     log.error('createCsvString error',error)
        // }
    }


    return {
        getInputData: getInputData,
        map: map,
        reduce:reduce
    };
  });
  
  
  
