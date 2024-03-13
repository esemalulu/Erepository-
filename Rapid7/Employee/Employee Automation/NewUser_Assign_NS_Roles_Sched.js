/**
 * @param {String}
 *            type Context Types: scheduled, ondemand, userinterface, aborted,
 *            skipped
 * @returns {Void}
 */

var NEW_USER_EMAIL_TEMPLATE_ID = 257;
var objTemplateVersionMap = {};

function autoLoginGo(type) {

	var timeLimitInMinutes = 10;
	this.timeLimitInMilliseconds = timeLimitInMinutes * 60 * 1000;
	this.startingTime = new Date().getTime();
	this.context = nlapiGetContext();
	this.rescheduleScript = false;

	var arrSearchResults = nlapiSearchRecord('employee', 14316);

	for ( var i = 0; arrSearchResults != null && i < arrSearchResults.length && timeLeft() && unitsLeft(); i++) {
		
		var searchResult = arrSearchResults[i];
		
		try {	
			var columns = searchResult.getAllColumns();

			var objEmployee = new Object();
			objEmployee.id = searchResult.getId();
			objEmployee.name = searchResult.getValue(columns[1]);
			objEmployee.email = searchResult.getValue(columns[2]);
			objEmployee.jobtitle = searchResult.getValue(columns[3]);
			objEmployee.supervisorEmail = searchResult.getValue(columns[4]);
			objEmployee.supervisorId = searchResult.getValue(columns[14]);
			objEmployee.department = searchResult.getValue(columns[5]);
			objEmployee.departmentText = searchResult.getText(columns[5]);
			objEmployee.location = searchResult.getValue(columns[6]);
			objEmployee.locationText = searchResult.getText(columns[6]);
			objEmployee.subsidiary = searchResult.getValue(columns[7]);
			objEmployee.employeetype = searchResult.getValue(columns[8]);
			objEmployee.issalesrep = searchResult.getValue(columns[9]) == 'T' ? 1 : 2;
			objEmployee.issupportrep = searchResult.getValue(columns[10]) == 'T' ? 1 : 2;
			objEmployee.ismanagement = searchResult.getValue(columns[11]) == 'T' ? 1 : 2;
			objEmployee.isbdr = searchResult.getValue(columns[12]) == 'T' ? 1 : 2;
			objEmployee.isaccountmanager = searchResult.getValue(columns[13]) == 'T' ? 1 : 2;
			objEmployee.newpassword = getRandomString(13);
			objEmployee = getRolesForEmployee(objEmployee);
			
			if (objEmployee.newRoleIds == null || objEmployee.newRoleIds.length < 1){
				//NO ROLES FOUND... DO NOTHING!
				continue;
			}
			
			var recEmployee = nlapiLoadRecord('employee', objEmployee.id);
			recEmployee.setFieldValue('giveaccess', 'T');
			recEmployee.setFieldValue('inheritiprules', 'T');
			recEmployee = setEmployeeRoles(recEmployee, objEmployee.newRoleIds);

			//setting new pw
			recEmployee.setFieldValue('password', objEmployee.newpassword);
			recEmployee.setFieldValue('password2', objEmployee.newpassword);
			recEmployee.setFieldValue('requirepwdchange', 'T');

			nlapiSubmitRecord(recEmployee);

			sendSupervisorNotifications(objEmployee);
			sendUserNotification(objEmployee);
		}
		catch (e) {
			var adminUser =  nlapiLoadConfiguration('companypreferences').getFieldValue('custscriptr7_system_info_email_sender');
			nlapiSendEmail(adminUser, adminUser, 'ERROR on login automation', 'Employee ID: ' + searchResult.getId() + '\nError: ' + e);
		}

	}

	if (rescheduleScript) {
		nlapiLogExecution('DEBUG', 'Rescheduling script', context.getScriptId());
		var status = nlapiScheduleScript(context.getScriptId());
		nlapiLogExecution('DEBUG', 'Schedule Status', status);
	}

}

