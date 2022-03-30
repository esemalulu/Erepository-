/**
 * Constants
 */
var DETAILS_FORMAT_CUSTOM = '2';

/**
 * This script consolidates customer invoices
 *
 * @throws sweet_Exception
 * @return void
 */
function main()
{
  nlapiLogExecution('DEBUG', 'start of main', '');
  
  try {
    var contextObj = nlapiGetContext();
    
    // Do input validation
    var customer = contextObj.getSetting('SCRIPT', 'custscript_invco_customer');
    var startDate = contextObj.getSetting('SCRIPT', 'custscript_invco_startdate');
    var endDate = contextObj.getSetting('SCRIPT', 'custscript_invco_enddate');
    nlapiLogExecution('DEBUG', 'input validation', 'startdate : enddate : customer = ' + startDate + ' : ' + endDate + ' : ' + customer);
    
    if (sweet_empty(customer)) {
      throw new sweet_Exception("Customer is missing");
    }
    if (sweet_empty(startDate)) {
      throw new sweet_Exception("Start date is missing");    
    }
    if (sweet_empty(endDate)) {
      throw new sweet_Exception("End date is missing");    
    }
    
    // Consolidate
    nlapiLogExecution('DEBUG', 'call consolidation function', '');
    var invoice = sweet_Invoice_consolidate(customer, startDate, endDate);
    var invoiceId = invoice.getFieldValue('id');
    var invoiceURL = 'https://system2.netsuite.com/app/accounting/transactions/custinvc.nl?id=' + invoiceId;
    var invoiceNo = nlapiLookupField('invoice', invoiceId, 'tranid');
    
    // Send confirmation email
    nlapiLogExecution('DEBUG', 'sending confirmation email', '');
    subject = "Invoice consolidation completed - #" + invoiceNo;
    body = "Hi,\r\n\r\nYour consolidated invoice is now ready.\r\n\r\n" +
      "Link to invoice:\n" + invoiceURL +
      "\r\n\r\n/Sweet"; 
    sweet_Mail_send(nlapiGetUser(), subject, body);
    
  } catch (e) {
    var errorCode = 'N/A';
    var errorMsg = 'N/A';
    
    if (e instanceof nlobjError) {
      nlapiLogExecution('DEBUG', 'Exception', e.getCode() + '\n' + e.getDetails());
      errorCode = e.getCode();
      errorMsg = e.getDetails();
    } else if (e instanceof sweet_Exception) {
      errorMsg = e.message;
    } else {
      nlapiLogExecution('DEBUG', 'Exception', e.toString());
      errorMsg = e.toString();
    }
    
    // Send error message by email
    subject = "Invoice consolidation failed";
    body = "Oops, there was a problem creating your consolidated invoice.\n\n" +
      "The error code is: " + errorCode + ' and the message is: ' + errorMsg + "\n\n\n" +
      "/Sweet";
    sweet_Mail_send(nlapiGetUser(), subject, body);    
  }
}

/**
 * Consolidate customer invoices
 *
 * @throws sweet.Exception
 * @return invoice object
 */
