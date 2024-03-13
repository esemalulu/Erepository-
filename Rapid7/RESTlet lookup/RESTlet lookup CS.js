/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       04 Jan 2017     Owner
 *
 */

/**
 * The recordType (internal id) corresponds to the "Applied To" record in your script deployment. 
 * @appliedtorecord recordType
 *   
 * @returns {Boolean} True to continue save, false to abort save
 */
function clientSaveRecord(){
	if (isDuplicate('custrecordr7restletlookupcode')){
		alert("Record with the same code exists");
  		return false;
	}
    return true;
}

/**
 * The recordType (internal id) corresponds to the "Applied To" record in your script deployment. 
 * @appliedtorecord recordType
 * 
 * @param {String} type Sublist internal id
 * @param {String} name Field internal id
 * @param {Number} linenum Optional line item number, starts from 1
 * @returns {Void}
 */
function clientFieldChanged(type, name, linenum){
	if (name == 'custrecordr7restletlookuplistrecordid') {
		nlapiLogExecution('DEBUG','field', 'custrecordr7restletlookuplistrecordid');
		var recordTypeId = nlapiGetFieldValue('custrecordr7restletlookuplistrecordid');
		if (recordTypeId == null){recordTypeId = ''};
		if (recordTypeId.toUpperCase() == 'Language'.toUpperCase()){
			var fieldListRecordTypeItem = nlapiGetField('custpage_r7lookuplist');
			fieldListRecordTypeItem.setDisplayType('disabled');
			var fieldName = nlapiGetField('custrecordr7restletlookupname');
			fieldName.setDisplayType('normal');
			var fieldValueId = nlapiGetField('custrecordr7restletlookupvalueid');
			fieldValueId.setDisplayType('normal');				
			return;
		}else{
			var fieldListRecordTypeItem = nlapiGetField('custpage_r7lookuplist');
			fieldListRecordTypeItem.setDisplayType('normal');
			var fieldName = nlapiGetField('custrecordr7restletlookupname');
			fieldName.setDisplayType('disabled');
			var fieldValueId = nlapiGetField('custrecordr7restletlookupvalueid');
			fieldValueId.setDisplayType('disabled');				
		}
		try {
	        var internalId = new nlobjSearchColumn('internalId');
	        var name = new nlobjSearchColumn('name');
	        var columns = [internalId, name];
	        var arrResults = nlapiSearchRecord(nlapiGetFieldValue('custrecordr7restletlookuplistrecordid'), null, null, columns);
	        if (arrResults != null && arrResults.length > 0) {
	        	nlapiLogExecution('DEBUG','RESULTS', 'arrResults.length ' + arrResults.length);
	        	for(var i = 0; i<arrResults.length;i++){
		        	var searchresult = arrResults[i];
		        	nlapiInsertSelectOption("custpage_r7lookuplist", searchresult.getValue(internalId), searchresult.getValue(name));
		        }
	        }
	    }
	    catch (err) {
	    	nlapiLogExecution('ERROR','ERROR', JSON.stringify(err));
	    	alert("Record type does not exist");
	    }		
	}
	if (name == 'custpage_r7lookuplist'){
		nlapiSetFieldValue('custrecordr7restletlookupvalueid', nlapiGetFieldValue('custpage_r7lookuplist'));
		nlapiSetFieldValue('custrecordr7restletlookupname', nlapiGetFieldText('custpage_r7lookuplist'));
		nlapiSetFieldValue('name', nlapiGetFieldText('custpage_r7lookuplist'));
	}
}

function isDuplicate(field){
	var result = false;
    try {
        var arrFilters = [];
        arrFilters[0] = new nlobjSearchFilter(field, null, 'is', nlapiGetFieldValue(field));
        var arrResults = nlapiSearchRecord('customrecordr7restletlookup', null, arrFilters);
        if (arrResults != null && arrResults.length > 0) {
        	result = true;
        }
    }
    catch (err) {
    	nlapiLogExecution('ERROR','Error in searching duplicate', err);
    }
	return result;
}