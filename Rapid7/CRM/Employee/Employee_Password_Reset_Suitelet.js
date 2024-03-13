/*
 * @author efagone
 */


function resetEmployeePassword(request, response){

	var context = nlapiGetContext();
	var userId = nlapiGetUser();
	
	try {
		if (request.getMethod() == 'GET') {
			var msgText = context.getSessionObject('zc_emppwreset');
			context.setSessionObject('zc_emppwreset', '');
			
			if (msgText != null && msgText != '' && msgText != 'null') {
				msgText = msgText.replace(new RegExp("\r\n", 'g'), "<br>");
				msgText = msgText.replace(new RegExp("\n", 'g'), "<br>");
				msgText = msgText.replace(new RegExp("\r", 'g'), "<br>");
			}
			else {
				msgText = '';
			}
			
			var form = nlapiCreateForm('Reset Employee Password', false);
			
			var fldMsg = form.addField('custpage_msg', 'inlinehtml');
			var msgColor = 'green';
			if (msgText.substr(0, 7) != 'Success') {
				msgColor = 'red';
			}
			fldMsg.setDefaultValue('<p style="color:' + msgColor + ';font-size:14px;max-width:400px;">' + msgText + '</p>');
			fldMsg.setDisplayType('normal');
			fldMsg.setLayoutType('normal', 'startcol');
			
			var fldEmployee = form.addField('custpage_employee', 'select', 'Employee');
			fldEmployee.setDisplaySize(250);
			fldEmployee.setMandatory(true);
			
			sourceEmployees(fldEmployee);
			
			form.addSubmitButton('Reset');
			response.writePage(form);
			return;
		}
		
		if (request.getMethod() == 'POST') {
		
			var userName = context.getName();
			var userEmail = context.getEmail();
			var employeeId = request.getParameter('custpage_employee');
		
			if (isRestrictedEmployee(employeeId)) {
				returnMessage('This is a restriced employee. Password cannot be reset.');
				return;
			}
			
			if (employeeId != null && employeeId != '') {
			
				//getting original employee info
				var recEmployee = nlapiLoadRecord('employee', employeeId);
				var employeeName = recEmployee.getFieldValue('entityid');
				var employeeFirstName = recEmployee.getFieldValue('firstname');
				var employeeEmail = recEmployee.getFieldValue('email');
				var inheritIPRules = recEmployee.getFieldValue('inheritiprules');
				var ipRules = recEmployee.getFieldValue('ipaddressrule');
				var origRoles = getEmployeeRoles(recEmployee);
				
				//removing access
				recEmployee.setFieldValue('giveaccess', 'F');
				nlapiSubmitRecord(recEmployee);
				
				try {
					//re-setting all their original information
					var recEmployee = nlapiLoadRecord('employee', employeeId);
					recEmployee.setFieldValue('giveaccess', 'T');
					recEmployee.setFieldValue('inheritiprules', inheritIPRules);
					recEmployee.setFieldValue('ipaddressrule', ipRules);
					recEmployee = setEmployeeRoles(recEmployee, origRoles);
					
					//setting new pw
					var newPassword = generatePassword(10);
					recEmployee.setFieldValue('password', newPassword);
					recEmployee.setFieldValue('password2', newPassword);
					recEmployee.setFieldValue('requirepwdchange', 'T');
					
					nlapiSubmitRecord(recEmployee);
				} 
				catch (err) {
					//Something went wrong resetting.... put everything back, don't change pw.
					var recEmployee = nlapiLoadRecord('employee', employeeId);
					recEmployee.setFieldValue('giveaccess', 'T');
					recEmployee.setFieldValue('inheritiprules', inheritIPRules);
					recEmployee.setFieldValue('ipaddressrule', ipRules);
					recEmployee = setEmployeeRoles(recEmployee, origRoles);
					
					nlapiSubmitRecord(recEmployee);
					
					if (err.getCode() == 'MULTI_ACCT_CANT_CHANGE_PSWD') {
						returnMessage(err.getDetails());
						return;
					}
					else {
						returnMessage('There has been an error processing your request.');
						return;
					}
					
				}
				//send emails
				
				var resetBody = '';
				resetBody += 'Hello ' + employeeFirstName + ',';
				resetBody += '\n\nYour NetSuite password has been reset by your administrator. Your user name and temporary password are below:';
				resetBody += '\n\nTemporary password: ' + newPassword;
				resetBody += '\n\nYou will be prompted to change your password upon logging in. If you have any questions, please contact your administrator: ';
				resetBody += userEmail;
				resetBody += '\n\nThank you,\n';
				resetBody += userName;
				
				nlapiSendEmail(userId, employeeEmail, 'Your NetSuite password has been reset', resetBody);
				
				var confirmationBody = '';
				confirmationBody += 'This is to confirm that the following user\'s password has been reset by ' + userName + ': ';
				confirmationBody += '\n\nEmployee: ' + employeeName;
				confirmationBody += '\nEmail: ' + employeeEmail;
				
				nlapiSendEmail(userId, userId, 'Password reset confirmation', confirmationBody, ['derek_zanga@rapid7.com', 'errol_fagone@rapid7.com', 'michael_burstein@rapid7.com']);

				returnMessage('Successfully reset ' + employeeName + '\'s password.');
				return;
			}
			else {
				returnMessage('There has been an error processing your request.');
				return;
			}
			
		}
	} 
	catch (err) {
		nlapiLogExecution('ERROR', 'Error resetting employee password', 'Error: ' + err);
		returnMessage('There has been an error processing your request.');
		return;
	}
}

