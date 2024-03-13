/*
 * @author efagone
 */

function syncMKTO(){

	var timeLimitInMinutes = 10;
	this.timeLimitInMilliseconds = timeLimitInMinutes * 60 * 1000;
	this.startingTime = new Date().getTime();
	this.context = nlapiGetContext();
	this.rescheduleScript = false;
	
	nlapiGetContext().setSessionObject('donotsync', 'T'); //used for license scripts to tell them to not sync to server
	
	try {
		processModifiedCustomers();
		processModifiedContacts();
		processModifiedOpportunities();
		processModifiedNXLicenses();
		processModifiedMSLicenses();
		processScrubbedCustomers();
		
	} 
	catch (e) {
		var adminUser =  nlapiLoadConfiguration('companypreferences').getFieldValue('custscriptr7_system_info_email_sender');
		nlapiSendEmail(adminUser, adminUser, 'Error on Marketo Integration Sync Sched', 'Error: ' + e);
	}
	
	if (rescheduleScript) {
		nlapiLogExecution('DEBUG', 'Rescheduling script (script/deploy id)', context.getScriptId() + ' : ' + context.getDeploymentId());
		var status = nlapiScheduleScript(552);
		nlapiLogExecution('DEBUG', 'Schedule Status', status);
	}
	
	
}

function processScrubbedCustomers(){
	
	if (rescheduleScript){
		return;
	}
	nlapiLogExecution('DEBUG', 'Processing Recently Scrubbed Customers', 'yup');	
	var arrSearchResults = nlapiSearchRecord('customer', 11722);
	
	for (var i = 0; arrSearchResults != null && i < arrSearchResults.length && timeLeft() && unitsLeft(300); i++) {
		
		var searchResult = arrSearchResults[i];
		var columns = searchResult.getAllColumns();
		var customerId = searchResult.getValue(columns[0]);
		
		processScrubbedContacts(customerId);
		processScrubbedOpportunities(customerId);
		processScrubbedNXLicenses(customerId);
		processScrubbedMSLicenses(customerId);
		
		if (rescheduleScript){
			return;
		}
		
		try {
			var rec = nlapiLoadRecord('customer', customerId);
			rec.setFieldValue('custentityr7marketodonotsync', 'F');
			nlapiSubmitRecord(rec, false, true);
		} 
		catch (e) {
			nlapiLogExecution('ERROR', 'Error on Marketo Integration Sync Sched - Customers', 'InternalID: ' + customerId + '\nError: ' + e);
		}
	}	
}

function processScrubbedNXLicenses(customerId){
	
	if (rescheduleScript){
			return;
	}
		
	var arrSearchFilters = new Array();
	arrSearchFilters[arrSearchFilters.length] = new nlobjSearchFilter('custrecordr7nxlicensecustomer', null, 'is', customerId);
	arrSearchFilters[arrSearchFilters.length] = new nlobjSearchFilter('custrecordr7nxlicensemarketodonotsync', null, 'is', 'T');
	
	var arrSearchResults = nlapiSearchRecord('customrecordr7nexposelicensing', null, arrSearchFilters);
	
	for (var i = 0; arrSearchResults != null && i < arrSearchResults.length && timeLeft() && unitsLeft(); i++) {
	
		var resultId = arrSearchResults[i].getId();
		
		try {
			nlapiSubmitField('customrecordr7nexposelicensing', resultId, 'custrecordr7nxlicensemarketodonotsync', 'F');
		} 
		catch (e) {
			nlapiLogExecution('ERROR', 'Error on Marketo Integration Sync Sched - NX License', 'InternalID: ' + resultId + '\nError: ' + e);
		}
	}
	
}

