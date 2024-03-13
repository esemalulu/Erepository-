/*
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       19 Feb 2013     efagone
 *
 */

/*
 * @param {String} type Context Types: scheduled, ondemand, userinterface, aborted, skipped
 * @returns {Void}
 */
function freedom(type){

	var timeLimitInMinutes = 10;
	this.timeLimitInMilliseconds = timeLimitInMinutes * 60 * 1000;
	this.startingTime = new Date().getTime();
	this.context = nlapiGetContext();
	this.rescheduleScript = false;
	
	markBridgesAvailable();
	
	if (rescheduleScript) {
		nlapiLogExecution('DEBUG', 'Rescheduling script (script/deploy id)', context.getScriptId());
		var status = nlapiScheduleScript(context.getScriptId());
		nlapiLogExecution('DEBUG', 'Schedule Status', status);
	}
	
}

function markBridgesAvailable(){

	var arrBridgesToBeFree = nlapiSearchRecord('customrecordr7conferencebridge', 13239);
	
	for (var i = 0; arrBridgesToBeFree != null && i < arrBridgesToBeFree.length && timeLeft() && unitsLeft(); i++) {
	
		var searchResult = arrBridgesToBeFree[i];
		var columns = searchResult.getAllColumns();
		var confBridgeId = searchResult.getValue(columns[0]);
		
		var setFields = new Array();
		setFields[0] = 'custrecordr7confbridgeeventinternalid';
		setFields[1] = 'custrecordr7confbridgecodeavailable';
		setFields[2] = 'custrecordr7conferencebridgeeventlink';
		setFields[3] = 'custrecordr7confbridgelastused';
		
		var setValues = new Array();
		setValues[0] = '';
		setValues[1] = 'T';
		setValues[2] = '';
		setValues[3] = nlapiDateToString(new Date());
		
		nlapiSubmitField('customrecordr7conferencebridge', confBridgeId, setFields, setValues);
		
	}
	
	if (i >= 999) {
		rescheduleScript = true;
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
	if (unitsLeft <= 30) {
		nlapiLogExecution('DEBUG', 'Ran out of units', 'yup');
		rescheduleScript = true;
		return false;
	}
	return true;
}