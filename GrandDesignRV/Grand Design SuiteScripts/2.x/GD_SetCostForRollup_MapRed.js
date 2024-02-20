/**
 * @NApiVersion 2.x
 * @NScriptType MapReduceScript
 * @NModuleScope SameAccount
 */
var ITEMHASH_ITEMCOST = "cost";
var ITEMHASH_TYPE = 'itemtype';
define(['N/record', 'N/search', 'N/runtime', 'SuiteScripts/SSLib/2.x/SSLib_Util', 'SuiteScripts/SSLib/2.x/SSLib_Task'],
/**
 * @param {record} record
 * @param {search} search
 * @param {runtime} runtime
 */
function(record, search, runtime, SSLib_Util, SSLib_Task) {
   
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
    	//NetSuite has a bug as of May 2017 that prevents us from using whenOrderedBy fields in code searches in SS 2.x.
    	//In order to get around this, we need to do two separate seaches, using the max columns in the first search to build a giant filter expression
    	// for the second search.
    	//This results in the same effect as doing a whenOrderedBy search, but takes longer. It'd be a good idea to switch this back at some point after NS gets their crap together.
    	//Also, searching for 15000+ items in a filter expression doesn't work, so we need to do it in batches of less than 1000.
    	var partsAndServiceLoc = runtime.getCurrentScript().getParameter({name: 'custscriptpartsandwarrantylocation'});
    	var lastPPResults = [];
    	var lastPPDateResultData = search.create({
    		type: 'transaction',
    		filters: [['location', 'noneof', partsAndServiceLoc], 'AND',
    		          ['type', 'anyof', ['InvAdjst', 'ItemRcpt', 'InvWksht']], 'AND',
    		          ['item', 'noneof', '@NONE@'], 'AND',
    		          ['account.type', 'anyof', 'OthCurrAsset'], 'AND',
    		          ['item.type', 'anyof', ['InvtPart', 'NonInvtPart']]
    				 ],
    		columns: [search.createColumn({name: 'item', summary: 'group'}),
    		          search.createColumn({name: 'trandate', summary: 'max'})]
    	}).runPaged({pageSize: 1000});
    	lastPPDateResultData.pageRanges.forEach(function(pageRange) {
    		//Build the filter expression.
    		var curLastPPExp = [];
    		lastPPDateResultData.fetch({index: pageRange.index}).data.forEach(function(result){
    			curLastPPExp.push([['item', 'is', result.getValue({name: 'item', summary: 'group'})], 'AND',
			                       ['trandate', 'on', result.getValue({name: 'trandate', summary: 'max'})]]);
    			curLastPPExp.push('OR');
    			
    			//If the filter exp is long enough, do the search and then keep going.
    			if(curLastPPExp.length > 100) {
    				if(curLastPPExp[curLastPPExp.length - 1] == 'OR') curLastPPExp.splice(-1, 1);
    				var lastPPSearch = search.create({
    	        		type: 'transaction',
    	        		filters: [['location', 'noneof', partsAndServiceLoc], 'AND',
    	        		          ['type', 'anyof', ['InvAdjst', 'ItemRcpt', 'InvWksht']], 'AND',
    	        		          ['account.type', 'anyof', 'OthCurrAsset'], 'AND',
    	        		          curLastPPExp
    	        				 ],
    	        		columns: [search.createColumn({name:'item', summary: 'group'}), 
    	        		          search.createColumn({name:'rate', summary: 'max'})]
    	        	});
    	    		lastPPSearch.run().each(function(result){
    	    			lastPPResults.push(result);
    	    			return true;
    	    		});
    	    		log.debug('here', '--did intermediate search--');
    	    		curLastPPExp = [];
    			}
    			
    			return true;
    		});
    		//Do one more search in case we missed some.
    		if(curLastPPExp.length > 0) {
				if(curLastPPExp[curLastPPExp.length - 1] == 'OR') curLastPPExp.splice(-1, 1);
				var lastPPSearch = search.create({
	        		type: 'transaction',
	        		filters: [['location', 'noneof', partsAndServiceLoc], 'AND',
	        		          ['type', 'anyof', ['InvAdjst', 'ItemRcpt', 'InvWksht']], 'AND',
	        		          ['account.type', 'anyof', 'OthCurrAsset'], 'AND',
	        		          curLastPPExp
	        				 ],
	        		columns: [search.createColumn({name:'item', summary: 'group'}), 
	        		          search.createColumn({name:'rate', summary: 'max'})]
	        	});
	    		lastPPSearch.run().each(function(result){
	    			lastPPResults.push(result);
	    			return true;
	    		});
			}
    		log.debug('here', '--done with current loop--');
    	});
    	log.debug('here', '--done with last purchase price search--');
    	log.debug('lastPPResults.length', lastPPResults.length);
    	
    	//Get all of the items to update
    	var itemHash = {};
    	var unitsTypeArray = {};
    	var i = 1;
    	var itemMemberPagedData = search.create({
    		type: 'item',
    		filters: [['isinactive','is', false], 'AND',
    		          ['type', 'anyof', ['InvtPart', 'NonInvtPart']], 'AND',
    		          ['formulanumeric: case when {othervendor} = {vendor} or {vendor} is null then 1 else 0 end', 'equalto', '1']],
    		columns: [search.createColumn({name: 'internalid', sort: search.Sort.ASC}),
    		          search.createColumn({name: 'type'}),
    		          search.createColumn({name: 'cost'}),
    		          search.createColumn({name: 'vendorcost'}),
    		          search.createColumn({name: 'vendor'}),
    		          search.createColumn({name: 'unitstype'}),
    		          search.createColumn({name: 'purchaseunit'})]
    	}).runPaged({pageSize: 1000});
    	itemMemberPagedData.pageRanges.forEach(function(pageRange) {
    		itemMemberPagedData.fetch({index: pageRange.index}).data.forEach(function(result){
    			//Determine the cost. Preference:
    			//1. Last purchase price
    			//2. Purchase price 
    			//3. Vendor price 
    			//4. 0
    			var itemId = SSLib_Util.convertNSFieldToString(result.id);
                var cost = GetLastPPResult(lastPPResults, itemId);
                
    			//If either the last PP isn't set or we couldn't find the last PP, use the cost on the item.
    			if(cost == 0)
    			{
    				cost = SSLib_Util.convertNSFieldToFloat(result.getValue({name: 'cost'}));
    				//If the purchase price on the item isn't set, use the preferred vendor's Purchase Price.
    				if (cost == 0)
    				{
    					cost = SSLib_Util.convertNSFieldToFloat(result.getValue({name: 'vendorcost'}));
    				}
    				
    				//If the cost isn't coming from the lastPPResults, then it's in the Purchase Units. It needs to be converted to the base.
    				cost = ConvertUOMtoBase(result.getValue({name: 'unitstype'}), result.getValue({name: 'purchaseunit'}), cost, unitsTypeArray);
    			}
    			
    			//Convert the cost to the base and set it in the hash.
                itemHash[itemId] = {};
                itemHash[itemId][ITEMHASH_ITEMCOST] = cost;
                itemHash[itemId][ITEMHASH_TYPE] = result.getValue({name: 'type'}) == 'InvtPart' ? 'inventoryitem' : 'noninventoryitem';
                
                //Log percent complete if multiple of 100 and restart loop
                if(i % 100 == 0) log.debug('set item', 'item index ' + i + ' complete.');
                i++;
    			return true;
			});
		});
    	
    	//Return the dictionary for the Map stage
    	return itemHash;
    }

    /**
     * Submit each of the key/value pairs in the dictionary.
     *
     * @param {MapSummary} context - Data collection containing the key/value pairs to process through the map stage
     * @since 2015.1
     */
    function map(context) {
    	//Submit each item. Try again if it fails the first time (could be a record collision).
    	var itemData = JSON.parse(context.value);
    	try{
	    	record.submitFields({
	    		type: itemData[ITEMHASH_TYPE],
	    		id: context.key,
	    		values: {
	    			custitemgd_costforrollup: itemData[ITEMHASH_ITEMCOST]
	    		}
	    	});
    	}
    	catch(err) {
    		record.submitFields({
	    		type: itemData[ITEMHASH_TYPE],
	    		id: context.key,
	    		values: {
	    			custitemgd_costforrollup: itemData[ITEMHASH_ITEMCOST]
	    		}
	    	});
    	}
    }

    
    /**
     * Starts the Set Rolled Up Cost map/reduce script.
     *
     * @param {Summary} summary - Holds statistics regarding the execution of a map/reduce script
     * @since 2015.1
     */
    function summarize(summary) {
    	SSLib_Task.startMapReduceScript('customscriptgd_setrolledupcost_mapred', 'customdeploygd_setrolledupcost_sched', {});
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

    return {
        getInputData: getInputData,
        map: map,
        summarize: summarize
    };
    
});
