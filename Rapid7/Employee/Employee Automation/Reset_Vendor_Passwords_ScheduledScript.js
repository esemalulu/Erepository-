/*
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       07 Aug 2013     efagone
 *
 */

/*
 * @param {String} type Context Types: scheduled, ondemand, userinterface, aborted, skipped
 * @returns {Void}
 */

function autoReset(type) {

	var timeLimitInMinutes = 10;
	this.timeLimitInMilliseconds = timeLimitInMinutes * 60 * 1000;
	this.startingTime = new Date().getTime();
	this.context = nlapiGetContext();
	this.rescheduleScript = false;
	
	var arrFilters = new Array();
	arrFilters[0] = new nlobjSearchFilter('giveaccess', null, 'is', 'T');
	arrFilters[1] = new nlobjSearchFilter('custentityr7autorenewpassword', null, 'is', 'T');
	
	var arrSearchResults = nlapiSearchRecord('vendor', null, arrFilters);
	
	nlapiLogExecution('AUDIT', 'Number of results', (arrSearchResults) ? arrSearchResults.length: 'No results');
	
	for ( var i = 0; arrSearchResults != null && i < arrSearchResults.length && timeLeft() && unitsLeft(); i++) {

		try {	
			
			nlapiLogExecution('DEBUG', 'Loading Vendor Record', arrSearchResults[i].getId());
			var recVendor = nlapiLoadRecord('vendor', arrSearchResults[i].getId());
			var currentPassword = recVendor.getFieldValue('custentityr7autorenewpasswordvalue');
			//setting new pw
			recVendor.setFieldValue('password', currentPassword);
			recVendor.setFieldValue('password2', currentPassword);
			recVendor.setFieldValue('requirepwdchange', 'F');
			
			nlapiLogExecution('AUDIT', 'Submitting Vendor Record', arrSearchResults[i].getId());
			nlapiSubmitRecord(recVendor);
		}
		catch (e) {
			var adminUser =  nlapiLoadConfiguration('companypreferences').getFieldValue('custscriptr7_system_info_email_sender');
			nlapiSendEmail(adminUser, adminUser, 'ERROR on vendor pw reset', 'Vendor ID: ' + arrSearchResults[i].getId() + '\nError: ' + e);
		}

	}

	if (rescheduleScript) {
		nlapiLogExecution('DEBUG', 'Rescheduling script', context.getScriptId());
		var status = nlapiScheduleScript(context.getScriptId());
		nlapiLogExecution('DEBUG', 'Schedule Status', status);
	}

}

function timeLeft() {
	var presentTime = new Date().getTime();
	if (presentTime - startingTime > timeLimitInMilliseconds) {
		nlapiLogExecution('AUDIT', 'Ran out of time', 'yup');
		rescheduleScript = true;
		return false;
	}
	return true;
}

function unitsLeft(units) {
	if (units == null || units == '') {
		units = 100;
	}
	var unitsLeft = context.getRemainingUsage();
	if (unitsLeft <= units) {
		nlapiLogExecution('AUDIT', 'Ran out of units', 'yup');
		rescheduleScript = true;
		return false;
	}
	return true;
}