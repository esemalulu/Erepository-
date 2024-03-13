/*
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       20 Feb 2013     efagone
 *
 * ----------------------------------------------------------------------------------------------------
 * Change history:
 *
 * 5 Dec 2016	Valery Ostranitcyn	Population Denied Party Status and Denied Party Last Screening Date 
 *									with values from respective LRP record
 *
 * ----------------------------------------------------------------------------------------------------
 *
 */

/*
 * @param {String} type Context Types: scheduled, ondemand, userinterface, aborted, skipped
 * @returns {Void}
 */

var objCustomerProps = new Object();
var objContactProps = new Object();

function processUpdates(type){

	var timeLimitInMinutes = 10;
	this.timeLimitInMilliseconds = timeLimitInMinutes * 60 * 1000;
	this.startingTime = new Date().getTime();
	this.context = nlapiGetContext();
	this.rescheduleScript = false;
	
	processAllRequests();
	
	if (rescheduleScript) {
		nlapiLogExecution('DEBUG', 'Rescheduling script', context.getScriptId());
		nlapiScheduleScript(context.getScriptId(), context.getDeploymentId());
	}
	
}

function processAllRequests(){

	var arrFilters = new Array();
	arrFilters[0] = new nlobjSearchFilter('custrecordr7licreq_unprocessable', null, 'is', 'F');
	arrFilters[1] = new nlobjSearchFilter('custrecordr7licreqproc_pendingupdatescon', null, 'noneof', '@NONE@');
	arrFilters[1].setLeftParens(1);
	arrFilters[1].setOr(true);
	arrFilters[2] = new nlobjSearchFilter('custrecordr7licreqproc_pendingupdatescus', null, 'noneof', '@NONE@');
	arrFilters[2].setRightParens(1);
	
	var arrSearchColumns = new Array();
	arrSearchColumns[0] = new nlobjSearchColumn('internalid');
	arrSearchColumns[1] = new nlobjSearchColumn('custrecordr7lictemp_acrprodtype', 'custrecordr7licreq_lictempupgraderec');
	
	var arrRequestsToProcess = nlapiSearchRecord('customrecordr7licreqprocessing', null, arrFilters, arrSearchColumns);
	if (arrRequestsToProcess != null){
		nlapiLogExecution('DEBUG', '# Request Updates To Process', arrRequestsToProcess.length);
	}
	for (var i = 0; arrRequestsToProcess != null && i < arrRequestsToProcess.length && timeLeft() && unitsLeft(); i++) {
	
		try {
			
			var licRequestId = arrRequestsToProcess[i].getId();
					
			var beginTime = new Date();
			nlapiLogExecution('DEBUG', 'Processing Request ID', licRequestId);
			var acrProdType = arrRequestsToProcess[i].getText(arrSearchColumns[1]);
			
			var recLicRequest = nlapiLoadRecord('customrecordr7licreqprocessing', licRequestId);
			var unproccessable = recLicRequest.getFieldValue('custrecordr7licreq_unprocessable');
			if (unproccessable == 'T'){
				continue;
			}
			
			
			var companyLink = recLicRequest.getFieldValue('custrecordr7licreq_companylink');
			var companyUpdatePending = recLicRequest.getFieldValue('custrecordr7licreqproc_pendingupdatescus');
			var contactLink = recLicRequest.getFieldValue('custrecordr7licreq_contactlink');
			var contactUpdatePending = recLicRequest.getFieldValue('custrecordr7licreqproc_pendingupdatescon');
			var currentErrorText = recLicRequest.getFieldValue('custrecordr7licreq_errortext');
			
			if (companyLink != null && companyLink != '' && companyUpdatePending != null && companyUpdatePending != '') {
				try {
					nlapiLogExecution('DEBUG', 'Updating Company', licRequestId);
					var processbeginTime = new Date();
					var nullOnly = (companyUpdatePending == 2) ? false : true;
					createOrUpdateCompany(recLicRequest, companyLink, nullOnly);
					recLicRequest.setFieldValue('custrecordr7licreqproc_pendingupdatescus', '');
					nlapiLogExecution('AUDIT', 'Time (in seconds) To Process Company - ID:' + licRequestId, (new Date().getTime() - processbeginTime.getTime())/1000);
				} 
				catch (err) {
					recLicRequest.setFieldValue('custrecordr7licreq_errortext', err);
					if (currentErrorText != null && currentErrorText != '') {
						var adminUser =  nlapiLoadConfiguration('companypreferences').getFieldValue('custscriptr7_system_info_email_sender');
						nlapiSendEmail(adminUser, adminUser, 'UNPROCESSABLE - company', 'ID: ' + licRequestId + '\nType: ' + acrProdType + '\nError: ' + err);
						recLicRequest.setFieldValue('custrecordr7licreq_unprocessable', 'T');
					}
					nlapiSubmitRecord(recLicRequest);
					continue;
				}
			}
			
			if (contactLink != null && contactLink != '' && contactUpdatePending != null && contactUpdatePending != '') {
				try {
					nlapiLogExecution('DEBUG', 'Creating Contact', licRequestId);
					var processbeginTime = new Date();
					var nullOnly = (contactUpdatePending == 2) ? false : true;
					createOrUpdateContact(recLicRequest, contactLink, nullOnly);
					recLicRequest.setFieldValue('custrecordr7licreqproc_pendingupdatescon', '');
					nlapiLogExecution('AUDIT', 'Time (in seconds) To Process Contact - ID:' + licRequestId, (new Date().getTime() - processbeginTime.getTime())/1000);
				} 
				catch (err) {
					recLicRequest.setFieldValue('custrecordr7licreq_errortext', err);
					if (currentErrorText != null && currentErrorText != '') {
						var adminUser =  nlapiLoadConfiguration('companypreferences').getFieldValue('custscriptr7_system_info_email_sender');
						nlapiSendEmail(adminUser, adminUser, 'UNPROCESSABLE - contact', 'ID: ' + licRequestId + '\nType: ' + acrProdType + '\nError: ' + err);
						recLicRequest.setFieldValue('custrecordr7licreq_unprocessable', 'T');
					}
					nlapiSubmitRecord(recLicRequest);
					continue;
				}
			}
			
			nlapiSubmitRecord(recLicRequest);
			
			nlapiLogExecution('DEBUG', 'Finished Processing Request ID', licRequestId);
			nlapiLogExecution('AUDIT', 'Total Time (in seconds) To Process Entire Record - ID:' + licRequestId, (new Date().getTime() - beginTime.getTime())/1000);
		}
		catch (e) {
			try {
				var adminUser =  nlapiLoadConfiguration('companypreferences').getFieldValue('custscriptr7_system_info_email_sender');
				nlapiSendEmail(adminUser, adminUser, 'Something Went Wrong Processing Lic Request UPDATES', 'Error: ' + e, 'errol_fagone@rapid7.com');
				nlapiSubmitField('customrecordr7licreqprocessing', arrRequestsToProcess[i].getId(), new Array('custrecordr7licreq_unprocessable', 'custrecordr7licreq_errortext'), new Array('T', e));
			} 
			catch (e) {
				continue;
			}
		}
		
		if ((i+1) >= arrRequestsToProcess.length){ //check to see if others came in
			arrRequestsToProcess = nlapiSearchRecord('customrecordr7licreqprocessing', null, arrFilters);
			i = -1;
		}
	}
	
}

