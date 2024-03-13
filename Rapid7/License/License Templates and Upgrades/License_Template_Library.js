/**
 *  Library (lib)<br/>
 *
 * Called from License_Template_Tracking_SS.js 39:; Process_License_TemplatesAndUpgrads_Sched.js 31:
 *  _warning: not used anywhere I can find in NetSuite DEADCODE.<br/>
 *  _warning: email sent from 2, 55011<br/>
 *
 * existing:<br/>
 * filename: ./License Templates and Upgrades/License_Template_Library.js  ; 650907<br/>
 * script id: <br/>
 * deploy id: <br/>
 *
 * <br/>
 * proposed:<br/>
 * filename: ./License Templates and Upgrades/r7_lib_licensetemplatesandupgrades.js<br/>
 * script id: -<br/>
 * deploy id: -<br/>
 *
 *
 * @class r7_lib_LicenseTemplateAndUpgrades_DEAD
 *
 */

/*
 * Module Description
 *
 * Version    Date            Author           Remarks
 * 1.00       22 Feb 2013     efagone
 *
 */

this.arrProductTypes = grabAllProductTypes();
this.arrProductTypesByRecId = grabAllProductTypes(true);

/**
 * @method processTrackingDBRec
 * @param {Number} trackingId
 */
function processTrackingDBRec(trackingId){

	//bav nlapiLogExecution('DEBUG', 'got to processTrackingDBRec trackingId', trackingId);
	var recTrackingDB = nlapiLoadRecord('customrecordr7lictemptracking', trackingId);

	var templateId = recTrackingDB.getFieldValue('custrecordr7lictemptracking_temprec');
	var status = recTrackingDB.getFieldValue('custrecordr7lictemptracking_status');
	var activationKey = recTrackingDB.getFieldValue('custrecordr7lictemptracking_productkey');
	var altEmailTo = recTrackingDB.getFieldValue('custrecordr7lictemptrack_alt_email');
	var skipEmail = recTrackingDB.getFieldValue('custrecordr7lictemptracking_dontemail');
	var leadSource = recTrackingDB.getFieldValue('custrecordr7lictemptracking_ldsource');

	//bav nlapiLogExecution('DEBUG', '1) Details', 'templateId: '+templateId+' status: '+status+' activationKey: '+activationKey);
	if (status == 3 || status == 5) {
		try {

			var templateRecord = nlapiLoadRecord('customrecordr7lictemplatesupgrades', templateId);
			var acrId = templateRecord.getFieldValue('custrecordr7lictemp_acrprodtype');

			//bav nlapiLogExecution('DEBUG', 'templateRecord acrId', 'templateRecord: ' + templateRecord + ' acrId: ' + acrId);
			//bav 'B1QV-8P73-R03V-8L7Q'; // good testing choice: activation key

			var arrLicenseInfo = findLicenseInfo(activationKey, acrId);

			if (arrLicenseInfo == null) {
				nlapiLogExecution('ERROR', 'arrLicenseInfo is null', 'problem');
				throw nlapiCreateError('ERROR', 'Your request cannot be processed presently. Please contact Rapid7 Support.');
				return;
			}

			var daysToBeAdded = parseInt(templateRecord.getFieldValue('custrecordr7lictemp_expirationindays'));
			var computedExpirationDate = nlapiAddDays(new Date(), daysToBeAdded);
			var endDate = nlapiDateToString(computedExpirationDate);

			var fields = new Array();
			fields['acrId'] = acrId;
			fields['upgradeExpiration'] = endDate;
			fields['altEmailTo'] = altEmailTo;
			fields['skipEmail'] = skipEmail;
			fields['activationKey'] = arrLicenseInfo[0];
			fields['licenseId'] = arrLicenseInfo[2];
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
			fields['tempTopOff'] = templateRecord.getFieldValue('custrecordr7lictemp_topvalues');

			var recLicense = nlapiLoadRecord(fields['licRecordType'], fields['licenseId']);
			FMRCreated = recLicense.getFieldValue(arrProductTypes[acrId]['fmrcreatedid']);

			fields['licContactId'] = recLicense.getFieldValue(arrProductTypes[acrId]['contact']);
			fields['licCustomerId'] = recLicense.getFieldValue(arrProductTypes[acrId]['customer']);
			fields['licName'] = recLicense.getFieldValue('name');


			if (FMRCreated == 'F') {
				scrapeLicenseRecord(recLicense, 'F');
				var recLicense = nlapiLoadRecord(fields['licRecordType'], fields['licenseId']);
				recLicense.setFieldValue(arrProductTypes[acrId]['fmrcreatedid'], 'T');
				nlapiSubmitRecord(recLicense);
			}

			processCurrentLicenseFMRs(fields);
			copyFMRsFromTemplate(fields);
			createIndividualFMRs(fields);

			//Send Email
			sendNotificationEmails(fields);

			//set active
			var fieldsToSubmit = new Array();
			fieldsToSubmit[0] = 'custrecordr7lictemptracking_status';
			fieldsToSubmit[1] = 'custrecordr7lictemptracking_expiration';
			fieldsToSubmit[2] = 'custrecordr7lictemptracking_errortext';

			var valuesToSubmit = new Array();
			valuesToSubmit[0] = 2; //activated
			valuesToSubmit[1] = fields['upgradeExpiration'];
			valuesToSubmit[2] = '';

			nlapiSubmitField('customrecordr7lictemptracking', trackingId, fieldsToSubmit, valuesToSubmit);

			try {
				//submit lead to their customer record
				if (leadSource != null && leadSource != '' && fields['licCustomerId'] != null && fields['licCustomerId'] != '') {
					var recCustomer = null;
					try {
						recCustomer = nlapiLoadRecord('customer', fields['licCustomerId']);
					}
					catch (err) {
						try {
							recCustomer = nlapiLoadRecord('lead', fields['licCustomerId']);
						}
						catch (err) {
							recCustomer = nlapiLoadRecord('prospect', fields['licCustomerId']);
						}
					}

					if (recCustomer != null && recCustomer != '') {
						var currentLeadSource = recCustomer.getFieldValue('leadsource');
						if (currentLeadSource != leadSource) {
							recCustomer.setFieldValue('leadsource', leadSource);
							nlapiSubmitRecord(recCustomer, true, true);
						}
					}
				}

			}
			catch (err) {
				nlapiLogExecution('ERROR', 'Could not submit lead upgrade IPU', err);
				nlapiSendEmail(55011, 55011, 'Could not submit lead upgrade IPU', 'Error: ' + err);
			}

			//schedule script to process FMRs
			nlapiScheduleScript(462);

		}
		catch (err) {
			nlapiLogExecution('ERROR', 'Details', err);

			var fieldsToSubmit = new Array();
			fieldsToSubmit[0] = 'custrecordr7lictemptracking_status';
			fieldsToSubmit[1] = 'custrecordr7lictemptracking_errortext';

			var valuesToSubmit = new Array();
			valuesToSubmit[0] = 4; //failed
			valuesToSubmit[1] = err;

			nlapiSubmitField('customrecordr7lictemptracking', trackingId, fieldsToSubmit, valuesToSubmit);
			
			nlapiSendEmail(55011, 55011, 'Error on Tracking process db Script', 'Error: ' + err, 'derek_zanga@rapid7.com');
		}
	}
}

