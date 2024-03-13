/*
*Author: McGladrey LLP
*/

var McGladrey = {};

McGladrey.CommonUtilities = (function () {

    //Private
    function isNullOrEmpty(val) {
        if (val == null || val == '')
            return true;
        else
            return false;
    };

    //Public
    return {
        IsNullOrEmpty: function (val) {
            return isNullOrEmpty(val);
        }
    };

})();

McGladrey.CommonUtilities.Accounts = (function () {

    //Private
    function getType(accountId) {
        return nlapiLookupField('account', accountId, 'type');
    };

    //Public
    return {
        GetType: function (accountId) {
            return getType(accountId);
        }
    };

})();

McGladrey.CommonUtilities.Arrays = (function () {

    //Private
    function objectIndexOf(arr, search, property) {
        for (var i = 0; i < arr.length; i++) {
            if (arr[i][property] == search) return i;
        }
        return -1;
    };

    //Public
    return {

        /*
		Search array of objects to find index of object with specified property value.
        -arr (array) [required]: The array to search
        -search (var) [required]: The value to search for
        -property (string) [required]: The property name to search
		*/
        ObjectIndexOf: function (arr, search, property) {
            return objectIndexOf(arr, search, property);
        },

        /*
         * Return array of months.
         */
        GetMonths: function () {
            return [
                'January',
                'February',
                'March',
                'April',
                'May',
                'June',
                'July',
                'August',
                'September',
                'October',
                'November',
                'December'
            ];
        }
    };
})();

McGladrey.CommonUtilities.Entities = (function () {

    //Private
    function getEntityType(entityId) {

        if (McGladrey.CommonUtilities.IsNullOrEmpty(entityId)) return null;

        var recordType = nlapiLookupField('entity', entityId, 'type');

        switch (recordType) {
            case 'CustJob':
                return 'customer';
                break;

            case 'Partner':
                return 'partner';
                break;

            case 'Vendor':
                return 'vendor';
                break;

            default:
                return null;
        }
    };

    //Public
    return {

        //Given type value from nlapiLookupField('entity', id, 'type'), get the actual internal id
        GetEntityType: function (entityId) {
            return getEntityType(entityId);
        }

    };

})();

McGladrey.CommonUtilities.Items = (function () {

    //Private
    function getType(typeId) {
        switch (typeId.toLowerCase()) {
            case 'assembly':
                return 'assemblyitem';
                break;

            case 'description':
                return 'descriptionitem';
                break;

            case 'discount':
                return 'discountitem';
                break;

            case 'dwnlditem':
                return 'downloaditem';
                break;

            case 'endgroup': //not sure what this is
                return null;
                break;

            case 'giftcert':
                return 'giftcertificateitem';
                break;

            case 'group': //not sure what this it (Item Group?)
                return null;
                break;

            case 'invtpart':
                return 'inventoryitem';
                break;

            case 'kit':
                return 'kititem';
                break;

            case 'markup':
                return 'markupitem';
                break;

            case 'noninvtpart':
                return 'noninventoryitem';
                break;

            case 'othcharge':
                return 'otherchargeitem';
                break;

            case 'payment':
                return 'paymentitem';
                break;

            case 'service':
                return 'serviceitem';
                break;

            case 'shipitem': //currently not scriptable
                return null;
                break;

            case 'subtotal':
                return 'subtotalitem';
                break;

            case 'taxgroup':
                return 'taxgroup';
                break;

            case 'taxitem': //not sure if this is scriptable or not
                return null;
                break;

            default:
                return null;
        }
    };

    function getType_ById(itemId) {
        return getType(nlapiLookupField('item', itemId, 'type'));
    };

    //Public
    return {

        /*
		Get interal type id.
		Ex: InvtPart = inventoryitem
		inventoryitem must be used when loading a record and in other cases, but InvtPart is returned from sublists as the item type.
		A translation was needed for this.
		*/
        GetType: function (typeId) {
            return getType(typeId);
        },

        //Get item record type id by item internal id
        GetType_ById: function (itemId) {
            return getType_ById(itemId);
        }
    };

})();

