/**
 * Before submit user event
 *
 * @param type
 * @return void
 */
function beforeSubmit(type)
{
  try {
    nlapiLogExecution('DEBUG', 'Before submit', '');
    nlapiLogExecution('DEBUG', 'Type', type);
    var consolidatedParent = 1; // todo: use script parameter instead
    
    switch (type.toLowerCase()) {
      case 'xedit':
      case 'edit':
      case 'create':
      
        // Set subsidiary
        nlapiLogExecution('DEBUG', 'Set field', 'subsidiary=array('+consolidatedParent+')');
        var subsidiary = new Array();
        subsidiary[0] = consolidatedParent;
        nlapiSetFieldValue('subsidiary', subsidiary, false);
      
        // Set include children
        nlapiLogExecution('DEBUG', 'Set field', 'includechildren=T');
        nlapiSetFieldValue('includechildren', 'T', false);
        
        break;
      default:
        // Do nothing
    }
  } catch (e) {
    if (e instanceof nlobjError ) {
      nlapiLogExecution('DEBUG', 'System error', e.getCode() + ' ' + e.getDetails());
    } else {
      nlapiLogExecution('DEBUG', 'Unexpected error', e.toString());
    }
    throw e;
  }
}
