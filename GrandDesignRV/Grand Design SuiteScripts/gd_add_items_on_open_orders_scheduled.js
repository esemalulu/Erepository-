/**
 * Scheduled script to add winterization line item on open sales orders.
 * 
 * Version    Date            Author           Remarks
 * 1.00       04 Sep 2015     ibrahima
 *
 */

/**
 * Adds winterization item on open orders.
 * @param {String} type Context Types: scheduled, ondemand, userinterface, aborted, skipped
 * @returns {Void}
 */
function GD_AddWinterizationLineItemsScheduled(type) 
{
//  //BATCH 1: Based on Backlog
//	var processedOrders = new Array();	
//	var orders = nlapiSearchRecord('transaction', 'customsearchadditemstoorders', null, null); //backlog search, titled "SS Add Winterization Items to Orders Case #5276 - Scheduled Script"
//	if(orders != null && orders.length > 0)
//	{
//		nlapiLogExecution('debug', 'GD_AddWinterizationLineItemsScheduled', '# of orders: ' + orders.length);
//		for(var i = 0; i < orders.length; i++)
//		{
//			var orderId = orders[i].getValue('internalid', 'createdFrom');
//			var orderId = orders[i].getId();
//			if(!ArrayContains(processedOrders, orderId)) //order has not been processed. pre-caution in case we have an order with more than one backlog.
//			{
//				AddWinterizationLineItemOnOrder(orderId);	
//				
//				processedOrders[processedOrders.length] = orderId;
//			}
//			
//			if(nlapiGetContext().getRemainingUsage() < 100)
//				nlapiYieldScript();
//		}
//	}
	
//  //BATCH 2: Based on Sales Order
	var orders = GetSteppedSearchResults('salesorder', null, null, 'customsearchorderstoaddwintitemsnotseria'); //sales order search, titled "Orders To Add Winterization Items For Un-Serialized Units"
	if(orders != null && orders.length > 0)
	{
		nlapiLogExecution('debug', 'GD_AddWinterizationLineItemsScheduled', '# of orders: ' + orders.length);
		for(var i = 0; i < orders.length; i++)
		{
			var orderId = orders[i].getId();
			AddWinterizationLineItemOnOrder(orderId);	

			if(nlapiGetContext().getRemainingUsage() < 100)
				nlapiYieldScript();
		}
	}
}

/**
 * Adds winterization line item on order based on series used on the order.
 * @param orderId
 */
function AddWinterizationLineItemOnOrder(orderId)
{
	var SERIES_SOLITUDE = '1'; //according to Donna's email from 9/8/2015, solitude & momentum orders are done.
	var SERIES_REFLECTION = '5';
	//var SERIES_MOMENTUM = '6'; //according to Donna's email from 9/8/2015, solitude & momentum orders are done.
	//var SERIES_AVALON = '7'; //No item to add for this series.???
	var SERIES_IMAGINE = '8';
	
	var MODEL_TYPE_FIFTHWHEEL = '1';
	var MODEL_TYPE_TRAVELTRAILER = '2';

	var order = nlapiLoadRecord('salesorder', orderId);
	var orderSeriesId = order.getFieldValue('custbodyrvsseries');
	var orderModelId = order.getFieldValue('custbodyrvsmodel');
	var orderNum = order.getFieldValue('tranid');
	var priceLevel = order.getFieldValue('custbodyrvsmsrppricelevel');
	var winterizationItemIdToAdd = '';
	
	
	if(orderSeriesId == SERIES_SOLITUDE)
		winterizationItemIdToAdd = '24771'; //STF100007
	//else if(orderSeriesId == SERIES_MOMENTUM)
	//	winterizationItemIdToAdd = '24772'; //MTF100007
	
	if(orderSeriesId == SERIES_REFLECTION)
	{
		if(orderModelId != null && orderModelId != '')
		{
			//check if model is fifth wheel or travel tariler
			var modelTypeId = nlapiLookupField('item', orderModelId, 'custitemrvsmodeltype', false);
			if(modelTypeId == MODEL_TYPE_FIFTHWHEEL)
				winterizationItemIdToAdd = '24773'; //RFF100007	
			else if(modelTypeId == MODEL_TYPE_TRAVELTRAILER)
				winterizationItemIdToAdd = '24774'; //RFT100007		
		}
	}
	else if(orderSeriesId == SERIES_IMAGINE)
		winterizationItemIdToAdd = '24775'; //IMT100007	
	
	if(winterizationItemIdToAdd != '')
	{
		var hasWinterizationItem = false;
		for(var i = 1; i <= order.getLineItemCount('item'); i++)
		{
			var itemId = order.getLineItemValue('item', 'item', i);			
			if(itemId == winterizationItemIdToAdd)
			{
				hasWinterizationItem = true;
				break;
			}
		}
		
		if(!hasWinterizationItem)
		{
			order.selectNewLineItem('item');
			order.setCurrentLineItemValue('item', 'item', winterizationItemIdToAdd);
			order.setCurrentLineItemValue('item', 'custcolrvsmsrpamount', GetItemAmountForPriceLevel(winterizationItemIdToAdd, priceLevel));
			order.commitLineItem('item');
			
			nlapiSubmitRecord(order, false, true);
		}
		else
			nlapiLogExecution('debug', 'GD_AddWinterizationLineItemsScheduled', 'No update Needed: order #' + orderNum);
	}
}

/**
 * Return whether or not array contains element.
 * @param array
 * @param element
 * @returns {Boolean}
 */
function ArrayContains(array, element)
{
	var _hasElement = false;
	
	if(array != null && array.length > 0)
	{
		for(var i = 0; i < array.length; i++)
		{
			if(array[i] == element)
			{
				_hasElement = true;
				break;
			}
		}
	}
	
	return _hasElement;
}
