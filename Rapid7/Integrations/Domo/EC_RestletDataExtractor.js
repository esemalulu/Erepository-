/**
 * Company           Explore Consulting
 * Copyright         2014 Explore Consulting, LLC
 * Description       Executes saved searches generically and returns results as JSON
 **/

// simple mechanism for the caller to know what version of the script they're
// working with. this is returned by the metadata request.
var API_VERSION = "1.2.0";

/**
 * Supported Query parameters for a GET request to this restlet
 * @type {{searchId: undefined, fromDate: undefined, toDate: undefined}}
 */
var GetRequest = {
    // internal id of the netsuite saved search to execute
    searchId: undefined,
    // for asking for a subset of date - beginning date to return data for
    fromDate: undefined,
    // for asking for a subset of date - lst date to return data for
    toDate: undefined,
    // paging start
    startIndex: undefined,
    // paging end
    endIndex: undefined
};

/**
 * Represents ad-hoc query input whereby the user can specify which columns in the results and the search filters
 */
var PostRequest = {
    // starting index of query results
    "startIndex": undefined,
    // end index of query results
    "endIndex": undefined,
    // the type of netsuite record we want to query
    "recordType": undefined,
    // @type {Array.<Array>} netsuite search filter expressions
    "filters": undefined,
    // @type {Array.<Array>} descriptors of desired result columns,
    // each column is a string array of [name, join, summary]
    "results": undefined
};


/**
 * Response for the Get request containing only a searchid
 * @type {{recordCount: undefined, lastModified: undefined, schema: undefined}}
 */
var MetadataResponse = {
    apiVersion: undefined,
    // estimated number of records in the saved search result set
    recordCount: undefined,
    // description of each property in the JSON search result set
    schema: undefined
};

// for tracking overall execution time
var scriptStartTime = moment();

// constant label name for the custom internal ID column we add to both the results and refer
// to in the schema output
var InternalIdLabel = "_NS_ID_";

/**
 * The business operations supported by this restlet,
 * used to distinguish multiple purposes for GET requests
 */
var Op = {
    // a request for meta information about a search
    Metadata: 1,
    // client is requesting a page of search results
    SearchResult: 2
};

/**
 * Ensures inputs are not in conflict and have acceptable values
 * @param {GetRequest} input
 * @returns {Number} which operation is represented by the given parameters
 */
EC.validateGET = function (input) {

    if (!input.searchId)
        throw nlapiCreateError("ARGUMENT_INVALID", "searchId is a required parameter");

    if (input.fromDate && !input.toDate)
        throw nlapiCreateError("ARGUMENT_INVALID", "must specify toDate if fromDate is specified");

    if (input.toDate && !input.fromDate)
        throw nlapiCreateError("ARGUMENT_INVALID", "must specify fromDate if toDate is specified");

    return ( parseInt(input.startIndex) >= 0 ) ? Op.SearchResult : Op.Metadata;
};

/**
 * Ensures inputs are not in conflict and have acceptable values
 * @param {PostRequest} input
 */
EC.validatePOST = function (input) {
    if (!input.recordType)
        throw nlapiCreateError("ARGUMENT_INVALID", "must specify a record type to search! (recordType)");
};

/**
 * HTTP GET Main Restlet entrypoint
 * @param {GetRequest} parms
 *
 */
EC.get = function (parms) {

    var requestedOperation = EC.validateGET(parms);
    var result = null;
    switch (requestedOperation) {
        case Op.Metadata:
            Log.a("Received Metadata Request");
            result = EC.getSearchMetadata(parms.searchId, parms.fromDate, parms.toDate);
            break;
        case Op.SearchResult:
            Log.a("Received Results Request", "startindex/endindex version");
            result = EC.getSearchResults(parms.searchId, parms.startIndex, parms.endIndex,
                parms.fromDate, parms.toDate);
            break;
    }
    Log.a("execution time (ms)", moment().diff(scriptStartTime));

    return result;
};

