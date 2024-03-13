/**
 *@NApiVersion 2.x
 *@NScriptType WorkflowActionScript
 */
define(['N/record'], function(record) {

    function ApproveDebitMemo(scriptContext) {
    
        var rec = scriptContext.newRecord
        var debitmemo_id = rec.id

        rec.setValue({
            fieldId: 'transtatus',
            value: 'B'
        })

    }

    return {
        onAction: ApproveDebitMemo
    }
});
