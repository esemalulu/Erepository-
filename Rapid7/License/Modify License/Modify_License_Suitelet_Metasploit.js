/*
 * @author efagone
 */

function modifyLicense(request, response){

	if (request.getMethod() == 'GET') {
	        var toURL = nlapiRequestURL(nlapiResolveURL('SUITELET','customscriptretrieveurl','customdeployretrieveurl',true)).getBody();
		var userId = nlapiGetUser();
		var roleId = nlapiGetRole();
		
		var licenseId = request.getParameter('custparam_licenseid');
		
		if (licenseId == null || licenseId == '') {
			throw nlapiCreateError('MISSING PARAM', 'Missing a required parameter', true);
		}
		
		var recLicense = nlapiLoadRecord('customrecordr7metasploitlicensing', licenseId);
		
		var form = nlapiCreateForm('Modify Metasploit License', false);
		form.setScript('customscriptr7modifymslicensesuitelet_cs');
		
		var primaryGroup = form.addFieldGroup('primarygroup', 'Primary Information');
		var graceGroup = form.addFieldGroup('gracegroup', 'Grace Period').setSingleColumn(true);
		var resetGroup = form.addFieldGroup('resetgroup', 'Reset Activation').setSingleColumn(true);
		var featuresGroup = form.addFieldGroup('featuresgroup', 'Trial Features');
		
		var fldLicense = form.addField('custpagelicense', 'select', 'License', '263', 'primarygroup').setDisplayType('inline');
		var fldCustomer = form.addField('custpagecustomer', 'select', 'Customer', 'customer', 'primarygroup').setDisplayType('inline');
		var fldOpportunity = form.addField('custpageopportunity', 'select', 'Opportunity', null, 'primarygroup').setDisplayType('inline');
		var fldSalesOrder = form.addField('custpagesalesorder', 'select', 'Sales Order', null, 'primarygroup').setDisplayType('inline');
		var fldContact = form.addField('custpagecontact', 'select', 'Contact', null, 'primarygroup');
		var fldSpacer = form.addField('custpagespacer', 'inlinehtml', null, null, 'primarygroup');
		var fldCurrentOrderType = form.addField('custpagecurrentordertype', 'text', 'Order Type', null, 'primarygroup').setDisplayType('inline');
		var fldProductKey = form.addField('custpageproductkey', 'text', 'Product Key', null, 'primarygroup').setDisplayType('inline');
		var fldCurrentExpiration = form.addField('custpagecurrentexpiration', 'date', 'Expiration Date', null, 'primarygroup').setDisplayType('inline');
		var fldActualExpiration = form.addField('custpageactualexpiration', 'date').setDisplayType('hidden');
		var fldMSLogo = form.addField('custpagemslogo', 'inlinehtml', null, null, 'primarygroup');
		
		//features
		var fldExtendExpiration = form.addField('custpageextendedexpirationdate', 'date', 'Extend Expiration Date', null, 'gracegroup');
		
		var fldReset = form.addField('custpagereset', 'checkbox', 'Reset License', null, 'resetgroup');
		var fldResetComments = form.addField('custpageresetcomments', 'textarea', 'Comments', null, 'resetgroup');
		
		var fldFeatureExpirationDate = form.addField('custpageenddate', 'date', 'Feature Expiration Date', null, 'featuresgroup');
		var fldAdditionalUsers = form.addField('custpager7msprousercount', 'integer', 'Additional Users', null, 'featuresgroup');
		var fldOrderType = form.addField('custpager7msordertype', 'select', 'Order Type', '264', 'featuresgroup');
		var fldHardware = form.addField('custpager7mslicensehardware', 'checkbox', 'Hardware License', null, 'featuresgroup');
		
		fldOpportunity.setDisplaySize(200);
		fldSalesOrder.setDisplaySize(200);
		fldContact.setDisplaySize(200);
		fldOrderType.setDisplaySize(200);
		fldFeatureExpirationDate.setDisplaySize(11);
		fldExtendExpiration.setDisplaySize(11);
		fldAdditionalUsers.setDisplaySize(11);
		fldResetComments.setDisplaySize(90, 2);
		
		fldCustomer.setMandatory(true);
		//fldContact.setMandatory(true);
		fldFeatureExpirationDate.setMandatory(true);
		fldResetComments.setMandatory(true);
		
		fldReset.setDisabled(true);
		fldResetComments.setDisabled(true);
		fldFeatureExpirationDate.setDisabled(true);
		
		fldLicense.setLayoutType('normal', 'startcol');
		fldCurrentOrderType.setLayoutType('normal', 'startcol');
		fldMSLogo.setLayoutType('normal', 'startcol');
		fldFeatureExpirationDate.setLayoutType('normal', 'startcol');
		fldOrderType.setLayoutType('normal', 'startcol');
		
		fldExtendExpiration.setPadding(1);
		fldFeatureExpirationDate.setPadding(1);
		fldOrderType.setPadding(1);
		fldReset.setPadding(1);
		fldSpacer.setPadding(1);
		fldAdditionalUsers.setPadding(1);
		
		//populate default values
		fldMSLogo.setDefaultValue('<img src="'+toURL+'/core/media/media.nl?id=54439&c=663271&h=d979aea49d979f3e1d1d " WIDTH="200">')
		fldLicense.setDefaultValue(licenseId);
		fldCustomer.setDefaultValue(recLicense.getFieldValue('custrecordr7mslicensecustomer'));
		sourceOpportunities(recLicense.getFieldValue('custrecordr7mslicensecustomer'), fldOpportunity);
		fldOpportunity.setDefaultValue(recLicense.getFieldValue('custrecordr7mslicenseopportunity'));
		sourceSalesOrder(recLicense.getFieldValue('custrecordr7mslicensecustomer'), fldSalesOrder);
		fldSalesOrder.setDefaultValue(recLicense.getFieldValue('custrecordr7mslicensesalesorder'));
		sourceContacts(recLicense.getFieldValue('custrecordr7mslicensecustomer'), fldContact);
		fldContact.setDefaultValue(recLicense.getFieldValue('custrecordr7mslicensecontact'));
		fldCurrentOrderType.setDefaultValue(recLicense.getFieldText('custrecordr7msordertype'));
		fldProductKey.setDefaultValue(recLicense.getFieldValue('custrecordr7msproductkey'));
		fldCurrentExpiration.setDefaultValue(recLicense.getFieldValue('custrecordr7mslicenseexpirationdate'));
		fldActualExpiration.setDefaultValue(getMaxEndDateLFM(recLicense.getFieldValue('custrecordr7msproductkey'), recLicense.getRecordType()));
		
		fldHardware.setDefaultValue(recLicense.getFieldValue('custrecordr7mslicensehardware'));
		
		if (recLicense.getFieldValue('custrecordr7mslicensesalesorder') == '' || recLicense.getFieldValue('custrecordr7mslicensesalesorder') == null) {
			fldOpportunity.setDisplayType('normal');
		}
		
		form.addSubmitButton('Submit');
		form.addButton('customcancelbutton', 'Cancel', 'history.go(-1);return false;');
		
		response.writePage(form);
		
	}
	
	if (request.getMethod() == 'POST') {
	
		var licenseId = request.getParameter('custpagelicense');
		var endDate = request.getParameter('custpageenddate');
		var productKey = request.getParameter('custpageproductkey');
		var action = request.getParameter('custparamaction');
		var addOnFields = getAddOnFields();
		
		//grace
		var extendedExpirationDate = request.getParameter('custpageextendedexpirationdate');
		var featureExpirationDate = request.getParameter('custpageenddate');
		
		if (action == null || action == '') {
			if ((extendedExpirationDate != null && extendedExpirationDate != '') || (featureExpirationDate != null && featureExpirationDate != '')) { //license changes
				if (extendedExpirationDate != null && extendedExpirationDate != '') {
				
					var currentExpirationDate = request.getParameter('custpagecurrentexpiration');
					
					if (nlapiStringToDate(extendedExpirationDate) > nlapiStringToDate(currentExpirationDate)) { //only if expiration is after current
						
						var startDate = nlapiDateToString(new Date());
						
						if (nlapiStringToDate(currentExpirationDate) >= nlapiStringToDate(nlapiDateToString(new Date()))) {
							startDate = nlapiDateToString(nlapiAddDays(nlapiStringToDate(currentExpirationDate), 1));
						}

						var recLicense = nlapiLoadRecord('customrecordr7metasploitlicensing', licenseId);
						scrapeLicenseRecord(recLicense, 'T', startDate, nlapiDateToString(nlapiStringToDate(extendedExpirationDate)));
					}
				}
				
				//now trial features
				
				if (featureExpirationDate != null && featureExpirationDate != '') {
					for (key in addOnFields) {
						var addOnId = addOnFields[key];
						var value = request.getParameter(key);
						
						if (value != null && value != '') {
							var isDupe = findDupeFMR(addOnId, value, nlapiDateToString(nlapiStringToDate(endDate)), productKey);
							nlapiLogExecution('DEBUG', 'Found dupe', isDupe);
							if (!isDupe) {
								createFMR(addOnId, value, nlapiDateToString(nlapiStringToDate(endDate)), productKey, licenseId);
							}
						}
					}
					
					//orderType
					if (request.getParameter('custpager7msordertype') != null && request.getParameter('custpager7msordertype') != '') {
						var value = request.getParameter('custpager7msordertype');

						var arrSearchFilters = new Array();
						arrSearchFilters[0] = new nlobjSearchFilter('custrecordr7aclrecord_internalid', null, 'anyof', 1);
						arrSearchFilters[1] = new nlobjSearchFilter('custrecordr7acladdon_fieldid', null, 'is', 'custrecordr7msordertype');
						arrSearchFilters[2] = new nlobjSearchFilter('custrecordr7acladdon_value', null, 'noneof', new Array(7, 8));
						
						
						var arrSearchColumns = new Array();
						arrSearchColumns[0] = new nlobjSearchColumn('custrecordr7acladdon_specificvalue');
						
						var arrSearchResults = nlapiSearchRecord('customrecordr7acladdoncomponents', null, arrSearchFilters, arrSearchColumns);
						
						for (var i = 0; arrSearchResults != null && i < arrSearchResults.length; i++) {
							var searchResult = arrSearchResults[i];
							var addOnId = searchResult.getId();
							var specificValue = searchResult.getValue(arrSearchColumns[0]);
							
							if (value != null && value != '' && value == specificValue) {

								var isDupe = findDupeFMR(addOnId, value, nlapiDateToString(nlapiStringToDate(endDate)), productKey);
								nlapiLogExecution('DEBUG', 'Found dupe', isDupe);
								if (!isDupe) {

									createFMR(addOnId, value, nlapiDateToString(nlapiStringToDate(endDate)), productKey, licenseId);
								}
							}
							
						}
					}
				}
				
				var recLicense = nlapiLoadRecord('customrecordr7metasploitlicensing', licenseId);
				recLicense.setFieldValue('custrecordr7mslicensecontact', request.getParameter('custpagecontact'));
				recLicense.setFieldValue('custrecordr7mslicenseopportunity', request.getParameter('custpageopportunity'));
				processEverything(recLicense);
				
				if (request.getParameter('custpagereset') == 'T') {
					createResetRecord(licenseId, request.getParameter('custpageresetcomments'));
				}
			}
			else {
				var currentContact = nlapiLookupField('customrecordr7metasploitlicensing', licenseId, 'custrecordr7mslicensecontact');
				var newContact = request.getParameter('custpagecontact');
				
				var currentOpportunity = nlapiLookupField('customrecordr7metasploitlicensing', licenseId, 'custrecordr7mslicenseopportunity');
				var newOpportunity = request.getParameter('custpageopportunity');
				
				if (newContact != currentContact || newOpportunity != currentOpportunity) {
					var recLicense = nlapiLoadRecord('customrecordr7metasploitlicensing', licenseId);
					if (newContact != null && newContact != '') {
						recLicense.setFieldValue('custrecordr7mslicensecontact', request.getParameter('custpagecontact'));
					}
					recLicense.setFieldValue('custrecordr7mslicenseopportunity', request.getParameter('custpageopportunity'));
					nlapiSubmitRecord(recLicense);
				}
				
				if (request.getParameter('custpagereset') == 'T') {
					createResetRecord(licenseId, request.getParameter('custpageresetcomments'));
				}
			}
			
			nlapiSetRedirectURL('RECORD', 'customrecordr7metasploitlicensing', licenseId, 'view');
			
		}
		else 
			if (action != null && action != '' && productKey != null && productKey != '' && licenseId != null && licenseId != '') {
				expireSuspendLicense(productKey, action);
				
				if (action == 'suspend' || action == 'expire') {
					var recLicenseToExpire = nlapiLoadRecord('customrecordr7metasploitlicensing', licenseId);
					recLicenseToExpire.setFieldValue('custrecordr7mslicenseexpirationdate', nlapiDateToString(nlapiAddDays(new Date(), -1)));
					nlapiSubmitRecord(recLicenseToExpire);
					
					if (action == 'suspend') {
						var customerName = recLicenseToExpire.getFieldValue('custrecordr7mslicensecustomer');
						var customerId = recLicenseToExpire.getFieldValue('custrecordr7mslicensecustomer');
						var accountManagerEmail = '';
						if (customerId != null && customerId != '') {
							accountManagerEmail = nlapiLookupField('customer', customerId, 'custentityr7accountmanager.email');
						}
						nlapiSendEmail(nlapiGetUser(), 149990, 'License Suspended', 'Product Key:' + recLicenseToExpire.getFieldValue('custrecordr7msproductkey') + '\nCustomer: ' + customerName, accountManagerEmail);
					}
				}
				else 
					if (action == 'revive') {
						var recLicenseToRevive = nlapiLoadRecord('customrecordr7metasploitlicensing', licenseId);
						processEverything(recLicenseToRevive);
					}
			}
	}
}

