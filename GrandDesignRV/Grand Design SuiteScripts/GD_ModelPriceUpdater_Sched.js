/**
 * Scheduled script for users to update model prices on sales orders
 * 
 * Version    Date            Author           Remarks
 * 1.00       2 May 2016      Jacob Shetler
 *
 */

/**
 * @param {String} type Context Types: scheduled, ondemand, userinterface, aborted, skipped
 * @returns {Void}
 */
function GD_ModelPriceUpdate_Sched(type) {
	//Get the things to update and the orders to update.
	var context = nlapiGetContext();
	var soArr = JSON.parse(context.getSetting('SCRIPT', 'custscriptgd_mpu_sos'));
	
	//Keep track of the model prices in a dictionary
	var modelPriceDict = {};
	
	//Update the sales orders.
	for(var i = 0; i < soArr.length; i++)
	{
		try
		{
			if (context.getRemainingUsage() < 50) nlapiYieldScript();
			
			//Get info from the sales order.
			var soRec = nlapiLoadRecord('salesorder', soArr[i]);
			var modelId = ConvertNSFieldToString(soRec.getFieldValue('custbodyrvsmodel'));
			var priceLevel = soRec.getFieldValue('custbodyrvsmsrppricelevel');
			
			//Search for the model price results if we don't already have them.
			var modelResult = modelPriceDict[modelId];
			if(modelResult == null)
			{
				var modelResults = nlapiSearchRecord('assemblyitem', null, new nlobjSearchFilter('internalid', null, 'is', modelId), [new nlobjSearchColumn('otherprices'),
				                                                                                                                      new nlobjSearchColumn('custitemrvs_msrplevel'),
				                                                                                                                      new nlobjSearchColumn('baseprice')]);
				modelPriceDict[modelId] = modelResults[0];
				modelResult = modelResults[0];
			}
			
			//Update the line.
			var modelLineIdx = soRec.findLineItemValue('item', 'item', modelId);
			soRec.setLineItemValue('item', 'rate', modelLineIdx, modelResult.getValue('baseprice'));
			soRec.setLineItemValue('item', 'amount', modelLineIdx, modelResult.getValue('baseprice'));
			soRec.setLineItemValue('item', 'custcolrvsmsrpamount', modelLineIdx, modelResult.getValue('price' + priceLevel));
			nlapiSubmitRecord(soRec, false, true);
			
			//Update the percent complete
			context.setPercentComplete((((i+1)/soArr.length) * 100).toFixed(2));
		}
		catch(err)
		{
			nlapiLogExecution('debug', 'Sales Order Error', 'Could not submit order with internal ID: ' + soArr[i] + '\r\n' + err);
		}
	}
}
