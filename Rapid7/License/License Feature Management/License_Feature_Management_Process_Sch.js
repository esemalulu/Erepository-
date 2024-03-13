/*
 * @author efagone
 */

function processFeatures(){

	//Main Script
	var timeLimitInMinutes = 10;
	this.timeLimitInMilliseconds = timeLimitInMinutes * 60 * 1000;
	this.startingTime = new Date().getTime();
	this.context = nlapiGetContext();
	this.rescheduleScript = false;
	
	var arrLicensesToProcess = nlapiSearchRecord('customrecordr7licensefeaturemanagement', 10012);
	
	if (arrLicensesToProcess != null) {
		nlapiScheduleScript(542); //sync even
		nlapiScheduleScript(545); //sync odd
	}
	/*
	 else {
	 for (var i = 0; arrLicensesToProcess != null && i < arrLicensesToProcess.length && timeLeft() && unitsLeft(); i++) {
	 var licenseToProcess = arrLicensesToProcess[i];
	 var columns = licenseToProcess.getAllColumns();
	 var recordType = licenseToProcess.getValue(columns[0]);
	 var licenseId = licenseToProcess.getValue(columns[1]);
	 var recLicense = nlapiLoadRecord(recordType, licenseId);
	 
	 processEverything(recLicense); //library script
	 if (i == 999) {
	 arrSearchResults = nlapiSearchRecord('customrecordr7licensefeaturemanagement', 10012);
	 i = -1;
	 }
	 }
	 
	 if (rescheduleScript) {
	 nlapiLogExecution('DEBUG', 'Rescheduling script (script/deploy id)', context.getScriptId() + ' : ' + context.getDeploymentId());
	 var status = nlapiScheduleScript(498, 3);
	 nlapiLogExecution('DEBUG', 'Schedule Status', status);
	 }
	 
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
	if (unitsLeft <= 300) {
		nlapiLogExecution('DEBUG', 'Ran out of units', 'yup');
		rescheduleScript = true;
		return false;
	}
	return true;
}