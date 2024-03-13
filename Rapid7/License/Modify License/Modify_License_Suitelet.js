/*
 * @author efagone
 */

/*
 * MB: 5/17/16 - Change #1206 - APTCM-323 Nexpose license enhancements for Remediation Analytics and Agents Beta Programs
 */

function modifyLicense(request, response){

	if (request.getMethod() == 'GET') {
		var userId = nlapiGetUser();
		var roleId = nlapiGetRole();
		var toURL = nlapiRequestURL(nlapiResolveURL('SUITELET','customscriptretrieveurl','customdeployretrieveurl',true)).getBody();
		
		var licenseId = request.getParameter('custparam_licenseid');
		
		if (licenseId == null || licenseId == '') {
			throw nlapiCreateError('MISSING PARAM', 'Missing a required parameter', true);
		}
		
		var recLicense = nlapiLoadRecord('customrecordr7nexposelicensing', licenseId);
		
		var form = nlapiCreateForm('Modify Nexpose License', false);
		form.setScript('customscriptr7modifynxlicensesuitelet_cs');
		
		var primaryGroup = form.addFieldGroup('primarygroup', 'Primary Information');
		var graceGroup = form.addFieldGroup('gracegroup', 'Grace Period').setSingleColumn(true);
		var resetGroup = form.addFieldGroup('resetgroup', 'Reset Activation').setSingleColumn(true);
		var featuresGroup = form.addFieldGroup('featuresgroup', 'Trial Features');
		
		var fldLicense = form.addField('custpagelicense', 'select', 'License', '58', 'primarygroup').setDisplayType('inline');
		var fldCustomer = form.addField('custpagecustomer', 'select', 'Customer', 'customer', 'primarygroup').setDisplayType('inline');
		var fldOpportunity = form.addField('custpageopportunity', 'select', 'Opportunity', null, 'primarygroup').setDisplayType('inline');
		var fldOrderType = form.addField('custpageordertype', 'text', 'Order Type', null, 'primarygroup').setDisplayType('hidden');
		var fldSalesOrder = form.addField('custpagesalesorder', 'select', 'Sales Order', null, 'primarygroup').setDisplayType('inline');
		var fldContact = form.addField('custpagecontact', 'select', 'Contact', null, 'primarygroup');
		var fldContactOriginal = form.addField('custpagecontactorig', 'text', null, null, 'primarygroup').setDisplayType('hidden');
		var fldSpacer = form.addField('custpagespacer', 'inlinehtml', null, null, 'primarygroup');
		var fldProductKey = form.addField('custpageproductkey', 'text', 'Product Key', null, 'primarygroup').setDisplayType('inline');
		var fldCurrentExpiration = form.addField('custpagecurrentexpiration', 'date', 'Expiration Date', null, 'primarygroup').setDisplayType('inline');
		var fldActualExpiration = form.addField('custpageactualexpiration', 'date').setDisplayType('hidden');
		var fldNXLogo = form.addField('custpagenxlogo', 'inlinehtml', null, null, 'primarygroup');
		
		//features
		var fldExtendExpiration = form.addField('custpageextendedexpirationdate', 'date', 'Extend Expiration Date', null, 'gracegroup');
		
		var fldReset = form.addField('custpagereset', 'checkbox', 'Reset License', null, 'resetgroup');
		var fldResetComments = form.addField('custpageresetcomments', 'textarea', 'Comments', null, 'resetgroup');
		
		var fldFeatureExpirationDate = form.addField('custpageenddate', 'date', 'Feature Expiration Date', null, 'featuresgroup');
		var fldAdditionalIPs = form.addField('custpager7nxlicensenumberips', 'integer', 'Additional IPs', null, 'featuresgroup');
		var fldAdditionalDIPs = form.addField('custpager7nxlicensenumberdiscoveryips', 'integer', 'Additional Discovery IPs', null, 'featuresgroup');
		var fldAdditionalCIIPs = form.addField('custpager7nxlicense_ciendpoints', 'integer', 'Additional CI Endpoints', null, 'featuresgroup');
		var fldAdditionalHostedIPs = form.addField('custpager7nxlicensenumberhostedips', 'integer', 'Additional Hosted IPs', null, 'featuresgroup');
		var fldCurrentHostedIPs = form.addField('custpagecurrenthostedips', 'text', null, null, 'primarygroup').setDisplayType('hidden');
		var fldAdditionalEngines = form.addField('custpager7nxnumberengines', 'integer', 'Additional Engines', null, 'featuresgroup');
		
		var fldDiscovery = form.addField('custpager7nxlicensediscoverylicense', 'checkbox', 'Discovery License', null, 'featuresgroup');
		var fldSCADATemplate = form.addField('custpager7nxscada', 'checkbox', 'SCADA Template', null, 'featuresgroup');
		var fldWebScanning = form.addField('custpager7nxwebscan', 'checkbox', 'Web Scanning', null, 'featuresgroup');
		var fldWebScanningOriginal = form.addField('custpager7nxwebscanoriginal', 'checkbox').setDisplayType('hidden');
		var fldPCITemplate = form.addField('custpager7nxlicensepcitemplate', 'checkbox', 'PCI Template', null, 'featuresgroup');
		var fldConfigPolicyScanning = form.addField('custpager7nxpolicy', 'checkbox', 'Configuration Policy Scanning', null, 'featuresgroup');
		var fldAdvancedPolicy = form.addField('custpager7nxlicenseadvancedpolicyeng', 'checkbox', 'Advanced Policy Engine', null, 'featuresgroup');
		var fldMultiTenancy = form.addField('custpager7nxlicensemultitenancy', 'checkbox', 'Multi-Tenancy', null, 'featuresgroup').setDisplayType('hidden');
		var fldVirtualization = form.addField('custpager7nxlicensevirtualization', 'checkbox', 'Virtualization', null, 'featuresgroup');
		var fldFDCC = form.addField('custpager7nxlicensefdcc', 'checkbox', 'FDCC', null, 'featuresgroup');
		var fldUSGCB = form.addField('custpager7nxlicenseusgcb', 'checkbox', 'USGCB', null, 'featuresgroup');
		var fldRichData = form.addField('custpager7nxlicensecsvrichdataexport', 'checkbox', 'CSV/Rich Data Export', null, 'featuresgroup');
		var fldEnginePool = form.addField('custpager7nxlicenseenginepool', 'checkbox', 'Engine Pool', null, 'featuresgroup');
		var fldControlsInsight = form.addField('custpager7nxlicense_centrics', 'checkbox', 'Controls Insight', null, 'featuresgroup');
		var fldMobileScanning = form.addField('custpager7nxlicensing_mobileoption', 'checkbox', 'Mobile', null, 'featuresgroup');
		var fldEarlyAccess = form.addField('custpager7nxlicenseearlyaccess', 'checkbox', 'Early Access', null, 'featuresgroup');
		var fldExposureAnalytics = form.addField('custpager7nxlicenseexposureanalytics', 'checkbox', 'Exposure Analytics', null, 'featuresgroup');
		/*
		 * MB: 5/17/16 - Change #1206 - APTCM-323 Nexpose license enhancements for Remediation Analytics and Agents Beta Programs
		 */
		var fldRemediationAnalytics = form.addField('custpager7nxlicenseremedanalytics', 'checkbox', 'Remediation Analytics', null, 'featuresgroup');
		var fldAgents = form.addField('custpager7nxlicenseagents', 'checkbox', 'Agents', null, 'featuresgroup');
		var fldAdaptiveSecurity = form.addField('custpager7nxlicenseadaptivesecurity', 'checkbox', 'Adaptive Security', null, 'featuresgroup');
		//var fldCustomPolicies = form.addField('custpager7nxlicensecustompolicies', 'checkbox', 'Custom Policies', null, 'featuresgroup');
		
		fldOpportunity.setDisplaySize(200);
		fldSalesOrder.setDisplaySize(200);
		fldContact.setDisplaySize(200);
		fldFeatureExpirationDate.setDisplaySize(11);
		fldExtendExpiration.setDisplaySize(11);
		fldAdditionalIPs.setDisplaySize(11);
		fldAdditionalDIPs.setDisplaySize(11);
		fldAdditionalCIIPs.setDisplaySize(11);
		fldAdditionalHostedIPs.setDisplaySize(11);
		fldAdditionalEngines.setDisplaySize(11);
		fldResetComments.setDisplaySize(90, 2);
		
		fldCustomer.setMandatory(true);
		//fldContact.setMandatory(true);
		fldFeatureExpirationDate.setMandatory(true);
		fldResetComments.setMandatory(true);
		
		fldReset.setDisabled(true);
		fldResetComments.setDisabled(true);
		fldFeatureExpirationDate.setDisabled(true);
		
		fldLicense.setLayoutType('normal', 'startcol');
		fldProductKey.setLayoutType('normal', 'startcol');
		fldNXLogo.setLayoutType('normal', 'startcol');
		fldFeatureExpirationDate.setLayoutType('normal', 'startcol');
		fldDiscovery.setLayoutType('normal', 'startcol');
		
		fldExtendExpiration.setPadding(1);
		fldFeatureExpirationDate.setPadding(1);
		fldDiscovery.setPadding(1);
		fldReset.setPadding(1);
		fldSpacer.setPadding(1);
		fldAdditionalIPs.setPadding(1);
		
		//populate default values
		fldNXLogo.setDefaultValue('<img src="'+toURL+'/core/media/media.nl?id=54465&c=663271&h=9fcd4b5c272d475b4322" WIDTH="200">')
		fldLicense.setDefaultValue(licenseId);
		fldOrderType.setDefaultValue(recLicense.getFieldValue('custrecordr7nxordertype'));
		fldCustomer.setDefaultValue(recLicense.getFieldValue('custrecordr7nxlicensecustomer'));
		sourceOpportunities(recLicense.getFieldValue('custrecordr7nxlicensecustomer'), fldOpportunity);
		fldOpportunity.setDefaultValue(recLicense.getFieldValue('custrecordr7nxlicenseopportunity'));
		sourceSalesOrder(recLicense.getFieldValue('custrecordr7nxlicensecustomer'), fldSalesOrder);
		fldSalesOrder.setDefaultValue(recLicense.getFieldValue('custrecordr7nxlicensesalesorder'));
		sourceContacts(recLicense.getFieldValue('custrecordr7nxlicensecustomer'), fldContact);
		fldContact.setDefaultValue(recLicense.getFieldValue('custrecordr7nxlicensecontact'));
		fldContactOriginal.setDefaultValue(recLicense.getFieldValue('custrecordr7nxlicensecontact'));
		fldProductKey.setDefaultValue(recLicense.getFieldValue('custrecordr7nxproductkey'));
		fldCurrentExpiration.setDefaultValue(recLicense.getFieldValue('custrecordr7nxlicenseexpirationdate'));
		fldCurrentHostedIPs.setDefaultValue(recLicense.getFieldValue('custrecordr7nxlicensenumberhostedips'));
		fldActualExpiration.setDefaultValue(getMaxEndDateLFM(recLicense.getFieldValue('custrecordr7nxproductkey'), recLicense.getRecordType()));
		
		fldDiscovery.setDefaultValue(recLicense.getFieldValue('custrecordr7nxlicensediscoverylicense'));
		fldPCITemplate.setDefaultValue(recLicense.getFieldValue('custrecordr7nxlicensepcitemplate'));
		fldSCADATemplate.setDefaultValue(recLicense.getFieldValue('custrecordr7nxscada'));
		fldWebScanning.setDefaultValue(recLicense.getFieldValue('custrecordr7nxwebscan'));
		fldWebScanningOriginal.setDefaultValue(recLicense.getFieldValue('custrecordr7nxwebscan'));
		fldConfigPolicyScanning.setDefaultValue(recLicense.getFieldValue('custrecordr7nxpolicy'));
		fldMultiTenancy.setDefaultValue(recLicense.getFieldValue('custrecordr7nxlicensemultitenancy'));
		fldEnginePool.setDefaultValue(recLicense.getFieldValue('custrecordr7nxlicenseenginepool'));
		fldVirtualization.setDefaultValue(recLicense.getFieldValue('custrecordr7nxlicensevirtualization'));
		fldAdvancedPolicy.setDefaultValue(recLicense.getFieldValue('custrecordr7nxlicenseadvancedpolicyeng'));
		fldFDCC.setDefaultValue(recLicense.getFieldValue('custrecordr7nxlicensefdcc'));
		fldEarlyAccess.setDefaultValue(recLicense.getFieldValue('custrecordr7nxlicenseearlyaccess'));
		fldUSGCB.setDefaultValue(recLicense.getFieldValue('custrecordr7nxlicenseusgcb'));
		fldRichData.setDefaultValue(recLicense.getFieldValue('custrecordr7nxlicensecsvrichdataexport'));
		//fldCustomPolicies.setDefaultValue(recLicense.getFieldValue('custrecordr7nxlicensecustompolicies'));
		fldControlsInsight.setDefaultValue(recLicense.getFieldValue('custrecordr7nxlicense_centrics'));
		fldMobileScanning.setDefaultValue(recLicense.getFieldValue('custrecordr7nxlicensing_mobileoption'));
		fldExposureAnalytics.setDefaultValue(recLicense.getFieldValue('custrecordr7nxlicenseexposureanalytics'));
		fldRemediationAnalytics.setDefaultValue(recLicense.getFieldValue('custrecordr7nxlicenseremedanalytics'));
		fldAgents.setDefaultValue(recLicense.getFieldValue('custrecordr7nxlicenseagents'));
		fldAdaptiveSecurity.setDefaultValue(recLicense.getFieldValue('custrecordr7nxlicenseadaptivesecurity'));
		
		if (recLicense.getFieldValue('custrecordr7nxlicensesalesorder') == '' || recLicense.getFieldValue('custrecordr7nxlicensesalesorder') == null) {
			fldOpportunity.setDisplayType('normal');
		}
		
		form.addSubmitButton('Submit');
		form.addButton('customcancelbutton', 'Cancel', 'history.go(-1);return false;');
		var btnReplace = form.addButton('custpage_replacelicense', 'Replace License', 'replaceIt()');
		//btnReplace.setDisabled(true);
		
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
						
						var recLicense = nlapiLoadRecord('customrecordr7nexposelicensing', licenseId);
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
				}
				
				var recLicense = nlapiLoadRecord('customrecordr7nexposelicensing', licenseId);
				recLicense.setFieldValue('custrecordr7nxlicensecontact', request.getParameter('custpagecontact'));
				recLicense.setFieldValue('custrecordr7nxlicenseopportunity', request.getParameter('custpageopportunity'));
				processEverything(recLicense);
				
				if (request.getParameter('custpagereset') == 'T') {
					createResetRecord(licenseId, request.getParameter('custpageresetcomments'));
				}
			}
			else {
				var currentContact = nlapiLookupField('customrecordr7nexposelicensing', licenseId, 'custrecordr7nxlicensecontact');
				var newContact = request.getParameter('custpagecontact');
				
				var currentOpportunity = nlapiLookupField('customrecordr7nexposelicensing', licenseId, 'custrecordr7nxlicenseopportunity');
				var newOpportunity = request.getParameter('custpageopportunity');
				
				if (newContact != currentContact || newOpportunity != currentOpportunity) {
					var recLicense = nlapiLoadRecord('customrecordr7nexposelicensing', licenseId);
					if (newContact != null && newContact != '') {
						recLicense.setFieldValue('custrecordr7nxlicensecontact', request.getParameter('custpagecontact'));
					}
					recLicense.setFieldValue('custrecordr7nxlicenseopportunity', request.getParameter('custpageopportunity'));
					nlapiSubmitRecord(recLicense);
				}
				
				if (request.getParameter('custpagereset') == 'T') {
					createResetRecord(licenseId, request.getParameter('custpageresetcomments'));
				}
			}
			
			nlapiSetRedirectURL('RECORD', 'customrecordr7nexposelicensing', licenseId, 'view');
			
		}
		else 
			if (action != null && action != '' && productKey != null && productKey != '' && licenseId != null && licenseId != '') {
				expireSuspendLicense(productKey, action);
				
				if (action == 'suspend' || action == 'expire') {
					var recLicenseToExpire = nlapiLoadRecord('customrecordr7nexposelicensing', licenseId);
					recLicenseToExpire.setFieldValue('custrecordr7nxlicenseexpirationdate', nlapiDateToString(nlapiAddDays(new Date(), -1)));
					nlapiSubmitRecord(recLicenseToExpire);
					
					if (action == 'suspend') {
						var customerName = recLicenseToExpire.getFieldValue('custrecordr7nxlicensecustomer');
						var customerId = recLicenseToExpire.getFieldValue('custrecordr7nxlicensecustomer');
						var accountManagerEmail = '';
						if (customerId != null && customerId != '') {
							accountManagerEmail = nlapiLookupField('customer', customerId, 'custentityr7accountmanager.email');
						}
						var adminUser =  nlapiLoadConfiguration('companypreferences').getFieldValue('custscriptr7_system_info_email_sender');
						nlapiSendEmail(nlapiGetUser(), adminUser, 'License Suspended', 'Product Key:' + recLicenseToExpire.getFieldValue('custrecordr7nxproductkey') + '\nCustomer: ' + customerName, accountManagerEmail);
					}
				}
				else 
					if (action == 'revive') {
						var recLicenseToRevive = nlapiLoadRecord('customrecordr7nexposelicensing', licenseId);
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
		newFMRRecord.setFieldValue('custrecordr7licfmnexposelicense', licenseId);
		newFMRRecord.setFieldValue('custrecordr7licfmstatus', 3);
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
	addOnFields['custpager7nxlicensenumberips'] = 4;
	addOnFields['custpager7nxlicensenumberdiscoveryips'] = 31;
	addOnFields['custpager7nxlicense_ciendpoints'] = 83;
	addOnFields['custpager7nxlicensenumberhostedips'] = 5;
	addOnFields['custpager7nxnumberengines'] = 6;
	addOnFields['custpager7nxlicensediscoverylicense'] = 7;
	addOnFields['custpager7nxlicensepcitemplate'] = 1;
	addOnFields['custpager7nxscada'] = 2;
	addOnFields['custpager7nxwebscan'] = 3;
	addOnFields['custpager7nxpolicy'] = 12;
	addOnFields['custpager7nxlicensemultitenancy'] = 15;
	addOnFields['custpager7nxlicenseenginepool'] = 16;
	addOnFields['custpager7nxlicensevirtualization'] = 17;
	addOnFields['custpager7nxlicenseadvancedpolicyeng'] = 18;
	addOnFields['custpager7nxlicensefdcc'] = 19;
	addOnFields['custpager7nxlicenseusgcb'] = 20;
	addOnFields['custpager7nxlicensecsvrichdataexport'] = 38;
	addOnFields['custpager7nxlicensecustompolicies'] = 21;
	addOnFields['custpager7nxlicense_centrics'] = 65;
	addOnFields['custpager7nxlicensing_mobileoption'] = 82;
	addOnFields['custpager7nxlicenseearlyaccess'] = 86;
	addOnFields['custpager7nxlicenseexposureanalytics'] = 100;
	addOnFields['custpager7nxlicenseremedanalytics'] = 107;
	addOnFields['custpager7nxlicenseagents'] = 108;
	addOnFields['custpager7nxlicenseadaptivesecurity'] = 99;
	
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
		arrSearchFilters[6] = new nlobjSearchFilter('custrecordr7licfmrecordtypeid', null, 'is', 'customrecordr7nexposelicensing');
		arrSearchFilters[7] = new nlobjSearchFilter('custrecordr7licfmstatus', null, 'noneof', new Array(4, 7, 8, 9));
		
		var arrSearchResults = nlapiSearchRecord('customrecordr7licensefeaturemanagement', null, arrSearchFilters);
		
		if (arrSearchResults != null) {
		
			return true;
		}
	}
	
	return false;
}

