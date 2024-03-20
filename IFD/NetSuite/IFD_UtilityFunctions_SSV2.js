/**
 * @NApiVersion 2.0
 * @NModuleScope Public
 *
 */

/*
 * Utility Functions: NS, Kalyani Chintala
 */

define(['N/record', 'N/search', 'N/runtime', 'N/error', 'N/format'],
	function(record, search, runtime, error, format)
	{
		function convNull(value)
		{
			if(value == null || value == undefined && value.trim() == '')
				value = '';
			return value;
		}

		function getAllRowsFromSearch(search, recType, searchId, filters, columns, overWriteCols, resultsLimit)
		{
			resultsLimit = toNumber(resultsLimit);
			if(resultsLimit == 0)
				resultsLimit = 10000;

			var retList = new Array();
			var srchObj = null;
			if(searchId == null || searchId == '')
				srchObj = search.create({type : recType, filters: filters, columns: columns});
			else
			{
				srchObj = search.load({id : searchId});
				var existFilters = srchObj.filters;
				var existColumns = srchObj.columns;

				existFilters = (existFilters == null || existFilters == '') ? new Array() : existFilters;
				existColumns = (existColumns == null || existColumns == '') ? new Array() : existColumns;
				if(filters != null && filters != '')
				{
					for(var idx=0; idx < filters.length; idx++)
						existFilters.push(filters[idx]);

					srchObj.filters = existFilters;
				}

				if(columns != null && columns != '')
				{
					if(overWriteCols == true)
						existColumns = columns;
					else
					{
						for(var idx=0; idx < columns.length; idx++)
							existColumns.push(columns[idx]);
					}
					srchObj.columns = existColumns;
				}
			}

			var resultSet = srchObj.run();
			var startPos = 0, endPos = 1000;
			while (startPos <= resultsLimit)
			{
				var options = new Object();
				options.start = startPos;
				options.end = endPos;
				log.debug('Checking', 'Options: ' + JSON.stringify(options));
				var currList = resultSet.getRange(options);
				if (currList == null || currList.length <= 0)
					break;
				if (retList == null)
					retList = currList;
				else
					retList = retList.concat(currList);

				if (currList.length < 1000)
					break;

				startPos += 1000;
				endPos += 1000;
			}

			return retList;
		}

		function runSearch(search, recType, searchId, filters, columns)
		{
			var srchObj = null;
			if(searchId == null || searchId == '')
				srchObj = search.create({type : recType, filters: filters, columns: columns});
			else
			{
				srchObj = search.load({id : searchId});
				var existFilters = srchObj.filters;
				var existColumns = srchObj.columns;

				existFilters = (existFilters == null || existFilters == '') ? new Array() : existFilters;
				existColumns = (existColumns == null || existColumns == '') ? new Array() : existColumns;
				if(filters != null && filters != '')
				{
					for(var idx=0; idx < filters.length; idx++)
						existFilters.push(filters[idx]);
				}
				if(columns != null && columns != '')
				{
					for(var idx=0; idx < columns.length; idx++)
						existColumns.push(columns[idx]);
				}

				srchObj.filters = existFilters;
				srchObj.columns = existColumns;
			}

			var resultSet = srchObj.run();

			return resultSet;
		}


		function toNumber(value)
		{
			if(value == null || value == '' || isNaN(value) || parseFloat(value) == 'NaN')
				value = 0;
			return parseFloat(value);
		}

		function roundNumbers(value, precision)
		{
			if(precision != null && precision != '' && precision != undefined)
				return Math.round(value*Math.pow(10,precision))/Math.pow(10,precision);

			return Math.round(value*Math.pow(10,2))/Math.pow(10,2);
		}

		function isEmpty(stValue){
			if ((stValue == '') || (stValue == null) || (stValue == undefined)){
				return true;
			}
			return false;
		}

		return {
			convNull : convNull,
			getAllRowsFromSearch : getAllRowsFromSearch,
			runSearch: runSearch,
			toNumber: toNumber,
			roundNumbers : roundNumbers
		};
	});
