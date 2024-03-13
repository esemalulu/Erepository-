/**
 * @NApiVersion 2.1
 * @NModuleScope SameAccount
 * @NScriptType UserEventScript
 * @NAMDConfig
 * @NModuleScope SameAccount
 * Rapid 7
 * Transaction/Renewal Upsell Reporting Object/R7_Link_Reporting_Object_To_Transaction.js
 * @module R7_Link_Reporting_Object_To_Transaction
 * @description Links the newly created reporting object to the specificed sales order
 */
define(['N/record', '/SuiteScripts/Administrative/r7.retry'], (record, retry) => {

    /**
     * @function afterSubmit
     * @description description
     *
     * @public
     * @param  {type} scriptContext description
     * @return {type} - description
     */
    function afterSubmit(scriptContext) {
        return retry({
            maxTries: 3,
            functionToExecute: processFunction,
            arguments: [scriptContext],
            retryOnError: 'RCRD_HAS_BEEN_CHANGED'
        });
    }

    function processFunction(scriptContext){
        const rec = scriptContext.newRecord;
        if(!rec.getValue('custrecordr7_linked_to_so')) {
            const transId = rec.getValue('custrecordr7renewaltransactionid');
            const lineNo = rec.getValue('custrecordr7renewaltransactionlineno');

            if(transId && lineNo) {
                const transactionRec = record.load({
                    type: record.Type.SALES_ORDER,
                    id: transId,
                    isDynamic: false
                });
                transactionRec.setSublistValue({
                    sublistId: 'item',
                    fieldId: 'custcolr7_reporting_obj',
                    line: Number(lineNo) - 1,
                    value: rec.id
                });
                transactionRec.save();
                record.submitFields({
                    type: 'customrecordr7_renup_reporting_obj',
                    id: scriptContext.newRecord.id,
                    values: {
                        custrecordr7_linked_to_so: true
                    }
                });
            }
        }
    }

    return /** @alias module: R7_Link_Reporting_Object_To_Transaction */ {
        afterSubmit: afterSubmit
    };
});