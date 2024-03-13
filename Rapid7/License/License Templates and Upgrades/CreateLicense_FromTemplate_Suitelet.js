/**
 *  Server Suitelet (ss)<br/>
 *  
 *  Generally, called from button "Create License" using nlapiResolveURL
 *  	example: var suiteletURL = nlapiResolveURL('SUITELET', 'customscriptr7createlicensefromtemplate', 'customdeployr7createlicensefromtemplate', false);
 *  			Administrative/
 *  						Contact_SS_nxlicense_marketing.js 9: - Contact Record: Create License Button
 *  						Customer_SS_Misc.js 14: - Customer Record - Create License Button
 *  						Opportunity_SS.js 27: - Opportunity Record - Create License Button
 *  Also, when the contact field is updated the suitelet will reload:
 *  			License Templates and Upgrades/
 *  						CreateLicense_FromTmplate_Suitelet_CS.js 32:
 *  						
 * 
 * existing:<br/>
 * filename: ./License Templates and Upgrades/CreateLicense_FromTemplate_Suitelet.js ; 98746<br/>
 * script id: customscriptr7createlicensefromtemplate  ; 447 ; Create License From Template Suitelet <br/>
 * deploy id: <br/>
 * customdeployr7createlicensefromtemplate  ; 315 ; Create License From Template Suitelet <br/>
 *
 * @class r7_ss_CreateLicenseFromTemplate
 * 
 * @author efagone<br/>
 */

var arrProductTypes = grabAllProductTypes();
var arrProductTypesByRecId = grabAllProductTypes(true);

/**
 * @method createLicenseTemplate
 * @param request
 * @param response
 */
