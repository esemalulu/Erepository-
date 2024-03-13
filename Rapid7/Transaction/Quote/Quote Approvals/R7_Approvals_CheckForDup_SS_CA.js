/*
 * @author efagone
 */
 
function checkForDupe(){

	var context = nlapiGetContext();
	nlapiLogExecution('DEBUG', 'context', context.getExecutionContext());
	if (context.getExecutionContext() == 'workflow') {
		var recQuote = nlapiGetNewRecord();
		var quoteId = recQuote.getId();
		var ruleId = context.getSetting('SCRIPT', 'custscript_r7_approvals_rule');
		var description = context.getSetting('SCRIPT', 'custscript_r7_approvals_description');
		var approverId = context.getSetting('SCRIPT', 'custscript_r7_approvals_approver');
		nlapiLogExecution('DEBUG', 'currentApprover', approverId);
		var statusId = context.getSetting('SCRIPT', 'custscript_r7_approvals_status');
		var opportunityId = context.getSetting('SCRIPT', 'custscript_r7_approvals_opportunity');
		if (opportunityId == null) {
			var adminUser =  nlapiLoadConfiguration('companypreferences').getFieldValue('custscriptr7_system_info_email_sender');
			nlapiSendEmail(adminUser, adminUser, 'oppId', 'opp: ' + opportunityId + ' approverid: ' + approverId + ' desc: ' + description);
		}
		var dateResponded = context.getSetting('SCRIPT', 'custscript_r7_approvals_dateresponded');
		
		nlapiLogExecution('DEBUG', 'Parameters', 'QuoteId: ' + quoteId + '\nRule: ' + ruleId + '\nDescription: ' + description + '\nApprover: ' + approverId + '\nStatus: ' + statusId);
		
		var arrSearchFilters = new Array();
		arrSearchFilters[0] = new nlobjSearchFilter('custrecordr7approvalquote', null, 'is', quoteId);
		arrSearchFilters[1] = new nlobjSearchFilter('custrecordr7approvalstatus', null, 'anyof', new Array(1, 2, 3, 4, 7));
		
		var arrSearchColumns = new Array();
		arrSearchColumns[0] = new nlobjSearchColumn('custrecordr7approvalrule');
		arrSearchColumns[1] = new nlobjSearchColumn('custrecordr7approvaldescription');
		arrSearchColumns[2] = new nlobjSearchColumn('custrecordr7approvalapprover');
		arrSearchColumns[3] = new nlobjSearchColumn('internalid');
		
		var arrSearchResults = nlapiSearchRecord('customrecordr7approvalrecord', null, arrSearchFilters, arrSearchColumns);
		nlapiLogExecution('DEBUG', 'checking for dups', 'yup');
		var foundDuplicate = false;
		for (var i in arrSearchResults) {
		
			searchResult = arrSearchResults[i];
			var resultRuleId = searchResult.getValue(arrSearchColumns[0]);
			var resultDescription = searchResult.getValue(arrSearchColumns[1]);
			var resultApproverId = searchResult.getValue(arrSearchColumns[2]);
			var resultRecId = searchResult.getValue(arrSearchColumns[3]);
			
			if (resultRuleId == ruleId && resultDescription == description && resultApproverId == approverId) {
				nlapiLogExecution('DEBUG', 'found duplicate', 'yup');
				foundDuplicate = true;
				return 'T';
				break;
			}
			else if (resultRuleId == ruleId && resultApproverId == approverId){
				nlapiSubmitField('customrecordr7approvalrecord', resultRecId, 'custrecordr7approvalstatus', '5');
			}
						
		}
		
		if (!foundDuplicate && !isInactive(approverId)) {
			nlapiLogExecution('DEBUG', 'found duplicate', 'nope');
			var recApproval = nlapiCreateRecord('customrecordr7approvalrecord');
			recApproval.setFieldValue('custrecordr7approvalquote', quoteId);
			recApproval.setFieldValue('custrecordr7approveopportunity', opportunityId);
			recApproval.setFieldValue('custrecordr7approvalrule', ruleId);
			recApproval.setFieldValue('custrecordr7approvaldescription', description);
			recApproval.setFieldValue('custrecordr7approvalapprover', approverId);
			recApproval.setFieldValue('custrecordr7approvalstatus', statusId);
			recApproval.setFieldValue('custrecordr7approvaldateresponded', dateResponded);
			nlapiLogExecution('DEBUG', 'submitting approval record', 'yup');
			try {
				nlapiSubmitRecord(recApproval);
			} 
			catch (e) {
				nlapiLogExecution('ERROR', e.name, e.message);
				var adminUser =  nlapiLoadConfiguration('companypreferences').getFieldValue('custscriptr7_system_info_email_sender');
				nlapiSendEmail(adminUser, adminUser, 'QA Process - Check For Dupe ERROR', e.name + ' : ' + e.message + 'quoteId: ' + quoteId + ' oppID=' + opportunityId);
			}
		}
		
		return 'F';
	}
	
}

function isInactive(employeeId){

	var isInactive=nlapiLookupField('employee',employeeId,'isinactive');
	return (isInactive==='T');
}