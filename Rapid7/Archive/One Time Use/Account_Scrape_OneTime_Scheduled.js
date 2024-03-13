/*
 * @author efagone
 */

var objData = {};
objData.accounts = [];

function zc_spider_accountrecs_scheduled(){

	//just touching them
	var timeLimitInMinutes = 30;
	this.timeLimitInMilliseconds = timeLimitInMinutes * 60 * 1000;
	this.startingTime = new Date().getTime();
	this.context = nlapiGetContext();
	this.rescheduleScript = false;
	
	var strPrevCompleted = context.getSetting('SCRIPT', 'custscriptr7accountprevcompscrape');
	nlapiLogExecution('DEBUG', 'strPrevCompleted', strPrevCompleted);
	
	var arrPrevCompleted = [];
	if (strPrevCompleted != null && strPrevCompleted != '') {
		arrPrevCompleted = strPrevCompleted.split(',');
	}
	
	var arrColumns = [];
	arrColumns[0] = new nlobjSearchColumn('internalid');
	
	var newSearch = nlapiCreateSearch('account');
	newSearch.setColumns(arrColumns);
	var resultSet = newSearch.runSearch();
	
	// Now get result data
	var rowNum = 0;
	
	do {
		var resultSlice = resultSet.getResults(rowNum, rowNum + 1000);
		for (var rs in resultSlice) {
		
			var account_nsid = resultSlice[rs].getId();
			try {
			
				if (arrPrevCompleted.indexOf(account_nsid) >= 0) {
					continue;
				}
				
				addAccountToDataObject(account_nsid);
				
				arrPrevCompleted.push(account_nsid);
				
				context.setPercentComplete(Math.round((arrPrevCompleted.length / 1345) * 100));
			} 
			catch (e) {
				nlapiLogExecution('ERROR', 'Could not spider account id: ' + account_nsid, e);
				continue;
			}
			rowNum++;
		}
	}
	while (resultSlice.length >= 1000);
	
	var csv_data_accounts = convertArrayToCSV(objData.accounts);
	
	var fileCSV_accounts = nlapiCreateFile('accounts_export.csv', 'CSV', csv_data_accounts);
	
	nlapiSendEmail(55011, 55011, 'Accounts export', 'Attached is the CSV. Number of accounts completed: ' + arrPrevCompleted.length + '\n\n\Accounts IDs checked:\n\n' + arrPrevCompleted.join('\n'), null, null, null, [fileCSV_accounts]);
	
	context.setPercentComplete(100);
	
	if (rescheduleScript) {
		nlapiLogExecution('DEBUG', 'Rescheduling script (script/deploy id)', context.getScriptId());
		var params = new Array();
		params['custscriptr7accountprevcompscrape'] = arrPrevCompleted.join(',');
		var status = nlapiScheduleScript(context.getScriptId(), context.getDeploymentId(), params);
		nlapiLogExecution('DEBUG', 'Schedule Status', status);
	}
	
}

function addAccountToDataObject(account_nsid){

	var recAccount = nlapiLoadRecord('account', account_nsid);
	
	// ACCOUNT DATA
	
	objData.accounts.push({
		internalid: 'r7_remove:' + account_nsid,
		isinactive: 'r7_remove:' + recAccount.getFieldValue('isinactive'),
		acctnumber: 'r7_remove:' + recAccount.getFieldValue('acctnumber'),
		accttype: 'r7_remove:' + recAccount.getFieldValue('accttype'),
		acctname: 'r7_remove:' + recAccount.getFieldValue('acctname'),
		revalue: 'r7_remove:' + recAccount.getFieldValue('revalue'),
		eliminate: 'r7_remove:' + recAccount.getFieldValue('eliminate')
	});
	
	return true;
}

function convertArrayToCSV(arrData){

	var csv_data = '';

	for (var i = 0; arrData != null && i < arrData.length; i++) {
		var objData = arrData[i];
		
		var row = [];
		
		if (i == 0) { //add header row
			for (var key in objData) {
				row.push(custom_escapeCSV(key));
			}
			csv_data += row + '\n';
			row = [];
		}
		
		for (var key in objData) {
			row.push(custom_escapeCSV(objData[key]));
		}
		
		csv_data += row + '\n';
	}
	
	return csv_data;
}

function custom_escapeCSV(str){
	
	if (isBlank(str)){
		return str;
	}
	
	str = str.replace(/'/g, '"\'"');
	return '"' + str + '"';
}

function isBlank(val){
	return (val == null || val == '') ? true : false;
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
	if (unitsLeft <= 50) {
		nlapiLogExecution('DEBUG', 'Ran out of units', 'yup');
		rescheduleScript = true;
		return false;
	}
	return true;
}
