/**
 * @NApiVersion 2.1
 * @NScriptType WorkflowActionScript
 */
define(['N/record', 'N/error', 'N/ui/message', 'N/runtime', 'N/search'], function (record, error, message, runtime, search) {
    function onAction(context) {

        try {

            var newRecord = context.newRecord;
            var oldRecord = context.oldRecord;
            log.debug('onAction: ', newRecord.getValue('custbody_sdb_trigger_soap'))
            if (!newRecord.getValue('custbody_sdb_trigger_soap')) {
                newRecord.setValue({ fieldId: 'custbody_sdb_trigger_soap', value: true })
            } else {
                newRecord.setValue({ fieldId: 'custbody_sdb_trigger_soap', value: false })
            }


        } catch (e) {
            log.error('onAction: ', e)
        }
    }
    return {
        onAction: onAction
    }
});

