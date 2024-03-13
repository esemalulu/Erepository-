/*
 * @author efagone
 */

var timeLimitInMinutes = 10;
var startingTime = new Date().getTime();
var context = nlapiGetContext();
var rescheduleScript = false;

function zc_send_srp_surveys_scheduled(){

	sendPSOSurveys();
	
	nlapiLogExecution('AUDIT', 'Finished Script', 'Thank you and have a good day.');
	
	if (rescheduleScript) {
		nlapiLogExecution('AUDIT', 'Rescheduling script (script/deploy id)', 'yup');
		var status = nlapiScheduleScript(context.getScriptId());
		nlapiLogExecution('DEBUG', 'Schedule Status', status);
	}
	
}

function sendPSOSurveys(){

	nlapiLogExecution('AUDIT', 'Starting sendPSOSurveys()', 'now');
	//SCRIPT: SRP Project/Sales Order Sync
	if (rescheduleScript) {
		return;
	}
	
	var savedsearch = nlapiLoadSearch('job', 'customsearchzc_scrpt_pso_surveys_to_send');
	var resultSet = savedsearch.runSearch();
	
	var countProcessed = 0;
	var countFailed = 0;
	var rowNum = 0;
	
	do {
		var resultSlice = resultSet.getResults(rowNum, rowNum + 1000);
		for (var rs in resultSlice) {
			if (!timeLeft() || !unitsLeft()) {
				break;
			}
			rowNum++;
			
			var columns = resultSlice[rs].getAllColumns();
			var recId = resultSlice[rs].getValue(columns[0]);
			
			try {
				nlapiLogExecution('DEBUG', 'Processing result', recId);
				
				var objResponse = sendSurvey({
					job: recId
				});
				
				if (objResponse.success) {
					countProcessed++;
				}
				else {
					nlapiLogExecution('ERROR', 'Could not send survey ' + recId, ((objResponse.messages) ? JSON.stringify(objResponse.messages) : ''));
					countFailed++;
				}
			} 
			catch (e) {
				nlapiLogExecution('ERROR', 'Could not send survey ' + recId, e);
				countFailed++;
			}
			
		}
	}
	while (resultSlice.length >= 1000 && !rescheduleScript);
	
	nlapiLogExecution('AUDIT', 'Number of records processed (customsearchzc_scrpt_pso_surveys_to_send)', countProcessed);
	nlapiLogExecution('AUDIT', 'Number of records failed (customsearchzc_scrpt_pso_surveys_to_send)', countFailed);
	
	return true;
}

function timeLeft(){
	if (!timeLimitInMinutes){
		return true;
	}
	var presentTime = new Date().getTime();
	if (rescheduleScript || presentTime - startingTime > (timeLimitInMinutes * 60 * 1000)) {
		nlapiLogExecution('AUDIT', 'Ran out of time', 'yup');
		rescheduleScript = true;
		return false;
	}
	return true;
}

function unitsLeft(){
	var unitsLeft = context.getRemainingUsage();
	if (rescheduleScript || unitsLeft <= 100) {
		nlapiLogExecution('AUDIT', 'Ran out of units', 'yup');
		rescheduleScript = true;
		return false;
	}
	return true;
}