/**
 * 
 * Button on the bill payment to export the bill lines (Apply tab) to excel
 * 
 * @NApiVersion 2.x
 * @NScriptType workflowactionscript
 */
define(['N/redirect'],
/**
 * @param {redirect} redirect
 */
function(redirect) {
   
    /**
     * Definition of the Suitelet script trigger point.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.newRecord - New record
     * @param {Record} scriptContext.oldRecord - Old record
     * @Since 2016.1
     */
    function onAction(scriptContext) {
    	redirect.toSuitelet({
    		scriptId: 'customscriptgd_exportbillpayment_suite',
    		deploymentId: 'customdeploygd_exportbillpayment_suite',
    		parameters: {
    			'recid': scriptContext.newRecord.id
			}
    	});
    }

    return {
        onAction : onAction
    };
    
});