McGladrey.CommonUtilities.Logging = (function () {

    var logLevel = null;
    var levels = {
        DEBUG: 'DEBUG',
        AUDIT: 'AUDIT',
        ERROR: 'ERROR',
        EMERGENCY: 'EMERGENCY'
    };

    //Private
    function logExecution(type, title, details) {
        nlapiLogExecution(type, title, details);
    };

    //Public
    return {

        //Log debug messge
        Debug: function (title, details) {
            if (logLevel && (logLevel == levels.DEBUG))
                logExecution('DEBUG', title, details);
        },

        //Log audit message
        Audit: function (title, details) {
            if (logLevel && (logLevel == levels.DEBUG || logLevel == levels.AUDIT))
                logExecution('AUDIT', title, details);
        },

        //Log error message
        Error: function (title, details) {
            if (logLevel && (logLevel == levels.DEBUG || logLevel == levels.AUDIT || logLevel == levels.ERROR))
                logExecution('ERROR', title, details);
        },

        //Log details from nlobjError object
        ErrorObject: function (title, errObj) {
            if (logLevel && (logLevel == levels.DEBUG || logLevel == levels.AUDIT || logLevel == levels.ERROR)) {
                var msg = '';
                msg += 'Code: ' + errObj.getCode() + '\n';
                msg += 'Details: ' + errObj.getDetails() + '\n';

                var stackTrace = errObj.getStackTrace();
                for (var i = 0; i < stackTrace.length; i++) {
                    if (i == 0)
                        msg += 'Stack Trace: \n';

                    msg += stackTrace[i];
                }

                logExecution('ERROR', title, msg);
            }
        },

        //Log emergency message
        Emergency: function (title, details) {
            if (logLevel && (logLevel == levels.DEBUG || logLevel == levels.AUDIT || logLevel == levels.ERROR || logLevel == levels.EMERGENCY))
                logExecution('EMERGENCY', title, details);
        },

        /*
         Sets the logging level of the script. Must be one of the accepted log levels.
        */
        SetLogLevel: function (level) {
            if (level) {
                if (level == levels.DEBUG || level == levels.AUDIT || level == levels.ERROR || level == levels.EMERGENCY)
                    logLevel = level;
            }
        },

        /*
         * Generates benchmark start date and logs to AUDIT log.
         * Returns benchmark starting date object.
         */
        StartBenchmark: function (event, client) {

            if (logLevel && (logLevel == levels.DEBUG || logLevel == levels.AUDIT)) {
                var startDt = new Date();
                var startDtDisplay = McGladrey.DateUtilities.GetPerfFormat(startDt);
                var title = McGladrey.CommonUtilities.IsNullOrEmpty(event) ? 'Benchmark' : event;
                title += ' START';

                if (client)
                    console.log(title + ' ' + startDtDisplay);
                else
                    logExecution(levels.AUDIT, title, startDtDisplay);

                return startDt;
            }

            return null;
        },

        /*
         * Generates benchmark end date and logs to AUDIT log. If a start date is passed in, the total elapsed time is also calculated.
         * Returns null if no start date passed in, otherwise returns elapsed milliseconds.
         */
        EndBenchmark: function (event, startDt, client) {

            if (logLevel && (logLevel == levels.DEBUG || logLevel == levels.AUDIT)) {
                var title = McGladrey.CommonUtilities.IsNullOrEmpty(event) ? 'Benchmark' : event;
                title += ' END';

                var endDt = new Date();
                var endDtDisplay = McGladrey.DateUtilities.GetPerfFormat(endDt);
                var msg = endDtDisplay;

                var val = null;
                //calculate total time elapsed if start date object is passed in
                if (startDt) {
                    var elapsed = endDt - startDt;
                    msg += '\n';
                    msg += 'Milliseconds Elapsed: ' + elapsed;
                    val = elapsed;
                }

                if (client)
                    console.log(title + ' ' + msg);
                else
                    logExecution(levels.AUDIT, title, msg);
                return val;
            }

            return null;
        }

    };

})();

McGladrey.CommonUtilities.Formatting = {};

