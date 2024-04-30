nlapiLogExecution("audit","FLOStart",new Date().getTime());
/**
 * Copyright (c) 1998-2016 NetSuite, Inc.
 * 2955 Campus Drive, Suite 100, San Mateo, CA, USA 94403-2511
 * All Rights Reserved.
 *
 * This software is the confidential and proprietary information of
 * NetSuite, Inc. ("Confidential Information"). You shall not
 * disclose such Confidential Information and shall use it only in
 * accordance with the terms of the license agreement you entered into
 * with NetSuite.
 *
 * Version    Date            Author            Remarks
 * 1.00       09 Sep 2016     jbcuanan			Initial version
 * 2.00		May 5 2017 		  Shraddha Shah		Updated the script to not execute for Edit type and not execute if No Surcharges check box is TRUE
 * 2.01		Mar 25 2022		  Kalyani Chintala	NS Case# 4633114
 */

/**
 * Adds a Fuel Surcharge Item depending on the customer's Fuel Surcharge Type
 */
function beforeSubmit_fuelSurcharge(type)
{
	try
	{
		var stLogTitle = 'beforeSubmit_fuelSurcharge';
		nlapiLogExecution('DEBUG', stLogTitle, 'START | type = ' + type);

		var noSurcharge = nlapiGetFieldValue('custbody_ifd_nosurchargesapply');
		nlapiLogExecution('DEBUG', stLogTitle, 'no Surcharge = ' + noSurcharge);
		if (type != 'create' || noSurcharge == 'T') //type != 'edit')
		{
			nlapiLogExecution('DEBUG', stLogTitle, 'Exit. Invalid type or no surcharge.');
			return;
		}

		var objCtx = nlapiGetContext();

		var stFuelSurcharge_Fixed = objCtx.getSetting('SCRIPT', 'custscript_fs_fixed');// Fuel Surcharge - Fixed
		var stFuelSurcharge_Variable = objCtx.getSetting('SCRIPT', 'custscript_fs_variable');// Fuel Surcharge - Variable
		var stFuelSurcharge_None = objCtx.getSetting('SCRIPT', 'custscript_fs_none');// Fuel Surcharge - None
		var stItem_FixedFuelSurcharge = objCtx.getSetting('SCRIPT', 'custscript_item_fixedfs');// Item - Fixed Fuel Surcharge
		var stItem_VariableFuelSurcharge = objCtx.getSetting('SCRIPT', 'custscript_item_variablefs');// Item - Variable Fuel Surcharge
		var excludeItemsStr = objCtx.getSetting('SCRIPT', 'custscript_excl_item_frm_surchg_calc');
		if(excludeItemsStr == null || excludeItemsStr == undefined)
			excludeItemsStr = '';
		else
		{
			var tmpExcludeItems = excludeItemsStr.split('|');
			excludeItemsStr = '|';
			for(var idx=0; idx < tmpExcludeItems.length; idx++)
			{
				var tmpItem = tmpExcludeItems[idx] == null || tmpExcludeItems[idx] == undefined ? '' : tmpExcludeItems[idx];
				tmpItem = tmpItem.trim();
				if(tmpItem == '')
					continue;

				excludeItemsStr += tmpItem + '|';
			}
		}
		nlapiLogExecution('Debug', 'Checking', 'excludeItemsStr: ' + excludeItemsStr);

		nlapiLogExecution('DEBUG', stLogTitle, 'stFuelSurcharge_Fixed = ' + stFuelSurcharge_Fixed
			+ ', stFuelSurcharge_Variable = ' + stFuelSurcharge_Variable
			+ ', stFuelSurcharge_None = ' + stFuelSurcharge_None
			+ ', stItem_FixedFuelSurcharge = ' + stItem_FixedFuelSurcharge
			+ ', stItem_VariableFuelSurcharge = ' + stItem_VariableFuelSurcharge);

		var arrEmptyParams = [];
		if(NSUtil.isEmpty(stFuelSurcharge_Fixed)) arrEmptyParams.push('Fuel Surcharge - Fixed');
		if(NSUtil.isEmpty(stFuelSurcharge_Variable)) arrEmptyParams.push('Fuel Surcharge - Variable');
		if(NSUtil.isEmpty(stFuelSurcharge_None)) arrEmptyParams.push('Fuel Surcharge - None');
		if(NSUtil.isEmpty(stItem_FixedFuelSurcharge)) arrEmptyParams.push('Item - Fixed Fuel Surcharge');
		if(NSUtil.isEmpty(stItem_VariableFuelSurcharge)) arrEmptyParams.push('Item - Variable Fuel Surcharge');

		if (!NSUtil.isEmpty(arrEmptyParams))
		{
			nlapiLogExecution('ERROR', stLogTitle, 'Exit. Please configure the following missing parameter/s for the script NS | UE Fuel Surcharge: ' + arrEmptyParams.join(', '));
			throw nlapiCreateError('MISSING_PARAMS', 'Exit. Please configure the following missing parameter/s for the script NS | UE Fuel Surcharge: ' + arrEmptyParams.join(', '));
		}

		var stEntity = nlapiGetFieldValue('entity');
		nlapiLogExecution('DEBUG', stLogTitle, 'stEntity = ' + stEntity);

		if (!NSUtil.isEmpty(stEntity))
		{
			var stFuelSurchargeTxn = nlapiGetFieldValue('custbody_fuel_surcharge_type');
			var stItemToAdd = '';
			var stRate = '';
			// 10052016|jbcuanan - for amount computation when Fuel Surcharge Type of customer = Variable
			var flAmt = 0, flSurchargeQty = 1;
			var bIsRemoveFSCItems = false;

			if(stFuelSurchargeTxn == stFuelSurcharge_None) //None
			{
				//Added this IF check as part of NS Case# 4633114
				bIsRemoveFSCItems = true;
			}
			else
			{
				var entityFldVals = nlapiLookupField('customer', stEntity, ['custentity_fuel_surcharge_type', 'custentity_fuel_surcharge_amount']);

				//var stFuelSurcharge = nlapiLookupField('customer', stEntity, 'custentity_fuel_surcharge_type');
				var stFuelSurcharge = entityFldVals.custentity_fuel_surcharge_type;
				var entityFuelSurchargeRate = entityFldVals.custentity_fuel_surcharge_amount;
				nlapiLogExecution('DEBUG', stLogTitle, 'stFuelSurcharge = ' + stFuelSurcharge + ', entityFuelSurchargeRate: ' + entityFuelSurchargeRate);

				if (!NSUtil.isEmpty(stFuelSurcharge))
				{
					// customer's fuel surcharge = fixed
					if (stFuelSurcharge == stFuelSurcharge_Fixed)
					{
						stItemToAdd = stItem_FixedFuelSurcharge;
						stRate = entityFuelSurchargeRate;

						flAmt = stRate;
						bIsRemoveFSCItems = true;
					}
					// customer's fuel surcharge = variable
					else if (stFuelSurcharge == stFuelSurcharge_Variable)
					{
						stItemToAdd = stItem_VariableFuelSurcharge;
						stRate = entityFuelSurchargeRate;
						nlapiLogExecution('Debug', 'Checking', 'stRate: ' + stRate);

						// 10052016|jbcuanan - START for amount computation when Fuel Surcharge Type of customer = Variable
						var intLineItemCount = nlapiGetLineItemCount('item');
						var arrFuelSCItems = [stItem_FixedFuelSurcharge, stItem_VariableFuelSurcharge];
						nlapiLogExecution('DEBUG', stLogTitle, 'intLineItemCount = ' + intLineItemCount + ', arrFuelSCItems = ' + arrFuelSCItems);

						var flTotQtyShipped = 0;

						for (var i = 1; i <= intLineItemCount; i++)
						{
							var stItem = nlapiGetLineItemValue('item', 'item', i);
							if(excludeItemsStr.indexOf('|' + stItem + '|') > -1)
								continue;
							//nlapiLogExecution('DEBUG', stLogTitle, 'stItem = ' + stItem + ', i = ' + i);

							if (!NSUtil.isEmpty(stItem) && !NSUtil.inArray(stItem, arrFuelSCItems))
							{
								var stQty = nlapiGetLineItemValue('item', 'quantity', i);
								var flQty = NSUtil.forceFloat(stQty);
								nlapiLogExecution('DEBUG', stLogTitle, 'stQty = ' + stQty + ', flQty = ' + flQty + ', i = ' + i);
								flTotQtyShipped += flQty;
							}
						}

						flSurchargeQty = flTotQtyShipped;
						flAmt = (flTotQtyShipped * NSUtil.forceFloat(stRate)).toFixed(2);
						// 10052016|jbcuanan - END for amount computation when Fuel Surcharge Type of customer = Variable

						bIsRemoveFSCItems = true;
					}
					//nlapiLogExecution('DEBUG', stLogTitle, 'stItemToAdd = ' + stItemToAdd + ', stRate = ' + stRate);
				}
			}

			nlapiLogExecution('Debug', 'Checking', 'Surcharge Qty: ' + flTotQtyShipped + ', rATE: ' + stRate + ', Amt: ' + flAmt);
			// remove existing Fuel Surchage Items
			if (bIsRemoveFSCItems && type == 'edit')
			{
				var intLineItemCount = nlapiGetLineItemCount('item');
				var arrFuelSCItems = [stItem_FixedFuelSurcharge, stItem_VariableFuelSurcharge];
				nlapiLogExecution('DEBUG', stLogTitle, 'intLineItemCount = ' + intLineItemCount + ', arrFuelSCItems = ' + arrFuelSCItems);

				var arrRemovedLines = [];
				for (var i = intLineItemCount; i >= 1; i--)
				{
					var stItem = nlapiGetLineItemValue('item', 'item', i);
					//nlapiLogExecution('DEBUG', stLogTitle, 'stItem = ' + stItem + ', i = ' + i);

					if (!NSUtil.isEmpty(stItem) && NSUtil.inArray(stItem, arrFuelSCItems))
					{
						nlapiRemoveLineItem('item', i);
						arrRemovedLines.push(i);
					}
				}

				nlapiLogExecution('DEBUG', stLogTitle, 'arrRemovedLines = ' + arrRemovedLines);
			}

			if(stFuelSurchargeTxn == stFuelSurcharge_None)
				return;

			// add new line item based on the customer's fuel surcharge value
			nlapiSelectNewLineItem('item');
			nlapiSetCurrentLineItemValue('item', 'item', stItemToAdd, true, true);
			nlapiSetCurrentLineItemValue('item', 'rate', NSUtil.forceFloat(stRate), false, false);
			nlapiSetCurrentLineItemValue('item', 'quantity', flSurchargeQty, false, false);
			// 10052016|jbcuanan - for amount computation when Fuel Surcharge Type of customer = Variable
			if (stFuelSurcharge == stFuelSurcharge_Variable)
			{
				nlapiSetCurrentLineItemValue('item', 'amount', flAmt, false, false);
			}
			nlapiCommitLineItem('item');
		}

		nlapiLogExecution('DEBUG', stLogTitle, 'EXIT');
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
			throw nlapiCreateError('99999', error.toString(), true);
		}

		return false;
	}
}

