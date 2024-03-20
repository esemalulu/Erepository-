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
 * 1.00       30 Jun 2016     cmartinez        Script for updating line amount during before load.
 * 1.10	  	  13 Sep 2016	    gruiz			       Updated null checking for #141-#149
 * 1.20       15 Oct 2018     mgotsch		       Updating to add in defaulting cw amounts on Credit Memos
 * 1.21       24 Oct 2018     dlapp            Rate Update
 * 1.22		  25 Oct 2018	  dweinstein			 More rate updates
 * 1.23       03 Jan 2018     mgotsch				Optimization for governance
 * 1.24      19 Jul 2019      dweinstein       Only looking up actual weight and calculating amount if it is empty (invoice only)
 * 1.25     23 Jul 2019       dweinstein      Only looking up actual weight and calculating amount if act weight is not empty on the sourcing record
 * 1.26      22 Aug 2019      dweinstein      Updating logic to always update inv catch weight lines' amounts using the inv line act wght before looking at IF act wght
 */

//--import cw_util.js

/**
 * The recordType (internal id) corresponds to the "Applied To" record in your script deployment.
 * @appliedtorecord recordType
 *
 * @param {String} type Operation types: create, edit, view, copy, print, email
 * @param {nlobjForm} form Current form
 * @param {nlobjRequest} request Request object
 * @returns {Void}
 */