function setEmployeeRoles(recEmployee, arrRoles) {

	for ( var i = 0; arrRoles != null && i < arrRoles.length; i++) {

		var roleId = arrRoles[i];
		nlapiLogExecution('DEBUG', 'Setting Role', roleId);
		recEmployee.selectNewLineItem('roles');
		recEmployee.setCurrentLineItemValue('roles', 'selectedrole', roleId);
		recEmployee.commitLineItem('roles');
	}

	return recEmployee;
}

function getRolesForEmployee(objEmployee) {

	var arrRoleIds = new Array();
	var arrRoleNames = new Array();

	if (objEmployee.id != null && objEmployee.id != '') {

		var arrFilters = new Array();
		arrFilters[arrFilters.length] = new nlobjSearchFilter('custrecordr7employeelogindepartment', null, 'anyof', new Array('@NONE@', objEmployee.department));
		arrFilters[arrFilters.length] = new nlobjSearchFilter('custrecordr7employeeloginlocation', null, 'anyof', new Array('@NONE@', objEmployee.location));
		arrFilters[arrFilters.length] = new nlobjSearchFilter('custrecordr7employeeloginsubsidiary', null, 'anyof', new Array('@NONE@', objEmployee.subsidiary));
		arrFilters[arrFilters.length] = new nlobjSearchFilter('custrecordr7employeeloginemployeetype', null, 'anyof', new Array('@NONE@', objEmployee.employeetype));
		arrFilters[arrFilters.length] = new nlobjSearchFilter('custrecordr7employeeloginsalesrep', null, 'anyof', new Array('3', objEmployee.issalesrep));
		arrFilters[arrFilters.length] = new nlobjSearchFilter('custrecordr7employeeloginsupportrep', null, 'anyof', new Array('3', objEmployee.issupportrep));
		arrFilters[arrFilters.length] = new nlobjSearchFilter('custrecordr7employeeloginmanagement', null, 'anyof', new Array('3', objEmployee.ismanagement));
		arrFilters[arrFilters.length] = new nlobjSearchFilter('custrecordr7employeeloginisbdr', null, 'anyof', new Array('3', objEmployee.isbdr));
		arrFilters[arrFilters.length] = new nlobjSearchFilter('custrecordr7employeeloginisacctmanager', null, 'anyof', new Array('3', objEmployee.isaccountmanager));

		var arrColumns = new Array();
		arrColumns[0] = new nlobjSearchColumn('internalid');
		arrColumns[1] = new nlobjSearchColumn('custrecordr7employeeloginaccessrole').setSort(true);

		var newSearch = nlapiCreateSearch('customrecordr7employeeloginautomation');
		newSearch.setFilters(arrFilters);
		newSearch.setColumns(arrColumns);
		var resultSet = newSearch.runSearch();

		var rowNum = 0;
		do {
			var resultSlice = resultSet.getResults(rowNum, rowNum + 1000);
			for ( var rs in resultSlice) {
				var result = resultSlice[rs];

				arrRoleIds[arrRoleIds.length] = result.getValue(arrColumns[1]);
				arrRoleNames[arrRoleNames.length] = result.getText(arrColumns[1]);

				rowNum++;
			}
		}
		while (resultSlice.length >= 1000);
	}

	objEmployee.newRoleIds = arrRoleIds;
	objEmployee.newRoleNames = arrRoleNames;
	return objEmployee;
}

function sendSupervisorNotifications(objEmployee){

	try {
		//SEND SUPERVISOR NOTIFY EMAIL
		
		var from = context.getPreference('custscriptr7emploginauto_sender') || 106223954; //Netsuite Admin

		var subject = 'NetSuite Login Confirmation';
		
		var body = '';
		body += 'NetSuite login access has been automatically provided to the following person:<br><br>';
		
		body += '&emsp;&emsp;Name: ' + objEmployee.name + '<br>';
		body += '&emsp;&emsp;Department: ' + objEmployee.departmentText + '<br>';
		body += '&emsp;&emsp;Location: ' + objEmployee.locationText + '<br>';
		body += '&emsp;&emsp;Email: ' + objEmployee.email + '<br>';
		body += '&emsp;&emsp;Job Title: ' + objEmployee.jobtitle + '<br><br>';
		body += '&emsp;&emsp;Role(s):<br>';
		
		for (var role in objEmployee.newRoleNames) {
			body += '&emsp;&emsp;&emsp;&emsp;' + objEmployee.newRoleNames[role] + '<br>';
		}
		
		
		
		nlapiSendEmail(from, objEmployee.id, subject, body, ['Netsuite_Admin@rapid7.com', objEmployee.supervisorEmail]);
	} 
	catch (e) {
		var adminUser =  nlapiLoadConfiguration('companypreferences').getFieldValue('custscriptr7_system_info_email_sender');
		nlapiSendEmail(adminUser, adminUser, 'Could not send supervisor notification of new user email', 'Employee ID: ' + objEmployee.id);
	}
	
}