function createLicenseTemplate(request, response){

	//bav nlapiLogExecution('DEBUG', 'createLicenseTemplate', 'got here');
	if (request.getMethod() == 'GET') {
		
		var userId = nlapiGetUser();
		//grab all parameters supplied
		var customerId = request.getParameter('custparam_customer');
		var opportunityId = request.getParameter('custparam_opportunity');
		var salesOrderId = request.getParameter('custparam_sales_order');
		var contactId = request.getParameter('custparam_contact');
		
		//bav nlapiLogExecution('DEBUG', 'createLicenseTemplate GET contactId', contactId);

		try {
			var isInactive = nlapiLookupField('contact', contactId, 'isinactive');
			if (isInactive == 'T'){
				response.writeLine("<html><body>Contact is inactive. Cannot send license.</body></html>");
				return;
			}
		}
		catch (e) {

		}
		
		var contactEditable = request.getParameter('custparam_contacteditable');
		
		var form = nlapiCreateForm('Create License From Template', true);
		form.setScript('customscriptr7licensetemplatesuitelet_ps'); // Script is held in file CreateLicense_FromTemplate_Suitelet_CS.js
		
		var fldCustomer = form.addField('custpage_customer', 'select', 'Customer', 'customer');
		var fldOpportunity = form.addField('custpage_opportunity', 'select', 'Opportunity');

		if (userHasPermission('create_license_w_sales_order')) {
			var fldSalesOrder = form.addField('custpage_sales_order', 'select', 'Sales Order');
			fldSalesOrder.setDisplaySize(250);
			fldSalesOrder.setPadding(1);
			sourceSalesOrders(customerId, fldSalesOrder);
		}

		var fldContact = form.addField('custpage_contact', 'select', 'Contact');
		var fldNoEmail = form.addField('custpage_noemail', 'checkbox', 'Don\'t Email Contact');
		var fldSendEmailOther = form.addField('custpage_sendemailother', 'email', 'Alternate Email (optional)').setDisplayType('normal');
		var fldNXTemplate = form.addField('custpage_nxtemplate', 'select', 'Nexpose License');
		var fldMSTemplate = form.addField('custpage_mstemplate', 'select', 'Metasploit License');
		var fldUITemplate = form.addField('custpage_uitemplate', 'select', 'UserInsight License');
		var fldASTemplate = form.addField('custpage_astemplate', 'select', 'AppSpider License');
		var fldMBLTemplate = form.addField('custpage_mbtemplate', 'select', 'Mobilisafe License');
		var fldMBLTemplateMsg = form.addField('custpage_mbtemplatemsg', 'richtext').setDisplayType('inline');

		fldCustomer.setDisplaySize(250);
		fldOpportunity.setDisplaySize(250);
		fldContact.setDisplaySize(250);
		fldSendEmailOther.setDisplaySize(25);
		fldNXTemplate.setDisplaySize(250);
		fldMSTemplate.setDisplaySize(250);
		fldUITemplate.setDisplaySize(250);
		fldASTemplate.setDisplaySize(250);
		fldMBLTemplate.setDisplaySize(250);
		
		fldCustomer.setMandatory(true);
		fldContact.setMandatory(true);
		
		//fldCustomer.setPadding(1);
		fldCustomer.setLayoutType('normal', 'startcol');
		fldSendEmailOther.setPadding(1);
		fldNXTemplate.setPadding(1);
		fldContact.setPadding(1);
		
		sourceTemplates(fldNXTemplate, 1);
		sourceTemplates(fldMSTemplate, 2);
		sourceTemplates(fldUITemplate, 7);
		sourceTemplates(fldASTemplate, 8);
		var mbDomainTaken = mbLicenseDomainTaken(contactId);
		sourceMBTemplates(fldMBLTemplate, contactId, mbDomainTaken);
		
		if (customerId == null || customerId == '') {
			customerId = findCustomer(contactId);
		}
		if (validCustomer(customerId)) {
			fldCustomer.setDefaultValue(customerId);
			fldCustomer.setDisplayType('inline');
			sourceOpportunities(customerId, fldOpportunity);
			sourceContacts(customerId, fldContact);
			
			if (opportunityId != '' && opportunityId != null) {
				fldOpportunity.setDefaultValue(opportunityId);
				fldOpportunity.setDisplayType('inline');
			}

			if (salesOrderId) {
				fldSalesOrder.setDefaultValue(salesOrderId);
				fldSalesOrder.setDisplayType('inline');
			}

			if (contactId != '' && contactId != null) {
				fldContact.setDefaultValue(contactId);
				if (contactEditable != 'T') {
					fldContact.setDisplayType('inline');
				}
				if (mbDomainTaken) {
					fldMBLTemplateMsg.setDefaultValue('<font color="red">Contact\'s email domain is already in use for Mobilisafe license.<br>Only live-demo is available for this domain.</font>');
				}
				else {
					fldMBLTemplateMsg.setDefaultValue("<i>*Contact must be Microsoft Exchange Administrator <br>for mobilisafe trials.</i>");
				}
				
			}
		}
		else {
			throw nlapiCreateError('INVALID PARAM', 'This suitelet requires a valid \'custparam_customer\' parameter', true);
		}
		form.addSubmitButton('Submit');
		
		response.writePage(form);
		
	} // end GET
	
	if (request.getMethod() == 'POST') {
		
		var customerId = request.getParameter('custpage_customer');
		var opportunityId = request.getParameter('custpage_opportunity');
		var salesOrderId = request.getParameter('custpage_sales_order');
		var contactId = request.getParameter('custpage_contact');
		var nxTemplateId = request.getParameter('custpage_nxtemplate');
		var msTemplateId = request.getParameter('custpage_mstemplate');
		var uiTemplateId = request.getParameter('custpage_uitemplate');
		var asTemplateId = request.getParameter('custpage_astemplate');
		var mbTemplateId = request.getParameter('custpage_mbtemplate');
		var doNotEmail = request.getParameter('custpage_noemail');
		var sendToOther = request.getParameter('custpage_sendemailother');
		
		if (customerId != null && customerId != '' && contactId != null && contactId != '') {
		
			//bav nlapiLogExecution('DEBUG', 'createLicenseTemplate POST contactId', contactId);

			var altEmailTo = '';
			if (doNotEmail == 'T') {
				altEmailTo = sendToOther;
			}
			
			if (nxTemplateId != '' && nxTemplateId != null) {
				createLicense(customerId, opportunityId, contactId, nxTemplateId, altEmailTo, doNotEmail, salesOrderId);
				
			}
			if (msTemplateId != '' && msTemplateId != null) {
				createLicense(customerId, opportunityId, contactId, msTemplateId, altEmailTo, doNotEmail, salesOrderId);
			}
			if (uiTemplateId != '' && uiTemplateId != null) {
				createLicense(customerId, opportunityId, contactId, uiTemplateId, altEmailTo, doNotEmail, salesOrderId);
			}
			if (asTemplateId != '' && asTemplateId != null) {
				createLicense(customerId, opportunityId, contactId, asTemplateId, altEmailTo, doNotEmail, salesOrderId);
			}
			//bav nlapiLogExecution('DEBUG', 'about to call createMBLZLicense mbTemplateId', mbTemplateId, salesOrderId);

			if (mbTemplateId != '' && mbTemplateId != null) {
				createMBLLicense(customerId, opportunityId, contactId, mbTemplateId, altEmailTo, doNotEmail, salesOrderId);
			}
		}
		response.writeLine("<html><body onload='win_close()'><script language='Javascript'>function win_close(){ window.opener = top; window.close(); }</script></body></html>");
		
		return;
		
	} // end POST
	 
}

