/**
 * Scheduled Feedback Report
 *
 */

/**
 * Booking feedback statuses
 */
var BOOKING_FEEDBACK_STATUS_UPCOMING = '1';
var BOOKING_FEEDBACK_STATUS_PENDING = '2';
var BOOKING_FEEDBACK_STATUS_OVERDUE = '3';
var BOOKING_FEEDBACK_STATUS_COMPLETED = '4';
var BOOKING_FEEDBACK_STATUS_LASTCALL = '5';
var BOOKING_FEEDBACK_STATUS_CLOSING = '6';

var BOOKING_FEEDBACK_REASON_CODE_UNKNOWN = '4';

/**
 * Main
 */
function main_scheduled() {
  var script = new SweetScriptScheduled();
  script.debug = false;
  script.debugUser = 67028;
  
  // Debug info
  var context = nlapiGetContext();
  nlapiLogExecution('DEBUG', 'Event', 'beforeSubmit');
  nlapiLogExecution('DEBUG', 'Event.Type', type);
  nlapiLogExecution('DEBUG', 'User', context.getUser());
  nlapiLogExecution('DEBUG', 'User.Name', context.getName());
  nlapiLogExecution('DEBUG', 'User.Role', context.getRole());
  nlapiLogExecution('DEBUG', 'Execution Context', context.getExecutionContext());
  nlapiLogExecution('DEBUG', 'Record.ID', nlapiGetRecordId());
  nlapiLogExecution('DEBUG', 'Record.Type', nlapiGetRecordType());
  
  script.beforeRun();
  script.run();
  script.afterRun();
}

/**
 * SweetScriptScheduled Class
 *
 */
