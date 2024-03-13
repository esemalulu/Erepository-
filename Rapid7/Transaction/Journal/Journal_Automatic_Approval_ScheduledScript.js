/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       08 Oct 2013     efagone
 *
 */

/**
 * @param {String} type Context Types: scheduled, ondemand, userinterface, aborted, skipped
 * @returns {Void}
 */
function autoApproveNow(){
	
	var timeLimitInMinutes = 10;
	this.timeLimitInMilliseconds = timeLimitInMinutes * 60 * 1000;
	this.startingTime = new Date().getTime();
	this.context = nlapiGetContext();
	this.rescheduleScript = false;
	
	processJournals();
	
	if (rescheduleScript) {
		nlapiLogExecution('DEBUG', 'Rescheduling script (script/deploy id)', context.getScriptId());
		var status = nlapiScheduleScript(context.getScriptId());
		nlapiLogExecution('DEBUG', 'Schedule Status', status);
	}
	
}

function processJournals(){

	var arrSearchResults = nlapiSearchRecord('transaction', 15011);
	
	for (var i = 0; arrSearchResults != null && i < arrSearchResults.length && timeLeft() && unitsLeft(); i++) {
	
		var columns = arrSearchResults[i].getAllColumns();
		var journalId = arrSearchResults[i].getValue(columns[0]);

		try {
			var recJournal = nlapiLoadRecord('journalentry', journalId);
			nlapiSubmitRecord(recJournal);
		} 
		catch (e) {
			var adminUser =  nlapiLoadConfiguration('companypreferences').getFieldValue('custscriptr7_system_info_email_sender');
			nlapiSendEmail(adminUser, adminUser, 'Could not auto approve journal', 'ID: ' + journalId + '\n\processJournals():\n ' + e);
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

function unitsLeft(){
	var unitsLeft = context.getRemainingUsage();
	if (unitsLeft <= 100) {
		nlapiLogExecution('DEBUG', 'Ran out of units', 'yup');
		rescheduleScript = true;
		return false;
	}
	return true;
}
