/**
 * Sets the Stock Units Conversion Factor on Inventory Items
 * 
 * Version    Date            Author           Remarks
 * 1.00       09 Oct 2017     Jacob Shetler
 *
 */

/**
 * Sets the Stock Units Conversion Factor on Inventory Items
 * 
 * @param {String} recType Record type internal id
 * @param {Number} recId Record internal id
 * @returns {Void}
 */
function GD_UpdateItemStockConversions_MU(recType, recId)
{
	try{
		var itemFlds = nlapiLookupField(recType, recId, ['stockunit', 'unitstype']);
		if(itemFlds.stockunit != null && itemFlds.stockunit != '' && itemFlds.unitstype != null && itemFlds.unitstype != '')
		{
			var unitsTypeRec = nlapiLoadRecord('unitstype', itemFlds.unitstype);
			for (var i = 1; i <= unitsTypeRec.getLineItemCount('uom'); i++)
			{
				if (unitsTypeRec.getLineItemValue('uom', 'internalid', i) == itemFlds.stockunit)
				{
					nlapiSubmitField(recType, recId, 'custitemgd_stockunitconv', unitsTypeRec.getLineItemValue('uom', 'conversionrate', i));
					return;
				}
			}
		}
	}
	catch(err) {}
}
