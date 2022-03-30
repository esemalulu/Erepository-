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
    	return ((stValue === '' || stValue == null || stValue == undefined || stValue == 'undefined')
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
	 * Converts String to Int
	 * @author asinsin
     * @memberOf NSUtil
	 */
    NSUtil.forceInt = function (stValue)
	{
		var intValue = parseInt(stValue);

		if (isNaN(intValue) || (stValue == Infinity)){ return 0; }

		return intValue;
	};

	/**
	* Converts string to float. If value is infinity or can't be converted to a number, 0.00 will be returned.
	* @param {String} stValue - any string
	* @returns {Number} - a floating point number
	* @author jsalcedo
    * @memberOf NSUtil
	*/
	NSUtil.forceFloat = function (stValue)
	{
		var flValue = parseFloat(stValue);

		if (isNaN(flValue) || (stValue == Infinity)){ return 0.00; }

		return flValue;
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
			var errorObj = error.create(
			{
				name : '10003',
				message : 'Item record type should not be empty.',
				notifyOff : false
			});
			throw errorObj;
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
	 * Get all of the results from the search even if the results are more than 1000.
	 * @param {Object} option - search options similar to
	 * @author memeremilla
     * @memberOf NSUtil
	 */
	NSUtil.searchAll = function (option)
	{
		var arrReturnSearchResults = new Array();
		var objSavedSearch = {};

		if ( !this.isEmpty(option.id))
		{
			objSavedSearch = search.load({id : option.id});
		}
		else if ( !this.isEmpty(option.recordType))
		{
			objSavedSearch = search.create({type : option.recordType});
			objSavedSearch.filters = [];
			objSavedSearch.columns = [];
		}

		// add search filter if one is passed
		if ( !this.isEmpty(option.filters))
		{
			objSavedSearch.filters = objSavedSearch.filters.concat( option.filters );
		}

		if ( !this.isEmpty(option.filterExpression))
		{
			objSavedSearch.filterExpression = option.filterExpression;
		}

		// add search column if one is passed
		if ( !this.isEmpty(option.columns))
		{
			objSavedSearch.columns = objSavedSearch.columns.concat(option.columns);
		}

		var objResultset = objSavedSearch.run();
		var intSearchIndex = 0;
		var objResultSlice = null;
		var maxSearchReturn = 1000;
		
		var maxResults = option.maxResults || 0;
		
		do
		{
			var start = intSearchIndex;
			var end = intSearchIndex + maxSearchReturn;
			if ( maxResults  && maxResults <= end)				
			{
				end = maxResults;				
			}								
			objResultSlice = objResultset.getRange(start, end);			
			
			if ( !(objResultSlice))
			{
				break;
			}
			
			arrReturnSearchResults = arrReturnSearchResults.concat(objResultSlice);
			intSearchIndex = intSearchIndex + objResultSlice.length;
			
			if (maxResults && maxResults == intSearchIndex)
			{
				break;				
			}
		}
		while (objResultSlice.length >= maxSearchReturn);

		return arrReturnSearchResults;
	};

	/**
	 * Get all of the results from the search even if the results are more than
	 * 1000.
	 *
	 * @param strSearchId - the search id of the saved search that will be
	 * @param strRecordType
	 * @param {Array} arrFilters - array of nlobjSearchFilter objects. The
	 *            search filters to be used or will be added to the saved search
	 *            if search id was passed.
	 * @param {Array} arrColumns - array of nlobjSearchColumn objects. The
	 *            columns to be returned or will be added to the saved search if
	 *            search id was passed.
	 * @returns {Array} - an array of nlobjSearchResult objects
     * @memberOf NSUtil
	 * @author memeremilla
	 */
	NSUtil.searchList = function (stSearchId, stRecordType, arrFilters, arrColumns)
	{
		var arrReturnSearchResults = new Array();
		var objSavedSearch = {};

		if (stSearchId != null)
		{
			objSavedSearch = search.load(
			{
				id : stSearchId
			});

			// add search filter if one is passed
			if (arrFilters != null)
			{
				objSavedSearch.Filters = arrFilters;
			}

			// add search column if one is passed
			if (arrColumns != null)
			{
				objSavedSearch.Columns = arrColumns;
			}
		}
		else
		{
			objSavedSearch = search.create(
			{
				type : (stRecordType) ? stRecordType : null,
				columns : arrColumns,
				filters : arrFilters
			});

		}

		var objResultset = objSavedSearch.run();
		var intSearchIndex = 0;
		var objResultSlice = null;
		do
		{
			objResultSlice = objResultset.getRange(intSearchIndex, intSearchIndex + 1000);
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
		while (objResultSlice.length >= 1000);

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
	 * @param num
	 * @param size
	 * @param char
	 * @author mjpascual
     * @memberOf NSUtil
	 */
	NSUtil.addTrailingChar = function(num, size, char) 
	{
		var s = ''+num+'';
		while (s.length < size) s =  s + char;
		return s;
	};
	
	/**
	 * Add Leading Characters - FILE FORMATTING
	 * @param num
	 * @param size
	 * @param char
	 * @author mjpascual
     * @memberOf NSUtil
	 */
	NSUtil.addLeadingChar = function(num, size, char) 
	{
		var s = ''+num+'';
		while (s.length < size) s = char + s;
		return s;
	};
	
	return NSUtil;
});
