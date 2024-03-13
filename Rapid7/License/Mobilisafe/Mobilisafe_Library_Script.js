
function findLicenceByPK(productKey){

	nlapiLogExecution('DEBUG', 'findLicenceByPK()', 'productKey: ' + productKey);
	
	if (productKey != null && productKey != '') {
	
		var arrSearchFilters = new Array();
		arrSearchFilters[arrSearchFilters.length] = new nlobjSearchFilter('custrecordr7mblicenseproductkey', null, 'is', productKey);

		var arrSearchResults = nlapiSearchRecord('customrecordr7mobilisafelicense', null, arrSearchFilters);
		
		if (arrSearchResults != null && arrSearchResults.length >= 1) {
		
			return arrSearchResults[0].getId();
		}
		else {
			return null;
		}
	}
	
	return null;
	
}

function buildSuccessResponseObj(licenseId){

	if (licenseId != null && licenseId != '') {
	
		var recLicense = nlapiLoadRecord('customrecordr7mobilisafelicense', licenseId);
		
		var objResponse = new Object;
		
		objResponse.success = true;
		objResponse.message = '';
		
		objResponse.createdDate = formatResult(recLicense.getFieldValue('created'), true);
		objResponse.assessmentdatetime = formatResult(recLicense.getFieldValue('custrecordr7mblicense_lastassesdate'), true);
		objResponse.productKey = formatResult(recLicense.getFieldValue('custrecordr7mblicenseproductkey'));
		objResponse.internalId = formatResult(recLicense.getId());
		objResponse.name = formatResult(recLicense.getFieldValue('name'));
		objResponse.mbRecId = formatResult(recLicense.getFieldValue('custrecordr7mblicense_id'));
		objResponse.mbCustId = formatResult(recLicense.getFieldValue('custrecordr7mblicense_customer_id'));
		objResponse.periodEnd = formatResult(recLicense.getFieldValue('custrecordr7mblicense_period_end'), true);
		objResponse.planType = formatResult(recLicense.getFieldText('custrecordr7mblicense_plan'));
		objResponse.planId = formatResult(recLicense.getFieldValue('custrecordr7mblicense_plan'));
		objResponse.userCount = formatResult(recLicense.getFieldValue('custrecordr7mblicenselicensedusers'));
		objResponse.customerName = formatResult(recLicense.getFieldText('custrecordr7mblicensecustomer'));
		objResponse.customerId = formatResult(recLicense.getFieldValue('custrecordr7mblicensecustomer'));
		objResponse.emailServer = formatResult(recLicense.getFieldValue('custrecordr7mblicense_emailserver'));
		
		var contactId = formatResult(recLicense.getFieldValue('custrecordr7mblicensecontact'));
		objResponse.contactId = contactId;
		
		if (contactId != null && contactId != '') {
			var contactFields = nlapiLookupField('contact', contactId, new Array('entityid', 'email', 'phone'));
			objResponse.contactName = formatResult(contactFields['entityid']);
			objResponse.contactEmail = formatResult(contactFields['email']);
			objResponse.phoneNumber = formatResult(contactFields['phone']);
		}
		else {
			objResponse.contactName = '';
			objResponse.contactEmail = '';
			objResponse.phoneNumber = '';
		}
		
		return objResponse;
	}
	else {
		return createErrorObj('Your request cannot be processed presently. Please contact Rapid7 Support.');
	}
	
}

function buildSuccessCreditCardResponseObj(creditCardId){

	if (creditCardId != null && creditCardId != '') {
	
		var objResponse = new Object;
		
		objResponse.success = true;
		objResponse.message = '';
		objResponse.ccId = creditCardId;
		
		return objResponse;
	}
	else {
		nlapiLogExecution('ERROR', "creditCardId is NULL");
		return createErrorObj('Your request cannot be processed presently. Please contact Rapid7 Support.');
	}
	
}

function createErrorObj(msg){

	var objResponse = new Object;
	
	objResponse.success = false;
	objResponse.message = msg;
	
	nlapiLogExecution('ERROR', 'Returning error response', msg);
	return objResponse;
}

function createErrorJSON(msg){

	var objResponse = new Object;
	
	objResponse.success = false;
	objResponse.message = msg;
	
	return JSON.stringify(objResponse);
}

function formatResult(value, isDate){

	if (value == null) {
		value = '';
	}
	
	if (isDate && value != '') {
		value = nlapiStringToDate(value).getTime();
	}
	
	return value;
}