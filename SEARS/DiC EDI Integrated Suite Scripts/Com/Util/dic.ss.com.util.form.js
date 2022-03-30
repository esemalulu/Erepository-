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
 * @NScriptType Suitelet
 * @NModuleScope SameAccount
 */
define(['N/ui/serverWidget'       
        
        ], DiCSSUtilForm);

function DiCSSUtilForm(
		serverWidget) {
   
	var _mod = {};
	
	
	
    /**
     * Definition of the Suitelet script trigger point.
     *
     * @param {Object} context
     * @param {ServerRequest} context.request - Encapsulation of the incoming request
     * @param {ServerResponse} context.response - Encapsulation of the Suitelet response
     * @Since 2015.2
     */
    _mod.onRequest = function(context) {
    	
    };
    
    _mod._buildGroupField = function(options){
    	if (!options.config.hasOwnProperty('CustomGroupFields')) return [];
    	var groupFields = options.config['CustomGroupFields'];
    	return Object.keys(groupFields).map(function(key){
    		var objGroupFld = groupFields[key];
    		var nsGroupField = options.form.addFieldGroup({
    			id: objGroupFld.Id,
    			label: objGroupFld.Text
    		});
    		
    		return nsGroupField;
    		
    	});
    };
    
    _mod._buildActions = function(options){
    	if (!options.config.hasOwnProperty('CustomActions')) return '';
    	var actions = options.config['CustomActions'];
    	return Object.keys(actions).map(function(actname){
    		var actionObj = actions[actname];
    		return options.form.addButton({
    			id: actionObj.Id,
    			label: actionObj.Text,
    			functionName: actionObj.Callback
    		});
    	});
    };
    
    _mod._bindValueForSelect = function(options){
    	Object.keys(options.value).forEach(function(value){
    		options.nsField.addSelectOption({
    			value: value,
    			text: options.value[value]
    			
    		});
    	});
    };
    
    _mod._bindValue = function(options){
    	switch(options.type){
    		case 'SELECT':
    			_mod._bindValueForSelect(options);
    		break;
    	}
    };
    _mod._mapFieldTypeStr2FieldTypeServer = function(strFieldType){
    	switch(strFieldType){
    		case 'DATETIMETZ' : return serverWidget.FieldType.DATETIMETZ;
    		default : return strFieldType;
    	};
    	
    };
    _mod._buildFields = function(options){
    	var cutfields = options.config.CustomFields;
    	return Object.keys(cutfields).map(function(key){
    		var objField =  cutfields[key];
    		var nsfield = options.form.addField({
    			id : objField.Id,
    			type: _mod._mapFieldTypeStr2FieldTypeServer (objField.Type),
				label: objField.Text,
				container: objField.hasOwnProperty('ContainerId') ? objField.ContainerId : undefined
    		});
    		if (objField.hasOwnProperty('Value')){
    			_mod._bindValue({
    				type: objField.Type,
    				value: objField.Value,
    				nsField: nsfield
    				    				
   				});

    		}
    		if (objField.hasOwnProperty('DisplayType')){
    			nsfield.updateDisplayType({
    				displayType: objField.DisplayType
    			}); 
    		}
    		if (objField.hasOwnProperty('MaxLength')){
    			nsfield.maxLength = objField.MaxLength;
    		}
    		return nsfield;
    	});
    };
    
    _mod._buildInstForm = function(options){
    	var frm = serverWidget.createForm({
    		title: options.Title
    	});
    	_mod._buildGroupField({	form: frm,	config: options	});
    	_mod._buildActions({form: frm, config: options});    	
    	_mod._buildFields({form: frm, config: options});
    	frm.clientScriptFileId = options.ClientScript.Id;
    	return frm;
    };
    
    _mod.buildForm = function(options){
    	
    	return  _mod._buildInstForm(options);
    };
    
    _mod.buildFields = function(options){
    	if(!options.form || !options.config) return [];
    	return _mod._buildFields(options);
    };
    return {
        onRequest: _mod.onRequest,
        buildForm: _mod.buildForm,
        buildFields: _mod.buildFields
    };
    
};
