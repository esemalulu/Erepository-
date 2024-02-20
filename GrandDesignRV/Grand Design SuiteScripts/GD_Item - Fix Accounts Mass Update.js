/**
 * Set the accounts on these items to be the correct one.
 * 
 * Version    Date            Author           Remarks
 * 1.00       04 Mar 2013     nathanah
 *
 */

/**
 * @param {String} recType Record type internal id
 * @param {Number} recId Record internal id
 * @returns {Void}
 */
function ItemFixAccountMassUpdate(recType, recId) 
{
	/** @record noninventoryitem */
	var item = nlapiLoadRecord(recType, recId, null);
	
	var expenseAccount = item.getFieldValue('expenseaccount');
	if (expenseAccount == '303')
	{
		item.setFieldValue('expenseaccount', 238);		
		nlapiSubmitRecord(item, true, false);
	}
}