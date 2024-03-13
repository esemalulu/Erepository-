/*
 * @author efagone
 */
function markReplaced(){

	var context = nlapiGetContext();
	
	if (context.getExecutionContext() == 'workflow') {
	
		var quoteId = nlapiGetRecordId();
		var materialChange = context.getSetting('SCRIPT', 'custscriptr7approvalsca_replacedmaterial');
		
		if (materialChange == 'T') {
			var statusIds = 5;
		}
		else {
			var statusIds = new Array(3, 5);
		}
		var arrSearchFilters = new Array();
		arrSearchFilters[0] = new nlobjSearchFilter('custrecordr7approvalquote', null, 'is', quoteId);
		arrSearchFilters[1] = new nlobjSearchFilter('custrecordr7approvalstatus', null, 'noneof', statusIds);
		
		var searchResults = nlapiSearchRecord('customrecordr7approvalrecord', null, arrSearchFilters);
		
		if (searchResults != null) {
			for (var i = 0; i < searchResults.length; i++) {
			
				var id = searchResults[i].getId();
				nlapiSubmitField('customrecordr7approvalrecord', id, 'custrecordr7approvalstatus', 5);
				
			}
		}
	}
}