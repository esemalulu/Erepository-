/**
 * After Submit
 *
 * @param {String} type
 * @return {Void}
 */
function userevent_afterSubmit(type) {
  var params = new Array();
  params['custscript_action'] = type.toLowerCase();
  params['custscript_recordtype'] = nlapiGetRecordType();
  params['custscript_recordid'] = nlapiGetRecordId();
  
  nlapiLogExecution('DEBUG', 'custscript_action', params['custscript_action']);
  nlapiLogExecution('DEBUG', 'custscript_recordtype', params['custscript_recordtype']);
  nlapiLogExecution('DEBUG', 'custscript_recordid', params['custscript_recordid']);
  
  var status = nlapiScheduleScript('customscript_integration_scheduled', 'customdeploy_script', params);
  nlapiLogExecution('DEBUG', 'status', status);
}
