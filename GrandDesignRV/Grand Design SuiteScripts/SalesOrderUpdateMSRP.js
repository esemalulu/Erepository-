
/**
 * Updates order msrp line item field.
 * @param rec_type
 * @param rec_id
 */
function UpdateOrderMSRP(rec_type, rec_id)
{
	nlapiSubmitField(rec_type, rec_id, 'custbodyrvsmsrppricelevel', GetMSRPPriceLevelId(), true);
//	var order = nlapiLoadRecord(rec_type, rec_id);
//	var needToSave = false;
//	var count = order.getLineItemCount('item');
//	for(var i = 1; i <= count; i++)
//	{
//		var lineMSRP = order.getLineItemValue('item', 'custcolrvsmsrpamount', i);
//		var itemId = order.getLineItemValue('item', 'item', i);
//		var itemMSRP = GetMSRPForItemLocal(itemId);
//
//		if(lineMSRP == null || lineMSRP == '' || (!isNaN(parseFloat(lineMSRP) && parseFloat(lineMSRP) == 0 && itemMSRP != 0)))
//		{
//			nlapiLogExecution('debug', 'UpdateOrderMSRP', 'Order #: ' + order.getFieldValue('tranid') + '; Item Id: ' + itemId + '; Line MSRP = ' + lineMSRP + '; itemMSRP = ' + itemMSRP);
//			order.setLineItemValue('item', 'custcolrvsmsrpamount', i, itemMSRP);		
//			needToSave = true;
//		}
//	}
//	
//	if(needToSave)
//		nlapiSubmitRecord(order, false, true);
	
}

function GetMSRPForItemLocal(itemId)
{
	var MSRPPriceLevelId = '2'; 
	nlapiLogExecution('debug', 'GetMSRPForItemLocal', 'Hard coded: MSRPPriceLevelId = ' + MSRPPriceLevelId);
	if (MSRPPriceLevelId != null)
	{
		// run a search for the unit price for the item and the level
		var filters = new Array();
		filters[filters.length] = new nlobjSearchFilter('pricelevel', 'pricing', 'is', MSRPPriceLevelId, null);
		filters[filters.length] = new nlobjSearchFilter('internalid', null, 'is', itemId, null);
		
		var cols = new Array();
		cols[cols.length] = new nlobjSearchColumn('unitprice', 'pricing', null);
		
		var results = nlapiSearchRecord('item', null, filters, cols);
		nlapiLogExecution('debug', 'GetMSRPForItemLocal', 'results = ' + results);
		if (results != null && results.length > 0)
		{
			nlapiLogExecution('debug', 'GetMSRPForItemLocal', 'results.length = ' + results.length);
			return ConvertNSFieldToFloat(results[0].getValue('unitprice', 'pricing'));
		}
		return 0;
	}
	
	return 0;
}
