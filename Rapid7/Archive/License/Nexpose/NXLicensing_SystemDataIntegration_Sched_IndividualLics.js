// MB: 10/16/15 - Remove Environment Check as part of APTCM-129 - NetSuite-Nexpose License Integration Authentication Updates

function doTheIntegration(){

	var timeLimitInMinutes = 10;
	this.timeLimitInMilliseconds = timeLimitInMinutes * 60 * 1000;
	this.startingTime = new Date().getTime();
	this.context = nlapiGetContext();
	this.rescheduleScript = false;
	
	var arrSearchResults = nlapiSearchRecord('customrecordr7nexposelicensing', 14019);
	
	for (var i = 0; arrSearchResults != null && i < arrSearchResults.length && timeLeft() && unitsLeft(); i++) {
	
		var searchResult = arrSearchResults[i];
		var columns = arrSearchResults[i].getAllColumns();
		var productKey = searchResult.getValue(columns[1]);
		try {
			//Process license one at a time
			var objLicense = grabLicenseDetails('getLicense', productKey);
			
			updateLicense(objLicense, true); //library script
		} 
		catch (e) {
			nlapiLogExecution('ERROR', 'FAILED TO UPDATE LICENSE', productKey + ': ' + e);
		}
		
	}
	
	//Chain to yourself if there are results left to process.
	if ((arrSearchResults != null && (i < arrSearchResults.length || i > 999)) || rescheduleScript) {
		nlapiLogExecution('DEBUG', 'Attempting to Chain to', 'itself');
		nlapiScheduleScript(context.getScriptId());
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
