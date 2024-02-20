/**
 * @NApiVersion 2.x
 * @NScriptType MapReduceScript
 * @NModuleScope SameAccount
 */
var ITEMHASH_ITEMCOST = "cost";
var ITEMHASH_TYPE = 'itemtype';
var ITEMHASH_ITEMUOMTYPE = 'itemuomtype';
var ITEMHASH_ITEMSTOCKUOM = 'itemstockuom';

define(['N/record', 'N/search', 'N/runtime', 'N/format', 'SuiteScripts/SSLib/2.x/SSLib_Util'],
/**
 * @param {record} record
 * @param {search} search
 * @param {runtime} runtime
 * @param {format} format
 * @param {SSLib_Util} SSLib_Util
 */
function(record, search, runtime, format, SSLib_Util) {
   
    /**
     * Marks the beginning of the Map/Reduce process and generates input data.
     *
     * @typedef {Object} ObjectRef
     * @property {number} id - Internal ID of the record instance
     * @property {string} type - Record type id
     *
     * @return {Array|Object|Search|RecordRef} inputSummary
     * @since 2015.1
     */
    function getInputData() {
    	//Get the information about the component items of the Assemblies that need to be updated.
    	//We'll store this info in an array we can use later in the recursive function.
    	var itemMemberResults = [];
    	var todaysDate = format.format({value: new Date(), type: format.Type.DATE});
    	var itemMemberPagedData = search.create({
    		type: 'item',
    		filters: [['type', 'anyof', ['Assembly', 'Kit']], 'AND',
    		          ['custitemrvsitemtype', 'noneof', runtime.getCurrentScript().getParameter({name: 'custscriptitemcategorymodel'})], 'AND',
    		          ['formulanumeric: case when {memberitem.othervendor} = {memberitem.vendor} or {memberitem.vendor} is null then 1 else 0 end', 'equalto', '1'], 'AND',
    		          [['effectivedate', 'isempty', null], 'OR', ['effectivedate', 'onorbefore', todaysDate]], 'AND',
    		          [['obsoletedate', 'isempty', null], 'OR', ['obsoletedate', 'onorafter', todaysDate]]],
    		columns: [search.createColumn({name: 'internalid', sort: search.Sort.ASC}),
    		          search.createColumn({name: 'memberline', sort: search.Sort.ASC}),
    		          search.createColumn({name: 'vendor', join: 'memberItem', sort: search.Sort.ASC}),
    		          search.createColumn({name: 'memberquantity'}),
    		          search.createColumn({name: 'internalid', join: 'memberItem'}),
    		          search.createColumn({name: 'type', join: 'memberItem'}),
    		          search.createColumn({name: 'cost', join: 'memberItem'}),
    		          search.createColumn({name: 'lastpurchaseprice', join: 'memberItem'}),
    		          search.createColumn({name: 'vendorcost', join: 'memberItem'}),
    		          search.createColumn({name: 'vendorcostentered', join: 'memberItem'}),
    		          search.createColumn({name: 'unitstype', join: 'memberItem'}),
    		          search.createColumn({name: 'purchaseunit', join: 'memberItem'}),
    		          search.createColumn({name: 'stockunit', join: 'memberItem'}),
    		          search.createColumn({name: 'isinactive'}),
    		          search.createColumn({name: 'custitemrvsrolledupcost'}),
    		          search.createColumn({name: 'formulanumeric', formula: "{memberitem.vendorcostentered}"})]
    	}).runPaged({pageSize: 1000});
    	itemMemberPagedData.pageRanges.forEach(function(pageRange) {
    		itemMemberPagedData.fetch({index: pageRange.index}).data.forEach(function(result){
				itemMemberResults.push(result);
			});
		});
    	
    	// we will need to convert the cost down to the base UOM so keep track of the UOMs
    	var unitTypeArray = new Array();
    	
    	var itemHash = {};
    	//Loop over all assemblies and kits in the system to update their prices.
    	var itemsPagedData = search.create({
    		type: 'item',
    		filters: [['type', 'anyof', ['Assembly', 'Kit']]],
    		columns: [search.createColumn({name: 'internalid', sort: search.Sort.ASC}),
    		          search.createColumn({name: 'type'}),
    		          search.createColumn({name: 'unitstype'}),
    		          search.createColumn({name: 'stockunit'})]
    	}).runPaged({pageSize: 1000});
    	itemsPagedData.pageRanges.forEach(function(pageRange) {
    		itemsPagedData.fetch({index: pageRange.index}).data.forEach(function(result){
    			//For each Assembly that we need to update, start a recursive function to update its cost and the cost of its assemblies.
    			SetDataInItemHash(result.id, result.getValue({name: 'type'}), result.getValue({name: 'unitstype'}), result.getValue({name: 'stockunit'}), itemHash, itemMemberResults, unitTypeArray);
			});
		});
    	
    	//Convert all of the costs to the stock UOM. We can't do this in the loop or it will incorrectly sum the cost in the parent.
    	ConvertItemHashCostsToStock(itemHash, unitTypeArray);
    	
    	var hashString = JSON.stringify(itemHash);

    	//Return the hash of assembly/kit items. They will be submitted one by one in the map.
    	return itemHash;
    }
    
    /**
     * Submits each assembly item in the itemHash from getInputData
     *
     * @param {MapSummary} context - Data collection containing the key/value pairs to process through the map stage
     * @since 2015.1
     */
    function map(context) {
    	//Submit each item, converting the cost to the Stock UOM if possible.
    	var itemData = JSON.parse(context.value);

    	//Submit the field.
    	record.submitFields({
    		type: itemData[ITEMHASH_TYPE],
    		id: context.key,
    		values: {
    			custitemrvsrolledupcost: itemData[ITEMHASH_ITEMCOST]
    		}
    	});
    }
    
    /**
     * Recursive function to set item rolled up cost and future cost in the dictionary
     * 
     * @param {String} itemId Internal id of the item
     * @param {String} itemType NetSuite search item type of the item id
     * @param {String} itemUnitsType Internal ID of the Units type for this assembly item. Will be null/empty for kits.
     * @param {String} itemStockUnits Internal ID of the Stock UOM for this assembly item. Will be null/empty for kits.
     * @param {Object} itemHash The hash/dictionary of items with data properties cost and fcost
     * @param {Array} itemMemberResults Array of search results for all member items of the items that need to be updated.
     * @param {Array} unitTypeArray list of unit types to convert purchase price to base UOM.
     */
    function SetDataInItemHash(itemId, itemType, itemUnitsType, itemStockUnits, itemHash, itemMemberResults, unitTypeArray) {
    	//If the requested item already appears in the itemHash, then return that item.
    	if (itemHash[itemId] != null) return itemHash[itemId];
    	
    	//If it doesn't exist, then we need to set the rolled up cost in the itemArray.
    	//Get the member results that correspond to this item. The member items are sorted by internalid of the assembly item,
    	// so we can do a binary search to get the member item in the array. memberIndex will be -1 if no items are found.
    	var memberIndex = GetIndexOfItemIdInMemberResults(itemId, itemMemberResults);
    	var totalCost = 0;
    	if (memberIndex > -1) {
    		for (var i = memberIndex; i < itemMemberResults.length; i++) {
    			//Make sure that we're still processing the items for this assembly.
    			if (itemMemberResults[i].id == itemId) {
    				//Get the qty of the member item. We'll use this regardless of the item type
    				var curQty = SSLib_Util.convertNSFieldToFloat(itemMemberResults[i].getValue({name: 'memberquantity'}));
    				
    				//If this item is an assembly, then we need to get its cost and fcost from its components. This is the recursive step.
    				var memberType = itemMemberResults[i].getValue({name: 'type', join: 'memberItem'});
    				if (memberType == 'Assembly' || memberType == 'Kit') {
						var itemElement = SetDataInItemHash(itemMemberResults[i].getValue({name: 'internalid', join: 'memberItem'}), memberType, itemMemberResults[i].getValue({name: 'unitstype', join: 'memberItem'}), itemMemberResults[i].getValue({name: 'stockunit', join: 'memberItem'}), itemHash, itemMemberResults, unitTypeArray);
						if (itemElement != null) {
    						totalCost += itemElement[ITEMHASH_ITEMCOST] * curQty;
    					}
    				}
    				
    				//Otherwise we just add it to the current assembly's cost, remembering to multiply by the quantity.
    				else {
    					//Get the current cost of the member item. The preference of cost is
    					// 1. Preferred Vendor's Cost
    					// 2. Purchase Price
    					// 3. Zero
    					var prefVendorCost = itemMemberResults[i].getValue({name: 'formulanumeric'});
    					var prefVendor = itemMemberResults[i].getValue({name: 'vendor', join: 'memberItem'}) || undefined; // if preferred vendor is empty we need to make sure it does not use vendor cost so set it to undefined.
    					var purchPrice = itemMemberResults[i].getValue({name: 'cost', join: 'memberItem'});
    					var lastPurchPrice = itemMemberResults[i].getValue({name: 'lastpurchaseprice', join: 'memberItem'});
    					
    					var curCost = 0;
    					if (!isNaN(prefVendorCost) && !isNaN(prefVendor))
    					{
    						curCost = SSLib_Util.convertNSFieldToFloat(prefVendorCost);
    					}
    					else if (!isNaN(purchPrice))
    					{
    						curCost = SSLib_Util.convertNSFieldToFloat(purchPrice);
    					}
    					
    					//Convert the cost to the base
    					var costConvertedToBase = ConvertUOMtoBase(itemMemberResults[i].getValue({name: 'unitstype', join: 'memberItem'}), itemMemberResults[i].getValue({name: 'purchaseunit', join: 'memberItem'}), curCost, unitTypeArray);
    					totalCost += curQty * costConvertedToBase;
    				}
    			}
    			else {
    				break;
    			}
    		}
    		
    		//Add a new item to the itemHash with the total cost info
    		var itemDataObj = {};
    		itemDataObj[ITEMHASH_TYPE] = (itemType == 'Assembly' ? 'assemblyitem' : 'kititem');
    		itemDataObj[ITEMHASH_ITEMUOMTYPE] = itemUnitsType;
    		itemDataObj[ITEMHASH_ITEMSTOCKUOM] = itemStockUnits;
    		itemDataObj[ITEMHASH_ITEMCOST] = totalCost;
    		itemHash[itemId] = itemDataObj;
    		return itemDataObj;
    	}
    	return null;
    }
    
    /**
     * Loops over all of the keys in the itemHash and converts their costs to the Stock UOM.
     */
    function ConvertItemHashCostsToStock(itemHash, unitsTypeArray) {
    	for (var itemId in itemHash) {
    		//Make sure the units type and stock UOM are set so we can actually do the conversion.
    		var itemDataObj = itemHash[itemId];
    		var unitsTypeId = SSLib_Util.convertNSFieldToString(itemDataObj[ITEMHASH_ITEMUOMTYPE]);
    		var stockUOMId = SSLib_Util.convertNSFieldToString(itemDataObj[ITEMHASH_ITEMSTOCKUOM]);
	    	if (unitsTypeId.length > 0 && stockUOMId.length > 0)
	    	{
	    		//Load the unitsType record
	    		var unitsType = null;	
	    		if (unitsTypeArray[unitsTypeId] == null)
	    		{		
	    			unitsTypeArray[unitsTypeId] = record.load({type: 'unitstype', id: unitsTypeId});
	    		}
	    		unitsType = unitsTypeArray[unitsTypeId];
	    		
	    		//Find the stock UOM and do the conversion.
	    		for (var i=0; i<unitsType.getLineCount({sublistId: 'uom'}); i++)
	    		{
	    			if (unitsType.getSublistValue({sublistId: 'uom', fieldId: 'internalid', line: i}) == stockUOMId) {
	    				itemDataObj[ITEMHASH_ITEMCOST] = itemDataObj[ITEMHASH_ITEMCOST] / SSLib_Util.convertNSFieldToFloat(unitsType.getSublistValue({sublistId: 'uom', fieldId: 'conversionrate', line: i}));  
	    				break;
	    			}
	    		}
	    	}
    	}
    }
    
    /**
     * Does a binary search to determine the first item in the list of memberResults that matches the itemId
     */
    function GetIndexOfItemIdInMemberResults(itemId, memberResults) {
    	var binaryIndex = GetIndexOfItemIdInMemberResultsBinary(itemId, memberResults);
    	
    	//Found a index of the item id but it might not be the first so work backwards until we find the correct one
    	if (binaryIndex != -1) {
    		var indexOf = binaryIndex-1;
    		
    		if (binaryIndex == 0)
    			return binaryIndex;
    		else
    		{	
    			//We found the index but it might not be the correct one because the internalid isn't unique due to the member items
    			// so we need to work backward until we find an id that doesn't match or we are at the end of the list.
    			while (indexOf > 0)
    			{
    				var tempItemId = memberResults[indexOf].id;
    				if (itemId != tempItemId)
    					return indexOf+1; // return indexof + 1 because we have already decremented the indexof
    				else
    					indexOf--;
    			}	
    			return indexOf;
    		}
    	}
    	else
    		return -1;
    }

    /**
     * Finds the itemId in the memberResults
     */
    function GetIndexOfItemIdInMemberResultsBinary(itemId, memberResults) {	
    	var high = memberResults.length - 1;
    	var low = 0;
    	itemId = parseInt(itemId);
    	
    	while (low <= high) 
    	{
    		var mid = parseInt((low + high) / 2);
    		var element = parseInt(memberResults[mid].id);
    		
    		if (element > itemId) 
    			high = mid - 1;
    		else if (element < itemId) 
    			low = mid + 1;
    		else 
    			return mid;
    	}
    	
    	return -1;
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
        map: map
    };
    
});