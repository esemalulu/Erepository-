/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       12 Feb 2013     mburstein
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
function beforeSubmit(type){
	if (type == 'create') {
		var string = getRandomString(10);
		nlapiSetFieldValue('custrecordr7twiliosmsconversationcookie', string);
	}
}
