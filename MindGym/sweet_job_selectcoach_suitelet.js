/**
 * Select Coach UI
 *
 * @method sweet_suitelet
 * @param {Object} request
 * @param {Object} response
 */
function sweet_suitelet(request, response) {
  try {
    
    // Validate job id
    var jobId = request.getParameter('job');
    if (!jobId) {
      throw nlapiCreateError('SWEET_JOB_REQD', 'Job field is required.', true);
    }
    
    var errors = new Array();
    var valid = true;
    
    // Load record
    job = nlapiLoadRecord('job', jobId);
    
    // Get (any) calendar event associated with this job
    var filters = new Array();
    filters.push(new nlobjSearchFilter('custrecord_calevent_job', null, 'is', job.getId()));
    var events = nlapiSearchRecord('customrecord_calendarevent', null, filters, null);
    
    if (events) {
      response.writeLine(events.length + ' events are associated with this job');
    }
    
    // Has form been submitted?
    if (request.getMethod() == 'POST') {
      
      if (events) {
        valid = false;
        errors.push('A calendar event is already associated with this job');
      }
      
      if (valid) {
        // Create new calendar event
        var event = nlapiCreateRecord('customrecord_calendarevent');
        SWEET.CalendarEvent.createOrUpdateByJob(event, job);
        
        // Redirect...
      }
    }
    
    // Build form
    var form = nlapiCreateForm('Select coach', false);
    
    // Job field
    var field = form.addField('job', 'select', 'Job', 'job');
    field.setDefaultValue(job.getId());
    field.setDisplayType('inline');
    field.setLayoutType('normal', 'startcol');
    
    // Date field
    var field = form.addField('enddate', 'date', 'Date');
    field.setDefaultValue(job.getFieldValue('enddate'));
    field.setDisplayType('inline');
    field.setLayoutType('normal');
    
    // Coach field
    var field = form.addField('vendor', 'select', 'Coach');
    field.setLayoutType('normal');
    var filters = new Array();
    filters.push(new nlobjSearchFilter('category', null, 'is', 5)); // Coach
    var columns = new Array();
    columns.push(new nlobjSearchColumn('entityid'));
    var coaches = nlapiSearchRecord('vendor', null, filters, columns);
    if (coaches) {
      var i = 0, n = coaches.length;
      field.addSelectOption('', ' - Select coach - ', true);
      for (; i < n; i++) {
        field.addSelectOption(coaches[i].getId(), coaches[i].getValue('entityid'));
      }
    } else {
      field.addSelectOption('', ' - No coaches found - ', true);
    }
    
    // Submit button
    form.addSubmitButton('Save');
    
    // Cancel button
    var url = nlapiResolveURL('RECORD', 'job', job.getId());
    var onClick = "window.location.href='" + url + "'";
    form.addButton('cancel', 'Cancel', onClick);
    
    response.writePage(form);
  } catch (e) {
    if (e instanceof nlobjError) {
      response.write('Error: ' + e.getCode() + '\n' + e.getDetails());
    } else {
      response.write('Error: ' + e.toString());
    }
    throw e;
  }
}

function renderPage() {
  var jobId = 1;

  echoHeader('The Mind Gym - Select Coach');
  
  echo('<div id="back-to-netsuite">');
  echo('&rarr; <a href="/app/center/card.nl">Go back</a>');
  echo('</div>');
  
  echo('<h1>Select Coach</h1>');
  echo('<div id="main">');
  echo('  <form action="" method="POST">');
  echo('  <input id="job_id" name="job_id" type="hidden" value="' + jobId + '">');
  
  // Coach field
  echo('  <div>');
  echo('    <fieldset>\n');
  echo('      <legend>Coach</legend>\n');
  echo('      <div style="z-index: 3">' + "\n");
  echo('        <input id="custentity_bo_coach" name="custentity_bo_coach" type="hidden" value="">');
  echo('        <input id="coach_field" name="coach" type="text" value="" size="40">');
  echo('        <div class="yui-skin-sam" id="coach_autocomplete"></div>');
  echo('        <div id="coach_field-lock" class="reset-field" style="display: none"><a href="javascript:unlockField(\'coach_field\', \'custentity_bo_coach\')">Clear</a></div>');
  echo('        <div id="coach-search-inprogress" class="search-inprogress" style="display: none">Searching...</div>');
  echo('      </div>');
  echo('    </fieldset>');
  echo('    <div style="margin-top: 2em;">');
  echo('      <input type="submit" class="submit" value="Select coach" /> or <a href="/">Cancel</a>');
  echo('    </div>');
  echo('  </div>');
  
  echo('  </form>');
  echo('</div>');
  
  echoFooter();
}

