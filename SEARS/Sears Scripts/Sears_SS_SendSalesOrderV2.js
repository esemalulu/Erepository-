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
 * @NScriptName NS | Send Sales Order (SS)
 * @NScriptType _sears_ss_sendso
 */

define(['N/record', 'N/search', 'N/runtime', './NSUtil','N/http', 'N/error','./oauthv2'],

/**
 * @param {record} record
 * @param {search} search
 * @param {runtime} runtime
 * @param {nsutil} nsutil
 * @param {http} http
 */
function(record, search, runtime, nsutil, http, error, nsauth)
{

	/**
	 * Post the data
	 * @param stRequest
	 * @param objConfig
	 * @returns arrIds
	 */
	function sendObjToURL(stRequest)
	{
		var restletUrl = 'http://initium-commerce-qa.apigee.net/v1/orderfulfillmentapi/salesorders';
		var method = "POST";
		//user token
		var token = {
			public: 'LmpW80OwXawD16lGAOaVo9Mvpdjm',
			secret: 'tlzEEyYHGuWAL2JS9KGZaPY3HPEZ'
		};

		//app credentials
		var oauth = nsauth.authenticate(
					{
						consumer :
						{
							public : 'N6cWeY9dXisHvuL3LpJUGYAVB34s1Huf',
							secret : 'txMhxaUZu8ByGBP9'
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

		var headerWithRealm = oauth.toHeader(oauth.authorize(request_data, token));
		headerWithRealm.Authorization += ',realm= " " ';

		//HTTP headers
        var headers = new Array();
        headers['Content-Type'] = 'application/json';
        headers['Authorization'] = headerWithRealm.Authorization;

		var objResponse = http.request({
			method: method,
			url: restletUrl,
			body: stRequest,
			headers: headers
		});

		return true;


//		var stLogTitle = 'scheduled_SyncInventoryItems.sendObjToURL';
//		log.debug(stLogTitle, '##  sending the request:' + stRequest);
//		log.debug(stLogTitle, '##  request params:' + JSON.stringify(objConfig));
//
//		//validate the config
//		var arrFldsConfig = ['url','email','password','account'];
//		arrFldsConfig.forEach(function(stFld){
//			if (NSUtil.isEmpty(objConfig[stFld]))
//			{
//				log.error('Invalid or missing config component: '+stFld);
//				throw error.create({
//					 name: '99999',
//					 message: 'Invalid or missing config component: '+stFld,
//					 notifyOff: false
//				});
//			}
//		});
//
//		//authorization
//		var arrNLAuth = [];
//		arrNLAuth.push("nlauth_account=" + objConfig.account);
//		arrNLAuth.push("nlauth_email=" + objConfig.email);
//		arrNLAuth.push("nlauth_signature=" + objConfig.password);
//		log.debug(stLogTitle, '##  arrNLAuth:' + arrNLAuth);
//
//		var objHeader = {};
//		objHeader['User-Agent-x'] = 'Suitescript-Call';
//		objHeader['Authorization'] = 'NLAuth ' + arrNLAuth.join(', ');
//		objHeader['Content-Type'] = 'application/json';
//
//		//post data
//		var objResponse = https.request({
//			method: https.Method.POST,
//			url: objConfig.url,
//			body: stRequest,
//			headers: objHeader
//		});
//
//		log.debug(stLogTitle, '##  response:' + JSON.stringify(objResponse));
//		//log.debug(stLogTitle, '##  response:' + JSON.stringify());
//		var objParseRes = null;
//		if (objResponse.code == '200')
//		{
//			var arrIds = JSON.parse(objResponse.body);
//			if (NSUtil.isEmpty(arrIds))
//			{
//				log.error('Unable to parse the response: ' + stResponse);
//				throw error.create({
//					 name: '99999',
//					 message: 'Unable to parse the response: ' + stResponse,
//					 notifyOff: false
//				});
//			}
//		}
//		else
//		{
//			log.error('Error requesting data: ' + objResponse.code);
//			throw error.create({
//				 name: '99999',
//				 message: 'Error requesting data: ' + objResponse.code,
//				 notifyOff: false
//			});
//		}
//
//		return arrIds;
	}

	function execute(context)
	{
		var logTitle = 'SendSalesOrder';
		var requestObj =
		{
			'salesOrders' : []
		};
		var LIMIT_remainingUsage = 200;
		var LIMIT_numItems = 20000;

		var listFieldsToSync =
		[
				'internalid', 'externalid', 'entity','tranid', 'otherrefnum', 'location', 'trandate', 'shipmethod', 'source',
				'billaddressee', 'billaddr1', 'billaddr2', 'billcity', 'billstate', 'billzip','billcountry', 'billphone',
				'shipaddressee', 'shipaddr1', 'shipaddr2', 'shipcity', 'shipstate', 'shipzip', 'shipcountry', 'shipphone'
		];

		var arrTextFields = ['location','entity'];

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
			var searchId = runtime.getCurrentScript().getParameter('custscript_ss2_sendso_savedsearch');
			if (nsutil.isEmpty(searchId))
			{
				throw "Missing search ID";
			}

			// reset the request Object
			var requestObj = {'salesOrders' : [] };
			var searchResults = search.load({id : searchId}).run();

			log.debug(logTitle, '** Seasrch Results: ' + searchResults.length);

			searchResults.each(
				function(result){
					var salesOrderObj = {}, BillAddr = null, ShipAddr = null;

					// load the sales order
					var recSalesOrder = record.load(
					{
						type : record.Type.SALES_ORDER,
						id : result.id
					});
					log.debug(logTitle,'.. loading the sales order');

					// add the fields
					listFieldsToSync.forEach(function(fieldId)
					{
						var fieldValue = null;

						if ( fieldId == 'internalid')
						{
							fieldValue = result.id;
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

						if (!fieldValue)
						{
							if (nsutil.inArray(fieldId,arrTextFields) )
							{
								fieldValue = recSalesOrder.getText({fieldId : fieldId});
							}
							else
							{
								fieldValue = recSalesOrder.getValue({fieldId : fieldId});
							}
						}

						if (!fieldValue)
						{
							if (nsutil.inArray(fieldId,arrTextFields) )
							{
								fieldValue = result.getText({'name':fieldId});
							}
							else
							{
								fieldValue = result.getValue({'name':fieldId});
							}


						}

						salesOrderObj[fieldId] = fieldValue || '';
						if (!fieldValue)
						{
							log.debug(logTitle,'fieldId: ' + fieldId + '   Value: ' + fieldValue);
						}
					});

					// add the lines
					salesOrderObj.items = [];

					var lineCount = recSalesOrder.getLineCount(
					{
						sublistId : 'item'
					});
					for (var line = 0; line <= lineCount; line ++)
					{
						var lineData = false;
						listLineitemFieldsToSync.forEach(function(lineField)
						{
							var lineValue = recSalesOrder.getSublistValue(
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

								log.debug(logTitle, '..itemField/Value' + JSON.stringify([itemField, CACHE[cacheKey][itemField]]) );

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
							salesOrderObj.items.push(lineData);
						}
					}
					log.debug('process_result', '..adding sales order: ' + JSON.stringify(salesOrderObj));

					// then attach it to the main request
					requestObj.salesOrders.push(salesOrderObj);

					// then update this record
					record.submitFields(
					{
						type : record.Type.SALES_ORDER,
						id : result.id,
						values :
						{
							'custbody_sent_to_apigee' : true
						}
					});

					// get the governance
					var remainingUsage = runtime.getCurrentScript().getRemainingUsage();
					log.debug('process_result', '##Remaining Usage: ' + remainingUsage);

					return (remainingUsage >= LIMIT_remainingUsage && requestObj.salesOrders.length < LIMIT_numItems);
			});


			// send this to the url//
			log.debug(logTitle, 'JSON request: ' + JSON.stringify(requestObj));

			sendObjToURL( JSON.stringify(requestObj) );

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