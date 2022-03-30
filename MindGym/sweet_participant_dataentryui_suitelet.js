/**
 * Display UI for participant data entry task.
 *
 * @function participantDataEntryUI
 * @param {Object} request
 * @param {Object} response
 */
function participantDataEntryUI(request, response) {
  try {

    var view = new Array();
    view['form'] = new Array();
    view['form']['email'] = '';
    view['form']['firstname'] = '';
    view['form']['lastname'] = '';
    view['form']['jobid'] = request.getParameter('jobid');
    view['error'] = false;
    view['error_messages'] = new Array();
    
    // Check if we have a job id
    if (!view['form']['jobid']) {
      view['error'] = true;
      view['error_messages'].push('Job ID is missing');
      renderErrorPage(view);
      return;
    }
    
    // Check if an eprompt is associated with course
    if (request.getMethod().toUpperCase() == 'GET') {
      if (!request.getParameter('action')) {
        var job = nlapiLoadRecord('job', view['form']['jobid']);
        var courseId = job.getFieldValue('custentity_bo_course');
        var tasks = getEmailTasksByCourse(courseId);
        if (tasks.length < 1) {
          view['error'] = true;
          view['error_messages'].push('This course doesn\'t have an eprompt. Please contact Solutions Team.');
          renderErrorPage(view);
          return;
        }
      }
    }
    
    // Handle Remove action
    if (request.getMethod().toUpperCase() == 'GET') {
      if (request.getParameter('action') == 'remove') {

        // Participant attendance id
        paID = request.getParameter('paid');
        if (!paID) {
          view['error'] = true;
          view['error_messages'].push('Participant attendance ID is missing');
          renderErrorPage(view);
          return;
        }

        // Delete participant attendance record
        nlapiDeleteRecord('customrecord_participantattendance', paID);

        renderPage(view);
        return;
      }
    }

    // Handle Add action
    if (request.getMethod().toUpperCase() == 'POST') {
      view['form']['email'] = request.getParameter('email');
      view['form']['firstname'] = request.getParameter('firstname');
      view['form']['lastname'] = request.getParameter('lastname');

      // Validate email
      if (!view['form']['email'] || !view['form']['email'].match(/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,4}$/i)) {
        view['error'] = true;
        view['error_messages'].push('Invalid email address');
        renderPage(view);
        return;
      }

      // Does participant exists?
      var participantId = null;
      var participant = getParticipantByEmail(view['form']['email']);
      if (participant) {
        participantID = participant.getId();

        // Does participant attendance record already exists?
        if (participantAttendanceExists(view['form']['jobid'], participantID)) {
          view['form']['email'] = '';
          view['form']['firstname'] = '';
          view['form']['lastname'] = '';
          renderPage(view);
          return;
        }
      } else {

        // Validate first name
        if (!view['form']['firstname']) {
          view['error'] = true;
          view['error_messages'].push('First name is missing')
        }

        // Validate last name
        if (!view['form']['lastname']) {
          view['error'] = true;
          view['error_messages'].push('Last name is missing')
        }

        if (view['error']) {
          renderPage(view);
          return;
        }

        // Create participant record
        participant = nlapiCreateRecord('customrecord_participant');
        participant.setFieldValue('custrecord_pa_firstname', view['form']['firstname']);
        participant.setFieldValue('custrecord_pa_lastname', view['form']['lastname']);
        participant.setFieldValue('custrecord_pa_email', view['form']['email']);
        participantID = nlapiSubmitRecord(participant);
      }
      
      // Create participant attendence record
      participantAttendance = nlapiCreateRecord('customrecord_participantattendance');
      participantAttendance.setFieldValue('custrecord_paat_job', view['form']['jobid']);
      participantAttendance.setFieldValue('custrecord_paat_participant', participantID);
      participantAttendance.setFieldValue('custrecord_paat_firstname', participant.getFieldValue('custrecord_pa_firstname'));
      participantAttendance.setFieldValue('custrecord_paat_lastname', participant.getFieldValue('custrecord_pa_lastname'));
      participantAttendance.setFieldValue('custrecord_paat_email', participant.getFieldValue('custrecord_pa_email'));
      nlapiSubmitRecord(participantAttendance);
    }

    // Display empty form
    view['form']['email'] = '';
    view['form']['firstname'] = '';
    view['form']['lastname'] = '';
    renderPage(view);
    
  } catch (e) {
    var view = new Array();
    view['error_messages'] = new Array();

    // Write error to screen
    if (e instanceof nlobjError) {
      view['error_messages'].push('Error: ' + e.getCode() + '\n' + e.getDetails());
    } else {
      view['error_messages'].push('Error: ' + e.toString());
    }
    renderErrorPage(view);
  }
}

