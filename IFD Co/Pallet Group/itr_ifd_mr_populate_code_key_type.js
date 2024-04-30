/**
 * 2018 IT Rationale Inc. User may not copy, modify, distribute, or re-bundle or
 * otherwise make available this code
 * 
 *  This software is the confidential and proprietary information of ITRationale,
 * Inc. ("Confidential Information"). You shall not disclose such Confidential
 * Information and shall use it only in accordance with the terms of the license
 * agreement you entered into with ITRationale Inc.*
 * 
 *  Version    Date           		 Author           		Remarks
 * 	1.00       17 August 2018     	Raffy Gaspay		 	Initial Version. The Map/Reduce Script will search Sales Order with empty Pallet Key and Code and will search also for the matching Pallet Group custom records and populate the codes and keys in the respective sales order in each lines
 *  
 * @NApiVersion 2.x
 * @NScriptType MapReduceScript
 * @NModuleScope SameAccount
 */

define(['N/log','N/error','N/search','N/record','N/runtime','./itr_ifd_lib_common'],

function(log,error,search,record,runtime,common) {
   
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
    	var DEBUG_IDENTIFIER = 'getInputData';
        	
    	var SEARCH_SALES_ORDER = common.getScriptParameter('custscript_itr_ifd_sales_order_search');
    	
    	log.debug(DEBUG_IDENTIFIER,'-----START-----');
    	try{
    		
    		var d = new Date(); 
    		log.debug(DEBUG_IDENTIFIER, 'Current Date/Time: '+ d); 
    		var endTime = d.getHours();
    		var arrResults = [];
    		log.debug(DEBUG_IDENTIFIER, 'End Time Hours: '+ endTime); 
    		//Get the time and if it is 5pm onwards, script will exit
    		if(endTime >= 17){
    			arrResults = [];
    			log.debug(DEBUG_IDENTIFIER,'Current time is beyond 5pm, Script will exit!');
    		}else{
    		
    		log.debug(DEBUG_IDENTIFIER,'Search Sales Order: ' + SEARCH_SALES_ORDER );
		
    			var searchResults = common.searchRecords(null,SEARCH_SALES_ORDER);
    			log.debug(DEBUG_IDENTIFIER,'Sales Order Results: ' + JSON.stringify(searchResults));
    			log.debug(DEBUG_IDENTIFIER,'Sales Order Results Length: ' + searchResults.length);
    		   			
    			var map ={};
    			if(!common.isNullOrEmpty(searchResults)){
	    			for(var i in searchResults){	
	    				var searchFields = searchResults[i];
	    				
	    					map = {
	    						internalid	 	: searchFields.getValue({name:'internalid', summary: 'GROUP'}),
	    						customerid	 		: searchFields.getValue({name: 'entity', summary: 'GROUP'}),
	    						palletgroupid		: searchFields.getValue({name: 'custentity_ifd_palletgroupid', join: 'customer', summary: 'GROUP'}),
	    						
	    				};
	    				arrResults.push(map);
	    				
	    			}
	    			
	    			log.debug(DEBUG_IDENTIFIER,'Search Sales Order: ' + JSON.stringify(arrResults));
    			}else{
    				log.debug(DEBUG_IDENTIFIER,'No Sales Order Record has been found!');
    				arrResults = [];
        			
    			}
    			log.debug(DEBUG_IDENTIFIER,'-----END-----');
    		}
    			return arrResults;
    		
    		
    	}catch(ex){
    		var errorStr = 'Type: ' + ex.type + ' | ' + 'Name: ' + ex.name +' | ' +'Error Message: ' + ex.message;
			log.audit('ERROR', 'error on ' + DEBUG_IDENTIFIER + ' function : '+ errorStr);
    	}
    }

    /**
     * Executes when the map entry point is triggered and applies to each key/value pair.
     *
     * @param {MapSummary} context - Data collection containing the key/value pairs to process through the map stage
     * @since 2015.1
     */
    function map(context) {
    	var DEBUG_IDENTIFIER = 'map';
    	log.debug(DEBUG_IDENTIFIER,'----START----');
    	
	    try{
	    	var objFields = JSON.parse(context.value);
    		log.debug(DEBUG_IDENTIFIER,'ObjFields: ' + JSON.stringify(objFields));
    		
    	//Group the Search Results by Customer
    		var customer = objFields.customerid;
    		log.debug(DEBUG_IDENTIFIER,'Customer Id: ' + customer);
    		context.write(customer,objFields);
	
	    	log.debug(DEBUG_IDENTIFIER,'----END----');
	    }catch(ex){
	    	var errorStr = 'Type: ' + ex.type + ' | ' +'Name: ' + ex.name +' | ' +'Error Message: ' + ex.message;
	    	
			log.audit('ERROR', 'error on ' + DEBUG_IDENTIFIER + ' function : '+ errorStr);
	    }
    } 
	    
	  function reduce(context) {
	    	var DEBUG_IDENTIFIER = 'reduce';
	    	log.debug(DEBUG_IDENTIFIER,'----START----');  
	    	var SEARCH_PALLET_GROUP = common.getScriptParameter('custscript_itr_ifd_searchpallet');
		    try{
		    	
		    	var customer = context.key;
		    	var objFields = context.values;
		    	log.debug(DEBUG_IDENTIFIER,'Customer Id: '+ customer);
		    	var searchLength = objFields.length;
		    	log.debug(DEBUG_IDENTIFIER,'Search Length: ' + searchLength);
		    	log.debug(DEBUG_IDENTIFIER,'ObjFields: ' + JSON.stringify(objFields));
		    	var soId = '', soRecId ='';
		    
		    	//Get the Pallet Group Id in the Customer Record
		    	var lookup = search.lookupFields({
				     type: 'customer',
					 id: customer, 
					columns: ['custentity_ifd_palletgroupid']  
			   });
			   
			  log.debug(DEBUG_IDENTIFIER,'Look Up Customer: ' +JSON.stringify(lookup));
      		    var custPalletGroupId = lookup.custentity_ifd_palletgroupid;
		    	
		    	//Loop Through each Sales Order
		    	
      		    for(var i in objFields){
		    		var soResults = JSON.parse(objFields[i]);
		    		    soId = soResults.internalid;
		    		   log.debug(DEBUG_IDENTIFIER,'Sales Order Id Record: ' + soId);
		    		
		       		 var soRecord = record.load({
		   			    	type: 'salesorder',
		   			    	id: soId,
		   			    	isDynamic: true
		   			    });
		       		 var lineCount = soRecord.getLineCount({
		   			    	sublistId: 'item'
		   			    });
		       		 log.debug(DEBUG_IDENTIFIER,'SO Line Count: ' + lineCount);
		       		 
		       		 
		       		 /*Loop Through each SO Lines and check if the Pallet Key and Pallet Group 
		       		 and get the item id if those fields 
		       		 are empty and store it in an Array*/
		       		  	       		 
		       		
		      		 var arrItemIds = [];
		      		 
		      		 for(var j = 0; j < lineCount; j++){
		      			 var itemId = soRecord.getSublistValue({
		      				 sublistId: 'item',
		      				 fieldId: 'item',
		      				 line: j
		      			 });
		      			
		      			 var code = soRecord.getSublistValue({
		      				 sublistId: 'item',
		      				 fieldId: 'custcol_ifd_pallet_type_code',
		      				 line: j
		      			 });
		      			var key = soRecord.getSublistValue({
		      				 sublistId: 'item',
		      				 fieldId: 'custcol_ifd_pallet_key_type',
		      				 line: j
		      			 });
		      			if(common.isNullOrEmpty(code) || common.isNullOrEmpty(key)){
		      				arrItemIds.push(itemId);
	      			
		      			}
		      		 }
		      			
		      	//Execute a Search for the Pallet Group Records using the Array of Items and the Pallet Group as the filters
		       		var arrFilters = []; 
	    			var filterGrpId = search.createFilter({
	    					name: 'custrecord_ifd_palletgroupfield',
					    	operator: search.Operator.IS,
					    	values: custPalletGroupId
		  			 	});
	    			arrFilters.push(filterGrpId);
	    			
	    			var filterItems = search.createFilter({
						name: 'custrecord_ifd_palletgroupitem',
				    	operator: search.Operator.ANYOF,
				    	values: arrItemIds
	  			 	});
	    			arrFilters.push(filterItems);
	    			
	    			var searchResults = common.searchRecords(null,SEARCH_PALLET_GROUP,arrFilters);
	    			log.debug(DEBUG_IDENTIFIER,'Pallet Group Record Fields: ' + JSON.stringify(searchResults));
	    			

	    			if(!common.isNullOrEmpty(searchResults)){
	    				log.debug(DEBUG_IDENTIFIER,'Pallet Group Record Fields Length: ' + searchResults.length);
		    			//Loop Through Each Search Result of the Pallet Group Records
	    				for(var x in searchResults){	
		    				var searchFields = searchResults[x];		
		    				var palletItem 	= searchFields.getValue({name: 'custrecord_ifd_palletgroupitem'});
		    				var palletKey	= searchFields.getText({name: 'custrecord_ifd_palletkeytype'});
		    				var palletCode 	= searchFields.getText({name: 'custrecord_ifd_pallettypecode'});
				
						 //Loop Through each line to check what line will be updated
								    for(var ctr = 0; ctr < lineCount; ctr++ ){
								    	var soItem = soRecord.getSublistValue({
								    		sublistId: 'item',
								    		fieldId: 'item',
								    		line: ctr
								    	});
								    	var soCode = soRecord.getSublistValue({
								    		sublistId: 'item',
								    		fieldId: 'custcol_ifd_pallet_type_code',
								    		line:ctr
								    	});
								    	var soKey = soRecord.getSublistValue({
								    		sublistId: 'item',
								    		fieldId: 'custcol_ifd_pallet_key_type',
								    		line: ctr
								    	});

								  //Check if the Item in Pallet Group Record matched in the SO line
    	
								    	if(palletItem == soItem){
								    		log.debug(DEBUG_IDENTIFIER,'Matched!!');
									    		soRecord.selectLine({
									                sublistId: 'item',
									                line: ctr
									            });
								    		
								    		if(common.isNullOrEmpty(soCode)){
						    		    		soRecord.setCurrentSublistValue({
						    		    			sublistId:'item',
						    		    			fieldId: 'custcol_ifd_pallet_type_code',       	    			       	    			
						    		    			value: palletCode,
						    		    		});
								    		}
								    		if(common.isNullOrEmpty(soKey)){
						    		    		soRecord.setCurrentSublistValue({
						    		    			sublistId:'item',
						    		    			fieldId: 'custcol_ifd_pallet_key_type',       	    			       	    			
						    		    			value: palletKey,
						    		    		});
								    		}

								    		soRecord.commitLine({
									                sublistId: 'item'
									            });
								    	}							    	
								    }
				    		}
	    				
		    				soRecId = soRecord.save({
				    			  enableSourcing : true,
								 ignoreMandatoryFields : true
				    	});	 
	    			}else{
	    				log.debug(DEBUG_IDENTIFIER,'No Pallet Group Records found!');
	    			}
	    			
	    			  		
	    	}
	
    		 
    		log.debug(DEBUG_IDENTIFIER,'Sales Order Record ' + soRecId + ' has been updated with Pallet Group Id: ' + custPalletGroupId);
    		log.debug(DEBUG_IDENTIFIER,'-----END-----');
    		context.write(soId,soId);
    		
    		
    	}catch(ex){
    		var errorStr = 'Type: ' + ex.type + ' | ' + 'Name: ' + ex.name +' | ' +'Error Message: ' + ex.message;
			log.audit('ERROR', 'error on ' + DEBUG_IDENTIFIER + ' function : '+ errorStr);
    	}

}


    /**
     * Executes when the summarize entry point is triggered and applies to the result set.
     *
     * @param {Summary} summary - Holds statistics regarding the execution of a map/reduce script
     * @since 2015.1
     */
    function summarize(summary) {
    	var DEBUG_IDENTIFIER = 'summary';
    	log.audit(DEBUG_IDENTIFIER + ' Usage Consumed', summary.usage);
    	var numofSalesOrder = 0;
  		summary.output.iterator().each(function(key, value) {
  			
  			numofSalesOrder++;
  			return true;
  			});
  		log.debug(DEBUG_IDENTIFIER,'Total Number of Records Updated: ' + numofSalesOrder);
  		log.debug(DEBUG_IDENTIFIER,'Map/Reduce script execution has been completed');
  		
    	handleErrorIfAny(summary);
    }
    
    function handleErrorIfAny(summary) {
        var inputSummary = summary.inputSummary;
        var mapSummary = summary.mapSummary;
        var reduceSummary = summary.reduceSummary;

        if (inputSummary.error) {
            var e = error.create({
                name : 'INPUT_STAGE_FAILED',
                message : inputSummary.error
            });
            handleErrorAndSendNotification(e, 'getInputData');
        }

        handleErrorInStage('map', mapSummary);
        handleErrorInStage('reduce', reduceSummary);
    }

    function handleErrorInStage(stage, summary) {
        var errorMsg = [];
        summary.errors.iterator().each(
                function(key, value) {
                    var msg = 'Failure to create : ' + key
                            + '. Error was: '
                            + JSON.parse(value).message + '\n';
                    errorMsg.push(msg);
                    return true;
                });
        if (errorMsg.length > 0) {
            var e = error.create({
                name : 'CAPTURE_FAILEDD',
                message : JSON.stringify(errorMsg)
            });
            handleErrorAndSendNotification(e, stage);
        }
    }

    function handleErrorAndSendNotification(e, stage) {
        log.error('Stage: ' + stage + ' failed', e);
    }

    return {
        getInputData: getInputData,
        map: map,
        reduce: reduce,
        summarize: summarize
    };
    
});