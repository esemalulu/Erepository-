

function inProductUpgrade_Suitelet(request, response){

	this.requestOriginatingFrom = request.getHeader("Referer");
	try {
	
		if (request.getMethod() == 'POST' || true) {
		
			var url = request.getURL();
			this.parameters = request.getAllParameters();
			var headers = request.getAllHeaders();
			
			this.arrProductTypes = grabAllProductTypes();
			this.arrProductTypesByRecId = grabAllProductTypes(true);
			
			//Sanitizing all input data
			var accessCode = removeSpaces(request.getParameter('custparamcode'));
			var serialNumber = removeSpaces(request.getParameter('custparamserial'));
			var activationKey = removeSpaces(request.getParameter('custparampk'));
			var email = removeSpaces(request.getParameter('custparamemail'));
			var leadSource = removeSpaces(request.getParameter('custparamlead'));
			
			nlapiLogExecution('DEBUG', 'PARAMS', '\ncustparamcode=' + accessCode + '\ncustparamserial=' + serialNumber + '\custparampk=' + activationKey + '\custparamemail=' + email);
			
			var templateId = '';
			if (accessCode != null && accessCode != '') {
				templateId = getTemplateIdForAccessCode(accessCode);
			}
			
			if (templateId == null || templateId == '') {
				nlapiLogExecution('ERROR', 'templateId is null', 'problem');
				redirectToErrorPage(response, 'Your request cannot be processed presently. Please contact Rapid7 Support.');
				return;
			}
			
			try {
				var templateRecord = nlapiLoadRecord('customrecordr7lictemplatesupgrades', templateId);
			} 
			catch (err) {
				nlapiLogExecution('ERROR', 'Could not load templateRecord', 'problem');
				redirectToErrorPage(response, 'Your request cannot be processed presently. Please contact Rapid7 Support.');
				return;
			}
			
			var acrId = templateRecord.getFieldValue('custrecordr7lictemp_acrprodtype');
			
			var arrLicenseInfo = findLicenseInfo(activationKey, serialNumber, acrId);
			
			if (arrLicenseInfo == null) {
				nlapiLogExecution('ERROR', 'Could not locate specified license', 'problem');
				redirectToErrorPage(response, 'There was a problem locating the specified license. Please contact Rapid7 Support.');
				return;
			}
			
			var fields = new Array();
			fields['acrId'] = acrId;
			fields['activationKey'] = arrLicenseInfo[0];
			fields['licenseId'] = arrLicenseInfo[2];
			fields['itemFamily'] = arrLicenseInfo[4];
			fields['licRecordType'] = arrProductTypes[acrId]['recordid'];
			fields['templateId'] = templateId;
			fields['licenseTemplate'] = templateRecord.getFieldValue('custrecordr7lictemp_lictemp_id');
			fields['tempEmailTemplateId'] = templateRecord.getFieldValue('custrecordr7lictemp_activationtemp');
			fields['tempDays'] = templateRecord.getFieldValue('custrecordr7lictemp_expirationindays');
			fields['tempSendEmailFrom'] = templateRecord.getFieldValue('custrecordr7lictemp_sendemailfrom');
			fields['tempNotifyList'] = templateRecord.getFieldValues('custrecordr7lictemp_notifylist');
			fields['tempNotifySalesRep'] = templateRecord.getFieldValue('custrecordr7lictemp_notifysalesrep');
			fields['tempDescription'] = templateRecord.getFieldValue('altname');
			fields['tempOwner'] = templateRecord.getFieldValue('owner');
			fields['tempExistingFMRAction'] = templateRecord.getFieldValue('custrecordr7lictemp_existingfmractions');
			fields['tempCheckValidEmail'] = templateRecord.getFieldValue('custrecordr7lictemp_checkvalidemail');
			fields['tempCheckFreemail'] = templateRecord.getFieldValue('custrecordr7lictemp_freemailchecks');
			fields['tempOneTimeUse'] = templateRecord.getFieldValue('custrecordr7lictemp_onetime');
			fields['tempOneTimeUseResetDays'] = templateRecord.getFieldValue('custrecordr7lictemp_onetimeresetdays');
			fields['tempTopOff'] = templateRecord.getFieldValue('custrecordr7lictemp_topvalues');
			fields['tempRedirect'] = templateRecord.getFieldValue('custrecordr7lictemp_redirecturl');
			fields['tempRequireSpecificItemFamily'] = templateRecord.getFieldValue('custrecordr7lictemp_reqexistinglictype');
			
			if (fields['tempCheckValidEmail'] == 'T') {
				if (!validEmailDomain(email)) {
					nlapiLogExecution('ERROR', 'Invalid email', email);
					redirectToErrorPage(response, 'Please enter a valid email address.');
					return;
				}
			}
			if (fields['tempCheckFreemail'] == 'T') {
				if (freeEmailDomain(email)) {
					nlapiLogExecution('ERROR', 'Invalid/free email', email);
					redirectToErrorPage(response, 'Please enter a valid work email.');
					return;
				}
			}
			
			if (fields['tempRequireSpecificItemFamily'] != '' && fields['tempRequireSpecificItemFamily'] != null) {
				if (fields['tempRequireSpecificItemFamily'] != fields['itemFamily']) {
					nlapiLogExecution('ERROR', 'Upgrade not available to this license type', fields['itemFamily']);
					redirectToErrorPage(response, 'This product upgrade is not available for this license type. Please contact Rapid7 Support.');
					return;
				}
			}
			
			//final step
			if (checkExistsAlready(fields['tempOneTimeUse'], fields['tempOneTimeUseResetDays'], fields['templateId'], fields['activationKey'], email)) {
				nlapiLogExecution('ERROR', 'Product Key Already Used', email);
				redirectToErrorPage(response, 'This upgrade has already been used. Please contact Rapid7 Sales to upgrade.');
				return;
			}
			
			//submit for processing
			var recTracking = nlapiCreateRecord('customrecordr7lictemptracking');
			recTracking.setFieldValue('custrecordr7lictemptracking_productkey', fields['activationKey']);
			recTracking.setFieldValue('custrecordr7lictemptracking_email', email);
			recTracking.setFieldValue('custrecordr7lictemptracking_temprec', fields['templateId']);
			recTracking.setFieldValue('custrecordr7lictemptracking_ldsource', leadSource);
			recTracking.setFieldValue('custrecordr7lictemptracking_status', 3);
			nlapiSubmitRecord(recTracking);
			
			//redirect user to page
			var returnPath = 'http://www.rapid7.com';
			if (fields['tempRedirect'] != null && fields['tempRedirect'] != '') {
				returnPath = fields['tempRedirect'];
			}
			
			response.sendRedirect('EXTERNAL', returnPath);
			
		}
	} 
	catch (err) {
		nlapiLogExecution('ERROR', 'UNEXPECTED ERROR', err);
		redirectToErrorPage(response, 'Your request cannot be processed presently. Please contact Rapid7 Support.');
		return;
	}
}

