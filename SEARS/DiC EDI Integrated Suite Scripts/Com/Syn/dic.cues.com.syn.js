/**
 * Copyright (c) 2016 DiCentral, Inc.
 * 1199  NASA Parkway, Houston, TX 77058, USA
 *
 * All Rights Reserved.
 *
 * This software is the confidential and proprietary information of
 * DiCentral, Inc. ("Confidential Information"). You shall not
 * disclose such Confidential Information and shall use it only in
 * accordance with the terms of the license agreement you entered into
 * with DiCentral.
 *
 * Build Actions for Transactions form.
 *  
 *
 * Version    Date            Author           Remarks
 * 1.00       01 Nov 2016     Vu Ton	   	   
 *
 */

define(['N/search',
         'N/record',
        '../Util/dic.cs.util.object'
        ],
		DICCOMSyn);

function DICCOMSyn(nsSearch
		, nsRecord
		, dicUtilObj) {
    var _mod = {};
    
    _mod._buildColumnFilterSearchRecord = function(options){
    	var config = options.config;
    	var cols = dicUtilObj.extractPropertyId({object: config.CustomFields,	
			  Property: 'IdSearchColumn'});
     	Object.keys(config.JoinFields).forEach(function(property){
     		cols.push(config.JoinFields[property].Id);
     	});
     	return cols;
    };
    
    _mod._buildFilterSearchRecord = function(options){
    	var config = options.config,
    		id = options.id;
    	var filter = [];
    	Object.keys(config.JoinFields).forEach(function(property){
     		var insProperty = config.JoinFields[property];
    		filter.push([insProperty.Id, insProperty.Operator, id]);
     		return filter;
     	});
    	return filter;
    	
    };
    
    
    _mod.searchRecord = function(options){
    	var config = options.config,
    		id = options.id;
    	if (!config || !id) return null;
    	
       	var search = nsSearch.create({
       		type: config.Name
       		, filters: _mod._buildFilterSearchRecord(options)
       		, columns: _mod._buildColumnFilterSearchRecord(options)
       		});
       	
       	var resultSet = search.run().getRange({start: 0, end: 1});
		
		return (resultSet && resultSet.length > 0) ? resultSet[0] : null;
    	
    	
    };
    
    _mod.upsertRecord = function(options){
    	var config = options.config, 
    		standardRecord = options.standardRecord;
    	var id = standardRecord.id;
    	var searchRecord = _mod.searchRecord({config: config, id: id});
    	
    	var record;
    	if (!searchRecord){
    		record = nsRecord.create({
    			type: config.Name,
    			isDynamic: false   			
    			
    		});
    		Object.keys(config.JoinFields).forEach(function(prop){
    			record.setValue({fieldId: config.JoinFields[prop].Id,
    				             value: id});
    		});
    	}
    	else{
    		record = nsRecord.load({
    			type: config.Name,
    			isDynamic: false,
    			id: searchRecord.id
    		});
    	}
    	Object.keys(config.CustomFields).forEach(function(propName){
    		var inst = config.CustomFields[propName];
    		record.setValue({fieldId: inst.IdSearchColumn, 
    						value: standardRecord.getValue(inst.Id)});
    	});
    	
    	record.save({
            enableSourcing: false,
            ignoreMandatoryFields: false
        });
    	return record;
    };
    
    return {
    	searchRecord: _mod.searchRecord,
    	upsertRecord: _mod.upsertRecord
    };
    
};
