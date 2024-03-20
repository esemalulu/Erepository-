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
 * @appliedtorecord recordType
 * 
 * @param {String}
 *            type Sublist internal id
 * @returns {Boolean} True to save line item, false to abort save
 */
function clientValidateLine(type)
{
	debugger;
	if (!nlapiGetCurrentLineItemValue("item", "custcol_ifd_pallet_key_type") || !nlapiGetCurrentLineItemValue("item", "custcol_ifd_pallet_type_code"))
	{
		var intItemId = nlapiGetCurrentLineItemValue("item", "item");
		var palletData = getPalletFields([String(intItemId)]);
		if (palletData)
		{
			nlapiSetCurrentLineItemValue("item", "custcol_ifd_pallet_key_type", palletData[intItemId][0]);
			nlapiSetCurrentLineItemValue("item", "custcol_ifd_pallet_type_code", palletData[intItemId][1]);
		}
	}
	return true;
}