function beforeLoad_updateCWLineAmount(type, form, request)
{
	try
	{
		var stLoggerTitle = 'beforeLoad_updateCWLineAmount';
		nlapiLogExecution('debug', stLoggerTitle, '============================= Script Entry =============================');



		//Script only executes on create events
		if (type != 'create')
		{
			return;
		}


		var stRecType = nlapiGetRecordType();
		var intLines = nlapiGetLineItemCount('item');
		nlapiLogExecution('debug', stLoggerTitle, 'Record Type = ' + stRecType);

		if(stRecType == 'invoice')
		{
			//Get created from value
			var stCreatedFrom = nlapiGetFieldValue('createdfrom');
			nlapiLogExecution('debug', stLoggerTitle, 'Created From  = ' + stCreatedFrom);

			//If not created from sales order, exit.
			if(NSUtil.isEmpty(stCreatedFrom))
			{
				nlapiLogExecution('debug', stLoggerTitle, 'Not created from SO.');
				nlapiLogExecution('debug', stLoggerTitle, '============================= Script Exit ==============================');
				return;
			}

			//Get all items from sublist
			var arrItems = [];
			for(var g = 1; g <= intLines; g++)
			{
				var stItem = nlapiGetLineItemValue('item', 'item', g);
				if(!NSUtil.isEmpty(stItem)) arrItems.push(stItem);
			}

			//Get catch weight items
			var arrCWItems = getCatchWeightItems(arrItems);

			if(NSUtil.isEmpty(arrCWItems))
			{
				nlapiLogExecution('debug', stLoggerTitle, 'No Catch Weight items found.');
				nlapiLogExecution('debug', stLoggerTitle, '============================= Script Exit ==============================');
				return;
			}

			//Get linked transactions and sum of catch weight per item
			var arrLinkedTransactions = searchLinkedTransactions(stRecType, stCreatedFrom, arrCWItems);

			if(NSUtil.isEmpty(arrLinkedTransactions))
			{
				nlapiLogExecution('debug', stLoggerTitle, 'No linked transactions found.');
				nlapiLogExecution('debug', stLoggerTitle, '============================= Script Exit ==============================');
				return;
			}

			var arrLinkedItems = [];
			for(var h = 0; h < arrLinkedTransactions.length; h++)
			{
				var stItemId = arrLinkedTransactions[h].getValue('item', null, 'group');
				arrLinkedItems.push(stItemId);
			}

			//NS ACS Case 4741505
			var arrLinkedLineIds = [];
			for(var h = 0; h < arrLinkedTransactions.length; h++)
			{
				var stLineId = arrLinkedTransactions[h].getValue('line', 'appliedToTransaction', 'group');
				arrLinkedLineIds.push(stLineId);
			}
			//NS ACS Case 4741505

			//Loop through line items to set catch weight amount as line amount
			invcLoop : for (var i = 1; i <= intLines; i++)
			{
				var stIdItem = nlapiGetLineItemValue('item', 'item', i);
				var flPriceUM = NSUtil.forceFloat(nlapiGetLineItemValue('item', 'custcol_jf_cw_price_um', i));
				var curActWght = nlapiGetLineItemValue('item','custcol_jf_cw_act_wght',i); //v1.24 DW_7/19/19 - Adding check on curActWght
				var isCatchWeightItem = nlapiGetLineItemValue('item','custcol_cw_indicator',i);
				//NS ACS Case 4741505
				var orderLineId = nlapiGetLineItemValue('item','orderline',i);
				if(!NSUtil.isEmpty(stIdItem) && NSUtil.inArray(stIdItem, arrLinkedItems) && (NSUtil.inArray(orderLineId, arrLinkedLineIds)) && (isCatchWeightItem != null && isCatchWeightItem == 'T'))  //v1.26 DW_8/22/19 - Removing check on inv line act wght
				//NS ACS Case 4741505
//				if(!NSUtil.isEmpty(stIdItem) && NSUtil.inArray(stIdItem, arrLinkedItems) && (isCatchWeightItem != null && isCatchWeightItem == 'T'))  //v1.26 DW_8/22/19 - Removing check on inv line act wght
				{
					var intLinkIndex = arrLinkedItems.indexOf(stIdItem);

					var flRate = NSUtil.forceFloat(nlapiGetLineItemValue('item', 'rate', i));

					var stOldValue = nlapiGetLineItemValue('item', 'amount', i);
					if (NSUtil.isEmpty(curActWght) || curActWght == 0) //v1.26 DW_8/22/19 - If inv line act wght is empty, look up act wght from IF
					{
						curActWght = NSUtil.forceFloat(arrLinkedTransactions[intLinkIndex].getValue('custcol_jf_cw_catch_weight', null, 'sum'));
					}
					var flNewAmount = curActWght * flPriceUM;

					var flQuantity = NSUtil.forceInt(flNewAmount / flRate);

					if(!NSUtil.isEmpty(curActWght) && curActWght > 0 && !NSUtil.isEmpty(flNewAmount) && flNewAmount > 0) {  //v1.25 DW_7-23-19 Adding check on sourced actual weight before setting on SO
						// Set amount as sum of catch weight from item fulfillment, multiplied with rate
						nlapiSetLineItemValue('item', 'custcol_jf_cw_act_wght', i, curActWght);
						nlapiSetLineItemValue('item', 'amount', i, nlapiFormatCurrency(flNewAmount));
					}
					if(flRate != 0)
					{
						//nlapiSetLineItemValue('item', 'quantity', i, flQuantity);
					}

					nlapiLogExecution('debug', stLoggerTitle, '[' + i + '] Line amount updated! Item = ' + stIdItem
						+ ' | Old amount = ' + stOldValue
						+ ' | Sum of Unbilled Catch Weight = ' + curActWght
						+ ' | Line Price UM = ' + flPriceUM
						+ ' | NEW AMOUNT = ' + flNewAmount);
				}
			}
		}

		if(stRecType == 'vendorbill')
		{

			nlapiLogExecution('DEBUG', stLoggerTitle, 'Request Header: ' + request);
			var stCreatedFrom = '';
			var stTransformFrom = '';

			if(!NSUtil.isEmpty(request))
			{
				stCreatedFrom = request.getParameter('id');
				stTransformFrom = request.getParameter('transform');
			}

			nlapiLogExecution('debug', stLoggerTitle, 'Created From = ' + stCreatedFrom + ' | Transform = ' + stTransformFrom);

			//If not created from purchase order, exit.
			if(NSUtil.isEmpty(stCreatedFrom) || stTransformFrom.toLowerCase() != 'purchord')
			{
				nlapiLogExecution('debug', stLoggerTitle, 'Not created from PO.');
				nlapiLogExecution('debug', stLoggerTitle, '============================= Script Exit ==============================');
				return;
			}

			//Get all items from sublist
			var arrItems = [];
			for(var g = 1; g <= intLines; g++)
			{
				var stItem = nlapiGetLineItemValue('item', 'item', g);
				if(!NSUtil.isEmpty(stItem)) arrItems.push(stItem);
			}

			//Get catch weight items
			var arrCWItems = getCatchWeightItems(arrItems);

			if(NSUtil.isEmpty(arrCWItems))
			{
				nlapiLogExecution('debug', stLoggerTitle, 'No Catch Weight items found.');
				nlapiLogExecution('debug', stLoggerTitle, '============================= Script Exit ==============================');
				return;
			}

			//Get linked transactions and sum of catch weight per item
			var arrLinkedTransactions = searchLinkedTransactions(stRecType, stCreatedFrom, arrCWItems);

			if(NSUtil.isEmpty(arrLinkedTransactions))
			{
				nlapiLogExecution('debug', stLoggerTitle, 'No linked transactions found.');
				nlapiLogExecution('debug', stLoggerTitle, '============================= Script Exit ==============================');
				return;
			}

			var arrLinkedItems = [];
			for(var h = 0; h < arrLinkedTransactions.length; h++)
			{
				var stItemId = arrLinkedTransactions[h].getValue('item', null, 'group');
				arrLinkedItems.push(stItemId);
			}

			//NS ACS Case 4741505
			var arrLinkedLineIds = [];
			for(var h = 0; h < arrLinkedTransactions.length; h++)
			{
				var stLineId = arrLinkedTransactions[h].getValue('line', 'appliedToTransaction', 'group');
				arrLinkedLineIds.push(stLineId);
			}
			//NS ACS Case 4741505

			//Loop through line items to set catch weight amount as line amount
			vbLoop : for (var i = 1; i <= intLines; i++)
			{
				var stIdItem = nlapiGetLineItemValue('item', 'item', i);
				var flPriceUM = NSUtil.forceFloat(nlapiGetLineItemValue('item', 'custcol_jf_cw_price_um', i));
				//NS ACS Case 4741505
				var orderLineId = nlapiGetLineItemValue('item','orderline',i);

				if(!NSUtil.isEmpty(stIdItem) && NSUtil.inArray(stIdItem, arrLinkedItems && NSUtil.inArray(orderLineId, arrLinkedLineIds)))
//				if(!NSUtil.isEmpty(stIdItem) && NSUtil.inArray(stIdItem, arrLinkedItems))
				//NS ACS Case 4741505
				{
					var intLinkIndex = arrLinkedItems.indexOf(stIdItem);

					var stOldValue = nlapiGetLineItemValue('item', 'amount', i);

					var flRate = NSUtil.forceFloat(nlapiGetLineItemValue('item', 'rate', i));

					var flSumCatchWeightFromIF = NSUtil.forceFloat(arrLinkedTransactions[intLinkIndex].getValue('custcol_jf_cw_catch_weight', null, 'sum'));

					var flNewAmount = flSumCatchWeightFromIF * flPriceUM;

					var flQuantity = NSUtil.forceInt(flNewAmount / flRate);

					// Set amount as sum of catch weight from item fulfillment, multiplied with rate
					nlapiSetLineItemValue('item', 'custcol_jf_cw_act_wght', i, flSumCatchWeightFromIF);
					nlapiSetLineItemValue('item', 'amount', i, nlapiFormatCurrency(flNewAmount));
					nlapiSetLineItemValue('item', 'rate', i, flPriceUM); // v1.21

					if(flRate != 0)
					{
						//nlapiSetLineItemValue('item', 'quantity', i, flQuantity);
					}

					nlapiLogExecution('debug', stLoggerTitle, '[' + i + '] Line amount updated! Item = ' + stIdItem
						+ ' | Old amount = ' + stOldValue
						+ ' | Sum of Unbilled Catch Weight = ' + flSumCatchWeightFromIF
						+ ' | Line Price UM = ' + flPriceUM
						+ ' | NEW AMOUNT = ' + flNewAmount);


				}
			}
		}

		//v1.20 START
		if(stRecType == 'creditmemo')
		{
			nlapiLogExecution('DEBUG', stLoggerTitle, 'Request Header: ' + request);
			var stCreatedFrom = '';
			var stTransformFrom = '';

			if(!NSUtil.isEmpty(request))
			{
				stCreatedFrom = request.getParameter('id');
				stTransformFrom = request.getParameter('transform');
			}

			nlapiLogExecution('debug', stLoggerTitle, 'Created From = ' + stCreatedFrom + ' | Transform = ' + stTransformFrom);

			//If not created from return authorization, exit.
			if(NSUtil.isEmpty(stCreatedFrom) || stTransformFrom.toLowerCase() != 'returnauthorization')
			{
				nlapiLogExecution('debug', stLoggerTitle, 'Not created from RMA.');
				nlapiLogExecution('debug', stLoggerTitle, '============================= Script Exit ==============================');
				return;
			}

			//Get all items from sublist
			for(var g = 1; g <= intLines; g++)
			{
				var stItem = nlapiGetLineItemValue('item', 'item', g);
				var flRate = NSUtil.forceFloat(nlapiGetLineItemValue('item', 'rate', g));
				//var isCWItem = nlapiLookupField('item',stItem, FLD_CATCH_WEIGHT_ITEM); //v1.22 look up catch weight indicator from Item record v1.23 updating to get from line item
				var isCWItem = nlapiGetLineItemValue('item', 'custcol_cw_indicator', g); //v1.23 switching from lookupField to pull from line item
				if(isCWItem == 'T') { //v1.22 changed from = to ==
					var flActWeight = nlapiGetLineItemValue('item', COL_ACTUAL_WEIGHT, g);
					if(NSUtil.isEmpty(flActWeight)) {
						var flAvgWeight = nlapiGetLineItemValue('item', COL_AVG_WGHT, g);
						var flQuantity = nlapiGetLineItemValue('item', 'quantity', g);
						var flTotalAmount = (flRate*flAvgWeight*flQuantity);
					} else {
						var flTotalAmount = (flRate*flActWeight);
					}
					nlapiSetLineItemValue('item', 'amount', g, nlapiFormatCurrency(flTotalAmount));

				}
			}
		}
		if(stRecType == 'vendorcredit')
		{
			nlapiLogExecution('DEBUG', stLoggerTitle, 'Request Header: ' + request);
			var stCreatedFrom = '';
			var stTransformFrom = '';

			if(!NSUtil.isEmpty(request))
			{
				stCreatedFrom = request.getParameter('id');
				stTransformFrom = request.getParameter('transform');
			}

			nlapiLogExecution('debug', stLoggerTitle, 'Created From = ' + stCreatedFrom + ' | Transform = ' + stTransformFrom);

			//If not created from vendor return authorization, exit.
			if(NSUtil.isEmpty(stCreatedFrom) || stTransformFrom.toLowerCase() != 'vendauth')	//changed from vendorreturnauthorization to vendauth
			{
				nlapiLogExecution('debug', stLoggerTitle, 'Not created from VRMA.');
				nlapiLogExecution('debug', stLoggerTitle, '============================= Script Exit ==============================');
				return;
			}

			//Get all items from sublist
			for(var g = 1; g <= intLines; g++)
			{
				var stItem = nlapiGetLineItemValue('item', 'item', g);
				var flRate = NSUtil.forceFloat(nlapiGetLineItemValue('item', 'rate', g));
				//var isCWItem = nlapiLookupField('item',stItem, FLD_CATCH_WEIGHT_ITEM); //v1.22 look up catch weight indicator from Item record v1.23 updating to get from line item
				var isCWItem = nlapiGetLineItemValue('item', 'custcol_cw_indicator', g); //v1.23 switching from lookupField to pull from line item
				if(isCWItem == 'T') {	//v1.22 change from = to ==
					var flPriceUM = NSUtil.forceFloat(nlapiGetLineItemValue('item', 'custcol_jf_cw_price_um', g));//v1.22 pulling price/price um
					var flActWeight = nlapiGetLineItemValue('item', COL_ACTUAL_WEIGHT, g);
					if(NSUtil.isEmpty(flActWeight)) {
						var flAvgWeight = nlapiGetLineItemValue('item', COL_AVG_WGHT, g);
						var flQuantity = nlapiGetLineItemValue('item', 'quantity', g);
						var flTotalAmount = (flPriceUM*flAvgWeight*flQuantity);
					} else {
						var flTotalAmount = (flPriceUM*flActWeight);
					}
					nlapiSetLineItemValue('item', 'amount', g, nlapiFormatCurrency(flTotalAmount));
					nlapiSetLineItemValue('item', 'rate', g, flPriceUM); // v1.22 setting initial credit rate to price/price um for catch weight item
				}
			}
		}
		//v1.20 END


		nlapiLogExecution('debug', stLoggerTitle, '============================= Script Exit ==============================');
	}
	catch(error)
	{
		handleError(error);
	}
}

