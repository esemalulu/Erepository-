/*
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       09 Oct 2012     efagone
 *
 */

/*
 * The recordType (internal id) corresponds to the "Applied To" record in your script deployment. 
 * @appliedtorecord recordType 
 * 
 * @param {String} type Access mode: create, copy, edit
 * @returns {Void}
 */

function pageInit_mb(type){

	if (nlapiGetFieldValue('custrecordr7mblicensenonlicense') == 'T') {
		nlapiSetFieldMandatory('custrecordr7mblicensetemprecord', false);
		nlapiSetFieldMandatory('custrecordr7mblicensetempexpirationdays', false);
	}
	else {
		nlapiSetFieldMandatory('custrecordr7mblicensetemprecord', true);
		nlapiSetFieldMandatory('custrecordr7mblicensetempexpirationdays', true);
	}
}

function fieldChanged_mb(type, name, linenum){

	if (name == 'custrecordr7mblicensenonlicense') {
	
		if (nlapiGetFieldValue(name) == 'T') {
			nlapiSetFieldMandatory('custrecordr7mblicensetemprecord', false);
			nlapiSetFieldMandatory('custrecordr7mblicensetempexpirationdays', false);
		}
		else {
			nlapiSetFieldMandatory('custrecordr7mblicensetemprecord', true);
			nlapiSetFieldMandatory('custrecordr7mblicensetempexpirationdays', true);
		}
		
	}
		
}
