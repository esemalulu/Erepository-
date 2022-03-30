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
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define([
        '../../dic.cs.hub.config.vi',
        '../../../Com/dic.cs.mess',
        '../../../Com/Util/dic.cs.util.object',
        '../../../Com/Util/dic.cs.util.search.itemvendor',
        'N/record',
        'N/search',
        'N/util',
        ], DiCEDICLSVendorItem);


function DiCEDICLSVendorItem(dicConfigVI, 
		dicmess,
		dicObj,
		dicSearch,
		record, 
		serverSearch,
		util) 
{
	
	var _mod = {
		
	};
	_mod.pageInit = function(context){
		//var currentRecord = context.currentRecord;
		//_mod.ResultSearch = dicSearch.searchCutomRecord(currentRecord.id);
	};
	//_mod.count = 0;
	
	 function createRecordItemVendor(externalkey, object) {
	        var rec = record.create({
	            type: dicConfigVI.CustomRecordId,
	            isDynamic: true
	        });
	        rec.setValue({
	            fieldId: dicConfigVI.CustomFields.External.Id,
	            value: 52
	        });
	        rec.setValue({
	            fieldId: dicConfigVI.CustomFields.Vendor.Id,
	            value: 2
	        });
	        rec.setValue({
	            fieldId: dicConfigVI.CustomFields.QuantityOnHand.Id,
	            value: 2
	        });
	        rec.setValue({
	            fieldId: dicConfigVI.CustomFields.TransDate.Id,
	            value: 2
	        });
	    }
	
	_mod.sublistChanged = function(context){
		
		var currentRecord = context.currentRecord;
        var sublistName = context.sublistId;
        if (sublistName == 'itemvendor')
        	{
        		//_mod.count++;
        		//console.log(_mod.count);
        		//console.log(util.nanoTime());
        		//console.log(context);
        		try
        		{
		        	var vendorId = currentRecord.getCurrentSublistValue({
		        		sublistId: sublistName,
		                fieldId: 'vendor'
		            });
		        	var valeOnhand = currentRecord.getCurrentSublistValue({
		        		sublistId: sublistName,
		                fieldId: dicConfigVI.CusFieldQtyOnhandOnItemVendor
		            });
		        	
        			dicSearch.upsert(
        			{
        				vendorId: vendorId,
        				valeOnhand : valeOnhand,
        				itemId :currentRecord.id
        			});
		        	
		        
        		}
        		catch(e)
        		{
        			log.error({
            		    title: 'Error update onhand', 
            		    details: e
            		    });
        			return;
        		}
		   };
	};
	
    return {
        pageInit: _mod.pageInit,
        sublistChanged: _mod.sublistChanged,
    };
    
};
