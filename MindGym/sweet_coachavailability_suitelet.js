/**
* Coach availability
*/
var WEBSERVICE_URL = nlapiResolveURL('SUITELET','customscript_coach_webservice', 1, true);

/**
 * Coach availability report
 *
 * @param {Object} request
 * @param {Object} response
 */
function coachAvailabilityReport(request, response) {

  nlapiLogExecution('DEBUG', 'Begin', 'coachAvailabilityReport');

  // Get the date
  var date = request.getParameter('date');

  if (!YAHOO.lang.isString(date) || !nlapiStringToDate(date)) {
    nlapiLogExecution('DEBUG', 'Parameter', 'Date is invalid: ' + date);
    response.writeLine('<h1>Invalid date specified</h1>');
    return false;
  }

  response.writeLine('<h1>Coach Availability Report (Beta)</h1>');

  myCoachAvailability = new coachAvailability();

  myCoachAvailability.getCoachAvailability(date);


  /**** Create the list ****/

  response.writeLine('<h2>Date: 11/03/2008</h2>');

  availabilityList = nlapiCreateList('Coach Availability');
  availabilityList.setStyle('normal');

  availabilityList.addColumn('coach_name','text', 'Available coaches on ' + date, 'left');

  nlapiLogExecution('DEBUG', 'Begin', 'Got ' + myCoachAvailability.coachAvailability.length + ' availabilities');

  if (myCoachAvailability.coachAvailability.length > 0) {

    response.writeLine('<ul>');

    for (var i = 0; i < myCoachAvailability.coachAvailability.length; i++) {

      var newRow = new Array();

      var coach = myCoachAvailability.coachAvailability[i];

      if (coach.available == true) {

        var coachName = coach.firstname + ' ' + coach.lastname;
        newRow['coach_name'] = coachName;

        response.writeLine('<li>' + coachName + '</li>');

        availabilityList.addRow(newRow);

      }

    }

    response.writeLine('</ul>');

  }

  /**** Show the list ***/
  response.writePage(availabilityList);
}

/* Object definitions
*****************************************************************************/

function coachAvailability() {

  // public var
  this.coachAvailability = new Array();

  // public methods
  this.getCoachAvailability = getCoachAvailability;

  /*
  *
  *
  */
  function getCoachAvailability(date) {

    var action = 'getallcoachavailability';

    nlapiLogExecution('DEBUG', 'Begin', 'Getting availability');

    var webServiceUrl = WEBSERVICE_URL + '&action=' + action + '&date=' + date;

    nlapiLogExecution('DEBUG', 'Webservice url', webServiceUrl);

    webServiceResponse = nlapiRequestURL(webServiceUrl);

    // Check the response code
    switch(webServiceResponse.getCode()) {

      case 200:
        nlapiLogExecution('DEBUG', 'Response 200', 'Got availability, woot');
        break;

      default:
        nlapiLogExecution('DEBUG', 'Response ' + webServiceResponse.getCode(), 'Error getting coach availability ' + webServiceResponse.getBody());
        return false;
        break;
    }

    nlapiLogExecution('DEBUG', 'Begin', 'Got body ' + webServiceResponse.getBody());

    // Parse the response from JSON into an array
    try {
      var availability = YAHOO.lang.JSON.parse(webServiceResponse.getBody());
    } catch (e) {
      nlapiLogExecution('DEBUG', 'Error parsing JSON');
      return false;
    }

    this.coachAvailability = availability;
  }

}