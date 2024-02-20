/**
 * Common functions used by the Open Order Items suitelet and the Open Order Items user event scripts
 * 
 * Version    Date            Author           Remarks
 * 1.00       06 Apr 2018     Jacob Shetler
 *
 */

var DONOTCOMMIT = '3';
var CLOSETOZERO = 0.0000001; //Floating-point math isn't always right.

/**
 * Returns an object with keys of "_itemid" and values of an object with two arrays: "salesOrders" and "purchaseOrders"
 * These arrays have objects with other properties.
 * You should only call this function if the Sales Order is in the Parts and Service location.
 * 
 * @param {nlobjRecord} soRecord Sales Order record to evaluate
 * 
 * @returns {Object} Object with keys of "_itemid" and values of an object with two arrays: "salesOrders" and "purchaseOrders"
 */
function GD_OpenOrder_GetSOPODetail(soRecord)
{
	//This only runs for the parts and warranty location
	var partsAndWarrLocation = nlapiGetContext().getSetting('SCRIPT', 'custscriptpartsandwarrantylocation');
	
	//Get the list of Item IDs to include in the search.
	var itemIdsArr = [];
	var detailObj = {};
	for (var i = 1; i <= soRecord.getLineItemCount('item'); i++)
	{
		if (ConvertNSFieldToFloat(soRecord.getLineItemValue('item', 'quantitybackordered', i)) > 0 && soRecord.getLineItemValue('item', 'commitinventory', i) != DONOTCOMMIT)
		{
			var itemId = soRecord.getLineItemValue('item', 'item', i);
			itemIdsArr.push(itemId);
			detailObj['_' + itemId] = {salesOrders: [], purchaseOrders: []};
		}
	}
	if(itemIdsArr.length == 0) return null;
	
	//Get the list of Sales Orders that were created before the date on the current Sales Order.
	//If they were created on the same date as the Sales Order, include them if they have a lesser Internal ID (i.e. they were created first).
	//Only include lines actually have a quantity back ordered and that are not marked as "Do Not Commit"
	//We sort by the item first so that we can loop over the dictionary and not have to do a bunch of extra loops over the results.
	//Then we sort by the trandate and then internal ID so that the transactions are in the correct order.
	var soFilters = '';
	soFilters = [['status', 'anyof', [SALESORDER_SRCHFILTER_PENDINGFULFILLMENT, SALESORDER_SRCHFILTER_PARTIALLYFULFILLED, SALESORDER_SRCHFILTER_PENDINGBILLINGPARTIALLYFULFILLED]], 'AND',
	             ['item', 'anyof', itemIdsArr], 'AND',
	             ['location', 'is', partsAndWarrLocation], 'AND',
	             ['mainline', 'is', 'F'], 'AND',
                 ['commit', 'noneof', DONOTCOMMIT], 'AND',
                 ['formulanumeric: {quantity}-nvl({quantityshiprecv},0)-nvl({quantitycommitted},0)', 'greaterthan', 0], 'AND',
                 ['internalid', 'noneof', soRecord.getId()], 'AND',
	             [
	              ['trandate', 'before', soRecord.getFieldValue('trandate')], 'OR',
	              [
	               ['trandate', 'on', soRecord.getFieldValue('trandate')], 'AND',
	               ['internalidnumber', 'lessthan', soRecord.getId()]
	              ]]];
	var boInBaseCol = new nlobjSearchColumn('formulanumeric').setFormula('{quantity}-nvl({quantityshiprecv},0)-nvl({quantitycommitted},0)');
	var boCol = new nlobjSearchColumn('formulanumeric').setFormula('({quantity}-nvl({quantityshiprecv},0)-nvl({quantitycommitted},0))/({quantity}/nvl({quantityuom},1))');
	var soCols = [new nlobjSearchColumn('item').setSort(),
	              new nlobjSearchColumn('trandate').setSort(),
	              new nlobjSearchColumn('internalid').setSort(),
	              new nlobjSearchColumn('tranid'),
	              new nlobjSearchColumn('unit'),
	              new nlobjSearchColumn('quantity'),
	              new nlobjSearchColumn('quantityuom'), //Quantity in transaction units
	              boInBaseCol,
	              boCol];
	var soResults = GetSteppedSearchResults('salesorder', soFilters, soCols);
	
	//For each key in the detail object, find the Sales Orders that apply to the Item.
	//Add their information into the object's salesOrders array.
	if(soResults != null)
	{
		for(var key in detailObj)
		{
			var curItem = key.substring(1);
			var foundCurrentItem = false; //var to determine if we already found this item. If we did, then we can break after not finding it.
			for(var i = 0; i < soResults.length; i++)
			{
				if(soResults[i].getValue('item') == curItem)
				{
					var curResult = soResults[i];
					detailObj[key].salesOrders.push({
						id: curResult.getId(), 
						tranId: curResult.getValue('tranid'),
						qty: ConvertNSFieldToFloat(curResult.getValue('quantityuom')),
						qtyInBase: ConvertNSFieldToFloat(curResult.getValue('quantity')),
						qtyBO: ConvertNSFieldToFloat(curResult.getValue(boCol)),
						qtyBOInBase: ConvertNSFieldToFloat(curResult.getValue(boInBaseCol)),
						unitsText: ConvertNSFieldToString(curResult.getValue('unit')),
						used: false
					});
					foundCurrentItem = true;
				}
				else if (foundCurrentItem)
				{
					break; //We already found the item and we're sorting by the item, so no more of this item in the results!
				}
			}
		}
	}
	
	//Add the current Sales Order information into the array. Do basically the same thing.
	var curSOFilters = '';
	curSOFilters = [['status', 'anyof', [SALESORDER_SRCHFILTER_PENDINGFULFILLMENT, SALESORDER_SRCHFILTER_PARTIALLYFULFILLED, SALESORDER_SRCHFILTER_PENDINGBILLINGPARTIALLYFULFILLED]], 'AND',
	             ['item', 'anyof', itemIdsArr], 'AND',
	             ['location', 'is', nlapiGetContext().getSetting('SCRIPT', 'custscriptpartsandwarrantylocation')], 'AND',
	             ['mainline', 'is', 'F'], 'AND',
                 ['commit', 'noneof', DONOTCOMMIT], 'AND',
                 ['formulanumeric: {quantity}-nvl({quantityshiprecv},0)-nvl({quantitycommitted},0)', 'greaterthan', 0], 'AND',
                 ['internalid', 'anyof', soRecord.getId()]];
	var curSOResults = GetSteppedSearchResults('salesorder', curSOFilters, soCols);
	for(var key in detailObj)
	{
		var curItem = key.substring(1);
		var foundCurrentItem = false; //var to determine if we already found this item. If we did, then we can break after not finding it.
		for(var i = 0; i < curSOResults.length; i++)
		{
			if(curSOResults[i].getValue('item') == curItem)
			{
				var curResult = curSOResults[i];
				detailObj[key].salesOrders.push({
					id: curResult.getId(),
					tranId: curResult.getValue('tranid'),
					qty: ConvertNSFieldToFloat(curResult.getValue('quantityuom')),
					qtyInBase: ConvertNSFieldToFloat(curResult.getValue('quantity')),
					qtyBO: ConvertNSFieldToFloat(curResult.getValue(boCol)),
					qtyBOInBase: ConvertNSFieldToFloat(curResult.getValue(boInBaseCol)),
					unitsText: ConvertNSFieldToString(curResult.getValue('unit')),
					used: true
				});
				foundCurrentItem = true;
			}
			else if (foundCurrentItem)
			{
				break; //We already found the item and we're sorting by the item, so no more of this item in the results!
			}
		}
	}
	
	//Then find all POs that still have this item yet to receive.
	//Do the same kind of sorting as above - first by the item and then by the trandate/internal ID.
	var poFilters = [new nlobjSearchFilter('status', null, 'anyof', ['PurchOrd:B', 'PurchOrd:D', 'PurchOrd:E']),
	                 new nlobjSearchFilter('item', null, 'anyof', itemIdsArr),
	                 new nlobjSearchFilter('location', null, 'is', partsAndWarrLocation),
	                 new nlobjSearchFilter('formulanumeric', null, 'greaterthan', 0).setFormula('{quantity}-nvl({quantityshiprecv},0)'),
	                 new nlobjSearchFilter('mainline', null, 'is', 'F')];
	var remainingInBaseCol = new nlobjSearchColumn('formulanumeric').setFormula('{quantity}-nvl({quantityshiprecv},0)');
	var remainingCol = new nlobjSearchColumn('formulanumeric').setFormula('({quantity}-nvl({quantityshiprecv},0))/({quantity}/nvl({quantityuom},1))');
	var poCols = [new nlobjSearchColumn('item').setSort(),
	              new nlobjSearchColumn('duedate').setSort(),
	              new nlobjSearchColumn('internalid').setSort(),
	              new nlobjSearchColumn('tranid'),
	              new nlobjSearchColumn('unit'),
	              remainingInBaseCol,
	              remainingCol];
	var poResults = GetSteppedSearchResults('purchaseorder', poFilters, poCols);
	if (poResults != null)
	{
		//For each key in the detail object, find the Purchase Orders that apply to the Item.
		//Add their information into the object's purchaseOrders array.
		for(var key in detailObj)
		{
			var curItem = key.substring(1);
			var foundCurrentItem = false; //var to determine if we already found this item. If we did, then we can break after not finding it.
			for(var i = 0; i < poResults.length; i++)
			{
				if(poResults[i].getValue('item') == curItem)
				{
					var curResult = poResults[i];
					detailObj[key].purchaseOrders.push({
						id: curResult.getId(),
						tranId: curResult.getValue('tranid'),
						dueDate: curResult.getValue('duedate'),
						qty: ConvertNSFieldToFloat(curResult.getValue('quantityuom')),
						qtyInBase: ConvertNSFieldToFloat(curResult.getValue('quantity')),
						qtyBO: ConvertNSFieldToFloat(curResult.getValue(remainingCol)),
						qtyBOInBase: ConvertNSFieldToFloat(curResult.getValue(remainingInBaseCol)),
						unitsText: ConvertNSFieldToString(curResult.getValue('unit')),
						used: false //We'll determine this later.
					});
					foundCurrentItem = true;
				}
				else if (foundCurrentItem)
				{
					break; //We already found the item and we're sorting by the item, so no more of this item in the results!
				}
			}
		}
	}
	
	//Do the math to determine which POs will be used for the current sales order.
	GD_OpenOrder_DoPOMath(detailObj);
	
	return detailObj;
}

