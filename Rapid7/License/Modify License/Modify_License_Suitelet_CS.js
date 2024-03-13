/*
 * @author efagone
 */
/*
 * MB: 5/17/16 - Change #1206 - APTCM-323 Nexpose license enhancements for Remediation Analytics and Agents Beta Programs
 */
function pageInit(){

	window.onbeforeunload = function(){};
	
	document.getElementById('tdbody_submitter').onclick = Function("customSubmit()");
	document.getElementById('tdbody_secondarysubmitter').onclick = Function("customSubmit()");
	
	nlapiSetFieldMandatory('custpageenddate', false);
	nlapiSetFieldMandatory('custpageresetcomments', false);
	nlapiSetFieldMandatory('custpager7nxwebscan', false);
	
	//checks to see if discovery is false, if it is, then it disables/enables the dip field
	if (nlapiGetFieldValue('custpager7nxlicensediscoverylicense') == 'F') {
		nlapiDisableField('custpager7nxlicensenumberdiscoveryips', true);
	}
	else {
		nlapiDisableField('custpager7nxlicensenumberdiscoveryips', false);
	}
	
	if (nlapiGetFieldValue('custpager7nxlicense_centrics') == 'F') {
		nlapiDisableField('custpager7nxlicense_ciendpoints', true);
	}
	else {
		nlapiDisableField('custpager7nxlicense_ciendpoints', false);
	}
	
	if (nlapiGetFieldValue('custpager7nxlicensemultitenancy') == 'T') {
		nlapiDisableField('custpager7nxlicense_centrics', true);
		nlapiDisableField('custpager7nxlicense_ciendpoints', true);
	}
	else {
		nlapiDisableField('custpager7nxlicense_ciendpoints', false);
		nlapiDisableField('custpager7nxlicense_centrics', false);
	}
	
	var dtCurrentExpiration = nlapiStringToDate(nlapiGetFieldValue('custpagecurrentexpiration'));
	if (nlapiAddDays(dtCurrentExpiration, -60) > new Date()){
		nlapiDisableField('custpageextendedexpirationdate', true);
	}
	
	nlapiDisableField('custpagereset', false);
	
	var addOnFields = getAddOnFields();
	
	for (key in addOnFields) {
		if (nlapiGetFieldValue(key) == 'T') {
			nlapiDisableField(key, true);
			nlapiSetFieldValue(key, 'F', false);
		}
	}
}

function fieldChanged(type, name, linenum){

	if (name == 'custpager7nxlicensediscoverylicense') {
	
		if (nlapiGetFieldValue('custpager7nxlicensediscoverylicense') == 'T') {
			nlapiDisableField('custpager7nxlicensenumberdiscoveryips', false);
		}
		else {
			nlapiDisableField('custpager7nxlicensenumberdiscoveryips', true);
			nlapiSetFieldValue('custpager7nxlicensenumberdiscoveryips', '', false);
		}
	}
	
	if (name == 'custpager7nxlicense_centrics') {
	
		if (nlapiGetFieldValue('custpager7nxlicense_centrics') == 'T') {
			nlapiDisableField('custpager7nxlicense_ciendpoints', false);
		}
		else {
			nlapiDisableField('custpager7nxlicense_ciendpoints', true);
			nlapiSetFieldValue('custpager7nxlicense_ciendpoints', '', false);
		}
	}
	
	if (name == 'custpager7nxlicense_ciendpoints') {
	
		if (nlapiGetFieldValue('custpager7nxlicense_ciendpoints') != null && nlapiGetFieldValue('custpager7nxlicense_ciendpoints') != '') {
			nlapiSetFieldValue('custpager7nxlicense_centrics', 'T', false);
		}
		else {
			nlapiSetFieldValue('custpager7nxlicense_centrics', 'F', false);
		}
	}
	
	if (name == 'custpager7nxlicensenumberdiscoveryips') {
	
		if (nlapiGetFieldValue('custpager7nxlicensenumberdiscoveryips') != null && nlapiGetFieldValue('custpager7nxlicensenumberdiscoveryips') != '') {
			nlapiSetFieldValue('custpager7nxlicensediscoverylicense', 'T', false);
		}
		else {
			nlapiSetFieldValue('custpager7nxlicensediscoverylicense', 'F', false);
		}
	}
	
	if (name == 'custpagereset') {
	
		if (nlapiGetFieldValue('custpagereset') == 'T') {
			nlapiSetFieldMandatory('custpageresetcomments', true);
			nlapiDisableField('custpageresetcomments', false);
		}
		else {
			nlapiDisableField('custpageresetcomments', true);
			nlapiSetFieldMandatory('custpageresetcomments', false);
		}
	}
	
	if (name != 'custpageextendedexpirationdate' && name != 'custpagecontact' && name != 'custpagereset' && name != 'custpageresetcomments' && name != 'custpageopportunity' && name != 'custpagesalesorder') {

		if (nlapiGetFieldValue(name) != null && nlapiGetFieldValue(name) != '' && nlapiGetFieldValue(name) != 'F') {
			nlapiSetFieldMandatory('custpageenddate', true);
			nlapiDisableField('custpageenddate', false);
		}
		
	}
	// PCI requires Web
	if (name == 'custpager7nxlicensepcitemplate') {
	
		if (nlapiGetFieldValue('custpager7nxlicensepcitemplate') == 'T') {
			nlapiDisableField('custpager7nxwebscan', true);
			nlapiSetFieldValue('custpager7nxwebscan', 'T', false);
		}
		else {
			nlapiDisableField('custpager7nxwebscan', false);
			nlapiSetFieldValue('custpager7nxwebscan', 'F', false);
			
		}
	}
	// Remediation Analytics and Agents require Exporsure Analytics.
	if (name == 'custpager7nxlicenseremedanalytics') {
		
		if (nlapiGetFieldValue('custpager7nxlicenseremedanalytics') == 'T') {
			nlapiDisableField('custpager7nxlicenseexposureanalytics', true);
			nlapiSetFieldValue('custpager7nxlicenseexposureanalytics', 'T', false);
		}
		else {
			nlapiDisableField('custpager7nxlicenseexposureanalytics', false);
			nlapiSetFieldValue('custpager7nxlicenseexposureanalytics', 'F', false);
			
		}
	}
if (name == 'custpager7nxlicenseagents') {
		
		if (nlapiGetFieldValue('custpager7nxlicenseagents') == 'T') {
			nlapiDisableField('custpager7nxlicenseexposureanalytics', true);
			nlapiSetFieldValue('custpager7nxlicenseexposureanalytics', 'T', false);
		}
		else {
			nlapiDisableField('custpager7nxlicenseexposureanalytics', false);
			nlapiSetFieldValue('custpager7nxlicenseexposureanalytics', 'F', false);
			
		}
	}
	
}

