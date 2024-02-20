/**
 * @NApiVersion 2.x
 * @NScriptType MapReduceScript
 * @NModuleScope SameAccount
 */

var ITEMHASH_ITEMCOST = "cost";
var ITEMHASH_TYPE = 'itemtype';
var DEALER_ITEM_PRICE_SUBLIST = 'itempricing';
var DEALER_TYPE_RVSDEALER =  '10';
var FREIGHT_CHARGE_COLUMN_INDEX = 0;
var FUEL_CHARGE_COLUMN_INDEX = 1;
var CDL_CHARGE_COLUMN_INDEX = 2;
var HAUL_AND_TOW_CHARGE_COLUMN_INDEX = 3;
var LOWBOY_CHARGE_COLUMN_INDEX = 4;

define(['N/record', 'N/search', 'N/runtime', 'N/task', 'SuiteScripts/SSLib/2.x/SSLib_Util', 'SuiteScripts/SSLib/2.x/SSLib_Task'],
/**
 * @param {record} record
 * @param {search} search
 * @param {runtime} runtime
 */
function(record, search, runtime, task, SSLib_Util, SSLib_Task) {
	var scriptObj = runtime.getCurrentScript();
	var FREIGHT_CHARGE_ITEM_ID = scriptObj.getParameter({name: 'custscriptrvsfreightitem'});
	var FUEL_CHARGE_ITEM_ID = scriptObj.getParameter({name: 'custscriptrvsfuelsurcharge'});
	var IS_ONEWORLD_ACCOUNT = scriptObj.getParameter({name: 'custscriptrvs_isoneworldaccount'});
	
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
    	// Filter dealers so only active dealers and only dealers with at least one value for either miles, tolls and permits or wash fields will be processed.  Any dealers with zero values for these
    	var dealerOrderHash = new Object();
    	var dealerIds = new Array();
    	var dealersResultsData = search.create({
    		type: search.Type.CUSTOMER,
    		filters: [['isinactive', 'is', 'F'], 'AND',
    		          ["formulanumeric: CASE WHEN TO_NUMBER(NVL({custentityrvsmiles}, 0)) > 0 OR TO_NUMBER(NVL({custentityrvstollsandpermits}, 0)) > 0 OR TO_NUMBER(NVL({custentityrvswash}, 0)) > 0 THEN 1 ELSE 0 END", 'equalTo', 1]],
    		columns: [search.createColumn({name: 'entityid'})]
    	}).runPaged({pageSize: 1000});
    	dealersResultsData.pageRanges.forEach(function(pageRange){
    		dealersResultsData.fetch({index: pageRange.index}).data.forEach(function(result){
    			//set the dealer pricing (in GD_DealerAfterSubmit_Plugin.js)
    			if(GD_SetDealerItemPricing_MR(result.id, dealerOrderHash, false)) {
    				//If the dealer was submitted, add the dealer id to the list of updated dealers.
    				dealerIds.push(parseInt(result.id));
    			}
    			return true;
    		});
    	});
    	//Start a different scheduled script to process the sales orders
		return dealerOrderHash;
    }

    /**
     * Submit each of the key/value pairs in the dictionary.
     *
     * @param {MapSummary} context - Data collection containing the key/value pairs to process through the map stage
     * @since 2015.1
     */
    function map(context) {
    	//Submit each item. Try again if it fails the first time (could be a record collision).
    	var dealerData = JSON.parse(context.value);
    	var dealerRecord = record.load({
			type: record.Type.CUSTOMER,
			id: context.key,
			isDynamic: true
		});
    	// Do a try catch in case there is a collision error.
    	try{
    		if (dealerData.custentityrvs_cdlfreightcharge || '' != '')
    			dealerRecord.setValue({fieldId: 'custentityrvs_cdlfreightcharge', value: dealerData.custentityrvs_cdlfreightcharge});
    		if (dealerData.custentitygd_haulandtowfreightcharge || '' != '')
    			dealerRecord.setValue({fieldId: 'custentitygd_haulandtowfreightcharge', value: dealerData.custentitygd_haulandtowfreightcharge});
    		if (dealerData.custentitygd_lowboyfreightcharge || '' != '')
    			dealerRecord.setValue({fieldId: 'custentitygd_lowboyfreightcharge', value: dealerData.custentitygd_lowboyfreightcharge});
    		// loop through the item pricing and look match the items in the hash with the currently loaded dealer record and update prices.
    		for (var i = 0; i < dealerRecord.getLineCount({sublistId: 'itempricing'}); i++){
    			dealerRecord.selectLine({sublistId: 'itempricing', line: i});
    			for (var j = 0; j < dealerData.sublist.length; j++){
    				if (dealerData.sublist[j].index == -1){
        				AddDealerItemPricingLine(dealerRecord, dealerData.sublist[j].itemId, dealerData.sublist[j].price);
        			}else if (dealerData.sublist[j].index == dealerRecord.getCurrentSublistIndex({sublistId: 'itempricing'}) && 
        					dealerData.sublist[j].itemId == dealerRecord.getCurrentSublistValue({sublistId: 'itempricing', fieldId: 'item'})){
        				dealerRecord.setCurrentSublistValue({sublistId: 'itempricing', fieldId: 'item', value: dealerData.sublist[j].itemId});
        				dealerRecord.setCurrentSublistValue({sublistId: 'itempricing', fieldId: 'price', value: dealerData.sublist[j].price});
        				dealerRecord.commitLine({sublistId: 'itempricing'});
        			}
    			}
    		}
    		dealerRecord.save({enableSourcing: false, ignoreMandatoryFields: true});
    	}
    	catch(err) {
    		if (dealerData.custentityrvs_cdlfreightcharge || '' != '')
    			dealerRecord.setValue({fieldId: 'custentityrvs_cdlfreightcharge', value: dealerData.custentityrvs_cdlfreightcharge});
    		if (dealerData.custentitygd_haulandtowfreightcharge || '' != '')
    			dealerRecord.setValue({fieldId: 'custentitygd_haulandtowfreightcharge', value: dealerData.custentitygd_haulandtowfreightcharge});
    		if (dealerData.custentitygd_lowboyfreightcharge || '' != '')
    			dealerRecord.setValue({fieldId: 'custentitygd_lowboyfreightcharge', value: dealerData.custentitygd_lowboyfreightcharge});
    		// loop through the item pricing and look match the items in the hash with the currently loaded dealer record and update prices.
    		for (var i = 0; i < dealerRecord.getLineCount({sublistId: 'itempricing'}); i++){
    			dealerRecord.selectLine({sublistId: 'itempricing', line: i});
    			for (var j = 0; j < dealerData.sublist.length; j++){
    				if (dealerData.sublist[j].index == -1){
        				AddDealerItemPricingLine(dealerRecord, dealerData.sublist[j].itemId, dealerData.sublist[j].price);
        			}else if (dealerData.sublist[j].index == dealerRecord.getCurrentSublistIndex({sublistId: 'itempricing'}) && 
        					dealerData.sublist[j].itemId == dealerRecord.getCurrentSublistValue({sublistId: 'itempricing', fieldId: 'item'})){
        				dealerRecord.setCurrentSublistValue({sublistId: 'itempricing', fieldId: 'item', value: dealerData.sublist[j].itemId});
        				dealerRecord.setCurrentSublistValue({sublistId: 'itempricing', fieldId: 'price', value: dealerData.sublist[j].price});
        				dealerRecord.commitLine({sublistId: 'itempricing'});
        			}
    			}
    		}
    		dealerRecord.save({enableSourcing: false, ignoreMandatoryFields: true});
    	}
    }

    
    /**
     * Starts the Set Rolled Up Cost map/reduce script.
     *
     * @param {Summary} summary - Holds statistics regarding the execution of a map/reduce script
     * @since 2015.1
     */
    function summarize(summary) {

    	var dealerIds = new Array();
    	
    	summary.mapSummary.keys.iterator().each(function (key){
    		dealerIds.push(key);
    		return true;
    	});

    	var params = {};
		params['custscriptgd_updatefreightfuel_dealers'] = JSON.stringify(dealerIds).split('"').join(''); //needed to remove quotes on the dealer ids.

    	SSLib_Task.startMapReduceScript('customscriptgd_updateslsordfrflcharge', null, params, '3', '5', '5');
    }
    
    /**
     * Returns the Item Rate column that matches the item ID.
     */
    function GetLastPPResult(lastPPResults, itemId) {
    	for(var i = 0; i < lastPPResults.length; i++)
		{
			if(lastPPResults[i].getValue({name:'item', summary: 'group'}) == itemId)
			{
				return SSLib_Util.convertNSFieldToFloat(lastPPResults[i].getValue({name:'rate', summary: 'max'}));
			}
		}
    	return 0;
    }
    
    /**
     * Converts the existing cost from the UOM to the other UOM.
     * 
     * @param startingUOM
     * @param newUOM
     * @param cost
     * @param (Array) list of unit types to convert purchase price to base UOM
     */
    function ConvertUOMtoBase(unitsTypeId, fromUOMId, cost, unitsTypeArray) {
    	if (unitsTypeId != null && unitsTypeId != '')
    	{
    		var unitsType = null;	
    		if (unitsTypeArray[unitsTypeId] == null)
    		{		
    			unitsTypeArray[unitsTypeId] = record.load({type: 'unitstype', id: unitsTypeId});
    		}
    		
    		unitsType = unitsTypeArray[unitsTypeId];
    		
    		// find the from conversion rate
    		// and the to conversion rate
    		var fromRate = 0;
    		var toRate = 0;
    		
    		var count = unitsType.getLineCount({sublistId: 'uom'});
    		
    		for (var i=0; i<count; i++)
    		{
    			var uomInternalId = unitsType.getSublistValue({sublistId: 'uom', fieldId: 'internalid', line: i});
    			
    			if (uomInternalId == fromUOMId)
    				fromRate = SSLib_Util.convertNSFieldToFloat(unitsType.getSublistValue({sublistId: 'uom', fieldId: 'conversionrate', line: i}));
    			
    			if (unitsType.getSublistValue({sublistId: 'uom', fieldId: 'baseunit', line: i}) == true)
    				toRate = SSLib_Util.convertNSFieldToFloat(unitsType.getSublistValue({sublistId: 'uom', fieldId: 'conversionrate', line: i}));
    		}
    		
    		var baseCost = cost / fromRate;
    		var toCost = baseCost * toRate;
    		
    		return toCost;
    	}
    	
    	return cost;
    }
    
    /**
     * Sets the specified dealer item pricing. 
     * This method assumes that dealer record already exists in netsuite.
	 * (i.e, if this is a new dealer, the record doesn't exist in netsuite yet. 
	 * Therefore; we need to make sure that we call this method on after submit)
	 * 
	 * Returns whether or not the dealer was submitted.
     * 
     * @param dealerId
     * @param dealerOrderHash
     * @param shouldStartScheduledScript
     */
    function GD_SetDealerItemPricing_MR(dealerId, dealerOrderHash, shouldStartScheduledScript){
    	if(dealerId != ''){
    		var dealerRecord = record.load({
    			type: record.Type.CUSTOMER,
    			id: dealerId,
    			isDynamic: true
    		});
    		
    		if(dealerRecord != null)
    		{
    			var itemPriceSublist = 'itempricing';
    			var itemPriceSublistCount = dealerRecord.getLineCount({sublistId: itemPriceSublist});
    			
    			//Search for dealer record with the mileage calculations.
    			//There should be either one or zero record since we are searching for dealer internal id
    			//and the search itself filters based on whether or not miles field is set on the dealer record.
    			
    			var hasFreightLine = false; //Indicates whether or not freight surcharge line was added or modified
    			var hasFuelLine = false;  //Indicates whether or not fuel surcharge line was added or modified
    			var needToSubmitDealer = false; //Indicates whether or not dealer record needs to be submitted (i.e, dealer has been modified)
    			var freightCharge = 0;
    			var fuelCharge = 0;	
    			var cdlCharge = 0;
    			var haulAndTowCharge = 0;
    			var lowboyCharge = 0;
    			var dealerObject = new Object();
    			dealerObject.sublist = new Array();
    			var customerSearch = search.create({
    	    		type: record.Type.CUSTOMER,
    	    		filters: [['custentityrvsdealertype','anyof', DEALER_TYPE_RVSDEALER], 'AND',
    	    		          ['custentityrvscreditdealer','is', 'F'], 'AND',
    	    		          ['isdefaultshipping','is', 'T'], 'AND',
    	    		          ['isinactive','is', 'F'], 'AND',
    	    		          ['internalid','is', dealerId]
    	    				   ],
    	    		columns: [search.createColumn({name: 'internalid', sort: search.Sort.ASC}),
    	    		          search.createColumn({name: 'entityid'}),
    	    		          search.createColumn({name: 'salesrep'}),
    	    		          search.createColumn({name: 'shippingitem'}),
    	    		          search.createColumn({name: 'shipcity'}),
    	    		          search.createColumn({name: 'shipstate'}),
    	    		          search.createColumn({name: 'shipzip'}),
    	    		          search.createColumn({name: 'shipcountry'}),
    	    		          search.createColumn({name: 'custentityrvsmiles'}),
    	    		          search.createColumn({name: 'custentityrvstollsandpermits'}),
    	    		          search.createColumn({name: 'custentityrvswash'}),
    	    		          search.createColumn({name: 'formulacurrency', formula: "formulacurrency: CASE WHEN{country}='Canada' THEN ({custentityrvsmiles}*{custentitygd_freightcalculations.custrecordgd_freightcalcperc_canbasefrt}) ELSE ({custentityrvsmiles}*{custentitygd_freightcalculations.custrecordgd_freightcalcperc_dombasefrt}) END"}),
    	    		          search.createColumn({name: 'formulacurrency', formula: "{custentityrvstollsandpermits}+{custentityrvswash}+CASE WHEN{country}='Canada' THEN {custentityrvsmiles}*{custentitygd_freightcalculations.custrecordgd_freightcalcperc_canbasefrt} ELSE {custentityrvsmiles}*{custentitygd_freightcalculations.custrecordgd_freightcalcperc_dombasefrt} END"}),
    	    		          search.createColumn({name: 'formulacurrency', formula: "{custentityrvstollsandpermits}+{custentityrvswash}+CASE WHEN{country}='Canada' THEN {custentityrvsmiles}*{custentitygd_freightcalculations.custrecordgd_freightcalcperc_canbasefrt} ELSE {custentityrvsmiles}*{custentitygd_freightcalculations.custrecordgd_freightcalcperc_dombasefrt} END"}),
    	    		          search.createColumn({name: 'formulacurrency', formula: "CASE WHEN{country}='Canada' THEN {custentityrvsmiles}*{custentitygd_freightcalculations.custrecordgd_freightcalcperc_canfuelsrch} ELSE {custentityrvsmiles}*{custentitygd_freightcalculations.custrecordgd_freightcalcperc_domfuelsrch} END"}),
    	    		          search.createColumn({name: 'formulacurrency', formula: "{custentityrvstollsandpermits}+{custentityrvswash}+CASE WHEN{country}='Canada' THEN {custentityrvsmiles}*{custentitygd_freightcalculations.custrecordgd_freightcalcperc_canbasefrt} ELSE {custentityrvsmiles}*{custentitygd_freightcalculations.custrecordgd_freightcalcperc_dombasefrt} END+CASE WHEN{country}='Canada' THEN {custentityrvsmiles}*{custentitygd_freightcalculations.custrecordgd_freightcalcperc_canfuelsrch} ELSE {custentityrvsmiles}*{custentitygd_freightcalculations.custrecordgd_freightcalcperc_domfuelsrch}END"}),
    	    		          search.createColumn({name: 'formulacurrency', formula: "{custentityrvstollsandpermits}+{custentityrvswash}+CASE WHEN{country}='Canada' THEN {custentityrvsmiles}*{custentitygd_freightcalculations.custrecordgd_freightcalcperc_canbasefrt} ELSE {custentityrvsmiles}*{custentitygd_freightcalculations.custrecordgd_freightcalcperc_dombasefrt} END+CASE WHEN{country}='Canada' THEN {custentityrvsmiles}*{custentitygd_freightcalculations.custrecordgd_freightcalcperc_canfuelsrch} ELSE {custentityrvsmiles}*{custentitygd_freightcalculations.custrecordgd_freightcalcperc_domfuelsrch}END"}),
    	    		          search.createColumn({name: 'formulacurrency', formula: "{custentityrvstollsandpermits}+{custentityrvswash}+CASE WHEN{country}='Canada' THEN {custentityrvsmiles}*{custentitygd_freightcalculations.custrecordgd_freightcalcperc_canbasefrt} ELSE {custentityrvsmiles}*{custentitygd_freightcalculations.custrecordgd_freightcalcperc_dombasefrt} END || ';' || CASE WHEN{country}='Canada' THEN {custentityrvsmiles}*{custentitygd_freightcalculations.custrecordgd_freightcalcperc_canfuelsrch} ELSE {custentityrvsmiles}*{custentitygd_freightcalculations.custrecordgd_freightcalcperc_domfuelsrch} END || ';' ||CASE WHEN{country}='Canada' THEN {custentityrvstollsandpermits}+{custentityrvswash}+{custentityrvsmiles}*{custentitygd_freightcalculations.custrecordgd_freightcalcperc_cancdl} ELSE {custentityrvstollsandpermits}+{custentityrvswash}+{custentityrvsmiles}*{custentitygd_freightcalculations.custrecordgd_freightcalcperc_domcdl} END || ';' ||CASE WHEN{country}='Canada' THEN {custentityrvstollsandpermits}+{custentityrvswash}+{custentityrvsmiles}*{custentitygd_freightcalculations.custrecordgd_freightcalcperc_canhaulntow} ELSE {custentityrvstollsandpermits}+{custentityrvswash}+{custentityrvsmiles}*{custentitygd_freightcalculations.custrecordgd_freightcalcperc_domhaulntow} END || ';' ||CASE WHEN{country}='Canada' THEN {custentityrvstollsandpermits}+{custentityrvswash}+{custentityrvsmiles}*{custentitygd_freightcalculations.custrecordgd_freightcalcperc_canlowboy} ELSE {custentityrvstollsandpermits}+{custentityrvswash}+{custentityrvsmiles}*{custentitygd_freightcalculations.custrecordgd_freightcalcperc_domlowboy} END"}),
    	    		          search.createColumn({name: 'formulatext', formula: "{custentityrvstollsandpermits}+{custentityrvswash}+CASE  WHEN{country}='Canada' THEN {custentityrvsmiles}*{custentitygd_freightcalculations.custrecordgd_freightcalcperc_canbasefrt} ELSE {custentityrvsmiles}*{custentitygd_freightcalculations.custrecordgd_freightcalcperc_dombasefrt} END || ';' || CASE  WHEN{country}='Canada'  THEN  {custentityrvsmiles}*{custentitygd_freightcalculations.custrecordgd_freightcalcperc_canfuelsrch} ELSE {custentityrvsmiles}*{custentitygd_freightcalculations.custrecordgd_freightcalcperc_domfuelsrch} END || ';' ||CASE WHEN{country}='Canada' THEN {custentityrvstollsandpermits}+{custentityrvswash}+{custentityrvsmiles}*{custentitygd_freightcalculations.custrecordgd_freightcalcperc_cancdl} ELSE {custentityrvstollsandpermits}+{custentityrvswash}+{custentityrvsmiles}*{custentitygd_freightcalculations.custrecordgd_freightcalcperc_domcdl} END || ';' ||CASE WHEN{country}='Canada' THEN {custentityrvstollsandpermits}+{custentityrvswash}+{custentityrvsmiles}*{custentitygd_freightcalculations.custrecordgd_freightcalcperc_canhaulntow} ELSE {custentityrvstollsandpermits}+{custentityrvswash}+{custentityrvsmiles}*{custentitygd_freightcalculations.custrecordgd_freightcalcperc_domhaulntow} END || ';' ||CASE WHEN{country}='Canada' THEN {custentityrvstollsandpermits}+{custentityrvswash}+{custentityrvsmiles}*{custentitygd_freightcalculations.custrecordgd_freightcalcperc_canlowboy} ELSE {custentityrvstollsandpermits}+{custentityrvswash}+{custentityrvsmiles}*{custentitygd_freightcalculations.custrecordgd_freightcalcperc_domlowboy} END"})  
    	    		          ]
    	    	});
    			
    			var searchResult = customerSearch.run().getRange({
    				start: 0,
    				end: 1
    			});

    			var sublistObj = new Object();
    			if(searchResult != null && searchResult.length > 0)
    			{
    				var freightFuelSemiColonSeperatedValue = searchResult[0].getValue({name: 'formulatext'}); //This is the last field on the search performed above
    				var freightFuelArray = freightFuelSemiColonSeperatedValue.split(';');
    				if(freightFuelArray != null) {
    					if(freightFuelArray.length > FREIGHT_CHARGE_COLUMN_INDEX)
    						freightCharge = parseFloat(freightFuelArray[FREIGHT_CHARGE_COLUMN_INDEX]);
    					if(freightFuelArray.length > FUEL_CHARGE_COLUMN_INDEX)
    						fuelCharge = parseFloat(freightFuelArray[FUEL_CHARGE_COLUMN_INDEX]);
    					if (freightFuelArray.length > CDL_CHARGE_COLUMN_INDEX)
    						cdlCharge = parseFloat(freightFuelArray[CDL_CHARGE_COLUMN_INDEX]);
    					if (freightFuelArray.length > HAUL_AND_TOW_CHARGE_COLUMN_INDEX)
    						haulAndTowCharge = parseFloat(freightFuelArray[HAUL_AND_TOW_CHARGE_COLUMN_INDEX] || 0);
    					if (freightFuelArray.length > LOWBOY_CHARGE_COLUMN_INDEX)
							lowboyCharge = parseFloat(freightFuelArray[LOWBOY_CHARGE_COLUMN_INDEX] || 0);
    				}
    				
    				if(isNaN(freightCharge))
    					freightCharge = 0;
    				if(isNaN(fuelCharge))
    					fuelCharge = 0;
    				if(isNaN(cdlCharge))
    					cdlCharge = 0;
    				if(isNaN(cdlCharge))
    					cdlCharge = 0;
    				
    				//Round up freight and fuel surcharge to the nearest dollar.
    				//Example, if the amount is $100.01, we want it to be $101.00
    				freightCharge = SSLib_Util.getNearestDollar(freightCharge);
    				fuelCharge = SSLib_Util.getNearestDollar(fuelCharge);
    				cdlCharge = SSLib_Util.getNearestDollar(cdlCharge);
    				haulAndTowCharge = SSLib_Util.getNearestDollar(haulAndTowCharge);
    				lowboyCharge = SSLib_Util.getNearestDollar(lowboyCharge);
    				
    				//set the cdl charge if it doesn't match what's already there
    				if (dealerRecord.getValue({fieldId: 'custentityrvs_cdlfreightcharge'}) != cdlCharge) {
    					dealerObject.custentityrvs_cdlfreightcharge = cdlCharge;
    					needToSubmitDealer = true;
    				}
    				
    				//set the haul and tow charge if it doesn't match what's already there
    				if (dealerRecord.getValue({fieldId: 'custentitygd_haulandtowfreightcharge'}) != haulAndTowCharge) {
    					dealerObject.custentitygd_haulandtowfreightcharge = haulAndTowCharge;
    					needToSubmitDealer = true;
    				}
    				//set the lowboy charge if it doesn't match what's already there
    				if (dealerRecord.getValue({fieldId: 'custentitygd_lowboyfreightcharge'}) != lowboyCharge) {
    					dealerObject.custentitygd_lowboyfreightcharge = lowboyCharge;
    					needToSubmitDealer = true;
    				}
    				
    				//This dealer has Item Pricing lines
    				if(itemPriceSublistCount > 0) {
    					for(var i = 0; i < itemPriceSublistCount; i++) {
    						dealerRecord.selectLine({sublistId: itemPriceSublist, line: i});
    						//Set freight charge total
    						if(dealerRecord.getCurrentSublistValue({sublistId: itemPriceSublist, fieldId: 'item'}) == FREIGHT_CHARGE_ITEM_ID) {
    							sublistObj.itemId = FREIGHT_CHARGE_ITEM_ID;
        						sublistObj.price = freightCharge;
        						sublistObj.index = i;
        						dealerObject.sublist.push(sublistObj);
        						sublistObj = {};
    							hasFreightLine = true;
    						}
    						//Set fuel charge total
    						if(dealerRecord.getCurrentSublistValue({sublistId: itemPriceSublist, fieldId: 'item'}) == FUEL_CHARGE_ITEM_ID) {
    							sublistObj.itemId = FUEL_CHARGE_ITEM_ID;
        						sublistObj.price = fuelCharge;
        						sublistObj.index = i;
        						dealerObject.sublist.push(sublistObj);
        						sublistObj = {};
    							hasFuelLine = true;
    						}
    					}
    					//In case there are other items in the item pricing that are not freight or fuel charge,
    					//or if there is one but not the other, we need to make sure that we add them
    					if(!hasFreightLine) {
    						sublistObj.itemId = FREIGHT_CHARGE_ITEM_ID;
    						sublistObj.price = freightCharge;
    						sublistObj.index = -1;
    						dealerObject.sublist.push(sublistObj);
    						sublistObj = {};
    						hasFreightLine = true;
    					}
    					
    					if(!hasFuelLine) {
    						sublistObj.itemId = FUEL_CHARGE_ITEM_ID;
    						sublistObj.price = fuelCharge;
    						sublistObj.index = -1;
    						dealerObject.sublist.push(sublistObj);
    						sublistObj = {};
    						hasFuelLine = true;
    					}
    					
    					if(hasFreightLine || hasFuelLine)	
    						needToSubmitDealer = true;
    				}
    				//This dealer has no item Pricing lines, add fuel and freight charge lines
    				else {
    					sublistObj.itemId = FREIGHT_CHARGE_ITEM_ID;
						sublistObj.price = freightCharge;
						sublistObj.index = -1;
						dealerObject.sublist.push(sublistObj);
						sublistObj = {};
    					sublistObj.itemId = FUEL_CHARGE_ITEM_ID;
						sublistObj.price = fuelCharge;
						sublistObj.index = -1;
						dealerObject.sublist.push(sublistObj);
						sublistObj = {};
    					needToSubmitDealer = true;
    				}				
    			} else {
    				//Could not find this dealer's search record.
    				//This will happen if Miles field is not set on the dealer since the search above filters by Miles.
    				
    				//Set the cdl charge to 0 if it doesn't exist.
    				if (SSLib_Util.convertNSFieldToString(dealerRecord.getValue({fieldId: 'custentityrvs_cdlfreightcharge'})).length == 0) {
    					dealerObject.custentityrvs_cdlfreightcharge = 0;
    					needToSubmitDealer = true;
    				}
    				
    				//In this case if there are no item pricing lines, we add the 2 lines with 0 price
    				if(itemPriceSublistCount == 0) {
    					sublistObj.itemId = FREIGHT_CHARGE_ITEM_ID;
						sublistObj.price = 0;
						sublistObj.index = -1;
						dealerObject.sublist.push(sublistObj);
						sublistObj = {};
    					sublistObj.itemId = FUEL_CHARGE_ITEM_ID;
						sublistObj.price = 0;
						sublistObj.index = -1;
						dealerObject.sublist.push(sublistObj);
						sublistObj = {};
    					needToSubmitDealer = true;
    				}
    				//If there are lines, make sure that they are freight and fuel surcharge lines
    				else {
    					//This should almost never happen. But in case item pricing has other items other than
    					//freight and fuel surcharge, than we need to make sure that we add freight and fuel lines
    					//Loop through the lines, and check if their exist freight and fuel surcharge lines
    					var j = 0;
    					for(var i = 0; i < itemPriceSublistCount; i++) {
    						dealerRecord.selectLine({sublistId: itemPriceSublist, line: i});
    						if(dealerRecord.getSublistValue({sublistId: itemPriceSublist, fieldId: 'item', line: i}) == FREIGHT_CHARGE_ITEM_ID) {
    							hasFreightLine = true;
    							
    							//Make sure that freight charge is rounded up.
    							freightCharge = parseFloat(dealerRecord.getSublistValue({sublistId: itemPriceSublist, fieldId: 'price', line: i}));
    							if(freightCharge != 0 && freightCharge != SSLib_Util.getNearestDollar(freightCharge)) {
    								sublistObj.itemId = dealerRecord.getSublistValue({sublistId: itemPriceSublist, fieldId: 'item', line: i});
    								sublistObj.price = SSLib_Util.getNearestDollar(freightCharge);
    								sublistObj.index = i;
    								dealerObject.sublist.push(sublistObj);
    								sublistObj = {};
    								needToSubmitDealer = true;
    							}
    						}
    							
    						if(dealerRecord.getSublistValue({sublistId: itemPriceSublist, fieldId: 'item', line: i}) == FUEL_CHARGE_ITEM_ID) {
    							hasFuelLine = true;
    	
    							//Make sure that fuel charge is rounded up.
    							fuelCharge = parseFloat(dealerRecord.getSublistValue({sublistId: itemPriceSublist, fieldId: 'price', line: i}));
    							if(fuelCharge != 0 && fuelCharge != SSLib_Util.getNearestDollar(fuelCharge)) {
    								sublistObj.itemId = dealerRecord.getSublistValue({sublistId: itemPriceSublist, fieldId: 'item', line: i});
    								sublistObj.price = SSLib_Util.getNearestDollar(fuelCharge);
    								sublistObj.index = i;
    								dealerObject.sublist.push(sublistObj);
    								sublistObj = {};
    								needToSubmitDealer = true;
    							}						
    						}
    					}
    									
    					if(!hasFreightLine){ //If there is no freight surcharge line, then add it
							sublistObj.itemId = FREIGHT_CHARGE_ITEM_ID;
							sublistObj.price = 0;
							sublistObj.index = i;
							dealerObject.sublist.push(sublistObj);
							sublistObj = {};
    					}
    						
    					if(!hasFuelLine){ //If there is no fuel surcharge line, then add it
							sublistObj.itemId = FUEL_CHARGE_ITEM_ID;
							sublistObj.price = 0;
							sublistObj.index = i;
							dealerObject.sublist.push(sublistObj);
							sublistObj = {};
    					}
    					
    					//If one or both of the lines are not in the list, then the record must have been changed from above
    					//so, submit the record with the new information.
    					if(!hasFreightLine || !hasFuelLine)
    						needToSubmitDealer = true;
    				}
    			}
    			
    			//Dealer record was changed, so save the changes and update the open sales orders.
    			if(needToSubmitDealer){
    				if (dealerObject != null)
    					dealerOrderHash[dealerId] = dealerObject;

    				return true;
    			}
    		}
    	}
    	return false;
    }
    
    /**
     * Adds price line item for the specified dealer.
     * @param {Object} dealerRecord
     * @param {Object} itemId
     * @param {Object} price
     */
    function AddDealerItemPricingLine(dealerRecord, itemId, price){
    	if(dealerRecord != null && itemId.trim() != ''){
    		var itemPriceSublist = 'itempricing';
    		dealerRecord.selectNewLine({sublistId: itemPriceSublist});
    		dealerRecord.setCurrentSublistValue({sublistId: itemPriceSublist, fieldId: 'price', value: price});
    		dealerRecord.setCurrentSublistValue({sublistId: itemPriceSublist, fieldId: 'level', value: '-1'});
    		dealerRecord.setCurrentSublistValue({sublistId: itemPriceSublist, fieldId: 'item', value: itemId});
    		
    		//Set the currency for the line based on the default subsidiary of the dealer. Only do this for OneWorld accounts.
    		if (IS_ONEWORLD_ACCOUNT == 'T'){
    			var currencyString = search.lookupFields({type: 'subsidiary', id: dealerRecord.getFieldValue('subsidiary'), columns: 'currency'});
    			dealerRecord.setCurrentSublistValue({sublistId: itemPriceSublist, fieldId: 'currency', value: currencyString});
    		}
    		
    		dealerRecord.commitLine({sublistId:itemPriceSublist});
    	}
    }

    return {
        getInputData: getInputData,
        map: map,
        summarize: summarize
    };
});