/* Main function
*****************************************************************************/

/**
 * Coach calendar suitelet
 *
 * @param Object request
 * @param Object response
 */
function coachCalendar(request, response) {

  nlapiLogExecution('DEBUG', 'Start', 'coachCalendar');

  // Create a global request object
  nsRequest = request;

  // Get the coach hash from the URL
  var coachCortexID = request.getParameter('cortexid');
  var coachID = null;

  if ((request.getParameter('coachid') != null) && (request.getParameter('coachid').length > 0)) {

    coachID = request.getParameter('coachid');

  } else if ((coachCortexID == null) || (coachCortexID.length == 0)) {

    nlapiLogExecution('ERROR', 'Missing coach Id');
    response.writeLine('Error: Missing coach Id');
    return false;

  } else {

    // Get the Netsuite coach Id from the Neocortex coach Id
    var coachID = getCoachIDFromCortexID(coachCortexID);
  }

  if ((coachID == null) || (coachID.length == 0)) {
    nlapiLogExecution('ERROR', 'Missing coach Id');
    response.writeLine('Error: Missing coach Id');
    return false;
  }

  // Check if we have a month specified
  if ((request.getParameter('month') != null) && (request.getParameter('month').length > 0)) {
    var month = parseInt(request.getParameter('month'));
  } else {
    var currentDate = new Date();
    var month = parseInt(currentDate.format('m'));
  }

  // Check if we have a year specified
  if ((request.getParameter('year') != null) && (request.getParameter('year').length > 0)) {
    var year = parseInt(request.getParameter('year'));
  } else {
    var currentDate = new Date();
    var year = parseInt(currentDate.format('yyyy'));
  }

  nlapiLogExecution('DEBUG', 'Using date', month + '/' + year);

  // Check if we need to mark any dates as busy
  if ((request.getParameter('busyaction') != null) && (request.getParameter('busyaction').length > 0)) {

    var date = request.getParameter('actiondate');

    nlapiLogExecution('DEBUG', 'Mark date as ' + request.getParameter('busyaction'), request.getParameter('actiondate'));

    if ((date != null) && (date.length > 0)) {

      var action = request.getParameter('busyaction');

      switch (action.toLowerCase()) {

        case 'available':
          setcoachCalendarDayAvailable(coachID, date);
          break;

        case 'busy':
          setcoachCalendarDayBusy(coachID, date);
          break;
      }

    }

  }

  // Create a new coach calendar object
  nlapiLogExecution('DEBUG', 'Creating coach calendar', 'Coach ' + coachID + ' Date ' + month + '/' + year);
  myCoachCalendar = new coachCalendarMonth(coachID, month, year);

  nlapiLogExecution('DEBUG', 'Displaying calendar');

  // Display the header
  echoHeader();

  // Display the calendar intro and date navigation
  echoIntro();

  // Display the actual calendar
  echoCalendar(myCoachCalendar);

  // Footer
  echoFooter();

}

/*
*
*
*/
function getCoachIDFromCortexID(cortexID) {

  var coachID = null;
  var coachRecord = new Array();

  var columns = new Array();
  columns[0] = new nlobjSearchColumn('internalid');

  var filters = new Array();
  filters[0] = new nlobjSearchFilter('custentity_cortex_id', null, 'equalto', cortexID);

  coachRecord = nlapiSearchRecord('vendor', null, filters, columns);

  if (coachRecord != null) {

    // Get first coach Id
    coachID = coachRecord[0].getValue('internalid');

  }

  return coachID;
}

/* Object definitions
*****************************************************************************/

/**
 * A coach calendar month object
 *
 * @param string coachID
 * @param string month
 * @param string year
 * @return none
 */