/**
 * @method copyFMRsFromTemplate
 * @private
 * @param fields
 * @returns {Array}
 */
function copyFMRsFromTemplate(fields){

	var acrId = fields['acrId'];
	var licRecord = arrProductTypes[acrId]['recordid'];
	var expirationComponent = arrProductTypes[acrId]['componentid'];

	nlapiLogExecution('DEBUG', 'Using this licTemplate', fields['licenseTemplate']);
	var recLicTemplate = nlapiCopyRecord(licRecord, fields['licenseTemplate']);
	scrapeTemplateLicense(recLicTemplate, fields);

	var newFMRRecord = nlapiCreateRecord('customrecordr7licensefeaturemanagement');
	newFMRRecord.setFieldValue('custrecordr7licfmfeature', expirationComponent);
	newFMRRecord.setFieldValue('custrecordr7licfmstartdate', nlapiDateToString(new Date()));
	newFMRRecord.setFieldValue('custrecordr7licfmenddate', fields['upgradeExpiration']);
	newFMRRecord.setFieldValue('custrecordr7licfmvalue', fields['upgradeExpiration']);
	newFMRRecord.setFieldValue('custrecordr7licfmproductkey', fields['activationKey']);
	newFMRRecord.setFieldValue('custrecordr7licfmstatus', 1);
	newFMRRecord.setFieldValue('custrecordr7licfmgrace', 'T');
	newFMRRecord.setFieldValue('custrecordr7licfmlicense', fields['licenseId']);
	newFMRRecord.setFieldValue(arrProductTypes[acrId]['fmrreclinkid'], fields['licenseId']);

	var id = nlapiSubmitRecord(newFMRRecord);

	nlapiLogExecution('DEBUG', 'FMR ID', id);
	if (id != null && id != '') {
		return new Array(true, id, fields['activationKey']);
	}

	return new Array(false);

}

