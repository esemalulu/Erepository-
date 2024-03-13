/*
 * @author efagone
 */

function afterSubmit(type){

	if (type != 'delete') {
		this.debugMode = false;
		var recCommDetail = nlapiLoadRecord(nlapiGetRecordType(), nlapiGetRecordId());
		var manualAdjustment = recCommDetail.getFieldValue('custrecordr7commissiondetailmanualadjust');
		if (manualAdjustment != 'T') {
			if (recCommDetail.getFieldValue('custrecordr7commissiondetailpayableto') == 127328 && (nlapiGetRecordId() == 14491)){
				debugMode = true;
			}
			if (debugMode) if (debugMode) nlapiLogExecution('DEBUG', 'BEGIN', '--------------------------------');
			processCommissionRecord(recCommDetail);
			if (debugMode) if (debugMode) nlapiLogExecution('DEBUG', 'END', '--------------------------------');
		} 
		else {
			var amountEligible = parseFloat(recCommDetail.getFieldValue('custrecordr7commissiondetailamountelig'));
			var percentage = parseFloat(recCommDetail.getFieldValue('custrecordr7commissiondetailpercentage'));
			
			if (amountEligible != null && amountEligible != '' && percentage != null && percentage != '') {
				nlapiSubmitField(nlapiGetRecordType(), nlapiGetRecordId(), 'custrecordr7commissiondetailcommission', amountEligible * (percentage / 100));
			}
		}
	}
}

function processCommissionRecord(recCommDetail){

	var transactionId = recCommDetail.getFieldValue('custrecordr7commissiondetailtransaction');
	
	if (transactionId != null && transactionId != '') {
		var transactionType = nlapiLookupField('transaction', transactionId, 'type', 'text');
		
		if (transactionType == 'Credit Memo' || transactionType == 'Cash Refund') {
			var appliedToTransactionId = nlapiLookupField('transaction', transactionId, 'appliedtotransaction');
			
			var success = updateAmountsToOriginal(recCommDetail, appliedToTransactionId);
			if (!success) {
				findAndUpdateCommissionInfo(recCommDetail);
			}
		}
		else {
		
			findAndUpdateCommissionInfo(recCommDetail);
		}
	}
	else {
		findAndUpdateCommissionInfo(recCommDetail);
	}
	
}

