/*
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       17 Sep 2012     efagone
 *
 */

/*
 * The recordType (internal id) corresponds to the "Applied To" record in your script deployment. 
 * @appliedtorecord recordType
 * 
 * @param {String} type Operation types: create, edit, delete, xedit
 *                      approve, reject, cancel (SO, ER, Time Bill, PO & RMA only)
 *                      pack, ship (IF)
 *                      markcomplete (Call, Task)
 *                      reassign (Case)
 *                      editforecast (Opp, Estimate)
 * @returns {Void}
 */



function mbl_beforeSubmit(type){
	
	// --------------------- BEGIN ENVIRONMENT CHECK ---------------------
	
	if (['PRODUCTION'].indexOf(nlapiGetContext().getEnvironment()) == -1) {
	
		if (type == 'create') {
		
			var chars = 'BCDEFGHJKLMNPQRSTVWXYZ0123456789';
			var randomKey = '0000-0000-';
			for (var i = 0; i < 8; i++) {
				var rnum = Math.floor(Math.random() * chars.length);
				randomKey += chars.substring(rnum, rnum + 1);
				
				if (i == 3) {
					randomKey += '-';
				}
			}
			
			nlapiSetFieldValue('custrecordr7mblicenseproductkey', randomKey);
		}
		
		return;
	}
	
	// --------------------- END ENVIRONMENT CHECK ---------------------
	
	//restricted user stuff - MUST BE FIRST
	if (type == 'create' || type == 'edit') {
		
		nlapiSetFieldValue('custrecordr7mblicisblacklisted', 'F');
		
		var contactId = nlapiGetFieldValue('custrecordr7mblicensecontact');
		var isBlackListed = checkBlacklisted(contactId);
		var isRestricted = checkRestricted(contactId);
		
		if (isBlackListed || isRestricted){
			nlapiSetFieldValue('custrecordr7mblicisblacklisted', 'T');
		}
		
		if (isBlackListed) {
			nlapiSetFieldValue('custrecordr7mblicense_period_end', nlapiDateToString(nlapiAddDays(new Date(), -1)));
		}
		
		if (isRestricted) {
			nlapiSetFieldValue('custrecordr7mblicense_period_end', nlapiDateToString(nlapiAddDays(new Date(), -1)));
			if (type == 'create') {
				throw nlapiCreateError('ERROR', 'Failed to create license.  Please contact Rapid7 Support', true);
			}
		}
		
	}
	//end restricted user stuff
	
	//make request to mobilisafe server
	if (type == 'create' || type == 'edit') {
	
		var productKey = nlapiGetFieldValue('custrecordr7mblicenseproductkey');
		
		if (productKey == null || productKey == '' || type == 'create') {
			nlapiSetFieldValue('custrecordr7mblicenseproductkey', generateProductKey());
		}
		
		var doNotSync = nlapiGetFieldValue('custrecordr7mblicense_donotsync');
		
		if (doNotSync == 'T') {
			nlapiSetFieldValue('custrecordr7mblicense_donotsync', 'F');
		}
		else {
			sendToServer();
		}
		
		if (productKeyExists(nlapiGetFieldValue('custrecordr7mblicenseproductkey'))) {
			throw nlapiCreateError('REQUEST_ERROR', 'Product Key already exists', false);
		}
	}
	else {
		throw nlapiCreateError('FEATURE_UNAVAILABLE', 'Cannot trigger actions on anything other than create or edit', false);
	}
	//end mobilisafe request
}