function processScrubbedMSLicenses(customerId){
	
	if (rescheduleScript){
		return;
	}
	
	var arrSearchFilters = new Array();
	arrSearchFilters[arrSearchFilters.length] = new nlobjSearchFilter('custrecordr7mslicensecustomer', null, 'is', customerId);
	arrSearchFilters[arrSearchFilters.length] = new nlobjSearchFilter('custrecordr7metasploitmarketodonotsync', null, 'is', 'T');
	
	var arrSearchResults = nlapiSearchRecord('customrecordr7metasploitlicensing', null, arrSearchFilters);
	
	for (var i = 0; arrSearchResults != null && i < arrSearchResults.length && timeLeft() && unitsLeft(); i++) {
	
		var resultId = arrSearchResults[i].getId();
		
		try {
			nlapiSubmitField('customrecordr7metasploitlicensing', resultId, 'custrecordr7metasploitmarketodonotsync', 'F');
		} 
		catch (e) {
			nlapiLogExecution('ERROR', 'Error on Marketo Integration Sync Sched - MS License', 'InternalID: ' + resultId + '\nError: ' + e);
		}
		
	}
}

function processScrubbedOpportunities(customerId){
	
	if (rescheduleScript){
		return;
	}
	
	var arrSearchFilters = new Array();
	arrSearchFilters[arrSearchFilters.length] = new nlobjSearchFilter('entity', null, 'is', customerId);
	arrSearchFilters[arrSearchFilters.length] = new nlobjSearchFilter('custbodyr7opportunitymarketodonotsync', null, 'is', 'T');
	
	var arrSearchResults = nlapiSearchRecord('opportunity', null, arrSearchFilters);
	
	for (var i = 0; arrSearchResults != null && i < arrSearchResults.length && timeLeft() && unitsLeft(); i++) {
	
		var resultId = arrSearchResults[i].getId();
		
		try {
			var rec = nlapiLoadRecord('opportunity', resultId);
			rec.setFieldValue('custbodyr7opportunitymarketodonotsync', 'F');
			nlapiSubmitRecord(rec, false, true);
		} 
		catch (e) {
			nlapiLogExecution('ERROR', 'Error on Marketo Integration Sync Sched - Opps', 'InternalID: ' + resultId + '\nError: ' + e);
		}
		
	}
}

function processScrubbedContacts(customerId){
	
	if (rescheduleScript){
		return;
	}
	
	var arrSearchFilters = new Array();
	arrSearchFilters[arrSearchFilters.length] = new nlobjSearchFilter('company', null, 'is', customerId);
	arrSearchFilters[arrSearchFilters.length] = new nlobjSearchFilter('custentityr7marketodonotsync', null, 'is', 'T');
	
	var arrSearchResults = nlapiSearchRecord('contact', null, arrSearchFilters);
	
	for (var i = 0; arrSearchResults != null && i < arrSearchResults.length && timeLeft() && unitsLeft(); i++) {
	
		var resultId = arrSearchResults[i].getId();
				
		try {
			nlapiSubmitField('contact', resultId, 'custentityr7marketodonotsync', 'F');
		} 
		catch (e) {
			nlapiLogExecution('ERROR', 'Error on Marketo Integration Sync Sched - Contacts', 'InternalID: ' + resultId + '\nError: ' + e);
		}
	}
}


function processModifiedCustomers(){
	
	if (rescheduleScript){
		return;
	}
	
	nlapiLogExecution('DEBUG', 'Processing Recently Modified Customers', 'yup');	
	var arrSearchResults = nlapiSearchRecord('customer', 11934);
	
	for (var i = 0; arrSearchResults != null && i < arrSearchResults.length && timeLeft() && unitsLeft(300); i++) {
		
		var searchResult = arrSearchResults[i];
		var columns = searchResult.getAllColumns();
		var customerId = searchResult.getValue(columns[0]);
		
		try {
			var rec = nlapiLoadRecord('customer', customerId);
			rec.setFieldValue('custentityr7marketodonotsync', 'F');
			nlapiSubmitRecord(rec, false, true);
		} 
		catch (e) {
			nlapiLogExecution('ERROR', 'Error on Marketo Integration Sync Sched - Customers', 'InternalID: ' + customerId + '\nError: ' + e);
		}
	}	
}

