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
 * 1.00       22 Jul 2015     jerfernandez			Demo version
 * 1.10       08 Jun 2016     memeremilla		    Initial version (working copy). Standardization of code to adhere to MTS coding guidelines (all functions).
 * 1.20       28 Jun 2016     cmartinez         Implemented fixes, enhancements for updating catch weight amounts.
 * 1.30	      15 Aug 2016 	  cmartinez			  	Update in rate and amount calculations
 * 1.4 		    updated by Shraddha on 1/26/2017: Price UM calculation for Sales ORder
 * 1.5        27 Sept 2018    mgotsch				    Removing references to outdated fields
 * 1.51		  09 Oct  2018	  dweinstein			  Updating to use proper util variables based on record type
 * 1.6		  12 Oct 2018	  mgotsch				    Updating from BI-62316 to properly calculate amount
 * 1.7        23 Oct 2018     dlapp             Modify ValidateLine function > setting of the amount field on transactions
 * 1.8		  5 Dec 2018	  mgotsch				commenting out reference to unused field
 * 1.9        03 Jan 2018     mgotsch				Optimization for governance
 * 2.0        08 Jan 2019     pries                 Fixing vaiable name
 */

//-- Import cw_util.js
/**
 * @param {String} type Sublist internal id
 * @param {String} name Field internal id
 * @return {void}
 */
