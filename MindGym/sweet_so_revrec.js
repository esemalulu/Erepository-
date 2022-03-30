var LINE_INCREMENT = 1; // Default
var JOB_STATUS_CANCELLED = '37';

/**
 * Set Rev Rec dates to date of booking
 *
 * @function sweet_so_revrec_setDates
 * @param {nlobjRecord} salesOrder
 */
 // -----------------------------------------------------------------------------------------------------------------------------------------------------SECTION 1
function sweet_so_revrec_setDates(salesOrderID)
{
  nlapiLogExecution('DEBUG', 'Function', 'Start:sweet_so_revrec_setDates');
  
  var salesOrder = nlapiLoadRecord('salesorder', salesOrderID);
  
  nlapiLogExecution('DEBUG', 'Var', 'Number of items=' + (n - 1));
  var change = 0;
  
  for (var i = 1; i < salesOrder.getLineItemCount('item') + 1; i++) 
  {	  	  
    if (salesOrder.getLineItemValue('item','revrecschedule', i) != null)
    {
      var theDate = salesOrder.getLineItemValue('item','custcol_bo_date', i);
      nlapiLogExecution('DEBUG', 'Date', theDate);
    
      salesOrder.setLineItemValue('item','revrecstartdate',i,theDate);
      salesOrder.setLineItemValue('item','revrecenddate',i,theDate);
      change = 1;
    }
  }
  
  if (change == 1) 
  {	  
	try 
   	{
    nlapiSubmitRecord(salesOrder); 
    }
   	catch (e) 
    {
        if(e instanceof nlobjError && e.getCode() && e.getCode().indexOf('RCRD_HAS_BEEN_CHANGED') != -1)
       {
           nlapiLogExecution('DEBUG', 'Exception recovering: ','Exception occured in function : sweet_so_revrec_setDates');
           nlapiLogExecution('DEBUG', 'Exception', e.getCode() + '\n' + e.getDetails());
           nlapiLogExecution('DEBUG', 'Exception recovering: ',salesOrderID);
           sweet_so_revrec_setDates(salesOrderID);
           nlapiLogExecution('DEBUG', 'Recover', 'Recovering complete for SO ' + salesOrderID);
       }
    }
  }
  nlapiLogExecution('DEBUG', 'Function', 'End:sweet_so_revrec_setDates');
}

/**
 * Get accounting period id from date
 *
 * @function get_accounting_period
 * @param String period
 * @return String periodId
 */
function get_accounting_period(period)
{
  var periodStartDate = get_period_start_date(period);
  var periodEndDate = get_period_end_date(period);
  
  var filters = new Array();
  filters.push(new nlobjSearchFilter('startdate', null, 'on', periodStartDate));
  filters.push(new nlobjSearchFilter('enddate', null, 'on', periodEndDate));
  filters.push(new nlobjSearchFilter('isquarter',null,'is','F'));
  filters.push(new nlobjSearchFilter('isyear',null,'is','F'));  
    
  var results = nlapiSearchRecord('accountingperiod', null, filters);
  
  if (results.length = 1) {
    var perioddetails = new Array();
    perioddetails['id'] = results[0].getId();
    var accountingperiod = nlapiLoadRecord('accountingperiod', perioddetails['id']);
    perioddetails['closed'] = accountingperiod.getFieldValue('closed');
    return perioddetails;
  } else {
    nlapiLogExecution('DEBUG', 'ERROR', 'No period found or there is more than one period found');
  }
}

function get_period_start_date(period)
{
  var periodStartDate =  nlapiStringToDate('1/1/' + period.substr(0,4));
  periodStartDate = nlapiAddMonths(periodStartDate, period.substr(5,2)-1);
  return periodStartDate;
}

function get_period_end_date(period)
{
  var periodStartDate = get_period_start_date(period);
  var periodEndDate = nlapiAddDays(nlapiAddMonths(periodStartDate, 1), -1);
  return periodEndDate;
}

/**
 * Get next open period
 *
 * @function get_accounting_period
 * @param String day
 * @return String periodId
 */
function get_open_period_of_day(day)
{
  var filters = new Array();
  filters.push(new nlobjSearchFilter('startdate', null, 'onorbefore', day));
  filters.push(new nlobjSearchFilter('enddate', null, 'onorafter', day));
  filters.push(new nlobjSearchFilter('isquarter',null,'is','F'));
  filters.push(new nlobjSearchFilter('isyear',null,'is','F'));  
    
  var results = nlapiSearchRecord('accountingperiod', null, filters);
  
  if ((results != null) && (results.length = 1)) {
    var periodId = results[0].getId();
    var accountingperiod = nlapiLoadRecord('accountingperiod', periodId);
    if (accountingperiod.getFieldValue('closed') == 'F') { 
      return periodId;
    } else {    
      return 1;
    }
  }
}