McGladrey.CommonUtilities.Formatting.Number = (function () {

    //Private
    var NegativeFormat = {
        NegativeSign: 0,
        Parentheses: 1
    }

    //Add commas to number with precision specified
    function addCommas(num, precision) {
        n = num;
        c = precision;
        d = ".";
        t = ",";
        s = n < 0 ? "-" : "",
		i = parseInt(n = Math.abs(+n || 0).toFixed(c)) + "",
		j = (j = i.length) > 3 ? j % 3 : 0;
        return s + (j ? i.substr(0, j) + t : "") + i.substr(j).replace(/(\d{3})(?=\d)/g, "$1" + t) + (c ? d + Math.abs(n - i).toFixed(c).slice(2) : "");
    };

    function addParentheses(num) {
        return '(' + num + ')';
    }

    //Public
    return {

        AddCommas: function (num, precision) {
            return addCommas(num, precision);
        },

        Currency: function (num, precision, format) {
            var curr = '';
            if (format == NegativeFormat.Parentheses && num < 0) {
                num = num * -1;
                curr = addCommas(num, precision);
                curr = '$' + curr;
                curr = addParentheses(curr);
            }
            else {
                curr = addCommas(num, precision);
                curr = '$' + curr;
            }

            return curr;
        },

        NegativeFormat: function () {
            return NegativeFormat;
        },

        GetNumberAsFloat: function (value) {
            if (McGladrey.CommonUtilities.IsNullOrEmpty(value) || isNaN(value) == false) return value;

            if (value.indexOf('$' == 0) || value.indexOf('(' == 0)) {
                //Replaces any currency text
                var newValue = value.replace(/[()$,]/g, "");
                //checks to see if the currency had ( if so then assume it was negative)
                if (value.indexOf('(') == -1)
                    return parseFloat(newValue);
                else
                    return (parseFloat(newValue)) * -1;
            }
            else
                return parseFloat(value);
        }
    };

})();

McGladrey.DateUtilities = (function () {

    /**
	 * Private Methods
	 */

    /**
	 * Get time of given date (non 24 hour) with am/pm attached.
	 * Pass true to includeSeconds argument to include seconds in return value.
	 */
    function getTime_AMPM(date, includeSeconds) {
        var unFormattedHours = date.getHours();
        var hours = unFormattedHours;
        hours = hours > 12 ? hours - 12 : hours;

        var minutes = date.getMinutes();
        minutes = minutes < 10 ? '0' + minutes : minutes;

        var seconds = date.getSeconds();
        seconds = seconds < 10 ? '0' + seconds : seconds;

        var ampm = unFormattedHours > 12 ? 'pm' : 'am';

        var returnDate = hours + ':' + minutes;
        if (includeSeconds)
            returnDate += ':' + seconds;

        returnDate += ' ' + ampm;

        return returnDate;
    }

    return {

        /**
		 * Public Methods
		 * 
		 */

        //Return date including milliseconds for performance checks
        GetPerfFormat: function (dt) {
            var date = dt == null ? new Date() : dt;
            var returnDate =
				(date.getMonth() + 1) + '/'
				+ date.getDate() + '/'
				+ date.getFullYear() + ' '
				+ date.getHours() + ':'
				+ date.getMinutes() + ':'
				+ date.getSeconds() + ':'
				+ date.getMilliseconds();
            return returnDate;
        },

        //Return date in format accepted by NetSuite, including seconds
        GetCurrentDate_NSFormat: function () {
            var date = new Date();
            var returnDate = (date.getMonth() + 1) + '/';
            returnDate += date.getDate() + '/';
            returnDate += date.getFullYear();

            returnDate += ' ' + getTime_AMPM(date, true);
            return returnDate;
        },

        //Return date in format accepted by NetSuite, including seconds
        GetCurrentDateNoTime_NSFormat: function () {
            var date = new Date();
            var returnDate = (date.getMonth() + 1) + '/';
            returnDate += date.getDate() + '/';
            returnDate += date.getFullYear();

            return returnDate;
        },

        //Return date in format accepted by NetSuite, with no time attached
        GetDateNoTime_NSFormat: function (transDate) {
            var date = new Date(transDate);
            var returnDate = (date.getMonth() + 1) + '/';
            returnDate += date.getDate() + '/';
            returnDate += date.getFullYear();

            return returnDate;
        },

        //You give it the day of week you want 0 Sunday through 6 Saturday and it will use the current week and return the date for that day.
        GetDayForCurrentWeek: function (dayOfWeek) {
            var date = new Date();
            var dDay = date.getDay();
            var requestedDate = new Date();
            requestedDate.setDate(date.getDate() + (dayOfWeek - dDay));
            return requestedDate;
        },

        //Return date in format accepted by NetSuite in an ISO format (YYYYMMDD), with no time attached
        GetDateNoTime_ISOFormat: function (transDate) {
            var date = new Date(transDate);
            var returnDate = date.getFullYear() + '-';
            returnDate += (date.getMonth() + 1) + '-';
            returnDate += date.getDate();

            return returnDate;
        },

        //Will return a list of years based on the past and future options
        GetYears: function (pastYears, futureYears) {
            var date = new Date();
            var years = [];

            for (var i = pastYears; i >= 0; i--) {
                var year = Number(date.getFullYear() - i).toFixed(0);
                years.push(year);
            }

            for (var i = 1; i <= futureYears; i++) {
                var year = Number(date.getFullYear() + i).toFixed(0);
                years.push(year);
            }

            return years;
        }

    };

})();

