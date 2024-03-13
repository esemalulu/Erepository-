function deleteRecords(){

	var timeLimitInMinutes = 10;
	this.timeLimitInMilliseconds = timeLimitInMinutes * 60 * 1000;
	this.startingTime = new Date().getTime();
	this.context = nlapiGetContext();
	this.rescheduleScript = false;
	
	var arrSearchResults = nlapiSearchRecord('customrecordr7taskautointradayrecords', 11863);
	
	for (var i = 0; arrSearchResults != null && i < arrSearchResults.length && unitsLeft(50) && timeLeft(); i++) {
		var searchResult = arrSearchResults[i];
		var recId = searchResult.getId();
		
		nlapiDeleteRecord('customrecordr7taskautointradayrecords', recId);
		nlapiLogExecution('DEBUG', 'Deleted Intra Day Record With Id', recId);
		
		if (i == 999) {
			arrSearchResults = nlapiSearchRecord('customrecordr7taskautointradayrecords', 11863);
			i = -1;
		}
		
	}
	
	if (rescheduleScript) {
		nlapiLogExecution('DEBUG', 'Rescheduling script (script/deploy id)', context.getScriptId() + ' : ' + context.getDeploymentId());
		var status = nlapiScheduleScript(nlapiGetContext().getScriptId());
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

function unitsLeft(units){

	if (units == null || units == '') {
		units = 200;
	}
	
	var unitsLeft = context.getRemainingUsage();
	if (unitsLeft <= units) {
		nlapiLogExecution('DEBUG', 'Ran out of units', 'yup');
		rescheduleScript = true;
		return false;
	}
	return true;
}