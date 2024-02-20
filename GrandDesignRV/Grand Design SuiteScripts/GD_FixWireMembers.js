/**
 * Scheduled script to fix the member quantity for wire members.
 * 
 * Version    Date            Author           Remarks
 * 1.00       25 Sep 2013     nathanah
 *
 */

/**
 * @param {String} type Context Types: scheduled, ondemand, userinterface, aborted, skipped
 * @returns {Void}
 */
function FixWireMembers(type) 
{
	var context = nlapiGetContext();
	
	var itemResults = nlapiSearchRecord('assemblyitem', 'customsearchwirememberswithwrongqtyfix');
	
	var unitsTypeArray = new Array();
	
	if (itemResults != null)
	{
		for (var i=0; i<itemResults.length; i++)
		{
			// get the data out
			var assemblyId = itemResults[i].getId();
			var memberItemId = itemResults[i].getValue('memberitem');
			var memberQuantity = ConvertNSFieldToFloat(itemResults[i].getValue('memberquantity'));
			var unitsTypeId = itemResults[i].getValue('unitstype', 'memberitem');
			var purchaseUnits = itemResults[i].getValue('purchaseunit', 'memberitem');
			
			// load the unit type record if necessary
//			var unitsType = null;	
//			if (unitsTypeArray[unitsTypeId] == null)
//			{		
//				unitsTypeArray[unitsTypeId] = nlapiLoadRecord('unitstype', unitsTypeId, null);
//			}
//				
//			unitsType = unitsTypeArray[unitsTypeId];
			
			// load the assembly
			var assembly = nlapiLoadRecord('assemblyitem', assemblyId, null);
			
			var conversionFactor = 12000;
//			var uomLength = unitsType.getLineItemCount('uom');
//			
//			for (var j=1; j<=uomLength; j++)
//			{
//				if (unitsType.getLineItemValue('uom', 'internalid', j) == purchaseUnits)
//				{
//					conversionFactor = ConvertNSFieldToFloat(unitsType.getLineItemValue('uom', 'conversionrate', j));
//				}
//			}
			
//			nlapiLogExecution('DEBUG', 'Conversion Factor', conversionFactor);
			
			var memberCount = assembly.getLineItemCount('member');
			for (var j=1; j<=memberCount; j++)
			{
				if (assembly.getLineItemValue('member', 'item', j) == memberItemId)
				{
					// set the quantity of the item to be the existing quantity times the conversion factor					
					assembly.setLineItemValue('member', 'quantity', j, memberQuantity * conversionFactor);
					
					break;
				}
			}
			
			nlapiSubmitRecord(assembly, true, true);
			
			if (context.getRemainingUsage() < 100)
			{
				nlapiYieldScript();
			}
		}
	}
}