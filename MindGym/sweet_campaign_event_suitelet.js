/**
 * Campaign Event Suitelet
 *
 * @method main_suitelet
 * @param {Object} request
 * @param {Object} response
 */
function main_suitelet(request, response) {

  // Validate campaign event id
  var campaignEventId = request.getParameter('campaign_event_id');
  if (!campaignEventId) {
    throw nlapiCreateError('SWEET_CAMPAIGN_EVENT_ID_REQD', 'Campaign Event Id is required.', true);
  }
  
  // Has form been submitted?
  if (request.getMethod() == 'POST') {
    
    // Yes, let's schedule the script...
    
    // Campaign event id
    var params = new Array();
    params['custscript_campaign_event_id'] = campaignEventId;
    nlapiLogExecution('DEBUG', 'Campaign event id', 'ID = ' + campaignEventId);
    
    // Action
    var action = 'delete';
    params['custscript_cer_action'] = action;
    nlapiLogExecution('DEBUG', 'Type of action', 'Action = ' + action);
    
    // Schedule script
    var status = nlapiScheduleScript('customscript_campaign_event_scheduled', 'customdeploy_campaign_event_scheduled', params);
    nlapiLogExecution('DEBUG', 'Schedule script', 'Status = ' + status);
    
    // Redirect back to campaign event
    nlapiSetRedirectURL('RECORD', 'customrecord_campaign_event', campaignEventId);
    return;
  }
  
  // Build form
  var form = nlapiCreateForm('Detach contacts', false);
  
  // Message
  var field = form.addField('message', 'text', 'Note that it will take a couple of minutes before changes take effect.');
  field.setDisplayType('inline');
  field.setLayoutType('normal', 'startcol');
  
  // Campaign event id
  var field = form.addField('campaign_event_id', 'integer', 'Campaign Event Id');
  field.setDisplayType('normal');
  field.setDefaultValue(campaignEventId);
  
  // Submit button
  form.addSubmitButton('Detach');
  
  // Cancel button
  var url = nlapiResolveURL('RECORD', 'customrecord_campaign_event', campaignEventId);
  var onClick = "window.location.href='" + url + "'";
  form.addButton('cancel', 'Cancel', onClick);
  
  // Display page
  response.writePage(form);
}