function sourceContacts(customerId, fldContact){

	fldContact.addSelectOption('', '');
	
	if (customerId != null && customerId != '') {
	
		var arrSearchFilters = new Array();
		arrSearchFilters[0] = new nlobjSearchFilter('company', null, 'is', customerId);
		arrSearchFilters[1] = new nlobjSearchFilter('isinactive', null, 'is', 'F');
		//arrSearchFilters[2] = new nlobjSearchFilter('email', null, 'isnotempty');
		
		var arrSearchColumns = new Array();
		arrSearchColumns[0] = new nlobjSearchColumn('entityid');
		arrSearchColumns[1] = new nlobjSearchColumn('email');
		
		var arrSearchResults = nlapiSearchRecord('contact', null, arrSearchFilters, arrSearchColumns);
		
		for (var i = 0; arrSearchResults != null && i < arrSearchResults.length; i++) {
		
			var searchResult = arrSearchResults[i];
			var contactId = searchResult.getId();
			var contactName = searchResult.getValue(arrSearchColumns[0]);
			
			fldContact.addSelectOption(contactId, contactName);
			
		}
	}
}

function sourceOpportunities(customerId, fldOpportunity){

	fldOpportunity.addSelectOption('', '');
	
	if (customerId != null && customerId != '') {
	
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
			
			fldOpportunity.addSelectOption(oppId, optionText);
		}
	}
}

