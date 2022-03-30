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
 */

/**
 * @NApiVersion 2.x
 * @NModuleScope Public
 * @NScriptType ScheduledScript
 * @NScriptName NS | SS Send Returns Big Tick (v2.0)
 * @NScriptType _sears_ss2_send_returns2
 */

define(['N/record', 'N/search', 'N/runtime', './NSUtil','N/http', 'N/error','./oauthv2'],

/**
 * @param {record} record
 * @param {search} search
 * @param {runtime} runtime
 * @param {nsutil} nsutil
 * @param {http} http
 * @param {error} error
 * @param {nsauth} nsauth
 */
function(record, search, runtime, nsutil, http, error, nsauth)
{

	/**
	 * Post the data
	 * @param stRequest
	 * @param stURL
	 * @returns arrIds
	 */
	function sendObjToURL(stRequest, stURL)
	{
		var stMethod = "POST";
		var stTokenAuthSettings = runtime.getCurrentScript().getParameter({name:'custscript_ss2_param_token_settings'});
		var arrTokenAuth = JSON.parse(stTokenAuthSettings);

		if (!arrTokenAuth)
		{
			log.error('sendObjToURL', 'Invalid Token Settings!' + JSON.stringify([stTokenAuthSettings,arrTokenAuth]));
			throw 'Invalid Token Settings!';
		}

		//user objToken
		var objToken = {
			public: arrTokenAuth.TOKEN_KEY,
			secret: arrTokenAuth.TOKEN_SECRET
		};

		//app credentials
		var objOauth = nsauth.authenticate({
			consumer :
			{
				public : arrTokenAuth.CONSUMER_KEY,
				secret : arrTokenAuth.CONSUMER_SECRET
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

		var objResponse = http.request({
			method: stMethod,
			url: stURL,
			body: stRequest,
			headers: objHeaders
		});

		return objResponse;

	}


	function updateTransactionFlag(arrIds, bBigReqSuccess, bRegReqSucess)
	{
		var stLogTitle = 'updateTransactionFlag';

		log.debug(stLogTitle, 'arrIds =' + arrIds + ' | bBigReqSuccess = ' + bBigReqSuccess + ' | bRegReqSucess = '+ bRegReqSucess);

		for(var intCtr = 0; intCtr < arrIds.length; intCtr++){

			var stId = arrIds[intCtr];

			// load the transaction
			var recReturns = record.load(
			{
				type : record.Type.RETURN_AUTHORIZATION,
				id : stId
			});

			// get the line count
			var intLineCount = recReturns.getLineCount(
			{
				sublistId : 'item'
			});

			log.debug(stLogTitle, 'Updated stId = ' + stId + ' | intLineCount  = ' + intLineCount);

			// loop line
			for (var intLine = 0; intLine < intLineCount; intLine ++)
			{

				var bIsBigDataVal = recReturns.getSublistValue(
				{
					sublistId : 'item',
					fieldId : 'custcol_bigticket',
					line : intLine
				});

				if(bIsBigDataVal && bBigReqSuccess)
				{
					recReturns.setSublistValue(
					{
						sublistId : 'item',
						fieldId : 'custcol_sent_to_apigee',
						value: true,
						line : intLine
					});
				}
				else if(!bIsBigDataVal && bRegReqSucess)
				{
					recReturns.setSublistValue(
					{
						sublistId : 'item',
						fieldId : 'custcol_sent_to_apigee',
						value: true,
						line : intLine
					});
				}

			}

			recReturns.save();
		}
	}

	function execute(context)
	{
		var stLogTitle = 'SendReturns';

		var intRemainingUsage  = 3000;
		var intNumItemsLimit = 20000;

		var arrListFieldsToSync =
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

		var arrListLineitemFieldsToSync =
		[
				'item','item_display', 'displayname', 'description', 'rate', 'quantity', 'amount'
		];

		var arrListItemFieldsToSync =
		[
				'externalid'
		];

		try
		{
			log.audit(stLogTitle, '## Start ##');

			var CACHE = {};
			// script parameter
			var stSearchId = runtime.getCurrentScript().getParameter('custscript_ss2_sendra_savedsearch2');
			var stRegularTicketURL  = runtime.getCurrentScript().getParameter('custscript_ss2_sendreturn_regurl');
			var stBigTicketURL  = runtime.getCurrentScript().getParameter('custscript_ss2_sendreturn_bigurl');

			if (nsutil.isEmpty(stSearchId) || nsutil.isEmpty(stRegularTicketURL) || nsutil.isEmpty(stBigTicketURL))
			{
				throw "Missing search ID";
			}

			// reset the request Object
			var objRegRequest = {'returnAuthorizations' : [] };
			var objBigRequest = {'returnAuthorizations' : [] };

			var arrIds = [];

			var arrSearchResults = search.load({id : stSearchId}).run();

			//Loop objResults
			arrSearchResults.each(function(objResult){
	            var objRegReturns = {};
	            var objBigReturns = {};

				log.debug(stLogTitle, 'objResult: ' + JSON.stringify(objResult));

				var stId = objResult.getValue({
					name: 'internalid',
					summary : 'GROUP'
				});

				//pushIds
				arrIds.push(stId);

				// load the transaction
				var recReturns = record.load(
				{
					type : record.Type.RETURN_AUTHORIZATION,
					id : stId
				});

				log.debug(stLogTitle,'.. loading the transaction..');

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
							addressId = recReturns.getValue(
							{
								fieldId : 'billingaddress'
							});
							addressField = objBillAddrFields[fieldId];
						}
						else if (objShipAddrFields[fieldId])
						{
							addressId = recReturns.getValue(
							{
								fieldId : 'shippingaddress'
							});
							addressField = objShipAddrFields[fieldId];
						}

						log.debug(stLogTitle, '-->> address ID ' + addressId);
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
							objFieldValue = recReturns.getText({fieldId : fieldId});
						}
						else
						{
							objFieldValue = recReturns.getValue({fieldId : fieldId});
						}
					}

					objRegReturns[fieldId] = objFieldValue || '';
					objBigReturns[fieldId] = objFieldValue || '';

					if (!objFieldValue)
					{
						log.debug(stLogTitle,'fieldId: ' + fieldId + '   Value: ' + objFieldValue);
					}
				});

				// add the lines
				objRegReturns.items = [];
				objBigReturns.items = [];

				// get the line count
				var intLineCount = recReturns.getLineCount(
				{
					sublistId : 'item'
				});

				// loop line
				for (var line = 0; line <= intLineCount; line ++)
				{
					var lineData = false;

					var bProcessed = recReturns.getSublistValue(
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

					var bIsBigDataVal = recReturns.getSublistValue(
					{
						sublistId : 'item',
						fieldId : 'custcol_bigticket',
						line : line
					});

					arrListLineitemFieldsToSync.forEach(function(lineField)
					{
						var lineValue = recReturns.getSublistValue(
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

					arrListItemFieldsToSync.forEach(function(itemField){
						var itemId = recReturns.getSublistValue(
								{
									sublistId : 'item',
									fieldId : 'item',
									line : line
								});
						if ( itemId && itemId > 0)
						{
							var cacheKey = ['itemfield',itemField,itemId].join('::');
							if(CACHE[cacheKey]==null)
							{
								CACHE[cacheKey] = search.lookupFields({type:'item',id:itemId, columns:[ itemField ]});
							}

							log.debug(stLogTitle, '..itemField/Value' + JSON.stringify([itemField,cacheKey, CACHE[cacheKey], CACHE[cacheKey][itemField]]) );

							try {
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
							catch(err){}

						}
					});


					if (lineData)
					{
						if(bIsBigDataVal)
						{
							objBigReturns.items.push(lineData);
							log.debug('process_result', '..adding objBigReturns: ' + JSON.stringify(objBigReturns));
						}
						else
						{
							objRegReturns.items.push(lineData);
							log.debug('process_result', '..adding objRegReturns: ' + JSON.stringify(objRegReturns));
						}
					}
				}



				// attach it to the request..
				if(objBigReturns.items.length > 0)
				{
					objBigRequest.returnAuthorizations.push(objBigReturns);
				}

				if(objRegReturns.items.length > 0)
				{
					objRegRequest.returnAuthorizations.push(objRegReturns);
				}

				// get the governance
				var remainingUsage = runtime.getCurrentScript().getRemainingUsage();
				log.debug('process_result', '##Remaining Usage: ' + remainingUsage);

				return (remainingUsage >= intRemainingUsage  && (( objBigRequest.returnAuthorizations.length + objRegRequest.returnAuthorizations.length) < intNumItemsLimit));
			});


			// send this to the url//
			log.debug(stLogTitle, 'JSON objBigRequest: ' + JSON.stringify(objBigRequest));
			log.debug(stLogTitle, 'JSON objRegRequest: ' + JSON.stringify(objRegRequest));

			var bBigReqSuccess = false;
			var bRegReqSucess = false;
			var intRespCode = 200;

			if( objBigRequest.returnAuthorizations.length > 0 )
			{
				var objResponse = sendObjToURL( JSON.stringify(objBigRequest), stBigTicketURL);
				log.debug(stLogTitle, 'JSON Big Ticket Response: ' + JSON.stringify(objResponse));

				if(objResponse.code == intRespCode)
				{
					bBigReqSuccess = true;
				}

			}

			if( objRegRequest.returnAuthorizations.length > 0 )
			{
				var objResponse = sendObjToURL( JSON.stringify(objRegRequest), stRegularTicketURL);
				log.debug(stLogTitle, 'JSON Reg Ticket Response: ' + JSON.stringify(objResponse));

				if(objResponse.code == intRespCode)
				{
					bRegReqSucess = true;
				}
			}

			updateTransactionFlag(arrIds, bBigReqSuccess, bRegReqSucess);

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