/**
 * @method createIndividualFMRs
 * @private
 * @param fields
 */
function createIndividualFMRs(fields){

	var acrId = fields['acrId'];
	var templateId = fields['templateId'];
	var licRecord = arrProductTypes[acrId]['recordid'];

	var arrSearchFilters = new Array();
	arrSearchFilters[arrSearchFilters.length] = new nlobjSearchFilter('isinactive', null, 'is', 'F');
	arrSearchFilters[arrSearchFilters.length] = new nlobjSearchFilter('custrecordr7lictempfmr_temprecord', null, 'is', templateId);

	var arrSearchColumns = new Array();
	arrSearchColumns[0] = new nlobjSearchColumn('custrecordr7lictempfmr_feature');
	arrSearchColumns[1] = new nlobjSearchColumn('custrecordr7lictempfmr_value');

	var arrSearchResults = nlapiSearchRecord('customrecordr7lictempupg_ind_fmr', null, arrSearchFilters, arrSearchColumns);

	for (var i = 0; arrSearchResults != null && i < arrSearchResults.length; i++) {

		var addOnId = arrSearchResults[i].getValue(arrSearchColumns[0]);
		var value = arrSearchResults[i].getValue(arrSearchColumns[1]);

		var newFMRRecord = nlapiCreateRecord('customrecordr7licensefeaturemanagement');
		newFMRRecord.setFieldValue('custrecordr7licfmfeature', addOnId);
		newFMRRecord.setFieldValue('custrecordr7licfmstartdate', nlapiDateToString(new Date()));
		newFMRRecord.setFieldValue('custrecordr7licfmenddate', fields['upgradeExpiration']);
		newFMRRecord.setFieldValue('custrecordr7licfmvalue', value);
		newFMRRecord.setFieldValue('custrecordr7licfmproductkey', fields['activationKey']);
		newFMRRecord.setFieldValue('custrecordr7licfmstatus', 1);
		newFMRRecord.setFieldValue('custrecordr7licfmgrace', 'T');
		newFMRRecord.setFieldValue('custrecordr7licfmlicense', fields['licenseId']);
		newFMRRecord.setFieldValue(arrProductTypes[acrId]['fmrreclinkid'], fields['licenseId']);

		var id = nlapiSubmitRecord(newFMRRecord);
	}

}

/**
 * @method findLicenseInfo
 * @private
 * @param activationKey
 * @param acrId
 * @returns
 */
function findLicenseInfo(activationKey, acrId){

	var acrProductTypeFields = arrProductTypes[acrId];

	if (acrProductTypeFields != null && acrProductTypeFields != '' && acrProductTypeFields != 'undefined') {
		var activationKeyField = acrProductTypeFields['activationid'];
		var serialNumberField = acrProductTypeFields['serialid'];
		var recordId = acrProductTypeFields['recordid'];
		var expirationField = acrProductTypeFields['expiration'];
		var licenseIdField = acrProductTypeFields['licenseid'];

		var arrSearchFilters = new Array();

		arrSearchFilters[arrSearchFilters.length] = new nlobjSearchFilter(activationKeyField, null, 'is', activationKey);

		var arrSearchColumns = new Array();
		arrSearchColumns[0] = new nlobjSearchColumn(expirationField);
		arrSearchColumns[1] = new nlobjSearchColumn('internalid');
		arrSearchColumns[2] = new nlobjSearchColumn(licenseIdField);
		arrSearchColumns[3] = new nlobjSearchColumn(activationKeyField);

		// remove after debug
		nlapiLogExecution('DEBUG', 'activationKeyField', activationKeyField);
		nlapiLogExecution('DEBUG', 'activationKey', activationKey);
		nlapiLogExecution('DEBUG', 'recordId', recordId);
		var arrSearchResults = nlapiSearchRecord(recordId, null, arrSearchFilters, arrSearchColumns);

		if (arrSearchResults != null && arrSearchResults.length >= 1) {
			var expDate = arrSearchResults[0].getValue(arrSearchColumns[0]);
			var licenseId = arrSearchResults[0].getValue(arrSearchColumns[1]);
			var name = arrSearchResults[0].getValue(arrSearchColumns[2]);
			var activationKey = arrSearchResults[0].getValue(arrSearchColumns[3]);

			return new Array(activationKey, expDate, licenseId, name);
		}

	}
	return null;
}

