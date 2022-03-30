/*
---------------------------------------------
Bundle: Store Locator
Owner: SuiteCommerce Inc.
Date Created: May 26th, 2011
All Copyrights Reserved. SuiteCommerce Inc.
---------------------------------------------
STORE LOCATOR LIBRARY                        
---------------------------------------------
*/
function searchbyZipCode(pRecordID, pSS, pZipFieldID, pZipCodes) {
    nlapiLogExecution( 'DEBUG', 'Breakpoint','Running Search > ' + pZipFieldID);

	var formula = ['CASE {' + pZipFieldID + '}'];
	for (var i=0; i < pZipCodes.length; i++) {
		var formulawhen = "WHEN '" + pZipCodes[i] + "' THEN 1"; 
		formula.push(formulawhen);
	};
	formula.push('ELSE 0');
	formula.push('END');

	var filters = [
		new nlobjSearchFilter('formulatext', null, 'is', '1')
  		];
	filters[0].setFormula(formula.join(" "));

	nlapiLogExecution( 'DEBUG', 'Info','Starting Search > ' + pZipCodes.length + ' Zipcodes: ' + pZipCodes);
	nlapiLogExecution( 'DEBUG', 'Info','Starting Search > Formula: ' + formula.join(" ")); 
    
	var searchResults = nlapiSearchRecord(pRecordID, pSS, filters, null);
	
	if(searchResults){
		return searchResults;
	}
	return new Array();
}

function searchbyState(pRecordID, pSS, pStateFieldID, pState) {
    nlapiLogExecution( 'DEBUG', 'Breakpoint','Running Search > ' + pStateFieldID);
	var filters = [
		new nlobjSearchFilter(pStateFieldID, null, 'is', pState)
   ];
	nlapiLogExecution( 'DEBUG', 'Info','Starting Search > State: ' + pState);	
	var searchResults = nlapiSearchRecord(pRecordID, pSS, filters, null);
	
	if(searchResults){
		return searchResults;
	}
	return new Array();
}   

function searchbyCityState(pRecordID, pSS, pCityFieldID, pStateFieldID, pCity, pState) {
    nlapiLogExecution( 'DEBUG', 'Breakpoint','Running Search > City/State');
	var filters = [
		new nlobjSearchFilter(pCityFieldID, null, 'is', pCity),
		new nlobjSearchFilter(pStateFieldID, null, 'is', pState)
   ];

	nlapiLogExecution( 'DEBUG', 'Info','Starting Search > City/State: ' + pCity + ', ' + pState); 
	var searchResults = nlapiSearchRecord(pRecordID, pSS, filters, null);
	
	if(searchResults){
		return searchResults;
	}
	return new Array();
}

function getStores(pRecordID, pSS, pQtyOfStores) {

	nlapiLogExecution( 'DEBUG', 'Breakpoint','Running Search > Getting ' + pQtyOfStores + ' Stores');
	
	var searchResults = nlapiSearchRecord(pRecordID, pSS, null, null);
	
	if(searchResults){
		if(pQtyOfStores != "All") return searchResults.slice(0,parseInt(pQtyOfStores));
		else return searchResults;
	}
	return new Array();
}

function runSuiteCommerceZipcodeSearch(pZipCode, pRadius) {
	nlapiLogExecution('DEBUG','INFO','Running SuiteCommerce Search:' + pZipCode + ' and ' + pRadius + ' miles around');
	var scripturl = "http://www.suitecommerceapps.com/StoreLocatorApp/getzipsjson.jsp";
	
	var scriptparams = "zipcode=" + pZipCode + "&radius=" + pRadius + "&country=us";
	var finalurl = scripturl + "?" + scriptparams;
	
	var data = nlapiRequestURL(finalurl); 
	
	var responsedata = data.getBody();
    nlapiLogExecution('DEBUG','INFO', 'Response SuiteCommerce Data: ' + responsedata);

	var obj = eval("(" + responsedata + ")");             
	
	return obj;
}