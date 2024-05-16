/**
 * @NApiVersion 2.1
 * @NScriptType WorkflowActionScript
 */
define(['N/record', 'N/error', 'N/ui/message', 'N/runtime', 'N/search'], function (record, error, message, runtime, search) {
    function onAction(context) {

        try {
            var newRecord = context.newRecord;
            let myReturn = 1;
          
            var lineCount = newRecord.getLineCount({ sublistId: "item" });
            for (var i = 0; i < lineCount; i++) {

                var qtyAvailable = newRecord.getSublistValue({
                    sublistId: "item",
                    fieldId: "quantityavailable",
                    line: i,
                });

                if (qtyAvailable && qtyAvailable > 0) return 0;
            }

            log.debug('myReturn: ', myReturn)
            return myReturn;
        } catch (e) {
            log.debug('onAction: ', e)
        }
    }

    return {
        onAction: onAction
    }
});

