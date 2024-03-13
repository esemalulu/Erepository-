/*
 * @author efagone
 */

function runCommissions(){

	var timeLimitInMinutes = 10;
	this.timeLimitInMilliseconds = timeLimitInMinutes * 60 * 1000;
	this.startingTime = new Date().getTime();
	this.context = nlapiGetContext();
	this.rescheduleScript = false;
	this.batchId = '';
	
	try {
		createCommissionsForTransaction();
		
		if (rescheduleScript) {
			nlapiLogExecution('DEBUG', 'Rescheduling script (script/deploy id)', context.getScriptId() + ' : ' + context.getDeploymentId());
			var status = nlapiScheduleScript(context.getScriptId(), context.getDeploymentId());
			nlapiLogExecution('DEBUG', 'Schedule Status', status);
		}
	} 
	catch (e) {
		nlapiLogExecution('ERROR', 'Error recalculating commissions', e);
		nlapiSendEmail(55011, 55011, 'Error recalculating commissions', 'Error:\n\n' + e);
	}
}

function createCommissionsForTransaction(){
	
	var arrTransactionToProcess = grabTransactionsToProcess();
	
	for (var i = 0; arrTransactionToProcess != null && i < arrTransactionToProcess.length && timeLeft() && unitsLeft(); i++) {
		
		var arrTransaction = arrTransactionToProcess[i];
		nlapiLogExecution('DEBUG', 'Updating transaction', arrTransaction['internalid']);
		
		var arrAllCommissionPlans = grabAllCurrentPlanInformation(arrTransaction['date']);
		var eligibleReps = grabEligibleReps(arrTransaction['salesrepid'], arrTransaction['date']);
		
		var vsoe = arrTransaction['vsoe'];
		if (vsoe == null || vsoe == '') {
			vsoe = 0;
		}
		
		if (arrTransaction['type'] == 'Credit Memo' || arrTransaction['type'] == 'Cash Refund') {
			vsoe = vsoe * -1;
		}
		
		for (var j = 0; eligibleReps != null && j < eligibleReps.length; j++) {
			
			var payableToId = eligibleReps[j][0];
			var eligibleForCommission = eligibleReps[j][1];
			var hasCompPlan = false;
			
			for (var k = 0; arrAllCommissionPlans != null && k < arrAllCommissionPlans.length; k++) {
			
				var compEmployeeId = arrAllCommissionPlans[k][0];
				var compCategoryId = arrAllCommissionPlans[k][1];
				
				if (compEmployeeId == payableToId && compCategoryId == arrTransaction['categoryid']) {
					hasCompPlan = true;
					break;
				}
			}
			
			if ((eligibleForCommission == 'T' && hasCompPlan) || (payableToId == arrTransaction['salesrepid'])) {
				createNewDetailRec(payableToId, arrTransaction['internalid'], arrTransaction['categoryid'], vsoe);
			}
			
		}
		
	}
	
}

function grabTransactionsToProcess(){

	var arrTransactionToProcess = new Array();
	
	var arrSearchResults = nlapiSearchRecord('transaction', 10910);

	for (var i = 0; arrSearchResults != null && i < arrSearchResults.length; i++) {
	
		var arrTransaction = new Array();
		
		var searchResult = arrSearchResults[i];
		var columns = searchResult.getAllColumns();
		
		arrTransaction['internalid'] = searchResult.getValue(columns[0]);
		arrTransaction['number'] = searchResult.getValue(columns[1]);
		arrTransaction['date'] = searchResult.getValue(columns[2]);
		arrTransaction['type'] = searchResult.getValue(columns[3]);
		arrTransaction['customerid'] = searchResult.getValue(columns[5]);
		arrTransaction['salesrepid'] = searchResult.getValue(columns[7]);
		arrTransaction['categoryid'] = searchResult.getValue(columns[8]);
		arrTransaction['vsoe'] = searchResult.getValue(columns[9]);
		arrTransactionToProcess[arrTransactionToProcess.length] = arrTransaction;
	}
	 
	return arrTransactionToProcess;
	
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
