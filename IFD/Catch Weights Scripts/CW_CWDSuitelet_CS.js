nlapiLogExecution("audit","FLOStart",new Date().getTime());
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
 * 1.00       28 Jul 2015     jerfernandez			Demo version
 * 1.10       08 Jun 2016     memeremilla			Initial version (working copy). Standardization of code to adhere to MTS coding guidelines (all functions).
 * 1.20       24 Jun 2016     gruiz					Added checking on SL for threshold using CS
 */

//--import cw_util.js
//'use strict';
var F_MARGIN, F_AVE_WEIGHT, F_ITEM_WEIGHT;

/**
 * Pageinit function
 * @param {String} type
 */
function catchWeightDetailsPageInit(type)
{
	
	var stIdItem = nlapiGetFieldValue(FLD_SL_IR_ITEM);
	
	if(NSUtil.isEmpty(stIdItem))
	{
		return;
	}
	
	var objItemFldVal = nlapiLookupField('item', stIdItem,
		[
		        FLD_CW_WEIGHT_TOLERANCE, 'weight', 'unitstype'
		], false)
	var objItemFldTxtVal = nlapiLookupField('item', stIdItem,
		[
			'stockunit'
		], true)

	
	F_MARGIN = NSUtil.forceFloat(objItemFldVal[FLD_CW_WEIGHT_TOLERANCE]);
	F_AVE_WEIGHT = NSUtil.forceFloat(objItemFldVal['weight']); //12 lb

	var flWeight = NSUtil.forceFloat(objItemFldVal['weight']);
	F_ITEM_WEIGHT = flWeight;
	
	var stUnitName = objItemFldTxtVal['stockunit'];

	var stIdPhysicalUnitsType = objItemFldVal['unitstype'];
	var flConversionRate = NSUtil.forceFloat(getUOMConversionRate(stUnitName, stIdPhysicalUnitsType));
	F_AVE_WEIGHT = F_AVE_WEIGHT * flConversionRate;

	var stNCurrentLineIndex = nlapiGetCurrentLineItemIndex(SBL_CW_DETAILS);
	var stCaseName = nlapiGetCurrentLineItemValue(SBL_CW_DETAILS, COL_SL_CASE);

	if (stNCurrentLineIndex == 0 && stCaseName == '')
	{
		nlapiSetCurrentLineItemValue(SBL_CW_DETAILS, COL_SL_CASE, 'Case ' + stNCurrentLineIndex, true, true);
		nlapiSetCurrentLineItemValue(SBL_CW_DETAILS, COL_SL_WEIGHT, 0, true, true);
	}
	
	var fTotalCWDWeight = nlapiGetFieldValue(FLD_SL_TOTAL_WEIGHT);
	window.parent.F_CATCH_WEIGHT = fTotalCWDWeight;
	
	var stLineNum = nlapiGetFieldValue(FLD_SL_IR_LINE);
	window.parent.N_LINE_NUM = stLineNum;

	nlapiSetFieldValue('custpage_ifqty', window.parent.nlapiGetLineItemValue('item', 'quantity', stLineNum));
	//nlapiSetFieldValue('custpage_cwdetailid', window.parent.nlapiGetLineItemValue('item', 'custcol_ifd_cwrecordid', stLineNum));
	
}

/**
 * Line Init function
 * @param {String} type
 */
function catchWeightDetailsLineInit(type)
{
	
	var stNCurrentLineIndex = nlapiGetCurrentLineItemIndex(SBL_CW_DETAILS);
	var stCaseName = nlapiGetCurrentLineItemValue(SBL_CW_DETAILS, COL_SL_CASE);

	if (stCaseName == '')
	{
		nlapiSetCurrentLineItemValue(SBL_CW_DETAILS, COL_SL_CASE, 'Case ' + stNCurrentLineIndex, true, true);
	}
	
	
}

/**
 * Validate line function
 * @param {String} type
 */
function catchWeightDetailsValidateLine(type)
{
	//Check if inputs are valid
	var flTotalWeight = NSUtil.forceFloat(nlapiGetFieldValue(FLD_SL_TOTAL_WEIGHT));
	var flWeight = NSUtil.forceFloat(nlapiGetCurrentLineItemValue(SBL_CW_DETAILS, COL_SL_WEIGHT));
	var flQty = NSUtil.forceFloat(nlapiGetFieldValue('custpage_ifqty'));
	var stCurrIndex = nlapiGetCurrentLineItemIndex(SBL_CW_DETAILS);
	
	if(stCurrIndex > flQty)
	{
		alert('Case numbers exceeded Quantity.');
		return false;
	}
	//Added alert message when negative value is entered
	if (flWeight < 0)
	{
		alert('You cannot enter a negative weight value.');
		return false;
	}
	//--End of negative value check

	if (NSUtil.isEmpty(flWeight))
	{
		alert('Please enter a weight value.');
		return false;
	}

	//Check Catch weight margin
	var flMarginCheck = NSUtil.forceFloat(getVariance(F_AVE_WEIGHT, flWeight));
	if (flMarginCheck > F_MARGIN) //  > 10%
	{
		alert('Warning: Weight entered is beyond threshold. Catch Weight Tolerance: ' + F_MARGIN +  '%');
		
	}	

	var stCase = nlapiGetCurrentLineItemValue(SBL_CW_DETAILS, COL_SL_CASE);
	if (NSUtil.isEmpty(stCase))
	{
		var stNCurrentLineIndex = nlapiGetCurrentLineItemIndex(SBL_CW_DETAILS);
		nlapiSetCurrentLineItemValue(SBL_CW_DETAILS, COL_SL_CASE, 'Case ' + stNCurrentLineIndex, true, true);
	}
	return true;
}

/**
 * Recalc function
 * @param {String} type
 */
function catchWeightDetailsRecalc(type)
{
		
		
	var flTotalCWDWeight = getTotalCWDWeight();
	nlapiSetFieldValue(FLD_SL_TOTAL_WEIGHT, NSUtil.roundDecimalAmount(flTotalCWDWeight, 2), true, true);
	window.parent.F_CATCH_WEIGHT = flTotalCWDWeight;
}


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
