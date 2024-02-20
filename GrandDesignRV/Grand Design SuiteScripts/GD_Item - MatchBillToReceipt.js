/**
 * Set the Match Bill to Receipt field to true on these items.
 * 
 * Version    Date            Author           Remarks
 * 1.00       22 Apr 2013     rbritsch
 *
 */

/**
 * @param {String} recType Record type internal id
 * @param {Number} recId Record internal id
 * @returns {Void}
 */
function ItemSetMatchBillMassUpdate(recType, recId) 
{
	var part = nlapiLoadRecord(recType, recId);
	part.setFieldValue('matchbilltoreceipt', 'T');
	
	nlapiSubmitRecord(part, false, true);
}