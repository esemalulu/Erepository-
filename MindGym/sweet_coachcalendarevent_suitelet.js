/* Main function
*****************************************************************************/

/**
 * Coach calendar view entry page
 *
 * @return void
 *
 */
function coachCalendarEvent(request, response) {

  nlapiLogExecution('DEBUG', 'Begin', 'coachCalendarEvent');

  // Get the entryId
  var entryId = request.getParameter('entryid');
  var coachId = request.getParameter('coachid');
  var month = request.getParameter('month');
  var year = request.getParameter('year');

  // Make sure we have an entry Id
  if ((entryId == null) || (entryId.length == 0)) {
    nlapiLogExecution('DEBUG', 'Missing calendar entry Id');
    response.writeLine('Error: Missing calendar entry Id');
    return false;
  }

  // Make sure we have a coach Id
  if ((coachId == null) || (coachId.length == 0)) {
    nlapiLogExecution('DEBUG', 'Missing coach Id');
    response.writeLine('Error: Missing coach Id');
    return false;
  }

  // Get the calendar entry
  entryInfo = new calendarEntry(entryId);

  var backToCalendarUrl = getBackToCalendarLinkUrl(coachId, month, year);

  /*** Display the page ***/

  echoHeader('My booking');

  echo('<p><a href="' + backToCalendarUrl + '">&lt; Back to your calendar</a></p>');

  echoEntry(entryInfo);

  echo('<p><a href="' + backToCalendarUrl + '">&lt; Back to your calendar</a></p>');

  echoFooter();


}

/* Object definitions
*****************************************************************************/

function calendarEntry(entryId) {

  if (entryId == null) {
      return false;
  }

  try {

    // Load the email campaign
    var calendarEntryRecord = nlapiLoadRecord('customrecord_calendarentry', entryId);

  } catch (e) {

  }

  this.title = calendarEntryRecord.getFieldValue('custrecord_calentry_title');
  this.content = calendarEntryRecord.getFieldValue('custrecord_calentry_content');

  // Set the location and create a basic Google maps link
  this.location = calendarEntryRecord.getFieldValue('custrecord_calentry_location');

  if (this.location != null) {
    this.googleMapLink = 'http://maps.google.com/maps?f=q&hl=en&geocode=&q=' + this.location.replace(' ' ,'+');
  } else {
    this.googleMapLink = null;
  }

  this.startDate = nlapiStringToDate(calendarEntryRecord.getFieldValue('custrecord_calentry_startdate'));
  this.startTime = calendarEntryRecord.getFieldValue('custrecord_calentry_starttime');
  this.endDate = nlapiStringToDate(calendarEntryRecord.getFieldValue('custrecord_calentry_enddate'));
  this.endTime = calendarEntryRecord.getFieldValue('custrecord_calentry_endtime');

  this.timezone = nlapiLookupField('customrecord_timezone', calendarEntryRecord.getFieldValue('custrecord_calentry_timezone'), 'custrecord_tz_timezone')
  this.status = nlapiLookupField('customlist_calentry_status', calendarEntryRecord.getFieldValue('custrecord_calentry_status'), 'name');
}

/* Helper functions
*****************************************************************************/

/**
 * A simple alias to response.writeLine
 *
 */
function echo(string) {
  response.writeLine(string);
}

function getBackToCalendarLinkUrl(coachId, month, year) {

  // Resolve the link to the Coach Calendar suitelet
  var scriptUrl = nlapiResolveURL('SUITELET', 'customscript_coachcalendar_suitelet', 1, true);

  // Add on the additional params
  var url = scriptUrl + '&coachid=' + coachId + '&month=' + month + '&year=' + year;

  return url;
}

/* Layout functions
*****************************************************************************/

/**
 * Outputs the html header
 *
 */
function echoHeader(title) {

    echo('<html><head>');
    echo('<title>The Mind Gym - Coach Calendar</title>');
    echo('<link rel="stylesheet" type="text/css" media="screen" href="http://www.themindgym.com/css/themindgym.css" />');
    echo('<link rel="stylesheet" type="text/css" media="screen" href="https://netsuite.themindgym.com/css/calendar.css" />');
    echo('</head>');

    echo('<body><div id="container">');
    echo('<div id="header"><div id="logo"><a title="The Mind Gym" href="/">The Mind Gym</a></div></div>');
    echo('<div id="frame-top"></div>');
    echo('<div id="content"><div id="without-promo-panel"><div id="main">');
    echo('<h1><span>' + title + '</span></h1>');
}

/**
 * Show the calendar entry info
 *
 */
function echoEntry(entryInfo) {

  echo('<table id="calendar-entry" cellpadding="0" cellspacing="0" border="0">');
  echo('<tr>');
  echo('<th>Title</th>');
  echo('<td>' + entryInfo.title + '</td>');
  echo('</tr>');
  echo('<tr>');
  echo('<th>Status</th>');
  echo('<td>' + entryInfo.status + '</td>');
  echo('</tr>');
  echo('<tr>');
  echo('<th>Date</th>');
  echo('<td>' + entryInfo.startDate.format("fullDate") + '</td>');
  echo('</tr>');
  echo('<tr>');
  echo('<th>Time</th>');
  echo('<td>' + entryInfo.startTime + ' - ' + entryInfo.endTime + '</td>');
  echo('</tr>');
  echo('<tr>');
  echo('<th>Timezone</th>');
  echo('<td>' + entryInfo.timezone + '</td>');
  echo('</tr>');
  echo('<tr>');
  echo('<th>Location</th>');
  echo('<td>' + entryInfo.location + '</td>');
  echo('</tr>');

  // Display the content block
  echo(entryInfo.content);

  echo('</table>');

}

/**
 * Outputs the html footer
 *
 */
function echoFooter() {

    echo('</div></div></div>');
    echo('<div id="frame-bottom"></div></div>');
    echo('</body></html>');
}
