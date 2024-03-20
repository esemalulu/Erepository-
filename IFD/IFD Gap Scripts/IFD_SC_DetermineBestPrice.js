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
 * Module Description
 * 
 * Version    Date			Author           Remarks
 * 1.00       2016 Jun 15		gruiz
 * 
 */
/**
 * Scheduled Script
 * 
 * @param {string}
 *            type - context types: scheduled, ondemand, userinterface, aborted, skipped
 * @returns {void}
 */

var START_TIMESTAMP = new Date().getTime();
var USAGE_THRESHOLD = 100;
var STEP = '';
var OBJ_ITEM_RATE = {};

function scheduled_determineBestPrice(type)
{
	var stLoggerTitle = 'scheduled_determineBestPrice';

	try
	{
		nlapiLogExecution('DEBUG', stLoggerTitle, '****** SCHEDULED SCRIPT START =>' + Date());

		STEP = '.Initialization';
		var objContext = nlapiGetContext();
		var stSOSearchId = objContext.getSetting('SCRIPT', 'custscript_ifd_sosearch');
		var stItemPricingSearchId = objContext.getSetting('SCRIPT', 'custscript_ifd_searchcustitemcombo');
		var stCustomerItemPricingRecord = 'customrecord_item_pricing_cust';
		var stWeeklyInterval = objContext.getSetting('SCRIPT', 'custscript_ifd_refresh_weekly');
		var stMonthlyInterval = objContext.getSetting('SCRIPT', 'custscript_ifd_refresh_monthly');
		var stOnDemandInterval = objContext.getSetting('SCRIPT', 'custscript_ifd_refresh_ondemand');
		var stTempDate = objContext.getSetting('SCRIPT', 'custscript_ifd_temporarydate');
		var stInitError = '';
		var bExitScript = false;

		if(Eval.isEmpty(stSOSearchId))
		{
			stInitError += 'Sales Order search parameter should not be empty. Please check the script parameter and try again.';
			bExitScript = true;
		}

		if(Eval.isEmpty(stItemPricingSearchId))
		{
			stInitError = 'Rebate Agreement Saved Search is missing: ' + stItemPricingSearchId;
			bExitScript = true;
		}

		if(Eval.isEmpty(stWeeklyInterval) || Eval.isEmpty(stMonthlyInterval) || Eval.isEmpty(stOnDemandInterval))
		{
			stInitError += '| Refresh Intervals must be initiated. Weekly Interval: ' + stFridayInterval + ' | Monthly Interval: '
					+ stMonthlyInterval + ' | On Demand: ' + stOnDemandInterval;
			bExitScript = true;
		}

		if(bExitScript)
		{
			throw nlapiCreateError('99999', 'Error(s) found on ' + stLoggerTitle + STEP + ':' + stInitError + ' | ****** SCHEDULED SCRIPT EXIT =>'
					+ Date());
		}

		/* ========================= SO Processing =================== */

		STEP = '.SearchSalesOrders';

		var arrSalesOrders = NSUtils.search('transaction', stSOSearchId);
		var intSalesOrdersLength = arrSalesOrders.length;

		if(intSalesOrdersLength > 0)
		{

			for(var intCtr = 0; intCtr < intSalesOrdersLength; intCtr++)
			{
				try
				{

					var objSO = arrSalesOrders[intCtr]; // 9005
					var bUpdate = false;

					var stSOId = objSO.getId();
					var stCustomerId = objSO.getValue('entity'); // rafe2
					var arrItems = [];

					STEP = '.LoadSalesOrder:' + stSOId;
					var recSO = nlapiLoadRecord('salesorder', stSOId);
					var START_TIMESTAMP = NSUtils.rescheduleScript(USAGE_THRESHOLD, START_TIMESTAMP);

					var stCustomer = recSO.getFieldValue('entity');
					var stLineCount = recSO.getLineItemCount('item');

					STEP = '.LoopThroughSOLines';
					for(var intCtrA = 1; intCtrA <= stLineCount; intCtrA++)
					{
						/* Get Customer-Item Combination */
						var stItemId = recSO.getLineItemValue('item', 'item', intCtrA);
						if(!OBJ_ITEM_RATE[stItemId + ' | ' + stCustomer])
						{
							arrItems.push(stItemId);

						}

					}

					STEP = '.SearchCustomerItemPricing';

					if(!Eval.isEmpty(arrItems))
					{
						var arrFilters = [];
						arrFilters.push(new nlobjSearchFilter('custrecord_cip_customer', null, 'anyof', stCustomer));
						arrFilters.push(new nlobjSearchFilter('custrecord_cip_item', null, 'anyof', arrItems));

						var arrItemPricing = NSUtils.search(stCustomerItemPricingRecord, stItemPricingSearchId, arrFilters);
						var intItemPricingLength = arrItemPricing.length;

						if(intItemPricingLength > 0)
						{

							for(var intCtrB = 0; intCtrB < intItemPricingLength; intCtrB++) // custom record
							{
								try
								{
									var objItemPricing = arrItemPricing[intCtrB];

									var stUpdateFrequency = objItemPricing.getValue('custrecord_cip_updatefreq');
									var stItemPricingItem = objItemPricing.getValue('custrecord_cip_item');
									var stItemPricingCustomer = objItemPricing.getValue('custrecord_cip_customer');
									var flMarkupDollar = Parse.forceFloat(objItemPricing.getValue('custrecord_contract_markup_dollar',
											'CUSTRECORD_CIP_CONTRACT'));
									var flMarkupPercent = Parse.forceFloat(objItemPricing.getValue('custrecord_contract_markup_percent',
											'CUSTRECORD_CIP_CONTRACT'));
									var flAdminFeeDollar = Parse.forceFloat(objItemPricing.getValue('custrecord_contract_admin_fee_dollar',
											'CUSTRECORD_CIP_REBAGREEMENT_DETAIL'));
									var flAdminFeePercent = Parse.forceFloat(objItemPricing.getValue('custrecord_ifd_contractadminfeepercent',
											'CUSTRECORD_CIP_REBAGREEMENT_DETAIL'));
									var flRebateDollar = Parse.forceFloat(objItemPricing.getValue('custrecord_nsts_rm_rebate_amount',
											'CUSTRECORD_CIP_REBAGREEMENT_DETAIL'));
									var flRebatePercent = Parse.forceFloat(objItemPricing.getValue('custrecord_nsts_rm_rebate_percent',
											'CUSTRECORD_CIP_REBAGREEMENT_DETAIL'));

									var flFrozenLandedCost = 0.00;
									var flTotalAdminFee = 0.00;
									var flTotalRebates = 0.00;
									var flSellingPrice = 0.00;

									/* Compute for the selling price */
									if(stUpdateFrequency == stWeeklyInterval)
									{
										flFrozenLandedCost = Parse.forceFloat(objItemPricing.getValue('custitem_flc_weekly', 'CUSTRECORD_CIP_ITEM'));
									}
									else if(stUpdateFrequency == stMonthlyInterval)
									{

										flFrozenLandedCost = Parse.forceFloat(objItemPricing.getValue('custitem_flc_monthly', 'CUSTRECORD_CIP_ITEM'));
									}
									else if(stUpdateFrequency == stOnDemandInterval)
									{

										flFrozenLandedCost = Parse.forceFloat(objItemPricing.getValue('custitem_frozen_landed_cost',
												'CUSTRECORD_CIP_ITEM'));
									}

									if(flMarkupPercent == 0 && flMarkupDollar > 0)
									{
										// var flMarkupDollar = Parse.forceFloat(stMarkupDollar);

										/* Dollar computations */
										flTotalAdminFee = flAdminFeeDollar + (flRebateDollar * flAdminFeePercent);
										flTotalRebates = flRebateDollar - flTotalAdminFee;
										flTotalRebates = forceZero(flTotalRebates);

										flSellingPrice = (flFrozenLandedCost - flTotalRebates) + flMarkupDollar;
									}

									else if(flMarkupPercent > 0 && flMarkupDollar == 0)
									{
										// var flMarkupPercent = Parse.forceFloat(stMarkupPercent);

										/* Percentage computations */
										flTotalAdminFee = flAdminFeeDollar + (flFrozenLandedCost * flRebatePercent * flAdminFeePercent);
										flTotalRebates = (flFrozenLandedCost * flRebatePercent) + flTotalAdminFee;
										flTotalRebates = forceZero(flTotalRebates);

										// var temp = flFrozenLandedCost - flTotalRebates;
										flSellingPrice = (flFrozenLandedCost - flTotalRebates) * (1 + flMarkupPercent);
									}

									else
									{
										nlapiLogExecution('DEBUG', stLoggerTitle + STEP, 'No Markup was found.');
									}

									nlapiLogExecution('DEBUG', stLoggerTitle + STEP, 'Computation variables: Frozen Landed Cost: '
											+ flFrozenLandedCost + ' | Total Rebates: ' + flTotalRebates + ' | Total Admin Fee: ' + flTotalAdminFee
											+ ' | Markup(s): $' + flMarkupDollar + ' or ' + flMarkupPercent + '%');

									// var flSellingPrice = Parse.forceFloat(objItemPricing.getValue('custrecord_ifd_sellingprice',
									// 'custrecord_cip_rebagreement_detail'));
									OBJ_ITEM_RATE[stItemPricingItem + ' | ' + stItemPricingCustomer] = flSellingPrice;
									nlapiLogExecution('DEBUG', stLoggerTitle + STEP, 'Item: ' + stItemPricingItem + ' Selling Price: '
											+ flSellingPrice);

									var START_TIMESTAMP = NSUtils.rescheduleScript(USAGE_THRESHOLD, START_TIMESTAMP);

								}

								catch(error)
								{
									if(error.getDetails != undefined)
									{
										nlapiLogExecution('ERROR', 'Process Error', 'Unable to ' + STEP + ': ' + error.getCode() + ': '
												+ error.getDetails());
									}
									else
									{
										nlapiLogExecution('ERROR', 'Unexpected Error', 'Unable to ' + STEP + ': ' + error.toString());
									}
								}
							}

							STEP = '.UpdateLineLevelItems';
							for(var intCtrD = 1; intCtrD <= stLineCount; intCtrD++)
							{
								/* Get Customer-Item Combination */
								var stItemId = recSO.getLineItemValue('item', 'item', intCtrD);
								var flCurrentRate = Parse.forceFloat(recSO.getLineItemValue('item', 'rate', intCtrD));
								var flPrice = OBJ_ITEM_RATE[stItemId + ' | ' + stCustomer];

								if(flPrice)
								{
									recSO.setLineItemValue('item', 'rate', intCtrD, flPrice);
									bUpdate = true;
									nlapiLogExecution('DEBUG', stLoggerTitle + STEP, '[Idx' + intCtrD + ' ]Rate changed from: ' + flCurrentRate
											+ ' to: ' + flPrice);
								}
							}

						}

						else
						{
							nlapiLogExecution('DEBUG', stLoggerTitle + STEP, 'No Agreement Detail(s) with customer ' + stCustomer + ' and item(s): ['
									+ arrItems + '] exist.');

							STEP = '.InsertNSNativePricing';

							/* Begin searching for NS Native Pricing */
							var recCustomer = nlapiLoadRecord('customer', stCustomer);
							// var intItemPricingCount = recCustomer.getLineItemCount('itempricing');
							var stPriceLevel = '';
							var stUnitPrice = '';

							for(var intCtrArr = 0; intCtrArr < arrItems.length; intCtrArr++)
							{

								var stCurrentItem = arrItems[intCtrArr];

								/* 1. Check for item pricing in Financial Tab > Item Pricing */
								var intIdx = recCustomer.findLineItemValue('itempricing', 'item', stCurrentItem);

								stPriceLevel = recCustomer.getLineItemValue('itempricing', 'level', intIdx);
								stUnitPrice = recCustomer.getLineItemValue('itempricing', 'price', intIdx);

								if(Eval.isEmpty(stUnitPrice))
								{
									try
									{
										var recItem = nlapiLoadRecord('inventoryitem', stCurrentItem);
										/* 2. If none for #1, Check for group pricing in Financial Tab > Group Pricing. Skip for now */
										var stItemPricingGroup = recItem.getFieldValue('pricinggroup');

										var intLine = recItem.findLineItemValue('grouppricing', 'group', stItemPricingGroup);
										stPriceLevel = recItem.getLineItemValue('grouppricing', 'level', intLine);

										if(Eval.isEmpty(stPriceLevel))
										{

											/* 3. If none for #2, Check for price level set in Customer Record (field). */
											stPriceLevel = recCustomer.getFieldValue('pricelevel');

											if(Eval.isEmpty(stPriceLevel))
											{

												/* 4. If none for #3, Check for price level set in item Record. From Base Price all the way to the last price level */
												var intPriceLevelCount = recItem.getLineItemCount('price');

												for(var intPLevels = 1; intPLevels <= intPriceLevelCount; intPLevels++)
												{
													// general assumption that record only uses 1 column
													stPriceLevel = recCustomer.getLineItemValue('price', 'pricelevel', intPLevels);
													stUnitPrice = recCustomer.getLineItemMatrixValue('itempricing', 'price', intPLevels, 1);

												}
											}
										}

										nlapiLogExecution('DEBUG', stLoggerTitle + STEP, 'Price Level used: ' + stPriceLevel);

									}

									catch(error)
									{
										if(error.getDetails != undefined)
										{
											nlapiLogExecution('ERROR', 'Process Error', 'Unable to ' + STEP + ': ' + error.getCode() + ': '
													+ error.getDetails());

										}
										else
										{
											nlapiLogExecution('ERROR', 'Unexpected Error', 'Unable to ' + STEP + ': ' + error.toString());

										}
									} /* end try-catch block */

								} /* end if-else block */

								/* Use the rate from price level */

								// OBJ_ITEM_RATE[stEligibleItem + ' | ' + stCustomer] = flSellingPrice;
							} /* end for block */

							STEP = '.UpdateLineLevelItemsUsingNSNative';
							for(var intCtrD = 1; intCtrD <= stLineCount; intCtrD++)
							{
								/* Get Customer-Item Combination */
								var stItemId = recSO.getLineItemValue('item', 'item', intCtrD);

								for(var intIdx = 0; intIdx < arrItems.length; intIdx++)
								{
									if(stItemId == arrItems[intIdx])
									{

										recSO.setLineItemValue('item', 'price', intCtrD, stPriceLevel);
										bUpdate = true;
									}
								}

								// if(flPrice)
								// {
								// nlapiLogExecution('DEBUG', stLoggerTitle + STEP, '[Idx' + intCtrD + ' ]Price Level changed to: ' + stPriceLevel);
								// }
							}

						}
					}

					var START_TIMESTAMP = NSUtils.rescheduleScript(USAGE_THRESHOLD, START_TIMESTAMP);

					if(bUpdate)
					{
						var stUpdatedSO = nlapiSubmitRecord(recSO);
						nlapiLogExecution('AUDIT', stLoggerTitle + STEP, 'Sales Order ' + stUpdatedSO + ' updated');
					}

				}

				catch(error)
				{
					if(error.getDetails != undefined)
					{
						nlapiLogExecution('ERROR', 'Process Error', 'Unable to ' + STEP + ': ' + error.getCode() + ': ' + error.getDetails());

					}
					else
					{
						nlapiLogExecution('ERROR', 'Unexpected Error', 'Unable to ' + STEP + ': ' + error.toString());

					}
				}

				var START_TIMESTAMP = NSUtils.rescheduleScript(USAGE_THRESHOLD, START_TIMESTAMP);
			}
		}

		else
		{
			nlapiLogExecution('DEBUG', stLoggerTitle + STEP, 'No Sales Orders available for processing');
		}

	}

	catch(error)
	{
		if(error.getDetails != undefined)
		{
			nlapiLogExecution('ERROR', 'Process Error', 'Unable to ' + STEP + ': ' + error.getCode() + ': ' + error.getDetails());
			throw error;
		}
		else
		{
			nlapiLogExecution('ERROR', 'Unexpected Error', 'Unable to ' + STEP + ': ' + error.toString());
			throw nlapiCreateError('99999', error.toString());
		}
	}

	nlapiLogExecution('DEBUG', stLoggerTitle + STEP, '****** SCHEDULED SCRIPT EXIT =>' + Date());
}

