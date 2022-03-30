/**
 * Before Load
 */
function userevent_beforeLoad(type, form) {

   // Are we in UI mode?
  var currentContext = nlapiGetContext();
  if (currentContext.getExecutionContext() != 'userinterface') {
    return; // Nope, do nothing.
  }
  
  type = type.toLowerCase();
  
  if (type == 'edit' || type == 'view') {
        
    // Create 'Camapaign Event Helper' link
    var linkURL = '/app/site/hosting/scriptlet.nl?script=149&deploy=1';
    linkURL += '&campaign_event_id=' + nlapiGetRecordId();
     
    // Create a custom button
    var onClick = "window.location.href='" + linkURL + "';"; 
    form.addButton('custpage_detach_contacts', 'Detach Contacts', onClick);
  }  
}

/**
 * After Submit
 *
 * @return {Void}
 */
function userevent_afterSubmit(type) {

  type = type.toLowerCase();
  
  switch (type) {
    case 'create':
      var params = new Array();
      
      // Campaign event id
      var recordId = nlapiGetRecordId();
      params['custscript_campaign_event_id'] = recordId;
      nlapiLogExecution('DEBUG', 'Campaign event id', 'ID = ' + recordId);
      
      // Saved search id
      var savedSearchId = nlapiGetFieldValue('custrecord_ce_savedsearch');
      params['custscript_saved_search_id'] = savedSearchId;
      nlapiLogExecution('DEBUG', 'Saved search id', 'ID = ' + savedSearchId);
      
      // Action
      var action = 'create';
      params['custscript_cer_action'] = action;
      nlapiLogExecution('DEBUG', 'Type of action', 'Action = ' + action);
      
      // Schedule script
      var status = nlapiScheduleScript('customscript_campaign_event_scheduled', 'customdeploy_campaign_event_scheduled', params);
      nlapiLogExecution('DEBUG', 'Schedule script', 'Status = ' + status);
      break;
    case 'edit':
      // Todo...
  }
}

/**
 * Before Submit
 *
 * @return {Void}
 */
function userevent_beforeSubmit(type) {

  type = type.toLowerCase();
  
  switch (type) {
    case 'delete':
      var params = new Array();
    
      // Action
      var action = 'delete';
      params['custscript_cer_action'] = action;
      nlapiLogExecution('DEBUG', 'Type of action', 'Action = ' + action);
      
      // Schedule script
      var status = nlapiScheduleScript('customscript_campaign_event_scheduled', 'customdeploy_campaign_event_scheduled', params);
      nlapiLogExecution('DEBUG', 'Schedule script', 'Status = ' + status);
      break;
    case 'edit':
      // Todo...
  }
}