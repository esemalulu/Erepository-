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
 * 1.00       05 May 2016     cmartinez
 *
 */

var CONTEXT	= nlapiGetContext();

function beforeSubmit_removeRollbackAllowance(type)
{
	try
	{
		var stLoggerTitle	= 'beforeSubmit_removeRollbackAllowance';
		
		if(type != 'edit' && type != 'delete') return;
		
		nlapiLogExecution('debug', stLoggerTitle, '=================== Entry Script ===================');
		

		var intLines	= nlapiGetLineItemCount('item');
		
		for(var intLine = 1; intLine <= intLines; intLine++)
		{
			var stNOIPool	= nlapiGetLineItemValue('item', 'custcol_ifd_noi_pool_budget', intLine);
			if(!Eval.isEmpty(stNOIPool))
			{
				var arrPoolAmountPairs	= stNOIPool.split(',');
				if(!Eval.isEmpty(arrPoolAmountPairs))
				{
					for(var pair = 0; pair < arrPoolAmountPairs.length; pair++)
					{
						var arrSplitPoolAmount	= arrPoolAmountPairs[pair].split('-');
						
						var stPoolId	= arrSplitPoolAmount[0];
						var stPoolUsedAmount	= arrSplitPoolAmount[1];
						
						if(!Eval.isEmpty(stPoolId) && !Eval.isEmpty(stPoolUsedAmount))
						{
							
							var objPool	= nlapiLookupField('customrecord_noi_pool_budget_2', stPoolId, ['custrecord_pool3_start_amt', 'custrecord_pool_used_amt']);
							
							var flRemainingAmount	= Parse.forceFloat(objPool['custrecord_pool3_start_amt']) + Parse.forceFloat(stPoolUsedAmount);
							var flUsedAmount		= Parse.forceFloat(objPool['custrecord_pool_used_amt']) - Parse.forceFloat(stPoolUsedAmount);
							
							nlapiSubmitField('customrecord_noi_pool_budget_2', stPoolId, ['custrecord_pool3_start_amt', 'custrecord_pool_used_amt'], [flRemainingAmount, flUsedAmount]);
							
							nlapiLogExecution('debug', stLoggerTitle, 'Updated NOI Budget Pool = ' + stPoolId);
							nlapiLogExecution('debug', stLoggerTitle, 'flRemainingAmount = ' + flRemainingAmount + ' | flUsedAmount = ' + flUsedAmount);
						}
					}
				}
			}
		}
		
		for(var intLine = intLines; intLine >= 1; intLine--)
		{
			var stNOIPool	= nlapiGetLineItemValue('item', 'custcol_ifd_noi_pool_budget', intLine);
			if(!Eval.isEmpty(stNOIPool))
			{
				nlapiRemoveLineItem('item', intLine);
			}
		}

		
		nlapiLogExecution('debug', stLoggerTitle, '=================== Exit Script ====================');
	}
	 catch (error)
    {
        handleError(error);
    }
}


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
 * Compilation of utility functions that utilizes SuiteScript API
 * 
 */

function handleError(error)
{
	if (error.getDetails != undefined) 
    {
      	nlapiLogExecution('ERROR','Process Error', 'process() ' + error.getCode() + ': ' + error.getDetails());
    } 
    else 
    {
   	 	nlapiLogExecution('ERROR','Unexpected Error', 'process() ' + error.toString());    
    }
}

/**
 * CMartinez: string to array function
 */
function splitAndTrim(string)
{
    var trimmedArray = [];
    
    var arrTemp = string.split(',');
    for(var e = 0; e < arrTemp.length; e++)
    {
        var trimmedString = arrTemp[e].trim();
        trimmedArray.push(trimmedString);
    }
    
    return trimmedArray;
}

/**
 * Check if duplicates exist within array
 */
function detectDuplicates(array)
{
	var boolDuplicate	= false;
	
	var arrSorted = array.slice().sort(); 

	for (var i = 0; i < array.length - 1; i++) 
	{
	    if (arrSorted[i + 1] == arrSorted[i]) 
	    {
	        boolDuplicate = true;
	    }
	}	
	return boolDuplicate;
}