/**
 * @method sourceTemplates
 * @private
 * @param fld
 * @param acrId
 */
function sourceTemplates(fld, acrId){

	fld.addSelectOption('', '');
	
	var arrSearchFilters = new Array();
	arrSearchFilters[0] = new nlobjSearchFilter('custrecordr7lictemp_acrprodtype', null, 'anyof', acrId);
	arrSearchFilters[1] = new nlobjSearchFilter('custrecordr7lictemp_displayinui', null, 'is', 'T');
	arrSearchFilters[2] = new nlobjSearchFilter('custrecordr7lictemp_restricttorole', null, 'anyof', '@NONE@');
	arrSearchFilters[2].setLeftParens(1);
	arrSearchFilters[2].setOr(true);
	arrSearchFilters[3] = new nlobjSearchFilter('custrecordr7lictemp_restricttorole', null, 'anyof', nlapiGetRole());
	arrSearchFilters[3].setRightParens(1);
	
	var arrSearchColumns = new Array();
	arrSearchColumns[0] = new nlobjSearchColumn('altname').setSort();
	
	var arrSearchResults = nlapiSearchRecord('customrecordr7lictemplatesupgrades', null, arrSearchFilters, arrSearchColumns);
	
	for (var i = 0; arrSearchResults != null && i < arrSearchResults.length; i++) {
	
		var searchResult = arrSearchResults[i];
		var templateId = searchResult.getId();
		var templateName = searchResult.getValue(arrSearchColumns[0]);
		
		fld.addSelectOption(templateId, templateName);
	}
	
}

/**
 * @method sourceMBTemplates
 * @private
 * @param fld
 * @param contactId
 * @param mbDomainTaken
 */
function sourceMBTemplates(fld, contactId, mbDomainTaken){

	fld.addSelectOption('', '');

	var arrSearchFilters = new Array();
	arrSearchFilters[0] = new nlobjSearchFilter('custrecordr7mblicensetempdisplayui', null, 'is', 'T');
	arrSearchFilters[1] = new nlobjSearchFilter('custrecordr7mblicensetemprestrictrole', null, 'anyof', '@NONE@');
	arrSearchFilters[1].setLeftParens(1);
	arrSearchFilters[1].setOr(true);
	arrSearchFilters[2] = new nlobjSearchFilter('custrecordr7mblicensetemprestrictrole', null, 'anyof', nlapiGetRole());
	arrSearchFilters[2].setRightParens(1);
	
	var arrSearchColumns = new Array();
	arrSearchColumns[0] = new nlobjSearchColumn('altname').setSort();
	arrSearchColumns[1] = new nlobjSearchColumn('custrecordr7mblicensenonlicense');
	
	var arrSearchResults = nlapiSearchRecord('customrecordr7mblicensemarketingtemplate', null, arrSearchFilters, arrSearchColumns);
	
	for (var i = 0; arrSearchResults != null && i < arrSearchResults.length; i++) {
	
		var searchResult = arrSearchResults[i];
		var templateId = searchResult.getId();
		var templateName = searchResult.getValue(arrSearchColumns[0]);
		var nonLicenseTemplate = searchResult.getValue(arrSearchColumns[1]);
		
		if (nonLicenseTemplate == 'F' && mbDomainTaken) {
			//don't display
		}
		else {
			fld.addSelectOption(templateId, templateName);
		}
	}
	
}

