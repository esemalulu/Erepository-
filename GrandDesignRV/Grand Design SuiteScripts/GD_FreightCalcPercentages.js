/**
 * This file contains all the logic for Freight Calc Percentage.
 * 
 * Version    Date            Author           Remarks
 * 1.00       03 86 2018     Jeffrey Bajit
 *
 */

var DEALER_ITEM_PRICE_SUBLIST = 'itempricing';

// ********** GLOBAL CONSTANTS **********

	var FREIGHT_CHARGE_ITEM_ID = GetFreightItem(); //'523';
	var FUEL_CHARGE_ITEM_ID = GetFuelSurchargeItem(); //'524';
	var FREIGHT_CHARGE_COLUMN_INDEX = 0;
	var FUEL_CHARGE_COLUMN_INDEX = 1;
		
// ******END GLOBAL CONSTANTS *********

/**
 * Batch updates all dealers freight and fuel costs.
 * Then starts a scheduled script to update all sales orders for the dealers that were updated.
 */
function GD_UpdateDealers() {
	// Filter dealers so only active dealers and only dealers with at least one value for either miles, tolls and permits or wash fields will be processed.  Any dealers with zero values for these
	var filters = [new nlobjSearchFilter('isinactive', null, 'is', 'F'),
	               new nlobjSearchFilter('formulanumeric', null, 'equalTo', 1).setFormula("CASE WHEN TO_NUMBER(NVL({custentityrvsmiles}, 0)) > 0 OR TO_NUMBER(NVL({custentityrvstollsandpermits}, 0)) > 0 OR TO_NUMBER(NVL({custentityrvswash}, 0)) > 0 THEN 1 ELSE 0 END")];
	
	var dealers = GetSteppedSearchResults('customer', filters, new nlobjSearchColumn('entityid'));
	var dealerIds = [];
	if (dealers != null) {
		for (var i = 0; i < dealers.length; i++) {
			//set the dealer pricing (in GD_DealerAfterSubmit_Plugin.js)
			if(GD_SetDealerItemPricing(dealers[i].getId(), false)) {
				//If the dealer was submitted, add the dealer id to the list of updated dealers.
				dealerIds.push(parseInt(dealers[i].getId()));
			}
			
			if (nlapiGetContext().getRemainingUsage() < 100)
				nlapiYieldScript();
		}
		
		//Start a different scheduled script to process the sales orders
		if (dealerIds.length > 0) {
			var params = {};
			params['custscriptgd_updateff_dealers'] = JSON.stringify(dealerIds);
			nlapiScheduleScript('customscriptgd_updatesalesordfreightfue', 'customdeploygd_updatesalesordfreightfdpl', params);
		}
	}
}

/**
 * Run Dealer batch update script.
 * @param {Object} type
 */
function GD_FreightCalcPerc_AfterSubmit(type){
	// Call the suitelet which clals a map/reduce.  This suitelet is 2.0 and map/reduce can only be called froma 2.0 script.
	var url = nlapiResolveURL('SUITELET', 'customscriptgd_startmapreduce_suite', 'customdeploygd_startmapreduce_suite', true) //Get the external url. deploymen must be available without login.
	var response = nlapiRequestURL(url + '&custparam_scriptid=customscriptgd_freightcalcpercentagemapr&custparam_scriptdeploymentid=customdeploygd_freightcalcpercentagemapr&custparam_parameters=');
}

function GetSteppedSearchResults(type, filters, columns)
{
	var itemResultsFinal = [];
	var search = nlapiCreateSearch(type, filters, columns);
	var searchResults = search.runSearch();
	var resultIndex = 0; var resultStep = 1000;
	var resultSet; //loop variable to hold the 1000s of results.
	do 
	{
		if(nlapiGetContext().getRemainingUsage() < 50)
			nlapiYieldScript();
		
	    //fetch one result set
	    resultSet = searchResults.getResults(resultIndex, resultIndex + resultStep);
	    itemResultsFinal = itemResultsFinal.concat(resultSet);
	    
	    //increase the low index by the step.
	    resultIndex = resultIndex + resultStep;
	} while (resultSet.length > 0);
		
	return itemResultsFinal;
}
