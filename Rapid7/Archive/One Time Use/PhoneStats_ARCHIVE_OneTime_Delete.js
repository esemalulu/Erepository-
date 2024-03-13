/*
 * @author efagone
 */
function deleteArchivePhoneStats_once(){
crash
/*	
	var timeLimitInMinutes = 5;
	this.timeLimitInMilliseconds = timeLimitInMinutes * 60 * 1000;
	this.startingTime = new Date().getTime();
	 
	this.context = nlapiGetContext();	
		
	var deleteSearchResults = nlapiSearchRecord('customrecordr7phonestatsarchive', '9434');
		nlapiLogExecution('Debug', 'deleteSearchResults.length', deleteSearchResults.length); 
		
	for (i = 0; deleteSearchResults != null && i < deleteSearchResults.length && unitsLeft() && timeLeft; i++) {
		nlapiLogExecution('Debug', 'Deleting record', deleteSearchResults[i].getId());
		
		nlapiDeleteRecord('customrecordr7phonestatsarchive', deleteSearchResults[i].getId());
		
		if (i == 999){
			nlapiLogExecution('DEBUG', 'Getting more results', 'yup');
			deleteSearchResults = nlapiSearchRecord('customrecordr7phonestatsarchive', '9434');
			i = 0;
		}

	}
*/
}
/*
function unitsLeft(){
    var unitsLeft = context.getRemainingUsage();
    if (unitsLeft <= 60) {
		nlapiLogExecution('DEBUG', 'Ran out of units', 'yup');
		nlapiLogExecution('DEBUG', 'Rescheduling script (script/deploy id)', context.getScriptId() + ' : ' + context.getDeploymentId());
		var status = nlapiScheduleScript(context.getScriptId(), context.getDeploymentId());
		nlapiLogExecution('DEBUG', 'Schedule Status', status);
		return false;
	}

    return true;
}


function timeLeft(){
	var presentTime = new Date().getTime(); 
	
	if (presentTime - startingTime > timeLimitInMilliseconds){
		nlapiLogExecution('DEBUG', 'Ran out of time', 'yup');
		nlapiLogExecution('DEBUG', 'Rescheduling script (script/deploy id)', context.getScriptId() + ' : ' + context.getDeploymentId());
		var status = nlapiScheduleScript(context.getScriptId(), context.getDeploymentId());
		nlapiLogExecution('DEBUG', 'Schedule Status', status);
		return false;
	}
	return true;
}
*/