/**
 * @method mbLicenseDomainTaken
 * @private
 * @param contactId
 * @returns {Boolean}
 */
function mbLicenseDomainTaken(contactId){

	if (contactId != null && contactId != '') {
	
		var contactEmail = nlapiLookupField('contact', contactId, 'email');
		var domain = contactEmail.substr(contactEmail.indexOf('@', 0));

		var arrSearchFilters = new Array();
		arrSearchFilters[0] = new nlobjSearchFilter('formulatext', null, 'is', domain);
		arrSearchFilters[0].setFormula("SUBSTR({custrecordr7mblicensecontact.email}, INSTR({custrecordr7mblicensecontact.email}, '@'))");
		arrSearchFilters[1] = new nlobjSearchFilter('isinactive', null, 'is', 'F');
		
		var arrSearchResults = nlapiSearchRecord('customrecordr7mobilisafelicense', null, arrSearchFilters);
		
		if (arrSearchResults != null && arrSearchResults.length > 0) {
			return true;
		}
		
	}
	return false;
}

/**
 * @method sourceOpportunities
 * @private
 * @param customerId
 * @param fld
 */
function sourceOpportunities(customerId, fld){
	
	fld.addSelectOption('', '');
	
	var arrSearchFilters = new Array();
	arrSearchFilters[0] = new nlobjSearchFilter('entity', null, 'is', customerId);
		
	var arrSearchColumns = new Array();
	arrSearchColumns[0] = new nlobjSearchColumn('tranid').setSort(true);
	arrSearchColumns[1] = new nlobjSearchColumn('title');
	arrSearchColumns[2] = new nlobjSearchColumn('entitystatus');
	arrSearchColumns[3] = new nlobjSearchColumn('expectedclosedate');
	
	var arrSearchResults = nlapiSearchRecord('opportunity', null, arrSearchFilters, arrSearchColumns);
	
	for (var i = 0; arrSearchResults != null && i < arrSearchResults.length; i++) {
		
		var searchResult = arrSearchResults[i];
		var oppId = searchResult.getId();
		var tranId = searchResult.getValue(arrSearchColumns[0]);
		var title = searchResult.getValue(arrSearchColumns[1]);
		
		var optionText = tranId + ': ' + title;
		
		fld.addSelectOption(oppId, optionText);
	}
	
}

/**
 * @method sourceSalesOrder
 * @private
 * @param customerId
 * @param fld
 */
function sourceSalesOrders(customerId, fld) {
	fld.addSelectOption('', '');

	var arrSearchResults = nlapiSearchRecord('salesorder', null, [
		['entity', 'anyof', customerId],
		'and', ['mainline', 'is', 'T']
	], [
		new nlobjSearchColumn('tranid').setSort(true)
	]);

	(arrSearchResults || []).forEach(function(result) {
		var optionId = result.getId();
		var documentNumber = result.getValue('tranid');

		var optionText = 'Sales Order #' + documentNumber;

		fld.addSelectOption(optionId, optionText);
	});
}

/**
 * @method sourceContacts
 * @private
 * @param customerId
 * @param fld
 */
function sourceContacts(customerId, fld){
	
	fld.addSelectOption('', '');
	
	var arrSearchFilters = new Array();
	arrSearchFilters[arrSearchFilters.length] = new nlobjSearchFilter('isinactive', null, 'is', 'F');
	arrSearchFilters[arrSearchFilters.length] = new nlobjSearchFilter('company', null, 'is', customerId);
	arrSearchFilters[arrSearchFilters.length] = new nlobjSearchFilter('email', null, 'isnotempty');
	
	var arrSearchColumns = new Array();
	arrSearchColumns[0] = new nlobjSearchColumn('entityid');
	arrSearchColumns[1] = new nlobjSearchColumn('email');
	
	var arrSearchResults = nlapiSearchRecord('contact', null, arrSearchFilters, arrSearchColumns);
	
	for (var i = 0; arrSearchResults != null && i < arrSearchResults.length; i++) {
		
		var searchResult = arrSearchResults[i];
		var contactId = searchResult.getId();
		var contactName = searchResult.getValue(arrSearchColumns[0]);
	
		fld.addSelectOption(contactId, contactName);
	
	}
	
}

