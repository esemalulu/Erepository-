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
 * @param {String} type Operation types: create, edit, delete, xedit
 *                      approve, reject, cancel (SO, ER, Time Bill, PO & RMA only)
 *                      pack, ship (IF)
 *                      markcomplete (Call, Task)
 *                      reassign (Case)
 *                      editforecast (Opp, Estimate)
 * @returns {Void}
 */
function r7_beforeSubmit(type){

	try {
		if (type == 'create' || type == 'edit' || type == 'xedit') {
		
			var custESPProrateList = nlapiGetFieldValue('custitemr7customespproratedlist');
			
			if (custESPProrateList == 'T') {
				nlapiSetFieldValue('custitem_custom_esp', 'T');
			}
		}
	} 
	catch (e) {
		nlapiLogExecution('ERROR', 'r7_beforeSubmit', e);
	}
}
