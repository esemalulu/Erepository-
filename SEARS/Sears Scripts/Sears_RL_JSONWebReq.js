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



/**
 * @param {Object} dataIn Parameter object
 * @returns {Object} Output object
 */
function post_JSONWebRequests(objRequest)
{
	var objResponse = {};
	var execType = CONTEXT.getExecutionContext();
	var logTitle = ['POST::JSONReqSalesOrder', execType].join(':');

	var NOWTIME = new Date();
	var START_TIME = NOWTIME.getTime();

	try
	{
		if ( Helper.isEmpty(objRequest))
		{
			objResponse.errorMessage = 'Empty Request (1)';
			return false;

		}
		// get the key for this record //
		for (var strRequestType in objRequest);
		var strDateReceived = nlapiDateToString(NOWTIME, 'datetimetz');

		nlapiLogExecution('DEBUG', logTitle, '*** START *** ' + [strRequestType, strDateReceived].join(' : '));

		if ( Helper.isEmpty(objRequest[strRequestType]))
		{
			objResponse.errorMessage = 'Empty Request (2)';
			return false;
		}

		var listRequestData = objRequest[strRequestType];
		if (Helper.isEmpty(listRequestData) )
		{
			objResponse.errorMessage = 'Empty Request list';
			return false;
		}

		nlapiLogExecution('DEBUG', logTitle, 'Total number of request: ' + listRequestData.length);

		while (listRequestData.length)
		{
			var requestData = null, customerId = null, transferOrderId=null;
			while (requestData = listRequestData.shift())
			{
				if (Helper.isEmpty(requestData) || Helper.isEmpty(requestData.recordtype))
				{
					continue;
				}

				if (customerId && requestData.recordtype != 'customer')
				{
					requestData['customer_jsonid'] = customerId;
				}

				if (transferOrderId && requestData.recordtype != 'transferorder')
				{
					requestData['transferorder_jsonid'] = customerId;
				}

				nlapiLogExecution('DEBUG', logTitle, '.. adding new record:' + JSON.stringify([requestData.recordtype, requestData]));

				// create the custom record
				var recWebRequest = nlapiCreateRecord('customrecord_json_webrequest');
				recWebRequest.setFieldValue('custrecord_jsonreq_type', 'SalesOrderRequest');
				recWebRequest.setFieldValue('custrecord_jsonreq_content', JSON.stringify(requestData));
				recWebRequest.setFieldValue('custrecord_jsonreq_status', 1); // PENDING
				recWebRequest.setFieldValue('custrecord_jsonreq_received', strDateReceived);
				recWebRequest.setFieldValue('custrecord_jsonreq_recordtype', requestData.recordtype);

				var id = nlapiSubmitRecord(recWebRequest);
				nlapiLogExecution('DEBUG', logTitle, '.. new record:' + id);

				if (requestData.recordtype == 'customer')
				{
					customerId = id;
				}
				else if (requestData.recordtype == 'transferorder')
				{
					transferOrderId = id;
				}
			}
		}

		// trigger the sales order //
		var status = nlapiScheduleScript('customscript_sears_ss_jsonreq_salesorder', 'customdeploy_sears_ss_jsonreq_salesorder');
		nlapiLogExecution('DEBUG', logTitle, 'Status: ' +status);

		// trigger the itemff//
		var status = nlapiScheduleScript('customscript_sears_ss_jsonreq_salesorder', 'customdeploy3');
		nlapiLogExecution('DEBUG', logTitle, 'Status: ' +status);

		objResponse.success = true;
	}
	catch (error)
	{
		objResponse.errorCode = '100';

		if (error.getDetails != undefined)
		{
			objResponse.errorCode = error.getCode();
			objResponse.errorMessage = error.getDetails()
			//nlapiLogExecution('ERROR', 'Process Error: ' + logTitle, error.getCode() + ': ' + error.getDetails());
			//throw error;
		}
		else
		{
			objResponse.errorCode = error.getCode();
			objResponse.errorMessage = error.toString();
			//nlapiLogExecution('ERROR', 'Unexpected Error: ' + logTitle, error.toString());
			//throw nlapiCreateError('99999', error.toString());
		}
	}
	finally
	{
		var DELTA = ( (new Date()).getTime() - START_TIME ) / 1000;
		nlapiLogExecution('DEBUG', logTitle, 'ReSPONSE: ' + JSON.stringify(objResponse));
		nlapiLogExecution('AUDIT', logTitle, '*** END SCRIPT: ' +DELTA+ 'secs');

	}
	return objResponse;
}


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