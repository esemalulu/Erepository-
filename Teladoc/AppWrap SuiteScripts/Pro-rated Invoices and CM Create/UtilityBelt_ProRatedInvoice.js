/**
 * UtilityBelt2.0.js
 * @NApiVersion 2.0
 * @NModuleScope public
 */
define(function () {
    var LOG_TITLE = 'UtilityBelt'
    /**
     * This function checks if the passed value is Null or Undefined.
     *
     * @param  {String|Number|Array}  value The value that will be checked.
     * @return {Boolean}       True if value is null or undefined, false if otherwise.
     */
    function nullUndefined(value) {
        if (value === null) {
            return true;
        }
        return value === undefined;

    }
    
    /**
     * This function removes extra specified character from the left of the String.
     *
     * @param  {String} str   String to process.
     * @param  {String} chars Optional. The character to be removed from the left side.
     *                        Defaults to space if blank.
     * @return {String}       Processed string.
     */
    function leftTrim(str, chars) {
        chars = chars || "\\s";
        return str.replace(new RegExp("^[" + chars + "]+", "g"), "");
    }

    /**
     * This function removes extra specified character from the right of the String.
     *
     * @param  {String} str   String to process.
     * @param  {String} chars Optional. The character to be removed from the right side.
     *                        Defaults to space if blank.
     * @return {String}       Processed string.
     */
    function rightTrim(str, chars) {
        chars = chars || "\\s";
        return str.replace(new RegExp("[" + chars + "]+$", "g"), "");
    }

    /**
     * This function removes extra specified character from the left and right of the String.
     *
     * @param  {String} str   String to process.
     * @param  {String} chars Optional. The character to be removed from the left and right side.
     *                        Defaults to space if blank.
     * @return {String}       Processed string.
     */
    function trim(str, chars) {
        return leftTrim(rightTrim(str, chars), chars);
    }

    /**
     * This function executes the NetSuite search.
     *
     * @param  {search} search_obj The NetSuite search object.
     * @return {Array}            Array contain the search result objects.
     */
    function executeSearch(search_obj) {
        var pagedData = search_obj.runPaged({pageSize: 1000});

        var search_result = [];
        pagedData.pageRanges.forEach(function (pageRange) {
            pagedData.fetch({index: pageRange.index}).data.forEach(function (result) {
                search_result.push(result);
                return true;
            });

            return true;
        });

        log.debug({
            title: 'Execute Search',
            details: 'Number of Records Found:=' + search_result.length
        });

        return search_result;
    }

    /**
     * This function checks if the string or array is empty.
     *
     * @param  {String|Array}  stValue The value that will be checked.
     * @return {Boolean}         True is the value is empty, false if otherwise.
     */
    function isEmpty(stValue) {
        if (nullUndefined(stValue) === true) {
            return true;
        } else {
            if (isString(stValue) === true) {
                return isBlank(stValue) || (!stValue || 0 === stValue.length);
            } else if (isArray(stValue) === true) {
                return (stValue.length === 0);
            }
        }

        return false;
    }

    function forceParseInt(variable, base) {

        base = (isEmpty(base) === true) ? 10 : base;
        var value = !isEmpty(variable) ? parseInt(('' + variable)
            .replace(/[^\d\.-]/gi, ''), base) : 0;

        return !isNaN(value) ? value : 0;
    }

    function forceParseFloat(variable) {

        var value = !isEmpty(variable) ? parseFloat(('' + variable)
            .replace(/[^\d\.-]/gi, '')) : 0;

        return !isNaN(value) ? value : 0;
    }

    /**
     * Wrapper for SS2.0 N/format.format method. Converts a Date object into a date string
     * in the date format specified in the current NetSuite account.
     * For client side scripts, the string returned is based on the userÃ¢â‚¬â„¢s system time.
     * For server-side scripts, if you do not provide a timeZone parameter the string returned
     * is based on the system time of the server your NetSuite system is running on.
     *
     * @param  {Date} date       Date object to be converted into date string format
     * @param  {enum} formatType Holds the string values for the supported field types.
     * @param  {enum} timeZone   Holds the valid time zone names in Olson Value, the date will be converted to this time zone.
     *                           If a time zone is not specified, the time zone is set based on the server your NetSuite system is running on.
     *                           If the time zone is invalid, the time zone is set to GMT.
     * @return {string}          The formatted value as a string.
     */
    function dateToString(date, formatType, timeZone) {

        var value = '';

        require(['N/format'], function (format) {
            value = format.format({
                value: date,
                type: formatType,
                timezone: format.Timezone[timeZone]
            });
        });

        return value;
    }

    /**
     * Wrapper for SS2.0 N/format.parse method. Converts a string date into a Date object.
     *
     * @param  {Date} date       Date object to be converted into date string format
     * @param  {enum} formatType Holds the string values for the supported field types.
     * @return {Date}
     */
    function stringToDate(date, formatType) {

        var value = '';

        require(['N/format'], function (format) {
            value = format.parse({
                value: date,
                type: formatType
            });
        });

        return value;
    }

    function closeSuitelet() {
        var html = [];
        html.push('<html>');
        html.push('<head>');
        html.push('<script>');
        html.push("window.close()");
        html.push('</script>');
        html.push('</head>');
        html.push('<body>');
        html.push('</body>');
        html.push('</html>');

        html = html.join('');

        return html;
    }

    /**
     * Converts 'T' or 'F' to its Boolean counterpart
     *
     * @param  {String|Boolean} val 'T' or 'F'
     * @return {Boolean}     true or false
     */
    function toBoolean(val) {

        if (!nullUndefined(val)) {
            if (typeof (val) === "boolean") {
                return val;
            } else {
                if (val === 'T') {
                    return true;
                }
            }
        }
        return false;
    }

    function monthDiff(to, from) {
    	var months = to.getMonth() - from.getMonth() 
        + (12 * (to.getFullYear() - from.getFullYear()));

	    if(to.getDate() < from.getDate()){
	        months--;
	    }
	    return Math.abs(months);
    }
    
    function isNumber(value) {
        return typeof value === 'number' && isFinite(value);
    }

    function isString(value) {
        return typeof value === 'string' || value instanceof String;
    }

    function isArray(value) {
        return value && typeof value === 'object' && value.constructor === Array;
    }
	
	function isObject(value) {
        return (!!value) && (value.constructor === Object);
    }

    function isBlank(str) {
        return (!str || /^\s*$/.test(str));
    }

    function resultsToJson(results) {
        var jsonResult = [];

        results.forEach(function (result) {
            var columns = result.columns;

            var jsonData = {
                internalid: result.id,
                recordType: result.recordType
            };

            columns.forEach(function (column) {
                var index = '';
                if (isEmpty(column.join) === false) {
                    index = column.name + '_' + column.join;
                } else {
                    index = column.name;
                }

                jsonData[index + '_value'] = result.getValue(column);
                jsonData[index + '_text'] = result.getText(column);

                return true;
            });
            jsonResult.push(jsonData);

            return true;
        });

        return jsonResult;
    }
    function getParameters(parameterIds)
    {   
        var scriptContext;
        require(['N/runtime'],
            function(runtime){
                scriptContext = runtime.getCurrentScript();
            })
        var parametersMap = {};
       
        var obj;
        var value;
        var isMandatory;
        var id;
        log.debug(LOG_TITLE, 'Parameter ids:'+JSON.stringify(parameterIds));
        for (var key in parameterIds)
        {
            if (parameterIds.hasOwnProperty(key))
            {
                obj = parameterIds[key];
                if (typeof obj === 'string')
                {
                    value = scriptContext.getParameter(obj);
                }
                else
                {
                    id = obj.id;
                    isMandatory = obj.isMandatory;
                    value = scriptContext.getParameter(id);
                }
              
                if (value!=='' && value!==null)
                {
                    parametersMap[key] = value;
                }
                else
                {
                    if (isMandatory==true)
                    {
                        require(['N/error'],
                            function(error){
                                 throw error.create(
                            {
                                name: 'MISSING_PARAMETER',
                                message: 'Missing Script Parameter:' + key + '[' + id + ']'
                            });
                        });
                       
                    }

                }

            }
        }
        log.debug(LOG_TITLE, 'Parameters:'+JSON.stringify(parametersMap));
        return parametersMap;
    }
    
    function getAllColumns(nsSearch, objFlds)
    {
    	log.debug(LOG_TITLE, 'objFlds:'+JSON.stringify(objFlds));
    	var searchColumns = [];
    	for (var i in objFlds)
    	{
    		if(i != 'ID' && i != 'D_PREDECESSORDETAILS')
    		{
    			 searchColumns.push(nsSearch.createColumn({ name: objFlds[i] }));
    		}
    	}
    	
    	log.debug(LOG_TITLE, 'searchColumns:'+JSON.stringify(searchColumns));
    	
    	return searchColumns;
      
    }
    
    function searchToObj(searchResult, objFld)
    {
    	var LOG_TITLE = 'searchToObj';
    	
    	if(!searchResult){
    		return null;
    	}
    	
    	var arrObjResults = [];
    	for(var i in searchResult)
    	{
    		var obj = {};
    		var res = searchResult[i];
    		log.debug(LOG_TITLE, 'res:'+JSON.stringify(res));
        	
    		for (var j in objFld)
    		{
    			//log.debug(LOG_TITLE, 'objFld'+JSON.stringify(objFld));
            	
    			var val = res.getValue(objFld[j]);
    			if(!val){
    				val = res.getText(objFld[j]);
    			}
    			obj[objFld[j]] = val;
    		}
    		//log.debug(LOG_TITLE, 'obj'+JSON.stringify(obj));
        	
    		arrObjResults.push(obj);
    	}
    	
    	return arrObjResults;
    }
    
    function searchToObjIdBased(searchResultLinks, objFld)
    {
    	var objResults = {};
    	objResults.arrIds = []; 
    	objResults.arrDetails = [];
    	//objResults.arrSummary = {};
    	var arrIds = [];
    	for(var i=0; i<searchResultLinks.length; i++ )
    	{
    		var objResult = searchResultLinks[i];
    		var stInternalId = objResult.getValue(objFld.INTERNAL);
    		var obj = {};
    		obj[stInternalId] = {};
    		for(var j in objFld)
    		{
    			if(!obj[stInternalId][objFld[j]])
    			{
    				obj[stInternalId][objFld[j]] = {};
    			}
    			obj[stInternalId][objFld[j]].val = objResult.getValue(objFld[j]);
    			obj[stInternalId][objFld[j]].txt = objResult.getText(objFld[j]);
    			
    		}
    		objResults.arrDetails.push(obj);
    		objResults.arrIds.push(stInternalId);
    	}

    	log.debug('searchLinkageResultToObj',  'RESULTS objResults ' + JSON.stringify(objResults));
        return objResults;
    }
    
    function getFieldValues(rec, objFld)
    {
    	var LOG_TITLE = 'getFieldValues';
    	
    	var obj = {};
		for (var j in objFld)
		{
			//log.debug(LOG_TITLE, 'objFld'+JSON.stringify(objFld));
        	
			var val = rec.getValue(objFld[j]);
			obj[objFld[j]] = val;
		}
		//log.debug(LOG_TITLE, 'obj'+JSON.stringify(obj));
        
		return obj;
    	
    }
    
    function validateJSONHasValues(obj)
    {
    	var bValid = true;
    	for(var i in obj)
    	{
    		if(obj[i] == '')
    		{
    			bValid = false;
    			break;
    		} 
    	}
    	
    	return bValid;
    }
    
    function getAllRowsFromSearch(search, recType, searchId, filters, columns, overWriteCols)
	{
    	log.debug('getAllRowsFromSearch', 'recType'+recType + ' searchId'+searchId);
    	
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
			}
			
			srchObj.filters = existFilters;
			srchObj.columns = existColumns;
		}
		
		var resultSet = srchObj.run();
		var startPos = 0, endPos = 1000;
		while (startPos <= 10000)
		{
			var options = new Object();
			options.start = startPos;
			options.end = endPos; 
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
    
    
    function runSearch(search, recType, searchId, filters, columns, bColumn){
		var srchObj = null;
		var arrSearchResults = [];
		var arrResultSet = null;
		var intSearchIndex = 0;
		
		// if search is ad-hoc (created via script)
		if (searchId == null || searchId == '')
		{
			srchObj = search.create({type : recType, filters: filters, columns: columns});
		}
		// if there is an existing saved search called and used inside the script
		else
		{
			srchObj = search.load({id : searchId});
			var existFilters = srchObj.filters;
			var existColumns = srchObj.columns;
			
			var arrNewFilters = [];
			var bIsResultsWithSummary = false;
			
			for (var i = 0; i < existFilters.length; i++)
			{
		 		var stFilters = JSON.stringify(existFilters[i]);
		 		var objFilters = JSON.parse(stFilters);
		 		
		 		var objFilter = search.createFilter({
					name: objFilters.name,
					join: objFilters.join,
					operator: objFilters.operator,
					values: objFilters.values,
					formula: objFilters.formula,
					summary: objFilters.summary
				});
				
				arrNewFilters.push(objFilter);
			}
			
			existFilters = (existFilters == null || existFilters == '') ? new Array() : existFilters;
			existColumns = (existColumns == null || existColumns == '') ? new Array() : existColumns;
			
			// include additional filters created via script
	 		if (filters != null && filters != '')
			{
	 			for(var idx=0; idx < filters.length; idx++)
	 			{
	 				existFilters.push(filters[idx]);
	 			}
			}
	 	
	 		// include additional columns created via script
			if (columns != null && columns != '')
			{
				for(var idx=0; idx < columns.length; idx++)
				{
					existColumns.push(columns[idx]);
				}
			}
			
	        for (var i = 0; i < existColumns.length; i++)
	        {
	            var stColumns = JSON.stringify(existColumns[i]);
	            var objColumns = JSON.parse(stColumns);
	            
	            if (objColumns.summary != null)
	            {
	                bIsResultsWithSummary = true;
	                break;
	            }
	        }

			
			// reset original filters and columns to original ones + those passed via script
			srchObj.filters = existFilters;
			srchObj.columns = existColumns;
		}
		
		var objRS = srchObj.run();
		
		if(!bColumn){
			// do the logic below to get all the search results because if not, you will only get 4000 max results
			do
			{
				arrResultSet = objRS.getRange(intSearchIndex, intSearchIndex + 1000);
				if (!(arrResultSet))
				{
					break;
				}
		
				arrSearchResults = arrSearchResults.concat(arrResultSet);
				intSearchIndex = arrSearchResults.length;
			}
			while (arrResultSet.length >= 1000);
		} 
		else 
		{
			arrResultSet = objRS.getRange(0, 1);
		}
		
		var objResults = {};
			objResults.resultSet = objRS;
			objResults.actualResults = arrSearchResults;
		
		return objResults;
	}
	

    function insert(main_string, ins_string, pos) {
	   if(typeof(pos) == "undefined") {
	    pos = 0;
	  }
	   if(typeof(ins_string) == "undefined") {
	    ins_string = '';
	  }
	   return main_string.slice(0, pos) + ins_string + main_string.slice(pos);
	}
    
    
    function arr_diff (a1, a2) {

        var a = [], diff = [];

        for (var i = 0; i < a1.length; i++) {
            a[a1[i]] = true;
        }

        for (var i = 0; i < a2.length; i++) {
            if (a[a2[i]]) {
                delete a[a2[i]];
            } else {
                a[a2[i]] = true;
            }
        }

        for (var k in a) {
            diff.push(k);
        }

        return diff;
    }
    
    function twoDecimals(flNo){
    	if(!flNo) flNo = 0;
    	return  Math. round(parseFloat(parseFloat(flNo).toFixed(2)), 0)
    }
    
	function inArray(stValue, arrValue)
	{
		var bIsValueFound = false;
		for ( var i = arrValue.length - 1; i >= 0; i--)
		{
			if (stValue == arrValue[i])
			{
				bIsValueFound = true;
				break;
			}
		}
		return bIsValueFound;
	};
   

	function convNull(value)
	{
		if(value == null || value == undefined)
			value = '';
		return value;
	};

	function between(x, min, max) {
 		 return x >= min && x <= max;
	}
  
    var exports = {};
    exports.convNull = convNull;
    exports.inArray = inArray;
    exports.twoDecimals = twoDecimals;
    exports.getAllColumns = getAllColumns;
    exports.leftTrim = leftTrim;
    exports.rightTrim = rightTrim;
    exports.trim = trim;
    exports.getAllRowsFromSearch = getAllRowsFromSearch;
    exports.searchToObj = searchToObj;
    exports.searchToObjIdBased = searchToObjIdBased;
    exports.executeSearch  = executeSearch;
    exports.isNullUndefined = nullUndefined;
    exports.isEmpty = isEmpty;
    exports.forceInteger = forceParseInt;
    exports.forceFloat = forceParseFloat;
    exports.dateToString = dateToString;
    exports.stringToDate = stringToDate;
    exports.closeSuitelet = closeSuitelet;
    exports.resultsToJson = resultsToJson;
    exports.toBoolean = toBoolean;
    exports.isNumber = isNumber;
    exports.isArray = isArray;
    exports.isString = isString;
    exports.isBlank = isBlank;
    exports.getParameters = getParameters;
    exports.getFieldValues = getFieldValues;
    exports.monthDiff = monthDiff;
    exports.validateJSONHasValues = validateJSONHasValues;
    exports.insert  = insert;
    exports.arr_diff = arr_diff;
    exports.runSearch = runSearch;
    exports.between = between;
    return exports;
});
