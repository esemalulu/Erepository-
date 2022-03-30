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
 *            26/10/2016    Aleks           modified code to send french description is locale is french
 */

/**
 * @NApiVersion 2.x
 * @NModuleScope Public
 * @NScriptType ScheduledScript
 */

//define(['./LibJsonRequest', 'N/record', 'N/search', 'N/runtime', './NSUtil','N/http', 'N/error', 'N/format', './oauthv2','N/task'],
define(['N/record', 'N/search', 'N/runtime', 'N/http', './NSUtil', './oauthv2','./LibJsonRequest', 'N/error'],
	function(NS_Record, NS_Search, NS_Runtime, NS_Http, NSUtil, NSAuth, LibJsonRequest,NSError)
	{
		var USAGE_THRESHOLD  = 4000;
		var ITEMCOUNT_THRESHOLD = 100;
		var REQSIZE_THRESHOLD = 5000000; //approx 1MB
		var MAXRESULTS = 20;
		var DEPLOYMENTID = '';

		var LogTitleMain = ['SendSOtoWMS'];

		var EndPoint = {}, CACHE = {}, Helper = {}, PARAM = {};

		var HTTP_ERROR_CODES = {
			'400': 'Bad request:The request could not be understood by the server due to malformed syntax. ',
			'401': 'Unauthorized: The request requires user authentication',
			'403': 'Forbidden: Failed to authenticate the request',
			'404': 'Not Found: Resource not found.',
			'405': 'Method Not Allowed.',
			'406': 'Not Acceptable.',
			'407': 'Proxy Authentication Required',
			'408': 'Request Timeout',
		};

		/**
		 * @memberOf SendReturns
		 */
		EndPoint.execute = function (context)
		{
			var scriptObj = NS_Runtime.getCurrentScript();
			LogTitleMain+=':'+scriptObj.deploymentId;
			var logTitle = LogTitleMain;

			Helper.getScriptParameters();

			var startTime = (new Date()).getTime();
			var startUsage = scriptObj.getRemainingUsage();
			try
			{
				if (NSUtil.isEmpty(PARAM.searchId)  ||
					NSUtil.isEmpty(PARAM.urlLogfire) ||
					NSUtil.isEmpty(PARAM.urlSCI) )
				{
					throw "Missing script parameter!" + JSON.stringify(PARAM);
				}

				log.debug(logTitle, '*** START *** :' + JSON.stringify(PARAM));

				var arrOrdersToProcess = [], arrPendingBatches = [];

				if ( PARAM.batchId )
				{
					// generate a hash value
					PARAM.hashValue = (new Date()).getTime().toString();
					log.debug(logTitle, '.. hash value: ' + PARAM.hashValue);

					// get the next batch id one by one //
					arrPendingBatches = Helper.getNextBatchIds(PARAM.searchId, MAXRESULTS);
					if (! arrPendingBatches || !arrPendingBatches.length)
					{
						// exit .. no orders to process
						log.debug(logTitle, '** No Pending Batches to Process');
						//return true;
					}

					arrPendingBatches.forEach(function(batchId){
						// ADD CMARGALLO 3/11 START
						if (batchId) {
							// ADD CMARGALLO 3/11 END
							NS_Record.submitFields({
								type : 'customrecord_sears_webrequest_batch',
								id : batchId,
								values :{ custrecord_batchwebreq_status : 'INPROCESS-APIGEE',
									custrecord_batchwebreq_hashvalue : PARAM.hashValue
								}
							});
						}
					});
					log.audit(logTitle, '.. arrPendingBatches: ' + arrPendingBatches.length);

					if (arrPendingBatches && arrPendingBatches.length)
					{
						var arrPendingOrders = NSUtil.searchAll({
							recordType: 'salesorder',
							filterExpression: [
								['mainline','is','T'],'AND',
								['custbody_sears_webrequest_batch.custrecord_batchwebreq_hashvalue','is',PARAM.hashValue],'AND',
								['custbody_sears_webrequest_batch','anyof',arrPendingBatches]
							],
							columns: [ NS_Search.createColumn({name:'custbody_sears_webrequest_batch'}),
								NS_Search.createColumn({name:'custrecord_batchwebreq_hashvalue', join:'custbody_sears_webrequest_batch'}),
								NS_Search.createColumn({name:'internalid'}) ]
						});

						if (arrPendingOrders && arrPendingOrders.length)
						{
							arrPendingOrders.forEach(function(row){
								var internalId = row.getValue({name:'internalid'});
								if (! NSUtil.inArray(internalId, arrOrdersToProcess)){
									arrOrdersToProcess.push(internalId);
								}
								return true;
							});
						}
					}else {
						arrOrdersToProcess = Helper.getPendingOrders(PARAM.searchId, MAXRESULTS);
					}
				}
				else
				{
					arrOrdersToProcess = Helper.getPendingOrders(PARAM.searchId, MAXRESULTS);
				}

				log.audit(logTitle, '.. arrOrdersToProcess: ' + arrOrdersToProcess.length);
				var arrSendtoWMS = {};

				if (! arrOrdersToProcess || !arrOrdersToProcess.length)
				{
					// exit .. no orders to process
					log.debug(logTitle, '** No Pending Orders to Process');
					// return true;
				}
				else
				{

					for (var ii=0, jj=arrOrdersToProcess.length; ii<jj;ii++)
					{
						// load the sales order
						var recObj = Helper.loadRecord({type:'salesorder', id:arrOrdersToProcess[ii]});
						if (! recObj) continue;

						var arrHeaderData = Helper.extractRecordData(recObj);
						var arrLineData = Helper.extractLineData(recObj);

						log.debug(logTitle, '... header Data: ' + JSON.stringify(arrHeaderData));
						log.debug(logTitle, '... line Data: ' + JSON.stringify(arrLineData));

						/*
						 * the line data are grouped by location
						 * {
						 * 		'locationId01':
						 * 		{
						 * 			name: 'Location Name 01',
						 * 			lines: [
						 * 				{lineData:line01},
						 * 				{lineData:line02},
						 * 				{lineData:line03}
						 * 			]
						 * 		}
						 * }
						 */
						for (var locationId in arrLineData)
						{
							log.debug("for debugging","Location Id:"+locationId);
							var locationData = arrLineData[locationId];

							if (! arrSendtoWMS[locationId])
							{
								arrSendtoWMS[locationId] = {salesOrders:[]};
							}

							var orderData = JSON.parse( JSON.stringify(arrHeaderData) );

							orderData.location = locationData.name;
							log.debug(logTitle, '.. locationData.lines[0][location]: ' + locationData.lines[0].location_display);
							log.debug("for debugging", "Location Data:"+NSUtil.isEmpty(locationData.name));
							if(NSUtil.isEmpty(locationData.name)){
								log.debug(logTitle, '**Location In' + NSUtil.isEmpty(locationData.name));
								orderData.location = locationData.lines[0] ? locationData.lines[0].location_display :locationData.name;
							}
							log.debug(logTitle, '**Location Out' + NSUtil.isEmpty(locationData.name));
							orderData.items = locationData.lines;

							// set the header shipdate from line level
							orderData.shipdate = locationData.lines[0] ? locationData.lines[0].custcol_ship_date : '';

							arrSendtoWMS[locationId].salesOrders.push(orderData);
						}
					}

					log.debug(logTitle, '.. arrSendtoWMS: ' + JSON.stringify(arrSendtoWMS));

					////////////////
					for (var locationId in arrSendtoWMS)
					{
						var url = (PARAM.locationSCI == locationId)  ? PARAM.urlSCI : PARAM.urlLogfire;
						var requestData = arrSendtoWMS[locationId].salesOrders;
						//requestData = {'salesOrders': requestData};
						// ADD CMARGALLO 11/3 START
						if (requestData) {
							// ADD CMARGALLO 11/3 END
							requestData = {'salesOrders': requestData};

							log.audit(logTitle, '** REQUEST: location:' + locationId);
							log.audit(logTitle, '** REQUEST: url:' + url);
							log.audit(logTitle, '** REQUEST: Data:' + JSON.stringify(requestData));

							var response = Helper.sendToWMS(JSON.stringify(requestData), url);
							log.audit(logTitle, '** RESPONSE: ' + JSON.stringify(response));

							arrSendtoWMS[locationId].response = response;
						}
					}
					///////////////

					for (ii=0, jj=arrOrdersToProcess.length; ii<jj;ii++)
					{
						logTitle = [LogTitleMain, 'UpdateSO', ii, arrOrdersToProcess.length].join(':');

						// load the sales order
						var recObj = Helper.loadRecord({type:'salesorder', id:arrOrdersToProcess[ii]});
						if (! recObj) continue;

						var stBatchId = recObj.getValue({fieldId:'custbody_sears_webrequest_batch'});
						if (!NSUtil.isEmpty(stBatchId) && !NSUtil.inArray(stBatchId, arrPendingBatches) )
						{
							arrPendingBatches.push(stBatchId);
						}

						var arrLocationLines = Helper.extractValidLines(recObj);

						var numLines = recObj.getLineCount({
						 	sublistId: 'item'
						});
						for (var i=0; i < numLines; i++) {
							var itemType = recObj.getSublistValue({
								sublistId : 'item',
								fieldId : 'itemtype',
								line : i,
							 });
							 var amount = recObj.getSublistValue({
								sublistId : 'item',
								fieldId : 'amount',
								line : i,
							 });
							 log.debug("response", "Item Type:"+itemType);
							if (itemType == 'Discount') {
								recObj.setSublistValue({
									sublistId : 'item',
									fieldId : 'costestimatetype',
									line : i,
							 		value: null
								});
							 	recObj.setSublistValue({
							 		sublistId : 'item',
							 		fieldId : 'amount',
							 		line : i,
							 		value: amount
							 	});
							 	log.debug("response", "Im a discount");
							 }
						}

						for (var locationId in arrLocationLines)
						{
							if( !NSUtil.isEmpty(arrSendtoWMS[locationId]) ){
								var locationResponse = arrSendtoWMS[locationId].response;
								var arrLines = arrLocationLines[locationId];
								log.debug( 'Looping' , locationId)
								log.debug(logTitle, '.. lines/response: ' + JSON.stringify([arrLines, locationResponse]));

								arrLines.forEach(function(line)
								{
									// first clear all //
									recObj.setSublistValue({sublistId : 'item',fieldId : 'custcol_sent_to_apigee',value: false ,line : line});
									recObj.setSublistValue({sublistId : 'item',fieldId : 'custcol_wms_sending_errormsg',value: '',line : line});
									recObj.setSublistValue({sublistId : 'item',fieldId : 'custcol_wms_error_sending_chk',value: false,line : line});
									recObj.setSublistValue({sublistId : 'item',fieldId : 'custcol_sent_to_wms_timestamp',value: null,line : line});
									recObj.setSublistValue({sublistId : 'item',fieldId : 'custcol_wms_sending_seconds',value: null,line : line});
									var apigeeResponse = locationResponse.RESPONSE;
									var failOrdersResponseArray = null;
									var apigeeResponseCode = null;
									if(!NSUtil.isEmpty(apigeeResponse)){
										apigeeResponse = JSON.parse(apigeeResponse);
										failOrdersResponseArray= apigeeResponse.orders;
										apigeeResponseCode = apigeeResponse.code;

									}

									if (locationResponse.CODE == '200' && apigeeResponseCode=='200')
									{
										recObj.setSublistValue({sublistId : 'item',fieldId : 'custcol_sent_to_apigee',value: true,line : line});
										recObj.setSublistValue({sublistId : 'item',fieldId : 'custcol_sent_to_wms_timestamp',value: locationResponse.TIME_END,line : line});
										recObj.setSublistValue({sublistId : 'item',fieldId : 'custcol_wms_sending_seconds',value: locationResponse.DELTA_TIME,line : line});
									}
									else
									{
										if( NSUtil.isEmpty(failOrdersResponseArray)){
											recObj.setSublistValue({sublistId : 'item',fieldId : 'custcol_wms_sending_errormsg',value: [locationResponse.ERROR_CODE, locationResponse.ERROR_MSG].join(':') ,line : line});
											recObj.setSublistValue({sublistId : 'item',fieldId : 'custcol_wms_error_sending_chk',value: true,line : line});
											recObj.setSublistValue({sublistId : 'item',fieldId : 'custcol_sent_to_wms_timestamp',value: locationResponse.TIME_END,line : line});
											recObj.setSublistValue({sublistId : 'item',fieldId : 'custcol_wms_sending_seconds',value: locationResponse.DELTA_TIME,line : line});
										}else{
											var lineLocationText 	= recObj.getSublistText({sublistId : 'item',fieldId : 'location',line : line});
											var lineNum          	= recObj.getSublistValue({sublistId : 'item',fieldId : 'custcol_line_id',line : line});
											var orderExternalID = recObj.getValue({fieldId : 'externalid'});
											var matchFound = false;
											failOrdersResponseArray.forEach(function(arrayObj){
												// var arrayObj = failOrdersResponseArray[arrLine];
												log.audit(logTitle, '** Checking:'+ JSON.stringify(arrayObj) );
												log.audit(logTitle, '** Checking:'+ arrayObj );
												//log.debug( 'failOrdersResponseArray[arrLine][orderExternalID]' ,arrayObj[orderExternalID])
												var matchOrderExternalID = arrayObj[orderExternalID];
												if(!NSUtil.isEmpty(matchOrderExternalID)){
													if(lineLocationText==matchOrderExternalID.location){
														if (matchOrderExternalID.linenums.indexOf(lineNum) != -1) {
															recObj.setSublistValue({sublistId : 'item',fieldId : 'custcol_wms_sending_errormsg',value: [apigeeResponseCode, matchOrderExternalID.message].join(':') ,line : line});
															recObj.setSublistValue({sublistId : 'item',fieldId : 'custcol_wms_error_sending_chk',value: true,line : line});
															recObj.setSublistValue({sublistId : 'item',fieldId : 'custcol_sent_to_wms_timestamp',value: locationResponse.TIME_END,line : line});
															recObj.setSublistValue({sublistId : 'item',fieldId : 'custcol_wms_sending_seconds',value: locationResponse.DELTA_TIME,line : line});
															matchFound =true;
														}
													}
												}

											});
											if(matchFound==false){
												recObj.setSublistValue({sublistId : 'item',fieldId : 'custcol_sent_to_apigee',value: true,line : line});
												recObj.setSublistValue({sublistId : 'item',fieldId : 'custcol_sent_to_wms_timestamp',value: locationResponse.TIME_END,line : line});
												recObj.setSublistValue({sublistId : 'item',fieldId : 'custcol_wms_sending_seconds',value: locationResponse.DELTA_TIME,line : line});
											}
										}
									}
								});
							}
						}

						try {
							var id = recObj.save();
							log.debug(logTitle,'## Update Sales Order ID: ' + id);
						}
						catch(err)
						{
							log.error(logTitle, '**' + err.toString());
						}
					}
				}

				log.audit(logTitle,'## Batches to update: ' + JSON.stringify(arrPendingBatches) );
				if (arrPendingBatches && arrPendingBatches.length)
				{
					arrPendingBatches.forEach(function(batchId){
						LibJsonRequest.validateBatchStatus(batchId);
					});
				}

				if (PARAM.batchId)
				{
					// get a new pending batches
					var arrQueuedBatches = Helper.getQueuedBatches(100);
					log.audit(logTitle,'## Queued Batches: ' + JSON.stringify(arrQueuedBatches));
					if (arrQueuedBatches && arrQueuedBatches.length)
					{
						arrQueuedBatches.forEach(function(batchId){
							NS_Record.submitFields({
								type : 'customrecord_sears_webrequest_batch',
								id : batchId,
								values :{ custrecord_batchwebreq_status : 'PENDING-APIGEE', custrecord_batchwebreq_hashvalue : null}
							});
						});
					}
				}
			}
			catch(error)
			{
				log.error('ERROR', error.toString());
				throw error.toString();
			}
			finally
			{
				var duration = (new Date()).getTime() - startTime;
				var remainingUsage = scriptObj.getRemainingUsage();

				log.audit('END SCRIPT', '## END SCRIPT ## :' + JSON.stringify({runtime: duration, usage: [remainingUsage,startUsage]}) );
			}
			return true;
		};

		/**
		 * @memberOf Helper
		 */
		Helper.sendToWMS = function(stRequest, stURL)
		{
			var logTitle = 'Helper.sendToWMS';

			var returnResult = {
				SENT_TO_WMS: false,
				CODE: null,

				ERROR_CODE: null,
				ERROR_RAWMSG: null,
				ERROR_MSG: null,

				SENT_TO_WMS_TIME: null,
				TIME_START: (new Date()),
				TIME_END: null,
				DELTA_TIME: null,

				RESPONSE: null,
				REQUEST: null
			};

			try
			{
				if (! stRequest ) throw "Empty request data";

				var stTokenAuthSettings = NS_Runtime.getCurrentScript().getParameter({name:'custscript_ss2_param_token_settings'});
				stTokenAuthSettings = stTokenAuthSettings.replace(/\"\"/g, '"');
				stTokenAuthSettings = stTokenAuthSettings.replace(/\"\{/g, '{');
				stTokenAuthSettings = stTokenAuthSettings.replace(/\}\"/g, '}');
				var arrTokenAuth = JSON.parse(stTokenAuthSettings);
				//log.debug(logTitle, '>>arrTokenAuth: ' + JSON.stringify(arrTokenAuth));
				if (!arrTokenAuth)
				{
					returnResult.ERROR_CODE = 'E110';
					returnResult.ERROR_RAWMSG = 'Invalid token settings';
					returnResult.ERROR_MSG = 'Invalid token settings';
					throw 'Invalid Token Settings!';
				}

				//user objToken
				var objToken = {
					public: arrTokenAuth.TOKEN_KEY,
					secret: arrTokenAuth.TOKEN_SECRET
				};

				//app credentials
				var objOauth = NSAuth.authenticate({
					consumer :
					{
						public : arrTokenAuth.CONSUMER_KEY,
						secret : arrTokenAuth.CONSUMER_SECRET
					},
					signature_method : 'HMAC-SHA1'
				});
				//log.debug(logTitle, '>> nsauth: ' + JSON.stringify([objToken, objOauth]));

				var objRequestData = {url: stURL,method: 'POST',data: {} };

				var objOauth_data = {
					objOauth_consumer_key: objOauth.consumer.public,
					objOauth_nonce: objOauth.getNonce(),
					objOauth_signature_method: objOauth.signature_method,
					objOauth_timestamp: objOauth.getTimeStamp(),
					objOauth_version: '1.0',
					objOauth_token: objToken.public
				};

				var objHeaderWithRealm = objOauth.toHeader(objOauth.authorize(objRequestData, objToken));
				objHeaderWithRealm.Authorization += ',realm= " " ';

				//HTTP headers
				var objHeaders = new Array();
				objHeaders['Content-Type'] = 'application/json';
				objHeaders['Authorization'] = objHeaderWithRealm.Authorization;

				var objResponse = null;

				try
				{
					log.audit('### sendObjToURL: Request', '### PAYLOAD Size: ' + stRequest.length + ' chars  ###');
					returnResult.TIME_START  = new Date();

					objResponse = NS_Http.request({
						method: 'POST',
						url: stURL,
						body: stRequest,
						headers: objHeaders
					});
					returnResult.TIME_END = new Date();
					returnResult.DELTA_TIME = returnResult.TIME_END - returnResult.TIME_START;

					if (objResponse)
					{
						returnResult.SENT_TO_WMS = true;
						returnResult.CODE = objResponse.code;
						returnResult.RESPONSE =  objResponse.body;

						if ( objResponse.code != 200)
						{
							returnResult.ERROR_CODE = objResponse.code;
							returnResult.ERROR_MSG = HTTP_ERROR_CODES[objResponse.code] || objResponse.body;
						}
					}
				}
				catch (wmserr)
				{
					log.error(logTitle, wmserr.toString() );

					returnResult.CODE          = returnResult.CODE || 'E120';
					returnResult.ERROR_CODE    = returnResult.ERROR_CODE || 'E120';
					returnResult.ERROR_RAWMSG  = returnResult.ERROR_RAWMSG || JSON.stringify(wmserr);
					returnResult.ERROR_MSG     = returnResult.ERROR_MSG || wmserr.toString();
				}
			}
			catch(error)
			{
				log.error(logTitle, error.toString() );

				returnResult.CODE          = returnResult.CODE || 'E120';
				returnResult.ERROR_CODE    = returnResult.ERROR_CODE || 'E120';
				returnResult.ERROR_RAWMSG  = returnResult.ERROR_RAWMSG || JSON.stringify(error);
				returnResult.ERROR_MSG     = returnResult.ERROR_MSG || error.toString();
			}

			log.audit(logTitle, JSON.stringify(returnResult));
			return returnResult;
		};


		/**
		 * @memberOf Helper
		 */
		Helper.extractRecordData = function (recObj)
		{
			if (! recObj) return false;

			var objRecordData = {};

			var arrListFieldsToSync = [
				'internalid', 'externalid', 'entity','tranid', 'otherrefnum', 'location', 'trandate','shipmethod', 'source',
				'billaddressee', 'billaddr1', 'billaddr2', 'billcity', 'billstate', 'billzip','billcountry', 'billphone',
				'shipaddressee', 'shipaddr1', 'shipaddr2', 'shipcity', 'shipstate', 'shipzip', 'shipcountry', 'shipphone',
				'custbody_phone_shipping','custbody_phone_billing','custbody_phone_wms','custbody_gift_message',
				'custbody_loyalty_number','custbody_email','custbody_email_opt_in','custbody_ship_to_store','email',
				'otherrefnum'
				//'shipdate', 'custbody_ship_date',
			];

			var arrTextFields = ['location','entity','shipmethod'];

			var objBillAddrFields =
			{
				'billaddressee' : 'addressee',
				'billaddr1' : 'addr1',
				'billaddr2' : 'addr2',
				'billcity' : 'city',
				'billstate' : 'state',
				'billzip' : 'zip',
				'billcountry' : 'country',
				'billphone' : 'phone',
			};

			var objShipAddrFields =
			{
				'shipaddressee' : 'addressee',
				'shipaddr1' : 'addr1',
				'shipaddr2' : 'addr2',
				'shipcity' : 'city',
				'shipstate' : 'state',
				'shipzip' : 'zip',
				'shipcountry' : 'country',
				'shipphone' : 'phone'
			};

			arrListFieldsToSync.forEach(function(fieldId){
				var objFieldValue = null;

				if (fieldId == 'internalid')
				{
					objFieldValue = recObj.id;
				}
				else if (fieldId.match(/phone/i))
				{
					objFieldValue = recObj.getValue({fieldId : fieldId});
					if (objFieldValue)
					{
						objFieldValue = objFieldValue.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3');
					}
				}
				else if (objBillAddrFields[fieldId] || objShipAddrFields[fieldId])
				{
					var addressId = null, addressField = null;

					if (objBillAddrFields[fieldId])
					{
						addressId = recObj.getValue({fieldId : 'billingaddress'});
						addressField = objBillAddrFields[fieldId];
					}
					else if (objShipAddrFields[fieldId])
					{
						addressId = recObj.getValue({fieldId : 'shippingaddress'});
						addressField = objShipAddrFields[fieldId];
					}
					if (addressId)
					{
						var cacheKey = ['address', addressId].join('::');
						if (CACHE[cacheKey] == null)
						{
							CACHE[cacheKey] = Helper.loadRecord({type:'address',id:addressId});
						}
						if (CACHE[cacheKey])
						{
							objFieldValue = CACHE[cacheKey].getValue({fieldId:addressField});
						}
					}
				}

				if (!objFieldValue)
				{
					if (NSUtil.inArray(fieldId,arrTextFields) )
					{
						objFieldValue = recObj.getText({fieldId : fieldId});
					}
					else
					{
						objFieldValue = recObj.getValue({fieldId : fieldId});
					}
				}

				objRecordData[fieldId] = objFieldValue;
			});

			return objRecordData;
		};

		/**
		 * @memberOf Helper
		 */
		Helper.extractValidLines = function (recObj)
		{
			var arrLines = {};
			var lineCount = recObj.getLineCount({sublistId : 'item'});

			for (var line = 0; line <= lineCount; line ++)
			{
				var isProcessed = recObj.getSublistValue({sublistId : 'item', fieldId : 'custcol_sent_to_apigee',line : line});
				var isBigTicket = recObj.getSublistValue({sublistId : 'item',fieldId : 'custcol_bigticket',line : line});

				if (isProcessed || isBigTicket) continue;

				var lineItemType 		= recObj.getSublistValue({sublistId : 'item',fieldId : 'itemtype',line : line});
				var lineItem			= recObj.getSublistValue({sublistId : 'item',fieldId : 'item',line : line});
				var lineIsFulfillable 	= recObj.getSublistValue({sublistId : 'item',fieldId : 'custcol_isfulfillable',line : line});
				var lineLocation 		= recObj.getSublistValue({sublistId : 'item',fieldId : 'location',line : line});
				var lineLocationText 	= recObj.getSublistValue({sublistId : 'item',fieldId : 'location_display',line : line});

				if (lineItemType == 'InvtPart' || (lineItemType == 'Service' && lineIsFulfillable))
				{
					if (!arrLines[lineLocation] ) arrLines[lineLocation] = [];
					arrLines[lineLocation].push(line);
				}
			}

			return arrLines;
		};


		/**
		 * @memberOf Helper
		 */
		Helper.extractLineData = function (recObj)
		{
			if (! recObj) return false;

			var objLineData = {};

			var arrListLineitemFieldsToSync = [
				'custcol_searsitemname','item', 'itemid','externalid', 'item_display', 'displayname',
				'description', 'custcol_isgiftcard','custcolfrench_item_desc','rate', 'quantity', 'amount','custcol_line_id','location','location_display','custcol_messagetothereceiver',
				'custcol_va001_gift_box', 'custcol_va002_gift_wrap','custcol_va003_gift_card', 'custcol_va004_monogrmming',
				'custcol_va005_dryer_hookup_top_fr_ld','custcol_va005_dryer_hookup_top_fr_ld',
				'custcol_va007_fridge_door_swing_chang','custcol_va008_front_load_washer_hooku',
				'custcol_va009_home_delivery_service','custcol_va010_home_deli_service_weeke',
				'custcol_va011_mattress_pickup','custcol_va012_pedestal_install_per_pa',
				'custcol_va013_time_spec_within_del_wi','custcol_va014_take_away_scrap_applian',
				'custcol_va016_top_load_washer_hookup','custcol_va017_tractor_snowblower_asse',
				'cust_name','custcol_ship_date',
				'custcol_va018_stacking_kit_install','custcol_va019_store_stock_delivery', 'custcol_externalid' ];

			var arrListItemFieldsToSync = ['externalid'];

			var lineCount = recObj.getLineCount({sublistId : 'item'});

			for (var line = 0; line < lineCount; line ++)
			{
				var lineData = {};
				var isProcessed = recObj.getSublistValue({sublistId : 'item', fieldId : 'custcol_sent_to_apigee',line : line});
				var isBigTicket = recObj.getSublistValue({sublistId : 'item',fieldId : 'custcol_bigticket',line : line});

				lineData.line = line;

				if (isProcessed || isBigTicket) continue;

				var lineItemType 		= recObj.getSublistValue({sublistId : 'item',fieldId : 'itemtype',line : line});
				var lineItem			= recObj.getSublistValue({sublistId : 'item',fieldId : 'item',line : line});
				var lineIsFulfillable 	= recObj.getSublistValue({sublistId : 'item',fieldId : 'custcol_isfulfillable',line : line});
				var lineLocation 		= recObj.getSublistValue({sublistId : 'item',fieldId : 'location',line : line});
				var lineLocationText 	= recObj.getSublistText({sublistId : 'item',fieldId : 'location',line : line});
				var lineItemExternalId 	= recObj.getSublistValue({sublistId : 'item',fieldId : 'custcol_externalid',line : line});
				var lineLocationAutoAssigned 	= recObj.getSublistValue({sublistId : 'item',fieldId : 'locationautoassigned',line : line});
				var lineLocationDoNotAutoAssigned 	= recObj.getSublistValue({sublistId : 'item',fieldId : 'noautoassignlocation',line : line});
				var lineQuantityBackOrderd 	= recObj.getSublistValue({sublistId : 'item',fieldId : 'quantitybackordered',line : line});
				try {
					log.debug('Expression '+lineItemType , ! (lineItemType == 'InvtPart' || (lineItemType == 'Service' && lineIsFulfillable)) );
					log.debug('NSUtil.isEmpty(lineLocation)'+lineLocation, NSUtil.isEmpty(lineLocation));
					log.debug(' NSUtil.isEmpty(lineItemExternalId'+lineItemExternalId,  NSUtil.isEmpty(lineItemExternalId) );
					log.debug('NSUtil.forceFloat(lineQuantityBackOrderd)>0'+lineQuantityBackOrderd, NSUtil.forceFloat(lineQuantityBackOrderd)>0);
					log.debug('lineLocationAutoAssigned=="F"'+lineLocationAutoAssigned, lineLocationAutoAssigned=='F');
					log.debug('lineLocationDoNotAutoAssigned=="F"'+lineLocationDoNotAutoAssigned, lineLocationDoNotAutoAssigned=='F');
				} catch (err) {
					log.debug('ERROR:',err.toString());
				}

				if(! (lineItemType == 'InvtPart' || (lineItemType == 'Service' && lineIsFulfillable)) ||   NSUtil.isEmpty(lineLocation) ||   NSUtil.isEmpty(lineItemExternalId) || (lineLocationAutoAssigned==false && lineLocationDoNotAutoAssigned==false) || NSUtil.forceFloat(lineQuantityBackOrderd)>0 )
				{
					log.debug('Skipping Line', line);

					log.debug('Expression '+lineItemType , ! (lineItemType == 'InvtPart' || (lineItemType == 'Service' && lineIsFulfillable)) );
					log.debug('NSUtil.isEmpty(lineLocation)'+lineLocation, NSUtil.isEmpty(lineLocation));
					log.debug(' NSUtil.isEmpty(lineItemExternalId'+lineItemExternalId,  NSUtil.isEmpty(lineItemExternalId) );
					log.debug('NSUtil.forceFloat(lineQuantityBackOrderd)>0'+lineQuantityBackOrderd, NSUtil.forceFloat(lineQuantityBackOrderd)>0);
					log.debug('lineLocationAutoAssigned=="F"'+lineLocationAutoAssigned, lineLocationAutoAssigned=='F');

					continue;
				}
				var locale = recObj.getText({fieldId:'custbody_locale'});
				arrListLineitemFieldsToSync.forEach(function(lineField) {
					var lineValue = recObj.getSublistValue({sublistId : 'item',fieldId : lineField,line : line});
					if (lineValue)
					{
						if (lineField == 'custcol_searsitemname' && (locale == 'en_CA' || locale == ''))
						{
							lineData['item'] = lineValue;
							log.debug('englishlocale', lineValue);
						}
						else if (lineField == 'custcolfrench_item_desc' && locale == 'fr_CA')
						{
							lineData['item'] = lineValue;
							log.debug('frenchlocale', lineValue);
						}
						else if (lineField == 'itemid')
						{
							lineData['item_itemid'] = lineValue;
						}
						else if (lineField == 'item')
						{
							lineData['iteminternalid'] = lineValue;
						}
						else
						{
							lineData[lineField] = lineValue;
						}
					}
				});

				var cacheKey = ['itemdata', lineItem].join(':');
				if (CACHE[cacheKey] == null )
				{
					CACHE[cacheKey] = NS_Search.lookupFields({type:'item',id:lineItem, columns:arrListItemFieldsToSync});
				}
				var lineItemData = CACHE[cacheKey];
				log.debug('lookupItems', JSON.stringify(lineItemData));
				arrListItemFieldsToSync.forEach(function(itemField){
					var itemValue =lineItemData[itemField];
					log.debug('lookupItems-itemValue', JSON.stringify([itemField, itemValue]));
					if (itemField == 'externalid')
					{
						lineData['itemid'] = itemValue[0].value || itemValue.value || itemValue;
					}
					else
					{
						lineData[itemField] = itemValue;
					}

					return true;
				});
				lineData['location_display'] = lineLocationText;

				if (! objLineData[lineLocation] ) objLineData[lineLocation] = {name:lineLocationText, lines:[]};
				objLineData[lineLocation].lines.push(lineData);
			}

			return objLineData;
		};


		/**
		 * @memberOf Helper
		 */
		Helper.loadRecord = function (option)
		{
			var logTitle = 'Helper.loadRecord';
			var cacheKey = ['Helper.loadRecord', option.type, option.id].join(':');

			log.debug(logTitle, '>>' + JSON.stringify([option, cacheKey]) );
			if (CACHE[cacheKey] == null )
			{
				CACHE[cacheKey] = NS_Record.load(option);
				if (!CACHE[cacheKey])
				{
					CACHE[cacheKey] = false;
				}
			}

			return CACHE[cacheKey];
		};


		/**
		 * get the script parameters
		 *
		 * @param {Object} context
		 * @memberOf Helper
		 */
		Helper.getScriptParameters = function ()
		{
			var logTitle = 'Helper.getScriptParameters';
			var paramFlds = {
				searchId: 'custscript_ss2_sendso_savedsearch2',
				searchIdPending: 'custscript_ss2_sendso_queuedbatches',
				batchId: 'custscript_ss2_sendso_batchid',
				urlLogfire: 'custscript_ss2_sendso_bigurl',
				urlSCI: 'custscript_ss2_sendso_regurl',
				locationSCI : 'custscript_ss2_sendso_sci_location',
				shipDateAdj: 'custscript_big_item_shipping_date'
			};
			log.debug(logTitle, '>> paramFlds:  ' + JSON.stringify(paramFlds));

			for (var fld in paramFlds)
			{
				PARAM[fld] = NS_Runtime.getCurrentScript().getParameter(paramFlds[fld]);
			}
			if (PARAM.shipDateAdj)
			{
				PARAM.shipDateAdj = NSUtil.forceInt(PARAM.shipDateAdj);
			}
			log.debug(logTitle, '>> values:  ' + JSON.stringify(PARAM));

			return true;
		};

		/**
		 * @memberOf Helper
		 */
		Helper.getPendingOrders = function (searchId, maxResults)
		{
			var logTitle = 'Helper.getPendingOrders';
			var arrReturnVar = [];
			var arrSearchResults = NSUtil.searchAll({id:searchId, maxResults: maxResults});

			if (arrSearchResults && arrSearchResults.length)
			{
				for (var i=0; i<arrSearchResults.length; i++)
				{
					var internalId = arrSearchResults[i].getValue({name:'internalid', summary:'GROUP'});
					if (! NSUtil.inArray(internalId, arrReturnVar))
					{
						arrReturnVar.push(internalId);
					}
				}
			}

			log.debug(logTitle, '>> values: ' + JSON.stringify(arrReturnVar) );

			return arrReturnVar;
		}

		/**
		 * @memberOf Helper
		 */
		Helper.getNextBatchIds = function (searchId, maxResult)
		{
			var logTitle = 'Helper.getNextBatchIds';

			var arrReturnVar = [];
			var arrSearchResults = NSUtil.searchAll({
				id: searchId,
				columns: [ NS_Search.createColumn({name:'custbody_sears_webrequest_batch', summary:NS_Search.Summary.GROUP}) ],
				maxResults: maxResult
			});

			if (arrSearchResults && arrSearchResults.length)
			{
				for (var i=0; i<arrSearchResults.length; i++)
				{
					var internalId = arrSearchResults[i].getValue({name:'custbody_sears_webrequest_batch', summary:NS_Search.Summary.GROUP});
					if (! NSUtil.inArray(internalId, arrReturnVar) && ! NSUtil.isEmpty(internalId))
					{
						arrReturnVar.push(internalId);
					}
				}
			}

			log.debug(logTitle, '>> values: ' + JSON.stringify(arrReturnVar) );
			return arrReturnVar;
		};



		/**
		 * @memberOf Helper
		 */
		Helper.getQueuedBatches = function (maxResults)
		{
			var logTitle = 'Helper.getPendingBatches';
			var searchId = PARAM.searchIdPending;
			log.debug(logTitle, 'Search ID: ' + searchId);

			if (NSUtil.isEmpty(searchId)) return false;

			var arrReturnVar = [];
			var arrSearchResults = NSUtil.searchAll({id: searchId, maxResults: maxResults});

			log.debug(logTitle, '...search results: ' + arrSearchResults.length);

			if (!NSUtil.isEmpty(arrSearchResults))
			{
				arrSearchResults.forEach(function(rowResult){
					var batchId = rowResult.id;//getValue({name:'internalid'});

					if (!NSUtil.inArray(batchId, arrReturnVar) )
					{
						arrReturnVar.push(batchId);
					}
				})
			}

			log.debug(logTitle, '...return value: ' + JSON.stringify(arrReturnVar) );

			return arrReturnVar;
		};

		return EndPoint;
	});
