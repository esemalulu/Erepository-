/**
 * Main
 */
function sweet_date_lib_test_scheduled()
{
  try {
    nlapiLogExecution('DEBUG', 'Test', 'Start');
    
    var now = new Date();
    nlapiLogExecution('DEBUG', 'Test: Date.format(\'U\')', 'output=' + now.format('U'));
    
    nlapiLogExecution('DEBUG', 'Test', 'End');
  } catch (e) {
    if (e instanceof nlobjError) {
      nlapiLogExecution('DEBUG', 'Exception', e.getCode() + '\n' + e.getDetails());
    } else {
      nlapiLogExecution('DEBUG', 'Exception', e.toString());
    }
    throw e;
  }
}
