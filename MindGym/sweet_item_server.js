/**
* Before Submit
*
*/
function userevent_beforeSubmit(type) {

  nlapiLogExecution('DEBUG', 'Begin', 'userevent_beforeSubmit');

  var currentContext = nlapiGetContext();
  var currentExecutionContext = currentContext.getExecutionContext();

  nlapiLogExecution('DEBUG', 'Execution Context', currentExecutionContext);

  // Only trigger this script when updating items through the UI
  if (currentExecutionContext == 'userinterface') {

    nlapiLogExecution('DEBUG', 'Scheduling item price script');

    var scriptParams = new Array();
    scriptParams['custscript_itemid'] = nlapiGetRecordId();

    nlapiScheduleScript('customscript_item_updateprices_scheduled', 'customdeploy_item_updateprices_oneitem', scriptParams);

  }

  nlapiLogExecution('DEBUG', 'Exit', 'Successfully');
}