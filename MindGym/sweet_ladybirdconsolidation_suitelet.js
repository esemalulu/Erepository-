/**
 * Ladybird webservice
 */
var WEBSERVICE_URL = 'https://ladybird.themindgym.com';
var CLOSE_COLLECTOR_URL = WEBSERVICE_URL + '/collectors/close/<%id%>.json';
var GET_ALLRESPONSES_URL = WEBSERVICE_URL + '/collectors/<%id%>/respondents/all_responses.json?exclude_text_responses=1';

var WEBSERVICE_USERNAME = 'ladybird';
var WEBSERVICE_PASSWORD = '2ksquare';

var SWEET_DEBUG = false;

/**
 * Ladybird feedback consolidation
 *
 * @param {Object} request
 * @param {Object} response
 */
function ladybirdFeedbackConsolidation(request, response) {

  nlapiLogExecution('DEBUG', 'Begin', 'ladybirdFeedbackConsolidation');
  
  try {
    
    var jobId = request.getParameter('jobid');
    var feedbackType = request.getParameter('type');
    
    if ((jobId == null) && (jobId.length == 0)) {
      nlapiLogExecution('DEBUG', 'Missing job Id');
      response.writeLine('Missing Job Id');
      return false;
    }
    
    if (SWEET_DEBUG) {
      response.writeLine('Closing feedback for Job ' + jobId);
    }
    
    nlapiLogExecution('DEBUG', 'Closing feedback for job', jobId);
    
    // See which type of feedback we are dealing with
    switch(feedbackType) {
      
      case 'immediate':
      
        nlapiLogExecution('DEBUG', 'Feedback', 'immediate');
        
        // Close the feedback collector
        closeImmediateFeedback(jobId);
        
        // Consolidate all the receieved feedback
        consolidateImmediateFeedback(jobId);
        
        // Create task for job owner
        createFeedbackTask(jobId);
        break;
    }
    
    if (SWEET_DEBUG) {
      return true;
    }
    
    // Redirect back to job record
    nlapiLogExecution('DEBUG', 'Info', 'Redirect back to job record');
    nlapiSetRedirectURL('RECORD', 'job', jobId);
    
  } catch (e) {
    
    // Write error to screen
    if (e instanceof nlobjError) {
      response.write('Error: ' + e.getCode() + '\n' + e.getDetails());
    }
    
    response.write('Error: ' + e.toString());
  }
  
  nlapiLogExecution('DEBUG', 'Exit Successfully', 'ladybirdFeedbackConsolidation');
}

/*
* Close a ladybird feedback collector
*
* @param integer jobId
* @return boolean
*/
function closeImmediateFeedback(jobId) {

  var collectorId;

  // Load the job record
  try {
    var jobRecord = nlapiLoadRecord('job', jobId);
  } catch (e) {
    response.write('Error: ' + e.getCode() + '\n' + e.getDetails());
  }

  // Get the existing collector Id
  collectorId = jobRecord.getFieldValue('custentity_bo_imcollectorid');

  // Custom request headers
  var requestHeader = new Array();
  requestHeader['CONTENT-TYPE'] = 'application/json';
  requestHeader['CONTENT_TYPE'] = 'application/json';
  requestHeader['Authorization'] = basicAuth.createAuthString(WEBSERVICE_USERNAME, WEBSERVICE_PASSWORD);

  // Request body
  var requestBody = new Object();
  requestBody._method = 'PUT'

  // Convert request body to JSON
  var json_string = YAHOO.lang.JSON.stringify(requestBody);
  nlapiLogExecution('DEBUG', 'Sending JSON to ladybird', json_string);

  webServiceUrl = CLOSE_COLLECTOR_URL.replace('<%id%>', collectorId);

  // Webservices call to Ladybird to close the collector
  ladybirdResponse = nlapiRequestURL(webServiceUrl, json_string, requestHeader);
  nlapiLogExecution('DEBUG', 'URL', webServiceUrl);

  // Need to deal with the response code from ladybird
  switch(ladybirdResponse.getCode()) {

    case 200:
      nlapiLogExecution('DEBUG', 'Close collector success', 'Closed collector: ' + collectorId);
      if (SWEET_DEBUG) {
        response.writeLine('Collector closed successfully');
      }
      return true;
      break;

    default:
      nlapiLogExecution('DEBUG', 'Close collector error', 'Error trying to close collector : ' + ladybirdResponse.getCode() + ' ' + ladybirdResponse.getBody());
      if (SWEET_DEBUG) {
        response.writeLine('Failed closing collector');
      }
      return false;
      break;
  }

}

