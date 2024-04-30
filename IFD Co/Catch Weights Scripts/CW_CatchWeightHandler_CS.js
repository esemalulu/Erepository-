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
 * Version    Date			  Author				Remarks
 * 1.00       24 Jul 2015     jerfernandez			Demo version
 * 1.10       08 Jun 2016     memeremilla			Initial version (working copy). Standardization of code to adhere to MTS coding guidelines (all functions).
 * 1.20		  14 Sept 2018    mgotsch			   	Disabling CW field after it has been input by script
 * 1.21       24 Oct 2018     dlapp             	Price UM Field Change Updates
 * 1.22       30 Oct 2018     mgotsch				Restricting processing to CW items
 * 1.23       03 Jan 2018     mgotsch				Optimization for governance
 */

//-- Import cw_util.js
var F_CATCH_WEIGHT = 0; //used global variable for parent-child window variable accessibility
var N_LINE_NUM = 1;

/**
 * Page init function
 * @param {String} type
 */
function cwDetailPageInit(type)
{

	var stRecType = nlapiGetRecordType();


	if (stRecType == 'workorderissue')
	{
		var intNLines = nlapiGetLineItemCount(SUBLIST_COMPONENTS);
		for (var intCtr = 1; intCtr <= intNLines; intCtr++)
		{
			var flCatchWeight = NSUtil.forceFloat(nlapiGetLineItemValue(SUBLIST_COMPONENTS, FLD_CW_WOI_CATCH_WEIGHT, intCtr));
			if (flCatchWeight > 0)
			{
				nlapiSetLineItemDisabled(SUBLIST_COMPONENTS, FLD_CW_WOI_CATCH_WEIGHT, true, intCtr);
			}
		}
	}
	else if (stRecType == 'workordercompletion')
	{
		var flCatchWeight = NSUtil.forceFloat(nlapiGetFieldValue(FLD_CW_WO_CATCH_WEIGHT));
		if (flCatchWeight > 0)
		{
			nlapiDisableField(FLD_CW_WO_CATCH_WEIGHT, true);
		}
	}

	else
	{

		var stItemLines = nlapiGetLineItemCount('item');

		for(var intCtr = 1; intCtr <= stItemLines; intCtr++)
		{

			var stItemId = nlapiGetLineItemValue('item', 'item', intCtr);
			//var stIsCatchWeightItem = nlapiLookupField('item', stItemId, FLD_CATCH_WEIGHT_ITEM); v1.23
			var stIsCatchWeightItem = nlapiGetLineItemValue('item', 'custcol_cw_indicator', intCtr); //v1.23 switching from lookupField to pull from line item
			var flWeight = NSUtil.forceFloat(nlapiGetCurrentLineItemValue('item', COL_CATCH_WEIGHT)); //v1.20
			var intCWId = NSUtil.forceFloat(nlapiGetCurrentLineItemValue('item', 'custcol_ifd_cwrecordid')); //v1.20

			if((flWeight > 0 && !NSUtil.isEmpty(intCWId)) || stIsCatchWeightItem != 'T') //v1.20
			{
				console.log('setting disabled');
				// nlapiSetLineItemDisabled('item', COL_CATCH_WEIGHT, true, intCtr); // 24 Oct: DLapp: Commented out temporarily since Suitelet is not functioning
			} else {
				console.log('not setting disabled');
			}
		}
	}
}

/**
 * Execute this when submit button is clicked on the Catch Weight Details subrecord/popup
 */
