/**
 * @NApiVersion 2.x
 * @NScriptType MapReduceScript
 * @NModuleScope SameAccount
 */

define(['N/record', 'N/search', 'N/runtime', 'N/task', 'SuiteScripts/SSLib/2.x/SSLib_Util', 'SuiteScripts/SSLib/2.x/SSLib_Task'],
/**
 * @param {record} record
 * @param {search} search
 * @param {runtime} runtime
 */
function(record, search, runtime, task, SSLib_Util, SSLib_Task) {
	var RVS_ITEM_TYPE_MODEL = 4;
	var RVS_ORDER_TYPE_UNIT = 2;
	
	/**
     * Get model price levels for all sales orders passed through to the Map Reduce to process.
     *
     * @typedef {Object} ObjectRef
     * @property {number} id - Internal ID of the record instance
     * @property {string} type - Record type id
     *
     * @return {Array|Object|Search|RecordRef} inputSummary
     * @since 2015.1
     */
    function getInputData() {
    	var scriptObj = runtime.getCurrentScript(); 	
    	var soArr = JSON.parse(scriptObj.getParameter({name: 'custscriptgd_mpu_sos_mr'}) || '');
    	
    	return SearchModelPriceBySalesOrder(soArr);
    }
    /**
     * Submit each of the key/value pairs in the dictionary.
     *
     * @param {MapSummary} context - Data collection containing the key/value pairs to process through the map stage
     * @since 2015.1
     */
    function map(context) {
    	var modelPriceObject = JSON.parse(context.value);
    	try{
			var soRec = record.load({
				type: record.Type.SALES_ORDER,
				id: modelPriceObject.salesOrderId
			});

			//Update the line.
			var modelLineIdx = soRec.findSublistLineWithValue({sublistId: 'item', fieldId: 'item', value: modelPriceObject.modelId});
			soRec.setSublistValue({sublistId: 'item', fieldId: 'rate', line: modelLineIdx, value: modelPriceObject.itemBasePrice});
			soRec.setSublistValue({sublistId: 'item', fieldId: 'amount', line: modelLineIdx, value: modelPriceObject.itemBasePrice});
			soRec.setSublistValue({sublistId: 'item', fieldId: 'custcolrvsmsrpamount', line: modelLineIdx, value: modelPriceObject.itemMSRPAmount});
			soRec.save({enableSourcing: false, ignoreMandatoryFields: true});
    	}
    	//Try again in case of collision error.
    	catch(err) {
    		var soRec = record.load({
				type: record.Type.SALES_ORDER,
				id: modelPriceObject.salesOrderId
			});

			//Update the line.
			var modelLineIdx = soRec.findSublistLineWithValue({sublistId: 'item', fieldId: 'item', value: modelPriceObject.modelId});
			soRec.setSublistValue({sublistId: 'item', fieldId: 'rate', line: modelLineIdx, value: modelPriceObject.itemBasePrice});
			soRec.setSublistValue({sublistId: 'item', fieldId: 'amount', line: modelLineIdx, value: modelPriceObject.itemBasePrice});
			soRec.setSublistValue({sublistId: 'item', fieldId: 'custcolrvsmsrpamount', line: modelLineIdx, value: modelPriceObject.itemMSRPAmount});
			soRec.save({enableSourcing: false, ignoreMandatoryFields: true});
    	}
    }
    
    /**
     * Get Model Prices by sales orders.
     *
     * @param soArr - Array of sales order internal ids.
     * 
     */
    function SearchModelPriceBySalesOrder(soArr) {
    	var modelPriceArray = new Array();
    	var modelPriceObject = new Object();
    	var modelPriceBySalesOrderResultsData = search.create({
    		   type: "transaction",
    		   filters:
    		   [
    		      ["mainline", "is", "F"], 
    		      "AND", 
    		      ["type", "anyof", "SalesOrd"], 
    		      "AND", 
    		      ["internalid", "anyof", soArr], 
    		      "AND", 
    		      ["custbodyrvsordertype", "anyof", RVS_ORDER_TYPE_UNIT], 
    		      "AND", 
    		      ["item.custitemrvsitemtype", "anyof", RVS_ITEM_TYPE_MODEL]
    		   ],
    		   columns:
    		   [
    		      search.createColumn({name: "item", label: "Item"}),
    		      search.createColumn({
    		         name: "price2",
    		         join: "item"
    		      }),
    		      search.createColumn({
    		         name: "price11",
    		         join: "item"
    		      }),
    		      search.createColumn({
    		         name: "price12",
    		         join: "item"
    		      }),
    		      search.createColumn({
    		         name: "price6",
    		         join: "item"
    		      }),
    		      search.createColumn({
    		         name: "price7",
    		         join: "item"
    		      }),
    		      search.createColumn({
    		         name: "price10",
    		         join: "item"
    		      }),
    		      search.createColumn({
    		         name: "price8",
    		         join: "item"
    		      }),
    		      search.createColumn({
    		         name: "price5",
    		         join: "item"
    		      }),
    		      search.createColumn({
    		         name: "otherprices",
    		         join: "item",
    		         label: "Other Prices"
    		      }),
    		      search.createColumn({
    		         name: "custitemrvs_msrplevel",
    		         join: "item",
    		         label: "MSRP Level"
    		      }),
    		      search.createColumn({
    		         name: "baseprice",
    		         join: "item",
    		         label: "Base Price"
    		      }),
    		      search.createColumn({name: "custbodyrvsmsrppricelevel", label: "MSRP Price Level"})
    		   ]
    		}).runPaged({pageSize: 1000});
        	modelPriceBySalesOrderResultsData.pageRanges.forEach(function(pageRange) {
        		modelPriceBySalesOrderResultsData.fetch({index: pageRange.index}).data.forEach(function(result) {
        			modelPriceObject.salesOrderId = result.id;
        			modelPriceObject.modelId = result.getValue({name: 'item'});
        			modelPriceObject.itemBasePrice = result.getValue({name: 'baseprice', join: 'item'});
        			modelPriceObject.itemMSRPAmount = result.getValue({name: 'price' + result.getValue({name: 'custbodyrvsmsrppricelevel'}), join: 'item'});
        			modelPriceArray.push(modelPriceObject);
        			modelPriceObject = new Object();
        		});
        	});
    	
    	return modelPriceArray;
    }
	
    return {
        getInputData: getInputData,
        map: map
    };
    
});
