/**
 * Main
 */
function sweet_mail_lib_test_scheduled()
{
  try {
    nlapiLogExecution('DEBUG', 'Test', 'Start');
    
    var str = 'test';
    var testVal = str.toUTF8();
    nlapiLogExecution('DEBUG', 'Test: toUTF8', 'output=' + testVal);
    
    var arr = new Array();
    arr['a'] = 1;
    arr['b'] = 2;
    testVal = PHPSerializer.serialize(arr);
    nlapiLogExecution('DEBUG', 'Test: PHPSerializer.serialize', 'output=' + testVal);
    
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
