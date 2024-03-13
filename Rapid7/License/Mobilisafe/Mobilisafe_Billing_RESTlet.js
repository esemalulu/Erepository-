/*
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       18 Sep 2012     efagone
 *
 */

/**
 * @param {Object} dataIn Parameter object
 * @returns {Object} Output object
 */
function post_mobilisafe_billing(dataIn){

	try {
		//grabbing all input data
		var requestType = grabValue(dataIn, 'requestType');
		var licenseId = grabValue(dataIn, 'licenseId');
		var productKey = grabValue(dataIn, 'productKey');
		var planId = grabValue(dataIn, 'planId');
		//var ccId = grabValue(dataIn, 'ccid');
		var ccdefault = grabValue(dataIn, 'ccdefault');
		var ccmonth = grabValue(dataIn, 'ccexpiremonth');
		var ccyear = grabValue(dataIn, 'ccexpireyear');
		var ccexpiredate = ccmonth + '/' + ccyear;
		var ccmemo = grabValue(dataIn, 'ccmemo');
		var ccname = grabValue(dataIn, 'ccname');
		var ccnumber = grabValue(dataIn, 'ccnumber');
		var cccustomercode = grabValue(dataIn, 'customercode');
		var ccpaymentmethod = grabValue(dataIn, 'paymentmethod');
		
		if (ccdefault.toLowerCase() == 'true' || ccdefault == 't') {
			ccdefault = 'T';
		}
		if (ccdefault.toLowerCase() == 'false' || ccdefault == 'f') {
			ccdefault = 'F';
		}
		
		// determine card type (VISA, MASTERCARD, AMEX, DISCOVER)
		switch (ccnumber.substr(0, 1)) {
			case '3':
				ccpaymentmethod = 6;
				break;
			case '4':
				ccpaymentmethod = 5;
				break;
			case '5':
				ccpaymentmethod = 4;
				break;
			case '6':
				ccpaymentmethod = 3;
				break;
			default:
				nlapiLogExecution("ERROR", "Null/Invalid CC Number", ccnumber);
				return createErrorObj("Please enter a valid credit card number.");
				break;
		}
		
		//Check requestType
		if (requestType != 'add' && requestType != 'update' && requestType != 'delete') {
			nlapiLogExecution("ERROR", "Invalid request type", licenseId);
			return createErrorObj("Please enter a valid request type.");
		}
		
		//Check licenseId
		if (licenseId == null || licenseId == '' || licenseId.length < 1) {
			licenseId = findLicenceByPK(productKey);
			if (licenseId == null || licenseId == '' || licenseId.length < 1) {
				nlapiLogExecution("ERROR", "Null/Invalid License ID", licenseId);
				return createErrorObj("Could not determine current license status. Please contact Rapid7 Support.");
			}
		}
		
		//Check ccnumber
		if (requestType == 'add' || requestType == 'update') {
			if (ccnumber == null || ccnumber == '' || ccnumber.length < 1) {
				nlapiLogExecution("ERROR", "Null/Invalid CC Number", ccnumber);
				return createErrorObj("Please enter a valid credit card number.");
			}
		}
		
		var licFields = nlapiLookupField('customrecordr7mobilisafelicense', licenseId, new Array('custrecordr7mblicensecustomer', 'custrecordr7mblicense_cc_id'));
		var customerId = licFields['custrecordr7mblicensecustomer'];
		var ccId = licFields['custrecordr7mblicense_cc_id'];
		
		var recCustomer = nlapiLoadRecord('customer', customerId);
		
		var ccCount = recCustomer.getLineItemCount('creditcards');
		
		var foundCC = false;
		var message = '';
		
		if (requestType == 'update') {
			for (var i = 1; i <= ccCount; i++) {
				var existingCCId = recCustomer.getLineItemValue('creditcards', 'internalid', i);
				
				if (ccId === existingCCId) {
					if (ccdefault != null && ccdefault != '') {
						recCustomer.setLineItemValue('creditcards', 'ccdefault', ccCount + 1, ccdefault);
					}
					recCustomer.setLineItemValue('creditcards', 'ccexpiredate', i, ccexpiredate);
					recCustomer.setLineItemValue('creditcards', 'ccmemo', i, ccmemo);
					recCustomer.setLineItemValue('creditcards', 'ccname', i, ccname);
					recCustomer.setLineItemValue('creditcards', 'ccnumber', i, ccnumber);
					recCustomer.setLineItemValue('creditcards', 'customercode', i, cccustomercode);
					recCustomer.setLineItemValue('creditcards', 'paymentmethod', i, ccpaymentmethod);
					foundCC = true;
					break;
				}
			}
			if (!foundCC) {
				nlapiLogExecution("ERROR", "Could not find CCid to update", ccId);
				return createErrorObj("Your request cannot be processed presently. Please contact Rapid7 Support.");
			}
			else {
				message = 'Credit card successfully updated.';
			}
		}
		else 
			if (requestType == 'add') {
			
				recCustomer.setLineItemValue('creditcards', 'ccdefault', ccCount + 1, ccdefault);
				recCustomer.setLineItemValue('creditcards', 'ccexpiredate', ccCount + 1, ccexpiredate);
				recCustomer.setLineItemValue('creditcards', 'ccmemo', ccCount + 1, ccmemo);
				recCustomer.setLineItemValue('creditcards', 'ccname', ccCount + 1, ccname);
				recCustomer.setLineItemValue('creditcards', 'ccnumber', ccCount + 1, ccnumber);
				recCustomer.setLineItemValue('creditcards', 'customercode', ccCount + 1, cccustomercode);
				recCustomer.setLineItemValue('creditcards', 'paymentmethod', ccCount + 1, ccpaymentmethod);
				
				message = 'Credit card successfully added.';
			}
			else 
				if (requestType == 'delete') {
					for (var i = ccCount; i >= 1; i--) {
						var existingCCId = recCustomer.getLineItemValue('creditcards', 'internalid', i);
						
						if (ccId == existingCCId) {
							recCustomer.removeLineItem('creditcards', i);
							foundCC = true;
						}
					}
					
					if (!foundCC) {
						nlapiLogExecution("ERROR", "Could not find CCid to delete", ccId);
						return createErrorObj("Your request cannot be processed presently. Please contact Rapid7 Support.");
					}
					else {
						message = 'Credit card successfully delete.';
					}
				}
		
		try {
			var id = nlapiSubmitRecord(recCustomer, true, true);
		} 
		catch (e) {
			nlapiLogExecution('ERROR', "Details", e);
			var eMessage = e.message;
			var errorMsg = 'Your request cannot be processed presently. Please contact Rapid7 Support.';
			
			if (eMessage.indexOf('for the following field: ccnumber') != '-1') {
				errorMsg = 'Please enter a valid credit card number.';
			}
			return createErrorObj(errorMsg);
		}
		
		var newCCID = ccId;
		
		if (requestType == 'add') {
		
			var recCustomer = nlapiLoadRecord('customer', customerId);
			var ccCount = recCustomer.getLineItemCount('creditcards');
			nlapiLogExecution('DEBUG', 'ccexpiredate', ccexpiredate);
			
			for (var i = ccCount; i >= 1; i--) {
				var existingCCId = recCustomer.getLineItemValue('creditcards', 'internalid', i);
				var existingCCNumber = recCustomer.getLineItemValue('creditcards', 'ccnumber', i);
				var existingCCExpire = recCustomer.getLineItemValue('creditcards', 'ccexpiredate', i);
				nlapiLogExecution('DEBUG', 'existingCCExpire', existingCCExpire);
				
				if (ccnumber.substr(ccnumber.length - 4) == existingCCNumber.substr(existingCCNumber.length - 4)) {
					newCCID = existingCCId;
					
					if (ccexpiredate.substr(ccexpiredate.length - 4) == existingCCExpire.substr(existingCCExpire.length - 4)) {
						break;
					}
					
				}
			}
		}
		
		try {
			var recLicense = nlapiLoadRecord('customrecordr7mobilisafelicense', licenseId);
			recLicense.setFieldValue('custrecordr7mblicense_cc_id', newCCID);
			
			if (planId != null && planId != '') {
				recLicense.setFieldValue('custrecordr7mblicense_plan', planId);
				recLicense.setFieldValue('custrecordr7mblicense_period_end', nlapiDateToString(nlapiAddDays(new Date(), 30)));
			}
			nlapiSubmitRecord(recLicense, true, true);
		} 
		catch (e) {
			nlapiLogExecution('ERROR', "Details", e);
			var errorMsg = 'There has been a problem updating your account. Please contact Rapid7 Support.';
			return createErrorObj(errorMsg);
		}
		
		return buildSuccessCreditCardResponseObj(newCCID);
	} 
	catch (e) {
		nlapiLogExecution('ERROR', "Details", e);
		var eMessage = e.message;
		var errorMsg = 'Your request cannot be processed presently. Please contact Rapid7 Support.';
		
		if (eMessage.indexOf('for the following field: ccnumber') != '-1') {
			errorMsg = 'Please enter a valid credit card number.';
		}
		return createErrorObj(errorMsg);
	}
}

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

function grabValue(dataIn, field){

	var value = '';
	if (dataIn.hasOwnProperty(field)) {
		value = dataIn[field];
	}
	else {
		value = '';
	}
	
	if (value == null) {
		value = '';
	}
	
	return value;
}
