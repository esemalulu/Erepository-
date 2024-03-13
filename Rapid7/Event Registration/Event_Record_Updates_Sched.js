/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       03 Jun 2013     mburstein
 * @module updateAttendeeStatus
 */

/**
 * This script updates abandoned Event Attendee Records to no checkout 
 * @appliedtorecord customrecordr7eventattendees R7 Event Attendee - no checkout status
 *  
 * @class updateAttendeeStatus
 * @module updateAttendeeStatus
 * 
 * @returns {Void}
 */
function updateAttendeeStatus() {
	this.startingTime = new Date().getTime();
	this.context = nlapiGetContext();
	this.rescheduleScript = false;
	
	// Lookup attendee records that are missing a Sales Order
	var arrAttendeesToUpdate = attendeeStatusSearch();
	
	// Update attendee record statuses
	updateAttendeeRecords(arrAttendeesToUpdate);
	
	// If the script runs out of units or time then rescedule script
	if (rescheduleScript) {
		nlapiLogExecution('DEBUG', 'Rescheduling script (script/deploy id)', context.getScriptId() + ' : ' + context.getDeploymentId());
		var status = nlapiScheduleScript(context.getScriptId());
		nlapiLogExecution('DEBUG', 'Schedule Status', status);
	}
}
/**
 * This returns an array of all R7 Event Attendee records for which:
 * 	No Sales Order is attached
 *  Status is not 'No Checkout', 'Cancelled'
 *  Owner is -system-
 *  
 * @method attendeeStatusSearch
 * @return {Array} arrAttendeesToUpdate array of R7 Event Attendee record IDs
 */
function attendeeStatusSearch(){
	// Initialize return array
	var arrAttendeesToUpdate = new Array();
	
	// Lookup all ATT records created by system missing SO
	var filters = new Array();
	filters[filters.length] = new nlobjSearchFilter('custrecordr7eventattendeessalesorder', null , 'anyof', '@NONE@');
	// Status is not 'No Checkout', 'Cancelled'
	filters[filters.length] = new nlobjSearchFilter('custrecordr7eventattendeesstatus',null,'noneof',new Array('3','4'));
	// Owner is -system-
	filters[filters.length] = new nlobjSearchFilter('owner', null , 'anyof', '-4');
	
	var columns = new Array();
	columns[0] = new nlobjSearchColumn('internalid');
	
	var arrAttendeeResults = nlapiSearchRecord('customrecordr7eventattendees', null, filters, columns);
	for (var i = 0; arrAttendeeResults != null && i < arrAttendeeResults.length; i++) {
		// Put each attendee record Id into an array
		arrAttendeesToUpdate[arrAttendeesToUpdate.length] = arrAttendeeResults[i].getId();
	}
	return arrAttendeesToUpdate;
}

/**
 * This returns an array of all R7 Event Attendee records for which:
 * 	No Sales Order is attached
 *  Status is not 'No Checkout', 'Cancelled'
 *  Owner is -system-
 *  
 * @method updateAttendeeStatus
 * @return {Void}
 */
function updateAttendeeRecords(arrAttendeesToUpdate){
	for (var i = 0; arrAttendeesToUpdate != null && i < arrAttendeesToUpdate.length; i++) {
		// Load Attendee Record and update status
		try {
			var record = nlapiLoadRecord('customrecordr7eventattendees', arrAttendeesToUpdate[i]);
			record.setFieldValue('custrecordr7eventattendeesstatus', 4);
			nlapiSubmitRecord(record, null, true);
		}
		catch(e){
			var subject = 'ERROR updateAttendeeStatus';
			var body = 'Could not update status for ATT'+arrAttendeesToUpdate[i]+'\n'+e;
			reportError(e,subject,body);
		}
	}
}

/**
 * Send a report email and log an error
 * @method reportError
 * @param {Object} subject Email subject line
 * @param {Object} body Email body text, includes catch error text
 * @return {void}
 */
function reportError(subject,body){
	var adminUser =  nlapiLoadConfiguration('companypreferences').getFieldValue('custscriptr7_system_info_email_sender');
	nlapiSendEmail(adminUser,adminUser,subject,body);
	nlapiLogExecution('ERROR',subject,body);
}

/**
 * This function puts a time constraint on a scheduled script.  If the script takes longer than the specified timeLimitInMinutes
 * rescheduleScript will return true.
 *  
 * @method timeLeft
 * @param {Number} timeLimitInMinutes
 * @return {Boolean}
 */
function timeLeft(timeLimitInMinutes){

	if (timeLimitInMinutes == null || timeLimitInMinutes == '') {
		timeLimitInMinutes = 11;
	}
	var timeLimitInMilliseconds = timeLimitInMinutes * 60 * 1000;
	
	var presentTime = new Date().getTime();
	if (presentTime - startingTime > timeLimitInMilliseconds) {
		nlapiLogExecution('DEBUG', 'Ran out of time', 'yup');
		rescheduleScript = true;
		return false;
	}
	return true;
}

/**
 * This function will set rescheduleScript to true if the remaining usage is below the given number
 * rescheduleScript will return true.
 *  
 * @method unitsLeft
 * @param {Number} number
 * @return {Boolean}
 */
function unitsLeft(number){
	var unitsLeft = context.getRemainingUsage();
	if (unitsLeft <= number) {
		nlapiLogExecution('DEBUG', 'Ran out of units', 'yup');
		rescheduleScript = true;
		return false;
	}
	return true;
}