/**
 * Before submit user event
 *
 * @param type
 * @return void
 */
function beforeSubmit(type)
{
  try {
    nlapiLogExecution('DEBUG', 'Before submit', 'type=' + type);
              
    switch (type.toLowerCase()) {
      case 'delete':
        break;
      case 'edit':
      case 'create':
        var customForm = nlapiGetFieldValue('customform');
        if (customForm == '102') {
          nlapiLogExecution('DEBUG', 'This is a membership', 'customForm=' + customForm);
          nlapiSetFieldValue('custbody_mem_ismembership', 'T', false);
        } else {
          nlapiLogExecution('DEBUG', 'This is NOT a membership', 'customForm=' + customForm);
          nlapiSetFieldValue('custbody_mem_ismembership', 'T', false);
        }
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

/**
 * Before Load
 */
function beforeLoad(type, form, request)
{
  try {
    nlapiLogExecution('DEBUG', 'beforeLoad', 'type=' + type);

    // Only run if type if view
    if (type.toLowerCase() != 'view') {
      nlapiLogExecution('DEBUG', 'Exit due to type', 'type=' + type);
      return;
    }

    // Only run if trigger from UI
    var context = nlapiGetContext();
    if (context.getExecutionContext() != 'userinterface') {
      nlapiLogExecution('DEBUG', 'Exit due to execution context', 'executionContext=' + context.getExecutionContext());
      return;
    }

    // Only run if Membership form is being used
    var isMembership = nlapiGetFieldValue('custbody_mem_ismembership');
    if (isMembership != 'T') {
      nlapiLogExecution('DEBUG', 'Exit due to custom form', 'isMembership=' + isMembership);
      return;
    }

    // Add transaction buttons to form
    var opportunity = nlapiGetRecordId();
    var salesOrderURL = nlapiResolveURL('RECORD', 'salesorder', null, null);
    var quoteURL = nlapiResolveURL('RECORD', 'estimate', null, null);
    var invoiceURL = nlapiResolveURL('RECORD', 'invoice', null, null);
    var creditmemoURL = nlapiResolveURL('RECORD', 'creditmemo', null, null);
    salesOrderURL += "?sob=T&opportunity=" + opportunity;        
    quoteURL += "?sob=T&opportunity=" + opportunity;
    invoiceURL += "?sob=T&opportunity=" + opportunity;
    creditmemoURL += "?sob=T&opportunity=" + opportunity;
    form.addButton('custpage_salesorder', 'Sales Order', "window.location.href='" + salesOrderURL + "'" );
    form.addButton('custpage_quote', 'Estimate', "window.location.href='" + quoteURL + "'" );
    form.addButton('custpage_invoice', 'Invoice', "window.location.href='" + invoiceURL + "'" );
    form.addButton('custpage_creditmemo', 'Credit Memo', "window.location.href='" + creditmemoURL + "'" );
  } catch (e) {
    if (e instanceof nlobjError) {
      nlapiLogExecution('DEBUG', 'System Error', e.getCode() + ' ' + e.getDetails());
    } else {
      nlapiLogExecution('DEBUG', 'Unexpected Error', e.toString());
    }
  }
}
