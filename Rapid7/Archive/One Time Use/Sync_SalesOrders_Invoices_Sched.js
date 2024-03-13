/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       30 Nov 2012     efagone
 *
 */

/**
 * @param {String} type Context Types: scheduled, ondemand, userinterface, aborted, skipped
 * @returns {Void}
 */
function syncNow(){

	var timeLimitInMinutes = 10;
	this.timeLimitInMilliseconds = timeLimitInMinutes * 60 * 1000;
	this.startingTime = new Date().getTime();
	this.context = nlapiGetContext();
	this.rescheduleScript = false;
	
	try {
		syncOrderToInvCashSale();
	} 
	catch (e) {
		nlapiSendEmail(55011, 55011, 'Error on Sync Sales order Invoice Script', 'Error: ' + e);
	}
	
	if (rescheduleScript) {
		nlapiLogExecution('DEBUG', 'Rescheduling script (script/deploy id)', context.getScriptId() + ' : ' + context.getDeploymentId());
		var status = nlapiScheduleScript(context.getScriptId());
		nlapiLogExecution('DEBUG', 'Schedule Status', status);
	}
	
}

function syncOrderToInvCashSale(){

	var arrSearchResults = nlapiSearchRecord('transaction', 12643);
	
	if (arrSearchResults != null) {
	
		var i = 0;
		while (i < arrSearchResults.length && unitsLeft() && timeLeft()) {
			var searchResult = arrSearchResults[i];
			var columns = searchResult.getAllColumns();
			var recType = searchResult.getValue(columns[0]);
			recType = getRecTypeId(recType);
			var tranId = searchResult.getValue(columns[1]);
			var nextTranId = tranId;
			
			var arrNewValues = new Array();
			//grab all new values for this order on subsequent search result rows
			while (i < arrSearchResults.length && tranId == nextTranId) {
			
				var searchResult = arrSearchResults[i];
				var columns = searchResult.getAllColumns();
				var lineId = searchResult.getValue(columns[2]);
				var newLicenseIdText = searchResult.getValue(columns[7]);
				var newPSOEngId = searchResult.getValue(columns[8]);
				var newProductKey = searchResult.getValue(columns[9]);
				
				arrNewValues[arrNewValues.length] = new Array(lineId, newLicenseIdText, newPSOEngId, newProductKey);
				i++;
				
				if (i < arrSearchResults.length) {
					var nextSearchResult = arrSearchResults[i];
					nextTranId = nextSearchResult.getValue(columns[1]);
				}
				
			}
			
			var recTransaction = nlapiLoadRecord(recType, tranId);
			
			var submitRec = false;
			for (var k = 0; arrNewValues != null && k < arrNewValues.length; k++) {
				var newLineId = arrNewValues[k][0];
				var lineCount = recTransaction.getLineItemCount('item');
				
				for (var j = 1; j <= lineCount; j++) {
				
					var currentLineId = recTransaction.getLineItemValue('item', 'line', j);
					
					if (currentLineId == newLineId) {
					
						recTransaction.setLineItemValue('item', 'custcolr7translicenseid', j, arrNewValues[k][1]);
						//recTransaction.setLineItemValue('item', 'custcolr7psoengagement', j, arrNewValues[k][2]); // No need to sync this anymore.. in fact could be bad to sync in future
						//also need to update the search to include eng mismatches
						recTransaction.setLineItemValue('item', 'custcolr7itemmsproductkey', j, arrNewValues[k][3]);
						submitRec = true;
						break;
					}
				}
			}
			
			if (submitRec) {
				try {
					nlapiLogExecution('DEBUG', 'Submitting Record', recType + ' : ' + tranId);
					nlapiSubmitRecord(recTransaction, false, true);
					
				} 
				catch (e) {
					nlapiLogExecution('ERROR', e.name, e.message);
				}
			}
			
			if (i == 999) {
				rescheduleScript = true;
			}
		}
	}
}

function getRecTypeId(recType){

	switch (recType) {
		case 'CustInvc':
			recType = 'invoice';
			break;
		case 'CashSale':
			recType = 'cashsale';
			break;
	}
	
	return recType;
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