function cwLineItemsClientPostSourcing(type, name)
{
	if (type == 'item' && name == 'item')
	{

		var stIdItem = nlapiGetCurrentLineItemValue('item', 'item');
		if (!NSUtil.isEmpty(stIdItem))
		{
			var stRecUpdate = nlapiGetRecordType();
			var stUnitFld = 'purchaseunit';
			var stWeightUnitFld = FLD_ITEM_CATCH_WEIGHT_PRICING_UNIT; //v1.051 change to updated FLD_ITEM_CATCH_WEIGHT_PRICING_UNIT
			//var stWeightUnitFld = COL_PRICING_UNIT; //v1.05

			if (stRecUpdate == 'salesorder' || stRecUpdate == 'creditmemo')
			{
				stUnitFld = 'saleunit';
				//stWeightUnitFld = FLD_ITEM_SO_CATCH_WEIGHT_PRICING_UNIT; v1.05
				//stWeightUnitFld = COL_PRICING_UNIT; //v1.051 will always be using FLD_ITEM_SO_CATCH_WEIGHT_PRICING_UNIT as the item field id
			}

			var objItemFldVal = nlapiLookupField('item', stIdItem,
				[
				        FLD_CATCH_WEIGHT_ITEM, 'weight', 'unitstype', stWeightUnitFld
				], false);
			var objItemFldTxtVal = nlapiLookupField('item', stIdItem,
				[
				        'stockunit', stUnitFld, stWeightUnitFld
				], true);

			var stBCatchWeightItem = objItemFldVal[FLD_CATCH_WEIGHT_ITEM];

			if (stBCatchWeightItem == 'T')
			{
				var flWeight = NSUtil.forceFloat(objItemFldVal['weight']);
				var stWeightUnitName = objItemFldVal[stWeightUnitFld];
				var stUnitName = objItemFldTxtVal[stUnitFld];
				var stIdPhysicalUnitsType = objItemFldVal['unitstype'];
				var flConversionRate = NSUtil.forceFloat(getUOMConversionRate(stUnitName, stIdPhysicalUnitsType));
				var flPurchasePrice = NSUtil.forceFloat(getVendorPurchasePrice(stIdItem));
				var flAvgWeight = flWeight * flConversionRate;

				var flQty = NSUtil.forceFloat(nlapiGetCurrentLineItemValue('item', 'quantity'));
				var flCost = (flAvgWeight * flPurchasePrice) / flQty;

				//cmartinez 6/24/2016: get actual weight
				var stActWeight = nlapiGetCurrentLineItemValue('item','custcol_jf_cw_act_wght');

				if (stRecUpdate == 'salesorder')
				{
					var flSalesPrice = NSUtil.forceFloat(nlapiGetCurrentLineItemValue('item', COL_PRICE_UM));
					flAvgWeight = nlapiGetCurrentLineItemValue('item', COL_AVG_WGHT);

					nlapiLogExecution('debug', 'test', 'flAvgWeight = ' + flAvgWeight);

					flSalesPrice = NSUtil.forceFloat(nlapiGetCurrentLineItemValue('item', 'rate'));
					//var flSalesRate = flSalesPrice * flAvgWeight;
                  var flSalesRate = flSalesPrice / flAvgWeight; //updated by Shraddha on 1/26/2017

                  	//cmartinez 2/6/2017 - set Price UM as rate
                  	var flSalesPriceUM = flSalesPrice;
					nlapiSetCurrentLineItemValue('item', COL_PRICE_UM, flSalesPriceUM, true, true);
//					nlapiSetCurrentLineItemValue('item', 'rate',flSalesRate, true, true);


					if (NSUtil.isEmpty(flSalesPrice))
					{
						alert('Catch Weights Bundle: Please setup the price levels for this item.');
					}

					var flAmount = flAvgWeight * flSalesPrice * flQty;

					//Exception to omit the Avg Weight for certain UMs like ï¿½Caseï¿½
					var stWeightUnitNameText = objItemFldTxtVal[stWeightUnitFld];

					if (stWeightUnitNameText == 'Cases')
					{
						flAmount = flSalesPrice * flQty;
					}

					//cmartinez 6/24/2016: If Actual Weight is present, compute Amount as Actual Weight * Sales Price * Qty Fulfilled
					var flActWeight = NSUtil.forceFloat(stActWeight);
					var flQtyFulfilled = NSUtil.forceFloat(nlapiGetCurrentLineItemValue('item', 'quantityfulfilled'));
					var flAmountFulfilled = 0;
					var flAmountUnfulfilled = 0;
					if(!NSUtil.isEmpty(stActWeight) && flQtyFulfilled > 0)
					{
						flWeight = flActWeight / flQtyFulfilled;
						flAmountFulfilled = (flWeight * flSalesPrice * flQtyFulfilled);
					}

					//cmartinez 6/24/2016: If Avg Weight is present, compute Amount as Weight * Sales Price * Qty Not Fulfilled
					if(!NSUtil.isEmpty(flAvgWeight))
					{
						flAmountUnfulfilled = (flAvgWeight * flSalesPrice * (flQty - flQtyFulfilled));
					}

					nlapiSetCurrentLineItemValue('item', 'custcol_ifd_cw_fulfilled_amount', flAmountFulfilled, true, true);
					nlapiSetCurrentLineItemValue('item', 'custcol_ifd_cw_pendfulfillamt', flAmountUnfulfilled, true, true);

					//nlapiSetCurrentLineItemValue('item', COL_PRICE_UM, flSalesPrice, true, true);
					// nlapiSetCurrentLineItemValue('item', COL_PRICING_UNIT, stWeightUnitName, true, true); /1.8 unused field
					nlapiSetCurrentLineItemValue('item', COL_AVG_WGHT, flAvgWeight, true, true);
					nlapiSetCurrentLineItemValue('item', COL_CW_AMOUNT, flAmountFulfilled, true, true);
					nlapiSetCurrentLineItemValue('item', 'amount', flAmountFulfilled + flAmountUnfulfilled, true, true);
				}
				else if (stRecUpdate == 'purchaseorder')
				{
					var stIdPhysicalUnitsType = objItemFldVal['unitstype'];
					var flUMRate = NSUtil.forceFloat(getUOMAbbrevConversionRate(nlapiGetCurrentLineItemText('item', 'units'), stIdPhysicalUnitsType));

					flPurchasePrice = flPurchasePrice / flUMRate;
					var flRate = flAvgWeight * flPurchasePrice;
					flCost = flRate;

					nlapiSetCurrentLineItemValue('item', COL_PRICE_UM, NSUtil.roundDecimalAmount(flPurchasePrice, 2));
					nlapiSetCurrentLineItemValue('item', COL_AVG_WGHT, flAvgWeight);

					nlapiSetCurrentLineItemValue('item', 'rate', flCost);

					//cmartinez 6/24/2016: If Actual Weight is present, compute Amount as Actual Weight * Sales Price * Qty Received
					var flActWeight = NSUtil.forceFloat(stActWeight);
					var flQtyReceived = NSUtil.forceFloat(nlapiGetCurrentLineItemValue('item', 'quantityreceived'));
					var flAmountReceived = 0;
					var flAmountUnreceived = 0;
					if(!NSUtil.isEmpty(stActWeight) && flQtyReceived > 0)
					{
						flWeight = flActWeight / flQtyReceived;
						flAmountReceived = (flWeight * flPurchasePrice * flQtyReceived);
					}

					//cmartinez 6/24/2016: If Avg Weight is present, compute Amount as Weight * Sales Price * Qty unFulfilled
					if(!NSUtil.isEmpty(flAvgWeight))
					{
						flAmountUnreceived = (flAvgWeight * flPurchasePrice * (flQty - flQtyReceived));
					}

					nlapiSetCurrentLineItemValue('item', 'custcol_ifd_cw_received_amount', flAmountReceived, true, true);
					nlapiSetCurrentLineItemValue('item', 'custcol_ifd_cw_pendreceiptamt', flAmountUnreceived, true, true);

					nlapiSetCurrentLineItemValue('item', COL_CW_AMOUNT, flAmountReceived, true, true);
					nlapiSetCurrentLineItemValue('item', 'amount', flAmountReceived + flAmountUnreceived, true, true);
				}
			}
			else
			{ //--- Set Custom Amount field if item is not Catch Weight
				var flAmount = nlapiGetCurrentLineItemValue('item', 'amount');
				nlapiSetCurrentLineItemValue('item', COL_CW_AMOUNT, flAmount);
			}
		}
	}//--End Item Post sourcing

	else if (type == 'item' && name == 'price')
	{ //SO Price Level

		//Exception to omit the Avg Weight for certain UMs like Cases
		var stIdItem = nlapiGetCurrentLineItemValue('item', 'item');
		if(!NSUtil.isEmpty(stIdItem))
		{
			var stIsCatchWeightItem = nlapiLookupField('item', stIdItem, FLD_CATCH_WEIGHT_ITEM);
			if(stIsCatchWeightItem == 'T')
			{

//				var flSalesPrice = NSUtil.forceFloat(nlapiGetCurrentLineItemValue('item', COL_PRICE_UM));

				//cmartinez 2/6/2017
				var flSalesPrice = NSUtil.forceFloat(nlapiGetCurrentLineItemValue('item', 'rate'));
				var flSalesPriceUM = NSUtil.forceFloat(nlapiGetCurrentLineItemValue('item', COL_PRICE_UM));
				var flWeight = NSUtil.forceFloat(nlapiGetCurrentLineItemValue('item', COL_AVG_WGHT));

				if(NSUtil.isEmpty(flSalesPriceUM)||flSalesPriceUM==0)
				{
					flSalesPrice = NSUtil.forceFloat(nlapiGetCurrentLineItemValue('item', 'rate'));
					var flSalesRate = flSalesPrice * flWeight;
					//cmartinez 2/6/2017 - set Price UM as rate
					var flSalesPriceUM = flSalesPrice;
					nlapiSetCurrentLineItemValue('item', COL_PRICE_UM, flSalesPriceUM, true, true);
				}

				if (!NSUtil.isEmpty(flSalesPrice))
				{

					var flQty = NSUtil.forceFloat(nlapiGetCurrentLineItemValue('item', 'quantity'));

					//cmartinez 6/24/2016: get actual weight
					var stActWeight = nlapiGetCurrentLineItemValue('item','custcol_jf_cw_act_wght');
					var flAvgWeight = NSUtil.forceFloat(nlapiGetCurrentLineItemValue('item', COL_AVG_WGHT));


					if (!NSUtil.isEmpty(stIdItem))
					{
						//var stWeightUnitName = nlapiLookupField('item', stIdItem, FLD_ITEM_SO_CATCH_WEIGHT_PRICING_UNIT, true); v1.05
						//var stWeightUnitName = nlapiLookupField('item', stIdItem, COL_PRICING_UNIT, true); v1.051 updating to use true item field id library variable
						var stWeightUnitName = nlapiLookupField('item', stIdItem, FLD_ITEM_CATCH_WEIGHT_PRICING_UNIT, true); //v1.051



							//cmartinez 6/24/2016: If Actual Weight is present, compute Amount as Actual Weight * Sales Price * Qty Fulfilled
							var flActWeight = NSUtil.forceFloat(stActWeight);
							var flQtyFulfilled = NSUtil.forceFloat(nlapiGetCurrentLineItemValue('item', 'quantityfulfilled'));
							var flAmountFulfilled = 0;
							var flAmountUnfulfilled = 0;
							if(!NSUtil.isEmpty(stActWeight) && flQtyFulfilled > 0)
							{
								flWeight = flActWeight / flQtyFulfilled;
								flAmountFulfilled = (flWeight * flSalesPrice * flQtyFulfilled);
							}

							//cmartinez 6/24/2016: If Avg Weight is present, compute Amount as Weight * Sales Price * Qty UnFulfilled
							if(!NSUtil.isEmpty(flAvgWeight))
							{
								flAmountUnfulfilled = (flAvgWeight * flSalesPrice * (flQty - flQtyFulfilled));
							}

							nlapiSetCurrentLineItemValue('item', 'custcol_ifd_cw_fulfilled_amount', flAmountFulfilled, true, true);
							nlapiSetCurrentLineItemValue('item', 'custcol_ifd_cw_pendfulfillamt', flAmountUnfulfilled, true, true);

							nlapiSetCurrentLineItemValue('item', COL_CW_AMOUNT, flAmountFulfilled, true, true);
							nlapiSetCurrentLineItemValue('item', 'amount', flAmountFulfilled + flAmountUnfulfilled, true, true);

					}//--End Exception to omit the Avg Weight for certain UMs like ï¿½Caseï¿½
				}
			}
		}
	}//End SO Price Level check

  /**else if (type == 'item' && name == 'units')
	{

		var stRecUpdate = nlapiGetRecordType();

		if (stRecUpdate == 'purchaseorder')
		{
			var stIdItem = nlapiGetCurrentLineItemValue('item', 'item');
			var flAvgWeight = nlapiGetCurrentLineItemValue('item', COL_AVG_WGHT);
			if (!NSUtil.isEmpty(stIdItem) && !NSUtil.isEmpty(flAvgWeight))
			{
				var objItem = nlapiLookupField('item', stIdItem, [FLD_ITEM_SO_CATCH_WEIGHT_PRICING_UNIT, FLD_CATCH_WEIGHT_ITEM]);
				var stIsCatchWeightItem = objItem[FLD_CATCH_WEIGHT_ITEM];


				var flPurchasePrice = NSUtil.forceFloat(getVendorPurchasePrice(stIdItem));
				var flQty = NSUtil.forceFloat(nlapiGetCurrentLineItemValue('item', 'quantity'));
				var stIdPhysicalUnitsType = nlapiLookupField('item', stIdItem, 'unitstype', false);
				var flUMRate = NSUtil.forceFloat(getUOMAbbrevConversionRate(nlapiGetCurrentLineItemText('item', 'units'), stIdPhysicalUnitsType));

				var flRate = flAvgWeight * flPurchasePrice;
				var flCost = flRate;

				flPurchasePrice = flPurchasePrice / flUMRate;
				nlapiSetCurrentLineItemValue('item', COL_PRICE_UM, NSUtil.roundDecimalAmount(flPurchasePrice, 2));

				nlapiSetCurrentLineItemValue('item', 'rate', flCost);

				if(stIsCatchWeightItem == 'T')
				{
					//cmartinez 6/24/2016: If Actual Weight is present, compute Amount as Actual Weight * Sales Price * Qty Received
					var stActWeight = nlapiGetCurrentLineItemValue('item','custcol_jf_cw_act_wght');
					var flActWeight = NSUtil.forceFloat(stActWeight);
					var flQtyReceived = NSUtil.forceFloat(nlapiGetCurrentLineItemValue('item', 'quantityreceived'));
					var flAmountReceived = 0;
					var flAmountUnreceived = 0;
					if(!NSUtil.isEmpty(stActWeight) && flQtyReceived > 0)
					{
						var flWeight = flActWeight / flQtyReceived;
						flAmountReceived = (flWeight * flPurchasePrice * flQtyReceived);
					}

					//cmartinez 6/24/2016: If Avg Weight is present, compute Amount as Weight * Sales Price * Qty Not Received
					if(!NSUtil.isEmpty(flAvgWeight))
					{
						flAmountUnreceived = (flAvgWeight * flPurchasePrice * (flQty - flQtyReceived));
					}

					nlapiSetCurrentLineItemValue('item', 'custcol_ifd_cw_received_amount', flAmountReceived, true, true);
					nlapiSetCurrentLineItemValue('item', 'custcol_ifd_cw_pendreceiptamt', flAmountUnreceived, true, true);

					nlapiSetCurrentLineItemValue('item', COL_CW_AMOUNT, flAmountReceived, true, true);
					nlapiSetCurrentLineItemValue('item', 'amount', flAmountReceived + flAmountUnreceived, true, true);
				}
			}
		}
		else if (stRecUpdate == 'salesorder')
		{

			var stIdItem = nlapiGetCurrentLineItemValue('item', 'item');
			var flAvgWeight = nlapiGetCurrentLineItemValue('item', COL_AVG_WGHT);

			if (!NSUtil.isEmpty(stIdItem) && !NSUtil.isEmpty(flAvgWeight))
			{
				//cmartinez 6/24/2016: get actual weight
				var stActWeight = nlapiGetCurrentLineItemValue('item','custcol_jf_cw_act_wght');

				var stWeightUnitName = nlapiLookupField('item', stIdItem, FLD_ITEM_SO_CATCH_WEIGHT_PRICING_UNIT, true);
				var stIsCatchWeightItem = nlapiLookupField('item', stIdItem, FLD_CATCH_WEIGHT_ITEM);

				if (stIsCatchWeightItem == 'T')
				{
					var flSalesPrice = nlapiGetCurrentLineItemValue('item', COL_PRICE_UM);
					var flWeight = NSUtil.forceFloat(nlapiGetCurrentLineItemValue('item', COL_AVG_WGHT));
					if(NSUtil.isEmpty(flSalesPrice)||flSalesPrice==0)
					{
						flSalesPrice = NSUtil.forceFloat(nlapiGetCurrentLineItemValue('item', 'rate'))
						var flSalesRate = flSalesPrice * flAvgWeight;
						nlapiSetCurrentLineItemValue('item', COL_PRICE_UM, flSalesPrice, true, true);
						nlapiSetCurrentLineItemValue('item', 'rate',flSalesRate, true, true);
					}
					var flQty = NSUtil.forceFloat(nlapiGetCurrentLineItemValue('item', 'quantity'));

					var flAmount = flWeight * flSalesPrice * flQty;

					//cmartinez 6/24/2016: If Actual Weight is present, compute Amount as Actual Weight * Sales Price * Qty Fulfilled
					var flActWeight = NSUtil.forceFloat(stActWeight);
					var flQtyFulfilled = NSUtil.forceFloat(nlapiGetCurrentLineItemValue('item', 'quantityfulfilled'));
					var flAmountFulfilled = 0;
					var flAmountUnfulfilled = 0;
					if(!NSUtil.isEmpty(stActWeight) && flQtyFulfilled > 0)
					{
						flWeight = flActWeight / flQtyFulfilled;
						flAmountFulfilled = (flWeight * flSalesPrice * flQtyFulfilled);
					}

					//cmartinez 6/24/2016: If Avg Weight is present, compute Amount as Weight * Sales Price * Qty UnFulfilled
					if(!NSUtil.isEmpty(flAvgWeight))
					{
						flAmountUnfulfilled = (flAvgWeight * flSalesPrice * (flQty - flQtyFulfilled));
					}

					nlapiSetCurrentLineItemValue('item', 'custcol_ifd_cw_fulfilled_amount', flAmountFulfilled, true, true);
					nlapiSetCurrentLineItemValue('item', 'custcol_ifd_cw_pendfulfillamt', flAmountUnfulfilled, true, true);


					nlapiSetCurrentLineItemValue('item', COL_CW_AMOUNT, flAmountFulfilled, true, true);
					nlapiSetCurrentLineItemValue('item', 'amount', flAmountFulfilled + flAmountUnfulfilled, true, true);
				}
			}
		}//--End Sales Order check
	} */
}

