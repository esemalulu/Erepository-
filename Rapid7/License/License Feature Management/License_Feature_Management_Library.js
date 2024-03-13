/*
 * @author efagone
 */

var arrAddOnCompRecMap = getAddOnComponentRecMap();
var arrProductTypes = grabAllProductTypes(true);

function scrapeLicenseRecord(recLicense, isGrace, overrideStartDate, overrideEndDate){

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
			if ((specificValue == '' || specificValue == null) && (fieldType == 'select')) {
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

			newFMRRecord.setFieldValue(arrProductTypes[recordType]['fmrreclinkid'], recLicense.getId());

			newFMRRecord.setFieldValue('custrecordr7licfmgrace', isGrace);

			try {
				var id = nlapiSubmitRecord(newFMRRecord);
			}
			catch (e) {
				var adminUser =  nlapiLoadConfiguration('companypreferences').getFieldValue('custscriptr7_system_info_email_sender');
				nlapiSendEmail(adminUser, adminUser, 'Could not create built-in FMR', 'AddOnId: ' + addOnId + '\nSalesOrder: ' + fields['salesorder'] + '\n\nError:' + e);
			}
		}

	}

}

function getMaxEndDateLFM(productKey, recordType){

	var arrSearchFilters = new Array();
	arrSearchFilters[0] = new nlobjSearchFilter('custrecordr7licfmproductkey', null, 'is', productKey);
	arrSearchFilters[1] = new nlobjSearchFilter('custrecordr7licfmrecordtypeid', null, 'is', recordType);
	arrSearchFilters[2] = new nlobjSearchFilter('custrecordr7licfmgrace', null, 'is', 'F');
	arrSearchFilters[3] = new nlobjSearchFilter('custrecordr7licfmfeaturefieldtype', null, 'is', 'date');
	arrSearchFilters[4] = new nlobjSearchFilter('custrecordr7licfmstatus', null, 'noneof', new Array(7, 8, 9));

	var arrSearchColumns = new Array();
	arrSearchColumns[0] = new nlobjSearchColumn('internalid');
	arrSearchColumns[1] = new nlobjSearchColumn('custrecordr7licfmenddate');

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

function getMaxStartedEndDate(productKey, recordType){

	var arrSearchFilters = new Array();
	arrSearchFilters[0] = new nlobjSearchFilter('custrecordr7licfmproductkey', null, 'is', productKey);
	arrSearchFilters[1] = new nlobjSearchFilter('custrecordr7licfmrecordtypeid', null, 'is', recordType);
	arrSearchFilters[2] = new nlobjSearchFilter('custrecordr7licfmfeaturefieldtype', null, 'is', 'date');
	arrSearchFilters[3] = new nlobjSearchFilter('custrecordr7licfmstartdate', null, 'onorbefore', 'today');
	arrSearchFilters[3] = new nlobjSearchFilter('custrecordr7licfmenddate', null, 'isnotempty');
	arrSearchFilters[4] = new nlobjSearchFilter('custrecordr7licfmstatus', null, 'noneof', new Array(7, 8, 9));

	var arrSearchColumns = new Array();
	arrSearchColumns[0] = new nlobjSearchColumn('internalid');
	arrSearchColumns[1] = new nlobjSearchColumn('custrecordr7licfmenddate').setSort(true);

	var arrSearchResults = nlapiSearchRecord('customrecordr7licensefeaturemanagement', null, arrSearchFilters, arrSearchColumns);

	if (arrSearchResults != null && arrSearchResults.length > 0){
		return arrSearchResults[0].getValue(arrSearchColumns[1]);
	}

	return nlapiDateToString(new Date());

}

function getGenericLicInfo(recLicense){

	var recordType = recLicense.getRecordType();
	recordType = recordType.toLowerCase();
	var fields = new Array();

	fields['salesorder'] = recLicense.getFieldValue(arrProductTypes[recordType]['salesorder']);
	fields['expirationDate'] = recLicense.getFieldValue(arrProductTypes[recordType]['expiration']);
	fields['productKey'] = recLicense.getFieldValue(arrProductTypes[recordType]['activationid']);

	nlapiLogExecution('DEBUG', 'returning fields', 'yup');
	return fields;
}


function processEverything(recLicense){

	var recordType = recLicense.getRecordType();
	recordType = recordType.toLowerCase();
	var licenseId = recLicense.getId();
	var activationId = recLicense.getFieldValue(arrProductTypes[recordType]['activationid']);

	var FMRCreated = 'T';

	FMRCreated = recLicense.getFieldValue(arrProductTypes[recordType]['fmrcreatedid']);


	if (FMRCreated == 'F') {
		scrapeLicenseRecord(recLicense, 'F');
	}

	var recLicense2 = nlapiLoadRecord(recLicense.getRecordType(), recLicense.getId());
	recLicense2.setFieldValue(arrProductTypes[recordType]['fmrcreatedid'], 'T');

	recLicense2 = freshenUpLicense(recLicense2);

	recLicense2 = processLicense(recLicense2);

	try {

		var expirationDate = recLicense2.getFieldValue(arrProductTypes[recordType]['expiration']);

		if (nlapiStringToDate(expirationDate) > nlapiStringToDate(nlapiDateToString(new Date()))) {
			nlapiLogExecution('DEBUG', 'Expiration Date', expirationDate);
			nlapiLogExecution('DEBUG', 'Submitting License', licenseId);
			nlapiSubmitRecord(recLicense2);
		}
		else {
			var recLicense3 = nlapiLoadRecord(recLicense2.getRecordType(), recLicense2.getId());

			var maxEnd = getMaxStartedEndDate(activationId, recordType);
			nlapiLogExecution('DEBUG', 'Expiration Date', maxEnd);
			recLicense3.setFieldValue(arrProductTypes[recordType]['expiration'], maxEnd);

			nlapiLogExecution('DEBUG', 'Submitting License', licenseId);
			nlapiSubmitRecord(recLicense3);
		}

		markFMRsProcessed(recordType, activationId, true);
	}
	catch (e) {
		nlapiLogExecution('ERROR', 'Could not process license', 'RecType: ' + recLicense2.getRecordType() + '\nLicenseId: ' + licenseId + '\n' + e);
		var adminUser =  nlapiLoadConfiguration('companypreferences').getFieldValue('custscriptr7_system_info_email_sender');
		nlapiSendEmail(adminUser, adminUser, 'Could not process license ' + licenseId, 'RecType: ' + recLicense2.getRecordType() + '\nLicenseId: ' + licenseId + '\n' + e);
		markFMRsProcessed(recordType, activationId, false, e);
	}

}

function markFMRsProcessed(recordType, activationId, success, error){

	if (success) {
		// expire enddate prior to today
		var arrSearchFilters = new Array();
		arrSearchFilters[0] = new nlobjSearchFilter('custrecordr7licfmrecordtypeid', null, 'is', recordType);
		arrSearchFilters[1] = new nlobjSearchFilter('custrecordr7licfmproductkey', null, 'is', activationId);
		arrSearchFilters[2] = new nlobjSearchFilter('custrecordr7licfmenddate', null, 'before', 'today');
		arrSearchFilters[3] = new nlobjSearchFilter('custrecordr7licfmstatus', null, 'noneof', 4);

		var arrSearchResults = nlapiSearchRecord('customrecordr7licensefeaturemanagement', null, arrSearchFilters);

		for (var i = 0; arrSearchResults != null && i < arrSearchResults.length; i++) {
			var searchResult = arrSearchResults[i];
			nlapiSubmitField('customrecordr7licensefeaturemanagement', searchResult.getId(), 'custrecordr7licfmstatus', 4);
		}

		// mark active anything within dates 

		var arrSearchFilters = new Array();
		arrSearchFilters[0] = new nlobjSearchFilter('custrecordr7licfmrecordtypeid', null, 'is', recordType);
		arrSearchFilters[1] = new nlobjSearchFilter('custrecordr7licfmproductkey', null, 'is', activationId);
		arrSearchFilters[2] = new nlobjSearchFilter('custrecordr7licfmstartdate', null, 'onorbefore', 'today');
		arrSearchFilters[3] = new nlobjSearchFilter('custrecordr7licfmenddate', null, 'onorafter', 'today');
		arrSearchFilters[4] = new nlobjSearchFilter('custrecordr7licfmstatus', null, 'noneof', new Array(7, 8, 9));

		var arrSearchResults = nlapiSearchRecord('customrecordr7licensefeaturemanagement', null, arrSearchFilters);

		for (var i = 0; arrSearchResults != null && i < arrSearchResults.length; i++) {
			var searchResult = arrSearchResults[i];
			nlapiSubmitField('customrecordr7licensefeaturemanagement', searchResult.getId(), 'custrecordr7licfmstatus', 3);
		}
	}
	else {

		var arrSearchFilters = new Array();
		arrSearchFilters[0] = new nlobjSearchFilter('custrecordr7licfmrecordtypeid', null, 'is', recordType);
		arrSearchFilters[1] = new nlobjSearchFilter('custrecordr7licfmproductkey', null, 'is', activationId);
		arrSearchFilters[2] = new nlobjSearchFilter('custrecordr7licfmenddate', null, 'before', 'today');
		arrSearchFilters[3] = new nlobjSearchFilter('custrecordr7licfmstatus', null, 'anyof', new Array(1, 2, 3));

		var arrSearchResults = nlapiSearchRecord('customrecordr7licensefeaturemanagement', null, arrSearchFilters);

		for (var i = 0; arrSearchResults != null && i < arrSearchResults.length; i++) {
			var searchResult = arrSearchResults[i];
			nlapiSubmitField('customrecordr7licensefeaturemanagement', searchResult.getId(), 'custrecordr7licfmstatus', 6);
		}

		var arrSearchFilters = new Array();
		arrSearchFilters[0] = new nlobjSearchFilter('custrecordr7licfmrecordtypeid', null, 'is', recordType);
		arrSearchFilters[1] = new nlobjSearchFilter('custrecordr7licfmproductkey', null, 'is', activationId);
		arrSearchFilters[2] = new nlobjSearchFilter('custrecordr7licfmstartdate', null, 'onorbefore', 'today');
		arrSearchFilters[3] = new nlobjSearchFilter('custrecordr7licfmenddate', null, 'onorafter', 'today');
		arrSearchFilters[4] = new nlobjSearchFilter('custrecordr7licfmstatus', null, 'noneof', new Array(3, 7, 8, 9));

		var arrSearchResults = nlapiSearchRecord('customrecordr7licensefeaturemanagement', null, arrSearchFilters);

		var errorText = 'Code: ' + error.name + '<br>Details: ' + error.message;

		for (var i = 0; arrSearchResults != null && i < arrSearchResults.length; i++) {
			var searchResult = arrSearchResults[i];

			var fields = new Array();
			fields[0] = 'custrecordr7licfmerrortext';
			fields[1] = 'custrecordr7licfmstatus';

			var values = new Array();
			values[0] = errorText;
			values[1] = 6;

			nlapiSubmitField('customrecordr7licensefeaturemanagement', searchResult.getId(), fields, values);
		}
	}
}

function processLicense(recLicense){

	var recordType = recLicense.getRecordType();
	recordType = recordType.toLowerCase();
	var recordId = recLicense.getId();
	var activationId = recLicense.getFieldValue(arrProductTypes[recordType]['activationid']);

	var arrSearchFilters = new Array();
	arrSearchFilters[0] = new nlobjSearchFilter('custrecordr7licfmrecordtypeid', null, 'is', recordType);
	arrSearchFilters[1] = new nlobjSearchFilter('custrecordr7licfmproductkey', null, 'is', activationId);
	arrSearchFilters[2] = new nlobjSearchFilter('custrecordr7licfmstartdate', null, 'onorbefore', 'today');
	arrSearchFilters[3] = new nlobjSearchFilter('custrecordr7licfmenddate', null, 'onorafter', 'today');
	arrSearchFilters[4] = new nlobjSearchFilter('custrecordr7licfmstatus', null, 'noneof', new Array(7, 8, 9));

	var arrSearchColumns = new Array();
	arrSearchColumns[0] = new nlobjSearchColumn('custrecordr7licfmfeildid');
	arrSearchColumns[1] = new nlobjSearchColumn('custrecordr7licfmfeaturefieldtype');
	arrSearchColumns[2] = new nlobjSearchColumn('custrecordr7licfmvalue');
	arrSearchColumns[3] = new nlobjSearchColumn('custrecordr7licfmenddate');
	arrSearchColumns[4] = new nlobjSearchColumn('custrecordr7licfmsalesorder');
	arrSearchColumns[5] = new nlobjSearchColumn('custrecordr7licfmgrace');
	arrSearchColumns[6] = new nlobjSearchColumn('created').setSort(false);

	//all FMR's ever tied to that license
	var arrSearchResults = nlapiSearchRecord('customrecordr7licensefeaturemanagement', null, arrSearchFilters, arrSearchColumns);
	var disabledFields = new Array();
	for (var i = 0; arrSearchResults != null && i < arrSearchResults.length; i++) {

		var searchResult = arrSearchResults[i];
		var fieldId = searchResult.getValue(arrSearchColumns[0]);

		var fieldType = searchResult.getValue(arrSearchColumns[1]);
		var fmrValue = searchResult.getValue(arrSearchColumns[2]);
		var fmrEndDate = searchResult.getValue(arrSearchColumns[3]);
		var currentValue = recLicense.getFieldValue(fieldId);
		var isGrace = searchResult.getValue(arrSearchColumns[5]);
		var salesOrderId = searchResult.getValue(arrSearchColumns[4]);

		if (fieldType == 'checkbox' && fmrValue == 'r7disable') {
			disabledFields[disabledFields.length] = fieldId;
		}
		if (fieldType == 'date'){
			fmrValue = fmrEndDate;
		}

		//check if package is CODEL & field is data retention, then override Data Retention with latest value,
		if(recordType == 'customrecordr7insightplatform') {
			var packageLicId = recLicense.getFieldValue('custrecordr7inplicensepackagelicense');
			nlapiLogExecution("AUDIT", "Package License ID from License", packageLicId);
			if(packageLicId){
				var packageLicRec = nlapiLoadRecord('customrecord_r7_pck_license', packageLicId);
				var packageLicLevel= packageLicRec.getFieldText('custrecord_r7_pl_current_level');
				nlapiLogExecution("AUDIT", "Package License Level from License", packageLicLevel);
	
				if(fieldId == 'custrecordr7inplicensedataretentiondays' && packageLicLevel.indexOf("CODEL") != -1){
					nlapiLogExecution("AUDIT", "Updating Data Retention");
					var licenseValue = recLicense.getFieldValue('custrecordr7inplicensedataretentiondays');
					if (licenseValue != fmrValue){
						currentValue = null;
						var newValue = determineNewFieldValue(currentValue, fmrValue, fieldType);
					}
				}
				//else process everything else as normal.
				else {
					var newValue = determineNewFieldValue(currentValue, fmrValue, fieldType);
				} 
			}
			//else process everything else as normal.
			else {
				var newValue = determineNewFieldValue(currentValue, fmrValue, fieldType);
			}
		}
		//else process everything else as normal.
		else {
			var newValue = determineNewFieldValue(currentValue, fmrValue, fieldType);
		}

		if (disabledFields.indexOf(fieldId) != -1) {
			newValue = 'F';
		}

		recLicense.setFieldValue(fieldId, newValue);
		//update SO for all new FM in nexpose
		if (
			(fieldType == "date" && isGrace == "F" && salesOrderId != null && salesOrderId != "") ||
			// https://issues.corp.rapid7.com/browse/APPS-16865 set new Sales Order Id on insight platform license for upsell
			(["customrecordr7nexposelicensing", "customrecordr7insightplatform", "customrecordr7metasploitlicensing"].indexOf(recordType) != -1 &&
				isGrace == "F" &&
				salesOrderId != null &&
				salesOrderId != "")
		) {
			//don't update sales order, can't edit transactions in closed periods
			//nlapiSubmitField('salesorder',salesOrderId, 'custbodyr7_so_license_fulfillment_st',1);
			recLicense.setFieldValue(arrProductTypes[recordType]["salesorder"], salesOrderId);
			// stamp SO INSIGHT PLATFORM RECORD CREATED - TRUE on the upsell SO for this transaction to be picked up by 'R7 Create Insight Plat Outbound Event' script
			// APPS-19610 Spike - To stop nexpose SOs having Insight Plat Rec Created = T, only execute submitField if record type = insightplatform
			if(recordType == "customrecordr7insightplatform"){
              nlapiSubmitField('salesorder', salesOrderId, 'custbodyr7_so_insight_plat_created', 'T')
            }
		}
	}

	if ((recordType == 'customrecordr7nexposelicensing') && (recLicense.getFieldValue('custrecordr7nxnumberengines') == '' || recLicense.getFieldValue('custrecordr7nxnumberengines') == null)) {
		recLicense.setFieldValue('custrecordr7nxnumberengines', 1);
	}

	return recLicense;
}

function determineNewFieldValue(currentValue, fmrValue, fieldType){

	var newValue = '';

	switch (fieldType) {
		case 'checkbox':
			if (fmrValue == 'T') {
				newValue = fmrValue;
			}
			else {
				newValue = currentValue;
			}
			break;
		case 'date':
			if (currentValue == null || currentValue == '' || nlapiStringToDate(fmrValue) > nlapiStringToDate(currentValue)) {
				newValue = fmrValue;
			}
			else {
				newValue = currentValue;
			}
			break;
		case 'integer':
			if (currentValue == '' || currentValue == null) {
				if (fmrValue != '' && fmrValue != null) {
					newValue = parseInt(fmrValue);
				}
				else {
					newValue = '';
				}
			}
			else
			if (fmrValue != '' && fmrValue != null) {
				newValue = parseInt(currentValue) + parseInt(fmrValue);
			}
			else {
				newValue = currentValue;

			}
			break;
		case 'select':
			newValue = fmrValue;
			break;
		case 'text':
			newValue = fmrValue;
			break;
		case 'multiselect':
			newValue = fmrValue;
			break;
		default:
			newValue = fmrValue;
	}

	return newValue;

}

function freshenUpLicense(recLicense){

	var recordType = recLicense.getRecordType();

	var arrSearchFilters = new Array();
	arrSearchFilters[0] = new nlobjSearchFilter('custrecordr7aclrecord_internalid', null, 'anyof', arrAddOnCompRecMap[recordType]);
	arrSearchFilters[1] = new nlobjSearchFilter('custrecordr7acladdon_fieldid', null, 'isnot', 'id');
	arrSearchFilters[2] = new nlobjSearchFilter('custrecordr7acladdon_value', null, 'noneof', 7);

	var arrSearchColumns = new Array();
	arrSearchColumns[0] = new nlobjSearchColumn('custrecordr7acladdon_fieldid', null, 'group');
	arrSearchColumns[1] = new nlobjSearchColumn('custrecordr7acladdon_fieldtype', null, 'max');

	//all FMR's ever tied to that license
	var arrSearchResults = nlapiSearchRecord('customrecordr7acladdoncomponents', null, arrSearchFilters, arrSearchColumns);

	for (var i = 0; arrSearchResults != null && i < arrSearchResults.length; i++) {

		var searchResult = arrSearchResults[i];
		var fieldId = searchResult.getValue(arrSearchColumns[0]);
		var fieldType = searchResult.getValue(arrSearchColumns[1]);

		if (fieldType != 'select') {
			var value = howToDisableField(fieldType);

			recLicense.setFieldValue(fieldId, value);
		}
	}

	return recLicense;
}

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

function howToDisableField(fieldType){

	var result = '';

	switch (fieldType) {
		case 'checkbox':
			result = 'F'
			break;
		case 'date':
			result = nlapiDateToString(new Date());
			break;
		case 'integer':
			result = '';
			break;
		case 'select':
			result = '';
			break;
		case 'text':
			result = '';
			break;
		case 'multiselect':
			result = '';
			break;
		default:
			result = '';
	}

	return result;
}

function grabAllProductTypes(byRecordId){

	var arrProductTypes = new Array();

	var arrSearchFilters = new Array();
	arrSearchFilters[arrSearchFilters.length] = new nlobjSearchFilter('isinactive', null, 'is', 'F');

	var arrSearchColumns = new Array();
	arrSearchColumns[0] = new nlobjSearchColumn('custrecordr7acrrecordid');
	arrSearchColumns[1] = new nlobjSearchColumn('custrecordr7acrexpirationfieldid');
	arrSearchColumns[2] = new nlobjSearchColumn('custrecordr7acrlicensefieldid');
	arrSearchColumns[3] = new nlobjSearchColumn('custrecordr7acrsalesrepfieldid');
	arrSearchColumns[4] = new nlobjSearchColumn('custrecordr7acrsalesorderfieldid');
	arrSearchColumns[5] = new nlobjSearchColumn('custrecordr7acritemoptionfieldid');
	arrSearchColumns[6] = new nlobjSearchColumn('custrecordr7acritemoptionfieldname');
	arrSearchColumns[7] = new nlobjSearchColumn('custrecordr7acrcustomerfieldid');
	arrSearchColumns[8] = new nlobjSearchColumn('custrecordr7acrcontactfieldid');
	arrSearchColumns[9] = new nlobjSearchColumn('custrecordr7acractivationid');
	arrSearchColumns[10] = new nlobjSearchColumn('custrecordr7acrtemplatefieldid');
	arrSearchColumns[11] = new nlobjSearchColumn('custrecordr7acrexpirationcomponentid');
	arrSearchColumns[12] = new nlobjSearchColumn('custrecordr7acrfieldidstoempty');
	arrSearchColumns[13] = new nlobjSearchColumn('custrecordr7acrserialnumberid'); //Product Serial Number
	arrSearchColumns[14] = new nlobjSearchColumn('custrecordr7acrresetrecid');
	arrSearchColumns[15] = new nlobjSearchColumn('custrecordr7acrresetlicenseid');
	arrSearchColumns[16] = new nlobjSearchColumn('custrecordr7acrresetactivation');
	arrSearchColumns[17] = new nlobjSearchColumn('custrecordr7acrresetcomments');
	arrSearchColumns[18] = new nlobjSearchColumn('custrecordr7acritemfamily_fieldid');
	// License Monitoring and IPR
	arrSearchColumns[19] = new nlobjSearchColumn('custrecordr7acrlicmarketingtemplaterecid');
	arrSearchColumns[20] = new nlobjSearchColumn('custrecordr7acrproductaccesscodeid');
	arrSearchColumns[21] = new nlobjSearchColumn('custrecordr7acriprreturnpath');
	// Display name
	arrSearchColumns[22] = new nlobjSearchColumn('name');
	arrSearchColumns[23] = new nlobjSearchColumn('custrecordr7acriprscriptid');
	arrSearchColumns[24] = new nlobjSearchColumn('custrecordr7acrdeployid');
	arrSearchColumns[25] = new nlobjSearchColumn('custrecordr7acrlicenseserialnumber'); //License Serial Number
	arrSearchColumns[26] = new nlobjSearchColumn('custrecordr7acrexpirationdateindaysid'); //Expiration in Days
	arrSearchColumns[27] = new nlobjSearchColumn('custrecordr7acrmarklictemplaterecid'); //Marketing License Template Record Id
	//feature management stuff
	arrSearchColumns[28] = new nlobjSearchColumn('custrecordr7acrfeaturemngcreatedfieldid');
	arrSearchColumns[29] = new nlobjSearchColumn('custrecordr7acrfeaturemngreclinkfieldid');
	arrSearchColumns[30] = new nlobjSearchColumn('custrecordr7acrpackagelicensefieldid'); //package ID field
	var arrSearchResults = nlapiSearchRecord('customrecordr7acrproducttype', null, arrSearchFilters, arrSearchColumns);

	for (var i = 0; arrSearchResults != null && i < arrSearchResults.length; i++) {

		var prodFields = new Object();

		var searchResult = arrSearchResults[i];
		var prodTypeId = searchResult.getId();
		var recordId = searchResult.getValue(arrSearchColumns[0]);
		prodFields['productid'] = prodTypeId;
		prodFields['recordid'] = recordId;
		prodFields['expiration'] = searchResult.getValue(arrSearchColumns[1]);
		prodFields['licenseid'] = searchResult.getValue(arrSearchColumns[2]);
		prodFields['salesrep'] = searchResult.getValue(arrSearchColumns[3]);
		prodFields['salesorder'] = searchResult.getValue(arrSearchColumns[4]);
		prodFields['optionid'] = searchResult.getValue(arrSearchColumns[5]);
		prodFields['optionname'] = searchResult.getValue(arrSearchColumns[6]);
		prodFields['customer'] = searchResult.getValue(arrSearchColumns[7]);
		prodFields['contact'] = searchResult.getValue(arrSearchColumns[8]);
		prodFields['activationid'] = searchResult.getValue(arrSearchColumns[9]);
		prodFields['templateid'] = searchResult.getValue(arrSearchColumns[10]);
		prodFields['componentid'] = searchResult.getValue(arrSearchColumns[11]);
		prodFields['emptyfields'] = searchResult.getValue(arrSearchColumns[12]);
		prodFields['serialid'] = searchResult.getValue(arrSearchColumns[13]);
		prodFields['resetrecid'] = searchResult.getValue(arrSearchColumns[14]);
		prodFields['resetlicenseid'] = searchResult.getValue(arrSearchColumns[15]);
		prodFields['resetactivation'] = searchResult.getValue(arrSearchColumns[16]);
		prodFields['resetcomments'] = searchResult.getValue(arrSearchColumns[17]);
		prodFields['itemfamily'] = searchResult.getValue(arrSearchColumns[18]);
		prodFields['marktemprecid'] = searchResult.getValue(arrSearchColumns[19]);
		prodFields['axscoderecid'] = searchResult.getValue(arrSearchColumns[20]);
		prodFields['returnpath'] = searchResult.getValue(arrSearchColumns[21]);
		prodFields['name'] = searchResult.getValue(arrSearchColumns[22]);
		prodFields['iprscriptid'] = searchResult.getValue(arrSearchColumns[23]);
		prodFields['iprdeployid'] = searchResult.getValue(arrSearchColumns[24]);
		prodFields['licserialid'] = searchResult.getValue(arrSearchColumns[25]);
		prodFields['expindaysid'] = searchResult.getValue(arrSearchColumns[26]);
		prodFields['marklictemprecid'] = searchResult.getValue(arrSearchColumns[27]);
		prodFields['fmrcreatedid'] = searchResult.getValue(arrSearchColumns[28]);
		prodFields['fmrreclinkid'] = searchResult.getValue(arrSearchColumns[29]);
		prodFields['packagelicid'] = searchResult.getValue(arrSearchColumns[30]);

		if (byRecordId) {
			arrProductTypes[recordId] = prodFields;
		}
		else {
			arrProductTypes[prodTypeId] = prodFields;
		}
	}
	return arrProductTypes;
}

function findLicenseIdByPK(recordType, activationKey){

	if (recordType != null && recordType != '') {

		var activationKeyField = arrProductTypes[recordType]['activationid'];

		var arrSearchFilters = new Array();
		arrSearchFilters[arrSearchFilters.length] = new nlobjSearchFilter(activationKeyField, null, 'is', activationKey);

		var arrSearchColumns = new Array();
		arrSearchColumns[0] = new nlobjSearchColumn('internalid');

		var arrSearchResults = nlapiSearchRecord(recordType, null, arrSearchFilters, arrSearchColumns);

		if (arrSearchResults != null && arrSearchResults.length >= 1) {
			var licenseId = arrSearchResults[0].getValue(arrSearchColumns[0]);

			return licenseId;
		}

	}
	return null;
}
