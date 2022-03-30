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
define(['N/ui/serverWidget',
        '../dic.cs.config'
        ],

function(serverWidget,
		dicConfig) {
 
	function _buildTitle(sideType, formName){
		return dicConfig.FORMS[sideType][formName].Text;
	} 
	/**
	 * Build a form with title with optons
	 * @param {Object} {
	 * 	 sideType: sideType,
	 * 	 form: name of form
	 * }
	 */
	function buildForm(options){
		var form = serverWidget.createForm({
			title: _buildTitle(options.sideType, options.formName)
		});	
		if (options.clientScriptId){
			form.clientScriptFileId = options.clientScriptId;
		}
		return form;
	}
	/**
	 * Assign value for ns property control
	 * @param {Object} {
	 * 	  nsField :  serverWidget field
	 *    objField: objectField
	 * }
	 */
	
	function _assignPropertyValueForField(options){
		var objField = options.objField,
		    nsField = options.nsField;
		Object.keys(objField).forEach(function(propertyName){
			switch(propertyName){
				case 'MaxLength':
					nsField.maxLength = objField.MaxLength;
					break;
				case 'DisplayType':
					nsField.updateDisplayType({displayType: objField.DisplayType});
					break;
				case 'DefaultValue':
					nsField.defaultValue = objField.DefaultValue;
					break;
				case 'HelpText':
					nsField.setHelpText({help: objField.HelpText});
				default: break;
			}			
		});
	}
	
	/**
	 * Build NS fields for form
	 * @param {Object} {
	 * 	  @param {serverWidget Form} form,
	 * 	  @param {Object}: config of form
	 * }
	 */
	function buildFields(options){
		if (!options || !options.form || !options.config) return [];
		return Object.keys(options.config).map(function(key){
			var objField = options.config[key];
			var nsField = options.form.addField({
				id: objField.Id,
				type: objField.Type,
				label: objField.Text,
				container: objField.hasOwnProperty('ContainerId') ? objField.ContainerId : undefined
			});
			//
			_assignPropertyValueForField({
				nsField: nsField,
				objField: objField
		    });
			return nsField;
		});
	}
	
	/**
	 * Build groupField ServerWidget
	 */
	function buildGroupFields(options){
		if (!options || !options.form || !options.config) return [];
		return Object.keys(options.config).map(function(key){
			var objGroupField = options.config[key];
			var nsGroupField = options.form.addFieldGroup({
				id: objGroupField.Id,
				label: objGroupField.Text
			});
			return nsGroupField;
		});
	};
	
	/**
	 * Build Actions
	 */
	
	function buildActions(options){
		if (!options || !options.form || !options.config) return [];
		return Object.keys(options.config).map(function(actionName){
			var actionObj = options.config[actionName];
			var nsAction = options.form.addButton({
				id : actionObj.Id,
				label: actionObj.Text,
				functionName: actionObj.Callback
			});
			return nsAction;
		});
	};
	
    return {
        buildForm: buildForm,
        buildFields: buildFields,
        buildGroupFields: buildGroupFields,
        buildActions: buildActions
        
        
    };
    
});