/**
 * HTTP POST main entrypoint - handles ad-hoc netsuite queries
 * @param {PostRequest} parms the parameters for the query
 */
EC.post = function (parms) {
    // columns are specified as fixed position string expressions much like filter expressions with the array indexes below
    var LABEL= 0, NAME = 1, JOIN = 2, SUMMARY = 3;

    var columns = _.map(parms.results, function (c) {
        // use column name if specified, else assume the "label" is the internal name of the column
        var tmp = new nlobjSearchColumn(c[NAME] || c[LABEL], c[JOIN], c[SUMMARY]);
        tmp.setLabel(c[LABEL] || c[NAME]);
        return tmp;
    });
    var search = nlapiCreateSearch(parms.recordType, parms.filters, columns);

    return getPagesOfResults(search, parms.startIndex, parms.endIndex);
};

/**
 * Returns information about the search to be used by subsequent requests for search results
 * @param searchId internal id of the search
 * @returns {MetadataResponse}
 * @param [fromDate] additional date filter - also specify toDate if you specify fromDate
 * @param [toDate] additional date filter expected to specify fromDate as well
 */
EC.getSearchMetadata = function (searchId, fromDate, toDate) {

    // run a modified search just to get the total record count
    var search = nlapiLoadSearch(null, searchId);
    var origColumns = search.getColumns();
    // trickery to get the actual count of total records for this search
    var countColumn = new nlobjSearchColumn("formulanumeric", null, "sum").setFormula(1);
    search.setColumns([countColumn]);

    var dateFilter = EC.createDateFilter(fromDate, toDate);
    if (dateFilter) search.addFilter(dateFilter);

    var countSearch = search.runSearch();
    var countResults = countSearch.getResults(0, 1);
    var totalCount = countResults[0].getValue(countColumn) || 0;
    Log.a("total record count: " + totalCount);
    var schema = _.map(origColumns, function (c) {
        return {
            formula: c.getFormula(),
            function: c.getFunction(),
            join: c.getJoin(),
            label: EC.makeColumnLabel(c),
            name: c.getName(),
            sort: c.getSort(),
            summary: c.getSummary()
        };
    });

    // add an "id" column which we add via code in the results retrieval operation
    schema.push(
        {
            formula: null,
            function: null,
            join: null,
            label: InternalIdLabel,
            name: "id",
            sort: null,
            summary: null
        });

    return {
        apiVersion: API_VERSION,
        recordCount: totalCount,
        filterExpression: search.getFilterExpression(),
        schema: schema
    };
};

/**
 * Creates a unique column name following a common convention for handling netsuite 'joins'
 * @param {nlobjColumn} column
 */
EC.makeColumnLabel = function (column) {
    var join = column.getJoin();
    var colName = column.getLabel() || column.getName();
    return join ? join + ":" + colName : colName;
};

/**
 * Runs search (as nlapiLoadSearch() and returns results)
 * @param searchId saved search internal id
 * @param {Number} startIndex first record of desired page (e.g. 1)
 * @param {Number} endIndex  last record of desired page   (e.g. 500)
 * @returns {Array|*}
 * @param [fromDate] date filtering for results
 * @param [toDate] date filtering for results
 */
EC.getSearchResults = function (searchId, startIndex, endIndex, fromDate, toDate) {
    var search = EC.cloneSearchWithSortByInternalId(searchId);
    var dateFilter = EC.createDateFilter(fromDate, toDate);
    if (dateFilter) search.addFilter(dateFilter);
    return getPagesOfResults(search,startIndex,endIndex);
};

/**
 * Executes a search and returns all results between the requested indexes
 * @param {nlobjSearch} search the search to execute
 * @param startIndex desired beginning index to retrieve
 * @param endIndex desired ending index to retrieve
 * @return {Array} all search results mapped from startIndex to endIndex
 */