function createOrUpdateCompany(recLicRequest, existingCustomerId, nullOnly){
	
	if (nullOnly == null){
		nullOnly = false;
	}
	
	var fields = new Array();
	fields['companyname'] = recLicRequest.getFieldValue('custrecordr7licreq_companyname');
	fields['custentityr7annualrevenue'] = recLicRequest.getFieldValue('custrecordr7licreq_annualrevenue');
	fields['email'] = recLicRequest.getFieldValue('custrecordr7licreq_email');
	fields['phone'] = recLicRequest.getFieldValue('custrecordr7licreq_phone');
	fields['leadsource'] = recLicRequest.getFieldValue('custrecordr7licreq_leadsource');
	fields['custentityr7lrpsid'] = recLicRequest.getFieldValue('custrecordr7licreq_lrpsid');
	fields['language'] = getLanguageId(recLicRequest.getFieldValue('custrecordr7licreqproc_language'), 'customer');
	fields['custentityr7territoryassignmentflag'] = 'F';
	// Set Subsidiary field to Rapid7 IID=1
	fields['subsidiary'] = 1;

	var fieldsNeverUpdate = new Array();
	fieldsNeverUpdate['companyname'] = true;
	fieldsNeverUpdate['language'] = true;

	var fieldsAlwaysUpdate = new Array();
	fieldsAlwaysUpdate['leadsource'] = true;
	fieldsAlwaysUpdate['custentityr7lrpsid'] = true;
	
	var record = null;
	
	if (!isBlank(existingCustomerId)) {
		var stage = getCustomerProperties(existingCustomerId, 'stage');
		record = nlapiLoadRecord(stage, existingCustomerId);
	}
	else {
		existingCustomerId = null;
		record = nlapiCreateRecord('prospect');
	}
	
	for (field in fields) {
		if (!isBlank(existingCustomerId)) {
			if (fieldsNeverUpdate[field]) {
				continue;
			}
			if (fieldsAlwaysUpdate[field]) {
				record.setFieldValue(field, fields[field]);
				continue;
			}
		}
		
		if (nullOnly) {
			var existingValue = record.getFieldValue(field);
			if (isBlank(existingValue)) {
				record.setFieldValue(field, fields[field]);
			}
			continue;
		}
		
		record.setFieldValue(field, fields[field]);
		
	}
	
	record.selectNewLineItem('addressbook');
	record.setCurrentLineItemValue('addressbook', 'country', recLicRequest.getFieldValue('custrecordr7licreq_country'));
	record.setCurrentLineItemValue('addressbook', 'state', recLicRequest.getFieldValue('custrecordr7licreq_state'));
	record.commitLineItem('addressbook');
	
	if (isBlank(existingCustomerId)) {
		noOfCompaniesWithSameName = getNoOfCompaniesWithSameName(fields['companyname']);
		if (noOfCompaniesWithSameName > 0) {
			var randomNo = Math.floor(Math.random() * 9999999);
			record.setFieldValue('entityid', fields['companyname'] + ".dup" + parseInt(noOfCompaniesWithSameName + 1) + "." + randomNo);
		}
	}
	
	var id = null;
	try {
		id = nlapiSubmitRecord(record, null, true);
	} 
	catch (err) {
		id = err.getInternalId(); //If error was thrown in afterSubmit script
		nlapiLogExecution('ERROR', 'Details', err);
		
		if (id == null || id == '') {
			throw nlapiCreateError(err.getCode(), err.getDetails());
		}
	}
	if (id == null || id == '') {
		throw nlapiCreateError('ERROR', 'Could not create customer record', companyname);
	}
	return id;
}

