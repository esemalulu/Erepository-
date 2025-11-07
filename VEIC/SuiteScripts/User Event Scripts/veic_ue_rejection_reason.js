/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/record', 'N/search','N/redirect'],
    /**
     * @param{record} record
     * @param{redirect} redirect
     */
    (record, search, redirect) => {
        /**
         * Defines the function definition that is executed before record is loaded.
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
         * @param {Form} scriptContext.form - Current form
         * @param {ServletRequest} scriptContext.request - HTTP request information sent from the browser for a client action only.
         * @since 2015.2
         */
        const beforeLoad = (scriptContext) => {
            if (scriptContext.type == 'create') {
                let rec = scriptContext.newRecord;
                rec.setValue({fieldId:"custrecord_veic_rejection_reason",value:1,ignoreFieldChange:false});
            }
        }

        /**
         * Defines the function definition that is executed before record is submitted.
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {Record} scriptContext.oldRecord - Old record
         * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
         * @since 2015.2
         */
        const beforeSubmit = (scriptContext) => {

        }

        /**
         * Defines the function definition that is executed after record is submitted.
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {Record} scriptContext.oldRecord - Old record
         * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
         * @since 2015.2
         */
        const afterSubmit = (scriptContext) => {
            goBackToRecord(scriptContext);
        }

        function goBackToRecord(scriptContext){
            if (scriptContext.type == 'create') {
                let rec = scriptContext.newRecord;
                var tranId = rec.getValue({fieldId: 'custrecord_veic_rejected_tran'});

                var recordType = search.lookupFields({
                    type: search.Type.TRANSACTION,
                    id: tranId,
                    columns: 'type'
                });

                var recordTypeText = recordType.type[0].text;

                if(recordTypeText == 'Bill'){
                    recordTypeText = 'vendorbill';
                }

                redirect.toRecord({
                    type: recordTypeText,
                    id: tranId
                });
            }
        }

        return {beforeLoad, beforeSubmit, afterSubmit}

    });