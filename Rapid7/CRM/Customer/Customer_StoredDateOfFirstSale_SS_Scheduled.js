/**
 * @author efagone
 */
function copyDateOfFirstSale(){
	
	//set columns for both searches
	var arrSearchColumns = new Array();
	arrSearchColumns[0] = new nlobjSearchColumn('firstsaledate');
	
		
	//run through all of the cases where stored field != firstsaledate
	//i needed to do this wierd formula because it would not recognize null values in stored!=non-stored
	var arrSearchFilters = new Array();
	arrSearchFilters[0] = new nlobjSearchFilter('formulanumeric', null, 'equalto',1);
	arrSearchFilters[0].setFormula('CASE WHEN {custentityr7dateoffirstsalestoredvalue} != {firstsaledate} THEN 1 WHEN (DECODE({custentityr7dateoffirstsalestoredvalue},null,1,0)) != (DECODE({firstsaledate},null,1,0)) THEN 1 ELSE 0 END');
	
	var arrSearchResults = nlapiSearchRecord('customer', null, arrSearchFilters, arrSearchColumns);
	
		
	if (arrSearchResults != null && arrSearchResults.length < 300) {
		for (var i in arrSearchResults) {
		
			searchResult = arrSearchResults[i];
			var customerId = searchResult.getId();
			var dateOfFirstSale = searchResult.getValue(arrSearchColumns[0]);
			nlapiLogExecution('DEBUG', 'Details', 'CustomerId: ' + customerId + '\nDate of first sale (non-stored): ' + dateOfFirstSale);
		    nlapiSubmitField('customer', customerId, 'custentityr7dateoffirstsalestoredvalue', dateOfFirstSale);
		
		}
	}
	
}