/**
 * Validate line function.
 * @param {String} type
 * @returns {Boolean}
 */
function cwUpdateLinesValidateLine(type)
{
	var stRecType = nlapiGetRecordType();
	var stIdItem = nlapiGetCurrentLineItemValue('item', 'item');

	if (!NSUtil.isEmpty(stIdItem))
	{
		//var stBCatchWeightItem = nlapiLookupField('item', stIdItem, FLD_CATCH_WEIGHT_ITEM); v1.9
		var stIsCatchWeightItem = nlapiGetCurrentLineItemValue('item', 'custcol_cw_indicator'); //v1.9 switching from lookupField to pull from line item
        // v2.0 - fixed
    nlapiLogExecution('debug', 'test', 'stIsCatchWeightItem = ' + stIsCatchWeightItem);
		if (stIsCatchWeightItem == 'T')
		{
			var flAvgWeight = NSUtil.forceFloat(nlapiGetCurrentLineItemValue('item', COL_AVG_WGHT));
			var flUMPrice = NSUtil.forceFloat(nlapiGetCurrentLineItemValue('item', COL_PRICE_UM));
			var flQty = NSUtil.forceFloat(nlapiGetCurrentLineItemValue('item', 'quantity'));

			//cmartinez 2/6/2017
			var flRate = NSUtil.forceFloat(nlapiGetCurrentLineItemValue('item', 'rate'));

			//cmartinez 2/6/2017 - exclude sales orders for rate update
			if(stRecType == 'purchaseorder' && !NSUtil.isEmpty(flUMPrice))
			{
				var flSalesRate = flUMPrice;
				//nlapiSetCurrentLineItemValue('item', 'rate',flSalesRate, true, true); Commented by Shraddha on 2/6
			}

			//cmartinez 6/24/2016: get actual weight
			var stActWeight = nlapiGetCurrentLineItemValue('item','custcol_jf_cw_act_wght');

			if (stRecType == 'salesorder')
			{

				var flAmount = (flAvgWeight * flRate * flQty);

				//Exception to omit the Avg Weight for certain UMs like ï¿½Caseï¿½
				//var stWeightUnitName = nlapiLookupField('item', stIdItem, FLD_ITEM_SO_CATCH_WEIGHT_PRICING_UNIT, true); v1.05
				//var stWeightUnitName = nlapiLookupField('item', stIdItem, COL_PRICING_UNIT, true); v1.051 updating to use true item pricing unit field id
				//var stWeightUnitName = nlapiLookupField('item', stIdItem, FLD_ITEM_CATCH_WEIGHT_PRICING_UNIT, true); //v1.051 //v1.9 commenting out unused


				//cmartinez 6/24/2016: If Actual Weight is present, compute Amount as Actual Weight * Sales Price * Qty Fulfilled
				var flActWeight = NSUtil.forceFloat(stActWeight);
				var flQtyFulfilled = NSUtil.forceFloat(nlapiGetCurrentLineItemValue('item', 'quantityfulfilled'));
				var flAmountFulfilled = 0;
				var flAmountUnfulfilled = 0;
				var flWeight = 0;
				if(!NSUtil.isEmpty(stActWeight) && flQtyFulfilled > 0)
				{
					flWeight = flActWeight / flQtyFulfilled;
					flAmountFulfilled = (flWeight * flRate * flQtyFulfilled);
				}

				//cmartinez 6/24/2016: If Avg Weight is present, compute Amount as Weight * Sales Price * Qty UnFulfilled
				if(!NSUtil.isEmpty(flAvgWeight))
				{
					flAmountUnfulfilled = (flAvgWeight * flRate * (flQty - flQtyFulfilled));
				}

				//cmartinez 2/8/2017 - set Price UM as rate
				nlapiSetCurrentLineItemValue('item', COL_PRICE_UM, flRate, true, true);
				//nlapiSetCurrentLineItemValue('item', 'custcol_ifd_cw_fulfilled_amount', flAmountFulfilled, true, true); //v1.8
				//nlapiSetCurrentLineItemValue('item', 'custcol_ifd_cw_pendfulfillamt', flAmountUnfulfilled, true, true); //v1.8

				nlapiSetCurrentLineItemValue('item', COL_CW_AMOUNT, flAmountFulfilled, true, true);

				// v1.7: START
				var inRate = NSUtil.forceFloat(nlapiGetCurrentLineItemValue('item','rate'));
				var inIRCatchWeight = NSUtil.forceFloat(nlapiGetCurrentLineItemValue('item', 'custcol_jf_cw_act_wght'));
				var flCurrentQty = NSUtil.forceFloat(nlapiGetCurrentLineItemValue('item', 'quantity'));

				nlapiLogExecution('debug', 'Column Values', 'Rate: ' + inRate + ' | Catch Weight: ' + inIRCatchWeight + ' | Avg Weight: ' + flAvgWeight);
				if (Eval.isEmpty(inIRCatchWeight) || inIRCatchWeight === 0) {
					flAmount = inRate * flAvgWeight * flCurrentQty;
				} else {
					flAmount = inRate * inIRCatchWeight;
				}
				// v1.7: FINISH

				// nlapiSetCurrentLineItemValue('item', 'amount', flAmountFulfilled + flAmountUnfulfilled, true, true); // v1.7: Commented out
				nlapiSetCurrentLineItemValue('item', 'amount', flAmount, true, true); // v1.7: Added

				// nlapiLogExecution('debug', 'test', 'Amount Fulfilled = ' + flAmountFulfilled); // v1.7: Commented out
				// nlapiLogExecution('debug', 'test', 'Amount Unfulfilled = ' + flAmountUnfulfilled); // v1.7: Commented out
			}
			else if (stRecType == 'purchaseorder' || stRecType == 'creditmemo' || stRecType == 'returnauthorization' || stRecType == 'vendorreturnauthorization' || stRecType == 'vendorcredit')
			{
				// var stIdPhysicalUnitsType = nlapiLookupField('item', stIdItem, 'unitstype', false); //v1.9 removing, only used by unused following line
				// var flUMRate = NSUtil.forceFloat(getUOMAbbrevConversionRate(nlapiGetCurrentLineItemText('item', 'units'), stIdPhysicalUnitsType)); //v1.9 commented out, unused

				//	var flPurchasePrice = NSUtil.forceFloat(getVendorPurchasePrice(stIdItem)); Sapnesh made changes on 2/6/2017 to set the rate from the current line item.
				var flPurchasePrice = NSUtil.forceFloat(nlapiGetCurrentLineItemValue('item', 'rate'));

                //console.log('flPurchasePrice:'+flPurchasePrice+' | flUMRate: '+flUMRate);
				//v1.6 commented out as flUMRate was returning a zero value, resulting in an infinite calculation - likely needs fix to getUOMAbbreConversionRate
              	//flPurchasePrice = flPurchasePrice / flUMRate;

				//cmartinez 6/24/2016: If Actual Weight is present, compute Amount as Actual Weight * Sales Price * Qty Received
				var stActWeight = nlapiGetCurrentLineItemValue('item','custcol_jf_cw_act_wght');
				var flActWeight = NSUtil.forceFloat(stActWeight);
				var flQtyReceived = NSUtil.forceFloat(nlapiGetCurrentLineItemValue('item', 'quantityreceived'));
				var flAmountReceived = 0;
				var flAmountUnreceived = 0;
				var flWeight = 0;
				var flAmount = 0;
                if(!NSUtil.isEmpty(stActWeight) && (stRecType == 'creditmemo' || stRecType == 'returnauthorization' || stRecType == 'vendorreturnauthorization' || stRecType == 'vendorcredit')){ // Added by Shraddha on 7/10 to accomodate stand alone returns on Credit memos. //v1.6 added RA
                    flQtyReceived = NSUtil.forceFloat(nlapiGetCurrentLineItemValue('item', 'quantity'));
                    flWeight = flActWeight/flQtyReceived;
					console.log('a -- flweight:'+ flWeight+'  flPurchasePrice:'+flPurchasePrice+'  flQtyReceived:'+flQtyReceived);

                  flAmountReceived = (flWeight * flPurchasePrice* flQtyReceived);
                //v1.6 START changing the way Amount is calculated for CM and C
                	flAmount = (flActWeight * flRate);
                } else if (NSUtil.isEmpty(stActWeight) && (stRecType == 'creditmemo' || stRecType == 'returnauthorization'|| stRecType == 'vendorreturnauthorization' || stRecType == 'vendorcredit')) { //v1.6 adding in functionality for if no quantity recieved yet for CM, RMA, VC, and VRMA
                	flAmount = (flAvgWeight * flRate * flQty);
                }
          		//v1.6 END

				if(!NSUtil.isEmpty(stActWeight) && flQtyReceived > 0)
				{
					flWeight = flActWeight / flQtyReceived;
					console.log('b -- flweight:'+ flWeight+'  flPurchasePrice:'+flPurchasePrice+'  flQtyReceived:'+flQtyReceived);
                  	flAmountReceived = (flWeight * flPurchasePrice * flQtyReceived);
				}

				//cmartinez 6/24/2016: If Avg Weight is present, compute Amount as Weight * Sales Price * Qty Not Received
				if(!NSUtil.isEmpty(flAvgWeight))
				{
					flAmountUnreceived = (flAvgWeight * flPurchasePrice * (flQty - flQtyReceived));
				}

				//nlapiSetCurrentLineItemValue('item', 'custcol_ifd_cw_received_amount', flAmountReceived, true, true); //v1.8
				//nlapiSetCurrentLineItemValue('item', 'custcol_ifd_cw_pendreceiptamt', flAmountUnreceived, true, true); //v1.8
				nlapiSetCurrentLineItemValue('item', COL_PRICE_UM, NSUtil.forceFloat(nlapiGetCurrentLineItemValue('item', 'rate')), true, true);
				nlapiSetCurrentLineItemValue('item', COL_CW_AMOUNT, flAmountReceived, true, true);

				// v1.7: START
				var inRate = NSUtil.forceFloat(nlapiGetCurrentLineItemValue('item','rate'));
				var inIRCatchWeight = NSUtil.forceFloat(nlapiGetCurrentLineItemValue('item', 'custcol_jf_cw_act_wght'));
				var flCurrentQty = NSUtil.forceFloat(nlapiGetCurrentLineItemValue('item', 'quantity'));

				console.log('Column Values: Rate: ' + inRate + ' | Catch Weight: ' + inIRCatchWeight + ' | Avg Weight: ' + flAvgWeight);
				if (Eval.isEmpty(inIRCatchWeight) || inIRCatchWeight === 0) {
					flAmount = inRate * flAvgWeight * flCurrentQty;
				} else {
					flAmount = inRate * inIRCatchWeight;
				}
				// v1.7: FINISH

				// if(stRecType == 'returnauthorization' || stRecType == 'creditmemo') { // v1.7: Commented out
					nlapiSetCurrentLineItemValue('item', 'amount', flAmount, true, true); //v1.6 updated from flAmountReceived+flAmountUnreceived to flAmount
				// } // v1.7: Commented out
				// else { // v1.7: Commented out else statement
				// 	nlapiSetCurrentLineItemValue('item', 'amount', (flAmountReceived+flAmountUnreceived), true, true);
				// }

				// nlapiLogExecution('debug', 'test', 'Amount Received = ' + flAmountReceived); // v1.7: Commented out
				// nlapiLogExecution('debug', 'test', 'Amount Unreceived = ' + flAmountUnreceived); // v1.7: Commented out
			}
		}
	}
	return true;
}

