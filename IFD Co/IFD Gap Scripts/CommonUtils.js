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
 * Compilation of common utility functions used for:
 * - Evaluating objects
 * - Parsing objects
 * - Date helper
 */

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