/*
 * @author efagone
 */
function deleteNonRequested(){

	var context = nlapiGetContext();
	
	if (context.getExecutionContext() == 'workflow') {
	
		var quoteId = nlapiGetRecordId();
		
		var arrSearchFilters = new Array();
		arrSearchFilters[0] = new nlobjSearchFilter('custrecordr7approvalquote', null, 'is', quoteId);
		arrSearchFilters[1] = new nlobjSearchFilter('custrecordr7approvaldaterequested', null, 'isempty');
		
		var searchResults = nlapiSearchRecord('customrecordr7approvalrecord', null, arrSearchFilters);
		
		if (searchResults != null) {
			for (var i = 0; i < searchResults.length; i++) {
			
				var id = searchResults[i].getId();
				nlapiLogExecution('DEBUG', 'id', id);
				nlapiDeleteRecord('customrecordr7approvalrecord', id);
				
			}
		}
	}
}