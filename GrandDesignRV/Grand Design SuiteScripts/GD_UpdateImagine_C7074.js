/**
 * Changes all sales orders for Imagine to have the updated description for IMT100143
 * 
 * Version    Date            Author           Remarks
 * 1.00       13 Dec 2016     Jacob Shetler
 *
 */

/**
 * Updates Item to be the same
 * 
 * @param {String} recType Record type internal id
 * @param {Number} recId Record internal id
 * @returns {Void}
 */
function GD_UpdateOption_massUpdate(recType, recId)
{
	var soRec = nlapiLoadRecord(recType, recId, {recordmode: 'dynamic'});

	//Update the line. Can't use findLineItemValue() in mass updates.
	var decIdx = -1;
	for (var i = 1; i <= soRec.getLineItemCount('item'); i++)
	{
		if(soRec.getLineItemValue('item', 'item', i) == '34099')
		{
			decIdx = i;
			break;
		}
	}
	if (decIdx > 0)
	{
		soRec.selectLineItem('item', decIdx);
		soRec.setCurrentLineItemValue('item', 'item', 34099);
		soRec.commitLineItem('item');
	}
	
	//submit the record
	nlapiSubmitRecord(soRec, false, true);
}
