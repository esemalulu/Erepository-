/**
 * Country Web service
 *
 * @method sweet_suitlet
 * @param {Object} request
 * @param {Object} response
 */
function sweet_suitelet(request, response)
{
  try {
    var resultSet = new Object;
    var action = request.getParameter('action');
    
    if (YAHOO.lang.isString(action)) {
      switch (action.toLowerCase()) {
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
}

/**
 * Search countries by name
 *
 * @method search
 * @param {Object}
 */
function search(request)
{
  var resultSet = new Object;
  resultSet.countries = new Array();
  var query = request.getParameter('query');
  var minQueryLength = 3;
  
  if (YAHOO.lang.isString(query) && query.length >= minQueryLength) {
  
    // Search for contacts by entity id
    var filters = new Array();
    filters.push(new nlobjSearchFilter('name', null, 'contains', query));
    
    var columns = new Array();
    columns.push(new nlobjSearchColumn('internalid'));
    columns.push(new nlobjSearchColumn('name'));
    columns.push(new nlobjSearchColumn('custrecord_country_code'));
    
    // Using saved search to sort alphabetically
    var searchResults = nlapiSearchRecord('customrecord_country', 'customsearch_script_country_search', filters, columns);
    
    if (!searchResults) {
      searchResults = new Array();
    }
    
    // Arrange the results in an object
    var i = 0, n = searchResults.length;
    for (;i < n; i++) {
      var searchResult = searchResults[i];
      var record = new Object;
      record.internalid = searchResult.getValue('internalid');
      record.name = searchResult.getValue('name');
      record.code = searchResult.getValue('custrecord_country_code');
      resultSet.countries.push(record);
    }
  }
  
  return resultSet;
}