/**
 * Get income account id from income amount name
 *
 * @function get_income_account_id
 * @param String incomeaccount
 * @return String incomeaccountId
 */
function get_income_account_id(incomeaccount)
{
  var filter = new nlobjSearchFilter('name', null, 'is', incomeaccount);      
  var results = nlapiSearchRecord('account', null, filter);
  
  if (results.length = 1) { 
    var incomeaccountId = results[0].getId();
    return incomeaccountId;
  } else {
    nlapiLogExecution('DEBUG', 'ERROR', 'No income account found or there is more than one income account');
  }
}

/**
 * Function for sorting arrays
 */
function sortRevRecSchedByPeriod(a, b){
  if (a['period'] > b['period']) {
   return 1;
  } else if (a['period'] < b['period']) {
   return -1;
  } else {
   return 0;
  }
}


// -----------------------------------------------------------------------------------------------------------------------------------------------------SECTION 2
// ----------------------------------------------------------Moved to swee_job_server.js--------------------------------------------------------------


/**
 * Checks if new date is in different accounting period and sends warning if it is
 *
 * @function sweet_so_revrec_checkNewDate
 * @param {String} salesOrderId
 * @param {String} jobId
 * @param {String} revRecOldDate
 * @param {String} revRecNewDate

function sweet_so_revrec_checkNewDate(salesOrderId, jobId, revRecOldDate, revRecNewDate)
{
  // Find sales order item linked to job
  var salesOrder = nlapiLoadRecord('salesorder', salesOrderId);
  

  
  for (var j = 1; j < salesOrder.getLineItemCount('item') + 1; j++) {  
    if (salesOrder.getLineItemValue('item', 'job', j) == jobId) {
      if ((salesOrder.getLineItemValue('item','revrecschedule', j) == null) || (salesOrder.getFieldValue('custbody_so_linkedinvoice') != null)) {
        return;
      }
    }
  }
  
  // Retrieve accounting periods for dates
  var revRecOldPeriod = get_open_period_of_day(revRecOldDate);
  var revRecNewPeriod = get_open_period_of_day(revRecNewDate);
  
  // If accounting periods are not matching send email
  if (revRecOldPeriod != revRecNewPeriod) {
    var subject = 'Rev. rec. to do: date change in sales order ' + salesOrder.getFieldValue('tranid');
    var jobRecord = nlapiLoadRecord('job', jobId);
    var message = subject + ', in job#: ' + jobRecord.getFieldValue('entityid');
		
    //sendEmail(subject, message);
      nlapiSendEmail(-5, 'tess.harvey@themindgym.com', subject, message, null, 'elijah@audaxium.com', null, null, null, true, null, null);	    
	 //nlapiSendEmail(author, recipient, subject, body, cc, bcc, records, attachments, notifySenderOnBounce, internalOnly, replyTo)  
  }  
}
 */


