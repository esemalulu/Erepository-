/**
 * @NApiVersion 2.x
 * @NScriptType workflowactionscript
 */
define(['N/redirect'],
/**
 * @param {redirect} redirect
 */
function(redirect) {
   
    /**
     * Definition of the Workflow Action script trigger point.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.newRecord - New record
     * @param {Record} scriptContext.oldRecord - Old record
     * @Since 2016.1
     */
    function onAction(scriptContext) {
    	//Redirect to the suitelet to print the Unit
    	redirect.toSuitelet({
    		scriptId: 'customscriptgd_printunitrecordsuitelet',
    		deploymentId: 'customdeploygd_printunitrecordsuitelet',
    		parameters: {'custparam_unitid' : scriptContext.newRecord.id}
    	});
    }

    return {
        onAction : onAction
    };
    
});
