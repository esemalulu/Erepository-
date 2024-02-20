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

define(['N/record', 'N/search', 'N/runtime', 'N/task', 'SuiteScripts/SSLib/2.x/SSLib_Util', 'SuiteScripts/SSLib/2.x/SSLib_Task'],
/**
 * @param {record} record
 * @param {search} search
 * @param {runtime} runtime
 */
function(record, search, runtime, task, SSLib_Util, SSLib_Task) {
	var scriptObj = runtime.getCurrentScript();
	var OLD_REP = scriptObj.getParameter({name: 'custscriptgd_swapsalesrep_oldrepparam_mp'});
	var NEW_REP = scriptObj.getParameter({name: 'custscriptgd_swapsalesrep_newrepparam_mp'});
	
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
    	var seriesString = scriptObj.getParameter({name: 'custscriptgd_swapsalesrep_seriesparam_mp'}) || null;
    	var stateString = scriptObj.getParameter({name: 'custscriptgd_swapsalesrep_shipstate_mp'}) || null;
    	var dealerString = scriptObj.getParameter({name: 'custscriptgd_swapsalesrep_dealer_mp'}) || null;

    	//convert the states and dealers into arrays
    	var states = new Array();
    	var dealers = new Array();
    	if(stateString != null && stateString.length > 0) states = JSON.parse(stateString);
    	if(dealerString != null && dealerString.length > 0) dealers = JSON.parse(dealerString);

    	var series = new Array();
    	series = seriesString.split(',');
    	
    	return SearchUnitsAndOrdersBySalesRep(OLD_REP, series, states, dealers);
    }
    /**
     * Submit each of the key/value pairs in the dictionary.
     *
     * @param {MapSummary} context - Data collection containing the key/value pairs to process through the map stage
     * @since 2015.1
     */
    function map(context) {
    	var orderAndUnitObject = JSON.parse(context.value);
    	try{
    		if(orderAndUnitObject.recordType == 'salesorder')
    			record.submitFields({type: orderAndUnitObject.recordType, id: orderAndUnitObject.id, values: {'salesrep': NEW_REP}, options: {enableSourcing: false, ignoreMandatoryFields : true}});
    		if(orderAndUnitObject.recordType == 'customrecordrvsunit')
    			record.submitFields({type: orderAndUnitObject.recordType, id: orderAndUnitObject.id, values: {'custrecordunit_salesrep': NEW_REP}, options: {enableSourcing: false, ignoreMandatoryFields : true}});
    	}
    	//Try again in case of collision error.
    	catch(err) {
    		if(orderAndUnitObject.recordType == 'salesorder')
    			record.submitFields({type: orderAndUnitObject.recordType, id: orderAndUnitObject.id, values: {'salesrep': NEW_REP}, options: {enableSourcing: false, ignoreMandatoryFields : true}});
    		if(orderAndUnitObject.recordType == 'customrecordrvsunit')
    			record.submitFields({type: orderAndUnitObject.recordType, id: orderAndUnitObject.id, values: {'custrecordunit_salesrep': NEW_REP}, options: {enableSourcing: false, ignoreMandatoryFields : true}});
    	}
    }
    
    /**
     * Get Sales Orders and Unit records internal id and record type and returns an array of objects.
     *
     * @param salesRep - the old sales rep being replaced.
     * @param series - an array of series selected by the user for filtering.
     * @param states - an array of states selected by the user for filtering.
     * @param dealers - an array of dealers selected by the user for filtering.
     * 
     */
    function SearchUnitsAndOrdersBySalesRep(salesRep, series, states, dealers)
    {
    	var filters = [['salesrep', 'anyof', salesRep], 'AND',
    		          ['custbodyrvsseries', 'anyof', series], 'AND',
    		          ['memorized', 'is', false], 'AND',
    		          ['mainline', 'is', true]];

    	// Only filter the dealers if users chose dealers to filter with.
    	if (dealers != null) {
    		filters.push('AND');
    		filters.push(['entity', 'anyof', dealers]);
    	}

    	// Only filter the states if users chose state to filter with.
    	if (states != null && states != '') {
    		filters.push('AND');
    		filters.push(['shipstate', 'anyof', states]);
    	}

    	var orderAndUnitArray = new Array();
    	var salesOrdersBySalesRepResultsData = search.create({
    		type: search.Type.SALES_ORDER,
    		filters: filters
    	}).runPaged({pageSize: 1000});
    	salesOrdersBySalesRepResultsData.pageRanges.forEach(function(pageRange) {
    		salesOrdersBySalesRepResultsData.fetch({index: pageRange.index}).data.forEach(function(result) {
    			orderAndUnitArray.push({id:result.id, recordType: 'salesorder'});
    		});
    	});

    	var filters = [['custrecordunit_salesrep', 'anyof', salesRep], 'AND',
    		          ['custrecordunit_series', 'anyof', series]];
    	
    	// Only filter the dealers if users chose dealers to filter with.
    	if (dealers!= null) {
    		filters.push('AND');
    		filters.push(['custrecordunit_salesorder.entity', 'anyof', dealers]);
    	}

    	// Only filter the states if users chose state to filter with.
    	if (states != null && states != '') {
    		filters.push('AND');
    		filters.push(['custrecordunit_salesorder.shipstate', 'anyof', states]);
    	}

    	var index = 0;
    	var unitsBySalesRepResultsData = search.create({
    		type: 'customrecordrvsunit',
    		filters: filters
    	}).runPaged({pageSize: 1000});
    	unitsBySalesRepResultsData.pageRanges.forEach(function(pageRange) {
    		unitsBySalesRepResultsData.fetch({index: pageRange.index}).data.forEach(function(result) {
    			orderAndUnitArray.push({id:result.id, recordType: 'customrecordrvsunit'});
    		});
    	});

    	return orderAndUnitArray;
    }
	
    /**
     * Executes when the summarize entry point is triggered and applies to the result set.
     *
     * @param {Summary} summary - Holds statistics regarding the execution of a map/reduce script
     * @since 2015.1
     */
    function summarize(summary) {

    }
    
    return {
        getInputData: getInputData,
        map: map,
        summarize: summarize
    };
    
});