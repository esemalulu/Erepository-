/*
 * @author efagone
 */

function updateCommissions(){
	
	var timeLimitInMinutes = 10;
	this.timeLimitInMilliseconds = timeLimitInMinutes * 60 * 1000;
	this.startingTime = new Date().getTime();
	this.context = nlapiGetContext();
	this.rescheduleScript = false;
	
	this.asOfDate = context.getSetting('SCRIPT', 'custscriptr7commrecalcasofdate');
	if (this.asOfDate == null || this.asOfDate == '') {
		this.asOfDate = nlapiDateToString(new Date());
	}
	this.batchId = context.getSetting('SCRIPT', 'custscriptr7commdetailbatchid');
	
	try {
		if (batchId == null || batchId == '') {
			this.batchId = getRandomString(30);
		}
		nlapiLogExecution('AUDIT', 'recalculating batchid', batchId);
		updateCommissionsForTransaction();
		
		if (rescheduleScript) {
			nlapiLogExecution('DEBUG', 'Rescheduling script (script/deploy id)', context.getScriptId());
			var params = new Array();
			params['custscriptr7commdetailbatchid'] = batchId;
			params['custscriptr7commrecalcasofdate'] = asOfDate;
			var status = nlapiScheduleScript(context.getScriptId(), null, params);
			nlapiLogExecution('DEBUG', 'Schedule Status', status);
		}
		else {
			nlapiSendEmail(55011, 2, 'Commission Recalculation Complete', 'ALL DONE!', 'commissions_@rapid7.com');
		}
	} 
	catch (e) {
		nlapiLogExecution('ERROR', 'Error recalculating commissions', e);
		nlapiSendEmail(55011, 55011, 'Error recalculating commissions', 'Error:\n\n' + e);
	}
}

function updateCommissionsForTransaction(){

	var arrTransactionToUpdate = grabTransactionsToUpdate();
		
	try{
		nlapiLogExecution('DEBUG', 'transactions to recalc', arrTransactionToUpdate.length);
	}
	catch (e){
		
	}
	var numTransactionsUpdated = 0;
	for (var i = 0; arrTransactionToUpdate != null && i < arrTransactionToUpdate.length && timeLeft() && unitsLeft(); i++) {
		
		var arrTransaction = arrTransactionToUpdate[i];
		
		//nlapiLogExecution('DEBUG', 'Updating transaction', arrTransaction['internalid']);
		
		var arrAllCommissionPlans = grabAllCurrentPlanInformation(arrTransaction['date']);
		var eligibleReps = grabEligibleReps(arrTransaction['salesrepid'], arrTransaction['date']);
		var vsoe = arrTransaction['vsoe'];
		if (vsoe == null || vsoe == '') {
			vsoe = 0;
		}
		
		var arrCurrentDetailRecs = grabAllTranCommissionDetailRec(arrTransaction['internalid'], arrTransaction['categoryid']);
		
		if (arrCurrentDetailRecs != null){
			//nlapiLogExecution('DEBUG', 'arrCurrentDetailRecs.length', arrCurrentDetailRecs.length);
		}
		if (arrTransaction['type'] == 'Credit Memo' || arrTransaction['type'] == 'Cash Refund') {
			vsoe = vsoe * -1;
		}
		
		for (var j = 0; eligibleReps != null && j < eligibleReps.length; j++) {
		
			var payableToId = eligibleReps[j][0];
			var eligibleForCommission = eligibleReps[j][1];
			var hasCompPlan = false;

			for (var k = 0; arrAllCommissionPlans !=null && k <arrAllCommissionPlans.length; k++){
				
				var compEmployeeId = arrAllCommissionPlans[k][0];
				var compCategoryId = arrAllCommissionPlans[k][1];
				
				if (compEmployeeId == payableToId && compCategoryId == arrTransaction['categoryid']){
					hasCompPlan = true;
					break;
				}
			}

			if ((eligibleForCommission == 'T' && hasCompPlan) || (payableToId == arrTransaction['salesrepid'])) {
				var existingId = findExistingCommissionDetailRec(payableToId, arrTransaction['internalid'], arrTransaction['categoryid']);

				if (existingId != null && existingId != '') {
					var recCommDetail = nlapiLoadRecord('customrecordr7commissiondetail', existingId);
					
					if (recCommDetail.getFieldValue('custrecordr7commissiondetailmanualadjust') != 'T') {
						recCommDetail.setFieldValue('custrecordr7commissiondetailamountelig', vsoe);
						recCommDetail.setFieldValue('custrecordr7commissiondetailrecalcbatchi', batchId);
						recCommDetail.setFieldValue('custrecordr7commissiondetaildtlastrecalc', nlapiDateToString(new Date(), 'datetimetz'));
						nlapiSubmitRecord(recCommDetail);
					}
					else {
						recCommDetail.setFieldValue('custrecordr7commissiondetailrecalcbatchi', batchId);
						nlapiSubmitRecord(recCommDetail);
					}
				}
				else {
					createNewDetailRec(payableToId, arrTransaction['internalid'], arrTransaction['categoryid'], vsoe);
				}
				
				var k = 0;
				while (arrCurrentDetailRecs != null && k < arrCurrentDetailRecs.length) {
				
					if (payableToId == arrCurrentDetailRecs[k][1] && arrTransaction['categoryid'] == arrCurrentDetailRecs[k][2]) {
						arrCurrentDetailRecs.splice(k, 1);
						k = 0;
					}
					else {
						k++;
					}
				}
			}
		}
		
		for (var j = 0; arrCurrentDetailRecs != null && j < arrCurrentDetailRecs.length; j++) {
			
			var recCommDetail = nlapiLoadRecord('customrecordr7commissiondetail', arrCurrentDetailRecs[j][0]);
			recCommDetail.setFieldValue('custrecordr7commissiondetailamountelig', 0);
			recCommDetail.setFieldValue('custrecordr7commissiondetailrecalcbatchi', batchId);
			recCommDetail.setFieldValue('custrecordr7commissiondetaildtlastrecalc', nlapiDateToString(new Date(), 'datetimetz'));
			nlapiSubmitRecord(recCommDetail);
			
		}
		numTransactionsUpdated++;
	}
	
	nlapiLogExecution('DEBUG', 'number of transactions updated', numTransactionsUpdated);
}