/**
 * @method validCustomer
 * @private
 * @param customerId
 * @returns {Boolean}
 */
function validCustomer(customerId){

	if (customerId != null && customerId != '') {
		var arrSearchFilters = new Array();
		arrSearchFilters[0] = new nlobjSearchFilter('internalid', null, 'is', customerId);
		
		var arrSearchResults = nlapiSearchRecord('customer', null, arrSearchFilters);
		
		if (arrSearchResults != null) {
			return true;
		}
	}
	else {
		return false;
	}
}

/**
 * @method findCustomer
 * @private
 * @param contactId
 * @returns
 */
function findCustomer(contactId){

	if (contactId != '' && contactId != null) {
		var arrSearchFilters = new Array();
		arrSearchFilters[0] = new nlobjSearchFilter('internalid', null, 'is', contactId);
		
		var arrSearchColumns = new Array();
		arrSearchColumns[0] = new nlobjSearchColumn('company');
		
		var arrSearchResults = nlapiSearchRecord('contact', null, arrSearchFilters, arrSearchColumns);
		
		if (arrSearchResults != null) {
			var companyId = arrSearchResults[0].getValue(arrSearchColumns[0]);
			//nlapiSendEmail(55011, 55011, 'CompanyId', 'is ' + companyId + 'contactid is: ' + contactId);
			return companyId;
		}
		else 
			return '';
	}
	else {
		return '';
	}
}

/**
 * @method createLicense
 * @private
 * @param customerId
 * @param opportunityId
 * @param contactId
 * @param templateId
 * @param altEmailTo
 * @param doNotEmail
 * @param salesOrderId
 * @returns
 */
function createLicense(customerId, opportunityId, contactId, templateId, altEmailTo, doNotEmail, salesOrderId){


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
	newRecord.setFieldValue(arrProductTypes[acrId]['opportunity'], opportunityId);
	if (salesOrderId) {
		newRecord.setFieldValue(arrProductTypes[acrId]['salesorder'], salesOrderId);
	}

	var id = null;
	try {
		id = nlapiSubmitRecord(newRecord, null, true);
	} 
	catch (err) {
		id = err.getInternalId(); //If error was thrown in afterSubmit script
		nlapiLogExecution('ERROR', 'Details', err);
	/**
	 * 8/7/14 - TEMP Debugging statements to resolve invalid expiration issue
	 */
		nlapiLogExecution('ERROR','custrecordr7lictemp_expirationindays',recTemplate.getFieldValue('custrecordr7lictemp_expirationindays'));
		nlapiLogExecution('ERROR','daysToBeAdded',daysToBeAdded);
		nlapiLogExecution('ERROR','computedExpirationDate',computedExpirationDate);
		nlapiLogExecution('ERROR','endDate',endDate);
		
		
		if (id == null || id == '') {
			throw nlapiCreateError(err.getCode(), err.getDetails());
		}
	}
	
	if (id == null || id == '') {
		throw nlapiCreateError('ERROR', 'Could not create license record', 'Customer ID: ' + customerId);
	}
	
	createTrackingRecord(recTemplate, contactId, id, altEmailTo, doNotEmail);
	
	return id;
}

/**
 * @method createTrackingRecord
 * @private
 * @param recTemplate
 * @param contactId
 * @param licenseId
 * @param altEmailTo
 * @param doNotEmail
 */
function createTrackingRecord(recTemplate, contactId, licenseId, altEmailTo, doNotEmail){
	var acrId = recTemplate.getFieldValue('custrecordr7lictemp_acrprodtype');
	var licActivationKey = nlapiLookupField(arrProductTypes[acrId]['recordid'], licenseId, arrProductTypes[acrId]['activationid']);
	
	//submit for processing
	var recTracking = nlapiCreateRecord('customrecordr7lictemptracking');
	recTracking.setFieldValue('custrecordr7lictemptracking_productkey', licActivationKey);
	recTracking.setFieldValue('custrecordr7lictemptracking_email', nlapiLookupField('contact', contactId, 'email'));
	recTracking.setFieldValue('custrecordr7lictemptrack_alt_email', altEmailTo);
	recTracking.setFieldValue('custrecordr7lictemptracking_dontemail', doNotEmail);
	recTracking.setFieldValue('custrecordr7lictemptracking_temprec', recTemplate.getId());
	recTracking.setFieldValue('custrecordr7lictemptracking_status', 3); //schedule it
	try {
		nlapiSubmitRecord(recTracking);
	} 
	catch (err) {
		nlapiLogExecution('ERROR', 'Could not submit tracking record', err);
	}
}

