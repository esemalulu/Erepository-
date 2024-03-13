/*
 * @author efagone
 */

function syncOddLicenses(){

	//just touching them
	var timeLimitInMinutes = 10;
	this.timeLimitInMilliseconds = timeLimitInMinutes * 60 * 1000;
	this.startingTime = new Date().getTime();
	this.context = nlapiGetContext();
	this.rescheduleScript = false;
	
	//first do Nexpose licenses
	processNexposeLicenses();
	
	//Now doing Metasploit
	processMetasploitLicenses();
	
	if (rescheduleScript) {
		nlapiLogExecution('DEBUG', 'Rescheduling script (script/deploy id)', context.getScriptId() + ' : ' + context.getDeploymentId());
		var status = nlapiScheduleScript(context.getScriptId());
		nlapiLogExecution('DEBUG', 'Schedule Status', status);
	}
	
}

function processNexposeLicenses(){

	var arrSearchFilters = new Array();
	arrSearchFilters[0] = new nlobjSearchFilter('custrecordr7nxlicensesync', null, 'is', 'T');
	
	var arrSearchResults = nlapiSearchRecord('customrecordr7nexposelicensing', null, arrSearchFilters);
	
	for (var i = 0; arrSearchResults != null && i < arrSearchResults.length && timeLeft() && unitsLeft(); i++) {
	
		var searchResult = arrSearchResults[i];
		var licenseId = searchResult.getId();
		
		if (!isEven(licenseId)) {
			var recLicense = nlapiLoadRecord('customrecordr7nexposelicensing', licenseId);
			
			var express = recLicense.getFieldValue('custrecordr7nxexpress');
			var numIps = recLicense.getFieldValue('custrecordr7nxlicensenumberips');
			var numEngines = recLicense.getFieldValue('custrecordr7nxnumberengines');
			
			// begin logic that should be REMOVED once major licing cleanup is done
			if (numIps == null || numIps == '') {
				recLicense.setFieldValue('custrecordr7nxlicensenumberips', 128);
			}
			if (express == 'T' && parseInt(recLicense.getFieldValue('custrecordr7nxlicensenumberips')) >= 2000) {
				recLicense.setFieldValue('custrecordr7nxlicensenumberips', 2000);
			}
			if (numEngines == null || numEngines == '') {
				recLicense.setFieldValue('custrecordr7nxnumberengines', 1);
			}
			// end logic that should be REMOVED 
			
			recLicense.setFieldValue('custrecordr7nxlicensesync', 'F');
			
			try {
				nlapiLogExecution('DEBUG', 'Updating license', licenseId);
				nlapiSubmitRecord(recLicense, false, true);
			} 
			catch (e) {
				nlapiLogExecution('ERROR', 'Could not update license', licenseId + ' :: ' + e);
			}
			
			if (i == 999) {
				arrSearchResults = nlapiSearchRecord('customrecordr7nexposelicensing', null, arrSearchFilters);
				i = -1;
			}
		}
	}
}

function processMetasploitLicenses(){

	var arrSearchFilters = new Array();
	arrSearchFilters[0] = new nlobjSearchFilter('custrecordr7mslicensesync', null, 'is', 'T');
	
	var arrSearchResults = nlapiSearchRecord('customrecordr7metasploitlicensing', null, arrSearchFilters);
	
	for (var i = 0; arrSearchResults != null && i < arrSearchResults.length && timeLeft() && unitsLeft(); i++) {
	
		var searchResult = arrSearchResults[i];
		var licenseId = searchResult.getId();
		
		if (!isEven(licenseId)) {
			var recLicense = nlapiLoadRecord('customrecordr7metasploitlicensing', licenseId);
			recLicense.setFieldValue('custrecordr7mslicensesync', 'F');
			
			try {
				nlapiLogExecution('DEBUG', 'Updating license', licenseId);
				nlapiSubmitRecord(recLicense, false, true);
			} 
			catch (e) {
				nlapiLogExecution('ERROR', 'Could not update license', licenseId + ' :: ' + e);
			}
			
			if (i == 999) {
				arrSearchResults = nlapiSearchRecord('customrecordr7metasploitlicensing', null, arrSearchFilters);
				i = 0;
			}
		}
	}
}

function isEven(someNumber){

	someNumber = parseInt(someNumber);
	if (isNaN(someNumber)) {
		return false;
	}
	
	var result = (someNumber % 2 == 0);
	return result;
}

function timeLeft(){
	var presentTime = new Date().getTime();
	if (presentTime - startingTime > timeLimitInMilliseconds) {
		nlapiLogExecution('DEBUG', 'Ran out of time', 'yup');
		rescheduleScript = true;
		return false;
	}
	return true;
}

function unitsLeft(){
	var unitsLeft = context.getRemainingUsage();
	if (unitsLeft <= 100) {
		nlapiLogExecution('DEBUG', 'Ran out of units', 'yup');
		rescheduleScript = true;
		return false;
	}
	return true;
}