function coachCalendarMonth(coachID, month, year) {

  this.coachID = coachID;

  this.day = new Array();
  this.month = month;
  this.year = year;

  // The start date of the calendar
  var dateString = 1 + '/' + month + '/' + year;

  // Calculate the start date of the month
  this.startDate = nlapiStringToDate(dateString);
  nlapiLogExecution('DEBUG', 'Start date', this.startDate);

  // Calculate the end date of the month, get the next month and subtract 1 day
  this.endDate = nlapiAddDays(nlapiAddMonths(nlapiStringToDate(dateString), 1), -1);
  nlapiLogExecution('DEBUG', 'End date', this.endDate);

  this.prevMonth = (nlapiAddMonths(nlapiStringToDate(dateString), -1).getMonth() + 1);
  this.nextMonth = (nlapiAddMonths(nlapiStringToDate(dateString), 1).getMonth() + 1);

  this.prevYear = this.year - 1;
  this.nextYear = this.year + 1;

  // Set the length of the current month
  var monthLength = this.endDate.getDate();

  // Get details of the coach
  var coachfields = ['firstname', 'lastname'];
  var coachRecord = nlapiLookupField('vendor', coachID, coachfields);
  this.coachName = coachRecord['firstname'] + ' ' + coachRecord['lastname'];

  // Get the coach's busy day for the current month
  var busyDays = getCoachBusyDays(this.coachID, this.startDate, this.endDate);

  for (var i = 1; i <= monthLength; i++) {

    var newCoachCalendarDay = new coachCalendarDay(i, this.month, this.year);

    // Set the coach Id in the object
    newCoachCalendarDay.coachID =  this.coachID;

    // Check if this day is marked as busy
    if ((busyDays[i] != null) && (busyDays[i] == 1)) {
      newCoachCalendarDay.is_busy = true;
    }

    // Store the new day in the object
    this.day[i] = newCoachCalendarDay;
  }

  function getCoachBusyDays(coachID, startDate, endDate) {

    var busyDays = new Array();

    echoComment('Searching for busy days for coach ' + coachID + ' between ' + nlapiDateToString(startDate) + ' AND ' + nlapiDateToString(endDate) + '<br />');

    // Get all a coachs busy days in a set interval
    var filters = new Array();
    filters[0] = new nlobjSearchFilter('custrecord_calentry_category', null, 'is', 2);
    filters[1] = new nlobjSearchFilter('custrecord_calentry_startdate', null, 'onorafter', nlapiDateToString(startDate));
    filters[2] = new nlobjSearchFilter('custrecord_calentry_enddate', null, 'onorbefore', nlapiDateToString(endDate));
    filters[3] = new nlobjSearchFilter('custrecord_calentry_coach', null, 'is', coachID);

    var columns = new Array();
    columns[0] = new nlobjSearchColumn('custrecord_calentry_startdate');

    // Get all the coaches busy
    busyDaysResults = nlapiSearchRecord('customrecord_calendarentry', null, filters, columns);

    // Build an array of the busy days
    for (var i = 0; (busyDaysResults != null) && (i < busyDaysResults.length); i++) {

      var busyDate = nlapiStringToDate(busyDaysResults[i].getValue('custrecord_calentry_startdate'));
      busyDays[busyDate.getDate()] = 1;

    }

    return busyDays;
  }

}

/**
 * A coach calendar day object
 *
 * @param string day
 * @param string month
 * @param string year
 * @return none
 */
