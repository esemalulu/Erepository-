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
 *
 */
define(['../dic.cs.config',
        '../dic.cs.dierror',
        '../dic.cs.mess',
        './dic.cs.util.encoder',
        
        'N/runtime',
        'N/https'        
        ],DiCUtilRequest);

function DiCUtilRequest(diConfig,
		diError,
		dimess,
		diEncoder,
		
		runtime,
		https
		
		) {
	var _mod = {};
	
	_mod.buildHeaderRequest = function(options){
		var headerRequest = {};
		headerRequest["Content-Type"] = diConfig.CONTENT_TYPE;
		if (diConfig.ENV === 'debug'){
			var currentUsr = runtime.getCurrentUser();
			headerRequest["Authorization"] = diConfig.HEADER_AUTHORIZE[currentUsr.email];
		}else{
			headerRequest["Authorization"] = diConfig.HEADER_AUTHORIZE.DEFAULT;
		}
	
		return headerRequest;
	};
	
	_mod.buildRequestPOST = function(options){
		var requestPost = {
				method: https.Method.POST,
				url: options.url,
				headers: options.headers,
				body: JSON.stringify(options.data)
		};
		return requestPost;
	};
	
	_mod.buildProcessResponse = function(options){
		var response = options.response;
		if (response.code === 200){
			var result = JSON.parse(response.body);
			if (result.ErrorCode === 0){
				return result;
			}
			else{
				var err = new diError.DiError(result.ErrorCode, result.Message);
				throw err;
			}
		}
		else if (401 === response.code){
			var err = new diError.DiError(dimess.ERR.UNAUTHORIZED.Code, dimess.ERR.UNAUTHORIZED.Message);
			throw err;
		} else if (404 === response.code){
			var err = new diError.DiError(dimess.ERR.UNAUTHORIZED.Code, dimess.ERR.SERVICE_NOT_FOUND.Message);
			throw err;
		} 
		else{
			var err = new diError.DiError(dimess.ERR.UNDERTERMINE.Code, response.body);
			throw err;
		}
	};
	
	_mod.processResponseDontThrowException = function(options){
		var response = options.response;
		var res = {};
		if (response.code === 200){
			res.ErrorCode = 0;
			res.Data = JSON.parse(response.body);
		}else if(response.code === 401){
			res.ErrorCode = dimess.ERR.UNAUTHORIZED.Code;
			res.Message = dimess.ERR.UNAUTHORIZED.Message;
		} else if (response.code === 404){
			res.ErrorCode = dimess.ERR.UNAUTHORIZED.Code;
			res.Message = dimess.ERR.SERVICE_NOT_FOUND.Message;
		} else{
			res.ErrorCode = dimess.ERR.UNDERTERMINE.Code;
			res.Message = diEncoder.encodeHtml(response.body);
		}
		
		return res;
	};
	
    return {
        buildHeaderRequest: _mod.buildHeaderRequest,
        buildRequest: _mod.buildRequestPOST,
        processResponse: _mod.buildProcessResponse,
        processResponseDontThrowException: _mod.processResponseDontThrowException
    };
    
};
