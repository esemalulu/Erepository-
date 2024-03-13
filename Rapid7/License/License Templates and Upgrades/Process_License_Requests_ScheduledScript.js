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
 */

/*
 * @param {String} type Context Types: scheduled, ondemand, userinterface, aborted, skipped
 * @returns {Void}
 */

var objCustomerProps = new Object();
var objContactProps = new Object();

function processRequests(type){
	
	var timeLimitInMinutes = 10;
	this.timeLimitInMilliseconds = timeLimitInMinutes * 60 * 1000;
	this.startingTime = new Date().getTime();
	this.context = nlapiGetContext();
	this.rescheduleScript = false;
	this.arrProductTypes = grabAllProductTypes();
	
	var recsToProcess = context.getSetting('SCRIPT', 'custscriptr7licreqproc_oddrecsonly');
	if (recsToProcess == null || recsToProcess == '') {
		recsToProcess = context.getSetting('SCRIPT', 'custscriptr7licreqproc_oddrecsonly2');
	}
	nlapiLogExecution('DEBUG', 'recsToProcess', recsToProcess);
	processAllRequests(recsToProcess);
	
	if (rescheduleScript) {
		nlapiLogExecution('DEBUG', 'Rescheduling script', context.getScriptId());
		nlapiScheduleScript(context.getScriptId());
	}
	
}