/**
 * Get email tasks by course
 * 
 * @param {String} courseId
 * @return {Array}
 */
function getEmailTasksByCourse(courseId) {
  var filters = new Array();
  filters.push(new nlobjSearchFilter('custrecord_emailtsk_course', null, 'is', courseId));
  var result = nlapiSearchRecord('customrecord_emailtask', '225', filters, null);
  return (result ? result : new Array());
}

function renderErrorPage(view) {
  echo('<html>');
  echo('<head>');
  echo('<title>The Mind Gym - Register Participants</title>');
  echo('<link rel="stylesheet" type="text/css" media="screen" href="https://netsuite.themindgym.com/css/suitelet_layout.css" />');
  echo('<link rel="stylesheet" type="text/css" media="screen" href="https://netsuite.themindgym.com/css/participant_attendance.css" />');
  echo('</head>');
  echo('<body>');

  echo('<h1>Register Participants</h1>');

  echo('<div id="main">');

  var i = 0, n = view['error_messages'].length;
  for (;i < n; i++) {
    echo(view['error_messages'][i] + '<br />');
  }

  echo('</body></html>');
}

function renderPage(view) {

  // Load the job record
  var jobRecord = nlapiLoadRecord('job', view['form']['jobid']);

  // Get URL back to the job record
  var jobURL = nlapiResolveURL('RECORD', 'job', view['form']['jobid']);

  echoHeader();

  echo('<body onLoad="document.participantform.email.focus()">');

  echo('<div id="back-to-netsuite">');
  echo('&rarr; <a href="' + jobURL + '">Back to Netsuite</a>');
  echo('</div>');

  echo('<h1>Register Participants</h1>');

  echo('<div id="main">');

  echo('Job ID: ' + jobRecord.getFieldValue('entityid') + '<br />');
  var clientName = nlapiLookupField('customer', jobRecord.getFieldValue('parent'), 'companyname');
  echo('Client: ' + clientName + '<br />');
  echo('Date: ' + jobRecord.getFieldValue('enddate') + '<br />');
  echo('Time: ' + jobRecord.getFieldValue('custentity_bo_eventtime') + '<br />');
  var courseName = nlapiLookupField('customrecord_course', jobRecord.getFieldValue('custentity_bo_course'), 'name');
  echo('Course: ' + courseName + '<br />');
  var coachName = nlapiLookupField('vendor', jobRecord.getFieldValue('custentity_bo_coach'), 'entityid');
  echo('Coach: ' + coachName + '<br />');
  
  if (view['error']) {
    echo('<ul>');
    var i = 0, n = view['error_messages'].length;
    for (;i < n; i++) {
      echo('<li>' + view['error_messages'][i] + '</li>');
    }
    echo('</ul>');
  }

  /***** Main form *****/

  echo('<h2>Add new</h2>');

  var formURL = nlapiResolveURL('SUITELET', 'customscript_pa_bulkentry_form', 'customdeploy_pa_bulkentry_form', null) + '&jobid=' + view['form']['jobid'];

  echo('<form name="participantform" action="' + formURL + '" method="POST">')

  echo('<div id="add_item">');
    echo('<div class="participant-field"><label for="new_email_field">Email address</label><br />');
    echo('<input id="new_email_field" name="email" type="text" value="' + view['form']['email'] + '">');
    echo('<div class="yui-skin-sam" id="email_autocomplete"></div>');
    echo('</div>');
    echo('<div class="participant-field"><label for="new_firstname_field">First name</label><br />');
    echo('<input id="new_firstname_field" name="firstname" type="text" value="' + view['form']['firstname'] + '">');
    echo('</div>');
    echo('<div class="participant-field"><label for="new_lastname_field">Last name</label><br />');
    echo('<input id="new_lastname_field" name="lastname" type="text" value="' + view['form']['lastname'] + '">');
    echo('</div>');
    echo('<div class="participant-field"><br /><input id="submit" type="submit" value="Add participant" class="submit" /></div>');
    echo('<br style="clear: left;" />');
  echo('</div>');
  echo('</form>')

  // List participant attendance records
  var filters = new Array();
  filters[0] = new nlobjSearchFilter('custrecord_paat_job', null, 'is', view['form']['jobid']);

  var columns = new Array();
  columns[0] = new nlobjSearchColumn('custrecord_paat_firstname');
  columns[1] = new nlobjSearchColumn('custrecord_paat_lastname');
  columns[2] = new nlobjSearchColumn('custrecord_paat_email');
  columns[3] = new nlobjSearchColumn('custrecord_paat_participant');

  var searchResults = nlapiSearchRecord('customrecord_participantattendance', null, filters, columns);

  if (!searchResults) {
    searchResults = new Array();
  }

  echo('<h2>Participants</h2>');

  // Show the list of existing participants
  if (searchResults.length > 0) {

    echo('<table id="participant-attendance-list">');
      echo('<thead>');
        echo('<tr>');
          echo('<th>&nbsp;</th>');
          echo('<th>Email address</th>');
          echo('<th>First name</th>');
          echo('<th>Last name</th>');
          echo('<th>&nbsp;</th>');
          echo('<th>&nbsp;</th>');
        echo('</tr>');
      echo('</thead>');
      echo('<tbody>');

      var i = 0, n = searchResults.length;

      for (;i < n; i++) {

        var searchResult = searchResults[i];
        var editURL = nlapiResolveURL('RECORD', 'customrecord_participant', searchResult.getValue('custrecord_paat_participant'), 'EDIT');
        deleteURL = 'test';
        var deleteURL = nlapiResolveURL('SUITELET', 'customscript_pa_bulkentry_form', 'customdeploy_pa_bulkentry_form', null);
        deleteURL += '&jobid=' + view['form']['jobid'] + '&action=remove' + '&paid=' + searchResult.getId();

        echo('<tr>');
          echo('<td>' + (i+1) + '</td>');
          echo('<td>' + searchResult.getValue('custrecord_paat_email') + '</td>');
          echo('<td>' + searchResult.getValue('custrecord_paat_firstname') + '</td>');
          echo('<td>' + searchResult.getValue('custrecord_paat_lastname') + '</td>');
          echo('<td><a href="' + editURL + '" target="_blank">Edit</a></td>');
          echo('<td><a href="' + deleteURL + '">Remove</a></td>');
        echo('</tr>');

      }

      echo('</tbody>')
    echo('</table>');

  } else {

    echo('<p>None.</p>');

  }
  
  // Save button
  var url = nlapiResolveURL('SUITELET','customscript_job_booking_helper', 'customdeploy_job_booking_helper', false);
  url += '&action=online-completed&jobid=' + jobRecord.getId();
  var onClick = "window.location.href='" + url + "';";
  echo('<div class="buttons">');
    echo('<input type="button" value="Finish & Close" class="submit" onclick="' + onClick + '"/>');
  echo('</div>');

  echo('<script type="text/javascript">');
  echo('// An XHR DataSource');
  echo('var server = "/app/site/hosting/scriptlet.nl";');
  echo('var schema = ["participants.participant", "email", "firstname", "lastname"];');
  echo('var dataSource = new YAHOO.widget.DS_XHR(server, schema);');
  echo('dataSource.scriptQueryAppend = "script=55&deploy=1";');

  echo('var emailAC = new YAHOO.widget.AutoComplete("new_email_field", "email_autocomplete", dataSource);');
  echo('emailAC.useShadow = true;');
  echo('emailAC.minQueryLength = 4;');
  echo('emailAC.typeAhead = false;');
  echo('emailAC.allowBrowserAutocomplete = false;');
  echo('emailAC.formatResult = function(oResultItem, sQuery) {');
  echo('  return oResultItem[1] + " " + oResultItem[2] + " (" + oResultItem[0] + ")";');
  echo('};');
  echo('emailAC.doBeforeExpandContainer = function(oTextbox, oContainer, sQuery, aResults) {');
    echo('var pos = YAHOO.util.Dom.getXY(oTextbox);');
    echo('pos[1] += YAHOO.util.Dom.get(oTextbox).offsetHeight + 2;');
    echo('YAHOO.util.Dom.setXY(oContainer, pos);');
    echo('return true;');
  echo('};');

  // Define itemSelect handler function:
  echo('var itemSelectHandler = function(sType, aArgs) {');
  echo('  var aData = aArgs[2];');
  echo('  document.getElementById("new_firstname_field").value = aData[1];');
  echo('  document.getElementById("new_lastname_field").value = aData[2];');
  echo('};');

  // Subscribe handler to the event
  echo('emailAC.itemSelectEvent.subscribe(itemSelectHandler);');

  echo('</script>');

  echoFooter();
}

