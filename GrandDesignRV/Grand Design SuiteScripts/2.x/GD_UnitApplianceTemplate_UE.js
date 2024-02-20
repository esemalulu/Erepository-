/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */
define(['N/record', 'N/query', 'N/runtime', 'SuiteScripts/SSLib/2.x/SSLib_Task'],
/**
 * @param {record} record
 * @param {query} query
 * @param {runtime} runtime
 */
function(record, query, runtime, SSLib_Task) {
   
    /**
     * Function definition to be triggered before record is loaded.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.newRecord - New record
     * @param {string} scriptContext.type - Trigger type
     * @param {Form} scriptContext.form - Current form
     * @Since 2015.2
     */
    function beforeLoad(scriptContext) {
        
    }

    /**
     * Function definition to be triggered before record is submitted.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.newRecord - New record
     * @param {Record} scriptContext.oldRecord - Old record
     * @param {string} scriptContext.type - Trigger type
     * @Since 2015.2
     */
    function beforeSubmit(scriptContext) {

    }

    /**
     * Function definition to be triggered after record is submitted.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.newRecord - New record
     * @param {Record} scriptContext.oldRecord - Old record
     * @param {string} scriptContext.type - Trigger type
     * @Since 2015.2
     */
    function afterSubmit(scriptContext) {
        var model = scriptContext.newRecord.getValue('custrecordunitappliancetemplate_model');

        var suiteQLString = "SELECT id FROM customrecordrvsunit WHERE"
        + " custrecordunit_status = 7"
        + " AND custrecordunit_onlinedate > CURRENT_DATE"
        + " AND custrecordunit_model = " + model;

        var results = query.runSuiteQL({query: suiteQLString}).asMappedResults();

        if (results.length > 0) {
            // Kick off Unit Appliance Update Map Reduce
            var params = {};
            params['custscriptgd_unitappupdate_model'] = model;
            scriptTaskId = SSLib_Task.startMapReduceScript('customscriptgd_unitaplianceupdate_mapred', null, params, '3', '5', '5');
        }
        
    }

    return {
        //beforeLoad: beforeLoad,
        //beforeSubmit: beforeSubmit,
        afterSubmit: afterSubmit
    };
    
});
