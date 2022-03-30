/**
 * Client Web service
 *
 * @method clientWebService
 * @param {Object} request
 * @param {Object} response
 */
function clientWebService(request, response)
{
  nlapiLogExecution('DEBUG', 'Begin', 'clientWebService');

  try {
    var resultSet = new Object;
    var action = request.getParameter('action');
    
    nlapiLogExecution('DEBUG', 'action', action);
    
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
  
  nlapiLogExecution('DEBUG', 'Exit Successfully', 'clientWebService'); 
}

/**
 * Search clients by entity id
 *
 * @method search
 * @param {Object}
 */
function search(request)
{
  try {
    var resultSet = new Object;
    resultSet.clients = new Object;
    resultSet.clients.client = new Array();
    var query = request.getParameter('query');
    var minQueryLength = 3;
    
    if (YAHOO.lang.isString(query) && query.length >= minQueryLength) {
    
      // Search for clients by entity id
      var filters = new Array();
      filters.push(new nlobjSearchFilter('entityid', null, 'contains', query));
      filters.push(new nlobjSearchFilter('isjob', null, 'is', 'F'));
      
      var columns = new Array();
      columns.push(new nlobjSearchColumn('internalid'));
      columns.push(new nlobjSearchColumn('entityid'));
      columns.push(new nlobjSearchColumn('companyname'));
      
      var searchResults = nlapiSearchRecord('customer', 'customsearch_script_client_search', filters, columns);

      if (!searchResults) {
        searchResults = new Array();
      }

      // Arrange the results in an object
      var i = 0, n = searchResults.length;
      for (;i < n; i++) {
        var searchResult = searchResults[i];
        var client = new Object;
        client.internalid = searchResult.getValue('internalid');
        client.entityid = searchResult.getValue('entityid');
        client.companyname = searchResult.getValue('companyname');
        resultSet.clients.client.push(client);
      }
    }
    
    return resultSet;
  } catch (e) {
  
    // Write error to screen
    if (e instanceof nlobjError) {
      response.write('Error: ' + e.getCode() + '\n' + e.getDetails());
    } else {
      response.write('Error: ' + e.toString());
    }
  }
}  
