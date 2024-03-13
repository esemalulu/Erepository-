/*
 * @author efagone
 * 
 * @tsantos 4/3/2017 added default end date for InsightVM LFM to be year 2090
 */

function beforeLoad(type, form){
	
	var userId = nlapiGetUser();
	
	if (type == 'edit' && userId == 55011){
		var fldACLCreated = nlapiGetField('custrecordr7licfmaclcreated');
		fldACLCreated.setDisplayType('normal');
	}
}

function beforeSubmit(type){

	if (type != 'delete') {
		var emsg = '';
		try {
			this.arrProductTypes = grabAllProductTypes(true);
			if (type == 'xedit') {
				this.oldRecord = nlapiGetOldRecord();
				this.updatedFields = nlapiGetNewRecord().getAllFields();
			}
			
			var recordTypeId = getNewFieldValue('custrecordr7licfmrecordtypeid');
			var productKey = getNewFieldValue('custrecordr7licfmproductkey');
			var licenseId = getNewFieldValue('custrecordr7licfmlicense');
			var featureId = getNewFieldValue('custrecordr7licfmfeature');
			var fieldId = getNewFieldValue('custrecordr7licfmfeildid');
			emsg += '\nnlapiGetRecordId(): ' + nlapiGetRecordId();
			emsg += '\nlicenseId: ' + licenseId;
			emsg += '\nfeatureId: ' + featureId;
			emsg += '\nrecordTypeId: ' + recordTypeId;
			
			if (featureId != null && featureId != '' && (recordTypeId == null || recordTypeId == '' || recordTypeId.length <= 3)) {
				var recFeature = nlapiLoadRecord('customrecordr7acladdoncomponents', featureId);
				recordTypeId = recFeature.getFieldText('custrecordr7aclrecord_internalid');
				fieldId = recFeature.getFieldValue('custrecordr7acladdon_fieldid');
				
				nlapiSetFieldValue('custrecordr7licfmrecordtypeid', recordTypeId);
				nlapiSetFieldValue('custrecordr7licfmfeildid', fieldId);
			}
			
			if (licenseId == null || licenseId == '' || nlapiGetContext().getExecutionContext() == 'userinterface') {
				licenseId = findLicenseId(productKey, recordTypeId);
				nlapiSetFieldValue('custrecordr7licfmlicense', licenseId);
			}

			if (licenseId != '' && licenseId != null) {
				nlapiSetFieldValue(arrProductTypes[recordTypeId]['fmrreclinkid'], licenseId);
			}
			
			if (nlapiStringToDate(getNewFieldValue('custrecordr7licfmstartdate')) > nlapiStringToDate(getNewFieldValue('custrecordr7licfmenddate'))) {
				nlapiSetFieldValue('custrecordr7licfmenddate', getNewFieldValue('custrecordr7licfmstartdate'));
			}
			
			if (nlapiGetFieldValue('custrecordr7licfmfeaturefieldtype') == 'date') {
				nlapiSetFieldValue('custrecordr7licfmvalue', getNewFieldValue('custrecordr7licfmenddate'));
			}
			
			/*
			 * @tsantos 4/4/2017 : Modified to automatically set the LFM End Date for InsightVM licenses ('custrecordr7nxlicenseinsightvm') to year 2199
			 */	
			if (['custrecordr7mslicense_perpetuallicense', 'custrecordr7nxlicense_isperpetual', 'custrecordr7asplicenseperpetuallicense', 'custrecordr7nxlicenseinsightvm'].indexOf(fieldId) != -1) {
				if (getNewFieldValue('custrecordr7licfmstatus') == 7 || getNewFieldValue('custrecordr7licfmstatus') == 9) {
					nlapiSetFieldValue('custrecordr7licfmenddate', '1/1/1980');
				}
				else {
					nlapiSetFieldValue('custrecordr7licfmenddate', '12/31/2090');
				}
			}
	
			
		} 
		catch (e) {
			var adminUser =  nlapiLoadConfiguration('companypreferences').getFieldValue('custscriptr7_system_info_email_sender');
			nlapiSendEmail(adminUser, adminUser, 'Error LFM beforeSubmit', 'Error: ' + e + '\n\nDetails: ' + emsg);
		}
	}
}

