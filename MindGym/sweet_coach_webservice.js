var SUPPLIER_CATEGORY_COACH = "5";

/**
 * Coach Web service
 *
 * @method coachWebService
 * @param {Object} request
 * @param {Object} response
 */
function coachWebService(request, response)
{
  responseWriter = response;

  nlapiLogExecution('DEBUG', 'Begin', 'coachWebService');

  try {
    var resultSet = new Object;
    var action = request.getParameter('action');

    nlapiLogExecution('DEBUG', 'action', action);

    if (YAHOO.lang.isString(action)) {
      switch (action.toLowerCase()) {
        case 'getallcoaches':
          resultSet = getAllCoaches();
          break;
        case 'getcoachavailability':
          resultSet = getCoachAvailability();
          break;
        case 'getcoachescount':
          resultSet = getCoachesCount();
          break;
        case 'getallcoachavailability':
          resultSet = getAllCoachAvailability();
          break;
        case 'search':
          resultSet = search(request);
          break;
      }
    }
    
    // Convert object to JSON
    var jsonStr = YAHOO.lang.JSON.stringify(resultSet);
    
    // Output
    response.write(jsonStr);
    
  } catch (e) {
  
    // Write error to screen
    if (e instanceof nlobjError) {
      response.write('Error: ' + e.getCode() + '\n' + e.getDetails());
    }
    response.write('Error: ' + e.toString());
  }

  nlapiLogExecution('DEBUG', 'Exit Successfully', 'coachWebService');
}

/**
 * Get all coaches (i.e. vendors with category = coach)
 *
 * @todo This function will crash if it runs out of time or units. Be nice, exit gracefully.
 * @return {Object}
 */
function getAllCoaches() {

  nlapiLogExecution('DEBUG', 'Start', 'getAllCoaches');

  var resultSet = new Object;
  resultSet.coaches = new Object;
  resultSet.coaches.coach = new Array();
  var moreResults = false;
  internalIdNumber = 0;

  do {
    
    // Filter
    var filters = new Array();
    
    // Only coaches
    filters.push(new nlobjSearchFilter('category', null, 'is', SUPPLIER_CATEGORY_COACH));
    
    if (moreResults) {
      filters.push(new nlobjSearchFilter('internalIdNumber', null, 'greaterthan', internalIdNumber));
    }
    
    // Ignore the 'To be agreed' coach
    filters.push(new nlobjSearchFilter('lastname', null, 'isnot', 'TBA'));
    
    nlapiLogExecution('DEBUG', '# filters', filters.length);
    
    // Columns
    var columns = new Array();
    columns.push(new nlobjSearchColumn('firstname'));
    columns.push(new nlobjSearchColumn('lastname'));
    columns.push(new nlobjSearchColumn('entityid'));           
    columns.push(new nlobjSearchColumn('category')); 
    
    // Search
    var searchResults = nlapiSearchRecord('vendor', null, filters, columns);
    nlapiLogExecution('DEBUG', 'Page count', searchResults.length);
    
    // Process results
    if (!searchResults || searchResults.length < 1) {
      moreResults = false; // We're done
    } else {
      
      // Arrange the results in an object
      var i = 0, n = searchResults.length;
      for (;i < n; i++) {
        var searchResult = searchResults[i];

        // if (searchResult.getValue('category') != SUPPLIER_CATEGORY_COACH) {
        //   continue; // Skip non-coach records to work around bug in Netsuite
        // }    

        var coach = new Object;
        coach.internalId = searchResult.getId();
        coach.firstname = searchResult.getValue('firstname');
        coach.lastname = searchResult.getValue('lastname');
        coach.entityid = searchResult.getValue('entityid');
        coach.category = searchResult.getValue('category');
        resultSet.coaches.coach.push(coach);
      }
      
      if (searchResults.length > 999) { // Max 1,000 per search
        internalIdNumber = searchResults[searchResults.length - 1].getId();
        moreResults = true; // Get more results
      }
    }
  } while (moreResults);
  
  nlapiLogExecution('DEBUG', 'Total count', resultSet.coaches.coach.length);
  nlapiLogExecution('DEBUG', 'End', 'getAllCoaches');

  return resultSet;
}