function sourceSalesOrder(customerId, fldSalesOrder){

	fldSalesOrder.addSelectOption('', '');
	
	if (customerId != null && customerId != '') {
	
		var arrSearchFilters = new Array();
		arrSearchFilters[0] = new nlobjSearchFilter('entity', null, 'is', customerId);
		
		var arrSearchColumns = new Array();
		arrSearchColumns[0] = new nlobjSearchColumn('tranid').setSort(true);
		arrSearchColumns[1] = new nlobjSearchColumn('title');
		
		var arrSearchResults = nlapiSearchRecord('salesorder', null, arrSearchFilters, arrSearchColumns);
		
		for (var i = 0; arrSearchResults != null && i < arrSearchResults.length; i++) {
		
			var searchResult = arrSearchResults[i];
			var salesOrderId = searchResult.getId();
			var tranId = searchResult.getValue(arrSearchColumns[0]);
			var title = searchResult.getValue(arrSearchColumns[1]);
			
			var optionText = tranId;
			
			fldSalesOrder.addSelectOption(salesOrderId, optionText);
		}
	}
}

function createFMR(addOnId, fieldValue, endDate, productKey, licenseId){

	var createAddOn = false;
	
	var fieldType = nlapiLookupField('customrecordr7acladdoncomponents', addOnId, 'custrecordr7acladdon_fieldtype');
	
	if ((fieldType == 'date' || fieldType == 'integer') && (fieldValue != null && fieldValue != '')) {
	
		createAddOn = true;
	}
	else 
		if (fieldType == 'checkbox' && fieldValue == 'T') {
			createAddOn = true;
		}
		else 
			if (fieldType == 'select') {
				createAddOn = true;
			}
	
	if (fieldType == 'date') {
		fieldValue = endDate;
	}
	
	if (createAddOn) {
		nlapiLogExecution('DEBUG', 'Creating FMR', addOnId);
		var newFMRRecord = nlapiCreateRecord('customrecordr7licensefeaturemanagement');
		newFMRRecord.setFieldValue('custrecordr7licfmfeature', addOnId);
		newFMRRecord.setFieldValue('custrecordr7licfmvalue', fieldValue);
		newFMRRecord.setFieldValue('custrecordr7licfmstartdate', nlapiDateToString(new Date()));
		newFMRRecord.setFieldValue('custrecordr7licfmenddate', endDate);
		newFMRRecord.setFieldValue('custrecordr7licfmproductkey', productKey);
		newFMRRecord.setFieldValue('custrecordr7licfmmetasploitlicenserec', licenseId);
		newFMRRecord.setFieldValue('custrecordr7licfmstatus', 1);
		newFMRRecord.setFieldValue('custrecordr7licfmgrace', 'T');
		
		try {
			var id = nlapiSubmitRecord(newFMRRecord);
		} 
		catch (e) {
			var adminUser =  nlapiLoadConfiguration('companypreferences').getFieldValue('custscriptr7_system_info_email_sender');
			nlapiSendEmail(adminUser, adminUser, 'Could not create built-in FMR from suitelet', 'AddOnId: ' + addOnId + '\nError: ' + e);
		}
		
		return true;
	}
	
	return false;
}