McGladrey.FileCabinet = (function () {

    var folderNameCount = 0;
    var originalFolderName = null;

    /*
     * 
     * Total Usage: At least 15. Depends on number of tries required to create unique folder.
     */
    function createFolder(folderName, rootFolderId, isFirst) {

        if (isFirst)
            originalFolderName = folderName;

        if(typeof ScriptBase != 'undefined' && ScriptBase.CheckUsage)
            ScriptBase.CheckUsage(5);

        //Usage: 5
        var folder = nlapiCreateRecord('folder');
        if(rootFolderId)
            folder.setFieldValue('parent', rootFolderId);
        folder.setFieldValue('name', folderName);

        try {

            if (typeof ScriptBase != 'undefined' && ScriptBase.CheckUsage)
                ScriptBase.CheckUsage(10);
            //Usage: 10
            return nlapiSubmitRecord(folder);
        }
        catch (error) {
            if (error instanceof nlobjError) {
                if (error.getDetails() == 'A folder with the same name already exists in the selected folder.') {
                    folderNameCount++;
                    return createFolder(originalFolderName + '_' + folderNameCount, rootFolderId, false);
                }
                else {
                    if (typeof ScriptBase != 'undefined')
                        ScriptBase.Log.ErrorObject(error);

                    throw error;
                }
            }
            else {
                if (typeof ScriptBase != 'undefined')
                    ScriptBase.Log.Error('Unexpected error in McGladrey.FileCabinet.CreateFolder', error.message);

                throw error;
            }
        }
    };

    return {

        /*
         * Creates a folder in the NetSuite file cabinet.
         * folderName [string]: Name of folder to create.
         * rootFolderId [int]: If creating a sub-folder, the root folder to create in. Leave this value null if you want to create your folder in the root NetSuite file cabinet.
         * Returns [int]: Internal id of newly created folder.
         */
        CreateFolder: function (folderName, rootFolderId) {
            return createFolder(folderName, rootFolderId, true);
        }
    }

})();

McGladrey.MapUtilities = {};

McGladrey.MapUtilities.Geolocate = (function () {

    var ClassVariables = {
        BingReq: null,
        BingObject: null
    };

    var Results = {
        Latitude: null,
        Longitude: null,
        Confidence: null
    }

    //private 
    function locate(baseURL, APIKey, streetAdress, city, state, zip) {
        var completeURL = baseURL;
        completeURL = addToURL(completeURL, state);
        completeURL = addToURL(completeURL, zip);
        completeURL = addToURL(completeURL, city);
        completeURL = addToURL(completeURL, streetAdress);
        completeURL += '?&key=';
        completeURL += APIKey;

        callBingAPI(completeURL);

        return Results;
    };

    //Add the next piece on to the URL call
    function addToURL(url, piece) {
        url += '/' + handleSpaces(piece);
        return url;
    };

    //Replaces all spaces with %20 to be used in the URL call
    function handleSpaces(text) {
        var find = ' ';
        var re = new RegExp(find, 'g');
        text = text.replace(re, '%20');

        //If this piece has a . we don't want it.
        while (text.indexOf('.' != -1)) {
            text = text.replace('.', '');
        }

        return text;
    };

    function callBingAPI(url) {
        var header = new Array();
        header['Content-Type'] = 'application/json';

        var resp = nlapiRequestURL(url, null, header);

        if (resp.code == '200') {
            var jsonResults = JSON.parse(resp.body);

            if (jsonResults.resourceSets.length >= 1) {
                if (jsonResults.resourceSets[0].resources.length >= 1) {
                    var results = jsonResults.resourceSets[0].resources[0];

                    Results.Confidence = results.confidence;

                    if (results.geocodePoints.length >= 1) {
                        Results.Latitude = results.geocodePoints[0].coordinates[0];
                        Results.Longitude = results.geocodePoints[0].coordinates[1];
                    }
                }
            }
        }
        return Results;
    };

    return {
        Address: function (baseURL, APIKey, streetAdress, city, state, zip) {
            return locate(baseURL, APIKey, streetAdress, city, state, zip);
        }
    };
})();