function cwDetailsSaveRecord(stIdCWD)
{
	try
	{
		var stRecType = nlapiGetRecordType();

		if (stRecType == 'workorderissue')
		{
			var intNLineIndex = N_LINE_NUM;
			nlapiSelectLineItem(SUBLIST_COMPONENTS, intNLineIndex);
			nlapiSetCurrentLineItemValue(SUBLIST_COMPONENTS, FLD_CW_WOI_CATCH_WEIGHT, F_CATCH_WEIGHT, true, true);

			var flWeight = NSUtil.forceFloat(nlapiGetCurrentLineItemValue(SUBLIST_COMPONENTS, FLD_CW_WOI_CATCH_WEIGHT));

			if (flWeight > 0)
			{
				nlapiSetLineItemDisabled(SUBLIST_COMPONENTS, FLD_CW_WOI_CATCH_WEIGHT, true, intNLineIndex);
			}
			else
			{
				nlapiSetLineItemDisabled(SUBLIST_COMPONENTS, FLD_CW_WOI_CATCH_WEIGHT, false, intNLineIndex);
			}
		}
		else if (stRecType == 'workordercompletion')
		{
			if (N_LINE_NUM == 0)
			{
				nlapiSetFieldValue(FLD_CW_WO_CATCH_WEIGHT, F_CATCH_WEIGHT);

				if (F_CATCH_WEIGHT > 0)
				{
					nlapiDisableField(FLD_CW_WO_CATCH_WEIGHT, true);
				}
				else
				{
					nlapiDisableField(FLD_CW_WO_CATCH_WEIGHT, false);
				}
			}
			else
			{
				var intNLineIndex = N_LINE_NUM;
				nlapiSelectLineItem(SUBLIST_COMPONENTS, intNLineIndex);
				nlapiSetCurrentLineItemValue(SUBLIST_COMPONENTS, FLD_CW_WOI_CATCH_WEIGHT, F_CATCH_WEIGHT, true, true);

				var flWeight = NSUtil.forceFloat(nlapiGetCurrentLineItemValue(SUBLIST_COMPONENTS, FLD_CW_WOI_CATCH_WEIGHT));

				if (flWeight > 0)
				{
					console.log('setting disabled');
					nlapiSetLineItemDisabled(SUBLIST_COMPONENTS, FLD_CW_WOI_CATCH_WEIGHT, true, intNLineIndex);
				}
				else
				{
					nlapiSetLineItemDisabled('keeping undisabled');
					nlapiSetLineItemDisabled(SUBLIST_COMPONENTS, FLD_CW_WOI_CATCH_WEIGHT, false, intNLineIndex);
				}
			}
		}
		else
		{

			// //Check total weight margin
			// if(stVarianceFlag == 'positive')
			// {
				// alert('Catch Weight exceeds the threshold of ' + flVarianceValue);
				// return false;
			// }

			// else if(stVarianceFlag == 'negative')
			// {
				// alert('Catch Weight does not meet the threshold of ' + flVarianceValue);
				// return false;
			// }

			nlapiSelectLineItem('item', N_LINE_NUM);
			var intNLineIndex = nlapiGetCurrentLineItemIndex('item');
			nlapiSetCurrentLineItemValue('item', COL_CATCH_WEIGHT, F_CATCH_WEIGHT, false, true);
			nlapiSetCurrentLineItemValue('item', 'custcol_ifd_cwrecordid', stIdCWD, false, true);

			var fWeight = NSUtil.forceFloat(nlapiGetCurrentLineItemValue('item', COL_CATCH_WEIGHT));

			if (fWeight > 0)
			{
				nlapiSetLineItemDisabled('item', COL_CATCH_WEIGHT, true, intNLineIndex);
			}
			else
			{
				nlapiSetLineItemDisabled('item', COL_CATCH_WEIGHT, false, intNLineIndex);
			}
		}

	}

	catch (error)
	{
		if (error.getDetails != undefined)
		{
			nlapiLogExecution('ERROR', 'Process Error', error.getCode() + ': ' + error.getDetails());
			alert(error);
		}
		else
		{
			nlapiLogExecution('ERROR', 'Unexpected Error', error.toString());
			alert(nlapiCreateError('99999', error.toString()));
		}
	}

	//The succeeding codes are implemented to close the popup that was called via nlExtOpenWindow
	//This implementation was kept to retain the intended output and it would be safe since the form is not native but a suitelet

	//Check if NS supports jQuery else use DOM manipulation
	// if (typeof jQuery !== 'undefined')
	// {
	// 	var arrElements = jQuery(':contains(' + HC_POPUP_WINDOW_TITLE + ')').find('[class*="close"]')
	// 	if (!NSUtil.isEmpty(arrElements))
	// 	{
	// 		arrElements.click();
	// 	}
	// }
	// else
	// {
	// 	document.getElementsByClassName('x-tool x-tool-close')[0].click();
	// }
}