function findExistingCommissionDetailRec(payableToId, tranId, categoryId){
		
	if (payableToId != null && payableToId != '' && tranId != null && tranId != '' && categoryId != null && categoryId != '') {

		var arrSearchFilters = new Array();
		arrSearchFilters[0] = new nlobjSearchFilter('custrecordr7commissiondetailpayableto', null, 'anyof', payableToId);
		arrSearchFilters[1] = new nlobjSearchFilter('custrecordr7commissiondetailtransaction', null, 'is', tranId);
		arrSearchFilters[2] = new nlobjSearchFilter('custrecordr7commissiondetailcategory', null, 'is', categoryId);
		
		var arrSearchResults = nlapiSearchRecord('customrecordr7commissiondetail', null, arrSearchFilters);
		
		if (arrSearchResults != null) {

			return arrSearchResults[0].getId();
		}

	}
	
	return null;
	
}

function grabTransactionsToUpdate(){

	var arrTransactionToUpdate = new Array();
	
	var arrPlanDates = grabCurrentPlanDates();
	
	if (!arrPlanDates || !arrPlanDates[0] || !arrPlanDates[1]){
		nlapiLogExecution('AUDIT', 'No active plans found', 'returning');
		return;
	}
	
	nlapiLogExecution('AUDIT', 'Getting all transactions within', arrPlanDates[0] + ' - ' + arrPlanDates[1]);
	
	var arrSearchFilters = new Array();
	arrSearchFilters[0] = new nlobjSearchFilter('saleseffectivedate', null, 'within', arrPlanDates[0], arrPlanDates[1]);
	arrSearchFilters[1] = new nlobjSearchFilter('custrecordr7commissiondetailrecalcbatchi', 'custrecordr7commissiondetailtransaction', 'isnot', batchId);
	
	var arrSearchResults = nlapiSearchRecord('transaction', 11072, arrSearchFilters);

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
		arrTransactionToUpdate[arrTransactionToUpdate.length] = arrTransaction;
	}
	
	return arrTransactionToUpdate;
	
}

function grabAffectedTransactions(arrAllModifiedReps){
	
	var arrAffectedTransactions = new Array();
	
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
		arrAffectedTransactions[arrAffectedTransactions.length] = arrTransaction;
	}
	
	return arrAffectedTransactions;
	
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