String.prototype.trim = function() {
	return this.replace(/^\s+|\s+$/g,"");
};

// START - Utility/Helper Functions
var NSUtil =
	{
		/**
		 * Evaluate if the given string or object value is empty, null or undefined.
		 * @param {String} stValue - string or object to evaluate
		 * @returns {Boolean} - true if empty/null/undefined, false if not
		 * @author mmeremilla
		 */
		isEmpty : function(stValue)
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
		},

		/**
		 * Converts string to float. If value is infinity or can't be converted to a number, 0.00 will be returned.
		 * @param {String} stValue - any string
		 * @returns {Number} - a floating point number
		 * @author jsalcedo
		 */
		forceFloat : function(stValue)
		{
			var flValue = parseFloat(stValue);

			if (isNaN(flValue) || (stValue == Infinity))
			{
				return 0.00;
			}

			return flValue;
		},

		/**
		 * Evaluate if the given string is an element of the array, using reverse looping
		 * @param {String} stValue - String value to find in the array
		 * @param {String[]} arrValue - Array to be check for String value
		 * @returns {Boolean} - true if string is an element of the array, false if not
		 */
		inArray : function(stValue, arrValue)
		{
			var bIsValueFound = false;
			for (var i = arrValue.length - 1; i >= 0; i--)
			{
				if (stValue == arrValue[i])
				{
					bIsValueFound = true;
					break;
				}
			}
			return bIsValueFound;
		},
	};