/**
 * Field changed function
 * @param {String} type
 * @param {String} name
 * @param {String} linenum
 */
function cwUpdateRateFieldChanged(type, name, linenum)
{
	var flCatchWeight = NSUtil.forceFloat(nlapiGetCurrentLineItemValue('item', COL_CATCH_WEIGHT));

  if (type == 'item' && name == COL_PRICE_UM) { // v1.21
    var stRecType = nlapiGetRecordType();
    if (stRecType == 'itemreceipt') {
		console.log('Updating IR line # ' + linenum + '; Price/Price UM');
      nlapiSelectLineItem('item', linenum);
			var stIdItem = nlapiGetLineItemValue('item','item',linenum); //v1.22
			//var bCatchWeightItem = nlapiLookupField('item', stIdItem, FLD_CATCH_WEIGHT_ITEM); //v1.22 looking up whether or not item is a CW item v1/23 commented out
			var bCatchWeightItem = nlapiGetLineItemValue('item', 'custcol_cw_indicator', linenum); //v1.23 switching from lookupField to pull from line item
			if(bCatchWeightItem == 'T') { //v1.22 if it is a cw, complete processing. if not, do not update
				var inActWt = nlapiGetCurrentLineItemValue('item', COL_CATCH_WEIGHT);
			console.log('Actual Weight: '+ inActWt);

	      var inPriceUM = nlapiGetCurrentLineItemValue('item', COL_PRICE_UM);
			console.log('Price/Price UM: '+ inPriceUM);

	      var inNewRate;

	      if (!NSUtil.isEmpty(inActWt)) {
	        // Price UM * Act Wt / Qty
	        var inQty = nlapiGetCurrentLineItemValue('item', 'quantity');
	        inNewRate = inPriceUM * inActWt / inQty;
	      } else {
	        // Price UM * Avg Wt
	        //var inAvgWt = nlapiGetCurrentLineItemIndex('item', COL_AVG_WGHT);	//v1.22 this should be line item value
	        var inAvgWt = nlapiGetCurrentLineItemValue('item', COL_AVG_WGHT);	//v1.22 this should be line item value
	        inNewRate = inPriceUM * inAvgWt;
	      }
	      nlapiSetCurrentLineItemValue('item', 'rate', inNewRate);
			} //v1.22
    }
  }

	if (type == 'item' && name == COL_CATCH_WEIGHT)
	{
		var stRecType = nlapiGetRecordType();

		//Update rate
		if (stRecType == 'itemreceipt')
		{
			console.log('Updating IR line # ' + linenum + '; Actual Weight');
			nlapiSelectLineItem('item', linenum);
			var stIdItem = nlapiGetLineItemValue('item','item',linenum);//v1.22
			//var bCatchWeightItem = nlapiLookupField('item', stIdItem, FLD_CATCH_WEIGHT_ITEM); //v1.22 looking up whether or not item is a CW item v1/23 commented out
			var bCatchWeightItem = nlapiGetLineItemValue('item', 'custcol_cw_indicator', linenum); //v1.23 switching from lookupField to pull from line item
			if(bCatchWeightItem == 'T') { //v1.22 if it is a cw, complete processing. if not, do not update
				var flPriceUM = NSUtil.forceFloat(nlapiGetCurrentLineItemValue('item', COL_PRICE_UM)) || NSUtil.forceFloat(nlapiGetCurrentLineItemValue('item', 'rate'));
				var flQty = NSUtil.forceFloat(nlapiGetCurrentLineItemValue('item', 'quantity'));
				var flRate = (flPriceUM * flCatchWeight) / flQty;
	
				if (flCatchWeight < 0)
				{
					alert('You cannot enter a negative Catch Weight Value.');
					nlapiSetCurrentLineItemValue('item', COL_CATCH_WEIGHT, 1, true, true);
				}
	
				nlapiSetCurrentLineItemValue('item', 'rate', flRate, true, true);
			} //v1.22
		}

		// Determine if more than threshold (both IR/IF)
		var stItemId = nlapiGetLineItemValue('item', 'item', linenum);

		var objCWItemDetails = nlapiLookupField('item', stItemId, [FLD_CW_WEIGHT_TOLERANCE, 'weight']);


		var flWeightTolerance = NSUtil.forceFloat(objCWItemDetails.custitem_jf_cw_weight_tolerance);
		flWeightTolerance /= 100;
		var flItemWeight = NSUtil.forceFloat(objCWItemDetails.weight);

		var flQty = NSUtil.forceFloat(nlapiGetLineItemValue('item', 'quantity', linenum));
		var flVariance = flQty * flItemWeight;
		var flThreshold =  flVariance * flWeightTolerance;
		var flPosVariance = flVariance + flThreshold;
		var flNegVariance = flVariance - flThreshold;

		if(flCatchWeight > flPosVariance)
		{
			alert('Catch Weight exceeds the threshold of ' + flPosVariance);
			return false;
		}

		else if(flCatchWeight < flNegVariance)
		{
			alert('Catch Weight does not meet the threshold of ' + flNegVariance);
			return false;
		}

	}

	//Reset Catch Weight Col so user can enter new weight
	if(type == 'item' && name == 'quantity')
	{
		var stItemId = nlapiGetLineItemValue('item', 'item', linenum);

		//var stIsCatchWeightItem = nlapiLookupField('item', stItemId, FLD_CATCH_WEIGHT_ITEM); v1.23 commenting out
		var stIsCatchWeightItem = nlapiGetLineItemValue('item', 'custcol_cw_indicator', linenum); //v1.23 switching from lookupField to pull from line item

		if(stIsCatchWeightItem == 'T')
		{
			nlapiSetLineItemValue('item', COL_CATCH_WEIGHT, linenum, '');
			nlapiSetLineItemDisabled('item', COL_CATCH_WEIGHT, false, linenum);
		}
	}

	if (stRecType == 'itemfulfillment')
	{
		var flCatchWeight = NSUtil.forceFloat(nlapiGetCurrentLineItemValue('item', COL_CATCH_WEIGHT));
		if (flCatchWeight < 0)
		{
			alert('You cannot enter a negative Catch Weight Value.');
			nlapiSetCurrentLineItemValue('item', COL_CATCH_WEIGHT, 1, true, true);
		}
	}

	//Work Order Completion Catch Weight field value validation
	if (name == FLD_CW_WO_CATCH_WEIGHT)
	{
		var flCatchWeight = NSUtil.forceFloat(nlapiGetFieldValue(FLD_CW_WO_CATCH_WEIGHT));

		if (flCatchWeight < 0)
		{
			alert('You cannot enter a negative Catch Weight Value.');
			nlapiSetFieldValue(FLD_CW_WO_CATCH_WEIGHT, 1);
		}
	}

	if (type == SUBLIST_COMPONENTS && name == FLD_CW_WOI_CATCH_WEIGHT)
	{
		var flCatchWeight = NSUtil.forceFloat(nlapiGetCurrentLineItemValue(SUBLIST_COMPONENTS, FLD_CW_WOI_CATCH_WEIGHT));
		if (flCatchWeight < 0)
		{
			alert('You cannot enter a negative Catch Weight Value.');
			nlapiSetCurrentLineItemValue(SUBLIST_COMPONENTS, FLD_CW_WOI_CATCH_WEIGHT, 1, false, true);
		}
	}

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
	intDecimalPlace = (intDecimalPlace == null || intDecimalPlace == '') ? 0 : intDecimalPlace

	var intMultiplierDivisor = Math.pow(10, intDecimalPlace);
	flReturn = Math.round((parseFloat(flDecimalNumber) * intMultiplierDivisor).toFixed(intDecimalPlace)) / intMultiplierDivisor;
	flReturn = (bNegate) ? (flReturn * -1).toFixed(intDecimalPlace) : flReturn.toFixed(intDecimalPlace);

	return flReturn;
};
