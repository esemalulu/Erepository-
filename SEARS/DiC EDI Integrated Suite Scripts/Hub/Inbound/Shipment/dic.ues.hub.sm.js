/**
 * Copyright (c) 2016 DiCentral, Inc.
 * 1199 1199 NASA Parkway, Houston, TX 77058, USA
 *
 * All Rights Reserved.
 *
 * This software is the confidential and proprietary information of
 * DiCentral, Inc. ("Confidential Information"). You shall not
 * disclose such Confidential Information and shall use it only in
 * accordance with the terms of the license agreement you entered into
 * with DiCentral.
 *
 * 

 *
 * Version    Date            Author           Remarks
 * 1.00       16 Nov 2016     Loi Nguyen	   	   
 *
 */
/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */
define([
        '../../dic.cs.hub.config.sm',
        '../../../Com/Util/dic.ss.com.util',
        '../../../Com/dic.cs.mess',
        '../../../Com/Util/dic.cs.util.object',
        '../../../Com/Util/dic.cs.util.search.itemvendor',
        '../../../Com/Util/dic.cs.util.string',
        'N/ui/serverWidget',
        'N/search',
        'N/util',
        'N/record',
        ],
        DiCEDIUESHubPO    
       );

function DiCEDIUESHubPO(dicConfigSM, 
			DiCEDISSUtil,
			dicMess,
			dicObj,
			dicSearch,
			dicstring,
			serverWidget,
			serverSearch,
			util,
			record
			) {
	var _mod = {};
	
	function searchCutomRecord(id){
		if (!id) return null;
		try
		{
			var filterColumns = dicObj.extractPropertyId({object: dicConfigSM.CustomFields});
	    	var customSearch = serverSearch.create({
	            type: dicConfigSM.CustomRecordId,
	            title: 'Search custom record list shipemt',
	            columns: filterColumns,
	            filters: [
	                      [dicConfigSM.CustomFields.PO.Id, 'is', id]
	                ]
	            });
	    		var rsVenItem =  customSearch.run().getRange({
	    			 start: 0, 
	    			    end: 1000
	    		});
	    		return rsVenItem;
		}
		catch(e)
		{
			log.error({
    		    title: 'Error search custom record shipment', 
    		    details: e
    		    });
			return null;
		};
		
	}

	function addField(form, listSearch, itemid, request){
	   var sublist = form.getSublist({id:'item'});
	   if(!sublist) return;
	   if (request === 'GET')
	   {
		   var fieldQty = sublist.addField({
			    id : dicConfigSM.CusFieldQtyShippedPO,
			    type : serverWidget.FieldType.FLOAT,
			    label : 'DIC EDI CUMULATIVE SHIPPED QUANTITY'
		   });
		   //https://system.na1.netsuite.com/app/help/helpcenter.nl?fid=section_4335287288.html
		   fieldQty.updateDisplayType({
			    displayType : serverWidget.FieldDisplayType.DISABLED
			});
				  
		   
	   }
	   if(listSearch.length == 0) return;
	   
	   var htLookupSublist =  {};
	   listSearch.forEach(function(Item){
		   	var ItemPO = htLookupSublist[Item.getValue({
	            name:  dicConfigSM.CustomFields.Item.Id
	        })];
		   	if(ItemPO)
	   		{
		   		var quantity = Item.getValue({
		            name:  dicConfigSM.CustomFields.QuantityShipped.Id
		        });
		   		/*var transDate = Item.getValue({
		            name:  dicConfigSM.CustomFields.TransDate.Id
		        });*/
		   		/*if(new Date(transDate) > new Date(ItemPO.TransDate) )
	   			{
		   			ItemPO.Quantity = quantity;
	   			}*/
		   		
		   		if(parseInt(quantity) > parseInt(ItemPO.Quantity))
	   			{
		   			ItemPO.Quantity = quantity;
	   			}
	   		}
		   	else
	   		{
		   		htLookupSublist[Item.getValue({
		            name:  dicConfigSM.CustomFields.Item.Id
		        })] = 
		        	{
		   				Quantity :Item.getValue({
				            name:  dicConfigSM.CustomFields.QuantityShipped.Id}),
				        TransDate : Item.getValue({
				            name:  dicConfigSM.CustomFields.TransDate.Id})
		        	};
	   		}
 			
 		 });
 		 
	   for (var i = 0; i < sublist.lineCount; i++) {
		   var sublistvalue = sublist.getSublistValue({
			    id : 'item',
			    line: i
			});
		   
		   if(htLookupSublist.hasOwnProperty(sublistvalue))
		   {
			   var onHand = htLookupSublist[sublistvalue].Quantity;
			   sublist.setSublistValue({
	   		    id : dicConfigSM.CusFieldQtyShippedPO,
	   		    line : i,
	   		    value : onHand
	   		});
			   
		  
		   }
       };
	}

    /**
     * Function definition to be triggered before record is loaded.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.newRecord - New record
     * @param {string} scriptContext.type - Trigger type
     * @param {Form} scriptContext.form - Current form
     * @Since 2015.2
     */

	_mod.beforeLoad = function(context) {
    	if (context.type === context.UserEventType.CREATE) return;
    	try
    	{
	    	var custItemPO = searchCutomRecord(context.newRecord.id);
	    	addField(context.form, custItemPO, context.newRecord.id, context.request.method);
    	}
    	catch(e)
    	{
    		log.error({
    		    title: 'Error Load quantity shippemt PO', 
    		    details: e
    		    });
    	}
   
    };

    /**
     * Function definition to be triggered before record is loaded.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.newRecord - New record
     * @param {Record} scriptContext.oldRecord - Old record
     * @param {string} scriptContext.type - Trigger type
     * @Since 2015.2
     */
	_mod.beforeSubmit = function(context) {
		//alert('Test');
    };

    /**
     * Function definition to be triggered before record is loaded.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.newRecord - New record
     * @param {Record} scriptContext.oldRecord - Old record
     * @param {string} scriptContext.type - Trigger type
     * @Since 2015.2
     */
    _mod.afterSubmit = function(context) {

    };

    return {
        beforeLoad: _mod.beforeLoad,
        beforeSubmit: _mod.beforeSubmit,
        afterSubmit: _mod.afterSubmit
    };
    
};
