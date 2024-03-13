/*
 * @author efagone
 * MB: 9/28/16 - Removed hardcoded Employeed IDs
 */

var arrYearsToRun = getYearsToRun();

function employeeChangeRequest(request, response){

	var userId = nlapiGetUser();
	
	if (request.getMethod() == 'GET') {
	
		var employeeId = request.getParameter('custparam_employee') || 'ALLSUBS';
		
		var recUserRec = nlapiLoadRecord('employee', userId);
		var allowAccess = recUserRec.getFieldValue('custentityr7employeeaccesschangeform');
		
		if (allowAccess != 'T') {
			nlapiSendEmail(106223954, 106223954, 'PERMISSION ERROR', 'The following user attempted to view change request suitelet and does not have the custentityr7employeeaccesschangeform permission.\n\nUser Id: ' + userId, 'errol_fagone@rapid7.com');
			throw nlapiCreateError('PERMISSION', 'Insufficient Permissions', true);
		}
		
		var form = nlapiCreateForm('Employee Change Request', false);
		form.setScript('customscriptr7employeechangereq_suit_cs');
		form.addFieldGroup('primarygroup', 'Primary Information');
		form.addFieldGroup('newpaygroup', 'Pay Information').setSingleColumn(true);
		form.addFieldGroup('newdepartmentgroup', 'Title/Department/Location').setSingleColumn(true);
		form.addFieldGroup('newmanagergroup', 'Manager Details');
		
		var fldUser = form.addField('custpage_user', 'select', 'Requested By', 'employee', 'primarygroup').setDisplayType('inline');
		fldUser.setDefaultValue(userId);
		var fldEmployee = form.addField('custpage_employee', 'select', 'Employee', null, 'primarygroup');
		
		fldUser.setDisplaySize(200);
		fldEmployee.setDisplaySize(200);
		
		fldUser.setMandatory(true);
		fldEmployee.setMandatory(true);
		
		fldUser.setLayoutType('startrow', 'startcol');
		
		var arrAllSubordinates = sourceSubordinates(userId, fldEmployee, employeeId);
		
		if (employeeId != null && employeeId != '' && employeeId != 'ALLSUBS') {
		
			var recEmployee = nlapiLoadRecord('employee', employeeId);
			fldEmployee.setDefaultValue(employeeId);
			var fldIsSalesRep = form.addField('custpage_issalesrep', 'checkbox').setDisplayType('hidden');
			fldIsSalesRep.setDefaultValue(recEmployee.getFieldValue('issalesrep'));
			var fldEffectiveDate = form.addField('custpage_effectivedate', 'date', 'Effective Date', null, 'primarygroup');
			fldEffectiveDate.setDisplaySize(200);
			fldEffectiveDate.setPadding(1);
			fldEffectiveDate.setMandatory(true);
			
			var fldEmployeeImage = form.addField('custpage_employeeimage', 'inlinehtml', null, null, 'primarygroup');
			fldEmployeeImage.setLayoutType('endrow', 'startcol');
			
			var fldCurrentPay = form.addField('custpage_currentpay', 'currency', 'Pay').setDisplayType('hidden');
			var fldCurrentBonusAmount = form.addField('custpage_currentbonusamount', 'currency').setDisplayType('hidden');
			var fldCurrentBonusFrequency = form.addField('custpage_currentbonusfrequency', 'select', 'Current Bonus Frequency', 'customlist300').setDisplayType('hidden');
			var fldCurrentCommissionAmount = form.addField('custpage_currentcommissionamount', 'currency').setDisplayType('hidden');
			var fldCurrentCommissionFrequency = form.addField('custpage_currentcommissionfrequency', 'select', 'Current Commission Frequency', 'customlist300').setDisplayType('hidden');
			var fldCurrentSalesCommision = form.addField('custpage_currentsalescommision', 'checkbox').setDisplayType('hidden');
			var fldCurrentJobTitle = form.addField('custpage_currentjobtitle', 'text').setDisplayType('hidden');
			
			var fldCurrentDepartment = form.addField('custpage_currentdepartment', 'select', null, 'department').setDisplayType('hidden');
			var fldCurrentLocation = form.addField('custpage_currentlocation', 'select', null, 'location').setDisplayType('hidden');
			var fldCurrentDirectManager = form.addField('custpage_currentdirectmanager', 'select', null, 'employee').setDisplayType('hidden');
			
			var fldCurrentCommisionManager = form.addField('custpage_currentcommisionmaneger', 'select', null, 'employee').setDisplayType('hidden');
			var fldCurrentPracticeManager = form.addField('custpage_currentpracticemanager', 'select', null, 'employee').setDisplayType('hidden');
			var fldCurrentExpenseReportApprover = form.addField('custpage_currentexpenseapprover', 'select', null, 'employee').setDisplayType('hidden');
			var fldCurrentPurchaseRequestApprover = form.addField('custpage_currentpurchaseapprover', 'select', null, 'employee').setDisplayType('hidden');
			var fldCurrentTimeApprover = form.addField('custpage_currenttimeapprover', 'select', null, 'employee').setDisplayType('hidden');
			var fldCurrentTravelApprover = form.addField('custpage_currenttravelapprover', 'select', null, 'employee').setDisplayType('hidden');
			//var fldCurrentQuoteApprover = form.addField('custpage_currentquoteapprover', 'select', null, 'employee').setDisplayType('hidden');
			var fldCurrentClassification = form.addField('custpage_currentclassification', 'text', null, null).setDisplayType('hidden');
			
			var fldNewPay = form.addField('custpage_newpay', 'currency', 'Pay', null, 'newpaygroup');
			fldNewPay.setLayoutType('startrow', 'startcol');
			var fldNewPayReason = form.addField('custpage_newpayreason', 'select', 'Reason For Pay Change', '870', 'newpaygroup');
			fldNewPayReason.setLayoutType('midrow');
			var fldNewBonusAmount = form.addField('custpage_newbonusamount', 'currency', 'Bonus Amount', null, 'newpaygroup');
			fldNewBonusAmount.setLayoutType('startrow', 'startcol');
			var fldNewBonusFrequency = form.addField('custpage_newbonusfrequency', 'select', 'Bonus Frequency', 'customlist300', 'newpaygroup');
			fldNewBonusFrequency.setLayoutType('midrow');
			var fldNewSalesCommision = form.addField('custpage_newsalescommision', 'checkbox', 'Sales Commision', null, 'newpaygroup');
			var fldNewCommissionAmount = form.addField('custpage_newcommissionamount', 'currency', 'Commission Amount', null, 'newpaygroup');
			fldNewCommissionAmount.setLayoutType('startrow', 'startcol');
			var fldNewCommissionFrequency = form.addField('custpage_newcommissionfrequency', 'select', 'Commission Frequency', 'customlist300', 'newpaygroup');
			fldNewCommissionFrequency.setLayoutType('midrow');
			var fldNewClassification = form.addField('custpage_newclassification', 'select', 'Employee Status', null, 'newpaygroup');
			fldNewClassification.setPadding(1);
			var fldNewJobTitle = form.addField('custpage_newjobtitle', 'text', 'Job Title', null, 'newdepartmentgroup');
			fldNewJobTitle.setLayoutType('startrow', 'startcol');
			var fldNewDepartment = form.addField('custpage_newdepartment', 'select', 'Department', 'department', 'newdepartmentgroup');
			var fldNewLocation = form.addField('custpage_newlocation', 'select', 'Location', 'location', 'newdepartmentgroup');
			
			var fldNewDirectManager = form.addField('custpage_newdirectmanager', 'select', 'Direct Manager', null, 'newmanagergroup');
			fldNewDirectManager.setPadding(1);
			var fldNewCommisionManager = form.addField('custpage_newcommisionmaneger', 'select', 'Commision Manager', null, 'newmanagergroup');
			var fldNewPracticeManager = form.addField('custpage_newpracticemanager', 'select', 'Practice Manager', null, 'newmanagergroup');
			var fldNewExpenseReportApprover = form.addField('custpage_newexpenseapprover', 'select', 'Expense Report Approver', null, 'newmanagergroup');
			var fldNewPurchaseRequestApprover = form.addField('custpage_newpurchaseapprover', 'select', 'Purchase Request Approver', null, 'newmanagergroup');
			var fldNewTimeApprover = form.addField('custpage_newtimeapprover', 'select', 'Time Approver', null, 'newmanagergroup');
			var fldNewTravelApprover = form.addField('custpage_newtravelapprover', 'select', 'Travel Approver', null, 'newmanagergroup');
			//removing quote approver (SR1059)
			//var fldNewQuoteApprover = form.addField('custpage_newquoteapprover', 'select', 'Quote Approver', null, 'newmanagergroup');
			var fldNewComments = form.addField('custpage_newcomments', 'longtext', 'Comments', null, 'newmanagergroup');
			fldNewComments.setPadding(1);
			fldNewComments.setMandatory(true);
			fldNewComments.setDisplaySize(125, 10);
			fldNewComments.setLayoutType('normal', 'startcol');
			
			fldNewPay.setDisplaySize(20);
			fldNewBonusAmount.setDisplaySize(20);
			fldNewBonusFrequency.setDisplaySize(140);
			fldNewCommissionAmount.setDisplaySize(20);
			fldNewCommissionFrequency.setDisplaySize(140);
			fldNewSalesCommision.setDisplaySize(25);
			fldNewClassification.setDisplaySize(140);
			
			fldNewJobTitle.setDisplaySize(45);
			fldNewDepartment.setDisplaySize(250);
			fldNewLocation.setDisplaySize(250);
			fldNewDirectManager.setDisplaySize(250);
			fldNewCommisionManager.setDisplaySize(250);
			fldNewPracticeManager.setDisplaySize(250);
			fldNewExpenseReportApprover.setDisplaySize(250);
			fldNewPurchaseRequestApprover.setDisplaySize(250);
			fldNewTimeApprover.setDisplaySize(250);
			fldNewTravelApprover.setDisplaySize(250);
			//fldNewQuoteApprover.setDisplaySize(250);
			
			sourceEmployeeStatus(fldNewClassification);
			sourceEmployees(fldNewDirectManager);
			sourceEmployees(fldNewTimeApprover);
			sourceEmployees(fldNewCommisionManager);
			sourceEmployees(fldNewPracticeManager, new Array('salesrep', 'custentityr7ispracticemanager'));
			sourceEmployees(fldNewExpenseReportApprover);
			sourceEmployees(fldNewPurchaseRequestApprover);
			sourceEmployees(fldNewTravelApprover);
			//sourceEmployees(fldNewQuoteApprover);
			
			//now populate information
			if (recEmployee.getFieldValue('image') != null && recEmployee.getFieldValue('image') != '') {
				var fileEmployeeImage = nlapiLoadFile(recEmployee.getFieldValue('image'));
				var imageURL = fileEmployeeImage.getURL();
				fldEmployeeImage.setDefaultValue('<img src="' + imageURL + '" WIDTH="200"/>');
				
			}
			
			var currentEmployeePay = getCurrentPay(employeeId);
			
			fldCurrentPay.setDefaultValue(currentEmployeePay);
			fldCurrentBonusAmount.setDefaultValue(recEmployee.getFieldValue('custentityr7employeebonusamountannual'));
			fldCurrentBonusFrequency.setDefaultValue(recEmployee.getFieldValue('custentityr7employeebonuspaymentsched'));
			fldCurrentSalesCommision.setDefaultValue(recEmployee.getFieldValue('eligibleforcommission'));
			fldCurrentCommissionAmount.setDefaultValue(recEmployee.getFieldValue('custentityr7commissiontarget'));
			fldCurrentCommissionFrequency.setDefaultValue(recEmployee.getFieldValue('custentityr7commissionpaymentsched'));
			
			fldCurrentJobTitle.setDefaultValue(recEmployee.getFieldValue('title'));
			fldCurrentDepartment.setDefaultValue(recEmployee.getFieldValue('department'));
			fldCurrentLocation.setDefaultValue(recEmployee.getFieldValue('location'));
			fldCurrentDirectManager.setDefaultValue(recEmployee.getFieldValue('custentityr7supervisordirect'));
			fldCurrentPracticeManager.setDefaultValue(recEmployee.getFieldValue('custentityr7practicegroupmanager'));
			fldCurrentCommisionManager.setDefaultValue(recEmployee.getFieldValue('supervisor'));
			fldCurrentExpenseReportApprover.setDefaultValue(recEmployee.getFieldValue('approver'));
			fldCurrentPurchaseRequestApprover.setDefaultValue(recEmployee.getFieldValue('purchaseorderapprover'));
			fldCurrentTimeApprover.setDefaultValue(recEmployee.getFieldValue('timeapprover'));
			fldCurrentTravelApprover.setDefaultValue(recEmployee.getFieldValue('custentityr7travelapprover'));
			//fldCurrentQuoteApprover.setDefaultValue(recEmployee.getFieldValue('custentityr7approvalapprover'));
			fldCurrentClassification.setDefaultValue(recEmployee.getFieldValue('employeestatus'));
			
			fldNewPay.setDefaultValue(currentEmployeePay);
			fldNewBonusAmount.setDefaultValue(recEmployee.getFieldValue('custentityr7employeebonusamountannual'));
			fldNewBonusFrequency.setDefaultValue(recEmployee.getFieldValue('custentityr7employeebonuspaymentsched'));
			fldNewCommissionAmount.setDefaultValue(recEmployee.getFieldValue('custentityr7commissiontarget'));
			fldNewCommissionFrequency.setDefaultValue(recEmployee.getFieldValue('custentityr7commissionpaymentsched'));
			fldNewSalesCommision.setDefaultValue(recEmployee.getFieldValue('eligibleforcommission'));
			fldNewJobTitle.setDefaultValue(recEmployee.getFieldValue('title'));
			fldNewDepartment.setDefaultValue(recEmployee.getFieldValue('department'));
			fldNewLocation.setDefaultValue(recEmployee.getFieldValue('location'));
			fldNewDirectManager.setDefaultValue(recEmployee.getFieldValue('custentityr7supervisordirect'));
			fldNewPracticeManager.setDefaultValue(recEmployee.getFieldValue('custentityr7practicegroupmanager'));
			fldNewCommisionManager.setDefaultValue(recEmployee.getFieldValue('supervisor'));
			fldNewExpenseReportApprover.setDefaultValue(recEmployee.getFieldValue('approver'));
			fldNewPurchaseRequestApprover.setDefaultValue(recEmployee.getFieldValue('purchaseorderapprover'));
			fldNewTimeApprover.setDefaultValue(recEmployee.getFieldValue('timeapprover'));
			fldNewTravelApprover.setDefaultValue(recEmployee.getFieldValue('custentityr7travelapprover'));
			//fldNewQuoteApprover.setDefaultValue(recEmployee.getFieldValue('custentityr7approvalapprover'));
			fldNewClassification.setDefaultValue(recEmployee.getFieldValue('employeestatus'));
			
			form.addSubmitButton('Submit');
		} else if (employeeId == 'ALLSUBS'){
			
			fldEmployee.setDefaultValue(employeeId);
			
			listSubs = form.addSubList('custpage_allsubordinates', 'list', 'My Subordinates');
			listSubs.addField('custpage_listemployeeid', 'text').setDisplayType('hidden');
			listSubs.addField('custpage_listemployeename', 'text', 'Employee Name');
			listSubs.addField('custpage_listjobtitle', 'text', 'Job Title');
			listSubs.addField('custpage_listdepartment', 'text', 'Department');
			listSubs.addField('custpage_listlocation', 'text', 'Location');
			listSubs.addField('custpage_listdirectmanager', 'text', 'Direct Manager');
			listSubs.addField('custpage_listpayrate', 'currency', 'Pay Rate');
			listSubs.addField('custpage_listbonusamount', 'currency', 'Bonus Amount');
			listSubs.addField('custpage_listbonusfrequency', 'text', 'Bonus Frequency');
			listSubs.addField('custpage_listlastraisedate', 'date', 'Last Raise Date');
			listSubs.addField('custpage_listhiredate', 'date', 'Hire Date');
			listSubs.addField('custpage_listmodify', 'textarea', 'Request Change');
			
			var suiteletUrl = '/app/site/hosting/scriptlet.nl?script=490&deploy=1&custparam_employee=';
			for (var i = 0, j = 1; arrAllSubordinates != null && i < arrAllSubordinates.length; i++, j++) {
				var currentSubordinate = arrAllSubordinates[i];
				
				listSubs.setLineItemValue('custpage_listemployeeid', j, currentSubordinate[0]);
				listSubs.setLineItemValue('custpage_listemployeename', j, currentSubordinate[3]);
				listSubs.setLineItemValue('custpage_listjobtitle', j, currentSubordinate[4]);
				listSubs.setLineItemValue('custpage_listdepartment', j, currentSubordinate[5]);
				listSubs.setLineItemValue('custpage_listlocation', j, currentSubordinate[6]);
				listSubs.setLineItemValue('custpage_listdirectmanager', j, currentSubordinate[7]);
				listSubs.setLineItemValue('custpage_listpayrate', j, currentSubordinate[8]);
				listSubs.setLineItemValue('custpage_listbonusamount', j, currentSubordinate[9]);
				listSubs.setLineItemValue('custpage_listbonusfrequency', j, currentSubordinate[10]);
				listSubs.setLineItemValue('custpage_listlastraisedate', j, currentSubordinate[11]);
				listSubs.setLineItemValue('custpage_listhiredate', j, currentSubordinate[12]);
				
				var html = '<a href="' + suiteletUrl + currentSubordinate[0] + '"' + '>Request Change' + '</a>';
				if (currentSubordinate[13] != null && currentSubordinate[13] != '') {
					html = '<div style="vertical-align:text-top; float: left"> <a href="' + suiteletUrl + currentSubordinate[0] + '"' + '>Request Change' + '</a></div> &nbsp&nbsp <img src="' + currentSubordinate[13] + '" WIDTH="60"/>';
				}
				
				listSubs.setLineItemValue('custpage_listmodify', j, html);
			}
			
		}
		
		response.writePage(form);
		
	}
	
	if (request.getMethod() == 'POST') {
	
		if (!userHasPermission('empchange_superusers') && nlapiStringToDate(nlapiDateToString(new Date())) > nlapiStringToDate(request.getParameter('custpage_effectivedate'))) { //Change #479 - Rapid7 Manager Portal "unexpected error" fix.  Swapping to Custom script permissions.
			throw nlapiCreateError('INVALID_DATA', 'Effective date cannot be in the past', true);
		}
		
		var recEmpChange = nlapiCreateRecord('customrecordr7employeechangerecords');
		recEmpChange.setFieldValue('custrecordr7employeechangeemployee', request.getParameter('custpage_employee'));
		recEmpChange.setFieldValue('custrecordr7employeechangeeffectivedate', request.getParameter('custpage_effectivedate'));
		recEmpChange.setFieldValue('custrecordr7employeechangecomments', request.getParameter('custpage_newcomments'));
		recEmpChange.setFieldValue('custrecordr7employeechangeorigpayrate', request.getParameter('custpage_currentpay'));
		if (request.getParameter('custpage_currentpay') != request.getParameter('custpage_newpay')) {
			recEmpChange.setFieldValue('custrecordr7employeechangepay', request.getParameter('custpage_newpay'));
			recEmpChange.setFieldValue('custrecordr7employeereasonforpaychange', request.getParameter('custpage_newpayreason'));
		}

		if (request.getParameter('custpage_currentbonusamount') != request.getParameter('custpage_newbonusamount')) 
			recEmpChange.setFieldValue('custrecordr7employeechangebonus', request.getParameter('custpage_newbonusamount'));
		
		if (request.getParameter('custpage_currentbonusfrequency') != request.getParameter('custpage_newbonusfrequency')) 
			recEmpChange.setFieldValue('custrecordr7employeechangebonusfrequency', request.getParameter('custpage_newbonusfrequency'));
		
		if (request.getParameter('custpage_currentcommissionamount') != request.getParameter('custpage_newcommissionamount')) 
			recEmpChange.setFieldValue('custrecordr7commissionamount', request.getParameter('custpage_newcommissionamount'));
			
		if (request.getParameter('custpage_currentcommissionfrequency') != request.getParameter('custpage_newcommissionfrequency')) 
			recEmpChange.setFieldValue('custrecordr7commisisonfrequency', request.getParameter('custpage_newcommissionfrequency'));

		recEmpChange.setFieldValue('custrecordr7employeechangecommission', request.getParameter('custpage_newsalescommision'));
		
		if (request.getParameter('custpage_currentjobtitle') != request.getParameter('custpage_newjobtitle')) 
			recEmpChange.setFieldValue('custrecordr7employeechangejobtitle', request.getParameter('custpage_newjobtitle'));
		
		if (request.getParameter('custpage_currentdepartment') != request.getParameter('custpage_newdepartment')) 
			recEmpChange.setFieldValue('custrecordr7employeechangedepartment', request.getParameter('custpage_newdepartment'));
		
		if (request.getParameter('custpage_currentlocation') != request.getParameter('custpage_newlocation')) 
			recEmpChange.setFieldValue('custrecordr7employeechangelocation', request.getParameter('custpage_newlocation'));
		
		if (request.getParameter('custpage_currentdirectmanager') != request.getParameter('custpage_newdirectmanager')) 
			recEmpChange.setFieldValue('custrecordr7employeechangedirectmanager', request.getParameter('custpage_newdirectmanager'));
		
		if (request.getParameter('custpage_currentcommisionmaneger') != request.getParameter('custpage_newcommisionmaneger')) 
			recEmpChange.setFieldValue('custrecordr7employeechangecommissionmngr', request.getParameter('custpage_newcommisionmaneger'));
		
		if (request.getParameter('custpage_currentpracticemanager') != request.getParameter('custpage_newpracticemanager')) 
			recEmpChange.setFieldValue('custrecordr7employeechangepracticemngr', request.getParameter('custpage_newpracticemanager'));
		
		if (request.getParameter('custpage_currentexpenseapprover') != request.getParameter('custpage_newexpenseapprover')) 
			recEmpChange.setFieldValue('custrecordr7employeechangeexpenseapprove', request.getParameter('custpage_newexpenseapprover'));
		
		if (request.getParameter('custpage_currentpurchaseapprover') != request.getParameter('custpage_newpurchaseapprover')) 
			recEmpChange.setFieldValue('custrecordr7employeechangepurchaseapprov', request.getParameter('custpage_newpurchaseapprover'));
		
		if (request.getParameter('custpage_currenttimeapprover') != request.getParameter('custpage_newtimeapprover')) 
			recEmpChange.setFieldValue('custrecordr7employeechangetimeapprover', request.getParameter('custpage_newtimeapprover'));
		
		if (request.getParameter('custpage_currenttravelapprover') != request.getParameter('custpage_newtravelapprover')) 
			recEmpChange.setFieldValue('custrecordr7employeechangetravelapprover', request.getParameter('custpage_newtravelapprover'));
		
		//if (request.getParameter('custpage_currentquoteapprover') != request.getParameter('custpage_newquoteapprover')) 
		//	recEmpChange.setFieldValue('custrecordr7employeechangequoteapprover', request.getParameter('custpage_newquoteapprover'));
		
		if (request.getParameter('custpage_currentclassification') != request.getParameter('custpage_newclassification')) 
			recEmpChange.setFieldValue('custrecordr7employeechangeclassification', request.getParameter('custpage_newclassification'));
		
		nlapiSubmitRecord(recEmpChange, true, true);
		
		var params = new Array();
		params['custparam_employee'] = 'ALLSUBS';
		
		nlapiSetRedirectURL('SUITELET', 'customscriptr7employeechangerequest_suit', 'customdeployr7employeechangerequest_suit', null, params);
	}
}