function returnMessage(msg){
	
	var context = nlapiGetContext();
	context.setSessionObject('zc_emppwreset', msg);
	
	nlapiSetRedirectURL('SUITELET', context.getScriptId(), context.getDeploymentId());
	return;
}

function sourceEmployees(fldEmployee){
	
	var roleId = nlapiGetRole();
	var userId = nlapiGetUser();
	
	fldEmployee.addSelectOption('', '');
	
	var arrSearchFilters = new Array();
	arrSearchFilters[0] = new nlobjSearchFilter('isinactive', null, 'is', 'F');
	arrSearchFilters[1] = new nlobjSearchFilter('internalid', null, 'noneof', userId);
	arrSearchFilters[2] = new nlobjSearchFilter('giveaccess', null, 'is', 'T');
		
	var arrSearchColumns = new Array();
	arrSearchColumns[0] = new nlobjSearchColumn('internalid', null, 'group');
	arrSearchColumns[1] = new nlobjSearchColumn('entityid', null, 'max');
	arrSearchColumns[2] = new nlobjSearchColumn('formulanumeric', null, 'max');
	arrSearchColumns[2].setFormula('CASE WHEN {role.id} IN (3)  THEN 1 ELSE 0 END');
	
	var arrSearchResults = nlapiSearchRecord('employee', null, arrSearchFilters, arrSearchColumns);
	
	for (var i = 0; arrSearchResults != null && i < arrSearchResults.length; i++) {
		
		var searchResult = arrSearchResults[i];
		var employeeId = searchResult.getValue(arrSearchColumns[0]);
		var employeeName = searchResult.getValue(arrSearchColumns[1]);
		var excludedRole = searchResult.getValue(arrSearchColumns[2]);
		
		if (excludedRole == 0 || roleId == 3) {// don't restrict for Admin...
			fldEmployee.addSelectOption(employeeId, employeeName);
		}
	}
	
}

function isRestrictedEmployee(employeeId){
	
	var roleId = nlapiGetRole();
	
	if (roleId == 3) { // don't restrict for Admin
		return false;
	}
	
	var arrSearchFilters = new Array();
	arrSearchFilters[0] = new nlobjSearchFilter('internalid', null, 'anyof', employeeId);
		
	var arrSearchColumns = new Array();
	arrSearchColumns[0] = new nlobjSearchColumn('internalid', null, 'group');
	arrSearchColumns[1] = new nlobjSearchColumn('formulanumeric', null, 'max');
	arrSearchColumns[1].setFormula('CASE WHEN {role.id} IN (3)  THEN 1 ELSE 0 END');
	
	var arrSearchResults = nlapiSearchRecord('employee', null, arrSearchFilters, arrSearchColumns);
	
	if (arrSearchResults != null) {
		
		var restricted = arrSearchResults[0].getValue(arrSearchColumns[1]);

		if (restricted == 1) {
			return true;
		}
		else {
			return false;
		}
	}
	else {
		return false;
	}
}
function getEmployeeRoles(recEmployee){

	var arrRoles = new Array();
	
	var roleCount = recEmployee.getLineItemCount('roles');
	for (var i = 1; i <= roleCount; i++) {
	
		var roleId = recEmployee.getLineItemValue('roles', 'selectedrole', i);
		arrRoles[arrRoles.length] = roleId;
	}
	
	return arrRoles;
}

function setEmployeeRoles(recEmployee, origRoles){
	
	for (var i = 0; origRoles != null && i < origRoles.length; i++) {
	
		var roleId = origRoles[i];
		nlapiLogExecution('DEBUG', 'Setting Role', roleId);
		recEmployee.selectNewLineItem('roles');
		recEmployee.setCurrentLineItemValue('roles', 'selectedrole', roleId);
		recEmployee.commitLineItem('roles');
	}
	
	return recEmployee;
}

function generatePassword(len){
	if (len == null || len == ''){
		len = 8;
	}
	var validSpecialChars = '!_$&#@';
	
    var pwd = [], cc = String.fromCharCode, R = Math.random, rnd,  rnumSpec = Math.floor(Math.random() * validSpecialChars.length);
	pwd.push(validSpecialChars.substring(rnumSpec, rnumSpec + 1)); //push valid special char
    pwd.push(cc(48+(0|R()*10))); // push a number
    pwd.push(cc(65+(0|R()*26))); // push an upper case letter
	pwd.push(cc(97+(0|R()*26))); // push a lower case letter
	
    for(var i=3; i<len; i++){
       rnd = 0|R()*62; // generate upper OR lower OR number
       pwd.push(cc(48+rnd+(rnd>9?7:0)+(rnd>35?6:0)));
    }

    // shuffle letters in password
    return pwd.sort(function(){ return R() - .5; }).join('');
}