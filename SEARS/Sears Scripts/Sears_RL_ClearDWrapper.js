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
 * Version    Date            Author        Remarks
 * 1.0       23 June 2016    bfeliciano 	Initial Development
 */

/**
 *
 * @NApiVersion 2.x
 * @NScriptType restlet
 */
define(['./NSUtil', './LibShipDelivery', 'N/record', 'N/search', 'N/task', 'N/format', 'N/runtime'],
/**
 * @param {Object} nsutil
 * @param {Object} LibWebReq
 * @param {record} record
 * @param {search} search
 * @param {task} task
 */
function(nsutil, LibShipDelivery, record, search, task, format, runtime) {

	var LOG_TITLE = 'ClearD-Wrapper';
	var EndPoint = {}, Helper = {}, Process={};


	function handlePostData(requestBody, logTitle)
	{
		var request = JSON.parse(requestBody);
		
		log.debug(logTitle, '---requestBody: ' + requestBody);
		log.debug(logTitle, '---request.api: ' + request.api);
		log.debug(logTitle, '---request.param: ' + JSON.stringify(request.param));

		switch (request.api)
		{
			case 'getAvailableDates':
				return LibShipDelivery.getAvailableDates(request.param);
			case 'getAvailableTimeslots':
				return LibShipDelivery.getAvailableTimeslots(request.param);
			case 'sendOrder':
				// {"shipDate":"2016-8-27","timeSlot":"3:00 PM - 5:00 PM","recordId":"257077","recordType":"salesorder","bookId":"47475"}
				
				if (request.param.bookId && request.param.recordId)
				{
					record.submitFields({
						type : 'customrecord_sears_bigitem_shipping',
						id : request.param.bookId,
						values: {
							custrecord_sears_bigitemship_status: 'RESERVED',
							custrecord_sears_bigitemship_orderid: request.param.recordId
						}
					});
				}
				
				return true;//LibShipDelivery.sendOrder(request.param);
			default:
				return '';
		}

//		return LibShipDelivery[request.api](request.param);
	}


	/**
	 * GET handle for restlet
	 * @param {Object} requestBody
	 * @memberOf EndPoint
	 */
	EndPoint.get = function (requestBody)
	{
		var logTitle = [LOG_TITLE, 'get'].join('::');
		var responseBody = {};
		log.debug(logTitle, '**** START ****' + JSON.stringify(requestBody));
		try
		{
			responseBody.data = handlePostData( requestBody, logTitle);
		}
		catch (error)
		{
			responseBody.error = true;
			responseBody.error_message = error.toString();
		}
		finally
		{
			responseBody.timestamp = format.format((new Date()), format.Type.DATETIMETZ);
		}

		log.debug(logTitle, '## respojnse: ' + JSON.stringify(responseBody));

		return JSON.stringify(responseBody);
	};


	/**
	 * POST handle for restlet
	 * @param {Object} requestBody
	 * @memberOf EndPoint
	 */
	EndPoint.post = function (requestBody)
	{
		var logTitle = [LOG_TITLE, 'post'].join('::');
		var responseBody = {};
		log.debug(logTitle, '**** START ****' + requestBody);
		try
		{
			responseBody.data = handlePostData( requestBody, logTitle);
		}
		catch (error)
		{
			responseBody.error = true;
			responseBody.error_message = error.toString();
		}
		finally
		{
			responseBody.timestamp = format.format((new Date()), format.Type.DATETIMETZ);
		}

		return JSON.stringify(responseBody);
	};

    return EndPoint;
});