/**
 * Filter catch weight items from transaction sublist
 *
 * @param arrItems
 * @returns {Array}
 */
function getCatchWeightItems(arrItems)
{
	var arrCWItems = [];

	var arrFilters = [];
	arrFilters.push(new nlobjSearchFilter(FLD_CATCH_WEIGHT_ITEM, null, 'is', 'T'));
	arrFilters.push(new nlobjSearchFilter('internalid', null, 'anyof', arrItems));

	var arrResults = [];
	try
	{
		arrResults = NSUtil.search('item', null, arrFilters);
	}
	catch(error)
	{
		if (error.getDetails != undefined)
		{
			nlapiLogExecution('ERROR','Process Error', 'process() ' + error.getCode() + ': ' + error.getDetails());
		}
		else
		{
			nlapiLogExecution('ERROR','Unexpected Error', 'process() ' + error.toString());
		}
		arrResults = [];
	}

	if(!NSUtil.isEmpty(arrResults))
	{
		for(var i = 0; i < arrResults.length; i++)
		{
			var stItemId = arrResults[i].id;
			arrCWItems.push(stItemId);
		}
	}

	return arrCWItems;
}

/**
 * Search for linked transactions to record
 *
 * @param stRecType
 * @param stCreatedFrom
 * @param stItemId
 * @returns {Array}
 */
