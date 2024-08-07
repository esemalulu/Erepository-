/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */
define(['N/log', 'N/record', 'N/search'],
    /**
 * @param{log} log
 * @param{record} record
 * @param{search} search
 */
    (log, record, search) => {

        const getInputData = (inputContext) => {
            var transactionSearchObj = search.create({
                type: "transaction",
                filters:
                [
                   ["item.internalid","anyof","99392","103537","103538","103540","103542","103543","103545","103546","103547","103548","103549","103550","103553","103554","103560","103562","103575","103576","103577","103578","103579","103580","103581","103587","103588","103589","103590","103591","103606","103709","105148","105350","119975","129571","129573","131192","131119","131067","130994","129579"], 
                   "AND", 
                   ["status","anyof","PurchOrd:B","VendBill:A","CustInvc:A","SalesOrd:A","ItemShip:A","SalesOrd:B","PurchOrd:A","SalesOrd:D","SalesOrd:E","SalesOrd:F","CustInvc:D","PurchOrd:E","PurchOrd:F","PurchOrd:D"]
                ],
                columns:
                [
                   search.createColumn({name: "recordtype", label: "Record Type"}),
                ]
             });
            return transactionSearchObj;
        }

        const map = (mapContext) => {
            try {
                if(mapContext.value != '' && mapContext.value != null && mapContext.value != undefined){
                    var serviceObj = JSON.parse(mapContext.value);
                    var recordId = serviceObj.id;
                    var recordType = serviceObj.recordType;
                    updateItemInTransaction(recordId, recordType);
                }
            } catch (error) {
                log.error('ERROR IN MAP', error);
            }
           
        }

        function updateItemInTransaction(recordId, recordType){
            try {
               if(recordId && recordType){
                var recToUpdate =record.load({
                    type: recordType,
                    id: recordId,
                });
                log.debug('record', recToUpdate);
                if(recToUpdate){
                    var itemCount = recToUpdate.getLineCount({sublistId: 'item'});
                    for(var i = 0; i < itemCount; i++){
                        var itemId = recToUpdate.getSublistValue({
                            sublistId: 'item',
                            fieldId: 'item',
                            line: i
                        });
                        var itemToSetInSourcedBy = getSourcedItem(itemId);
                        log.debug('new item before setting', itemToSetInSourcedBy)
                        if(itemToSetInSourcedBy){
                            recToUpdate.setSublistValue({
                                sublistId: 'item',
                                fieldId: 'custcol_sdb_new_non_inv_item_resale',
                                line: i,
                                value: itemToSetInSourcedBy
                            });
                            log.debug('custcol_sdb_new_non_inv_item_resale', recToUpdate.getSublistValue({
                                sublistId: 'item',
                                fieldId: 'custcol_sdb_new_non_inv_item_resale',
                                line: i,
                            }));
                        }
                    }
                    var recId = recToUpdate.save({});
                }
               }
            } catch (error) {
               log.error('Error', error)
            }
        }

        function getSourcedItem(itemId){
            if(itemId){
                var itemToReturn = null
                var newNonItemForResale = search.lookupFields({
                    type: 'serviceitem',
                    id: itemId,
                    columns: ['custitem_sdb_new_non_inv_item_resale']
                });
                log.debug('newNonItemForResale', newNonItemForResale);
                //itemToReturn = newNonItemForResale?.custitem_sdb_new_non_inv_item_resale[0]?.value || null;
                var custitemArray = newNonItemForResale?.custitem_sdb_new_non_inv_item_resale;
                if (Array.isArray(custitemArray) && custitemArray.length > 0) {
                    itemToReturn = custitemArray[0].value;
                }
                return itemToReturn;
            }
        }


        return {getInputData, map}

    });
