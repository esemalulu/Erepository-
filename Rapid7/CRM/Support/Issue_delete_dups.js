/*
 * @author efagone
 */
function findAndDeleteDups(){
/*
	var timeLimitInMinutes = 5;
	this.timeLimitInMilliseconds = timeLimitInMinutes * 60 * 1000;
	this.startingTime = new Date().getTime();
	this.context = nlapiGetContext();
	this.rescheduleScript = false;
	
	var arrSearchResults = nlapiSearchRecord('issue', 9950);
	
	var count = 0;
	var foundDupe = false;
	
	for (var i = 0; i < arrSearchResults.length && timeLeft() && unitsLeft(); i++) {
	
		var searchResult = arrSearchResults[i];
		var columns = searchResult.getAllColumns();
		var issueId = searchResult.getId();
		var issueAbstract = searchResult.getValue(columns[2]);
		var issueStatus = searchResult.getValue(columns[3]);
		
		var searchString = issueAbstract + '' + issueStatus;
		
		for (var j = 0; j < arrSearchResults.length && timeLeft() && unitsLeft() && !foundDupe; j++) {
		
			var compareResult = arrSearchResults[j];
			var compareColumns = compareResult.getAllColumns();
			var compareIssueId = compareResult.getId();
			var compareIssueAbstract = compareResult.getValue(columns[2]);
			var compareIssueStatus = compareResult.getValue(columns[3]);
			
			var compareString = compareIssueAbstract + '' + compareIssueStatus;
			
			if (issueId != compareIssueId && searchString == compareString && searchString != '' && searchString != null) {
				nlapiLogExecution('DEBUG', 'Deleting Issue', compareIssueId);
				//nlapiDeleteRecord('issue', compareIssueId);
				foundDupe = true;
				count++;
			}
		}
		
		if (foundDupe) {
			arrSearchResults = nlapiSearchRecord('issue', 9950);
			i = 0;
			j = 0;
			foundDupe = false;
		}
	}
	
	if (rescheduleScript) {
		nlapiLogExecution('DEBUG', 'Rescheduling script (script/deploy id)', context.getScriptId() + ' : ' + context.getDeploymentId());
		var status = nlapiScheduleScript(context.getScriptId(), context.getDeploymentId());
		nlapiLogExecution('DEBUG', 'Schedule Status', status);
	}
	*/
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
