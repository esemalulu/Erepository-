/**
 * @NApiVersion 2.x
 * @NScriptType workflowactionscript
 */
define(['N/redirect'],

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
            scriptId: 'customscriptgd_pdr_singlecheck_su',
            deploymentId: 'customdeploygd_pdr_singlecheck_su',
            parameters: {
                custparam_refundid : scriptContext.newRecord.id,
                custparam_tranid: scriptContext.newRecord.getValue({fieldId: 'tranid'})
            }
        });
    }

    return {
        onAction : onAction,
    };
    
});
