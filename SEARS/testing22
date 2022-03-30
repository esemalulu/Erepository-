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
 */

/**
 * @NApiVersion 2.x
 * @NModuleScope Public
 * @NScriptType ScheduledScript
 */

//define(['./LibJsonRequest', 'N/record', 'N/search', 'N/runtime', './NSUtil','N/http', 'N/error', 'N/format', './oauthv2','N/task'],
define(['N/record', 'N/search', 'N/runtime', 'N/http', './NSUtil', './oauthv2','./LibJsonRequest'],
function(NS_Record, NS_Search, NS_Runtime, NS_Http, NSUtil, NSAuth, LibJsonRequest)
{
	var USAGE_THRESHOLD  = 4000;
	var ITEMCOUNT_THRESHOLD = 100;
	var REQSIZE_THRESHOLD = 5000000; //approx 1MB
	var MAXRESULTS = 50;
	var DEPLOYMENTID = '';
	
	var LogTitleMain = ['SendReturnstoWMS'];
	
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
			//regina - 11/17
            var arrPendingBatchesToProcess = [];
			
			if ( PARAM.batchId )
			{
				// generate a hash value
				PARAM.hashValue = (new Date()).getTime().toString();
				log.debug(logTitle, '.. hash value: ' + PARAM.hashValue);
				
				// get the next batch id one by one //
				arrPendingBatchesToProcess = Helper.getNextBatchIds(PARAM.searchId, MAXRESULTS);
				arrPendingBatchesToProcess.forEach(function(batchId){
					
					//regina - 11/17 - try catch to be sure the status hasn't been changed by another deployment. trigger xedit of beforesubmit script
					try
					{
						NS_Record.submitFields({
							type : 'customrecord_sears_webrequest_batch',
							id : batchId,
							values :{ custrecord_batchwebreq_status : 'INPROCESS-APIGEE',
									  custrecord_batchwebreq_hashvalue : PARAM.hashValue
									}
						});
				
						arrPendingBatches.push(rowData.id);
					}
					catch(errorSave)
					{
						var stMsg = (errorSave.message != undefined) ? errorSave.name + ' ' + errorSave.message : errorSave.toString();
						log.debug(logTitle, '--Error flaging to INPROCESS-APIGEE batch id = '+batchId + ',msg = ' + stMsg);
					}
				});
				log.debug(logTitle, '.. arrPendingBatches: ' + JSON.stringify(arrPendingBatches));
				
				var arrPendingOrders = NSUtil.searchAll({
					recordType: 'transaction',
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
			}
			else
			{
				arrOrdersToProcess = Helper.getPendingOrders(PARAM.searchId);
			}
			
			log.debug(logTitle, '.. arrOrdersToProcess: ' + JSON.stringify(arrOrdersToProcess));
			
			var arrSendtoWMS = {};
			for (var ii=0, jj=arrOrdersToProcess.length; ii<jj;ii++)
			{
				// load the sales order
				 var recObj = Helper.loadRecord({type:'returnauthorization', id:arrOrdersToProcess[ii]});
				if (! recObj) continue;
				
				var arrHeaderData = Helper.extractRecordData(recObj);
				var arrLineData = Helper.extractLineData(recObj);
				
				log.debug(logTitle, '... header Data: ' + JSON.stringify(arrHeaderData));
				log.debug(logTitle, '... line Data: ' + JSON.stringify(arrLineData));
				
				for (var lineKey in arrLineData)
				{
					var locationData = arrLineData[lineKey];
					if (! arrSendtoWMS[lineKey])
					{
						arrSendtoWMS[lineKey] = {list:[], url:locationData.url};
					}
					
					var orderData = JSON.parse( JSON.stringify(arrHeaderData) );
					orderData.location = locationData.name;
					if ( locationData.bigTicket )
					{
						orderData.bigticket = 'Y';
					}
					orderData.items = locationData.lines;
					arrSendtoWMS[lineKey].list.push(orderData);
				}
			}
			
			log.debug(logTitle, '.. arrSendtoWMS: ' + JSON.stringify(arrSendtoWMS));
			
			////////////////
			for (var locationId in arrSendtoWMS)
			{
				var url = arrSendtoWMS[locationId].url;//(PARAM.locationSCI == locationId)  ? PARAM.urlSCI : PARAM.urlLogfire;
				var requestData = {'returnAuthorizations': arrSendtoWMS[locationId].list};
				
				log.debug(logTitle, '>>.. location:' + locationId);
				log.debug(logTitle, '>>.. url:' + url);
				log.debug(logTitle, '>>.. requestData:' + JSON.stringify(requestData));
				
				var response = Helper.sendToWMS(JSON.stringify(requestData), url);
				log.debug(logTitle, '.. response: ' + JSON.stringify(response));
				
				arrSendtoWMS[locationId].response = response;
			}
			///////////////
			
			for (ii=0, jj=arrOrdersToProcess.length; ii<jj;ii++)
			{
				logTitle = [LogTitleMain, 'UpdateRA', ii, arrOrdersToProcess.length].join(':');
				
				// load the sales order
				var recObj = Helper.loadRecord({type:'returnauthorization', id:arrOrdersToProcess[ii]});
				if (! recObj) continue;
				
				var arrLocationLines = Helper.extractValidLines(recObj);
				
				for (var locationId in arrLocationLines)
				{
					var locationResponse = arrSendtoWMS[locationId].response; 
					var arrLines = arrLocationLines[locationId];
					
					log.debug(logTitle, '.. lines/response: ' + JSON.stringify([arrLines, locationResponse]));
					
					arrLines.forEach(function(line)
					{
						// first clear all //
						recObj.setSublistValue({sublistId : 'item',fieldId : 'custcol_sent_to_apigee',value: false ,line : line});
						recObj.setSublistValue({sublistId : 'item',fieldId : 'custcol_wms_sending_errormsg',value: '',line : line});
						recObj.setSublistValue({sublistId : 'item',fieldId : 'custcol_wms_error_sending_chk',value: false,line : line});                             
						recObj.setSublistValue({sublistId : 'item',fieldId : 'custcol_sent_to_wms_timestamp',value: null,line : line});
						recObj.setSublistValue({sublistId : 'item',fieldId : 'custcol_wms_sending_seconds',value: null,line : line});
						
						if (locationResponse.CODE == '200')
						{
							recObj.setSublistValue({sublistId : 'item',fieldId : 'custcol_sent_to_apigee',value: true,line : line});
							recObj.setSublistValue({sublistId : 'item',fieldId : 'custcol_sent_to_wms_timestamp',value: locationResponse.TIME_END,line : line});
							recObj.setSublistValue({sublistId : 'item',fieldId : 'custcol_wms_sending_seconds',value: locationResponse.DELTA_TIME,line : line});
						}
						else
						{
							recObj.setSublistValue({sublistId : 'item',fieldId : 'custcol_wms_sending_errormsg',value: locationResponse.ERROR_MSG,line : line});
							recObj.setSublistValue({sublistId : 'item',fieldId : 'custcol_wms_error_sending_chk',value: true,line : line});                             
							recObj.setSublistValue({sublistId : 'item',fieldId : 'custcol_sent_to_wms_timestamp',value: locationResponse.TIME_END,line : line});
							recObj.setSublistValue({sublistId : 'item',fieldId : 'custcol_wms_sending_seconds',value: locationResponse.DELTA_TIME,line : line});
						}
					});
				}
				
				try {
			         var id = recObj.save();
			         log.audit(logTitle,'## Update Returns ID: ' + id);
				}
				catch(err)
				{
					log.error(logTitle, '**' + err.toString());
				}
			}
			
			if (arrPendingBatches && arrPendingBatches.length)
			{
				arrPendingBatches.forEach(function(batchId){
					LibJsonRequest.validateBatchStatus(batchId);	
				});
				
				arrPendingBatches = Helper.getNextBatchIds(PARAM.searchId, MAXRESULTS);
				arrPendingBatches.forEach(function(batchId){
	                NS_Record.submitFields({
	                    type : 'customrecord_sears_webrequest_batch',
	                    id : batchId,
	                    values :{ custrecord_batchwebreq_status : 'PENDING-APIGEE', custrecord_batchwebreq_hashvalue : ''}
	                });
				});
				
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
			log.debug('END SCRIPT', '## END SCRIPT ## :' + duration);
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
	    	
			/*
			var stTokenAuthSettings = NS_Runtime.getCurrentScript().getParameter({name:'custscript_ss2_param_token_settings'});
			stTokenAuthSettings = stTokenAuthSettings.replace(/\"\"/g, '"');
			stTokenAuthSettings = stTokenAuthSettings.replace(/\"\{/g, '{');
			stTokenAuthSettings = stTokenAuthSettings.replace(/\}\"/g, '}');
			var arrTokenAuth = JSON.parse(stTokenAuthSettings);
			*/
			//regina - 11/15 - use customrecord for credentials
			var arrTokenAuth = LibJsonRequest.getCredentialConfig('sendToWMS');
			
			log.debug(logTitle, '>>arrTokenAuth: ' + JSON.stringify(arrTokenAuth));
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
			log.debug(logTitle, '>> nsauth: ' + JSON.stringify([objToken, objOauth]));
			
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
//	            returnResult.REQUEST  = stRequest;
	            
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
			'custbody_loyalty_number','custbody_email','custbody_email_opt_in','custbody_ship_to_store','email','shipdate', 
			'otherrefnum'
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
		
		try
		{
			var resultSourceOrder = NS_Search.lookupFields({id:recObj.id, type:'returnauthorization', columns:['createdfrom','createdfrom.type','createdfrom.externalid']});
			log.debug('Helper.extractRecordData', '## source order (lookup): '  + JSON.stringify(resultSourceOrder));
			
			var sourceOrder = {};
			sourceOrder.id = resultSourceOrder['createdfrom'][0].value;
			sourceOrder.type = resultSourceOrder['createdfrom.type'][0].value;
			log.debug('Helper.extractRecordData', '## source order: '  + JSON.stringify(sourceOrder));

			if (sourceOrder.type != 'SalesOrd')
			{
				resultSourceOrder = NS_Search.lookupFields({id:sourceOrder.id, type:sourceOrder.type, columns:['createdfrom','createdfrom.type','createdfrom.externalid']});
				log.debug('Helper.extractRecordData', '## source order (lookup): '  + JSON.stringify(resultSourceOrder));
				
				sourceOrder.id = resultSourceOrder['createdfrom'][0].value;
				sourceOrder.type = resultSourceOrder['createdfrom.type'][0].value;
				log.debug('Helper.extractRecordData', '## source order: '  + JSON.stringify(sourceOrder));
			}
			
			objRecordData['salesorder_number'] = resultSourceOrder['createdfrom.externalid'][0].value;
		}
		catch(err){}
		
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
			
			if (isProcessed) continue;
			
			var lineItemType 		= recObj.getSublistValue({sublistId : 'item',fieldId : 'itemtype',line : line});
			var lineItem			= recObj.getSublistValue({sublistId : 'item',fieldId : 'item',line : line});
			var lineIsFulfillable 	= recObj.getSublistValue({sublistId : 'item',fieldId : 'custcol_isfulfillable',line : line});
			var lineLocation 		= recObj.getSublistValue({sublistId : 'item',fieldId : 'location',line : line});
			var lineLocationText 	= recObj.getSublistValue({sublistId : 'item',fieldId : 'location_display',line : line});
			
			var lineKey = [lineLocation, (isBigTicket?'Y':'N')].join(':'); 
			
			if (lineItemType == 'InvtPart' || (lineItemType == 'Service' && lineIsFulfillable))
			{
				if (!arrLines[lineKey] ) arrLines[lineKey] = [];
				arrLines[lineKey].push(line);
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
			'description', 'rate', 'quantity', 'amount','custcol_line_id','location','custcol_messagetothereceiver',
			'custcol_va001_gift_box', 'custcol_va002_gift_wrap','custcol_va003_gift_card', 'custcol_va004_monogrmming',
			'custcol_va005_dryer_hookup_top_fr_ld','custcol_va005_dryer_hookup_top_fr_ld',
			'custcol_va007_fridge_door_swing_chang','custcol_va008_front_load_washer_hooku',
			'custcol_va009_home_delivery_service','custcol_va010_home_deli_service_weeke',
			'custcol_va011_mattress_pickup','custcol_va012_pedestal_install_per_pa',
			'custcol_va013_time_spec_within_del_wi','custcol_va014_take_away_scrap_applian',
			'custcol_va016_top_load_washer_hookup','custcol_va017_tractor_snowblower_asse',
			'custcol_va018_stacking_kit_install','custcol_va019_store_stock_delivery',
			'custcol_return_code','cust_name',''
			];
		
		var arrListItemFieldsToSync = ['externalid'];
		
		var lineCount = recObj.getLineCount({sublistId : 'item'});
		
		for (var line = 0; line <= lineCount; line ++)
		{
			var lineData = {};
			var isProcessed = recObj.getSublistValue({sublistId : 'item', fieldId : 'custcol_sent_to_apigee',line : line});
			var isBigTicket = recObj.getSublistValue({sublistId : 'item',fieldId : 'custcol_bigticket',line : line});
			
			lineData.line = line;
			
			if (isProcessed) continue;
			
			var lineItemType 		= recObj.getSublistValue({sublistId : 'item',fieldId : 'itemtype',line : line});
			var lineItem			= recObj.getSublistValue({sublistId : 'item',fieldId : 'item',line : line});
			var lineIsFulfillable 	= recObj.getSublistValue({sublistId : 'item',fieldId : 'custcol_isfulfillable',line : line});
			var lineLocation 		= recObj.getSublistValue({sublistId : 'item',fieldId : 'location',line : line});
			var lineLocationText 	= recObj.getSublistValue({sublistId : 'item',fieldId : 'location_display',line : line});
			
			var lineKey = [lineLocation, (isBigTicket?'Y':'N')].join(':');
			
			if(! (lineItemType == 'InvtPart' || (lineItemType == 'Service' && lineIsFulfillable)) )
			{
				continue;
			}
			
			arrListLineitemFieldsToSync.forEach(function(lineField) {
				var lineValue = recObj.getSublistValue({sublistId : 'item',fieldId : lineField,line : line});
				if (lineValue)
				{
					if (lineField == 'custcol_searsitemname')
					{
						lineData['item'] = lineValue;
					}
					else if (lineField == 'custcol_return_code')
					{
						lineData['custcol_return_code'] = recObj.getSublistText({sublistId : 'item',fieldId : lineField,line : line});;
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
				else
				{
					if (lineField == 'custcol_return_code')
					{
						lineData['custcol_return_code'] = lineValue;
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
			
			if (! objLineData[lineKey] ) 
			{
				objLineData[lineKey] = {
						name:lineLocationText,
						id:lineLocation,
						bigTicket: isBigTicket,
						url: (PARAM.locationSCI == lineLocation)  ? PARAM.urlSCI : PARAM.urlLogfire,
						lines:[]};
			}
			
			
			
			objLineData[lineKey].lines.push(lineData);
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
				searchId: 'custscript_ss2_sendra_savedsearch2',
				batchId: 'custscript_ss2_sendra_batchid',
				urlLogfire: 'custscript_ss2_sendreturn_bigurl',
				urlSCI: 'custscript_ss2_sendreturn_regurl',
				locationSCI : 'custscript_mr_sendso_sci_location'
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
				if (! NSUtil.inArray(internalId, arrReturnVar))
				{
					arrReturnVar.push(internalId);
				}
			}
		}
		
		log.debug(logTitle, '>> values: ' + JSON.stringify(arrReturnVar) );
		return arrReturnVar;
	}

	
	
	

	
	return EndPoint;
});