/* Main function
*****************************************************************************/

/**
* Main function to schedule email campaigns based on jobs
*
* @param Object type
*/
function scheduleEmailCampaigns(type) {

  nlapiLogExecution('DEBUG', 'Start', 'scheduleEmailCampaigns');

  // Run a search to get the email messages to be sent
  var message_jobtask_list = getEmailMessageGroups();

  if (message_jobtask_list != null) {

    nlapiLogExecution('DEBUG', 'Found jobs to process', message_jobtask_list.length);

    for (var i = 0; (message_jobtask_list != null) && (i < message_jobtask_list.length); i++) {

      var job_id = message_jobtask_list[i].getValue('custrecord_emailmsg_job', null, 'group');
      var task_id = message_jobtask_list[i].getValue('custrecord_emailmsg_emailtask', null, 'group');
      var send_date = message_jobtask_list[i].getValue('custrecord_emailmsg_senddate', null, 'group');
      var template_id = message_jobtask_list[i].getValue('custrecord_emailmsg_emailtemplate', null, 'group');

      nlapiLogExecution('DEBUG', 'Job', job_id);
      nlapiLogExecution('DEBUG', 'Task', task_id);
      nlapiLogExecution('DEBUG', 'Send date', send_date);
      nlapiLogExecution('DEBUG', 'Template', template_id);

      if (job_id == null) {
        nlapiLogExecution('ERROR', 'Missing job id');
        return false;
      }

      // Create an email campaign for current group
      var campaign_id = createEmailCampaign(job_id, send_date, template_id);

      // Get the exact list of messages in this group
      var message_list = getEmailMessagesByJobTaskDate(job_id, task_id, send_date);

      // Update each message row with the campaign ID
      setEmailMessageCampaignId(campaign_id, message_list);

    }

  } else {
    nlapiLogExecution('DEBUG', 'No messages found');
  }

  nlapiLogExecution('DEBUG', 'End', 'scheduleEmailCampaigns');
}

/*
*  Perform search to email messages not in an email campaign
*  Messages are grouped by job, task, senddate and email template
*
*  @return array
*/
function getEmailMessageGroups() {

  var emailMessageGroups = new Array();

  var filters = new Array();
  filters[0] = new nlobjSearchFilter('custrecord_emailmsg_emailmsgstatus', null, 'is', '1');
  filters[1] = new nlobjSearchFilter('custrecord_emailmsg_emailcampaign', null, 'is', '@NONE@');
  //filters[2] = new nlobjSearchFilter('custrecord_emailmsg_senddate', null, 'is', 'today');

  var columns = new Array();
  columns[0] = new nlobjSearchColumn('custrecord_emailmsg_job', null, 'group');
  columns[1] = new nlobjSearchColumn('custrecord_emailmsg_emailtask', null, 'group');
  columns[2] = new nlobjSearchColumn('custrecord_emailmsg_emailtemplate', null, 'group');
  columns[3] = new nlobjSearchColumn('custrecord_emailmsg_senddate', null, 'group');
  columns[4] = new nlobjSearchColumn('custrecord_emailmsg_participant', null, 'count');

  // Get all the items
  var emailMessageGroups = nlapiSearchRecord('customrecord_emailmessage', null, filters, columns);

  return emailMessageGroups;
}

/**
* Create an email campaign
*
* @param integer job_id
* @param string send_date
* @param integer template_id
*/
function createEmailCampaign(job_id, send_date, template_id) {

  // Create a new email campaign
  var new_campaign = nlapiCreateRecord('customrecord_emailcampaign');

  new_campaign.setFieldValue('custrecord_ecam_job', job_id);
  new_campaign.setFieldValue('custrecord_ecam_senddate', send_date);
  new_campaign.setFieldValue('custrecord_ecam_emailtemplate', template_id);

  // Save the new campaign
  new_campaign_id = nlapiSubmitRecord(new_campaign, true);

  nlapiLogExecution('DEBUG', 'Created campaign', new_campaign_id);
  nlapiLogExecution('DEBUG', 'To be sent on', send_date);

  return new_campaign_id;
}

/**
* Get a list of email message rows that belong to a certain grouping
*
* @param integer job_id
* @param integer task_id
* @param string send_date
*/
function getEmailMessagesByJobTaskDate(job_id, task_id, send_date) {

  nlapiLogExecution('DEBUG', 'job/task/senddate', job_id + '/' + task_id + '/' + send_date);

  var recipient_list = new Array();

  var filters = new Array();
  filters[0] = new nlobjSearchFilter('custrecord_emailmsg_job', null, 'is', job_id);
  filters[1] = new nlobjSearchFilter('custrecord_emailmsg_emailtask', null, 'is', task_id);
  filters[2] = new nlobjSearchFilter('custrecord_emailmsg_senddate', null, 'onorbefore', send_date);
  filters[3] = new nlobjSearchFilter('custrecord_emailmsg_emailmsgstatus', null, 'is', 1);

  var columns = new Array();
  columns[0] = new nlobjSearchColumn('custrecord_emailmsg_firstname');
  columns[1] = new nlobjSearchColumn('custrecord_emailmsg_lastname');
  columns[2] = new nlobjSearchColumn('custrecord_emailmsg_email');
  columns[3] = new nlobjSearchColumn('custrecord_emailmsg_participant');

  // Search for all the recipients
  var recipient_list = nlapiSearchRecord('customrecord_emailmessage', null, filters, columns);

  if (recipient_list != null) {
    nlapiLogExecution('DEBUG', 'Message rows', recipient_list.length);
  }

  return recipient_list;
}

/**
* Set the campaign ID for a list of email messages
*
* @param integer campaign_id
* @param nlobjSearchResult message_list
*/
function setEmailMessageCampaignId(campaign_id, message_list) {

  for (var i = 0; (message_list != null) && (i < message_list.length); i++) {

    var message_id = message_list[i].getId();

    // Update the campaign Id on the message
    nlapiSubmitField('customrecord_emailmessage', message_id, 'custrecord_emailmsg_emailcampaign', campaign_id, true);

    nlapiLogExecution('DEBUG', 'Update message campaign', 'Mess: ' + message_id + ' Camp: ' + campaign_id);

  }

}