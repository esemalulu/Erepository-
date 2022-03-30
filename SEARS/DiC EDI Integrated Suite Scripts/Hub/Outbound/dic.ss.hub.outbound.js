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
define(['../../Com/dic.cs.config',
        '../../Com/Mailbox/dic.ss.com.mailbox',
        '../../Com/Util/dic.cs.util',
        'N/ui/serverWidget'], DiCSSHubOutbound);

function DiCSSHubOutbound(dicConfig, 
		mailbox, 
		dicutil, 
		dicMess,
		serverWidget) {
	var _mod = {};
	/***Begin region private methods 
	*/
	_mod._createOptions = function(req){
		 
		return {
			mailboxType: dicConfig.MAILBOX.TYPE.Outbound.Type,
			query: req.parameters,
			sideType: dicConfig.SIDE_TYPE.HUB.Type
			//url: dicutil.buildUrl(req.url,  req.parameters, ["cq", "ps"])
		};
	}
	
	/**
	* Build detail information of inbound form
	* @param {ServerRequest} context.request - Encapsulation of the incoming request
	 */
	_mod._buildOutboundForm = function(req){
		 return mailbox.buildMailboxForm(_mod._createOptions(req));
		 
	}
	
	/**
	 *End region private methods 
	 */
	
	
	/**
	 * Process request METHOD GET
	 * @param {ServerRequest} context.request - Encapsulation of the incoming request
     * @param {ServerResponse} context.response - Encapsulation of the Suitelet response
	 */
	_mod._processRequestGET=function(req, res){
		 
		res.writePage(_mod._buildOutboundForm(req));
	}
	
	/**
	 * Process request METHOD POST
	 */
	_mod._processRequestPOST = function(req, res){
		res.writePage(_mod._buildOutboundForm(req));
	}
	
    /**
     * Definition of the Suitelet script trigger point.
     *
     * @param {Object} context
     * @param {ServerRequest} context.request - Encapsulation of the incoming request
     * @param {ServerResponse} context.response - Encapsulation of the Suitelet response
     * @Since 2015.2
     */
    _mod.onRequest = function(context) {
    	if(context.request.method==='GET'){   
    		_mod._processRequestGET(context.request, context.response);
    	}else{
    		_mod._processRequestPOST(context.request, context.response);
    	}
    }

    return {
        onRequest: _mod.onRequest
    };
    
};