/*
* Consolidate all receieved feedback for a job
*
* @param integer jobId
* @return boolean
*/
function consolidateImmediateFeedback(jobId) {

  // Load the job record
  try {
    var jobRecord = nlapiLoadRecord('job', jobId);
  } catch (e) {
    response.write('Error: ' + e.getCode() + '\n' + e.getDetails());
  }

  // Get the existing collector Id
  var collectorId = jobRecord.getFieldValue('custentity_bo_imcollectorid');

  if (SWEET_DEBUG) {
    response.writeLine('Consolidating feedback from collector ' + collectorId);
  }

  // Create a new ladybird collector object
  var feedbackCollector = new ladybirdCollector(collectorId);

  // Get all the respondents into the object
  feedbackCollector.getRespondents();

  if (SWEET_DEBUG) {
    response.writeLine('Total respondents ' + feedbackCollector.totalRespondents);
  }

  if (feedbackCollector.totalRespondents > 0) {

    // Set the job id in the feedback collector
    feedbackCollector.jobId = jobId;

    // Process all the respondents
    feedbackCollector.processRespondents();

  }

  if (SWEET_DEBUG) {
    response.writeLine('==== The scores on the doors ====');
    response.writeLine('Total weight ' + feedbackCollector.totalWeight);
    response.writeLine('Total positive responses ' + feedbackCollector.totalPositiveRespondents);
    response.writeLine('Mean average ' + feedbackCollector.meanAverage);
    response.writeLine('% positive ' + feedbackCollector.percentPositiveRespondents);
  }

  return true;
}

/* Object definitions
*****************************************************************************/

