/**
 * Perform search for participants with email that starts with query, writes
 * result in JSON format to screen.
 *
 * @method searchParticipantEmailJSON
 * @param {Object} request
 * @param {Object} response
 */
function searchParticipantEmailJSON(request, response)
{
  try {
    var resultSet = new Object;
    resultSet.participants = new Object;
    resultSet.participants.participant = new Array();
    var query = request.getParameter('query');
    var minQueryLength = 3;
    
    if (YAHOO.lang.isString(query) && query.length >= minQueryLength) {
    
      // Search for participants with email that starts with query
      var filters = new Array();
      filters[0] = new nlobjSearchFilter('custrecord_pa_email', null, 'startswith', query);
      
      var columns = new Array();
      columns[0] = new nlobjSearchColumn('custrecord_pa_firstname');
      columns[1] = new nlobjSearchColumn('custrecord_pa_lastname');
      columns[2] = new nlobjSearchColumn('custrecord_pa_email');
      
      var searchResults = nlapiSearchRecord('customrecord_participant', null, filters, columns);

      if (!searchResults) {
        searchResults = new Array();
      }

      // Arrange the results in an object
      var i = 0, n = searchResults.length;
      for (;i < n; i++) {
        var searchResult = searchResults[i];
        var participant = new Object;
        participant.firstname = searchResult.getValue('custrecord_pa_firstname');
        participant.lastname = searchResult.getValue('custrecord_pa_lastname');
        participant.email = searchResult.getValue('custrecord_pa_email');
        resultSet.participants.participant.push(participant);
      }
    }
    
    // Convert object to JSON
    var jsonStr = YAHOO.lang.JSON.stringify(resultSet);
    
    // Write response
    response.write(jsonStr);
  } catch (e) {
  
    // Write error to screen
    if (e instanceof nlobjError) {
      response.write('Error: ' + e.getCode() + '\n' + e.getDetails());
    } else {
      response.write('Error: ' + e.toString());
    }
  }
}
