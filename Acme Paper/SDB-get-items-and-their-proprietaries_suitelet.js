/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */

define(['N/record','N/search','N/file'], function(record, search, file) {

    function onRequest(context){
        try {
            if(context.request.method == 'GET'){
                var itemsSendToWebProprietary = getItemsSendToWebIsProprietary();
                var customerAndItemInformationResponse = getCustomersWithItemsProprietaryToReturn(itemsSendToWebProprietary.internalIds, itemsSendToWebProprietary.itemNames)
                var response = JSON.stringify(customerAndItemInformationResponse)
                context.response.write(response);


                // let fileObj = file.create({
                //     name: 'SDB-items-and-their-proprietaries.json',
                //     fileType: file.Type.JSON,
                //     contents: JSON.stringify(customerAndItemInformationResponse)
                // });
                // fileObj.folder = -15;
                // let id = fileObj.save();
                // log.debug('fileObj',fileObj)

            }
        } catch (error) {
            log.debug('onRequest',error)
        }
    }


    function getItemsSendToWebIsProprietary(){
        try {
            var itemsSendToWebProprietary = {
                internalIds:[],
                itemNames:[]
            }
            var itemSearchObj = search.create({
                type: "item",
                filters:
                [
                   ["custitem_acc_sendtoweb","anyof","3"], 
                   "AND", 
                   ["isinactive","is","F"]
                ],
                columns:
                [
                   search.createColumn({name: "internalid", label: "Internal ID"}),
                   search.createColumn({
                    name: "itemid",
                    sort: search.Sort.ASC,
                    label: "Name"
                 })
                ]
             });
             var itemSearchObjCount = itemSearchObj.runPaged().count;
             log.debug("itemSearchObjCount result count",itemSearchObjCount);
             for (let i = 0; i < itemSearchObjCount; i=i+1000) {  
                var resultSet = itemSearchObj.run();
                var start = i;
                var end  = start + 1000;
                var results = resultSet.getRange({ start: start, end: end  });
                results.forEach(result => {
                    var objString = JSON.stringify(result)
                    var objJson = JSON.parse(objString)
                    itemsSendToWebProprietary.internalIds.push(result.id)
                    itemsSendToWebProprietary.itemNames.push(objJson.values.itemid)
                });
             }
             return itemsSendToWebProprietary;
        } catch (error) {
            log.debug('getItemsSendToWebIsProprietary', error)
        }
    }

    function getCustomersWithItemsProprietaryToReturn(itemsInternalID, itemsNames){
        try {
            var customresToReturn=[];
            var customerSearchObj = search.create({
                type: "customer",
                filters:
                [
                   ["custentity_acc_upld_evox","is","T"], 
                   "AND", 
                   ["pricingitem","anyof",itemsInternalID], 
                ],
                columns:
                [
                   search.createColumn({name: "pricingitem", label: "Pricing Item"})
                ]
             });
             log.debug("customerSearchObjCount result count",customerSearchObj.runPaged().count);
             customerSearchObj.run().each(function(result){
                var objString = JSON.stringify(result)
                var objJson = JSON.parse(objString)

                var indexOfItem = itemsNames.indexOf(objJson.values.pricingitem)
                // customresToReturn.push({customer:result.id, item: itemsInternalID[indexOfItem], itemName: objJson.values.pricingitem})
                customresToReturn.push({customer:result.id, item: itemsInternalID[indexOfItem]})
                return true;
            });

            return customresToReturn;
        } catch (error) {
            log.debug('getCustomersWithItemsProprietaryToReturn', error)
        }
    }
    return{
        onRequest:onRequest
    }
});


   