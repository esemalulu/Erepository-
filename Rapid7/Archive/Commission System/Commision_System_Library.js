/*
 * @author efagone
 */

function grabEligibleReps(tranSalesRepId, tranDate){

	var eligibleReps = new Array();
	eligibleReps[eligibleReps.length] = new Array(tranSalesRepId, nlapiLookupField('employee', tranSalesRepId, 'custentityr7_eligibleforcommission'));
	
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
	for (var i = 0; eligibleReps != null && i < eligibleReps.length && i < 35; i++) {
	
		var currentSalesRepId = eligibleReps[i][0];
		//nlapiLogExecution('DEBUG', 'currentSalesRepId', currentSalesRepId);
		for (var j = 0; arrCommissionHistory != null && j < arrCommissionHistory.length && currentSalesRepId != null && currentSalesRepId != ''; j++) {
		
			var salesRepId = arrCommissionHistory[j][0];
			var supervisorId = arrCommissionHistory[j][1];
			var effectiveDate = arrCommissionHistory[j][2];
			var eligibleForCommission = arrCommissionHistory[j][3];
			
			if (salesRepId == currentSalesRepId) {
				eligibleReps[eligibleReps.length] = new Array(supervisorId, eligibleForCommission);
				break;
			}
			
			if (j == (arrCommissionHistory.length - 1)) {
				var empLookedUpFields = nlapiLookupField('employee', currentSalesRepId, new Array('supervisor', 'custentityr7_eligibleforcommission'));
				if (empLookedUpFields['supervisor'] != null && empLookedUpFields['supervisor'] != '') {
					eligibleReps[eligibleReps.length] = new Array(empLookedUpFields['supervisor'], empLookedUpFields['custentityr7_eligibleforcommission']);
					break;
				}
			}
		}
	}
	
	eligibleReps = unique(eligibleReps);
	
	return eligibleReps;
}

function grabAllCurrentPlanInformation(tranDate){

	var arrSearchFilters = new Array();
	arrSearchFilters[arrSearchFilters.length] = new nlobjSearchFilter('custrecordr7commissionplanstartdate', null, 'onorbefore', tranDate);
	arrSearchFilters[arrSearchFilters.length] = new nlobjSearchFilter('custrecordr7commissionplanenddate', null, 'onorafter', tranDate);
	arrSearchFilters[arrSearchFilters.length] = new nlobjSearchFilter('isinactive', null, 'is', 'F');
	
	var arrSearchColumns = new Array();
	arrSearchColumns[0] = new nlobjSearchColumn('custrecordr7commissionplanemployee', null, 'group');
	arrSearchColumns[1] = new nlobjSearchColumn('custrecordr7commissionplancategory', null, 'group');
	
	var arrSearchResults = nlapiSearchRecord('customrecordr7commissionplan', null, arrSearchFilters, arrSearchColumns);
	
	var arrAllActivePlans = new Array();
	for (var i = 0; arrSearchResults != null && i < arrSearchResults.length; i++) {
	
		arrAllActivePlans[arrAllActivePlans.length] = new Array(arrSearchResults[i].getValue(arrSearchColumns[0]), arrSearchResults[i].getValue(arrSearchColumns[1]));
		
	}
	
	return arrAllActivePlans;
}

function findAndDeleteEmptyCommissionDetailRecs(){

	var arrSearchFilters = new Array();
	arrSearchFilters[0] = new nlobjSearchFilter('custrecordr7commissiondetailamountelig', null, 'equalto', 0);
	arrSearchFilters[1] = new nlobjSearchFilter('custrecordr7commissiondetailcommission', null, 'equalto', 0);
	arrSearchFilters[2] = new nlobjSearchFilter('custrecordr7commissiondetailpayment', null, 'anyof', '@NONE@');
	arrSearchFilters[3] = new nlobjSearchFilter('custrecordr7commissiondetailamountpaid', null, 'equalto', 0);
	arrSearchFilters[4] = new nlobjSearchFilter('custrecordr7commissiondetailmanualadjust', null, 'is', 'F');
	
	var arrSearchResults = nlapiSearchRecord('customrecordr7commissiondetail', null, arrSearchFilters);
	
	for (var i = 0; arrSearchResults != null && i < arrSearchResults.length; i++) {
	
		try {
			nlapiDeleteRecord('customrecordr7commissiondetail', arrSearchResults[i].getId());
		} 
		catch (e) {
			nlapiSendEmail(55011, 55011, 'Could not delete empty comm detail rec', 'Id: ' + arrSearchResults[i].geesh() + '\nError: ' + e);
		}
	}
	
}

