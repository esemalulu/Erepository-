/**
 * @NApiVersion 2.1
 * @NScriptType WorkflowActionScript
 */
define(['N/record', 'N/error', 'N/ui/message', 'N/runtime', 'N/search'], function (record, error, message, runtime, search) {
    function onAction(context) {

        try {
            var newRecord = context.newRecord;
            var customerId = newRecord.getValue("entity");
           
            var itemLineCount = newRecord.getLineCount("item");
            if (itemLineCount < 1) return 0;
    
            for (var i = 0; i < itemLineCount; i++)
            {
                var itemId = newRecord.getSublistValue({
                    sublistId: 'item',
                    fieldId: 'item',
                    line: i
                });
                if (!itemId) continue;
    
                var restrictedItemCheck = newRecord.getSublistValue({
                    sublistId: 'item',
                    fieldId: 'custcol_acme_restricted_item',
                    line: i
                });
                log.debug('restrictedItemCheck', restrictedItemCheck);

                if (!restrictedItemCheck || restrictedItemCheck == null) continue;
    
                let itemRecord = record.load({
                    type: 'inventoryitem',
                    id: itemId,
                    isDynamic: true
                });
    
                if (!itemRecord) continue;
                let customerLineCount = itemRecord.getLineCount({
                    sublistId: 'recmachcustrecord_acme_ri_item'
                });
                log.debug('customerLineCount', customerLineCount);
                if (customerLineCount < 1) return 1;
                var correctCustomer = 0;
    
                for (let i = 0; i < customerLineCount && !correctCustomer; i++)
                {
                    var itemCustomerId = itemRecord.getSublistValue({
                        sublistId: 'recmachcustrecord_acme_ri_item',
                        fieldId: 'custrecord_acme_ri_customer',
                        line: i
                    });
                    if (!itemCustomerId) continue;
    
                    log.debug('itemCustomerId', itemCustomerId);
    
                    if (itemCustomerId == customerId) correctCustomer = 1;
                }
    
                //If customer is not inside customer's restricted list inside item record
                if (!correctCustomer) return 1;
    
            }//end for
    
            return 0;
        } catch (e) {
            log.debug('onAction: ', e)
        }

    }
    
    return {
        onAction: onAction
    }
});

