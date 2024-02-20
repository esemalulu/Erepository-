/**
 * Grand Design item user event logic.
 * 
 * Version    Date            Author           Remarks
 * 1.00       25 Mar 2016     ibrahim Abdalla
 *
 */

/**
 * When inventory item is saved, set preferred vendor body field based on the preferred vendor in vendors sublist.
 * The purpose of this field is to expose preferred vendor name in webstore.
 * The recordType (internal id) corresponds to the "Applied To" record in your script deployment. 
 * @appliedtorecord recordType
 * 
 * @param {String} type Operation types: create, edit, delete, xedit
 *                      approve, reject, cancel (SO, ER, Time Bill, PO & RMA only)
 *                      pack, ship (IF)
 *                      markcomplete (Call, Task)
 *                      reassign (Case)
 *                      editforecast (Opp, Estimate)
 * @returns {Void}
 */
function GD_Item_BeforeSubmit(type)
{
	if(nlapiGetRecordType() == 'inventoryitem')
	{
		//On Create, set the Reorder Point & Preferred Stock Level for the Parts & Service Location to 0, so it will show up on the NetSuite "Order Items" page
		if(type == 'create')
		{
			for(var i = 0; i < nlapiGetLineItemCount('locations'); i++)
			{
				if(nlapiGetLineItemValue('locations', 'location', i+1) == '41')
				{
					var prefStockLevel = nlapiGetLineItemValue('locations', 'preferredstocklevel', i+1);
					var reorderPoint = nlapiGetLineItemValue('locations', 'reorderpoint', i+1);
					//Only set stock level point to zero if there's no stock level set
					if (prefStockLevel == '' || prefStockLevel == null)
					{
						nlapiSetFieldValue('autopreferredstocklevel', 'F');
						nlapiSetLineItemValue('locations', 'preferredstocklevel', i+1, 0);
					}
					//Only set reorder point to zero if there's no reorder point set
					if (reorderPoint == '' || reorderPoint == null)
					{
						nlapiSetFieldValue('autoreorderpoint', 'F');
						nlapiSetLineItemValue('locations', 'reorderpoint', i+1, 0);
					}
				}
			}		
		}
		if(type == 'create' || type == 'edit')
		{
			var vendorCount = nlapiGetLineItemCount('itemvendor');
			
			for(var i = 1; i <= vendorCount; i++)
			{
				if(nlapiGetLineItemValue('itemvendor', 'preferredvendor', i) == 'T') //found preferred vendor, set our custom field so that we can access it via webstore.
				{
					nlapiSetFieldValue('custitemgd_preferredvendorname', nlapiGetLineItemValue('itemvendor', 'vendor_display', i));
					break;
				}
			}		
		}
		
		if(type != 'delete')
		{
			//Update the "Parts and Service Preferred Parts Bin" field to be the preferred bin for that location. If none for P&S, then clear the field.
			if(type != 'xedit')
			{
				var partsAndServiceLoc = GetPartsAndWarrantyLocationId();
				var preferredBin = '';
				for(var i = 1; i <= nlapiGetLineItemCount('binnumber'); i++)
				{
					if(nlapiGetLineItemValue('binnumber', 'preferredbin', i) == 'T' && nlapiGetLineItemValue('binnumber', 'location', i) == partsAndServiceLoc)
					{
						preferredBin = nlapiGetLineItemValue('binnumber', 'binnumber', i);
						break;
					}
				}
				nlapiSetFieldValue('custitemgd_pspreferredbin', preferredBin);
			}
			
			//Set the GD Stock UOM Conversion Factor on the item if it changes.
			var stockUOM = ConvertNSFieldToString(nlapiGetFieldValue('stockunit'));
			var oldStockUOM = (type != 'create' ? ConvertNSFieldToString(nlapiGetOldRecord().getFieldValue('stockunit')) : '');
			var unitsType = ConvertNSFieldToString(nlapiGetFieldValue('unitstype'));
			if(stockUOM.length > 0 && unitsType.length > 0 && stockUOM != oldStockUOM)
			{
				var unitsTypeRec = nlapiLoadRecord('unitstype', unitsType);
				for (var i = 1; i <= unitsTypeRec.getLineItemCount('uom'); i++)
				{
					if (unitsTypeRec.getLineItemValue('uom', 'internalid', i) == stockUOM)
					{
						nlapiSetFieldValue('custitemgd_stockunitconv', unitsTypeRec.getLineItemValue('uom', 'conversionrate', i));
						break;
					}
				}
			}
		}
	}
}
