var WEBSERVICE_URL = 'http://mail-mangler-russell.dev.themindgym.com/mailjob';
var WEBSERVICE_USERNAME = 'ladybird';
var WEBSERVICE_PASSWORD = '2ksquare';

/* Main function
*****************************************************************************/

/**
* Send scheduled email campaigns over to the Mail Manager web service
*
* @param Object request
* @param Object response
*/
function scheduleMailManager(request, response) {

  nlapiLogExecution('DEBUG', 'Start', 'scheduleMailManager');

  // Execute a saved search to jobs without email campaigns
  var campaign_list = nlapiSearchRecord('customrecord_emailcampaign', 'customsearch_ecam_queuetoday', null, null);

  if (campaign_list != null) {

    nlapiLogExecution('DEBUG', 'Found campaigns to send', campaign_list.length);

    for (var i = 0; (campaign_list != null) && (i < campaign_list.length); i++) {

      var campaign_id = campaign_list[i].getId();

      createMailManagerJob(campaign_id);

    }

  } else {
    nlapiLogExecution('DEBUG', 'No campaigns found');
  }

  nlapiLogExecution('DEBUG', 'End', 'scheduleMailManager');
}

/*
 * E-prompt integrating with Mail Manager API suitelet
 *
 * @return void
*/
function createMailManagerJob(campaign_id) {

  nlapiLogExecution('DEBUG', 'Sending campaign', campaign_id);

  // Load the email campaign
  var email_campaign = nlapiLoadRecord('customrecord_emailcampaign', campaign_id);

  // Create object to be serialized
  var mailjob = new mailManagerJob(email_campaign);

  // Convert object to JSON
  var json_string = YAHOO.lang.JSON.stringify(mailjob);
  nlapiLogExecution('DEBUG', 'Sending JSON', json_string);

  // POST JSON to the Mail Manager webservice
  var mailmanager_response = nlapiRequestURL(WEBSERVICE_URL, json_string);

  nlapiLogExecution('DEBUG', 'Sent campaign, got response', mailmanager_response.getCode());

  // Need to deal with the response code from mail manager
  switch(parseInt(mailmanager_response.getCode())) {

    case 200:
      // Mark campaign as sent
      email_campaign.setFieldValue('custrecord_ecam_emailcampaignstatus', 2);
      email_campaign.setFieldValue('custrecord_ecam_queuedinmailmanager', 'T');
      nlapiSubmitRecord(email_campaign, true);
      break;

    case 501:
      nlapiLogExecution('ERROR', 'Got a bad error code back');
      return false;
      break;

  }

  return true;
}

/*
 * Our Mail Manager job object
 *
 * @param integer campaign_id
*/
function mailManagerJob(email_campaign) {

  var campaign_id = email_campaign.getId();

  //  Get the job and template ID
  job_id = email_campaign.getFieldValue('custrecord_ecam_job');
  template_id = email_campaign.getFieldValue('custrecord_ecam_emailtemplate');

  // Load the email template
  var email_template = nlapiLoadRecord('customrecord_emailtemplate', template_id);

  // Template details
  this.title = email_template.getFieldValue('custrecord_emailtpl_subject');
  this.from_address = email_template.getFieldValue('custrecord_emailtpl_from');
  this.plaintext = email_template.getFieldValue('custrecord_emailtpl_plaintext');
  this.html = email_template.getFieldValue('custrecord_emailtpl_html');

  // Schedule date
  this.notBefore = email_campaign.getFieldValue('custrecord_ecam_senddate');

  // Recipients
  this.recipients = getRecipientsList(campaign_id);

  // Put the Netsuite campaign ID into the object
  this.campaign_id = campaign_id;

}

/*
 *  Search for all participants relating to a particular campaign
 *
 *  @param integer campaign_id
 *  @return array
*/
function getRecipientsList(campaign_id) {

  var recipients = new Array();

  var filters = new Array();
  filters[0] = new nlobjSearchFilter('custrecord_emailmsg_emailcampaign', null, 'is', campaign_id);
  filters[1] = new nlobjSearchFilter('custrecord_emailmsg_emailmsgstatus', null, 'is', 1);

  var columns = new Array();
  columns[0] = new nlobjSearchColumn('custrecord_emailmsg_firstname');
  columns[1] = new nlobjSearchColumn('custrecord_emailmsg_lastname');
  columns[2] = new nlobjSearchColumn('custrecord_emailmsg_email');
  columns[3] = new nlobjSearchColumn('custrecord_emailmsg_customfields');

  // Search for all the participants
  var recipient_list = nlapiSearchRecord('customrecord_emailmessage', null, filters, columns);

  if (recipient_list == null) {
    nlapiLogExecution('ERROR', 'No recipients for campaign', campaign_id);
  }

  for (var i = 0; (recipient_list != null) && (i < recipient_list.length); i++) {

    // Create new object for each recipient
    recipient = new Object();
    recipient.name = recipient_list[i].getValue('custrecord_emailmsg_firstname') + ' ' + recipient_list[i].getValue('custrecord_emailmsg_lastname');
    recipient.email = recipient_list[i].getValue('custrecord_emailmsg_email');

    // Check if the message has any custom fields
    if (recipient_list[i].getValue('custrecord_emailmsg_customfields').length > 0) {

      // Custom fields are stored as JSON
      // Parse the JSON and store the returned object with the recipient
      recipient.custom_fields = YAHOO.lang.JSON.parse(recipient_list[i].getValue('custrecord_emailmsg_customfields'));
    }

    recipients[i] = recipient;

  }

  return recipients;
}