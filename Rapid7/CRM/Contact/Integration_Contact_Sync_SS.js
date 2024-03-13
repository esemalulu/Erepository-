/*
 * @author efagone
 */

function beforeSubmit(type){
	
}

function afterSubmit(type){

	var userId = nlapiGetUser();
	var roleId = nlapiGetRole();
	
	if (type == 'create' && roleId == 1091) { //marketo
		var contactId = nlapiGetRecordId();
		var customerId = nlapiGetFieldValue('company');
		
		if (customerId != null && customerId != '') {
		
			if (isFirstCompanyContact(contactId, customerId)) {
				var submitRec = false;
				
				var recCustomer = nlapiLoadRecord('customer', customerId);
				var companyEmail = recCustomer.getFieldValue('email');
				var companyPhone = recCustomer.getFieldValue('phone');
				
				if (companyEmail == null || companyEmail == '') {
					var contactEmail = nlapiGetFieldValue('email');
					recCustomer.setFieldValue('email', contactEmail);
					submitRec = true;
				}
				
				if (companyPhone == null || companyPhone == '') {
					var contactPhone = nlapiGetFieldValue('phone');
					recCustomer.setFieldValue('phone', contactPhone);
					submitRec = true;
				}
				
				if (submitRec) {
					nlapiSubmitRecord(recCustomer, true, true);
				}
			}
			
		}
	}
}

function isFirstCompanyContact(contactId, customerId){

	var arrSearchFilters = new Array();
	arrSearchFilters[arrSearchFilters.length] = new nlobjSearchFilter('company', null, 'is', customerId);
	arrSearchFilters[arrSearchFilters.length] = new nlobjSearchFilter('internalid', null, 'noneof', contactId);
	arrSearchFilters[arrSearchFilters.length] = new nlobjSearchFilter('isinactive', null, 'is', 'F');
	
	var arrSearchResults = nlapiSearchRecord('contact', null, arrSearchFilters);
	
	if (arrSearchResults == null) {
		return true;
	}
	
	return false;
}
