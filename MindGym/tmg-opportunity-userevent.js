
function tmg_opportunity_beforeSubmit(type)
{
  nlapiLogExecution('DEBUG', 'tmg_opportunity_beforeSubmit', type);

  try {
    switch (type.toLowerCase()) {
      case 'create':
        tmg_opportunity_setOpportunityType();
        break;
      case 'edit':
        tmg_opportunity_setOpportunityType();
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

function tmg_opportunity_setOpportunityType()
{
  var record = nlapiGetNewRecord();
  var formName = record.getFieldValue('customform');
  record.setFieldValue('custbody_opportunity_type', formName);
}
