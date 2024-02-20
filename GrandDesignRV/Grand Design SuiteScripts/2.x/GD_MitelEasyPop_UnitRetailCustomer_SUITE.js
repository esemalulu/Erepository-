/**
 * @NApiVersion 2.x
 * @NScriptType Suitelet
 * @NModuleScope SameAccount
 */
define(['N/record', 'N/redirect', 'N/ui/serverWidget', 'SuiteScripts/SSLib/2.x/SSLib_File', 'SuiteScripts/SSLib/2.x/SSLib_Util', 'N/format', 'N/search'],
/**
 * @param {record} record
 * @param {redirect} redirect
 * @param {serverWidget} serverWidget
 */
function(record, redirect, serverWidget, SSLib_File, SSLib_Util, format, search) {
   
    /**
     * Definition of the Suitelet script trigger point.
     *
     * @param {Object} context
     * @param {ServerRequest} context.request - Encapsulation of the incoming request
     * @param {ServerResponse} context.response - Encapsulation of the Suitelet response
     * @Since 2015.2
     */
    function onRequest(context) {
    	if (context.request.method == 'GET') {
	    	var phoneNumber = context.request.parameters.phoneNumber || '';
	    	
	    	// We only compare the last 10 digits
	    	if (phoneNumber != '' && phoneNumber.length > 10)
	    		phoneNumber = phoneNumber.slice(-10);
	    	
	    	if (phoneNumber != ''){
		    	// Find all leads with corresponding leadUid and set the internal id to the Unit by cross referencing with corresponding unitId.
				var unitRetailCustomerResult = search.create({
		    		type: 'customrecordrvsunitretailcustomer',
		    		filters: [['custrecordunitretailcustomer_phone', 'is', phoneNumber], 
		    		          'OR',
		    		          ['custrecordunitretailcustomer_cellphone', 'is', phoneNumber]]
		    	}).run().getRange({
		    		start: 0,
		    		end: 1
		    	}) || [];
				
				if (unitRetailCustomerResult.length > 0){

					redirect.toRecord({
						type: 	'customrecordrvsunitretailcustomer',
						id: 	unitRetailCustomerResult[0].id
					});		
				}
			
	    	}
    	
    	}
    	var form = serverWidget.createForm({title: 'No Unit Retail Customer Match', hideNavBar: false});
    	context.response.writePage(form);
    }

    return {
        onRequest: onRequest
    };
});
