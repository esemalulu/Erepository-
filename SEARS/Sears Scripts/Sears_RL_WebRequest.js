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
 * 1.1		 19 Dec 2016		Balaraman	Loyalty Card Number Updated on Customer Record When His/Her Sales Order placed with New Loyalty Card Details	
 *														Marked with /*b*./ and /*c*./
 */

/**
 *
 * @NApiVersion 2.x
 * @NScriptType restlet
 */
define(['./NSUtil', './LibJsonRequest', 'N/record', 'N/search', 'N/task', 'N/format', 'N/runtime'],
/**
 * @param {Object} nsutil
 * @param {Object} LibWebReq
 * @param {record} record
 * @param {search} search
 * @param {task} task
 */
function(nsutil, LibWebReq, record, search, task, format, runtime) {

	var LOG_TITLE = 'WebRequestSS2';
	var EndPoint = {}, Helper = {}, Process={};
	var currentBatchId = null;
	var USAGE_THRESHOLD = 2000; 
	var TIME_THRESHOLD = 40 * 1000; 
	var MAX_REQUESTS = 100;
	var param_recordtype = 'custscript_sears_rl_webreq_recordtype';
	
	var PROCESS_ON_BACKGND = false; 

	var QueueMRScript = {
			scriptId :  'customscript_sears_mr_process_jsonwebreq',
			deployment: {
				SALES_ORDER: 'customdeploy_procwebreq_salesorders',
				RETURN_AUTHORIZATION: 'customdeploy_procwebreq_returnauth',
				RETURN_AUTHORIZATION_IR: 'customdeploy_procwebreq_returnauth_ir',
				ITEM_FULFILLMENT: 'customdeploy_procwebreq_itemff',
				ITEM_RECEIPT: 'customdeploy_procwebreq_itemrecpt'
			}
	};
	
	var tstampSTART = (new Date()).getTime();

	/**
	 * POST handle for restlet
	 * @param {Object} requestBody
	 * @memberOf EndPoint
	 */
	EndPoint.post = function (requestBody)
	{
		var logTitle = [LOG_TITLE, 'post', runtime.getCurrentUser().name, runtime.getCurrentUser().role, runtime.getCurrentUser().roleId].join('|');
		var responseBody = {};

		try
		{
			var currentScript = runtime.getCurrentScript();
			var currentRecordType = currentScript.getParameter({name: param_recordtype});
			PROCESS_ON_BACKGND = currentScript.getParameter({name: 'custscript_sears_processbg'});
			logTitle = logTitle + '::PROCESSBG:' + (PROCESS_ON_BACKGND ? 'Yes':'No');
			
			log.debug(logTitle, '**** START *** ' + currentRecordType);
			log.debug(logTitle, '... POST value: ' + JSON.stringify(requestBody));

			var strRequestType = '';
			for (strRequestType in requestBody);

			log.debug(logTitle, '... request type: ' + strRequestType);

			if ( strRequestType.toUpperCase() != currentRecordType.toUpperCase() )
			{
				throw "Invalid Record Type";
			}

			var arrRequestData = requestBody[strRequestType];
			log.audit(logTitle, '... request data (length): ' + arrRequestData.length);
			
			if (arrRequestData.length >= MAX_REQUESTS )
			{
				throw "Requests exceeds the maximum ("+MAX_REQUESTS+")."; 			
			}
			
			

			var objRA ={};
			objRA.type = strRequestType;
			objRA.scriptId = 'customscript_sears_mr_process_jsonwebreq';

			switch (strRequestType)
			{
				case 'SalesOrderRequest':
					responseBody = Process.SalesOrderRequest(arrRequestData);
					break;
				case 'ReturnAuthorizationCreate':
					objRA.deploymentId = 'customdeploy_procwebreq_returnauth';
					responseBody = Process.ReturnAuthorization(arrRequestData, objRA);
					break;
				case 'ReturnAuthorizationItemReceipt':
					objRA.deploymentId = 'customdeploy_procwebreq_returnauth_ir';
					responseBody = Process.ReturnAuthorization(arrRequestData, objRA);
					break;
				case 'FulfillmentRequest':
					responseBody = Process.FulfillmentRequest(arrRequestData);
					break;
				case 'TransferOrderItemReceipt':
					responseBody = Process.ItemReceiptRequest(arrRequestData);
					break;
				default:
					throw "Unknown Request Type - " + strRequestType;
					break;
			}
		}
		catch (error)
		{
			responseBody.error = true;
			responseBody.error_message = error.toString();
			log.error('** ERROR **', error.toString());
		}
		finally
		{
			responseBody.timestamp = format.format((new Date()), format.Type.DATETIMETZ);
		}

		return responseBody;
	};


	/**
	 * @memberOf Process
	 */
	Process.generateBatchId = function (requestType)
	{
		var logTitle = [LOG_TITLE, 'generateBatchId'];

		log.debug(logTitle, '** Creating new batch ***');
		var batchid = null;
		try
		{
			var recBatch = record.create({type:'customrecord_sears_webrequest_batch'});
			recBatch.setValue({fieldId:'custrecord_batchwebreq_status', value: 'INITIALIZED'});
			recBatch.setValue({fieldId:'custrecord_batchwebreq_requesttype', value: requestType});
			
			//custrecord_batchwebreq_requesttype
			batchid = recBatch.save();
			log.debug(logTitle, '... record id:' + batchid);
		}
		catch (error)
		{
			log.error(logTitle, '@@ ERROR FOUND : ' + error.toString());
		}

		return batchid;
	};

	/**
	 * @memberOf Process
	 */
	Process.triggerQueue = function ( paramObj )
	{
		var logTitle = [LOG_TITLE, 'triggerQueue'];

		log.debug(logTitle, '## Triggering the JSON Web Request Map/Reduce : ' + JSON.stringify(paramObj) );

		if (! paramObj.batchId )
		{
			return false;
			throw "Missign Batch ID";
		}

		//update the Batch ID
		record.submitFields({
			type : 'customrecord_sears_webrequest_batch',
			id : paramObj.batchId,
			values :
			{
				custrecord_batchwebreq_status : paramObj.status,
				custrecord_batchwebreq_requesttype: paramObj.requestType,
				custrecord_batchwebreq_message: paramObj.message
			}
		});

		return true;
	};


	/**
	 * @memberOf Process
	 */
	Process.triggerSendtoWMS = function (paramObj)
	{
		var logTitle = [LOG_TITLE, 'triggerSendtoWMS'];

		log.debug(logTitle, '## Triggering the Send to WMS Scheduled Script: ' + JSON.stringify(paramObj) );

		var schedScriptObj = task.create({
			taskType : task.TaskType.SCHEDULED_SCRIPT
		});

		schedScriptObj.scriptId = paramObj.scriptId;
		schedScriptObj.deploymentId = paramObj.deploymentId;
		schedScriptObj.params = paramObj.params;

		var schedScriptId = schedScriptObj.submit();
		var taskStatus = task.checkStatus(schedScriptId);

		log.debug(logTitle, '.. status: ' + JSON.stringify(taskStatus) );

		log.debug('SCHEDULE triggerSendtoWMS ', 'status=' + taskStatus);

		if (taskStatus == task.TaskStatus.FAILED){
			throw "Unable to trigger Scheduled Script. Please contact the administrator.";
		}

		return true;
	};


	/**
	 * @memberOf Process
	 */
	Process.SalesOrderRequest = function (arrRequestData)
	{
	
      var logTitle = [LOG_TITLE, 'SalesOrderRequest'].join(':');
		var currentCustomer = null;
		var returnObj = {'results':[]};

		currentBatchId = Process.generateBatchId('SalesOrderRequest');
		var batchResults = {
		        errormessages: [],
		        has_errors: false,
		        all_errors: true,
		        has_queries: false,
		        has_queued: false
		};
		
		var currentRequest = {};
		var currentCustomerJSONId = null;

		var currentScript = runtime.getCurrentScript();
		var stParamDept = currentScript.getParameter({name: 'custscript_sears_rl_department'});
		var stParamDiscItemsIds = currentScript.getParameter('custscript_reward_ids');
		var stParamRedemptionAmt = currentScript.getParameter('custscript_redemption_amts');
		var stParamSubtotalItem = currentScript.getParameter('custscript_subtotal_item');

		var hasQueuedEntries = false;
		
		try
		{
			var arrReqSalesOrder = [];
			var hasCustomersCreated = false;
			
			var countCustomerReq = 0;
			var countTransactionReq = 0;
			
			var arrRequestSalesOrders = {};

			// collect the customers first
			for (var i=0,j=arrRequestData.length; i<j; i++)
			{
				var requestData = arrRequestData[i];
				if (requestData.recordtype == 'customer' && requestData.customerid)
				{
					//Init Script param
					requestData.stParamDiscItemsIds = stParamDiscItemsIds;
					requestData.stParamRedemptionAmt = stParamRedemptionAmt;
					requestData.stParamSubtotalItem  = stParamSubtotalItem;
				
					if (currentBatchId)
					{
						requestData.batchid = currentBatchId;
					}
					arrRequestSalesOrders[requestData.customerid] = {data:requestData, orders:[] };
					
					countCustomerReq++;
				}
			}

			// fill out the salesorder
			for (var i=0,j=arrRequestData.length; i<j; i++)
			{
				var requestData = arrRequestData[i];
				if (requestData.recordtype == 'salesorder' && requestData.customerid)
				{
					requestData.stParamDiscItemsIds = stParamDiscItemsIds;
					requestData.stParamRedemptionAmt = stParamRedemptionAmt;
					requestData.stParamSubtotalItem  = stParamSubtotalItem;
					
					if (currentBatchId)
					{
						requestData.batchid = currentBatchId;
					}
				
					if (! arrRequestSalesOrders[requestData.customerid])
					{
						arrRequestSalesOrders[requestData.customerid] = {data:null, orders:[] };
					}
					
					arrRequestSalesOrders[requestData.customerid].orders.push(requestData);
					countTransactionReq++;
				}
			}

			log.debug(logTitle, '>> arrRequestSalesOrders: ' + JSON.stringify({customerCount : countCustomerReq,salesOrderCount : countTransactionReq}));
            record.submitFields({
                type : 'customrecord_sears_webrequest_batch',
                id : currentBatchId,
                values : {
                	custrecord_batchwebreq_customercount : countCustomerReq,
                	custrecord_batchwebreq_transcount: countTransactionReq
                }
            });

			
			// now process all//
			for (var customerId in arrRequestSalesOrders)
			{
				var objCustSalesOrder = arrRequestSalesOrders[customerId];
				
				var currentCustomer = null, currentCustomerJsonId =null;
				
				if ( objCustSalesOrder.data )
				{
					
					if (PROCESS_ON_BACKGND || (!PROCESS_ON_BACKGND && !Process.hasRemainingUsage()) )
					{
						var returnItemCustomer = {'recordtype':'customer', batchId:currentBatchId};
						returnItemCustomer.queue_record = 'customrecord_json_webrequest';
						returnItemCustomer.queue_id = Process.addToRequestQueue('SalesOrderRequest', objCustSalesOrder.data);
						
                        batchResults.has_errors = false;
                        batchResults.has_queued = true;
                        
                        currentCustomerJsonId = returnItemCustomer.queue_id; 
                        
                        returnObj.results.push(returnItemCustomer);
					}
					else
					{
						var resultCustomer = LibWebReq.createCustomer(objCustSalesOrder.data);
						log.audit(logTitle, '>>... resultCustomer: ' + JSON.stringify(resultCustomer));
						if (resultCustomer.custrecord_jsonreq_recordid)
						{
							currentCustomer = resultCustomer.custrecord_jsonreq_recordid; 
						}
						else
						{
							resultCustomer = LibWebReq.createCustomerOldWay(objCustSalesOrder.data);
							
							log.audit(logTitle, '>>... resultCustomer: ' + JSON.stringify(resultCustomer));
							if (resultCustomer.custrecord_jsonreq_recordid)
							{
								currentCustomer = resultCustomer.custrecord_jsonreq_recordid; 
							}
							else
							{
								var returnItemCustomer = {'recordtype':'customer', batchId:currentBatchId};
								returnItemCustomer.error_message = resultCustomer.custrecord_jsonreq_messsage;
								returnItemCustomer.queue_record = 'customrecord_json_webrequest';
								returnItemCustomer.queue_id = Process.addToRequestQueue('SalesOrderRequest', objCustSalesOrder.data);
								
		                        batchResults.has_errors = true;
		                        batchResults.has_queued = true;
		                        batchResults.errormessages.push(returnItemCustomer.error_message);
		                        
		                        returnObj.results.push(returnItemCustomer);
							}
						}
					}
				}
				
				for (var i=0,j=objCustSalesOrder.orders.length; i<j; i++)
				{
					var salesOrderData = objCustSalesOrder.orders[i]; 
					salesOrderData.stParamDiscItemsIds = stParamDiscItemsIds;
					salesOrderData.stParamRedemptionAmt = stParamRedemptionAmt;
					salesOrderData.stParamSubtotalItem  = stParamSubtotalItem;
					salesOrderData.departmentid = stParamDept;
					
					batchResults.has_queries = true;
					
					if (currentCustomer)
					{
						salesOrderData.customer_internalid = currentCustomer; 
					}
					else if(currentCustomerJsonId)
					{
						salesOrderData.customer_jsonid = currentCustomerJsonId; 
					}
					
					var result = {}, returnItem = {};
					returnItem.recordtype = salesOrderData.recordtype;
					returnItem.batchId = currentBatchId;
					
					if (PROCESS_ON_BACKGND || (!PROCESS_ON_BACKGND && !Process.hasRemainingUsage()) )
					{
						returnItem.recordid = 'sent-to-queue';
						returnItem.queue_record = 'customrecord_json_webrequest';
						returnItem.queue_id = Process.addToRequestQueue('SalesOrderRequest', salesOrderData);
						
						batchResults.has_queued = true;
						
						returnObj.results.push(returnItem);
						hasQueuedEntries = true;
						continue;
					}
					
					result = LibWebReq.createSalesOrder(salesOrderData);
                  log.debug('salesOrderData ', JSON.stringify(salesOrderData) );
                  log.debug('arrRequestData',  JSON.stringify(arrRequestData));
					/*Fix: Updating the sales order's loyalty card number to the customer record (NS) if it's a new one. changes /*b*/		
/*b*/				processLoyaltyNumber(result, salesOrderData);

					if (! result )
					{
						returnItem.error_message = "Error in creating the sales order record!";
                        batchResults.has_errors = true;
                        batchResults.errormessages.push(returnItem.error_message);
					}
					if ( nsutil.isEmpty(result.custrecord_jsonreq_recordid) )
					{
						returnItem.error_message = result.custrecord_jsonreq_messsage;
						currentCustomerJSONId = Process.addToRequestQueue('SalesOrderRequest', salesOrderData);

						returnItem.queue_record = 'customrecord_json_webrequest';
						returnItem.queue_id = currentCustomerJSONId;
						
                        batchResults.has_errors = true;
                        batchResults.has_queued = true;
                        batchResults.errormessages.push(returnItem.error_message);
					}
					else
					{
                        batchResults.all_errors = false;
						returnItem.recordid = result.custrecord_jsonreq_recordid;
					}
					
					returnObj.results.push(returnItem);
				}
			}

		}
		catch (error)
		{
            batchResults.has_errors = true;
            batchResults.errormessages.push(error.toString());
            batchResults.has_queued = true;
		    
			returnObj.error_message = '1' + error.toString();
			currentCustomerJSONId = Process.addToRequestQueue('SalesOrderRequest', currentRequest);

			returnItem.queue_record = 'customrecord_json_webrequest';
			returnItem.queue_id = currentCustomerJSONId;

			hasQueuedEntries = true;
		}
		
		log.debug('** Update Batch ** ', JSON.stringify([currentBatchId, batchResults]) );
		log.debug('** Return Obj Batch ** ', JSON.stringify([returnObj]) );log.debug('** Return Obj Batch ** ', JSON.stringify([returnObj]) );
   
		
        try
        {
            var batchValues = {};
            if ( batchResults.has_queries || hasQueuedEntries)
            {
                batchValues.status = batchResults.has_queued ? 'INIT-CREATION' : 'INIT-APIGEE';
                if (batchResults.errormessages.length > 0 && (batchResults.has_errors || batchResults.all_errors))
                {
                    batchValues.message = JSON.stringify(batchResults.errormessages);
                    if (batchResults.all_errors)
                    {
                        batchValues.status = 'FAIL-CREATION';
                    }
                }
                
                //update the Batch ID
                record.submitFields({
                    type : 'customrecord_sears_webrequest_batch',
                    id : currentBatchId,
                    values :
                    {
                        custrecord_batchwebreq_status : batchValues.status,
                        custrecord_batchwebreq_requesttype: 'SalesOrderRequest',
                        custrecord_batchwebreq_message: batchValues.message
                    }
                });
                
//                //Trigger the Scheduled Script
//    			try {
//    				// self-trigger //
//    				var schedScriptObj = task.create({taskType : task.TaskType.SCHEDULED_SCRIPT});
//    				schedScriptObj.scriptId = 'customscript_sears_ss_batchreq_process';
//					schedScriptObj.params = {};
//					schedScriptObj.params['custscript_batchprocess_batchid'] = currentBatchId;
//					schedScriptObj.params['custscript_batchprocess_exitnow'] = false;
//    				
//    				log.debug(logTitle, '.. schedScriptObj: ' + JSON.stringify(schedScriptObj));
//    				
//    				// submit the task
//    				var schedScriptId = schedScriptObj.submit();
//    				var taskStatus = task.checkStatus(schedScriptId);
//
//    				log.debug(logTitle, '** QUEUE STATUS : ' + JSON.stringify([schedScriptId, taskStatus, task.TaskStatus.FAILED]));
//    			}
//    			catch(err){
//    				log.debug(logTitle, '** QUEUE ERROR : ' + JSON.stringify(err));			
//    			}			
            }
            else
            {
            	LibWebReq.validateBatchStatus(currentBatchId);
            }
                        
        }
        catch (error)
        {
            returnObj.error_message = error.toString();
        }
		
		return returnObj;
	};

	/**
	 * @memberOf Process
	 */
	Process.FulfillmentRequest = function (arrRequestData)
	{
		var logTitle = [LOG_TITLE, 'FulfillmentRequest'].join(':');
		var currentCustomer = null;
		var returnObj = {'results':[]};

		currentBatchId = Process.generateBatchId('FulfillmentRequest');
		var currentRequest = {};
		var hasQueuedEntries = false;

		try
		{
			for (var i=0,j=arrRequestData.length; i<j; i++)
			{
				var requestData = arrRequestData[i];
				if (currentBatchId)
				{
					requestData.batchid = currentBatchId;
				}


				log.debug(logTitle, '... record type: ' + requestData.recordtype);
				log.debug(logTitle, '... record data: ' + JSON.stringify(requestData));

				currentRequest = requestData; // CACHE it

				// Just add to the queue, if no more remaining usage
//				if (!Process.hasRemainingUsage() )
				if (true)
				{
					Process.addToRequestQueue('FulfillmentRequest', requestData);
					hasQueuedEntries = true;				
					continue;
				}

				var result = {}, returnItem = {};

				if (requestData.recordtype == 'itemfulfillment')
				{
					result = LibWebReq.createItemFulfillment(requestData);

					if (! result )
					{
						returnItem.error_message = 'Error in creating the item fulfillment record!';
					}
					if (!nsutil.isEmpty(result.custrecord_jsonreq_batch) )
					{
						currentBatchId = result.custrecord_jsonreq_batch;
						requestData.batchid = currentBatchId;
					}

					if ( nsutil.isEmpty(result.custrecord_jsonreq_recordid) )
					{
						returnItem.error_message = result.custrecord_jsonreq_messsage;
						Process.addToRequestQueue('FulfillmentRequest', requestData);
					}
					else
					{
						currentCustomer = result.custrecord_jsonreq_recordid;
						returnItem.recordid = currentCustomer;
					}

					returnObj.results.push(returnItem);
				}
			}
		}
		catch (error)
		{
			returnObj.error_message = error.toString();
			Process.addToRequestQueue('FulfillmentRequest', currentRequest);
			hasQueuedEntries = true;
		}
		finally
		{
			try
			{
				if (currentBatchId)
				{
					// TRIGGER
					Process.triggerQueue(
					{
						scriptId : QueueMRScript.scriptId,
						deploymentId : QueueMRScript.deployment.ITEM_FULFILLMENT,
						batchId : currentBatchId,
						requestType: 'FulfillmentRequest',
						status: hasQueuedEntries ? 'PENDING-CREATION' : 'PENDING-APIGEE'
					});
				}
			}
			catch (error)
			{
				returnObj.error_message = error.toString();
			}
		}

		return returnObj;
	};


	/**
	 * @memberOf Process
	 */
	Process.ItemReceiptRequest = function (arrRequestData)
	{
		var logTitle = [LOG_TITLE, 'ItemReceiptRequest'].join(':');
		var currentCustomer = null;
		var returnObj = {'results':[]};

		currentBatchId = Process.generateBatchId('TransferOrderItemReceipt');
		var currentRequest = {};

		var hasQueuedEntries = false;

		try
		{
			for (var i=0,j=arrRequestData.length; i<j; i++)
			{
				var requestData = arrRequestData[i];
				if (currentBatchId)
				{
					requestData.batchid = currentBatchId;
				}


				log.debug(logTitle, '... record type: ' + requestData.recordtype);
				log.debug(logTitle, '... record data: ' + JSON.stringify(requestData));

				currentRequest = requestData; // CACHE it

				// Just add to the queue, if no more remaining usage
				if (!Process.hasRemainingUsage() )
				{
					Process.addToRequestQueue('ItemReceiptRequest', requestData);
					hasQueuedEntries = true;
					continue;
				}

				var result = {}, returnItem = {};

				if (requestData.recordtype == 'itemreceipt')
				{
					result = LibWebReq.createItemReceipt(requestData)

					if (! result )
					{
						returnItem.error_message = 'Error in creating the item request record!';
					}

					if ( nsutil.isEmpty(result.custrecord_jsonreq_recordid) )
					{
						returnItem.error_message = result.custrecord_jsonreq_messsage;
						Process.addToRequestQueue('ItemReceiptRequest', requestData);
					}
					else
					{
						currentCustomer = result.custrecord_jsonreq_recordid;
						returnItem.recordid = currentCustomer;
					}

					returnObj.results.push(returnItem);
				}
			}
		}
		catch (error)
		{
			returnObj.error_message = error.toString();
			Process.addToRequestQueue('ItemReceiptRequest', currentRequest);
			hasQueuedEntries = true;
		}
		finally
		{
			try
			{
				Process.triggerQueue(
				{
					scriptId : QueueMRScript.scriptId,
					deploymentId : QueueMRScript.deployment.ITEM_RECEIPT,
					batchId : currentBatchId,
					requestType: 'ItemReceiptRequest',
					status: hasQueuedEntries ? 'PENDING-CREATION' : 'PENDING-APIGEE'
				});
			}
			catch (error)
			{
				returnObj.error_message = error.toString();
			}
		}

		return returnObj;
	};


	/**
	 * @memberOf Process
	 */
	Process.ReturnAuthorization = function (arrRequestData, objRA)
	{
		var logTitle = [LOG_TITLE, objRA.type].join(':');

		var currentScript = runtime.getCurrentScript();
		var stParamDept = currentScript.getParameter({name: 'custscript_sears_rl_department'});
		var stParamFormCS = currentScript.getParameter({name: 'custscript_sears_rl_form_ra_cs'});
		var stParamFormInv = currentScript.getParameter({name: 'custscript_sears_rl_form_ra_inv'});
		var stParamStatus = currentScript.getParameter({name: 'custscript_sears_rl_ra_appr_status'});
		var stParamFolderId = currentScript.getParameter({name: 'custscript_esi_folder_id'});

		log.debug(logTitle, 'stParamDept = '+stParamDept + ' | stParamFormCS = '+stParamFormCS + ' | stParamFormInv = '+stParamFormInv
				+ ' | stParamStatus = '+stParamStatus + ' | stParamFolderId = '+stParamFolderId);

		var currentRA = null;
		var returnObj = {'results':[]};

		currentBatchId = Process.generateBatchId('ReturnAuthorizationCreate');
		var currentRequest = {};
		var currentRAJSONId = null;

		var hasQueuedEntries = false;

		try
		{
			for (var i=0,j=arrRequestData.length; i<j; i++)
			{
				var requestData = arrRequestData[i];
				if (currentBatchId)
				{
					requestData.batchid = currentBatchId;
				}

				log.debug(logTitle, '... record type: ' + requestData.recordtype);
				log.debug(logTitle, '... record data: ' + JSON.stringify(requestData));

				currentRequest = requestData; // CACHE it

				// Just add to the queue, if no more remaining usage
				if (!Process.hasRemainingUsage() )
				{
					currentRAJSONId = Process.addToRequestQueue(objRA.type, requestData);
					hasQueuedEntries = true;
					continue;
				}

				var result = {}, returnItem = {};



				if (requestData.recordtype == 'returnauthorization')
				{
					log.debug(logTitle, '... entering return authorization: ' + requestData.recordtype);

					if(nsutil.isEmpty(stParamDept) || nsutil.isEmpty(stParamFormCS) || nsutil.isEmpty(stParamFormInv) || nsutil.isEmpty(stParamStatus) )
					{
						throw 'Script parameters should not be empty';
					}
					requestData.stParamDept =  stParamDept;
					requestData.stParamFormCS =  stParamFormCS;
					requestData.stParamFormInv = stParamFormInv;
					requestData.stParamStatus = stParamStatus;
					result = LibWebReq.createReturnAuthorization(requestData);
					returnItem.recordtype = requestData.recordtype;
				}

				if (requestData.recordtype == 'itemreceipt')
				{

					if(nsutil.isEmpty(stParamDept))
					{
						throw 'Script parameters should not be empty';
					}
					requestData.stParamDept =  stParamDept;

					log.debug(logTitle, '... entering return authorization item receipt: ' + requestData.recordtype);
					result = LibWebReq.createReturnAuthorizationItemReceipt(requestData, null, stParamFolderId);
					returnItem.recordtype = requestData.recordtype;
				}

				if (! result )
				{
					returnItem.error_message = 'Error in creating the '+requestData.recordtype+' record!';
				}

				if (!nsutil.isEmpty(result.custrecord_jsonreq_batch) )
				{
					currentBatchId = result.custrecord_jsonreq_batch;
					requestData.batchid = currentBatchId;
				}

				if ( nsutil.isEmpty(result.custrecord_jsonreq_recordid) )
				{
					returnItem.error_message = result.custrecord_jsonreq_messsage;
					currentRAJSONId = Process.addToRequestQueue(objRA.type, requestData);
				}
				else
				{
					returnItem.recordid = result.custrecord_jsonreq_recordid;
				}

				returnObj.results.push(returnItem);
			}

		}
		catch (error)
		{
			returnObj.error_message = error.toString();
			Process.addToRequestQueue(objRA.type, currentRequest);
			hasQueuedEntries = true;
		}
		finally
		{
			try
			{
				Process.triggerQueue(
				{
					scriptId : QueueMRScript.scriptId,
					deploymentId : objRA.deploymentId,
					batchId : currentBatchId,
					requestType: objRA.type,
					status: hasQueuedEntries ? 'PENDING-CREATION' : 'PENDING-APIGEE'
				});
			}
			catch (error)
			{
				returnObj.error_message = error.toString();
			}
		}

		return returnObj;
	};

	/**
	 * @memberOf Process
	 */
	Process.hasRemainingUsage = function ()
	{
		var deltaTime = (new Date()).getTime() - tstampSTART;
		log.audit('*** hasRemainingTime ** ', '>> ' + JSON.stringify([deltaTime, TIME_THRESHOLD, !!(deltaTime >= TIME_THRESHOLD)]) );
		if (deltaTime >= TIME_THRESHOLD)
		{
			return false;
		}
		
		var currentScript = runtime.getCurrentScript();
		var remainingUsage = currentScript.getRemainingUsage();
		
		log.audit(" *** Remaining governance units: " + [remainingUsage, USAGE_THRESHOLD].join(' / '));

		return ( remainingUsage > USAGE_THRESHOLD );
	};


	/**
	 * @memberOf Process
	 */
	Process.addToRequestQueue = function (requestType, requestData, errorMessage)
	{
		var logTitle = [LOG_TITLE, 'addToRequestQueue'].join('::');

		var reqQueueId = null;

		log.debug(logTitle, '** Add to Reqeuest: ' + JSON.stringify([requestType, requestData]));
		try
		{
			var recWebRequest = record.create({type:'customrecord_json_webrequest'});
			recWebRequest.setValue({
				fieldId : 'custrecord_jsonreq_type',
				value : requestType
			});
			recWebRequest.setValue({
				fieldId : 'custrecord_jsonreq_content',
				value : JSON.stringify(requestData)
			});
			recWebRequest.setValue({
				fieldId : 'custrecord_jsonreq_status',
				value : LibWebReq.STATUS.PENDING
			});
			recWebRequest.setValue({
				fieldId : 'custrecord_jsonreq_received',
				value : (new Date())//format.format(, format.Type.DATETIMETZ)
			});
			recWebRequest.setValue({
				fieldId : 'custrecord_jsonreq_recordtype',
				value : requestData.recordtype
			});

			if (requestData.batchid)
			{
				recWebRequest.setValue({
					fieldId : 'custrecord_jsonreq_batch',
					value : requestData.batchid
				});
			}

			reqQueueId = recWebRequest.save();
			log.debug(logTitle, '... record id:' + reqQueueId);
		}
		catch (error)
		{
			log.error(logTitle, '@@ERROR: ' + error.toString());
		}

		return reqQueueId;
	};

/*c*/
	/* process the loyalt number for customer record updation*/
	function processLoyaltyNumber(result, salesOrderData){
		log.debug('processLoyaltyNumber', 'yes');

		if(result.custrecord_jsonreq_status == "3"){
			updateLoyaltyNumberOnCustomer(salesOrderData);
		}
	}

	/* do update the loyalty card number to the customer record*/
	function updateLoyaltyNumberOnCustomer(salesOrderData){
		log.debug('updateLoyaltyNumberOnCustomer', 'yes');

		if(!nsutil.isEmpty(salesOrderData.custbody_loyalty_number)){
			if(!nsutil.isEmpty(salesOrderData.customer_internalid)){
				var nsCustLoyaltyNumber = getCustomerLoyaltyCard(salesOrderData.customer_internalid);
				log.debug('(nsCustLoyaltyNumber !== salesOrderData.custbody_loyalty_number)', (nsCustLoyaltyNumber !== salesOrderData.custbody_loyalty_number));
				if(nsutil.isEmpty(nsCustLoyaltyNumber) || (nsCustLoyaltyNumber !== salesOrderData.custbody_loyalty_number)){
					var id = record.submitFields({
												    type: record.Type.CUSTOMER,
												    id: salesOrderData.customer_internalid,
												    values: {
												        custentity_loyaltycard: salesOrderData.custbody_loyalty_number
												    },
												    options: {
												        enableSourcing: false,
												        ignoreMandatoryFields : true
												    }
												});
					log.debug('customer record', 'Has written.' );
				}
			}
		}
	}

	function getCustomerLoyaltyCard(customerInternalId){
		log.debug('getCustomerLoyaltyCard ' + customerInternalId, 'yes');
		var loyaltNumber = false;

		if(!nsutil.isEmpty(customerInternalId)){
			var customer = search.lookupFields({
				type: 'customer',
				id: customerInternalId,
				columns: ['custentity_loyaltycard']
			});
			log.debug(JSON.stringify(customer));
			loyaltNumber = customer.custentity_loyaltycard;
		}

		return loyaltNumber;
	}
/*c*/




    return EndPoint;
});