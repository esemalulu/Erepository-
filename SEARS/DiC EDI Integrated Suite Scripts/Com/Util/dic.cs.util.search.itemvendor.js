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
define(['../dic.cs.config',
        '../../Com/Util/dic.cs.util.object',
        '../../Hub/dic.cs.hub.config.vi',
        '../../Com/Util/dic.cs.util.string',
        'N/search', 
        'N/util',
        'N/record'],
		SearchCutom);

function SearchCutom(
			dicConfig,
			dicObj,
			dicConfigVI,
			dicstring,
			serverSearch,
			util,
			record
		 ){
	var _mod =  {};
	
	_mod.searchCutomRecord = function(id){
		if (!id) return null;
		try
		{
			var filterColumns = dicObj.extractPropertyId({object: dicConfigVI.CustomFields});
	    	var customSearch = serverSearch.create({
	            type: dicConfigVI.CustomRecordId,
	            title: 'Search custom record list',
	            columns: filterColumns,
	            filters: [
	                      [dicConfigVI.CustomFields.Item.Id, 'is', id]
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
    		    title: 'Error Item vendor', 
    		    details: e
    		    });
			return null;
		}
		
	};
	
	Date.prototype.yyyymmddhhmmss = function() {
		   var yyyy = this.getFullYear();
		   var mm = this.getMonth() < 9 ? "0" + (this.getMonth() + 1) : (this.getMonth() + 1); // getMonth() is zero-based
		   var dd  = this.getDate() < 10 ? "0" + this.getDate() : this.getDate();
		   var hh = this.getHours() < 10 ? "0" + this.getHours() : this.getHours();
		   var min = this.getMinutes() < 10 ? "0" + this.getMinutes() : this.getMinutes();
		   var ss = this.getSeconds() < 10 ? "0" + this.getSeconds() : this.getSeconds();
		   return "".concat(yyyy).concat(mm).concat(dd).concat(hh).concat(min).concat(ss);
		  };
	
	function createRecordItemVendor(object) {
        var rec = record.create({
            type: dicConfigVI.CustomRecordId,
            isDynamic: false
        });

        Object.keys(dicConfigVI.CustomFields).forEach(function(propertyName){
        	var instProp = dicConfigVI.CustomFields[propertyName];
        	rec.setValue({
	            fieldId: instProp.Id,
	            value: object[instProp.MapId]
	        });
        });
      
         rec.save({
            enableSourcing: false,
            ignoreMandatoryFields: false
        });
        
    }
	
	_mod.upsert = function(options){
		var itemvendors = options.itemvendors || _mod.searchCutomRecord(options.itemId); 
		if (!itemvendors) return;
		
		try
		{
	    	var obj = itemvendors.filter(function ( obj ) {
			    return obj.getValue({
		            name:  dicConfigVI.CustomFields.Vendor.Id
		        })=== options.vendorId;
			});
			   //insert
	    	if(obj.length <= 0) 
	    		{
				 var dateKey = new Date();
				  var externalKey = dicstring.stringFormat("{0}{1}{2}",options.itemId,options.vendorId, dateKey.yyyymmddhhmmss());
				   console.log(new Date());
	    		   var recordItemVendor = {
						   externalid:externalKey,
						   item: options.itemId,
						   vendor : options.vendorId,
						   quantityonhand : options.valeOnhand || 0,
						   transdate : new Date()
						   
				   };
	    		   createRecordItemVendor(recordItemVendor);
	    		}
	    	
	    	//update
	    	var objRecord = record.load({
	    	    type: dicConfigVI.CustomRecordId, 
	    	    id: obj[0].id,
	    	    isDynamic: true,
	    	});
	    	if(objRecord)
			{
	    		objRecord.setValue({
		               fieldId: dicConfigVI.CustomFields.QuantityOnHand.Id,
		               value: options.valeOnhand
		           });
	    		objRecord.save({
	                enableSourcing: false,
	                ignoreMandatoryFields: false
	            });
			}
		}catch(e){
			 log.error({
	    		    title: 'Error upsert custom record item vendor', 
	    		    details: e
	    		    });
		 }
	  
		
	};
    return {
    	searchCutomRecord: _mod.searchCutomRecord,
    	upsert: _mod.upsert
    };
    
}