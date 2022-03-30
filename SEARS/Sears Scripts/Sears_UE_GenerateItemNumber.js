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
 * 1.00       04 May 2016     bfeliciano
 *
 */
var CONTEXT = nlapiGetContext();
var _CACHE = {};

/**
 * The recordType (internal id) corresponds to the "Applied To" record in your script deployment.
 * @appliedtorecord recordType
 *
 * @param {String} type Operation types: create, edit, delete, xedit
 *                      approve, reject, cancel (SO, ER, Time Bill, PO & RMA only)
 *                      pack, ship (IF)
 *                      markcomplete (Call, Task)
 *                      reassign (Case)
 *                      editforecast (Opp, Estimate)
 * @returns {Void}
 */
function beforeSubmit_GenerateItemNumber(type)
{
	try
	{
		var execType = CONTEXT.getExecutionContext();
		var logTitle = ['GenerateItemNo', type, execType].join(':');
		nlapiLogExecution('DEBUG', logTitle, '** START EXECUTION: ' + JSON.stringify([type, execType]));

		if (! Helper.inArray(type, ['create','copy']))
		{
			return true;
		}

		if (! Helper.inArray(execType, ['userinterface','csvimport','webservices','suitelet']))
		{
			return true;
		}

		var paramSearchID = CONTEXT.getSetting('SCRIPT', 'custscript_get_last_itemno');
		if (Helper.isEmpty(paramSearchID))
		{
			throw "Missing script parameter: ";
		}

		var lastNumber = '10000000';

		var arrSearchResults = nlapiSearchRecord(null, paramSearchID);

		if (arrSearchResults && arrSearchResults.length)
		{
			lastNumber = arrSearchResults[0].getValue('itemid', null, 'MAX');
			nlapiLogExecution('DEBUG', logTitle, '-- Last Number: ' + lastNumber);
		}

		var intlastNumber = parseFloat( lastNumber || '0');
		var nextNumber = intlastNumber+1;

		nlapiLogExecution('DEBUG', logTitle, '-- Next Number: ' + lastNumber.toString);

		nlapiSetFieldValue('itemid', nextNumber.toString());

		return true;
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
	}

}


//////////////////////////////////////////////////////////////////////////////////////////////////
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
		usageReport.remainingUsage = CONTEXT.getRemainingUsage();
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

	formatDateYYYYMMDD : function(date)
	{
		var yyyy = date.getFullYear().toString();
		var yy = yyyy.substr(2);
		var MM = (date.getMonth() + 1).toString();
		if (MM.length == 1)
		{
			MM = '0' + MM;
		}
		var dd = date.getDate().toString();
		if (dd.length == 1)
		{
			dd = '0' + dd;
		}
		return yyyy + MM + dd;
	},
	formatDateYYMMDD : function(date)
	{
		var yyyy = date.getFullYear().toString();
		var yy = yyyy.substr(2);
		var MM = (date.getMonth() + 1).toString();
		if (MM.length == 1)
		{
			MM = '0' + MM;
		}
		var dd = date.getDate().toString();
		if (dd.length == 1)
		{
			dd = '0' + dd;
		}
		return yy + MM + dd;
	},
	getTimeHHMM: function (date) {
	    var hh = date.getHours().toString();
	    if (hh.length == 1){hh = '0' + hh;}
	    var mm = date.getMinutes().toString();
	    if (mm.length == 1){mm = '0' + mm;}
	    return hh + mm;
	},
	getTimeHHMMSS: function (date) {
	    var hh = date.getHours().toString();
	    if (hh.length == 1){hh = '0' + hh;}
	    var mm = date.getMinutes().toString();
	    if (mm.length == 1){mm = '0' + mm;}
	    var ss = date.getSeconds().toString();
	    if (ss.length == 1){ss = '0' + ss;}
	    return hh + mm + ss;
	}
};