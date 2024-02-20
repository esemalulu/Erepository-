/**
 * Scheduled script to set the MSRP on sales orders where it's not set.
 * 
 * Version    Date            Author           Remarks
 * 1.00       22 Jun 2017     Jacob Shetler
 *
 */

/**
 * @param {String} recType Record type internal id
 * @param {Number} recId Record internal id
 * @returns {Void}
 */
function GD_SetMSRP_Sch(recType, recId)
{
	//Get lines to update.
	var badLines = GetSteppedSearchResults('transaction', null, null, 'customsearchgd_lineitemsnomsrp');
	if(badLines != null)
	{
		for(var i = 0; i < badLines.length; i++)
		{
			var curBadLine = badLines[i];
			try 
			{
				//Load the sales order.
				var curItem = curBadLine.getValue('item');
				var soRec = nlapiLoadRecord('salesorder', curBadLine.getId());
				
				//Update the line and save the order
				var msrpPrice = GetItemAmountForPriceLevel(curItem, soRec.getFieldValue('custbodyrvsmsrppricelevel'));
				soRec.setLineItemValue('item', 'custcolrvsmsrpamount', soRec.findLineItemValue('item', 'item', curItem), msrpPrice);
				nlapiSubmitRecord(soRec, false, true);
			}
			catch(err)
			{
				nlapiLogExecution('debug', 'error for SO ID ' + curBadLine.getId(), err);
			}
			
			//Update the percent complete. Yield if necessary
			nlapiGetContext().setPercentComplete((i/badLines.length)*100);
			if(nlapiGetContext().getRemainingUsage() < 50) nlapiYieldScript();
		}
	}
}
