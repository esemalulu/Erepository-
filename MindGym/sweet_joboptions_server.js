
/**
 * Before submit
 *
 * @param type
 * @return void
 */
function userevent_beforeSubmit(type)
{
  nlapiLogExecution('DEBUG', 'userevent_beforeSubmit', 'Begin');
  
  try {
    switch (type.toLowerCase()) {
      case 'edit':
      case 'create':
        updateAddressText();
        break;
    }
  } catch (e) {
    if (e instanceof nlobjError) {
      nlapiLogExecution('DEBUG', 'Exception', e.getCode() + '\n' + e.getDetails());
    }
    nlapiLogExecution('DEBUG', 'Exception', e.toString());
    throw e;
  }
  
  nlapiLogExecution('DEBUG', 'userevent_beforeSubmit', 'Exit Successfully');
}

/**
 * After submit
 *
 * @param type
 * @return void
 */
function userevent_afterSubmit(type)
{
  nlapiLogExecution('DEBUG', 'userevent_afterSubmit', 'Begin');
  
  try {
    switch (type.toLowerCase()) {
      case 'edit':
        updateTransaction();
        break;
    }
  } catch (e) {
    if (e instanceof nlobjError) {
      nlapiLogExecution('DEBUG', 'Exception', e.getCode() + '\n' + e.getDetails());
    }
    nlapiLogExecution('DEBUG', 'Exception', e.toString());
    throw e;
  }
  
  nlapiLogExecution('DEBUG', 'userevent_afterSubmit', 'Exit Successfully');
}

/**
 * Update read-only address text
 */
function updateAddressText()
{
  nlapiLogExecution('DEBUG', 'updateAddressText', 'Begin');
  
  var addressId = nlapiGetFieldValue('custrecord_jobopt_address');
  if (addressId) {
    var addressText = '';
    var address = nlapiLoadRecord('customrecord_address', addressId);
    var addressee = address.getFieldValue('custrecord_ad_addressee');
    if (addressee) {
      addressText += addressee;
    }
    var address1 = address.getFieldValue('custrecord_ad_address1');
    if (address1) {
      addressText += '\n' + address1;
    }
    var address2 = address.getFieldValue('custrecord_ad_address2');
    if (address2) {
      addressText += '\n' + address2;
    }
    var city = address.getFieldValue('custrecord_ad_city');
    if (city) {
      addressText += '\n' + city;
    }
    var postcode = address.getFieldValue('custrecord_ad_postcode');
    if (postcode) {
      addressText += ', ' + postcode;
    }
    var countryId = address.getFieldValue('custrecord_ad_country');
    var countryName = '';
    if (countryId) {
      var country = nlapiLoadRecord('customrecord_country', countryId);
      countryName = country.getFieldValue('name');
    }
    if (countryName) {
      addressText += '\n' + countryName;
    }
    
    nlapiSetFieldValue('custrecord_jobopt_addresstext', addressText);
  }
  
  nlapiLogExecution('DEBUG', 'updateAddressText', 'Exit Successfully');
}

/**
 * Update transaction item options
 */
function updateTransaction()
{
  nlapiLogExecution('DEBUG', 'updateTransaction', 'Begin');
  
  var newRecord = nlapiGetNewRecord();
  var transactionId = newRecord.getFieldValue('custrecord_jobopt_transaction');
  var transactionType = newRecord.getFieldValue('custrecord_jobopt_transtype');
  var lineId = newRecord.getFieldValue('custrecord_jobopt_translineid');
  var updateItemOptions = (newRecord.getFieldValue('custrecord_jobopt_updateitemoptions') == 'T');
  
  if (updateItemOptions && transactionId && transactionType && lineId) {
    var transaction = nlapiLoadRecord(transactionType, transactionId);
    
    // Update the correct line item based on line ID
    var update = false;
    var i = 1, n = transaction.getLineItemCount('item') + 1;
    for (;i < n; i++) {
      if (transaction.getLineItemValue('item', 'custcol_lineid', i) == lineId) {
        transaction.setLineItemValue('item', 'custcol_bo_course', i, newRecord.getFieldValue('custrecord_jobopt_course'));
        transaction.setLineItemValue('item', 'custcol_bo_date', i, newRecord.getFieldValue('custrecord_jobopt_date'));
        transaction.setLineItemValue('item', 'custcol_bo_time', i, newRecord.getFieldValue('custrecord_jobopt_time'));        
        update = true;
      }
    }
    if (update) {
      nlapiLogExecution('DEBUG', 'Info', 'Update item options on transaction/lineid: ' + transactionId + '/' + lineId);
      nlapiSubmitRecord(transaction);
    }
  }
  
  nlapiLogExecution('DEBUG', 'updateTransaction', 'Exit Successfully');
}