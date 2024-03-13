/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       04 Feb 2013     efagone
 *
 */

/**
 * @returns territory group
 */
function setTerritoryMatch(){
	var context = nlapiGetContext();
	
	var territory = context.getSetting('SCRIPT', 'custscript_r7_territory');
	
	var matchTerritory = findMatchingTerritory(territory);
	nlapiSetFieldValue('custentityr7territory', matchTerritory);
	
	return matchTerritory;
}

function findMatchingTerritory(territory){

	if (territory != null && territory != '') {
	
		var arrSearchFilters = new Array();
		arrSearchFilters[arrSearchFilters.length] = new nlobjSearchFilter('custrecordr7salesterritoryassignmentrule', null, 'anyof', territory);
		
		var arrSearchColumns = new Array();
		arrSearchColumns[0] = new nlobjSearchColumn('internalid');
		arrSearchColumns[1] = new nlobjSearchColumn('name');
		
		var arrSearchResults = nlapiSearchRecord('customrecordr7salesterritorygroups', null, arrSearchFilters, arrSearchColumns);
		
		if (arrSearchResults != null && arrSearchResults.length >= 1) {
			return arrSearchResults[0].getValue(arrSearchColumns[0]);
		}
	}
	
	return '';
}
