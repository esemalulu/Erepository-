/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       07 Apr 2017     vopavsky
 *
 */

/**
 * The recordType (internal id) corresponds to the "Applied To" record in your
 * script deployment.
 * 
 * @appliedtorecord salesorder
 * 
 * @param {String}
 *            type Operation types: create, edit, delete, xedit approve, reject,
 *            cancel (SO, ER, Time Bill, PO & RMA only) pack, ship (IF)
 *            markcomplete (Call, Task) reassign (Case) editforecast (Opp,
 *            Estimate)
 * @returns {Void}
 */
function userEventBeforeSubmit(type)
{

	if (nlapiGetContext().getExecutionContext() != "userinterface")
	{
		var itemIds = [];
		for (var i = 1; i <= nlapiGetLineItemCount("item"); i++)
		{
			itemIds.push(String(nlapiGetLineItemValue("item", "item", i)));
		}

		if (itemIds.length > 0)
		{
			var palletData = getPalletFields(itemIds);
			if (palletData)
			{
				for (var i = 1; i <= nlapiGetLineItemCount("item"); i++)
				{
                    // nlapiSelectLineItem("item", i);
					if (!nlapiGetLineItemValue("item", "custcol_ifd_pallet_key_type", i) || !nlapiGetLineItemValue("item", "custcol_ifd_pallet_type_code", i))
					{
						var intItemId = nlapiGetLineItemValue("item", "item", i);
						if(palletData.hasOwnProperty(intItemId)){
							nlapiSetLineItemValue("item", "custcol_ifd_pallet_key_type", i, palletData[intItemId][0]);
							nlapiSetLineItemValue("item", "custcol_ifd_pallet_type_code", i, palletData[intItemId][1]);
						}
					}
				}
			}
		}
	}
}
