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
define(['../../Com/dic.cs.config', //diConfig
        '../../Com/Mailbox/dic.ss.com.mailbox', //mailbox
        '../../Com/Util/dic.cs.util',
        'N/ui/serverWidget'
       ], DicSSHubInbound);



function DicSSHubInbound(dicConfig, mailbox, dicutil,serverWidget ) {
   	/**
   	 * 
   	 */
	function _createOptions(req){
		
		return {
			mailboxType: dicConfig.MAILBOX.TYPE.Inbound.Type,
			sideType: dicConfig.SIDE_TYPE.HUB.Type,
			query: req.parameters
			//url: dicutil.buildUrl(req.url, req.parameters, new Array('cq', 'ps'))
			
		};
	}
	/**
	 * Build detail information of inbound form
	 */
	function _buildInboundForm(req){
		return mailbox.buildMailboxForm(_createOptions(req));
	}
	
	/**
	 * Process request METHOD GET
	 */
	function _processRequestGET(req, res){
		res.writePage(_buildInboundForm(req));
	}
	
	/**
	 * Process request METHOD POST
	 */
	function _processRequestPOST(req, res){
		
	}
	/**
     * Definition of the Suitelet script trigger point.
     *
     * @param {Object} context
     * @param {ServerRequest} context.request - Encapsulation of the incoming request
     * @param {ServerResponse} context.response - Encapsulation of the Suitelet response
     * @Since 2015.2
     */
    function onRequest(context) {
    	if(context.request.method === 'GET'){
    		_processRequestGET(context.request, context.response);
    	}else{
    		_processRequestPOST(context.request, context.response);
    	}
    }

    return {
        onRequest: onRequest
    };
    
};