function createNewDetailRec(payableToId, tranId, categoryId, amountEligible){

	var newCommissionDetailRec = nlapiCreateRecord('customrecordr7commissiondetail');
	newCommissionDetailRec.setFieldValue('custrecordr7commissiondetailpayableto', payableToId);
	newCommissionDetailRec.setFieldValue('custrecordr7commissiondetailtransaction', tranId);
	newCommissionDetailRec.setFieldValue('custrecordr7commissiondetailcategory', categoryId);
	newCommissionDetailRec.setFieldValue('custrecordr7commissiondetailamountelig', amountEligible);
	newCommissionDetailRec.setFieldValue('custrecordr7commissiondetailrecalcbatchi', batchId);
	newCommissionDetailRec.setFieldValue('custrecordr7commissiondetaildtlastrecalc', nlapiDateToString(new Date(), 'datetimetz'));
	
	var employeeInactive = nlapiLookupField('employee', payableToId, 'isinactive');
	if (employeeInactive == 'T') {
	
		try {
			activateEmployee(payableToId);
			try {
				nlapiSubmitRecord(newCommissionDetailRec, true, true);
			} 
			catch (e) {
				inactivateEmployee(payableToId);
			}
			inactivateEmployee(payableToId);
		} 
		catch (e) {
			nlapiLogExecution('ERROR', 'Error on activating/inactivating employee', e);
			nlapiSendEmail(2, 2, 'Error on activating/inactivating employee', 'Employee: ' + payableToId, 'errol_fagone@rapid7.com');
		}
	}
	else {
		nlapiSubmitRecord(newCommissionDetailRec, true, true);
	}
	
}

function grabAllTranCommissionDetailRec(tranId, categoryId){
	
	var arrDetailRecs = new Array();
	
	if (tranId != null && tranId != '') {
	
		var arrSearchFilters = new Array();
		arrSearchFilters[0] = new nlobjSearchFilter('custrecordr7commissiondetailtransaction', null, 'is', tranId);
		arrSearchFilters[1] = new nlobjSearchFilter('custrecordr7commissiondetailcategory', null, 'is', categoryId);
		
		var arrSearchColumns = new Array();
		arrSearchColumns[0] = new nlobjSearchColumn('internalid');
		arrSearchColumns[1] = new nlobjSearchColumn('custrecordr7commissiondetailpayableto');
		arrSearchColumns[2] = new nlobjSearchColumn('custrecordr7commissiondetailcategory');
		arrSearchColumns[3] = new nlobjSearchColumn('custrecordr7commissiondetailamountelig');
		
		var arrSearchResults = nlapiSearchRecord('customrecordr7commissiondetail', null, arrSearchFilters, arrSearchColumns);
		
		for (var i = 0; arrSearchResults != null && i < arrSearchResults.length; i++) {
			
			var commDetailId = arrSearchResults[i].getValue(arrSearchColumns[0]);
			var payableToId = arrSearchResults[i].getValue(arrSearchColumns[1]);
			var categoryId = arrSearchResults[i].getValue(arrSearchColumns[2]);
			var amountEligibleId = arrSearchResults[i].getValue(arrSearchColumns[3]);
			
			arrDetailRecs[arrDetailRecs.length] = new Array(commDetailId, payableToId, categoryId, amountEligibleId);
		}
		
	}
	
	return arrDetailRecs;
	
}

