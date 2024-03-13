/*
 * @author efagone
 */

function zc_beforeSubmit(type){

	if (type != 'delete') {
		//this should be outside the try/catch as it needs to throw an error.
		zc_cgsm.init(type);
		checkForConflictingDefaults();
	}

	try {
	
	} 
	catch (e) {
		nlapiLogExecution('ERROR', 'Problem zc_beforeSubmit', e);
	}
	
}

function checkForConflictingDefaults(){

	var arrConflicts = [];
	var errorMsg = null;
	try {
		var recId = nlapiGetRecordId();
		
		var arrJobTypeIds = zc_cgsm.getNewFieldValues('custrecordr7_srpsurveyconf_jobtype');
		var isDefault = zc_cgsm.getNewFieldValue('custrecordr7_srpsurveyconf_default');
		
		if (isDefault == 'T' && arrJobTypeIds) {
		
			var arrFilters = [];
			arrFilters.push(new nlobjSearchFilter('isinactive', null, 'is', 'F'));
			arrFilters.push(new nlobjSearchFilter('custrecordr7_srpsurveyconf_jobtype', null, 'anyof', arrJobTypeIds));
			arrFilters.push(new nlobjSearchFilter('custrecordr7_srpsurveyconf_default', null, 'is', 'T'));
			
			if (recId) {
				arrFilters.push(new nlobjSearchFilter('internalid', null, 'noneof', recId));
			}
			
			var arrColumns = [];
			arrColumns.push(new nlobjSearchColumn('internalid'));
			arrColumns.push(new nlobjSearchColumn('name').setSort());
			arrColumns.push(new nlobjSearchColumn('custrecordr7_srpsurveyconf_jobtype'));
			arrColumns.push(new nlobjSearchColumn('custrecordr7_srpsurveyconf_template'));
			arrColumns.push(new nlobjSearchColumn('custrecordr7_srpsurveyconf_default'));
			
			var savedsearch = nlapiCreateSearch('customrecord_r7_srp_survey_configuration', arrFilters, arrColumns);
			var resultSet = savedsearch.runSearch();
			
			
			var rowNum = 0;
			do {
				var resultSlice = resultSet.getResults(rowNum, rowNum + 1000);
				for (var i = 0; resultSlice && i < resultSlice.length; i++) {
					rowNum++;
					
					if (resultSlice[i].getValue('custrecordr7_srpsurveyconf_default') == 'T') {
						arrConflicts.push({
							internalid: resultSlice[i].getValue('internalid'),
							name: resultSlice[i].getValue('name')
						});
					}
				}
			}
			while (resultSlice.length >= 1000);
			
		}
		
		if (arrConflicts && arrConflicts.length > 0) {
			errorMsg = '';
			errorMsg += 'There is already another Survey configuration record marked as a Default for one or more of the Project Types specified. ';
			errorMsg += 'Please correct and try again. <br><br>';
			errorMsg += 'The conflicting configuration record(s) are below:<br>';
			errorMsg += arrConflicts.map(function(conflict){
				return '<a href="' + nlapiResolveURL('RECORD', 'customrecord_r7_srp_survey_configuration', conflict.internalid) + '" target="_blank">' + conflict.name + '</a>';
			}).join('<br>');
		}
	} 
	catch (e) {
		nlapiLogExecution('ERROR', 'Problem checkForMultipleDefaults', e);
	}
	
	if (errorMsg) {
		throw nlapiCreateError('MULTIPLE_DEFAULTS_CONFIGURED', errorMsg);
	}
	
}

var zc_cgsm = {
	type : null,
	updated_fields : [],
	newly_updated_fields : [],
	newRec : null,
	oldRec : null,
	init : function(type) {

		this.type = type;
		this.newRec = nlapiGetNewRecord();
		this.oldRec = nlapiGetOldRecord();
		this.updated_fields = this.newRec.getAllFields();
		this.newly_updated_fields = [];
		return;
	},
	fieldIsChanged : function(fieldId) {
		var newValue = this.getNewFieldValue(fieldId);
		var oldValue = this.getOldFieldValue(fieldId);
		
		if (newValue == null){
			newValue = '';
		}
		if (oldValue == null){
			oldValue = '';
		}
		return (fieldId && newValue != oldValue);
	},
	getNewFieldValue : function(fieldId) {

		// if the record is direct list edited or mass updated, run the script
		if (this.type == 'xedit') {

			if (this.updated_fields.indexOf(fieldId) != -1 || this.newly_updated_fields.indexOf(fieldId) != -1 || !this.oldRec) {
				return this.newRec.getFieldValue(fieldId);
			}

			return this.oldRec.getFieldValue(fieldId);
		}

		return this.newRec.getFieldValue(fieldId);
	},
	getOldFieldValue : function(fieldId) {

		return (this.oldRec) ? this.oldRec.getFieldValue(fieldId) : null;
	},
	getNewFieldValues : function(fieldId) {

		// if the record is direct list edited or mass updated, run the script
		if (this.type == 'xedit') {

			if (this.updated_fields.indexOf(fieldId) != -1 || this.newly_updated_fields.indexOf(fieldId) != -1 || !this.oldRec) {
				return this.newRec.getFieldValues(fieldId);
			}

			return this.oldRec.getFieldValues(fieldId);
		}

		return this.newRec.getFieldValues(fieldId);
	},
	getOldFieldValues : function(fieldId) {

		return (this.oldRec) ? this.oldRec.getFieldValues(fieldId) : null;
	},
	getNewFieldText : function(fieldId) {

		// if the record is direct list edited or mass updated, run the script
		if (this.type == 'xedit') {

			if (this.updated_fields.indexOf(fieldId) != -1 || this.newly_updated_fields.indexOf(fieldId) != -1 || !this.oldRec) {
				return this.newRec.getFieldText(fieldId);
			}

			return this.oldRec.getFieldText(fieldId);
		}

		return this.newRec.getFieldText(fieldId);
	},
	getOldFieldText : function(fieldId) {

		return (this.oldRec) ? this.oldRec.getFieldText(fieldId) : null;
	},
	setFieldValue_ifBlank : function(fieldId, newValue, options) {

		try {

			if (this.getNewFieldValue(fieldId) == null || this.getNewFieldValue(fieldId) === '') {
				this.newly_updated_fields.push(fieldId);
				switch (options) {
				case 'text':
					this.newRec.setFieldText(fieldId, newValue);
					break;
				case 'multi':
					this.newRec.setFieldValues(fieldId, newValue);
					break;
				default:
					this.newRec.setFieldValue(fieldId, newValue);
					break;
				}
			}
		}
		catch (err) {
			nlapiLogExecution('ERROR', 'Error updateField_ifBlank', 'fieldId: ' + fieldId + '\nnewValue: ' + newValue + '\noptions: ' + options + '\nError: ' + err);
		}
	},
	setFieldValue_always : function(fieldId, newValue, options) {

		try {

			this.newly_updated_fields.push(fieldId);

			switch (options) {
			case 'text':
				this.newRec.setFieldText(fieldId, newValue);
				break;
			case 'multi':
				this.newRec.setFieldValues(fieldId, newValue);
				break;
			default:
				this.newRec.setFieldValue(fieldId, newValue);
				break;
			}

		}
		catch (err) {
			nlapiLogExecution('ERROR', 'Error updateField_always', 'fieldId: ' + fieldId + '\nnewValue: ' + newValue + '\noptions: ' + options + '\nError: ' + err);
		}
	}
};