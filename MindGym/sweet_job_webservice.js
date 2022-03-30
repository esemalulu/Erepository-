var cache = new Object();
cache.allCourses = new Array();

var SWEET = {
  Base64 : { }
};

/**
 * Base64 encoder/decoder
 * @namespace SWEET.Base64
 * @class Base64
 */
SWEET.Base64 = (function () {

  var keyStr = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";

  return {
    
    encode : function(input) {
      var output = "";
      var chr1, chr2, chr3 = "";
      var enc1, enc2, enc3, enc4 = "";
      var i = 0;
      
      do {
         chr1 = input.charCodeAt(i++);
         chr2 = input.charCodeAt(i++);
         chr3 = input.charCodeAt(i++);
         
         enc1 = chr1 >> 2;
         enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
         enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
         enc4 = chr3 & 63;
         
         if (isNaN(chr2)) {
            enc3 = enc4 = 64;
         } else if (isNaN(chr3)) {
            enc4 = 64;
         }
         
         output = output +
            keyStr.charAt(enc1) +
            keyStr.charAt(enc2) +
            keyStr.charAt(enc3) +
            keyStr.charAt(enc4);
         chr1 = chr2 = chr3 = "";
         enc1 = enc2 = enc3 = enc4 = "";
      } while (i < input.length);
      
      return output;
    },

    decode : function(input) {
      var output = "";
      var chr1, chr2, chr3 = "";
      var enc1, enc2, enc3, enc4 = "";
      var i = 0;
      
      // remove all characters that are not A-Z, a-z, 0-9, +, /, or =
      input = input.replace(/[^A-Za-z0-9\+\/\=]/g, "");
      
      do {
         enc1 = keyStr.indexOf(input.charAt(i++));
         enc2 = keyStr.indexOf(input.charAt(i++));
         enc3 = keyStr.indexOf(input.charAt(i++));
         enc4 = keyStr.indexOf(input.charAt(i++));
         
         chr1 = (enc1 << 2) | (enc2 >> 4);
         chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
         chr3 = ((enc3 & 3) << 6) | enc4;
         
         output = output + String.fromCharCode(chr1);
         
         if (enc3 != 64) {
            output = output + String.fromCharCode(chr2);
         }
         if (enc4 != 64) {
            output = output + String.fromCharCode(chr3);
         }
         
         chr1 = chr2 = chr3 = "";
         enc1 = enc2 = enc3 = enc4 = "";
         
      } while (i < input.length);
      
      return output;
    }
  };
})();


/**
 * Job web service
 *
 * @method jobWebService
 * @param {Object} request
 * @param {Object} response
 */