/**
 * @method createMBLLicense
 * @private
 * @param customerId
 * @param opportunityId
 * @param contactId
 * @param mblTemplateId
 * @param altEmailTo
 * @param doNotEmail
 */
function createMBLLicense(customerId, opportunityId, contactId, mblTemplateId, altEmailTo, doNotEmail){

	if (mblTemplateId != '' && mblTemplateId != null) {
	
		var companyDetails = nlapiLookupField('customer', customerId, new Array('companyname'));
		
		if (companyDetails['companyname'] == '' || companyDetails['companyname'] == null || companyDetails['companyname'] == 'null') {
			nlapiSubmitField('customer', values['company'], 'companyname', 'Null Company');
		}
		
		nlapiLogExecution('DEBUG', 'createMBLLicense mblTemplateId', mblTemplateId);
		
		var templateFieldInvalid = false;
		var templateRecord = null;
		try {
			templateRecord = nlapiLoadRecord('customrecordr7mblicensemarketingtemplate', mblTemplateId);
		} 
		catch (err) {
			templateFieldInvalid = true;
		}
		
		if (!templateFieldInvalid) {
			var licenseRecordId = templateRecord.getFieldValue('custrecordr7mblicensetemprecord');
			var nonLicenseTemplate = templateRecord.getFieldValue('custrecordr7mblicensenonlicense');

			nlapiLogExecution('DEBUG', 'createMBLLicense nonLicenseTemplate', nonLicenseTemplate);
			
			if (nonLicenseTemplate != 'T') {
				var days = templateRecord.getFieldValue('custrecordr7mblicensetempexpirationdays');
				
				var mobilisafeLicenseRecord = nlapiCopyRecord('customrecordr7mobilisafelicense', licenseRecordId);
				mobilisafeLicenseRecord.setFieldValue('custrecordr7mblicenseproductkey', '');
				mobilisafeLicenseRecord.setFieldValue('custrecordr7mblicense_id', '');
				mobilisafeLicenseRecord.setFieldValue('custrecordr7mblicense_customer_id', '');
				mobilisafeLicenseRecord.setFieldValue('custrecordr7mblicense_period_end', '');
				mobilisafeLicenseRecord.setFieldValue('custrecordr7mblicense_version', '');
				mobilisafeLicenseRecord.setFieldValue('custrecordr7mblicensesalesorder', '');
				
				mobilisafeLicenseRecord.setFieldValue('custrecordr7mblicensecustomer', customerId);
				mobilisafeLicenseRecord.setFieldValue('custrecordr7mblicensecontact', contactId);
				mobilisafeLicenseRecord.setFieldValue('custrecordr7mblicense_period_end', nlapiDateToString(nlapiAddDays(new Date(), days)));
				mobilisafeLicenseRecord.setFieldValue('custrecordr7mblicenseopportunity', opportunityId);
				
				var newLicId = nlapiSubmitRecord(mobilisafeLicenseRecord, true, false);
				
				processMBLLicenseRecord(newLicId, mblTemplateId, contactId, altEmailTo, doNotEmail);
			}
			else {
				sendTemplateEmailOnly(mblTemplateId, contactId, altEmailTo, doNotEmail);
			}
		}
	}
}

/**
 * @method processMBLLicenseRecord
 * @private
 * @param internalId
 * @param templateId
 * @param contactId
 * @param altEmailTo
 * @param doNotEmail
 */
