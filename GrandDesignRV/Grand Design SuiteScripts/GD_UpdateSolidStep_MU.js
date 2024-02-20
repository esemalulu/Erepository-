/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       05 Dec 2016     Jacob Shetler
 *
 */

/**
 * Updates Tork Step Quad Entry Steps decors to Solid Step Quad Entry Steps
 * 
 * @param {String} recType Record type internal id
 * @param {Number} recId Record internal id
 * @returns {Void}
 */
function GD_UpdateOption_massUpdate(recType, recId)
{
	var soRec = nlapiLoadRecord(recType, recId);

	//Update the line. Can't use findLineItemValue() in mass updates.
	var optIdx = -1;
	for (var i = 1; i <= soRec.getLineItemCount('item'); i++)
	{
		if(soRec.getLineItemValue('item', 'item', i) == '30518')
		{
			optIdx = i;
			break;
		}
	}
	if (optIdx > 0)
	{
		soRec.selectLineItem('item', optIdx);
		soRec.setCurrentLineItemValue('item', 'item', 36815);
		soRec.commitLineItem('item');
	}
	
	//submit the record
	nlapiSubmitRecord(soRec, false, true);
}
