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
 * 1.00       01 Nov 2016     Loi Nguyen	   	   
 *
 */
/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */
define([
        '../../dic.cs.hub.config.vi',
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

function DiCEDIUESHubPO(dicConfigVI, 
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

	function addField(form, listItemVendor, itemid, request){
	   var sublist = form.getSublist({id:'itemvendor'});
	   if(!sublist) return;
	   if (request === 'GET')
	   {
		   sublist.addField({
			    id : dicConfigVI.CusFieldQtyOnhandOnItemVendor,
			    type : serverWidget.FieldType.FLOAT,
			    label : 'Vendor Quantiy Onhand'
		   });
	   }

	  if(listItemVendor.length == 0) return;
	  

 		 var htLookupSublist =  {};
 		listItemVendor.forEach(function(Vendor){
 			htLookupSublist[Vendor.getValue({
	            name:  dicConfigVI.CustomFields.Vendor.Id
	        })] = Vendor;
 		 });
 		 
	   for (var i = 0; i < sublist.lineCount; i++) {
		   var sublistvalue = sublist.getSublistValue({
			    id : 'vendor',
			    line: i
			});
		   
		   if(htLookupSublist.hasOwnProperty(sublistvalue))
		   {
			   var onHand = htLookupSublist[sublistvalue].getValue({
		            name: dicConfigVI.CustomFields.QuantityOnHand.Id
		        });	
			   sublist.setSublistValue({
	   		    id : dicConfigVI.CusFieldQtyOnhandOnItemVendor,
	   		    line : i,
	   		    value : onHand
	   		});
				  
		   }
/*		  else
		   {
			   var externalKey = dicstring.stringFormat("{0}{1}{2}",itemid,sublistvalue, util.nanoTime());
			   var recordItemVendor = {
					   externalid:externalKey,
					   item: itemid,
					   vendor : sublistvalue,
					   quantityonhand : 0,
					   transdate : new Date()
					   
			   };
			   createRecordItemVendor(recordItemVendor)
		   };*/
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
		//log.emergency({title:'DIC_ EDI Loading script vendor item'});
		//log.emergency({title:util.nanoTime()});
		//alert(util.nanoTime());
    	if (context.type === context.UserEventType.CREATE) return;
    	try
    	{
	    	var custVendorItem = dicSearch.searchCutomRecord(context.newRecord.id);
	    	addField(context.form, custVendorItem, context.newRecord.id, context.request.method);
    	}
    	catch(e)
    	{
    		log.error({
    		    title: 'Error Load onhand Item vendor', 
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