/*
*
*/
function getCoachesCount() {

  // Filter
  filters = new Array();
  filters[0] = new nlobjSearchFilter('category', null, 'is', 5);

  // Columns
  var columns = new Array();
  columns[0] = new nlobjSearchColumn('entityid', null, 'count');

  // Search
  var coachCountResult = nlapiSearchRecord('vendor', null, filters, columns);

  var coachCount = new Object;
  coachCount.count = coachCountResult[0].getValue('entityid', null, 'count');

  return coachCount;
}

/**
 * Get coach availability status for one or many coaches on a certain day (POST)
 *
 * @return {Object}
 */
function getCoachAvailabilityBulk()
{
  var resultSet = new Object;

  // Expect input to be POST/JSON
  if (request.getMethod().toUpperCase() == 'POST') {
    var coaches = request.getParameter('coaches');
    if (!YAHOO.lang.isString(coaches)) {
      nlapiLogExecution('DEBUG', 'Parameter', 'coaches is invalid: ' + coaches);
      return resultSet;
    }

    // Parse JSON
    try {
      coaches = YAHOO.lang.JSON.parse(coaches);
    } catch (e) {
      nlapiLogExecution('DEBUG', 'Error', 'Failed to parse JSON: ' + coaches);
    }


  }

  return resultSet;
}

/**
 * Get coach availability for one coach on a certain day
 *
 */
function getCoachAvailability() {

  nlapiLogExecution('DEBUG', 'Start', 'getCoachAvailability');

  var resultSet = new Object;

  var date = request.getParameter('date');
  if (!YAHOO.lang.isString(date)) {
    nlapiLogExecution('DEBUG', 'Parameter', 'date is invalid: ' + date);
    return resultSet;
  }

  var coachID = request.getParameter('coachid');
  if (!YAHOO.lang.isString(coachID)) {
    nlapiLogExecution('DEBUG', 'Parameter', 'coachid is invalid: ' + coachID);
    return resultSet;
  }

  // Filter
  var filters = new Array();
  filters[0] = new nlobjSearchFilter('custrecord_calentry_coach', null, 'is', coachID);
  filters[1] = new nlobjSearchFilter('custrecord_calentry_startdate', null, 'onorafter', date);
  filters[2] = new nlobjSearchFilter('custrecord_calentry_enddate', null, 'onorbefore', date);

  // Columns
  var columns = new Array();
  columns[0] = new nlobjSearchColumn('internalId'); // Add field to reduce overhead

  // Search
  var searchResults = nlapiSearchRecord('customrecord_calendarentry', null, filters, columns);

  resultSet.available = (!searchResults || searchResults.length < 1);
  nlapiLogExecution('DEBUG', 'End', 'getCoachAvailability');
  return resultSet;

}

/*
* Get all coaches and their availability for a single day
*/
function getAllCoachAvailability() {

  paginator = new coachSearchPaginator();

  // Get the date
  var date = request.getParameter('date');
  if (!YAHOO.lang.isString(date)) {
    nlapiLogExecution('DEBUG', 'Parameter', 'Date is invalid: ' + date);
    return new Array();
  }

  // Filter
  var filters = new Array();
  filters[0] = new nlobjSearchFilter('custrecord_calentry_startdate', null, 'onorafter', date);
  filters[1] = new nlobjSearchFilter('custrecord_calentry_enddate', null, 'onorbefore', date);
  paginator.filters = filters;

  // Columns
  var columns = new Array();
  columns[0] = new nlobjSearchColumn('custrecord_calentry_coach');
  columns[1] = new nlobjSearchColumn('internalId');
  paginator.columns = columns;

  var coachList = getAllCoaches().coaches.coach;
  paginator.coaches = coachList;

  var availabilityResults = paginator.getResults();

  // Build the result object
  for (coach in coachList) {

    var coachInternalId = coachList[coach].internalId;

    // Check if the coach has an availability object
    if (availabilityResults[coachInternalId] != null) {
      coachList[coach].available = false;
    } else {
      coachList[coach].available = true;
    }

  }

  return coachList;
}

