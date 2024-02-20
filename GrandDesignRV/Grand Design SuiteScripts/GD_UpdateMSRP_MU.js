/**
 * Mass updates for the MSRP change order.
 * 
 * Version    Date            Author           Remarks
 * 1.00       27 Feb 2017     Jacob Shetler
 *
 */

/**
 * Sets MSRP on the order and updates all items to have the correct MSRP amount.
 * 
 * This is a one time use script for updating the MSRP Amounts on existing Sales Orders.
 * 
 * @param {String} recType Record type internal id
 * @param {Number} recId Record internal id
 * @returns {Void}
 */
function GD_SetMSRPonSalesOrders_MU(recType, recId)
{
	try
	{
		//Set the MSRP rate on the Sales Order to be the new rate.
		//Then update the lines.
		var soRec = nlapiLoadRecord(recType, recId);
		var priceLevel = 6;
		soRec.setFieldValue('custbodyrvsmsrppricelevel', priceLevel);
		soRec.setFieldValue('custbodyrvsmsrprate', 40);
		
		//Get the lines so we can search on the price level.
		var allItems = [];
		for(var i = 1; i <= soRec.getLineItemCount('item'); i++)
		{
			if (soRec.getLineItemValue('item', 'custcolrvsmsrpamount', i) > 0) 
				allItems.push(soRec.getLineItemValue('item', 'item', i));
		}
		var msrpResults = nlapiSearchRecord('item', null, [new nlobjSearchFilter('pricelevel', 'pricing', 'is', priceLevel),
		                                                   new nlobjSearchFilter('internalid', null, 'anyof', allItems)], new nlobjSearchColumn('unitprice', 'pricing'));
		
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
							//If we found the result, update the line.
							soRec.setLineItemValue('item', 'custcolrvsmsrpamount', i, msrpResults[j].getValue('unitprice', 'pricing') * soRec.getLineItemValue('item', 'quantity', i));
							break;
						}
					}
				}
			}
		}
		
		nlapiSubmitRecord(soRec, false, true);
	}
	catch(err)
	{
		nlapiLogExecution('debug', 'SS ERROR', 'Could not update Sales Order with ID ' + recId + '. Error description:\r\n' + err);
	}
}


/**
 * Sets MSRP on the order and updates all items to have the correct MSRP amount.
 * 
 * @param {String} recType Record type internal id
 * @param {Number} recId Record internal id
 * @returns {Void}
 */
function GD_SetMSRPByModel_MU(recType, recId)
{
	try
	{
		//Get the MSRP based on the series.
		var curSeries = nlapiLookupField(recType, recId, 'custbodyrvsseries');
		var priceLevel = null;
		var priceLevelPerc = null;
		if(curSeries == 8 || curSeries == 5) //Imagine or Reflection
		{
			priceLevel = 6;
			priceLevelPerc = 40;
		}
		else if(curSeries == 6) //Momentum
		{
			priceLevel = 7;
			priceLevelPerc = 41;
		}
		else if(curSeries == 1) //Solitude
		{
			priceLevel = 8;
			priceLevelPerc = 48;
		}
		nlapiSubmitField(recType, recId, ['custbodyrvsmsrppricelevel', 'custbodyrvsmsrprate'], [priceLevel, priceLevelPerc], false);
	}
	catch(err)
	{
		nlapiLogExecution('debug', 'SS ERROR', 'Could not update Sales Order with ID ' + recId + '. Error description:\r\n' + err);
	}
}
