// jSuite.js 1.0.0
// http://jsuite.ca
// (c) 2014 Darren Hill
// jSuite may be freely distributed under the MIT license.


/* exported jSuite */
/* global _, nlobjError */

var jSuite = (function () {

    var _VERSION = '1.0.0';
    var _RECORDS_PER_CALL = 1000;
    var _MAX_RECORDS = 5000000;
    var _STARTING_UNIT_USAGE_REMAINING = 0;
    var _CONTEXT = null;
    var _MAX_UNITS_USAGE = 0;
    var _UNITS_PER_RESULTSET = 10;
    var _TOTAL_RECORD_COUNT = 0;
    var _LAST_RECORD = 5000000;
    var _DEBUG = false;

    function getVersion() {
        return _VERSION;
    }

    function getUnitsUsed() {
        return _STARTING_UNIT_USAGE_REMAINING - parseInt(_CONTEXT.getRemainingUsage(), 10);
    }

    function runSearch(config) {
        var search, json, startTime;
        startTime = new Date().getTime();
        _CONTEXT = nlapiGetContext();
        _TOTAL_RECORD_COUNT = 0;
        _MAX_RECORDS = 5000000;
        config = config || {};
        _DEBUG = config.debug || false;
        config.searchId = config.searchId || undefined;
        config.recordType = config.recordType || undefined;
        config.filterExpression = config.filterExpression || null;
        config.columns = config.columns || null;
        config.start = config.start || 0;
        config.end = config.end || _MAX_RECORDS;
        config.maxUnitsUsage = config.maxUnitsUsage || parseInt(_CONTEXT.getRemainingUsage(), 10);

        _LAST_RECORD = config.end;
        _MAX_RECORDS = config.end - config.start;

        if (config.end - config.start > _RECORDS_PER_CALL) {
            _MAX_RECORDS = config.end - config.start;
            config.end = config.start + _RECORDS_PER_CALL;
        }
        _MAX_UNITS_USAGE = config.maxUnitsUsage;
        _STARTING_UNIT_USAGE_REMAINING = parseInt(_CONTEXT.getRemainingUsage(), 10);

        if (config.searchId) {
            if (_DEBUG) {
                nlapiLogExecution('DEBUG', 'jSuite.runSearch', 'config.searchId: ' + config.searchId);
            }
            search = nlapiLoadSearch(null, config.searchId);
            if (_DEBUG) {
                nlapiLogExecution('DEBUG', 'jSuite.runSearch', 'Loaded Search!');
            }
            if (config.filterExpression) {
                search.setFilterExpression(config.filterExpression);
            }
        } else {
            search = nlapiCreateSearch(config.recordType, config.filterExpression, config.columns);
        }

        json = getSearchResults(search.runSearch(), config.start, config.end);

        json.searchId = search.getId();
        json.searchType = search.getSearchType();
        json.filterExpression = search.getFilterExpression();
        json.unitsUsed = getUnitsUsed();
        json.startingUnits = _STARTING_UNIT_USAGE_REMAINING;
        json.endingUnits = parseInt(_CONTEXT.getRemainingUsage(), 10);
        json.totalRecords = json.Results.length;
        json.timeElapsed = (new Date().getTime()) - startTime;
        return json;
    }

    function getSearchResults(searchResultSet, start, end, json) {
        var searchResults, jsonResult, columns, columnValue, columnNumber, rowCount = 0;

        columns = searchResultSet.getColumns();
        if (start === undefined) {
            start = 0;
        }
        if (end === undefined) {
            end = _RECORDS_PER_CALL;
        }
        if (json === undefined) {
            json = {};
            json.Results = [];
        }

        searchResults = searchResultSet.getResults(start, end);

        _.each(searchResults, function (searchResult) {
            _TOTAL_RECORD_COUNT = _TOTAL_RECORD_COUNT + 1;
            rowCount = rowCount + 1;
            jsonResult = {
                id: parseInt(searchResult.getId(), 10),
                type: searchResult.getRecordType()
            };
            _.each(columns, function (column) {
                jsonResult[column.getLabel()] = {};
                columnValue = searchResult.getValue(column);
                columnNumber = +columnValue;
                if (columnValue !== null && columnValue.length > 0) {
                    if (!isNaN(columnNumber)) {
                        jsonResult[column.getLabel()].val = columnNumber;
                    } else {
                        jsonResult[column.getLabel()].val = columnValue;
                    }
                }
                jsonResult[column.getLabel()].txt = searchResult.getText(column);
            });
            json.Results.push(jsonResult);
        });

        if (parseInt(_CONTEXT.getRemainingUsage(), 10) >= _UNITS_PER_RESULTSET && getUnitsUsed() <= (_MAX_UNITS_USAGE - _UNITS_PER_RESULTSET)) {
            if (rowCount >= _RECORDS_PER_CALL && _TOTAL_RECORD_COUNT < _MAX_RECORDS) {
                if ((end + _RECORDS_PER_CALL) > _LAST_RECORD) {
                    getSearchResults(searchResultSet, start + _RECORDS_PER_CALL, _LAST_RECORD, json);
                } else {
                    getSearchResults(searchResultSet, start + _RECORDS_PER_CALL, (end + _RECORDS_PER_CALL), json);
                }
            }
        }
        return json;
    }

    function isNumber(n) {
        return n !== null && n !== '' && !isNaN(parseInt(n, 10)) && isFinite(n);
    }

    function getRecordLink(recordType, recordId) {
        return  '<a href=' + nlapiResolveURL('RECORD', recordType, recordId, 'VIEW') + '>' + recordId + '</a>';
    }

    function errText(_e) {
        var txt = '';
        if (_e instanceof nlobjError) {
            txt = 'NLAPI Error: ' + _e.getCode() + ' :: ' + _e.getDetails();
        } else {
            txt = 'JavaScript/Other Error: ' + _e.toString();
        }
        return txt;
    }

    function getCurrentDateTime (timeZoneOffSet) {
        if ((timeZoneOffSet === null && timeZoneOffSet === '' && timeZoneOffSet === undefined) || isNaN(timeZoneOffSet)){
            return new Date();
        }
        var currentDateTime = new Date();
        var UTC = currentDateTime.getTime() + (currentDateTime.getTimezoneOffset() * 60000);
        currentDateTime = UTC + (timeZoneOffSet * 60 * 60 * 1000);

        return new Date(currentDateTime);
    }

    function getCurrentDateTimeText (timeZoneOffSet, nsDateFormat) {
        return nlapiDateToString(getCurrentDateTime(timeZoneOffSet), nsDateFormat);
    }

    function getCompanyCurrentDateTime () {
        var currentDateTime = new Date();
        var companyTimeZone = nlapiLoadConfiguration('companyinformation').getFieldText('timezone');
        var timeZoneOffSet = (companyTimeZone.indexOf('(GMT)') === 0) ? 0 : new Number(companyTimeZone.substr(4, 6).replace(/\+|:00/gi, '').replace(/:30/gi, '.5')); // jshint ignore:line
        var UTC = currentDateTime.getTime() + (currentDateTime.getTimezoneOffset() * 60000);
        var companyDateTime = UTC + (timeZoneOffSet * 60 * 60 * 1000);

        return new Date(companyDateTime);
    }

    function getCompanyCurrentDateTimeText(nsDateFormat) {
        return nlapiDateToString(getCompanyCurrentDateTime(), nsDateFormat);
    }

    function getSubsidiaryCurrentDateTime(subsidiary) {
        var currentDateTime = new Date();
        var subsidiaryTimeZone = nlapiLoadRecord('subsidiary', subsidiary).getFieldText('TIMEZONE');
        var timeZoneOffSet = (subsidiaryTimeZone.indexOf('(GMT)') === 0) ? 0 : new Number(subsidiaryTimeZone.substr(4, 6).replace(/\+|:00/gi, '').replace(/:30/gi, '.5')); // jshint ignore:line
        var UTC = currentDateTime.getTime() + (currentDateTime.getTimezoneOffset() * 60000);
        var subsidiaryDateTime = UTC + (timeZoneOffSet * 60 * 60 * 1000);

        return new Date(subsidiaryDateTime);
    }

    function getSubsidiaryCurrentDateTimeText(timeZoneOffSet, nsDateFormat) {
        return nlapiDateToString(getCurrentDateTime(timeZoneOffSet), nsDateFormat);
    }

    var API = {};
    API.runSearch = runSearch;
    API.errText = errText;
    API.getVersion = getVersion;
    API.isNumber = isNumber;
    API.getRecordLink = getRecordLink;
    API.getCurrentDateTime = getCurrentDateTime;
    API.getCurrentDateTimeText = getCurrentDateTimeText;
    API.getCompanyCurrentDateTime = getCompanyCurrentDateTime;
    API.getCompanyCurrentDateTimeText = getCompanyCurrentDateTimeText;
    API.getSubsidiaryCurrentDateTime = getSubsidiaryCurrentDateTime;
    API.getSubsidiaryCurrentDateTimeText = getSubsidiaryCurrentDateTimeText;

    return API;
}());
