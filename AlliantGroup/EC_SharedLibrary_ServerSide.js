// declare Explore 'namespace' if it's not already defined
if (typeof EC == "undefined" || !EC) {
    var EC = {};
}

var LogType = {
    Debug: "DEBUG"
    , Error: "ERROR"
    , Audit: "AUDIT"
};

//noinspection JSUnusedGlobalSymbols,JSUnusedGlobalSymbols,JSUnusedGlobalSymbols,JSUnusedGlobalSymbols
/**
 * Provides a consistent interface to logging related behavior.
 * @type {!Object}
 */
var Logger =
{
    /**
     * Writes a message to the netsuite execution log
     * @param {LogType|String} type
     * @param {String} title
     * @param {String} details
     */
    Write: function (type, title, details)
	{
		nlapiLogExecution(type, title, details);
	},


    /**
     * Convenience method for logging a 'DEBUG' severity log message
     * @param title
     * @param [details]
     */
    Debug: function(title, details)
    {
        this.Write(LogType.Debug, title, details);
    },

    /**
     * Convenience method for logging a 'AUDIT' severity log message
     * @param title
     * @param [details]
     */
    Audit: function(title, details)
    {
        this.Write(LogType.Audit, title, details);
    },

    /**
     * Convenience method for logging a 'ERROR' severity log message
     * @param title
     * @param [details]
     */
    Error: function(title, details)
    {
        this.Write(LogType.Error, title, details);
    },

    /**
     * Uses AOP to automatically log method entry/exit with arguments to the netsuite execution log.
     * Call this method at the end of your script.
     * @param [methodsToLogEntryExit] array of pointcuts, defaults to log all methods on the "EC" object
     * @param {Boolean} [withArgs] true if you want to include logging the arguments passed to the method in the details. Default is true.
     */
    AutoLogMethodEntryExit: function( methodsToLogEntryExit, withArgs )
    {
        // default to logging all methods on the EC object
        if ( !methodsToLogEntryExit ) methodsToLogEntryExit = { target:EC, method:/\w/};

        // and include method parameters by default
        if ( withArgs === undefined ) withArgs =  true;

        // record function entry with details for every method on our explore object
        jQuery.aop.before(methodsToLogEntryExit, function () {
            nlapiLogExecution('DEBUG',
                '<span style="color:#0000ff" >Enter <strong>' + arguments[arguments.length - 1] + '()</strong></span>',

               withArgs ? 'args: ' + JSON.stringify(arguments[0]) : null);
        });

        // record function exit for every method on our explore object
        jQuery.aop.after(methodsToLogEntryExit, function (retval) {
            nlapiLogExecution('DEBUG', '<span style="color:#4040ff">Exit ' + arguments[arguments.length - 1] + '()</span>');
            return retval; // forward the original functions return value
        });

    },
    /**
     * Uses AOP to automatically log governance units usage to the NetSuite execution log. Execute this method at the
     * end of your script file and it will log governance data at the start and end of all functions specified.
     * @param [methodsToLogEntryExit] array of pointcuts, defaults to log all methods on the "EC" object
     */
    AutoLogGovernanceUsage: function( methodsToLogEntryExit )
    {
        // default to logging all methods on the EC object
        if ( !methodsToLogEntryExit ) methodsToLogEntryExit = { target:EC, method:/\w/};

        var logFunction = function () {
            var gov = new Governance();
            var remaining = gov.remainingUsage();
            nlapiLogExecution('AUDIT',
                '<span style="color:#A08020" >Governance Remaining: <strong>' + remaining.units + ' units</strong></span>',
                'script has ' + remaining.percent + '% of available units remaining');
            // log a more serious message if we've got less than 10% left
            if ( remaining.percent < 10 )
                nlapiLogExecution('ERROR', 'Script is almost out of governance!', 'only ' + remaining.units + ' left');
        };

        jQuery.aop.before(methodsToLogEntryExit,logFunction);
        jQuery.aop.after(methodsToLogEntryExit,logFunction);

        // log once right now to show what governance we have at the time this function is called
        logFunction();
    }
};

