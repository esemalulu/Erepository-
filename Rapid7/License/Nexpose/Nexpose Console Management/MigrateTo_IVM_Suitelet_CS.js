
function upgradeOppToIVM(){
	
	document.getElementById('custpage_upgradeivm').value = 'Upgrading...';
	
	if (!confirm('Are you sure you want to upgrade opportunity to RIVM?')){
		document.getElementById('custpage_upgradeivm').value = 'Upgrade to RIVM';
		return;
	}

	var orderId = nlapiGetRecordId();
	var orderType = nlapiGetRecordType();
	
	var numRandom = Math.floor(Math.random() * 9999999);
	var suiteletURL = nlapiResolveURL('SUITELET', 'customscriptr7migratetoivm_suitelet', 'customdeployr7migratetoivm_suitelet', false);
	var url = suiteletURL + '&custparam_tranid=' + orderId + '&custparam_trantype=' + orderType + '&custparam_random=' + numRandom;

	var response = nlapiRequestURL(url);
	var responseBody = response.getBody();
	
	if (responseBody == null || responseBody == '') {
		alert('Something went wrong. Please contact the Administrator.');
	}
	
	var objResponse = JSON.parse(responseBody);
	
	if (objResponse.success) {
		document.getElementById('tbl_custpage_upgradeivm').style.display = 'none';
		alert('Successfully upgraded.');
		location.reload();
	}
	else {
		alert(objResponse.error);
		document.getElementById('custpage_upgradeivm').value = 'Upgrade to RIVM';
	}
}