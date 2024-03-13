/*
 * @author efagone
 */

function updateASAClass(){

	var timeLimitInMinutes = 5;
	this.timeLimitInMilliseconds = timeLimitInMinutes * 60 * 1000;
	this.startingTime = new Date().getTime();
	this.context = nlapiGetContext();
	this.rescheduleScript = false;
	
	try {
		//updateASA();
		//updateClass();

	} 
	catch (e) {
		nlapiSendEmail(55011, 55011, 'Error on ASA/Class update script', 'Error: ' + e);
	}
	
	
	if (rescheduleScript) {
		nlapiLogExecution('DEBUG', 'Rescheduling script (script/deploy id)', context.getScriptId() + ' : ' + context.getDeploymentId());
		var status = nlapiScheduleScript(context.getScriptId(), context.getDeploymentId());
		nlapiLogExecution('DEBUG', 'Schedule Status', status);
	}

}

function updateASA(){

	var arrSearchResults = nlapiSearchRecord('transaction', 10856);
	
	for (var i = 0, j = 1; arrSearchResults != null && i < arrSearchResults.length && unitsLeft() && timeLeft(); i++, j++) {
	
		var searchResult = arrSearchResults[i];
		var recType = searchResult.getRecordType();
		var tranId = searchResult.getId();
		
		var recTransaction = nlapiLoadRecord(recType, tranId);
		nlapiLogExecution('DEBUG', 'Loaded Record', recType + ' : ' + tranId);
		
		var lineCount = recTransaction.getLineItemCount('item');
		
		for (var k = 1; k <= lineCount && unitsLeft() && timeLeft(); k++) {
			var VSOE = recTransaction.getLineItemValue('item', 'vsoeallocation', k);
			var currentAltSales = recTransaction.getLineItemValue('item', 'altsalesamt', k);
			nlapiLogExecution('DEBUG', 'VSOE', VSOE);
			nlapiLogExecution('DEBUG', 'currentAltSales', currentAltSales);
						
			if (VSOE != currentAltSales) {
				nlapiLogExecution('DEBUG', 'Setting altsalesamt to', VSOE + '\nLine: ' + k);
				recTransaction.setLineItemValue('item', 'altsalesamt', k, VSOE);
			}
		}
		
		try {
			nlapiLogExecution('DEBUG', 'Submitting Record', recType + ' : ' + tranId);
			nlapiSubmitRecord(recTransaction, null, true);
		} 
		catch (e) {
			nlapiLogExecution('ERROR', e.name, e.message);
		}
		
		if (j < arrSearchResults.length) {
		
			while (tranId == arrSearchResults[j].getId()) {
				i++;
				j++;
			}
		}
		
		if (i == 999) {
			arrSearchResults = nlapiSearchRecord('transaction', 10856);
			i = 0;
			j = 1;
		}
	}
}

function updateClass(){

	var arrSearchResults = nlapiSearchRecord('transaction', 10857);
	
	var i=0;
	while (arrSearchResults != null && i < arrSearchResults.length && unitsLeft() && timeLeft()) {
	
		var recType = arrSearchResults[i].getRecordType();
		var tranId = arrSearchResults[i].getId();
		
		var recTransaction = nlapiLoadRecord(recType, tranId);
		nlapiLogExecution('DEBUG', 'Loaded Record', recType + ' : ' + tranId);
		
		var lineCount = recTransaction.getLineItemCount('item');
		
		while (tranId == arrSearchResults[i].getId()) {
			var searchResult = arrSearchResults[i];
			var columns = searchResult.getAllColumns();
			var searchLineId = searchResult.getValue(columns[1]);
			var classToSet = searchResult.getValue(columns[4]);
			
			for (var k = 1; k <= lineCount && unitsLeft() && timeLeft(); k++) {
				var lineId = recTransaction.getLineItemValue('item', 'id', k);
				
				if (lineId == searchLineId) {
					nlapiLogExecution('DEBUG', 'Setting class to', classToSet + '\nLine: ' + k);
					recTransaction.setLineItemValue('item', 'class', k, classToSet);
				}
			}
			
			i++;
		}
		
		try {
			nlapiLogExecution('DEBUG', 'Submitting Record', recType + ' : ' + tranId);
			nlapiSubmitRecord(recTransaction, true, true);
		} 
		catch (e) {
			nlapiLogExecution('ERROR', e.name, e.message);
		}
		
		
		if (i == 999) {
			arrSearchResults = nlapiSearchRecord('transaction', 10857);
			i = 0;
		}
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