McGladrey.Script = {

    Base: function () {
        this.Context = nlapiGetContext();
        this.LogLevel = null;
        this.Arguments = {};
        this.Log = McGladrey.CommonUtilities.Logging;
        this.CU = McGladrey.CommonUtilities;
        this.FunctionName = null;
        this.ScriptType = null;
        this.Client = false;
        this.EventName = null;
        this.Parameters = {};
        this.Runtime = {};
        
        /*
         * Runs all modules pass in.
         */
        this.Run = function (modules) {
            var start = this.Log.StartBenchmark(this.FunctionName, this.Client);
            if (modules) {
                for (var i = 0; i < modules.length; i++) {
                    modules[i]();
                }
            }
            this.Log.EndBenchmark(this.FunctionName, start, this.Client);
        };

        /*
         * Retrieves parameters from script context into local object.
         */
        this.GetParameters = function (params) {
            if (params && params.length > 0) {

                var msg = '';

                for (var i = 0; i < params.length; i++) {
                    this.Parameters[params[i]] = this.Context.getSetting('SCRIPT', params[i]);
                    msg += params[i] + ': ' + this.Parameters[params[i]] + '\n';
                }

                this.Log.Debug('Parameters', msg);
            }
        };
    },

    /*
     * User Event.
     * eventName: one of BeforeLoad, BeforeSubmit, AfterSubmit
     * functionName: actual name of event function
     * arguments: arguments object
     */
    UserEvent: function (eventName, functionName, arguments) {
        this.LogLevel = this.Context.getLogLevel();
        this.Log.SetLogLevel(this.LogLevel);
        this.ScriptType = 'UserEvent';
        this.EventName = eventName;
        this.FunctionName = functionName;
        this.Arguments = arguments;
    },

    /*
     * Client Event
     * eventName: one of PageInit, SaveRecord, ValidateField, FieldChanged, PostSourcing, LineInit, ValidateLine, Recalc, ValidateInsert, ValidateDelete
     * functionName: actual name of event function
     * arguments: arguments object
     * logLevel: client events cannot read log level from context, must be specified manually
     */
    Client: function (eventName, functionName, arguments, logLevel) {
        this.LogLevel = logLevel || 'ERROR';
        this.Log.SetLogLevel(this.LogLevel);
        this.ScriptType = 'Client';
        this.Client = true;
        this.EventName = eventName;
        this.FunctionName = functionName;
        this.Arguments = arguments;
    },

    /*
     * Suitelet
     * functionName: name of function for suitelet entry point
     */
    Suitelet: function (request, response) {
        this.LogLevel = this.Context.getLogLevel();
        this.Log.SetLogLevel(this.LogLevel);
        this.ScriptType = 'Suitelet';
        this.Request = request;
        this.Response = response;
        this.EventName = this.Request.getMethod();
        this.FunctionName = 'Main';

        /*
         * Populate dropdown of months for given field.
         */
        this.PopulateMonthDropdown = function (fld, selected) {
            var months = McGladrey.CommonUtilities.Arrays.GetMonths();
            for (var i = 1; i <= months.length; i++) {
                var selectMonth = selected == i ? true : false;
                fld.addSelectOption(i, months[i-1], selectMonth);
            }
        };

        /*
         * Populate dropdown of years for given field.
         * numPreviousYear = number of years to include prior to current year.
         */
        this.PopulateYearDropdown = function (fld, numPreviousYears) {
            var year = new Date().getFullYear();
            fld.addSelectOption(year, year, true);

            if (numPreviousYears) {
                for (var i = 0; i < numPreviousYears; i++) {
                    year--;

                    fld.addSelectOption(year, year);
                }
            }
        };
    },

    /*
     * Restlet
     * functionName: one of GET, POST, DELETE, PUT
     */
    Restlet: function (functionName) {
        this.LogLevel = this.Context.getLogLevel();
        this.Log.SetLogLevel(this.LogLevel);
        this.ScriptType = 'Restlet';
        this.EventName = functionName;
        this.FunctionName = functionName;
    },

    /*
     * Scheduled
     * functionName: name of function for sheduled script entry point
     */
    Scheduled: function (functionName) {
        this.LogLevel = this.Context.getLogLevel();
        this.Log.SetLogLevel(this.LogLevel);
        this.ScriptType = 'Scheduled';
        this.EventName = 'Main';
        this.FunctionName = 'Main';
        this.CheckUsage = function (threshold, padding) {
            McGladrey.ScriptUtilities.Scheduled.CheckUsage(threshold, padding, this.Context);
        };
    },

    /*
     * Mass Update
     * functionName: name of function for mass update entry point
     * arguments: arguments object
     */
    MassUpdate: function (recordType, recordId) {
        this.LogLevel = this.Context.getLogLevel();
        this.Log.SetLogLevel(this.LogLevel);
        this.ScriptType = 'MassUpdate';
        this.EventName = 'Main';
        this.FunctionName = 'Main';
        this.RecordType = recordType;
        this.RecordId = recordId;
    },

    /*
     * Core NetSuite plugins
     */
    Plugin: {

        /*
         * SuiteGL - Custom GL Lines plugin
         */
        CustomGlLines: function (arguments) {
            this.LogLevel = this.Context.getLogLevel();
            this.Log.SetLogLevel(this.LogLevel);
            this.ScriptType = "CustomGLLines";
            this.FunctionName = "customizeGlImpact";
            this.Arguments = arguments;
        }
    }
};

