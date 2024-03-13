/*
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       22 Feb 2013     efagone
 *
 */

/*
 * @param {String} type Context Types: scheduled, ondemand, userinterface, aborted, skipped
 * @returns {Void}
 */
function distributeCSV(type){

	var timeLimitInMinutes = 10;
	this.timeLimitInMilliseconds = timeLimitInMinutes * 60 * 1000;
	this.startingTime = new Date().getTime();
	this.context = nlapiGetContext();
	this.rescheduleScript = false;
	
	var searchId = context.getSetting('SCRIPT', 'custscript_z2search');
	var sendFrom = context.getSetting('SCRIPT', 'custscript_z2sendfrom');
	var sendTo = removeSpaces(context.getSetting('SCRIPT', 'custscript_z2sendto'));
	var sendCC = removeSpaces(context.getSetting('SCRIPT', 'custscript_z2sendcc'));
	var sendBCC = removeSpaces(context.getSetting('SCRIPT', 'custscript_z2sendbcc'));
	var subject = context.getSetting('SCRIPT', 'custscript_z2subject');
	var body = context.getSetting('SCRIPT', 'custscript_z2body');
	var fileName = removeSpaces(context.getSetting('SCRIPT', 'custscript_z2filename'));
	
	fileName = removeExtraExt(fileName);
	sendCC = convertToArray(sendCC);
	sendBCC = convertToArray(sendBCC);
	
	nlapiLogExecution('DEBUG', 'searchId', searchId);
	nlapiLogExecution('DEBUG', 'sendFrom', sendFrom);
	nlapiLogExecution('DEBUG', 'sendTo', sendTo);
	nlapiLogExecution('DEBUG', 'subject', subject);
	nlapiLogExecution('DEBUG', 'body', body);
	nlapiLogExecution('DEBUG', 'sendCC', sendCC);
	nlapiLogExecution('DEBUG', 'sendBCC', sendBCC);
		
	this.data = '';
		
	processSearchResults(searchId);
	
	nlapiLogExecution('DEBUG', 'data', data);
	
	// Create CSV File From Data
	var fileCSV = nlapiCreateFile(fileName + '.csv', 'CSV', data);

	try {		
		nlapiSendEmail(sendFrom, sendTo, subject, body, sendCC, sendBCC, null, fileCSV);
		nlapiLogExecution('AUDIT', 'Successfully sent CSV file', 'From: ' + sendFrom + '\nTo: ' + sendTo);
		return;
	} 
	catch (e) {
		nlapiLogExecution('ERROR', 'Could not send CSV File', 'From: ' + sendFrom + '\nTo: ' + sendTo + '\nError: ' + e);
		return;
	}
	
	if (rescheduleScript) {
		nlapiLogExecution('DEBUG', 'Rescheduling script (script/deploy id)', context.getScriptId() + ' : ' + context.getDeploymentId());
		var status = nlapiScheduleScript(context.getScriptId());
		nlapiLogExecution('DEBUG', 'Schedule Status', status);
	}
}

function processResult(eachResult, resultSetColumns){

	var row = new Array();
	
	for (var i = 0; resultSetColumns != null && i < resultSetColumns.length && unitsLeft(); i++) {
		var columnVal = eachResult.getText(resultSetColumns[i]);
		if (columnVal == null || columnVal == '') {
			columnVal = eachResult.getValue(resultSetColumns[i]);
		}
		row[row.length] = columnVal;
	}
	
	data += row + '\n';
	
	return true; // return true to keep iterating
}

function processSearchResults(searchId){

	var results = [];
	var savedsearch = nlapiLoadSearch('pricing', searchId);
	var resultSet = savedsearch.runSearch();
	var resultSetColumns = resultSet.getColumns();
	
	// Get Column Labels
	var row = new Array();
	for (var i = 0; resultSetColumns != null && i < resultSetColumns.length; i++) {
		row[row.length] = resultSetColumns[i].getLabel();
	}
	data += row + '\n';
	
	// Now get CSV Data
	var rowNum = 0;
	do {
		var resultSlice = resultSet.getResults(rowNum, rowNum + 1000);
		for (var rs in resultSlice) {
			processResult(resultSlice[rs], resultSetColumns);
			rowNum++;
		}
	}
	while (resultSlice.length >= 1000);
	
	return true;
}

function convertToArray(str){

	if (str != null && str != '') {
		return str.split(',');
	}
	
	return null;
}

function removeExtraExt(str){
	if (str != null && str != '') {
		str = str.replace(/\.csv$/g, '');
	}
	return str;
}

function removeSpaces(str){
	if (str != null && str != '') {
		str = str.replace(/\s/g, '');
	}
	return str;
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