/**
 * Output html header
 *
 * @param {String} title
 * @return {Void}
 */
function echoHeader(title) {
  echo('<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01//EN" "http://www.w3.org/TR/html4/strict.dtd">');
  echo('<head>');
  echo('<title>' + title + '</title>');
  echoCSS();
  echoJS();
  echo('</head>');
  echo('<body>');
}

/**
 * Output html footer
 *
 * @return {Void}
 */
function echoFooter() {
  echo('</body>');
  echo('</html>');
}

/**
 * Output CSS
 *
 * @return {Void}
 */
function echoCSS() {
  echo('<link rel="stylesheet" type="text/css" href="https://ajax.googleapis.com/ajax/libs/yui/2.7.0/build/reset/reset-min.css" />');
  echo('<link type="text/css" rel="stylesheet" href="https://ajax.googleapis.com/ajax/libs/yui/2.7.0/build/autocomplete/assets/skins/sam/autocomplete.css">');
  echo('<link rel="stylesheet" type="text/css" href="https://system.netsuite.com/core/media/media.nl?id=1464&c=720154&h=5d954ba80c6d8442ba63&_xt=.css" />');
}

/**
 * Output JS
 *
 * @return {Void}
 */
function echoJS() {
  echo('<script type="text/javascript" src="https://ajax.googleapis.com/ajax/libs/yui/2.7.0/build/yahoo-dom-event/yahoo-dom-event.js"></script>');
  echo('<script type="text/javascript" src="https://ajax.googleapis.com/ajax/libs/yui/2.7.0/build/datasource/datasource-min.js"></script>');
  echo('<script type="text/javascript" src="https://ajax.googleapis.com/ajax/libs/yui/2.7.0/build/connection/connection-min.js"></script>');
  echo('<script type="text/javascript" src="https://ajax.googleapis.com/ajax/libs/yui/2.7.0/build/animation/animation-min.js"></script>');
  echo('<script type="text/javascript" src="https://ajax.googleapis.com/ajax/libs/yui/2.7.0/build/json/json-min.js"></script>');
  echo('<script type="text/javascript" src="https://ajax.googleapis.com/ajax/libs/yui/2.7.0/build/autocomplete/autocomplete-min.js"></script>');
  
  echo('<script type="text/javascript">');
  echo('<!--');
  
  echo('YAHOO.util.Event.onDOMReady(setupForm);');
  
  echo('function setupForm() {');
  echo('  document.getElementById("custentity_bo_coach").value = "";');
  //echo('  document.getElementById("internalid").value = "";');
  
  // DataSource
  echo('  var dataSource = new YAHOO.util.XHRDataSource("/app/site/hosting/scriptlet.nl");');
  echo('  dataSource.responseType = YAHOO.util.XHRDataSource.TYPE_JSON;');
  echo('  dataSource.connXhrMode = "cancelStaleRequests";');
  echo('  dataSource.maxCacheEntries = "10";');
  echo('  dataSource.scriptQueryAppend = "script=65&deploy=1&action=search";');
  echo('  dataSource.responseSchema = {');
  echo('      resultsList: "coaches",');
  echo('      fields: ["internalid", "entityid", "firstname", "lastname"]');
  echo('  };');
  
  // AutoComplete
  echo('  var coachAC = new YAHOO.widget.AutoComplete("coach_field", "coach_autocomplete", dataSource);');
  echo('  coachAC.useShadow = true;');
  echo('  coachAC.minQueryLength = 3;');
  echo('  coachAC.typeAhead = false;');
  echo('  coachAC.allowBrowserAutocomplete = false;');
  echo('  coachAC.formatResult = function(oResultItem, sQuery) {');
  echo('    var str = oResultItem[1];');
  echo('    return str;');
  echo('  };');
  echo('  coachAC.doBeforeExpandContainer = function(oTextbox, oContainer, sQuery, aResults) {');
  echo('    var pos = YAHOO.util.Dom.getXY(oTextbox);');
  echo('    pos[1] += YAHOO.util.Dom.get(oTextbox).offsetHeight + 2;');
  echo('    YAHOO.util.Dom.setXY(oContainer, pos);');
  echo('    return true;');
  echo('  };');

  // Define itemSelect handler function:
  echo('  var itemSelectHandler = function(sType, aArgs) {');
  echo('    var aData = aArgs[2];');
  echo('    var coach_name = aData[1]; // entityid');
  echo('    document.getElementById("coach_field").value = coach_name;');
  echo('    document.getElementById("custentity_bo_coach").value = aData[0];'); // internal id
  echo('    lockField("coach_field");');
  echo('  };');
  echo('  coachAC.itemSelectEvent.subscribe(itemSelectHandler);');
  
  // Define dataRequestEvent handler
  echo('  var dataRequestEventHandler = function(oSelf , sQuery , oRequest) {');
  echo('    document.getElementById("coach-search-inprogress").style.display = "inline";'); // Show
  echo('  }');
  echo('  coachAC.dataRequestEvent.subscribe(dataRequestEventHandler);');
    
  // Define dataReturnEvent handler
  echo('  var dataReturnEventHandler = function(oSelf , sQuery , oRequest) {');
  echo('    document.getElementById("coach-search-inprogress").style.display = "none";'); // Hide
  echo('  }');
  echo('  coachAC.dataReturnEvent.subscribe(dataReturnEventHandler);');
  echo('}');
  
  echo('function validateInput() {');
  //echo('  var internalId = document.getElementById("internalid").value;');
  //echo('  if (!internalId) {');
  //echo('    alert("Script error. Job is missing.");');
  //echo('    return false;');
  //echo('  }');
  echo('  var coachId = document.getElementById("custentity_bo_coach").value;');
  echo('  if (!coachId) {');
  echo('    alert("You must select a coach");');
  echo('    return false;');
  echo('  }');
  echo('  return true;');
  echo('}');

  echo('function lockField(fieldName) {');
  echo('  document.getElementById(fieldName).disabled = true;');
  echo('  document.getElementById(fieldName).className = "yui-ac-input locked";');
  echo('  document.getElementById(fieldName + "-lock").style.display = "inline";');
  echo('}');

  echo('function unlockField(fieldName, fieldName2) {');
  echo('  document.getElementById(fieldName).value = "";');
  echo('  if (fieldName2) {');
  echo('    document.getElementById(fieldName2).value = "";');
  echo('  }');
  echo('  document.getElementById(fieldName).disabled = false;');
  echo('  document.getElementById(fieldName).className = "yui-ac-input";');
  echo('  document.getElementById(fieldName + "-lock").style.display = "none";');
  echo('}');
  
  echo('// -->');
  echo('</script>');
}