function processModifiedNXLicenses(){
	
	if (rescheduleScript){
		return;
	}
	
	nlapiLogExecution('DEBUG', 'Processing Recently Modified NX Licenses', 'yup');
	var arrSearchResults = nlapiSearchRecord('customrecordr7nexposelicensing', 11935);
	
	for (var i = 0; arrSearchResults != null && i < arrSearchResults.length && timeLeft() && unitsLeft(); i++) {
	
		var searchResult = arrSearchResults[i];
		var columns = searchResult.getAllColumns();
		var resultId = searchResult.getValue(columns[0]);
		
		try {
			nlapiSubmitField('customrecordr7nexposelicensing', resultId, 'custrecordr7nxlicensemarketodonotsync', 'F');
		} 
		catch (e) {
			nlapiLogExecution('ERROR', 'Error on Marketo Integration Sync Sched - NX License', 'InternalID: ' + resultId + '\nError: ' + e);
		}
	}
	
}

function processModifiedMSLicenses(){
	
	if (rescheduleScript){
		return;
	}
	
	nlapiLogExecution('DEBUG', 'Processing Recently Modified MS Licenses', 'yup');
	var arrSearchResults = nlapiSearchRecord('customrecordr7metasploitlicensing', 11937);
	
	for (var i = 0; arrSearchResults != null && i < arrSearchResults.length && timeLeft() && unitsLeft(); i++) {
	
		var searchResult = arrSearchResults[i];
		var columns = searchResult.getAllColumns();
		var resultId = searchResult.getValue(columns[0]);
		
		try {
			nlapiSubmitField('customrecordr7metasploitlicensing', resultId, 'custrecordr7metasploitmarketodonotsync', 'F');
		} 
		catch (e) {
			nlapiLogExecution('ERROR', 'Error on Marketo Integration Sync Sched - MS License', 'InternalID: ' + resultId + '\nError: ' + e);
		}
		
	}
}

function processModifiedOpportunities(){
	
	if (rescheduleScript){
		return;
	}
	
	nlapiLogExecution('DEBUG', 'Processing Recently Modified Opportunities', 'yup');
	var arrSearchResults = nlapiSearchRecord('opportunity', 11856);
	
	for (var i = 0; arrSearchResults != null && i < arrSearchResults.length && timeLeft() && unitsLeft(); i++) {
		
		var searchResult = arrSearchResults[i];
		var columns = searchResult.getAllColumns();
		var resultId = searchResult.getValue(columns[0]);
		
		try {
			var rec = nlapiLoadRecord('opportunity', resultId);
			rec.setFieldValue('custbodyr7opportunitymarketodonotsync', 'F');
			nlapiSubmitRecord(rec, false, true);
		} 
		catch (e) {
			nlapiLogExecution('ERROR', 'Error on Marketo Integration Sync Sched - Opps', 'InternalID: ' + resultId + '\nError: ' + e);
		}
		
	}
}

function processModifiedContacts(){
	
	if (rescheduleScript){
		return;
	}
	
	nlapiLogExecution('DEBUG', 'Processing Recently Modified Contacts', 'yup');
	var arrSearchResults = nlapiSearchRecord('contact', 11938);
	
	for (var i = 0; arrSearchResults != null && i < arrSearchResults.length && timeLeft() && unitsLeft(); i++) {
	
		var searchResult = arrSearchResults[i];
		var columns = searchResult.getAllColumns();
		var resultId = searchResult.getValue(columns[0]);
		var companyId = searchResult.getValue(columns[5]);
		var companyIsScrubAccount = searchResult.getValue(columns[6]);
				
		try {
			nlapiSubmitField('contact', resultId, 'custentityr7marketodonotsync', 'F');
			
			if (companyId != null && companyId != '' && companyIsScrubAccount != '1' && companyIsScrubAccount != 1){
				nlapiSubmitField('customer', companyId, 'custentityr7marketodonotsync', 'F');
			}
		} 
		catch (e) {
			nlapiLogExecution('ERROR', 'Error on Marketo Integration Sync Sched - Contacts', 'InternalID: ' + resultId + '\nError: ' + e);
		}
	}
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

function unitsLeft(units){

	if (units == null || units == '') {
		units = 20;
	}
	
	var unitsLeft = context.getRemainingUsage();
	if (unitsLeft <= units) {
		nlapiLogExecution('DEBUG', 'Ran out of units', 'yup');
		rescheduleScript = true;
		return false;
	}
	return true;
}