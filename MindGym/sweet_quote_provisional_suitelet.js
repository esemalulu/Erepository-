
var SWEET_JOB_SCHEDULED_THRESHOLD = 1000;
var SWEET_STATUS_PROVISIONAL = '68';

/**
 * Quote Provisional Suitelet
 *
 * @function sweet_main
 * @param {Object} request
 * @param {Object} response
 */
function sweet_quote_provisional_suitelet(request, response)
{
  try {
    
    // Validate quote id
    var quoteId = request.getParameter('custparamquote');
    if (!quoteId) {
      quoteId = request.getParameter('quote');
    }
    if (!quoteId) {
      throw nlapiCreateError('SWEET_QUOTE_REQD', 'Quote parameter is required.', true);
    }
    
    // Load quote
    var quote = nlapiLoadRecord('estimate', quoteId);
    
    // Validate items
    sweet_quote_lib_validateRecord(quote);

    // Count number of lines that requires a job
    var i = 1, n = quote.getLineItemCount('item') + 1;
    nJobs = 0;
    for (; i < n; i++) {
      if (quote.getLineItemValue('item', 'custcol_job_isjob', i) == 'T') {
        nJobs++;
      }
    }

    // Set approved by field
    //quote.setFieldValue('custbody_so_approvedby', nlapiGetUser());
    
    // Set quote status
    quote.setFieldValue('entitystatus', SWEET_STATUS_PROVISIONAL);
    
    // Create jobs
    //if (nJobs >= SWEET_JOB_SCHEDULED_THRESHOLD) {

      //nlapiLogExecution('DEBUG', 'Info', 'Schedule provision script.');

      // Flag quote as 'provision in progress'
      //quote.setFieldValue('custbody_locked', 'T');
      //quote.setFieldValue('custbody_so_approvalinprogress', 'T');
      //quote.setFieldValue('custbody_show_message', 'T');

      // Schedule script
      //var params = new Array();
      //params['custscript_quote'] = quote.getId();
      //nlapiScheduleScript('customscript_quote_provision_scheduled', 'customdeploy_quote_provision_scheduled', params);

    //} else {
      sweet_quote_lib_createJobs(quote);
      nlapiSubmitRecord(quote); // Save
    //}
    
    nlapiSetRedirectURL('RECORD', 'estimate', quoteId);      
    
    
    /*
    // Build form
    var form = nlapiCreateForm('New Provisional Quote', false);
      
    // Text field
    var field = form.addField('custpage_text', 'text', '');
    field.setDefaultValue('Due to the number of items on this quote it will take slightly longer make provisional. You will be notified by email when the process is completed.');
    field.setDisplayType('inline');
    field.setLayoutType('normal', 'startcol');
    
    // Has form been submitted?
    if (request.getMethod() == 'POST') {
      
      // Redirect to quote record
      nlapiSetRedirectURL('RECORD', 'estimate', quoteId);
    }
    
    // Text field
    var field = form.addField('quote', 'text');
    field.setDefaultValue(quoteId);
    field.setDisplayType('hidden');

    // Buttons
    form.addSubmitButton('    Ok    ');
    response.writePage(form);
    */
    
  } catch (e) {
    if (e instanceof nlobjError) {
      throw nlapiCreateError('SWEET_SCRIPT_EXCEPTION', 'Error: ' + e.getCode() + '\n' + e.getDetails());
    }
    throw nlapiCreateError('SWEET_SCRIPT_EXCEPTION', 'Error: ' + e.toString());
  }
}
