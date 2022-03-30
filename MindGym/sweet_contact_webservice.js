/**
 * Contact Web service
 *
 * @method contactWebService
 * @param {Object} request
 * @param {Object} response
 */
function contactWebService(request, response)
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
 * Search contacts by entity id
 *
 * @method search
 * @param {Object}
 */
function search(request)
{
  var resultSet = new Object;
  resultSet.contacts = new Object;
  resultSet.contacts.contact = new Array();
  var query = request.getParameter('query');
  var minQueryLength = 3;
  
  if (YAHOO.lang.isString(query) && query.length >= minQueryLength) {
  
    // Search for contacts by entity id
    var filters = new Array();
    filters.push(new nlobjSearchFilter('entityid', null, 'contains', query));
    
    var columns = new Array();
    columns.push(new nlobjSearchColumn('internalid'));
    columns.push(new nlobjSearchColumn('entityid'));
    columns.push(new nlobjSearchColumn('firstname'));
    columns.push(new nlobjSearchColumn('lastname'));
    columns.push(new nlobjSearchColumn('company'));
    columns.push(new nlobjSearchColumn('entityid', 'parent'));
    columns.push(new nlobjSearchColumn('companyname', 'company'));
    
    // Using saved search to sort alphabetically
    var searchResults = nlapiSearchRecord('contact', 'customsearch_script_contact_search', filters, columns);

    if (!searchResults) {
      searchResults = new Array();
    }

    // Arrange the results in an object
    var i = 0, n = searchResults.length;
    for (;i < n; i++) {
      var searchResult = searchResults[i];
      var contact = new Object;
      contact.internalid = searchResult.getValue('internalid');
      contact.entityid = searchResult.getValue('entityid');
      contact.firstname = searchResult.getValue('firstname');
      contact.lastname = searchResult.getValue('lastname');
      contact.company = searchResult.getValue('company');
      contact.companyname = searchResult.getValue('companyname', 'company');
      contact.companyid = searchResult.getValue('entityid', 'parent');
      resultSet.contacts.contact.push(contact);
    }
  }
  
  return resultSet;
}  