function grabLicenseStatistics(){
	
	try {
	
		var defaultFailMsg = 'Failed to update license statistics.  Please contact Rapid7 Support';
		
		var headers = new Array();
		headers['Authorization'] = 'Basic YmlsbGluZ0Btb2JpbGlzYWZlLmNvbTpPMUYxWjV1TTBzODU0MFUh';
		headers['Content-Type'] = 'text/xml';
		
		var statisticsURL = 'https://mobilisafe.rapid7.com/api/statistics?productKey=';
		statisticsURL += nlapiGetFieldValue('custrecordr7mblicenseproductkey');
	
		var response = nlapiRequestURL(statisticsURL, null, headers);
		
		// Make sure the license server didn't throw an error back to us.  If it did, yell at the user.
		if (response == null || response.getCode() != 200) {
			var msg;
			if (response == null) {
				msg = "The response is null";
			}
			else {
				msg = response.getBody();
			}
			
			nlapiLogExecution('ERROR', 'The license server is responding with non-200', msg);
			var adminUser =  nlapiLoadConfiguration('companypreferences').getFieldValue('custscriptr7_system_info_email_sender');
			nlapiSendEmail(adminUser, adminUser, 'Error Mobilisafe Statistics', 'he license server is responding with non-200\nError: ' + msg);
		}
		
		// All should be OK, so parse the XML doc the server should have supplied us.
		var responseXML = null;
		try {
			responseXML = nlapiStringToXML(response.getBody());
		} 
		catch (e) {
			nlapiLogExecution('ERROR', 'An error occurred while attempting to parse the response doc', e);
			var adminUser =  nlapiLoadConfiguration('companypreferences').getFieldValue('custscriptr7_system_info_email_sender');
			nlapiSendEmail(adminUser, adminUser, 'Error Mobilisafe Statistics', 'Error: ' + e);
		}
		
		// A null doc can't possibly be good...
		if (responseXML == null) {
			var adminUser =  nlapiLoadConfiguration('companypreferences').getFieldValue('custscriptr7_system_info_email_sender');
			nlapiSendEmail(adminUser, adminUser, 'Error Mobilisafe Statistics', 'ResponseXML is null');
		}
		
		
		var list = nlapiSelectNode(responseXML, '//list');
		var statistics = nlapiSelectNodes(list, '//statistics');
		var statistic = statistics[0];
		var statisticsId = nlapiSelectValue(statistic, '@id');
		var dateCreated = nlapiSelectValue(statistic, 'dateCreated');
		var numberOfDevices = nlapiSelectValue(statistic, 'numberOfDevices');
		var numberOfActiveEmployees = nlapiSelectValue(statistic, 'numberOfActiveEmployees');
		var productKey = nlapiSelectValue(statistic, 'productkey');
		var organization = nlapiSelectNode(statistic, '//organization');
		var organizationId = nlapiSelectValue(organization, '@id');
		
		var dateConverted = '';
		if (dateCreated != null && dateCreated != '') {
			var year = dateCreated.substr(0, 4);
			var month = dateCreated.substr(5, 2);
			var day = dateCreated.substr(8, 2);
			dateConverted = month + '/' + day + '/' + year;
		}
		
		nlapiSetFieldValue('custrecordr7mblicense_id', statisticsId);
		nlapiSetFieldValue('custrecordr7mblicense_statisticsdate', dateConverted);
		nlapiSetFieldValue('custrecordr7mblicense_customer_id', organizationId);
		nlapiSetFieldValue('custrecordr7mblicense_numberdevices', numberOfDevices);
		nlapiSetFieldValue('custrecordr7mblicense_numberemployees', numberOfActiveEmployees);
		
	} 
	catch (e) {
	
	}
}

function generateProductKey(){

	var productKey = '';
	
	while (productKey == '' || productKeyExists(productKey)) {
	
		var chars = 'BCDEFGHJKLMNPQRSTVWXYZ0123456789';
		var randomKey = '';
		for (var i = 0; i < 16; i++) {
			var rnum = Math.floor(Math.random() * chars.length);
			randomKey += chars.substring(rnum, rnum + 1);
			
			if (i == 3 || i == 7 || i == 11) {
				randomKey += '-';
			}
		}
		
		productKey = randomKey;
	}
	
	return productKey;
}

function productKeyExists(productKey){

	if (productKey != null && productKey != '') {
		var arrSearchFilters = new Array();
		arrSearchFilters[arrSearchFilters.length] = new nlobjSearchFilter('custrecordr7mblicenseproductkey', null, 'is', productKey);
		if (nlapiGetRecordId() != null && nlapiGetRecordId() != '') {
			arrSearchFilters[arrSearchFilters.length] = new nlobjSearchFilter('internalid', null, 'noneof', nlapiGetRecordId());
		}
		
		var arrSearchResults = nlapiSearchRecord('customrecordr7mobilisafelicense', null, arrSearchFilters);
		
		if (arrSearchResults != null && arrSearchResults.length > 0) {
			return true;
		}
		
		return false;
	}
	
	return true;
}

