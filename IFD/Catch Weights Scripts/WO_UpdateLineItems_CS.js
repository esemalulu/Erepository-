/**
 * Copyright (c) 1998-2016 NetSuite, Inc.
 * 2955 Campus Drive, Suite 100, San Mateo, CA, USA 94403-2511
 * All Rights Reserved.
 * 
 * This software is the confidential and proprietary information of NetSuite, Inc. ("Confidential Information").
 * You shall not disclose such Confidential Information and shall use it only in accordance with the terms of the license agreement
 * you entered into with NetSuite.
 */

/**
 * Module Description:
 * 
 * 
 * Version    Date				Author				Remarks
 * 1.00       22 Jul 2015     jerfernandez			Demo version
 * 1.10       08 Jun 2016     memeremilla			Initial version (working copy)
 * 1.20       27 Sept 2018    mgotsch				Updating unused varaibles
 * 1.21		  09 Oct  2018	  dweinstein			Updating to use proper util variables based on record type
 */

//'use strict';

//-- Import cw_util.js
var B_ASSEMBLY_ITEMS_POST_SOURCE = false;

/**
 * Page init function
 * @param {String} type
 */
function woPageInit(type)
{

}

/**
 * Post sourcing function.
 * 
 * @param {String} type Sublist internal id
 * @param {String} name Field internal id
 * @return {void}
 */
function woLineItemsClientPostSourcing(type, name)
{
	try
	{
		var stLoggerTitle = 'woLineItemsClientPostSourcing'
		//nlapiLogExecution('DEBUG', stLoggerTitle, '**** START: Script entry point function.****' + ' | Type: ' + type + ' | Name: ' + name);

		if (type != 'item')
		{
			return;
		}
		var stRecUpdate = nlapiGetRecordType();

		if (name == 'item')
		{
			var stItemId = nlapiGetCurrentLineItemValue('item', 'item');

			if (NSUtil.isEmpty(stItemId))
			{
				return;
			}

			var objItemFldValue = nlapiLookupField('item', stItemId,
				[
				        FLD_CATCH_WEIGHT_ITEM, 'weight', FLD_ITEM_CATCH_WEIGHT_PRICING_UNIT , 'unitstype' //v1.21 changed to updated FLD_ITEM_CATCH_WEIGHT_PRICING_UNIT from COL_PRICING_UNIT 
				]);
			var objItemFldTxtValue = nlapiLookupField('item', stItemId,
				[
					'purchaseunit'
				], true);

			var stBCatchWeightItem = objItemFldValue[FLD_CATCH_WEIGHT_ITEM];

			if (stBCatchWeightItem == 'T')
			{
				var stUnitFld = 'purchaseunit';
				var stWeightUnitFld = FLD_ITEM_CATCH_WEIGHT_PRICING_UNIT; //v1.21 change back to updated FLD_ITEM_CATCH_WEIGHT_PRICING_UNIT
				//var stWeightUnitFld = COL_PRICING_UNIT; //v1.20

				var flWeight = NSUtil.forceFloat(objItemFldValue['weight']);
				var stWeightUnitName = objItemFldValue[stWeightUnitFld];
				var stUnitName = objItemFldTxtValue['purchaseunit'];
				var stIdPhysicalUnitsType = objItemFldValue['unitstype'];
				var flConversionRate = NSUtil.forceFloat(getUOMConversionRate(stUnitName, stIdPhysicalUnitsType));
				var flPurchasePrice = NSUtil.forceFloat(getVendorPurchasePrice(stItemId));
				var flAvgWeight = NSUtil.forceFloat(flWeight * flConversionRate);

				var flQty = NSUtil.forceFloat(nlapiGetCurrentLineItemValue('item', 'quantity'));
				var flCost = NSUtil.forceFloat((flAvgWeight * flPurchasePrice) / flQty);

				if (stRecUpdate == 'workorder')
				{
					var stIdPhysicalUnitsType = objItemFldValue['unitstype'];
					var flUMRate = NSUtil.forceFloat(getUOMAbbrevConversionRate(nlapiGetCurrentLineItemText('item', 'units'), stIdPhysicalUnitsType));

					flPurchasePrice = flPurchasePrice / flUMRate;
					var flRate = NSUtil.forceFloat(flAvgWeight * flPurchasePrice);
					flCost = flRate;

					nlapiSetCurrentLineItemValue('item', COL_PRICE_UM, NSUtil.roundDecimalAmount(flPurchasePrice, 2));
					nlapiSetCurrentLineItemValue('item', COL_AVG_WGHT, flAvgWeight);
					nlapiSetCurrentLineItemValue('item', 'rate', flCost);
				}
			}
		}
		else if (name == 'units')
		{
			var stItemId = nlapiGetCurrentLineItemValue('item', 'item');

			if (NSUtil.isEmpty(stItemId))
			{
				return;
			}

			var objItemFldValue = nlapiLookupField('item', stItemId,
				[
				        FLD_CATCH_WEIGHT_ITEM, 'weight', FLD_ITEM_CATCH_WEIGHT_PRICING_UNIT, 'unitstype' //v1.21 changed to updated FLD_ITEM_CATCH_WEIGHT_PRICING_UNIT from COL_PRICING_UNIT 
				]);
			var objItemFldTxtValue = nlapiLookupField('item', stItemId,
				[
					'purchaseunit'
				], true);

			var flQty = NSUtil.forceFloat(nlapiGetCurrentLineItemValue('item', 'quantity'));
			var stIdPhysicalUnitsType = objItemFldValue['unitstype'];
			var flUMRate = NSUtil.forceFloat(getUOMAbbrevConversionRate(nlapiGetCurrentLineItemText('item', 'units'), stIdPhysicalUnitsType));
			var flWeight = NSUtil.forceFloat(objItemFldValue['weight']);
			var flAvgWeight = flWeight * flUMRate;

			var flPurchasePrice = NSUtil.forceFloat(getVendorPurchasePrice(stItemId));

			var flRate = NSUtil.forceFloat(flAvgWeight * flPurchasePrice);
			var flCost = flRate;

			flPurchasePrice = flPurchasePrice / flUMRate;
			nlapiSetCurrentLineItemValue('item', COL_PRICE_UM, NSUtil.roundDecimalAmount(flPurchasePrice, 2));
			nlapiSetCurrentLineItemValue('item', 'rate', flCost);
			nlapiSetCurrentLineItemValue('item', COL_AVG_WGHT, flAvgWeight);
		}

		//nlapiLogExecution('DEBUG', stLoggerTitle, '**** END: Script entry point function.****');
	}
	catch (error)
	{
		if (error.getDetails != undefined)
		{
			nlapiLogExecution('ERROR', 'Process Error', error.getCode() + ': ' + error.getDetails());
			throw error;
		}
		else
		{
			nlapiLogExecution('ERROR', 'Unexpected Error', error.toString());
			throw nlapiCreateError('99999', error.toString());
		}
	}
}