/**
 * A simple alias to response.writeLine
 *
 * @param {String} string
 */
function echo(string) {
  response.writeLine(string);
}

/**
 * Print coach ranking table
 *
 * @return {Void}
 */
function echoCoachRanking() {
  var rows = nlapiSearchRecord('job', 'customsearch_script_feedback_by_coach');
  
  if (rows) {
    var coaches = new Array();
    var i = 0, n = rows.length;
    
    // Calculate overall rating
    var respondents = 0;
    var positive = 0;
    var sessions = 0;
    for (; i < n; i++) {
      respondents += parseInt(rows[i].getValue('custentity_bo_imrespondents', null, 'sum'));
      positive += parseInt(rows[i].getValue('custentity_bo_imposrespondents', null, 'sum'));
      sessions += parseInt(rows[i].getValue('entityid', null, 'count'));
    }
    var rating = respondents ? positive / respondents : 0;
    var respondentsPerCoach = respondents / rows.length;
    
    echo('<table border="1">');
    echo('  <tr>');
    echo('    <th>Coaches</th><td>' + rows.length + '</td>');
    echo('    <th>Sessions</th><td>' + sessions + '</td>');
    echo('    <th>Respondents</th><td>' + respondents + '</td>');
    echo('    <th>Respondents/Sessions</th><td>' + (respondents / sessions).toFixed(1) + '</td>');
    echo('    <th>Respondents/Coaches</th><td>' + respondentsPerCoach.toFixed(1) + '</td>');
    echo('    <th>Rating</th><td>' + (rating * 100).toFixed(1) + '%</td>');
    echo('  </tr>');
    echo('</table>');
    
    // Build list of coaches
    var i = 0;
    for (; i < n; i++) {
      var coach = new Object();
      coach.id = rows[i].getValue('custentity_bo_coach', null, 'group');
      coach.firstName = rows[i].getValue('firstname', 'custentity_bo_coach', 'max');
      coach.lastName = rows[i].getValue('lastname', 'custentity_bo_coach', 'max');
      coach.fullName = coach.firstName + ' ' + coach.lastName;
      coach.respondents = rows[i].getValue('custentity_bo_imrespondents', null, 'sum');
      coach.positive = rows[i].getValue('custentity_bo_imposrespondents', null, 'sum');
      coach.sessions = rows[i].getValue('entityid', null, 'count');
      coach.rating = coach.respondents ? coach.positive / coach.respondents : 0;
      coach.weightedRating = coach.respondents ? ((respondentsPerCoach * rating) + (coach.respondents * coach.rating)) / (respondentsPerCoach + coach.respondents) : 0;
      coach.availability = 'free';
      coaches.push(coach);
    }
    
    coaches.sort(sortByWeightedRating);
    
    // Rank coaches
    var i = 0, rank = 1, previousRating = 0;
    for (; i < n; i++) {
      if (coaches[i].weightedRating < previousRating) {
        coaches[i].rank = ++rank;
      } else {
        coaches[i].rank = rank;
      }
      previousRating = coaches[i].weightedRating;
    }
    
    echo('<table border="1">');
    echo('  <tr>');
    echo('    <th>Name</th>');
    echo('    <th>Sessions</th>');
    echo('    <th>Respondents</th>');
    echo('    <th>Rating</th>');
    echo('    <th>Rank</th>');
    echo('    <th>Availability</th>');
    echo('  </tr>');
    
    var i = 0, n = coaches.length;
    for (; i < n; i++) {
      echo('  <tr>');
      echo('    <td>' + coaches[i].fullName + '</td>');
      echo('    <td>' + coaches[i].sessions + '</td>');
      echo('    <td>' + coaches[i].respondents + '</td>');
      echo('    <td>' + (coaches[i].rating * 100).toFixed(1) + '%</td>');
      echo('    <td>' + coaches[i].rank + '</td>');
      echo('    <td>' + coaches[i].availability + '</td>');
      echo('  </tr>');
    }
    echo('<table>');
  } else {
    echo('<p>No coaches found.</p>');
  }
}

/**
 * Custom sort function to sort an array of coaches
 * by weighted rating
 *
 * @param {Object} a
 * @param {Object} b
 * @return {Integer}
 */
function sortByWeightedRating(a, b){
  return (b.weightedRating - a.weightedRating)
}