function findAndUpdateCommissionInfo(recCommDetail){

	var payableToId = recCommDetail.getFieldValue('custrecordr7commissiondetailpayableto');
	var transactionId = recCommDetail.getFieldValue('custrecordr7commissiondetailtransaction');
	var categoryId = recCommDetail.getFieldValue('custrecordr7commissiondetailcategory');
	var batchId = recCommDetail.getFieldValue('custrecordr7commissiondetailrecalcbatchi');
	var amountEligible = parseFloat(recCommDetail.getFieldValue('custrecordr7commissiondetailamountelig'));
	var amountEligibleOrig = amountEligible;
	var isSplit = recCommDetail.getFieldValue('custrecordr7commissiondetailsplit');
	
	if (amountEligible != null && amountEligible !== '' && transactionId != null && transactionId != '') {
	
		var salesEffectiveDate = nlapiLookupField('transaction', transactionId, 'saleseffectivedate');
		var arrAllActivePlans = grabCurrentPlanInformation(payableToId, categoryId, salesEffectiveDate);
		var arrMilestones = new Array();
		
		var arrCommDetailsToExclude = new Array();
		
		if (isSplit == 'T') {
			arrCommDetailsToExclude = grabPeerSplits(recCommDetail);
		}
		arrCommDetailsToExclude[arrCommDetailsToExclude.length] = nlapiGetRecordId();
		
		for (var i = 0; arrAllActivePlans != null && i < arrAllActivePlans.length; i++) {
		
			var arrCurrentPlan = arrAllActivePlans[i];
			var planId = arrCurrentPlan['internalid'];
			var planSalesThreshold = parseFloat(arrCurrentPlan['custrecordr7commissionplantotalsales']);
			var percentage = parseFloat(arrCurrentPlan['custrecordr7commissionplanpercentage']);
			var totalSalesToDate = findAllEligibleSalesTotal(recCommDetail, arrCurrentPlan, arrCommDetailsToExclude);
			if (debugMode) 
				nlapiLogExecution('DEBUG', 'totalSalesToDate', totalSalesToDate);
			if (debugMode) 
				nlapiLogExecution('DEBUG', 'planSalesThreshold', planSalesThreshold);
			
			var nextMilestone = planSalesThreshold - totalSalesToDate;
			
			if ((amountEligible + totalSalesToDate) < planSalesThreshold) {
				break;
			}
			if (debugMode) 
				nlapiLogExecution('DEBUG', 'nextMilestone', nextMilestone);
			if (totalSalesToDate >= planSalesThreshold) {
				if (debugMode) 
					nlapiLogExecution('DEBUG', 'current', 'yep');
				arrMilestones[0] = new Array(planId, nextMilestone, percentage);
				
			}
			else {
				if (debugMode) 
					nlapiLogExecution('DEBUG', 'next', 'yep');
				arrMilestones[arrMilestones.length] = new Array(planId, nextMilestone, percentage);
			}
			
		}
		
		var fields = new Array();
		fields[0] = 'custrecordr7commissiondetailcommissionpl';
		fields[1] = 'custrecordr7commissiondetailamountelig';
		fields[2] = 'custrecordr7commissiondetailpercentage';
		fields[3] = 'custrecordr7commissiondetailcommission';
		fields[4] = 'custrecordr7commissiondetailrecalcbatchi';
		
		var values = new Array();
		values[4] = batchId;
		if (arrMilestones != null) {
		
			var arrPeerSplits = new Array();
			
			if (arrMilestones.length > 1) {
				arrPeerSplits = grabPeerSplits(recCommDetail);
				fields[5] = 'custrecordr7commissiondetailsplit';
				values[5] = 'T';
			}
			else 
				if (arrMilestones.length <= 1 && isSplit == 'T') {
					arrPeerSplits = grabPeerSplits(recCommDetail);
				}
			
			for (var j = 0; arrMilestones != null && j < arrMilestones.length; j++) {
			
				var planId = arrMilestones[j][0];
				var nextMilestone = arrMilestones[j][1];
				var percentage = arrMilestones[j][2];
				
				values[0] = planId;
				values[1] = Math.round(amountEligible * 100) / 100;
				values[2] = percentage;
				values[3] = Math.round((values[1] * (values[2] / 100)) * 100) / 100;
				
				if ((j + 1) < arrMilestones.length && arrMilestones[j + 1][1] >= 0 && amountEligible > arrMilestones[j + 1][1]) {
				
					followingMilestone = arrMilestones[j + 1][1];
					amountEligible = amountEligible - followingMilestone;
					
					values[1] = followingMilestone;
					values[3] = Math.round((values[1] * (values[2] / 100)) * 100) / 100;
				}
				
				if (j == 0) {
				
					nlapiSubmitField(recCommDetail.getRecordType(), recCommDetail.getId(), fields, values);
				}
				else 
					if (arrPeerSplits != null && j <= arrPeerSplits.length) {
						nlapiSubmitField(recCommDetail.getRecordType(), arrPeerSplits[j - 1], fields, values);
						arrPeerSplits.splice(j - 1, 1);
					}
					else {
						var newCommissionDetailRec = nlapiCopyRecord(nlapiGetRecordType(), nlapiGetRecordId());
						newCommissionDetailRec.setFieldValue('custrecordr7commissiondetailcommissionpl', planId);
						newCommissionDetailRec.setFieldValue('custrecordr7commissiondetailamountelig', amountEligible);
						newCommissionDetailRec.setFieldValue('custrecordr7commissiondetailpercentage', percentage);
						newCommissionDetailRec.setFieldValue('custrecordr7commissiondetailcommission', amountEligible * (percentage / 100));
						var recId = nlapiSubmitRecord(newCommissionDetailRec, true, true);
					}
				
			}
			
			values[0] = planId;
			values[1] = 0;
			values[2] = percentage;
			values[3] = values[1] * (values[2] / 100);
			
			for (var k = 0; arrPeerSplits != null && k < arrPeerSplits.length; k++) {
			
				nlapiSubmitField(recCommDetail.getRecordType(), arrPeerSplits[k], fields, values);
			}
			
		}
		else {
			values[0] = '';
			values[1] = amountEligibleOrig;
			values[2] = 0;
			values[3] = values[1] * (values[2] / 100);
			nlapiSubmitField(recCommDetail.getRecordType(), recCommDetail.getId(), fields, values);
		}
		
	}
	else 
		if (transactionId != null && transactionId != '') {
		
			var fields = new Array();
			fields[0] = 'custrecordr7commissiondetailcommissionpl';
			fields[1] = 'custrecordr7commissiondetailamountelig';
			fields[2] = 'custrecordr7commissiondetailpercentage';
			fields[3] = 'custrecordr7commissiondetailcommission';
			
			var values = new Array();
			values[0] = '';
			values[1] = 0;
			values[2] = 0;
			values[3] = 0;
			nlapiSubmitField(recCommDetail.getRecordType(), recCommDetail.getId(), fields, values);
		}
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

function grabCurrentPlanInformation(payableToId, categoryId, salesEffectiveDate){

	var arrSearchFilters = new Array();
	arrSearchFilters[arrSearchFilters.length] = new nlobjSearchFilter('isinactive', null, 'is', 'F');
	arrSearchFilters[arrSearchFilters.length] = new nlobjSearchFilter('custrecordr7commissionplanemployee', null, 'is', payableToId);
	arrSearchFilters[arrSearchFilters.length] = new nlobjSearchFilter('custrecordr7commissionplancategory', null, 'is', categoryId);
	arrSearchFilters[arrSearchFilters.length] = new nlobjSearchFilter('custrecordr7commissionplanstartdate', null, 'onorbefore', salesEffectiveDate);
	arrSearchFilters[arrSearchFilters.length] = new nlobjSearchFilter('custrecordr7commissionplanenddate', null, 'onorafter', salesEffectiveDate);
	
	var arrSearchColumns = new Array();
	arrSearchColumns[0] = new nlobjSearchColumn('custrecordr7commissionplancategory');
	arrSearchColumns[1] = new nlobjSearchColumn('custrecordr7commissionplantotalsales').setSort(false);
	arrSearchColumns[2] = new nlobjSearchColumn('custrecordr7commissionplanpercentage');
	arrSearchColumns[3] = new nlobjSearchColumn('custrecordr7commissionplanmanagerplan');
	arrSearchColumns[4] = new nlobjSearchColumn('custrecordr7commissionplanthresholdcalc');
	arrSearchColumns[5] = new nlobjSearchColumn('custrecordr7commissionplanstartdate');
	arrSearchColumns[6] = new nlobjSearchColumn('custrecordr7commissionplanenddate');
	
	var arrSearchResults = nlapiSearchRecord('customrecordr7commissionplan', null, arrSearchFilters, arrSearchColumns);
	
	var arrAllActivePlans = new Array();
	for (var i = 0; arrSearchResults != null && i < arrSearchResults.length; i++) {
	
		var arrCurrentPlan = new Array();
		arrCurrentPlan['internalid'] = arrSearchResults[i].getId();
		arrCurrentPlan['custrecordr7commissionplancategory'] = arrSearchResults[i].getValue(arrSearchColumns[0]);
		arrCurrentPlan['custrecordr7commissionplantotalsales'] = arrSearchResults[i].getValue(arrSearchColumns[1]);
		arrCurrentPlan['custrecordr7commissionplanpercentage'] = arrSearchResults[i].getValue(arrSearchColumns[2]);
		arrCurrentPlan['custrecordr7commissionplanmanagerplan'] = arrSearchResults[i].getValue(arrSearchColumns[3]);
		arrCurrentPlan['custrecordr7commissionplanthresholdcalc'] = arrSearchResults[i].getValue(arrSearchColumns[4]);
		arrCurrentPlan['custrecordr7commissionplanstartdate'] = arrSearchResults[i].getValue(arrSearchColumns[5]);
		arrCurrentPlan['custrecordr7commissionplanenddate'] = arrSearchResults[i].getValue(arrSearchColumns[6]);
		arrAllActivePlans[arrAllActivePlans.length] = arrCurrentPlan;
				
	}
	
	return arrAllActivePlans;
}

function findAllEligibleSalesTotal(recCommDetail, arrCurrentPlan, arrCommDetailsToExclude){

	var payableToId = recCommDetail.getFieldValue('custrecordr7commissiondetailpayableto');
	var categoryId = recCommDetail.getFieldValue('custrecordr7commissiondetailcategory');
	var planSalesThreshold = parseFloat(arrCurrentPlan['custrecordr7commissionplantotalsales']);
	var managerPlan = arrCurrentPlan['custrecordr7commissionplanmanagerplan'];
	var thresholdCategoryId = arrCurrentPlan['custrecordr7commissionplanthresholdcalc'];
	var planStart = arrCurrentPlan['custrecordr7commissionplanstartdate'];
	var planEnd = arrCurrentPlan['custrecordr7commissionplanenddate'];
	
	var fieldsToLookup = new Array('saleseffectivedate', 'datecreated');
	
	var lookedUpFields = nlapiLookupField('transaction', recCommDetail.getFieldValue('custrecordr7commissiondetailtransaction'), fieldsToLookup);
	var salesEffectiveDate = lookedUpFields['saleseffectivedate'];
	var tranDateCreated = lookedUpFields['datecreated'];
	
	var arrSearchFilters = new Array();
	
	arrSearchFilters[arrSearchFilters.length] = new nlobjSearchFilter('custrecordr7commissiondetailpayableto', null, 'is', payableToId);
	
	if (managerPlan != 'T') {
		arrSearchFilters[arrSearchFilters.length] = new nlobjSearchFilter('salesrep', 'custrecordr7commissiondetailtransaction', 'is', payableToId);
	}
	
	arrSearchFilters[arrSearchFilters.length] = new nlobjSearchFilter('internalid', null, 'noneof', arrCommDetailsToExclude);
	arrSearchFilters[arrSearchFilters.length] = new nlobjSearchFilter('mainline', 'custrecordr7commissiondetailtransaction', 'is', 'T');
	arrSearchFilters[arrSearchFilters.length] = new nlobjSearchFilter('custrecordr7commissiondetailcategory', null, 'noneof', 6);
	
	if (salesEffectiveDate != null && salesEffectiveDate != '') {
		arrSearchFilters[arrSearchFilters.length] = new nlobjSearchFilter('saleseffectivedate', 'custrecordr7commissiondetailtransaction', 'onorafter', planStart);
		arrSearchFilters[arrSearchFilters.length - 1].setLeftParens(1);
		arrSearchFilters[arrSearchFilters.length] = new nlobjSearchFilter('saleseffectivedate', 'custrecordr7commissiondetailtransaction', 'before', salesEffectiveDate);
		arrSearchFilters[arrSearchFilters.length - 1].setOr(true);
		arrSearchFilters[arrSearchFilters.length] = new nlobjSearchFilter('saleseffectivedate', 'custrecordr7commissiondetailtransaction', 'on', salesEffectiveDate);
		arrSearchFilters[arrSearchFilters.length - 1].setLeftParens(1);
		arrSearchFilters[arrSearchFilters.length] = new nlobjSearchFilter('datecreated', 'custrecordr7commissiondetailtransaction', 'before', tranDateCreated);
		arrSearchFilters[arrSearchFilters.length - 1].setLeftParens(1);
		arrSearchFilters[arrSearchFilters.length - 1].setOr(true);
		arrSearchFilters[arrSearchFilters.length] = new nlobjSearchFilter('internalidnumber', 'null', 'lessthanorequalto', nlapiGetRecordId());
		arrSearchFilters[arrSearchFilters.length - 1].setLeftParens(1);
		arrSearchFilters[arrSearchFilters.length] = new nlobjSearchFilter('internalid', 'custrecordr7commissiondetailtransaction', 'anyof', recCommDetail.getFieldValue('custrecordr7commissiondetailtransaction'));
		arrSearchFilters[arrSearchFilters.length - 1].setRightParens(4);
	}
		
	if (thresholdCategoryId == 2 && categoryId != null && categoryId != '') {
		arrSearchFilters[arrSearchFilters.length] = new nlobjSearchFilter('custrecordr7commissiondetailcategory', null, 'is', categoryId);
	}
	
	var arrSearchColumns = new Array();
	arrSearchColumns[0] = new nlobjSearchColumn('custrecordr7commissiondetailamountelig', null, 'sum');
	
	var arrSearchResults = nlapiSearchRecord('customrecordr7commissiondetail', null, arrSearchFilters, arrSearchColumns);
	
	if (arrSearchResults != null) {
		var totalSalesToDate = arrSearchResults[0].getValue(arrSearchColumns[0]);
		
		if (totalSalesToDate == null || totalSalesToDate == '') {
			totalSalesToDate = 0;
		}
		return Math.round(totalSalesToDate * 100) / 100;
	}
	else {
		return 0;
	}
	
}

function updateAmountsToOriginal(recCommDetail, appliedToTransactionId){

	var arrSearchFilters = new Array();
	arrSearchFilters[0] = new nlobjSearchFilter('internalid', null, 'noneof', recCommDetail.getId());
	arrSearchFilters[1] = new nlobjSearchFilter('custrecordr7commissiondetailpayableto', null, 'is', recCommDetail.getFieldValue('custrecordr7commissiondetailpayableto'));
	arrSearchFilters[2] = new nlobjSearchFilter('custrecordr7commissiondetailtransaction', null, 'is', appliedToTransactionId);
	arrSearchFilters[3] = new nlobjSearchFilter('custrecordr7commissiondetailcategory', null, 'is', recCommDetail.getFieldValue('custrecordr7commissiondetailcategory'));
	
	var arrSearchColumns = new Array();
	arrSearchColumns[0] = new nlobjSearchColumn('custrecordr7commissiondetailcommissionpl');
	arrSearchColumns[1] = new nlobjSearchColumn('custrecordr7commissiondetailamountelig');
	arrSearchColumns[2] = new nlobjSearchColumn('custrecordr7commissiondetailpercentage');
	arrSearchColumns[3] = new nlobjSearchColumn('custrecordr7commissiondetailcommission');
	
	var arrSearchResults = nlapiSearchRecord('customrecordr7commissiondetail', null, arrSearchFilters, arrSearchColumns);
	
	if (arrSearchResults != null) {
	
		var fields = new Array();
		fields[0] = 'custrecordr7commissiondetailcommissionpl';
		fields[1] = 'custrecordr7commissiondetailamountelig';
		fields[2] = 'custrecordr7commissiondetailpercentage';
		fields[3] = 'custrecordr7commissiondetailcommission';
		
		var values = new Array();
		values[0] = arrSearchResults[0].getValue(arrSearchColumns[0]);
		values[1] = recCommDetail.getFieldValue('custrecordr7commissiondetailamountelig');
		values[2] = arrSearchResults[0].getValue(arrSearchColumns[2]);
		values[3] = parseFloat(values[1]) * (parseFloat(values[2]) / 100);
		
		nlapiSubmitField(recCommDetail.getRecordType(), recCommDetail.getId(), fields, values);
		
		return true;
		
	}
	
	return false;
}
