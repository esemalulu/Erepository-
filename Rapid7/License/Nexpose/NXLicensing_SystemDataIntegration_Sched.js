// MB: 10/16/15 - Remove Environment Check as part of APTCM-129 - NetSuite-Nexpose License Integration Authentication Updates

function doTheIntegration(){
	
	var timeLimitInMinutes = 20;
	var dtStart = new Date();
	this.timeLimitInMilliseconds = timeLimitInMinutes * 60 * 1000;
	this.startingTime = dtStart.getTime();
	this.context = nlapiGetContext();
	this.rescheduleScript = false;
	
	var dtNow = new Date();
	var dtNow_utc = new Date(dtNow.getUTCFullYear(), dtNow.getUTCMonth(), dtNow.getUTCDate(),  dtNow.getUTCHours(), dtNow.getUTCMinutes(), dtNow.getUTCSeconds());
	var dtNow_utc_1HrAgo = new Date(dtNow_utc.getTime() - 60 * 60000);
	
	var dtFinalContact = dtNow_utc_1HrAgo;
	var intervalMinutes = 45;
	var loopCount = 0;
	do {
		var numLicensesProcessed = 0;
		var arrLicDetails = grabLicenseDetails('getLicenses', null, intervalMinutes);
		var arrLicenses = arrLicDetails[0];
		var timeStop = arrLicDetails[2];
		
		dtFinalContact = createDateObject(timeStop);
			
		if (arrLicenses != null) {
			nlapiLogExecution('AUDIT', '# Licenses Found', arrLicenses.length);
			
			for (var i = 0; i < arrLicenses.length && unitsLeft() && timeLeft(); i++) {
			
				//Process license one at a time
				var objLicense = arrLicenses[i];
				
				var processed = updateLicense(objLicense, false, timeStop); //library script
				if (processed) {
					numLicensesProcessed++;
				}
			}
			
			nlapiLogExecution('AUDIT', '# Licenses Processed', numLicensesProcessed);

			nlapiLogExecution('AUDIT', 'timeStop', timeStop);
			nlapiLogExecution('AUDIT', 'dtFinalContact', dtFinalContact);
			nlapiLogExecution('AUDIT', 'CUTTOFF TIME', dtNow_utc_1HrAgo);
			
		}
		else {
			nlapiLogExecution('AUDIT', '# Licenses Found', 0);
		}
		
		if (numLicensesProcessed <= 1) {
			intervalMinutes = intervalMinutes + 240;
		}
		loopCount++;
		
		if (dtFinalContact >= dtNow_utc_1HrAgo) {
			break;
		}
		
	}
	while (!rescheduleScript && (numLicensesProcessed <= 1 && loopCount <= 5) && unitsLeft() && timeLeft());
	
	if (dtFinalContact < dtNow_utc_1HrAgo) {
		rescheduleScript = true;
	}
	
	//Chain to yourself if there are results left to process.
	if (rescheduleScript) {
		nlapiLogExecution('DEBUG', 'Attempting to Chain to', 'itself');
		nlapiScheduleScript(context.getScriptId());
	}
	
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

function unitsLeft(){
	var unitsLeft = context.getRemainingUsage();
	if (unitsLeft <= 100) {
		nlapiLogExecution('AUDIT', 'Ran out of units', 'yup');
		rescheduleScript = true;
		return false;
	}
	return true;
}