McGladrey.Script.UserEvent.prototype = new McGladrey.Script.Base();
McGladrey.Script.Client.prototype = new McGladrey.Script.Base();
McGladrey.Script.Suitelet.prototype = new McGladrey.Script.Base();
McGladrey.Script.Restlet.prototype = new McGladrey.Script.Base();
McGladrey.Script.Scheduled.prototype = new McGladrey.Script.Base();
McGladrey.Script.MassUpdate.prototype = new McGladrey.Script.Base();
McGladrey.Script.Plugin.CustomGlLines.prototype = new McGladrey.Script.Base();

McGladrey.ScriptUtilities = {};

McGladrey.ScriptUtilities.Scheduled = (function () {

    //Private

    //Yields script with error handling.
    function yieldScript() {
        var state = nlapiYieldScript();

        if (state.status == 'FAILURE') {

            McGladrey.CommonUtilities.Logging.Error('Failed to yield script, existing: Reason = ' + state.reason + '. Size = ' + state.size);

            if (state.reason == 'SS_MAJOR_RELEASE' || state.reason == 'SS_CANCELLED' || state.reason == 'SS_DISALLOWED_OBJECT_REFERENCE')
                throw nlapiCreateError(state.status, state.reason);
            if (state.reason == 'SS_EXCESSIVE_MEMORY_FOOTPRINT') {
                var details = '';
                details += 'Size: ' + state.size + '\n';
                details += 'Information: ' + state.information + '\n';

                throw nlapiCreateError(state.reason, details);
            }
        }
        else if (state.status == 'RESUME') {
            McGladrey.CommonUtilities.Logging.Audit('Resuming script because of ' + state.reason + '. Size = ' + state.size);
        }
    };

    function checkUsage(threshold, padding, context) {
        var remainingUsage = context ? context.getRemainingUsage() : nlapiGetContext().getRemainingUsage();
        threshold = padding ? threshold + padding : threshold;
        McGladrey.CommonUtilities.Logging.Debug('Remaining Usage', remainingUsage);

        if (remainingUsage < threshold || threshold == null) {
            try {
                yieldScript();
            }
            catch (error) {
                if (error instanceof nlobjError) {
                    McGladrey.CommonUtilities.Logging.ErrorObject('Error yielding script', error);
                    throw error;
                }
                else {
                    var msg = '';
                    msg += 'Error yielding script. Non nlobjError with message: \n';
                    msg += error.message;
                    McGladrey.CommonUtilities.Logging.Error('Non nlobjError while yielding script', msg);
                    throw error;
                }
            }
        }
    };

    //Public
    return {

        /*
		Yields script. If error, it is logged and re-thrown.
		*/
        YieldScript: function () {
            yieldScript();
        },

        /*
		Checks remaining usage and attempts to yield if threshold has been reached.
		-threshold (int) [optional]: If remaining usage is less than threshold or threshold is null, yield is performed.
		-padding (int) [optional]: Padding added to threshold value.
		-context (nlobjContext) [optional]: If context already stored in local variable, might as well pass it in. Otherwise, nlapiGetContext() is called.
		*/
        CheckUsage: function (threshold, padding, context) {
            checkUsage(threshold, padding, context);
        }
    };

})();