function validateField(type, name, linenum){
	
	if (name == 'custpageenddate'){
		var endDate = nlapiGetFieldValue('custpageenddate');
		
		if (endDate != null && endDate != ''){
			
			var dtEndDate = nlapiStringToDate(endDate);
			var today = nlapiStringToDate(nlapiDateToString(new Date()));
			
			if (nlapiAddDays(dtEndDate, -30) > today){
				alert('There is a 30 day limit on individial grace periods.');
				nlapiSetFieldValue(name, nlapiDateToString(nlapiAddDays(today, 30)));
				return false;
			}
			
			if (today > dtEndDate){
				alert('Feature expiration cannot be in the past.');
				return false;
			}
		}
	}
	
	if (name == 'custpager7nxlicensenumberhostedips') {
		var numIPs = nlapiGetFieldValue(name);
		
		if (numIPs != null && numIPs != '') {
			var currentNumHostedIPs = nlapiGetFieldValue('custpagecurrenthostedips');
			if (currentNumHostedIPs == null || currentNumHostedIPs == '') {
				currentNumHostedIPs = 0;
			}
			
			if ((parseInt(numIPs) + parseInt(currentNumHostedIPs)) > 512) {
				alert('Total hosted IPs cannot be greater than 512');
				return false;
			}
			
		}
	}
	
	if (name == 'custpager7nxlicensenumberdiscoveryips') {
		var numIPs = nlapiGetFieldValue(name);
		
		if (numIPs != null && numIPs != '') {
			if (parseInt(numIPs) > 16777216) {
				if (parseInt(numIPs) > 99999999){
					alert('Whoaaa.... way to many IP\'s!!! Do you really need to add ' + toWords(parseInt(numIPs)).toUpperCase() + 'IP\'s?? How about I lower that to a class A for you?');
					nlapiSetFieldValue(name, 16777216);
					return true;
				}
				alert('Cannot add more than 1 class A discovery (16,777,216 IP\'s) at a time.');
				nlapiSetFieldValue(name, 16777216);
				return true;
			}
		}
	}
	
	if (name == 'custpager7nxlicensenumberips') {
		var numIPs = nlapiGetFieldValue(name);
		
		if (numIPs != null && numIPs != '') {
			if (parseInt(numIPs) > 10000) {
				alert('Cannot add more than 10,000 IP\'s at a time.');
				nlapiSetFieldValue(name, 10000);
				return true;
			}
		}
	}
	
	if (name == 'custpager7nxlicense_ciendpoints') {
		var numIPs = nlapiGetFieldValue(name);
		
		if (numIPs != null && numIPs != '') {
			if (parseInt(numIPs) > 10000) {
				alert('Cannot add more than 10,000 Endpoint\'s at a time.');
				nlapiSetFieldValue(name, 10000);
				return true;
			}
		}
	}
	
	if (name == 'custpageextendedexpirationdate') {
		var userId = nlapiGetUser();
		var newExpiration = nlapiGetFieldValue(name);
		
		if (newExpiration != null && newExpiration != '') {
			var gracePeriodAllowed = nlapiGetContext().getSetting('SCRIPT','custscriptr7graceperiodallowed');
			if (gracePeriodAllowed == null || gracePeriodAllowed == ''){
				gracePeriodAllowed = 63;
			}
			
			var dtCurrentExpiration = nlapiStringToDate(nlapiGetFieldValue('custpagecurrentexpiration'));
			var dtNewExpiration = nlapiStringToDate(newExpiration);
			var orderType = nlapiGetFieldValue('custpageordertype');
			
			if (nlapiGetFieldValue('custpageactualexpiration') != null && nlapiGetFieldValue('custpageactualexpiration') != '') {
				var dtActualExpiration = nlapiStringToDate(nlapiGetFieldValue('custpageactualexpiration'));
			}
			else {
				var dtActualExpiration = dtCurrentExpiration;
			}

			var today = nlapiStringToDate(nlapiDateToString(new Date()));
			
			if (nlapiAddDays(dtNewExpiration, -30) > dtCurrentExpiration && dtCurrentExpiration >= today && orderType != 2) {
				alert('There is a 30 day limit on individial grace periods.');
				nlapiSetFieldValue(name, nlapiDateToString(nlapiAddDays(dtCurrentExpiration, 30)), false);
				return false;
			}
			else 
				if (nlapiAddDays(dtNewExpiration, -30) > today && dtCurrentExpiration < today && orderType != 2) {
					alert('There is a 30 day limit on individial grace periods.');
					nlapiSetFieldValue(name, nlapiDateToString(nlapiAddDays(today, 30)), false);
					return false;
				}
				else 
					if (nlapiAddDays(dtNewExpiration, -90) > today && dtCurrentExpiration < today && orderType == 2) {
						alert('There is a 90 day limit on individial grace periods for Eval licenses.');
						nlapiSetFieldValue(name, nlapiDateToString(nlapiAddDays(today, 90)), false);
						return false;
					}
					else 
						if (nlapiAddDays(dtNewExpiration, -90) > today && dtCurrentExpiration >= today && orderType == 2) {
							alert('There is a 90 day limit on individial grace periods for Eval licenses.');
							nlapiSetFieldValue(name, nlapiDateToString(nlapiAddDays(today, 90)), false);
							return false;
						}
						else 
							if (nlapiAddDays(dtNewExpiration, gracePeriodAllowed * -1) > dtActualExpiration && orderType != 2) {
								alert('There is a  ' + gracePeriodAllowed + ' day limit on grace periods.');
								nlapiSetFieldValue(name, nlapiDateToString(nlapiAddDays(dtActualExpiration, gracePeriodAllowed)), false);
								return false;
							}
			
			if (today > dtNewExpiration) {
				alert('Current expiration is greater than one you are giving.');
				return false;
			}
		}
		
	}
	
	return true;

}

