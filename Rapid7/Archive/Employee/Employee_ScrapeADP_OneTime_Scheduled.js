/*
 * @author efagone
 */

var objData = {};
objData.direct_deposits = [];
objData.taxes = [];

var objPayrollItems = getPayrollItemMap();

function zc_spider_emprecs_scheduled(){

	//just touching them
	var timeLimitInMinutes = 30;
	this.timeLimitInMilliseconds = timeLimitInMinutes * 60 * 1000;
	this.startingTime = new Date().getTime();
	this.context = nlapiGetContext();
	this.rescheduleScript = false;
	
	var searchRecord = 'employee';
	var searchId = 18147;
	
	var strPrevCompleted = context.getSetting('SCRIPT', 'custscriptr7empadpprevcompgen');
	nlapiLogExecution('DEBUG', 'strPrevCompleted', strPrevCompleted);
	
	var arrPrevCompleted = [];
	if (strPrevCompleted != null && strPrevCompleted != '') {
		arrPrevCompleted = strPrevCompleted.split(',');
	}
	
	var savedsearch = nlapiLoadSearch(searchRecord, searchId);
	var resultSet = savedsearch.runSearch();
	
	// Now get result data
	var rowNum = 0;
	
	do {
		var resultSlice = resultSet.getResults(rowNum, rowNum + 1000);
		for (var rs in resultSlice) {
		
			var employe_nsid = resultSlice[rs].getId();
			try {
			
				if (arrPrevCompleted.indexOf(employe_nsid) >= 0) {
					continue;
				}
				
				addEmployeeToDataObject(employe_nsid);
				
				arrPrevCompleted.push(employe_nsid);
				
				context.setPercentComplete(Math.round((arrPrevCompleted.length/1345)*100));
			} 
			catch (e) {
				nlapiLogExecution('ERROR', 'Could not spider employee id: ' + employe_nsid, e);
				continue;
			}
			rowNum++;
		}
	}
	while (resultSlice.length >= 1000);
		
	var csv_data_directdeposits = convertArrayToCSV(objData.direct_deposits);
	var csv_data_taxes = convertArrayToCSV(objData.taxes);
	
	var fileCSV_directdeposits = nlapiCreateFile('employee_directdeposit.csv', 'CSV', csv_data_directdeposits);
	var fileCSV_taxes = nlapiCreateFile('employee_taxes.csv', 'CSV', csv_data_taxes);
	
	nlapiSendEmail(55011, 55011, 'Employee exports for ADP', 'Attached is the CSV. Number of employees completed: ' + arrPrevCompleted.length + '\n\n\nEmployee IDs checked:\n\n' + arrPrevCompleted.join('\n'), null, null, null, [fileCSV_directdeposits, fileCSV_taxes]);
	
	context.setPercentComplete(100);

	if (rescheduleScript) {
		nlapiLogExecution('DEBUG', 'Rescheduling script (script/deploy id)', context.getScriptId());
		var params = new Array();
		params['custscriptr7empadpprevcompgen'] = arrPrevCompleted.join(',');
		var status = nlapiScheduleScript(context.getScriptId(), null, params);
		nlapiLogExecution('DEBUG', 'Schedule Status', status);
	}
	
}

