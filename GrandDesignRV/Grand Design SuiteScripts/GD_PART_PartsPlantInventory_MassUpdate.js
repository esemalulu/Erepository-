/**
 * If the preferred stock level and reorder points are not set, then set them to zero
 * so they will show up on the order items page.  Also make sure the auto reorder and auto stock checkboxes are unchecked.
 * 
 * Version    Date            Author           Remarks
 * 1.00       27 Jan 2016     brians
 *
 */

/**
 * @param {String} recType Record type internal id
 * @param {Number} recId Record internal id
 * @returns {Void}
 */
function PartsPlantMassUpdate(recType, recId) 
{
	/** @record inventoryitem */
	var item = nlapiLoadRecord(recType, recId, null);
	var needToSubmit = false;
	
	for(var i = 0; i < item.getLineItemCount('locations'); i++)
	{
		if(item.getLineItemValue('locations', 'location', i+1) == '17')
		{
			var prefStockLevel = item.getLineItemValue('locations', 'preferredstocklevel', i+1);
			var reorderPoint = item.getLineItemValue('locations', 'reorderpoint', i+1);
			//Only set stock level point to zero if there's no stock level set
			if (prefStockLevel == '' || prefStockLevel == null)
			{
				item.setFieldValue('autopreferredstocklevel', 'F');
				item.setLineItemValue('locations', 'preferredstocklevel', i+1, 0);
				needToSubmit = true;
			}
			//Only set reorder point to zero if there's no reorder point set
			if (reorderPoint == '' || reorderPoint == null)
			{
				item.setFieldValue('autoreorderpoint', 'F');
				item.setLineItemValue('locations', 'reorderpoint', i+1, 0);
				needToSubmit = true;
			}
		}
	}

	if(needToSubmit)
	{
		try {
			nlapiSubmitRecord(item, false, true);
		}
		catch (err) {
			nlapiLogExecution('error', err.getCode(), err.getDetails() + ' on Item id: ' + recId);
		}
	}
		
}