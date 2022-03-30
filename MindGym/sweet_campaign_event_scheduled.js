/**
 * Campaign Event
 *
 */

/**
* Main
*/
function main_scheduled() {
 var script = new SweetScriptScheduled();
 script.debug = true;
 script.employeeId = '2'; // Andre Borgstrom
 script.run();
}

/**
 * SweetScriptScheduled Class
 *
 */
var SweetScriptScheduled = function() {
  this.log = new Array();
  this.debug = false;
  this.reschedule = false;
  this.employeeId = -1;
  this.action = undefined;
  
  this._log = function(message) {
    this.log.push(message);
    nlapiLogExecution('DEBUG', 'Info', message);
  }
  
  /**
   * Exit hook
   *
   * @return void
   */
  this._exit = function() {
    this._log('End of script');
    if (this.debug) {
      var subject = '[NetSuite] Campaign Event';
      var body = this.log.join('\n');
      this._sendEmail(subject, body);
    }
  }

  /**
   * Run script
   *
   * @return void
   */
  this.run = function() {
    this._log('Start of script');
 
    // Get action
    var context = nlapiGetContext();
    var action = context.getSetting('SCRIPT', 'custscript_cer_action');
    this._log(action);
  
    if (!action) {
      this._log('Action is required.');
      this._exit();
      return;  
    }
    
    // Handle action
    switch (action) {
      case 'create':
        this._create();
        break;
      case 'delete':
        this._delete();
        break;
      default:
        this._log('Unknown action (' + action + ')');
        this._exit();
        return;
    }
  }

  /**
   * Create action 
   *
   * Create campaign event responses for each contact that is associated
   * with this campaign event.
   *
   * @return void
   */
  this._create = function() {
    var context = nlapiGetContext();
    var startTime = new Date().getTime();
  
    // Get campaign event
    var campaignEventId = context.getSetting('SCRIPT', 'custscript_campaign_event_id');
    if (!campaignEventId) {
      this._log('Campaign event id is required.');
      this._exit();
      return;  
    }
  
    var campaignEvent = nlapiLoadRecord('customrecord_campaign_event', campaignEventId);
  
    // Get saved search
    var savedSearchId = context.getSetting('SCRIPT', 'custscript_saved_search_id');
    if (!savedSearchId) {
      this._log('Saved search id is required.');
      this._exit();
      return;
    }
  
    // Get contacts
    var columns = new Array();
    columns.push(new nlobjSearchColumn('internalId'));
    var contacts = nlapiSearchRecord('contact', savedSearchId, null, columns);
    
    // Do we have any contacts?
    var n = contacts.length;
    if (n) {
      this._log('Found contact to add to campaign event');
    } else {
      this._log('Found no contacts');
      this._exit(); // No, let's exit
      return;
    }
    
    // Yes
    var i = 0;
    for (; i < n; i++) {
     
      // Check script usage
      var remainingUsage = context.getRemainingUsage();
      this._log('Remaining usage: ' + remainingUsage);
      var nowTime = new Date().getTime();
      var elapsedTime = ((nowTime - startTime) / 1000); // in seconds
      this._log('Time elapsed: ' + elapsedTime);
      
      // If less than 1000 credits are remaining or more than 6 minutes
      if (remainingUsage < 1000 || elapsedTime > 360) { 
        this.reschedule = true;
        var status = nlapiScheduleScript(context.getScriptId(), context.getDeploymentId());
        this._log('Reschedule script : ' + status);
        this._exit();
        return;
      }
      
      // Create campaign event response  
      try {
        var contactId = contacts[i].getId();
        var record = nlapiCreateRecord('customrecord_campaign_event_response');  
        
        record.setFieldValue('custrecord_cer_campaign', campaignEvent.getFieldValue('custrecord_ce_campaign'));
        record.setFieldValue('custrecord_cer_campaign_event', campaignEvent.getId());
        record.setFieldValue('custrecord_cer_contact', contactId);
        record.setFieldValue('custrecord_cer_status', 1);  

        var cerId = nlapiSubmitRecord(record, true);      

        this._log('Created Campaign event response: ' + cerId);
      } catch (e) {
        this._log('Failed to create Campaign event response: ' + cerId);
      }
    }
    
    this._exit();
  }
  
  /**
   * Delete action
   *
   * Delete campaign event responses for campaign event.
   *
   * @return void
   */
  this._delete = function() {
    var context = nlapiGetContext();
    var startTime = new Date().getTime();
    
    // Get campaign event
    var campaignEventId = context.getSetting('SCRIPT', 'custscript_campaign_event_id');
    if (!campaignEventId) {
      this._log('Campaign event id is required.');
      this._exit();
      return;
    }
    
    // Create the filter
    var filter = new Array();
    filter.push(new nlobjSearchFilter('custrecord_cer_campaign_event', null, 'is', campaignEventId));
    this._log(campaignEventId);
    
    // Run the search query
    var columns = new Array();
    columns.push(new nlobjSearchColumn('internalId'));
    var cers = nlapiSearchRecord('customrecord_campaign_event_response', null, filter, columns);
  
    // Do we have any campaign event responses?
    if (cers != null) {
      this._log('Found campaign event responses to delete from campaign event');
    } else {
      this._log('Found no campaign event responses');
      this._exit(); // No, let's exit
      return;
    }
    
    // Yes
    var i = 0, n = cers.length;
    for (; i < n; i++) {
     
      // Check script usage
      var remainingUsage = context.getRemainingUsage();
      this._log('Remaining usage: ' + remainingUsage);
      var nowTime = new Date().getTime();
      var elapsedTime = ((nowTime - startTime) / 1000); // in seconds
      this._log('Time elapsed: ' + elapsedTime);
      
      // If less than 1000 credits are remaining or more than 6 minutes
      if (remainingUsage < 1000 || elapsedTime > 360) { 
        this.reschedule = true;
        var status = nlapiScheduleScript(context.getScriptId(), context.getDeploymentId());
        this._log('Reschedule script : ' + status);
        this._exit();
        return;
      }
      
      // Delete campaign event response  
      try {
        var cerId = cers[i].getId();      
        nlapiDeleteRecord('customrecord_campaign_event_response', cerId);
        this._log('Deleted campaign event response: ' + cerId);
      } catch (e) {
        this._log('Failed to delete campaign event response:' + recordId);
      }
    }
    
    this._exit();
  }
  
  /**
   * Send email
   *
   * @param {String} subject
   * @param {String} body
   */
  this._sendEmail = function(subject, body) {
    nlapiSendEmail(this.employeeId, this.employeeId, subject, body);
  }
}
