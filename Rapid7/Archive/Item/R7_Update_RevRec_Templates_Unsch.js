/*
 * @author efagone
 */

function updateRevRec(){
/*
	var timeLimitInMinutes = 10;
	this.timeLimitInMilliseconds = timeLimitInMinutes * 60 * 1000;
	this.startingTime = new Date().getTime();
	this.context = nlapiGetContext();
	this.rescheduleScript = false;
	
	this.arrSearchResults = nlapiSearchRecord('transaction', '9379', null, null);
	var searchResultLength = arrSearchResults.length;
	
	for (var i = 0, j = 1; i < arrSearchResults.length && unitsLeft() && timeLeft(); i++, j++) {
	
		var searchResult = arrSearchResults[i];
		var recType = searchResult.getRecordType();
		var tranId = searchResult.getId();
		
		var recTransaction = nlapiLoadRecord(recType, tranId);
		nlapiLogExecution('DEBUG', 'Loaded Record', recType + ' : ' + tranId);
		
		var lineCount = recTransaction.getLineItemCount('item');
		
		for (var k = 1; k <= lineCount && unitsLeft() && timeLeft(); k++) {
			var currentTemplate = recTransaction.getLineItemValue('item', 'revrecschedule', k);
			var currentItem = recTransaction.getLineItemValue('item', 'item', k);
			var currentLocation = recTransaction.getLineItemValue('item', 'location', k);
			
			if (currentItem == 86 && (currentLocation == null || currentLocation == '')) {
				nlapiLogExecution('DEBUG', 'Setting location for appliance', 'Line: ' + k);
				var tranLocation = recTransaction.getFieldValue('location');
				recTransaction.setLineItemValue('item', 'location', k, tranLocation);
			}
			
			if (currentTemplate == 1) {
				nlapiLogExecution('DEBUG', 'Setting revrecschedule to 15769', 'Line: ' + k);
				recTransaction.setLineItemValue('item', 'revrecschedule', k, '15769');
			}
		}
		
		try {
			nlapiLogExecution('DEBUG', 'Submitting Record', recType + ' : ' + tranId);
			nlapiSubmitRecord(recTransaction, null, true);
		} 
		catch (e) {
			nlapiLogExecution('ERROR', e.name, e.message);
		}
		
		if (j < searchResultLength) {
		
			while (tranId == arrSearchResults[j].getId()) {
				i++;
				j++;
				
			}
		}
	}
	
	if (rescheduleScript) {
		nlapiLogExecution('DEBUG', 'Rescheduling script (script/deploy id)', context.getScriptId() + ' : ' + context.getDeploymentId());
		var status = nlapiScheduleScript(context.getScriptId(), context.getDeploymentId());
		nlapiLogExecution('DEBUG', 'Schedule Status', status);
	}
*/
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