function removeSpaces(str){

	if (str != null && str != '') {
		str = str.replace(/\s/g, '');
	}
	return str;
}

function redirectToErrorPage(response, msg){
	parameters['errormsg'] = msg;
	
	nlapiLogExecution('ERROR', 'Details:', 'error: ' + msg);
	response.sendRedirect('EXTERNAL', requestOriginatingFrom, null, null, parameters);
}

function checkExistsAlready(oneTimeUseValue, resetDays, templateId, activationKey, email){
	
	if (oneTimeUseValue != null && oneTimeUseValue != '') {
		if (templateId != null && templateId != '' && ((activationKey != '' && activationKey != null) || (email != '' && email != null))) {
		
			var arrFilters = [];
			arrFilters[arrFilters.length] = new nlobjSearchFilter('custrecordr7lictemptracking_temprec', null, 'is', templateId);
			
			if (resetDays != null && resetDays != '') {
				arrFilters[arrFilters.length] = new nlobjSearchFilter('created', null, 'before', 'daysago' + resetDays);
			}
			
			if (activationKey != null && activationKey != '' && (oneTimeUseValue == 1 || oneTimeUseValue == 3)) {
				arrFilters[arrFilters.length] = new nlobjSearchFilter('custrecordr7lictemptracking_productkey', null, 'is', activationKey);
			}
			if (email != null && email != '' && (oneTimeUseValue == 2 || oneTimeUseValue == 3)) {
				arrFilters[arrFilters.length] = new nlobjSearchFilter('custrecordr7lictemptracking_email', null, 'is', email);
			}
			
			var arrResults = nlapiSearchRecord('customrecordr7lictemptracking', null, arrFilters);
			
			if (arrResults != null) {
				return true;
			}
		}
	}
	return false;
}