function sweet_Invoice_consolidate(customer, startDate, endDate)
{
  var customForm = 107; // Consolidated Invoice
  var invoiceType = 1; // Own invoices
  var descriptionItem = -3;
  var descriptionTaxCode = 4; // tax code for description line item    
  
  // Do input validation
  if (sweet_empty(customer)) {
    throw new sweet_Exception("Customer is missing");
  }
  if (sweet_empty(startDate)) {
    throw new sweet_Exception("Start date is missing");
  }
  if (sweet_empty(endDate)) {
    throw new sweet_Exception("Start date is missing");
  }
  nlapiLogExecution('DEBUG', 'customer : start : end', customer + ' : ' + startDate + ' : ' + endDate);
  
  // Get consolidation item (for later use)
  var searchItem = nlapiSearchRecord('item', null, new nlobjSearchFilter('custitem_invco_item', null, 'is', 'T', null), null);
  if (searchItem == null || searchItem.length < 1) {
    throw new sweet_Exception("Can't find the consolidation item");
  }
  var coItem = searchItem[0].getId();
  
  // Create new (consolidated) invoice
  nlapiLogExecution('DEBUG', 'Create new invoice', '');
  var newInvoice = nlapiCreateRecord('invoice');
  var cSubTotal = 0;
  var cTaxTotal = 0;
  var cTotal = 0;
  //var cPONumber = new Array();
  
  // Create invoice header	
  nlapiLogExecution('DEBUG', 'Create invoice header', '');
  var customerDetails = nlapiLookupField('customer', customer, ['terms', 'subsidiary']);
  nlapiLogExecution('DEBUG', 'subsidiary', 'type='+typeof customerDetails['subsidiary']+'|value='+customerDetails['subsidiary']);
  newInvoice.setFieldValue('customform', customForm);
  newInvoice.setFieldValue('entity', customer);
  newInvoice.setFieldValue('terms', customerDetails['terms']);
  newInvoice.setFieldValue('subsidiary', customerDetails['subsidiary']);
  newInvoice.setFieldValue('otherrefnum', 'N/A');
  nlapiLogExecution('DEBUG', 'Invoice header', 'customform='+customForm+'|entity='+customer+'|terms='+customerDetails['terms']+'|subsidiary='+customerDetails['subsidiary']);
  
  // Find invoices to consolidate
  nlapiLogExecution('DEBUG', 'Find invoice to consolidate', '');
  var filterInvoices = new Array();
  filterInvoices[0] = new nlobjSearchFilter('trandate', null, 'onorafter', startDate);
  filterInvoices[1] = new nlobjSearchFilter('trandate', null, 'onorbefore', endDate);
  filterInvoices[2] = new nlobjSearchFilter('custbody_invco_type', null, 'anyof', invoiceType, null);
  filterInvoices[3] = new nlobjSearchFilter('name', null, 'anyof', customer, null);
  nlapiLogExecution('DEBUG', 'Search criteria', 'startDate='+startDate+'|endDate='+endDate+'|custbody_consolidationtype='+type+'|customer='+customer);
  var searchInvoices = nlapiSearchRecord('transaction', 'customsearch_invco_consolidate', filterInvoices, null);
  if (searchInvoices == null) {
    nlapiLogExecution('DEBUG', 'Found no invoices to consolidate', 'typeof='+typeof searchInvoices);
    throw new sweet_Exception("Found no invoices to consolidate");
  }
  
  // Add invoices as line items in consolidated invoice
  var consolidatedInvoices = new Array();
  var line = 0;
  nlapiLogExecution('DEBUG', 'Begin adding line items', 'Found ' + searchInvoices.length + ' invoices');

  var i = 0, n = searchInvoices.length;
  for (;i < n; i++) {  
    
    // Get "child"" invoice
    nlapiLogExecution('DEBUG', 'Add invoice', i + ' invoice id: ' + searchInvoices[i].getId());
    var partInvoice = nlapiLoadRecord(searchInvoices[i].getRecordType(), searchInvoices[i].getId());
    consolidatedInvoices.push(searchInvoices[i].getId());
    
    // Prepare fields
    nlapiLogExecution('DEBUG', 'Prepare fieds', '');
    var invoiceNo = partInvoice.getFieldValue('tranid');
    var tranDate = partInvoice.getFieldValue('trandate');
    var datetostring = nlapiStringToDate(tranDate);
    var tranDateMonth = datetostring.getMonth();
    var tranDateYear = datetostring.getFullYear();
    var subTotal = partInvoice.getFieldValue('subtotal');
    var taxTotal = partInvoice.getFieldValue('taxtotal');
    var total = partInvoice.getFieldValue('total');
    var buyer = partInvoice.getFieldValue('custbody_buyer');
    
    // PO number
    /*
    var poNumber = partInvoice.getFieldValue('otherrefnum');
    if (poNumber != null && poNumber.toLowerCase() != 'na' && poNumber.toLowerCase() != 'n/a') {
      cPONumber.push(poNumber);
    }
    */
    
    /*
    if (buyer != null) {
      var buyerEntityId = nlapiLookupField('contact', buyer, 'entityid');
      description += ', Buyer: ' + buyerEntityId;
    }
    */

    // Add line items
    nlapiLogExecution('DEBUG', 'Add line items', '');
    var j = 1, m = partInvoice.getLineItemCount('item') + 1;
    for (;j < m; j++) {
      line++;
      
      // taxrate
      var grossamt = partInvoice.getLineItemValue('item', 'grossamt', j);
      var amount = partInvoice.getLineItemValue('item', 'amount', j);      
      var taxrate = 0;
      if (amount > 0) {
        taxrate = ((grossamt / amount) - 1) * 100;
      }
      
      // description
      var description = partInvoice.getLineItemValue('item', 'description', j);
      if (sweet_empty(description)) {
        description = ' ';
      }
      description += ('[' + invoiceNo + ']');
      
      // displayname
      var item = partInvoice.getLineItemValue('item', 'item', j);
      var itemFields = nlapiLookupField('item', item, ['itemid', 'displayname']);
      var displayName = itemFields['displayname'];
      if (sweet_empty(displayName)) {
        displayName = itemFields['itemid'];
      }
      
      newInvoice.insertLineItem('item', line);
      newInvoice.setLineItemValue('item', 'amount', line, 0);
      newInvoice.setLineItemValue('item', 'item', line, coItem);
      newInvoice.setLineItemValue('item', 'quantity', line, partInvoice.getLineItemValue('item', 'quantity', j));
      newInvoice.setLineItemValue('item', 'custcol_invco_displayname', line, displayName);
      newInvoice.setLineItemValue('item', 'description', line, description);
      newInvoice.setLineItemValue('item', 'custcol_invco_amount', line, amount);
      newInvoice.setLineItemValue('item', 'taxcode', line, partInvoice.getLineItemValue('item', 'taxcode', j));
      newInvoice.setLineItemValue('item', 'custcol_invco_taxrate', line, taxrate.toFixed(2) + '%');
      newInvoice.setLineItemValue('item', 'custcol_invco_tax1amt', line, partInvoice.getLineItemValue('item', 'tax1amt', j)); // Does this work for non-UK invoices?
      newInvoice.setLineItemValue('item', 'custcol_invco_grossamt', line, grossamt);
    }

    // Add empty line
    /*
    if (i < (n - 1)) {
      nlapiLogExecution('DEBUG', 'Add empty line', '');
      line++;
      newInvoice.insertLineItem('item', line);
      newInvoice.setLineItemValue('item','item', line, descriptionItem);
      newInvoice.setLineItemValue('item','taxcode', line, descriptionTaxCode);
    }
    */
    
    // Update totals
    nlapiLogExecution('DEBUG', 'Update totals', '');
    cSubTotal += parseFloat(subTotal);
    cTaxTotal += parseFloat(taxTotal);
    cTotal += parseFloat(total);
  }
  
  // Set PO number
  /*
  cPONumber = sweet_Array_getUnique(cPONumber);
  var sep = ', ';
  if (cPONumber.length < 2) {
    sep = '';
  }
  cPONumber = cPONumber.join(sep);
  if (cPONumber.length > 300) {
    newInvoice.setFieldValue('otherrefnum', 'See message for PO(s)');
    newInvoice.setFieldValue('message', 'PO numbers: ' + cPONumber);
  } else {
    newInvoice.setFieldValue('otherrefnum', cPONumber);
  }
  */

  // Set totals
  nlapiLogExecution('DEBUG', 'Set totals', '');
  newInvoice.setFieldValue('custbody_invco_subtotal', cSubTotal);
  newInvoice.setFieldValue('custbody_invco_taxtotal', cTaxTotal);
  newInvoice.setFieldValue('custbody_invco_total', cTotal);

  // 2 x blank line
  line++;
  newInvoice.insertLineItem('item', line);
  newInvoice.setLineItemValue('item','item', line, descriptionItem);
  newInvoice.setLineItemValue('item','taxcode', line, descriptionTaxCode);
  line++;
  newInvoice.insertLineItem('item', line);
  newInvoice.setLineItemValue('item','item', line, descriptionItem);
  newInvoice.setLineItemValue('item','taxcode', line, descriptionTaxCode);

  // subtotal
  line++;
  newInvoice.insertLineItem('item', line);
  newInvoice.setLineItemValue('item','item', line, descriptionItem);
  newInvoice.setLineItemValue('item','taxcode', line, descriptionTaxCode);
  newInvoice.setLineItemValue('item', 'custcol_invco_taxrate', line, 'Subtotal');
  newInvoice.setLineItemValue('item', 'custcol_invco_grossamt', line, cSubTotal);

  // taxtotal
  line++;
  newInvoice.insertLineItem('item', line);
  newInvoice.setLineItemValue('item','item', line, descriptionItem);
  newInvoice.setLineItemValue('item','taxcode', line, descriptionTaxCode);
  newInvoice.setLineItemValue('item', 'custcol_invco_taxrate', line, 'Tax Total');
  newInvoice.setLineItemValue('item', 'custcol_invco_grossamt', line, cTaxTotal);
  
  // total
  line++;
  newInvoice.insertLineItem('item', line);
  newInvoice.setLineItemValue('item','item', line, descriptionItem);
  newInvoice.setLineItemValue('item','taxcode', line, descriptionTaxCode);
  newInvoice.setLineItemValue('item', 'custcol_invco_taxrate', line, 'TOTAL DUE');
  newInvoice.setLineItemValue('item', 'custcol_invco_grossamt', line, cTotal);
  
  // Save consolidated invoice 
  nlapiLogExecution('DEBUG', 'Save consolidated invoice', '');
  newInvoiceId = nlapiSubmitRecord(newInvoice, true);
  nlapiLogExecution('DEBUG', 'newInvoiceId', newInvoiceId);
  if (newInvoiceId == null) {
    throw new sweet_Exception("Failed to save consolidated invoice");
  }
  newInvoice.setFieldValue('id', newInvoiceId);
  
  // Update invoices with consolidated invoice id
  nlapiLogExecution('DEBUG', 'Update invoices with consolidated invoice id', '');
  for (var s = 0; consolidatedInvoices != null && s < consolidatedInvoices.length; s++) {
    nlapiLogExecution('DEBUG', 'invoice to be updated', consolidatedInvoices[s]);
    var invRecToSave = nlapiLoadRecord('invoice', consolidatedInvoices[s]);
    invRecToSave.setFieldValue('custbody_invco_invoice',newInvoiceId);
    nlapiSubmitRecord(invRecToSave, true);
  }

  return newInvoice;
}
