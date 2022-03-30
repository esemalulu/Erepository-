/**
 * Item web service
 *
 * @method itemWebService
 * @param {Object} request
 * @param {Object} response
 */
function itemWebService(request, response)
{
  responseWriter = response;

  nlapiLogExecution('DEBUG', 'Begin', 'itemWebService');

  try {
    var resultSet = new Object;
    var action = request.getParameter('action');

    nlapiLogExecution('DEBUG', 'action', action);

    if (YAHOO.lang.isString(action)) {
      switch (action.toLowerCase()) {
        case 'getallitems':
          resultSet = getAllItems();
          break;
        case 'getallitemswhereimmediatefeedbackiscollected':
          resultSet = getAllItemsWhereImmediateFeedbackIsCollected();
          break;
        default:
          throw "Unknown action " + action.toLowerCase();
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

  nlapiLogExecution('DEBUG', 'Exit Successfully', 'itemWebService');
}

/**
 * Get all items
 *
 * @return {Object}
 */
function getAllItems() {

  nlapiLogExecution('DEBUG', 'Start', 'getAllItems');

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
    columns[0] = new nlobjSearchColumn('itemid');

    // Search
    var searchResults = nlapiSearchRecord('item', null, filters, columns);

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
        item.itemid = searchResult.getValue('itemid');
        resultSet.push(item);
      }

      if (searchResults.length > 999) { // Max 1,000 per search
        internalIdNumber = searchResults[searchResults.length - 1].getId();
        moreResults = true; // Get more results
      }
    }
  } while (moreResults);

  nlapiLogExecution('DEBUG', 'End', 'getAllItems');

  return resultSet;
}

/**
 * Get all items where 'immediate feedback collected' flag is set to true
 *
 * @return {Object}
 */
function getAllItemsWhereImmediateFeedbackIsCollected() {

  nlapiLogExecution('DEBUG', 'Start', 'getAllItemsWithFeedbackCollected');

  var resultSet = new Array();
  var moreResults = false;
  internalIdNumber = 0;

  do {

    // Filter
    var filters = new Array();
    
    if (moreResults) {
      filters.push(new nlobjSearchFilter('internalIdNumber', null, 'greaterthan', internalIdNumber));
    }
    
    // Only grab items where feedback is collected
    filters.push(new nlobjSearchFilter('custitem_job_optimfeedback', null, 'is', 'T'));
    
    // Columns
    var columns = new Array();
    columns[0] = new nlobjSearchColumn('itemid');

    // Search
    var searchResults = nlapiSearchRecord('item', null, filters, columns);

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
        item.itemid = searchResult.getValue('itemid');
        resultSet.push(item);
      }

      if (searchResults.length > 999) { // Max 1,000 per search
        internalIdNumber = searchResults[searchResults.length - 1].getId();
        moreResults = true; // Get more results
      }
    }
  } while (moreResults);

  nlapiLogExecution('DEBUG', 'End', 'getAllItemsWithFeedbackCollected');

  return resultSet;
}