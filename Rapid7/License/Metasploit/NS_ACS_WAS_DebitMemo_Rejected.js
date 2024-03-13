/**
 *@NApiVersion 2.x
 *@NScriptType WorkflowActionScript
 */
define(['N/record'], function(record) {

    function ApproveDebitMemo(scriptContext) {
    
        var rec = scriptContext.newRecord

        rec.setValue({
            fieldId: 'transtatus',
            value: 'C'
        })
    }

    return {
        onAction: ApproveDebitMemo
    }
});
