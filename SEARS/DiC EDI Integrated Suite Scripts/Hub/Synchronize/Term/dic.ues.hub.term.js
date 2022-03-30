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
 * 1.00       01 Nov 2016     Vu Ton	   	   
 *
 */
/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */
define(['../../dic.cs.hub.config.term',
        '../../../Com/Util/dic.cs.util.object',
        '../../../Com/Util/dic.ss.com.util.form',
        '../../../Com/Syn/dic.cues.com.syn',
    
        'N/record',
        'N/search'
       ], 
		DICEDIUESTerm);

function DICEDIUESTerm(dicConfigTerm,
		dicUtilObj,
		dicUtilForm,
		dicUtilSyn,
	
		nsRecord,
		nsSearch
	
		) {
   
	var _mod = {};
	
	_mod._buildMatchTermsCustomFields = function(scriptContext){
		if (!scriptContext || !scriptContext.form) return;
		return dicUtilForm.buildFields({
			form: scriptContext.form,
			config: dicConfigTerm.CUSTOM_RECORD  
		});
	};
	
	
	_mod._bindData= function(options){
		options.NSFields.forEach(function(nsfield){
			nsfield.defaultValue = options.NSTerm.getValue({name: nsfield.id.replace('custpage_','')});
		});
	};
    /**
     * Function definition to be triggered before record is loaded.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.newRecord - New record
     * @param {string} scriptContext.type - Trigger type
     * @param {Form} scriptContext.form - Current form
     * @Since 2015.2
     */
    _mod.beforeLoad = function(scriptContext) {
        	
    	try{
       		var nsFields = _mod._buildMatchTermsCustomFields(scriptContext);
    		var newRecord = scriptContext.newRecord;
       		if(!newRecord || !newRecord.id) return;
    	
       		var nsTerm = dicUtilSyn.searchRecord({config: dicConfigTerm.CUSTOM_RECORD,
				id:  newRecord.id	});
    		
    		if (nsTerm){
    			_mod._bindData({NSFields: nsFields, NSTerm: nsTerm});
    		}
    	
    	}catch(e){
    		log.error({
    			title:'DiC EDI User Event Script Match Term',
    			details: e
    		});
    	}
    };

    _mod._createDefaultValues = function(options){
    	var nsTerm = options.NSTerm;
    	if (!nsTerm) return null;
    	var result = {};
    	Object.keys(dicConfigTerm.CUSTOM_RECORD.CustomFields).forEach(function(propertyName){
    		var propertyInst = dicConfigTerm.CUSTOM_RECORD.CustomFields[propertyName];
    		result[propertyInst.IdSearchColumn] = nsTerm.getValue(propertyInst.Id);
    	});
    	return result;
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
    _mod.afterSubmit = function(scriptContext) {
    	try{
    		if (scriptContext.type=== 'delete') return;
    		var currentTerm = scriptContext.newRecord;
    		if (currentTerm && currentTerm.id){
    			dicUtilSyn.upsertRecord({config: dicConfigTerm.CUSTOM_RECORD,
					  standardRecord: currentTerm});
    		}
    	}catch(e){
    		log.error({title: 'DiC EDI Insert/Update into Custom Record DIC EDI Term',
    				   details: e});
    	}
    	
     };
          
    return {
        beforeLoad: _mod.beforeLoad,
       
        afterSubmit: _mod.afterSubmit
    };
    
};
