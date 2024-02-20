/**
 * Sales Order Option mass update scripts
 * 
 * Version    Date            Author           Remarks
 * 1.00       06 Jan 2016     Jacob Shetler
 *
 */

/**
 * Removes MTF100095 Swivel Rocker Recliner - Garage from all orders.
 * 
 * @param {String} recType Record type internal id
 * @param {Number} recId Record internal id
 * @returns {Void}
 */
function GD_UpdateSwivel_massUpdate(recType, recId)
{
	var soRec = nlapiLoadRecord(recType, recId);

	//Update the line. Can't use findLineItemValue() in mass updates.
	for (var i = 1; i <= soRec.getLineItemCount('item'); i++)
	{
		if(soRec.getLineItemValue('item', 'item', i) == '24924')
		{
			//Remove the line, submit the record
			soRec.selectLineItem('item', i);
			soRec.removeLineItem('item', i);
			nlapiSubmitRecord(soRec, false, true);
			break;
		}
	}
}

/**
 * Sets the cost of Linen decor to 0.00.
 * 
 * @param {String} recType Record type internal id
 * @param {Number} recId Record internal id
 * @returns {Void}
 */
function GD_UpdateLinenCost_MU(recType, recId)
{
	var soRec = nlapiLoadRecord(recType, recId);

	//Update the line.
	for (var i = 1; i <= soRec.getLineItemCount('item'); i++)
	{
		if(soRec.getLineItemValue('item', 'item', i) == '36390')
		{
			//Remove the line, submit the record
			soRec.setLineItemValue('item', 'rate', i, 0);
			soRec.setLineItemValue('item', 'amount', i, 0);
			nlapiSubmitRecord(soRec, false, true);
			break;
		}
	}
}
