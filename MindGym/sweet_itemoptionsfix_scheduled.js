
var sweet_adminEmployeeId = '2'; // Andre Borgstrom

/**
 * Main
 */
function scheduled_itemOptionsFix(type)
{
  nlapiLogExecution('DEBUG', 'Start', 'scheduled_itemOptionsFix');
  
  // Metering
  // 600 seconds (10 minutes)
  // 10,000 units
  var maxUnits = 10000;
  var minUnits = 100; // to end the script gracefully
  
  try {
    
    // Get list of transactions to process
    //var transactions = nlapiSearchRecord('transaction', 'customsearch_script_itemoptionfix'); // Max 1,000 records
    var transactions = nlapiSearchRecord('transaction', 'customsearch_script_descriptioncleanup');
    
    var transCount = 0;
    var processed = new Array();
    var transProcessed = 0;
      
    if (transactions) {
      var i = 0; transCount = transactions.length;
      nlapiLogExecution('DEBUG', 'transCount', transCount);
      
      for (; i < transCount; i++) {
        
        // Check metering
        var remainingUnits = nlapiGetContext().getRemainingUsage();
        if (remainingUnits < minUnits) {
          nlapiLogExecution('DEBUG', 'Unit usage limit has been hit', 'Remaining units: ' + remainingUnits);
          break;
        }
        
        nlapiLogExecution('DEBUG', 'i=' + i, 'type=' + transactions[i].getRecordType() + ' id=' + transactions[i].getId() + ' usage=' + remainingUnits);
        
        // Do grouping here instead of in saved search because otherwise getRecordType doesn't work
        if (processed[transactions[i].getId()] == undefined) { // Have we processed this record before?
          var transaction = nlapiLoadRecord(transactions[i].getRecordType(), transactions[i].getId());
          //fixItemOptions(transaction);
          nlapiSubmitRecord(transaction, false, true); // no sourcing + ignore mandatory
          processed[transactions[i].getId()] = true;
          transProcessed++;
        }
      }
    }
    
    // Send an update
    subject = "Item Option Fix Script has completed";
    body = "Transactions found: " + transCount + "\n\n" +
      "Transactions processed: " + transProcessed + "\n\n" +
      "Remaining units: " + remainingUnits + "\n\n";
    nlapiSendEmail(sweet_adminEmployeeId, sweet_adminEmployeeId, subject, body);
    
  } catch (e) {
    if (e instanceof nlobjError) {
      nlapiLogExecution('ERROR', 'Exception', e.getCode() + '\n' + e.getDetails());
    } else {
      nlapiLogExecution('ERROR', 'Exception', e.toString());
    }
  }
  
  nlapiLogExecution('DEBUG', 'End', 'scheduled_itemOptionsFix');
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
  
  nlapiLogExecution('AUDIT', 'Fix item options', 'Transaction Id: ' + transaction.getId());
  
  // Loop through all line items
  var save = false;
  var line = 0;
  var i = 1, n = transaction.getLineItemCount('item') + 1;
  for (;i < n; i++) {
    line++;
    
    // Get item options
    var oldOptions = transaction.getLineItemValue('item', 'options', line);
    if (oldOptions != null) {
      
      options = options2array(oldOptions);
      
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
            newOptions = array2options(options);
            if (newOptions.length >= oldOptions.length) { // Sanity check
              transaction.setLineItemValue('item', 'options', line, newOptions);
              save = true;
            } else {
              nlapiLogExecution('ERROR', 'Potential problem', 'New options string is shorter than old. Transaction id: ' + transaction.getId());
              
              // Send an error message
              subject = "NetSuite Script Error";
              body = "Script: Item Option Fix Script\n" +
                "Error: New options string is shorter than old.\n\n" +
                "Transaction id: " + transaction.getId() + "\n\n" +
                "Before:\n" + oldOptions + "\n\n" +
                "After:\n" + newOptions + "\n\n";                
              nlapiSendEmail(sweet_adminEmployeeId, sweet_adminEmployeeId, subject, body);
            }
            break;
        }
      }
    }
  }
  if (save) {
    nlapiSubmitRecord(transaction, false, true); // no sourcing + ignore mandatory
    nlapiLogExecution('AUDIT', 'SubmitRecord', 'Record has been submitted. Transaction Id: ' + transaction.getId());
  }
  
  nlapiLogExecution('DEBUG', 'End', 'Fix item options');
}

/**
 * Convert item options string to array
 */
function options2array(options)
{
  var arr = new Array();
  options = options.split("\u0004"); // Break up options
  var i = 0, n = options.length;
  for (i; i < n; i++) {
    arr[i] = options[i].split("\u0003"); // Break up values
  }
  return arr;
}

/**
 * Convert array to item options string
 */
function array2options(arr)
{
  var i = 0, n = arr.length;
  for (i; i < n; i++) {
    arr[i] = arr[i].join("\u0003"); // Merge values
  }
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