/**
 * A simple alias to response.writeLine
 *
 * @function echo
 * @param {String} string
 */
function echo(string) {
  response.writeLine(string);
}

/**
 * Outputs the html header
 *
 * @function echoHeader
 */
function echoHeader() {
  echo('<html><head>');
  echo('<title>The Mind Gym - Register Participants</title>');

  echo('<!--CSS file (default YUI Sam Skin) -->');
  echo('<link type="text/css" rel="stylesheet" href="http://yui.yahooapis.com/2.5.2/build/autocomplete/assets/skins/sam/autocomplete.css">');
  echo('<!-- Dependencies -->');
  echo('<script type="text/javascript" src="http://yui.yahooapis.com/2.5.2/build/yahoo-dom-event/yahoo-dom-event.js"></script>');
  echo('<!-- OPTIONAL: Connection (required only if using XHR DataSource) -->');
  echo('<script type="text/javascript" src="http://yui.yahooapis.com/2.5.2/build/connection/connection-min.js"></script>');
  echo('<!-- OPTIONAL: Animation (required only if enabling animation) -->');
  echo('<script type="text/javascript" src="http://yui.yahooapis.com/2.5.2/build/animation/animation-min.js"></script>');
  echo('<!-- OPTIONAL: JSON (enables JSON validation) -->');
  echo('<script type="text/javascript" src="http://yui.yahooapis.com/2.5.2/build/json/json-min.js"></script>');
  echo('<!-- Source file -->');
  echo('<script type="text/javascript" src="http://yui.yahooapis.com/2.5.2/build/logger/logger-min.js"></script>');
  echo('<!-- Source file -->');
  echo('<script type="text/javascript" src="http://yui.yahooapis.com/2.5.2/build/autocomplete/autocomplete-min.js"></script>');

  echo('<link rel="stylesheet" type="text/css" media="screen" href="https://netsuite.themindgym.com/css/suitelet_layout.css" />');
  echo('<link rel="stylesheet" type="text/css" media="screen" href="https://netsuite.themindgym.com/css/participant_attendance.css" />');

  echo('</head>');
}