function jobWebService(request, response)
{
  nlapiLogExecution('DEBUG', 'Begin', 'jobWebService');
  
  try {
    
    params = request.getAllParameters();
    
    var validFeedbackParams = new Array(
      'custentity_bo_coach',
      'enddate_operator',
      'enddate_value1',
      'enddate_value2',
      'custentity_bo_item',
      'parent_item',
      'custentity_bo_course',
      'course_group'
    );
    
    var resultSet = new Object;
    var action = request.getParameter('action');
    
    nlapiLogExecution('DEBUG', 'action', action);
    
    if (YAHOO.lang.isString(action)) {
      switch (action.toLowerCase()) {
        case 'getimmediatefeedback':
          feedbackParams = new Object();
          for (v in validFeedbackParams) {
            if (YAHOO.lang.isString(params[validFeedbackParams[v]])) {
              feedbackParams[validFeedbackParams[v]] = params[validFeedbackParams[v]];
            }
          }
          resultSet = getImmediateFeedback(feedbackParams);
          break;
        case 'getimmediatefeedbacklist':
          resultSet = getImmediateFeedbackList();
          break;
        case 'search':
          resultSet = search(params);
          break;
        case 'summary_report':
          resultSet = summaryReport(params);
          break;
        default:
          throw "Unknown action " + action.toLowerCase();
          break; 
      }
    } else {
      throw "No action specified";
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
    throw e;
  }
  
  nlapiLogExecution('DEBUG', 'Exit Successfully', 'jobWebService');
}

/**
 * Get immediate feedback measurements
 *
 * Number of Respondents
 * Number of Positive Respondents
 * Total Weight
 * Percent Positive Respondents {= Number of Positive Respondents / Number of Respondents}
 * Mean Average {= Total Weight / Number of Respondents}
 * 
 * Parameters:
 *  - enddate_operator (for use with nlobjSearchFilter, e.g. 'within')
 *  - enddate_value1 (for use with nlobjSearchFilter, e.g. '2/5/2007' or 'previousoneyear')
 *  - enddate_value2 (for use with nlobjSearchFilter)
 *  - custentity_bo_coach (Coach ID)
 *  - custentity_bo_item (Item ID)
 *  - parent_item (use this to search on multiple item IDs under a single parent item ID)
 *  - custentity_bo_course (Course ID)
 *  - course_group (Course group ID) - all courses in this group will be included
 */
function getImmediateFeedback(params)
{
  nlapiLogExecution('DEBUG', 'getImmediateFeedback', 'Begin');

  var resultSet = new Object;
  var filters = new Array();
  
  // Only fetch jobs where immediate feedback has been collected
  filters.push(new nlobjSearchFilter('custentity_bo_isimfeedbackcollected', null, 'is', 'T'));
  
  // Coach
  var coachID = getIfExists(params, 'custentity_bo_coach');
  if (YAHOO.lang.isString(coachID)) {
    filters.push(new nlobjSearchFilter('custentity_bo_coach', null, 'is', coachID));
  }            

  // End date
  var endDateFrom = getIfExists(params, 'enddate_from');
  var endDateTo = getIfExists(params, 'enddate_to');

  if (YAHOO.lang.isString(endDateFrom)) {
    filters.push(new nlobjSearchFilter('enddate', null, 'onorafter', endDateFrom));
  }

  if (YAHOO.lang.isString(endDateTo)) {
    filters.push(new nlobjSearchFilter('enddate', null, 'onorbefore', endDateTo));
  }
    
  // Item
  var itemID = getIfExists(params, 'custentity_bo_item');
  if (YAHOO.lang.isString(itemID)) {
    filters.push(new nlobjSearchFilter('custentity_bo_item', null, 'is', itemID));
  } else {
    // Parent item - use to search for multiple items
    var parentItemID = getIfExists(params, 'parent_item');
    
    if (YAHOO.lang.isString(parentItemID)) {
      // find all items belonging to the parent item
      items = getSubItems(parentItemID);
      filters.push(new nlobjSearchFilter('custentity_bo_item', null, 'anyof', items));
    }
  }
    
  // Course / course group
  var courseID = getIfExists(params, 'custentity_bo_course');
  if (YAHOO.lang.isString(courseID)) {
    filters.push(new nlobjSearchFilter('custentity_bo_course', null, 'is', courseID));
  } else {
    // has a course group been specified?
    var courseGroupID = getIfExists(params, 'course_group');
    if (YAHOO.lang.isString(courseGroupID)) {
      
      // there's no course group property on a job record
      // ...so we need to find all courses in this group
      var courses = getCoursesByCourseGroup(courseGroupID);
      var courseIDList = new Array();
      nlapiLogExecution('DEBUG', 'Courses', YAHOO.lang.JSON.stringify(courses));
      for (c in courses) {
        courseIDList.push(courses[c].internalId);
      }
      
      // add filter for course group
      filters.push(new nlobjSearchFilter('custentity_bo_course', null, 'anyof', courseIDList));
    }
  }
  
  nlapiLogExecution('DEBUG', 'Params', YAHOO.lang.JSON.stringify(params));
  nlapiLogExecution('DEBUG', 'Filters', YAHOO.lang.JSON.stringify(filters));
  
  // Columns
  var columns = new Array();
  columns.push(new nlobjSearchColumn('internalId'));
  columns.push(new nlobjSearchColumn('enddate'));
  columns.push(new nlobjSearchColumn('custentity_bo_imrespondents'));
  columns.push(new nlobjSearchColumn('custentity_bo_imweight'));
  columns.push(new nlobjSearchColumn('custentity_bo_imposrespondents'));
  columns.push(new nlobjSearchColumn('custentity_bo_immeanavg'));
  columns.push(new nlobjSearchColumn('custentity_bo_impercentpos'));
    
  // Search
  var searchResults = nlapiSearchRecord('job', null, filters, columns);

  if (!YAHOO.lang.isArray(searchResults)) {
    searchResults = new Array(); // No results found
  }

  // Arrange the results in an object
  var i = 0;
  var n = searchResults.length;
  resultSet.totalRespondents = 0;
  resultSet.totalWeight = 0;
  resultSet.totalPositiveRespondents = 0;
  resultSet.meanAverage = 0;
  resultSet.percentPositiveRespondents = 0;
  resultSet.totalJobs = 0;
  resultSet.totalJobsPassed = 0;
  
  for (;i < n; i++) {
    
    resultSet.totalJobs += 1
    
    var pass = true;
    var totalRespondents = searchResults[i].getValue('custentity_bo_imrespondents');
    if (isNaN(totalRespondents) || !totalRespondents || totalRespondents == 0) {
      pass = false;
    } 
    var totalWeight = searchResults[i].getValue('custentity_bo_imweight');
    if (isNaN(totalWeight || !totalWeight || totalWeight == 0)) {
      pass = false;
    } 
    var totalPositiveRespondents = searchResults[i].getValue('custentity_bo_imposrespondents');
    if (isNaN(totalPositiveRespondents) || !totalPositiveRespondents || totalPositiveRespondents == 0) {
      pass = false;
    } 
    
    // only include jobs with valid feedback values
    if (pass) {
      resultSet.totalRespondents += parseFloat(totalRespondents);
      resultSet.totalWeight += parseFloat(totalWeight);
      resultSet.totalPositiveRespondents += parseFloat(totalPositiveRespondents);
      resultSet.totalJobsPassed += 1 
    }
  
  }
  
  // Calculate the mean average of all the responses (1dp)
  if (resultSet.totalRespondents > 0) {
    resultSet.meanAverage = (Math.round((resultSet.totalWeight / resultSet.totalRespondents) * 10) / 10);
  }
  
  // Calculate percent positive respondents (1dp)
  if (resultSet.totalRespondents > 0) {
    resultSet.percentPositiveRespondents = (Math.round((resultSet.totalPositiveRespondents / resultSet.totalRespondents) * 1000) / 10);     
  }
  
  // add the params to the result set
  resultSet.params = params;
  
  nlapiLogExecution('DEBUG', 'getImmediateFeedback', 'Exit Successfully');
  
  return resultSet;
}

/**
 * Get multiple immediate feedback measurements in one request
 *
 * @param json {JSON Array} Array of queries in JSON format
 * 
 * JSON query array example:
 * 	[ {"custentity_bo_coach":"16877"},{"custentity_bo_coach":"16993"} ]
 */ 
function getImmediateFeedbackList()
{  
  queries = YAHOO.lang.JSON.parse(request.getParameter('json')); 
  
  nlapiLogExecution('DEBUG', 'getImmediateFeedbackList', 'Number of queries: ' + queries.length);
  
  // Loop through the queries and collect the results
  var resultSet = new Array();
  
  for (query in queries) { 
    resultSet.push(getImmediateFeedback(queries[query]));
  }
    
  return resultSet;  
}

/**
 * Get the children of a specific parent item, and return their IDs
 *
 * @return {Array} String
 */
function getSubItems(parentItemID) 
{
  nlapiLogExecution('DEBUG', 'getSubItems', 'Begin');
  
  if (!YAHOO.lang.isString(parentItemID)) {
    throw "Invalid parent item ID";
  }
  
  var items = new Array();
  
  // Filters
  var filters = new Array();
  filters.push(new nlobjSearchFilter('parent', null, 'is', parentItemID));
  
  // Columns
  var columns = new Array();
  columns.push(new nlobjSearchColumn('internalId'));
  
  // Search
  var searchResults = nlapiSearchRecord('item', null, filters, columns);
  
  if (!searchResults) {
    return items;
  }
  
  var i = 0, n = searchResults.length;
  for (;i < n; i++) {
    items.push(searchResults[i].getId());
  }
  
  nlapiLogExecution('DEBUG', 'Info', 'Found ' + items.length + ' child items');
  nlapiLogExecution('DEBUG', 'getSubItems', 'Exit Successfully');
  
  return items;
}

/**
 * Get array or object value if it exists otherwise return null
 * 
 * @param {Array} arr
 * @key {String} key
 * @return {Mixed}
 */
function getIfExists(arr, key)
{
  return (arr[key] == undefined ? null : arr[key]);
}

/**
 * Get all courses in a specific course group
 * 
 * @return {Object}
 */
function getCoursesByCourseGroup(courseGroupId) {

  nlapiLogExecution('DEBUG', 'Start', 'getCoursesByCourseGroup');
  
  if(courseGroupId == '' || courseGroupId == null) {
    throw "Please provide a courseGroupId";
  }
  
  // do we already have the full course list in the cache object?
  if (cache.allCourses.length < 1) {
    cache.allCourses = getAllCourses();
    nlapiLogExecution('DEBUG', 'Cache', 'Fetched all courses');
  }
  
  // find courses with the specified course group ID
  var resultSet = new Array();
  
  for (i in cache.allCourses) {
    if (cache.allCourses[i].custrecord_course_group == courseGroupId.toString()) {
      resultSet.push(cache.allCourses[i]);
    }
  }
  
  nlapiLogExecution('DEBUG', 'End', 'getCoursesByCourseGroup');
  
  return resultSet;
} 

/**
 * Get all courses
 * 
 * @return {Object}
 */
function getAllCourses() {
  
  nlapiLogExecution('DEBUG', 'Start', 'getAllCourses');
  
  var resultSet = new Array();
  var moreResults = false;
  internalIdNumber = 0;
  
  do {
    
    // Filter
    var filters = new Array();
    
    if (moreResults) {
      filters.push(new nlobjSearchFilter('internalIdNumber', null, 'greaterthan', internalIdNumber));
    }
    
    // Columns
    var columns = new Array();
    columns.push(new nlobjSearchColumn('name'));
    columns.push(new nlobjSearchColumn('custrecord_course_group'));
    
    // Search
    var searchResults = nlapiSearchRecord('customrecord_course', null, filters, columns);
    
    // Process results
    if (!searchResults || searchResults.length < 1) {
      moreResults = false; // We're done
    } else {
      
      // Arrange the results in an object
      var i = 0, n = searchResults.length;
      for (;i < n; i++) {
        var searchResult = searchResults[i];
        var item = new Object;
        item.internalId = searchResult.getId();
        item.name = searchResult.getValue('name');
        item.custrecord_course_group = searchResult.getValue('custrecord_course_group');
        resultSet.push(item);
      }
      
      if (searchResults.length > 999) { // Max 1,000 per search
        internalIdNumber = searchResults[searchResults.length - 1].getId();
        moreResults = true; // Get more results
      }
    }
  } while (moreResults);
  
  nlapiLogExecution('DEBUG', 'End', 'getAllCourses');
  
  return resultSet;
}

/**
 * Search
 *
 * @return {Array}
 */
function search(params)
{
  nlapiLogExecution('DEBUG', 'Function', 'search');

  var resultSet = new Object();
  var columns = new Array();
  var filters = new Array();
  
  // Immediate feedback
  var isImFeedbackCollected = getIfExists(params, 'custentity_bo_isimfeedbackcollected');
  if (YAHOO.lang.isString(isImFeedbackCollected)) {
    filters.push(new nlobjSearchFilter('custentity_bo_isimfeedbackcollected', null, 'is', (isImFeedbackCollected ? 'T' : 'F')));
    columns.push(new nlobjSearchColumn('custentity_bo_imrespondents'));
    columns.push(new nlobjSearchColumn('custentity_bo_imweight'));
    columns.push(new nlobjSearchColumn('custentity_bo_imposrespondents'));
    columns.push(new nlobjSearchColumn('custentity_bo_immeanavg'));
    columns.push(new nlobjSearchColumn('custentity_bo_impercentpos'));
    columns.push(new nlobjSearchColumn('custentity_bo_imcollectorid'));
  }
  
  // Entity ID
  var entityid = getIfExists(params, 'entityid');
  if (YAHOO.lang.isString(entityid)) {
    filters.push(new nlobjSearchFilter('entityid', null, 'is', entityid));
  }

  // Query
  var query = getIfExists(params, 'query');
  if (YAHOO.lang.isString(query)) {
    filters.push(new nlobjSearchFilter('entityid', null, 'contains', query));
  }
  
  // Internal ID
  var internalId = getIfExists(params, 'internalid');
  if (YAHOO.lang.isString(internalId)) {
    filters.push(new nlobjSearchFilter('internalid', null, 'is', internalId));
  }
  
  // Coach
  var coachID = getIfExists(params, 'custentity_bo_coach');
  if (YAHOO.lang.isString(coachID)) {
    filters.push(new nlobjSearchFilter('custentity_bo_coach', null, 'is', coachID));
  }
  
  // Parent (aka Client)
  var parentID = getIfExists(params, 'parent');
  if (YAHOO.lang.isString(parentID)) {
    filters.push(new nlobjSearchFilter('parent', null, 'is', parentID));
  }
  
  // Buyer
  var buyerID = getIfExists(params, 'custentity_bo_buyer');
  if (YAHOO.lang.isString(buyerID)) {
    filters.push(new nlobjSearchFilter('custentity_bo_buyer', null, 'is', buyerID));
  }
  
  // End date, from
  var endDateFrom = getIfExists(params, 'enddate_from');
  if (YAHOO.lang.isString(endDateFrom)) {
    filters.push(new nlobjSearchFilter('enddate', null, 'onorafter', endDateFrom));
  }
  
  // End date, to
  var endDateTo = getIfExists(params, 'enddate_to');
  if (YAHOO.lang.isString(endDateTo)) {
    filters.push(new nlobjSearchFilter('enddate', null, 'onorbefore', endDateTo));
  }
  
  // Item
  var itemID = getIfExists(params, 'custentity_bo_item');
  if (YAHOO.lang.isString(itemID)) {
    filters.push(new nlobjSearchFilter('custentity_bo_item', null, 'is', itemID));
  } else {
    
    // Parent item - use to search for multiple items
    var parentItemID = getIfExists(params, 'parent_item');
    if (YAHOO.lang.isString(parentItemID)) {
      items = getSubItems(parentItemID);
      filters.push(new nlobjSearchFilter('custentity_bo_item', null, 'anyof', items));
    }
  }
    
  // Course
  var courseID = getIfExists(params, 'custentity_bo_course');
  if (YAHOO.lang.isString(courseID)) {
    filters.push(new nlobjSearchFilter('custentity_bo_course', null, 'is', courseID));
  } else {
    
    // Course group
    var courseGroupID = getIfExists(params, 'course_group');
    if (YAHOO.lang.isString(courseGroupID)) {
      var courses = getCoursesByCourseGroup(courseGroupID);
      var courseIDList = new Array();
      nlapiLogExecution('DEBUG', 'Courses', YAHOO.lang.JSON.stringify(courses));
      for (c in courses) {
        courseIDList.push(courses[c].internalId);
      }
      filters.push(new nlobjSearchFilter('custentity_bo_course', null, 'anyof', courseIDList));
    }
  }
  
  // Country
  var countryId = getIfExists(params, 'custentity_bo_eventcountry');
  if (YAHOO.lang.isString(countryId)) {
    filters.push(new nlobjSearchFilter('custentity_bo_eventcountry', null, 'is', countryId));
  }
  
  // Columns
  columns.push(new nlobjSearchColumn('internalId'));
  columns.push(new nlobjSearchColumn('entityid'));
  columns.push(new nlobjSearchColumn('enddate'));
  columns.push(new nlobjSearchColumn('customer'));
  columns.push(new nlobjSearchColumn('companyname', 'customer'));
  columns.push(new nlobjSearchColumn('custentity_bo_eventtime'));
  columns.push(new nlobjSearchColumn('custentity_bo_buyer'));
  columns.push(new nlobjSearchColumn('firstname', 'custentity_bo_buyer'));
  columns.push(new nlobjSearchColumn('lastname', 'custentity_bo_buyer'));
  columns.push(new nlobjSearchColumn('custentity_bo_item'));
  columns.push(new nlobjSearchColumn('name', 'custentity_bo_item'));
  columns.push(new nlobjSearchColumn('custentity_bo_course'));
  columns.push(new nlobjSearchColumn('name', 'custentity_bo_course'));
  columns.push(new nlobjSearchColumn('custentity_bo_coach'));
  columns.push(new nlobjSearchColumn('firstname', 'custentity_bo_coach'));
  columns.push(new nlobjSearchColumn('lastname', 'custentity_bo_coach'));
  columns.push(new nlobjSearchColumn('custentity_bo_eventcountry'));
  columns.push(new nlobjSearchColumn('name', 'custentity_bo_eventcountry'));
  columns.push(new nlobjSearchColumn('custrecord_country_code', 'custentity_bo_eventcountry'));

  if (filters.length < 1) {
    throw "No search criteria given.";
  }
  
  // Perform search
  nlapiLogExecution('DEBUG', 'Search filters', 'filters=' + filters);
  nlapiLogExecution('DEBUG', 'Search columns', 'columns=' + columns);
  var searchResults = nlapiSearchRecord('job', null, filters, columns);
  if (!YAHOO.lang.isArray(searchResults)) {
    searchResults = new Array(); // No results found
  }
  
  // Arrange the results in an object
  nlapiLogExecution('DEBUG', 'Prepare resultset', 'searchResults=' + searchResults.length);
  resultSet.jobs = new Array();
  for each (searchResult in searchResults) {
    var job = new Object();
    for each (column in columns) {
      var propertyName = column.getName();
      var propertyValue = searchResult.getValue(column.getName(), column.getJoin());
      var propertyJoin = column.getJoin();
      if (propertyJoin) {
        propertyJoin = propertyJoin + '__';
      } else {
        propertyJoin = '';
      }
      
      var evalString = "job." + propertyJoin + propertyName + "='" + propertyValue.replace(/'/g,"\\'") + "'";
      nlapiLogExecution('DEBUG', 'Eval', 'string=' + evalString);
      eval(evalString);
    }
    resultSet.jobs.push(job);
  }
  
  // Add the params and filters to the result set
  nlapiLogExecution('DEBUG', 'Add params to resultset', '');
  resultSet.params = new Array();
  for (param in params) {
    var p = new Object;
    p.name = param;
    p.value = params[param];
    resultSet.params.push(p);
  }
  
  nlapiLogExecution('DEBUG', 'Return resultset', '');
  return resultSet;
}

function summaryReport(params)
{
  nlapiLogExecution('DEBUG', 'Function', 'summaryReport');

  resultSet = new Object();
  collectors = new Array();
  
  // Search
  params['custentity_bo_isimfeedbackcollected'] = '1';
  results = search(params);
  for each (job in results.jobs) {
    collectors.push(job.custentity_bo_imcollectorid);
  }
  resultSet.jobs = results.jobs;
  nlapiLogExecution('DEBUG', 'Job search', 'results = ' + results);
  
  // Request results from Admin portal
  var url = 'https://admin.themindgym.com/surveys/110691333/summary_report.json';
  
  var headers = new Array();
  var username = 'webservices@themindgym.com';
  var password = 'jC%oaDAAs&h_o';
  
  headers['Authorization'] = 'Basic ' + SWEET.Base64.encode(username + ':' + password);
  var postData = new Array();
  postData['collectors'] = collectors.join(',');

  nlapiLogExecution('DEBUG', 'Request.url', url);
  nlapiLogExecution('DEBUG', 'Request.postData', postData['collectors']);
  nlapiLogExecution('DEBUG', 'Request.headers', headers['Authorization']);
  
  // 45 second connection timeout limitation
  // throws SSS_REQUEST_TIME_EXCEEDED
  var wsResponse = nlapiRequestURL(url, postData, headers);

  // Error handling
  if (parseInt(wsResponse.getCode()) != 200) {
    throw nlapiCreateError('SWEET_WEBSERVICE_ERROR_JWS1', 'Web service error (' + wsResponse.getCode() + ') [JWS1]');
  }
  if (!wsResponse.getBody() || wsResponse.getBody().length < 1) {
    throw nlapiCreateError('SWEET_WEBSERVICE_ERROR_JWS2', 'Empty response body found when not expecting it. [JWS1]');
  }
  
  // Parse and return response
  var responseObj = YAHOO.lang.JSON.parse(wsResponse.getBody());
  nlapiLogExecution('DEBUG', 'Ladybird report', 'responseObj = ' + responseObj);
  resultSet.response = responseObj;
  resultSet.collectors = collectors;
  return resultSet;
}
