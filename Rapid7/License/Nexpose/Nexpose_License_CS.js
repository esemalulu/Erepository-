/*
 * @author efagone
 */

function replaceIt(){
	
	if (confirm('Are you sure you would like to expire and replace this license with a new one?')) {
		var reason = '';
		while (reason == '') {
			reason = prompt("Please enter a reason for replacing this license.\n\n", "");
		}
		
		if (reason != null && reason != '') {
			document.getElementById('custpage_replacelicense').value = 'Processing...';
			document.getElementById('custpage_replacelicense').style.cursor = 'wait';
			document.body.style.cursor = 'wait';
			var suiteletURL = nlapiResolveURL('SUITELET', 'customscriptr7replaceproductkey_suitelet', 'customdeployr7replaceproductkey_suitelet', false);
			var url = suiteletURL + '&custparam_licenseid=' + nlapiGetRecordId() + '&custparam_reason=' + encodeURI(reason);
			var newResponse = nlapiRequestURL(url);
			window.location = newResponse.getBody();
		}
	}
}