// Determines if customer item pricing record should run for this SO
function determineRefreshInterval(stRefreshInterval, stWeeklyInterval, stMonthlyInterval, stOnDemandInterval, dtDateToday)
{
	STEP = '.DetermineRefreshInterval';
	var stLoggerTitle = 'determineRefreshInterval';

	nlapiLogExecution('DEBUG', stLoggerTitle + STEP, 'Refresh Interval: ' + stRefreshInterval);

	// var dtDateToday = new Date('05/27/2016');

	var dtTempDate = new Date(dtDateToday.getFullYear(), dtDateToday.getMonth() + 1, 0); // get last day of month
	var stDateToday = nlapiDateToString(dtDateToday);
	var intFriday = 5; /* JS Native constants. 5 = Friday 6 = Saturday, 0 = Sunday. Friday is the assumed last working day. */
	var intSaturday = 6;
	var intSunday = 0;

	if(stRefreshInterval == stWeeklyInterval)
	{
		nlapiLogExecution('DEBUG', stLoggerTitle + STEP, 'Date Today: ' + dtDateToday + ' | Refresh Interval: Weekly(' + stRefreshInterval + ').');

		if(dtDateToday.getDay() == intFriday)
		{
			return true;
		}

	}
	else if(stRefreshInterval == stMonthlyInterval)
	{
		STEP = '.DetermineIfLastBusinessDayOfMonth';

		var intLastDay = dtTempDate.getDay();
		var intSubtractDays = 0;

		// If we encounter a weekend, let's force the day to become a Friday workday
		if(intLastDay == intSaturday)
		{
			intSubtractDays = -1;
		}
		else if(intLastDay == intSunday)
		{
			intSubtractDays = -2;
		}

		dtTempDate = nlapiAddDays(dtTempDate, intSubtractDays);

		nlapiLogExecution('DEBUG', stLoggerTitle + STEP, 'Date Today: ' + dtDateToday + ' | Refresh Interval: Monthly(' + stRefreshInterval + ').');

		if(dtDateToday.getTime() == dtTempDate.getTime())
		{
			return true;
		}

	}

	return false;

}

function forceZero(flValue)
{
	var stLoggerTitle = 'forceZero';

	if(isNaN(flValue) || (flValue == Infinity) || flValue < 0)
	{
		nlapiLogExecution('DEBUG', stLoggerTitle, 'Value is negative/infinite/NaN. Transformed ' + flValue + ' to 0.');
		return 0;
	}

	return flValue;
}