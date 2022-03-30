
function tmg_opportunity_beforeSubmit(type)
{
  nlapiLogExecution('DEBUG', 'tmg_opportunity_beforeSubmit', type);

  try {
    switch (type.toLowerCase()) {
      case 'create':
        tmg_opportunity_setFormMessage();
        break;
      case 'edit':
        tmg_opportunity_setFormMessage();
        break;
      case 'delete':
        break;
      case 'xedit':    
        break;
    }
  } catch (e) {
    if (e instanceof nlobjError) {
      nlapiLogExecution( 'DEBUG', 'system error', e.getCode() + ' ' + e.getDetails())
    } else {
      nlapiLogExecution( 'DEBUG', 'unexpected error', e.toString() )
    }
  }
}

function tmg_opportunity_setFormMessage()
{
  nlapiLogExecution('DEBUG', 'tmg_opportunity_setFormMessage');

  var record = nlapiGetNewRecord();
  var formName = record.getFieldValue('customform');
  var message = '';

  if (formName == 102 || formName == 'Membership Form') {
    message = 'MEMBERSHIP';
  }
  message = 'T='+formName;
  message = message.substr(0, 15);

  record.setFieldValue('custbody_form_message', message);
}
