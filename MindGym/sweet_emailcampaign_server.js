/*
 *  Function called after an email campaign record has been saved and updated
 *
 *  @param nlrecordType type
 *  @return boolean
*/
function userevent_afterSubmit(type) {

  nlapiLogExecution('DEBUG','Type: ' + type);

  // We only need to carry out this check if editing an existing record
  if (type == 'edit') {

    var campaign_id = nlapiGetRecordId();

    var current_campaign_status = nlapiGetFieldValue('custrecord_ecam_emailcampaignstatus');

    // Get the record before it was updated
    var old_campaign_record = nlapiGetOldRecord();

    // Make sure we have an old record
    if (old_campaign_record != null) {

      var old_campaign_status = old_campaign_record.getFieldValue('custrecord_ecam_emailcampaignstatus');

      // Check if the status has changed
      if (old_campaign_status != current_campaign_status) {

        // The campaign has been marked as complete
        if (current_campaign_status == 2) {

          var recipients = getEmailCampaignRecipientsList(campaign_id);

          if ((recipients != null) && (recipients.length > 0)) {

            updateEmailCampaignMessagesSentStatus(recipients);

            nlapiLogExecution('DEBUG','Set '+recipients.length+' messages as sent');

         }

        }

      }

    }

    nlapiLogExecution('DEBUG','campaign: '+campaign_id+' status: '+current_campaign_status+' old status: '+old_campaign_status);

  }

  return true;
}

/*
 *  Search for all messages belonging to a particular campaign
 *
 *  @param integer campaign_id
 *  @return array
*/
function getEmailCampaignRecipientsList(campaign_id) {

  var recipients = new Array();

  var filters = new Array();
  filters[0] = new nlobjSearchFilter('custrecord_emailmsg_emailcampaign', null, 'is', campaign_id);

  var recipient_list = nlapiSearchRecord('customrecord_emailmessage', null, filters, null);

  return recipient_list;
}

/*
 *  Marks all messages in the list as sent
 *
 *  @param nlobjSearchResult message_list
*/
function updateEmailCampaignMessagesSentStatus(message_list) {

  for (var i = 0; (message_list != null) && (i < message_list.length); i++) {

    var message_id = message_list[i].getId();

    // Load the message record
    var message_record = nlapiLoadRecord('customrecord_emailmessage', message_id);

    // Set the message as sent
    message_record.setFieldValue('custrecord_emailmsg_emailmsgstatus', 2);

    nlapiSubmitRecord(message_record, true);
  }

}