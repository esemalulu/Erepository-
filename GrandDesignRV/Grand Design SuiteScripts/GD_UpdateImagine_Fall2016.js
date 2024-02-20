/**
 * Changes all units and sales orders for Imagine to location Plant 6- Line 6
 * 
 * Version    Date            Author           Remarks
 * 1.00       21 Oct 2016     Jacob Shetler
 *
 */

/**
 * @param {String} recType Record type internal id
 * @param {Number} recId Record internal id
 * @returns {Void}
 */
function GD_SO_massUpdate(recType, recId) 
{
	nlapiSubmitField(recType, recId, 'location', 22);
}

/**
 * @param {String} recType Record type internal id
 * @param {Number} recId Record internal id
 * @returns {Void}
 */
function GD_Unit_massUpdate(recType, recId) 
{
	nlapiSubmitField(recType, recId, 'custrecordunit_location', 22);
}

/**
 * Updates Espresso decors to Mocha
 * 
 * @param {String} recType Record type internal id
 * @param {Number} recId Record internal id
 * @returns {Void}
 */
function GD_UpdateDecors_massUpdate(recType, recId)
{
	var soRec = nlapiLoadRecord(recType, recId);

	//Update body field
	soRec.setFieldValue('custbodyrvsdecor', 36172);
	soRec.setFieldValue('custbodyrvspreviousdecorid', '36172');
	
	//Update the line. Can't use findLineItemValue() in mass updates.
	var decIdx = -1;
	for (var i = 1; i <= soRec.getLineItemCount('item'); i++)
	{
		if(soRec.getLineItemValue('item', 'item', i) == '23813')
		{
			decIdx = i;
			break;
		}
	}
	if (decIdx > 0)
	{
		soRec.selectLineItem('item', decIdx);
		soRec.setCurrentLineItemValue('item', 'item', 36172);
		soRec.commitLineItem('item');
	}
	
	//submit the record
	nlapiSubmitRecord(soRec, false, true);
}
