/**
 * Fixes Grand Design's 2019 Orders that have incorrect Model Option Groups. 
 * 
 * Version    Date            Author           Remarks
 * 1.00       26 Feb 2018     Jacob Shetler
 *
 */

var UNITORDER_ITEMCATEGORYOPTIONID = GetItemCategoryOptionId();

/**
 * Takes some 2019 Model Orders, updates the Model Options to have Model Option Group columns set.
 * 
 * @param {String} type Context Types: scheduled, ondemand, userinterface, aborted, skipped
 * @returns {Void}
 */
function GD_Update2019ModelOptions_Sch(type)
{
	var ordersToUpdate = GetSteppedSearchResults('salesorder', [new nlobjSearchFilter('custbodygd_includeinoptgroupupdate', null, 'is', 'T'),
	                                                            new nlobjSearchFilter('mainline', null, 'is', 'T')], new nlobjSearchColumn('internalid'));
	if(ordersToUpdate != null)
	{
		for(var i = 0; i < ordersToUpdate.length; i++)
		{
			var salesOrder = nlapiLoadRecord('salesorder', ordersToUpdate[i].getId());
			var modelId = salesOrder.getFieldValue('custbodyrvsmodel');
			var orderWasChanged = false;
			for(var j = 1; j <= salesOrder.getLineItemCount('item'); j++)
			{
				if(salesOrder.getLineItemValue('item', 'custcolrvsitemcategory', j) == UNITORDER_ITEMCATEGORYOPTIONID)
				{
					if(nlapiGetContext().getRemainingUsage() < 100) nlapiYieldScript();
					
					//Set the Model Option Group column on any Option Rows that belong to an Option Group on the Model.
					var modelGroupResult = nlapiSearchRecord('customrecordrvsmodeloption', null, [new nlobjSearchFilter('custrecordmodeloption_model', null, 'is', modelId),
					                                                                              new nlobjSearchFilter('component', 'custrecordmodeloption_option', 'anyof', salesOrder.getLineItemValue('item', 'item', j))], new nlobjSearchColumn('custrecordmodeloption_option'));
					if(modelGroupResult != null && modelGroupResult.length > 0)
					{
						salesOrder.setLineItemValue('item', 'custcolrvs_modeloptionitemgroup', j, modelGroupResult[0].getValue('custrecordmodeloption_option'));
						orderWasChanged = true;
					}
				}
			}
			
			if(orderWasChanged)
			{
				//Only submit the order if we updated any of the lines - this saves a bunch of time.
				salesOrder.setFieldValue('custbodygd_includeinoptgroupupdate', 'F');
				nlapiSubmitRecord(salesOrder);
			}
			else
			{
				//Otherwise just mark that we checked this order.
				nlapiSubmitField('salesorder', salesOrder.getId(), 'custbodygd_includeinoptgroupupdate', 'F');
			}
			
			//Update percent complete, yield if necessary.
			if(nlapiGetContext().getRemainingUsage() < 100) nlapiYieldScript();
			nlapiGetContext().setPercentComplete(((i+1)/ordersToUpdate.length)*100);
		}
	}
}
