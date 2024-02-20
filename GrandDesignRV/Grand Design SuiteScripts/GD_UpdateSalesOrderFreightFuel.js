/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       03 26 2018     Jeffrey Bajit
 *
 */

var DEALER_PRICING_SUBLIST = 'itempricing';
var SO_ITEM_SUBLIST = 'item';
//Keeps track of the time that the script started. We'll check against it in the loops to see
//if the script has been running >55 minutes. If it has, then we need to yield the script.
var START_DATETIME = null;

/**
 * @param {String} type Context Types: scheduled, ondemand, userinterface, aborted, skipped
 * @returns {Void}
 */
function GD_SalesOrder_UpdateFreightFuel_Sched(type)
{
	START_DATETIME = new Date();
	
	//Get the dealer array.
	var dealerString = ConvertNSFieldToString(nlapiGetContext().getSetting('SCRIPT', 'custscriptgd_updateff_dealers'));
	if (dealerString.length == 0) throw 'No dealers specified.';
	try
	{
		var dealers = JSON.parse(dealerString);
	}
	catch (e)
	{
		throw 'invalid dealer string ' + dealerString;
	}
	
	for (var i = 0; i < dealers.length; i++)
	{	
		var dealerId = dealers[i];
		
		//Get all open sales orders that have pricing items for this dealer	and don't use CDL	
		var columns = new Array();
		columns.push(new nlobjSearchColumn('internalid').setLabel('Internal ID'));
		columns.push(new nlobjSearchColumn('tranid').setLabel('Document Number'));
		columns.push(new nlobjSearchColumn('entity').setLabel('Name'));
		columns.push(new nlobjSearchColumn('memo').setLabel('Memo'));
		columns.push(new nlobjSearchColumn('custbodyrvsunit').setLabel('Unit'));
		columns.push(new nlobjSearchColumn('custbodyrvspreauthorization').setLabel('Pre-Authorization'));
		columns.push(new nlobjSearchColumn('custbodyrvsproductionrun').setLabel('Production Run'));
		columns.push(new nlobjSearchColumn('internalid', 'customer').setLabel('Dealer Internal ID'));
		
		var filters = new Array();
		filters.push(new nlobjSearchFilter('type', null, 'anyof', 'SalesOrd'));
		filters.push(new nlobjSearchFilter('status', null, 'anyof', ['SalesOrd:A', 'SalesOrd:B', 'SalesOrd:D', 'SalesOrd:F', 'SalesOrd:E']));
		filters.push(new nlobjSearchFilter('memorized', null, 'is', 'F'));
		filters.push(new nlobjSearchFilter('internalid', 'customer', 'anyof', dealerId));
		filters.push(new nlobjSearchFilter('mainline', null, 'is', 'T'));
		filters.push(new nlobjSearchFilter('custbodyrvsordertype', null, 'anyof', ORDERTYPE_UNIT));
		
		var nonCDLFilters = [];
		nonCDLFilters = nonCDLFilters.concat(filters);
		nonCDLFilters.push(new nlobjSearchFilter('custitemrvs_usecdlfreight', 'custbodyrvsmodel', 'is', 'F'));
		var nonCDLResults = nlapiSearchRecord('salesorder', 'customsearchopensalesorderswithpriceitem', nonCDLFilters, columns);
		nlapiLogExecution('debug', 'dealer: ' + dealerId + ' nonCDLResults', (nonCDLResults != null) ? nonCDLResults.length : 'none');
		
		var cdlFilters = [];
		cdlFilters = cdlFilters.concat(filters);
		cdlFilters.push(new nlobjSearchFilter('custitemrvs_usecdlfreight', 'custbodyrvsmodel', 'is', 'T'));
		var CDLResults = nlapiSearchRecord('salesorder', 'customsearchopensalesorderswithpriceitem', cdlFilters, columns);
		nlapiLogExecution('debug', 'dealer: ' + dealerId + ' CDLResults', (CDLResults != null) ? CDLResults.length : 'none');
		
		var totalOrders = SumSearchResults([nonCDLResults, CDLResults]);
		var dealerRecord = nlapiLoadRecord('customer', dealerId); 
			
		//First check the non-CDL sales orders
		if(nonCDLResults != null && nonCDLResults.length > 0)
		{
			var currentFuelSurcharge = null;
			var currentFreightSurcharge = null;	
			for(var j = 1; j <= dealerRecord.getLineItemCount(DEALER_PRICING_SUBLIST); j++) //Loop through dealer pricing items
			{
				var itemId = dealerRecord.getLineItemValue(DEALER_PRICING_SUBLIST, 'item', j);
				if (itemId == FREIGHT_CHARGE_ITEM_ID) //get freight surcharge
				{
					currentFreightSurcharge = dealerRecord.getLineItemValue(DEALER_PRICING_SUBLIST, 'price', j);
				}
				if (itemId == FUEL_CHARGE_ITEM_ID) //get fuel surcharge
				{
					currentFuelSurcharge = dealerRecord.getLineItemValue(DEALER_PRICING_SUBLIST, 'price', j);
				}
			}
            GD_UpdateSalesOrders(nonCDLResults, currentFreightSurcharge, currentFuelSurcharge, 0, totalOrders, dealerRecord.getFieldValue('custentitygd_haulandtowfreightcharge') || null, dealerRecord.getFieldValue('custentitygd_lowboyfreightcharge') || null);
		}
		
		//Then do the CDL sales orders.
		if (CDLResults != null && CDLResults.length > 0)
		{
			var currentFuelSurcharge = null;
			for(var j = 1; j <= dealerRecord.getLineItemCount(DEALER_PRICING_SUBLIST); j++) //Loop through dealer pricing items
			{
				var itemId = dealerRecord.getLineItemValue(DEALER_PRICING_SUBLIST, 'item', j);
				if (itemId == FUEL_CHARGE_ITEM_ID)
				{
					currentFuelSurcharge = dealerRecord.getLineItemValue(DEALER_PRICING_SUBLIST, 'price', j);
				}
			}
			GD_UpdateSalesOrders(CDLResults, dealerRecord.getFieldValue('custentityrvs_cdlfreightcharge'), currentFuelSurcharge, 50, totalOrders, null);
		}
		
		if (nlapiGetContext().getRemainingUsage() < 70 || runningForMoreThan50Minutes())
		{
			nlapiYieldScript();
			START_DATETIME = new Date();
		}
	}
}

