/*
 * @author efagone
 */

function procssPSOSalesOrder(orderId){

	var recOrder = nlapiLoadRecord('salesorder', orderId);
	nlapiLogExecution('DEBUG', 'Processing PSO For Order', recOrder.getRecordType() + ': ' + recOrder.getId());
	
	try {
		var parentJobId = findExistingParentJob(recOrder.getId());
		var needsProcessing = false;
		var shouldHaveParentJob = false;
		var salesOrderLineCount = recOrder.getLineItemCount('item');
		
		for (var i = 1; i <= salesOrderLineCount; i++) {
		
			var itemId = recOrder.getLineItemValue('item', 'item', i);
			var currentEngLink = recOrder.getLineItemValue('item', 'custcolr7psoengagement', i);
			var itemCreatePSOEng = nlapiLookupField('item', itemId, 'custitemr7createpsoengagement');
			
			if (itemCreatePSOEng == 'T') {
				shouldHaveParentJob = true;
				if (currentEngLink == '' || currentEngLink == null) {
					needsProcessing = true;
					break;
				}
			}
		}
		
		if (shouldHaveParentJob && (parentJobId == null || parentJobId == '')) {
			var customerId = recOrder.getFieldValue('entity');
			var customerName = recOrder.getFieldText('entity');
			var tranNumber = recOrder.getFieldValue('tranid');
			var dateInternalReporting = recOrder.getFieldValue('custbodyr7dateinternalreporting');
			
			if (dateInternalReporting == null || dateInternalReporting == '') {
				dateInternalReporting = recOrder.getFieldValue('trandate');
			}
			
			var dtDateInternalReporting = nlapiStringToDate(dateInternalReporting);
			var year = dtDateInternalReporting.getFullYear();
			var month = dtDateInternalReporting.getMonth() + 1;
			
			var formattedDate = year + '-' + month;
			var title = customerName + ' - ' + tranNumber + ' - ' + formattedDate;
			
			var recParentJob = nlapiCreateRecord('customrecordr7psoparentjob');
			recParentJob.setFieldValue('custrecordr7psojobcustomer', customerId);
			recParentJob.setFieldValue('custrecordr7psojobsalesorder', recOrder.getId());
			recParentJob.setFieldValue('custrecordr7psojobtitle', title);
			nlapiSubmitRecord(recParentJob, true, true);
			
		}
		else 
			if (needsProcessing) {
			
				var recParentJob = nlapiLoadRecord('customrecordr7psoparentjob', parentJobId);
				recParentJob.setFieldValue('custrecordr7psoparentcreatemissingeng', 'T');
				nlapiSubmitRecord(recParentJob, true, true);
			}
	} 
	catch (e) {
		var adminUser =  nlapiLoadConfiguration('companypreferences').getFieldValue('custscriptr7_system_info_email_sender');
		nlapiSendEmail(adminUser, adminUser, 'ERROR PROCESS ACL PSO SCRIPT', e.name + ' : ' + e.message);
	}
	nlapiLogExecution('DEBUG', 'Finished processing PSO For Order', recOrder.getRecordType() + ': ' + recOrder.getId());
}

function findExistingParentJob(salesOrderId){

	var arrSearchFilters = new Array();
	arrSearchFilters[arrSearchFilters.length] = new nlobjSearchFilter('custrecordr7psojobsalesorder', null, 'is', salesOrderId);
	
	var arrSearchResults = nlapiSearchRecord('customrecordr7psoparentjob', null, arrSearchFilters);
	
	if (arrSearchResults != null && arrSearchResults.length >= 1) {
		
		var parentJobId = arrSearchResults[0].getId();
		return parentJobId;
	}
	
	return null;
	
}
