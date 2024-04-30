/**
 * @NApiVersion 2.x
 * @NScriptType MapReduceScript
 * @NModuleScope SameAccount
 */
define(['N/search','N/log','N/record','N/runtime','N/format','N/error'],

function(search,log,record,runtime,format,error) {
   
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
    function getInputData(context) {
    	var DEBUG_IDENTIFIER = 'getInputData';
    	log.debug(DEBUG_IDENTIFIER,'--START--');
    	try{
    	var savedSearchId = runtime.getCurrentScript().getParameter('custscript_ifd_mr_siinvadjsearch');
    	if (isNullOrEmpty(savedSearchId)) {
    		//log.debug(DEBUG_IDENTIFIER,'The Split Item saved search is empty. Please set the value of the script parameter.');
    		var e = error.create({
			name: 'GETINPUTDATA_STAGE_FAILED',
			message: 'The Split Item saved search is empty. Please set the value of the script parameter.'
			});
			log.error(DEBUG_IDENTIFIER, e.message);
    		return;
		}
    	
    	var searchRecord = search.load({
            id: savedSearchId
        });  	
  
    	return searchRecord;
       
        
        log.debug(DEBUG_IDENTIFIER,'--END--');
    	}
    	catch (ex) {
			var errorStr = (ex.getCode != null) ? ex.getCode() + '\n'
					+ ex.getDetails() + '\n' : ex.toString();
			log.debug('ERROR', 'error on ' + DEBUG_IDENTIFIER + ' function : '
					+ errorStr);
		}
    	
    }

    /**
     * Executes when the map entry point is triggered and applies to each key/value pair.
     *
     * @param {MapSummary} context - Data collection containing the key/value pairs to process through the map stage
     * @since 2015.1
     */
   function map(context) {
		var FUNC_NAME = 'MAP';
		var errorMessage;
		var uniqueKeyForLogging = 0;
		var docArray = [];		
		log.debug(FUNC_NAME, 'Start');
		log.debug(FUNC_NAME, 'context.value: ' + context.value);
		try {
			var masterItemProduct = 0;
			var newUnitCost = 0;
			var searchResult = JSON.parse(context.value);
			var inventoryAdjusmentId = searchResult.id;		
									
			log.debug(FUNC_NAME, 'searchResult: ' + JSON.stringify(searchResult)+ ' inventoryAdjusmentId: ' + inventoryAdjusmentId);
			
			var rec = record.load({
							    type: 'inventoryadjustment', 
							    id: inventoryAdjusmentId
							});
			var recNumber = rec.getValue({
				fieldId: 'tranid'
			});
			
			var recCount = rec.getLineCount({
				sublistId: 'inventory'
			});
			
			log.debug(FUNC_NAME, 'recCount: ' +recCount);
			
			for(i = 0; i < recCount; i++)
			{
				var adjQtyBy = rec.getSublistValue({
					sublistId: 'inventory',
					fieldId: 'adjustqtyby',
					line: i
				});
				var unitCost = rec.getSublistValue({
					sublistId: 'inventory',
					fieldId: 'unitcost',
					line: i
				});
				var itemName = rec.getSublistText({
					sublistId: 'inventory',
					fieldId: 'item',
					line: i
				});
				log.debug(FUNC_NAME, 'adjQtyBy: ' + adjQtyBy+ ' unitCost: '+unitCost+' i: '+i+' item: '+itemName);
				if(i == 0 && parseInt(adjQtyBy) < 0)
				{	
					var absAdjQtyBy = Math.abs(parseInt(adjQtyBy));
					masterItemProduct = (absAdjQtyBy * parseFloat(unitCost));
					log.debug(FUNC_NAME, 'masterItemProduct: ' + masterItemProduct);
				}
				if(i == 1 && parseInt(adjQtyBy) > 0)
				{
					newUnitCost = (masterItemProduct/parseInt(adjQtyBy));
					log.debug(FUNC_NAME, 'newUnitCost: ' + newUnitCost);
					rec.setSublistValue({
					sublistId: 'inventory',
					fieldId: 'unitcost',
					line: i,
					value: newUnitCost
					});
				}
				if(i == 0 && parseInt(adjQtyBy) >= 0)
				{
					var e = error.create({
					name: 'MAP_STAGE_FAILED',
					message: 'Cannot update the Inventory Adjustment: '+recNumber+'. Master item: '+itemName+' Adjust Qty By is '+adjQtyBy+' but should be a negative value.'
					});
					log.error(FUNC_NAME, JSON.stringify(e));
				}
				if(i == 1 && parseInt(adjQtyBy) < 0)
				{
					var e = error.create({
					name: 'MAP_STAGE_FAILED',
					message: 'Cannot update the Inventory Adjustment: '+recNumber+'. Split item: '+itemName+' Adjust Qty By is '+adjQtyBy+' should be a positive value.'
					});
					log.error(FUNC_NAME, JSON.stringify(e));
				}
				if(parseInt(recCount) != 2)
				{
					var e = error.create({
					name: 'MAP_STAGE_FAILED',
					message: 'Cannot update the Inventory Adjustment: '+recNumber+'. Inventory Adjustment should only have 2 rows for split items.'
					});
					log.error(FUNC_NAME, JSON.stringify(e));
				}
			}
			
			if(newUnitCost > 0)
			{
				var iaId = rec.save({
					enableSourcing: false,
					ignoreMandatoryFields: true
				});
				log.debug(FUNC_NAME, 'Successfully updated Inventory Adjustment: ' + recNumber+ ' with new unit cost: '+newUnitCost.toString());
			}
			
			log.debug(FUNC_NAME, 'MAP COMPLETED');

		} catch (ex) {					
			var errorStr = 'Type: ' + ex.type + ' | ' + 'Name: ' + ex.name + ' | ' + 'Error Message: ' + ex.message;
			log.error(FUNC_NAME, errorStr);				
			context.write(inventoryAdjusmentId,errorStr);
		}		
	}//map
	

    /**
     * Executes when the summarize entry point is triggered and applies to the result set.
     *
     * @param {Summary} summary - Holds statistics regarding the execution of a map/reduce script
     * @since 2015.1
     */
    function summarize(summary) {
    	
    	var type = summary.toString();
    	
    	log.audit(type + ' Usage Consumed', summary.usage);
    	log.audit(type + ' Concurrency Number ', summary.concurrency);
    	log.audit(type + ' Number of Yields', summary.yields);
    	
    	
    	if (summary.inputSummary.error){
    		log.error('Input Error', summary.inputSummary.error);
    	
    		summary.mapSummary.errors.iterator().each(function (key, error){
    			log.error('Map Error for key: ' + key, error);
    			return true;
    		});
    	}
    	else{
    		log.debug(type ,' Map/Reduce Script Run  Successfully!');
    	}
    }
    function isNullOrEmpty(checkValue) {
		return (checkValue == null || checkValue == "" || checkValue == undefined);
	}
    
    function setAutoMergeDateTime(record){
    	var today = new Date();
    	var formattedDateString = format.format({
    	    value: today,
    	    type: format.Type.DATETIME
    	    });	 
		 record.setValue({
			 fieldId:'custbody_auto_merge_rev_arr_date',
			 value:formattedDateString
		 });
    }

    return {
        getInputData: getInputData,
        map: map,
        summarize: summarize
    };
    
});