/**
 * @method scrapeTemplateLicense
 * @private
 * @param newRecord
 * @param fields
 */
function scrapeTemplateLicense(newRecord, fields){

	var arrSearchFilters = new Array();
	arrSearchFilters[0] = new nlobjSearchFilter('custrecordr7acladdon_fieldid', null, 'isnot', 'id');
	arrSearchFilters[1] = new nlobjSearchFilter('custrecordr7acladdon_value', null, 'noneof', new Array(7, 8));


	var arrSearchColumns = new Array();
	arrSearchColumns[0] = new nlobjSearchColumn('custrecordr7acladdon_fieldid');
	arrSearchColumns[1] = new nlobjSearchColumn('custrecordr7acladdon_fieldtype');
	arrSearchColumns[2] = new nlobjSearchColumn('custrecordr7acladdon_value');
	arrSearchColumns[3] = new nlobjSearchColumn('custrecordr7acladdon_specificvalue');

	var arrSearchResults = nlapiSearchRecord('customrecordr7acladdoncomponents', null, arrSearchFilters, arrSearchColumns);

	var allFields = newRecord.getAllFields();

	for (var i = 0; arrSearchResults != null && i < arrSearchResults.length; i++) {
		var createAddOn = false;
		var searchResult = arrSearchResults[i];
		var addOnId = searchResult.getId();
		var fieldId = searchResult.getValue(arrSearchColumns[0]);
		var fieldType = searchResult.getValue(arrSearchColumns[1]);
		var valueId = searchResult.getValue(arrSearchColumns[2]);
		var specificValue = searchResult.getValue(arrSearchColumns[3]);

		if (allFields.indexOf(fieldId) != -1) {
			var fieldValue = newRecord.getFieldValue(fieldId);

			if (fieldType == 'date' || fieldType == 'integer') {

				if ((specificValue == '' || specificValue == null) && (fieldValue != null && fieldValue != '')) {

					createAddOn = true;

					if ((fieldId == 'custrecordr7nxlicensenumberips' || fieldId == 'custrecordr7managedservicesips') && (fieldValue == '1' || fieldValue == '0')) {
						createAddOn = false;
					}

					if (arrProductTypesByRecId[newRecord.getRecordType()]['expiration'] == fieldId) {
						createAddOn = false;
					}
				}
			}
			else
			if ((specificValue != '' || specificValue != null) && fieldValue == specificValue && fieldValue != 'F') {
				createAddOn = true;
			}
			else
			if ((specificValue == '' || specificValue == null) && fieldType == 'select') {
				createAddOn = true;
			}
		}

		if (createAddOn) {
			allFields[allFields.indexOf(fieldId)] = '';

			var newFMRRecord = nlapiCreateRecord('customrecordr7licensefeaturemanagement');
			newFMRRecord.setFieldValue('custrecordr7licfmfeature', addOnId);
			newFMRRecord.setFieldValue('custrecordr7licfmvalue', fieldValue);
			newFMRRecord.setFieldValue('custrecordr7licfmstartdate', nlapiDateToString(new Date()));
			newFMRRecord.setFieldValue('custrecordr7licfmenddate', fields['upgradeExpiration']);
			newFMRRecord.setFieldValue('custrecordr7licfmproductkey', fields['activationKey']);
			newFMRRecord.setFieldValue('custrecordr7licfmstatus', 1);
			newFMRRecord.setFieldValue('custrecordr7licfmgrace', 'T');
			newFMRRecord.setFieldValue('custrecordr7licfmlicense', fields['licenseId']);
			newFMRRecord.setFieldValue(arrProductTypesByRecId[newRecord.getRecordType()]['fmrreclinkid'], fields['licenseId']);

			try {
				var id = nlapiSubmitRecord(newFMRRecord);
			}
			catch (err) {
				nlapiSendEmail(55011, 55011, 'Could not create FMR - IPR', 'AddOnId: ' + addOnId + '\nactivationKey: ' + fields['activationKey'] + '\n\nError: ' + err);
			}
		}
	}
}