function ladybirdCollector(collectorId) {

  // public vars
  this.collectorId = collectorId;
  this.jobId;
  this.respondents = new Array();

  // Netsuite required vars
  this.totalRespondents = 0;
  this.totalWeight = 0;
  this.totalPositiveRespondents = 0;
  this.meanAverage = 0;
  this.percentPositiveRespondents = 0;

  // Object for the standard measure question used to calculate all values from
  this.standardMeasureQuestion = new function() {

    // Hardcoded Id of the stndard measure question
    this.id = 180729571;

    this.answers = new Object();

    this.answers.excellent = new function() {
      this.id = 621430975;
      this.weight = 5;
      this.bias = 1;
     }

    this.answers.very_good = new function() {
      this.id = 7120338;
      this.weight = 4;
      this.bias = 1;
    }

    this.answers.good = new function() {
      this.id = 385923553;
      this.weight = 3;
      this.bias = 0;
    }

    this.answers.adequate = new function() {
      this.id = 773176812;
      this.weight = 2;
      this.bias = -1;
    }

    this.answers.poor = new function() {
      this.id = 148015003;
      this.weight = 1;
      this.bias = -1;
    }
  }

  // public methods
  this.getRespondents = getRespondents;
  this.processRespondents = processRespondents;
  this.updateJobRecord = updateJobRecord;
  this.getMeasureQuestionFromNumericResponses = getMeasureQuestionFromNumericResponses;
  this.getMeasureQuestionAnswer = getMeasureQuestionAnswer;

  /*
  * Get an array of respondents from ladybird
  *
  * @return array
  */
  function getRespondents() {

    var respondents = new Array();

    nlapiLogExecution('DEBUG', 'Getting all respondents', 'Collector Id ' + this.collectorId);

    // Need to force the content type to be JSON for Rails
    // You need both content types, dont know why
    var requestHeaders = new Array();
    requestHeaders['CONTENT-TYPE'] = 'application/json';
    requestHeaders['CONTENT_TYPE'] = 'application/json';
    requestHeaders['Authorization'] = basicAuth.createAuthString(WEBSERVICE_USERNAME, WEBSERVICE_PASSWORD);

    // Build URL for webservice
    webServiceUrl = GET_ALLRESPONSES_URL.replace('<%id%>', collectorId);

    nlapiLogExecution('DEBUG', 'URL', webServiceUrl);

    // Make URL request to Ladybird
    ladybirdResponse = nlapiRequestURL(webServiceUrl, null, requestHeaders);

    nlapiLogExecution('DEBUG', 'Got Response code', ladybirdResponse.getCode());

    // Check the response code
    switch(parseInt(ladybirdResponse.getCode())) {

      case 200:
        nlapiLogExecution('DEBUG', 'Response 200', 'Got all respondents');
        break;

      default:
        nlapiLogExecution('DEBUG', 'Response ' + ladybirdResponse.getCode(), 'Error getting respondents ' + ladybirdResponse.getBody());
        return false;
        break;
    }

    // Parse the response from JSON into an array
    try {
      respondents = YAHOO.lang.JSON.parse(ladybirdResponse.getBody());
    } catch (e) {
      nlapiLogExecution('DEBUG', 'Error parsing JSON', e.getCode() + '\n' + e.getDetails());
      return false;
    }

    // Store the respondents in the object
    this.respondents = respondents;
    this.totalRespondents = respondents.length;

    return respondents;
  }

  /*
  * Process the respondents in the object and calculate stats
  *
  * @return boolean
  */
  function processRespondents() {

    // Get the all the responsdents out the ojbect
    var respondents = this.respondents;

    if (respondents.length > 0) {

      // Loop through each respondent
      for (var i = 0; i < respondents.length; i++) {

        var respondent = respondents[i];

        nlapiLogExecution('DEBUG', 'Processing respondent', i);

        // We are only interested in the respondents numeric responses
        var numericResponses = respondent.numeric_responses;

        if ((numericResponses != null) && (numericResponses.length > 0)) {

          nlapiLogExecution('DEBUG', 'Numeric responses', numericResponses.length);

          // Find the measure question in all the numeric responses
          var measureQuestion = this.getMeasureQuestionFromNumericResponses(numericResponses);
          nlapiLogExecution('DEBUG', 'Found measure question');

          var measureQuestionAnswer = this.getMeasureQuestionAnswer(measureQuestion);
          nlapiLogExecution('DEBUG', 'Found measure question answer', measureQuestionAnswer);

          if (measureQuestionAnswer != null) {

            // Add the answer weight to the total weight
            this.totalWeight += measureQuestionAnswer.weight;

            // Check if the answer has a positive bias
            if (measureQuestionAnswer.bias == 1) {
              this.totalPositiveRespondents += 1;
            }

          }

        }

      }

    }


    nlapiLogExecution('DEBUG', 'Total respondents', this.totalRespondents);
    nlapiLogExecution('DEBUG', 'Total weight', this.totalWeight);

    // Calculate the mean average of all the responses (1dp)
    this.meanAverage = (Math.round((this.totalWeight / this.totalRespondents) * 10) / 10);
    nlapiLogExecution('DEBUG', 'Mean average', this.meanAverage);

    // Calculate percent positive respondents (1dp)
    this.percentPositiveRespondents = (Math.round((this.totalPositiveRespondents / this.totalRespondents) * 1000) / 10);
    nlapiLogExecution('DEBUG', 'Percent Positive Respondents', this.percentPositiveRespondents);

    // Updte the job record with calculated values
    this.updateJobRecord();

    return true;
  }

  /*
  * Get the measure question from a set of numeric responses
  *
  * @param object numericResponses
  * @return object
  */
  function getMeasureQuestionFromNumericResponses(numericResponses) {

    for (var i = 0; i < numericResponses.length; i++) {

      // Check if we hit the magic measure question
      if (numericResponses[i].question_id == this.standardMeasureQuestion.id) {
        return numericResponses[i];
      }

    }

    return new Array();
  }

  /*
  * Find the answer to the measure question
  *
  * @param object measureQuestion
  * @return object
  */
  function getMeasureQuestionAnswer(measureQuestion) {

    var possibleAnswers = this.standardMeasureQuestion.answers;

    // Loop through our predefined array of measure question answers (excellent, very good...)
    for (answer in possibleAnswers) {

      // Get question column
      if (measureQuestion.option3 == possibleAnswers[answer].id) {

        if (SWEET_DEBUG) {
          response.writeLine('Respondents answer is ' + answer);
        }
        return possibleAnswers[answer];

      }

    }

    if (SWEET_DEBUG) {
      response.writeLine('Respondent didnt answer measure question');
    }

    return null;
  }

  /*
  * Update the collectors job record with the calcualted values
  *
  * @return boolean
  */
  function updateJobRecord() {

    var jobRecord = new Array();

    nlapiLogExecution('DEBUG', 'Updating job record', this.jobId);

    // Load the job record
    try {
      jobRecord = nlapiLoadRecord('job', this.jobId);
    } catch (e) {
      nlapiLogExecution('ERROR', 'Error loading job record', this.jobId);
      response.write('Error loading record: ' + e.getCode() + '\n' + e.getDetails());
    }

    // Set the updated job fields
    jobRecord.setFieldValue('custentity_bo_imrespondents', this.totalRespondents);
    jobRecord.setFieldValue('custentity_bo_imweight', this.totalWeight);
    jobRecord.setFieldValue('custentity_bo_imposrespondents', this.totalPositiveRespondents);
    jobRecord.setFieldValue('custentity_bo_immeanavg', this.meanAverage);
    jobRecord.setFieldValue('custentity_bo_impercentpos', this.percentPositiveRespondents);

    // Mark immediate feedback as collected and complete
    jobRecord.setFieldValue('custentity_bo_isimfeedbackcollected', 'T');

    var currentDate = new Date();
    jobRecord.setFieldValue('custentity_bo_imfeedbackcollectiondate', nlapiDateToString(currentDate));

    // Save the new job
    nlapiSubmitRecord(jobRecord, true);

    nlapiLogExecution('DEBUG', 'Job updated', 'success');

    return true;
  }
}

