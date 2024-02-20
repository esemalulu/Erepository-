/**
 * @NApiVersion 2.x
 * @NScriptType MapReduceScript
 * @NModuleScope SameAccount
 */

var ORDERTYPE_UNIT = '2';
var ITEMHASH_ITEMCOST = "cost";
var ITEMHASH_TYPE = 'itemtype';
var DEALER_TYPE_RVSDEALER =  '10';
var FREIGHT_CHARGE_COLUMN_INDEX = 0;
var FUEL_CHARGE_COLUMN_INDEX = 1;
var CDL_CHARGE_COLUMN_INDEX = 2;
var HAUL_AND_TOW_CHARGE_COLUMN_INDEX = 3;

var DEALER_PRICING_SUBLIST = 'itempricing';
var SO_ITEM_SUBLIST = 'item';
//Keeps track of the time that the script started. We'll check against it in the loops to see
//if the script has been running >55 minutes. If it has, then we need to yield the script.
var START_DATETIME = null;

define(['N/record', 'N/search', 'N/runtime', 'N/task', 'SuiteScripts/SSLib/2.x/SSLib_Util', 'SuiteScripts/SSLib/2.x/SSLib_Task', 'SuiteScripts/Grand Design SuiteScripts/2.x/GD_Constants'],
/**
 * @param {record} record
 * @param {search} search
 * @param {runtime} runtime
 */
function(record, search, runtime, task, SSLib_Util, SSLib_Task, GD_Constants) {
	var scriptObj = runtime.getCurrentScript();
	var FREIGHT_CHARGE_ITEM_ID = scriptObj.getParameter({name: 'custscriptrvsfreightitem'});
	var FUEL_CHARGE_ITEM_ID = scriptObj.getParameter({name: 'custscriptrvsfuelsurcharge'});
	
	/**
     * Calculates the cost field used in the Set Rolled Up Cost map/reduce script on all items in the system that appear as members.
     * GetInputData creates the dictionary of item Id -> cost.
     *
     * @typedef {Object} ObjectRef
     * @property {number} id - Internal ID of the record instance
     * @property {string} type - Record type id
     *
     * @return {Array|Object|Search|RecordRef} inputSummary
     * @since 2015.1
     */
    function getInputData() {
    	START_DATETIME = new Date();

    	// Get the dealer array.
    	var dealerString = SSLib_Util.convertNSFieldToString(scriptObj.getParameter({name: 'custscriptgd_updatefreightfuel_dealers'}));
    	log.audit('dealerString', dealerString);

    	if (dealerString.length == 0) throw 'No dealers specified.';
    	try{
    		var dealers = JSON.parse(dealerString);
    	}catch (e){
    		throw 'invalid dealer string ' + dealerString;
    	}

    	var dealerRecord = null;
    	var currentFuelSurcharge = null;
		var currentFreightSurcharge = null;
		var itemId = 0;
		var currentDealerId = 0;
		var previousDealerId = 0;

		var orderOnlyHash = new Object();
		var orderOnlyObject = new Object();

		var haulAndTowFreightCharge = null;
		var lowboyFreightCharge = null;
    	var nonCDLSalesOrderResultsData = search.create({
    		type: search.Type.SALES_ORDER,
			filters: [['type', 'anyof', 'SalesOrd'], 'AND',
    		          ['status', 'anyof', ['SalesOrd:A', 'SalesOrd:B', 'SalesOrd:D', 'SalesOrd:F', 'SalesOrd:E']], 'AND',
    		          ["memorized", "is", false], 'AND',
    		          ['customer.internalid', 'anyof', dealers], 'AND',
    		          ["mainline", "is", true], 'AND',
    		          ["custbodyrvsmodel.custitemrvs_usecdlfreight", "is", false], 'AND',
    		          ['custbodyrvsordertype', 'anyof', ORDERTYPE_UNIT], 'AND',
					  // Make sure this MR runs only on towables, not motorized units
					  ['department', 'noneof', GD_Constants.GD_DEPARTMENT_MOTORHOME]
					],
					  
    		columns: [search.createColumn({name: 'tranid'}),
    		          search.createColumn({name: 'entity'}),
    		          search.createColumn({name: 'memo'}),
    		          search.createColumn({name: 'custbodyrvsunit'}),
    		          search.createColumn({name: 'custbodyrvspreauthorization'}),
    		          search.createColumn({name: 'custbodyrvsproductionrun'}),
    		          search.createColumn({name: 'custitemrvs_usecdlfreight', join: 'custbodyrvsmodel'}),
    		          search.createColumn({name: 'internalid', join: 'customer', sort: search.Sort.ASC})
					]
    	}).runPaged({pageSize: 1000});
    	nonCDLSalesOrderResultsData.pageRanges.forEach(function(pageRange) {
    		nonCDLSalesOrderResultsData.fetch({index: pageRange.index}).data.forEach(function(result) {
    			currentDealerId = result.getValue({name: 'internalid', join: 'customer'});

    			if (currentDealerId != previousDealerId){
    				if (previousDealerId != 0){
    					orderOnlyObject = {};
    					currentFreightSurcharge = 0;
    					currentFuelSurcharge = 0;
    					haulAndTowFreightCharge = 0;
    					lowboyFreightCharge = 0;
    				}
    				
    				dealerRecord = record.load({type: record.Type.CUSTOMER, id: currentDealerId});
    				currentFuelSurcharge = null;
    				currentFreightSurcharge = null;
    				for(var j = 0; j <= dealerRecord.getLineCount({sublistId: DEALER_PRICING_SUBLIST}); j++){ //Loop through dealer pricing items
    					itemId = dealerRecord.getSublistValue({sublistId: DEALER_PRICING_SUBLIST, fieldId: 'item', line: j});
    					if (itemId == FREIGHT_CHARGE_ITEM_ID) //get freight surcharge
    						currentFreightSurcharge = dealerRecord.getSublistValue({sublistId: DEALER_PRICING_SUBLIST, fieldId:'price', line: j});
    					if (itemId == FUEL_CHARGE_ITEM_ID) //get fuel surcharge
    						currentFuelSurcharge = dealerRecord.getSublistValue({sublistId: DEALER_PRICING_SUBLIST, fieldId:'price', line: j});
    				}
    				haulAndTowFreightCharge = dealerRecord.getValue({fieldId:'custentitygd_haulandtowfreightcharge'}) || null;
    				lowboyFreightCharge = dealerRecord.getValue({fieldId:'custentitygd_lowboyfreightcharge'}) || null;
    			}
    			
    			orderOnlyObject.freightCharge = currentFreightSurcharge;
    			orderOnlyObject.fuelCharge = currentFuelSurcharge;
    			orderOnlyObject.basePctComplete = 0;
    			orderOnlyObject.haulAndTowFreightCharge = haulAndTowFreightCharge;
    			orderOnlyObject.lowboyFreightCharge = lowboyFreightCharge;
    			orderOnlyHash[result.id] = orderOnlyObject;
    			previousDealerId = currentDealerId;
    		});
    	});
    	previousDealerId = 0; //reset to zero for the next search results loop.

    	var cdlOnlySalesOrderObject = new Object();
    	var cdlSalesOrderResultsData = search.create({
    		type: search.Type.SALES_ORDER,
    		filters: [['type', 'anyof', 'SalesOrd'], 'AND',
    		          ['status', 'anyof', ['SalesOrd:A', 'SalesOrd:B', 'SalesOrd:D', 'SalesOrd:F', 'SalesOrd:E']], 'AND',
    		          ["memorized", "is", false], 'AND',
    		          ['customer.internalid', 'anyof', dealers], 'AND',
    		          ["mainline", "is", true], 'AND',
    		          ["custbodyrvsmodel.custitemrvs_usecdlfreight", "is", true], 'AND',
    		          ['custbodyrvsordertype', 'anyof', ORDERTYPE_UNIT], 'AND',
					  // Make sure this MR runs only on towables, not motorized units
					  ['department','noneof', GD_Constants.GD_DEPARTMENT_MOTORHOME]
					],
    		columns: [search.createColumn({name: 'internalid'}),
    		          search.createColumn({name: 'tranid'}),
    		          search.createColumn({name: 'entity'}),
    		          search.createColumn({name: 'memo'}),
    		          search.createColumn({name: 'custbodyrvsunit'}),
    		          search.createColumn({name: 'custbodyrvspreauthorization'}),
    		          search.createColumn({name: 'custbodyrvsproductionrun'}),
    		          search.createColumn({name: 'custitemrvs_usecdlfreight', join: 'custbodyrvsmodel'}),
    		          search.createColumn({name: 'internalid', join: 'customer', sort: search.Sort.ASC})]
    	}).runPaged({pageSize: 1000});
    	cdlSalesOrderResultsData.pageRanges.forEach(function(pageRange) {
    		cdlSalesOrderResultsData.fetch({index: pageRange.index}).data.forEach(function(result) {
    			currentDealerId = result.getValue({name: 'internalid', join: 'customer'});
	
    			if (currentDealerId != previousDealerId){
    				if (previousDealerId != 0){
    					cdlOnlySalesOrderObject = {};
    					currentFreightSurcharge = 0;
    					currentFuelSurcharge = 0;
    				}

					dealerRecord = record.load({type: record.Type.CUSTOMER, id: currentDealerId});
					currentFuelSurcharge = null;
					currentFreightSurcharge = dealerRecord.getValue({fieldId: 'custentityrvs_cdlfreightcharge'});
					//Loop through dealer pricing items
					for(var j = 0; j <= dealerRecord.getLineCount({sublistId: DEALER_PRICING_SUBLIST}); j++){
						var itemId = dealerRecord.getSublistValue({sublistId: DEALER_PRICING_SUBLIST, fieldId: 'item', line: j});
						if (itemId == FUEL_CHARGE_ITEM_ID){
							currentFuelSurcharge = dealerRecord.getSublistValue({sublistId: DEALER_PRICING_SUBLIST, fieldId: 'price', line: j});
						}
					}
					
					currentFreightSurcharge = dealerRecord.getValue({fieldId: 'custentityrvs_cdlfreightcharge'});
    			}
    			cdlOnlySalesOrderObject.freightCharge = currentFreightSurcharge;
    			cdlOnlySalesOrderObject.fuelCharge = currentFuelSurcharge;
    			cdlOnlySalesOrderObject.basePctComplete = 50;

    			orderOnlyHash[result.id] = cdlOnlySalesOrderObject;

    			previousDealerId = currentDealerId;
    		});
    	});
		
    	return orderOnlyHash;
    }
    /**
     * Submit each of the key/value pairs in the dictionary.
     *
     * @param {MapSummary} context - Data collection containing the key/value pairs to process through the map stage
     * @since 2015.1
     */
    function map(context) {
    	var dealerOrdersData = JSON.parse(context.value);
    	try{		
    		GD_UpdateSalesOrders(context.key, dealerOrdersData.freightCharge, dealerOrdersData.fuelCharge, dealerOrdersData.basePctComplete, dealerOrdersData.haulAndTowFreightCharge, dealerOrdersData.lowboyFreightCharge);
    	}
    	//Try again in case of collision error.
    	catch(err) {
    		GD_UpdateSalesOrders(context.key, dealerOrdersData.freightCharge, dealerOrdersData.fuelCharge, dealerOrdersData.basePctComplete, dealerOrdersData.haulAndTowFreightCharge, dealerOrdersData.lowboyFreightCharge);
    	}
    }

    
    /**
     *
     * @param {Summary} summary - Holds statistics regarding the execution of a map/reduce script
     * @since 2015.1
     */
    function summarize(summary) {
    	
    }
    
    /**
     * Updates the specified sales orders with the new freight and fuel charges, if they differ from the existing freight and fuel charges.
     * 
     * @param {Array} soResults
     * @param {Number} freightCharge
     * @param {Number} fuelCharge
     * @param {Number} basePctComplete Percent of sales orders already completed when this function is called.
     */
    function GD_UpdateSalesOrders(salesOrderId, freightCharge, fuelCharge, basePctComplete, haulAndTowFreightCharge, lowboyFreightCharge){	
		var salesOrderRecord = record.load({
			type: record.Type.SALES_ORDER,
			id: salesOrderId
		}) || null;
		
		if(salesOrderRecord != null){
			var isFuelSurchargeSet = false;
			var isFreightSurchargeSet = false;
			var soItemCount = salesOrderRecord.getLineCount({sublistId: SO_ITEM_SUBLIST});
			var dealerPriceItemChanged = false; //store whether or not dealer price item was changed.
			var useHaulAndTow = salesOrderRecord.getValue({fieldId: 'custbodygd_usehaulandtowfreight'});
			var useLowboy = salesOrderRecord.getValue({fieldId: 'custbodygd_uselowboyfreight'});
			var msrpRate = parseFloat(salesOrderRecord.getValue({fieldId: 'custbodyrvsmsrprate'})) || 0;
			var msrpRatePlusOne = 1 + (msrpRate / 100);

			for(var j = 0; j < soItemCount; j++){
				var soItemId = salesOrderRecord.getSublistValue({sublistId: SO_ITEM_SUBLIST, fieldId: 'item', line: j});
				if(soItemId == FREIGHT_CHARGE_ITEM_ID){ //set freight surcharge
					var soFreightSurchargeValue = salesOrderRecord.getSublistValue({sublistId: SO_ITEM_SUBLIST, fieldId: 'rate', line: j});
					
					if (useHaulAndTow && haulAndTowFreightCharge != null) {
						if (soFreightSurchargeValue != haulAndTowFreightCharge) {
							salesOrderRecord.setSublistValue({sublistId: SO_ITEM_SUBLIST, fieldId: 'rate', line: j, value: SSLib_Util.getNearestDollar(haulAndTowFreightCharge / 2)});
							salesOrderRecord.setSublistValue({sublistId: SO_ITEM_SUBLIST, fieldId: 'custcolrvsmsrpamount', line: j, value: SSLib_Util.getNearestDollar((haulAndTowFreightCharge / 2) * msrpRatePlusOne)});
							isFreightSurchargeSet = true;
							dealerPriceItemChanged = true;
						}
					} 
					//Set lowboy freight
					else if (useLowboy && lowboyFreightCharge != null) {
						if (soFreightSurchargeValue != lowboyFreightCharge) {
							salesOrderRecord.setSublistValue({sublistId: SO_ITEM_SUBLIST, fieldId: 'rate', line: j, value: SSLib_Util.getNearestDollar(lowboyFreightCharge / 3)});
							salesOrderRecord.setSublistValue({sublistId: SO_ITEM_SUBLIST, fieldId: 'custcolrvsmsrpamount', line: j, value: SSLib_Util.getNearestDollar((lowboyFreightCharge / 3) * msrpRatePlusOne)});
							isFreightSurchargeSet = true;
							dealerPriceItemChanged = true;
						}
					} 
					//If so freight is different from dealer freight, we need to update SO
					else if(soFreightSurchargeValue != freightCharge){
						salesOrderRecord.setSublistValue({sublistId: SO_ITEM_SUBLIST, fieldId: 'rate', line: j, value: freightCharge});
						salesOrderRecord.setSublistValue({sublistId: SO_ITEM_SUBLIST, fieldId: 'custcolrvsmsrpamount', line: j, value: SSLib_Util.getNearestDollar(freightCharge * msrpRatePlusOne)});
						isFreightSurchargeSet = true;
						dealerPriceItemChanged = true;													
					}
				}else if(soItemId == FUEL_CHARGE_ITEM_ID){ //set fuel surcharge
					var soFuelSurchargeValue = salesOrderRecord.getSublistValue({sublistId: SO_ITEM_SUBLIST, fieldId: 'rate', line: j});
					if(soFuelSurchargeValue != fuelCharge){
						salesOrderRecord.setSublistValue({sublistId: SO_ITEM_SUBLIST, fieldId: 'rate', line: j, value: fuelCharge});
						salesOrderRecord.setSublistValue({sublistId: SO_ITEM_SUBLIST, fieldId: 'custcolrvsmsrpamount', line: j, value: SSLib_Util.getNearestDollar(fuelCharge * msrpRatePlusOne)});
						isFuelSurchargeSet = true;
						dealerPriceItemChanged = true;					
					}
				}
				//We don't need to continue looping through SO items if we have already set freight surcharge
				if(isFreightSurchargeSet){
					break;	
				}
			}	
			
			//If the sales order freight or fuel surcharge is different from the current dealer 
			//freight or fuel surcharge, then update sales order	
			if(dealerPriceItemChanged){
				salesOrderRecord.save({
					enableSourcing:			false,
					ignoreMandatoryFields:	true
				});
			}
		}
    }
	
    return {
        getInputData: getInputData,
        map: map,
        summarize: summarize
    };
    
});
