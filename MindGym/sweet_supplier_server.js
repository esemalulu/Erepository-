var SWEET_SUPPLIER_CATEGORY_COACH = '5';

/**
 * Before load event
 */
function userevent_beforeLoad(type, form)
{
  nlapiLogExecution('DEBUG', 'Begin', 'userevent_beforeLoad');
  try {

    // What type of supplier is this?
    switch (nlapiGetFieldValue('category')) {
      case SWEET_SUPPLIER_CATEGORY_COACH:
        coach_beforeLoad(type, form);
        break;
    }
  } catch (e) {
    if (e instanceof nlobjError) {
      nlapiLogExecution('DEBUG', 'Exception', e.getCode() + '\n' + e.getDetails());
    } else {
      nlapiLogExecution('DEBUG', 'Exception', e.toString());
    }
  }
  nlapiLogExecution('DEBUG', 'Exit', 'Successfully');
}

/**
 * Before loading coach form
 */
function coach_beforeLoad(type, form)
{
  var currentContext = nlapiGetContext();

  // If record is edited or viewed using the UI
  if ((currentContext.getExecutionContext() == 'userinterface') && (type == 'edit' | type == 'view')) {
    // Add a Calendar button (requires Neocortex id)
    //if (nlapiGetFieldValue('custentity_neocortex_id') != null) {

      // Create url
      var neocortexId = nlapiGetFieldValue('custentity_neocortex_id');
      var calendarUrl = nlapiResolveURL('SUITELET','customscript_coachcalendar_suitelet', 1, true);
      calendarUrl += '&coachid=' + nlapiGetRecordId();
      calendarUrl += '&neoid=' + neocortexId;
      var onClick = "window.location.href='" + calendarUrl + "'";

      // Add button
      form.addButton('custpage_sup_coachcalendar', 'Coach Calendar', onClick);
    //}
  }
}
