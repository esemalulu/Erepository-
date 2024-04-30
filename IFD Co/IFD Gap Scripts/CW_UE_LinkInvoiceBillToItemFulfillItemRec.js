nlapiLogExecution("audit","FLOStart",new Date().getTime());
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
 *
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       18 Jul 2016     cmartinez
 *
 */

/**
 * The recordType (internal id) corresponds to the "Applied To" record in your script deployment. 
 * @appliedtorecord recordType
 * 
 * @param {String} type Operation types: create, edit, delete, xedit,
 *                      approve, cancel, reject (SO, ER, Time Bill, PO & RMA only)
 *                      pack, ship (IF only)
 *                      dropship, specialorder, orderitems (PO only) 
 *                      paybills (vendor payments){
 * @returns {Void}
 */
function afterSubmit_linkInvoiceOrBill(type)
{
	try
	{
		var stLogTitle = 'afterSubmit_linkInvoiceOrBill';
		nlapiLogExecution('debug', stLogTitle, '<============== Script Entry ==============>');
		
		//If type is other than create, exit
		if(type != 'create') return;
		
		var stRecId = nlapiGetRecordId();
		var stRecType = nlapiGetRecordType();
		
		var stCreatedFrom = nlapiLookupField(stRecType, stRecId, 'createdfrom');
		
		//If Created From is blank, exit
		if(NSUtil.isEmpty(stCreatedFrom))
		{
			nlapiLogExecution('debug', stLogTitle, 'Created From is empty.');
			nlapiLogExecution('debug', stLogTitle, '<============== Script Exit ===============>');
			return;
		}
		
		nlapiLogExecution('debug', stLogTitle, 'Processing ' + stRecType
												+ ' | Id = ' + stRecId
												+ ' | Created From = ' + stCreatedFrom);
		
		var stLinkType = 'transaction';
		switch(stRecType)
		{
			case 'invoice':
				stLinkType = 'itemfulfillment';
				break;
			case 'vendorbill':
				stLinkType = 'itemreceipt';
				break;
			default:
				stLinkType = 'transaction';
		}
		
		//Search for linked transactions
		var arrItemRecFulfillFilters = [new nlobjSearchFilter('custbody_invoice_bill_id', null, 'isempty'),
		                                new nlobjSearchFilter('mainline', null, 'is', 'T'),
		                                new nlobjSearchFilter('createdfrom', null, 'is', stCreatedFrom)];
		
		var arrItemRecFulfillResults = NSUtil.search(stLinkType, null, arrItemRecFulfillFilters);
		
		if(NSUtil.isEmpty(arrItemRecFulfillResults))
		{
			nlapiLogExecution('debug', stLogTitle, 'No Item Receipt/Item Fufillment found.');
			nlapiLogExecution('debug', stLogTitle, '<============== Script Exit ===============>');
			return;
		}
		
		//Update each linked transaction with the record id
		for(var i = 0; i < arrItemRecFulfillResults.length; i++)
		{
			var stLinkId = arrItemRecFulfillResults[i].id;
			nlapiSubmitField(stLinkType, stLinkId, 'custbody_invoice_bill_id', stRecId);
			nlapiLogExecution('audit', stLogTitle, 'Invoice/Bill Id linked to ' + stLinkType + ', with Id = ' + stLinkId);
		}
		
		nlapiLogExecution('debug', stLogTitle, '<============== Script Exit ===============>');
	}
	catch(error)
	{
		handleError(error);
	}
}


function handleError(error)
{
	if (error.getDetails != undefined) 
    {
      	nlapiLogExecution('ERROR','Process Error', 'process() ' + error.getCode() + ': ' + error.getDetails());
      	throw error;
    } 
    else 
    {
   	 	nlapiLogExecution('ERROR','Unexpected Error', 'process() ' + error.toString());   
   	 	throw nlapiCreateError('99999', error.toString());
    }
}

/**
 * Copyright (c) 1998-2016 NetSuite, Inc.
 * 2955 Campus Drive, Suite 100, San Mateo, CA, USA 94403-2511
 * All Rights Reserved.
 *
 * This software is the confidential and proprietary information of NetSuite, Inc. ("Confidential Information").
 * You shall not disclose such Confidential Information and shall use it only in accordance with the terms of the license agreement
 * you entered into with NetSuite.
 */

/**
 * Module Description:
 *
 * Compilation of utility functions that utilizes SuiteScript API
 *
 * Version    Date				Author				Remarks
 * 1.00       June 8, 2016		MTS Team			Initial version.
 *
 */

