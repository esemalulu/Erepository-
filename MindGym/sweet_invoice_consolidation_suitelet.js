/**
 * Invoice consolidation suitlet
 *
 * @throws sweet_Exception
 * @return void
 */
function main(request, response)
{
  try {
    nlapiLogExecution('DEBUG', 'start of invoice consolidation', 'start');
    var form = nlapiCreateForm("Invoice Consolidation");

    // Dates
    var dateToday = new Date();
    var dateLastMonth = new Date();
    nlapiLogExecution('DEBUG', 'first date details', 'dateLastMonth: ' + dateLastMonth);

    var prevMonth = (dateLastMonth.getMonth());
    var prevYear = dateLastMonth.getFullYear();
    var lastDay = sweet_Date_getDaysInMonth(dateLastMonth);	
    nlapiLogExecution('DEBUG', 'date details', 'prevMonth: ' + prevMonth + ' prevYear: ' + prevYear);

    var firstDayLastMonth = nlapiDateToString(new Date(prevYear, prevMonth, 1));
    var lastDayLastMonth = nlapiDateToString(dateLastMonth);
    nlapiLogExecution('DEBUG', 'date details', 'firstDayLastMonth: ' + firstDayLastMonth + 'lastDayLastMonth: ' + lastDayLastMonth);

    // Fields & Parameters
    var type = (request.getParameter("consolidationtype") == null) ? "1" : request.getParameter("consolidationtype");
    var customer = (request.getParameter("customer") == null) ? null : request.getParameter("customer");
    var startdate = (request.getParameter("startdate") == null) ? firstDayLastMonth : request.getParameter("startdate");
    var enddate = (request.getParameter("enddate") == null) ? lastDayLastMonth : request.getParameter("enddate");
    var stage = (request.getParameter("stage") == null) ? 'start' : request.getParameter("stage");

    if (request.getMethod() == 'GET' || stage == 'start') {
      
      // Build and display form

    // Customer (aka client)
    var fldCustomer = form.addField('customer', 'select', 'Client', 'customer');

    // Type of consolidation
    var fldType = form.addField('consolidationtype', 'select', 'Type of Consolidation', 'customlist_invco_type');
    fldType.setDefaultValue(type);

    // Start date
    var fldStartDate = form.addField('startdate', 'date', 'Start Date');
    fldStartDate.setDefaultValue(startdate);

    // End date
    var fldEndDate = form.addField('enddate', 'date', 'End Date');
    fldEndDate.setDefaultValue(enddate);

    // Stage (hidden)
    var fldStage = form.addField('stage','text');
    fldStage.setDefaultValue('process');
    fldStage.setDisplayType('hidden');

    nlapiLogExecution('DEBUG', 'dates', 'startdate: ' + startdate + ' enddate: ' + enddate);
    nlapiLogExecution('DEBUG', 'submit form', 'form');

    // Submit button
    form.addSubmitButton('Submit');
    } else if (request.getMethod() == 'POST') {
      nlapiLogExecution('DEBUG', 'post', '');

      // Handle submitted form
      var message = null;
      var error = false;

      // Form validation
      if (sweet_empty(startdate)) {
        message = "Oops! You forgot to enter the start date. Please try again.";
        error = true;
      }
      if (sweet_empty(enddate)) {
        message = "Oops! You forgot to enter the end date. Please try again.";
        error = true;
      }
      if (sweet_empty(customer)) {
        message = "Oops! You forgot to select the client. Please try again.";
        error = true;
      }

      // Schedule script
      if (!error) {
        nlapiLogExecution('DEBUG', 'calling scheduled script', 'startdate : enddate : customer = ' + startdate + ' : ' + enddate + ' : ' + customer);
        var scriptStatus = nlapiScheduleScript('customscript_invco_customer', 'customdeploy_invco_customer', {'custscript_invco_startdate' : startdate, 'custscript_invco_enddate' : enddate, 'custscript_invco_customer' : customer});
        nlapiLogExecution('DEBUG', 'scheduled script status', scriptStatus);

        if (scriptStatus != 'QUEUED') {
          message = "Oops! I was not able to start this task. It might be because someone else is consolidating invoices. Please try again later and if still doesn't work contact the Administrator.";
        } else {
          message = "This process will take a few minutes to run. You'll get an email when it's completed.";
        }
      }

      // Display message
      var fldMessage = form.addField('message', 'inlinehtml');
      fldMessage.setDefaultValue(message);
      fldMessage.setDisplayType("inline");
      fldMessage.setLayoutType("outsideabove");
      var fldStage = form.addField('stage', 'text');
      fldStage.setDefaultValue('start');
      fldStage.setDisplayType('hidden');
      form.addSubmitButton("Go Back");
    }
    response.writePage(form);
  } catch (e) {
    if (e instanceof nlobjError) {
      nlapiLogExecution('DEBUG', 'Exception', e.getCode() + '\n' + e.getDetails() );
    } else {
      nlapiLogExecution('DEBUG', 'Exception', e.toString() );
    }
  }
}
