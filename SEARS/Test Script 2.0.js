/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * 
 */
/**
 * Version      Date            Author      Remark  
 * 1.0          27-Jan-2017     Balaraman   To set OriginLocationId value (one among 1, 4, 7 & 37) (by default) for booking with CleadD service, without failure. Refrence: /*n*./ marked lines
 */
define(['./Sears Scripts/NSUtil', 'N/record', 'N/search','N/format', 'N/runtime'],
/**
 * @param {Object} nsutil
 * @param {Object} LibClearD
 * @param {record} record
 * @param {search} search
 * @param {format} format
 * @param {runtime} runtime
 */
function(nsutil, record, search, format, runtime)
{
	var EntryPoint = {};

	var LOG_TITLE = 'LibShipDelivery';

    EntryPoint.beforeLoad = function(sku) {
    	sku = "10246306_I";
        var stLogTitle = 'getInventoryItemVolume::';
        var volume = false;

        log.debug(stLogTitle, 'sku is ' + sku);
        
        if(!nsutil.isEmpty(sku)){
	        // Hold the location data
	        var objLocationData = null;
	        var arrFilters = [];
	        arrFilters.push(search.createFilter({name: 'isinactive', operator: 'IS', values : ['F']}));
	        arrFilters.push(search.createFilter({name: 'itemid', operator: 'IS', values : [sku]}));
	        // Set the column
	        var arrColumns = [];
	        arrColumns.push(search.createColumn({name: 'custitem_height'}));
	        arrColumns.push(search.createColumn({name: 'custitem_width'}));
	        arrColumns.push(search.createColumn({name: 'custitem_length'}));
	        // Create levy amount search
	        var objNearestLoSearch = search.create({
	        	type: 'inventoryitem',
	        	columns: arrColumns,
	        	filters: arrFilters
	        });
	        // Run search and get the last instance of levy amount
	        objNearestLoSearch.run().each(function(result) {
	        	// Compare the province
	        	var height = result.getValue('custitem_height');
	        	var width = result.getValue('custitem_width');
	        	var length = result.getValue('custitem_length');

	        	log.debug(stLogTitle + 'h, w, l', height + ', ' + width + ', ' + length);
	        	log.debug(stLogTitle + 'h, w, l typeof', typeof height + ', ' + typeof width + ', ' + typeof length);

	        	if (!nsutil.isEmpty(height) && !nsutil.isEmpty(width) && !nsutil.isEmpty(length)) {
	        		if(height > 0 && width > 0 && length > 0 ){
	        			volume = (height/12) * (width/12) * (length/12);
	        		}
	        	}
	        });
    	}
      log.debug('Volume', volume);
        return volume;
    };

    return EntryPoint;
});