var NSUtils =
{
	/**
	 * Convert item record type to its corresponding internal id (e.g. 'invtpart' to 'inventoryitem')
	 * @param {String} stRecordType - record type of the item
	 * @return {String} stRecordTypeInLowerCase - record type internal id
	 */
		toItemInternalId : function(stRecordType)
		{
			if (isEmpty(stRecordType))
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
		},
	
	/**
	 * Get the posting period internal id for the given date
	 * @param {String} stDate - date to search for posting period
	 * @return {String} stPostingPeriod - internal id of posting period retrieved for the date
	 * @author redelacruz
	 */
	getPostingPeriodByDate : function(stDate)
	{
	    var stPostingPeriod = '';

	    var arrFilters = [];
	        arrFilters.push(new nlobjSearchFilter('startdate', null, 'onorbefore', stDate));
	        arrFilters.push(new nlobjSearchFilter('enddate', null, 'onorafter', stDate));
	        arrFilters.push(new nlobjSearchFilter('isquarter', null, 'is', 'F'));
	        arrFilters.push(new nlobjSearchFilter('isyear', null, 'is', 'F'));

	    var arrColumns = [new nlobjSearchColumn('startdate').setSort(),
	                      new nlobjSearchColumn('enddate')];

	    var arrResults = nlapiSearchRecord('accountingperiod', null, arrFilters, arrColumns);
	    if (arrResults)
	    {
	    	stPostingPeriod = arrResults[0].getId();
	    }

	    return stPostingPeriod;
	},
	
	/**
	 * Determine whether the posting period for a given date is closed or not
	 * @param {String} stDate - date to search for posting period
	 * @return {Boolean} bIsClosed - returns true if posting period is closed; otherwise returns false
	 * @author redelacruz
	 */
	isClosedDatePostingPeriod : function(stDate)
	{
	    var bIsClosed = true;
	    
	    var arrFilters = [];
	    	arrFilters.push(new nlobjSearchFilter('startdate',null,'onorbefore',stDate));
	    	arrFilters.push(new nlobjSearchFilter('enddate',null,'onorafter',stDate));
	    	arrFilters.push(new nlobjSearchFilter('isyear',null,'is','F'));
	    	arrFilters.push(new nlobjSearchFilter('isquarter',null,'is','F'));
	    	arrFilters.push(new nlobjSearchFilter('closed',null,'is','F'));
	    	arrFilters.push(new nlobjSearchFilter('alllocked',null,'is','F'));
	    
	    var arrcolumns = [];
	    	arrcolumns.push(new nlobjSearchColumn('startdate').setSort());
	    	arrcolumns.push(new nlobjSearchColumn('periodname'));

	    var arrResults = nlapiSearchRecord('accountingperiod', null, arrFilters, arrcolumns);
	    if (arrResults)
	    {
	        bIsClosed = false;
	    }

	    return bIsClosed;
	},
	
	
	/**
	 * Determine whether the posting period is closed or not
	 * @param {String} stPeriodName - name of posting period to search
	 * @return {Boolean} bIsClosed - returns true if posting period is closed; otherwise returns false
	 * @author redelacruz
	 */
	isClosedPostingPeriod : function(stPeriodName)
	{
	    var bIsClosed = true;
	    
	    var arrFilters = [];
	    	arrFilters.push(new nlobjSearchFilter('periodname',null,'is', stPeriodName));
	    	arrFilters.push(new nlobjSearchFilter('isyear',null,'is','F'));
	    	arrFilters.push(new nlobjSearchFilter('isquarter',null,'is','F'));
	    	arrFilters.push(new nlobjSearchFilter('closed',null,'is','F'));
	    	arrFilters.push(new nlobjSearchFilter('alllocked',null,'is','F'));
	    
	    var arrColumns = [];
	    	arrColumns.push(new nlobjSearchColumn('periodname'));

	    var arrResults = nlapiSearchRecord('accountingperiod', null, arrFilters, arrColumns);
	    if (arrResults)
	    {
	        bIsClosed = false;
	    }

	    return bIsClosed;
	},
	
	
	/** 
	 * Get the item price using the price level
	 * @param {String} stItemId - item internal id
	 * @param {String} stPriceLevel - price level internal id
	 * @return {Number} the price of the item at the given price level
	 */
	getItemPrice : function(stItemId, stPriceLevel)
	{
	    if (stPriceLevel == '1')
	    {
	        return nlapiLookupField('item', stItemId, 'baseprice');
	    }
	    else
	    {
	        var arrFilters = [new nlobjSearchFilter('internalid', null, 'is', stItemId)];
	        var arrColumns = [new nlobjSearchColumn('otherprices')];
	        var arrResults = nlapiSearchRecord('item', null, arrFilters, arrColumns);
	        if (arrResults != null)
	        {
	        	return arrResults[0].getValue('price' + stPriceLevel);	        	
	        }    
	    }   
	    return null;
	},	

		
	/**
	 * Get all of the results from the search even if the results are more than 1000. 
	 * @param {String} stRecordType - the record type where the search will be executed.
	 * @param {String} stSearchId - the search id of the saved search that will be used.
	 * @param {Array} arrSearchFilter - array of nlobjSearchFilter objects. The search filters to be used or will be added to the saved search if search id was passed.
	 * @param {Array} arrSearchColumn - array of nlobjSearchColumn objects. The columns to be returned or will be added to the saved search if search id was passed.
	 * @returns {Array} - an array of nlobjSearchResult objects
	 * @author memeremilla - initial version
	 * @author gmanarang - used concat when combining the search result
	 */
	search : function(stRecordType, stSearchId, arrSearchFilter, arrSearchColumn)
	{
		var arrReturnSearchResults = new Array();
		var nlobjSavedSearch;

		if (stSearchId != null)
		{
			nlobjSavedSearch = nlapiLoadSearch((stRecordType) ? stRecordType : null, stSearchId);

			// add search filter if one is passed
			if (arrSearchFilter != null)
			{
				nlobjSavedSearch.addFilters(arrSearchFilter);
			}

			// add search column if one is passed
			if (arrSearchColumn != null)
			{
				nlobjSavedSearch.addColumns(arrSearchColumn);
			}
		}
		else
		{
			nlobjSavedSearch = nlapiCreateSearch((stRecordType) ? stRecordType : null, arrSearchFilter, arrSearchColumn);
		}

		var nlobjResultset = nlobjSavedSearch.runSearch();
		var intSearchIndex = 0;
		var nlobjResultSlice = null;
		do
		{
			if ((nlapiGetContext().getExecutionContext() === 'scheduled'))
			{
				try
				{
					this.rescheduleScript(1000);
				}
				catch (e)
				{}
			}

			nlobjResultSlice = nlobjResultset.getResults(intSearchIndex, intSearchIndex + 1000);
			if (!(nlobjResultSlice))
			{
				break;
			}
			
			arrReturnSearchResults = arrReturnSearchResults.concat(nlobjResultSlice);
			intSearchIndex = arrReturnSearchResults.length;
		}

		while (nlobjResultSlice.length >= 1000);

		return arrReturnSearchResults;
	},
		
	/**
	 * Pauses the scheduled script either if the remaining usage is less than
	 * the specified governance threshold usage amount or the allowed time is
	 * @param {Number} intGovernanceThreshold - The value of the governance threshold  usage units before the script will be rescheduled.
	 * @param {Number} intStartTime - The time when the scheduled script started
	 * @param {Number} intMaxTime - The maximum time (milliseconds) for the script to reschedule. Default is 1 hour.
	 * @param {Number} flPercentOfAllowedTime - the percent of allowed time based from the maximum running time. The maximum running time is 3600000 ms.
	 * @returns void
	 * @author memeremilla
	 */
	rescheduleScript : function(intGovernanceThreshold, intStartTime, intMaxTime, flPercentOfAllowedTime)
	{
		var stLoggerTitle = 'SuiteUtil.rescheduleScript';
		nlapiLogExecution('DEBUG', stLoggerTitle, 'Script State : ' + JSON.stringify(
		{
			'Remaining usage' : nlapiGetContext().getRemainingUsage()
		}));

		if (intMaxTime == null)
		{
			intMaxTime = 3600000;
		}

		var intRemainingUsage = nlapiGetContext().getRemainingUsage();
		var intRequiredTime = 900000; // 25% of max time
		if ((flPercentOfAllowedTime))
		{
			var flPercentRequiredTime = 100 - flPercentOfAllowedTime;
			intRequiredTime = intMaxTime * (flPercentRequiredTime / 100);
		}

		// check if there is still enough usage units
		if ((intGovernanceThreshold))
		{
			nlapiLogExecution('DEBUG', stLoggerTitle, 'Script State : ' + 'Checking if there is still enough usage units.');

			if (intRemainingUsage < (parseInt(intGovernanceThreshold, 10) + parseInt(20, 10)))
			{
				nlapiLogExecution('DEBUG', stLoggerTitle, 'Script State : ' + JSON.stringify(
				{
					'Remaining usage' : nlapiGetContext().getRemainingUsage()
				}));
				nlapiLogExecution('DEBUG', stLoggerTitle, 'Script State : ' + 'Rescheduling script.');

				var objYield = null;
				try
				{
					objYield = nlapiYieldScript();
				}
				catch (e)
				{
					if (e.getDetails != undefined)
					{
						throw e;
					}
					else
					{
						if (e.toString().indexOf('NLServerSideScriptException') <= -1)
						{
							throw e;
						}
						else
						{
							objYield =
							{
								'Status' : 'FAILURE',
								'Reason' : e.toString(),
							};
						}
					}
				}

				if (objYield.status == 'FAILURE')
				{
					nlapiLogExecution('DEBUG', stLoggerTitle, 'Script State : ' + 'Unable to Yield.');
					nlapiLogExecution('DEBUG', stLoggerTitle, 'Script State : ' + JSON.stringify(
					{
						'Status' : objYield.status,
						'Information' : objYield.information,
						'Reason' : objYield.reason
					}));
				}
				else
				{
					nlapiLogExecution('DEBUG', stLoggerTitle, 'Script State : ' + 'Successfully reschedule the script.');
					nlapiLogExecution('DEBUG', stLoggerTitle, 'Script State : ' + JSON.stringify(
					{
						'After resume with' : intRemainingUsage,
						'Remaining vs governance threshold' : intGovernanceThreshold
					}));
				}
			}
		}

		if ((intStartTime))
		{
			// get current time
			var intCurrentTime = new Date().getTime();

			// check if elapsed time is near the arbitrary value
			nlapiLogExecution('DEBUG', stLoggerTitle, 'Script State : ' + 'Check if elapsed time is near the arbitrary value.');

			var intElapsedTime = intMaxTime - (intCurrentTime - intStartTime);
			nlapiLogExecution('DEBUG', stLoggerTitle, 'Script State : ' + 'Remaining time is ' + intElapsedTime + ' ms.');

			if (intElapsedTime < intRequiredTime)
			{
				nlapiLogExecution('AUDIT', stLoggerTitle, 'Script State : ' + 'Rescheduling script.');

				// check if we are not reaching the max processing time which is 3600000 secondsvar objYield = null;
				try
				{
					objYield = nlapiYieldScript();
				}
				catch (e)
				{
					if (e.getDetails != undefined)
					{
						throw e;
					}
					else
					{
						if (e.toString().indexOf('NLServerSideScriptException') <= -1)
						{
							throw e;
						}
						else
						{
							objYield =
							{
								'Status' : 'FAILURE',
								'Reason' : e.toString(),
							};
						}
					}
				}

				if (objYield.status == 'FAILURE')
				{
					nlapiLogExecution('DEBUG', stLoggerTitle, 'Script State : ' + 'Unable to Yield.');
					nlapiLogExecution('DEBUG', stLoggerTitle, 'Script State : ' + JSON.stringify(
					{
						'Status' : objYield.status,
						'Information' : objYield.information,
						'Reason' : objYield.reason
					}));
				}
				else
				{
					nlapiLogExecution('DEBUG', stLoggerTitle, 'Script State : ' + 'Successfully reschedule the script.');
					nlapiLogExecution('DEBUG', stLoggerTitle, 'Script State : ' + JSON.stringify(
					{
						'After resume with' : intRemainingUsage,
						'Remaining vs governance threshold' : intGovernanceThreshold
					}));

					// return new start time        
					intStartTime = new Date().getTime();
				}
			}
		}

		return intStartTime;
	},
	
	/**  
	 * Checks governance then calls yield
	 * @param 	{Integer} myGovernanceThreshold 	 * 
	 * @returns {Void} 
	 * @author memeremilla
	 */
	checkGovernance : function(myGovernanceThreshold)
	{
		var context = nlapiGetContext();
		
		if( context.getRemainingUsage() < myGovernanceThreshold )
		{
			var state = nlapiYieldScript();
			if( state.status == 'FAILURE')
			{
				nlapiLogExecution("ERROR","Failed to yield script, exiting: Reason = "+state.reason + " / Size = "+ state.size);
				throw "Failed to yield script";
			} 
			else if ( state.status == 'RESUME' )
			{
				nlapiLogExecution("AUDIT", "Resuming script because of " + state.reason+".  Size = "+ state.size);
			}
		}
	}
};


