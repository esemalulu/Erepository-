/**
 * Transaction function library
 */

/**
 * Constants
 */
var SWEET_PAYMENTMETHOD_INVOICE = '1';
var SWEET_PAYMENTMETHOD_INVOICEWITHPO = '2';
var SWEET_PAYMENTMETHOD_CARD = '3';
var SWEET_SUBSIDIARY_UK = '2';
var SWEET_SUBSIDIARY_US = '3';
var SWEET_SUBSIDIARY_UAE = '5';
var SWEET_SUBSIDIARY_SGD = '4';
var SWEET_CURRENCY_GBP = '1';
var SWEET_CURRENCY_USD = '2';
var SWEET_CURRENCY_CAD = '3';
var SWEET_CURRENCY_EUR = '4';
var SWEET_CLIENTMESSAGE_PARENTGYM = '6';
var SWEET_INVOICE_FORM_UK = '121';
var SWEET_INVOICE_FORM_US = '129';

/**
 * Validate payment method details
 *
 * @param {Boolean} displayWarning (default: true)
 * @return bool
 */
function transactionFormLib_validatePaymentMethod(displayWarning) {
  
  var valid = true;
  
  if (displayWarning == null) {
    displayWarning = true; // Set default value
  }
  
  var paymentMethod = nlapiGetFieldValue('custbody_paymentmethod');

  switch (paymentMethod) {
    case SWEET_PAYMENTMETHOD_INVOICEWITHPO:
      var otherRefNum = nlapiGetFieldValue('otherrefnum'); // PO #
      if (otherRefNum.length < 1) {
        valid = false;
        if (displayWarning) {
          alert("The payment method requires that you enter a PO #.");
        }
      }
      break;
    default:
      // Do nothing
  }
  
  return valid;
}

/**
 * ValidateLine hook
 *
 * @return {Boolean}
 */
function transactionFormLib_validateLine(type) {
  
  var valid = true;
  var linenum = nlapiGetCurrentLineItemIndex(type);
  
  // Item type
  var itemType = nlapiGetLineItemValue('item', 'itemtype', i);
  
  // Skip validation if the item type is 'Description'
  if (itemType == 'Description') {
    return true; // Skip
  }
  
  if (type == 'item') {
    
    // If this item has a job prevent changes to options.
    if (nlapiGetLineItemValue(type, 'job', linenum)) {
      var options = new Array();
      options.push('custcol_bo_address1');
      options.push('custcol_bo_address2');
      options.push('custcol_bo_approxtime');
      options.push('custcol_bo_city');
      options.push('custcol_bo_country');
      options.push('custcol_bo_course');
      options.push('custcol_bo_date');
      options.push('custcol_bo_postcode');
      options.push('custcol_bo_state');
      options.push('custcol_bo_time');
      
      var i = 0, n = options.length;
      for (; i < n; i++) {
        if (transactionFormLib_hasItemOptionChanged(type, options[i], linenum)) {
          valid = false;
        }
      }
      
      if (!valid) {
        alert('Change is not permitted. A job is linked to this item, you should update the job record instead.');
      }
    }
  }
  
  return valid;
}
  
/**
 * Check if item option has changed
 *
 * @return {Boolean}
 */
function transactionFormLib_hasItemOptionChanged(type, name, linenum) {
  return nlapiGetLineItemValue(type, name, linenum) != nlapiGetCurrentLineItemValue(type, name);
}

/**
 * Set default client message
 *
 * @param {String} subsidiary
 * @return {Void}
 */
function transactionFormLib_setDefaultClientMessage(subsidiary) {
  
  // Do we know the subsidiary?
  if (subsidiary == null || subsidiary == '') {
    return; // No, do nothing.
  }
  
  // Which subsidiary is it?
  if (subsidiary == SWEET_SUBSIDIARY_US || subsidiary == SWEET_SUBSIDIARY_UAE || subsidiary == SWEET_SUBSIDIARY_SGD) { // United States
    
    // Is Parent Gym selected?
    var messagesel = nlapiGetFieldValue('messagesel');
    if (messagesel == SWEET_CLIENTMESSAGE_PARENTGYM) {
      
      // Yes, let's remove it.
      nlapiSetFieldValue('messagesel', '');
      nlapiSetFieldValue('message', '');      
    }
  } else { // United Kingdom & Rest of the World

    // Is there already a message?
    var message = nlapiGetFieldValue('message', '');
    if (message == '') {
      
      // No, let's set it to Parent Gym
      nlapiSetFieldValue('messagesel', SWEET_CLIENTMESSAGE_PARENTGYM);      
    }
  }
}
