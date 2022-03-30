/**
 * Transaction function library
 * June 18th 2015: Aux: Can be removed once verified
 */

/**
 * Update sales funnel data on quote
 *
 * @param {int} quoteId
 * @return {int}
 */
sweet_lib_updateSalesFunnelDataOnQuote = function(quoteId) {
  var salesOrderCount = sweet_lib_countSalesOrdersByQuoteId(quoteId);
  var invoiceCount = sweet_lib_countInvoicesByQuoteId(quoteId);
  var quote = nlapiLoadRecord('estimate', quoteId);
  //quote.setFieldValue('custbody_sales_order_count', salesOrderCount);
  quote.setFieldValue('custbody_invoice_count', invoiceCount);
  nlapiSubmitRecord(quote,true,true);
};

/**
 * Count sales orders associated with quote
 *
 * @param {int} quoteId
 * @return {int}
 */
sweet_lib_countSalesOrdersByQuoteId = function(quoteId) {
  
  // Add offset
  var filter = new Array();
  filter.push(new nlobjSearchFilter('createdfrom', null, 'is', quoteId));
  filter.push(new nlobjSearchFilter('mainline', null, 'is', 'T'));
  
  // Search
  var columns = new Array();
  columns.push(new nlobjSearchColumn('internalid'));
  var records = nlapiSearchRecord('salesorder', null, filter, columns);
  
  return records ? records.length : 0;
}

/**
 * Count invoices associated with quote
 *
 * @param {int} quoteId
 * @return {int}
 */
sweet_lib_countInvoicesByQuoteId = function(quoteId) {
  
  // Add offset
  var filter = new Array();
  filter.push(new nlobjSearchFilter('createdfrom', null, 'is', quoteId));
  filter.push(new nlobjSearchFilter('mainline', null, 'is', 'T'));
  
  // Search
  var columns = new Array();
  columns.push(new nlobjSearchColumn('internalid'));
  var records = nlapiSearchRecord('invoice', null, filter, columns);
  
  return records ? records.length : 0;
}
