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
 * 1.0       19 May 2016     bfeliciano 		Suitescipt v.2
 */

/**
 * @NApiVersion 2.x
 * @NScriptType ScheduledScript
 * @NScriptName NS | Send Transfer Order (SS)
 * @NScriptType _sears_ss_sendso
 */

define(['N/record', 'N/search', 'N/runtime', './NSUtil','N/http', 'N/error','./oauthv2','./LibJsonRequest'],

/**
 * @param {record} record
 * @param {search} search
 * @param {runtime} runtime
 * @param {nsutil} nsutil
 * @param {http} http
 */
function(record, search, runtime, nsutil, http, error, nsauth, LibJsonRequest)
{

	/**
	 * Post the data
	 * @param stRequest
	 * @param objConfig
	 * @returns arrIds
	 */
	function sendObjToURL(stRequest, restletUrl)
	{
		var method = "POST";
		var logTitle = 'SendTransferOrder - sendObjToURL';
		
		log.debug(logTitle, '** sendObjToURL Restlet url: ' + restletUrl);
		log.debug(logTitle, '** sendObjToURL method: ' + method);
		
		/*
		var stTokenAuthSettings = runtime.getCurrentScript().getParameter({name:'custscript_ss2_param_token_settings'});
		var arrTokenAuth = JSON.parse(stTokenAuthSettings);
		*/
		
		//regina - 11/15 - use customrecord for credentials
		var arrTokenAuth = LibJsonRequest.getCredentialConfig('sendToWMS');

		if (!arrTokenAuth)
		{
			log.error('sendObjToURL', 'Invalid Token Settings!' + JSON.stringify([stTokenAuthSettings,arrTokenAuth]));
			throw 'Invalid Token Settings!';
		}

		//log.debug(logTitle, '** sendObjToURL arrTokenAuth: ' + arrTokenAuth);
		//user token
		var token = {
				public: arrTokenAuth.TOKEN_KEY,
				secret: arrTokenAuth.TOKEN_SECRET
		};

		//app credentials
		var oauth = nsauth.authenticate(
					{
						consumer :
						{
							public : arrTokenAuth.CONSUMER_KEY,
							secret : arrTokenAuth.CONSUMER_SECRET
						},
						signature_method : 'HMAC-SHA1'
					});

		var request_data = {
			url: restletUrl,
			method: method,
			data: {}
		};

		var oauth_data = {
			oauth_consumer_key: oauth.consumer.public,
			oauth_nonce: oauth.getNonce(),
			oauth_signature_method: oauth.signature_method,
			oauth_timestamp: oauth.getTimeStamp(),
			oauth_version: '1.0',
			oauth_token: token.public
		};

		//log.debug(logTitle, '** sendObjToURL oauth_data: ' + oauth_data);
		var headerWithRealm = oauth.toHeader(oauth.authorize(request_data, token));
		headerWithRealm.Authorization += ',realm= " " ';
		
		//log.debug(logTitle, '** sendObjToURL headerWithRealm: ' + headerWithRealm);

		//HTTP headers
        var headers = new Array();
        headers['Content-Type'] = 'application/json';
        headers['Authorization'] = headerWithRealm.Authorization;
		
		log.debug(logTitle, '** sendObjToURL Submit Calling');

		var objResponse = http.request({
			method: method,
			url: restletUrl,
			body: stRequest,
			headers: headers
		});

		return true;
	}

	function execute(context)
	{
		var logTitle = 'SendTransferOrder';
		var requestObj =
		{
			'transferOrders' : []
		};
		var LIMIT_remainingUsage = 200;
		//var LIMIT_numItems = 2;
		//rekha - 11/18 - changed the limit to 250
		var LIMIT_numItems = 250;

		var listFieldsToSync =
		[
				'internalid', 'externalid', 'entity','tranid', 'otherrefnum', 'location', 'trandate', 'shipmethod', 'source',
				'transferlocation',
				'billaddressee', 'billaddr1', 'billaddr2', 'billcity', 'billstate', 'billzip','billcountry', 'billphone',
				'shipaddressee', 'shipaddr1', 'shipaddr2', 'shipcity', 'shipstate', 'shipzip', 'shipcountry'
		];

		var arrTextFields = ['location','entity','transferlocation'];

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

		var listLineitemFieldsToSync =
		[
				'item','item_display', 'displayname', 'description', 'rate', 'quantity', 'amount'
		];
		var listItemFieldsToSync =
			[
					'externalid'
			];


		try
		{
			log.audit(logTitle, '## Start ##');

			var CACHE = {};

			// script parameter
			var searchId = runtime.getCurrentScript().getParameter('custscript_ss2_sendto_savedsearch');
			var stRegularTicketURL  = runtime.getCurrentScript().getParameter('custscript_ss2_sendto_regurl');
			var stBigTicketURL  = runtime.getCurrentScript().getParameter('custscript_ss2_sendto_bigurl');
			log.debug(logTitle, '** sendObjToURL Regullar url: ' + stRegularTicketURL);
			log.debug(logTitle, '** sendObjToURL Big url: ' + stBigTicketURL);
			if (nsutil.isEmpty(searchId) || nsutil.isEmpty(stRegularTicketURL) || nsutil.isEmpty(stBigTicketURL))
			{
				throw "Missing search ID";
			}

			// reset the request Object
			var requestObj = {'transferOrders' : [] };
			var searchResults = search.load({id : searchId}).run();

			log.debug(logTitle, '** Seasrch Results: ' + searchResults.length);

			searchResults.each(
				function(result){
					log.debug(logTitle,'result.id - ' + result.id);
					var salesOrderObj = {}, BillAddr = null, ShipAddr = null;

					// load the Transfer order
					var recTransferOrder = record.load(
					{
						type : record.Type.TRANSFER_ORDER,
						id : result.id
					});
					log.debug(logTitle,'.. loading the Transfer order');

					// add the fields
					listFieldsToSync.forEach(function(fieldId)
					{
						var fieldValue = null;

						if ( fieldId == 'internalid')
						{
							fieldValue = result.id;
						}
						/*
						else if (objBillAddrFields[fieldId] || objShipAddrFields[fieldId])
						{
							var addressId = null, addressField = null;

							if (objBillAddrFields[fieldId])
							{
								addressId = recTransferOrder.getValue(
								{
									fieldId : 'billingaddress'
								});
								addressField = objBillAddrFields[fieldId];
							}
							else if (objShipAddrFields[fieldId])
							{
								addressId = recTransferOrder.getValue(
								{
									fieldId : 'shippingaddress'
								});
								addressField = objShipAddrFields[fieldId];
							}

							log.debug(logTitle, '-->> address ID ' + addressId);
							if (addressId)
							{
								var cacheKey = ['address',addressId].join('::');
								if (CACHE[cacheKey] == null)
								{
									CACHE[cacheKey] = record.load({type:'address',id:addressId});
								}

								if (CACHE[cacheKey])
								{
									fieldValue = CACHE[cacheKey].getValue({fieldId:addressField});
								}
							}
						}
						*/

						if (!fieldValue)
						{
							try {
								if (nsutil.inArray(fieldId,arrTextFields) )
								{
									fieldValue = recTransferOrder.getText({fieldId : fieldId});
								}
								else
								{
									fieldValue = recTransferOrder.getValue({fieldId : fieldId});
								}

							}catch(err){}
						}

						if (!fieldValue)
						{
							try {
								if (nsutil.inArray(fieldId,arrTextFields) )
								{
									fieldValue = result.getText({'name':fieldId});
								}
								else
								{
									fieldValue = result.getValue({'name':fieldId});
								}
							} catch (err){}
						}

						if (!fieldValue)
						{
							log.debug(logTitle,'fieldId: ' + fieldId + '   Value: ' + fieldValue);
						}
						else
						{
							salesOrderObj[fieldId] = fieldValue || '';
						}
					});

					// add the lines
					salesOrderObj.items = [];

					var lineCount = recTransferOrder.getLineCount(
					{
						sublistId : 'item'
					});
					for (var line = 0; line <= lineCount; line ++)
					{
						var lineData = false;
						listLineitemFieldsToSync.forEach(function(lineField)
						{
							var lineValue = recTransferOrder.getSublistValue(
							{
								sublistId : 'item',
								fieldId : lineField,
								line : line
							});

							if (lineValue)
							{
								if ( !lineData) {
									lineData = {};
								}
								lineData[lineField] = lineValue;
							}
						});
						listItemFieldsToSync.forEach(function(itemField){
							var itemId = recTransferOrder.getSublistValue(
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

								if (!nsutil.isEmpty(CACHE[cacheKey][itemField]))
								{
									var lineValue = CACHE[cacheKey][itemField][0].value;
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
							}
						});


						if (lineData)
						{
							salesOrderObj.items.push(lineData);
						}
					}
					log.debug('process_result', '..adding Transfer order: ' + JSON.stringify(salesOrderObj));

					// then attach it to the main request
					requestObj.transferOrders.push(salesOrderObj);

					// then update this record
					// log.debug(logTitle,'result - ' + JSON.stringify(result));
					var sStatus = result.getText({'name' : 'statusref'});
					log.debug('process_result', 'sStatus: ' + sStatus);
										
					if (sStatus == 'Pending Fulfillment') {
						record.submitFields(
						{
							type : record.Type.TRANSFER_ORDER,
							id : result.id,
							values :
							{
								'custbody_sent_to_apigee' : true
							}
						});
					} else {
						record.submitFields(
						{
							type : record.Type.TRANSFER_ORDER,
							id : result.id,
							values :
							{
								'custbody_sears_sentto_wms_receiving' : true
							}
						});
					}
					

					// get the governance
					var remainingUsage = runtime.getCurrentScript().getRemainingUsage();
					log.debug('process_result', '##Remaining Usage: ' + remainingUsage);

					return (remainingUsage >= LIMIT_remainingUsage && requestObj.transferOrders.length < LIMIT_numItems);
			});


			// send this to the url//
			log.debug(logTitle, 'JSON request: ' + JSON.stringify(requestObj));

			sendObjToURL( JSON.stringify(requestObj), stRegularTicketURL );

			return true;
		}
		catch(error)
		{
			log.error('ERROR', error.toString());
			throw error.toString();
		}
	}

	return {
		execute: execute
	};
});