function searchLinkedTransactions(stRecType, stCreatedFrom, arrCWItems)
{
	nlapiLogExecution('Debug','Checking', 'arrCWItems ' + JSON.stringify(arrCWItems));
	var arrResults = [];

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

	var arrFilters = [];
	arrFilters.push(new nlobjSearchFilter('custbody_invoice_bill_id', null, 'isempty' ));
//	arrFilters.push(new nlobjSearchFilter('createdfrom', null, 'is', stCreatedFrom ));		//NS ACS Case 4741505
	arrFilters.push(new nlobjSearchFilter('internalidnumber', 'appliedtotransaction', 'equalto', stCreatedFrom ));		//NS ACS Case 4741505
	arrFilters.push(new nlobjSearchFilter('item', null, 'anyof', arrCWItems));

	var arrColumns = [];
	arrColumns.push(new nlobjSearchColumn('custcol_jf_cw_catch_weight', null, 'sum'));
	arrColumns.push(new nlobjSearchColumn('item', null, 'group'));
	arrColumns.push(new nlobjSearchColumn('line', 'appliedToTransaction', 'group'));	//NS ACS Case 4741505

	try
	{
		arrResults = NSUtil.search(stLinkType, null, arrFilters, arrColumns);
	}
	catch(error)
	{
		if (error.getDetails != undefined)
		{
			nlapiLogExecution('ERROR','Process Error', 'process() ' + error.getCode() + ': ' + error.getDetails());
		}
		else
		{
			nlapiLogExecution('ERROR','Unexpected Error', 'process() ' + error.toString());
		}
		arrResults = [];
	}


	return arrResults;
}

/**
 * Log and throw error
 *
 * @param error
 */
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
