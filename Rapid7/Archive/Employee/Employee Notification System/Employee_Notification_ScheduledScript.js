/*
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       23 May 2013     efagone
 *
 */

function createLilGuys(){

	var timeLimitInMinutes = 10;
	this.timeLimitInMilliseconds = timeLimitInMinutes * 60 * 1000;
	this.startingTime = new Date().getTime();
	this.context = nlapiGetContext();
	this.rescheduleScript = false;
		
	var arrSearchResults = nlapiSearchRecord('customrecordr7employeenotificationsystem', 14504);
	
	for (var i = 0; arrSearchResults != null && i < arrSearchResults.length && timeLeft() && unitsLeft(); i++) {
	
		var searchResult = arrSearchResults[i];
		
		try {
			var columns = searchResult.getAllColumns();
			
			var objNotification = new Object();
			objNotification.id = searchResult.getId();
			objNotification.employees = stringResultToArray(searchResult.getValue(columns[2]));
			objNotification.departments = stringResultToArray(searchResult.getValue(columns[3]));
			objNotification.locations = stringResultToArray(searchResult.getValue(columns[4]));
			objNotification.groups = stringResultToArray(searchResult.getValue(columns[5]));
			objNotification.owner = searchResult.getValue(columns[6]);

			var arrEmployeesToCreate = grabEmployeesToCreate(objNotification);
			
			for (var j = 0; arrEmployeesToCreate != null && j < arrEmployeesToCreate.length && unitsLeft() && timeLeft(); j++) {
			
				var recMsgSent = nlapiCreateRecord('customrecordr7employeenotificationmsgsnt');
				recMsgSent.setFieldValue('custrecordr7employeenotifyheader', objNotification.id);
				recMsgSent.setFieldValue('custrecordr7employeenotifyemployee', arrEmployeesToCreate[j]);
				nlapiSubmitRecord(recMsgSent);
			}
			
			if (!rescheduleScript) {
				nlapiSubmitField('customrecordr7employeenotificationsystem', objNotification.id, 'custrecordr7employeenotificationprocess', 'T');
			}
		}
		catch (e) {
			nlapiLogExecution('ERROR', 'Could not process Emp Notify Record', 'Record ID: ' + searchResult.getId() + '\nError: ' + e);
		}
	}
		
	//Chain to yourself if there are results left to process.
	if (rescheduleScript) {
		nlapiLogExecution('DEBUG', 'Attempting to Chain to', 'itself');
		nlapiScheduleScript(context.getScriptId());
	}
}

function grabEmployeesToCreate(objNotification){

	var arrRelatedEmployees = new Array();
	var objProcessedEmployees = grabAlreadyCreatedEmployees(objNotification);
	
	var arrFilters = new Array();
	arrFilters[arrFilters.length] = new nlobjSearchFilter('isinactive', null, 'is', 'F');
	arrFilters[arrFilters.length] = new nlobjSearchFilter('custentityr7employeeseparationreason', null, 'anyof', '@NONE@');
	arrFilters[arrFilters.length] = new nlobjSearchFilter('releasedate', null, 'isempty');
	
	var setLeft = false;
	
	//OWNER
	if (objNotification.owner != null && objNotification.owner != '') {
		arrFilters[arrFilters.length] = new nlobjSearchFilter('internalid', null, 'anyof', objNotification.owner);
		if (!setLeft) {
			arrFilters[arrFilters.length - 1].setLeftParens(1);
			setLeft = true;
		}
		arrFilters[arrFilters.length - 1].setOr(true);
	}
	
	//EMPLOYEE
	if (objNotification.employees != null && objNotification.employees.length > 0) {
		arrFilters[arrFilters.length] = new nlobjSearchFilter('internalid', null, 'anyof', objNotification.employees);
		if (!setLeft) {
			arrFilters[arrFilters.length - 1].setLeftParens(1);
			setLeft = true;
		}
		arrFilters[arrFilters.length - 1].setOr(true);
	}
	
	//DEPARTMENT
	if (objNotification.departments != null && objNotification.departments.length > 0) {
		arrFilters[arrFilters.length] = new nlobjSearchFilter('department', null, 'anyof', objNotification.departments);
		if (!setLeft) {
			arrFilters[arrFilters.length - 1].setLeftParens(1);
			setLeft = true;
		}
		arrFilters[arrFilters.length - 1].setOr(true);
	}
	
	//LOCATION
	if (objNotification.locations != null && objNotification.locations.length > 0) {
		arrFilters[arrFilters.length] = new nlobjSearchFilter('location', null, 'anyof', objNotification.locations);
		if (!setLeft) {
			arrFilters[arrFilters.length - 1].setLeftParens(1);
			setLeft = true;
		}
		arrFilters[arrFilters.length - 1].setOr(true);
	}
	
	//GROUP
	if (objNotification.groups != null && objNotification.groups.length > 0) {
		arrFilters[arrFilters.length] = new nlobjSearchFilter('group', null, 'anyof', objNotification.groups);
	}
	
	if (setLeft) {
		arrFilters[arrFilters.length - 1].setRightParens(1);
	}
	
	var arrColumns = new Array();
	arrColumns[0] = new nlobjSearchColumn('internalid').setSort(true);
	
	var newSearch = nlapiCreateSearch('employee');
	newSearch.setFilters(arrFilters);
	newSearch.setColumns(arrColumns);
	var resultSet = newSearch.runSearch();
	
	var rowNum = 0;
	do {
		var resultSlice = resultSet.getResults(rowNum, rowNum + 1000);
		for (var rs in resultSlice) {
			var result = resultSlice[rs];
			if (!objProcessedEmployees.hasOwnProperty(result.getId())) {
				arrRelatedEmployees[arrRelatedEmployees.length] = result.getId();
			}
			rowNum++;
		}
	}
	while (resultSlice.length >= 1000);
	
	return arrRelatedEmployees;
}

function grabAlreadyCreatedEmployees(objNotification){

	var objProcessedEmployees = new Object();
	
	var arrFilters = new Array();
	arrFilters[arrFilters.length] = new nlobjSearchFilter('custrecordr7employeenotifyheader', null, 'anyof', objNotification.id);
	
	var arrColumns = new Array();
	arrColumns[0] = new nlobjSearchColumn('custrecordr7employeenotifyemployee').setSort(true);
	
	var newSearch = nlapiCreateSearch('customrecordr7employeenotificationmsgsnt');
	newSearch.setFilters(arrFilters);
	newSearch.setColumns(arrColumns);
	var resultSet = newSearch.runSearch();
	
	var rowNum = 0;
	do {
		var resultSlice = resultSet.getResults(rowNum, rowNum + 1000);
		for (var rs in resultSlice) {
			var result = resultSlice[rs];
			objProcessedEmployees[result.getValue(arrColumns[0])] = true;
			rowNum++;
		}
	}
	while (resultSlice.length >= 1000);
	
	return objProcessedEmployees;
}

function stringResultToArray(strResult){

	var arrResult = new Array();
	if (strResult != null && strResult != '') {
		arrResult = strResult.split(",");
	}
	return arrResult;
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
	if (unitsLeft <= 500) {
		nlapiLogExecution('DEBUG', 'Ran out of units', 'yup');
		rescheduleScript = true;
		return false;
	}
	return true;
}