function createOrUpdateContact(recLicRequest, existingContactId, nullOnly){
	
	if (nullOnly == null){
		nullOnly = false;
	}
	
	var fields = new Array();
	fields['firstname'] = recLicRequest.getFieldValue('custrecordr7licreq_firstname');
	var lastName = recLicRequest.getFieldValue('custrecordr7licreq_lastname');
	if (lastName != null && lastName.length > 32) {
		lastName = lastName.substring(0, 32);
	}
	fields['lastname'] = lastName;
	fields['title'] = recLicRequest.getFieldValue('custrecordr7licreq_jobtitle');
	fields['email'] = recLicRequest.getFieldValue('custrecordr7licreq_email');
	fields['phone'] = recLicRequest.getFieldValue('custrecordr7licreq_phone');
	fields['company'] = recLicRequest.getFieldValue('custrecordr7licreq_companylink');
	fields['custentityr7contactlanguage'] = getLanguageId(recLicRequest.getFieldValue('custrecordr7licreqproc_language'), 'contact');
	fields['custentityr7leadsourcecontact'] = recLicRequest.getFieldValue('custrecordr7licreq_leadsource');
	fields['contactsource'] = recLicRequest.getFieldValue('custrecordr7licreq_leadsource');
	fields['custentityr7lrpsid'] = recLicRequest.getFieldValue('custrecordr7licreq_lrpsid');
	
	var fieldsNeverUpdate = new Array();
	fieldsNeverUpdate['companyname'] = true;
	fieldsNeverUpdate['language'] = true;
	
	var fieldsAlwaysUpdate = new Array();
	fieldsAlwaysUpdate['custentityr7leadsourcecontact'] = true;
	fieldsAlwaysUpdate['contactsource'] = true;
	fieldsAlwaysUpdate['company'] = true;
	fieldsAlwaysUpdate['custentityr7lrpsid'] = true;
	
	var record = null;
	
	if (!isBlank(existingContactId)) {
		record = nlapiLoadRecord('contact', existingContactId);
	}
	else {
		existingContactId = null;
		record = nlapiCreateRecord('contact');
	}
	
	//Setting field values
	for (field in fields) {
		if (!isBlank(existingContactId)) {
			if (fieldsNeverUpdate[field]) {
				continue;
			}
			if (fieldsAlwaysUpdate[field]) {
				record.setFieldValue(field, fields[field]);
				continue;
			}
		}
		
		if (nullOnly) {
			var existingValue = record.getFieldValue(field);
			if (isBlank(existingValue)) {
				record.setFieldValue(field, fields[field]);
			}
			continue;
		}
		
		record.setFieldValue(field, fields[field]);
	}
	
	record.selectNewLineItem('addressbook');
	record.setCurrentLineItemValue('addressbook', 'country', recLicRequest.getFieldValue('custrecordr7licreq_country'));
	record.setCurrentLineItemValue('addressbook', 'state', recLicRequest.getFieldValue('custrecordr7licreq_state'));
	record.commitLineItem('addressbook');
	
	var id = null;
	try {
		id = nlapiSubmitRecord(record, null, true);
	} 
	catch (err) {
		id = err.getInternalId(); //If error was thrown in afterSubmit script
		nlapiLogExecution('ERROR', 'Details', err);
		
		if (err.getCode() == 'CONTACT_ALREADY_EXISTS'){
			record.setFieldValue('entityid', fields['firstname'] + ' ' + fields['lastname'] + '2');
			id = nlapiSubmitRecord(record, null, true);
		}
		
		if (id == null || id == '') {
			throw nlapiCreateError(err.getCode(), err.getDetails());
		}
	}
	if (id == null || id == '') {
		throw nlapiCreateError('ERROR', 'Could not create contact record', companyname);
	}
	return id;
}