function replaceIt(){

	var userId = nlapiGetUser();
	
	if (userId == 55011 || userId == 2 || userId == 340932) {
		if (nlapiGetFieldValue('custpagecontactorig') != null && nlapiGetFieldValue('custpagecontactorig') != '') {
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
					var url = suiteletURL + '&custparam_licenseid=' + nlapiGetFieldValue('custpagelicense') + '&custparam_reason=' + encodeURI(reason);
					var newResponse = nlapiRequestURL(url);
					window.location = newResponse.getBody();
				}
			}
		}
		else {
			alert('License must have a contact. Please specify one and hit \'Submit\'. Then you may return to Replace the license.');
		}
	}
	else {
		alert("This feature has been disabled. Please use the 'Reset License' checkbox on this page instead.");
	}
}

function expireLicense(productKey){
	
	if (confirm('Are you sure you would like to expire this license? This action is irreversible.')) {
		document.getElementById('custpage_expirebutton').value = 'Expiring...';
		document.getElementById('custpage_expirebutton').style.cursor = 'wait';
		document.body.style.cursor = 'wait';
		
		var suiteletURL = nlapiResolveURL('SUITELET', 'customscriptr7modifylicense_suitelet', 'customdeployr7modifylicense_suitelet', false);
		
		var postData = new Array();
		postData['custpagelicense'] = nlapiGetRecordId();
		postData['custpageproductkey'] = productKey;
		postData['custparamaction'] = 'expire';
		
		var response = nlapiRequestURL(suiteletURL, postData);
		
		var licenseURL = nlapiResolveURL('RECORD', 'customrecordr7nexposelicensing', nlapiGetRecordId(), 'view');
		window.location = licenseURL;
	}
}