/**
 * Create a task for the job owner to send feedback report to client.
 *
 * @param jobId
 */
function createFeedbackTask(jobId) {
  
  // Get fields
  var fieldNames = new Array();
  fieldNames.push('custentity_bo_owner');
  fieldNames.push('custentity_bo_buyer');
  fieldNames.push('customer');
  var fields = nlapiLookupField('job', jobId, fieldNames);
  var ownerId = fields['custentity_bo_owner'];
  var buyerId = fields['custentity_bo_buyer'];
  var clientId = fields['customer'];
  
  // Do we got an owner?
  if (ownerId) {
    
    var buyer = nlapiLoadRecord('contact', buyerId);
    var buyerName = buyer.getFieldValue('firstname') + ' ' + buyer.getFieldValue('lastname');
    var client = nlapiLoadRecord('customer', clientId);
    var clientName = client.getFieldValue('companyname');
    var today = new Date();
    var startDate = nlapiDateToString(today);
    var dueDate = nlapiDateToString(nlapiAddDays(today, 1));
    
    // Create a task
    var title = 'Send feedback report to client';
    var task = nlapiCreateRecord('task');
    task.setFieldValue('title', title);
    task.setFieldValue('assigned', ownerId);
    task.setFieldValue('company', jobId);
    task.setFieldValue('startdate', startDate);
    task.setFieldValue('duedate', dueDate);
    var taskId = nlapiSubmitRecord(task, true);
    
    // Send email notification to owner
    var emailSubject = 'New feedback is available for ' + buyerName + ' at ' + clientName;
    var emailMessage =
      'A task has been assigned to you.\n\n' +
      'To view the task record, log into NetSuite then navigate to:\n' +
      'https://system2.netsuite.com/app/crm/calendar/task.nl?id=' + taskId + '\n\n' +
      'To view the job record related to this task, navigate to:\n' +
      'https://system2.netsuite.com/app/common/entity/custjob.nl?id=' + jobId;
    
    nlapiSendEmail(nlapiGetUser(), ownerId, emailSubject, emailMessage);
  }
}