/**
 * @method sendNotificationEmails
 * @private
 * @param fields
 */
function sendNotificationEmails(fields){

	var templateId = fields['templateId'];
	var acrId = fields['acrId'];
	var licenseId = fields['licenseId'];
	var licenseRecType = arrProductTypes[acrId]['recordid'];

	nlapiLogExecution('DEBUG', 'licenseRecType', licenseId);
	nlapiLogExecution('DEBUG', 'licenseId', licenseId);

	/* Gathering details from the license record for the email*/

	var contactId = fields['licContactId'];
	var licenseName = fields['licName'];

	var sendEmailTo = (fields['skipEmail'] != 'T') ? contactId : null;
	if (fields['altEmailTo'] != null && fields['altEmailTo'] != '') {
		sendEmailTo = fields['altEmailTo'];
	}

	/* Gathering details for the download email From the contact record*/
	try {
		var contactRecord = nlapiLoadRecord('contact', contactId);
	}
	catch (err) {
		nlapiLogExecution("DEBUG", 'Error Loading contact record ' + err.name, err.message);
		return;
	}

	var contactName = contactRecord.getFieldValue('entityid');
	var companyId = contactRecord.getFieldValue('company');
	var companyName = contactRecord.getFieldText('company');

	var salesRepEmail = nlapiLookupField('customer', companyId, 'salesrep');
	/* Gathering details for the download email From the contact record*/

	/*From the template record*/
	var emailTemplateId = fields['tempEmailTemplateId'];
	var days = fields['tempDays'];
	var sendEmailFrom = fields['tempSendEmailFrom'];
	var notificationList = fields['tempNotifyList'];
	var notifySalesRep = fields['tempNotifySalesRep'];
	var description = fields['tempDescription'];
	var owner = fields['tempOwner'];

	var replyTo = nlapiLoadConfiguration('companypreferences').getFieldValue('custscriptr7_replay_to_license_template');

	/* Notifying the contact with his license information */
	if (sendEmailFrom == null || sendEmailFrom == '') {
		sendEmailFrom = salesRepEmail;
	}
	if (sendEmailFrom == null || sendEmailFrom == '') {
		sendEmailFrom = nlapiLoadConfiguration('companypreferences').getFieldValue('custscriptr7_send_licensetemplate_from');
	}

	if (sendEmailTo && emailTemplateId != null && emailTemplateId != '') {

		// Samanage # brian_vaughan@rapid7.com 20150403
		var subject, body;
		var templateVersion = nlapiLoadRecord('emailtemplate', emailTemplateId).getFieldValue('templateversion');

		if(templateVersion != 'FREEMARKER') { // CRMSDK Note: this is being deprecated.
			var merge = nlapiMergeRecord(emailTemplateId, licenseRecType, licenseId);
			subject = merge.getName();
			body = merge.getValue();
		}
		else { // the new FREEMARKER
			var emailMerger = nlapiCreateEmailMerger(emailTemplateId);
			emailMerger.setCustomRecord(licenseRecType, licenseId);

			var mergeResult = emailMerger.merge();
			subject = mergeResult.getSubject();
			body = mergeResult.getBody();
		}

		nlapiLogExecution('AUDIT', 'body', body);
		var records = new Array();
		records['recordtype'] = licenseRecType;
		records['record'] = licenseId;
		try {
			nlapiSendEmail(sendEmailFrom, sendEmailTo, subject, body, null, null, records, null, null, null, replyTo);
		}
		catch (err) {
			nlapiSendEmail(2, sendEmailTo, subject, body, null, null, records);
		}
		// end Samanage # brian_vaughan@rapid7.com 20150403
		/* Notifying the contact with his license information */
	}

	/* Notifying the salesRep and the notificationList */
	var notificationText = contactName + " from " + companyName + " has been automatically given" +
		" license " +
		licenseName +
		" expiring on " +
		nlapiDateToString(nlapiAddDays(new Date(), days)) +
		". This was created from the '" +
		description +
		"' template.";

	if (notificationList != null) {
		for (var j = 0; j < notificationList.length; j++) {
			nlapiSendEmail(owner, notificationList[j], 'License Upgrade', notificationText);
			nlapiLogExecution('DEBUG', 'Notification List', notificationList[j]);
		}
	}

	try {
		if (notifySalesRep == 'T') {
			nlapiSendEmail(2, salesRepEmail, 'License Upgrade', notificationText);
		}
	}
	catch (err) {
	}
	/* Notifying the salesRep and the notificationList */
	nlapiLogExecution('DEBUG', 'All Done', '--------------------------------');

}