/**
 * Updates the specified sales orders with the new freight and fuel charges, if they differ from the existing freight and fuel charges.
 * 
 * @param {Array} soResults
 * @param {Number} freightCharge
 * @param {Number} fuelCharge
 * @param {Number} basePctComplete Percent of sales orders already completed when this function is called.
 */
function GD_UpdateSalesOrders(soResults, freightCharge, fuelCharge, basePctComplete, totalOrders, haulAndTowFreightCharge, lowboyFreightCharge)
{
	for(var i = 0; i < soResults.length; i++)
	{
		var salesOrderRecord = nlapiLoadRecord(soResults[i].getRecordType(), soResults[i].getId());							
		if(salesOrderRecord != null)
		{
			var isFuelSurchargeSet = false;
			var isFreightSurchargeSet = false;
			var soItemCount = salesOrderRecord.getLineItemCount(SO_ITEM_SUBLIST);
			var dealerPriceItemChanged = false; //store whether or not dealer price item was changed.
			var useHaulAndTow = salesOrderRecord.getFieldValue('custbodygd_usehaulandtowfreight');
            var useLowboy = salesOrderRecord.getFieldValue('custbodygd_uselowboyfreight');

			for(var j = 1; j <= soItemCount; j++)
			{
				var soItemId = salesOrderRecord.getLineItemValue(SO_ITEM_SUBLIST, 'item', j);
				if(soItemId == FREIGHT_CHARGE_ITEM_ID) //set freight surcharge
				{
					var soFreightSurchargeValue = salesOrderRecord.getLineItemValue(SO_ITEM_SUBLIST, 'rate', j);
					if (useHaulAndTow == 'T' && haulAndTowFreightCharge != null) {
						if (soFreightSurchargeValue != haulAndTowFreightCharge) {
							salesOrderRecord.setLineItemValue(SO_ITEM_SUBLIST, 'rate', j, haulAndTowFreightCharge / 2);
							isFreightSurchargeSet = true;
							dealerPriceItemChanged = true;
						}
                    }
                    // lowboy freight
                    else if (useLowboy == 'T' && lowboyFreightCharge != null) {
                        if (soFreightSurchargeValue != lowboyFreightCharge) {
                            salesOrderRecord.setLineItemValue(SO_ITEM_SUBLIST, 'rate', j, lowboyFreightCharge / 3);
                            isFreightSurchargeSet = true;
                            dealerPriceItemChanged = true;
                        }
                    }
                    //If sales order freight is different from dealer freight, we need to update SO
					else if(soFreightSurchargeValue != freightCharge) {
						salesOrderRecord.setLineItemValue(SO_ITEM_SUBLIST, 'rate', j, freightCharge);
						isFreightSurchargeSet = true;
						dealerPriceItemChanged = true;
						
						//We don't need to continue looping through SO items if we have already set fuel surcharge
						if(isFuelSurchargeSet) 
							break;															
					}
				}
				else if(soItemId == FUEL_CHARGE_ITEM_ID)//set fuel surcharge
				{
					var soFuelSurchargeValue = salesOrderRecord.getLineItemValue(SO_ITEM_SUBLIST, 'rate', j);
					if(soFuelSurchargeValue != fuelCharge)
					{
						salesOrderRecord.setLineItemValue(SO_ITEM_SUBLIST, 'rate', j, fuelCharge);
						isFuelSurchargeSet = true;
						dealerPriceItemChanged = true;
						//We don't need to continue looping through SO items if we have already set freight surcharge
						if(isFreightSurchargeSet) 
							break;								
					}
				}
			}	
			
			//If sales order freight or fuel surcharge is different from the current dealer 
			//freight or fuel surcharge, then update sales order	
			if(dealerPriceItemChanged) 
			{
				nlapiLogExecution('DEBUG', 'SO Update', 'SO # ' + salesOrderRecord.getId());
				nlapiSubmitRecord(salesOrderRecord, false, true);
			}
		}
		
		if (nlapiGetContext().getRemainingUsage() < 50 || runningForMoreThan50Minutes())
		{
			nlapiYieldScript();
			START_DATETIME = new Date();
		}
	}
}

function SumSearchResults(searchArr)
{
	var total = 0;
	for (var i = 0; i < searchArr.length; i++)
	{
		if (searchArr[i] != null) total += searchArr.length;
	}
	return total;
}

function runningForMoreThan50Minutes()
{
	return ((new Date() - START_DATETIME) / 60000) > 50;
}
