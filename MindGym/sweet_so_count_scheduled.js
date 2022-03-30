/**
 * Count number of sales orders per quote
 */

/**
 * Main
 *
 */
function main_scheduled() {
  
  var script = new SweetScriptScheduled();
  script.debug = true;
  script.employeeId = '2'; // Andre Borgstrom
  script.run();
}

/**
 * SweetScriptScheduled Class
 *
 */
var SweetScriptScheduled = function() {
  
  this.log = new Array();
  this.debug = false;
  this.reschedule = false;
  this.employeeId = -1;
  this.action = undefined;
	this.name = "Sales Order Count";
	this.context = undefined;

  this._log = function(message) {
    this.log.push(message);
    nlapiLogExecution('DEBUG', 'Info', message);
  }
    
  /**
   * Start hook
   *
   * @return void
   */
  this._start = function() {
    this._log('Start of script');
  }

  /**
   * End hook
   *
   * @return void
   */
  this._end = function() {
    this._log('End of script');
    if (this.debug) {
      var subject = '[NetSuite] ' + this.name;
      var body = this.log.join('\n');
      this._sendEmail(subject, body);
    }
  }

  /**
   * Run script
   *
   * @return void
   */
  this.run = function() {
    this._start();
    
    this.context = nlapiGetContext();
    var startTime = new Date().getTime();

    // Get offset
    var offset = this.context.getSetting('SCRIPT', 'custscript_so_count_offset');
    if (!offset) {
      offset = 0;
    }
    this._log('Offset = ' + offset);
    
    // Find all quotes
    var batchSize = 1000;
    var quotes = this._findQuotes(offset);
    
    // Do we have any quotes?
    if (!quotes) {
      
      // No, exit the script
      this._log('Found no quotes to process.');
      this._end();
      return;
    }
    
    // Yes, process the quotes
    var n = quotes.length;
    this._log('Found ' + n + ' quotes to process.');
    var i = 0;
    for (; i < n; i++) {
      var quoteId = quotes[i].getId();
      var params = new Object();
      params.custscript_so_count_offset = quoteId;
        
      // Check script usage
      var remainingUsage = this.context.getRemainingUsage();
      this._log('Remaining usage: ' + remainingUsage);
      var nowTime = new Date().getTime();
      var elapsedTime = ((nowTime - startTime) / 1000); // in seconds
      this._log('Time elapsed: ' + elapsedTime);
      
      // Are we running out of credits?
      if (remainingUsage < 500 || elapsedTime > 360) {
        
        // Yes, let's reschedule the script
        var status = this._reschedule(params);
        this._log('Reschedule script - Out of credits (status: ' + status + ')');
        this._end();
        return;
      }
      
      // Update the Sales Order Count field on the Quote record
      try {
        var salesOrderCount = this._countSalesOrders(quoteId);
        var invoiceCount = this._countInvoices(quoteId);
        var quote = nlapiLoadRecord('estimate', quoteId);
        //quote.setFieldValue('custbody_sales_order_count', salesOrderCount);
        quote.setFieldValue('custbody_invoice_count', invoiceCount);
        nlapiSubmitRecord(quote);
        this._log('Sucessfully updated quote: ' + quoteId);
      } catch (e) {
        this._log('Failed to process quote: ' + quoteId);
        
        if (e instanceof nlobjError) {
          var errorMessage = e.getCode() + ': ' + e.getDetails();
        } else {
          var errorMessage = e.toString();
        }
        
        this._log('Error: ' + errorMessage);
      }
    }
    
    // Are there more records that we should process?
    if (n == batchSize) {
      
      // Yes (very likely), let's reschedule the script
      var status = this._reschedule(params);
      this._log('Reschedule script - Next batch (status: ' + status + ')');
      this._end();
      return;
    }
    
    // Exit
    this._log('Finished processing all quotes.');
    this._end();
  }
  
  /**
   * Reschedule this script
   *
   * @params {Object} params
   */
  this._reschedule = function(params) {
    return nlapiScheduleScript(this.context.getScriptId(), this.context.getDeploymentId(), params);
  }
  
  /**
   * Find quotes
   *
   * Maximum number of returned results are 1,000
   *
   * @return void
   */
  this._findQuotes = function(offset) {
    
    // Add offset
    var filter = new Array();
    filter.push(new nlobjSearchFilter('internalidnumber', null, 'greaterthanorequalto', offset));
    
    // Search
    var columns = new Array();
    columns.push(new nlobjSearchColumn('internalid'));
    return nlapiSearchRecord('transaction', 'customsearch_script_quote_list', filter, columns);
  }
  
  /**
   * Count sales orders associated with quote
   *
   * @param {int} quoteId
   * @return {int}
   */
  this._countSalesOrders = function(quoteId) {
    
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
  this._countInvoices = function(quoteId) {
    
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
  
  /**
   * Send email
   *
   * @param {String} subject
   * @param {String} body
   */
  this._sendEmail = function(subject, body) {
    nlapiSendEmail(this.employeeId, this.employeeId, subject, body);
  }
}