/**
 * Recalc function
 * @param {String} type
 */
function cwUpdateLinesRecalc(type)
{
	/*
	//Update Total Amount Summary with Amount based on Catch Weight calculations
	var stRecType = nlapiGetRecordType();

	if (stRecType == 'salesorder')
	{
		var stNLines = nlapiGetLineItemCount('item');

		var flTotal = 0;
		for (var intCtr = 1; intCtr <= stNLines; intCtr++)
		{
			var flCWAmount = NSUtil.forceFloat(nlapiGetLineItemValue('item', COL_CW_AMOUNT, intCtr));
			flTotal += flCWAmount;
		}
		nlapiSetFieldValue('subtotal', flTotal);
		flTotal += NSUtil.forceFloat(nlapiGetFieldValue('discounttotal')) || 0;
		flTotal += NSUtil.forceFloat(nlapiGetFieldValue('taxtotal')) || 0;
		flTotal += NSUtil.forceFloat(nlapiGetFieldValue('altshippingcost')) || 0;
		flTotal += NSUtil.forceFloat(nlapiGetFieldValue('althandlingcost')) || 0;

		//The succeeding codes are implemented to close the popup that was called via nlExtOpenWindow
		//This implementation was kept to retain the intended output and it would be safe since the form is not native but a suitelet

		//Check if NS supports jQuery else use DOM manipulation
		if (typeof jQuery !== 'undefined')
		{
			var objHtmlElem = jQuery('#total_val')
			if (!NSUtil.isEmpty(objHtmlElem))
			{
				objHtmlElem.html(NSUtil.roundDecimalAmount(flTotal, 2));
			}
		}
		else
		{
			document.getElementById('total_val').innerHTML = NSUtil.roundDecimalAmount(flTotal, 2);
		}
	}
	*/
}

