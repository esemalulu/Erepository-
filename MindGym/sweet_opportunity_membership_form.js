/**
 * Before Load
 */
function beforeLoad(type, form, request)
{
  try {
    // Only run if trigger from UI
    var context = nlapiGetContext();
    if (context.getExecutionContext() != 'userinterface') {
      return;
    }

    // Only run if Membership form is being used
    var customForm = nlapiGetFieldValue('customform');
    if (customForm != '102') {
      return;
    }

    // Add transaction buttons to form
    var opportunity = nlapiGetRecordId();
    var salesOrderURL = nlapiResolveURL('RECORD', 'salesorder', null, null);
    var quoteURL = nlapiResolveURL('RECORD', 'estimate', null, null);
    var invoiceURL = nlapiResolveURL('RECORD', 'invoice', null, null);
    var creditmemoURL = nlapiResolveURL('RECORD', 'creditmemo', null, null);
    switch (type.toLowerCase()) {
      case 'view':
      case 'edit':
        salesOrderURL += "?sob=T&opportunity=" + opportunity;        
        quoteURL += "?sob=T&opportunity=" + opportunity;
        invoiceURL += "?sob=T&opportunity=" + opportunity;
        creditmemoURL += "?sob=T&opportunity=" + opportunity;
        form.addButton('custpage_salesorder', 'Sales Order', "window.location.href='" + salesOrderURL + "'" );
        form.addButton('custpage_quote', 'Estimate', "window.location.href='" + quoteURL + "'" );
        form.addButton('custpage_invoice', 'Invoice', "window.location.href='" + invoiceURL + "'" );
        form.addButton('custpage_creditmemo', 'Credit Memo', "window.location.href='" + creditmemoURL + "'" );
        break;
      default:
        // Do nothing
    }
  } catch (e) {
    if (e instanceof nlobjError) {
      nlapiLogExecution('DEBUG', 'System Error', e.getCode() + ' ' + e.getDetails());
    } else {
      nlapiLogExecution('DEBUG', 'Unexpected Error', e.toString());
    }
  }
}
