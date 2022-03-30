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
 * 1.00       11 May 2016     bfeliciano
 *
 */
var CONTEXT = nlapiGetContext();
var CACHE = {};
var MAXLIMIT_USAGE = 500;

/**
 * @param {Object} dataIn Parameter object
 * @returns {Object} Output object
 */
function sched_process_JSONRequests(objRequest)
{
	var execType = CONTEXT.getExecutionContext();
	var logTitle = ['sched_JSONRequests_SalesOrder', execType].join(':');

	var NOWTIME = new Date();
	var START_TIME = NOWTIME.getTime();
	try
	{
		var strDateReceived = nlapiDateToString(NOWTIME,'datetimetz');
		nlapiLogExecution('DEBUG', logTitle, '*** START *** ' + strDateReceived);

		var ssearchId = nlapiGetContext().getSetting('SCRIPT', 'custscript_jsonreqso_ssearch');

		// search for all items
		var arrPendingJSONRequests = LIB_JSONRequest.searchPendingJSONRequest( ssearchId );

		if ( Helper.isEmpty(arrPendingJSONRequests))
		{
			nlapiLogExecution('DEBUG', logTitle, '..no pending items');
			return true;
		}
		nlapiLogExecution('DEBUG', logTitle, '.. total pending items: ' + arrPendingJSONRequests.length);

		var hasCustomers = false, hasSalesOrders = false, hasItemff = false, hasItemRcpt = false;


		var searchRow  = null;
		while (searchRow = arrPendingJSONRequests.shift())
		{
			var jsonStrContent = searchRow.getValue('custrecord_jsonreq_content');
			var dataRequest = JSON.parse( jsonStrContent );
			var results = null;

			if (!jsonStrContent || !dataRequest)
			{
				continue;
			}

			switch (dataRequest.recordtype)
			{
				case 'customer':
					results = LIB_JSONRequest.createCustomer(dataRequest);
					hasCustomers = true;
					break;
				case 'salesorder':
					results = LIB_JSONRequest.createSalesOrder(dataRequest);
					hasSalesOrders = true;
					break;
				case 'itemfulfillment':
					results = LIB_JSONRequest.createItemFulfillment(dataRequest);
					hasItemff = true;
					break;
				case 'transferorder':
					results = LIB_JSONRequest.processTransferOrders(dataRequest);
					break;
				case 'itemreceipt':
					results = LIB_JSONRequest.createItemReceipt(dataRequest);
					break;
			}


			if (!Helper.isEmpty(results))
			{
				var arrFlds = [], arrVals =[];
				for (var fld in results)
				{
					arrFlds.push(fld);
					arrVals.push(results[fld]);
				}

				nlapiSubmitField('customrecord_json_webrequest', searchRow.getId(), arrFlds, arrVals);
			}

			if ( Helper.checkGovernance(MAXLIMIT_USAGE))
			{
				Helper.yieldScript();
				break;
			}
		}

		// trigger the send script  //
		if ( hasSalesOrders)
		{
			var status = nlapiScheduleScript('customscript_sears_ss2_send_salesorders', 'customdeploy_sears_ss2_send_salesorders');
			nlapiLogExecution('DEBUG', logTitle, 'Status: ' +status);
		}

	}
	catch (error)
	{
		if (error.getDetails != undefined)
		{
			nlapiLogExecution('ERROR', 'Process Error: ' + logTitle, error.getCode() + ': ' + error.getDetails());
			throw error;
		}
		else
		{
			nlapiLogExecution('ERROR', 'Unexpected Error: ' + logTitle, error.toString());
			throw nlapiCreateError('99999', error.toString());
		}
	}
	finally
	{
		var DELTA = ( (new Date()).getTime() - START_TIME ) / 1000;
		nlapiLogExecution('AUDIT', logTitle, '*** END SCRIPT: ' +DELTA+ 'secs');
	}

	return true;
}