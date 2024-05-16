/**
 *@NApiVersion 2.1
 *@NScriptType ClientScript
 */
 define(["N/log"], function(log) {

    function saveRecord(context) {
        var currentRecord = context.currentRecord;
        if(!currentRecord) return true;

        var fieldServiceRep = currentRecord.getValue("custpage_customer_service_rep");
        if(!fieldServiceRep) return true;

        currentRecord.setValue({fieldId: 'custentity_sdb_csr_customers', value: fieldServiceRep});

        return true;
    }

    function fieldChanged(context){

        // When user set good standing checkbox to false, field upload to evox will change to false also
        if (context.fieldId == 'custentity_credit_codech') {
            // If user is activating good standing return and exit functionality
            if(context.currentRecord.getValue(context.fieldId)) return;

            // Set upload to evox field to false
            context.currentRecord.setValue({fieldId: 'custentity_acc_upld_evox', value: false})
        }
    }

    return {
        saveRecord: saveRecord,
        fieldChanged: fieldChanged
    }
});