var NSUtil =
	{
	    /**
	     * Evaluate if the given string or object value is empty, null or undefined.
	     * @param {String} stValue - string or object to evaluate
	     * @returns {Boolean} - true if empty/null/undefined, false if not
	     * @author mmeremilla
	     */
	    isEmpty : function(stValue)
	    {
		    if ((stValue === '') //Strict checking for this part to properly evaluate integer value.
		            || (stValue == null) || (stValue == undefined))
		    {
			    return true;
		    }
		    else
		    {
			    if (stValue.constructor === Array)//Strict checking for this part to properly evaluate constructor type.
			    {
				    if (stValue.length == 0)
				    {
					    return true;
				    }
			    }
			    else if (stValue.constructor === Object)//Strict checking for this part to properly evaluate constructor type.
			    {
				    for ( var stKey in stValue)
				    {
					    return false;
				    }
				    return true;
			    }

			    return false;
		    }
	    },

	    /**
	     * Shorthand version of isEmpty
	     *
	     * @param {String} stValue - string or object to evaluate
	     * @returns {Boolean} - true if empty/null/undefined, false if not
	     * @author bfeliciano
	     */
	    _isEmpty : function(stValue)
	    {
	    	return ((stValue === '' || stValue == null || stValue == undefined)
	    			|| (stValue.constructor === Array && stValue.length == 0)
	    			|| (stValue.constructor === Object && (function(v){for(var k in v)return false;return true;})(stValue)));
	    },

	    /**
	     * Evaluate if the given string is an element of the array, using reverse looping
	     * @param {String} stValue - String value to find in the array
	     * @param {String[]} arrValue - Array to be check for String value
	     * @returns {Boolean} - true if string is an element of the array, false if not
	     */
	    inArray : function(stValue, arrValue)
	    {
		    var bIsValueFound = false;
		    for (var i = arrValue.length; i >= 0; i--)
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
	     * Shorthand version of inArray
	     * @param {String} stValue - String value to find in the array
	     * @param {String[]} arrValue - Array to be check for String value
	     * @returns {Boolean} - true if string is an element of the array, false if not
	     */
	    _inArray : function(stValue, arrValue)
	    {
		    for (var i = arrValue.length; i >= 0; i--)
		    {
			    if (stValue == arrValue[i])
			    {
				    break;
			    }
		    }
		    return (i > -1);
	    },

	    /**
	     * Evaluate if the given string is an element of the array
	     * @param {String} stValue - String value to find in the array
	     * @param {String[]} arrValue - Array to be check for String value
	     * @returns {Boolean} - true if string is an element of the array, false if not
	     */
	    inArrayOld : function(stValue, arrValue)
	    {
		    var bIsValueFound = false;

		    for (var i = 0; i < arrValue.length; i++)
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
	     * Converts string to float. If value is infinity or can't be converted to a number, 0.00 will be returned.
	     * @param {String} stValue - any string
	     * @returns {Number} - a floating point number
	     * @author jsalcedo
	     */
	    forceFloat : function(stValue)
	    {
		    var flValue = parseFloat(stValue);

		    if (isNaN(flValue) || (stValue == Infinity))
		    {
			    return 0.00;
		    }

		    return flValue;
	    },

	    /**
	     * Converts string to integer. If value is infinity or can't be converted to a number, 0 will be returned.
	     * @param {String} stValue - any string
	     * @returns {Number} - an integer
	     * @author jsalcedo
	     */
	    forceInt : function(stValue)
	    {
		    var intValue = parseInt(stValue);

		    if (isNaN(intValue) || (stValue == Infinity))
		    {
			    return 0;
		    }

		    return intValue;
	    },

	    /**
	     * Get all of the results from the search even if the results are more than 1000.
	     * @param {String} stRecordType - the record type where the search will be executed.
	     * @param {String} stSearchId - the search id of the saved search that will be used.
	     * @param {nlobjSearchFilter[]} arrSearchFilter - array of nlobjSearchFilter objects. The search filters to be used or will be added to the saved search if search id was passed.
	     * @param {nlobjSearchColumn[]} arrSearchColumn - array of nlobjSearchColumn objects. The columns to be returned or will be added to the saved search if search id was passed.
	     * @returns {nlobjSearchResult[]} - an array of nlobjSearchResult objects
	     * @author memeremilla - initial version
	     * @author gmanarang - used concat when combining the search result
	     */
	    search : function(stRecordType, stSearchId, arrSearchFilter, arrSearchColumn)
	    {
		    if (stRecordType == null && stSearchId == null)
		    {
			    throw nlapiCreateError('SSS_MISSING_REQD_ARGUMENT', 'search: Missing a required argument. Either stRecordType or stSearchId should be provided.');
		    }

		    var arrReturnSearchResults = new Array();
		    var objSavedSearch;

		    if (stSearchId != null)
		    {
			    objSavedSearch = nlapiLoadSearch((stRecordType) ? stRecordType : null, stSearchId);

			    // add search filter if one is passed
			    if (arrSearchFilter != null)
			    {
				    objSavedSearch.addFilters(arrSearchFilter);
			    }

			    // add search column if one is passed
			    if (arrSearchColumn != null)
			    {
				    objSavedSearch.addColumns(arrSearchColumn);
			    }
		    }
		    else
		    {
			    objSavedSearch = nlapiCreateSearch((stRecordType) ? stRecordType : null, arrSearchFilter, arrSearchColumn);
		    }

		    var objResultset = objSavedSearch.runSearch();
		    var intSearchIndex = 0;
		    var arrResultSlice = null;
		    do
		    {
			    if ((nlapiGetContext().getExecutionContext() === 'scheduled'))
			    {
				    try
				    {
					    this.rescheduleScript(1000);
				    }
				    catch (e)
				    {
				    }
			    }

			    arrResultSlice = objResultset.getResults(intSearchIndex, intSearchIndex + 1000);
			    if (arrResultSlice == null)
			    {
				    break;
			    }

			    arrReturnSearchResults = arrReturnSearchResults.concat(arrResultSlice);
			    intSearchIndex = arrReturnSearchResults.length;
		    }

		    while (arrResultSlice.length >= 1000);

		    return arrReturnSearchResults;
	    }
	};