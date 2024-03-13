/*
 * @author efagone
 */

function beforeSubmit(type){
	
	if (type == 'create') {
	
		nlapiSetFieldValue('custrecordr7psojobsid', getRandomString(30));
	}
	
	if (type == 'create') {
		var context = nlapiGetContext();
		
		var salesOrderId = nlapiGetFieldValue('custrecordr7psojobsalesorder');
		nlapiLogExecution('DEBUG', 'salesOrderId', salesOrderId);
		
		var arrSearchFilters = new Array();
		arrSearchFilters[0] = new nlobjSearchFilter('custrecordr7psojobsalesorder', null, 'is', salesOrderId);
		
		var arrSearchResults = nlapiSearchRecord('customrecordr7psoparentjob', null, arrSearchFilters, null);
		
		if (arrSearchResults != null && arrSearchResults.length >= 1) {
		
			//sales order should be marked that it already has a parent job created
			try {
				nlapiSubmitField('salesorder', salesOrderId, 'custbodyr7salesorderpsojobcreated', 'T');
			}
			catch (e){
				
			}
			throw nlapiCreateError('Duplicate Entry', 'This Sales Order already has a Parent Job associated with it.', true);
		}
	}
}

function afterSubmit(type){

	if (type == 'create' || (type == 'edit' && nlapiGetFieldValue('custrecordr7psoparentcreatemissingeng') == 'T')) {
		this.context = nlapiGetContext();
		var recParentJob = nlapiGetNewRecord();
		var parentJobId = recParentJob.getId();
		var salesOrderId = recParentJob.getFieldValue('custrecordr7psojobsalesorder');
		var customerId = recParentJob.getFieldValue('custrecordr7psojobcustomer');
		
		var recSalesOrder = nlapiLoadRecord('salesorder', salesOrderId);
		var salesOrderLineCount = recSalesOrder.getLineItemCount('item');
		
		if (salesOrderLineCount != null) {
		
			for (var i = 1; i <= salesOrderLineCount; i++) {
			
				var itemId = recSalesOrder.getLineItemValue('item', 'item', i);
				var vsoeTotal = recSalesOrder.getLineItemValue('item', 'vsoeallocation', i);
				var currentEngLink = recSalesOrder.getLineItemValue('item', 'custcolr7psoengagement', i);
				var itemCreatePSOEng = nlapiLookupField('item', itemId, 'custitemr7createpsoengagement');
				
				if (itemCreatePSOEng == 'T' && (currentEngLink == '' || currentEngLink == null)) {
				
					var itemProperties = nlapiLookupField('item', itemId, new Array('itemid', 'custitemr7psotype', 'isinactive', 'custitemr7itemdefaultterm'));
					
					var itemName = itemProperties['itemid'];
					var engType = itemProperties['custitemr7psotype'];
					var inactiveItem = itemProperties['isinactive'];
					
					var itemDescription = recSalesOrder.getLineItemValue('item', 'description', i);
					var lineId = recSalesOrder.getLineItemValue('item', 'id', i);
					var sowDoc = recSalesOrder.getFieldValue('custbodyr7transsowdocument');
					
					var recEngagement = nlapiCreateRecord('customrecordr7psoengagement');
					recEngagement.setFieldValue('custrecordr7psoengcustomer', customerId);
					recEngagement.setFieldValue('custrecordr7psoengsalesorder', salesOrderId);
					recEngagement.setFieldValue('custrecordr7psoengparentjob', parentJobId);
					recEngagement.setFieldValue('custrecordr7psoengtotalvalue', vsoeTotal);
					recEngagement.setFieldValue('custrecordr7psoengtype', engType);
					recEngagement.setFieldValue('altname', itemName);
					recEngagement.setFieldValue('custrecordr7psoengitemnumber', itemId);
					recEngagement.setFieldValue('custrecordr7psoengsalesorderlineid', lineId);
					recEngagement.setFieldValue('custrecordr7psoengitemdisplayname', itemDescription);
					recEngagement.setFieldValue('custrecordr7psoengsowdocument', sowDoc);
					recEngagement.setFieldValue('custrecordr7psoengsid', getRandomString(30));
					
					if (inactiveItem == 'T') {
					
						nlapiLogExecution('DEBUG', 'Activating item', itemId);
						activateItem(itemId);
						
						var engagementId = nlapiSubmitRecord(recEngagement, null, true);
						createComponents(engagementId, customerId, salesOrderId, parentJobId, itemId);
						
						nlapiLogExecution('DEBUG', 'Deactivating item', itemId);
						deactivateItem(itemId);
						
					}
					else {
						var engagementId = nlapiSubmitRecord(recEngagement, null, true);
						createComponents(engagementId, customerId, salesOrderId, parentJobId, itemId);
					}
					
					recSalesOrder = nlapiLoadRecord('salesorder', salesOrderId);
					recSalesOrder.setLineItemValue('item', 'custcolr7psoengagement', i, engagementId);
					
					if (type == 'create') {
						var defaultTerm = itemProperties['custitemr7itemdefaultterm'];
						
						var startDate = new Date();
						var dateEndDate = new Date();
						
						if (defaultTerm != null && defaultTerm != '') {
							dateEndDate = nlapiAddDays(startDate, (parseInt(defaultTerm)) - 1);
						}
						else {
							dateEndDate = nlapiAddDays(nlapiAddDays(startDate, 365), -1);
						}
						
						recSalesOrder.setLineItemValue('item', 'revrecstartdate', i, nlapiDateToString(startDate));
						recSalesOrder.setLineItemValue('item', 'revrecenddate', i, nlapiDateToString(dateEndDate));
						//EITF-08-01
						recSalesOrder.setLineItemValue('item', 'custcolr7startdate', i, nlapiDateToString(startDate));
						recSalesOrder.setLineItemValue('item', 'custcolr7enddate', i, nlapiDateToString(dateEndDate));
					}
					
					try {
						nlapiSubmitRecord(recSalesOrder, null, true);
					} 
					catch (e) {
						nlapiLogExecution('ERROR', e.name, e.message);
						var adminUser =  nlapiLoadConfiguration('companypreferences').getFieldValue('custscriptr7_system_info_email_sender');
						nlapiSendEmail(adminUser, adminUser, 'PSO Parent Job - Error saving Sales Order', e.name + ' : ' + e.message + 'Sales order ID: ' + recSalesOrder.getId());
					}
				}
				
			}
			
			nlapiSubmitField('salesorder', salesOrderId, 'custbodyr7salesorderpsojobcreated', 'T');
			
		}
		
		if (nlapiGetFieldValue('custrecordr7psoparentcreatemissingeng') == 'T') {
			nlapiSubmitField('customrecordr7psoparentjob', nlapiGetRecordId(), 'custrecordr7psoparentcreatemissingeng', 'F');
		}
	}
	
}


