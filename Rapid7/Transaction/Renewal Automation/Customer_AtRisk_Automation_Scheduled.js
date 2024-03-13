/*
 * @author efagone
 */

function updateRenewalStatus(){
	
	var timeLimitInMinutes = 10;
	this.timeLimitInMilliseconds = timeLimitInMinutes * 60 * 1000;
	this.startingTime = new Date().getTime();
	this.context = nlapiGetContext();
	this.rescheduleScript = false;
	
	processAtRiskCheckbox();
	processRenewalStatus();
	processNextRenewalDate();
	
	if (rescheduleScript) {
		nlapiLogExecution('DEBUG', 'Rescheduling script (script/deploy id)', context.getScriptId() + ' : ' + context.getDeploymentId());
		var status = nlapiScheduleScript(context.getScriptId(), context.getDeploymentId());
		nlapiLogExecution('DEBUG', 'Schedule Status', status);
	}
	
}

function processAtRiskCheckbox(){

	var arrSearchResults = nlapiSearchRecord('customer', 10604);
	
	for (var i = 0; arrSearchResults != null && i < arrSearchResults.length && timeLeft() && unitsLeft(); i++) {
	
		var searchResult = arrSearchResults[i];
		var columns = searchResult.getAllColumns();
		var customerId = searchResult.getValue(columns[0]);
		var currentAtRisk = searchResult.getValue(columns[2]);
		
		var updateAtRisk = 'F';
		
		if (currentAtRisk == 'F') {
			updateAtRisk = 'T';
		}
		
		try {
			nlapiSubmitField('customer', customerId, 'custentityr7customeratrisk', updateAtRisk);
		} 
		catch (e) {
			var adminUser =  nlapiLoadConfiguration('companypreferences').getFieldValue('custscriptr7_system_info_email_sender');
			nlapiSendEmail(adminUser, adminUser, 'Could not update customer record', 'processAtRiskCheckbox(): ' + e);
		}
	}
	
}

function processNextRenewalDate(){

	var arrSearchResults = nlapiSearchRecord('customer', 12565);
	
	for (var i = 0; arrSearchResults != null && i < arrSearchResults.length && timeLeft() && unitsLeft(); i++) {
	
		var searchResult = arrSearchResults[i];
		var columns = searchResult.getAllColumns();
		var customerId = searchResult.getValue(columns[0]);
		var nextRenewalDate = searchResult.getValue(columns[2]);
		
		try {
			nlapiSubmitField('customer', customerId, 'custentityr7nextrenewaldate', nextRenewalDate);
		} 
		catch (e) {
			nlapiSendEmail(55011, 55011, 'Could not update customer record', 'processNextRenewalDate(): ' + e);
		}
	}
	
}

function processRenewalStatus(){

	var arrSearchResults = nlapiSearchRecord('customer', 11128);
	
	for (var i = 0; arrSearchResults != null && i < arrSearchResults.length && timeLeft() && unitsLeft(); i++) {
	
		var searchResult = arrSearchResults[i];
		var columns = searchResult.getAllColumns();
		var customerId = searchResult.getValue(columns[0]);
		var renewalInProcess = searchResult.getValue(columns[5]);

		try {
			nlapiSubmitField('customer', customerId, 'custentityr7renewalstatus', renewalInProcess);
		} 
		catch (e) {
			nlapiSendEmail(55011, 55011, 'Could not update customer record', 'processRenewalStatus(): ' + e);
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
	if (unitsLeft <= 100) {
		nlapiLogExecution('DEBUG', 'Ran out of units', 'yup');
		rescheduleScript = true;
		return false;
	}
	return true;
}