function coachCalendarDay(day, month, year) {

  this.coachID;

  this.day = day;
  this.month = month;
  this.year = year;
  this.date = nlapiStringToDate(day+'/'+month+'/'+year);

  this.is_busy = false;

  // Define object method to get all events on this day
  this.getEvents = getEvents;

  function getEvents() {

    echoComment('Finding events on ' + this.date.format('d/m/yyyy') + ' for coach ' + this.coachID);

    var events = new Array();

    var filters = new Array();
    filters[0] = new nlobjSearchFilter('custrecord_calentry_category', null, 'is', 1);
    filters[1] = new nlobjSearchFilter('custrecord_calentry_startdate', null, 'on', this.date.format('d/m/yyyy'));
    filters[2] = new nlobjSearchFilter('custrecord_calentry_coach', null, 'is', this.coachID);

    var columns = new Array();
    columns[0] = new nlobjSearchColumn('custrecord_calentry_title');
    columns[1] = new nlobjSearchColumn('custrecord_calentry_content');
    columns[2] = new nlobjSearchColumn('custrecord_calentry_location');
    columns[3] = new nlobjSearchColumn('custrecord_calentry_startdate');
    columns[4] = new nlobjSearchColumn('custrecord_calentry_starttime');
    columns[5] = new nlobjSearchColumn('custrecord_calentry_enddate');
    columns[6] = new nlobjSearchColumn('custrecord_calentry_endtime');
    columns[7] = new nlobjSearchColumn('custrecord_calentry_timezone');
    columns[8] = new nlobjSearchColumn('custrecord_calentry_status');

    // Search for all the coaches calendar bookings
    events = nlapiSearchRecord('customrecord_calendarentry', null, filters, columns);

    return events;

  }

}

/*
* Mark a calendar day as busy for a particular coach
*
* @param integer coachID
* @param integer calendarDay
* @return integer
*/
function setcoachCalendarDayBusy(coachID, calendarDay) {

  echoComment('Creating new busy day on  : ' + calendarDay);

  var busyDate = nlapiStringToDate(calendarDay);

  // Create a new email campaign
  var newCalendarEntry = nlapiCreateRecord('customrecord_calendarentry');

  newCalendarEntry.setFieldValue('custrecord_calentry_category', 2);
  newCalendarEntry.setFieldValue('custrecord_calentry_status', 2);
  newCalendarEntry.setFieldValue('custrecord_calentry_coach', coachID);

  newCalendarEntry.setFieldValue('custrecord_calentry_startdate', nlapiDateToString(busyDate));
  newCalendarEntry.setFieldValue('custrecord_calentry_starttime', '12:00 am');
  newCalendarEntry.setFieldValue('custrecord_calentry_enddate', nlapiDateToString(busyDate));
  newCalendarEntry.setFieldValue('custrecord_calentry_endtime', '11:59 pm');

  newCalendarEntry.setFieldValue('custrecord_calentry_contenttype', 1);
  newCalendarEntry.setFieldValue('custrecord_calentry_timezone', 207);

  echoComment('Creating new busy day ' + nlapiDateToString(busyDate) + ' for coach ' + coachID);

  // Save the new calendar entry
  newCalendarEntryId = nlapiSubmitRecord(newCalendarEntry, true); // Doesnt work

  echoComment('New busy day ID ' + newCalendarEntryId);

  return newCalendarEntryId;
}

/*
* Delete coach availability calendar entries for a particular day
*
* @param integer coachID
* @param integer calendarDay
* @return boolean
*/
function setcoachCalendarDayAvailable(coachID, calendarDay) {

  echoComment('Remove busy day ' + calendarDay + ' from coach ' + coachID);

  var busyDate = nlapiStringToDate(calendarDay);

  var filters = new Array();
  filters[0] = new nlobjSearchFilter('custrecord_calentry_category', null, 'is', 2);
  filters[1] = new nlobjSearchFilter('custrecord_calentry_startdate', null, 'on', nlapiDateToString(busyDate));
  filters[2] = new nlobjSearchFilter('custrecord_calentry_enddate', null, 'on', nlapiDateToString(busyDate));
  filters[2] = new nlobjSearchFilter('custrecord_calentry_coach', null, 'is', coachID);

  var columns = new Array();
  columns[0] = new nlobjSearchColumn('custrecord_calentry_title');
  columns[1] = new nlobjSearchColumn('custrecord_calentry_content');
  columns[2] = new nlobjSearchColumn('custrecord_calentry_location');
  columns[3] = new nlobjSearchColumn('custrecord_calentry_startdate');
  columns[4] = new nlobjSearchColumn('custrecord_calentry_starttime');
  columns[5] = new nlobjSearchColumn('custrecord_calentry_enddate');
  columns[6] = new nlobjSearchColumn('custrecord_calentry_endtime');
  columns[7] = new nlobjSearchColumn('custrecord_calentry_timezone');
  columns[8] = new nlobjSearchColumn('custrecord_calentry_status');

  // Search for all the coaches calendar bookings
  var busyDays = nlapiSearchRecord('customrecord_calendarentry', null, filters, columns);

  if (busyDays != null) {

    echoComment('Found ' + busyDays.length + ' busy days');

    for (var i = 0; (busyDays != null) && (i < busyDays.length); i++) {

      if (busyDays[i].getId().length > 0) {

        echoComment('Deleting busy day ' + busyDays[i].getId());

        nlapiDeleteRecord('customrecord_calendarentry', busyDays[i].getId());

      }

    }

  }

  return true;
}

