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
 * @NApiVersion 2.x
 * @NModuleScope Public
 * @NScriptType MapReduceScript
 */
define(['N/record', 'N/search', 'N/runtime', 'N/http', './Sears Scripts/NSUtil', './Sears Scripts/oauthv2','./Sears Scripts/LibJsonRequest', 'N/error'],
/**
 * @param {record} record
 * @param {search} search
 * @param {runtime} runtime
 * @param {http} http
 * @param {Object} nsutil
 * @param {oauth} oauthv2
 * @param {jsonrequest} Libjsonrequest
 * @param {error} errorHandling
 */
function(NSRecord, NSSearch, NSRuntime, NSHttp, NSUtil, NSAuth, LibJsonRequest,NSError) {	
	var EndPoint = {}, CACHE = {}, Helper = {}, PARAM = {};
	var startTime = (new Date()).getTime();

	/**
    * @memberOf EndPoint
    */
    EndPoint.getInputData = function () {
    	try{
    		var currentScript = NSRuntime.getCurrentScript();
    		var logTitle = 'INPUTDATA';
    		var startUsage = currentScript.getRemainingUsage();
    		var deltaTime = (new Date()).getTime() - startTime;
            log.debug(logTitle, '**START SCRIPT**: ' +deltaTime);

            Helper.getScriptParameters();

            if (NSUtil.isEmpty(PARAM.searchId)) {
				throw "Missing script parameter!" + JSON.stringify(PARAM);
			}

			var arrOrdersToProcess = [], arrPendingBatches = [];
			if ( PARAM.batchId){
				// To-Do

			}else{
				arrOrdersToProcess = Helper.getPendingOrders(PARAM.searchId);
			}

			return arrOrdersToProcess;
    	}catch(error){
			log.error('ERROR', error.toString());
			throw error.toString();
		}finally{
			var duration = (new Date()).getTime() - startTime;
			var remainingUsage = currentScript.getRemainingUsage();

			log.audit('END SCRIPT', '## END SCRIPT ## :' + JSON.stringify({runtime: duration, usage: [remainingUsage,startUsage]}) );
		}
    };

    /**
    * @param OrderIds
    * @memberOf EndPoint
    */
    EndPoint.reduce = function (reduceContext) {
    	try{
    		var currentScript = NSRuntime.getCurrentScript();
    		var logTitle = "REDUCE";
    		var arrSendtoWMS = {};
    		reduceContext.values.forEach(function(contextValue){
    			var orderId = JSON.parse(contextValue);
                
				var recObj = Helper.loadRecord({type:'salesorder', id:orderId});
			
				var arrHeaderData = Helper.extractHeaderData(recObj);
				var arrLineData = Helper.extractLineData(recObj);

				log.debug(logTitle, 'Order Header Data: ' + JSON.stringify(arrHeaderData));
				log.debug(logTitle, 'Order Line Data: ' + JSON.stringify(arrLineData));

				for (var locationId in arrLineData) {
					log.debug("for debugging","Location Id:"+locationId);
					var locationData = arrLineData[locationId];

					if (!arrSendtoWMS[locationId]) {
						arrSendtoWMS[locationId] = {salesOrders:[]};
					}

					var orderData = JSON.parse( JSON.stringify(arrHeaderData) );

					orderData.location = locationData.name;
					if(NSUtil.isEmpty(locationData.name)){
						//log.debug(logTitle, '**Location In: ' + locationData.name);
						orderData.location = locationData.lines[0] ? locationData.lines[0].location_display :locationData.name;
					}
					//log.debug(logTitle, '**Location Out ' + locationData.name);
					orderData.items = locationData.lines;

					orderData.shipdate = locationData.lines[0] ? locationData.lines[0].custcol_ship_date : '';
					arrSendtoWMS[locationId].salesOrders.push(orderData);
				}
    		});
			log.debug(logTitle, 'OrdersSendtoWMS: ' + JSON.stringify(arrSendtoWMS));
			for (var loc_id in arrSendtoWMS) {
				var url = (PARAM.locationSCI == loc_id)  ? PARAM.urlSCI : PARAM.urlLogfire;
				var requestData = arrSendtoWMS[loc_id].salesOrders;
						
				if (requestData) {
					// ADD CMARGALLO 11/3 END
					requestData = {'salesOrders': requestData};

					log.audit(logTitle, '** REQUEST: location:' + loc_id);
					log.audit(logTitle, '** REQUEST: url:' + url);
					log.audit(logTitle, '** REQUEST: Data:' + JSON.stringify(requestData));

					//var response = Helper.sendToWMS(JSON.stringify(requestData), url);
					//log.audit(logTitle, '** RESPONSE: ' + JSON.stringify(response));

					arrSendtoWMS[loc_id].response = response;
				}
			}

    	}catch(error){
			log.error('ERROR', error.toString());
			throw error.toString();
		}finally{
			var duration = (new Date()).getTime() - startTime;
			var remainingUsage = currentScript.getRemainingUsage();

			log.audit('END SCRIPT', '## END SCRIPT ## :' + JSON.stringify({runtime: duration, usage: [remainingUsage,startUsage]}) );
		}
    };


    /**
    * get the script parameters
    * @memberOf Helper
    */
    Helper.getScriptParameters = function ()
    {
        var logTitle = 'Helper.getScriptParameters';
        var paramFlds = {
                			searchId: 'custscriptcustomscript_wms_p_savedsearch',
                			urlLogfire: 'custscript_ss2_sendso_bigurl',
							urlSCI: 'custscript_ss2_sendso_regurl',
							locationSCI : 'custscript_ss2_sendso_sci_location'
        				};
        for (var fld in paramFlds)
        {
            PARAM[fld] = NSRuntime.getCurrentScript().getParameter(paramFlds[fld]);
        }
        
        log.debug(logTitle, '>> Parameters:  ' + JSON.stringify(PARAM));

        return true;
    };

    /**
    * Get pending order ids
    * @param search id
	* @memberOf Helper
	*/
	Helper.getPendingOrders = function (searchId) {
		var logTitle = 'Helper.getPendingOrders';
		var orders = [];
		var arrSearchResults = NSUtil.searchAll({id:searchId, maxResults: 4});
		//log.debug(logTitle, 'Search Result : ' + JSON.stringify(arrSearchResults) );
		var scriptObj = NSRuntime.getCurrentScript();
                      
		if (arrSearchResults && arrSearchResults.length) {
			for (var i=0; i<arrSearchResults.length; i++) {
				var internalId = arrSearchResults[i].getValue({name:'internalid'});
				//log.debug(logTitle, 'Internal Id : ' +internalId);
				if (!NSUtil.inArray(internalId, orders)) {
					orders.push(internalId);
				}
			}
		}

		log.debug(logTitle, 'ORDERS: ' + JSON.stringify(orders) );
		return orders;
	}

	/**
	* @param Record Object
	* @memberOf Helper
	*/
	Helper.extractHeaderData = function (recObj) {
		var objRecordData = {};

		var arrListFieldsToSync = [
									'internalid', 'externalid', 'entity','tranid', 'otherrefnum', 'location', 'trandate','shipmethod', 'source',
									'billaddressee', 'billaddr1', 'billaddr2', 'billcity', 'billstate', 'billzip','billcountry', 'billphone',
									'shipaddressee', 'shipaddr1', 'shipaddr2', 'shipcity', 'shipstate', 'shipzip', 'shipcountry', 'shipphone',
									'custbody_phone_shipping','custbody_phone_billing','custbody_phone_wms','custbody_gift_message',
									'custbody_loyalty_number','custbody_email','custbody_email_opt_in','custbody_ship_to_store','email',
									'otherrefnum'
								  ];

		var arrTextFields = ['location','entity','shipmethod'];

		var objBillAddrFields = {
									'billaddressee' : 'addressee',
									'billaddr1' : 'addr1',
									'billaddr2' : 'addr2',
									'billcity' : 'city',
									'billstate' : 'state',
									'billzip' : 'zip',
									'billcountry' : 'country',
									'billphone' : 'phone',
			         			};

		var objShipAddrFields = {
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

			if (fieldId == 'internalid') {
				objFieldValue = recObj.id;
			}else if (fieldId.match(/phone/i)) {
				objFieldValue = recObj.getValue({fieldId : fieldId});
				if (objFieldValue) {
					objFieldValue = objFieldValue.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3');
				}
			}else if (objBillAddrFields[fieldId] || objShipAddrFields[fieldId]) {
				var addressId = null, addressField = null;
				if (objBillAddrFields[fieldId]) {
					addressId = recObj.getValue({fieldId : 'billingaddress'});
					addressField = objBillAddrFields[fieldId];
				}else if (objShipAddrFields[fieldId]) {
					addressId = recObj.getValue({fieldId : 'shippingaddress'});
					addressField = objShipAddrFields[fieldId];
				}if (addressId) {
					var cacheKey = ['address', addressId].join('::');
					if (CACHE[cacheKey] == null) {
						CACHE[cacheKey] = Helper.loadRecord({type:'address',id:addressId});
					}
							
					if (CACHE[cacheKey]){
						objFieldValue = CACHE[cacheKey].getValue({fieldId:addressField});
					}
				}
			}

			if (!objFieldValue) {
				if (NSUtil.inArray(fieldId,arrTextFields) ) {
					objFieldValue = recObj.getText({fieldId : fieldId});
				}else {
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
	Helper.loadRecord = function (option) {
		var logTitle = 'Helper.loadRecord';
		var cacheKey = ['Helper.loadRecord', option.type, option.id].join(':');

		if (CACHE[cacheKey] == null ){
			CACHE[cacheKey] = NSRecord.load(option);
			if (!CACHE[cacheKey]){
				CACHE[cacheKey] = false;
			}
		}

		return CACHE[cacheKey];
	};

	/**
	* @param record object
	* @memberOf Helper
	*/
	Helper.extractLineData = function (recObj) {
		//log.debug('extractLineData', JSON.stringify(recObj));
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

		for (var line = 0; line < lineCount; line ++){
			var lineData = {};
			lineData.line = line;
			
			var lineItemType = recObj.getSublistValue({sublistId : 'item',fieldId : 'itemtype',line : line});
			var lineItem = recObj.getSublistValue({sublistId : 'item',fieldId : 'item',line : line});
			var lineIsFulfillable = recObj.getSublistValue({sublistId : 'item',fieldId : 'custcol_isfulfillable',line : line});
			var lineLocation = recObj.getSublistValue({sublistId : 'item',fieldId : 'location',line : line});
			var lineLocationText = recObj.getSublistText({sublistId : 'item',fieldId : 'location',line : line});
			var lineItemExternalId = recObj.getSublistValue({sublistId : 'item',fieldId : 'custcol_externalid',line : line});
			var lineLocationAutoAssigned = recObj.getSublistValue({sublistId : 'item',fieldId : 'locationautoassigned',line : line});
			var lineLocationDoNotAutoAssigned = recObj.getSublistValue({sublistId : 'item',fieldId : 'noautoassignlocation',line : line});
			var lineQuantityBackOrderd = recObj.getSublistValue({sublistId : 'item',fieldId : 'quantitybackordered',line : line});
			var locale = recObj.getText({fieldId:'custbody_locale'});
			//log.debug('line filters', JSON.stringify([lineItemType, lineIsFulfillable, lineLocation, lineItemExternalId, lineQuantityBackOrderd]));
			if(! (lineItemType == 'InvtPart' || (lineItemType == 'Service' && lineIsFulfillable)) || NSUtil.isEmpty(lineLocation) || NSUtil.forceFloat(lineQuantityBackOrderd) > 0 ) {
				//log.debug('Skipping Line', line);
				continue;
			}
				
			arrListLineitemFieldsToSync.forEach(function(lineField) {
				var lineValue = recObj.getSublistValue({sublistId : 'item',fieldId : lineField,line : line});
				if (lineValue) {
					if (lineField == 'custcol_searsitemname' && (locale == 'en_CA' || locale == '')) {
						lineData['item'] = lineValue;
						//log.debug('englishlocale', lineValue);
					}else if (lineField == 'custcolfrench_item_desc' && locale == 'fr_CA') {
						lineData['item'] = lineValue;
						//log.debug('frenchlocale', lineValue);
					}else if (lineField == 'itemid') {
						lineData['item_itemid'] = lineValue;
					}else if (lineField == 'item') {
						lineData['iteminternalid'] = lineValue;
					}else{
						lineData[lineField] = lineValue;
					}
				}
			});
			lineData['location_display'] = lineLocationText;

			var lineItemData = NSSearch.lookupFields({type:'item',id:lineItem, columns:['externalid','itemid']});
			//log.debug('lookupItems', JSON.stringify(lineItemData));
			var itemExternalId =lineItemData['externalid'];
			var itemItemId =lineItemData['itemid'];
			if(itemExternalId != undefined && itemExternalId != ''){
				lineData['externalid'] = itemExternalId;
			}else if (itemItemId != undefined && itemItemId != '') {
				lineData['itemid'] = itemItemId;
			}

			/*var cacheKey = ['itemdata', lineItem].join(':');
			if (CACHE[cacheKey] == null ) {
				CACHE[cacheKey] = NSSearch.lookupFields({type:'item',id:lineItem, columns:arrListItemFieldsToSync});
			}
			
			var lineItemData = CACHE[cacheKey];
			log.debug('lookupItems', JSON.stringify(lineItemData));
			log.debug('lookupItems_2', JSON.stringify(NSSearch.lookupFields({type:'item',id:lineItem, columns:arrListItemFieldsToSync})));
			arrListItemFieldsToSync.forEach(function(itemField){
				var itemValue =lineItemData[itemField];
				log.debug('lookupItems-itemValue', JSON.stringify([itemField, itemValue]));
				if (itemField == 'externalid') {

					lineData['itemid'] = itemValue[0].value || itemValue.value || itemValue;
				}else{
					lineData[itemField] = itemValue;
				}
				return true;
			});*/

			if (! objLineData[lineLocation] ) objLineData[lineLocation] = {name:lineLocationText, lines:[]};
				objLineData[lineLocation].lines.push(lineData);
			}

			return objLineData;
		};

		/**
		* @param Request json
		* @param url
		* @memberOf Helper
		*/
		Helper.sendToWMS = function(stRequest, stURL) {
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

			try{
				if (! stRequest ) throw "Empty request data";

				var stTokenAuthSettings = NSRuntime.getCurrentScript().getParameter({name:'custscript_ss2_param_token_settings'});
				stTokenAuthSettings = stTokenAuthSettings.replace(/\"\"/g, '"');
				stTokenAuthSettings = stTokenAuthSettings.replace(/\"\{/g, '{');
				stTokenAuthSettings = stTokenAuthSettings.replace(/\}\"/g, '}');
				var arrTokenAuth = JSON.parse(stTokenAuthSettings);
				//log.debug(logTitle, '>>arrTokenAuth: ' + JSON.stringify(arrTokenAuth));
				if (!arrTokenAuth) {
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

				/*var objOauth_data = {
										objOauth_consumer_key: objOauth.consumer.public,
										objOauth_nonce: objOauth.getNonce(),
										objOauth_signature_method: objOauth.signature_method,
										objOauth_timestamp: objOauth.getTimeStamp(),
										objOauth_version: '1.0',
										objOauth_token: objToken.public
									};*/

				var objHeaderWithRealm = objOauth.toHeader(objOauth.authorize(objRequestData, objToken));
				objHeaderWithRealm.Authorization += ',realm= " " ';
				log.debug(logTitle, '>> nsauth: ' + JSON.stringify([objHeaderWithRealm]));				

				//HTTP headers
				var objHeaders = new Array();
				objHeaders['Content-Type'] = 'application/json';
				objHeaders['Authorization'] = objHeaderWithRealm.Authorization;

				var objResponse = null;

				try {
					log.audit('### sendObjToURL: Request', '### PAYLOAD Size: ' + stRequest.length + ' chars  ###');
					returnResult.TIME_START  = new Date();

					objResponse = NSHttp.request({
						method: 'POST',
						url: stURL,
						body: stRequest,
						headers: objHeaders
					});
					returnResult.TIME_END = new Date();
					returnResult.DELTA_TIME = returnResult.TIME_END - returnResult.TIME_START;

					if (objResponse) {
						returnResult.SENT_TO_WMS = true;
						returnResult.CODE = objResponse.code;
						returnResult.RESPONSE =  objResponse.body;

						if ( objResponse.code != 200) {
							returnResult.ERROR_CODE = objResponse.code;
							returnResult.ERROR_MSG = HTTP_ERROR_CODES[objResponse.code] || objResponse.body;
						}
					}
				}
				catch (wmserr) {
					log.error(logTitle, 'catch (wmserr) : ' + wmserr.toString() );

					returnResult.CODE          = returnResult.CODE || 'E120';
					returnResult.ERROR_CODE    = returnResult.ERROR_CODE || 'E120';
					returnResult.ERROR_RAWMSG  = returnResult.ERROR_RAWMSG || JSON.stringify(wmserr);
					returnResult.ERROR_MSG     = returnResult.ERROR_MSG || wmserr.toString();
				}
			}
			catch(error) {
				log.error(logTitle, 'catch (error) : ' + error.toString() );

				returnResult.CODE          = returnResult.CODE || 'E120';
				returnResult.ERROR_CODE    = returnResult.ERROR_CODE || 'E120';
				returnResult.ERROR_RAWMSG  = returnResult.ERROR_RAWMSG || JSON.stringify(error);
				returnResult.ERROR_MSG     = returnResult.ERROR_MSG || error.toString();
			}

			log.audit(logTitle, JSON.stringify(returnResult));
			return returnResult;
		};


    return EndPoint;
});