function getPagesOfResults(search, startIndex, endIndex) {

    Log.a("running search...");
    var resultSet = search.runSearch();

    var results = [];
    var numpages = Math.ceil((endIndex - startIndex) / 1000);
    Log.d("getting columns from result set...");
    var columns = resultSet.getColumns();

    Log.a("retrieving up to " + numpages + " 1000-result pages");
    for (var i = 0; i < numpages; i++) {

        var pageStart = parseInt(startIndex) + (i * 1000);
        Log.d("retrieving results starting from index " + pageStart);
        var raw = resultSet.getResults(pageStart, Math.min(pageStart + 1000, parseInt(endIndex)));

        Log.d("actual page length", raw.length);

        // map netsuite results to an array of objects
        // like [{SearchColumnLabel:SearchColumnValue}]
        results = results.concat(_.map(raw, function (r) {
            return _.reduce(columns, function (acc, column) {
                var jsonField = EC.makeColumnLabel(column);
                Log.d("processing column name " + column.getName());
                acc[jsonField] = r.getText(column) || r.getValue(column);
                return acc;
            }, {});
        }));
        // if we're on the last page stop looping
        if (raw.length < 1000) break;
    }
    return results;
}

/**
 * Creates a new search which includes sorted internalid
 * @param searchId internal id of the saved search to clone
 * @returns {Object} search object with internalid added as the first, sorted search column
 */
EC.cloneSearchWithSortByInternalId = function (searchId) {
    var es = nlapiLoadSearch(null, searchId);
    var cols = es.getColumns();

    // remove any "functions" declared on the result columns because of issue where netsuite errors with
    // INVALID_SRCH_FUNCTN for any functions when getResults() is eventually called
    _.each(cols, function(c) {
        if (c.getFunction()) {
            Log.a("removing filter function: " + c.getFunction() + " from column " + c.getName() );
            c.setFunction(null);
        }
    });

    // if any columns use a summary function don't clone because sorting by internalid doesn't make sense
    if (_.any(cols, function(c) { return c.getSummary(); })) {
        Log.a("skipping search cloning", "saved search has a summary field");
        return es;
    }
    else {
        // create a new search with internalid as the natural sort.
        var tmpSearch = nlapiCreateSearch(es.getSearchType(),
            es.getFilters(),
            new nlobjSearchColumn("internalid").setLabel(InternalIdLabel).setSort());

        _.forEach(es.getColumns(), function (c) {
            Log.d("Adding column " + c.getName() + " to cloned search");
            tmpSearch.addColumn(c);
        });

        return tmpSearch;
    }
};

/**
 * Create date filter between two dates - somewhat flexible on input date format
 * @param fromDate a moment() compatible date string or Date or moment object
 * @param toDate a moment() compatible date string or Date or moment object
 * @returns {nlobjSearchFilter|null} null if fromDate or toDate are unspecified
 */
EC.createDateFilter = function (fromDate, toDate) {
    if (!fromDate || !toDate) return null;
    if (!moment(fromDate).isValid()) throw nlapiCreateError("INVALID_FORMAT", "invalid FROM date input format");
    if (!moment(toDate).isValid()) throw nlapiCreateError("INVALID_FORMAT", "invalid TO date input format");

    // use moment so we can accept flexible date input but also convert back to netsuite's expected string format
    // here we're being tricky about string formats to allow minute-resolution on time - seconds
    // and finer resolution don't seem to be supported.
    var fDate = moment(fromDate).format("MM/DD/YYYY h:mm a");
    var tDate = moment(toDate).format("MM/DD/YYYY h:mm a");


    Log.d("adding lastmodifieddate", "within " + fDate + " and  " + tDate);
    return new nlobjSearchFilter("lastmodifieddate", null, "within", fDate, tDate)
};


// automatically logs entering and exiting functions to the netsuite execution log at the DEBUG level
// set the log level of the script in NetSuite to "Debug" to see.
Log.AutoLogMethodEntryExit(null, null, false);



