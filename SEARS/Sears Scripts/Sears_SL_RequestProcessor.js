/**
 * Copyright (c) 1998-2016 NetSuite, Inc.
 * 2955 Campus Drive, Suite 100, San Mateo, CA, USA 94403-2511
 * All Rights Reserved.
 *
 * This software is the confidential and proprietary information of
 * NetSuite, Inc. ("Confidential Information"). You shall not
 * disclose such Confidential Information and shall use it only in
 * accordance with the terms of the license agreement you entered into
 * with NetSuite.
 * Module Description
 *
 */
/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       10 Sep 2016     bfeliciano
 *
 */

var CONTEXT = nlapiGetContext();
var SECRETKEY = "THISISASECRETKEY";

/**
 * @param {nlobjRequest} request Request object
 * @param {nlobjResponse} response Response object
 * @returns {Void} Any output is written via response object
 */
function suitelet_processRequest(request, response)
{
	var logTitle = 'suitelet_processRequest';
	try
	{
		var method = request.getMethod();
		var returnVar = {};
		
		nlapiLogExecution('DEBUG',logTitle, '** START *** ' + JSON.stringify([method]));
		
		if (method == 'POST')
		{
			var skey = request.getParameter('skey');
			if (! skey)
			{
				throw "Invalid key";
			}
			var keyEncrpyt = nlapiEncrypt(SECRETKEY, 'base64');
			nlapiLogExecution('AUDIT', logTitle, 'SKEY: ' + keyEncrpyt);
			
			var content = request.getParameter('content');
			if (!content)
			{
				var webReqId = request.getParameter('reqid');
				if (!webReqId)
				{
					throw "Missing request id";
				}
				
				var recWebReq = nlapiLoadRecord('customrecord_json_webrequest', webReqId);
				if (!recWebReq)
				{
					throw "Invalid Request";
				}
				content = recWebReq.getFieldValue('custrecord_jsonreq_content'); 
			}
			
			
			if (!content)
			{
				throw "No Content";
			}
			returnVar.content = content;
			
			var jsonObj = JSON.parse(content);
			if (!content)
			{
				throw "Invalid Content";
			}
			
			returnVar = LIB_JSONRequest.createCustomer(jsonObj);			
		}
		else
		{
			returnVar.error = "Invalid request";
		
		}
	}
	catch (error) {
		var errormsg = "";
		if (error.getDetails != undefined) {
			nlapiLogExecution('ERROR', 'Process Error', error.getCode() + ': ' + error.getDetails());
			errormsg = [error.getCode(), error.getDetails()].join(': ');
//			throw error;
		} else {
			nlapiLogExecution('ERROR', 'Unexpected Error', error.toString());
			errormsg = error.toString(); 
//			throw nlapiCreateError('99999', error.toString());
		}
		
		returnVar.error = true;
		returnVar.error_message = errormsg;
	}
	finally
	{
		
	}

	return response.write(JSON.stringify(returnVar));
}
