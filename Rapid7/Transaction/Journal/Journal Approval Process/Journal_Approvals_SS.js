/*
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       31 Mar 2013     efagone
 *
 */

/*
 * The recordType (internal id) corresponds to the "Applied To" record in your script deployment. 
 * @appliedtorecord recordType
 * 
 * @param {String} type Operation types: create, edit, delete, xedit,
 *                      approve, cancel, reject (SO, ER, Time Bill, PO & RMA only)
 *                      pack, ship (IF only)
 *                      dropship, specialorder, orderitems (PO only) 
 *                      paybills (vendor payments)
 * @returns {Void}
 */


function approvals_afterSubmit(type){
//
//	if (type == 'create' || type == 'copy' || type == 'edit') {
//	
//		var approved = nlapiGetFieldValue('approved');
//		
//		if (approved == 'T') {
//			return;
//		}
//		
//		// RULE: Go to creator's (employee) Supervisor Direct (header)
//		runCreatorRule();
//		
//		// RULE: Approval based on Account approver (line items)
//		runAccountRules();
//	}
//	
}

function runCreatorRule(){
	
	var userId = nlapiGetUser();
	var ruleId = 5; //created by
	var userFields = nlapiLookupField('employee', userId, new Array('custentityr7supervisordirect', 'entityid'));
	var description = 'Created by ' + userFields['entityid'];
	var approverId = userFields['custentityr7supervisordirect'];
	
	createApproval(ruleId, description, approverId);
}

function runAccountRules(){

	var ruleId = '15'; //Account Specific
	var numberOfLines = nlapiGetLineItemCount('line');
	
	for (var i = 1; numberOfLines != null && i <= numberOfLines; i++) {
	
		var accountId = nlapiGetLineItemValue('line', 'account', i);
		var fields = ['custrecordr7accountjournalentryapprover', 'custrecordr7accountjournalentrynotifier'];
		var accountFields = nlapiLookupField('account', accountId, fields);
		
		if (accountFields != null) {
			var strApproverIds = accountFields.custrecordr7accountjournalentryapprover;
			var strNotificationIds = accountFields.custrecordr7accountjournalentrynotifier;
			
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
			var description = accountName + ': ' + entity + ' (LINE ' + i + ')';
			
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
	
	for (var i = 0; arrSearchResults != null && i < arrSearchResults.length; i++) {
	
		searchResult = arrSearchResults[i];
		var resultRuleId = searchResult.getValue(arrSearchColumns[0]);
		var resultDescription = searchResult.getValue(arrSearchColumns[1]);
		var resultApproverId = searchResult.getValue(arrSearchColumns[2]);
		var resultRecId = searchResult.getValue(arrSearchColumns[3]);
		
		if (resultDescription == description) {
			nlapiLogExecution('DEBUG', 'found duplicate', 'yup');
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
	nlapiSubmitRecord(recApproval);
	
	try {
	
	} 
	catch (e) {
		nlapiLogExecution('ERROR', e.name, e.message);
		var adminUser =  nlapiLoadConfiguration('companypreferences').getFieldValue('custscriptr7_system_info_email_sender');
		nlapiSendEmail(adminUser, adminUser, 'JA Process - createApproval', e.name + ' : ' + e.message + 'journalId: ' + journalId);
	}
	
}
