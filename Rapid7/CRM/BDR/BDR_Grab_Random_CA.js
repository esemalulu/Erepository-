/*
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       29 Apr 2013     efagone
 *
 */

/*
 * @returns {Void} Any or no return value
 */
function findRando(){

	var context = nlapiGetContext();

	if (context.getExecutionContext() == 'workflow') {
		
		var territory = context.getSetting('SCRIPT', 'custscriptr7bdrsalesterritory');
		
		return getMatchingBDR(territory);

	}
}

function getMatchingBDR(territory){

	var arrSearchFilters = new Array();
	arrSearchFilters[arrSearchFilters.length] = new nlobjSearchFilter('isinactive', null, 'is', 'F');
	arrSearchFilters[arrSearchFilters.length] = new nlobjSearchFilter('custentityr7isbdr', null, 'is', 'T');
	arrSearchFilters[arrSearchFilters.length] = new nlobjSearchFilter('custentityr7employeeseparationreason', null, 'anyof', '@NONE@');
	arrSearchFilters[arrSearchFilters.length] = new nlobjSearchFilter('releasedate', null, 'isempty');
	if (territory != null && territory != '') {
		arrSearchFilters[arrSearchFilters.length] = new nlobjSearchFilter('custentityr7salesterritoryassignment', null, 'anyof', territory);
	}
	var arrSearchResults = nlapiSearchRecord('employee', null, arrSearchFilters);
	
	if (arrSearchResults != null) {
		var randomResultNumber = Math.floor(Math.random() * arrSearchResults.length);
		return arrSearchResults[randomResultNumber].getId();
	}
	
	return null;
}

