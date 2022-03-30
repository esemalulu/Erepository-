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
 * 1.0       19 May 2016     bfeliciano 	Suitescipt v.2
 * 1.1       23 June 2016    mjpascual      Added Big Ticket Processing
 * 1.2       12 July 2016    mjpascual      Process only big items if ship date is more than 2 days ago
 * 1.3       08 Aug  2016    jtarko         Include processing regular (that are not bigitem) service items that are fulfillable 
 */

/**
 * @NApiVersion 2.x
 * @NModuleScope Public
 * @NScriptType ScheduledScript
 * @NScriptName NS | Send Sales Order (SS)
 * @NScriptType _sears_ss_sendso
 */

define(['./LibJsonRequest','./libCustom2', 'N/record', 'N/search', 'N/runtime', './NSUtil','N/http', 'N/error', 'N/format', './oauthv2','N/task'],

/**
 * @param {record} record
 * @param {search} search
 * @param {runtime} runtime
 * @param {nsutil} nsutil
 * @param {http} http
 * @param {error} error
 * @param {nsauth} nsauth
 */
function(LibJsonRequest, libCustom2, record, search, runtime, nsutil, http, error, format, nsauth, task)
{
	
	var USAGE_THRESHOLD  = 4000;
	var ITEMCOUNT_THRESHOLD = 100;
	var REQSIZE_THRESHOLD = 5000000; //approx 1MB
	
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
	 * Validate Big Item Date
	 * 
	 * @param {String} stHeaderShipDate
	 * @param {String} stShipDate
	 * @param {Integer} intShippingDateAdj
	 * @returns {Boolean} boolean
	 * @memberOf SendSalesOrder
	 */
	function checkIfValidBigItemDate(stHeaderShipDate, stShipDate, intShippingDateAdj)
	{
		var stLogTitle = 'checkIfValidBigItemDate';

		log.debug(stLogTitle, 'stShipDate ='+stShipDate + ' | stHeaderShipDate'+stHeaderShipDate);

		var dShipDate = new Date();
		var dBigItemProcessedDate = new Date();

		if(nsutil.isEmpty(stShipDate))
		{
			stShipDate = stHeaderShipDate;
		}

		if(nsutil.isEmpty(stShipDate))
		{
			return false;
		}

		var dShipDate = format.parse({
			value: stShipDate,
			type: format.Type.DATE
		});

		var dToday = new Date();
		dToday.setHours(0, 0, 0, 0, 0);

		//set date
		dBigItemProcessedDate.setDate(dShipDate.getDate());

		//compute date and exclude weekends
		for(var i=0; i<= intShippingDateAdj; i++)
		{
			dBigItemProcessedDate.setDate(dBigItemProcessedDate.getDate() - 1);
			log.debug(stLogTitle,'dBigItemProcessedDate: ' + dBigItemProcessedDate);
			while(dBigItemProcessedDate.getDay() == 0 || dBigItemProcessedDate.getDay() == 6)
			{
				log.debug(stLogTitle,'skip weekend dBigItemProcessedDate: ' + dBigItemProcessedDate);
				dBigItemProcessedDate.setDate(dBigItemProcessedDate.getDate() - 1);
			}
		}

		dBigItemProcessedDate.setHours(0, 0, 0, 0, 0);

		var dBigItemProcessedDate = dBigItemProcessedDate.getTime();
		var dToday = dToday.getTime();
		var dShipDate = dShipDate.getTime();

		log.debug(stLogTitle,'dBigItemProcessedDate: ' + dBigItemProcessedDate  + ' | dToday: ' + dToday  + ' | dShipDate: ' + dShipDate );
		log.debug('dBigItemProcessedDate <= dToday', dBigItemProcessedDate <= dToday);
		log.debug('dToday <= dShipDate', dToday <= dShipDate);

		if( dShipDate <= dToday || ((dBigItemProcessedDate <=  dToday) && (dToday <= dShipDate)))
		{
			log.audit(stLogTitle, 'process');
			return true;
		}

		return false;
	}


	/**
	 * Post the data
	 * 
	 * @param {String} stRequest
	 * @param {String} stURL
	 * @returns {Array} arrIds
	 * @memberOf SendSalesOrder
	 */
	function sendObjToURL(stRequest, stURL, isBigTicket)
	{
	    var returnResult = {
	            SENT_TO_WMS: false,
	            TIMESTART_WMS: null,
	            TIMEEND_WMS: null,
	            CODE: null,
	            ERROR_CODE: null,
	            ERROR_RAWMSG: null,
	            ERROR_MSG: null
	    };
	    
		if (isBigTicket) {
			
			log.debug("***OBJECT BEFORE***", stRequest);
			try {
				stRequest = libCustom2.exe(stRequest);	
			}catch(err){
				log.error('**libCustom2.exe', JSON.stringify(err) );				
				returnResult.ERROR_CODE = 'E100';
				returnResult.ERROR_RAWMSG = JSON.stringify(err);
				returnResult.ERROR_MSG = err.toString();
			}
			log.debug("***OBJECT AFTER***", stRequest);
			
			/** DISABLE SENDING BIG TICKET TO WMS **/
            returnResult.CODE = 'E99';
            returnResult.ERROR_CODE = 'E99';
            returnResult.ERROR_RAWMSG = "Disabled sending Big Ticket Item to WMS";
            returnResult.ERROR_MSG = "Disabled sending Big Ticket Item to WMS";			
            return returnResult; //skipping Big Ticket now
            /** DISABLE SENDING BIG TICKET TO WMS **/
		}
		
		if (stRequest) 
		{
			var stMethod = "POST";
			
			log.audit('sendObjToURL', '### Ready for sending the request...');
	
			var stTokenAuthSettings = runtime.getCurrentScript().getParameter({name:'custscript_ss2_param_token_settings'});
			stTokenAuthSettings = stTokenAuthSettings.replace(/\"\"/g, '"');
			stTokenAuthSettings = stTokenAuthSettings.replace(/\"\{/g, '{');
			stTokenAuthSettings = stTokenAuthSettings.replace(/\}\"/g, '}');
			var arrTokenAuth = JSON.parse(stTokenAuthSettings);
			if (!arrTokenAuth)
			{
				log.error('sendObjToURL', 'Invalid Token Settings!' + JSON.stringify([stTokenAuthSettings,arrTokenAuth]));
				
                returnResult.ERROR_CODE = 'E110';
                returnResult.ERROR_RAWMSG = 'Invalid token settings';
                returnResult.ERROR_MSG = 'Invalid token settings';
				
				throw 'Invalid Token Settings!';
			}
	
			//user objToken
			var objToken = {
				public: arrTokenAuth.TOKEN_KEY, //'XuCwdG9STjfkyXjmkcPJOxVwRFPi',
				secret: arrTokenAuth.TOKEN_SECRET//'RlTDqNwlHg2aLtPjh3zoNgGGj06m'
			};
	
			//app credentials
			var objOauth = nsauth.authenticate({
				consumer :
				{
					public : arrTokenAuth.CONSUMER_KEY, //'bILfmt2C0iiFucuvsbVEQVqCA5KVAD5c',
					secret : arrTokenAuth.CONSUMER_SECRET//'Gqu0VdA1AUGKnWtn'
				},
				signature_method : 'HMAC-SHA1'
			});
	
			var objRequestData = {
				url: stURL,
				method: stMethod,
				data: {}
			};
	
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
	            returnResult.TIMESTART_WMS  = new Date();
	            objResponse = http.request({
	                method: stMethod,
	                url: stURL,
	                body: stRequest,
	                headers: objHeaders
	            });	            
	            returnResult.TIMEEND_WMS = new Date();
	            if (objResponse)
                {
	                returnResult.SENT_TO_WMS = true;
	                if ( objResponse.code == 200)
                    {
	                    returnResult.CODE = 200;
                    }
	                else
                    {
                        returnResult.CODE = objResponse.code;
                        returnResult.ERROR_CODE = objResponse.code;
                        returnResult.ERROR_MSG = HTTP_ERROR_CODES[objResponse.code] || objResponse.body;                        
                    }
                }
	            
	            log.audit('## sendObjToURL: Response:return', JSON.stringify(returnResult));
	            log.audit('## sendObjToURL: Response:response.body', JSON.stringify(objResponse.body));
	            log.audit('## sendObjToURL: Response:response.code', JSON.stringify(objResponse.code));
	            log.audit('## sendObjToURL: Response:response', JSON.stringify([objResponse]));
	        }
	        catch (wmserr)
	        {
	            returnResult.CODE          = returnResult.CODE || 'E120';
	            returnResult.ERROR_CODE    = returnResult.ERROR_CODE || 'E120';
	            returnResult.ERROR_RAWMSG  = returnResult.ERROR_RAWMSG || JSON.stringify(wmserr);
	            returnResult.ERROR_MSG     = returnResult.ERROR_MSG || wmserr.toString();
	        }
			
//			return objResponse;		
		}
		else
	    {
		    log.error("***NOT SENT***", returnResult);
            returnResult.CODE = 'E130';
            returnResult.ERROR_CODE = 'E130';
            returnResult.ERROR_RAWMSG = "Error on ClearD Integration object";
            returnResult.ERROR_MSG = "Error on ClearD Integration object";
            log.error("***NOT SENT***", returnResult);
	    }
		
		return returnResult;
	}


	/**
	 * Update the Sales Order transactions
	 * 
	 * @param {Array} arrIds
	 * @param {Boolean} bBigReqSuccess
	 * @param {Boolean} bRegReqSucess
	 * @param {Integer} intShippingDateAdj
	 * @param {Object} respBigData
	 * @param {Object} respRegData
	 * @returns {Boolean}
	 * 
	 * @memberOf SendSalesOrder
	 */
	function updateTransactionFlag(arrIds, bBigReqSuccess, bRegReqSucess, intShippingDateAdj, respBigData, respRegData)
	{
		var stLogTitle = 'updateTransactionFlag';
		
		log.audit('## BIG ITEM STATUS ##',['bBigReqSuccess: '+ bBigReqSuccess, JSON.stringify(respBigData)].join(', '));
		log.audit('## REG ITEM STATUS ##',['bRegReqSucess: '+ bRegReqSucess, JSON.stringify(respRegData)].join(', '));

		log.debug(stLogTitle, 'arrIds =' + arrIds + ' | bBigReqSuccess = ' + bBigReqSuccess + ' | bRegReqSucess = '+ bRegReqSucess + ' | intShippingDateAdj = '+ intShippingDateAdj);
		log.debug(stLogTitle, 'respBigData =' + JSON.stringify(respBigData));
		log.debug(stLogTitle, 'respRegData =' + JSON.stringify(respRegData));
		
		var arrUpdatedBatchIds = [];

		for(var intCtr = 0; intCtr < arrIds.length; intCtr++){

			var stId = arrIds[intCtr];

			// load the sales order
			var recSalesOrder = record.load(
			{
				type : record.Type.SALES_ORDER,
				id : stId
			});
			
			var stBatchId = recSalesOrder.getValue({
				fieldId: 'custbody_sears_webrequest_batch'				
			});
			
			// get the line count
			var stHeaderShipDate = recSalesOrder.getValue({
				fieldId : 'shipdate'
			});

			// get the line count
			var intLineCount = recSalesOrder.getLineCount(
			{
				sublistId : 'item'
			});

			log.debug(stLogTitle, 'Updated stId = ' + stId + ' | intLineCount  = ' + intLineCount);

			// loop line
			for (var intLine = 0; intLine < intLineCount; intLine ++)
			{

				var bIsBigDataVal = recSalesOrder.getSublistValue(
				{
					sublistId : 'item',
					fieldId : 'custcol_bigticket',
					line : intLine
				});

				log.debug(stLogTitle, 'bIsBigDataVal: ' + bIsBigDataVal );

				var stItemTypes = recSalesOrder.getSublistValue(
				{
					sublistId : 'item',
					fieldId : 'itemtype',
					line : intLine
				});

				log.debug(stLogTitle, 'stItemTypes: ' + stItemTypes );
				
				var bIsFulfillment = recSalesOrder.getSublistValue(
				{
					sublistId : 'item',
					fieldId : 'custcol_isfulfillable',
					line : intLine
				});

				log.debug(stLogTitle, 'bIsFulfillment: ' + bIsFulfillment );
				
				//if big ticket, get ship date and process only if before 2 days ago.
				if(bIsBigDataVal)
				{
					//also include on that call Service For Sale Item that isfulfillable is True
					if(stItemTypes == 'InvtPart' || stItemTypes == 'Service')
					{
						//var bIsFulfillment = recSalesOrder.getSublistValue(
						//{
						//	sublistId : 'item',
						//	fieldId : 'custcol_isfulfillable',
						//	line : intLine
						//});

						if(!bIsFulfillment &&  stItemTypes == 'Service')
						{
							continue;
						}

						log.debug(stLogTitle,'intShippingDateAdj: ' + intShippingDateAdj);

						var stShipDate = recSalesOrder.getSublistValue(
						{
							sublistId : 'item',
							fieldId : 'custcol_ship_date',
							line : intLine
						});

						var bProcessShipDate = checkIfValidBigItemDate(stHeaderShipDate, stShipDate, intShippingDateAdj);

						log.debug(stLogTitle,'bProcessShipDate: ' + bProcessShipDate);

						if(!bProcessShipDate)
						{
							continue;
						}
					}
				}
				else
				{
					log.debug(stLogTitle, 'else update 1: ');
					
					if (stItemTypes == 'InvtPart' || (stItemTypes == 'Service' && bIsFulfillment))
					{
						log.debug(stLogTitle,'UPdate reqular inventory items and fulfillable reqular service items');
						// Process
					}
					else
					{
						log.debug(stLogTitle,'stop processing 2');
						continue;
					}
				}
//				{
//					if(stItemTypes != 'InvtPart')
//					{
//						continue;
//					}
//				}
				
				/** RESET THE LINES FIRST **/
                recSalesOrder.setSublistValue({sublistId : 'item',fieldId : 'custcol_sent_to_apigee',value: false ,line : intLine});
                recSalesOrder.setSublistValue({sublistId : 'item',fieldId : 'custcol_wms_sending_errormsg',value: '',line : intLine});
                recSalesOrder.setSublistValue({sublistId : 'item',fieldId : 'custcol_wms_error_sending_chk',value: false,line : intLine});                             
                recSalesOrder.setSublistValue({sublistId : 'item',fieldId : 'custcol_sent_to_wms_timestamp',value: null,line : intLine});
                recSalesOrder.setSublistValue({sublistId : 'item',fieldId : 'custcol_wms_sending_seconds',value: null,line : intLine});

				if(bIsBigDataVal)
				{
				    if (respBigData._RESPONSE && respBigData._RESPONSE.SENT_TO_WMS)
			        {
	                    if (respBigData.timeResponse)
	                    {
	                        recSalesOrder.setSublistValue({
	                            sublistId : 'item',
	                            fieldId : 'custcol_sent_to_wms_timestamp',
	                            value: format.parse(respBigData.timeResponse, format.Type.DATETIME),
	                            line : intLine
	                        });
	                    }

	                    recSalesOrder.setSublistValue({
	                        sublistId : 'item',
	                        fieldId : 'custcol_wms_sending_seconds',
	                        value: respBigData.timeDelta,
	                        line : intLine
	                    });
	                    
	                    if (bBigReqSuccess)
	                    {
	                        recSalesOrder.setSublistValue({sublistId : 'item',fieldId : 'custcol_sent_to_apigee',value: true,line : intLine});
	                        recSalesOrder.setSublistValue({sublistId : 'item',fieldId : 'custcol_wms_sending_errormsg',value: '',line : intLine});
	                        recSalesOrder.setSublistValue({sublistId : 'item',fieldId : 'custcol_wms_error_sending_chk',value: false,line : intLine});                             
	                    }
			        }
				    else
			        {
                        recSalesOrder.setSublistValue({sublistId : 'item',fieldId : 'custcol_sent_to_apigee',value: false,line : intLine});
                        recSalesOrder.setSublistValue({sublistId : 'item',fieldId : 'custcol_wms_sending_errormsg',value: respBigData.errormsg,line : intLine});
                        recSalesOrder.setSublistValue({sublistId : 'item',fieldId : 'custcol_wms_error_sending_chk',value: true,line : intLine});                             
			        }
				    
				}
				else if(!bIsBigDataVal)
				{
                    if (respRegData._RESPONSE && respRegData._RESPONSE.SENT_TO_WMS)
                    {
                        if (respRegData.timeResponse)
                        {
                            recSalesOrder.setSublistValue({
                                sublistId : 'item',
                                fieldId : 'custcol_sent_to_wms_timestamp',
                                value: format.parse(respRegData.timeResponse, format.Type.DATETIME),
                                line : intLine
                            });
                        }

                        recSalesOrder.setSublistValue({
                            sublistId : 'item',
                            fieldId : 'custcol_wms_sending_seconds',
                            value: respRegData.timeDelta,
                            line : intLine
                        });
                        
                        if (bRegReqSucess)
                        {
                            recSalesOrder.setSublistValue({sublistId : 'item',fieldId : 'custcol_sent_to_apigee',value: true,line : intLine});
                            recSalesOrder.setSublistValue({sublistId : 'item',fieldId : 'custcol_wms_sending_errormsg',value: '',line : intLine});
                            recSalesOrder.setSublistValue({sublistId : 'item',fieldId : 'custcol_wms_error_sending_chk',value: false,line : intLine});                             
                        }
                    }
                    else
                    {
                        recSalesOrder.setSublistValue({sublistId : 'item',fieldId : 'custcol_sent_to_apigee',value: false,line : intLine});
                        recSalesOrder.setSublistValue({sublistId : 'item',fieldId : 'custcol_wms_sending_errormsg',value: respRegData.errormsg,line : intLine});
                        recSalesOrder.setSublistValue({sublistId : 'item',fieldId : 'custcol_wms_error_sending_chk',value: true,line : intLine});                             
                    }
				}
			}
			
	         var id = recSalesOrder.save();
	         log.audit(stLogTitle,'## Update Sales Order ID: ' + id);

			
            if (stBatchId)
            {
                //arrIds, bBigReqSuccess, bRegReqSucess, intShippingDateAdj, respBigData, respRegData
                log.debug(stLogTitle, '### UPDATE STATUS ###' + JSON.stringify({ RegRespSuccess: bRegReqSucess, BigRespSuccess: bBigReqSuccess, hasBigDataValue: bIsBigDataVal }));
                
                if (!nsutil.inArray(stBatchId, arrUpdatedBatchIds) )
                {
                	LibJsonRequest.validateBatchStatus(stBatchId);
                    log.debug(stLogTitle,'## Update Batch ID: ' + stBatchId);
                    arrUpdatedBatchIds.push(stBatchId);
                }
            }
			
		}
	}

	
	
	/**
	 * Execute the scheduled script
	 * 
	 * @param {Object} context
	 * @memberOf SendSalesOrder
	 */
	function execute(context)
	{
		var stLogTitle = 'SendSalesOrder';

		var arrListFieldsToSync =
		[
			'internalid', 'externalid', 'entity','tranid', 'otherrefnum', 'location', 'trandate','shipmethod', 'source',
			'billaddressee', 'billaddr1', 'billaddr2', 'billcity', 'billstate', 'billzip','billcountry', 'billphone',
			'shipaddressee', 'shipaddr1', 'shipaddr2', 'shipcity', 'shipstate', 'shipzip', 'shipcountry', 'shipphone',
			'custbody_phone_shipping','custbody_phone_billing','custbody_phone_wms'
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

		var arrListLineitemFieldsToSync = [ 'custcol_searsitemname',
		                                    'item', 'itemid',
				'externalid', 'item_display', 'displayname',
				'description', 'rate', 'quantity', 'amount',
				'custcol_messagetothereceiver',
				'custcol_va001_gift_box', 'custcol_va002_gift_wrap',
				'custcol_va003_gift_card', 'custcol_va004_monogrmming',
				'custcol_va005_dryer_hookup_top_fr_ld',
				'custcol_va005_dryer_hookup_top_fr_ld',
				'custcol_va007_fridge_door_swing_chang',
				'custcol_va008_front_load_washer_hooku',
				'custcol_va009_home_delivery_service',
				'custcol_va010_home_deli_service_weeke',
				'custcol_va011_mattress_pickup',
				'custcol_va012_pedestal_install_per_pa',
				'custcol_va013_time_spec_within_del_wi',
				'custcol_va014_take_away_scrap_applian',
				'custcol_va016_top_load_washer_hookup',
				'custcol_va017_tractor_snowblower_asse',
				'custcol_va018_stacking_kit_install',
				'custcol_va019_store_stock_delivery' ];
		
		var arrListItemFieldsToSync =
		[
				'externalid'
		];
		
		var recSO = null;

		try
		{
			log.debug(stLogTitle, '## Start ##');

			var CACHE = {};
			// script parameter
			var stSearchId = runtime.getCurrentScript().getParameter('custscript_ss2_sendso_savedsearch2');
			var stBatchId  = runtime.getCurrentScript().getParameter('custscript_ss2_sendso_batchid');
			var stRegularTicketURL  = runtime.getCurrentScript().getParameter('custscript_ss2_sendso_regurl');
			var stBigTicketURL  = runtime.getCurrentScript().getParameter('custscript_ss2_sendso_bigurl');
			var intShippingDateAdj  = nsutil.forceInt(runtime.getCurrentScript().getParameter('custscript_big_item_shipping_date'));

			if (nsutil.isEmpty(stSearchId) || nsutil.isEmpty(stRegularTicketURL) || nsutil.isEmpty(stBigTicketURL))
			{
				throw "Missing search ID";
			}

			log.debug('#SUITELET#', '>> Seach id: ' + stSearchId);

			// reset the request Object
			var objRegRequest = {'salesOrders' : [] };
			var objBigRequest = {'salesOrders' : [] };

			var arrIds = [];
			var arrBatchIds = [];

			var initSearchObj 	= search.load({id : stSearchId});
	    	var arrFilters 		= initSearchObj.filters;
	    	var arrColumns 		= initSearchObj.columns;
	    	
   	    	if (stBatchId)
            {
                // custbody_sears_webrequest_batch
                arrFilters.push(search.createFilter({
                    name : 'custbody_sears_webrequest_batch',
                    operator : search.Operator.ANYOF,
                    values : [ stBatchId ]
                }));
            }
   	    	
       	     var arrSearchResults = nsutil.searchAll({
                 recordType:initSearchObj.searchType,
                 filters: arrFilters, 
                 columns: arrColumns});
   	    	
			log.debug(stLogTitle, 'arrSearchResults length ='+ JSON.stringify(arrSearchResults.length));
			
			var arrBatchedOrders = {};
			var totalLengthBigItem = 0;
			var totalLengthRegItem = 0;

			//Loop objResults
			arrSearchResults.forEach(function(objResult)
			{
				// get the governance
				var remainingUsage = runtime.getCurrentScript().getRemainingUsage();
				log.debug('process_result', '##Remaining Usage: ' + JSON.stringify([remainingUsage, USAGE_THRESHOLD, (remainingUsage >= USAGE_THRESHOLD)]));
								
				log.debug('process_result', '##Reg Item Length: ' + JSON.stringify([totalLengthRegItem, REQSIZE_THRESHOLD, (totalLengthRegItem <= REQSIZE_THRESHOLD)] ) );
				log.debug('process_result', '##Big Item Length: ' + JSON.stringify([totalLengthBigItem, REQSIZE_THRESHOLD, (totalLengthBigItem <= REQSIZE_THRESHOLD)]) );
				
				if (! (remainingUsage >= USAGE_THRESHOLD && totalLengthRegItem <= REQSIZE_THRESHOLD && totalLengthBigItem <= REQSIZE_THRESHOLD) )
				{
					log.debug('process_result', '..skipping');
					return false;
				}
				
				
				var objRegSalesOrder = {};
				var objBigSalesOrder = {};
				log.debug(stLogTitle, 'objResult: ' + JSON.stringify(objResult));

				var stId = objResult.getValue({
					name: 'internalid',
					summary : 'GROUP'
				});
				
				if (!nsutil.inArray(stId, arrIds))
				{
					//pushIds
					arrIds.push(stId);
					
					// dynamically add to USAGE_THRESHOLD 
					USAGE_THRESHOLD=USAGE_THRESHOLD+50;
				}
				
				var stHeaderShipDate = objResult.getValue({
					name: 'shipdate',
					summary : 'GROUP'
				});
				
				var batchId = objResult.getValue({
					name: 'custbody_sears_webrequest_batch',
					summary : 'GROUP'
				});
				
				if (!batchId)
				{
					batchId='@NONE@';
				}
				else
				{
					// dynamically add to USAGE_THRESHOLD 
					USAGE_THRESHOLD=USAGE_THRESHOLD+10;
				}
				
				if (!arrBatchedOrders[batchId] )
				{
					arrBatchedOrders[batchId] = {bigItems: [], regItems:[], orderIds: []};
					arrBatchIds.push(batchId);
				}
				

				// load the sales order
				var recSalesOrder = record.load(
				{
					type : record.Type.SALES_ORDER,
					id : stId
				});
				
				recSO = recSalesOrder;

				log.debug(stLogTitle,'.. loading the sales order');

				// add the fields
				arrListFieldsToSync.forEach(function(fieldId)
				{
					var objFieldValue = null;

					if (fieldId == 'internalid')
					{
						objFieldValue = stId;
					}
					else if (objBillAddrFields[fieldId] || objShipAddrFields[fieldId])
					{
						var addressId = null, addressField = null;

						if (objBillAddrFields[fieldId])
						{
							addressId = recSalesOrder.getValue(
							{
								fieldId : 'billingaddress'
							});
							addressField = objBillAddrFields[fieldId];
						}
						else if (objShipAddrFields[fieldId])
						{
							addressId = recSalesOrder.getValue(
							{
								fieldId : 'shippingaddress'
							});
							addressField = objShipAddrFields[fieldId];
						}

//						log.debug(stLogTitle, '-->> address ID ' + addressId);
						if (addressId)
						{
							var cacheKey = ['address', addressId].join('::');
							if (CACHE[cacheKey] == null)
							{
								CACHE[cacheKey] = record.load({type:'address',id:addressId});
							}

							if (CACHE[cacheKey])
							{
								objFieldValue = CACHE[cacheKey].getValue({fieldId:addressField});
							}
						}
					}

					if (!objFieldValue)
					{
						if (nsutil.inArray(fieldId,arrTextFields) )
						{
							objFieldValue = recSalesOrder.getText({fieldId : fieldId});
						}
						else
						{
							objFieldValue = recSalesOrder.getValue({fieldId : fieldId});
						}
					}

					objRegSalesOrder[fieldId] = objFieldValue || '';
					objBigSalesOrder[fieldId] = objFieldValue || '';

					/*
					if (!objFieldValue)
					{
						log.debug(stLogTitle,'fieldId: ' + fieldId + '   Value: ' + objFieldValue);
					}
					*/
				});

				// add the lines
				objRegSalesOrder.items = [];
				objBigSalesOrder.items = [];

				// get the line count
				var intLineCount = recSalesOrder.getLineCount(
				{
					sublistId : 'item'
				});

				log.debug(stLogTitle,'intLineCount: ' + intLineCount );

				// loop line
				for (var line = 0; line <= intLineCount; line ++)
				{
					var lineData = false;

					var stItemItem = recSalesOrder.getSublistValue(
							{
								sublistId : 'item',
								fieldId : 'item',
								line : line
							});

					log.debug(stLogTitle,'stItemItem: ' + stItemItem );
							
					var stItemType = recSalesOrder.getSublistValue(
					{
						sublistId : 'item',
						fieldId : 'itemtype',
						line : line
					});

					log.debug(stLogTitle,'stItemType: ' + stItemType );

					var bProcessed = recSalesOrder.getSublistValue(
					{
						sublistId : 'item',
						fieldId : 'custcol_sent_to_apigee',
						line : line
					});

					// do not process those lines that were already sent to apigee
					if(bProcessed)
					{
						continue;
					}

					var bIsBigDataVal = recSalesOrder.getSublistValue(
					{
						sublistId : 'item',
						fieldId : 'custcol_bigticket',
						line : line
					});
					
					var bIsFulfillment = recSalesOrder.getSublistValue(
					{
						sublistId : 'item',
						fieldId : 'custcol_isfulfillable',
						line : line
					});


					log.debug(stLogTitle,'bProcessed: ' + bProcessed  + ' | bIsBigDataVal: ' + bIsBigDataVal );

					//if big ticket, get ship date and process only if before 2 days ago.
					if(bIsBigDataVal)
					{

						if(stItemType == 'InvtPart' || stItemType == 'Service')
						{
							//var bIsFulfillment = recSalesOrder.getSublistValue(
							//{
							//	sublistId : 'item',
							//	fieldId : 'custcol_isfulfillable',
							//	line : line
							//});

							if(!bIsFulfillment && stItemType == 'Service')
							{
								log.debug(stLogTitle,'stop processing 1a');
								continue;
							}

							log.debug(stLogTitle,'intShippingDateAdj: ' + intShippingDateAdj);

							var stShipDate = recSalesOrder.getSublistValue(
							{
								sublistId : 'item',
								fieldId : 'custcol_ship_date',
								line : line
							});

							log.debug(stLogTitle,'MJ stShipDate: ' + stShipDate);

							var bProcessShipDate = checkIfValidBigItemDate(stHeaderShipDate, stShipDate, intShippingDateAdj);

							log.debug(stLogTitle,'bProcessShipDate: ' + bProcessShipDate);

							if(!bProcessShipDate)
							{
								log.debug(stLogTitle,'stop processing 1b');
								continue;
							}
						}
					}
					else
					{
						if(stItemType == 'InvtPart' || (stItemType == 'Service' && bIsFulfillment))
						{
							log.debug(stLogTitle,'process reqular inventory items and fulfillable reqular service items');
							// Process
						}
						else
						{
							log.debug(stLogTitle,'stop processing 2');
							continue;
						}
					}

					arrListLineitemFieldsToSync.forEach(function(lineField)
					{
						var lineValue = recSalesOrder.getSublistValue(
						{
							sublistId : 'item',
							fieldId : lineField,
							line : line
						});

						if (lineValue)
						{
							if ( !lineData) { lineData = {}; }
							
							if (lineField == 'custcol_searsitemname')
							{
								lineData['item'] = lineValue;
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

					arrListItemFieldsToSync.forEach(function(itemField){
						var itemId = recSalesOrder.getSublistValue(
								{
									sublistId : 'item',
									fieldId : 'item',
									line : line
								});
						if ( itemId)
						{
							var cacheKey = ['itemfield',itemField,itemId].join('::');
							if(CACHE[cacheKey]==null)
							{
								CACHE[cacheKey] = search.lookupFields({type:'item',id:itemId, columns:[ itemField ]});
							}

							//log.debug(stLogTitle, '..itemField/Value' + JSON.stringify([itemField, CACHE[cacheKey][itemField]]) );

							var lineValue = CACHE[cacheKey][itemField][0] ? CACHE[cacheKey][itemField][0].value : false;
							if (lineValue)
							{
								if ( !lineData) {
									lineData = {};
								}

								if (itemField == 'externalid')
								{
									lineData['itemid'] = lineValue;
								}
								else
								{
									lineData[itemField] = lineValue;
								}
							}
						}
					});


					if (lineData)
					{
						if(bIsBigDataVal)
						{
							objBigSalesOrder.items.push(lineData);
						}
						else
						{
							objRegSalesOrder.items.push(lineData);
						}
					}
				}


				if(objBigSalesOrder.items.length > 0)
				{
					log.debug('process_result', '..push objBigSalesOrder: ' + JSON.stringify(objBigSalesOrder));
					arrBatchedOrders[batchId].bigItems.push(objBigSalesOrder);					
					totalLengthBigItem+=JSON.stringify(objBigSalesOrder).length;				
				}

				if(objRegSalesOrder.items.length > 0)
				{
					log.debug('process_result', '..push objRegSalesOrder: ' + JSON.stringify(objRegSalesOrder));
					arrBatchedOrders[batchId].regItems.push(objRegSalesOrder);
					totalLengthRegItem+=JSON.stringify(objRegSalesOrder).length;				
				}				
				
				if (objBigSalesOrder.items.length > 0 ||  objRegSalesOrder.items.length > 0)
				{
					arrBatchedOrders[batchId].orderIds.push(stId);
				}
				
				return true;
			});
			
			log.debug('process_result', 'Total Batch IDs: ' + JSON.stringify(arrBatchIds));
			var batchComplete = false;
			
			if (arrBatchIds.length)
			{
				if (arrBatchIds.length > 1 )
			    {
		            arrBatchIds.pop();
			    }
				log.debug('process_result', 'Total Batch IDs: ' + JSON.stringify(arrBatchIds));
				
				var arrIncludedOrderIds = [];				
				
				arrBatchIds.forEach(function (batchId){
					var arrOrders = arrBatchedOrders[batchId];
					
	                if (!arrBatchedOrders[batchId] )
	                {
	                    // update this batch immediately
	                    record.submitFields(
	                    {
	                        type : 'customrecord_sears_webrequest_batch',
	                        id : batchId,
	                        values :{
	                            'custrecord_batchwebreq_status' : 'INPROCESS-APIGEE'
	                        }
	                    });
	                }
					
					log.debug('process_result', '>> bigItems.length: ' + arrOrders.bigItems.length);
					if(arrOrders.bigItems.length > 0)
					{
						arrOrders.bigItems.forEach(function(orderItem){
							if (recSO) {
								var shipdate = recSO.getValue({
									fieldId : 'shipdate'
								});
								orderItem.shipdate = shipdate;
							}
							
							objBigRequest.salesOrders.push(orderItem);
							return true;
						});

					}
					
					log.debug('process_result', '>> regItems.length: ' + arrOrders.regItems.length);
					if(arrOrders.regItems.length > 0)
					{
						arrOrders.regItems.forEach(function(orderItem){
							if (recSO) {
								var shipdate = recSO.getValue({
									fieldId : 'shipdate'
								});
								orderItem.shipdate = shipdate;
							}
							
							objRegRequest.salesOrders.push(orderItem);
							return true;
						});
					}
					
					if(arrOrders.orderIds.length > 0)
					{					
						arrOrders.orderIds.forEach(function(orderId){
							arrIncludedOrderIds.push(orderId);
							return true;
						});
					}
					
					return true;
				});
				
				// send this to the url//
				log.debug(stLogTitle, 'JSON objBigRequest: ' + JSON.stringify(objBigRequest));
				log.debug(stLogTitle, 'JSON objRegRequest: ' + JSON.stringify(objRegRequest));
				log.debug(stLogTitle, 'JSON arrIncludedOrderIds: ' + JSON.stringify(arrIncludedOrderIds));

				// process
				log.debug(stLogTitle, 'JSON stRegularTicketURL: ' + stRegularTicketURL);
				log.debug(stLogTitle, 'JSON stBigTicketURL: ' + stBigTicketURL);

				var bBigReqSuccess = true;
				var bRegReqSucess = true;
				var intRespCode = 200;
				
				log.debug('process_result', 'objBigRequest.salesOrders.length: ' + objBigRequest.salesOrders.length + '  objRegRequest.salesOrders.length: ' + objRegRequest.salesOrders.length);
				
				if ( objBigRequest.salesOrders.length || objRegRequest.salesOrders.length)
				{
					var respBigData = {}, respRegData = {};
					
					log.audit('## READY FOR SENDING (BIG): ', JSON.stringify(objBigRequest));
					if( objBigRequest.salesOrders.length > 0 )
					{
						bBigReqSuccess = false;
						
						var objResponse = sendObjToURL( JSON.stringify(objBigRequest), stBigTicketURL, true);
						
						respBigData._RESPONSE = objResponse;
						
						log.audit(stLogTitle, 'JSON Big Ticket Response: ' + JSON.stringify(objResponse));
						
						respBigData.timeResponse = objResponse.TIMEEND_WMS;
						
						if (objResponse.TIMESTART_WMS && objResponse.TIMEEND_WMS)
					    {
						    respBigData.timeDelta = (objResponse.TIMEEND_WMS).getTime() - (objResponse.TIMESTART_WMS).getTime();
					    }
						
						if(objResponse.CODE == intRespCode)
						{
							respBigData.success = true;
							bBigReqSuccess = true;
						}
						else
						{
							respBigData.success = false;
							respBigData.errorcode = objResponse.ERROR_CODE;
							respBigData.errormsg = JSON.stringify({CODE: objResponse.ERROR_CODE, BODY: objResponse.ERROR_MSG});
						}
						
						
						
						log.audit('## RESPONSE BIG DATA:', JSON.stringify(respBigData));
					}
					
					log.audit('## READY FOR SENDING(REG):', JSON.stringify(objRegRequest));
					if( objRegRequest.salesOrders.length > 0 )
					{
						bRegReqSucess = false;

						var objResponse = sendObjToURL( JSON.stringify(objRegRequest), stRegularTicketURL, false);
						
						respRegData._RESPONSE = objResponse;
						
						log.audit(stLogTitle, 'JSON Reg Ticket Response: ' + JSON.stringify(objResponse));
						
						respRegData.timeResponse = objResponse.TIMEEND_WMS;
                        if (objResponse.TIMESTART_WMS && objResponse.TIMEEND_WMS)
                        {
                            respRegData.timeDelta = (objResponse.TIMEEND_WMS).getTime() - (objResponse.TIMESTART_WMS).getTime();
                        }

						if(objResponse.CODE == intRespCode)
						{
							respRegData.success = true;
							bRegReqSucess = true;
						}
						else
						{
							respRegData.success = false;
							respRegData.errorcode = objResponse.CODE;
							respRegData.errormsg = JSON.stringify({CODE: objResponse.ERROR_CODE, BODY: objResponse.ERROR_MSG});
						}
						log.audit('## RESPONSE REG DATA:', JSON.stringify(respRegData));
					}
					
					updateTransactionFlag(arrIncludedOrderIds, bBigReqSuccess, bRegReqSucess, intShippingDateAdj, respBigData, respRegData);
				}
				else
			    {
	                if (stBatchId)
	                {
	                	LibJsonRequest.validateBatchStatus(stBatchId);
	                }				    
			    }
			}
			else
			{
				if (stBatchId)
				{
					LibJsonRequest.validateBatchStatus(stBatchId);
				}
				
				// exit since //
				return true;
			}
			
			var arrPendingBatchIds = getNextPendingBatches();
			//var count=10; //for 10 deployments
			for (var count=0, max=10; count<=max; count++)
		    {
			    var rowBatch = arrPendingBatchIds[count];
			    if (rowBatch)
		    	{
	                record.submitFields({
	                    type : 'customrecord_sears_webrequest_batch',
	                    id : rowBatch.id,
	                    values :
	                    {
	                        custrecord_batchwebreq_status : 'PENDING-APIGEE'
	                    }
	                });
	                
	                log.debug('## NEXT BATCHID##', '...updating next batch: ' + JSON.stringify( [rowBatch.id, count]) );
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
			
			log.debug('END SCRIPT', '## END SCRIPT ##');
		}
		
		return true;
	}
	
	/**
	 * 
	 * @memberOf SendSalesOrder
	 */
	function getPendingOrders(stSearchId)
	{
		var initSearchObj 	= search.load({id : stSearchId});
	    var arrFilters 		= initSearchObj.filters;
	    var arrColumns 		= initSearchObj.columns;

	    	
		var newSearchObj = search.create(
		{
			type : initSearchObj.searchType,
			filters : arrFilters,
			columns : arrColumns
		});
		
		return newSearchObj.run();
	}

    /**
     * 
     * @memberOf SendSalesOrder
     */
	function getNextPendingBatch()
	{
		var colId = search.createColumn({name:'internalid',sort: search.Sort.DESC});
		var searchObj = search.create({type: 'customrecord_sears_webrequest_batch',
							columns:['name', colId],
							filters: [
								['custrecord_batchwebreq_status','is','QUEUE-APIGEE'] 
							]});
		var nextBatchid = false;
		searchObj.run().each(function(row){
			nextBatchid = row.getValue({name:'internalid'});
		});

		log.debug('getNextPendingBatch','### next Batch ID: ' + nextBatchid);

		return nextBatchid;
	}
    /**
     * 
     * @memberOf SendSalesOrder
     */
    function getNextPendingBatches()
    {
        
        var colId = search.createColumn({name:'internalid',sort: search.Sort.DESC});
        var arrSearchResults = nsutil.searchAll({
            recordType:'customrecord_sears_webrequest_batch',
            filterExpression:  [ ['custrecord_batchwebreq_status','is','QUEUE-APIGEE'] ], 
            columns: ['name', colId]
        });
        
        return arrSearchResults;
    }

    /**
     * 
     * @memberOf SendSalesOrder
     */
	function getFailedBatch()
	{
		var colId = search.createColumn({name:'internalid',sort: search.Sort.DESC});
		var searchObj = search.create({type: 'customrecord_sears_webrequest_batch',
							columns:['name', colId],
							filters: [
								['custrecord_batchwebreq_status','startswith','PARTIAL'], 'OR',
								['custrecord_batchwebreq_status','is','FAILED']
							]});
		var nextBatchid = false;
		searchObj.run().each(function(row){
			nextBatchid = row.getValue({name:'internalid'});
		});

		log.debug('getFailedBatch','### next Batch ID: ' + nextBatchid);

		return nextBatchid;
	}


	return {
		execute: execute
	};
});