//noinspection FunctionWithInconsistentReturnsJS
/**
 * Presents a singleton governance utility
 * @constructor
 */
function Governance()
{
    if ( Governance.prototype._singletonInstance)
    {
        return Governance.prototype._singletonInstance;
    }
    else Governance.prototype._singletonInstance = this;

    this.startTime =  new Date();
    /**
     * The number of units we have at the start. This is on the prototype so that it's assigned first
     * @type {Number}
     *
     */
    this.initialUnits = nlapiGetContext().getRemainingUsage();
}

     //noinspection JSUnusedGlobalSymbols
    /**
     * Gets the number of seconds elapsed since the script has started.
     * @return {Number} elapsed seconds
     */
    Governance.prototype.elapsedTime = function()
	{
        //noinspection UnnecessaryLocalVariableJS,UnnecessaryLocalVariableJS
        var elapsedTime = ((new Date().getTime() - this.startTime.getTime()) / 1000);
		return elapsedTime;
	};

    /**
     * Gets the number of units remaining for script execution.
     * @return {Object} number of units and percent governance remaining for this script
     */
    Governance.prototype.remainingUsage = function()
	{
		var units = parseInt(nlapiGetContext().getRemainingUsage());
		return { units: units, percent : Math.round((units/this.initialUnits)*100)};
	};

/**
 * Closure used to iterate through saved search results in a scheduled script.
 * Each search result will be passed to eachFunc.
 * If remaining governance dips below governance threshold, perform an nlapiYieldScript.
 * If we had exactly 1000 results returned, reschedule the script.
 * @param eachFunc (function, REQUIRED) - The function to call on each search result
 *          Receives the following parameters:
 *          result - The current nlobjSearchResult
 *          index - The current index in the current result slice
 *          slice - The current result slice, an nlobjSearchResultSet
 *          offset - The index of the 0th element in slice, with regards to the full search results
 * @param type (string, OPTIONAL) - The type of record to search for.  If not specified, savedSearchID is REQUIRED
 * @param savedSearchID (string | int, OPTIONAL) - The saved search ID to use. If not specified, type is REQUIRED
 * @param filters (nlobjSearchFilter | nlobjSearchFilter[] | Object[], OPTIONAL) - An array of filters for the search
 *            *** NOTE ***  an empty array will be treated as an empty array of Object.  THIS WILL REMOVE ALL FILTERS.
 * @param columns (nlobjSearchColumn | nlobjSearchColumn[], OPTIONAL) - An array of columns to use for the search
 * @param governanceThreshold (int, OPTIONAL) - If remaining usage < this number, call nlapiYieldScript.  Default: 100.
 * @param contextObject (nlobjContext, OPTIONAL) -If specified, use this object to get remaining usage.  Otherwise,
 *            init a new nlobjContext
 */