function sendUserNotification(objEmployee){

	var from = context.getPreference('custscriptr7emploginauto_sender') || nlapiLoadConfiguration('companypreferences').getFieldValue('custscriptr7_system_info_email_sender'); //Netsuite Admin
	
	try {
		//SEND USER EMAIL
		var custFields = {
			'NLCUSTOMPASSWORD': objEmployee.newpassword
		};
		
		var subject, body;
		
		var templateVersion = (objTemplateVersionMap.hasOwnProperty(NEW_USER_EMAIL_TEMPLATE_ID)) ? objTemplateVersionMap[NEW_USER_EMAIL_TEMPLATE_ID] : nlapiLoadRecord('emailtemplate', NEW_USER_EMAIL_TEMPLATE_ID).getFieldValue('templateversion');
		objTemplateVersionMap[NEW_USER_EMAIL_TEMPLATE_ID] = templateVersion;
		
		if(templateVersion != 'FREEMARKER') { // CRMSDK Note: this is being deprecated.
			var merge = nlapiMergeRecord(NEW_USER_EMAIL_TEMPLATE_ID, 'employee', objEmployee.id, null, null, custFields);
			subject = merge.getName();
			body = merge.getValue();
		}
		else { // the new FREEMARKER
			var emailMerger = nlapiCreateEmailMerger(NEW_USER_EMAIL_TEMPLATE_ID);
			emailMerger.setEntity('employee', objEmployee.id);

			var mergeResult = emailMerger.merge();
			subject = mergeResult.getSubject();
			body = mergeResult.getBody();
			
			// This is a kludge to fix the loss of the 6th parameter of nlapiMergeRecord
			// Substitute the custFields values into places where the custFields keys appear.
			for(var key in custFields) {
				nlapiLogExecution('DEBUG',key,custFields[key]);
				var regex = new RegExp('\<'+key+'\>', 'g');
				subject = subject.replace(regex, custFields[key]);
				body = body.replace(regex, custFields[key]);
			}
		}

		nlapiSendEmail(from, objEmployee.email, subject, body);
		
	} 
	catch (e) {
		var adminUser =  nlapiLoadConfiguration('companypreferences').getFieldValue('custscriptr7_system_info_email_sender');
		nlapiSendEmail(adminUser, from, 'Could not send new user email', 'Employee ID: ' + objEmployee.id);
	}
}

function getRandomString(string_length) {
	var chars = '23456789ABCDEFGHJKLMNPQRSTUVWXTZabcdefghkmnpqrstuvwxyz!!!!!';
	var randomstring = '';
	for ( var i = 0; i < string_length; i++) {
		var rnum = Math.floor(Math.random() * chars.length);
		randomstring += chars.substring(rnum, rnum + 1);
	}

	randomstring = randomstring + '7';
	return randomstring;
}

function timeLeft() {
	var presentTime = new Date().getTime();
	if (presentTime - startingTime > timeLimitInMilliseconds) {
		nlapiLogExecution('AUDIT', 'Ran out of time', 'yup');
		rescheduleScript = true;
		return false;
	}
	return true;
}

function unitsLeft(units) {
	if (units == null || units == '') {
		units = 100;
	}
	var unitsLeft = context.getRemainingUsage();
	if (unitsLeft <= units) {
		nlapiLogExecution('AUDIT', 'Ran out of units', 'yup');
		rescheduleScript = true;
		return false;
	}
	return true;
}
