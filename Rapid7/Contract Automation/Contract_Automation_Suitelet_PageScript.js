/*
 * @author efagone
 */

function pageInit(){
	window.onbeforeunload = function() {};
	
	updateTotalPercent();
	updateTotal();
}

function fieldChanged(type, name, linenum){

	if (name == 'custpage_contracttemplate') {
		
		var contractSuiteletURL = nlapiResolveURL('SUITELET', 'customscriptr7contractautomation_suitele', 'customdeployr7contractautomation_suitele', false);
		contractSuiteletURL = contractSuiteletURL + '&custparam_ordertype=' + nlapiGetFieldValue('custpage_ordertype') + '&custparam_orderid=' + nlapiGetFieldValue('custpage_orderid') + '&custparam_customer=' + nlapiGetFieldValue('custpage_customerid') + '&custparam_ruleid=' + nlapiGetFieldValue('custpage_contracttemplate');
		window.location = contractSuiteletURL;
	}
	
	if (name == 'custpage_existingcontracts') {
		var contractSuiteletURL = nlapiResolveURL('SUITELET', 'customscriptr7contractautomation_suitele', 'customdeployr7contractautomation_suitele', false);
		contractSuiteletURL = contractSuiteletURL + '&custparam_ordertype=' + nlapiGetFieldValue('custpage_ordertype') + '&custparam_orderid=' + nlapiGetFieldValue('custpage_orderid') + '&custparam_customer=' + nlapiGetFieldValue('custpage_customerid');
		var existingContract = nlapiGetFieldValue(name);
		if (existingContract != null && existingContract != ''){
			contractSuiteletURL += '&custparam_currentcontract=' + existingContract;
		}
		window.location = contractSuiteletURL;
	}
	
	/*
	if (name == 'custpage_durationyears') {
		var numYears = nlapiGetFieldValue('custpage_durationyears');
		
		if (numYears == '' || numYears == null) {
			nlapiSetFieldValue('custpage_durationstart', '');
			nlapiSetFieldValue('custpage_durationend', '');
		}
		else {
			var startDate = new Date();
			nlapiSetFieldValue('custpage_durationstart', nlapiDateToString(startDate));
			nlapiSetFieldValue('custpage_durationend', nlapiDateToString(nlapiAddDays(nlapiAddDays(startDate, numYears * 365), -1)));
		}
	}
	*/
	
	if (name == 'custpage_amount') {
		var amount = nlapiGetFieldValue('custpage_amount');
		
		if (amount == '' || amount == null) {
			nlapiSetFieldValue('custpage_renewaltotal_new', nlapiGetFieldValue('custpage_renewaltotal_orig'));
		}
		else {
			nlapiSetFieldValue('custpage_renewaltotal_new', amount);
			
		}
	}
	
	if (name == 'custpage_discountamount') {
		var amount = nlapiGetFieldValue('custpage_discountamount');
		
		if (amount == '' || amount == null) {
			nlapiSetFieldValue('custpage_renewaltotal_new', nlapiGetFieldValue('custpage_renewaltotal_orig'));
		}
		else 
			if (parseFloat(amount) < 0) {
				alert('Discount cannot be negative.');
				return false;
				
			}
			else {
				nlapiSetFieldValue('custpage_renewaltotal_new', Math.round((nlapiGetFieldValue('custpage_renewaltotal_orig') - amount) * 100) / 100);
				
			}
	}
	
	if (name == 'custpage_percent') {
		var percent = nlapiGetFieldValue('custpage_percent');
		
		if (percent == '' || percent == null) {
			nlapiSetFieldValue('custpage_renewaltotal_new', nlapiGetFieldValue('custpage_renewaltotal_orig'));
		}
		else 
			if (nlapiGetFieldValue('custpage_templateappliesto') != 8) {
				nlapiSetFieldValue('custpage_renewaltotal_new', Math.round(nlapiGetFieldValue('custpage_renewaltotal_orig') * ((100 - parseFloat(percent)) / 100) * 100) / 100);
				
			}
	}
	
	if (type == 'custpage_lineitemlist') {
	
		if (name == 'custpage_lineitem_newamount') {
			updateTotal();
		}
		
		if (name == 'custpage_lineitem_newrate') {
			var rate = nlapiGetLineItemValue(type, 'custpage_lineitem_newrate', linenum);
			var quantity = parseFloat(nlapiGetLineItemValue(type, 'custpage_lineitem_quantity', linenum));
			var amount = parseFloat(nlapiGetLineItemValue(type, 'custpage_lineitem_actualamount', linenum));
			
			if (rate != null && rate != '') {
				amount = quantity * rate;
				amount = Math.round(amount * 100) / 100;
			}
			
			nlapiSetLineItemValue(type, 'custpage_lineitem_newamount', linenum, amount.toFixed(2));
			updateTotal();
		}
		
		if (name == 'custpage_lineitem_percent') {
		
			var percentage = nlapiGetLineItemValue(type, 'custpage_lineitem_percent', linenum);
			var amount = parseFloat(nlapiGetLineItemValue(type, 'custpage_lineitem_actualamount', linenum));
			
			if (percentage != null && percentage != '') {
				amount = amount * ((100 - parseFloat(percentage)) / 100);
				amount = Math.round(amount * 100) / 100;
			}
			
			nlapiSetLineItemValue(type, 'custpage_lineitem_newamount', linenum, amount.toFixed(2));
			updateTotal();
		}

	}
	
	
}