function createResetRecord(licenseId, resetComments){

	var newResetRecord = nlapiCreateRecord('customrecordr7nexposelicensingreset');
	newResetRecord.setFieldValue('custrecordr7nxresetnexposelicense', licenseId);
	newResetRecord.setFieldValue('custrecordr7nxresetresetactivation', 'T');
	newResetRecord.setFieldValue('custrecordr7nxresetcomments', resetComments);

	
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
		arrSearchFilters[1] = new nlobjSearchFilter('custrecordr7licfmrecordtypeid', null, 'is', 'customrecordr7nexposelicensing');
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
		arrSearchFilters[1] = new nlobjSearchFilter('custrecordr7licfmrecordtypeid', null, 'is', 'customrecordr7nexposelicensing');
		arrSearchFilters[2] = new nlobjSearchFilter('custrecordr7licfmenddate', null, 'onorafter', 'today');
		arrSearchFilters[3] = new nlobjSearchFilter('custrecordr7licfmstatus', null, 'noneof', 9);
		
		var arrSearchResults = nlapiSearchRecord('customrecordr7licensefeaturemanagement', null, arrSearchFilters);
		
		for (var i = 0; arrSearchResults != null && i < arrSearchResults.length; i++) {
		
			var fmrId = arrSearchResults[i].getId();
			
			nlapiSubmitField('customrecordr7licensefeaturemanagement', fmrId, 'custrecordr7licfmstatus', status);
		}
	}
}