//v1.6 START
/**
 * Field changed function
 * @param {String} type
 * @param {String} name
 */
function cwUpdateLinesFieldChanged(type, name)
{

  	var stRecType = nlapiGetRecordType();
	if (name == 'quantity' && (stRecType == 'returnauthorization' || stRecType == 'vendorreturnauthorization'))
	{
		nlapiSetCurrentLineItemValue('item','custcol_jf_cw_act_wght', '');
	}
}
//v1.6 END

/**
 * Field changed function
 * @param {String} type
 * @param {String} name
 */
// function cwUpdateLinesFieldChanged(type, name)
// {
// 	var stRecType = nlapiGetRecordType();
// 	if (name == 'quantity' && stRecType == 'purchaseorder')
// 	{
// 		var stIdItem = nlapiGetCurrentLineItemValue('item', 'item');

// 		if(!NSUtil.isEmpty(stIdItem))
// 		{
// 			var stBCatchWeightItem = nlapiLookupField('item', stIdItem, FLD_CATCH_WEIGHT_ITEM);

// 			if (stBCatchWeightItem == 'T')
// 			{
// 				var flPurchasePrice = NSUtil.forceFloat(nlapiGetCurrentLineItemValue('item', COL_PRICE_UM));
// 				var flAvgWeight = NSUtil.forceFloat(nlapiGetCurrentLineItemValue('item', COL_AVG_WGHT));
// 				var flQty = NSUtil.forceFloat(nlapiGetCurrentLineItemValue('item', 'quantity'));
// 				var flCost = (flAvgWeight * flPurchasePrice);