/**
 * Validate line function
 * @param {String} type
 * @param {String} name
 * @returns {Boolean}
 */
function woUpdateLinesValidateLine(type, name, linenum)
{
	return true;
}

/**
 * Field changed function
 * @param {String} type
 * @param {String} name
 */
function woUpdateLinesFieldChanged(type, name, linenum)
{
}

//Library//
var NSUtil = (typeof NSUtil === 'undefined') ? {} : NSUtil;
/**
 * Evaluate if the given string or object value is empty, null or undefined.
 * @param {String} stValue - string or object to evaluate
 * @returns {Boolean} - true if empty/null/undefined, false if not
 * @author mmeremilla
 */
NSUtil.isEmpty = function(stValue)
{
	if ((stValue === '') //Strict checking for this part to properly evaluate integer value.
	        || (stValue == null) || (stValue == undefined))
	{
		return true;
	}
	else
	{
		if (stValue.constructor === Array)//Strict checking for this part to properly evaluate constructor type.
		{
			if (stValue.length == 0)
			{
				return true;
			}
		}
		else if (stValue.constructor === Object)//Strict checking for this part to properly evaluate constructor type.
		{
			for ( var stKey in stValue)
			{
				return false;
			}
			return true;
		}

		return false;
	}
};

/**
 * Evaluate if the given string is an element of the array, using reverse looping
 * @param {String} stValue - String value to find in the array
 * @param {String[]} arrValue - Array to be check for String value
 * @returns {Boolean} - true if string is an element of the array, false if not
 */
NSUtil.inArray = function(stValue, arrValue)
{
	var bIsValueFound = false;

	for (var i = 0; i < arrValue.length; i++)
	{
		if (stValue == arrValue[i])
		{
			bIsValueFound = true;
			break;
		}
	}
	return bIsValueFound;
};
/**
 * Converts string to float. If value is infinity or can't be converted to a number, 0.00 will be returned.
 * @param {String} stValue - any string
 * @returns {Number} - a floating point number
 * @author jsalcedo
 */
NSUtil.forceFloat = function(stValue)
{
	var flValue = parseFloat(stValue);

	if (isNaN(flValue) || (stValue == Infinity))
	{
		return 0.00;
	}

	return flValue;
};

/**
 * Round decimal number
 * @param {Number} flDecimalNumber - decimal number value
 * @param {Number} intDecimalPlace - decimal places
 *
 * @returns {Number} - a floating point number value
 * @author memeremilla and lochengco
 */
NSUtil.roundDecimalAmount = function(flDecimalNumber, intDecimalPlace)
{
	//this is to make sure the rounding off is correct even if the decimal is equal to -0.995
	var bNegate = false;
	if (flDecimalNumber < 0)
	{
		flDecimalNumber = Math.abs(flDecimalNumber);
		bNegate = true;
	}
	var flReturn = 0.00;

	if (intDecimalPlace == null || intDecimalPlace == '')
	{
		intDecimalPlace = 0;
	}

	var intMultiplierDivisor = Math.pow(10, intDecimalPlace);

	flReturn = Math.round(parseFloat(flDecimalNumber) * intMultiplierDivisor) / intMultiplierDivisor;

	if (bNegate)
	{
		flReturn = flReturn * -1;
	}

	return flReturn.toFixed(intDecimalPlace);
};