function deleteContract(){
	
	if (confirm('Are you sure you would like to delete this contract?')) {
		nlapiSubmitField('customrecordr7contractautomation', nlapiGetFieldValue('custpage_existingcontracts'), 'isinactive', 'T');
		
		var contractSuiteletURL = nlapiResolveURL('SUITELET', 'customscriptr7contractautomation_suitele', 'customdeployr7contractautomation_suitele', false);
		contractSuiteletURL = contractSuiteletURL + '&custparam_ordertype=' + nlapiGetFieldValue('custpage_ordertype') + '&custparam_orderid=' + nlapiGetFieldValue('custpage_orderid') + '&custparam_customer=' + nlapiGetFieldValue('custpage_customerid');
		window.location = contractSuiteletURL;
	}
}

function approveContract(){

	if (confirm('Are you sure you would like to approve this contract?')) {
		var contractSuiteletURL = nlapiResolveURL('SUITELET', 'customscriptr7contractautomation_suitele', 'customdeployr7contractautomation_suitele', false);
		var params = new Array();
		params['custparam_action'] = 'approve';
		params['custparam_actionconid'] = nlapiGetFieldValue('custpage_currentcontract');
		var reqResp = nlapiRequestURL(contractSuiteletURL, params);
		
		alert('Contract has been approved.');
		contractSuiteletURL += '&custparam_ordertype=' + nlapiGetFieldValue('custpage_ordertype');
		contractSuiteletURL += '&custparam_orderid=' + nlapiGetFieldValue('custpage_orderid');
		contractSuiteletURL += '&custparam_customer=' + nlapiGetFieldValue('custpage_customerid');
		contractSuiteletURL += '&custparam_currentcontract=' + nlapiGetFieldValue('custpage_currentcontract');
		contractSuiteletURL += '&custparam_view=T';
		window.location = contractSuiteletURL;
	}
}

function activateContract(){

	if (confirm('Are you sure you would like to activate this contract?')) {
		var contractSuiteletURL = nlapiResolveURL('SUITELET', 'customscriptr7contractautomation_suitele', 'customdeployr7contractautomation_suitele', false);
		var params = new Array();
		params['custparam_action'] = 'activate';
		params['custparam_actionconid'] = nlapiGetFieldValue('custpage_currentcontract');
		var reqResp = nlapiRequestURL(contractSuiteletURL, params);
		
		alert('Contract has been activated.');
		contractSuiteletURL += '&custparam_ordertype=' + nlapiGetFieldValue('custpage_ordertype');
		contractSuiteletURL += '&custparam_orderid=' + nlapiGetFieldValue('custpage_orderid');
		contractSuiteletURL += '&custparam_customer=' + nlapiGetFieldValue('custpage_customerid');
		contractSuiteletURL += '&custparam_currentcontract=' + nlapiGetFieldValue('custpage_currentcontract');
		contractSuiteletURL += '&custparam_view=T';
		window.location = contractSuiteletURL;
	}
}

function editContract(){

	var contractSuiteletURL = nlapiResolveURL('SUITELET', 'customscriptr7contractautomation_suitele', 'customdeployr7contractautomation_suitele', false);
	contractSuiteletURL = contractSuiteletURL + '&custparam_ordertype=' + nlapiGetFieldValue('custpage_ordertype') + '&custparam_orderid=' + nlapiGetFieldValue('custpage_orderid') + '&custparam_customer=' + nlapiGetFieldValue('custpage_customerid');
	var existingContract = nlapiGetFieldValue('custpage_existingcontracts');
	if (existingContract != null && existingContract != '') {
		contractSuiteletURL += '&custparam_currentcontract=' + existingContract;
	}
	window.location = contractSuiteletURL;
	
}

function updateTotal(){

	var lineItemCount = nlapiGetLineItemCount('custpage_lineitemlist');
	var runningTotal = 0;
	for (var i = 1; i <= lineItemCount; i++) {
	
		var amount = nlapiGetLineItemValue('custpage_lineitemlist', 'custpage_lineitem_actualamount', i);
		var newAmount = nlapiGetLineItemValue('custpage_lineitemlist', 'custpage_lineitem_newamount', i);
		if (newAmount != null && newAmount != ''){
			amount = newAmount;
		}
		
		runningTotal = runningTotal + parseFloat(amount);
	}

	var discountAmount = nlapiGetFieldValue('custpage_discountamount');
	
	if (discountAmount != null && discountAmount != '') {
		runningTotal = runningTotal - parseFloat(discountAmount);
	}
	
	var discountPercent = nlapiGetFieldValue('custpage_percent');
	
	if (discountPercent != null && discountPercent != '' && nlapiGetFieldValue('custpage_templateappliesto') != 8) {
		runningTotal = Math.round(runningTotal * ((100 - parseFloat(discountPercent)) / 100) * 100) / 100;
	}
		
	nlapiSetFieldValue('custpage_renewaltotal_new', Math.round(runningTotal * 100) / 100);
}

function updateTotalPercent(){

	var lineItemCount = nlapiGetLineItemCount('custpage_lineitemlist');
	var runningTotal = 0;
		
	for (var i = 1; i <= lineItemCount; i++) {
	
		var percentage = nlapiGetLineItemValue('custpage_lineitemlist', 'custpage_lineitem_percent', i);
		var amount = parseFloat(nlapiGetLineItemValue('custpage_lineitemlist', 'custpage_lineitem_actualamount', i));

		if (percentage != null && percentage != '') {
			amount = amount * ((100 - parseFloat(percentage))/100);
		} 

		runningTotal = runningTotal + amount;
	}
	
	nlapiSetFieldValue('custpage_renewaltotal_new', Math.round(runningTotal * 100) / 100);
}