/**
 * @method scrapeLicenseRecord
 * @private
 * @param recLicense
 * @param isGrace
 * @param overrideStartDate
 * @param overrideEndDate
 */
function scrapeLicenseRecord(recLicense, isGrace, overrideStartDate, overrideEndDate){

	var arrAddOnCompRecMap = getAddOnComponentRecMap();

	if (isGrace != 'T') {
		isGrace = 'F';
	}
	var fields = getGenericLicInfo(recLicense);

	var maxEndDateLFM = getMaxEndDateLFM(fields['productKey'], recLicense.getRecordType());
	var currentLicenseEndDate = fields['expirationDate'];
	var endDateFMR = currentLicenseEndDate;

	if (overrideEndDate != null && overrideEndDate != '') {
		endDateFMR = overrideEndDate;
	}
	else {

		if (maxEndDateLFM == null || maxEndDateLFM == '') {
			endDateFMR = currentLicenseEndDate;
		}
		else
		if (nlapiStringToDate(maxEndDateLFM) > nlapiStringToDate(currentLicenseEndDate)) {
			endDateFMR = maxEndDateLFM;
		}
	}

	var now = new Date();

	var recordType = recLicense.getRecordType();

	var arrSearchFilters = new Array();
	arrSearchFilters[0] = new nlobjSearchFilter('custrecordr7aclrecord_internalid', null, 'anyof', arrAddOnCompRecMap[recordType]);
	arrSearchFilters[1] = new nlobjSearchFilter('custrecordr7acladdon_fieldid', null, 'isnot', 'id');
	arrSearchFilters[2] = new nlobjSearchFilter('custrecordr7acladdon_value', null, 'noneof', new Array(7, 8));


	var arrSearchColumns = new Array();
	arrSearchColumns[0] = new nlobjSearchColumn('custrecordr7acladdon_fieldid');
	arrSearchColumns[1] = new nlobjSearchColumn('custrecordr7acladdon_fieldtype');
	arrSearchColumns[2] = new nlobjSearchColumn('custrecordr7acladdon_value');
	arrSearchColumns[3] = new nlobjSearchColumn('custrecordr7acladdon_specificvalue');

	var arrSearchResults = nlapiSearchRecord('customrecordr7acladdoncomponents', null, arrSearchFilters, arrSearchColumns);

	var allFields = recLicense.getAllFields();

	for (var i = 0; arrSearchResults != null && i < arrSearchResults.length; i++) {
		var createAddOn = false;
		var searchResult = arrSearchResults[i];
		var addOnId = searchResult.getId();
		var fieldId = searchResult.getValue(arrSearchColumns[0]);
		var fieldType = searchResult.getValue(arrSearchColumns[1]);
		var valueId = searchResult.getValue(arrSearchColumns[2]);
		var specificValue = searchResult.getValue(arrSearchColumns[3]);
		var fieldValue = '';
		if (allFields.indexOf(fieldId) != -1) {
			fieldValue = recLicense.getFieldValue(fieldId);

			if (fieldType == 'date' || fieldType == 'integer') {

				if ((specificValue == '' || specificValue == null) && (fieldValue != null && fieldValue != '')) {

					createAddOn = true;

					if (fieldId == 'custrecordr7nxlicensenumberips' && (fieldValue == '1' || fieldValue == '0')) {
						createAddOn = false;
					}
				}
			}
			else
			if ((specificValue != '' || specificValue != null) && fieldValue == specificValue && fieldValue != 'F') {
				createAddOn = true;
			}
			else
			if ((specificValue == '' || specificValue == null) && fieldType == 'select') {
				createAddOn = true;
			}
		}

		if (createAddOn) {
			nlapiLogExecution('DEBUG', 'creating add on', fieldId);
			allFields[allFields.indexOf(fieldId)] = '';

			var fmrStart = nlapiDateToString(now);
			if (overrideStartDate != null && overrideStartDate != '') {
				fmrStart = overrideStartDate;
			}


			if (fieldType == 'date' && overrideEndDate != null && overrideEndDate != '') {
				fieldValue = overrideEndDate;
				fmrStart = nlapiDateToString(now);
			}
			var newFMRRecord = nlapiCreateRecord('customrecordr7licensefeaturemanagement');
			newFMRRecord.setFieldValue('custrecordr7licfmfeature', addOnId);
			newFMRRecord.setFieldValue('custrecordr7licfmvalue', fieldValue);
			newFMRRecord.setFieldValue('custrecordr7licfmsalesorder', fields['salesorder']);
			newFMRRecord.setFieldValue('custrecordr7licfmstartdate', fmrStart);
			newFMRRecord.setFieldValue('custrecordr7licfmenddate', endDateFMR);
			newFMRRecord.setFieldValue('custrecordr7licfmproductkey', fields['productKey']);
			newFMRRecord.setFieldValue('custrecordr7licfmstatus', 3);
			newFMRRecord.setFieldValue('custrecordr7licfmaclcreated', 'T');
			newFMRRecord.setFieldValue('custrecordr7licfmlicense', recLicense.getId());
			newFMRRecord.setFieldValue(arrProductTypesByRecId[recordType]['fmrreclinkid'], recLicense.getId());

			newFMRRecord.setFieldValue('custrecordr7licfmgrace', isGrace);

			try {
				var id = nlapiSubmitRecord(newFMRRecord);
			}
			catch (err) {
				nlapiSendEmail(55011, 55011, 'Could not create built-in FMR - licTemplate', 'AddOnId: ' + addOnId + '\nSalesOrder: ' + fields['salesorder'] + '\n\nError:' + err);
			}
		}

	}

}

