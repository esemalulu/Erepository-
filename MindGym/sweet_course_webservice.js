/**
 * Course web service
 *
 * @method courseWebService
 * @param {Object} request
 * @param {Object} response
 */
function courseWebService(request, response)
{
  responseWriter = response;

  nlapiLogExecution('DEBUG', 'Begin', 'courseWebService');

  try {
    var resultSet = new Object;
    var action = request.getParameter('action');

    nlapiLogExecution('DEBUG', 'action', action);

    if (YAHOO.lang.isString(action)) {
      switch (action.toLowerCase()) {
        case 'getallcourses':
          resultSet = getAllCourses();
          break;
        case 'getallcoursegroups':
          resultSet = getAllCourseGroups();
          break;
        case 'getcoursesbyitem':
          var itemInternalId = request.getParameter('iteminternalid');
          resultSet = getCoursesByItem(itemInternalId);
          break;
        case 'getitemcoursegroup':
          var itemInternalId = request.getParameter('iteminternalid');
          resultSet = getItemCourseGroup(itemInternalId);
          break;
        case 'getcoursesbycoursegroup':
          var courseGroupId = request.getParameter('coursegroupid');
          resultSet = getCoursesByCourseGroup(courseGroupId);
          break;
        case 'search':
          resultSet = search(request);
          break;
        default:
          throw "Unknown action " + action.toLowerCase();
          break;           
      }
    }

    // Convert object to JSON
    try {
      var jsonStr = YAHOO.lang.JSON.stringify(resultSet);
    } catch (e) {
      response.write("JSON encoding error: " + resultSet);
    }

    // Output
    response.write(jsonStr);

  } catch (e) {

    // Write error to screen
    if (e instanceof nlobjError) {
      response.write('Error: ' + e.getCode() + '\n' + e.getDetails());
    }
    response.write('Error: ' + e.toString());
  }

  nlapiLogExecution('DEBUG', 'Exit Successfully', 'courseWebService');
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
    columns[0] = new nlobjSearchColumn('name');

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
 * Get all course groups
 *
 * @return {Object}
 */
function getAllCourseGroups() {

  nlapiLogExecution('DEBUG', 'Start', 'getAllCourseGroups');

  // Columns
  var columns = new Array();
  columns.push(new nlobjSearchColumn('name'));

  // Search
  var searchResults = nlapiSearchRecord('customrecord_coursegroup', null, null, columns);
  
  // Arrange the results in an object
  var resultSet = new Array();
  var i = 0, n = searchResults.length;
  for (;i < n; i++) {
    var searchResult = searchResults[i];
    var item = new Object;
    item.internalId = searchResult.getId();
    item.name = searchResult.getValue('name');
    resultSet.push(item);
  }
  
  nlapiLogExecution('DEBUG', 'End', 'getAllCourseGroups');

  return resultSet;
}

/**
 * Get all courses for a specific item
 *
 * @return {Object}
 */
function getCoursesByItem(itemInternalId) {

  nlapiLogExecution('DEBUG', 'Start', 'getCoursesByItem');
  
  if(itemInternalId == '' || itemInternalId == null) {
    throw "Please provide an itemInternalId";
  }
  
  // get the item's course group
  var courseGroupId = getItemCourseGroup(itemInternalId);

  if(courseGroupId == '' || courseGroupId == null) {
    throw "Unable to find courseGroupId for item";
  }
  
  // get all courses for the course group
  var courses = getCoursesByCourseGroup(courseGroupId);
  
  return courses;
}

/**
 * Get the course group for the specified item ID
 *
 * Used by getCoursesByItem
 *
 * @return {Integer}
 */
function getItemCourseGroup(itemInternalId) {

  nlapiLogExecution('DEBUG', 'Start', 'getItemCourseGroup');
  
  if(itemInternalId == '' || itemInternalId == null) {
    throw "Please provide an itemInternalId";
  }
  
  // Filter
  var filters = new Array();
  filters.push(new nlobjSearchFilter('internalId', null, 'is', itemInternalId));
  
  // Columns
  var columns = new Array();
  columns.push(new nlobjSearchColumn('custitem_course_group'));

  // Search
  var searchResult = nlapiSearchRecord('item', null, filters, columns);
     
  if (searchResult[0]) {
    return searchResult[0].getValue('custitem_course_group');
  } else {
    return null;
  }

  nlapiLogExecution('DEBUG', 'End', 'getItemCourseGroup');
  
}

/**
 * Get all courses in a specific course group
 * 
 * Used by getCoursesByItem 
 *  
 * @return {Object}
 */
function getCoursesByCourseGroup(courseGroupId) {

  nlapiLogExecution('DEBUG', 'Start', 'getCoursesByCourseGroup');
  
  if(courseGroupId == '' || courseGroupId == null) {
    throw "Please provide a courseGroupId";
  }
  
  var resultSet = new Array();
  var moreResults = false;
  internalIdNumber = 0;

  do {

    // Filter
    var filters = new Array();
    
    if (moreResults) {
      filters.push(new nlobjSearchFilter('internalIdNumber', null, 'greaterthan', internalIdNumber));
    }
    
    filters.push(new nlobjSearchFilter('custrecord_course_group', null, 'is', courseGroupId.toString()));
    
    // Columns
    var columns = new Array();
    columns[0] = new nlobjSearchColumn('name');

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
        resultSet.push(item);
      }

      if (searchResults.length > 999) { // Max 1,000 per search
        internalIdNumber = searchResults[searchResults.length - 1].getId();
        moreResults = true; // Get more results
      }
    }
  } while (moreResults);

  nlapiLogExecution('DEBUG', 'End', 'getCoursesByCourseGroup');

  return resultSet;
}

/**
 * Search courses by name
 *
 * @method search
 * @param {Object}
 */
function search(request)
{
  var resultSet = new Object;
  resultSet.courses = new Object;
  resultSet.courses.course = new Array();
  var query = request.getParameter('query');
  var minQueryLength = 3;
  
  if (YAHOO.lang.isString(query) && query.length >= minQueryLength) {
  
    // Search for contacts by entity id
    var filters = new Array();
    filters.push(new nlobjSearchFilter('name', null, 'startswith', query));
    
    var columns = new Array();
    columns.push(new nlobjSearchColumn('internalid'));
    columns.push(new nlobjSearchColumn('name'));
    
    // Using saved search to sort alphabetically
    var searchResults = nlapiSearchRecord('customrecord_course', null, filters, columns);

    if (!searchResults) {
      searchResults = new Array();
    }

    // Arrange the results in an object
    var i = 0, n = searchResults.length;
    for (;i < n; i++) {
      var searchResult = searchResults[i];
      var course = new Object;
      course.internalid = searchResult.getValue('internalid');
      course.name = searchResult.getValue('name');
      resultSet.courses.course.push(course);
    }
  }
  
  return resultSet;
}