/**
 * Fill RevRec Schedule for contract type advanced billing
 *
 * @function sweet_so_revrec_fillSchedule
 * @param String salesOrderID

function sweet_so_revrec_fillSchedule(salesOrderID)
{
  try {
  nlapiLogExecution('DEBUG', 'Function', 'Start:sweet_so_revrec_fillSchedule');
  var newrevrecsched = new Array();
  
  // Get sales order
  var salesOrder = nlapiLoadRecord('salesorder', salesOrderID);

  // exit if there's no linked invoice
  if(salesOrder.getFieldValue('custbody_so_linkedinvoice') == null) {
    nlapiLogExecution('DEBUG', 'Exit', 'There is no linked invoice');
    return
  }
  // Get linked invoice
  var linkedInvoice = nlapiLoadRecord('invoice', salesOrder.getFieldValue('custbody_so_linkedinvoice'));  
  var linkedInvoiceId = linkedInvoice.getId();
  
  // Get subsidiary of the invoice
  var invsubsidiaryid = linkedInvoice.getFieldValue('subsidiary');
  
  // Get rev rec schedule
  var filter = new nlobjSearchFilter('internalid', null, 'anyof', linkedInvoiceId);
  var searchrevrecs = nlapiSearchRecord('invoice', 'customsearch_inv_revrecschedule', filter);

  if ((searchrevrecs == null) || (searchrevrecs.length != 1)) {
    throw nlapiCreateError('SWEET_REVREC_NOT_UNIQUE_REVRECSCHED', 'There should be one and only one revenue recognition schedule per invoice! Please check the linked invoice ' +
      'is correct and has only one line with revenue recognition schedule.', true);
  }
  
  var revrecid = searchrevrecs[0].getValue('internalid', 'revRecSchedule', 'group');
  var revRecSched = nlapiLoadRecord('revrecschedule',revrecid);

  // Sales orders have multiple items with multiple dates and income accounts
  // Retrieve rev rec amounts for specific period and account
  var filter = new nlobjSearchFilter('custbody_so_linkedinvoice', null, 'anyof', linkedInvoice.getId());
  var searchresults = nlapiSearchRecord('salesorder', 'customsearch_so_by_linked_invoice', filter);
  var soparameters = new Array();
  var sototalrevrecamount = 0;

  for (var i = 0; searchresults != null && i < searchresults.length; i++) {
    var searchresult = searchresults[i];
    var parameters = new Array();

    //get accounting period id
    var period = searchresult.getValue('custcol_bo_date', null, 'group');

    if (period != "") {
      var accperiod = get_accounting_period(period);
      parameters['period'] = accperiod['id']; 
      parameters['closed'] = accperiod['closed'];
    } else {
      throw nlapiCreateError('SWEET_REVREC_NO_DATE_SO_ITEM', 'A sales order item without a date is linked to the invoice. Please correct.', true);
    }

    //get income account id
    var incomeaccount = searchresult.getValue('incomeaccount', 'item', 'group');
    if (incomeaccount != "") {
      parameters['incomeaccount'] = get_income_account_id(incomeaccount); 
    } else {
      throw nlapiCreateError('SWEET_REVREC_NO_INCOME_ACCOUNT_SO_ITEM', 'A sales order item without an income account is linked to the invoice. Please correct.', true);
    }
 
    //get rev rec amount
    var sosubsidiaryid = searchresult.getValue('subsidiary', null, 'group');
    if (invsubsidiaryid == sosubsidiaryid) {
    parameters['revrecamount'] = searchresult.getValue('formulanumeric', null, 'sum');
    } else {      
      var socurrency = searchresult.getValue('currency', 'subsidiary', 'group');  // get currency of sales order subsidiary
      var invsubsidiary = nlapiLoadRecord('subsidiary', invsubsidiaryid); // get currency of invoice subsidiary
      var invcurrencyname = invsubsidiary.getFieldValue('currency');
      var filter = new nlobjSearchFilter('name', null, 'is', invcurrencyname);
      var currsearch = nlapiSearchRecord('currency', null, filter);
      var invcurrency = currsearch[0].getId();
      var convdate = nlapiDateToString(get_period_end_date(period), 'd/m/yyyy');
      nlapiLogExecution('DEBUG', 'convdate', convdate);
      var exchrate = nlapiExchangeRate(socurrency, invcurrency, convdate);
      parameters['revrecamount'] = Math.round((searchresult.getValue('formulanumeric', null, 'sum') * exchrate)*100)/100;
      
      nlapiLogExecution('DEBUG', 'socurrency', socurrency);
      nlapiLogExecution('DEBUG', 'invsubsidiary', invsubsidiary);
      nlapiLogExecution('DEBUG', 'invcurrencyname', invcurrencyname);      
      nlapiLogExecution('DEBUG', 'invcurrency', invcurrency);      
    }

    soparameters.push(parameters);
    sototalrevrecamount = sototalrevrecamount + parseFloat(parameters['revrecamount']);
  }

  // Give error message with outstanding amount if rev rec amount on sales orders is higher than total of rev rec schedule
  // User needs to modify the sales order to invoice outstanding amount
  
  nlapiLogExecution('DEBUG', 'sototalrevrecamount', sototalrevrecamount);
  
  var revrecschedtotal = revRecSched.getFieldValue('totalamount');
  nlapiLogExecution('DEBUG', 'revrecschedtotal', revrecschedtotal);
  var outstandingamount = sototalrevrecamount - revrecschedtotal;
  nlapiLogExecution('DEBUG', 'outstandingamount', outstandingamount);
  if (outstandingamount > 0) {
    throw nlapiCreateError('SWEET_REVREC_OUTSTANDING_AMOUNT', 'The total amount on sales orders is higher than the invoiced amount by ' + outstandingamount +
      '. Please modify sales order to include this amount to be invoiced.', true);
  }
  
  // Iterate through lines of rev rec schedule. Clean up not recognized lines.
  // Add up recognized amounts by income account. 
  var today = new Date();
  var revrecenddate = revRecSched.getFieldValue('enddate');
  if (today > nlapiStringToDate(revrecenddate)) {
    revrecenddate = nlapiAddMonths(today, 6);
  }
  nlapiLogExecution('DEBUG', 'revrecenddate', revrecenddate);
  var lastperiod = get_open_period_of_day(revrecenddate);
  nlapiLogExecution('DEBUG', 'lastperiod', lastperiod);
  if (lastperiod == 1) {
    throw nlapiCreateError('SWEET_REVREC_OPEN_PERIOD', 'You are trying to post a revenue recognition item to a closed or non existent accounting period.', true);
  }
  var recognizedamount = new Array();
  var i = 1, n = revRecSched.getLineItemCount('recurrence') + 1;
  nlapiLogExecution('DEBUG', 'rev rec', 'recognized already');
  
  for (; i < n; i++) {
    revRecSched.selectLineItem('recurrence', i);
    var notbooked = (revRecSched.getCurrentLineItemValue('recurrence','journal') == '- None -');

    if (notbooked) {
      revRecSched.setCurrentLineItemValue('recurrence', 'postingperiod', lastperiod);
      revRecSched.setCurrentLineItemValue('recurrence','recamount', 0);
      revRecSched.commitLineItem('recurrence');
    } else {
      var rrincomeaccount = revRecSched.getCurrentLineItemValue('recurrence','incomeaccount');
      if (typeof recognizedamount[rrincomeaccount] == "undefined") {
        recognizedamount[rrincomeaccount] = new Array();
        recognizedamount[rrincomeaccount]['revrec'] = parseFloat(revRecSched.getCurrentLineItemValue('recurrence','recamount'));
      } else if (recognizedamount[rrincomeaccount]['revrec'] == null) {
        recognizedamount[rrincomeaccount]['revrec'] = parseFloat(revRecSched.getCurrentLineItemValue('recurrence','recamount'));
      } else {
        recognizedamount[rrincomeaccount]['revrec'] = parseFloat(recognizedamount[rrincomeaccount]['revrec']) + parseFloat(revRecSched.getCurrentLineItemValue('recurrence','recamount'));
      }
    nlapiLogExecution('DEBUG', 'rev rec income account', rrincomeaccount);
    nlapiLogExecution('DEBUG', 'rev rec amount', recognizedamount[rrincomeaccount]['revrec']);  
    }
  }      
  
  // Iterate through lines of sales orders. Add up amounts by income account for closed periods.
  // Add open period amounts to the result array
  nlapiLogExecution('DEBUG', 'sales order', 'all items');
  for (var s = 0; s < soparameters.length; s++) {
    nlapiLogExecution('DEBUG', 'line', s);
    nlapiLogExecution('DEBUG', 'incomeaccount', soparameters[s]['incomeaccount']);
    nlapiLogExecution('DEBUG', 'postingperiod', soparameters[s]['period']);
    nlapiLogExecution('DEBUG', 'period closed', soparameters[s]['closed']);
    nlapiLogExecution('DEBUG', 'recamount', soparameters[s]['revrecamount']);
    if (soparameters[s]['closed'] == 'T') {
      var soincomeaccount = soparameters[s]['incomeaccount'];
      if (typeof recognizedamount[soincomeaccount] == "undefined") {
        recognizedamount[soincomeaccount] = new Array();
        recognizedamount[soincomeaccount]['so'] = parseFloat(soparameters[s]['revrecamount']);
        nlapiLogExecution('DEBUG', 'typeof', 'undefined');
      } else if (recognizedamount[soincomeaccount]['so'] == null) {
        recognizedamount[soincomeaccount]['so'] = parseFloat(soparameters[s]['revrecamount']);        
      } else {
        recognizedamount[soincomeaccount]['so'] = parseFloat(recognizedamount[soincomeaccount]['so']) + parseFloat(soparameters[s]['revrecamount']);
      } 
    nlapiLogExecution('DEBUG', 'sum recamount', recognizedamount[soincomeaccount]['so']);
    } else {
      var rrparameters = new Array();
      rrparameters['period'] = soparameters[s]['period'];
      rrparameters['incomeaccount'] = soparameters[s]['incomeaccount'];
      rrparameters['revrecamount'] = soparameters[s]['revrecamount'];
      newrevrecsched.push(rrparameters);   
    }
  }
  
  //find next open period (it is the accounting period today)
  var onemonthago = nlapiAddMonths(today, -1);
  var previousperiod = get_open_period_of_day(onemonthago);
  if (previousperiod != 1) {
    var nowperiod = previousperiod;
  } else {
    var nowperiod = get_open_period_of_day(today);
  }
  nlapiLogExecution('DEBUG', 'rec differences', 'starting');
        
  // Calculate differences between recognized amounts and amounts in sales orders in closed periods.
  for (var rr in recognizedamount) {
    if (recognizedamount[rr]['so'] == null) {
      var rrdifference = - recognizedamount[rr]['revrec'];
    } else if (recognizedamount[rr]['revrec'] == null) {
      var rrdifference = recognizedamount[rr]['so'];
    } else {
      var rrdifference = recognizedamount[rr]['so'] - recognizedamount[rr]['revrec'];
    }
    nlapiLogExecution('DEBUG', 'rr', rr);
    if (rrdifference != 0) {
      var rrparameters = new Array();
      rrparameters['period'] = nowperiod;
      rrparameters['incomeaccount'] = rr;
      rrparameters['revrecamount'] = rrdifference;
      newrevrecsched.push(rrparameters);
      nlapiLogExecution('DEBUG', 'income account', rr);
      nlapiLogExecution('DEBUG', 'difference', rrdifference);
    }
  }
  
  // Set remaining amount and add to the rev rec schedule
  var remainingamount = revrecschedtotal - sototalrevrecamount;
  nlapiLogExecution('DEBUG', 'remainingamount', remainingamount);
  if (remainingamount > 0) {
    var rrparameters = new Array();
    rrparameters['period'] = lastperiod;
    rrparameters['incomeaccount'] = '228';
    rrparameters['revrecamount'] = remainingamount;
    newrevrecsched.push(rrparameters);
  }
  
  // Sort results array
  newrevrecsched.sort(sortRevRecSchedByPeriod);
  
  // Iterate through results array
  var i = 1, n = revRecSched.getLineItemCount('recurrence') + 1;
  for (var s = 0; s < newrevrecsched.length; s++) {
    nlapiLogExecution('DEBUG', 'line', s);
    nlapiLogExecution('DEBUG', 'incomeaccount', newrevrecsched[s]['incomeaccount']);
    nlapiLogExecution('DEBUG', 'postingperiod', newrevrecsched[s]['period']);
    nlapiLogExecution('DEBUG', 'recamount', newrevrecsched[s]['revrecamount']);
    
    // Find next empty line in rev rec schedule    
    while ((revRecSched.getLineItemValue('recurrence', 'recamount', i) != 0) && (i < n))  {
      i++;
    }

    //If found empty line
    if (i < n) {
      nlapiLogExecution('DEBUG', 'To do', 'Updating line items');
      revRecSched.selectLineItem('recurrence', i);
      revRecSched.setCurrentLineItemValue('recurrence', 'incomeaccount', newrevrecsched[s]['incomeaccount']);
      revRecSched.setCurrentLineItemValue('recurrence', 'postingperiod', newrevrecsched[s]['period']);
      revRecSched.setCurrentLineItemValue('recurrence','recamount', newrevrecsched[s]['revrecamount']);
      revRecSched.commitLineItem('recurrence');
    } else {
    //Raise error message to add more empty lines to the rev rec schedule
      throw nlapiCreateError('SWEET_REVREC_EMPTY_LINE', 'Please add empty lines to the revenue recognition schedule.', true);
    } 
  }

  nlapiSubmitRecord(revRecSched,true); 

  } 
  catch (e) 
  {
    var message = 'Rev. rec. ERROR in sales order ' + salesOrder.getFieldValue('tranid') + ': ';
    var subject = message;
    
    if (e instanceof nlobjError) {
      message += '(' + e.getCode() + ') ' + e.getDetails();
    } else {
      message += e.toString();
    }    
    // Send email
    //sendEmail(subject, message); 
      nlapiSendEmail(-5, 'tess.harvey@themindgym.com', subject, message, null, 'elijah@audaxium.com', null, null, null, true, null, null);	  
	 //nlapiSendEmail(author, recipient, subject, body, cc, bcc, records, attachments, notifySenderOnBounce, internalOnly, replyTo)  
	
    // Throw exception
    throw e;
  }
}

 */



