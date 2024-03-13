/*
 * @author efagone
 */

function syncOpportunities(){

	var timeLimitInMinutes = 10;
	this.timeLimitInMilliseconds = timeLimitInMinutes * 60 * 1000;
	this.startingTime = new Date().getTime();
	this.context = nlapiGetContext();
	this.rescheduleScript = false;
	
	try {
		updateOpportunityValues();
	} 
	catch (e) {
		var adminUser =  nlapiLoadConfiguration('companypreferences').getFieldValue('custscriptr7_system_info_email_sender');
		nlapiSendEmail(adminUser, adminUser, 'Error on ' + context.getScriptId(), 'Error: ' + e);
	}
	
	if (rescheduleScript) {
		nlapiLogExecution('DEBUG', 'Rescheduling script (script/deploy id)', context.getScriptId() + ' : ' + context.getDeploymentId());
		var status = nlapiScheduleScript(541);
		nlapiLogExecution('DEBUG', 'Schedule Status', status);
	}
	
}

function updateOpportunityValues(){
	
	var arrSearchResults = nlapiSearchRecord('transaction', 11738);
	
	for (var i = 0; arrSearchResults != null && i < arrSearchResults.length && timeLeft() && unitsLeft(); i++) {
	
		var searchResult = arrSearchResults[i];
		var columns = searchResult.getAllColumns();
		var oppId = searchResult.getValue(columns[0]);
		var salesOrdersAmount = searchResult.getValue(columns[4]);
		var minDateInternalReporting = searchResult.getValue(columns[8]);
		var salesOrdersCategoryPurchased = searchResult.getValue(columns[12]);
		
		var arrNewCatPurchased = new Array();
		
		if (salesOrdersCategoryPurchased != null && salesOrdersCategoryPurchased != ''){
			arrNewCatPurchased = salesOrdersCategoryPurchased.split(',');
			arrNewCatPurchased = unique(arrNewCatPurchased);
		}
		
		nlapiLogExecution('DEBUG', 'syncing', oppId);
		syncOpportunity(oppId, salesOrdersAmount, minDateInternalReporting, arrNewCatPurchased);
		
	}
	
}

function syncOpportunity(oppId, salesOrdersAmount, minDateInternalReporting, arrNewCatPurchased){
	/* if there is associated opportunity
	 * copy totalamount to opportunity.projected amount
	 * copy custbodyr7dateinternalreporting to opportunity.custbodyr7dateinternalreporting
	 */
	if (oppId != null && oppId != '') {
	
		var calulatedAmount = calculateAssociatedTotal(oppId);
		if (calulatedAmount != null) {
			salesOrdersAmount = calulatedAmount;
		}
		
		var oppRecord = nlapiLoadRecord('opportunity', oppId);
		oppRecord.setFieldValue('rangelow', 0);
		oppRecord.setFieldValue('rangehigh', salesOrdersAmount + 1);
		oppRecord.setFieldValue('projectedtotal', salesOrdersAmount);
		oppRecord.setFieldValue('custbodyr7dateinternalreporting', minDateInternalReporting);
		oppRecord.setFieldValue('custbodyr7categorypurchased', arrNewCatPurchased);
		oppRecord.setFieldValue('custbodyr7categorypurch_lastchecked', nlapiDateToString(getPSTDate(), 'datetimetz'));
		
		try {
			var id = nlapiSubmitRecord(oppRecord, false, true);
			nlapiLogExecution('DEBUG', "Submitted Opportunity Record with id", id);
		} 
		catch (e) {
			nlapiLogExecution('ERROR', 'Could not sync opp', 'Opp Id: ' + oppId + '\nError: ' + e);
			var adminUser =  nlapiLoadConfiguration('companypreferences').getFieldValue('custscriptr7_system_info_email_sender');
			nlapiSendEmail(adminUser, adminUser, 'Error on ' + context.getScriptId(), 'Opp Id: ' + oppId + '\nError: ' + e);
		}

	}
	
}

function calculateAssociatedTotal(oppId){

	var arrSearchFilters = new Array();
	arrSearchFilters[arrSearchFilters.length] = new nlobjSearchFilter('opportunity', null, 'is', oppId);
	arrSearchFilters[arrSearchFilters.length] = new nlobjSearchFilter('mainline', null, 'is', 'T');
		
	var searchResults = nlapiSearchRecord('salesorder', null, arrSearchFilters);
	
	var sum = 0;
	for (var i = 0; searchResults != null && i < searchResults.length; i++) {
	
		var salesOrderId = searchResults[i].getId();
		var recSalesOrder = nlapiLoadRecord('salesorder', salesOrderId);
				
		var subtotal = 0;
		var discountTotal = 0;
		var shippingTotal = 0;
		
		if (recSalesOrder.getFieldValue('subtotal') != null) {
			subtotal = parseFloat(recSalesOrder.getFieldValue('subtotal'));
		}
		if (recSalesOrder.getFieldValue('discounttotal') != null) {
			discountTotal = parseFloat(recSalesOrder.getFieldValue('discounttotal'));
		}
		if (recSalesOrder.getFieldValue('altshippingcost') != null) {
			shippingTotal = parseFloat(recSalesOrder.getFieldValue('altshippingcost'));
		}
		
		sum += subtotal + discountTotal + shippingTotal;
		
	}
	
	if (sum != 0 && !isNaN(sum)) {
		return sum;
	}
	else {
		return null;
	}
}

function getPSTDate(){
	var now = new Date();
	now.setHours(now.getHours() + 3);
	return now;
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