/**
 * Calculates the POs that will be used to fulfill the current order.
 * Modifies the detailObj in place.
 * Returns nothing.
 * 
 * @param {Object} detailObj
 */
function GD_OpenOrder_DoPOMath(detailObj)
{
	for(var key in detailObj)
	{
		var curDetailObj = detailObj[key];
		
		//For each Item in the detail object, determine which Purchase Order will be used to fulfill the Sales Order marked as "used."
		//In order to do this, we need to determine the quantity on other Sales Orders that will be used before this Item.
		//Then we can subtract this amount from the Purchase Orders we're yet to receive until we get to zero left to put on other Sales Orders.
		//Then we know the next Purchase Orders can be used for the current Item.
		var soBeforeCurrentTotal = 0;
		var curSOTotal = 0;
		for(var i = 0; i < curDetailObj.salesOrders.length; i++)
		{
			if(!curDetailObj.salesOrders[i].used)
			{
				soBeforeCurrentTotal += curDetailObj.salesOrders[i].qtyBOInBase;
			}
			else
			{
				curSOTotal += curDetailObj.salesOrders[i].qtyBOInBase;
				break;
			}
		}
		
		//Loop over the Purchase Orders and subtract their quantities from the quantity on other Sales Orders until that value is zero.
		var poArrIdx = 0;
		while(poArrIdx < curDetailObj.purchaseOrders.length)
		{
			soBeforeCurrentTotal -= curDetailObj.purchaseOrders[poArrIdx].qtyBOInBase;
			if(soBeforeCurrentTotal > CLOSETOZERO)
			{
				poArrIdx++; //Still need to subtract more, so continue the loop.
			}
			else if(soBeforeCurrentTotal < CLOSETOZERO)
			{
				//A PO will partially fulfill the Sales Order directly before the current one and still have some left over.
				curDetailObj.purchaseOrders[poArrIdx].used = true;
				curSOTotal -= Math.abs(soBeforeCurrentTotal);
				poArrIdx++;
				break;
			}
			else if(soBeforeCurrentTotal == 0)
			{
				//A Purchase Order exactly fulfilled the Sales Orders before the current Sales Order. You're so lucky!
				poArrIdx++;
				break; 
			}
		}
		
		//Now we have the index of the first Purchase Order that will be used to fulfill the current Sales Order. This is stored in "poArrIdx"
		//Now we need to loop over the rest of the Purchase Orders until we run out of stuff to put towards the curSOTotal
		while(poArrIdx < curDetailObj.purchaseOrders.length && curSOTotal > CLOSETOZERO)
		{
			curSOTotal -= curDetailObj.purchaseOrders[poArrIdx].qtyBOInBase;
			curDetailObj.purchaseOrders[poArrIdx].used = true;
			poArrIdx++;
		}
		
		//If curSOTotal still has a positive quantity, then we don't have enough POs to fulfill it, so unmark all of the Purchase Order "used" flags.
		if(curSOTotal > CLOSETOZERO)
		{
			for(var i = 0; i < curDetailObj.purchaseOrders.length; i++)
				curDetailObj.purchaseOrders[i].used = false;
		}
	}
}