var SweetScriptScheduled = function() {
  
  // Set default values
  this.log = new Array();
  this.debug = false;
  this.debugUser = -1;
  this.message = new Array();
  
  this._log = function(message) {
    if (this.debug) {
      this.log.push(message);
      nlapiLogExecution('DEBUG', 'Info', message);
    }
  }
  
  /**
   * Before run hook
   *
   * @return void
   */
  this.beforeRun = function() {
    this._log('Start of script');
  }
  
  /**
   * After run hook
   *
   * @return void
   */
  this.afterRun = function() {
    this._log('End of script');
    if (this.debug) {
      var subject = '[NetSuite] Daily Feedback Report';
      var body = this.log.join('\n');
      this._sendEmail(this.debugUser, subject, body);
    }
  }
  
  /**
   * Run script
   *
   * @return void
   */
  this.run = function() {
    var bookingCounter = 0;
    
    // 1. UPDATE FEEDBACK STATUS
    var updateCompleted = this._updateBookingFeedbackStatus();
    this._log('updateCompleted is: ' + updateCompleted);
    if (updateCompleted == false) {
      return; // Script has been rescheduled
    }
    
    // 2. GET LIST OF BOOKINGS PENDING FEEDBACK
    var searchresults = nlapiSearchRecord('job', 'customsearch_cst_bo_pending_feedback', null);
    
    // 3. BUILD THE STATISTICS 
    var feedbackresults = new Array();
    for (var i = 0; searchresults != null && i < searchresults.length; i++) {
      // get result values
      var searchresult = searchresults[i];
      var feedbackstatusid = searchresult.getValue('custentity_bo_feedbackstatus', null, 'group');
      var feedbackstatus = searchresult.getText('custentity_bo_feedbackstatus', null, 'group');
      var feedbackcount = searchresult.getValue('entityid', null, 'count');
      bookingCounter = bookingCounter + parseFloat(feedbackcount);
      feedbackresults[feedbackstatusid] = feedbackstatus + ': ' + feedbackcount;
    } 
    
    // 4. COMPOSE EMAIL
    this.message.push('<html><body><pre>')
    this.message.push('Dear All,<br />');
    this.message.push('The number of bookings with pending feedback by status is:<br />');
    for (var i = 1; i < feedbackresults.length; i++) {
      if (feedbackresults[i] != null) {
        this.message.push(feedbackresults[i]);
        this._log(feedbackresults[i]);
      }
    }
    this.message.push('Total: ' + bookingCounter);
    this.message.push('<br /><a href="https://system2.netsuite.com/app/common/search/searchresults.nl?searchid=762&whence=">Click here</a> for the more detailed report.<br />');
    this.message.push('<a href="https://system2.netsuite.com/app/common/search/searchresults.nl?searchid=168&whence=">Click here</a> for the full list of bookings pending feedback.<br />');
    this.message.push('Please note that bookings with status "Closing" will be set to "Unable to collect feedback" within 3 days.<br />');
    this.message.push('Best Regards<br />Kata</pre></body></html>');
    
    // 5. SEND EMAIL
    var subject = '[NetSuite] Bookings Pending Feedback';
    var body = this.message.join('<br />');
    
    // Get employees
    var columns = new Array();
    columns.push(new nlobjSearchColumn('internalId'));
    var filters = new Array();
    filters.push(new nlobjSearchFilter('custentity_em_bo_pending_feedback_report', null, 'is', 'T'));
    var employees = nlapiSearchRecord('employee', null, filters, columns);
    
    // Send email
    if (employees) {
      var i = 0, n = employees.length;
      for (; i < n; i++) {
        var employeeId = employees[i].getId();
        this._sendEmail(employeeId, subject, body);
      }
    }
  }
  
  /**
   * Update booking feedback status 
   *
   * @return {Boolean}
   */
  this._updateBookingFeedbackStatus = function() {
    var context = nlapiGetContext();
    var startTime = new Date().getTime();
    var today = new Date();
    
    // Get bookings with feedback status = not completed
    var columns = new Array();
    columns.push(new nlobjSearchColumn('internalId'));
    var filters = new Array();
    filters.push(new nlobjSearchFilter('custentity_bo_feedbackstatus', null, 'noneof', BOOKING_FEEDBACK_STATUS_COMPLETED));
    filters.push(new nlobjSearchFilter('custentity_bo_iscancelled', null, 'is', 'F'));
    filters.push(new nlobjSearchFilter('custentity_bo_optimfeedback', null, 'is', 'T'));
    filters.push(new nlobjSearchFilter('custentity_bo_fbkstatusupdatedate', null, 'notafter', 'daysago1'));
    
    var bookings = nlapiSearchRecord('job', null, filters, columns);
    
    // Do we have any bookings?
    if (bookings) {
      this._log('Found ' + bookings.length + 'bookings');
    } else {
      this._log('Found no bookings');
      return true;
    }
    
    // Yes
    var i = 0, n = bookings.length;
    var updateCounter = 0;
    for (; i < n; i++) {
      
      // Check script usage
      var remainingUsage = context.getRemainingUsage();
      this._log('Remaining usage: ' + remainingUsage);
      var nowTime = new Date().getTime();
      var elapsedTime = ((nowTime - startTime) / 1000); // in seconds
      this._log('Time elapsed: ' + elapsedTime);
      
      // If less than 1000 credits are remaining or more than 6 minutes
      if (remainingUsage < 1000 || elapsedTime > 360) { 
        var status = nlapiScheduleScript(context.getScriptId(), context.getDeploymentId());
        this._log('Reschedule script : ' + status);
        return false;
      }
      
      // Update feedback status 
      try {
        var bookingId = bookings[i].getId();
        var booking = nlapiLoadRecord('job', bookingId);
        var bookingCode = booking.getFieldValue('entityid');
        var feedbackStatus = null;
        var reasonCode = null;
        var unableToCollectFeedback = 'F';
        var actualEndDate = nlapiStringToDate(booking.getFieldValue('enddate'));
        
        // Overdue - 14 days
        // Actual End Date = is on or before 14 days ago
        if (actualEndDate <= nlapiAddDays(today, -14)) {
          feedbackStatus = BOOKING_FEEDBACK_STATUS_OVERDUE;
        }
        
        // Last call - 90 days
        if (actualEndDate <= nlapiAddDays(today, -90)) {
          feedbackStatus = BOOKING_FEEDBACK_STATUS_LASTCALL;
        }
        
        // Closing - 102 days
        if (actualEndDate <= nlapiAddDays(today, -102)) {
          feedbackStatus = BOOKING_FEEDBACK_STATUS_CLOSING;
        }
        
        // Pending
        // Actual End Date = is after 14 days ago AND
        // Actual End Date = is before today
        if ((actualEndDate > nlapiAddDays(today, -14)) &&
           (actualEndDate < today)) {
          feedbackStatus = BOOKING_FEEDBACK_STATUS_PENDING;
        }
        
        // Upcoming
        // Actual End Date = is on or after today
        if (actualEndDate >= today) {
          feedbackStatus = BOOKING_FEEDBACK_STATUS_UPCOMING;
        }
        
        // // Completed
        // if ((booking.getFieldValue('custentity_bo_isimfeedbackcollected') == 'T') ||
           // (booking.getFieldValue('custentity_bo_unabletocollectfbk') == 'T')) {
          // feedbackStatus = BOOKING_FEEDBACK_STATUS_COMPLETED;
        // }
        
        // Completed collected
        if ((booking.getFieldValue('custentity_bo_isimfeedbackcollected') == 'T')) {
          feedbackStatus = BOOKING_FEEDBACK_STATUS_COMPLETED;
        }
        
        // Completed too old
        if (actualEndDate <= nlapiAddDays(today, -105)) {
          feedbackStatus = BOOKING_FEEDBACK_STATUS_COMPLETED;
          reasonCode = BOOKING_FEEDBACK_REASON_CODE_UNKNOWN;
          unableToCollectFeedback = 'T';
        }        
        
        booking.setFieldValue('custentity_bo_feedbackstatus', feedbackStatus);
        booking.setFieldValue('custentity_bo_fbkstatusupdatedate', nlapiDateToString(today));
        if (unableToCollectFeedback) {
          booking.setFieldValue('custentity_bo_unabletocollectfbk', unableToCollectFeedback);
          booking.setFieldValue('custentity_bo_nofbkreasoncode', reasonCode);
        }
        nlapiSubmitRecord(booking);
        updateCounter = updateCounter + 1;
        
        this._log('Updated feedback status to ' + feedbackStatus + ' (booking: ' + bookingCode + ')');
      } catch (e) {
        this._log('Failed to update feedback ' + feedbackStatus + '(booking: ' + bookingCode + ')');
      }
    }
    
    this._log('Updated ' + updateCounter + 'records.');
    return true;
  }
  
  /**
   * Send email
   *
   * @param {String} employeeId
   * @param {String} subject
   * @param {String} body
   */
  this._sendEmail = function(employeeId, subject, body) {
    
    if (this.debug) {
      employeeId = this.debugUser;
    }
    
    nlapiSendEmail(employeeId, employeeId, subject, body);
  }
}