function getLanguageId(languageValue, recType){

	var languageId = '';
	
	if (recType != 'customer' && recType != 'contact') {
		return '';
	}
	
	switch (languageValue) {
		case 'ENGLISHUS':
			languageId = (recType == 'customer') ? 'en_US' : 1;
			break;
		case 'ENGLISHINT':
			languageId = (recType == 'customer') ? 'en' : 13;
			break;
		case 'KOREAN':
			languageId = (recType == 'customer') ? 'ko_KR' : 27;
			break;
		case 'DUTCH':
			languageId = (recType == 'customer') ? 'nl_NL' : 12;
			break;
		case 'GERMAN':
			languageId = (recType == 'customer') ? 'de_DE' : 18;
			break;
		case 'CHINESESIMPLE':
			languageId = (recType == 'customer') ? 'zh_CN' : 3;
			break;
		case 'JAPANESE':
			languageId = (recType == 'customer') ? 'ja_JP' : 26;
			break;
	}
	
	return languageId;
}

function getNoOfCompaniesWithSameName(companyName){

	var searchFilters = new Array();
	searchFilters[0] = new nlobjSearchFilter('companyname', null, 'is', companyName);
	searchFilters[0].setOr(true);
	searchFilters[1] = new nlobjSearchFilter('entityid', null, 'is', companyName);
	
	var searchResults = nlapiSearchRecord('customer', null, searchFilters);
	if (searchResults != null) {
		return searchResults.length;
	}

	return 0;
}

function isBlank(str){
	return (str == null || str == '') ? true : false;
}

function getCustomerProperties(recId, fieldId){

	if (recId == null || recId == '' || fieldId == null || fieldId == '') {
		return null;
	}
	if (objCustomerProps.hasOwnProperty(recId)) {
	
		if (objCustomerProps[recId] == null) {
			return null;
		}
		return objCustomerProps[recId][fieldId];
	}
	
	var arrFieldIds = new Array();
	arrFieldIds[arrFieldIds.length] = 'isinactive';
	arrFieldIds[arrFieldIds.length] = 'stage';
	arrFieldIds[arrFieldIds.length] = 'status';
	arrFieldIds[arrFieldIds.length] = 'salesrep';
	arrFieldIds[arrFieldIds.length] = 'category';
	arrFieldIds[arrFieldIds.length] = 'custentityr7dunsnumber';
	arrFieldIds[arrFieldIds.length] = 'custentityr7autoscrubgroupaccount';
	
	objCustomerProps[recId] = nlapiLookupField('customer', recId, arrFieldIds);
	
	if (objCustomerProps[recId] == null) {
		return null;
	}
	
	return objCustomerProps[recId][fieldId];
}

function getContactProperties(recId, fieldId){

	if (recId == null || recId == '' || fieldId == null || fieldId == '') {
		return null;
	}
	if (objContactProps.hasOwnProperty(recId)) {
	
		if (objContactProps[recId] == null) {
			return null;
		}
		return objContactProps[recId][fieldId];
	}
	
	var arrFieldIds = new Array();
	arrFieldIds[arrFieldIds.length] = 'isinactive';
	arrFieldIds[arrFieldIds.length] = 'custentityzco_contactstatus';
	
	objContactProps[recId] = nlapiLookupField('contact', recId, arrFieldIds);
	
	if (objContactProps[recId] == null) {
		return null;
	}
	
	return objContactProps[recId][fieldId];
}

function timeLeft(){
	var presentTime = new Date().getTime();
	if (presentTime - startingTime > timeLimitInMilliseconds) {
		nlapiLogExecution('DEBUG', 'Ran out of time', 'yup');
		rescheduleScript = true;
		return false;
	}
	return true;
}

function unitsLeft(){
	var unitsLeft = context.getRemainingUsage();
	if (unitsLeft <= 30) {
		nlapiLogExecution('DEBUG', 'Ran out of units', 'yup');
		rescheduleScript = true;
		return false;
	}
	return true;
}