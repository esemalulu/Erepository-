/*
 * @author efagone
 */

function validateOrder(){

	document.getElementById('custpage_validateorder').value = 'Validating...';
	var orderId = nlapiGetRecordId();
	var orderType = nlapiGetRecordType();

	var numRandom = Math.floor(Math.random() * 9999999);
	var suiteletURL = nlapiResolveURL('SUITELET', 'customscriptr7ordervalidation_suitelet', 'customdeployr7ordervalidation_suitelet', false);
	var url = suiteletURL + '&custparam_salesorder=' + orderId +'&custparam_ordertype=' + orderType + '&custparam_random=' + numRandom;
	nlapiLogExecution('DEBUG','url',url);
	var response = nlapiRequestURL(url);
	var responseBody = response.getBody();
	
	if (responseBody.indexOf('Validated') != -1) {
		document.getElementById('tbl_custpage_validateorder').style.display = 'none';
		document.getElementById('tbl_custpage_associateitems_acr').style.display = 'none';
		alert(responseBody);
	}
	
	else {
		if (responseBody.indexOf('Please confirm') != -1) {
			var conf = confirm(responseBody);
			if (conf) {			
				document.getElementById('tbl_custpage_validateorder').style.display = 'none';
				document.getElementById('tbl_custpage_associateitems_acr').style.display = 'none';
				validateNow();
				return;
			}
		}	
		else {	
			alert(responseBody);
		}
		document.getElementById('custpage_validateorder').value = 'Validate Order';
	}	
}

// MB: 6/26/13 - Added unAssociate - uncheck 'Order Associated' (custbodyr7orderassociated)
function unValidateOrder(){

	document.getElementById('custpage_unvalidateorder').value = 'Un-validating...';
	var orderId = nlapiGetRecordId();
	var orderType = nlapiGetRecordType();
	var numRandom = Math.floor(Math.random() * 9999999);
	var suiteletURL = nlapiResolveURL('SUITELET', 'customscriptr7ordervalidation_suitelet', 'customdeployr7ordervalidation_suitelet', false);
	suiteletURL += '&custparam_salesorder=' + orderId +'&custparam_ordertype=' + orderType +'&custparam_action=unvalidate&custparam_random=' + numRandom;
	nlapiRequestURL(suiteletURL);
	alert('Un-validated');
	window.location.reload();
}

function validateNow(){
	var orderId = nlapiGetRecordId();
	var orderType = nlapiGetRecordType();
	var numRandom = Math.floor(Math.random() * 9999999);
	var suiteletURL = nlapiResolveURL('SUITELET', 'customscriptr7ordervalidation_suitelet', 'customdeployr7ordervalidation_suitelet', false);
	suiteletURL += '&custparam_salesorder=' + orderId + '&custparam_ordertype=' + orderType + '&custparam_action=validate&custparam_random=' + numRandom;
	nlapiRequestURL(suiteletURL);
	alert('Validated');
	window.location.reload();
}

function removeContract() {
	var salesOrderId = nlapiGetRecordId();
	var question = confirm('Are you sure you want to delete all contracts tied to this sales order?');
	if (question) {
		var suiteletURL = nlapiResolveURL('SUITELET', 'customscript_remove_contract_suitelet', 'customdeploy_remove_contract_suitelet', false);
		suiteletURL += '&custparam_salesorder=' + salesOrderId;
		nlapiRequestURL(suiteletURL);
		location.reload();
	} 
}