function getAddOnFields(){

	var addOnFields = new Array();
	addOnFields['custpager7msprousercount'] = 28;
	addOnFields['custpager7mslicensehardware'] = 29;
	
	return addOnFields;
}

function findDupeFMR(featureId, value, endDate, productKey){

	if (featureId != null && featureId != '' && productKey != null && productKey != '' && value != null && value != '' && endDate != null && endDate != '') {
		//checking for duplicate non-integer addons (integers get added so duplicates CAN be okay)
		var arrSearchFilters = new Array();
		arrSearchFilters[0] = new nlobjSearchFilter('custrecordr7licfmproductkey', null, 'is', productKey);
		arrSearchFilters[1] = new nlobjSearchFilter('custrecordr7licfmfeature', null, 'is', featureId);
		arrSearchFilters[2] = new nlobjSearchFilter('custrecordr7licfmvalue', null, 'is', value);
		arrSearchFilters[3] = new nlobjSearchFilter('custrecordr7licfmstartdate', null, 'onorbefore', 'today');
		arrSearchFilters[4] = new nlobjSearchFilter('custrecordr7licfmenddate', null, 'onorafter', endDate);
		arrSearchFilters[5] = new nlobjSearchFilter('custrecordr7licfmfeaturefieldtype', null, 'isnot', 'integer');
		arrSearchFilters[6] = new nlobjSearchFilter('custrecordr7licfmrecordtypeid', null, 'is', 'customrecordr7metasploitlicensing');
		arrSearchFilters[7] = new nlobjSearchFilter('custrecordr7licfmstatus', null, 'noneof', new Array(4, 7, 8, 9));
		
		var arrSearchResults = nlapiSearchRecord('customrecordr7licensefeaturemanagement', null, arrSearchFilters);
		
		if (arrSearchResults != null) {
		
			return true;
		}
	}
	
	return false;
}