/**
 * Outputs the html footer
 *
 * @function echoFooter
 */
function echoFooter() {
  echo('</div>');
  echo('</body></html>');
}

/**
 * Get participant record by email
 *
 * @param {String} email
 * @return nlobjRecord
 */
function getParticipantByEmail(email) {
  var filters = new Array();
  filters[0] = new nlobjSearchFilter('custrecord_pa_email', null, 'is', email);

  var searchResults = nlapiSearchRecord('customrecord_participant', null, filters, null);
  if (!searchResults) {
    return null;
  }

  if (searchResults.length > 1) {
    throw "Participant duplicates founds: " + email;
  }

  return nlapiLoadRecord('customrecord_participant', searchResults[0].getId());
}

/**
 * Check if participant attedance record exists
 *
 * @param {String} jobID
 * @param {String} participantID
 * @return {Boolean}
 */
function participantAttendanceExists(jobID, participantID) {
  var filters = new Array();
  filters[0] = new nlobjSearchFilter('custrecord_paat_job', null, 'is', jobID);
  filters[1] = new nlobjSearchFilter('custrecord_paat_participant', null, 'anyOf', participantID);
  var searchResults = nlapiSearchRecord('customrecord_participantattendance', null, filters, null);
  return (searchResults && searchResults.length > 0);
}

