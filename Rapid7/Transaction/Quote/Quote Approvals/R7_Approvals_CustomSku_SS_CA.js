/*
 * @author efagone
 */
function createCustomSkuApprovals(){

	var context = nlapiGetContext();
	
	if (context.getExecutionContext() == 'workflow') {
		
		var recQuote = nlapiGetNewRecord();
		this.quoteId = recQuote.getId();
		var numberOfItems = recQuote.getLineItemCount('item');
		
		if (numberOfItems != null) {
			for (var i = 1; numberOfItems != null && i <= numberOfItems; i++) {
				var itemId = recQuote.getLineItemValue('item', 'item', i);
				var fields = ['custitemr7itemapprover', 'custitemr7itemnotifiee']
				var itemFields = nlapiLookupField('item', itemId, fields);
				if (itemFields!=null){
					var strApproverIds = itemFields.custitemr7itemapprover;
					var strNotificationIds = itemFields.custitemr7itemnotifiee;
					var arrApprovers = new Array();
					var arrNotifications = new Array();
				
					if (strApproverIds != '') {
						arrApprovers = strApproverIds.split(",");
					}
					if (strNotificationIds != '') {
						arrNotifications = strNotificationIds.split(",");
					}
			
				 	if ((strApproverIds != '') || (strNotificationIds != '')) {
			
						var oppId = recQuote.getFieldValue('opportunity');
						var ruleId = '3'
						var lineNum = i;
						var itemDescription = recQuote.getLineItemValue('item', 'description', i);
						var itemName = nlapiLookupField('item', itemId, 'itemid');
						var approvalDescription = itemName + ': ' + itemDescription;
				
						/* Decided to take this out so we can see if there are ANY changes to the skew at all and if so, it would result in another approval
						 * 
						if ((itemDescription != '') && (itemDescription != null)) {
							itemDescription = itemDescription.substring(0, 40);
						}
						*/
						for (var j = 0; j < arrApprovers.length && arrApprovers != null; j++) {
					
							var approverId = arrApprovers[j];

							if (!isDuplicate(ruleId, approvalDescription, approverId) && !isInactive(approverId)) {
								var recApproval = nlapiCreateRecord('customrecordr7approvalrecord');
								
								recApproval.setFieldValue('custrecordr7approvalrule', ruleId);
								recApproval.setFieldValue('custrecordr7approveopportunity', oppId);
								recApproval.setFieldValue('custrecordr7approvalquote', quoteId);
								recApproval.setFieldValue('custrecordr7approvaldescription', approvalDescription);
								nlapiLogExecution('DEBUG', 'approverId', approverId);
								recApproval.setFieldValue('custrecordr7approvalapprover', approverId);
								recApproval.setFieldValue('custrecordr7approvalstatus', '1');
								
								nlapiSubmitRecord(recApproval);
							}
						}
				
						nlapiLogExecution('DEBUG','arrNotifications.length',arrNotifications.length);
				
						for (var j = 0; j < arrNotifications.length && arrNotifications != null; j++) {
					
							var notifyId = arrNotifications[j];

							if (!isDuplicate(ruleId, approvalDescription, notifyId) && !isInactive(notifyId)) {
								var recApproval = nlapiCreateRecord('customrecordr7approvalrecord');
								
								recApproval.setFieldValue('custrecordr7approvalrule', ruleId);
								recApproval.setFieldValue('custrecordr7approveopportunity', oppId);
								recApproval.setFieldValue('custrecordr7approvalquote', quoteId);
								recApproval.setFieldValue('custrecordr7approvaldescription', approvalDescription);
								nlapiLogExecution('DEBUG', 'notifyId', notifyId);
								recApproval.setFieldValue('custrecordr7approvalapprover', notifyId);
								recApproval.setFieldValue('custrecordr7approvalstatus', '7');
								
								nlapiSubmitRecord(recApproval);
							}
						}
					}
				}
			}
		}
	}
}



function isDuplicate(rule, description, approver){

	var arrSearchFilters = new Array();
	arrSearchFilters[0] = new nlobjSearchFilter('custrecordr7approvalquote', null, 'is', quoteId);
	arrSearchFilters[1] = new nlobjSearchFilter('custrecordr7approvalstatus', null, 'anyof', new Array(2, 3, 7));
	
	var arrSearchColumns = new Array();
	arrSearchColumns[0] = new nlobjSearchColumn('custrecordr7approvalrule');
	arrSearchColumns[1] = new nlobjSearchColumn('custrecordr7approvaldescription');
	arrSearchColumns[2] = new nlobjSearchColumn('custrecordr7approvalapprover');
	
	var arrSearchResults = nlapiSearchRecord('customrecordr7approvalrecord', null, arrSearchFilters, arrSearchColumns);
	
	if (arrSearchResults != null) {
		for (var k = 0; k < arrSearchResults.length; k++) {
		
			searchResult = arrSearchResults[k];
			var resultRule = searchResult.getValue(arrSearchColumns[0]);
			var resultDesc = searchResult.getValue(arrSearchColumns[1]);
			var resultApprover = searchResult.getValue(arrSearchColumns[2]);
			//nlapiLogExecution('DEBUG','Approval Record: ' + searchResult.getId(),'Rule: ' + resultRule + '\nDescription: ' + resultDesc + '\nApprover: ' + resultApprover);
			
			if (resultRule == rule && resultDesc == description && resultApprover == approver) {
				return true;
				break;
			}
			
		}
	}
	return false;
	
}

function isInactive(employeeId){
	
	var isInactive=nlapiLookupField('employee',employeeId,'isinactive');
	return isInactive=='T';	
}