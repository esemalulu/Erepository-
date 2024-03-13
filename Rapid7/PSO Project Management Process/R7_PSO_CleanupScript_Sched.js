/**
 * @author efagone
 */
function cleanupPSO(){

	var timeLimitInMinutes = 10;
	this.timeLimitInMilliseconds = timeLimitInMinutes * 60 * 1000;
	this.startingTime = new Date().getTime();
	this.context = nlapiGetContext();
	this.rescheduleScript = false;
	
	try {
		stampMaxComponentEndDates();
		engagementsWithNoSID();
		componentsWithNoSID();
		linkLineItemsToEng();
		updateEngVSOEMisMatches();
		updateComponentValues();
		stampMINComponentStartDates();
	} 
	catch (e) {
		nlapiLogExecution('ERROR', 'ERROR', e);
		var adminUser =  nlapiLoadConfiguration('companypreferences').getFieldValue('custscriptr7_system_info_email_sender');
		nlapiSendEmail(adminUser, adminUser, 'Error on PSO Cleanup Script', 'Error: ' + e);
	}
	
	if (rescheduleScript) {
		nlapiLogExecution('DEBUG', 'Rescheduling script (script/deploy id)', context.getScriptId() + ' : ' + context.getDeploymentId());
		var status = nlapiScheduleScript(498);
		nlapiLogExecution('DEBUG', 'Schedule Status', status);
	}
	
}

function updateComponentValues(){
	
	var arrSearchResults = nlapiSearchRecord('customrecordr7psocomponent', 10315);
	
	for (var i = 0; arrSearchResults != null && i < arrSearchResults.length && timeLeft() && unitsLeft(); i++) {
	
		var searchResult = arrSearchResults[i];
		var cmpId = searchResult.getId();
		nlapiLogExecution('DEBUG', 'updating', cmpId);
		
		var recComponent = nlapiLoadRecord('customrecordr7psocomponent', cmpId);
		nlapiSubmitRecord(recComponent);
		
		if (i == 999) {
			arrSearchResults = nlapiSearchRecord('customrecordr7psocomponent', 10315);
			i = 0;
		}
	}
	
}

function updateEngVSOEMisMatches(){

	var arrSearchResults = nlapiSearchRecord('transaction', 11828);
	
	for (var i = 0; arrSearchResults != null && i < arrSearchResults.length && timeLeft() && unitsLeft(); i++) {
	
		var searchResult = arrSearchResults[i];
		var columns = searchResult.getAllColumns();
		var salesOrderId = searchResult.getValue(columns[0]);
		var engId = searchResult.getValue(columns[1]);
		var customerId = searchResult.getValue(columns[4]);
		var totalVSOE = searchResult.getValue(columns[8]);
		var lineID = searchResult.getValue(columns[10]);
		
		nlapiLogExecution('DEBUG', 'Updating ENG' + engId, 'New Total VSOE: ' + totalVSOE + '\nCustomer: ' + customerId + '\lineID: ' + lineID);
		
		var recEngagement = nlapiLoadRecord('customrecordr7psoengagement', engId);
		//recEngagement.setFieldValue('custrecordr7psoengcustomer', customerId);
		recEngagement.setFieldValue('custrecordr7psoengtotalvalue', totalVSOE);
		if (lineID != null && lineID != '') {
			recEngagement.setFieldValue('custrecordr7psoengsalesorderlineid', lineID);
		}
		nlapiSubmitRecord(recEngagement);

	}
}

function engagementsWithNoSID(){

	var arrSearchFilters = new Array();
	arrSearchFilters[0] = new nlobjSearchFilter('custrecordr7psoengsid', null, 'isempty');
	
	var arrSearchResults = nlapiSearchRecord('customrecordr7psoengagement', null, arrSearchFilters);
	
	for (var i = 0; arrSearchResults != null && i < arrSearchResults.length && timeLeft() && unitsLeft(); i++) {
	
		var engId = arrSearchResults[i].getId();
		
		nlapiSubmitField('customrecordr7psoengagement', engId, 'custrecordr7psoengsid', getRandomString(30));
	}
}

function componentsWithNoSID(){

	var arrSearchFilters = new Array();
	arrSearchFilters[0] = new nlobjSearchFilter('custrecordr7psocompsid', null, 'isempty');
	
	var arrSearchResults = nlapiSearchRecord('customrecordr7psocomponent', null, arrSearchFilters);
	
	for (var i = 0; arrSearchResults != null && i < arrSearchResults.length && timeLeft() && unitsLeft(); i++) {
	
		var compId = arrSearchResults[i].getId();
				
		nlapiSubmitField('customrecordr7psocomponent', compId, 'custrecordr7psocompsid', getRandomString(30));
	}
}

