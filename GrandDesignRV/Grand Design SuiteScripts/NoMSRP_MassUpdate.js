/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       12 May 2016     Jacob Shetler
 *
 */

/**
 * @param {String} recType Record type internal id
 * @param {Number} recId Record internal id
 * @returns {Void}
 */
function MSRP_massUpdate(recType, recId)
{
	var recs = nlapiSearchRecord('transaction', 'customsearchmsrpnoappear');
	for (var j = 0; j < recs.length; j++)
	{
		var rec = nlapiLoadRecord('salesorder', recs[j].getId());
		for (var i = 1; i <= rec.getLineItemCount('item'); i++)
		{
			if (rec.getLineItemValue('item', 'item', i) == 24909)
			{
				rec.setLineItemValue('item', 'custcolrvsmsrpamount', i, 10723);
			}		
		}
		nlapiSubmitRecord(rec, false, true);
	}
}