function grabPeerSplits(recCommDetail){
	
	var payableToId = recCommDetail.getFieldValue('custrecordr7commissiondetailpayableto');
	var tranId = recCommDetail.getFieldValue('custrecordr7commissiondetailtransaction');
	var categoryId = recCommDetail.getFieldValue('custrecordr7commissiondetailcategory');
	var amountEligible = parseFloat(recCommDetail.getFieldValue('custrecordr7commissiondetailamountelig'));
	
	var arrSplitRecs = new Array();
	
	if (tranId != null && tranId != '') {
	
		var arrSearchFilters = new Array();
		arrSearchFilters[0] = new nlobjSearchFilter('custrecordr7commissiondetailtransaction', null, 'is', tranId);
		arrSearchFilters[1] = new nlobjSearchFilter('custrecordr7commissiondetailcategory', null, 'is', categoryId);
		arrSearchFilters[2] = new nlobjSearchFilter('custrecordr7commissiondetailpayableto', null, 'is', payableToId);
		arrSearchFilters[3] = new nlobjSearchFilter('custrecordr7commissiondetailsplit', null, 'is', 'T');
		arrSearchFilters[4] = new nlobjSearchFilter('internalid', null, 'noneof', recCommDetail.getId());
		
		var arrSearchColumns = new Array();
		arrSearchColumns[0] = new nlobjSearchColumn('internalid').setSort(false);
		arrSearchColumns[1] = new nlobjSearchColumn('custrecordr7commissiondetailamountelig');
		
		var arrSearchResults = nlapiSearchRecord('customrecordr7commissiondetail', null, arrSearchFilters, arrSearchColumns);
		
		for (var i = 0; arrSearchResults != null && i < arrSearchResults.length; i++) {
			
			var commDetailId = arrSearchResults[i].getValue(arrSearchColumns[0]);
			var amountEligibleId = arrSearchResults[i].getValue(arrSearchColumns[1]);
			
			arrSplitRecs[arrSplitRecs.length] = commDetailId;
		}
		
	}
	
	return arrSplitRecs;
}

function grabCurrentPlanDates(){
	
	
	var arrSearchFilters = new Array();
	arrSearchFilters[arrSearchFilters.length] = new nlobjSearchFilter('isinactive', null, 'is', 'F');
	
	if (asOfDate != null && asOfDate != '') {
		arrSearchFilters[arrSearchFilters.length] = new nlobjSearchFilter('custrecordr7commissionplanstartdate', null, 'onorbefore', asOfDate);
		arrSearchFilters[arrSearchFilters.length] = new nlobjSearchFilter('custrecordr7commissionplanenddate', null, 'onorafter', asOfDate);
	} else {
		arrSearchFilters[arrSearchFilters.length] = new nlobjSearchFilter('custrecordr7commissionplanstartdate', null, 'onorbefore', 'today');
		arrSearchFilters[arrSearchFilters.length] = new nlobjSearchFilter('custrecordr7commissionplanenddate', null, 'onorafter', 'today');
	}
	
	var arrSearchColumns = new Array();
	arrSearchColumns[0] = new nlobjSearchColumn('custrecordr7commissionplanstartdate', null, 'min');
	arrSearchColumns[1] = new nlobjSearchColumn('custrecordr7commissionplanenddate', null, 'max');
	
	var arrSearchResults = nlapiSearchRecord('customrecordr7commissionplan', null, arrSearchFilters, arrSearchColumns);
	
	if (arrSearchResults != null){
		return new Array(arrSearchResults[0].getValue(arrSearchColumns[0]), arrSearchResults[0].getValue(arrSearchColumns[1]));
	}
	
	return null;
}

function unique(a){
	a.sort(myCustomSort);
	for (var i = 1; i < a.length;) {
		if (a[i - 1][0] == a[i][0]) {
			a.splice(i, 1);
		}
		else {
			i++;
		}
	}
	return a;
}

function myCustomSort(a, b){
	var valA = a[0];
	var valB = b[0];
	
	if (valA < valB) //sort string ascending
		return -1;
	if (valA > valB) 
		return 1;
	return 0; //default return value (no sorting)
}

function getRandomString(string_length){
    var chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXTZabcdefghiklmnopqrstuvwxyz';
    var randomstring = '';
    for (var i = 0; i < string_length; i++) {
        var rnum = Math.floor(Math.random() * chars.length);
        randomstring += chars.substring(rnum, rnum + 1);
    }
    return randomstring;
}

function activateEmployee(employeeInternalId){
	nlapiLogExecution('DEBUG', 'activating employee', employeeInternalId);	
	nlapiSubmitField('employee', employeeInternalId, 'isinactive', 'F');
}

function inactivateEmployee(employeeInternalId){
	nlapiLogExecution('DEBUG', 'deactivating employee', employeeInternalId);		
	nlapiSubmitField('employee', employeeInternalId, 'isinactive', 'T');
}