/* Layout functions
*****************************************************************************/

/**
 * Outputs the html header
 *
 */
function echoHeader() {

    echo('<html><head>');
    echo('<title>The Mind Gym - Coach Calendar</title>');
    echo('<link rel="stylesheet" type="text/css" media="screen" href="https://netsuite.themindgym.com/css/themindgym.css" />');
    echo('<link rel="stylesheet" type="text/css" media="screen" href="https://netsuite.themindgym.com/css/calendar.css" />');
    echo('</head>');

    echo('<body><div id="container">');
    echo('<div id="header"><div id="logo"><a title="The Mind Gym" href="/">The Mind Gym</a></div></div>');
    echo('<div id="frame-top"></div>');
    echo('<div id="content"><div id="without-promo-panel"><div id="main">');
    echo('<h1><span>' + myCoachCalendar.coachName + '\'s calendar</span></h1>');
}

/**
 * Outputs the html header
 *
 */
function echoIntro() {

  echo('<div id="logout-link"><a href="http://b2b-russell.dev.themindgym.com/index.php?pageID=197">[Back to My log book]</a></div>')

  // Year navigation
  var prevYearAdditionalParams = new Object();
  prevYearAdditionalParams.month = myCoachCalendar.month;
  prevYearAdditionalParams.year = myCoachCalendar.prevYear;
  var nextYearAdditionalParams = new Object();
  nextYearAdditionalParams.month = myCoachCalendar.month;
  nextYearAdditionalParams.year = myCoachCalendar.nextYear;

  echo('<div id="year-navigation">');
  echo('<a href="' + buildScriptUrl(prevYearAdditionalParams) + '">&lt; ' + myCoachCalendar.prevYear + '</a>');
  echo(' : ');
  echo('<a href="' + buildScriptUrl(nextYearAdditionalParams) + '">' + myCoachCalendar.nextYear + ' &gt;</a>');
  echo('</div>');

  // Month navigation
  var prevMonthAdditionalParams = new Object();
  prevMonthAdditionalParams.month = myCoachCalendar.prevMonth;
  prevMonthAdditionalParams.year = myCoachCalendar.year;
  var nextMonthAdditionalParams = new Object();
  nextMonthAdditionalParams.month = myCoachCalendar.nextMonth;
  nextMonthAdditionalParams.year = myCoachCalendar.year;

  echo('<div id="month-navigation">');
  echo('<a href="' + buildScriptUrl(prevMonthAdditionalParams) + '">&lt; Previous month</a>');
  echo(' : ');
  echo('<a href="' + buildScriptUrl(nextMonthAdditionalParams) + '">Next month &gt;</a>');
  echo('</div>');

  echo('<h2 id="calendar-date">' + myCoachCalendar.startDate.format('mmmm') + ' ' + myCoachCalendar.startDate.format('yyyy') + '</h2>');

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

/*
* Show the calendar
*
* @param Object calendar
*/
function echoCalendar(calendar) {

  echo('<table id="coach-calendar"><tr>');

  for (var i = 1; (calendar.day.length != null) && (i < calendar.day.length); i++) {

    echo('<td>');
    echoDay(calendar.day[i]);
    echo('</td>');

    if ((i % 4) == 0) {
      echo('</tr><tr>');
    }

  }

  echo('</tr></table>');

}


/**
 * Outputs the html footer
 *
 */
function echoDay(coachCalendarDay) {

  if (coachCalendarDay == null) {
    return false;
  }

  echo('<h3>' + coachCalendarDay.date.format('dddd d') + '</h3>');

  if (coachCalendarDay.is_busy) {

    var additionalParams = new Object();
    additionalParams.busyaction = 'available';
    additionalParams.actiondate = coachCalendarDay.date.format('d/m/yyyy');

    echo('<div class="mark-free">');
    echo('<a href="' + buildScriptUrl(additionalParams) + '" title="Mark me as available today">');
    echo('<img src="https://netsuite.themindgym.com/nav/mark_free.jpg" alt="busy today" border="0" />');
    echo('</a>');
    echo('</div>');

  } else {

    var additionalParams = new Object();
    additionalParams.busyaction = 'busy';
    additionalParams.actiondate = coachCalendarDay.date.format('d/m/yyyy');

    echo('<div class="mark-free">');
    echo('<a href="' + buildScriptUrl(additionalParams) + '" title="Mark me as busy today">');
    echo('<img src="https://netsuite.themindgym.com/nav/mark_busy.jpg" alt="available today" border="0" />');
    echo('</a>');
    echo('</div>');

  }

  // Get the events for the day
  var dailyCoachEvents = coachCalendarDay.getEvents();

  if (dailyCoachEvents != null) {

    // Resolve the link to the calendar entry detail page
    var calendarEventUrl = nlapiResolveURL('SUITELET', 'customscript_coachcalendarevent_suitelet', 1, true);

    echo('<ul>');

    for (var i = 0; (dailyCoachEvents != null) && (i < dailyCoachEvents.length); i++) {

      var event = dailyCoachEvents[i];

      // Add on the additional params
      var eventUrl = calendarEventUrl + '&entryid=' + event.getId() + '&coachid=' + myCoachCalendar.coachID + '&month=' + myCoachCalendar.month + '&year=' + myCoachCalendar.year;

      echo('<li>');
      echo('<a href="' + eventUrl + '" title="Click to view booking details">');
      echo(event.getValue('custrecord_calentry_starttime') + ' - ' + event.getValue('custrecord_calentry_endtime'));
      echo('</a>');
      echo('</li>');

    }

    echo('</ul>');

  }

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

/**
 * Echo a HTML comment
 *
 */
function echoComment(string) {
  response.writeLine('<!-- '+string+' -->');
}

/**
 * Build a URL point back to the current script
 *
 * @param object additionalParams
 * @return string
 */
function buildScriptUrl(additionalParams) {

  // Get an array of the existing URL params
  var existingParams = nsRequest.getAllParameters();
  var newParams = new Array();
  var urlParams = '';

  // Define the required params
  var requiredParams = new Object();
  requiredParams.h = true;
  requiredParams.deploy = true;
  requiredParams.script = true;
  requiredParams.compid = true;
  requiredParams.month = true;
  requiredParams.year = true;
  requiredParams.coachid = true;
  requiredParams.cortexid = true;

  // Strip any fields we dont want out of the existing params
  for (param in existingParams) {
    if (requiredParams[param] == true) {
      newParams[param] = existingParams[param];
    }
  }

  // Add or update any additional params into the new params
  for (param in additionalParams) {
    newParams[param] = additionalParams[param];
  }

  // Build the URL from the new params
  for (param in newParams) {

    if (urlParams.length > 0) {
      urlParams += '&';
    }

    urlParams += (param + '=' + escape(newParams[param]));
  }

  // Append the params onto the full script url
  var completeUrl = nsRequest.getURL() + '?' + urlParams;

  return completeUrl;
}