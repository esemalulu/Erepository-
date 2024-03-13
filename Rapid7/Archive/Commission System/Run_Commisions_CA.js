/*
 * @author efagone
 */

function runCommissions(){
	
	var context = nlapiGetContext();
	
	if (context.getExecutionContext() == 'workflow' || true) {
	
		//var tranId = context.getSetting('SCRIPT', 'custscriptr7orderid');

		var arrTransactionCategoryDetails = grabTransactionAmounts();
		
		for (var i = 0; arrTransactionCategoryDetails != null && i < arrTransactionCategoryDetails.length; i++) {
			
			var arrTransaction = arrTransactionCategoryDetails[i];
			var eligibleReps = arrTransaction['eligiblereps'];
			
			var vsoe = arrTransaction['vsoe'];
			
			if (arrTransaction['type'] == 'Credit Memo' || arrTransaction['type'] == 'Cash Refund'){
				vsoe = vsoe * -1;
			}
			
			for (var j = 0; eligibleReps != null && j < eligibleReps.length; j++) {
			
				var newCommissionDetailRec = nlapiCreateRecord('customrecordr7commissiondetail');
				newCommissionDetailRec.setFieldValue('custrecordr7commissiondetailpayableto', eligibleReps[j]);
				newCommissionDetailRec.setFieldValue('custrecordr7commissiondetailtransaction', arrTransaction['internalid']);
				newCommissionDetailRec.setFieldValue('custrecordr7commissiondetailcategory', arrTransaction['categoryid']);
				newCommissionDetailRec.setFieldValue('custrecordr7commissiondetailamountelig', vsoe);
				nlapiSubmitRecord(newCommissionDetailRec, true, true);
			}
			
		}
		
	}
}

function grabTransactionAmounts(){

	var arrTransactionCategoryDetails = new Array();
	
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
		arrTransaction['eligiblereps'] = grabEligibleReps(arrTransaction['salesrepid'], arrTransaction['date']);
		arrTransactionCategoryDetails[arrTransactionCategoryDetails.length] = arrTransaction;
	}
	
	return arrTransactionCategoryDetails;
	
}

function grabEligibleReps(tranSalesRepId, tranDate){

	var eligibleReps = new Array();
	eligibleReps[eligibleReps.length] = tranSalesRepId;
	
	var arrSearchFilters = new Array();
	arrSearchFilters[0] = new nlobjSearchFilter('custrecordr7commissionsupervisordate', null, 'onorbefore', tranDate);
	
	var arrSearchResults = nlapiSearchRecord('customrecordr7commissionsupervisorhist', 10953, arrSearchFilters);
	
	//build list of all commission history 
	var arrCommissionHistory = new Array();
	for (var i = 0; arrSearchResults != null && i < arrSearchResults.length; i++) {
	
		var searchResult = arrSearchResults[i];
		var columns = searchResult.getAllColumns();
		var salesRepId = searchResult.getValue(columns[0]);
		var supervisorId = searchResult.getValue(columns[1]);
		var effectiveDate = searchResult.getValue(columns[2]);
		var eligibleForCommission = searchResult.getValue(columns[3]);

		arrCommissionHistory[arrCommissionHistory.length] = new Array(salesRepId, supervisorId, effectiveDate, eligibleForCommission);
	}
		
	//loop ALL supervisors in chain
	for (var i = 0; eligibleReps != null && i < eligibleReps.length; i++) {
	
		var currentSalesRepId = eligibleReps[i];
		
		for (var j = 0; arrCommissionHistory != null && j < arrCommissionHistory.length; j++) {
		
			var salesRepId = arrCommissionHistory[j][0];
			var supervisorId = arrCommissionHistory[j][1];
			var effectiveDate = arrCommissionHistory[j][2];
			var eligibleForCommission = arrCommissionHistory[j][3];
			
			if (salesRepId == currentSalesRepId && eligibleForCommission == 'T') {
				eligibleReps[eligibleReps.length] = supervisorId;
				break;
			}
		}
	}
	
	eligibleReps = unique(eligibleReps);
	
	return eligibleReps;
}

function unique(a){
	a.sort();
	for (var i = 1; i < a.length;) {
		if (a[i - 1] == a[i]) {
			a.splice(i, 1);
		}
		else {
			i++;
		}
	}
	return a;
}

