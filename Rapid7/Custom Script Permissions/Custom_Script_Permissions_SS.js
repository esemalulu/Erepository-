/*
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       19 Mar 2015     efagone
 *
 */

function beforeLoad(type, form, request){

	if (type == 'edit' && nlapiGetContext().getExecutionContext() == 'userinterface') {
	
		try {
			if (!isBlank(nlapiGetFieldValue('custrecordr7cusspfeatureid'))) {
				form.getField('custrecordr7cusspfeatureid').setDisplayType('inline');
			}

		} 
		catch (e) {
			nlapiLogExecution('ERROR', 'Problem beforeLoad custom script permissions', e);
		}
	}

}

function beforeSubmit(type){
	
	if (type == 'delete') {
		throw nlapiCreateError('NOT_ALLOWED', 'Delete is not allowed. Please inactivate.', true);
	}
	
	if (type == 'create') {
	
		if (featureIdExists(nlapiGetFieldValue('custrecordr7cusspfeatureid'))) {
			throw nlapiCreateError('DUPLICATE_ENTRY', 'Feature ID already exists', true);
		}
	}
	
}

function featureIdExists(featureId){

	if (isBlank(featureId)) {
		return true;
	}
	
	var arrFilters = [];
	arrFilters.push(new nlobjSearchFilter('custrecordr7cusspfeatureid', null, 'is', featureId))
	
	var internalId = nlapiGetRecordId();
	if (!isBlank(internalId)) {
		arrFilters.push(new nlobjSearchFilter('internalid', null, 'noneof', internalId));
	}
	
	var arrResults = nlapiSearchRecord('customrecordr7cussp', null, arrFilters);
	
	if (arrResults != null && arrResults.length > 0) {
		return true;
	}
	
	return false;
}

function isBlank(val){
	return (val == null || val === '' || val === ' ') ? true : false;
}
