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
define(['../../../Com/dic.cs.config',
        '../../../Com/Util/dic.ss.com.util.js',
        '../../dic.cs.hub.config.syn',
        '../../../Com/Util/dic.ss.com.util.form'
        , 'N/config'
        ],
        DiCSSHubSynItem);

function DiCSSHubSynItem(dicConfig
		, dicSSUtil
		, dicCSSyn
		, dicComUtilForm
		, nsConfig) {
	
	function AbsDicHubSynItem(options){
		this.options = options;
	}
	
	AbsDicHubSynItem.prototype.buildForm = function(){
		return dicComUtilForm.buildForm(this.options.config);
	};
	
	function GetDicHubSynItem(options){
		AbsDicHubSynItem.call(this, options);
	}
	
	
	GetDicHubSynItem.prototype = new AbsDicHubSynItem();
	
	GetDicHubSynItem.prototype.constructor = GetDicHubSynItem;
	
	
	function PostDicHubSynItem(options){
		AbsDicHubSynItem.call(this, options);
	} 
	
	PostDicHubSynItem.prototype = new AbsDicHubSynItem();
	PostDicHubSynItem.prototype.constructor = PostDicHubSynItem;
		
	
	var _mod = {};
   
	
	_mod._createInstance = function(options){
		if (options.mode == 'GET'){
			return new GetDicHubSynItem({config: dicCSSyn});
		}
		else if (options.mode == 'POST'){
			return new PostDicHubSynItem({config: dicCSSyn});
		}
	};
	
	_mod._customizeForm = function(form){
		
	};
    /**
     * Definition of the Suitelet script trigger point.
     *
     * @param {Object} context
     * @param {ServerRequest} context.request - Encapsulation of the incoming request
     * @param {ServerResponse} context.response - Encapsulation of the Suitelet response
     * @Since 2015.2
     */
    _mod.onRequest = function(context) {
    	var instSyn = _mod._createInstance({
    		mode: context.request.method,
    		config: dicComUtilForm
    	});
    	var form = instSyn.buildForm();
    	//assign default value
    	
    	context.response.writePage(form);
    };

    return {
        onRequest: _mod.onRequest
    };
    
};
