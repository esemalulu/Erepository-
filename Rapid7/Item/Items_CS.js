/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       12 Jun 2014     efagone
 *
 */

/**
 * The recordType (internal id) corresponds to the "Applied To" record in your script deployment. 
 * @appliedtorecord recordType
 * 
 * @param {String} type Sublist internal id
 * @param {String} name Field internal id
 * @param {Number} linenum Optional line item number, starts from 1
 * @returns {Void}
 */
function r7_clientFieldChanged(type, name, linenum){
	
	if (name == 'custitemr7customespproratedlist') {
		nlapiSetFieldValue('custitem_custom_esp', nlapiGetFieldValue('custitemr7customespproratedlist'));
	}
	if (name == 'custitemr7customespdefaultperc') {
		var value = nlapiGetFieldValue('custitemr7customespdefaultperc');
		if (value != null && value != '') {
			nlapiSetFieldValue('custitem_custom_esp', 'T');
		}
	}
}