function addEmployeeToDataObject(employe_nsid){

	var recEmployee = nlapiLoadRecord('employee', employe_nsid);
	
	// Direct Deposit Sublist
	var sublist_id = 'directdeposit';
	var lineCount = recEmployee.getLineItemCount(sublist_id);
	for (var i = 1; i <= lineCount; i++) {
		objData.direct_deposits.push({
			employe_nsid: 'r7_remove:' + employe_nsid, 
			directdeposit: 'r7_remove:' + recEmployee.getFieldValue('directdeposit'),
			accountprenoted: 'r7_remove:' + recEmployee.getLineItemValue(sublist_id, 'accountprenoted', i),
			accountstatus: 'r7_remove:' + recEmployee.getLineItemValue(sublist_id, 'accountstatus', i),
			bankname: 'r7_remove:' + recEmployee.getLineItemValue(sublist_id, 'bankname', i),
			bankaccountnumber: 'r7_remove:' + recEmployee.getLineItemValue(sublist_id, 'bankaccountnumber', i),
			bankroutingnumber: 'r7_remove:' + recEmployee.getLineItemValue(sublist_id, 'bankroutingnumber', i),
			lineid: 'r7_remove:' + recEmployee.getLineItemValue(sublist_id, 'id', i),
			amount: 'r7_remove:' + recEmployee.getLineItemValue(sublist_id, 'amount', i),
			inactive: 'r7_remove:' + recEmployee.getLineItemValue(sublist_id, 'inactive', i),
			netaccount: 'r7_remove:' + recEmployee.getLineItemValue(sublist_id, 'netaccount', i),
			savingsaccount: 'r7_remove:' + recEmployee.getLineItemValue(sublist_id, 'savingsaccount', i)
		});
	}
	
	// Taxes Sublist
	var sublist_id = 'emptaxoptions';
	var lineCount = recEmployee.getLineItemCount(sublist_id);
	for (var i = 1; i <= lineCount; i++) {
		objData.taxes.push({
			employe_nsid: 'r7_remove:' + employe_nsid,
			addlallwncname: 'r7_remove:' + recEmployee.getLineItemValue(sublist_id, 'addlallwncname', i),
			additionalallowances: 'r7_remove:' + recEmployee.getLineItemValue(sublist_id, 'additionalallowances', i),
			apply: 'r7_remove:' + recEmployee.getLineItemValue(sublist_id, 'apply', i),
			emptaxoptionsid: 'r7_remove:' + recEmployee.getLineItemValue(sublist_id, 'emptaxoptionsid', i),
			exempt: 'r7_remove:' + recEmployee.getLineItemValue(sublist_id, 'exempt', i),
			excreditsname: 'r7_remove:' + recEmployee.getLineItemValue(sublist_id, 'excreditsname', i),
			exemptioncredits: 'r7_remove:' + recEmployee.getLineItemValue(sublist_id, 'exemptioncredits', i),
			overrideamount: 'r7_remove:' + recEmployee.getLineItemValue(sublist_id, 'overrideamount', i),
			payrollitemid: 'r7_remove:' + recEmployee.getLineItemValue(sublist_id, 'payrollitemid', i),
			payrollitemname: (objPayrollItems.hasOwnProperty) ? 'r7_remove:' + objPayrollItems[recEmployee.getLineItemValue(sublist_id, 'payrollitemid', i)].name : null,
			secndallwncname: 'r7_remove:' + recEmployee.getLineItemValue(sublist_id, 'secndallwncname', i),
			secondaryallowances: 'r7_remove:' + recEmployee.getLineItemValue(sublist_id, 'secondaryallowances', i),
			status: 'r7_remove:' + recEmployee.getLineItemValue(sublist_id, 'status', i),
			taxoverridemethod: 'r7_remove:' + recEmployee.getLineItemValue(sublist_id, 'taxoverridemethod', i)
		});
	}
	
	return true;
}

function convertArrayToCSV(arrData){

	var csv_data = '';

	for (var i = 0; arrData != null && i < arrData.length; i++) {
		var objData = arrData[i];
		
		var row = [];
		
		if (i == 0) { //add header row
			for (var key in objData) {
				row.push(key);
			}
			csv_data += row + '\n';
			row = [];
		}
		
		for (var key in objData) {
			row.push(objData[key]);
		}
		
		csv_data += row + '\n';
	}
	
	return csv_data;
}

function getPayrollItemMap(){

	var payroll_items = {};

	var arrColumns = [];
	arrColumns[0] = new nlobjSearchColumn('internalid');
	arrColumns[1] = new nlobjSearchColumn('expenseaccount');
	arrColumns[2] = new nlobjSearchColumn('itemtypenohierarchy');
	arrColumns[3] = new nlobjSearchColumn('liabilityaccount');
	arrColumns[4] = new nlobjSearchColumn('masterpaycode');
	arrColumns[5] = new nlobjSearchColumn('name');

	var newSearch = nlapiCreateSearch('payrollitem');
	newSearch.setColumns(arrColumns);
	var resultSet = newSearch.runSearch();

	// Now get CSV Data
	var rowNum = 0;
	do {
		var resultSlice = resultSet.getResults(rowNum, rowNum + 1000);
		for (var rs in resultSlice) {
			payroll_items[resultSlice[rs].getValue('internalid')] = {
				id: resultSlice[rs].getValue('internalid'),
				name: resultSlice[rs].getValue('name'),
			};
			rowNum++;
		}
	}
	while (resultSlice.length >= 1000);
	
	return payroll_items;
	
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
