
function r7_upgradeOpportunity(){
	
	document.getElementById('custpage_upgradenxentall').value = 'Upgrading...';
	
	if (!confirm('Are you sure you want to upgrade opportunity to RNXENTALL?')){
		document.getElementById('custpage_upgradenxentall').value = 'Upgrade to RNXENTALL';
		return;
	}

	var orderId = nlapiGetRecordId();
	var orderType = nlapiGetRecordType();
	
	var numRandom = Math.floor(Math.random() * 9999999);
	var suiteletURL = nlapiResolveURL('SUITELET', 'customscriptr7migratetonxentall_suitelet', 'customdeployr7migratetonxentall_suitelet', false);
	var url = suiteletURL + '&custparam_tranid=' + orderId + '&custparam_trantype=' + orderType + '&custparam_random=' + numRandom;

	var response = nlapiRequestURL(url);
	var responseBody = response.getBody();
	
	if (responseBody == null || responseBody == '') {
		alert('Something went wrong. Please contact the Administrator.');
	}
	
	var objResponse = JSON.parse(responseBody);
	
	if (objResponse.success) {
		document.getElementById('tbl_custpage_upgradenxentall').style.display = 'none';
		alert('Successfully upgraded.');
		location.reload();
	}
	else {
		alert(objResponse.error);
		document.getElementById('custpage_upgradenxentall').value = 'Upgrade to RNXENTALL';
	}
}