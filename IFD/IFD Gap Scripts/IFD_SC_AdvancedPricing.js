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
 * 1.00       2016 Apr 19	gruiz
 * 2.00		  2016 May 02	gruiz			Design overhaul
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
var USAGE_THRESHOLD = 500;
var STEP = '';

function scheduled_advancedPricing(type)
{
	var stLoggerTitle = 'scheduled_advancedPricing';

	try
	{
		nlapiLogExecution('DEBUG', stLoggerTitle, '****** SCHEDULED SCRIPT START =>' + Date());

		STEP = '.Initialization';
		var objContext = nlapiGetContext();
		var stRebateAgreementSearchId = objContext.getSetting('SCRIPT', 'custscript_ifd_searchrebateagreements');
		var stFridayInterval = objContext.getSetting('SCRIPT', 'custscript_ifd_refresh_everyfri');
		var stLastBusinessDayInterval = objContext.getSetting('SCRIPT', 'custscript_ifd_refresh_lastdayofmon');
		// var stCostPlusAttribute = objContext.getSetting('SCRIPT', 'custscript_ifd_costplusattrib');
		// var stFixedAttribute = objContext.getSetting('SCRIPT', 'custscript_ifd_fixedattrib');
		var stBeforeMarkup = objContext.getSetting('SCRIPT', 'custscript_ifd_dpa_beforemarkup');
		var stAfterMarkup = objContext.getSetting('SCRIPT', 'custscript_ifd_dpa_aftermarkup');
		// var stRebateAgreementRecord = 'customrecord_nsts_rm_rebate_agreement';
		var stGuaranteedCost = objContext.getSetting('SCRIPT', 'custscript_ifd_guaranteedcalc');
		var stAgreementDetailRecord = 'customrecord_nsts_rm_agreement_detail';
		var stTempDate = objContext.getSetting('SCRIPT', 'custscript_ifd_tempdate');
		var stInventoryPart = 'InvtPart';
		var stInitError = '';
		var bExitScript = false;

		if(Eval.isEmpty(stRebateAgreementSearchId))
		{
			stInitError = 'Rebate Agreement Saved Search is missing: ' + stRebateAgreementSearchId;
			bExitScript = true;
		}

		if(Eval.isEmpty(stFridayInterval) || Eval.isEmpty(stLastBusinessDayInterval))
		{
			stInitError += '| Refresh Intervals must be initiated. Every Friday Interval: ' + stFridayInterval
					+ ' | Monthly Last Business Day Interval: ' + stLastBusinessDayInterval;
			bExitScript = true;
		}

		if(Eval.isEmpty(stGuaranteedCost))
		{
			stInitError += '| Guaranteed Cost calculation method must be populated. Calculation Method: Guaranteed Cost: ' + stGuaranteedCost;
			bExitScript = true;

		}

		// if(Eval.isEmpty(stFixedAttribute) || Eval.isEmpty(stCostPlusAttribute))
		// {
		// stInitError += '| Contract Price Types should both be defined: Fixed Attribute: ' + stFixedAttribute + ' | Cost-Plus Attribute: '
		// + stCostPlusAttribute;
		// bExitScript = true;
		// }

		if(bExitScript)
		{
			throw nlapiCreateError('99999', 'Error(s) found on ' + stLoggerTitle + STEP + ':' + stInitError + ' | ****** SCHEDULED SCRIPT EXIT =>'
					+ Date());
		}

		STEP = '.SearchActiveRebateAgreements';

		/* Search for contract records */
		var arrAgreementDetails = NSUtils.search(stAgreementDetailRecord, stRebateAgreementSearchId);
		var arrRebateAgreementsLength = arrAgreementDetails.length;

		if(arrRebateAgreementsLength > 0)
		{

			var objMasterCustomer = {};
			var objCustomerItemMap = {};
			var arrMasterCustomer = [];

			for(var intCtrA = 0; intCtrA < arrRebateAgreementsLength; intCtrA++)
			{
				try
				{
					STEP = '.GetRebateAgreementDetails';

					var objAgreements = arrAgreementDetails[intCtrA];

					var stAgreementId = objAgreements.getId();
					var stRebateId = objAgreements.getValue('id', 'CUSTRECORD_NSTS_RM_REBATE_AGREEMENT');
					var stAgreementStart = objAgreements.getValue('custrecord_nsts_rm_agreement_start_date');
					var stAgreementEnd = objAgreements.getValue('custrecord_nsts_rm_agreement_end_date');
					// var stContractStatus = objAgreements.getValue('custrecord_ifd_contract_status');
					var stRefreshInterval = objAgreements.getValue('custrecord_ifd_contract_refreshinterval', 'CUSTRECORD_NSTS_RM_REBATE_AGREEMENT');
					var stCustomerId = objAgreements.getValue('custrecord_nsts_rm_eligible_customer');
					var stItemId = objAgreements.getValue('custrecord_nsts_rm_eligible_item');
					var stRebateType = objAgreements.getValue('custrecord_nsts_rm_rebate_agreement_type');
					var stCalculationMethod = objAgreements.getValue('custrecord_nsts_rm_calculation_method');

					var flFrozenLandedCost = Parse.forceFloat(objAgreements.getValue('custrecord_ifd_frozenlandedcost'));
					var flGuaranteedAmount = Parse.forceFloat(objAgreements.getValue('custrecord_ifd_guaranteedamt'));
					var flAdminFeeDollar = Parse.forceFloat(objAgreements.getValue('custrecord_contract_admin_fee_dollar'));
					var flAdminFeePercent = Parse.forceFloat(objAgreements.getValue('custrecord_ifd_contractadminfeepercent')) / 100;
					// var flAdminFeePercent = Parse.forceFloat(objAgreements.getValue('custrecord_ifd_contractadminfeepercent'));
					var flMarkupDollar = Parse.forceFloat(objAgreements.getValue('custrecord_ifd_line_markupdollar'));
					var flMarkupPercent = Parse.forceFloat(objAgreements.getValue('custrecord_ifd_line_markuppercent'));
					var flRebateDollar = Parse.forceFloat(objAgreements.getValue('custrecord_nsts_rm_rebate_amount'));
					var flRebatePercent = Parse.forceFloat(objAgreements.getValue('custrecord_nsts_rm_rebate_percent'));
					var flRebateCost = Parse.forceFloat(objAgreements.getValue('custrecord_nsts_rm_rebate_cost'));
					var flLastPurchasePrice = Parse.forceFloat(objAgreements.getValue('custrecord_ifd_lastpurchaseprice'));
					// var flLastPurchasePrice = Parse.forceFloat(objAgreements.getValue('lastpurchaseprice', 'CUSTRECORD_NSTS_RM_ELIGIBLE_ITEM'));

					var flBillback = 0.00;
					var flCost = 0.00;
					var flTotalAdminFee = 0.00;
					var flTotalRebates = 0.00;
					var flCostToCompute = 0.00;

					// var stContractId = objRebates.getValue('internalid');
					// var stCustomerSearchId = objRebates.getValue('custrecord_contract_customer_search');
					// var stItemSearchId = objRebates.getValue('custrecord_contract_item_search');
					var dtDateToday;

					if(Eval.isEmpty(stTempDate))
					{
						dtDateToday = new Date();
					}

					else
					{
						dtDateToday = nlapiStringToDate(stTempDate);
					}

					// var dtDateToday = new Date('05/27/2016');

					var dtTempDate = new Date(dtDateToday.getFullYear(), dtDateToday.getMonth() + 1, 0); // get last day of month
					var stDateToday = nlapiDateToString(dtDateToday);
					var intFriday = 5; /* JS Native constants. 5 = Friday 6 = Saturday, 0 = Sunday */
					var intSaturday = 6;
					var intSunday = 0;
					// var flFrozenLandedCost = Parse.forceFloat(objContract.getValue('custrecord_frozen_landed_cost'));

					/* Contract refresh interval is validated via Script Parameter. Add a new script parameter if necessary */

					STEP = '.DetermineRefreshInterval';

					if(stRefreshInterval == stFridayInterval)
					{
						STEP = '.DetermineIfFridayToday';
						if(dtDateToday.getDay() == intFriday)
						{
							// do script
						}

						nlapiLogExecution('DEBUG', stLoggerTitle + STEP, 'Date Today: ' + dtDateToday + ' | Refresh Interval: Every Friday('
								+ stRefreshInterval + ').');

					}
					else if(stRefreshInterval == stLastBusinessDayInterval)
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

						if(dtDateToday.getTime() == dtTempDate.getTime())
						{
							// do script
						}

						nlapiLogExecution('DEBUG', stLoggerTitle + STEP, 'Date Today: ' + dtDateToday
								+ ' | Refresh Interval: Every Last Friday of the Month(' + stRefreshInterval + ').');

					}
					else
					{
						nlapiLogExecution('DEBUG', stLoggerTitle + STEP, 'Rebate ID: ' + stAgreementId
								+ ' is not ready for processing. Refresh Interval: ' + stRefreshInterval + 'Date today: ' + dtDateToday);
					}

					STEP = '.GetCustomerItemCombination';

					// objMasterCustomer.rebateid = stAgreementId;
					objMasterCustomer.agreementId = stAgreementId;
					objMasterCustomer.rebateId = stRebateId;
					objMasterCustomer.customer = stCustomerId;
					objMasterCustomer.item = stItemId;

					// rebate ID = Z1, customer = A, item = A, price = $5
					// rebate ID = Z3, customer = A, item = A, price = $10
					/* Define a key to add price into */

					STEP = '.DetermineCalculationMethod';

					if(stCalculationMethod == stGuaranteedCost)
					{
						flRebateDollar = flLastPurchasePrice - flGuaranteedAmount; // serves as the billback amount
					}

					nlapiLogExecution('DEBUG', stLoggerTitle + STEP, 'Calculation Method (ID) for this Agreement Detail: ' + stCalculationMethod);

					STEP = '.DetermineRebateType';

					if(stRebateType == stBeforeMarkup)
					{

						if(flMarkupPercent > 0 || flMarkupDollar > 0) // can use flmarkup != 0
						{
							if(flMarkupPercent == 0 && flMarkupDollar > 0)
							{
								/* Dollar computations */
								flTotalAdminFee = flAdminFeeDollar + (flRebateDollar * flAdminFeePercent);
								flTotalRebates = flRebateDollar - flTotalAdminFee;
								flTotalRebates = forceZero(flTotalRebates);

								flCost = (flFrozenLandedCost - flTotalRebates) + flMarkupDollar;
							}

							else if(flMarkupDollar == 0 && flMarkupPercent > 0)
							{
								/* Percentage computations */
								flTotalAdminFee = flAdminFeeDollar + (flFrozenLandedCost * flRebatePercent * flAdminFeePercent);
								flTotalRebates = (flFrozenLandedCost * flRebatePercent) + flTotalAdminFee;
								flTotalRebates = forceZero(flTotalRebates);

								// var temp = flFrozenLandedCost - flTotalRebates;
								flCost = (flFrozenLandedCost - flTotalRebates) * (1 + flMarkupPercent);
							}
						}

						nlapiLogExecution('DEBUG', stLoggerTitle + STEP, 'DPA Type: ' + stRebateType + ' | Frozen Cost: ' + flFrozenLandedCost
								+ ' | DPA: ' + flRebateDollar + ' | Guaranteed Amount: ' + flGuaranteedAmount + ' | Markup: ' + flMarkupDollar
								+ ' | Computed Cost: ' + flCost);

					}

					else if(stRebateType == stAfterMarkup)
					{

						if(flMarkupPercent > 0 || flMarkupDollar > 0) // validation just put flc if both are 0
						{
							if(flMarkupPercent == 0 && flMarkupDollar > 0)
							{
								/* ========== Markup =========== */

								/* Dollar computations */
								flTotalAdminFee = flAdminFeeDollar + (flRebateDollar * flAdminFeePercent);
								flTotalRebates = flRebateDollar - flTotalAdminFee;
								flTotalRebates = forceZero(flTotalRebates);

								flCost = (flFrozenLandedCost + flMarkupDollar) - flTotalRebates;
							}
							else if(flMarkupDollar == 0 && flMarkupPercent > 0)
							{
								/* Percentage computations */
								flTotalAdminFee = flAdminFeeDollar + (flFrozenLandedCost * flRebatePercent * flAdminFeePercent);
								flTotalRebates = flTotalRebates + flTotalAdminFee;
								flTotalRebates = forceZero(flTotalRebates);

								flCost = (flFrozenLandedCost * (1 + flMarkupPercent)) - flTotalRebates;
							}
						}

						nlapiLogExecution('DEBUG', stLoggerTitle + STEP, 'DPA Type: ' + stRebateType + ' | Frozen Cost: ' + flFrozenLandedCost
								+ ' | DPA: ' + flRebateDollar + '| Guaranteed Amount: ' + flGuaranteedAmount + ' | Markup: ' + flMarkupPercent
								+ ' | Computed Cost: ' + flCost);
					}

					if(flMarkupPercent == 0 && flMarkupDollar == 0)
					{

						flCost = (flFrozenLandedCost + flMarkupDollar) - flTotalRebates;
					}

					/* Arrange cost to 2 decimal places without rounding */
					flCost = Math.floor(flCost * 100) / 100;

					objMasterCustomer.sellprice = flCost;

					STEP = '.AssembleMasterObjectArray';

					arrMasterCustomer.push(objMasterCustomer);

					/* Clear out objects and arrays for next loop */
					objMasterCustomer = {};

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
			}

			STEP = '.UpdateRebateAgreementRecord';

			var intMasterArrCount = arrMasterCustomer.length;

			if(intMasterArrCount > 0)
			{

				for(var intCtrB = 0; intCtrB < intMasterArrCount; intCtrB++)
				{
					var stRebate = arrMasterCustomer[intCtrB].rebateId;

					var stAgreement = arrMasterCustomer[intCtrB].agreementId;
					var flSellingPrice = arrMasterCustomer[intCtrB].sellprice;
					var stItem = arrMasterCustomer[intCtrB].item;
					var stCustomer = arrMasterCustomer[intCtrB].customer;

					// objCustomerItemMap[stCustomer + ' | ' + stItem] = flSellingPrice;

					nlapiSubmitField(stAgreementDetailRecord, stAgreement, 'custrecord_ifd_sellingprice', flSellingPrice);
					nlapiLogExecution('AUDIT', stLoggerTitle + STEP, 'Success updating Record! ID: ' + stAgreement + ' | Price: ' + flSellingPrice);

				}
			}

		}

		else
		{
			nlapiLogExecution('DEBUG', stLoggerTitle, 'No Contract Records found');
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

	STEP = '.ExitScript';
	nlapiLogExecution('DEBUG', stLoggerTitle + STEP, '****** SCHEDULED SCRIPT EXIT =>' + Date());
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