function linkLineItemsToEng(){

	var arrSearchResults = nlapiSearchRecord('transaction', 10659);
	
	for (var i = 0; arrSearchResults != null && i < arrSearchResults.length && timeLeft() && unitsLeft(); i++) {
	
		var searchResult = arrSearchResults[i];
		var salesOrderId = searchResult.getId();
		var columns = searchResult.getAllColumns();
		var itemId = searchResult.getValue(columns[3]);
		var lineId = searchResult.getValue(columns[5]);
		
		nlapiLogExecution('DEBUG', 'Looking for Eng with LineId', lineId);
		var arrSearchFilters = new Array();
		arrSearchFilters[0] = new nlobjSearchFilter('custrecordr7psoengsalesorderlineid', null, 'is', lineId);
		arrSearchFilters[1] = new nlobjSearchFilter('custrecordr7psoengitemnumber', null, 'is', itemId);
		
		var arrEngagementResults = nlapiSearchRecord('customrecordr7psoengagement', null, arrSearchFilters);
		
		if (arrEngagementResults != null && arrEngagementResults.length == 1) {
			var engagementId = arrEngagementResults[0].getId();
			nlapiLogExecution('DEBUG', 'Found engagement', engagementId);
			
			var recSalesOrder = nlapiLoadRecord('salesorder', salesOrderId);
			var salesOrderLineCount = recSalesOrder.getLineItemCount('item');
			
			for (var j = 1; j <= salesOrderLineCount; j++) {
				var currentLineId = recSalesOrder.getLineItemValue('item', 'id', j);

				if (currentLineId == lineId) {
					recSalesOrder.setLineItemValue('item', 'custcolr7psoengagement', j, engagementId);
					break;
				}
			}
			
			try {
				nlapiSubmitRecord(recSalesOrder, null, true);
			} 
			catch (e) {
				nlapiLogExecution('ERROR', 'Error submitting sales order', e);
			}
			
		}
		else {
			//nlapiSendEmail(55011, 55011, 'Could not find corresponding engagement', 'SalesOrderId: ' + salesOrderId + '\nLineId: ' + lineId);
		}
	}
}

function stampMaxComponentEndDates(){

	//report field
	var arrSearchResults = nlapiSearchRecord('customrecordr7psoengagement', 10738);
	
	for (var i = 0; arrSearchResults != null && i < arrSearchResults.length && timeLeft() && unitsLeft(); i++) {
		
		var searchResult = arrSearchResults[i];
		var columns = searchResult.getAllColumns();
		
		var engId = searchResult.getValue(columns[1]);
		var maxCompEndDateReport = searchResult.getValue(columns[2]);
		
		nlapiLogExecution('DEBUG', 'Submitting Max Report Date For', engId);
		nlapiSubmitField('customrecordr7psoengagement', engId, 'custrecordr7psoengdatemaxcompreport', maxCompEndDateReport);
		
	}
	
	//non-report field
	var arrSearchResults = nlapiSearchRecord('customrecordr7psoengagement', 10737);
	
	for (var i = 0; arrSearchResults != null && i < arrSearchResults.length && timeLeft() && unitsLeft(); i++) {
	
		var searchResult = arrSearchResults[i];
		var columns = searchResult.getAllColumns();
		
		var engId = searchResult.getValue(columns[1]);
		var maxCompEndDateNonReport = searchResult.getValue(columns[2]);
		
		nlapiLogExecution('DEBUG', 'Submitting Max Non-Report Date For', engId);
		nlapiSubmitField('customrecordr7psoengagement', engId, 'custrecordr7psoengdatemaxcompnonreport', maxCompEndDateNonReport);
		
	}
	
}

function stampMINComponentStartDates(){

	var arrSearchResults = nlapiSearchRecord('customrecordr7psoengagement', 13609);
	
	for (var i = 0; arrSearchResults != null && i < arrSearchResults.length && timeLeft() && unitsLeft(); i++) {
		
		var searchResult = arrSearchResults[i];
		var columns = searchResult.getAllColumns();
		
		var engId = searchResult.getValue(columns[0]);
		var minCompStart = searchResult.getValue(columns[1]);
		
		nlapiLogExecution('DEBUG', 'Submitting MIN Component Date For', engId);
		nlapiSubmitField('customrecordr7psoengagement', engId, 'custrecordr7psoengdatemincomponent', minCompStart);
		
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