function afterSubmit(type){
	var context = nlapiGetContext();
	var userId = nlapiGetUser();
	
	
	//nlapiLogExecution('DEBUG', 'context.getExecutionContext()', context.getExecutionContext());
	if (type != 'delete') {
	
		var record = nlapiLoadRecord(nlapiGetRecordType(), nlapiGetRecordId());
		
		var isDupe = findDupeFMR(record);
		
		if (isDupe) {
			nlapiLogExecution('AUDIT', 'found dupe', isDupe);
			nlapiDeleteRecord('customrecordr7licensefeaturemanagement', record.getId());
		}
		else {
		
			if (type == 'create' && context.getExecutionContext() == 'scheduled') {
			
				var fieldType = record.getFieldValue('custrecordr7licfmfeaturefieldtype');
				
				if (fieldType == 'date') {
					trueUpEndDates(record);
				}
			}
			
			if ((type == 'create' || type == 'edit') && context.getExecutionContext() == 'userinterface') {
			
				var fmrStatus = record.getFieldValue('custrecordr7licfmstatus');
				
				if (fmrStatus == 2) { //in queue
					nlapiScheduleScript(462, 3);
				}
			}
		}
	}
	
}

function trueUpEndDates(record){

	var recordId = record.getId();
	var fieldType = record.getFieldValue('custrecordr7licfmfeaturefieldtype');
	var salesOrderId = record.getFieldValue('custrecordr7licfmsalesorder');
	var endDate = record.getFieldValue('custrecordr7licfmenddate');
	var productKey = record.getFieldValue('custrecordr7licfmproductkey');
	
	if (fieldType == 'date' &&
	salesOrderId != null && salesOrderId != '' &&
	productKey != null && productKey != '' &&
	endDate != null && endDate != '') {
		
		var dtEndDate = nlapiStringToDate(endDate);
		
		var arrSearchFilters = new Array();
		var nxlLicId = record.getFieldValue('custrecordr7licfmnexposelicense');
		if(nxlLicId) {
			//do not auto-extend adjustment LFMs for NX renewals
			getNexposeSearchFilters(arrSearchFilters, nxlLicId, recordId, productKey, salesOrderId, dtEndDate);
		} else {
			getStandardSearchFilters(arrSearchFilters, recordId, productKey, salesOrderId, dtEndDate);
		}
		
		var arrSearchResults = nlapiSearchRecord('customrecordr7licensefeaturemanagement', null, arrSearchFilters);
		
		for (var i = 0; arrSearchResults != null && i < arrSearchResults.length; i++) {
		
			var searchResult = arrSearchResults[i];
			
			nlapiSubmitField('customrecordr7licensefeaturemanagement', searchResult.getId(), 'custrecordr7licfmenddate', endDate);
		}
	}
}

function getStandardSearchFilters(arrSearchFilters, recordId, productKey, salesOrderId, dtEndDate) {
	arrSearchFilters[0] = new nlobjSearchFilter('internalid', null, 'noneof', recordId);
	arrSearchFilters[1] = new nlobjSearchFilter('custrecordr7licfmproductkey', null, 'is', productKey);
	arrSearchFilters[2] = new nlobjSearchFilter('custrecordr7licfmaclcreated', null, 'is', 'T');
	arrSearchFilters[2].setLeftParens(2);
	arrSearchFilters[3] = new nlobjSearchFilter('custrecordr7licfmsalesorder', null, 'is', salesOrderId);
	arrSearchFilters[3].setRightParens(1);
	arrSearchFilters[3].setOr(true);
	arrSearchFilters[4] = new nlobjSearchFilter('custrecordr7licfeature_adjustment', null, 'is', 'T');
	arrSearchFilters[4].setRightParens(1);
	arrSearchFilters[5] = new nlobjSearchFilter('custrecordr7licfmenddate', null, 'before', dtEndDate);
	arrSearchFilters[6] = new nlobjSearchFilter('custrecordr7licfmfeaturefieldtype', null, 'isnot', 'date');
	arrSearchFilters[7] = new nlobjSearchFilter('custrecordr7licfmstatus', null, 'noneof', new Array(7, 8, 9));
}