function sendToServer(){

	var defaultFailMsg = 'Failed to create license.  Please contact Rapid7 Support';
	
	var contactId = nlapiGetFieldValue('custrecordr7mblicensecontact');
	var customerId = nlapiGetFieldValue('custrecordr7mblicensecustomer');
	
	//Validate Has Contact
	if (contactId == null || contactId == '' || contactId.length <= 1) 
		throw nlapiCreateError('REQUEST_FAILED', 'Please specify a contact', true);
		
	//Validate Has Customer
	if (customerId == null || customerId == '' || customerId.length <= 1) 
		throw nlapiCreateError('REQUEST_FAILED', 'Please specify a customer', true);
	
	var contactFields = nlapiLookupField('contact', contactId, new Array('entityid', 'email'));
	var contactName = contactFields['entityid'];
	var contactEmail = contactFields['email'];
	
	//Validate Contact Email
	if (contactEmail == null || contactEmail == '' || contactEmail.length < 2) 
		throw nlapiCreateError('REQUEST_FAILED', 'Invalid Contact Email', true);
	
	//Validate ContactName
	if (contactName == null || contactName == '' || contactName.length <= 1) 
		throw nlapiCreateError('REQUEST_FAILED', 'No Contact Name', true);
	
	var domain = contactEmail.substr(contactEmail.indexOf('@', 0) + 1);
	
	var productKey = nlapiGetFieldValue('custrecordr7mblicenseproductkey');
	var status = nlapiGetFieldValue('custrecordr7mblicense_status');
	var users = nlapiGetFieldValue('custrecordr7mblicenselicensedusers');
	var plan = nlapiGetFieldValue('custrecordr7mblicense_plan');
	var emailServer = nlapiGetFieldValue('custrecordr7mblicense_emailserver');
	var periodEnd = nlapiGetFieldValue('custrecordr7mblicense_period_end');
	
	switch (plan) {
		case '1':
			plan = 'ANNUAL';
			break;
		case '2':
			plan = 'MONTHLY';
			break;
		case '3':
			plan = 'TRIAL';
			break;
		case '4':
			plan = 'ASSESSMENT';
			break;
	}
	
	switch (status) {
		case '1':
			status = 'TRIAL';
			break;
		case '2':
			status = 'ACTIVE';
			break;
		case '3':
			status = 'PAST_DUE';
			break;
		case '4':
			status = 'CANCELED';
			break;
		case '5':
			status = 'UNPAID';
			break;
	}
	
	var requestXML = '';
	requestXML += '<?xml version="1.0" encoding="UTF-8"?>\n';
	requestXML += '<list>';
	requestXML += '<subscription>';
	requestXML += '<productKey>' + productKey + '</productKey>';
	requestXML += '<periodEnd>' + formatDate(periodEnd) + '</periodEnd>';
	requestXML += '<status>' + status + '</status>';
	requestXML += '<plan>' + plan + '</plan>';
	requestXML += '</subscription>';
	requestXML += '</list>';
	
	nlapiLogExecution('DEBUG', 'requestXML', requestXML);
	
	var authHeader = new Array();
	authHeader['Authorization'] = 'Basic YmlsbGluZ0Btb2JpbGlzYWZlLmNvbTpPMUYxWjV1TTBzODU0MFUh';

	var response = nlapiRequestURL('https://mobilisafe.rapid7.com/api/subscription', requestXML, authHeader);
	
	// Make sure the license server didn't throw an error back to us.  If it did, yell at the user.
	if (response == null || response.getCode() != 200) {
		var msg;
		if (response == null) {
			msg = "The response is null";
		}
		else {
			msg = response.getBody();
		}
		
		nlapiLogExecution('ERROR', 'The license server is responding with non-200', msg);
		throw nlapiCreateError('REQUEST_FAILED', defaultFailMsg, false);
	}
	
	// All should be OK, so parse the XML doc the server should have supplied us.
	var responseXML = null;
	try {
		responseXML = nlapiStringToXML(response.getBody());
	} 
	catch (e) {
		nlapiLogExecution('ERROR', 'An error occurred while attempting to parse the response doc', e);
		throw nlapiCreateError('REQUEST_FAILED', defaultFailMsg, true);
	}
	
	// A null doc can't possibly be good...
	if (responseXML == null) 
		throw nlapiCreateError('REQUEST_FAILED', 'Could not understand license response', false);
	
	// Detect any errors...
	var message = nlapiSelectValue(responseXML, '//message');
	
	if (message != 'SUCCESS') {
		nlapiLogExecution('ERROR', 'An error occurred while attempting to generate a license', message);
		
		throw nlapiCreateError('REQUEST_FAILED', defaultFailMsg, true);
	}
	
	
	// if we got this far, it was successfull
	var version = nlapiGetFieldValue('custrecordr7mblicense_version');
	if (version != null && version != '') {
		version = parseInt(version) + 1;
	}
	else {
		version = 1;
	}
	
	nlapiSetFieldValue('custrecordr7mblicense_version', version);
	
}

function formatDate(dt){
	//2008-09-10T15:05:03.307-04:00
	
	if (dt != null && dt != '') {
		dt = nlapiStringToDate(dt);
		var yr = formatNumber(dt.getUTCFullYear(), 4);
		var mo = formatNumber(dt.getUTCMonth() + 1, 2);
		var day = formatNumber(dt.getUTCDate(), 2);
		
		return yr + '-' + mo + '-' + day + 'T23:59:59.000-00:00';
	}
	else {
		return '';
	}
}

function formatNumber(n, precision){
    var s = '' + n;
    for (var i = s.length; i < precision; i++) {
        s = '0' + s;
    }
    return s;
}

