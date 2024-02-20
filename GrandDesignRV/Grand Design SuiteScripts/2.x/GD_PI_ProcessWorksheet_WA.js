/**
 * @NApiVersion 2.1
 * @NScriptType WorkflowActionScript
 */
define(['N/currentRecord', 'N/log', 'N/record', 'N/recordContext', 'N/search', 'N/ui/dialog', 'N/ui/message', '/SuiteBundles/Bundle 135254/SSLib_Task.js'],
    /**
     * @param{currentRecord} currentRecord
     * @param{log} log
     * @param{record} record
     * @param{recordContext} recordContext
     * @param{search} search
     * @param{dialog} dialog
     * @param{message} message
     */
    (currentRecord, log, record, recordContext, search, dialog, message,  SSLib_Task) => {
        /**
         * Defines the WorkflowAction script trigger point.
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {Record} scriptContext.oldRecord - Old record
         * @param {string} scriptContext.workflowId - Internal ID of workflow which triggered this action
         * @param {string} scriptContext.type - Event type
         * @param {Form} scriptContext.form - Current form that the script uses to interact with the record
         * @since 2016.1
         */
        const onAction = (scriptContext) => {
            var params = new Object();
            params['custscriptgd_piworksheetcountid'] = scriptContext.newRecord.id;
            SSLib_Task.scheduleScript('customscriptgd_piworksheettagupdate', null, params);
        }

        return {
            onAction
        };
    });