/**
 * Copyright (c) 2018 IT Rationale, Inc (www.itrationale.com). All rights
 * reserved.
 * 
 * This software is the confidential and proprietary information of ITRationale,
 * Inc. ("Confidential Information"). You shall not disclose such Confidential
 * Information and shall use it only in accordance with the terms of the license
 * agreement you entered into with ITRationale Inc.*

 *
 * @NApiVersion 2.x
 * @author ITR
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 *
 * Version     Date          Author             Remarks
 * 1.00        05-08-2018    ITR     			Initial Development
 * 
 * 
 *
 *
 */
 
 define(['N/record', 'N/render', 'N/file', 'N/runtime', 'N/search', './ifd_noi_lib_Utility'],
    function(record,render, file, runtime, search, common) {

        function beforeSubmit(context) {

			var DEBUG_IDENTIFIER = 'beforeSubmit';
			log.debug(DEBUG_IDENTIFIER, '---Start---');			
			
            try {				
				var newRec = context.newRecord;
				var itemPoolSearchId = runtime.getCurrentScript().getParameter('custscript_ifd_ue_itempoolsearch');
				
				if(context.type != context.UserEventType.CREATE && context.type != context.UserEventType.EDIT && context.type != context.UserEventType.XEDIT && context.type != context.UserEventType.COPY && context.type != context.UserEventType.DELETE)
				{
					log.debug(DEBUG_IDENTIFIER, 'Type is not create, edit, xedit, copy or delete. Script to exit.');
					return;
				}
				
				var recType = newRec.type;
				var vendorNumber = "";
								
				var poolItem = newRec.getValue({
					fieldId: 'custrecord_item_pool_item'
				});	
				
				if(context.type == context.UserEventType.DELETE)
				{
					log.debug(DEBUG_IDENTIFIER, 'Type is delete. Record id: '+newRec.id);
					createItemPoolSearch(poolItem,itemPoolSearchId,newRec.id)
					return;
				}
				
				var poolVendor = newRec.getValue({
					fieldId: 'custrecord_item_pool_vendor'
				});
				log.debug(DEBUG_IDENTIFIER, 'type: '+context.type+' record id: '+newRec.id+' poolItem: ' + poolItem + ' poolVendor : '
					+ poolVendor);						
				
				if(!common.isNullOrEmpty(poolVendor))
				{
						vendorNumber = search.lookupFields({
						type: 'vendor',
						id: poolVendor,
						columns: ['entityid']
					});
						vendorNumber = vendorNumber.entityid;
						log.debug(DEBUG_IDENTIFIER, 'vendorNumber: ' + vendorNumber);
					
					if(!common.isNullOrEmpty(poolItem))
					{
						var itemTypeFromSearch = createSearch(poolItem); 						 
						var itemId = record.submitFields({
							type: itemTypeFromSearch,
							id: poolItem,
							values: {
								custitem_ifd_noi_vendor: vendorNumber
							}
						});						
						log.debug(DEBUG_IDENTIFIER, 'Successfully updated item: ' + itemId +' Item Type: '+itemTypeFromSearch+' NOI Vendor to: '+vendorNumber);						
					}
				}												
			} 
			catch (ex) {
				var errorStr = 'Type: ' + ex.type + ' | ' +
				'Name: ' + ex.name +' | ' +
				'Error Message: ' + ex.message;
				log.error('ERROR', 'Failed to update the item record due to: ' + DEBUG_IDENTIFIER + ' function : '
					+ errorStr);
			}
        }
        
        function createSearch(itemId) {
        	log.debug('createSearch', 'START -- createSearch');
        	var itemType = "";
            var itemSearch = search.create({
                type: search.Type.ITEM,
                columns: [],
                filters: [
                    ['internalid', 'is', itemId]
                ]
            });            
            itemSearch.run().each(function(result) {
                itemType = result.recordType;            	
                return true;
            });            
            log.debug('createSearch', 'itemType: ' + itemType);            
            return itemType;
        }
        
        function createItemPoolSearch(itemId,itemPoolSearchFromParam,itemPoolId) {
        	log.debug('createItemPoolSearch', 'START -- createItemPoolSearch itemPoolId: '+itemPoolId);
        	 //load saved search
        	var itemPoolVendorNumber = ' ';
        	var itemType = createSearch(itemId);
		     var itemPoolSearch = search.load({
					id: itemPoolSearchFromParam
				});
		     var itemIdFilter = search.createFilter({
					name: 'custrecord_item_pool_item',
					operator: search.Operator.IS,
					values: itemId
					});
		     var itemPoolIdFilter = search.createFilter({
					name: 'internalid',
					operator: search.Operator.NONEOF,
					values: itemPoolId
					});
		     itemPoolSearch.filters.push(itemIdFilter);
		     itemPoolSearch.filters.push(itemPoolIdFilter);
		     var itemPoolResultSet = itemPoolSearch.run();
		     var itemPoolSearchResult = itemPoolResultSet.getRange({
	                start: 0,
	                end: 999
	                });		     
		     log.debug('createItemPoolSearch', 'itemPoolSearchResult length: ' + itemPoolSearchResult.length);
		     if(itemPoolSearchResult.length > 0)
		     {
		    	 itemPoolVendorNumber = itemPoolSearchResult[0].getValue({
						name: 'entityid',
						join: 'custrecord_item_pool_vendor'
						});	
		    	 log.debug('createItemPoolSearch', 'length is greater than 0: itemPoolVendorNumber: ' + itemPoolVendorNumber);
		    	 
		    	 var itemId = record.submitFields({
						type: itemType,
						id: itemId,
						values: {
							custitem_ifd_noi_vendor: itemPoolVendorNumber
						}
					});						
				 log.debug('createItemPoolSearch', 'Successfully updated item: ' + itemId +' Item Type: '+itemType+' NOI Vendor to: '+itemPoolVendorNumber);
		     }
		     else
	    	 {
		    	 var itemId = record.submitFields({
						type: itemType,
						id: itemId,
						values: {
							custitem_ifd_noi_vendor: itemPoolVendorNumber
						}
					});
		    	 log.debug('createItemPoolSearch', 'Successfully updated item: ' + itemId +' Item Type: '+itemType+' NOI Vendor to: '+itemPoolVendorNumber);
	    	 }	    
        }
        
        return {
        	beforeSubmit: beforeSubmit
        };
    });