/**
 * 2018 IT Rationale Inc. User may not copy, modify, distribute, or re-bundle or
 * otherwise make available this code
 * 
 *  This software is the confidential and proprietary information of ITRationale,
 * Inc. ("Confidential Information"). You shall not disclose such Confidential
 * Information and shall use it only in accordance with the terms of the license
 * agreement you entered into with ITRationale Inc.*
 * 
 *  Version    Date           	 	Author           		Remarks
 * 	1.00       24 July 2018     	Raffy Gaspay		 	Initial Version. The script will get the value of Pallet Group Id and Customer and set it to the Sales Order
 *  
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */
define(['N/log','N/search','N/record','N/task','./itr_ifd_lib_common'],

function(log,search,record,task,common) {

    /**
     * Function definition to be triggered before record is loaded.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.newRecord - New record
     * @param {Record} scriptContext.oldRecord - Old record
     * @param {string} scriptContext.type - Trigger type
     * @Since 2015.2
     */
	var MAPREDUCE_SCRIPT_ID = common.getScriptParameter('custscript_itr_ifd_map_scriptid');
	var MAPREDUCE_SCRIPT_DEPLOYMENT = common.getScriptParameter('custscript_itr_ifd_map_deployment');
    function afterSubmit(scriptContext) {
    	var DEBUG_IDENTIFIER = 'afterSubmit';
    	log.debug(DEBUG_IDENTIFIER,'-----START-----');
	   try{
		  
		   var type = scriptContext.type;
		   if(type == 'create' || type == 'edit' ){
			   	 
				   var soRecord = scriptContext.newRecord;
				   var soPalletGroupId = soRecord.getValue({
					   fieldId: 'custbody_pallet_group_id'
				   });	
				   var soInternalId = soRecord.id;
				   log.debug(DEBUG_IDENTIFIER,'SO Internal ID :' + soInternalId);
				   var customerId = soRecord.getValue({
					   fieldId: 'entity'
				   });
				   var lookup = search.lookupFields({
					     type: 'customer',
						 id: customerId, 
						columns: ['custentity_ifd_palletgroupid']  
				   });
				   
				  log.debug(DEBUG_IDENTIFIER,'Look Up: ' +JSON.stringify(lookup));
	      		 var custPalletGroup = lookup.custentity_ifd_palletgroupid;
		        		
	      		 if(!common.isNullOrEmpty(custPalletGroup)){
	      			record.submitFields({
	      				type: 'salesorder',
	      	    	    id: soInternalId,
	      	    	    values: {
	      	    	        'custbody_pallet_group_id': custPalletGroup
	      	    	        }
	      	    	});
	      			
	      		 }else{
	      			 log.debug(DEBUG_IDENTIFIER,"Customer's Pallet Group Id is Empty for Sales Order Number " + soInternalId);
	      			 return;//Script will exit if the Customer's Pallet Group Id is Empty
	      		 }
	      		 var lineCount = soRecord.getLineCount({
	      			 sublistId: 'item'
	      		 });
	      		 log.debug(DEBUG_IDENTIFIER,'Line Item Count: ' + lineCount);
	      		 var arrItemIds = [];
	      		 var arrLineIds = [];
	      		 for(var i = 0; i < lineCount; i++){
	      			 var itemId = soRecord.getSublistValue({
	      				 sublistId: 'item',
	      				 fieldId: 'item',
	      				 line: i
	      			 });
	      			 var line = soRecord.getSublistValue({
	      				 sublistId: 'item',
	      				 fieldId: 'linenumber',
	      				 line: i
	      			 });
	      			 var code = soRecord.getSublistValue({
	      				 sublistId: 'item',
	      				 fieldId: 'custcol_ifd_pallet_type_code',
	      				 line: i
	      			 });
	      			var key = soRecord.getSublistValue({
	      				 sublistId: 'item',
	      				 fieldId: 'custcol_ifd_pallet_key_type',
	      				 line: i
	      			 });
	      			if(common.isNullOrEmpty(code) || common.isNullOrEmpty(key)){
	      				arrItemIds.push(itemId);
	      				arrLineIds.push(line);
	      			//	log.debug(DEBUG_IDENTIFIER,'Array Items : ' + JSON.stringify(arrItemIds));
	      			//	log.debug(DEBUG_IDENTIFIER,'Array Line : ' + JSON.stringify(arrLineIds));
	      			}
	      			
 			 
	      		 }
	      		 if(!common.isNullOrEmpty(arrItemIds)){
	      			var mapReduce = task.create({
	    	    	    taskType: task.TaskType.MAP_REDUCE,
	    	    	    scriptId: MAPREDUCE_SCRIPT_ID,
	    	    	    deploymentId: MAPREDUCE_SCRIPT_DEPLOYMENT,
	    	    	    params: {
	    	    		   
	    	    		   'custscript_itr_ifd_palletid': custPalletGroup,
	    	    		   'custscript_itr_ifd_salesorder' : soInternalId,
	    	    		   'custscript_itr_ifd_arritems' : JSON.stringify(arrItemIds),
	    	    		   'custscript_itr_ifd_arrlines' : JSON.stringify(arrLineIds),
	    	    		   
	    	    	   }
	    	    	});
	    	  
	    	    	var jobId = mapReduce.submit();
	    	    	log.debug(DEBUG_IDENTIFIER,'Calling Map Reduce Script: '+ jobId);
	      		 }else{
	      			 log.debug(DEBUG_IDENTIFIER,'All of the Line Items has Type Key and Code Type Values');
	      		 }
		   
		   }
		   log.debug(DEBUG_IDENTIFIER,'-----END-----');
		   
	   }catch(ex){
	    	var errorStr = 'Type: ' + ex.type + ' | ' +
			'Name: ' + ex.name +' | ' +
			'Error Message: ' + ex.message;
	    	
			log.audit('ERROR', 'error on ' + DEBUG_IDENTIFIER + ' function : '
				+ errorStr);
    }
    }

    return {
       
        afterSubmit: afterSubmit
    };
    
});
