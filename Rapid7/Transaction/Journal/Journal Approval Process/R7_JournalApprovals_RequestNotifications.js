/*
 * @author efagone
 */

var debug = false;
if (nlapiGetUser() == 55011){
	debug = true;
}
var FINAL_STATUS = 3;

function requestNotifications_wkflowAction(){

	var approved = nlapiGetFieldValue('approved');
	nlapiLogExecution('DEBUG', 'approved', approved);
	if (approved == 'T') {
		return;
	}
	nlapiLogExecution('DEBUG', 'running', 'yup');
	
	// RULE: Under 100, auto approve
	var isUnderDollarLimit = runUnderDollarRule();
	if (isUnderDollarLimit){
		return;
	}
	
	// RULE: Go to creator's (employee) Supervisor Direct (header)
	runCreatorRule();
	
	// RULE: Approval based on Account approver (line items)
	runAccountRules();
	
	// RULE: Approval based on Total Journal Dollar amount (header)
	runDollarAmountRule();
	
	// Now send the requests
	requestNotifications();
}

function runUnderDollarRule(){

	var lineCount = nlapiGetLineItemCount('line');
	var totalAmount = 0;
	for (var i = 1; i <= lineCount; i++) {
		var currentCredit = nlapiGetLineItemValue('line', 'credit', i);
		if (currentCredit != null && currentCredit != '') {
			totalAmount = totalAmount + parseFloat(currentCredit);
		}
    }
    
	// https://issues.corp.rapid7.com/browse/APPS-5729
	// Journal Entry approval workflow is based on USD equivalent amount
	var USD = "1";  // USD on list of values for currency field
	if (nlapiGetFieldValue('currency') != USD) {
		totalAmount *= parseFloat(nlapiGetFieldValue('exchangerate'));
	}
    
	if (totalAmount <= 1000) {
		approveJournal();
		return true;
	}
	
	return false;
}

function runCreatorRule(){
	
	var userId = nlapiGetUser();
	var ruleId = 5; //created by
	var userFields = nlapiLookupField('employee', userId, new Array('custentityr7employeejournalentryapprover', 'entityid'));
	var description = 'Created by ' + userFields['entityid'];
	var approverId = userFields['custentityr7employeejournalentryapprover'];
	
	createApproval(ruleId, description, approverId);
}

function runDollarAmountRule(){

	var employeeId = nlapiGetUser();
	var ruleId = 1; //Total Amount (Creator)
	var amount = parseFloat(nlapiGetFieldValue('amount'));
	
	var lineCount = nlapiGetLineItemCount('line');
	var totalAmount = 0;
	for (var i = 1; i <= lineCount; i++) {
		var currentCredit = nlapiGetLineItemValue('line', 'credit', i);
		if (currentCredit != null && currentCredit != '') {
			totalAmount = totalAmount + parseFloat(currentCredit);
		}
	}

	// https://issues.corp.rapid7.com/browse/APPS-5729
	// Journal Entry approval workflow is based on USD equivalent amount
	var USD = "1";  // USD on list of values for currency field
	if (nlapiGetFieldValue('currency') != USD) {
		totalAmount *= parseFloat(nlapiGetFieldValue('exchangerate'));
	}

	var description = 'Total Amount ($' + totalAmount + ')';

	var empFields = nlapiLookupField('employee', employeeId, new Array('custentityr7employeejournalentryapprover', 'custentityr7journalentryapprovallimit'));
	var nextApprover = empFields['custentityr7employeejournalentryapprover'];
	var employeeJournalLimit = parseFloat(empFields['custentityr7journalentryapprovallimit']);
	if (isNaN(employeeJournalLimit) || employeeJournalLimit == '' || employeeJournalLimit == null) {
		employeeJournalLimit = 0;
	}

	while (nextApprover != null && nextApprover != '' && !isNaN(totalAmount) && !isNaN(employeeJournalLimit) && totalAmount > employeeJournalLimit) {
	
		employeeId = nextApprover;
		createApproval(ruleId, description, employeeId);
		var empFields = nlapiLookupField('employee', employeeId, new Array('custentityr7employeejournalentryapprover', 'custentityr7journalentryapprovallimit'));
		nextApprover = empFields['custentityr7employeejournalentryapprover'];
		
		employeeJournalLimit = parseFloat(empFields['custentityr7journalentryapprovallimit']);
		if (isNaN(employeeJournalLimit) || employeeJournalLimit == '' || employeeJournalLimit == null) {
			employeeJournalLimit = 0;
		}
	}
	
}