function processAllRequests(recsToProcess){

	var arrFilters = new Array();
	arrFilters[arrFilters.length] = new nlobjSearchFilter('custrecordr7licreq_processed', null, 'is', 'F');
	arrFilters[arrFilters.length] = new nlobjSearchFilter('custrecordr7licreq_unprocessable', null, 'is', 'F');
	arrFilters[arrFilters.length] = new nlobjSearchFilter('custrecordr7_licreqproc_blacklisted', null, 'is', 'F');
	arrFilters[arrFilters.length] = new nlobjSearchFilter('custrecordr7_licreqproc_graylisted', null, 'is', 'F');
	
	var arrSearchColumns = new Array();
	arrSearchColumns[0] = new nlobjSearchColumn('internalid');
	arrSearchColumns[1] = new nlobjSearchColumn('custrecordr7lictemp_acrprodtype', 'custrecordr7licreq_lictempupgraderec');
	
	var arrRequestsToProcess = nlapiSearchRecord('customrecordr7licreqprocessing', null, arrFilters, arrSearchColumns);
	if (arrRequestsToProcess != null){
		nlapiLogExecution('DEBUG', '# Requests To Process', arrRequestsToProcess.length);
	}
	for (var i = 0; arrRequestsToProcess != null && i < arrRequestsToProcess.length && timeLeft() && unitsLeft(); i++) {
	
		try {
			
			var licRequestId = arrRequestsToProcess[i].getId();
			
			if (recsToProcess == 1) {//odd only
				if (isEven(licRequestId)){
					continue;
				}
			}
			if (recsToProcess == 2) { //even only
				if (!isEven(licRequestId)){
					continue;
				}
			}
			
			var beginTime = new Date();
			nlapiLogExecution('DEBUG', 'Processing Request ID', licRequestId);
			var acrProdType = arrRequestsToProcess[i].getText(arrSearchColumns[1]);
			
			var recLicRequest = nlapiLoadRecord('customrecordr7licreqprocessing', licRequestId);
			
			var processed = recLicRequest.getFieldValue('custrecordr7licreq_processed');
			var unproccessable = recLicRequest.getFieldValue('custrecordr7licreq_unprocessable');
			var isBlacklisted = recLicRequest.getFieldValue('custrecordr7_licreqproc_blacklisted');
			var isGraylisted = recLicRequest.getFieldValue('custrecordr7_licreqproc_graylisted');
			
			if (processed == 'T' || unproccessable == 'T' || isBlacklisted == 'T' || isGraylisted == 'T'){
				continue;
			}
			
			var companyLink = recLicRequest.getFieldValue('custrecordr7licreq_companylink');
			var contactLink = recLicRequest.getFieldValue('custrecordr7licreq_contactlink');
			var licenseLink = recLicRequest.getFieldValue('custrecordr7licreq_licenseid');
			var trackingDbLink = recLicRequest.getFieldValue('custrecordr7licreq_trackingdblink');
			var currentErrorText = recLicRequest.getFieldValue('custrecordr7licreq_errortext');
			
			if ((companyLink == null || companyLink == '') && (contactLink == null || contactLink == '')){
				nlapiLogExecution('DEBUG', 'Running Anti-Dupe', licRequestId);
				var processbeginTime = new Date();
				recLicRequest = antiDupLogic(recLicRequest);
				nlapiLogExecution('AUDIT', 'Time (in seconds) To Run Anti-Dupe - ID:' + licRequestId, (new Date().getTime() - processbeginTime.getTime()) / 1000);
			}
			
			if (companyLink == null || companyLink == '') {
				try {
					nlapiLogExecution('DEBUG', 'Creating Company', licRequestId);
					var processbeginTime = new Date();
					companyLink = createOrUpdateCompany(recLicRequest);
					recLicRequest.setFieldValue('custrecordr7licreq_companylink', companyLink);
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
			
			if (contactLink == null || contactLink == '') {
				try {
					nlapiLogExecution('DEBUG', 'Creating Contact', licRequestId);
					var processbeginTime = new Date();
					contactLink = createOrUpdateContact(recLicRequest);
					recLicRequest.setFieldValue('custrecordr7licreq_contactlink', contactLink);
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
			
			
			if (licenseLink == null || licenseLink == '') {
				try {
					nlapiLogExecution('DEBUG', 'Creating License', licRequestId);
					var processbeginTime = new Date();
					licenseLink = createLicense(recLicRequest);
					recLicRequest.setFieldValue('custrecordr7licreq_licenseid', licenseLink);
					nlapiLogExecution('AUDIT', 'Time (in seconds) To Process License - ID:' + licRequestId, (new Date().getTime() - processbeginTime.getTime())/1000);
				} 
				catch (err) {
					recLicRequest.setFieldValue('custrecordr7licreq_errortext', err);
					if (currentErrorText != null && currentErrorText != '') {
						var adminUser =  nlapiLoadConfiguration('companypreferences').getFieldValue('custscriptr7_system_info_email_sender');
						nlapiSendEmail(adminUser, adminUser, 'UNPROCESSABLE - License', 'ID: ' + licRequestId + '\nType: ' + acrProdType + '\nError: ' + err);
						recLicRequest.setFieldValue('custrecordr7licreq_unprocessable', 'T');
					}
					nlapiSubmitRecord(recLicRequest);
					continue;
				}
			}
			
			nlapiSubmitRecord(recLicRequest);
			
			recLicRequest = nlapiLoadRecord('customrecordr7licreqprocessing', licRequestId);
			trackingDbLink = recLicRequest.getFieldValue('custrecordr7licreq_trackingdblink');
			
			if (trackingDbLink == null || trackingDbLink == '') {
				try {
					nlapiLogExecution('DEBUG', 'Adding Addition License Features', licRequestId);
					var processbeginTime = new Date();
					var acrId = nlapiLookupField('customrecordr7lictemplatesupgrades', recLicRequest.getFieldValue('custrecordr7licreq_lictempupgraderec'), 'custrecordr7lictemp_acrprodtype');
					var licActivationKey = nlapiLookupField(arrProductTypes[acrId]['recordid'], licenseLink, arrProductTypes[acrId]['activationid']);
					
					//submit for processing
					var recTracking = nlapiCreateRecord('customrecordr7lictemptracking');
					recTracking.setFieldValue('custrecordr7lictemptracking_productkey', licActivationKey);
					recTracking.setFieldValue('custrecordr7lictemptracking_email', recLicRequest.getFieldValue('custrecordr7licreq_email'));
					recTracking.setFieldValue('custrecordr7lictemptracking_temprec', recLicRequest.getFieldValue('custrecordr7licreq_lictempupgraderec'));
					recTracking.setFieldValue('custrecordr7lictemptracking_ldsource', recLicRequest.getFieldValue('custrecordr7licreq_leadsource'));
					recTracking.setFieldValue('custrecordr7lictemptracking_status', 5); //process immediately
					try {
						trackingDbLink = nlapiSubmitRecord(recTracking);
						recLicRequest.setFieldValue('custrecordr7licreq_trackingdblink', trackingDbLink);
						nlapiLogExecution('AUDIT', 'Time (in seconds) To Proces Additional Features - ID:' + licRequestId, (new Date().getTime() - processbeginTime.getTime())/1000);
					} 
					catch (err) {
						trackingDbLink = err.getInternalId(); //If error was thrown in afterSubmit script
						recLicRequest.setFieldValue('custrecordr7licreq_trackingdblink', trackingDbLink);
						recLicRequest.setFieldValue('custrecordr7licreq_errortext', err);
						if (currentErrorText != null && currentErrorText != '') {
							var adminUser =  nlapiLoadConfiguration('companypreferences').getFieldValue('custscriptr7_system_info_email_sender');
							nlapiSendEmail(adminUser, adminUser, 'UNPROCESSABLE - tracking db', 'ID: ' + licRequestId + '\nType: ' + acrProdType + '\nError: ' + err);
							recLicRequest.setFieldValue('custrecordr7licreq_unprocessable', 'T');
						}
						nlapiSubmitRecord(recLicRequest);
						continue;
					}
				}
				catch (err) {
					recLicRequest.setFieldValue('custrecordr7licreq_errortext', err);
					if (currentErrorText != null && currentErrorText != '') {
						var adminUser =  nlapiLoadConfiguration('companypreferences').getFieldValue('custscriptr7_system_info_email_sender');
						nlapiSendEmail(adminUser, adminUser, 'UNPROCESSABLE - tracking db', 'ID: ' + licRequestId + '\nType: ' + acrProdType + '\nError: ' + err);
						recLicRequest.setFieldValue('custrecordr7licreq_unprocessable', 'T');
					}
					nlapiSubmitRecord(recLicRequest);
					continue;
				}
			}
			
			recLicRequest.setFieldValue('custrecordr7licreq_errortext', '');
			recLicRequest.setFieldValue('custrecordr7licreq_daterecieved', nlapiDateToString(new Date(), 'datetimetz'));
			recLicRequest.setFieldValue('custrecordr7licreq_processed', 'T');
			recLicRequest.setFieldValue('custrecordr7licreq_unprocessable', 'F');
			recLicRequest.setFieldValue('custrecordr7licreqproc_processingtimesec', (new Date().getTime() - beginTime.getTime())/1000);
			nlapiSubmitRecord(recLicRequest);
			
			nlapiLogExecution('DEBUG', 'Finished Processing Request ID', licRequestId);
			nlapiLogExecution('AUDIT', 'Total Time (in seconds) To Process Entire Record - ID:' + licRequestId, (new Date().getTime() - beginTime.getTime())/1000);
		}
		catch (e) {
			try {
				var adminUser =  nlapiLoadConfiguration('companypreferences').getFieldValue('custscriptr7_system_info_email_sender');
				nlapiSendEmail(adminUser, adminUser, 'Something Went Wrong Processing Lic Requests', 'Error: ' + e, 'errol_fagone@rapid7.com');
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

function antiDupLogic(recLicRequest){

	try {
		var licRequestId = recLicRequest.getId();
		var email = recLicRequest.getFieldValue('custrecordr7licreq_email');
		nlapiLogExecution('DEBUG', 'email', email);
		if (isBlank(email)) {
			return recLicRequest;
		}
		
		var arrFullEmailContactMatch = grabSameEmailContact(email);
		if (arrFullEmailContactMatch != null) {
			nlapiLogExecution('DEBUG', 'Found full email CONTACT match', licRequestId);
			var contactId = arrFullEmailContactMatch[0];
			var customerId = arrFullEmailContactMatch[1];
			var scrubGroup = getCustomerProperties(customerId, 'custentityr7autoscrubgroupaccount');
			
			if (scrubGroup == 'T') {
				nlapiLogExecution('DEBUG', 'Company part of SCRUB GROUP', licRequestId);
				var id = createOrUpdateCompany(recLicRequest);
				recLicRequest.setFieldValue('custrecordr7licreq_companylink', id);
				recLicRequest.setFieldValue('custrecordr7licreq_contactlink', contactId);
				createOrUpdateContact(recLicRequest, contactId, false, false);
				
				return recLicRequest;
			}
			
			if (isBlank(customerId)) {
				nlapiLogExecution('DEBUG', 'Contacts customer is null - creating one', licRequestId);
				customerId = createOrUpdateCompany(recLicRequest);
				recLicRequest.setFieldValue('custrecordr7licreq_companylink', customerId);
				nlapiLogExecution('DEBUG', 'Updating Contact fields - ALL', licRequestId);
				recLicRequest.setFieldValue('custrecordr7licreq_contactlink', contactId);
				createOrUpdateContact(recLicRequest, contactId, false, true);
				
				return recLicRequest;
			}
			
			var stage = getCustomerProperties(customerId, 'stage');
			if (stage == 'LEAD') {
				nlapiLogExecution('DEBUG', 'Company is LEAD', licRequestId);
				recLicRequest.setFieldValue('custrecordr7licreq_companylink', customerId);
				recLicRequest.setFieldValue('custrecordr7licreq_contactlink', contactId);
				createOrUpdateCompany(recLicRequest, customerId, false, true);
				createOrUpdateContact(recLicRequest, contactId, false, true);
				
				return recLicRequest;
			}
			
			nlapiLogExecution('DEBUG', 'Updating existing Customer and Contact fields - NULL ONLY', licRequestId);
			recLicRequest.setFieldValue('custrecordr7licreq_contactlink', contactId);
			recLicRequest.setFieldValue('custrecordr7licreq_companylink', customerId);
			createOrUpdateCompany(recLicRequest, customerId, true, true);
			createOrUpdateContact(recLicRequest, contactId, true, true);
			
			return recLicRequest;
		}
		
		var fullEmailCompanyMatch = grabSameEmailCompany(email);
		if (fullEmailCompanyMatch != null) {
			nlapiLogExecution('DEBUG', 'Found full email COMPANY match', licRequestId);
			
			var stage = getCustomerProperties(fullEmailCompanyMatch, 'stage');
			var duns = getCustomerProperties(fullEmailCompanyMatch, 'custentityr7dunsnumber');
			var nullOnly = true;
			if (stage == 'LEAD' && isBlank(duns)) {
				nullOnly = false;
			}
			nlapiLogExecution('DEBUG', 'Updating existing Customer fields - (nullOnly = ' + nullOnly + ')', licRequestId);
			recLicRequest.setFieldValue('custrecordr7licreq_companylink', fullEmailCompanyMatch);
			createOrUpdateCompany(recLicRequest, fullEmailCompanyMatch, nullOnly, true);
					
			return recLicRequest;
		}
		
		var isFreemail = freeEmailDomain(email);
		if (isFreemail) {
			nlapiLogExecution('DEBUG', 'Email = FreeMail, Creating New Company, Contact', licRequestId);
			return recLicRequest;
		}
		
		var domainEmailCompanyMatch = grabSameDomainCompany(email);
		if (domainEmailCompanyMatch != null) {
			nlapiLogExecution('DEBUG', 'Found domain email COMPANY match', licRequestId);
			
			var stage = getCustomerProperties(domainEmailCompanyMatch, 'stage');
			var duns = getCustomerProperties(domainEmailCompanyMatch, 'custentityr7dunsnumber');
			var category = getCustomerProperties(domainEmailCompanyMatch, 'category') + '';
			var domainExt = email.substr(-4);
			
			var arrGovCategories = new Array();
			arrGovCategories.push('19');
			arrGovCategories.push('48');
			arrGovCategories.push('49');
			arrGovCategories.push('46');
			arrGovCategories.push('45');
			arrGovCategories.push('47');
			arrGovCategories.push('44');
			arrGovCategories.push('43');
			
			var arrDomainsExts = new Array();
			arrDomainsExts.push('.gov');
			arrDomainsExts.push('.mil');
			
			if ((!isBlank(category) && arrGovCategories.indexOf(category) != -1) || arrDomainsExts.indexOf(domainExt) != -1) {
				nlapiLogExecution('DEBUG', 'Military or Government - Creating NEW Company/Contact', licRequestId);
				return recLicRequest;
			}
			
			var nullOnly = true;
			if (stage == 'LEAD' && isBlank(duns)) {
				nullOnly = false;
			}
			nlapiLogExecution('DEBUG', 'Updating existing Customer fields - (nullOnly = ' + nullOnly + ')', licRequestId);
			recLicRequest.setFieldValue('custrecordr7licreq_companylink', domainEmailCompanyMatch);
			createOrUpdateCompany(recLicRequest, domainEmailCompanyMatch, nullOnly, true);
			
			return recLicRequest;
		}
		
		nlapiLogExecution('DEBUG', 'No Matches Found', licRequestId);
		return recLicRequest;
		
	} 
	catch (edupe) {
		nlapiLogExecution('ERROR', 'ERROR running Anti-Dupe', edupe);
		return recLicRequest;
	}
}

function grabSameEmailContact(email){

	if (email != null && email != '') {
	
		var arrFilters = new Array();
		arrFilters[0] = new nlobjSearchFilter('isinactive', null, 'is', 'F');
		arrFilters[1] = new nlobjSearchFilter('email', null, 'is', email);
		
		var arrColumns = new Array();
		arrColumns[0] = new nlobjSearchColumn('internalid');
		arrColumns[1] = new nlobjSearchColumn('formulatext').setSort(false);
		arrColumns[1].setFormula("DECODE({customer.custentityr7autoscrubgroupaccount}, 'T', 4, CASE {customer.stage} WHEN 'Customer' THEN '0' WHEN 'Lead' THEN '1' WHEN 'Prospect' THEN '2' ELSE '3' END) || '-' || LPAD({internalid},25, 0)");
		arrColumns[2] = new nlobjSearchColumn('internalid', 'customer');
		
		var arrResults = nlapiSearchRecord('contact', null, arrFilters, arrColumns);

		for (var i = 0; arrResults != null && i < arrResults.length; i++) {
			var contactId = arrResults[i].getValue(arrColumns[0]);
			var customerId = arrResults[i].getValue(arrColumns[2]);

			if (customerId != null && customerId != '') {
				return new Array(contactId, customerId);
			}
		}
	}

	return null;
}

function grabSameEmailCompany(email){

	if (email != null && email != '') {
	
		var arrFilters = new Array();
		arrFilters[0] = new nlobjSearchFilter('isinactive', null, 'is', 'F');
		arrFilters[1] = new nlobjSearchFilter('email', null, 'is', email);
		
		var arrColumns = new Array();
		arrColumns[0] = new nlobjSearchColumn('internalid');
		arrColumns[1] = new nlobjSearchColumn('formulatext').setSort(false);
		arrColumns[1].setFormula("CASE {stage} WHEN 'Customer' THEN '0'  WHEN 'Lead' THEN '1'  WHEN 'Prospect' THEN '2'  ELSE '3'  END || '-' || LPAD({internalid},25, 0)");

		var arrResults = nlapiSearchRecord('customer', null, arrFilters, arrColumns);
		
		if (arrResults != null && arrResults.length > 0) {
			var customerId = arrResults[0].getValue(arrColumns[0]);

			if (customerId != null && customerId != '') {
				return customerId;
			}
		}
	}
	
	return null;
}

function grabSameDomainCompany(email){

	if (email != null && email != '') {
	
		var domain = email.substr(email.indexOf('@', 0));
		
		var arrFilters = new Array();
		arrFilters[0] = new nlobjSearchFilter('isinactive', null, 'is', 'F');
		arrFilters[1] = new nlobjSearchFilter('formulatext', null, 'is', domain);
		arrFilters[1].setFormula("SUBSTR({email}, INSTR({email}, '@'))");
		
		var arrColumns = new Array();
		arrColumns[0] = new nlobjSearchColumn('internalid');
		arrColumns[1] = new nlobjSearchColumn('formulatext').setSort(false);
		arrColumns[1].setFormula("CASE {stage} WHEN 'Customer' THEN '0'  WHEN 'Lead' THEN '1'  WHEN 'Prospect' THEN '2'  ELSE '3'  END || '-' || LPAD({internalid},25, 0)");
		
		var arrResults = nlapiSearchRecord('customer', null, arrFilters);
		
		if (arrResults != null && arrResults.length > 0) {
			var customerId = arrResults[0].getValue(arrColumns[0]);
			
			if (customerId != null && customerId != '') {
				return customerId;
			}
		}
	}
	
	return null;
}

function createOrUpdateCompany(recLicRequest, existingCustomerId, nullOnly, offloadToScheduled){
	
	if (nullOnly == null){
		nullOnly = false;
	}
	
	if (offloadToScheduled == null){
		offloadToScheduled = false;
	}
	
	if (!isBlank(existingCustomerId) && offloadToScheduled){
		var pendingLstId = (nullOnly) ? 1 : 2;
		recLicRequest.setFieldValue('custrecordr7licreqproc_pendingupdatescus', pendingLstId);
		recLicRequest.setFieldValue('custrecordr7licreq_companylink', existingCustomerId);
		return recLicRequest;
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

function createOrUpdateContact(recLicRequest, existingContactId, nullOnly, offloadToScheduled){
	
	if (nullOnly == null){
		nullOnly = false;
	}
	
	if (offloadToScheduled == null){
		offloadToScheduled = false;
	}

	if (!isBlank(existingContactId) && offloadToScheduled){
		var pendingLstId = (nullOnly) ? 1 : 2;
		recLicRequest.setFieldValue('custrecordr7licreqproc_pendingupdatescon', pendingLstId);
		recLicRequest.setFieldValue('custrecordr7licreq_contactlink', existingContactId);
		return recLicRequest;
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
	fields['custentityr7lrpsid'] = recLicRequest.getFieldValue('custrecordr7licreq_lrpsid');
	fields['custentityr7contactlanguage'] = getLanguageId(recLicRequest.getFieldValue('custrecordr7licreqproc_language'), 'contact');
	fields['custentityr7leadsourcecontact'] = recLicRequest.getFieldValue('custrecordr7licreq_leadsource');
	fields['contactsource'] = recLicRequest.getFieldValue('custrecordr7licreq_leadsource');
	
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

function createLicense(recLicRequest){

	var customerId = recLicRequest.getFieldValue('custrecordr7licreq_companylink');
	var contactId = recLicRequest.getFieldValue('custrecordr7licreq_contactlink');
	var templateId = recLicRequest.getFieldValue('custrecordr7licreq_lictempupgraderec');
	
	var recTemplate = nlapiLoadRecord('customrecordr7lictemplatesupgrades', templateId);
	var acrId = recTemplate.getFieldValue('custrecordr7lictemp_acrprodtype');
	
	var newRecord = nlapiCopyRecord(arrProductTypes[acrId]['recordid'], recTemplate.getFieldValue('custrecordr7lictemp_lictemp_id'));
	
	//Computing endDate = today + quantityPurchased*duration
	var daysToBeAdded = parseInt(recTemplate.getFieldValue('custrecordr7lictemp_expirationindays'));
	var computedExpirationDate = nlapiAddDays(new Date(), daysToBeAdded);
	var endDate = nlapiDateToString(computedExpirationDate);
	
	// Null out any necessary fields
	var fieldsToEmpty = arrProductTypes[acrId]['emptyfields'];
	if (fieldsToEmpty != null && fieldsToEmpty != '' && fieldsToEmpty != 'undefined') {
		var arrFieldsToEmpty = fieldsToEmpty.split(',');
		for (var i = 0; i < arrFieldsToEmpty.length; i++) {
			newRecord.setFieldValue(arrFieldsToEmpty[i], '');
		}
	}
	
	//Setting FMR created to true as Lic Tracking Is going to create them once processed... and we dont want it being dupe created..	
	newRecord.setFieldValue(arrProductTypes[acrId]['fmrcreatedid'], 'T');
	
	//Setting End Date	
	newRecord.setFieldValue(arrProductTypes[acrId]['expiration'], endDate);
	
	//Setting other miscellaneous fields on the license record
	newRecord.setFieldValue(arrProductTypes[acrId]['customer'], customerId);
	newRecord.setFieldValue(arrProductTypes[acrId]['contact'], contactId);
	
	var id = null;
	try {
		id = nlapiSubmitRecord(newRecord, null, true);
	} 
	catch (err) {
		id = err.getInternalId(); //If error was thrown in afterSubmit script
		nlapiLogExecution('ERROR', 'Details', err);
		
		if (id == null || id == '') {
			throw nlapiCreateError(err.getCode(), err.getDetails());
		}
	}
	
	if (id == null || id == '') {
		throw nlapiCreateError('ERROR', 'Could not create license record', companyname);
	}
	
	return id;
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

function isEven(someNumber){
	
	someNumber = parseInt(someNumber);
	
	if (isNaN(someNumber)) {
		return false;
	}
	
	return (someNumber % 2 == 0);
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