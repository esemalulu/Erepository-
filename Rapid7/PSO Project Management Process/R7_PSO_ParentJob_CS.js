/*
 * @author efagone
 */
function saveRecord(){

	var parentJobId = nlapiGetRecordId();
	var salesOrderId = nlapiGetFieldValue('custrecordr7psojobsalesorder');
	
	if (salesOrderId != null && salesOrderId != '') {
		var arrSearchFilters = new Array();
		arrSearchFilters[0] = new nlobjSearchFilter('custrecordr7psojobsalesorder', null, 'is', salesOrderId);
		
		if (parentJobId != null && parentJobId != '') {
			arrSearchFilters[1] = new nlobjSearchFilter('internalid', null, 'noneof', parentJobId);
		}
		
		var arrSearchResults = nlapiSearchRecord('customrecordr7psoparentjob', null, arrSearchFilters, null);
		
		if (arrSearchResults != null && arrSearchResults.length >= 1) {
			nlapiLogExecution('DEBUG', 'searchResults.length', arrSearchResults.length);
			alert("This Sales Order already has a Parent Job associated with it. Please choose another.");
			return false;
		}
	}
	return true;
}