function findLicenseInfo(activationKey, serialNumber, acrId){

	var acrProductTypeFields = arrProductTypes[acrId];
	
	if (acrProductTypeFields != null && acrProductTypeFields != '' && acrProductTypeFields != 'undefined') {
		var activationKeyField = acrProductTypeFields['activationid'];
		var serialNumberField = acrProductTypeFields['serialid'];
		var recordId = acrProductTypeFields['recordid'];
		var expirationField = acrProductTypeFields['expiration'];
		var licenseIdField = acrProductTypeFields['licenseid'];
		var itemFamilyField = acrProductTypeFields['itemfamily'];
		
		var arrSearchFilters = new Array();
		if (activationKey != null && activationKey != '') {
			arrSearchFilters[arrSearchFilters.length] = new nlobjSearchFilter(activationKeyField, null, 'is', activationKey);
		}
		else 
			if (serialNumber != null && serialNumber != '') {
				arrSearchFilters[arrSearchFilters.length] = new nlobjSearchFilter(serialNumberField, null, 'is', serialNumber);
			}
			else {
				return null;
			}
		
		var arrSearchColumns = new Array();
		arrSearchColumns[0] = new nlobjSearchColumn(expirationField);
		arrSearchColumns[1] = new nlobjSearchColumn('internalid');
		arrSearchColumns[2] = new nlobjSearchColumn(licenseIdField);
		arrSearchColumns[3] = new nlobjSearchColumn(activationKeyField);
		arrSearchColumns[4] = new nlobjSearchColumn(itemFamilyField);
		
		// remove after debug
		nlapiLogExecution('DEBUG','activationKeyField',activationKeyField);
		nlapiLogExecution('DEBUG','activationKey',activationKey);
		var arrSearchResults = nlapiSearchRecord(recordId, null, arrSearchFilters, arrSearchColumns);
		
		if (arrSearchResults != null && arrSearchResults.length >= 1) {
			var expDate = arrSearchResults[0].getValue(arrSearchColumns[0]);
			var licenseId = arrSearchResults[0].getValue(arrSearchColumns[1]);
			var name = arrSearchResults[0].getValue(arrSearchColumns[2]);
			var activationKey = arrSearchResults[0].getValue(arrSearchColumns[3]);
			var itemFamily = arrSearchResults[0].getValue(arrSearchColumns[4]); 
			
			return new Array(activationKey, expDate, licenseId, name, itemFamily);
		}
		
	}
	
	return null;
}

function validEmailDomain(email){
	
	if (email == null || email == ''){
		return false;
	}
	
	try {
		//var requestURL = 'https://updates.metasploit.com/services/validate_email?contactEmail=' + email;
		var requestURL = 'https://updates.metasploit.com/services/validate_email?contactEmail=' + email;
		var response = nlapiRequestURL(requestURL);
		
		var resp = response.getBody();
		
		if (resp == null) {
			nlapiLogExecution('ERROR', 'NULL Response for HD Webservice', 'Yup');
			var adminUser =  nlapiLoadConfiguration('companypreferences').getFieldValue('custscriptr7_system_info_email_sender');
			nlapiSendEmail(adminUser, adminUser, 'NULL response from HD validEmailDomain server', 'Look into this.. maybe defaut to true in this case');
			return false;
		}
		
		var xml = nlapiStringToXML(resp);
		var result = nlapiSelectNode(xml, '//result');
		var valid = nlapiSelectValue(result, '@valid');
		var reason = nlapiSelectValue(result, '@reason');
		
		if (valid == 'false' && reason != 'Invalid response') { //treating invalid response as valid per HD: 'We may need to treat 'Invalid response' as valid as  a workaround' 3/28/2012
			return false;
		}
		else {
			return true;
		}
	} 
	catch (err) {
		nlapiLogExecution('ERROR', 'Bad Response for HD Webservice', 'Yup');
		return true;
	}
}


function freeEmailDomain(email){
	if (email == null || email == '') 
		return false;
	if (email.indexOf('@') == -1) 
		return false;
	var domain = email.substr(email.indexOf('@', 0) + 1);
	nlapiLogExecution('DEBUG', 'Domain Parsed', domain);
	var searchFilters = new Array(new nlobjSearchFilter('name', null, 'is', domain), new nlobjSearchFilter('name', null, 'is', domain));
	var searchResults = nlapiSearchRecord('customrecordr7domainnames', null, searchFilters);
	if (searchResults != null && searchResults.length >= 1) {
		return true;
	}
	else {
		return false;
	}
	return false;
}

function getTemplateIdForAccessCode(accessCode){

	var arrSearchFilters = new Array();
	arrSearchFilters[arrSearchFilters.length] = new nlobjSearchFilter('custrecordr7lictemp_accesscode', null, 'is', accessCode);
	
	var arrSearchResults = nlapiSearchRecord('customrecordr7lictemplatesupgrades', null, arrSearchFilters);
	
	if (arrSearchResults != null) {
		return arrSearchResults[0].getId();
	}
	
	return null;
}