// 				nlapiSetCurrentLineItemValue('item', 'rate', flCost);
// 			}
// 		}
// 	}
// 	//Added this block to calculate Qty * [Price/Price UM] * Avg Weight
// 	else if (name == 'quantity' && stRecType == 'salesorder')
// 	{
// 		var stIdItem = nlapiGetCurrentLineItemValue('item', 'item');
// 		if(!NSUtil.isEmpty(stIdItem))
// 		{
// 			var stBCatchWeightItem = nlapiLookupField('item', stIdItem, FLD_CATCH_WEIGHT_ITEM);

// 			//cmartinez 6/24/2016: get actual weight
// 			var stActWeight = nlapiGetCurrentLineItemValue('item','custcol_jf_cw_act_wght');

// 			if (stBCatchWeightItem == 'T')
// 			{
// 				var flAvgWeight = NSUtil.forceFloat(nlapiGetCurrentLineItemValue('item', COL_AVG_WGHT));
// //				var flUMPrice = NSUtil.forceFloat(nlapiGetCurrentLineItemValue('item', COL_PRICE_UM));
// 				//cmartinez 2/6/2017
// 				var flRate = NSUtil.forceFloat(nlapiGetCurrentLineItemValue('item', 'rate'));
// 				var flQty = NSUtil.forceFloat(nlapiGetCurrentLineItemValue('item', 'quantity'));