function runAccountRules(){

	var ruleId = '15'; //Account Specific
	var numberOfLines = nlapiGetLineItemCount('line');
	
	var objAccountMap = new Object();
	
	var arrSearchColumns = new Array();
	arrSearchColumns[0] = new nlobjSearchColumn('name');
	arrSearchColumns[1] = new nlobjSearchColumn('custrecordr7accountjournalentryapprover');
	arrSearchColumns[2] = new nlobjSearchColumn('custrecordr7accountjournalentrynotifier');
	
	var arrSearchResults = nlapiSearchRecord('account', null, null, arrSearchColumns);
	
	for (var i = 0; arrSearchResults != null && i < arrSearchResults.length; i++) {
	
		var objInfo = new Object();
		objInfo.id = arrSearchResults[i].getId();
		objInfo.name = arrSearchResults[i].getValue(arrSearchColumns[0]);
		objInfo.approvers = arrSearchResults[i].getValue(arrSearchColumns[1]);
		objInfo.notifiers = arrSearchResults[i].getValue(arrSearchColumns[2]);
		
		objAccountMap[objInfo.id] = objInfo;
		
	}
	
	for (var i = 1; numberOfLines != null && i <= numberOfLines; i++) {
	
		var accountId = nlapiGetLineItemValue('line', 'account', i);
		
		if (objAccountMap.hasOwnProperty(accountId)) {
			var accountDetails = objAccountMap[accountId];
			var strApproverIds = accountDetails.approvers;
			var strNotificationIds = accountDetails.notifiers;

			var arrApprovers = new Array();
			var arrNotifications = new Array();
			
			if (strApproverIds != '') {
				arrApprovers = strApproverIds.split(",");
			}
			if (strNotificationIds != '') {
				arrNotifications = strNotificationIds.split(",");
			}
			
			var entity = nlapiGetLineItemValue('line', 'entity', i);
			var accountName = nlapiGetLineItemText('line', 'account', i);
			var description = accountName;
			
			for (var j = 0; arrApprovers != null && j < arrApprovers.length; j++) {
			
				createApproval(ruleId, description, arrApprovers[j]);
			}
			
			
			for (var j = 0; arrNotifications != null && j < arrNotifications.length; j++) {
			
				createApproval(ruleId, description, arrNotifications[j], true);
			}
		}
	}
}

function createApproval(ruleId, description, approverId, notifyOnly){


	var statusId = 1; //not requested
	if (notifyOnly) {
		statusId = 7; //notification
	}
	
	var journalId = nlapiGetRecordId();
	
	var arrSearchFilters = new Array();
	arrSearchFilters[0] = new nlobjSearchFilter('custrecordr7approvalquote', null, 'anyof', journalId);
	arrSearchFilters[1] = new nlobjSearchFilter('custrecordr7approvalstatus', null, 'anyof', new Array(1, 2, 3, 4, 7));
	arrSearchFilters[2] = new nlobjSearchFilter('custrecordr7approvalrule', null, 'anyof', ruleId);
	arrSearchFilters[3] = new nlobjSearchFilter('custrecordr7approvalapprover', null, 'anyof', approverId);
	
	var arrSearchColumns = new Array();
	arrSearchColumns[0] = new nlobjSearchColumn('custrecordr7approvalrule');
	arrSearchColumns[1] = new nlobjSearchColumn('custrecordr7approvaldescription');
	arrSearchColumns[2] = new nlobjSearchColumn('custrecordr7approvalapprover');
	arrSearchColumns[3] = new nlobjSearchColumn('internalid');
	
	var arrSearchResults = nlapiSearchRecord('customrecordr7approvalrecord', null, arrSearchFilters, arrSearchColumns);

	// nlapiLogExecution('DEBUG', 'arrSearchResults.length', arrSearchResults.length);
	for (var i = 0; arrSearchResults != null && i < arrSearchResults.length; i++) {
	
		searchResult = arrSearchResults[i];
		var resultRuleId = searchResult.getValue(arrSearchColumns[0]);
		var resultDescription = searchResult.getValue(arrSearchColumns[1]);
		var resultApproverId = searchResult.getValue(arrSearchColumns[2]);
		var resultRecId = searchResult.getValue(arrSearchColumns[3]);
		
		if (resultDescription == description) {
			// nlapiLogExecution('DEBUG', 'found duplicate', 'yup');
			return true;
		}
		else {
			nlapiSubmitField('customrecordr7approvalrecord', resultRecId, 'custrecordr7approvalstatus', 5); //replaced
		}
		
	}
	
	var recApproval = nlapiCreateRecord('customrecordr7approvalrecord');
	recApproval.setFieldValue('custrecordr7approvalquote', journalId);
	recApproval.setFieldValue('custrecordr7approvalrule', ruleId);
	recApproval.setFieldValue('custrecordr7approvaldescription', description);
	recApproval.setFieldValue('custrecordr7approvalapprover', approverId);
	recApproval.setFieldValue('custrecordr7approvalstatus', statusId);
	try {
		nlapiSubmitRecord(recApproval);
	} 
	catch (e) {
		nlapiLogExecution('ERROR', e.name, e.message);
		var adminUser =  nlapiLoadConfiguration('companypreferences').getFieldValue('custscriptr7_system_info_email_sender');
		nlapiSendEmail(adminUser, adminUser, 'JA Process - createApproval', e.name + ' : ' + e.message + 'journalId: ' + journalId);
	}
	
}