function processMBLLicenseRecord(internalId, templateId, contactId, altEmailTo, doNotEmail){

	if ((contactId != null && contactId != '') || (altEmailTo != null && altEmailTo != '')) {
		
		var sendEmailTo = (doNotEmail != 'T') ? contactId : null;
		if (altEmailTo != null && altEmailTo != '') {
			sendEmailTo = altEmailTo;
		}
		
		/* Gathering details from the license record for the email*/
		var recordId = 'customrecordr7mobilisafelicense';
		var licenseRecord = nlapiLoadRecord(recordId, internalId);
		
		var mblsafeLicense = "MSL" + internalId;
		
		nlapiLogExecution('DEBUG', 'ContactId', contactId);
		
		/* Gathering details for the download email From the contact record*/
		try {
			var contactRecord = nlapiLoadRecord('contact', contactId);
		} 
		catch (err) {
			nlapiLogExecution("DEBUG", 'Error Loading contact record ' + err.name, err.message);
			return;
		}
		var contactEmailAddress = contactRecord.getFieldValue('email');
		var contactName = contactRecord.getFieldValue('entityid');
		var companyId = contactRecord.getFieldValue('company');
		var companyName = contactRecord.getFieldText('company');
		
		var salesRepEmail = nlapiLookupField('customer', companyId, 'salesrep');
		/* Gathering details for the download email From the contact record*/
		
		/*From the template record*/
		var templateRecord = nlapiLoadRecord('customrecordr7mblicensemarketingtemplate', templateId);
		
		var emailTemplateId = templateRecord.getFieldValue('custrecordr7mblicensetempemailactivation');
		var days = templateRecord.getFieldValue('custrecordr7mblicensetempexpirationdays');
		var sendEmailFrom = templateRecord.getFieldValue('custrecordr7mblicensetempsendemailfrom');
		var notificationList = templateRecord.getFieldValues('custrecordr7mblicensetempnotification');
		var notifySalesRep = templateRecord.getFieldValue('custrecordr7mblicensetempnotifysalesrep');
		var description = templateRecord.getFieldValue('altname');
		var owner = templateRecord.getFieldValue('owner');
		
		/* Notifying the contact with his license information */
		if (sendEmailFrom == null || sendEmailFrom == null) {
			sendEmailFrom = salesRepEmail;
		}
		if (sendEmailFrom == null || sendEmailFrom == null) {
			sendEmailFrom = owner;
		}
		
		// Samanage # brian_vaughan@rapid7.com 20150403
		var subject, body;
		var templateVersion = nlapiLoadRecord('emailtemplate', emailTemplateId).getFieldValue('templateversion');
		if(templateVersion != 'FREEMARKER') { // CRMSDK Note: this is being deprecated.
			var merge = nlapiMergeRecord(emailTemplateId, recordId, internalId);
			
			subject = merge.getName();
			body = merge.getValue();
		}
		else { // the new FREEMARKER
			var emailMerger = nlapiCreateEmailMerger(emailTemplateId);
			emailMerger.setCustomRecord(recordId, internalId);

			var mergeResult = emailMerger.merge();
			subject = mergeResult.getSubject();
			body = mergeResult.getBody();
		}

		if (sendEmailTo) {
			
			var records = new Array();
			records['recordtype'] = recordId;
			records['record'] = internalId;

			try {
				nlapiSendEmail(sendEmailFrom, sendEmailTo, subject, body, null, null, records);
			} 
			catch (err) {
				nlapiSendEmail(2, sendEmailTo, subject, body, null, null, records);
			}
		}
		// end of Samanage # brian_vaughan@rapid7.com 20150403
		/* Notifying the contact with his license information */
		
		
		/* Notifying the salesRep and the notificationList */
		var notificationText = contactName + " from " + companyName + " has been automatically given" +
		" a " +
		" Mobilisafe License " +
		mblsafeLicense +
		" expiring on " +
		nlapiDateToString(nlapiAddDays(new Date(), days)) +
		". This was created from the '" +
		description +
		"' template.";
		
		if (notificationList != null) {
			for (var j = 0; j < notificationList.length; j++) {
				nlapiSendEmail(owner, notificationList[j], 'Mobilisafe License Download', notificationText);
				nlapiLogExecution('DEBUG', 'Notification List', notificationList[j]);
			}
		}
		
		try {
			if (notifySalesRep == 'T') {
			 	nlapiSendEmail(2, salesRepEmail, 'Mobilisafe License Download', notificationText);
			}
		} 
		catch (err) {
		}
	/* Notifying the salesRep and the notificationList */
	}
	
}

