/*
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       06 Dec 2012     efagone
 *
 */

/*
 * @param {String} type Context Types: scheduled, ondemand, userinterface, aborted, skipped
 * @returns {Void}
 */

function processThem(){

	try {
	
		var timeLimitInMinutes = 10;
		this.timeLimitInMilliseconds = timeLimitInMinutes * 60 * 1000;
		this.startingTime = new Date().getTime();
		this.context = nlapiGetContext();
		this.rescheduleScript = false;
				
		var arrSearchResults = nlapiSearchRecord('customrecordr7lictemptracking', 12781);
		
		for (var i = 0; arrSearchResults != null && i < arrSearchResults.length && timeLeft() && unitsLeft(); i++) {
		
			var searchResult = arrSearchResults[i];
			var trackingId = searchResult.getId();
			
			processTrackingDBRec(trackingId);
		}
	} 
	catch (err) {
		nlapiLogExecution('ERROR', 'Details', err);
		var adminUser =  nlapiLoadConfiguration('companypreferences').getFieldValue('custscriptr7_system_info_email_sender');
		nlapiSendEmail(adminUser, adminUser, 'Error on Tracking process db Script', 'Error: ' + err);
	}
	
	if (rescheduleScript) {
		nlapiLogExecution('DEBUG', 'Rescheduling script (script/deploy id)', context.getScriptId() + ' : ' + context.getDeploymentId());
		var status = nlapiScheduleScript(context.getScriptId());
		nlapiLogExecution('DEBUG', 'Schedule Status', status);
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
	if (unitsLeft <= 300) {
		nlapiLogExecution('DEBUG', 'Ran out of units', 'yup');
		rescheduleScript = true;
		return false;
	}
	return true;
}

