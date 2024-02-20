/**
 * Updates 2018 Models to 2019 Models on Unit Orders.
 * 
 * Version    Date            Author           Remarks
 * 1.00       06 Feb 2018     Jacob Shetler
 *
 */

var MODELYEAR_2019 = '7';
var WINTERIZATION_ITEMS = ['24775', '24772', '24773', '37685', '24774', '24771', '38167'];
var UNITORDER_ITEMCATEGORYOPTIONID = GetItemCategoryOptionId();

/**
 * Mass Update Entry
 * 
 * @param {String} recType Record type internal id
 * @param {Number} recId Record internal id
 * @returns {Void}
 */
function GD_Update2018To2019Models_MU(recType, recId)
{
	//Load the Order
	var salesOrder = nlapiLoadRecord(recType, recId, {recordmode: 'dynamic'});
	
	//Get the new Model for the current Model on the Order.
	var oldModelId = salesOrder.getFieldValue('custbodyrvsmodel');
	var newModelCols = [new nlobjSearchColumn('custitemrvs_msrplevel')];
	var newModelResults = nlapiSearchRecord('assemblyitem', null, [new nlobjSearchFilter('custitemrvs_modelline', null, 'anyof', nlapiLookupField('item', oldModelId, 'custitemrvs_modelline')),
	                                                               new nlobjSearchFilter('custitemrvsmodelyear', null, 'is', MODELYEAR_2019)], newModelCols);
	var newModelId = newModelResults[0].getId();
	
	//Determine what the new MSRP Price Level is and whether or not it changed. If it changed, then we need to update the 
	var newMSRPLevel = ConvertNSFieldToString(newModelResults[0].getValue('custitemrvs_msrplevel'));
	if(newMSRPLevel == '') newMSRPLevel = salesOrder.getFieldValue('custbodyrvsmsrppricelevel');
	var msrpLevelChanged = newMSRPLevel != salesOrder.getFieldValue('custbodyrvsmsrppricelevel');
	salesOrder.setFieldValue('custbodyrvsmsrppricelevel', newMSRPLevel);
	
	//Update the Model in the header of the order and in the line items.
	salesOrder.setFieldValue('custbodyrvsmodel', newModelId);
	//Loop through the lines items and:
	// 1. Find the old model line and change it to be the new model line
	// 2. Remove the Winterization Option if it exists.
	// 3. Set the Model Option Group column on any Option Rows that belong to an Option Group on the New Model.
	for (var i = salesOrder.getLineItemCount('item'); i > 0; i--)
	{
		var curItemId = salesOrder.getLineItemValue('item', 'item', i);
		if (curItemId == oldModelId)
		{
			// 1. Find the old model line and change it to be the new model line. Also update the MSRP amount on the line.
			salesOrder.selectLineItem('item', i);
			salesOrder.setCurrentLineItemValue('item', 'item', newModelId);
			var msrp = 0;
			if(newMSRPLevel != null && newMSRPLevel != '')
				msrp = GetItemAmountForPriceLevel(newModelId, newMSRPLevel);
			else
				msrp = GetMSRPForItem(newModelId);
			salesOrder.setCurrentLineItemValue('item', 'custcolrvsmsrpamount', msrp);
			salesOrder.commitLineItem('item');
		}
		else if (WINTERIZATION_ITEMS.indexOf(curItemId) > -1)
		{
			// 2. Remove the Winterization Option if it exists.
			salesOrder.removeLineItem('item', i);
		}
		else if (salesOrder.getLineItemValue('item', 'custcolrvsitemcategory', i) == UNITORDER_ITEMCATEGORYOPTIONID)
		{
			// 3. Set the Model Option Group column on any Option Rows that belong to an Option Group on the New Model.
			var modelGroupResult = nlapiSearchRecord('customrecordrvsmodeloption', null, [new nlobjSearchFilter('custrecordmodeloption_model', null, 'is', newModelId),
			                                                                              new nlobjSearchFilter('component', 'custrecordmodeloption_option', 'is', curItemId)], new nlobjSearchColumn('custrecordmodeloption_option'));
			if(modelGroupResult != null && modelGroupResult.length > 0)
			{
				salesOrder.selectLineItem('item', i);
				salesOrder.setCurrentLineItemValue('item', 'custcolrvs_modeloptionitemgroup', modelGroupResult[0].getValue('custrecordmodeloption_option'));
				salesOrder.commitLineItem('item');
			}
		}
	}
	
	//If the MSRP Price Level changed on the order, then we need to recalc all of the MSRP column values.
	//We can do this at the end so we don't end up calculating values we might remove during the other loop.
	if(msrpLevelChanged)
	{
		for (var i = salesOrder.getLineItemCount('item'); i > 0; i--)
		{
			salesOrder.selectLineItem('item', i);
			var msrp = 0;
			if(newMSRPLevel != null && newMSRPLevel != '')
				msrp = GetItemAmountForPriceLevel(salesOrder.getLineItemValue('item', 'item', i), newMSRPLevel);
			else
				msrp = GetMSRPForItem(salesOrder.getLineItemValue('item', 'item', i));
			salesOrder.setCurrentLineItemValue('item', 'custcolrvsmsrpamount', msrp);
			salesOrder.commitLineItem('item');
		}
	}
	
	//Save the Order
	nlapiSubmitRecord(salesOrder, true);
	
	//Update the Unit to have the new Model.
	nlapiSubmitField('customrecordrvsunit', salesOrder.getFieldValue('custbodyrvsunit'), 'custrecordunit_model', newModelId, true);
}
