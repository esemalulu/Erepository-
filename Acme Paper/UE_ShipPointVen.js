/**
 *@NApiVersion 2.1
 *@NScriptType UserEventScript
 */
define(['N/record', 'N/log'], function(record, log) {

    function beforeLoad(context) {
        
    }

    function beforeSubmit(context) {
        try {
            if(!["create"].includes(context.type))
            return;
            var itemRecord = context.newRecord;
            var venLineCount = itemRecord.getLineCount({
                sublistId: "itemvendor"
            });
            var prefShipVend = "";

            for (var i=0; i<venLineCount; i++){
                var prefVen = itemRecord.getSublistValue({
                    sublistId: "itemvendor",
                    fieldId: "preferredvendor",
                    line: i
                });
                if (prefVen) {
                    prefShipVend = itemRecord.getSublistValue({
                        sublistId: "itemvendor",
                        fieldId: "vendor",
                        line: i 
                    });
                    break;
                }
            }
                itemRecord.setValue({
                    fieldId: "custitem_acc_prefvend",
                    value: prefShipVend
                })
        } catch (error) {
            log.error(error);
        }
        
    }

    function afterSubmit(context) {
        
    }

    return {
        beforeSubmit: beforeSubmit
    }
});