McGladrey.ScriptUtilities.Search = (function () {

    var ScriptVariables = {
        SearchResults: null
    };

    //Private

    function getAllResults(search) {
        ScriptVariables.SearchResults = [];

        var searchResultSet = search.runSearch();
        retrieveResults(searchResultSet, 0, 1000);
        return ScriptVariables.SearchResults;
    };

    /*
	Retrieve desired page from search result set.
	*/
    function retrieveResults(resultSet, start, end) {
        var page = resultSet.getResults(start, end);
        for (var i = 0; i < page.length; i++) {
            ScriptVariables.SearchResults.push(page[i]);
        }

        if (page.length == 1000)
            retrieveResults(resultSet, (start + 1000), (end + 1000));
    };

    //Public
    return {
        /*
		Retrieve all records from an nlobjSearch. Iterates through each page and returns array of nlobjSearchResult objects.
		*/
        GetAllResults: function (search) {
            return getAllResults(search);
        }
    };
})();

McGladrey.SOAPUtilities = {};

McGladrey.SOAPUtilities.POST = (function () {
    var ClassVariables = {
        Header: null,
        PostData: null,
        Url: null
    };

    /*
	*Adds a header record to the SOAP call
	*PARAM - headerName - the name/key of the header
	*PARAM - headerValue - the value of the header
	*/
    function addHeader(headerName, headerValue) {
        if (!ClassVariables.Header)
            clearHaeders();

        //Check to see if the same header key is already set
        if (ClassVariables.Header.indexOf(headerName) == -1)
            ClassVariables.Header[headerName] = headerValue;
    };

    /*
	*Clears all of the header data
	*/
    function clearHaeders() {
        ClassVariables.Header = [];
    }

    /*
	*Sets the URL to call
	*PARAM - URL - the web service URL to send the request to
	*/
    function setUrl(url) {
        ClassVariables.Url = url;
    };

    /*
	*Sets the Posting data sent to the web service
	*PARAM - data - the whole payload data to send to the service
	*/
    function setPostData(data) {
        ClassVariables.PostData = data;
    };

    /*
	*Runs the request call and returns the result it revives back
	*/
    function requestURL() {
        try {
            var result = null;

            if (!McGladrey.CommonUtilities.IsNullOrEmpty(ClassVariables.Url))
                result = nlapiRequestURL(ClassVariables.Url, ClassVariables.PostData, ClassVariables.Header);

            return result;
        }
        catch (error) {

            if (error instanceof nlobjError) {
                var msg = '';
                msg += 'Code: ' + error.getCode() + '\n';
                msg += 'Details: ' + error.getDetails() + '\n';

                if (ClassVariables.Header)
                    msg += 'Header: ' + ClassVariables.Header + '\n';

                if (ClassVariables.PostData)
                    msg += 'PostData: ' + ClassVariables.PostData + '\n';

                if (ClassVariables.Url)
                    msg += 'Url: ' + ClassVariables.Url + '\n';

                McGladrey.CommonUtilities.Logging.Error('Error Processing Item', msg);
            }
            else {
                var msg = '';
                msg += 'Err: ' + error.toString() + '\n';

                if (ClassVariables.Header)
                    msg += 'Header: ' + ClassVariables.Header + '\n';

                if (ClassVariables.PostData)
                    msg += 'PostData: ' + ClassVariables.PostData + '\n';

                if (ClassVariables.Url)
                    msg += 'Url: ' + ClassVariables.Url + '\n';

                McGladrey.CommonUtilities.Logging.Error('Error Processing Item', msg);
            }

            return null;
        }
    };

    return {
        /*
		*Adds a header record to the SOAP call
		*PARAM - headerName - the name/key of the header
		*PARAM - headerValue - the value of the header
		*/
        AddHeader: function (headerName, headerValue) {
            addHeader(headerName, headerValue);
        },

        /*
		*Clears all of the header data
		*/
        ClearHeaders: function () {
            clearHaeders();
        },

        /*
		*Sets the URL to call
		*PARAM - URL - the web service URL to send the request to
		*/
        SetURL: function (url) {
            setUrl(url);
        },

        /*
		*Sets the Posting data sent to the web service
		*PARAM - data - the whole payload data to send to the service
		*/
        SetPostData: function (postData) {
            setPostData(postData);
        },

        /*
		*Runs the Post call and returns the result it revives back
		*/
        Post: function () {
            return requestURL();
        }
    }
})();