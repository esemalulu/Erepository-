/**
 * Mass Updates for March 2017
 * 
 * Version    Date            Author           Remarks
 * 1.00       21 Mar 2017     Jacob Shetler
 *
 */

/**
 * Does 2 things to sales orders passed in:
 * 1. Updates model price to be the base price of the model.
 * 2. Updates order to have G Range Tires option (if not already on order)
 * 
 * @param {String} recType Record type internal id
 * @param {Number} recId Record internal id
 * @returns {Void}
 */
function GD_GRange_MU(recType, recId)
{
	try
	{
		//Load the order.
		var soRec = nlapiLoadRecord('salesorder', recId, {recordmode: 'dynamic'});
		
		//Update the base price of the model.
		var gRangeOptionId = 38158;
		var gRangeSortOrder = 7;
		var hasGRangeOption = false;
		var foundModel = false;
		for(var i = 1; i < soRec.getLineItemCount('item'); i++)
		{
			if(soRec.getLineItemValue('item', 'custcolrvsitemcategory', i) == 4) //Model.
			{
				var basePrice = nlapiLookupField('item', soRec.getLineItemValue('item', 'item', i), 'baseprice');
				soRec.selectLineItem('item', i);
				soRec.setCurrentLineItemValue('item', 'rate', basePrice);
				soRec.setCurrentLineItemValue('item', 'amount', basePrice);
				soRec.commitLineItem('item');
				foundModel = true;
			}
			
			if(soRec.getLineItemValue('item', 'item', i) == gRangeOptionId)
			{
				hasGRangeOption = true;
			}
			
			if(hasGRangeOption && foundModel) break;
		}
		
		//Add the G Range Tire option if it doesn't exist.
		if(!hasGRangeOption)
		{
			//Add the option in the correct spot in the list.
			for(var i = 1; i < soRec.getLineItemCount('item'); i++)
			{
				if (soRec.getLineItemValue('item', 'custcolrvs_modeloptionsortorder', i) == (gRangeSortOrder - 1))
				{
					soRec.insertLineItem('item', i+1);
					soRec.setCurrentLineItemValue('item', 'item', gRangeOptionId);
					soRec.setCurrentLineItemValue('item', 'quantity', 1);
					soRec.setCurrentLineItemValue('item', 'custcolrvs_modeloptionsortorder', gRangeSortOrder);
					soRec.setCurrentLineItemValue('item', 'custcolrvsmsrpamount', 0);
					soRec.commitLineItem('item');
					break;
				}
			}
		}
		
		//Save the order.
		nlapiSubmitRecord(soRec, false, true);
	}
	catch(err)
	{
		nlapiLogExecution('debug', 'Error', 'Could not save Sales Order with internal ID ' + recId + '\r\n' + err);
	}
}