function getCurrentPay(employeeId){
	
	var currentPay = null;
	
	var arrSearchFilters = new Array();
	arrSearchFilters[0] = new nlobjSearchFilter('internalid', null, 'is', employeeId);
	
	var arrSearchColumns = new Array();
	arrSearchColumns[0] = new nlobjSearchColumn('custentityr7salaryregular', null, 'max');
	
	var arrSearchResults = nlapiSearchRecord('employee', null, arrSearchFilters, arrSearchColumns);
	
	if (arrSearchResults != null){
		currentPay = arrSearchResults[0].getValue(arrSearchColumns[0]);
	}
	
	return currentPay;
}

function sourceEmployeeStatus(fld){
	
	fld.addSelectOption(1, 'Exempt');
	fld.addSelectOption(2, 'Non-Exempt');
}

function sourceEmployees(fld, arrTrueFields){
	
	fld.addSelectOption('', '');
	
	var arrSearchFilters = new Array();
	arrSearchFilters[arrSearchFilters.length] = new nlobjSearchFilter('isinactive', null, 'is', 'F');
	arrSearchFilters[arrSearchFilters.length] = new nlobjSearchFilter('releasedate', null, 'isempty');
	arrSearchFilters[arrSearchFilters.length] = new nlobjSearchFilter('custentityr7employeeseparationreason', null, 'anyof', '@NONE@');
	
	for (var i = 0; arrTrueFields != null && i < arrTrueFields.length; i++) {
		arrSearchFilters[arrSearchFilters.length] = new nlobjSearchFilter(arrTrueFields[i], null, 'is', 'T');
	}
	
	var arrSearchColumns = new Array();
	arrSearchColumns[0] = new nlobjSearchColumn('entityid');
	
	var arrSearchResults = nlapiSearchRecord('employee', null, arrSearchFilters, arrSearchColumns);
	
	for (var i = 0; arrSearchResults != null && i < arrSearchResults.length; i++) {
	
		var searchResult = arrSearchResults[i];
		var employeeId = searchResult.getId();
		var employeeName = searchResult.getValue(arrSearchColumns[0]);
		
		fld.addSelectOption(employeeId, employeeName);
		
	}
}


