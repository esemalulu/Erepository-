/*
 * @author efagone
 */

function updateEm(){

	//just touching them
	var timeLimitInMinutes = 10;
	this.timeLimitInMilliseconds = timeLimitInMinutes * 60 * 1000;
	this.startingTime = new Date().getTime();
	this.context = nlapiGetContext();
	this.rescheduleScript = false;
	
	//updateAllAmounts();
	
	if (rescheduleScript) {
		nlapiLogExecution('DEBUG', 'Rescheduling script (script/deploy id)', context.getScriptId() + ' : ' + context.getDeploymentId());
		var status = nlapiScheduleScript(context.getScriptId());
		nlapiLogExecution('DEBUG', 'Schedule Status', status);
	}
	
}

function updateAllAmounts(){

	var searchRecord = 'transaction';
	var searchId = 12872;
	
	var arrSearchResults = nlapiSearchRecord(searchRecord, searchId);
	
	for (var i = 0; arrSearchResults != null && i < arrSearchResults.length && timeLeft() && unitsLeft(); i++) {
	
		var searchResult = arrSearchResults[i];
		var columns = searchResult.getAllColumns();
		var tranId = searchResult.getValue(columns[0]);
		var recordId = tranIdToRecId(searchResult.getValue(columns[1]));
		nlapiLogExecution('DEBUG', 'updating', tranId);
		
		var recTransaction = nlapiLoadRecord(recordId, tranId);
		
		try {
			nlapiSubmitRecord(recTransaction, true, true);
		} 
		catch (e) {
			nlapiLogExecution('ERROR', 'Could not submit Renewal Amounts', 'recordId: ' + recordId + '\ntranId: ' + tranId + '\nError: ' + e);
		}
		
		if (i == 999) {
			arrSearchResults = nlapiSearchRecord(searchRecord, searchId);
			i = -1;
		}
		
	}
}

function formatAmount(amount){

	if (amount != null && amount != '') {
		return Math.round(parseFloat(amount) * 100) / 100;	
	}
	
	return 0;
}

function tranIdToRecId(tranType){

	switch (tranType) {
		case 'SalesOrd':
			return 'salesorder';
			break;
		case 'Opprtnty':
			return 'opportunity';
			break;
		case 'CustInvc':
			return 'invoice';
			break;
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
	if (unitsLeft <= 200) {
		nlapiLogExecution('DEBUG', 'Ran out of units', 'yup');
		rescheduleScript = true;
		return false;
	}
	return true;
}