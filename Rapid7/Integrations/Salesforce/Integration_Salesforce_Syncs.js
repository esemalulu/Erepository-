/*
 * @author efagone
 */

function syncSF(){

	var timeLimitInMinutes = 10;
	this.timeLimitInMilliseconds = timeLimitInMinutes * 60 * 1000;
	this.startingTime = new Date().getTime();
	this.context = nlapiGetContext();
	this.rescheduleScript = false;
		
	try {
		unsetNonCustomerContactFlags();
		processModifiedCustomers();
		processModifiedContacts();
		processNewCustomerContacts();
		
	} 
	catch (e) {
		var adminUser =  nlapiLoadConfiguration('companypreferences').getFieldValue('custscriptr7_system_info_email_sender');
		nlapiSendEmail(adminUser, adminUser, 'Error on Salesforce Sync Sched', 'Error: ' + e);
	}
	
	if (rescheduleScript) {
		nlapiLogExecution('DEBUG', 'Rescheduling script (script/deploy id)', context.getScriptId() + ' : ' + context.getDeploymentId());
		var status = nlapiScheduleScript(553);
		nlapiLogExecution('DEBUG', 'Schedule Status', status);
	}
	
	
}

function unsetNonCustomerContactFlags(){
	
	nlapiLogExecution('DEBUG', 'Unsetting Non-customer Contact Flags', 'yup');	
	var arrSearchResults = nlapiSearchRecord('contact', 12109);
	
	for (var i = 0; arrSearchResults != null && i < arrSearchResults.length && timeLeft() && unitsLeft(300); i++) {
		
		var searchResult = arrSearchResults[i];
		var columns = searchResult.getAllColumns();
		var resultId = searchResult.getValue(columns[0]);
				
		try {
			nlapiSubmitField('contact', resultId, 'custentityr7saleforceupdateflag', 'F');
		} 
		catch (e) {
			nlapiLogExecution('ERROR', 'Error on Salesforce Sync Sched - Contacts - Unset', 'InternalID: ' + resultId + '\nError: ' + e);
		}
	}	
}

function processNewCustomerContacts(){
	
	nlapiLogExecution('DEBUG', 'Processing New Customers Contacts', 'yup');	
	var arrSearchResults = nlapiSearchRecord('contact', 11949);
	
	for (var i = 0; arrSearchResults != null && i < arrSearchResults.length && timeLeft() && unitsLeft(300); i++) {
		
		var searchResult = arrSearchResults[i];
		var columns = searchResult.getAllColumns();
		var resultId = searchResult.getValue(columns[0]);
				
		try {
			nlapiSubmitField('contact', resultId, 'custentityr7saleforceupdateflag', 'T');
		} 
		catch (e) {
			nlapiLogExecution('ERROR', 'Error on Salesforce Sync Sched - Contacts', 'InternalID: ' + resultId + '\nError: ' + e);
		}
	}	
}

function processModifiedCustomers(){
	
	nlapiLogExecution('DEBUG', 'Processing Recently Modified Customers', 'yup');	
	var arrSearchResults = nlapiSearchRecord('customer', 11943);
	
	for (var i = 0; arrSearchResults != null && i < arrSearchResults.length && timeLeft() && unitsLeft(300); i++) {
		
		var searchResult = arrSearchResults[i];
		var columns = searchResult.getAllColumns();
		var customerId = searchResult.getValue(columns[0]);
		
		try {
			var rec = nlapiLoadRecord('customer', customerId);
			rec.setFieldValue('custentityr7saleforceupdateflag', 'T');
			nlapiSubmitRecord(rec, false, true);
		} 
		catch (e) {
			nlapiLogExecution('ERROR', 'Error on Salesforce Sync Sched - Customers', 'InternalID: ' + customerId + '\nError: ' + e);
		}
	}	
}

function processModifiedContacts(){
	
	nlapiLogExecution('DEBUG', 'Processing Recently Modified Contacts', 'yup');
	var arrSearchResults = nlapiSearchRecord('contact', 11944);
	
	for (var i = 0; arrSearchResults != null && i < arrSearchResults.length && timeLeft() && unitsLeft(); i++) {
	
		var searchResult = arrSearchResults[i];
		var columns = searchResult.getAllColumns();
		var resultId = searchResult.getValue(columns[0]);
				
		try {
			nlapiSubmitField('contact', resultId, 'custentityr7saleforceupdateflag', 'T');
		} 
		catch (e) {
			nlapiLogExecution('ERROR', 'Error on Salesforce Sync Sched - Contacts', 'InternalID: ' + resultId + '\nError: ' + e);
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