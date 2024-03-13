/*
 * @author efagone
 */

function combineBookingCategories(){

	var timeLimitInMinutes = 20;
	this.timeLimitInMilliseconds = timeLimitInMinutes * 60 * 1000;
	this.startingTime = new Date().getTime();
	this.context = nlapiGetContext();
	this.rescheduleScript = false;
	
	updateTransactionCategoryPurchased();
	updateCustomerCategoryPurchased();
	
	nlapiLogExecution('AUDIT', 'Finished Script', 'Thank you and have a good day.');
	
	if (rescheduleScript) {
		nlapiLogExecution('AUDIT', 'Rescheduling script (script/deploy id)', 'yup');
		var status = nlapiScheduleScript(context.getScriptId());
		nlapiLogExecution('DEBUG', 'Schedule Status', status);
	}

}

function updateTransactionCategoryPurchased(){

	var arrTranSearchIds = new Array();
	arrTranSearchIds[arrTranSearchIds.length] = 10198; //salesorder
	arrTranSearchIds[arrTranSearchIds.length] = 17431; //invoice
	arrTranSearchIds[arrTranSearchIds.length] = 17430; //opportunity
	arrTranSearchIds[arrTranSearchIds.length] = 17432; //cashsale + creditmemo
	
	for (var k = 0; k < arrTranSearchIds.length; k++) {
		try {
			var currentSearchId = arrTranSearchIds[k];
			var arrSearchResults = nlapiSearchRecord('transaction', currentSearchId);
			if (arrSearchResults == null) {
				nlapiLogExecution('AUDIT', 'No transaction results found: ' + currentSearchId, 'moving on');
				continue;
			}

			nlapiLogExecution('AUDIT', 'Number of transactions results: ' + currentSearchId, arrSearchResults.length);
			
			var countProcessed = 0;
			for (var i = 0; arrSearchResults != null && i < arrSearchResults.length && timeLeft() && unitsLeft(); i++) {
			
				var searchResult = arrSearchResults[i];
				var columns = searchResult.getAllColumns();
				var transactionId = searchResult.getValue(columns[0]);
				var transactionType = searchResult.getValue(columns[1]);
				var strNewCatPurchased = searchResult.getValue(columns[4]);
				
				var arrNewCatPurchased = new Array();
				if (strNewCatPurchased != null && strNewCatPurchased != '') {
					arrNewCatPurchased = strNewCatPurchased.split(',');
				}
				nlapiLogExecution('DEBUG', 'Processing transaction - cat active', transactionId);
				
				var fields = new Array();
				fields[0] = 'custbodyr7categorypurchased';
				fields[1] = 'custbodyr7categorypurch_lastchecked';
				
				var values = new Array();
				values[0] = arrNewCatPurchased;
				values[1] = nlapiDateToString(getPSTDate(), 'datetimetz');
				
				try {
					nlapiSubmitField(getTranTypeId(transactionType), transactionId, fields, values);
					countProcessed++;
				} 
				catch (e) {
					nlapiLogExecution('ERROR', 'Could not submit Categories Purchased for ' + transactionType + ': ' + transactionId, e.name + ' :: ' + e.message);
				}
				
				if (i == 999) {
					arrSearchResults = nlapiSearchRecord('transaction', currentSearchId);
					i = -1;
				}
			}
			nlapiLogExecution('AUDIT', 'Number of transactions processed: ' + currentSearchId, countProcessed);
		} 
		catch (e) {
			nlapiLogExecution('ERROR', 'ERROR', e);
		}
	}
}

function updateCustomerCategoryPurchased(){

	var arrCustomerSearchIds = new Array();
	arrCustomerSearchIds[arrCustomerSearchIds.length] = 14090;
	
	for (var k = 0; k < arrCustomerSearchIds.length; k++) {
		try {
		
			var currentSearchId = arrCustomerSearchIds[k];
			var arrSearchResults = nlapiSearchRecord('customer', currentSearchId);
			if (arrSearchResults == null) {
				nlapiLogExecution('AUDIT', 'No customer results found: ' + currentSearchId, 'moving on');
				continue;
			}
			
			nlapiLogExecution('AUDIT', 'Number of customer results', arrSearchResults.length);
			
			var countProcessed = 0;
			for (var i = 0; arrSearchResults != null && i < arrSearchResults.length && timeLeft() && unitsLeft(); i++) {
			
				var searchResult = arrSearchResults[i];
				var columns = searchResult.getAllColumns();
				var customerId = searchResult.getValue(columns[0]);
				var strNewCatLifetime = searchResult.getValue(columns[3]);
				var strNewCatActive = searchResult.getValue(columns[7]);
				
				var arrNewCatLifetime = new Array();
				if (strNewCatLifetime != null && strNewCatLifetime != '') {
					arrNewCatLifetime = strNewCatLifetime.split(',');
				}
				
				var arrNewCatActive = new Array();
				if (strNewCatActive != null && strNewCatActive != '') {
					arrNewCatActive = strNewCatActive.split(',');
				}
				
				nlapiLogExecution('DEBUG', 'Processing customer - cat purchased', customerId);
				
				var fields = new Array();
				fields[0] = 'custentityr7categorylifetime';
				fields[1] = 'custentityr7categoryactive';
				fields[2] = 'custentityr7categoryactivelastchecked';
				
				var values = new Array();
				values[0] = arrNewCatLifetime;
				values[1] = arrNewCatActive;
				values[2] = nlapiDateToString(getPSTDate(), 'datetimetz');
				
				try {
					nlapiSubmitField('customer', customerId, fields, values);
					countProcessed++;
				} 
				catch (e) {
					nlapiLogExecution('ERROR', 'Could not submit Categories Purchased for Customer ' + customerId, e.name + ' :: ' + e.message);
				}
				
				if (i == 999) {
					arrSearchResults = nlapiSearchRecord('customer', currentSearchId);
					i = -1;
				}
			}
			nlapiLogExecution('AUDIT', 'Number of customers processed', countProcessed);
			
		} 
		catch (e) {
			nlapiLogExecution('ERROR', 'ERROR', e);
		}
	}
}

function getPSTDate(){
	var now = new Date();
	now.setHours(now.getHours() + 3);
	return now;
}

function timeLeft(){
	var presentTime = new Date().getTime();
	if (presentTime - startingTime > timeLimitInMilliseconds) {
		nlapiLogExecution('AUDIT', 'Ran out of time', 'yup');
		rescheduleScript = true;
		return false;
	}
	return true;
}

function getTranTypeId(type){

	switch (type) {
		case 'CashSale':
			type = 'cashsale';
			break;
		case 'CustInvc':
			type = 'invoice';
			break;
		case 'CustCred':
			type = 'creditmemo';
			break;
		case 'Opprtnty':
			type = 'opportunity';
			break;
		case 'SalesOrd':
			type = 'salesorder';
			break;
	}
	
	return type;
}

function unitsLeft(){
	var unitsLeft = context.getRemainingUsage();
	if (unitsLeft <= 100) {
		nlapiLogExecution('AUDIT', 'Ran out of units', 'yup');
		rescheduleScript = true;
		return false;
	}
	return true;
}