/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       28 Sep 2017     ibrahima
 *
 */
var GD_IMAGINE_FIREPLACE_OPTION_ID = '29744';
var GD_IMAGINE_WINTERIZATION_OPTION_ID = '24775';

var SERIES_SOLITUDE = '1';
var SERIES_REFLECTION = '5';
//var SERIES_MOMENTUM = '6';
//var SERIES_AVALON = '7';
var SERIES_IMAGINE = '8';

var MODEL_TYPE_FIFTHWHEEL = '1';
var MODEL_TYPE_TRAVELTRAILER = '2';

/**
 * @param {String} recType Record type internal id
 * @param {Number} recId Record internal id
 * @returns {Void}
 */
function AddFireplacePlaceOptions_MU(recType, recId) 
{
	var fireplaceOptionIndex = -1;
	var winterizationOptionIndex = -1;
	
	var order = nlapiLoadRecord(recType, recId);
	var priceLevel = order.getFieldValue('custbodyrvsmsrppricelevel');
	
	fireplaceOptionIndex = order.findLineItemValue('item', 'item', GD_IMAGINE_FIREPLACE_OPTION_ID);
	//nlapiLogExecution('debug', 'AddFireplacePlaceOptions', 'fireplaceOptionIndex: ' + fireplaceOptionIndex);
	if(fireplaceOptionIndex < 0) //No Fireplace option on the order
	{
		winterizationOptionIndex = order.findLineItemValue('item', 'item', GD_IMAGINE_WINTERIZATION_OPTION_ID);
		
		if(winterizationOptionIndex > -1) //Insert fireplace right below the winterization option
		{
			order.insertLineItem('item', (winterizationOptionIndex + 1), false);
			order.selectLineItem('item', (winterizationOptionIndex + 1));
		}
		else //Add fireplace to the end
			order.selectNewLineItem('item');
		
		//nlapiLogExecution('debug', 'AddFireplacePlaceOptions', 'winterizationOptionIndex: ' + winterizationOptionIndex);
		order.setCurrentLineItemValue('item', 'item', GD_IMAGINE_FIREPLACE_OPTION_ID);
		order.setCurrentLineItemValue('item', 'custcolrvsmsrpamount', GetItemAmountForPriceLevel(GD_IMAGINE_FIREPLACE_OPTION_ID, priceLevel));
		order.commitLineItem('item', false);
		nlapiSubmitRecord(order, false, true);
	}
}

function GD_SetMSRPonFireplaceWinterizationLines(recType, recId)
{
	try {
		var order = nlapiLoadRecord(recType, recId);
		var priceLevel = order.getFieldValue('custbodyrvsmsrppricelevel');
		
		//---------Setting MSRP on Fireplaces-------------
		//Only Imagine SO's were updated
		fireplaceOptionId = GD_IMAGINE_FIREPLACE_OPTION_ID;
		
		fireplaceOptionIndex = order.findLineItemValue('item', 'item', fireplaceOptionId);
		if(fireplaceOptionIndex > -1) //Found a fireplace option
		{
			var msrpAmount = order.getLineItemValue('item', 'custcolrvsmsrpamount', fireplaceOptionIndex) || '';
			if(msrpAmount == ''){
				order.selectLineItem('item', fireplaceOptionIndex);
				order.setCurrentLineItemValue('item', 'custcolrvsmsrpamount', GetItemAmountForPriceLevel(fireplaceOptionId, priceLevel));
				order.commitLineItem('item');
			}
			
		}
		
		var orderSeriesId = order.getFieldValue('custbodyrvsseries');
		var orderModelId = order.getFieldValue('custbodyrvsmodel');

		//---------Setting MSRP on Winterization-------------
		var winterizationOptionId = '';
		
		if(orderSeriesId == SERIES_SOLITUDE)
			winterizationOptionId = '24771'; //STF100007
		//else if(orderSeriesId == SERIES_MOMENTUM)
		//	winterizationOptionId = '24772'; //MTF100007
		
		if(orderSeriesId == SERIES_REFLECTION)
		{
			if(orderModelId != null && orderModelId != '')
			{
				//check if model is fifth wheel or travel tariler
				var modelTypeId = nlapiLookupField('item', orderModelId, 'custitemrvsmodeltype', false);
				if(modelTypeId == MODEL_TYPE_FIFTHWHEEL)
					winterizationOptionId = '24773'; //RFF100007	
				else if(modelTypeId == MODEL_TYPE_TRAVELTRAILER)
					winterizationOptionId = '24774'; //RFT100007		
			}
		}
		else if(orderSeriesId == SERIES_IMAGINE)
			winterizationOptionId = '24775'; //IMT100007	
		
		if(winterizationOptionId != '')
		{
			winterizationOptionIndex = order.findLineItemValue('item', 'item', winterizationOptionId);
			if(winterizationOptionIndex > -1) //Found a winterization option
			{
				var msrpAmount = order.getLineItemValue('item', 'custcolrvsmsrpamount', winterizationOptionIndex) || '';
				if(msrpAmount == ''){
					order.selectLineItem('item', winterizationOptionIndex);
					order.setCurrentLineItemValue('item', 'custcolrvsmsrpamount', GetItemAmountForPriceLevel(winterizationOptionId, priceLevel));
					order.commitLineItem('item');
				}
			}
		}
		
		nlapiSubmitRecord(order, false, true);
	}
	catch(err) {
		nlapiLogExecution('error', 'error on order: ' + recId, err);
	}


	
}
