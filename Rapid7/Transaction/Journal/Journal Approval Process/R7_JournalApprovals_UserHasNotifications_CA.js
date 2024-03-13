/*
 * @author efagone
 */

function checkForNotifies(){

	var tranId = nlapiGetRecordId();
	var userId = nlapiGetUser();
	
	if (tranId != null && tranId != '') {
	
		var nowDateTime = nlapiDateToString(new Date(), 'datetimetz');
		
		var arrSearchFilters = new Array();
		arrSearchFilters[0] = new nlobjSearchFilter('custrecordr7approvalquote', null, 'is', tranId);
		arrSearchFilters[1] = new nlobjSearchFilter('custrecordr7approvalstatus', null, 'anyof', 7);
		arrSearchFilters[2] = new nlobjSearchFilter('custrecordr7approvalapprover', null, 'anyof', userId);
		
		var arrSearchResults = nlapiSearchRecord('customrecordr7approvalrecord', null, arrSearchFilters);
		
		if (arrSearchResults != null && arrSearchResults.length >= 1) {
			return 'T';
		}
		
	}
	
	return 'F';
}