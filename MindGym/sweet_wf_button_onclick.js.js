/**
 * Set Onclick Action
 */
 
 function onClickAction() {
 
  nlapiLogExecution('DEBUG', 'Start', 'workflow script starts');
    var jobId = nlapiGetRecordId();
 
  //Read parameters

  var identifier = nlapiGetContext().getSetting('SCRIPT', 'custscript_resource_primary_id');
  var id = nlapiGetContext().getSetting('SCRIPT', 'custscript_resource_secondary_id');
  var action = nlapiGetContext().getSetting('SCRIPT', 'custscript_wf_action');
  
  nlapiLogExecution('DEBUG', 'identifier', identifier);
  nlapiLogExecution('DEBUG', 'id', id);
  nlapiLogExecution('DEBUG', 'action', action);
  nlapiLogExecution('DEBUG', 'jobId', jobId);
  
   var params = new Array();
   params['jobid'] = jobId;
   params['action'] = action;
 
  nlapiLogExecution('DEBUG', 'params', params);
   nlapiSetRedirectURL('SUITELET', identifier, id, false, params);


  nlapiLogExecution('DEBUG', 'End', 'workflow script ends');
 }