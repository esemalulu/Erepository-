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
     * Definition of the Suitelet script trigger point.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.newRecord - New record
     * @param {Record} scriptContext.oldRecord - Old record
     * @Since 2016.1
     */
    function onAction(scriptContext) {
    	var searchId = 'customsearchgd_dealercontact';
    	redirect.redirect({
    		url: '/app/common/search/searchresults.nl?searchtype=Customer&Entity_INTERNALID=' + 
    		scriptContext.newRecord.id + '&style=NORMAL&report=&grid=&searchid=' + searchId
    	});
    }

    return {
        onAction : onAction
    };
    
});