// 				//cmartinez 6/24/2016: If Actual Weight is present, compute Amount as Actual Weight * Sales Price * Qty Fulfilled
// 				var flActWeight = NSUtil.forceFloat(stActWeight);
// 				var flQtyFulfilled = NSUtil.forceFloat(nlapiGetCurrentLineItemValue('item', 'quantityfulfilled'));
// 				var flAmountFulfilled = 0;
// 				var flAmountUnfulfilled = 0;
// 				if(!NSUtil.isEmpty(stActWeight) && flQtyFulfilled > 0)
// 				{
// 					var flWeight = flActWeight / flQtyFulfilled;
// 					//cmartinez 2/6/2017
// 					flAmountFulfilled = (flWeight * flRate * flQtyFulfilled);
// //					flAmountFulfilled = (flWeight * flUMPrice * flQtyFulfilled);
// 				}

// 				//cmartinez 6/24/2016: If Avg Weight is present, compute Amount as Weight * Sales Price * Qty Fulfilled
// 				if(!NSUtil.isEmpty(flAvgWeight))
// 				{
// 					//cmartinez 2/6/2017
// 					flAmountUnfulfilled = (flAvgWeight * flRate * (flQty - flQtyFulfilled));
// //					flAmountUnfulfilled = (flAvgWeight * flUMPrice * (flQty - flQtyFulfilled));
// 				}

// 				//cmartinez 2/6/2017 - remove rate update for salesorder
// //				nlapiSetCurrentLineItemValue('item', 'rate', flAvgWeight * flUMPrice);
// 				nlapiSetCurrentLineItemValue('item', 'custcol_ifd_cw_fulfilled_amount', flAmountFulfilled, true, true);
// 				nlapiSetCurrentLineItemValue('item', 'custcol_ifd_cw_pendfulfillamt', flAmountUnfulfilled, true, true);

// 				nlapiSetCurrentLineItemValue('item', COL_CW_AMOUNT, flAmountFulfilled, true, true);
// 			}
// 		}
// 	}
// }

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