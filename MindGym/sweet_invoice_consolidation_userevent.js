/**
 * After submit user event
 *
 * @param type
 * @return void
 */
function afterSubmit(type)
{
  try {
    nlapiLogExecution('DEBUG', 'After submit', '');
    var consolidatedForm = 107; // todo: script parameter
    var customForm = nlapiGetFieldValue('customform');
    var recordId = nlapiGetRecordId();
    
    // If user is deleting a consolidated invoice
    if (customForm == consolidatedForm && type.toLowerCase() == 'delete') {
      
      // Find all invoices that belong to this consolidated invoice
      nlapiLogExecution('DEBUG', 'Find part invoices', 'recordId='+recordId);
      var filterInvoices = new Array();
      filterInvoices[0] = new nlobjSearchFilter('custbody_invco_invoice', null, 'anyof', recordId, null);
      var parts = nlapiSearchRecord('transaction', 'customsearch_invco_parts', filterInvoices, null);
      if (parts == null) {
        nlapiLogExecution('DEBUG', 'Search results', 'No invoices found');
        return;
      }
      nlapiLogExecution('DEBUG', 'Search results', 'Found '+parts.length+' invoices');
      
      // Reset consolidated invoice id
      nlapiLogExecution('DEBUG', 'Reset consolidated invoice id', '');
      for (var i = 0; i < parts.length; i++) {
        nlapiLogExecution('DEBUG', 'Invoice to be updated', parts[i].getId());
        var invoice = nlapiLoadRecord('invoice', parts[i].getRecordType(), parts[i].getId());
        invoice.setFieldValue('custbody_invco_invoice', null);
        nlapiSubmitRecord(invoice, true);
      }
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
    var consolidatedInvoice = nlapiGetFieldValue('custbody_invco_invoice');
    
    // If user is deleting invoice
    if (type.toLowerCase() == 'delete') {
      
      // ..and invoice is part of a consolidated invoice
      if (consolidatedInvoice != null) {
        nlapiLogExecution('DEBUG', 'This invoice is part of a consolidated invoice', '');
        nlapiCreateError('SWEET_INVCO_CANT_DELETE_PART', "You can't delete this invoice because it's part of a consolidated invoice. You must delete the consolidated invoice first.");
        return false;
      }
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