/**
 * @method getMaxEndDateLFM
 * @private
 * @param productKey
 * @param recordType
 * @returns
 */
function getMaxEndDateLFM(productKey, recordType){

	var arrSearchFilters = new Array();
	arrSearchFilters[0] = new nlobjSearchFilter('custrecordr7licfmproductkey', null, 'is', productKey);
	arrSearchFilters[1] = new nlobjSearchFilter('custrecordr7licfmrecordtypeid', null, 'is', recordType);
	arrSearchFilters[2] = new nlobjSearchFilter('custrecordr7licfmgrace', null, 'is', 'F');
	arrSearchFilters[3] = new nlobjSearchFilter('custrecordr7licfmfeaturefieldtype', null, 'is', 'date');
	arrSearchFilters[4] = new nlobjSearchFilter('custrecordr7licfmstatus', null, 'noneof', new Array(7, 8, 9));

	var arrSearchColumns = new Array();
	arrSearchColumns[0] = new nlobjSearchColumn('internalid');
	arrSearchColumns[1] = new nlobjSearchColumn('custrecordr7licfmvalue');

	var arrSearchResults = nlapiSearchRecord('customrecordr7licensefeaturemanagement', null, arrSearchFilters, arrSearchColumns);

	var maxEnd = '';
	for (var i=0; arrSearchResults != null && i < arrSearchResults.length; i++){

		var currentEnd = arrSearchResults[i].getValue(arrSearchColumns[1]);

		if (currentEnd != null && currentEnd != ''){
			var dtCurrentEnd = nlapiStringToDate(currentEnd);
			if (maxEnd == null || maxEnd == '' || dtCurrentEnd > maxEnd){
				maxEnd = dtCurrentEnd;
			}
		}
	}

	if (maxEnd == null || maxEnd == ''){
		return null;
	}

	return nlapiDateToString(maxEnd);
}

/**
 * @method getGenericLicInfo
 * @private
 * @param recLicense
 * @returns {___anonymous24947_24952}
 */
function getGenericLicInfo(recLicense){

	var recordType = recLicense.getRecordType();
	recordType = recordType.toLowerCase();
	var fields = new Array();

	fields['salesorder'] = recLicense.getFieldValue(arrProductTypesByRecId[recordType]['salesorder']);
	fields['expirationDate'] = recLicense.getFieldValue(arrProductTypesByRecId[recordType]['expiration']);
	fields['productKey'] = recLicense.getFieldValue(arrProductTypesByRecId[recordType]['activationid']);

	nlapiLogExecution('DEBUG', 'returning fields', 'yup');
	return fields;
}

/**
 * @method getAddOnComponentRecMap
 * @private
 * @returns {Array}
 */
