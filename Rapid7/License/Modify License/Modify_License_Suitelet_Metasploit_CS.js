/*
 * @author efagone
 */

function pageInit(){
	
	window.onbeforeunload = function() {};
	document.getElementById('tdbody_submitter').onclick = Function("customSubmit()");
	document.getElementById('tdbody_secondarysubmitter').onclick = Function("customSubmit()");
	
	nlapiSetFieldMandatory('custpageenddate', false);
	nlapiSetFieldMandatory('custpageresetcomments', false);
	
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
	
	if (name == 'custpageextendedexpirationdate') {
		var newExpiration = nlapiGetFieldValue(name);
		
		if (newExpiration != null && newExpiration != '') {
			var gracePeriodAllowed = nlapiGetContext().getSetting('SCRIPT','custscriptr7graceperiodallowed');
			if (gracePeriodAllowed == null || gracePeriodAllowed == ''){
				gracePeriodAllowed = 63;
			}
			
			var dtCurrentExpiration = nlapiStringToDate(nlapiGetFieldValue('custpagecurrentexpiration'));
			var dtNewExpiration = nlapiStringToDate(newExpiration);
			var isEval = (nlapiGetFieldValue('custpagesalesorder') != null && nlapiGetFieldValue('custpagesalesorder') != '') ? false : true;
			
			if (nlapiGetFieldValue('custpageactualexpiration') != null && nlapiGetFieldValue('custpageactualexpiration') != '') {
				var dtActualExpiration = nlapiStringToDate(nlapiGetFieldValue('custpageactualexpiration'));
			}
			else {
				var dtActualExpiration = dtCurrentExpiration;
			}
			
			var today = nlapiStringToDate(nlapiDateToString(new Date()));
			
			if (nlapiAddDays(dtNewExpiration, -30) > dtCurrentExpiration && dtCurrentExpiration >= today && !isEval) {
				alert('There is a 30 day limit on individial grace periods.');
				nlapiSetFieldValue(name, nlapiDateToString(nlapiAddDays(dtCurrentExpiration, 30))), false;
				return false;
			}
			else 
				if (nlapiAddDays(dtNewExpiration, -30) > today && dtCurrentExpiration < today && !isEval) {
					alert('There is a 30 day limit on individial grace periods.');
					nlapiSetFieldValue(name, nlapiDateToString(nlapiAddDays(today, 30)), false);
					return false;
				}
				else 
					if (nlapiAddDays(dtNewExpiration, -90) > today && dtCurrentExpiration < today && isEval) {
						alert('There is a 90 day limit on individial grace periods for Eval licenses.');
						nlapiSetFieldValue(name, nlapiDateToString(nlapiAddDays(today, 90)), false);
						return false;
					}
					else 
						if (nlapiAddDays(dtNewExpiration, -90) > today && dtCurrentExpiration >= today && isEval) {
							alert('There is a 90 day limit on individial grace periods for Eval licenses.');
							nlapiSetFieldValue(name, nlapiDateToString(nlapiAddDays(today, 90)), false);
							return false;
						}
						else 
							if (nlapiAddDays(dtNewExpiration, gracePeriodAllowed * -1) > dtActualExpiration && !isEval) {
								alert('There is a ' + gracePeriodAllowed + ' day limit on grace periods.');
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


function expireMSLicense(productKey){
	
	if (confirm('Are you sure you would like to expire this license? This action is irreversible.')) {
		document.getElementById('custpage_expirebutton').value = 'Expiring...';
		document.getElementById('custpage_expirebutton').style.cursor = 'wait';
		document.body.style.cursor = 'wait';
		
		var suiteletURL = nlapiResolveURL('SUITELET', 'customscriptr7modifymslicense_suitelet', 'customdeployr7modifymslicense_suitelet', false);
		
		var postData = new Array();
		postData['custpagelicense'] = nlapiGetRecordId();
		postData['custpageproductkey'] = productKey;
		postData['custparamaction'] = 'expire';
		
		var response = nlapiRequestURL(suiteletURL, postData);
		
		var licenseURL = nlapiResolveURL('RECORD', 'customrecordr7metasploitlicensing', nlapiGetRecordId(), 'view');
		window.location = licenseURL;
	}
}

function suspendMSLicense(productKey){

	if (confirm('Are you sure you would like to suspend this license?')) {
	
		document.getElementById('custpage_suspendbutton').value = 'Suspending...';
		document.getElementById('custpage_suspendbutton').style.cursor = 'wait';
		document.body.style.cursor = 'wait';
		
		var suiteletURL = nlapiResolveURL('SUITELET', 'customscriptr7modifymslicense_suitelet', 'customdeployr7modifymslicense_suitelet', false);
		
		var postData = new Array();
		postData['custpagelicense'] = nlapiGetRecordId();
		postData['custpageproductkey'] = productKey;
		postData['custparamaction'] = 'suspend';
		
		var response = nlapiRequestURL(suiteletURL, postData);
		
		var licenseURL = nlapiResolveURL('RECORD', 'customrecordr7metasploitlicensing', nlapiGetRecordId(), 'view');
		window.location = licenseURL;
	}
}

function reviveMSLicense(productKey){
	
	if (confirm('Are you sure you would like to reactivate this license?')) {
		document.getElementById('custpage_revivebutton').value = 'Reviving...';
		document.getElementById('custpage_revivebutton').style.cursor = 'wait';
		document.body.style.cursor = 'wait';
		
		var suiteletURL = nlapiResolveURL('SUITELET', 'customscriptr7modifymslicense_suitelet', 'customdeployr7modifymslicense_suitelet', false);
		
		var postData = new Array();
		postData['custpagelicense'] = nlapiGetRecordId();
		postData['custpageproductkey'] = productKey;
		postData['custparamaction'] = 'revive';
		
		var response = nlapiRequestURL(suiteletURL, postData);
		
		var licenseURL = nlapiResolveURL('RECORD', 'customrecordr7metasploitlicensing', nlapiGetRecordId(), 'view');
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
	addOnFields['custpager7msordertype'] = 4;
	addOnFields['custpager7msprousercount'] = 28;
	addOnFields['custpager7mslicensehardware'] = 29;
	
	return addOnFields;
}
