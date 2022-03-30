
/**
 * Send feedback notifications (and create tasks)
 *
 */

/**
 * SweetScriptScheduled Class
 *
 */
var SweetScriptScheduled = function() {
  
  /**
   * Run script
   *
   * @return {Void}
   */
  this.run = function() {
    this._findBookings();
  }
  
  /**
   * Find bookings pending feedback notifications
   *
   * @return {Void}
   */
  this._findBookings = function() {
    nlapiLogExecution('DEBUG', 'Info', '_findBookings');
    
    var filters = new Array();
    filters.push(new nlobjSearchFilter('enddate', null, 'onorafter', nlapiDateToString(new Date('2010/01/01'))));
    filters.push(new nlobjSearchFilter('custentity_bo_optimfeedback', null, 'is', 'T'));
    filters.push(new nlobjSearchFilter('custentity_bo_isimfeedbackcollected', null, 'is', 'T'));
    filters.push(new nlobjSearchFilter('custentity_bo_isfeedbacknotificationsent', null, 'is', 'F'));
    var bookings = nlapiSearchRecord('job', null, filters, null);
    
    if (bookings) {
      var i = 0, n = bookings.length;
      for (; i < n; i++) {
        var bookingId = bookings[i].getId();
        nlapiLogExecution('DEBUG', 'Info', 'Booking (' + bookingId + ')');
        this._createFeedbackTask(bookingId);
        
        // Update booking that notification has been sent
        nlapiSubmitField('job', bookingId, 'custentity_bo_isfeedbacknotificationsent', 'T');
      }
    }
  }
  
  /**
   * Create a task for the booking owner to send feedback to client.
   *
   * @param bookingId
   */
  this._createFeedbackTask = function(bookingId) {
    nlapiLogExecution('DEBUG', 'Info', 'Create task (' + bookingId + ')');
    
    // Get fields
    var fieldNames = new Array();
    fieldNames.push('custentity_bo_owner');
    fieldNames.push('custentity_bo_buyer');
    fieldNames.push('customer');
    
    try {
      var fields = nlapiLookupField('job', bookingId, fieldNames);
    } catch (e) {
      nlapiLogExecution('DEBUG', 'Error', 'Failed to load booking record fields (' + bookingId + ')');
      return;
    }
    
    var ownerId = fields['custentity_bo_owner'];
    var buyerId = fields['custentity_bo_buyer'];
    var clientId = fields['customer'];
    
    // Do we got an owner?
    if (ownerId) {
      
      try {
        var buyer = nlapiLoadRecord('contact', buyerId);
      } catch (e) {
        nlapiLogExecution('DEBUG', 'Error', 'Failed to load buyer record (' + buyerId + ')');
        return;
      }
      
      var buyerName = buyer.getFieldValue('firstname') + ' ' + buyer.getFieldValue('lastname');
      
      try {
        var client = nlapiLoadRecord('customer', clientId);
      } catch (e) {
        nlapiLogExecution('DEBUG', 'Error', 'Failed to load client record (' + clientId + ')');
        return;
      }
      
      var clientName = client.getFieldValue('companyname');
      var today = new Date();
      var startDate = nlapiDateToString(today);
      var dueDate = nlapiDateToString(nlapiAddDays(today, 1));
      
      // Create a task
      var title = 'Send feedback report to client';
      var task = nlapiCreateRecord('task');
      task.setFieldValue('title', title);
      task.setFieldValue('assigned', ownerId);
      task.setFieldValue('company', bookingId);
      task.setFieldValue('startdate', startDate);
      task.setFieldValue('duedate', dueDate);
      task.setFieldValue('sendemail', 'F');
      
      try {
        var taskId = nlapiSubmitRecord(task, true);
      } catch (e) {
        nlapiLogExecution('DEBUG', 'Error', 'Failed to create task for booking (' + bookingId + ')');
        return;
      }
      
      // Send email notification to owner
      var emailSubject = 'New feedback is available for ' + buyerName + ' at ' + clientName;
      var emailMessage =
        'A task has been assigned to you.\n\n' +
        'To view the task record, log into NetSuite then navigate to:\n' +
        'https://system2.netsuite.com/app/crm/calendar/task.nl?id=' + taskId + '\n\n' +
        'To view the booking related to this task, navigate to:\n' +
        'https://system2.netsuite.com/app/common/entity/custjob.nl?id=' + bookingId;
      
      nlapiSendEmail(-5, ownerId, emailSubject, emailMessage);
    }
  }
}

/**
 * Main
 *
 * @return {Void}
 */
function sweet_scheduled() {
  var script = new SweetScriptScheduled();
  script.run();
}

