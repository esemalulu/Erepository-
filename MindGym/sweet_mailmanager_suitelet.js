/* Main function
*****************************************************************************/

/**
*
*
*/
function mailManagerTest(request, response) {

    // Run a saved search to get the email messages to be sent grouped by job, task, senddate and email template
    var message_jobtask_list = nlapiSearchRecord('customrecord_emailmessage', 'customsearch_emailmsg_tosend', null, null);

    response.writeLine("Found " + message_jobtask_list.length + " jobs to process\n");

    for (var i = 0; (message_jobtask_list != null) && (i < message_jobtask_list.length); i++) {

      response.writeLine("** Processing **\n");

      var job_id = message_jobtask_list[i].getValue('custrecord_emailmsg_job', null, 'group');
      var task_id = message_jobtask_list[i].getValue('custrecord_emailmsg_emailtask', null, 'group');
      var send_date = message_jobtask_list[i].getValue('custrecord_emailmsg_sendate', null, 'group');
      var template_id = message_jobtask_list[i].getValue('custrecord_emailmsg_emailtemplate', null, 'group');

      response.writeLine("Job " + job_id);
      response.writeLine("Task " + task_id);
      response.writeLine("Send date " + send_date);
      response.writeLine("Template " + template_id);

      if (job_id == null) {
        response.writeLine("** BAIL BAIL BAIL - No job ID - iteration " + i + "**");
        return;
      }

      // Create an email campaign for current group
      var campaign_id = createEmailCampaign(job_id, send_date, template_id);

      // Get the exact list of messages in this group
      var message_list = getEmailMessagesByJobTaskDate(job_id, task_id, send_date);

      // Update each message row with the campaign ID
      setEmailMessageCampaignId(campaign_id, message_list);

      response.writeLine("Finished job " + job_id + "\n");

    }

    return true;
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

  response.writeLine('Created campaign ' + new_campaign_id + ' to be sent on ' + send_date);

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

  var recipient_list = new Array();

  var filters = new Array();
  filters[0] = new nlobjSearchFilter('custrecord_emailmsg_job', null, 'is', job_id);
  filters[1] = new nlobjSearchFilter('custrecord_emailmsg_emailtask', null, 'is', task_id);
  filters[2] = new nlobjSearchFilter('custrecord_emailmsg_sendate', null, 'onorbefore', send_date);
  /*filters[3] = new nlobjSearchFilter('custrecord_emailmsg_emailmsgstatus', null, 'anyof', 'Not Sent');*/

  var columns = new Array();
  columns[0] = new nlobjSearchColumn('custrecord_emailmsg_firstname');
  columns[1] = new nlobjSearchColumn('custrecord_emailmsg_lastname');
  columns[2] = new nlobjSearchColumn('custrecord_emailmsg_email');
  columns[3] = new nlobjSearchColumn('custrecord_emailmsg_participant');

  // Search for all the recipients
  var recipient_list = nlapiSearchRecord('customrecord_emailmessage', null, filters, columns);

  response.writeLine("Found " + recipient_list.length + " message rows");

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

    var message_record = nlapiLoadRecord('customrecord_emailmessage', message_id);

    message_record.setFieldValue('custrecord_emailmsg_emailcampaign', campaign_id);

    nlapiSubmitRecord(message_record, true);
  }

}