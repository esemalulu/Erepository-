/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */


define(['N/search','N/record',"N/format" ], function(search, record,format) {
    function getInputData(context){

        try {
            var transactionSearchObj = search.create({
                type: "transaction",
                filters:
                [
                   ["type","anyof","PurchOrd"], 
                   "AND", 
                   ["expectedreceiptdate","on","12/31/1899"],
                ],
                columns:
                [
                   search.createColumn({
                      name: "expectedreceiptdate",
                      summary: "GROUP",
                      label: "Expected Receipt Date"
                   }),
                   search.createColumn({
                    name: "internalid",
                    summary: "GROUP",
                    label: "Internal ID"
                   })
                ]
             });
            return transactionSearchObj;
        } catch (error) {
            log.error('getInputData',error)
        }
    }
    // first the scheduled date/time field and if that is blank then update to the requested due date field on the main line.  
    function map(context){
        try {
            var contextValue = JSON.parse(context.value)
            var poId = contextValue?.values['GROUP(internalid)']?.value
            var lookupField = search.lookupFields({
                type: record.Type.PURCHASE_ORDER,
                id: poId,
                columns:['custbody_acc_sch_date_time','duedate']
            })
            var dateToSet = lookupField?.custbody_acc_sch_date_time || lookupField?.duedate 
            context.write({
                key: context.key,
                value: {
                    poId:poId,
                    dateToSet: dateToSet
                }
            });
            
        } catch (error) {
            log.error('map',error)
        }
    }

    function reduce(context){
        try {
            var contextValues = JSON.parse(context.values)
            var poId = contextValues?.poId
            var dateParam = contextValues?.dateToSet
            var dateToSet =  getFormatDate(new Date(dateParam));
            var purchaseOrder = record.load({
                type: record.Type.PURCHASE_ORDER,
                id: poId,
                isDynamic: true,
            })
            var itemsLength = purchaseOrder.getLineCount({
                sublistId: 'item'
            })
            for (let i = 0; i < itemsLength; i++) {
                purchaseOrder.selectLine({
                    sublistId: 'item',
                    line: i
                });
                purchaseOrder.setCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'expectedreceiptdate',
                    value:format.parse({ value: dateToSet, type: format.Type.DATE }),
                });
                purchaseOrder.commitLine({
                    sublistId: "item"
                })
            }
            purchaseOrder.save()
        } catch (error) {
            log.error('reduce',error)
        }
    }


    function getFormatDate(date) {
        let parsedDate = format.parse({
            value: date,
            type: format.Type.DATE
        });
        return format.format({
            value: new Date(parsedDate),
            type: format.Type.DATE
        });
    }

    return{
        getInputData:getInputData,
        map:map,
        reduce:reduce,
    }
    
});