function iterateSearchResults(eachFunc,type,savedSearchID,filters,columns,governanceThreshold,contextObject)
{
    initialize(eachFunc,governanceThreshold,contextObject);
    beginSearch(type,savedSearchID,filters,columns);

    var _governanceThreshold;
    var _context;
    var _search;
    var _results;
    var _func;
    var _totalResultCount;

    /**
     * Initialize _func, _governanceThreshold, and _context.
     * @param func The function to call on each search result
     * @param governance The threshold at which to yield
     * @param context A time-saver to avoid multiple calls to nlapiGetContext(..)
     */
    function initialize(func,governance,context)
    {
        if ( !func || typeof func != 'function' )
            throw new SyntaxError('iterateSearchResults: eachFunc must be a function');

        if ( !governance && governance !== 0)
        {
            _governanceThreshold = 100; // By default, use 1% of scheduled script available governance.
        }
        else
        {
            if ( governance === 0 )
                Logger.Audit('Warning','Setting a governance threshold of 0 is very dangerous!');

            _governanceThreshold = governance;
        }

        _context = context || nlapiGetContext();
        _func = func;
    }

    /**
     * Use type, savedSearchID, filters, and columns to create an nlobjSearch object.
     * Only type is required.
     * @param type The record type to be searched
     * @param savedSearchID The string or numeric internal ID of the saved search to use
     * @param filters A single nlobjSearchFilter or an array of nlobjSearchFilters
     * @param columns A single nlobjSearchColumn or an array of nlobjSearchColumns
     * @throws SyntaxError if neither type nor savedSearchID are defined
     */
    function beginSearch(type,savedSearchID,filters,columns)
    {
        if ( savedSearchID )
        {
            if ( type )
                _search = nlapiLoadSearch(type,savedSearchID);
            else
                _search = nlapiLoadSearch(null,savedSearchID);

            // Add any supplied filters.  We need to determine if filters is a single nlobjSearchFilter, an
            // array of nlobjSearchFilters, or an array of objects
            if ( filters )
            {
                if ( filters instanceof Array )
                {
                    if ( filters.length > 0 && filters[0].getOperator )
                    {
                        _search.addFilters(filters);
                    }
                    else
                        _search.setFilterExpression(filters);
                }
                else
                {
                    _search.addFilter(filters);
                }
            }

            // Add any supplied columns.
            if ( columns )
            {
                if ( columns instanceof Array )
                    _search.addColumns(columns);
                else
                    _search.addColumn(columns);
            }
        }
        else
        {
            if ( !type )
                throw new SyntaxError('At least one of Saved Search ID and Type is required');

            _search = nlapiCreateSearch(type,filters,columns);
        }

        getTotalResultCount();
        getResultSet();
        iterateAllResults();
    }

    /**
     * Use _search to get the total count of results.  This will be used in conjunction with _context to update the
     * % Complete field in the NetSuite UI
     */
    function getTotalResultCount()
    {
        // Store the columns. We will remove all columns, then add in a count of internal IDs column, run the search,
        // and then restore the columns.
        var cachedColumns = _search.getColumns();
        var countResultsColumn = [new nlobjSearchColumn('internalid',null,'count').setSort()];
        _search.setColumns(countResultsColumn);
        // Run the search, get the first result (there's only 1), and dereference it from the array
        _totalResultCount = _search.runSearch().getResults(0,1);
        Logger.Audit('Result set',JSON.stringify(_totalResultCount));
        _totalResultCount = _totalResultCount[0];
        Logger.Audit('First result',JSON.stringify(_totalResultCount));
        _totalResultCount = _totalResultCount.getValue(countResultsColumn[0]) || 0;

        Logger.Audit('Result Count',_totalResultCount);
        _search.setColumns(cachedColumns);
    }

    /**
     * Use _search to get an nlobjSearchResultSet.
     * @throws TypeError if _search is not defined or doesn't have a runSearch method
     */
    function getResultSet()
    {
        if ( _search && _search.runSearch )
            _results = _search.runSearch();
        else
            throw new TypeError('ERROR: _search was not correctly initialized');
    }

    /**
     * Use _results and _func to iterate through all search results, calling _func on each one
     * Page through 1,000 results at a time.  If our remaining governance dips below the governance threshold,
     * use nlapiYieldScript()
     * @throws exception if _results is not a valid nlobjSearchResultSet
     */
    function iterateAllResults()
    {
        if ( !_results || !_results.getResults )
            throw new TypeError('ERROR: _results is not a valid nlobjSearchResultSet');

        var currentSearchPage = 0;
        var currentResultSlice = _results.getResults(0,1000);

        // If current result slice has nothing in it, there's nothing for us to do
        while ( currentResultSlice && currentResultSlice.length && currentResultSlice.length > 0 )
        {
            for ( var i=0; i < currentResultSlice.length; i++ )
            {
                if ( _context.getRemainingUsage() <= _governanceThreshold )
                    nlapiYieldScript();

                _func(currentResultSlice[i],i,currentResultSlice,parseInt(Math.floor(currentSearchPage / 1000)));
                _context.setPercentComplete(_totalResultCount && (currentSearchPage + i) * 100 / _totalResultCount);
            }

            Logger.Audit('Moving to next slice',currentSearchPage);
            currentSearchPage += 1000;
            currentResultSlice = _results.getResults(currentSearchPage, currentSearchPage + 1000);
        }
    }
}