/**
 * @method sendTemplateEmailOnly
 * @private
 * @param templateId
 * @param contactId
 * @param altEmailTo
 * @param doNotEmail
 */
function sendTemplateEmailOnly(templateId, contactId, altEmailTo, doNotEmail){
	//bav nlapiLogExecution('DEBUG', 'sendTemplateEmailOnly templateId', templateId);

	if ((contactId != null && contactId != '') || (altEmailTo != null && altEmailTo != '')) {
		
		var sendEmailTo = (doNotEmail != 'T') ? contactId : null;
		if (altEmailTo != null && altEmailTo != '') {
			sendEmailTo = altEmailTo;
		}
	
		/* Gathering details for the download email From the contact record*/
		try {
			var contactRecord = nlapiLoadRecord('contact', contactId);
		} 
		catch (err) {
			nlapiLogExecution("DEBUG", 'Error Loading contact record ' + err.name, err.message);
			return;
		}
		var contactEmailAddress = contactRecord.getFieldValue('email');
		var contactName = contactRecord.getFieldValue('entityid');
		var companyId = contactRecord.getFieldValue('company');
		var companyName = contactRecord.getFieldText('company');
		
		var salesRepEmail = nlapiLookupField('customer', companyId, 'salesrep');
		/* Gathering details for the download email From the contact record*/
		
		/*From the template record*/
		var templateRecord = nlapiLoadRecord('customrecordr7mblicensemarketingtemplate', templateId);
		var emailTemplateId = templateRecord.getFieldValue('custrecordr7mblicensetempemailactivation');
		var sendEmailFrom = templateRecord.getFieldValue('custrecordr7mblicensetempsendemailfrom');
		var notificationList = templateRecord.getFieldValues('custrecordr7mblicensetempnotification');
		var notifySalesRep = templateRecord.getFieldValue('custrecordr7mblicensetempnotifysalesrep');
		var description = templateRecord.getFieldValue('altname');
		var owner = templateRecord.getFieldValue('owner');
		
		/* Notifying the contact with his license information */
		if (sendEmailFrom == null || sendEmailFrom == null) {
			sendEmailFrom = salesRepEmail;
		}
		if (sendEmailFrom == null || sendEmailFrom == null) {
			sendEmailFrom = owner;
		}
		
		// Samanage # brian_vaughan@rapid7.com 20150403
		//bav nlapiLogExecution('DEBUG', 'sendTemplateEmailOnly emailTemplateId', emailTemplateId);

		var subject, body;
		var templateVersion = nlapiLoadRecord('emailtemplate', emailTemplateId).getFieldValue('templateversion');
		if(templateVersion != 'FREEMARKER') { // CRMSDK Note: this is being deprecated.
			var merge = nlapiMergeRecord(emailTemplateId, 'contact', contactId);
			
			subject = merge.getName();
			body = merge.getValue();
		}
		else { // the new FREEMARKER
			var emailMerger = nlapiCreateEmailMerger(emailTemplateId);
			emailMerger.setCustomRecord('contact', contactId);

			var mergeResult = emailMerger.merge();
			subject = mergeResult.getSubject();
			body = mergeResult.getBody();
		}

		if (sendEmailTo) {
			
			try {
				nlapiSendEmail(sendEmailFrom, contactId, subject, body);
			} 
			catch (err) {
				nlapiSendEmail(2, contactId, subject, body);
			}
		}
		// end of Samanage # brian_vaughan@rapid7.com 20150403

		/* Notifying the contact with his license information */
		
		
		/* Notifying the salesRep and the notificationList */
		var notificationText = contactName + " from " + companyName + " has been automatically given" +
		" a " +
		description +
		". This was created from the '" +
		description +
		"' template.";
		
		if (notificationList != null) {
			for (var j = 0; j < notificationList.length; j++) {
				nlapiSendEmail(owner, notificationList[j], description, notificationText);
				nlapiLogExecution('DEBUG', 'Notification List', notificationList[j]);
			}
		}
		
		try {
			if (notifySalesRep == 'T') {
				nlapiSendEmail(2, salesRepEmail, description, notificationText);
			}
		} 
		catch (err) {
		}
		/* Notifying the salesRep and the notificationList */
	}
	
}
