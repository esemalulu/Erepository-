/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */
define(['N/record', 'N/runtime'], function(record, runtime) {

    function getInputData(inputContext) {
        try {
            log.debug("inputContext",inputContext);
            var scriptObj = runtime.getCurrentScript();
            var dataToUpdate = scriptObj.getParameter({ name: 'custscript_data_to_update' });
            log.debug("getInputData",dataToUpdate)
            if(!dataToUpdate)return;
            var dataToUpdateParsed = JSON.parse(dataToUpdate);
            log.debug("dataToUpdateParsed",dataToUpdateParsed)
            return Object.keys(dataToUpdateParsed).map(function(customerId) {
                return {
                    customerId: customerId,
                    items: dataToUpdateParsed[customerId]
                };
            });   
        } catch (error) {
            log.error("getInputData", error)
        }
    }

    function map(context) {
        try {
        var scriptObj = runtime.getCurrentScript();
        var increasePercentage = scriptObj.getParameter({ name: 'custscript_increase_percentage' });   
        log.debug("increasePercentage",increasePercentage);
        if(!increasePercentage)return;
        log.debug("map context",context);
        var data = JSON.parse(context.value);
        log.debug("map data",data)
        var customerId = data.customerId;
        var items = data.items;
        log.debug("map items",items);
        var customerRecord = record.load({
            type: record.Type.CUSTOMER,
            id: customerId,
            isDynamic: true
        });
        items.forEach(function(itemData) {
            log.debug("itemData",itemData)
            var itemLine = customerRecord.findSublistLineWithValue({sublistId: 'itempricing',fieldId: 'item',value: itemData.item})
            log.debug("itemLine",itemLine)
            if(itemLine != -1){            
                var currentPrice = Number(itemData.unitPrice);    
                log.debug("currentPRice",currentPrice)
                var increment = Number(currentPrice) * (Number(increasePercentage) / 100);
                log.debug("increment",increment);
                var newPrice = Number(currentPrice) + Number(increment);
                log.debug("newPrice", newPrice)
                var lineSelected = customerRecord.selectLine({sublistId: 'itempricing',line: itemLine})
                customerRecord.setCurrentSublistValue({sublistId: 'itempricing',fieldId: 'level',line: lineSelected,value:-1});
                customerRecord.setCurrentSublistValue({sublistId: 'itempricing',fieldId: 'price',line: lineSelected,value: newPrice.toFixed(2)});
                customerRecord.commitLine({sublistId: 'itempricing'});
            }
        });
        var customerUpdated = customerRecord.save({ignoreMandatoryFields: true});
        log.debug("customerUpdated",customerUpdated)
        } catch (e) {
            log.error('Error updating customer',e);
        }
    }
    return {
        getInputData: getInputData,
        map: map,
    };
});