function getNexposeSearchFilters(arrSearchFilters, nxlLicId, recordId, productKey, salesOrderId, dtEndDate) {
	arrSearchFilters[0] = new nlobjSearchFilter('internalid', null, 'noneof', recordId);
	arrSearchFilters[1] = new nlobjSearchFilter('custrecordr7licfmproductkey', null, 'is', productKey);
	arrSearchFilters[2] = new nlobjSearchFilter('custrecordr7licfmaclcreated', null, 'is', 'T');
	arrSearchFilters[3] = new nlobjSearchFilter('custrecordr7licfmsalesorder', null, 'is', salesOrderId);
	arrSearchFilters[4] = new nlobjSearchFilter('custrecordr7licfeature_adjustment', null, 'isnot', 'T');
	arrSearchFilters[5] = new nlobjSearchFilter('custrecordr7licfmenddate', null, 'before', dtEndDate);
	arrSearchFilters[6] = new nlobjSearchFilter('custrecordr7licfmfeaturefieldtype', null, 'isnot', 'date');
	arrSearchFilters[7] = new nlobjSearchFilter('custrecordr7licfmstatus', null, 'noneof', new Array(7, 8, 9));
}

function findDupeFMR(record){
	
	nlapiLogExecution('DEBUG', 'finding dupe', 'id: ' + record.getId());
	var recordId = record.getId();
	var featureId = record.getFieldValue('custrecordr7licfmfeature');
	var productKey = record.getFieldValue('custrecordr7licfmproductkey');
	var fieldId = record.getFieldValue('custrecordr7licfmfeildid');
	var value = record.getFieldValue('custrecordr7licfmvalue');
	var salesOrderId = record.getFieldValue('custrecordr7licfmsalesorder');
	var startDate = record.getFieldValue('custrecordr7licfmstartdate');
	var endDate = record.getFieldValue('custrecordr7licfmenddate');
	var status = record.getFieldValue('custrecordr7licfmstatus');
	var itemLineId = record.getFieldValue('custrecordr7licfmitemlineid');
	
	if (featureId != null && featureId != '' && productKey != null && productKey != '' && value != null && value != '' && startDate != null && startDate != '' && endDate != null && endDate != '' && salesOrderId != null && salesOrderId != '') {
		//checking for duplicate non-integer addons (integers get added so duplicates CAN be okay)
		var arrSearchFilters = new Array();
		arrSearchFilters[0] = new nlobjSearchFilter('internalid', null, 'noneof', recordId);
		arrSearchFilters[1] = new nlobjSearchFilter('custrecordr7licfmproductkey', null, 'is', productKey);
		arrSearchFilters[2] = new nlobjSearchFilter('custrecordr7licfmfeature', null, 'is', featureId);
		arrSearchFilters[3] = new nlobjSearchFilter('custrecordr7licfmfeildid', null, 'is', fieldId);
		arrSearchFilters[4] = new nlobjSearchFilter('custrecordr7licfmvalue', null, 'is', value);
		arrSearchFilters[5] = new nlobjSearchFilter('custrecordr7licfmstartdate', null, 'onorbefore', 'today');
		arrSearchFilters[6] = new nlobjSearchFilter('custrecordr7licfmenddate', null, 'onorafter', endDate);
		arrSearchFilters[7] = new nlobjSearchFilter('custrecordr7licfmfeaturefieldtype', null, 'isnot', 'integer');
		arrSearchFilters[8] = new nlobjSearchFilter('custrecordr7licfmstatus', null, 'noneof', new Array(4, 7, 8, 9));
		
		var arrSearchResults = nlapiSearchRecord('customrecordr7licensefeaturemanagement', null, arrSearchFilters);
		
		if (arrSearchResults != null) {
		
			var searchResult = arrSearchResults[0];
			nlapiSubmitField('customrecordr7licensefeaturemanagement', searchResult.getId(), 'custrecordr7licfmstatus', status);
			
			nlapiLogExecution('DEBUG', 'found dupe', 'id: ' + record.getId());
			return true;
		}
		else 
			if (itemLineId != '' && itemLineId != null) { // look for duplicate integer type fields that also share same itemLineId
				var arrSearchFilters = new Array();
				arrSearchFilters[0] = new nlobjSearchFilter('internalid', null, 'noneof', recordId);
				arrSearchFilters[1] = new nlobjSearchFilter('custrecordr7licfmproductkey', null, 'is', productKey);
				arrSearchFilters[2] = new nlobjSearchFilter('custrecordr7licfmfeature', null, 'is', featureId);
				arrSearchFilters[3] = new nlobjSearchFilter('custrecordr7licfmfeildid', null, 'is', fieldId);
				arrSearchFilters[4] = new nlobjSearchFilter('custrecordr7licfmvalue', null, 'is', value);
				arrSearchFilters[5] = new nlobjSearchFilter('custrecordr7licfmstartdate', null, 'on', startDate);
				arrSearchFilters[6] = new nlobjSearchFilter('custrecordr7licfmenddate', null, 'on', endDate);
				arrSearchFilters[7] = new nlobjSearchFilter('custrecordr7licfmfeaturefieldtype', null, 'is', 'integer');
				arrSearchFilters[8] = new nlobjSearchFilter('custrecordr7licfmsalesorder', null, 'is', salesOrderId);
				arrSearchFilters[9] = new nlobjSearchFilter('custrecordr7licfmitemlineid', null, 'is', itemLineId);
				arrSearchFilters[10] = new nlobjSearchFilter('custrecordr7licfmstatus', null, 'noneof', new Array(4, 7, 8, 9));
				
				var arrSearchResults = nlapiSearchRecord('customrecordr7licensefeaturemanagement', null, arrSearchFilters);
				
				if (arrSearchResults != null) {
				
					var searchResult = arrSearchResults[0];
					nlapiSubmitField('customrecordr7licensefeaturemanagement', searchResult.getId(), 'custrecordr7licfmstatus', status);
					
					nlapiLogExecution('DEBUG', 'found dupe', 'id: ' + record.getId());
					return true;
				}
			}
	}

	return false;
}

function findLicenseId(productKey, licRecord){

	var productKeyField = arrProductTypes[licRecord]['activationid'];
	
	var searchFilters = new Array(new nlobjSearchFilter(productKeyField, null, 'is', productKey));
	var searchColumns = new Array(new nlobjSearchColumn('internalid'));
	
	if (licRecord != null && licRecord != '' && productKeyField != '' && productKey != null && productKey != '') {
		var searchResults = nlapiSearchRecord(licRecord, null, searchFilters, searchColumns);
		
		if (searchResults != null && searchResults.length >= 1) {
		
			var licenseId = searchResults[0].getValue(searchColumns[0]);
			
			return licenseId;
		}
		
	}
	return null;
}

function getNewFieldValue(fieldId){
	// if the record is direct list edited or mass updated, run the script
	if (type == 'xedit') {
		// loop through the returned fields
		for (var i = 0; i < updatedFields.length; i++) {
			//nlapiLogExecution('DEBUG', 'field', updatedFields[i]);
			if (updatedFields[i] == fieldId) {
				return nlapiGetFieldValue(fieldId);
			}
		}
		return oldRecord.getFieldValue(fieldId);
	}
	else {
		return nlapiGetFieldValue(fieldId);
	}
}