function checkForAlreadyApproved(){
	
	var arrSearchFilters = new Array();
	arrSearchFilters[0] = new nlobjSearchFilter('custrecordr7approvalquote', null, 'is', nlapiGetRecordId());
	arrSearchFilters[1] = new nlobjSearchFilter('custrecordr7approvalstatus', null, 'anyof', new Array(1, 2, 4));
	
	var arrSearchResults = nlapiSearchRecord('customrecordr7approvalrecord', null, arrSearchFilters, null);
	
	var currentQuoteStatusId = nlapiGetFieldValue('custbodyr7quoteorderapprovalstatus');

	var recTranToSubmit = nlapiLoadRecord(nlapiGetRecordType(), nlapiGetRecordId());
	
	recTranToSubmit.setFieldValue('custbodyr7quoteorderapprovalstatus', currentQuoteStatusId);
	recTranToSubmit.setFieldValue('custbodyr7quoteapprovalrequester', nlapiGetUser());
	
	if (arrSearchResults == null || arrSearchResults.length <= 0) {
		recTranToSubmit.setFieldValue('custbodyr7quoteorderapprovalstatus', 3);
	} else {
		recTranToSubmit.setFieldValue('custbodyr7quoteorderapprovalstatus', 2);
	}
	
	nlapiSubmitRecord(recTranToSubmit);
	
}

function approveJournal(){

	var recTranToSubmit = nlapiLoadRecord(nlapiGetRecordType(), nlapiGetRecordId());
	recTranToSubmit.setFieldValue('custbodyr7quoteapprovalrequester', nlapiGetUser());
	recTranToSubmit.setFieldValue('custbodyr7quoteorderapprovalstatus', 3);
	nlapiSubmitRecord(recTranToSubmit);
	
	return;
}

function unique(a){
	a.sort();
	for (var i = 1; i < a.length;) {
		if (a[i - 1] == a[i]) {
			a.splice(i, 1);
		}
		else {
			i++;
		}
	}
	return a;
}


function requestNotifications(){

	var tranId = nlapiGetRecordId();
	var userId = nlapiGetUser();
	if (debug) {
		userId = 55011;
	}

	var arrSearchFilters = new Array();
	arrSearchFilters[0] = new nlobjSearchFilter('custrecordr7approvalquote', null, 'is', tranId);
	arrSearchFilters[1] = new nlobjSearchFilter('custrecordr7approvalstatus', null, 'anyof', new Array(1, 2, 4, 7));
	
	var arrSearchColumns = new Array();
	arrSearchColumns[0] = new nlobjSearchColumn('custrecordr7approvalrule');
	arrSearchColumns[1] = new nlobjSearchColumn('custrecordr7approvaldescription');
	arrSearchColumns[2] = new nlobjSearchColumn('custrecordr7approvalapprover');
	arrSearchColumns[3] = new nlobjSearchColumn('custrecordr7approvalquote');
	arrSearchColumns[4] = new nlobjSearchColumn('custrecordr7approvalstatus');
	arrSearchColumns[5] = new nlobjSearchColumn('custrecordr7approvaldaterequested');
	
	var arrSearchResults = nlapiSearchRecord('customrecordr7approvalrecord', null, arrSearchFilters, arrSearchColumns);
	
	var now = nlapiDateToString(new Date(), 'datetimetz');
	
	//nlapiLogExecution('DEBUG', '# to notify', arrNotificationIds.length);
	var notifyList = new Object();
	
	for (var j = 0; arrSearchResults != null && j < arrSearchResults.length; j++) {
		var sendLineItem = false;
		var lineItems = new Array();
		
		var lineItem = new Object();
		lineItem.rule = arrSearchResults[j].getText(arrSearchColumns[0]);
		lineItem.description = arrSearchResults[j].getValue(arrSearchColumns[1]);
		lineItem.approverText = arrSearchResults[j].getText(arrSearchColumns[2]);
		lineItem.approverId = arrSearchResults[j].getValue(arrSearchColumns[2]);
		lineItem.transaction = arrSearchResults[j].getText(arrSearchColumns[3]);
		lineItem.status = arrSearchResults[j].getValue(arrSearchColumns[4]);
		lineItem.statusText = arrSearchResults[j].getText(arrSearchColumns[4]);
		lineItem.dateRequested = arrSearchResults[j].getValue(arrSearchColumns[5]);
		lineItem.approvalType = 'Approval';
		
		if (lineItem.status == 1 || lineItem.status == 2 || lineItem.status == 4) {
			var fields = new Array();
			fields[0] = 'custrecordr7approvalstatus';
			fields[1] = 'custrecordr7approvaldaterequested';
			
			var values = new Array();
			
			if (lineItem.approverId == userId && !debug) {
				nlapiLogExecution('DEBUG', 'requestor is notifyee', 'marking approved');
				values[0] = 3; //approved
				values[1] = now;
			}
			else {
				sendLineItem = true;
				nlapiLogExecution('DEBUG', 'approval', 'yup');
				values[0] = 2; //pending approval
				values[1] = now;
			}
			
			try {
				nlapiSubmitField('customrecordr7approvalrecord', arrSearchResults[j].getId(), fields, values);
			} 
			catch (e) {
				nlapiLogExecution('ERROR', e.name, e.message);
			}
		}
		else 
			if (lineItem.status == 7) {
				sendLineItem = true;
				lineItem.approvalType = 'Notification';
				
				try {
					nlapiSubmitField('customrecordr7approvalrecord', arrSearchResults[j].getId(), 'custrecordr7approvaldaterequested', now);
				} 
				catch (e) {
					nlapiLogExecution('ERROR', e.name, e.message);
				}
				
			}
		
		if (sendLineItem) {
			if (notifyList.hasOwnProperty(lineItem.approverId)) {
				lineItems = notifyList[lineItem.approverId];
			}
			
			lineItems[lineItems.length] = lineItem;
			notifyList[lineItem.approverId] = lineItems;
		}
	}
	
	sendNotifications(notifyList);
	
	checkForAlreadyApproved();

}

