/**
 * UI suitelet to run script that fixes item options
 */
function suitelet_main(request, response)
{
  try {
    nlapiLogExecution('DEBUG', 'Start', 'Item options fix');
    
    var message = false;
    var form = nlapiCreateForm("Fix item options");
    
    // Parameters
    var trans_id = (request.getParameter("trans_id") == null) ? '' : request.getParameter("trans_id");
    var stage = (request.getParameter("stage") == null) ? '1' : request.getParameter("stage");
    
    // Transaction
    var fldTrans = form.addField('trans_id', 'select', 'Transaction', 'transaction');
    
    // Stage (hidden)
    var fldStage = form.addField('stage', 'text');
    fldStage.setDefaultValue('1');
    fldStage.setDisplayType('hidden');
    
    // Submit button
    form.addSubmitButton('Submit');
    
    if (request.getMethod() == 'POST') {
      if (stage == '1') {
        var error = false;
        if (trans_id < 1) {
          message = "Oops! Please select a transaction first.";
          error = true;
        }
        
        // Schedule script
        if (!error) {
          //nlapiLogExecution('DEBUG', 'calling scheduled script', 'startdate : enddate : customer = ' + startdate + ' : ' + enddate + ' : ' + customer);
          //var scriptStatus = nlapiScheduleScript('customscript_invco_customer', 'customdeploy_invco_customer', {'custscript_invco_startdate' : startdate, 'custscript_invco_enddate' : enddate, 'custscript_invco_customer' : customer});
          //nlapiLogExecution('DEBUG', 'scheduled script status', scriptStatus);
          
          transaction = nlapiLoadRecord('estimate', trans_id);
          fixItemOptions(transaction);
          
          //if (scriptStatus != 'QUEUED') {
            //message = "Oops! I was not able to start this task. It might be because someone else is consolidating invoices. Please try again later and if still doesn't work contact the Administrator.";
          //} else {
            //message = "This process will take a few minutes to run. You'll get an email when it's completed.";
          //}
        }
      }
    }
    
    // Display message
    if (message) {
      var fldMessage = form.addField('message', 'inlinehtml');
      fldMessage.setDefaultValue(message);
      fldMessage.setDisplayType("inline");
      fldMessage.setLayoutType("outsideabove");
    }
    
    // Write page
    response.writePage(form);
  } catch (e) {
    if (e instanceof nlobjError) {
      nlapiLogExecution('DEBUG', 'Exception', e.getCode() + '\n' + e.getDetails() );
    } else {
      nlapiLogExecution('DEBUG', 'Exception', e.toString() );
    }
  }

}

/**
 * Fix item options
 *
 * @param transaction
 * @return void
 */
function fixItemOptions(transaction)
{
  nlapiLogExecution('DEBUG', 'Start', 'Fix item options');
  
  // Loop through all line items
  var save = false;
  var line = 0;
  var i = 1, n = transaction.getLineItemCount('item') + 1;
  for (;i < n; i++) {
    line++;
    
    // Get item options
    var options = transaction.getLineItemValue('item', 'options', line);
    if (options != null) {
      
      //nlapiLogExecution('DEBUG', 'Before', 'options=' + options);
      
      options = options2array(options);
      
      // Loop through all the options
      var j = 0, m = options.length;
      for (j; j < m; j++) {
        
        // Looking specifically for these options...
        switch (options[j][0]) {
          case 'CUSTCOL_BO_BOOSTER':
          case 'CUSTCOL_BO_GOLARGE':
          case 'CUSTCOL_BO_SPRINT':
          case 'CUSTCOL_BO_VIRTUALWORKOUT':
          case 'CUSTCOL_BO_WORKOUT':
            
            // Fix #1
            // Copy field to course option
            options = setOption(options, 'CUSTCOL_BO_COURSE', 2, 'Course'); // object type
            options = setOption(options, 'CUSTCOL_BO_COURSE', 3, options[j][3]); // course id
            options = setOption(options, 'CUSTCOL_BO_COURSE', 4, options[j][4]); // course name
            
            // Update line item
            transaction.setLineItemValue('item', 'options', line, array2options(options));
            save = true;
            break;
        }
      }
      
      //nlapiLogExecution('DEBUG', 'After', 'options=' + array2options(options));
      
      if (save) {
        nlapiSubmitRecord(transaction, false, true); // no sourcing + ignore mandatory
        nlapiLogExecution('DEBUG', 'SubmitRecord', 'Record has been submitted');
      }
    }
  }
  
  nlapiLogExecution('DEBUG', 'End', 'Fix item options');
}

/**
 * Convert item options string to array
 */
function options2array(options)
{
  nlapiLogExecution('DEBUG', 'Start', 'options2array');

  var arr = new Array();
  options = options.split("\u0004"); // Break up options
  var i = 0, n = options.length;
  for (i; i < n; i++) {
    arr[i] = options[i].split("\u0003"); // Break up values
  }

  nlapiLogExecution('DEBUG', 'End', 'options2array');
  return arr;
}

/**
 * Convert array to item options string
 */
function array2options(arr)
{
  nlapiLogExecution('DEBUG', 'Start', 'array2options');
  
  var i = 0, n = arr.length;
  for (i; i < n; i++) {
    arr[i] = arr[i].join("\u0003"); // Merge values
  }
  
  nlapiLogExecution('DEBUG', 'End', 'array2options');
  return arr.join("\u0004"); // Merge options
}

/**
 * Helper function to update option array
 */
function setOption(options, key, index, value)
{
  var i = 0, n = options.length;
  for (i; i < n; i++) {
    if (options[i][0] == key) {
      options[i][index] = value;
    }
  }
  return options;
}

