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
 * @param {String} type Operation types: create, edit, view, copy, print, email
 * @param {nlobjForm} form Current form
 * @param {nlobjRequest} request Request object
 * @returns {Void}
 */
function userEventBeforeLoad(type, form, request){
	var currentContext = nlapiGetContext();
	if ((type == 'create' || type == 'edit' || type == 'copy') && currentContext.getExecutionContext() == 'userinterface'){
		var recordTypeId = nlapiGetFieldValue('custrecordr7restletlookuplistrecordid');
		if (recordTypeId == null){recordTypeId = ''};
		if (recordTypeId.toUpperCase() != 'Language'.toUpperCase()){
			var fieldName = nlapiGetField('custrecordr7restletlookupname');
			fieldName.setDisplayType('disabled');
			var fieldValueId = nlapiGetField('custrecordr7restletlookupvalueid');
			fieldValueId.setDisplayType('disabled');
			var field = form.addField('custpage_r7lookuplist', 'select', 'List/Record Type Item', nlapiGetFieldValue('custrecordr7restletlookuplistrecordid'));
			form.insertField(field, 'custrecordr7restletlookupcode');
		}else{
			var fieldName = nlapiGetField('custrecordr7restletlookupname');
			fieldName.setDisplayType('normal');
			var fieldValueId = nlapiGetField('custrecordr7restletlookupvalueid');
			fieldValueId.setDisplayType('normal');			
			var field = form.addField('custpage_r7lookuplist', 'select', 'List/Record Type Item');
			field.setDisplayType('disabled');
			form.insertField(field, 'custrecordr7restletlookupcode');
		}
	}
}

/**
 * The recordType (internal id) corresponds to the "Applied To" record in your script deployment. 
 * @appliedtorecord recordType
 * 
 * @param {String} type Operation types: create, edit, delete, xedit
 *                      approve, reject, cancel (SO, ER, Time Bill, PO & RMA only)
 *                      pack, ship (IF)
 *                      markcomplete (Call, Task)
 *                      reassign (Case)
 *                      editforecast (Opp, Estimate)
 * @returns {Void}
 */
function userEventBeforeSubmit(type){
    if (type == 'edit' || type == 'create' || type == 'copy') {
    	var code = nlapiGetFieldValue('custrecordr7restletlookupcode');
    	nlapiSetFieldValue('custrecordr7restletlookupcode', code.toUpperCase());
    } 	
}
