/*
 * @author efagone
 */
function deleteRecsBySearch(){

	var timeLimitInMinutes = 10;
	this.timeLimitInMilliseconds = timeLimitInMinutes * 60 * 1000;
	this.startingTime = new Date().getTime();
	this.context = nlapiGetContext();
	this.rescheduleScript = false;
	
	var context = nlapiGetContext();
	
	var searchId = context.getSetting('SCRIPT', 'custscriptr7ratablehistoricdeleterev');
	
	var objSearch = nlapiLoadSearch(null, searchId);
	var resultSet = objSearch.runSearch();
	
	var rowNum = 0;
	do {
		var resultSlice = resultSet.getResults(rowNum, rowNum + 1000);
		for (var i = 0; resultSlice != null && i < resultSlice.length && timeLeft() && unitsLeft(); i++) {
		
			var columns = resultSlice[i].getAllColumns();
			var resultId = resultSlice[i].getValue(columns[0]);
			
			var firstColumn = columns[0].getName();
			
			if (firstColumn != 'internalid') {
				var adminUser =  nlapiLoadConfiguration('companypreferences').getFieldValue('custscriptr7_system_info_email_sender');
				nlapiSendEmail(adminUser, adminUser, 'Attempting to delete without properly formatted search', '1st Column: ' + firstColumn + '\nShould be: "internalid"');
				break;
			}
			
			
			nlapiLogExecution('DEBUG', 'Deleting ', resultId);
			
			try {
				nlapiDeleteRecord('journalentry', resultId);
			} 
			catch (e) {
				nlapiLogExecution('ERROR', 'Could not delete result', '\nResult: ' + resultId + '\nError: ' + e);
			}
			rowNum++;
		}
	}
	while (resultSlice.length >= 1000 && !rescheduleScript);
	
	if (rescheduleScript) {
		nlapiLogExecution('DEBUG', 'Rescheduling script (script/deploy id)', context.getDeploymentId());
		var status = nlapiScheduleScript(context.getScriptId(), context.getDeploymentId());
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
	if (unitsLeft <= 100) {
		nlapiLogExecution('DEBUG', 'Ran out of units', 'yup');
		rescheduleScript = true;
		return false;
	}
	return true;
}