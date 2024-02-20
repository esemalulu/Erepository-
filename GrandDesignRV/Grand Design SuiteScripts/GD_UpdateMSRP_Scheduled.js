/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       26 Mar 2019     SidH
 *
 */

/**
 * 
 * This is a one time use script for updating the MSRP Amounts on existing Sales Orders.
 * 
 * @param {String} type Context Types: scheduled, ondemand, userinterface, aborted, skipped
 * @returns {Void}
 */
function scheduled(type) {
	// Production
	var salesOrderSearch = nlapiSearchRecord("salesorder",null,
	[
		["type","anyof","SalesOrd"],
		"AND",
		["mainline","is","T"],
		"AND",
		["status","noneof","SalesOrd:C","SalesOrd:H"],
		"AND",
		["custbodyrvsordertype","anyof","2"],
		"AND",
		["custbodyrvsmsrppricelevel","noneof","12"], // MSRP 27
		"AND",
		["custbodyrvsunitmodel","anyof","52563","51690","52335","51271","52336","52417","52827","51980","52337"]
	]);
	
	nlapiLogExecution('DEBUG', 'results', salesOrderSearch.length)
	
	for (var index = 0; index < salesOrderSearch.length; index++)
	{
		var recType = 'salesorder';
		var recId = salesOrderSearch[index].getId();
		nlapiLogExecution('DEBUG', 'soID', recId);
		try
		{
			//Set the MSRP rate on the Sales Order to be the new rate.
			//Then update the lines.
			var soRec = nlapiLoadRecord(recType, recId);
			var priceLevel = 12; // MSRP 27
			soRec.setFieldValue('custbodyrvsmsrppricelevel', priceLevel);
			soRec.setFieldValue('custbodyrvsmsrprate', 27);
			
			//Get the lines so we can search on the price level.
			var nonCustomLines = [];
			var customLines = [];
			for(var i = 1; i <= soRec.getLineItemCount('item'); i++)
			{
				// If the line has custom pricing, use that.
				if (soRec.getLineItemValue('item', 'price', i) == -1)
					customLines.push(soRec.getLineItemValue('item', 'item', i))
				else if (soRec.getLineItemValue('item', 'custcolrvsmsrpamount', i) > 0)
					nonCustomLines.push(soRec.getLineItemValue('item', 'item', i));
			}
			if (nonCustomLines.length > 0)
			{
				var msrpResults = nlapiSearchRecord('item', null, [new nlobjSearchFilter('pricelevel', 'pricing', 'is', priceLevel),
				                                                   new nlobjSearchFilter('internalid', null, 'anyof', nonCustomLines)], new nlobjSearchColumn('unitprice', 'pricing'));
				
				//Match up the msrpResults to the line.
				if (msrpResults != null)
				{
					for(var i = 1; i <= soRec.getLineItemCount('item'); i++)
					{
						if (soRec.getLineItemValue('item', 'custcolrvsmsrpamount', i) > 0) 
						{
							//Search for the current item in the results.
							var curItem = soRec.getLineItemValue('item', 'item', i);
							for(var j = 0; j < msrpResults.length; j++)
							{
								if (msrpResults[j].getId() == curItem)
								{
									soRec.setLineItemValue('item', 'custcolrvsmsrpamount', i, msrpResults[j].getValue('unitprice', 'pricing') * soRec.getLineItemValue('item', 'quantity', i));
									break;
								}
							}
						}
					}
				}
			}
			
			if (customLines.length > 0)
			{
				for(var i = 1; i <= soRec.getLineItemCount('item'); i++)
				{
					if (soRec.getLineItemValue('item', 'custcolrvsmsrpamount', i) > 0)
					{
						//Search for the current item in the results.
						var curItem = soRec.getLineItemValue('item', 'item', i);
						for(var j = 0; j < customLines.length; j++)
						{
							if (customLines[j] == curItem)
							{
								soRec.setLineItemValue('item', 'custcolrvsmsrpamount', i, soRec.getLineItemValue('item', 'amount', i) * (1 + (parseFloat(soRec.getFieldValue('custbodyrvsmsrprate')) / 100)));
								break;
							}
						}
					}
				}
			}
			
			if (nonCustomLines.length == 0 && customLines.length == 0)
			{
				nlapiLogExecution('debug', 'SS ERROR', 'No items with MSRP Amount > 0: ' + recId);
			}
			
			nlapiSubmitRecord(soRec, false, true);
		}
		catch(err)
		{
			nlapiLogExecution('debug', 'SS ERROR', 'Could not update Sales Order with ID ' + recId + '. Error description:\r\n' + err);
		}
	}
}