function suspendLicense(productKey){

	if (confirm('Are you sure you would like to suspend this license?')) {
	
		document.getElementById('custpage_suspendbutton').value = 'Suspending...';
		document.getElementById('custpage_suspendbutton').style.cursor = 'wait';
		document.body.style.cursor = 'wait';
		
		var suiteletURL = nlapiResolveURL('SUITELET', 'customscriptr7modifylicense_suitelet', 'customdeployr7modifylicense_suitelet', false);
		
		var postData = new Array();
		postData['custpagelicense'] = nlapiGetRecordId();
		postData['custpageproductkey'] = productKey;
		postData['custparamaction'] = 'suspend';
		
		var response = nlapiRequestURL(suiteletURL, postData);
		
		var licenseURL = nlapiResolveURL('RECORD', 'customrecordr7nexposelicensing', nlapiGetRecordId(), 'view');
		window.location = licenseURL;
	}
}

function reviveLicense(productKey){
	
	if (confirm('Are you sure you would like to reactivate this license?')) {
		document.getElementById('custpage_revivebutton').value = 'Reviving...';
		document.getElementById('custpage_revivebutton').style.cursor = 'wait';
		document.body.style.cursor = 'wait';
		
		var suiteletURL = nlapiResolveURL('SUITELET', 'customscriptr7modifylicense_suitelet', 'customdeployr7modifylicense_suitelet', false);
		
		var postData = new Array();
		postData['custpagelicense'] = nlapiGetRecordId();
		postData['custpageproductkey'] = productKey;
		postData['custparamaction'] = 'revive';
		
		var response = nlapiRequestURL(suiteletURL, postData);
		
		var licenseURL = nlapiResolveURL('RECORD', 'customrecordr7nexposelicensing', nlapiGetRecordId(), 'view');
		window.location = licenseURL;
	}
}

function customSubmit(){

	document.getElementById('tbl_submitter').style.cursor = 'wait';
	document.getElementById('submitter').value = 'Processing...';
	
	document.getElementById('tbl_secondarysubmitter').style.cursor = 'wait';
	document.getElementById('secondarysubmitter').value = 'Processing...';
	
	document.body.style.cursor = 'wait';
	
}

function getAddOnFields(){

	var addOnFields = new Array();
	addOnFields['custpager7nxlicensenumberips'] = 4;
	addOnFields['custpager7nxlicensenumberdiscoveryips'] = 31;
	addOnFields['custpager7nxlicense_ciendpoints'] = 83;
	addOnFields['custpager7nxlicensenumberhostedips'] = 5;
	addOnFields['custpager7nxnumberengines'] = 6;
	addOnFields['custpager7nxlicensediscoverylicense'] = 7;
	addOnFields['custpager7nxlicensepcitemplate'] = 1;
	addOnFields['custpager7nxscada'] = 2;
	addOnFields['custpager7nxwebscan'] = 3;
	addOnFields['custpager7nxpolicy'] = 12;
	addOnFields['custpager7nxlicensemultitenancy'] = 15;
	addOnFields['custpager7nxlicenseenginepool'] = 16;
	addOnFields['custpager7nxlicensevirtualization'] = 17;
	addOnFields['custpager7nxlicenseadvancedpolicyeng'] = 18;
	addOnFields['custpager7nxlicensefdcc'] = 19;
	addOnFields['custpager7nxlicenseusgcb'] = 20;
	addOnFields['custpager7nxlicensecsvrichdataexport'] = 38;
	addOnFields['custpager7nxlicensecustompolicies'] = 21;
	addOnFields['custpager7nxlicense_centrics'] = 65;
	addOnFields['custpager7nxlicensing_mobileoption'] = 82;
	addOnFields['custpager7nxlicenseearlyaccess'] = 86;
	addOnFields['custpager7nxlicenseexposureanalytics'] = 100;
	addOnFields['custpager7nxlicenseremedanalytics'] = 107;
	addOnFields['custpager7nxlicenseagents'] = 108;
	addOnFields['custpager7nxlicenseadaptivesecurity'] = 99;
	
	return addOnFields;
}
