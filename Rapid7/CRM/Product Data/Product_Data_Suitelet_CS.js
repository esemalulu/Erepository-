/*
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       24 Sep 2012     efagone
 *
 */

function pageInit() {

	window.onbeforeunload = function() {
	};
	
	updateTotal();
}

function fieldChanged(type, name, linenum) {

	if (name == 'custpage_opportunity') {
		var suiteletURL = nlapiResolveURL('SUITELET', 'customscriptr7productdata_suitelet', 'customdeployr7productdata_suitelet', false);
		suiteletURL += '&custparam_oppid=' + nlapiGetFieldValue('custpage_opportunity');

		window.location = suiteletURL;
		return;
	}

}

function searchFlights() {
	var select1 = document.getElementById("airports-select-1");
	var selected1 = [];
	for ( var i = 0; i < select1.length; i++) {
		if (select1.options[i].selected) selected1.push(select1.options[i].value);
	}
	alert(selected1);
}

function updateTotal(){

	var lineItemCount = nlapiGetLineItemCount('custpage_proddatalist');
	var runningTotal = 0;
	for (var i = 1; i <= lineItemCount; i++) {
	
		var amount = nlapiGetLineItemValue('custpage_proddatalist', 'custpage_proddatalist_productamount', i);
		runningTotal = runningTotal + parseFloat(amount);
	}

	nlapiSetFieldValue('custpage_projectedtotal', Math.round(runningTotal * 100) / 100);
}