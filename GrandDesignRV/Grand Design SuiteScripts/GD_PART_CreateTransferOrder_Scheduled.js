/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       06 Dec 2016     brians
 *
 */

var TRANSFERORDER_STATUS_PENDINGAPPROVAL = 'A';
var TRANSFERORDER_STATUS_DESTINATIONLOCATION = '41';

/**
 * @param {String} type Context Types: scheduled, ondemand, userinterface, aborted, skipped
 * @returns {Void}
 */
function CreateTransferOrderScheduled(type) {
	
	var context = nlapiGetContext();
	context.setPercentComplete(0.00);
	
	var itemDict = context.getSetting('SCRIPT', 'custscriptgd_createto_itemdict');
	var itemDictLength = context.getSetting('SCRIPT', 'custscriptgd_createto_itemdictlength');
	if(itemDict != null)
	{
		var itemDict = JSON.parse(itemDict);
		//Create a dictionary that can store a transfer Order record as a value assigned to a location key
		var transferOrders = {};
		
		var today = new Date();
		
		var index = 0;
		for(var key in itemDict)
		{
			var item = '';
			if(itemDict.hasOwnProperty(key))
			{
				item = itemDict[key];
				
				//Only add this to a Transfer Order if the user selected this item on the suitelet and its qty to order is greater than zero
				if(item.isSelected == 'T' && item.quantity > 0)
				{
					//If we've already created a transfer order for this item's location, add it to that Transfer order
					if(transferOrders.hasOwnProperty(item.location))
					{
						//Set the sublist values on the transfer Order record assigned to that location
						transferOrders[item.location].selectNewLineItem('item');
						transferOrders[item.location].setCurrentLineItemValue('item', 'item', item.id);
						transferOrders[item.location].setCurrentLineItemValue('item', 'quantity', item.quantity);
						transferOrders[item.location].setCurrentLineItemValue('item', 'custcolgd_part_requestedqty', item.quantity);
						transferOrders[item.location].commitLineItem('item', false);
						
					}
					//If not, create a new Transfer Order for this location
					else
					{
						var transOrd = nlapiCreateRecord('transferorder', null);
						
						transOrd.setFieldValue('trandate', today.getMonth() + 1 + '/' + today.getDate() + '/' + today.getFullYear());
						transOrd.setFieldValue('location', item.location);
						transOrd.setFieldValue('transferlocation', TRANSFERORDER_STATUS_DESTINATIONLOCATION);
						transOrd.setFieldValue('orderstatus', TRANSFERORDER_STATUS_PENDINGAPPROVAL);
						transOrd.setFieldValue('custbodygd_part_isplantpull', 'T');
						
						//Set the sublist values on the transfer Order record assigned to that location
						transOrd.selectNewLineItem('item');
						transOrd.setCurrentLineItemValue('item', 'item', item.id);
						transOrd.setCurrentLineItemValue('item', 'quantity', item.quantity);
						transOrd.setCurrentLineItemValue('item', 'custcolgd_part_requestedqty', item.quantity);
						transOrd.commitLineItem('item', false);
						
						transferOrders[item.location] = transOrd;
					}
				}
				index++;
			}
			context.setPercentComplete((index/itemDictLength)*100);
		}
		
		var transferOrderIds = '';
		for(var key in transferOrders)
		{
			if(transferOrders.hasOwnProperty(key))
			{
				try {
					transferOrderIds += nlapiSubmitRecord(transferOrders[key], true);
					transferOrderIds += ', ';
				}
				catch(err) {
					nlapiLogExecution('error', 'ERROR Submitting Transfer Order', err + ' - Transfer Order for location Id: ' + key);
				}

			}
		}
	}
	
	context.setPercentComplete(100.00);

}