/*
* Coach search paginator class
*
*
*/
function coachSearchPaginator() {

  // Search conditions
  this.coachesPerLoop = 999;
  this.searchRecord = 'customrecord_calendarentry';
  this.searchCoachField = 'custrecord_calentry_coach';
  this.filters = new Array();
  this.columns = new Array();
  this.searchResults = new Array();

  // Pass in coaches object array
  this.coaches = new Array();

  // Public method to get search results
  this.getResults = getResults;
  this._convertSearchResults = _convertSearchResults;

  /*
  * Perform the paginated search
  */
  function getResults() {

    var searchCoachIds = new Array();
    var searchCoachBlock = new Array();
    var newSearchResults = new Array();

    // Get the original searchfilters
    var searchFilters = this.filters;

    nlapiLogExecution('DEBUG', 'Start', 'coachSearchPaginator', 'getResults');

    // Create local copy of the coaches
    var searchCoaches = this.coaches.slice();

    // Get the number of coaches
    var numberCoaches = searchCoaches.length;

    nlapiLogExecution('DEBUG', 'Number of coaches', numberCoaches);

    while (searchCoaches.length > 0) {

      searchCoachIds = new Array();
      searchCoachBlock = new Array();
      newSearchResults = new Array();

      // Get the original searchfilters
      searchFilters = this.filters.slice();

      nlapiLogExecution('DEBUG', 'Loop');

      nlapiLogExecution('DEBUG', 'Coaches remaining', searchCoaches.length);

      // Remove the first X coaches from the array
      var searchCoachBlock = searchCoaches.splice(0, this.coachesPerLoop);

      // Extract all the internal Ids for the coaches
      for (var j = 0; j < searchCoachBlock.length; j++) {
        searchCoachIds[j] = searchCoachBlock[j].internalId;
      }

      // Add the new coach Id listing filter
      searchFilters[this.filters.length] = new nlobjSearchFilter(this.searchCoachField, null, 'anyof', searchCoachIds);

      // Carry out the search
      newSearchResults = nlapiSearchRecord(this.searchRecord, null, searchFilters, this.columns);

      // Check if we have any search results
      if ((newSearchResults != null) && (newSearchResults.length > 0)) {

        nlapiLogExecution('DEBUG', 'Found new search results', newSearchResults.length);

        // Concat new and old search results
        this.searchResults = this.searchResults.concat(newSearchResults);
      }

    }

    nlapiLogExecution('DEBUG', 'Total search results', this.searchResults.length);

    return this._convertSearchResults(this.searchResults);
  }

  /*
  * Convert a Netsuite search result set to an array of objects
  */
  function _convertSearchResults(searchResults) {

    var resultsArray = new Array();

    for (var i = 0; i < searchResults.length; i++) {

      var result = new Object();

      for (column in this.columns) {
        var columnName = this.columns[column].getName();
        result[columnName] = searchResults[i].getValue(columnName);
      }

      resultsArray[result[this.searchCoachField]] = result;
    }

    return resultsArray;
  }
}

/**
 * Search coaches by entity id
 *
 * @method search
 * @param {Object}
 */
function search(request)
{
  var resultSet = new Object();
  resultSet.coaches = new Array();
  var query = request.getParameter('query');
  var minQueryLength = 3;
  
  if (YAHOO.lang.isString(query) && query.length >= minQueryLength) {
  
    // Search for coaches by entity id
    var filters = new Array();
    filters.push(new nlobjSearchFilter('entityid', null, 'contains', query));
    
    var columns = new Array();
    columns.push(new nlobjSearchColumn('internalid'));
    columns.push(new nlobjSearchColumn('entityid'));
    columns.push(new nlobjSearchColumn('firstname'));
    columns.push(new nlobjSearchColumn('lastname'));
    
    // Using saved search to sort alphabetically
    var searchResults = nlapiSearchRecord('vendor', 'customsearch_script_coach_search', filters, columns);
    
    if (!searchResults) {
      searchResults = new Array();
    }
    
    // Arrange the results in an object
    var i = 0, n = searchResults.length;
    for (;i < n; i++) {
      var searchResult = searchResults[i];
      var coach = new Object;
      coach.internalid = searchResult.getValue('internalid');
      coach.entityid = searchResult.getValue('entityid');
      coach.firstname = searchResult.getValue('firstname');
      coach.lastname = searchResult.getValue('lastname');
      resultSet.coaches.push(coach);
    }
  }
  
  return resultSet;
}