function sendNotifications(notifyList){

	var userId = nlapiGetUser();
	if (debug) {
		userId = nlapiLoadConfiguration('companypreferences').getFieldValue('custscriptr7_system_info_email_sender');;
	}
	
	var tranId = nlapiGetRecordId();
	var records = new Array();
	records['transaction'] = tranId;
	
	var recordURL = nlapiResolveURL('RECORD', nlapiGetRecordType(), tranId);
	var toURL = nlapiRequestURL(nlapiResolveURL('SUITELET','customscriptretrieveurl','customdeployretrieveurl',true)).getBody().replace(".extsystem.",".app.");;
	recordURL = toURL + recordURL;
	nlapiLogExecution('DEBUG', 'recordURL is',recordURL);

	for (var notifyId in notifyList) {
	
		var lineItems = notifyList[notifyId];
		
		var subjectText = 'Transaction Approval/Notification: ' + lineItems[0]['transaction'];
		var bodyText = 'Below are items awaiting your approval/notification. Please click <a href="' + recordURL + '">here</a> to review the entry.<br><br>';
		
		bodyText += getTableHTML(lineItems);
		
		if (debug) {
			var adminUser =  nlapiLoadConfiguration('companypreferences').getFieldValue('custscriptr7_system_info_email_sender');
			nlapiSendEmail(userId, adminUser, subjectText, bodyText, null, null, records);
		}
		else {
			nlapiSendEmail(userId, notifyId, subjectText, bodyText, null, null, records);
		}
	}
}

function getTableHTML(lineItems){
	
	var lineHTML = '';
	lineHTML += '<html><body><table id="tfhover" class="tftable" border="1" style="font-size: 12px;color: #333333;width: 100%;border-width: 1px;border-color: #729ea5;border-collapse: collapse;">';

	//table headers
	lineHTML += '<tr style="background-color: #d4e3e5;">';
	
	var arrTableMap = new Object();
	arrTableMap['Type'] = 'approvalType';
	arrTableMap['Transaction'] = 'transaction';
	arrTableMap['Rule'] = 'rule';
	arrTableMap['Description'] = 'description';
	arrTableMap['Approver'] = 'approverText';
	
	for (headerName in arrTableMap) {
		lineHTML += '<th style="font-size: 12px;background-color: #acc8cc;border-width: 1px;padding: 8px;border-style: solid;border-color: #729ea5;text-align: left;">';
		lineHTML += headerName;
		lineHTML += '</th>';
	}
	
	lineHTML += '</tr>';
	//end table headers
	
	for (var i = 0; lineItems != null && i < lineItems.length; i++) {
		var lineItem = lineItems[i];
		
		lineHTML += '<tr style="background-color: #d4e3e5;">';
		
		for (headerName in arrTableMap) {
			lineHTML += '<td style="font-size: 12px;border-width: 1px;padding: 8px;border-style: solid;border-color: #729ea5;">' + lineItem[arrTableMap[headerName]] + '</td>';
		}
		
		lineHTML += '</tr>';
	}
		
	lineHTML += '</table></body></html>';
	
	return lineHTML;
}

