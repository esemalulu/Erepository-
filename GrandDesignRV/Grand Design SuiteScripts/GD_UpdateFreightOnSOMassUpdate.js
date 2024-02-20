/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       16 Sep 2015     jeffrb
 *
 */

/***************************** BEGIN GLOBAL VARIALBLES ***********************/

var FREIGHT_CHARGE_ITEM_ID = '9';
var FUEL_CHARGE_ITEM_ID = '10';

/***************************** END GLOBAL VARIABLES **************************/

/**
 * @param {String} recType Record type internal id
 * @param {Number} recId Record internal id
 * @returns {Void}
 */
function GD_MassUpdateFreightOnSalesOrders(recType, recId)
{
	nlapiLogExecution('debug', 'internalid', recId);
	// now load the sales order and update the lines
	var salesOrderRecord = nlapiLoadRecord(recType, recId);
	
	// load the dealer and get the freight and fuel surcharge from the dealer
	var dealerId = salesOrderRecord.getFieldValue('entity');
	var dealerRecord = nlapiLoadRecord('customer', dealerId);
	
	var currentDealerFreightSurcharge = 0, currentDealerFuelSurcharge = 0;
	var itemCount = dealerRecord.getLineItemCount('itempricing');
	for (var k = 1; k <= itemCount; k++) //Loop through dealer pricing items
	{
		var itemId = dealerRecord.getLineItemValue('itempricing', 'item', k);
		if (itemId == FREIGHT_CHARGE_ITEM_ID) //get freight surcharge
		{							
			currentDealerFreightSurcharge = dealerRecord.getLineItemValue('itempricing', 'price', k);
		}
		
		if (itemId == FUEL_CHARGE_ITEM_ID) //get fuel surcharge
		{							
			currentDealerFuelSurcharge = dealerRecord.getLineItemValue('itempricing', 'price', k);
		}
	}
	
	nlapiLogExecution('debug', 'get freight charge', currentDealerFreightSurcharge);
	
	var soItemCount = salesOrderRecord.getLineItemCount('item');
	
	for(var k = 1; k <= soItemCount; k++)
	{
		var soItemId = salesOrderRecord.getLineItemValue('item', 'item', k);
		if (soItemId == FREIGHT_CHARGE_ITEM_ID) //set freight surcharge
		{
			salesOrderRecord.setLineItemValue('item', 'rate', k, currentDealerFreightSurcharge);
		}																		
		else if(soItemId == FUEL_CHARGE_ITEM_ID)//set fuel surcharge
		{
			salesOrderRecord.setLineItemValue('item', 'rate', k, currentDealerFuelSurcharge);
		}	
	}			
	
	nlapiSubmitRecord(salesOrderRecord, false, true);
}
