/*
 * @author efagone
 */

function processFeatures(){

	//ODD Script
	var timeLimitInMinutes = 10;
	this.timeLimitInMilliseconds = timeLimitInMinutes * 60 * 1000;
	this.startingTime = new Date().getTime();
	this.context = nlapiGetContext();
	this.rescheduleScript = false;
	
	var arrLicensesToProcess = nlapiSearchRecord('customrecordr7licensefeaturemanagement', 10012);
	
	for (var i = 0; arrLicensesToProcess != null && i < arrLicensesToProcess.length && timeLeft() && unitsLeft(); i++) {
		var licenseToProcess = arrLicensesToProcess[i];
		var columns = licenseToProcess.getAllColumns();
		var recordType = licenseToProcess.getValue(columns[0]);
		var activationKey = licenseToProcess.getValue(columns[1]);
		
		var licenseId = findLicenseIdByPK(recordType, activationKey);
		
		if (licenseId == null){
			markFMRsProcessed(recordType, activationKey, false, 'Could not find PK');
			continue;
		}
		
		if (!isEven(licenseId)) {
		
			var recLicense = nlapiLoadRecord(recordType, licenseId);
			
			processEverything(recLicense); //library script
		}

		if (i == 999) {
			arrSearchResults = nlapiSearchRecord('customrecordr7licensefeaturemanagement', 10012);
			i = -1;
		}
	}
	
	if (rescheduleScript) {
		nlapiLogExecution('DEBUG', 'Rescheduling script (script/deploy id)', context.getScriptId() + ' : ' + context.getDeploymentId());
		var status = nlapiScheduleScript(context.getScriptId());
		nlapiLogExecution('DEBUG', 'Schedule Status', status);
	}
}

function isEven(someNumber){

	someNumber = parseInt(someNumber);
	if (isNaN(someNumber)) {
		return false;
	}
	
	var result = (someNumber % 2 == 0);
	return result;
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