function sourceSubordinates(userId, fldEmployee, specifiedEmployeeId){

	fldEmployee.addSelectOption('', '');
	fldEmployee.addSelectOption('ALLSUBS', '--ALL SUBORDINATES--');
	
	var arrAllActiveEmployees = [];
	var arrAllSubordinates = [];
	
	var arrFilters = [];
	
	arrFilters.push(new nlobjSearchFilter('internalid', null, 'noneof', [7733892])); // THIS IS FOR NETSUITE PRIMARYEARNINGAMOUNT BUG.. can remove when fixed
	arrFilters.push(new nlobjSearchFilter('isinactive', null, 'is', 'F'));
	arrFilters.push(new nlobjSearchFilter('releasedate', null, 'isempty'));
	arrFilters.push(new nlobjSearchFilter('custentityr7employeeseparationreason', null, 'anyof', '@NONE@'));
	
	var arrColumns = [];
	arrColumns[0] = new nlobjSearchColumn('internalid', null, 'group');
	arrColumns[1] = new nlobjSearchColumn('entityid', null, 'max');
	arrColumns[2] = new nlobjSearchColumn('formulatext', null, 'max').setFormula('{supervisor.id}');
	arrColumns[3] = new nlobjSearchColumn('entityid', null, 'max');
	arrColumns[4] = new nlobjSearchColumn('title', null, 'max');
	arrColumns[5] = new nlobjSearchColumn('department', null, 'max');
	arrColumns[6] = new nlobjSearchColumn('location', null, 'max');
	arrColumns[7] = new nlobjSearchColumn('custentityr7supervisordirect', null, 'max');
	arrColumns[8] = new nlobjSearchColumn('custentityr7salaryregular', null, 'max');
	arrColumns[9] = new nlobjSearchColumn('custentityr7employeebonusamountannual', null, 'max');
	arrColumns[10] = new nlobjSearchColumn('custentityr7employeebonuspaymentsched', null, 'max');
	arrColumns[11] = new nlobjSearchColumn('custentityr7lastraisedate', null, 'max');
	arrColumns[12] = new nlobjSearchColumn('hiredate', null, 'max');
	arrColumns[13] = new nlobjSearchColumn('image', null, 'max');
	
	var arrResults = nlapiSearchRecord('employee', null, arrFilters, arrColumns);
	
	//build list of all employees
	for (var i = 0; arrResults != null && i < arrResults.length; i++) {
	
		var employeeId = arrResults[i].getValue(arrColumns[0]);
		var employeeName = arrResults[i].getValue(arrColumns[1]);
		var supervisor = arrResults[i].getValue(arrColumns[2]);
		var name = arrResults[i].getValue(arrColumns[3]);
		var title = arrResults[i].getValue(arrColumns[4]);
		var department = arrResults[i].getValue(arrColumns[5]);
		var location = arrResults[i].getValue(arrColumns[6]);
		var directManager = arrResults[i].getValue(arrColumns[7]);
		var payrate = arrResults[i].getValue(arrColumns[8]);
		var bonusAmount = arrResults[i].getValue(arrColumns[9]);
		var bonusFrequency = arrResults[i].getValue(arrColumns[10]);
		var lastRaiseDate = arrResults[i].getValue(arrColumns[11]);
		var hireDate = arrResults[i].getValue(arrColumns[12]);
		var image = arrResults[i].getValue(arrColumns[13]);
		
		arrAllActiveEmployees[arrAllActiveEmployees.length] = new Array(employeeId, employeeName, supervisor, name, title, department, location, directManager, payrate, bonusAmount, bonusFrequency, lastRaiseDate, hireDate, image);
	}
	
	
	if (userHasPermission('empchange_superusers') && (specifiedEmployeeId != 'ALLSUBS')) { //Change #479 - Rapid7 Manager Portal "unexpected error" fix.  Swapping to Custom script permissions.
		arrAllSubordinates = arrAllActiveEmployees;
	}
	else {
		//build first pass of subordinates
		for (var i = 0; arrAllActiveEmployees != null && i < arrAllActiveEmployees.length; i++) {
		
			var supervisor = arrAllActiveEmployees[i][2];
			
			if (supervisor == userId) {
				arrAllSubordinates[arrAllSubordinates.length] = arrAllActiveEmployees[i];
			}
		}
		
		//loop ALL subordinates subordinates subordinates.... and so on....
		for (var i = 0; arrAllSubordinates != null && i < arrAllSubordinates.length; i++) {
		
			var currentSubordinateId = arrAllSubordinates[i][0];
			
			for (var j = 0; arrAllActiveEmployees != null && j < arrAllActiveEmployees.length; j++) {
			
				var supervisor = arrAllActiveEmployees[j][2];
				
				if (supervisor == currentSubordinateId) {
					arrAllSubordinates[arrAllSubordinates.length] = arrAllActiveEmployees[j];
				}
			}
		}
	}
	
	//add select options
	//Change #479 - Rapid7 Manager Portal "unexpected error" fix.  Swapping to Custom script permissions.
	
	if (userHasPermission('empchange_superusers')) { 
		arrAllActiveEmployees.sort(myCustomSort);
		for (var i = 0; arrAllActiveEmployees != null && i < arrAllActiveEmployees.length; i++) {
		
			var currentEmployee = arrAllActiveEmployees[i];
			var employeeId = currentEmployee[0];
			var employeeName = currentEmployee[1];
			
			fldEmployee.addSelectOption(employeeId, employeeName);
		}
	}
	else {
		arrAllSubordinates.sort(myCustomSort);
		for (var i = 0; arrAllSubordinates != null && i < arrAllSubordinates.length; i++) {
		
			var currentSubordinate = arrAllSubordinates[i];
			var employeeId = currentSubordinate[0];
			var employeeName = currentSubordinate[1];
			
			fldEmployee.addSelectOption(employeeId, employeeName);
		}
	}
	
	if (specifiedEmployeeId != null && specifiedEmployeeId != '' && specifiedEmployeeId != 'ALLSUBS') {
	
		var validEmployee = false;
		
		for (var i = 0; arrAllSubordinates != null && i < arrAllSubordinates.length; i++) {
		
			var currentSubordinate = arrAllSubordinates[i];
			var employeeId = currentSubordinate[0];
			
			if (specifiedEmployeeId == employeeId) {
				validEmployee = true;
			}
		}
		
		if (!validEmployee) {
			nlapiSendEmail(106223954, 106223954, 'PERMISSION ERROR', 'The following user attempted to view change request page.\n\nUser Id: ' + userId + '\n\nRequested Employee: ' + specifiedEmployeeId);
			throw nlapiCreateError('PERMISSION', 'Insufficient Permissions', false);
		}
	}
	
	return arrAllSubordinates;
}

function myCustomSort(a, b){
	var empA = a[1];
	var empB = b[1];
	
	if (empA < empB) //sort string ascending
		return -1;
	if (empA > empB) 
		return 1;
	return 0; //default return value (no sorting)
}

function getYearsToRun(){
	
	/*
	 * This function gets an array of years that exist from the starting year (y, below). 
	 * This will then be used to run searches in chunks using years to chunk the results
	 */
	
	var arrYears = [];
	
	//adding a day just in case of any timezone issues,dont want to lose a year
	var now = nlapiAddDays(new Date(), 1); 
	var currentYear = now.getFullYear();
	
	for (var y = 2010; y <= currentYear; y++) {
		arrYears.push(y.toString());
	}
	
	return arrYears;
}