function createResetRecord(licenseId, resetComments){

	var newResetRecord = nlapiCreateRecord('customrecordr7metasploitlicensingreset');
	newResetRecord.setFieldValue('custrecordr7msresetmetasploitlicense', licenseId);
	newResetRecord.setFieldValue('custrecordr7msresetresetactivation', 'T');
	newResetRecord.setFieldValue('custrecordr7msresetcomments', resetComments);

	
	try {
		var id = nlapiSubmitRecord(newResetRecord, true);
	} 
	catch (e) {
		var adminUser =  nlapiLoadConfiguration('companypreferences').getFieldValue('custscriptr7_system_info_email_sender');
		nlapiSendEmail(adminUser, adminUser, 'Could not create license reset record', 'licenseId: ' + licenseId + '\nError: ' + e);
	}
	
}

function isSuspended(productKey){

	if (productKey != null && productKey != '') {
	
		var arrSearchFilters = new Array();
		arrSearchFilters[0] = new nlobjSearchFilter('custrecordr7licfmproductkey', null, 'is', productKey);
		arrSearchFilters[1] = new nlobjSearchFilter('custrecordr7licfmrecordtypeid', null, 'is', 'customrecordr7metasploitlicensing');
		arrSearchFilters[2] = new nlobjSearchFilter('custrecordr7licfmenddate', null, 'onorafter', 'today');
		arrSearchFilters[3] = new nlobjSearchFilter('custrecordr7licfmstatus', null, 'anyof', 7);
		
		var arrSearchResults = nlapiSearchRecord('customrecordr7licensefeaturemanagement', null, arrSearchFilters);
		
		if (arrSearchResults != null && arrSearchResults.length > 0) {
		
			return true;
		}
	}
	
	return false;
}

