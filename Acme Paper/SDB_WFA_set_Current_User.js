/**
* @NApiVersion 2.x
* @NScriptType WorkflowActionScript
*/
define(["N/record", "N/runtime", "N/https", "N/log", "N/search", 'N/error', "N/runtime"], function (record, runtime, https, log, search, error, runtime) {
    function ngAction(context) {
        log.debug('context', context.type);
        if (context.type == 'create') {
            //Added functionality to set the current user
            try {
                log.debug('custbody_aps_entered_by', currentrecord.getValue({ fieldId: 'custbody_aps_entered_by' }))
                
                var currentRoleId = runtime.getCurrentUser().id
                log.debug('currentRoleId', currentRoleId);
                var currentrecord = context.newRecord;
                currentrecord.setValue({
                    fieldId: 'custbody_aps_entered_by',
                    value: currentRoleId,
                    ignoreFieldChange: true
                })
                log.debug('currentRoleId', currentrecord.getText({
                    fieldId: 'custbody_aps_entered_by',
                    value: currentRoleId,
                }));
            } catch (e) {
                log.error('Error setting Entered By', e.toString());
            }
        }

    }
    return {
        onAction: ngAction
    }
});