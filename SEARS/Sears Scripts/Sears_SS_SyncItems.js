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
 * 1.00       06 May 2016     bfeliciano
 *
 */
var CACHE = {};
var CONTEXT = nlapiGetContext(), __LOGTITLE = 'cleanupInstallBase';

var PARAMFLDS = {'ssearch_items': 'custscript_itemsync_ssearch','config_json':'custscript_itemsync_configjson'}, PARAMVALUES = {};
var MAXLIMIT_ITEMS = 5;
var MAXLIMIT_USAGE = 500;
var MAXLIMIT_TIME = 1000 * 60 * 60 * 5; // 5mins

var FLDMAP_COLUMNS =
[
		'itemid', 'displayname', 'salesdescription', 'baseprice', 'type',
		'externalid','custitem_hazardous_material','custitem_marketingcopy'
];


/**
 * @param {String} type Context Types: scheduled, ondemand, userinterface, aborted, skipped
 * @returns {Void}
 */
function scheduled_SyncInventoryItems(type)
{
	var execType = CONTEXT.getExecutionContext();
	var logTitle = ['SyncInventoryItems', type, execType].join(':');
	var START_TIME = (new Date()).getTime();

	try
	{
		nlapiLogExecution('DEBUG', logTitle, '** START EXECUTION: ' + JSON.stringify([type, execType]));
		for (var paramfld in PARAMFLDS)
		{
			PARAMVALUES[paramfld] = CONTEXT.getSetting('SCRIPT', PARAMFLDS[paramfld]);
		}

		if ( !RESOURCE.validateParameters())
		{
			throw RESOURCE.errorMessages.join('\n');
			return false;
		}

		nlapiLogExecution('DEBUG', logTitle, '...parameters: ' + JSON.stringify(PARAMVALUES));

		var arrSearchItems = RESOURCE.searchUnsyncedItems();
		if (Helper.isEmpty(arrSearchItems) )
		{
			nlapiLogExecution('DEBUG', logTitle, '** No Items to Process** ');
			return true;
		}

		var objRequestItem = {};
		var arrItemList = [];
		var arrItemIds = [];

		objRequestItem.items = arrItemList;

		var searchRow = null, itemCount = 0;
		while (searchRow = arrSearchItems.shift())
		{
			var dataItem = {};
			dataItem.internalid = searchRow.getId();
			FLDMAP_COLUMNS.forEach(function(fld, idx){
				var itemValue = searchRow.getValue(fld);
				dataItem[fld] = itemValue || '';
			});

			arrItemList.push(dataItem);
			arrItemIds.push(searchRow.getId());

			itemCount++;
			var DELTA = (new Date()).getTime() - START_TIME;
			MAXLIMIT_USAGE+=5; // allocate usage for the submitfield //

			nlapiLogExecution('AUDIT', logTitle, '>>> Item Count / Max Items: ' + [itemCount, MAXLIMIT_ITEMS].join(' | '))
			nlapiLogExecution('AUDIT', logTitle, '>>> Delta Time / Max Timeout: ' + [DELTA, MAXLIMIT_TIME].join(' | '))


			if (itemCount >= MAXLIMIT_ITEMS ||
					MAXLIMIT_TIME <= DELTA ||
					Helper.checkGovernance(MAXLIMIT_USAGE))
			{
				break;
			}
		}
		nlapiLogExecution('DEBUG', logTitle, '...total items: ' + arrItemIds.length);

		// send to the outside URL
		var strRequest = JSON.stringify( objRequestItem );
		nlapiLogExecution('DEBUG', logTitle, '...sending the request: ' + strRequest);

		var objResponse = RESOURCE.sendRequest_nlAuth(strRequest);
		if (!objResponse)
		{
			throw RESOURCE.errorMessages.join('\n');
			return false;
		}

		nlapiLogExecution('DEBUG', logTitle, '...total updated items?: ' + objResponse && objResponse.length ? objResponse.length : 0);

		// update the item records //
		for (var i=0,j=objResponse.length; i<j; i++)
		{
			var itemId = objResponse[i];

			// get the record type //
			for (var ii=0,jj=objResponse.length; ii<jj; ii++)
			{
				var dataItem = arrItemList[ii];
				if (dataItem.internalid == itemId)
				{
					var itemType = Helper.toItemInternalId(dataItem.type);

					nlapiLogExecution('DEBUG', logTitle, '## Updating item data.. ' + JSON.stringify([itemType, itemId, dataItem]));

					nlapiSubmitField(itemType, itemId, 'custitem_synced', 'T');
					break;
				}
			}
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

		return true;
	}
	finally
	{
		var DELTA = ( (new Date()).getTime() - START_TIME ) / 1000;
		nlapiLogExecution('AUDIT', logTitle, '*** END SCRIPT: ' +DELTA+ 'secs');
		return true;
	}
}

var RESOURCE =
{
	errorMessages : [],
	validateParameters : function()
	{
		var reqdParams =
		[
				'ssearch_items', 'config_json'
		];
		var errorMsgs = [];

		reqdParams.forEach(function(paramfld)
		{
			if (Helper.isEmpty(PARAMVALUES[paramfld]))
			{
				errorMsgs.push('Missing required parameter: ' + PARAMFLDS[paramfld])
			}
		});

		var objConfig = JSON.parse( PARAMVALUES.config_json );
		if (! objConfig)
		{
			errorMsgs.push('Unable to parse config JSON: '  + [PARAMVALUES.config_json]);
		}
		else
		{
			PARAMVALUES.config_obj = objConfig;
		}

		if (errorMsgs.length)
		{
			return false;
		}

		return true;
	},

	searchUnsyncedItems : function()
	{
		var method = 'searchUnsyncedItems';
		var keyString =
		[
			method
		].join(':');

		nlapiLogExecution('DEBUG', 'searchUnsyncedItems', '## Search Unsyched Items');


		if (CACHE[keyString] == null)
		{

			var arrCols = [];
			FLDMAP_COLUMNS.map(function (itemfld){
				arrCols.push( new nlobjSearchColumn(itemfld));
			})

			var arrSearchResults = nlapiSearchRecord(null, PARAMVALUES.ssearch_items, null, arrCols);
//			var arrSearchResults = Helper.searchAllRecord(null, PARAMVALUES.ssearch_items);

			if (arrSearchResults && arrSearchResults.length)
			{
				CACHE[keyString] = arrSearchResults;
				nlapiLogExecution('DEBUG', 'searchUnsyncedItems', '..total results: ' + arrSearchResults.length);
			}
			else
			{
				nlapiLogExecution('DEBUG', 'searchUnsyncedItems', '..total: 0 results');
			}
		}


		return CACHE[keyString];
	},

	sendRequest_oAuth : function(url)
	{
//
//		// TODO: Settings on JSON script parameter
//		var remoteAccountID = '3657411';
//		var restletUrl = 'http://initium-commerce-dev.apigee.net/test/addcustomer';
//
//		// user token
//		var token =
//		{
//			public : '213d53a33ff67fffe0c22d1d9f8be012c07b501b80ebbaa6d9f18133ed24965e',
//			secret : '805c65675e0cea7fad102f66041bafad18b4fc49042eae8f4ba90cb60085e2ba'
//		};
//		// app credentials
//
//		var oauth = OAuth(
//		{
//			consumer :
//			{
//				public : '9ddccdb6c0abe4101c779e038412de40f4f35684e2dfc345c0992a8a42393d33',
//				secret : '94ebabe18567187008240c24ed701995fa7e1685da93993da7e9afb7e2203b3d'
//			},
//			signature_method : 'HMAC-SHA1'
//		});
//
//		var request_data =
//		{
//			url : restletUrl,
//			method : 'POST',
//			data : {}
//		};
//
//		var oauth_data =
//		{
//			oauth_consumer_key : oauth.consumer.public,
//			oauth_nonce : oauth.getNonce(),
//			oauth_signature_method : oauth.signature_method,
//			oauth_timestamp : oauth.getTimeStamp(),
//			oauth_version : '1.0',
//			oauth_token : token.public,
//			realm : remoteAccountID
//		};
//
//		var headerWithRealm = oauth.toHeader(oauth.authorize(request_data, token));
//		headerWithRealm.Authorization += ',realm="' + remoteAccountID + '"';
//
//		// HTTP headers
//		var headers = new Array();
//		headers['Content-Type'] = 'application/json';
//		headers['Authorization'] = headerWithRealm.Authorization;
//		// HTTP headers
//
//		// Setting up Datainput
//		var jsonobj =
//		{
//			"recordtype" : "customer",
//			"entityid" : "Jarek8 Tarko8",
//			"companyname" : "ABC Company",
//			"subsidiary" : "1",
//			"email" : "jtarko@email.com"
//		};
//
//		// Stringifying JSON
//		var myJSONText = JSON.stringify(jsonobj, replacer);
//
//		var restResponse = nlapiRequestURL(restletUrl, myJSONText, null, null, "POST");
//
//		var html = 'Calling: ' + restletUrl + '<br><br>' + 'Generated OAuth header:<br>' + headerWithRealm.Authorization + '<br><br>' + 'Response:<br>' + restResponse.getBody()
//		response.write(html);
//
//		/**
//		     OAuth oauth_signature="MgN1gZztYspNQXA576plPD14OWM%3D",
//		           oauth_version="1.0",
//		           oauth_nonce="207310548",
//		           oauth_signature_method="HMAC-SHA1",
//		           oauth_consumer_key="fvFwnmvurChjol7SZiF2pQ1oJ%2FceRV8vqA%2FrZtzLEo%3D",
//		           oauth_token="00076e1415667a6c555f5d43582134c87d6367ab456fd2",
//		           oauth_timestamp="1418647040",
//		           realm="000068"  *
//		 */
	},

	sendRequest_nlAuth : function(strRequest)
	{
		var logTitle = 'sendRequest_nlAuth';
		var objConfig = PARAMVALUES.config_obj;

		nlapiLogExecution('DEBUG', logTitle, '##  sending the request:' + strRequest);
		nlapiLogExecution('DEBUG', logTitle, '##  request params:' + JSON.stringify(objConfig)) ;

		// validate the config
		var arrFldsConfig = ['url','email','password','account'];
		var hasError = false;
		arrFldsConfig.forEach(function(fld){
			if (Helper.isEmpty( objConfig[fld]))
			{
				hasError = true;
				this.errorMessages.push('Invalid or missing config component: ' + fld);
				return false;
			}
		});
		if ( hasError )
		{
			this.errorMessages.push('Invalid or missing config component');
		}

		var arrNLAuth = [];
		arrNLAuth.push("nlauth_account=" + objConfig.account);
		arrNLAuth.push("nlauth_email=" + objConfig.email);
		arrNLAuth.push("nlauth_signature=" + objConfig.password);
		nlapiLogExecution('DEBUG', logTitle, '##  auth data:' + arrNLAuth.join(', '));

		var headers = {};
		headers['User-Agent-x'] = 'Suitescript-Call';
		headers['Authorization'] = 'NLAuth ' + arrNLAuth.join(', ');
		headers['Content-Type'] = 'application/json';

		var responseStr = null, responseObj = null;


		var response = nlapiRequestURL(objConfig.url, strRequest, headers, null, 'POST');
		nlapiLogExecution('DEBUG', logTitle, '##  response:' + JSON.stringify([response.getCode(), response.getBody()]) ) ;

		if ( response.getCode() == '200')
		{
			responseStr = response.getBody();
			responseObj = JSON.parse(responseStr);

			if (Helper.isEmpty(responseObj))
			{
				this.errorMessages.push('Unable to parse the response: ' + responseStr);
				return false;
			}

		}
		else
		{
			this.errorMessages.push('Error requesting data: ' + response.getCode());
		}

		return responseObj;

	}

};


// ////////////////////////////////////////////////////////////////////////////////////////////////
var Helper =
{
	/**
	 * Add ability for a search to return more than 1000 results
	 *
	 * @param {String} recordType
	 * @param {String} Search id
	 * @param {Array} search filters
	 * @param {Array} search columns
	 * @returns {nlobjSearchResults}
	 */
	searchAllRecord : function(recordType, searchId, searchFilter, searchColumns)
	{
		var arrSearchResults = [];
		var count = 1000, init = true, min = 0, max = 1000;

		var searchObj = false;

		if (searchId)
		{
			searchObj = nlapiLoadSearch(recordType, searchId);
			if (searchFilter)
			{
				searchObj.addFilters(searchFilter);
			}
			if (searchColumns)
			{
				searchObj.addColumns(searchColumns);
			}
		}
		else
		{
			searchObj = nlapiCreateSearch(recordType, searchFilter, searchColumns);
		}

		var rs = searchObj.runSearch();

		while (count == 1000)
		{
			var resultSet = rs.getResults(min, max);
			arrSearchResults = arrSearchResults.concat(resultSet);
			min = max;
			max += 1000;
			count = resultSet.length;
		}

		return arrSearchResults;
	},
	/**
	 * Evaluate if the given string or object value is empty, null or undefined.
	 *
	 * @param {String} stValue - string or object to evaluate
	 * @returns {Boolean} - true if empty/null/undefined, false if not
	 * @author bfelciano, mmeremilla
	 */
	isEmpty : function(stValue)
	{
		return ((stValue == null) || (stValue == undefined) ||
				( typeof stValue == 'string' && stValue == '') ||
				( typeof stValue == 'object' && (stValue.length == 0 || stValue.length == 'undefined')));
	},

	/**
	 * Evaluate if the given string is an element of the array
	 *
	 * @param {String} stValue - String value to find in the array
	 * @param {Array} arrValue - Array to be check for String value
	 * @returns {Boolean} - true if string is an element of the array, false if not
	 */
	inArray : function(stValue, arrValue)
	{
		var bIsValueFound = false;
		for (var i = 0; i < arrValue.length; i ++)
		{
			if (stValue == arrValue[i])
			{
				bIsValueFound = true;
				break;
			}
		}

		return bIsValueFound;
	},


	/**
	 * Checks governance then calls yield
	 *
	 * @param {Integer} myGovernanceThreshold
	 * @returns {Void}
	 * @author memeremilla
	 */
	lastRemainingUsage : 0,
	lastTimestamp : 0,
	checkGovernance : function(myGovernanceThreshold)
	{
		var context = nlapiGetContext();

		var usageReport = {};
		usageReport.remainingUsage = context.getRemainingUsage();
		usageReport.timestamp = (new Date()).getTime();

		usageReport.usage_delta = this.lastRemainingUsage ? usageReport.remainingUsage - this.lastRemainingUsage : usageReport.remainingUsage;
		usageReport.tstamp_delta = this.lastTimestamp ? this.lastTimestamp - usageReport.timestamp : 0;

		usageReport.threshold = myGovernanceThreshold;

		nlapiLogExecution('AUDIT', '###Usage Report###', JSON.stringify(usageReport));

		this.lastRemainingUsage = usageReport.remainingUsage;
		this.lastTimestamp = usageReport.timestamp;

		return (context.getRemainingUsage() < myGovernanceThreshold);
	},

	yieldScript: function ()
	{
		var state = nlapiYieldScript();
		if (state.status == 'FAILURE')
		{
			nlapiLogExecution("ERROR", "Failed to yield script, exiting: Reason = " + state.reason + " / Size = " + state.size);
			throw "Failed to yield script";
		}
		else if (state.status == 'RESUME')
		{
			nlapiLogExecution("AUDIT", "Resuming script because of " + state.reason + ".  Size = " + state.size);
		}

	},

	/**
	 * Convert item record type to its corresponding internal id (e.g. 'invtpart' to 'inventoryitem')
	 * @param {String} stRecordType - record type of the item
	 * @return {String} stRecordTypeInLowerCase - record type internal id
	 */
	toItemInternalId : function(stRecordType)
	{
		if (this.isEmpty(stRecordType))
	    {
	        throw nlapiCreateError('10003', 'Item record type should not be empty.');
	    }

	    var stRecordTypeInLowerCase = stRecordType.toLowerCase().trim();

	    switch (stRecordTypeInLowerCase)
	    {
	        case 'invtpart':
	            return 'inventoryitem';
            case 'description':
                return 'descriptionitem';
            case 'assembly':
                return 'assemblyitem';
            case 'discount':
                return 'discountitem';
            case 'group':
                return 'itemgroup';
            case 'markup':
                return 'markupitem';
            case 'noninvtpart':
                return 'noninventoryitem';
            case 'othcharge':
                return 'otherchargeitem';
            case 'payment':
                return 'paymentitem';
            case 'service':
                return 'serviceitem';
            case 'subtotal':
                return 'subtotalitem';
            case 'giftcert':
                return 'giftcertificateitem';
            case 'dwnlditem':
                return 'downloaditem';
            case 'kit':
                return 'kititem';
	        default:
	            return stRecordTypeInLowerCase;
	    }
	}
};