function getAddOnComponentRecMap(){

	var arrSearchColumns = new Array();
	arrSearchColumns[0] = new nlobjSearchColumn('formulatext', null, 'group');
	arrSearchColumns[0].setFormula('{custrecordr7aclrecord_internalid}');
	arrSearchColumns[1] = new nlobjSearchColumn('formulatext', null, 'max');
	arrSearchColumns[1].setFormula('{custrecordr7aclrecord_internalid.id}');

	//all FMR's ever tied to that license
	var arrSearchResults = nlapiSearchRecord('customrecordr7acladdoncomponents', null, null, arrSearchColumns);

	var arrAddOnRecMap = new Array();

	for (var i = 0; arrSearchResults != null && i < arrSearchResults.length; i++) {

		var searchResult = arrSearchResults[i];
		var fieldText = searchResult.getValue(arrSearchColumns[0]);
		var fieldId = searchResult.getValue(arrSearchColumns[1]);

		arrAddOnRecMap[fieldText] = fieldId;
	}

	return arrAddOnRecMap;
}

/**
 * @method processCurrentLicenseFMRs
 * @private
 * @param fields
 */
function processCurrentLicenseFMRs(fields){

	// 1 - Suspend   (start date should become upgrade end date +1)
	// 2 - Expire	 (end date should become today -1)
	// 3 - Do nothing (dont touch nothing!!!!)

	var actionToTake = fields['tempExistingFMRAction'];

	if (actionToTake != 3) {
		var arrSearchFilters = new Array();
		arrSearchFilters[0] = new nlobjSearchFilter('custrecordr7licfmrecordtypeid', null, 'is', fields['licRecordType']);
		arrSearchFilters[1] = new nlobjSearchFilter('custrecordr7licfmproductkey', null, 'is', fields['activationKey']);
		arrSearchFilters[2] = new nlobjSearchFilter('custrecordr7licfmstartdate', null, 'onorbefore', 'today');
		arrSearchFilters[3] = new nlobjSearchFilter('custrecordr7licfmenddate', null, 'onorafter', 'today');
		arrSearchFilters[4] = new nlobjSearchFilter('custrecordr7licfmstatus', null, 'noneof', new Array(4, 7, 8, 9));

		var arrSearchColumns = new Array();
		arrSearchColumns[0] = new nlobjSearchColumn('custrecordr7licfmfeildid');
		arrSearchColumns[1] = new nlobjSearchColumn('custrecordr7licfmfeaturefieldtype');
		arrSearchColumns[2] = new nlobjSearchColumn('custrecordr7licfmvalue');
		arrSearchColumns[3] = new nlobjSearchColumn('custrecordr7licfmstartdate');
		arrSearchColumns[4] = new nlobjSearchColumn('custrecordr7licfmenddate');
		arrSearchColumns[5] = new nlobjSearchColumn('custrecordr7licfmgrace');
		arrSearchColumns[6] = new nlobjSearchColumn('created').setSort(false);

		//all FMR's ever tied to that license
		var arrSearchResults = nlapiSearchRecord('customrecordr7licensefeaturemanagement', null, arrSearchFilters, arrSearchColumns);

		for (var i = 0; arrSearchResults != null && i < arrSearchResults.length; i++) {

			var searchResult = arrSearchResults[i];
			var fmrId = searchResult.getId();
			var fieldId = searchResult.getValue(arrSearchColumns[0]);
			var fieldType = searchResult.getValue(arrSearchColumns[1]);
			var fmrValue = searchResult.getValue(arrSearchColumns[2]);
			var startDate = searchResult.getValue(arrSearchColumns[3]);
			var endDate = searchResult.getValue(arrSearchColumns[4]);
			var isGrace = searchResult.getValue(arrSearchColumns[5]);
			nlapiLogExecution('DEBUG', 'fmrId', fmrId);
			nlapiLogExecution('DEBUG', 'fields[upgradeExpiration])', fields['upgradeExpiration']);
			var fieldsToSubmit = new Array();
			var valuesToSubmit = new Array();

			switch (actionToTake) {
				case '1':

					fieldsToSubmit[0] = 'custrecordr7licfmstatus';
					valuesToSubmit[0] = 8;

					nlapiSubmitField('customrecordr7licensefeaturemanagement', fmrId, fieldsToSubmit, valuesToSubmit);
					break;
				case '2':
					fieldsToSubmit[0] = 'custrecordr7licfmstatus';
					valuesToSubmit[0] = 4;

					nlapiSubmitField('customrecordr7licensefeaturemanagement', fmrId, fieldsToSubmit, valuesToSubmit);
					break;
				case '3':
					//do nothing
					break;
				default:
					break;
			}


		}
	}
}
