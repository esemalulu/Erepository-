/**
 * @NModuleScope Public
 * @NApiVersion 2.x
 */
define(
['N/search', 'N/runtime', 'N/format', 'N/error'],
/**
 * @param {search} search
 * @param {runtime} runtime
 * @param {format} format
 * @param {error} error
 */
function(search, runtime, format, error)
{
	var NSUtil = {};


    /**
     * Evaluate if the given string or object value is empty, null or undefined.
     * @param {String} stValue - string or object to evaluate
     * @returns {Boolean} - true if empty/null/undefined, false if not
     * @author mmeremilla
     * @memberOf NSUtil
     */
	NSUtil.isEmpty = function(stValue)
	{
    	return ((stValue === '' || stValue == null || stValue == undefined)
    			|| (stValue.constructor === Array && stValue.length == 0)
    			|| (stValue.constructor === Object && (function(v){for(var k in v)return false;return true;})(stValue)));
	};


    /**
     * Evaluate if the given string is an element of the array, using reverse looping
     * @param {String} stValue - String value to find in the array
     * @param {String[]} arrValue - Array to be check for String value
     * @returns {Boolean} - true if string is an element of the array, false if not
     * @memberOf NSUtil
     */
	NSUtil.inArray = function(stValue, arrValue)
    {
	    for (var i = arrValue.length-1; i >= 0; i--)
	    {
		    if (stValue == arrValue[i])
		    {
			    break;
		    }
	    }
	    return (i > -1);
    };
    
    /**
     * Converts string to integer. If value is infinity or can't be converted to a number, 0 will be returned.
     * @param {String} stValue - any string
     * @returns {Number} - an integer
     * @author jsalcedo
     * revision: gmanarang - added parameter on parseInt to ensure decimal as base for conversion 
     */
    NSUtil.forceInt = function(stValue)
    {
    	var intValue = parseInt(stValue, 10);

    	if (isNaN(intValue) || (stValue == Infinity))
    	{
    		return 0;
    	}

    	return intValue;
    };

    /**
     * Converts string to float. If value is infinity or can't be converted to a number, 0.00 will be returned.
     * @param {String} stValue - any string
     * @returns {Number} - a floating point number
     * @author jsalcedo
     */
    NSUtil.forceFloat = function(stValue)
    {
    	var flValue = parseFloat(stValue);

    	if (isNaN(flValue) || (stValue == Infinity))
    	{
    		return 0.00;
    	}

    	return flValue;
    };
    
    /**
     * Removes duplicate values from an array
     * @param {Object[]} arrValue - any array
     * @returns {Object[]} - array without duplicate values
     */
    NSUtil.removeDuplicate = function(arrValue)
    {
    	if ((arrValue === '') //Strict checking for this part to properly evaluate integer value.
    	        || (arrValue == null) || (arrValue == undefined))
    	{
    		return arrValue;
    	}

    	var arrNewValue = new Array();

    	o: for (var i = 0, n = arrValue.length; i < n; i++)
    	{
    		for (var x = 0, y = arrNewValue.length; x < y; x++)
    		{
    			if (arrNewValue[x] == arrValue[i])
    			{
    				continue o;
    			}
    		}

    		arrNewValue[arrNewValue.length] = arrValue[i];
    	}

    	return arrNewValue;
    };
    
    /**
     * Replaces the character based on the position defined (0-based index)
     * @param {String} stValue - any string
     * @param {Number} intPos - index/position of the character to be replaced
     * @param {String} stReplacement - any string to replace the character in the intPos
     * @returns {String} - new value
     * @author jsalcedo
     *
     * Example: replaceCharAt('hello', 0, 'X'); //"Xello"
     */
    NSUtil.replaceCharAt = function(stValue, intPos, stReplacement)
    {
    	return stValue.substr(0, intPos) + stReplacement + stValue.substr(intPos + 1);
    };
    
    
    /**
     * Inserts string to the position defined (0-based index)
     * @param {String} stValue - any string
     * @param {Number} intPos - index of the character to be replaced
     * @param {String} stInsert - any string to insert
     * @returns {String} - new value
     * @author jsalcedo
     *
     * Example: insertCharAt('hello', 0, 'X'); //"Xhello"
     */
    NSUtil.insertStringAt = function(stValue, intPos, stInsert)
    {
    	return ([stValue.slice(0, intPos), stInsert, stValue.slice(intPos)].join(''));
    };

    /**
     * Round off floating number and appends it with currency symbol
     * @param {Number} flValue - a floating number
     * @param {String} stCurrencySymbol - currency symbol
     * @param {Number} intDecimalPrecision - number of decimal precisions to use when rounding off the floating number
     * @returns {String} - formatted value
     * @author redelacruz
     */
    NSUtil.formatCurrency = function(flValue, stCurrencySymbol, intDecimalPrecision)
    {
    	var flAmount = flValue;

    	if (typeof (flValue) != 'number')
    	{
    		flAmount = parseFloat(flValue);
    	}

    	var arrDigits = flAmount.toFixed(intDecimalPrecision).split(".");
    	arrDigits[0] = arrDigits[0].split("").reverse().join("").replace(/(\d{3})(?=\d)/g, "$1,").split("").reverse().join("");

    	return stCurrencySymbol + arrDigits.join(".");
    };
    
    /**
     * Round off floating number and appends it with percent symbol
     * @param {Number} flValue - a floating number
     * @param {String} stPercentSymbol - percent symbol
     * @param {Number} intDecimalPrecision - number of decimal precisions to use when rounding off the floating number
     * @returns {String} - formatted value
     * @author redelacruz
     */
    NSUtil.formatPercent = function(flValue, stPercentSymbol, intDecimalPrecision)
    {
    	var flAmount = flValue;

    	if (typeof (flValue) != 'number')
    	{
    		flAmount = parseFloat(flValue);
    	}

    	var arrDigits = flAmount.toFixed(intDecimalPrecision).split(".");
    	arrDigits[0] = arrDigits[0].split("").reverse().join("").replace(/(\d{3})(?=\d)/g, "$1,").split("").reverse().join("");

    	return arrDigits.join(".") + stPercentSymbol;
    };
    
    /**
     * Round decimal number
     * @param {Number} flDecimalNumber - decimal number value
     * @param {Number} intDecimalPlace - decimal places
     *
     * @returns {Number} - a floating point number value
     * @author memeremilla and lochengco
     */
    NSUtil.roundDecimalAmount = function(flDecimalNumber, intDecimalPlace)
    {
    	//this is to make sure the rounding off is correct even if the decimal is equal to -0.995
    	var bNegate = false;
    	if (flDecimalNumber < 0)
    	{
    		flDecimalNumber = Math.abs(flDecimalNumber);
    		bNegate = true;
    	}

    	var flReturn = 0.00;
    	intDecimalPlace = (intDecimalPlace == null || intDecimalPlace == '') ? 0 : intDecimalPlace;

    	var intMultiplierDivisor = Math.pow(10, intDecimalPlace);
    	flReturn = Math.round((parseFloat(flDecimalNumber) * intMultiplierDivisor).toFixed(intDecimalPlace)) / intMultiplierDivisor;
    	flReturn = (bNegate) ? (flReturn * -1) : flReturn;

    	return flReturn;
    };
    
    /**
     * Returns the difference between 2 dates based on time type
     * @param {Date} stStartDate - Start Date
     * @param {Date} stEndDate - End Date
     * @param {String} stTime - 'D' = Days, 'HR' = Hours, 'MI' = Minutes, 'SS' = Seconds
     * @returns {Number} - (floating point number) difference in days, hours, minutes, or seconds
     * @author jsalcedo
     */
    NSUtil.getTimeBetween = function(dtStartDate, dtEndDate, stTime)
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
    	var intStartDate = dtStartDate.getTime();
    	var intEndDate = dtEndDate.getTime();

    	// Calculate the difference in milliseconds
    	var intDifference = intEndDate - intStartDate;

    	// Convert back to time units and return
    	return Math.round(intDifference / intOneTimeUnit);
    };
    
    /**
     * Return a valid filename
     *
     * @param {String} stFileName
     * @returns {String} sanitized filename
     */
    NSUtil.sanitizeFilename = function(stFileName)
    {
    	var fname = stFileName || 'SampleFileName-' + (new Date()).getTime();
    	return fname.replace(/[^a-z0-9]/gi, '_');
    };
    

    /**
     * Get file contents
     *
     * @param {String} stFileId - File id
     * @returns {String} contents of the file or null if none
     */
    NSUtil.getContent = function(stFileId)
    {
    	//TODO
    };
    
    /**
     * Save file OR overwrite if already exists.
     *
     * Version 1:
     * @author Brian Feliciano
     * Details: Initial version.
     * 
     * Version 2:
     * @author Jeremy Jacob
     * 
     * Date: August 11, 2016
     * Details of updates:
     * 		1. Function name changed from 'SaveFileOrOvewrite' to 'saveOrOverwriteFile'
     * 		2. Comments and logs added.
     * 		3. Null checking of all inputs.
     * 		4. Correction on 'return when file does not exist'. When file does not exist, the objFile parameter must be saved.
     * 
     * @param {nlobjFile} file object
     * @param {String} stFileName
     * @param {String} stFolderId
     * @returns {Integer} 
     */
    NSUtil.saveOrOverwriteFile = function(objFile, stFileName, stFolderId)
    {
    	//TODO
    };
    
    
    /**
     * Searches for a file and returns the fileid
     *
     * @param {String} stFileName
     * @param {String} stFolderId
     * @returns {String} file id or null if none
     */
    NSUtil.getFileId = function(stFileName, stFolderId)
    {
    	//TODO
    };
    
    
	/**
	 * Convert item record type to its corresponding internal id (e.g. 'invtpart' to 'inventoryitem')
	 * @param {String} stRecordType - record type of the item
	 * @return {String} stRecordTypeInLowerCase - record type internal id
     * @memberOf NSUtil
	 */
	NSUtil.toItemInternalId = function (stRecordType)
	{
		if ( !stRecordType)
		{
			var objError = error.create(
			{
				name : '10003',
				message : 'Item record type should not be empty.',
				notifyOff : false
			});
			throw objError;
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
	};
	
	/**
	 * Get the posting period internal id for the given date
	 * @param {String} stDate - date to search for posting period
	 * @returns {String} stPostingPeriod - internal id of posting period retrieved for the date
	 * @author redelacruz
	 */
	NSUtil.getPostingPeriodByDate = function(stDate)
	{
		//TODO:
	};
	
	/**
	 * Determine whether the posting period for a given date is closed or not
	 * @param {String} stDate - date to search for posting period
	 * @returns {Boolean} bIsClosed - returns true if posting period is closed; otherwise returns false
	 * @author redelacruz
	 */
	NSUtil.isClosedDatePostingPeriod = function(stDate)
	{
		var bIsClosed = true;
		
		var objPdSearch = search.create({
			type: 'accountingperiod',
			filters : 
			[
				['startdate', 'onorbefore', stDate], 'AND',
				['enddate', 'onorafter', stDate], 'AND',
				['isyear', 'is', 'F'], 'AND',
				['isquarter', 'is', 'F'], 'AND',
				['closed', 'is', 'F'], 'AND',
				['alllocked', 'is', 'F']
			],
			columns :  ['periodname']
		});
		
		objPdSearch.run().each(function(objResult){
			bIsClosed = false;
			return false;
		});

		return bIsClosed;
	};
	
	/**
	 * Determine whether the posting period is closed or not
	 * @param {String} stPeriodName - name of posting period to search
	 * @returns {Boolean} bIsClosed - returns true if posting period is closed; otherwise returns false
	 * @author redelacruz
	 */
	NSUtil.isClosedPostingPeriod = function(stPeriodName)
	{
		var bIsClosed = true;
		
		var objPdSearch = search.create({
			type: 'accountingperiod',
			filters : 
			[
				['periodname', 'is', stPeriodName], 'AND',
				['isyear', 'is', 'F'], 'AND',
				['isquarter', 'is', 'F'], 'AND',
				['closed', 'is', 'F'], 'AND',
				['alllocked', 'is', 'F']
			],
			columns :  ['periodname']
		});
		
		objPdSearch.run().each(function(objResult){
			bIsClosed = false;
			return false;
		});

		return bIsClosed;
	};
	
	/**
	 * Get the item price using the price level
	 * @param {String} stItemId - item internal id
	 * @param {String} stPriceLevel - price level internal id
	 * @returns {Object} the price of the item at the given price level
	 */
	NSUtil.getItemPrice = function(stItemId, stPriceLevel)
	{
		if (stPriceLevel == '1')
		{
			return search.lookupFields({type:'item',id:stItemId, columns: 'baseprice'});
		}
		else
		{
			var objItemSearch = search.create({
				type: 'employee',
				filters : 
				[
					['isinactive', 'is', 'F'], 'AND',
					['internalid', 'is', stItemId]
				],
				columns :  ['otherprices']
			});
			
			var stId = null;
			objItemSearch.run().each(function(objResult){
				 stId = objResult.getValue('price' + stPriceLevel);
				 return false;
			});
			return stId;
		}
	};
	

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
	NSUtil.updatedSearch = function(stRecordType, stSearchId, arrSearchFilter, arrSearchColumn)
	{
		if (stRecordType == null && stSearchId == null)
		{
			error.create(
				{
				    name : 'SSS_MISSING_REQD_ARGUMENT',
				    message : 'search: Missing a required argument. Either stRecordType or stSearchId should be provided.',
				    notifyOff : false
				});
		}

		var arrReturnSearchResults = new Array();
		var objSavedSearch;

		var maxResults = 1000;

		if (stSearchId != null)
		{
			objSavedSearch = search.load(
				{
					id : stSearchId
				});

			// add search filter if one is passed
			if (arrSearchFilter != null)
			{
				if (arrSearchFilter[0] instanceof Array || (typeof arrSearchFilter[0] == 'string'))
				{
					objSavedSearch.filterExpression = objSavedSearch.filterExpression.concat(arrSearchFilter);
				}
				else
				{
					objSavedSearch.filters = objSavedSearch.filters.concat(arrSearchFilter);
				}
			}

			// add search column if one is passed
			if (arrSearchColumn != null)
			{
				objSavedSearch.columns = objSavedSearch.columns.concat(arrSearchColumn);
			}
		}
		else
		{
			objSavedSearch = search.create(
				{
					type : stRecordType
				});

			// add search filter if one is passed
			if (arrSearchFilter != null)
			{
				if (arrSearchFilter[0] instanceof Array || (typeof arrSearchFilter[0] == 'string'))
				{
					objSavedSearch.filterExpression = arrSearchFilter;
				}
				else
				{
					objSavedSearch.filters = arrSearchFilter;
				}
			}

			// add search column if one is passed
			if (arrSearchColumn != null)
			{
				objSavedSearch.columns = arrSearchColumn;
			}
		}

		var objResultset = objSavedSearch.run();
		var intSearchIndex = 0;
		var arrResultSlice = null;
		do
		{
			arrResultSlice = objResultset.getRange(intSearchIndex, intSearchIndex + maxResults);
			if (arrResultSlice == null)
			{
				break;
			}

			arrReturnSearchResults = arrReturnSearchResults.concat(arrResultSlice);
			intSearchIndex = arrReturnSearchResults.length;
		}
		while (arrResultSlice.length >= maxResults);

		return arrReturnSearchResults;
	};
	
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
	NSUtil.search = function(stRecordType, stSearchId, arrSearchFilter, arrSearchColumn)
	{
		var arrReturnSearchResults = [];
		var objSavedSearch = {};

		var maxResults = 1000;

		if ( !this.isEmpty(stSearchId))
		{
			objSavedSearch = search.load(
			{
				id : stSearchId
			});
		}
		else if ( !this.isEmpty(stRecordType))
		{
			objSavedSearch = search.create(
			{
				type : stRecordType
			});
		}

		// add search filter if one is passed
		if ( !this.isEmpty(arrSearchFilter))
		{
            if(Array.isArray(arrSearchFilter))
            {
                objSavedSearch.filters = objSavedSearch.filters.concat(arrSearchFilter);
            }
            else
            {
                objSavedSearch.filters = arrSearchFilter;
            }
            
		}

		// add search column if one is passed
		if ( !this.isEmpty(arrSearchColumn))
		{
			objSavedSearch.columns = arrSearchColumn;
		}

		var objResultset = objSavedSearch.run();
		var intSearchIndex = 0;
		var objResultSlice = null;
		do
		{
			objResultSlice = objResultset.getRange(intSearchIndex, intSearchIndex + maxResults);
			if ( !(objResultSlice))
			{
				break;
			}

			for ( var intRs in objResultSlice)
			{
				arrReturnSearchResults.push(objResultSlice[intRs]);
				intSearchIndex ++;
			}
		}
		while (objResultSlice.length >= maxResults);

		return arrReturnSearchResults;
	};

	/**
	 * Get all of the results from the search even if the results are more than 1000.
	 * @param {Object} option - search options similar to var option = {id : '', recordType : '', filters : [], columns : []}
	 * @author memeremilla
     * @memberOf NSUtil
	 */
	NSUtil.searchAll = function (option)
	{
		var arrReturnSearchResults = new Array();
		var objSavedSearch = {};

		var maxResults = 1000;

		if ( !this.isEmpty(option.id))
		{
			objSavedSearch = search.load(
			{
				id : option.id
			});
		}
		else if ( !this.isEmpty(option.recordType))
		{
			objSavedSearch = search.create(
			{
				type : option.recordType
			});
		}

		// add search filter if one is passed
		if ( !this.isEmpty(option.filters))
		{
			objSavedSearch.filters = option.filters;
		}

		if ( !this.isEmpty(option.filterExpression))
		{
			objSavedSearch.filterExpression = option.filterExpression;
		}

		// add search column if one is passed
		if ( !this.isEmpty(option.columns))
		{
			objSavedSearch.columns = option.columns;
		}

		var objResultset = objSavedSearch.run();
		var intSearchIndex = 0;
		var objResultSlice = null;
		do
		{
			objResultSlice = objResultset.getRange(intSearchIndex, intSearchIndex + maxResults);
			if ( !(objResultSlice))
			{
				break;
			}

			for ( var intRs in objResultSlice)
			{
				arrReturnSearchResults.push(objResultSlice[intRs]);
				intSearchIndex ++;
			}
		}
		while (objResultSlice.length >= maxResults);

		return arrReturnSearchResults;
	};

	/**
	 * Search Array and return an object
	 * @param {Object} option - search options similar to
	 * @author memeremilla
     * @memberOf NSUtil
	 */
	NSUtil.searchArray = function (nameKey, value, myArray)
	{
		for (var i=0; i < myArray.length; i++) {
	        if (myArray[i][nameKey] === value) {
	            return myArray[i];
	        }
	    }
		return null;
	};
	
	/**
	 * Add Trailing Characters - FILE FORMATTING
	 * @param text
	 * @param size
	 * @param char
	 * @author mjpascual
     * @memberOf NSUtil
	 */
	NSUtil.addTrailingChar = function(text, size, char) 
	{
		var s = ''+text+'';
		while (s.length < size) s =  s + char;
		return s;
	};
	
	/**
	 * Add Leading Characters - FILE FORMATTING
	 * @param text
	 * @param size
	 * @param char
	 * @author mjpascual
     * @memberOf NSUtil
	 */
	NSUtil.addLeadingChar = function(text, size, char) 
	{
		var s = ''+text+'';
		while (s.length < size) s = char + s;
		return s;
	};
	
	return NSUtil;
});