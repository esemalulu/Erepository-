/*
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       04 Sep 2012     efagone
 *
 */

/*
 * The recordType (internal id) corresponds to the "Applied To" record in your script deployment. 
 * @appliedtorecord recordType
 * 
 * @param {String} type Operation types: create, edit, delete, xedit,
 *                      approve, cancel, reject (SO, ER, Time Bill, PO & RMA only)
 *                      pack, ship (IF only)
 *                      dropship, specialorder, orderitems (PO only) 
 *                      paybills (vendor payments)
 * @returns {Void}
 */
function afterSubmit(type){

	if (type != 'delete'){

		associateTemplatesToEachOther();
		
	}

}

function associateTemplatesToEachOther(){

	var recId = nlapiGetRecordId();
	var arrConflictingTemplates = nlapiGetFieldValues('custrecordr7cartempconflicts');
	
	for (var i = 0; arrConflictingTemplates != null && i < arrConflictingTemplates.length; i++) {
	
		if (arrConflictingTemplates[i] != recId) {
			var strCurrentConflictingTemplates = nlapiLookupField('customrecordr7contractautomationtemplate', arrConflictingTemplates[i], 'custrecordr7cartempconflicts');
			
			var arrCurrentConflictingTemplates = new Array();
			if (strCurrentConflictingTemplates != null && strCurrentConflictingTemplates != '') {
				arrCurrentConflictingTemplates = strCurrentConflictingTemplates.split(",");
			}
			
			arrCurrentConflictingTemplates[arrCurrentConflictingTemplates.length] = recId;
			nlapiSubmitField('customrecordr7contractautomationtemplate', arrConflictingTemplates[i], 'custrecordr7cartempconflicts', arrCurrentConflictingTemplates);
		}
		
	}
	
	removeOldAssociations();
	
}

function removeOldAssociations(){
	
	var arrTemplatesToDisassociate = findOldAssociatedTemplates();
	
	for (var i = 0; arrTemplatesToDisassociate != null && i < arrTemplatesToDisassociate.length; i++) {
	
		var strCurrentTemplates = nlapiLookupField('customrecordr7contractautomationtemplate', arrTemplatesToDisassociate[i], 'custrecordr7cartempconflicts');
		
		var arrNewTemplates = new Array();
		if (strCurrentTemplates != null && strCurrentTemplates != '') {
			arrNewTemplates = strCurrentTemplates.split(",");
		}
		
		for (var j = 0; arrNewTemplates != null && j < arrNewTemplates.length; j++) {
		
			var currentTemp = arrNewTemplates[j];
			
			if (currentTemp == nlapiGetRecordId()) {
				nlapiLogExecution('DEBUG', 'Removing', currentTemp);
				arrNewTemplates.splice(j, 1);
			}
			
		}
		
		nlapiSubmitField('customrecordr7contractautomationtemplate', arrTemplatesToDisassociate[i], 'custrecordr7cartempconflicts', arrNewTemplates);
	}
	
}

function findOldAssociatedTemplates(){

	var arrTemplatesToDisassociate = new Array();
	
	var arrSearchFilters = new Array();
	if (nlapiGetFieldValues('custrecordr7cartempconflicts') != null && nlapiGetFieldValues('custrecordr7cartempconflicts') != '') {
		arrSearchFilters[arrSearchFilters.length] = new nlobjSearchFilter('internalid', null, 'noneof', nlapiGetFieldValues('custrecordr7cartempconflicts'));
	}
	arrSearchFilters[arrSearchFilters.length] = new nlobjSearchFilter('internalid', null, 'noneof', nlapiGetRecordId());
	arrSearchFilters[arrSearchFilters.length] = new nlobjSearchFilter('custrecordr7cartempconflicts', null, 'anyof', nlapiGetRecordId());
	
	var arrSearchResults = nlapiSearchRecord('customrecordr7contractautomationtemplate', null, arrSearchFilters);
	
	for (var i = 0; arrSearchResults != null && i < arrSearchResults.length; i++) {
	
		var searchResult = arrSearchResults[i];
		var resultId = searchResult.getId();
		
		arrTemplatesToDisassociate[arrTemplatesToDisassociate.length] = resultId;
	}
	
	return arrTemplatesToDisassociate;
	
}
