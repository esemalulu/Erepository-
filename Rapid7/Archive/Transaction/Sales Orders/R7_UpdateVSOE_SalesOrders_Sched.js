/*
 * @author efagone
 */

function updateVSOE(){
	
	var timeLimitInMinutes = 5;
	this.timeLimitInMilliseconds = timeLimitInMinutes * 60 * 1000;
	this.startingTime = new Date().getTime();
	this.context = nlapiGetContext();
	this.rescheduleScript = false;
	
	var arrSearchResults = nlapiSearchRecord('transaction', '10570', null, null);
	var searchResultLength = arrSearchResults.length;
	var i = 0;
	while (i < arrSearchResults.length && unitsLeft() && timeLeft()) {
		var recType = arrSearchResults[i].getRecordType();
		var tranId = arrSearchResults[i].getId();
		
		var arrNewValues = new Array();
		//grab all new values for this order on subsequent search result rows
		var shouldWeBreak = false;
		while (i < arrSearchResults.length && tranId == arrSearchResults[i].getId()) {
		
			var searchResult = arrSearchResults[i];
			var columns = searchResult.getAllColumns();
			var lineId = searchResult.getValue(columns[6]);
			var newAmount = searchResult.getValue(columns[13]);
			
			//find applying tran revrecschedule
			var applyingTransaction = searchResult.getValue(columns[9]);
			var applyingTransactionLineId = searchResult.getValue(columns[11]);
			var applyingTransactionRecType = getRecTypeId(searchResult.getValue(columns[15]));
			
			try {
				var recApplyingTransaction = nlapiLoadRecord(applyingTransactionRecType, applyingTransaction);
			} 
			catch (e) {
				shouldWeBreak = true;
				break;
			}
			
			var lineCount = recApplyingTransaction.getLineItemCount('item');
			
			for (var j = 1; j <= lineCount; j++) {
				var currentLineId = recApplyingTransaction.getLineItemValue('item', 'id', j);
				
				if (currentLineId == applyingTransactionLineId) {
					var newRevRecSchedule = recApplyingTransaction.getLineItemValue('item', 'revrecschedule', j);
					break;
				}
				
			}
			
			arrNewValues[arrNewValues.length] = new Array(lineId, newAmount, newRevRecSchedule);
			i++;
			
		}
		
		if (!shouldWeBreak) {
			var recSalesOrder = nlapiLoadRecord(recType, tranId);
			//nlapiLogExecution('DEBUG', 'Loaded Record', recType + ' : ' + tranId);
			
			for (var k = 0; arrNewValues != null && k < arrNewValues.length; k++) {
				var newLineId = arrNewValues[k][0];
				var lineCount = recSalesOrder.getLineItemCount('item');
				
				for (var j = 1; j <= lineCount; j++) {
				
					var currentLineId = recSalesOrder.getLineItemValue('item', 'id', j);
					
					if (currentLineId == newLineId) {
						var newAmount = arrNewValues[k][1];
						var newRevRecSchedule = arrNewValues[k][2];
						
						recSalesOrder.setLineItemValue('item', 'vsoeallocation', j, newAmount);
						recSalesOrder.setLineItemValue('item', 'revrecschedule', j, newRevRecSchedule);
						break;
					}
				}
			}
			
			try {
				nlapiLogExecution('DEBUG', 'Submitting Record', recType + ' : ' + tranId);
				nlapiSubmitRecord(recSalesOrder, null, true);
				
			} 
			catch (e) {
				nlapiLogExecution('ERROR', e.name, e.message);
			}
		}
		
		if (i == 999) {
			rescheduleScript = true;
		}
	}
	
	
	if (rescheduleScript) {
		nlapiLogExecution('DEBUG', 'Rescheduling script (script/deploy id)', context.getScriptId() + ' : ' + context.getDeploymentId());
		var status = nlapiScheduleScript(context.getScriptId());
		nlapiLogExecution('DEBUG', 'Schedule Status', status);
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
	if (unitsLeft <= 200) {
		nlapiLogExecution('DEBUG', 'Ran out of units', 'yup');
		rescheduleScript = true;
		return false;
	}
	return true;
}