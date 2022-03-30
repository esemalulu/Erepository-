/**
 * Ladybird webservice
 */
var WEBSERVICE_URL = 'https://ladybird.themindgym.com';
var EXISTING_COLLECTOR_URL = '/collectors/';
var NEW_RESPONDENT_URL = '/respondents/new';
var NEW_COLLECTOR_JSON = WEBSERVICE_URL + '/collectors.json';

var WEBSERVICE_USERNAME = 'ladybird';
var WEBSERVICE_PASSWORD = '2ksquare';

/**
 * Ladybird entry of feedback
 *
 * @param {Object} request
 * @param {Object} response
 */
function ladybirdFeedbackEntry(request, response) {

  nlapiLogExecution('DEBUG', 'Begin', 'ladybirdFeedbackEntry');
    var type = request.getParameter('type');
    var jobId = request.getParameter('jobid');

    if ((jobId == null) && (jobId.length == 0)) {
      nlapiLogExecution('DEBUG', 'Missing job Id');
      return false;
    }

    nlapiLogExecution('DEBUG', 'Job ID', jobId);

    switch(type) {

      case 'immediate':
        nlapiLogExecution('DEBUG', 'Feedback', 'immediate');

        var collectorId = immediateFeedbackEntry(jobId);
        nlapiLogExecution('DEBUG', 'Redirect to', WEBSERVICE_URL + EXISTING_COLLECTOR_URL + collectorId + NEW_RESPONDENT_URL);

        if (collectorId) {
          response.sendRedirect('EXTERNAL', WEBSERVICE_URL + EXISTING_COLLECTOR_URL + collectorId + NEW_RESPONDENT_URL);
          response.writePage('redirecting...');
        } else {
          throw nlapiCreateError('SWEET_WEBSERVICE_FAILED', 'Could not connect to Ladybird feedback application', true);
        }
        break;
    }

  nlapiLogExecution('DEBUG', 'Exit Successfully', 'ladybirdFeedbackEntry');

}

/*
*
*
*/
function immediateFeedbackEntry(jobId) {

  var collectorId;

  // Load the job record
  try {
    var jobRecord = nlapiLoadRecord('job', jobId);
  } catch (e) {
    response.write('Error: ' + e.getCode() + '\n' + e.getDetails());
  }

  // Check if we already have a collector ID
  var immediateFeedbackCollectorId = jobRecord.getFieldValue('custentity_bo_imcollectorid');

  if (immediateFeedbackCollectorId == null) {

    // We need to create a new collector in Ladybird

    var jobDate = nlapiStringToDate(jobRecord.getFieldValue('enddate'));
    var jobItemName = nlapiLookupField('item', jobRecord.getFieldValue('custentity_bo_item'), 'name');
    var jobCourseName = nlapiLookupField('customrecord_course', jobRecord.getFieldValue('custentity_bo_course'), 'name');
    var jobClientName = nlapiLookupField('customer', jobRecord.getFieldValue('parent'), 'companyname');

    // Build a name for the new collector
    var collectorName = jobItemName + ' : ';
    collectorName += jobCourseName + ' / ';
    collectorName += jobClientName + ' / ';
    collectorName += jobDate.format('yyyy-mm-dd') + ' ';
    collectorName += '[' + jobRecord.getFieldValue('entityid') + ']';

    nlapiLogExecution('DEBUG', 'New collector name', collectorName);

    collectorId = createLadybirdCollector(collectorName);

    nlapiLogExecution('DEBUG', 'New collector Id', collectorId);

    if (collectorId) {

      // Update the job record with the new collector ID
      jobRecord.setFieldValue('custentity_bo_imcollectorid', collectorId);
      jobRecord.setFieldValue('custentity_bo_imfeedbacklink', WEBSERVICE_URL + EXISTING_COLLECTOR_URL + collectorId);
      nlapiSubmitRecord(jobRecord, true);

    }

  } else {

    // Use existing collector to add new feedback

    collectorId = jobRecord.getFieldValue('custentity_bo_imcollectorid');

  }

  nlapiLogExecution('DEBUG', 'Using collector ID', collectorId);

  return collectorId;
}

/*
*
* @param string collectorName
* @return integer
*/
function createLadybirdCollector(collectorName) {

  // Need to force the content type to be JSON for Rails
  // You need both content types, dont know why
  var requestHeaders = new Array();
  requestHeaders['CONTENT-TYPE'] = 'application/json';
  requestHeaders['CONTENT_TYPE'] = 'application/json';
  requestHeaders['Authorization'] = basicAuth.createAuthString(WEBSERVICE_USERNAME, WEBSERVICE_PASSWORD);

  // Create a new collector object
  var newCollector = new Object();

  // Create a new ladybird collector
  var collectorObject = new ladybirdCollector();
  collectorObject.name = collectorName;

  // Put the new collector in the wrapper
  newCollector.collector = collectorObject;

  // Convert object to JSON
  var json_string = YAHOO.lang.JSON.stringify(newCollector);
  nlapiLogExecution('DEBUG', 'Sending JSON to ladybird', json_string);

  /* Post the JSON to ladybird */
  ladybirdResponse = nlapiRequestURL(NEW_COLLECTOR_JSON, json_string, requestHeaders);

  // Need to deal with the response code from ladybird
  switch(parseInt(ladybirdResponse.getCode())) {

    case 201:
      nlapiLogExecution('DEBUG', 'Create collector success', 'Created new ladybird collector : ' + ladybirdResponse.getHeader("Location"));

      // Get the new collector location from the response header
      var newCollectorUrl = ladybirdResponse.getHeader("Location");
      // Parse the collector ID out of the location
      var newCollectorId = getCollectorIdFromUrl(newCollectorUrl);

      break;

    default:
      nlapiLogExecution('DEBUG', 'Create collector error', 'Error trying to create new collector : ' + ladybirdResponse.getBody());
      break;
  }

  return newCollectorId;
}

/* Object definitions
*****************************************************************************/

/*
* Define a very simply ladybird collector object
*/
function ladybirdCollector() {

  this.name = '';

  // Hardcoded as standard feedback card
  this.survey_id = '110691333';

}

/* Helper functions
*****************************************************************************/

/*
* Extract the last item (collector id) from a collector location url
*/
function getCollectorIdFromUrl(urlString) {

  // Example url http://ladybird-chris.dev.themindgym.com/collectors/535913597

  // Split the URL into an array
  var urlArray = urlString.split('/');

  // The last element in the array should be the ID
  var collectorId = urlArray[urlArray.length-1];

  if ((collectorId != null) && (collectorId.length > 0)) {
    return collectorId;
  }

  return false;
}