/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       27 Jul 2017     Jacob Shetler
 *
 */

/**
 * Sets the Next Count Date and the Count Interval on inventory items.
 * 
 * @param {String} recType Record type internal id
 * @param {Number} recId Record internal id
 * @returns {Void}
 */
function GD_SetRFSmart_LocationCols_MU(recType, recId)
{
	var itemRec = nlapiLoadRecord(recType, recId);
	for(var i = 1; i <= itemRec.getLineItemCount('locations'); i++)
	{
		if(itemRec.getLineItemValue('locations', 'location', i) == 17)
		{
			itemRec.setLineItemValue('locations', 'nextinvtcountdate', i, '1/31/2017');
			itemRec.setLineItemValue('locations', 'invtcountinterval', i, 60);
			try
			{
				nlapiSubmitRecord(itemRec, false, true);
			}
			catch(err)
			{
				nlapiLogExecution('debug', 'Item Record Error ' + recId, err);
			}
			
			return;
		}
	}
}
