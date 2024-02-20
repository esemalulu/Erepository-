/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */
define(['N/record', 'N/search', 'N/runtime', 'N/email', 'N/render', 'N/ui/serverWidget', 'N/file', 'SuiteScripts/SSLib/2.x/SSLib_Util'],
/**
 * @param {record} record
 * @param {search} search
 * @param {runtime} runtime
 * @param {email} email
 * @param {render} render
 * @param {serverWidget} serverWidget
 * @param {file} file
 */
function(record, search, runtime, email, render, serverWidget, file, SSLib_Util) {
   
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
     * Function definition to be triggered before record is loaded.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.newRecord - New record
     * @param {Record} scriptContext.oldRecord - Old record
     * @param {string} scriptContext.type - Trigger type
     * @Since 2015.2
     */
    function beforeSubmit(scriptContext) {
    	if(scriptContext.type != 'delete') {
    		//Set vendor name on the custom column line field so the value is searchable.
    		var poLineCount = scriptContext.newRecord.getLineCount({sublistId: 'item'});
    		var vendorName = '';
    		for (var i = 0; i < poLineCount; i++){
    			vendorName = scriptContext.newRecord.getSublistValue({sublistId: 'item', fieldId: 'vendorname', line: i});
    			scriptContext.newRecord.setSublistValue({sublistId: 'item', fieldId: 'custcolgd_vendornamesearchable', value: vendorName, line: i});
    		}
    	}
    }

    /**
     * Function definition to be triggered before record is loaded.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.newRecord - New record
     * @param {Record} scriptContext.oldRecord - Old record
     * @param {string} scriptContext.type - Trigger type
     * @Since 2015.2
     */
    function afterSubmit(scriptContext) {
    	
    }

    return {
        beforeLoad: beforeLoad,
        beforeSubmit: beforeSubmit,
        afterSubmit: afterSubmit
    };
    
});