function expireSuspendLicense(productKey, action){

	if (action == 'expire' || action == 'suspend' || action == 'revive') {
		if (action == 'expire') {
			var status = 9;
		}
		else 
			if (action == 'suspend') {
				var status = 7;
			}
			else 
				if (action == 'revive') {
					var status = 1;
				}
		
		var arrSearchFilters = new Array();
		arrSearchFilters[0] = new nlobjSearchFilter('custrecordr7licfmproductkey', null, 'is', productKey);
		arrSearchFilters[1] = new nlobjSearchFilter('custrecordr7licfmrecordtypeid', null, 'is', 'customrecordr7metasploitlicensing');
		arrSearchFilters[2] = new nlobjSearchFilter('custrecordr7licfmenddate', null, 'onorafter', 'today');
		arrSearchFilters[3] = new nlobjSearchFilter('custrecordr7licfmstatus', null, 'noneof', 9);
		
		var arrSearchResults = nlapiSearchRecord('customrecordr7licensefeaturemanagement', null, arrSearchFilters);
		
		for (var i = 0; arrSearchResults != null && i < arrSearchResults.length; i++) {
		
			var fmrId = arrSearchResults[i].getId();
			
			nlapiSubmitField('customrecordr7licensefeaturemanagement', fmrId, 'custrecordr7licfmstatus', status);
		}
	}
}

