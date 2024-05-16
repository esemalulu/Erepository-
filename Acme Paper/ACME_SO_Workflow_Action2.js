/**
 *@NApiVersion 2.1
 *@NScriptType WorkflowActionScript
*/

define(['N/log','N/record'], function(log,record) {

    function onAction(scriptContext) {
        try{
            
            var newRecord = scriptContext.newRecord;
            var customerId = newRecord.getValue({
                fieldId: 'entity'
            });

            log.debug('customerId',customerId);

            var itemLineCount = newRecord.getLineCount({
                sublistId: 'item'
            });
            log.debug('itemLineCount',itemLineCount);
			
            for (var i = 0; i < itemLineCount; i++) {
                var itemId = newRecord.getSublistValue({
                    sublistId: 'item',
                    fieldId: 'item',
                    line: i
                });
                
                var restrictedItemCheck = newRecord.getSublistValue({
                    sublistId: 'item',
                    fieldId: 'custcol_acme_restricted_item',
                    line: i
                });

                log.debug('restrictedItemCheck',restrictedItemCheck);
                if(restrictedItemCheck){
                    let itemRecord = record.load({
                        type: 'inventoryitem',
                        id: itemId,
                        isDynamic: true
                    })

                    if(!itemRecord) return; 
                    
                    record.submitFields({
                        type: newRecord.type,
                        id: newRecord.id,
                        values: {
                            custbody_body_restricted_items: 'F'
                        }
                    });
                    
                    let customerLineCount = itemRecord.getLineCount({
                        sublistId: 'recmachcustrecord_acme_ri_item'
                    });

                    if(customerLineCount<1) return; 

                    log.debug('customerLineCount',customerLineCount);


                    for (let i = 0; i < customerLineCount; i++) {
                        var itemCustomerId = itemRecord.getSublistValue({
                            sublistId: 'recmachcustrecord_acme_ri_item',
                            fieldId: 'custrecord_acme_ri_customer',
                            line: i
                        });
                        
                        log.debug('itemCustomerId',itemCustomerId);

                        if(itemCustomerId==customerId){
                            log.debug('true',"true");
                            record.submitFields({
                                type: newRecord.type,
                                id: newRecord.id,
                                values: {
                                    custbody_body_restricted_items: 'T'
                                }
                            });
                            return;
                        }
                        
                    }
                }
            }
        }catch(e){
            log.error('ERROR',e)
        }
    }
    return {
        onAction: onAction
    };
});