var Eval =
{
	/**
	 * Evaluate if the given string or object value is empty, null or undefined.
	 * @param {String} stValue - string or object to evaluate
	 * @returns {Boolean} - true if empty/null/undefined, false if not
	 * @author mmeremilla
	 */
	isEmpty : function(stValue)
	{
		if ((stValue == '') || (stValue == null) || (stValue == undefined))
		{
			return true;
		}
		else
		{
			if (typeof stValue == 'string')
			{
				if ((stValue == ''))
				{
					return true;
				}
			}
			else if (typeof stValue == 'object')
			{
				if (stValue.length == 0 || stValue.length == 'undefined')
				{
					return true;
				}
			}

			return false;
		}
	},
	
	
	/**
	 * Evaluate if the given string is an element of the array
	 * @param {String} stValue - String value to find in the array
	 * @param {Array} arrValue - Array to be check for String value
	 * @returns {Boolean} - true if string is an element of the array, false if not
	 */
	inArray : function(stValue, arrValue)
	{
		var bIsValueFound = false;

		for ( var i = 0; i < arrValue.length; i++)
		{
			if (stValue == arrValue[i])
			{
				bIsValueFound = true;
				break;
			}
		}

		return bIsValueFound;
	},
};


var Parse =
{
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

			if (isNaN(intValue)  || (stValue == Infinity))
			{
				return 0;
			}

			return intValue;
		},

		/**
		 * Removes duplicate values from an array
		 * @param {Array} arrValue - any array
		 * @returns {Array} - array without duplicate values
		 */
		removeDuplicates : function(arrValue)
		{
			if (!arrValue)
			{
				return arrValue;
			}

			var arrNewValue = new Array();

			o: for ( var i = 0, n = arrValue.length; i < n; i++)
			{
				for ( var x = 0, y = arrNewValue.length; x < y; x++)
				{
					if (arrNewValue[x] == arrValue[i])
					{
						continue o;
					}
				}

				arrNewValue[arrNewValue.length] = arrValue[i];
			}

			return arrNewValue;
		},
		
		/**
		 * Replaces the character based on the position defined (0-based index)
		 * @param {String} stValue - any string
		 * @param {Number} intPos - index/position of the character to be replaced
		 * @param {stReplacement} - any string to replace the character in the intPos
		 * @returns {String} - new value
		 * @author jsalcedo
		 * 
		 * Example: replaceCharAt('hello', 0, 'X'); //"Xello"
		 */
		replaceCharAt : function(stValue, intPos, stReplacement)
		{
		    return stValue.substr(0, intPos) + stReplacement + stValue.substr(intPos + 1);
		},
				
		/**
		 * Inserts string to the position defined (0-based index)
		 * @param {String} stValue - any string
		 * @param {Number} intPos - index of the character to be replaced
		 * @param {String} stInsert - any string to insert 
		 * @param {String} - new value
		 * @returns {String} - new value
		 * @author jsalcedo
		 * 
		 * Example: insertCharAt('hello', 0, 'X'); //"Xhello"
		 */
		insertStringAt : function(stValue,intPos,stInsert)
		{
		    return [stValue.slice(0, intPos), stInsert, stValue.slice(intPos)].join('');
		},

		/**
		 * Round off floating number and appends it with currency symbol 
		 * @param {Number} flValue - a floating number
		 * @param {String} stCurrencySymbol - currency symbol
		 * @param {Number} intDecimalPrecision - number of decimal precisions to use when rounding off the floating number
		 * @author redelacruz
		 */
		formatCurrency: function(flValue, stCurrencySymbol, intDecimalPrecision)
	    {
	        var flAmount = flValue;
	         
	        if (typeof(flValue) != 'number')
	        {
	        	flAmount = parseFloat(flValue);
	        }
	        
	        var arrDigits = flAmount.toFixed(intDecimalPrecision).split(".");
	        arrDigits[0] = arrDigits[0].split("").reverse().join("").replace(/(\d{3})(?=\d)/g,"$1,").split("").reverse().join("");
	        
	        return stCurrencySymbol + arrDigits.join(".");
	    },
	    
	    /**
	     * Round off floating number and appends it with percent symbol 
		 * @param {Number} flValue - a floating number
		 * @param {String} stPercentSymbol - percent symbol
		 * @param {Number} intDecimalPrecision - number of decimal precisions to use when rounding off the floating number
	     * @author redelacruz
	     */
	    formatPercent: function(flValue, stPercentSymbol, intDecimalPrecision)
	    {
	        var flAmount = flValue;
	         
	        if (typeof(flValue) != 'number')
	        {
	        	flAmount = parseFloat(flValue);
	        }
	        
	        arrDigits = flAmount.toFixed(intDecimalPrecision).split(".");
	        arrDigits[0] = arrDigits[0].split("").reverse().join("").replace(/(\d{3})(?=\d)/g,"$1,").split("").reverse().join("");
	        
	        return arrDigits.join(".") + stPercentSymbol;
	    }
};


var DateHelper =
{		
	/**
	 * Returns the difference between 2 dates based on time type
	 * @param {Date} stStartDate - Start Date
	 * @param {Date} stEndDate - End Date
	 * @param {String} stTime - 'D' = Days, 'HR' = Hours, 'MI' = Minutes, 'SS' = Seconds
	 * @returns {Number} - difference in days, hours, minutes, or seconds
	 * @author jsalcedo
	 */
	getTimeBetween : function(dtStartDate, dtEndDate, stTime) 
	{
	    // The number of milliseconds in one time unit
	    var intOneTimeUnit = 1;
	    
	    switch (stTime)
	    {
	        case 'D':
	            intOneTimeUnit *= 24;
	        case 'HR':
	            intOneTimeUnit *= 60;
	        case 'MI':
	            intOneTimeUnit *= 60;
	        case 'SS':
	            intOneTimeUnit *= 1000;
	    }
	    
	    // Convert both dates to milliseconds
	    var intStartDate = dStartDate.getTime();
	    var intEndDate = dEndDate.getTime();

	    // Calculate the difference in milliseconds
	    var intDifference = intEndDate - intStartDate;
	    
	    // Convert back to time units and return
	    return Math.round(intDifference / intOneTimeUnit);
	},
};