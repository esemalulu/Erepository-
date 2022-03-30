
function sweet_looptest(type)
{
  try {
    // Print type
    nlapiLogExecution('DEBUG', 'Var', 'type=' + type);
    
    // Print param
    var offset = nlapiGetContext().getSetting('SCRIPT', 'custscript_offset');
    nlapiLogExecution('DEBUG', 'Var', 'offset=' + offset);
    
    if (offset == null || offset < 0) {
      offset = 0;
    }
    
    // Schedule script
    /*
    if (offset < 2) {
      nlapiLogExecution('DEBUG', 'Info', 'Schedule script');
      var params = new Array();
      params['custscript_offset'] = ++offset;
      var scriptId = 'customscript_looptest';
      nlapiScheduleScript(scriptId, null, params);
    }
    */
    
  } catch (e) {
    if (e instanceof nlobjError) {
      nlapiLogExecution('DEBUG', 'Exception', e.getCode() + '\n' + e.getDetails());
    } else {
      nlapiLogExecution('DEBUG', 'Exception', e.toString());
    }
    throw e;
  }
}
