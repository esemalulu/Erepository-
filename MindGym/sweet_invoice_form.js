/**
 * Invoice Form Script
 *
 * @require sweet_remittance_lib.js
 */

/**
 * Constants
 */
var UK_SUBSIDIARY_ID = '2';
var US_SUBSIDIARY_ID = '3';
var SG_SUBSIDIARY_ID = '4';
var UAE_SUBSIDIARY_ID = '5';
var UK_INVOICE_FORM_ID = '121';
var US_INVOICE_FORM_ID = '129';
var SG_INVOICE_FORM_ID = '140';
var UAE_INVOICE_FORM_ID = '138';
var IMPORTANT_REQUIREMENT_ITEM_UK = '1868';
var IMPORTANT_REQUIREMENT_ITEM_US = '1870';
var IMPORTANT_REQUIREMENT_ITEM_SGD = '2496';
var IMPORTANT_REQUIREMENT_ITEM_UAE = '2495';

/**
 * Before loading invoice form
 *
 * @return {Void}
 */
function localform_pageInit(type) {
  
 // Check if the correct form is being used
  var subsidiary = nlapiGetFieldValue('subsidiary');
  var formID = nlapiGetFieldValue('customform');

  if ((subsidiary == UK_SUBSIDIARY_ID) && (formID != UK_INVOICE_FORM_ID)) {

      nlapiSetFieldValue('customform', UK_INVOICE_FORM_ID);
      return true;
  }

  if ((subsidiary == US_SUBSIDIARY_ID) && (formID != US_INVOICE_FORM_ID)) {

      nlapiSetFieldValue('customform', US_INVOICE_FORM_ID);
      return true;
  }

  if ((subsidiary == SG_SUBSIDIARY_ID) && (formID != SG_INVOICE_FORM_ID)) {


      nlapiSetFieldValue('customform', SG_INVOICE_FORM_ID);
      return true;
  }

  if ((subsidiary == UAE_SUBSIDIARY_ID) && (formID != UAE_INVOICE_FORM_ID)) {
      nlapiSetFieldValue('customform', UAE_INVOICE_FORM_ID);
      return true;
  } 

  var type = type.toLowerCase();
  var subsidiary = nlapiGetFieldValue('subsidiary');
      
  // Update the client message
  transactionFormLib_setDefaultClientMessage(subsidiary);

  
  // Add 'Remittance' item
  var clientId = nlapiGetFieldValue('entity');
  if (clientId && (type == 'create' || type == 'copy')) {
    addRemittanceItem();
  }
  
  // Remove 'important requirement' item if exists
  // IMPORTANT: This code must execute last in the pageInit function 
  var i = 1, n = nlapiGetLineItemCount('item') + 1;
  for (; i < n; i++) {
    var itemId = nlapiGetLineItemValue('item', 'item', i);
    if (itemId == IMPORTANT_REQUIREMENT_ITEM_UK || itemId == IMPORTANT_REQUIREMENT_ITEM_US || itemId == IMPORTANT_REQUIREMENT_ITEM_SGD || itemId == IMPORTANT_REQUIREMENT_ITEM_UAE) {
      nlapiSelectLineItem('item', i);
      nlapiRemoveLineItem('item', i);
      nlapiCommitLineItem('item');
    }
  }
}

/**
 * SaveRecord hook
 *
 * @return {Boolean}
 */
function localform_saveRecord() {
  return transactionFormLib_validatePaymentMethod();
}

/**
 * ValidateLine hook
 *
 * @return {Boolean}
 */
function localform_validateLine(type) {
  return transactionFormLib_validateLine(type);
}

/**
 * FieldChanged hook
 *
 * @return {Void}
 */
function localform_fieldChanged(type, name, linenum) {
  
  // Update remittance fields if template is changed
  if (name == 'custbody_remit_template') {
    var templateId = nlapiGetFieldValue('custbody_remit_template');
    if (templateId) {
      var template = nlapiLoadRecord('customrecord_remittance', templateId);
      nlapiSetFieldValue('custbody_remit_wiretransfer', template.getFieldValue('custrecord_remit_wiretransfer'));
      nlapiSetFieldValue('custbody_remit_cheque', template.getFieldValue('custrecord_remit_cheque'));
    }
  }
}

/**
 * PostSourcing hook
 *
 * @param {String} type
 * @param {String} name
 */
function localform_postSourcing(type, name) {
  if (name == 'entity') {
    addRemittanceItem();
  }
  
  // Update the client message
  if (name == 'entity') {
    var subsidiary = nlapiGetFieldValue('subsidiary');
    transactionFormLib_setDefaultClientMessage(subsidiary);
  }
}

/**
 * Add 'Remittance' item based on subsidiary and currency
 *
 * @return {Void}
 */
function addRemittanceItem() {
  
  var SUBSIDIARY_UK = '2';
  var SUBSIDIARY_US = '3';
  var SUBSIDIARY_SG = '4';
  var SUBSIDIARY_UAE = '5';
  var CURRENCY_GBP = '1';
  var CURRENCY_USD = '2';
  var CURRENCY_CAD = '3';
  var CURRENCY_EUR = '4';
  var CURRENCY_SGD = '7';
  var CURRENCY_AED = '19';
  var REMITTANCE_ITEM_UK_GBP = '1871';
  var REMITTANCE_ITEM_UK_USD = '1873';
  var REMITTANCE_ITEM_UK_EUR = '1875';
  var REMITTANCE_ITEM_US_USD = '1874';
  var REMITTANCE_ITEM_US_CAD = '1869';
  var REMITTANCE_ITEM_US_EUR = '1919';
  var REMITTANCE_ITEM_UK_SGD = '1993';
  var REMITTANCE_ITEM_US_SGD = '1994';
  var REMITTANCE_ITEM_SG_USD = '2498';
  var REMITTANCE_ITEM_SG_SGD = '1993';
  var REMITTANCE_ITEM_UAE_USD = '2497';
  var REMITTANCE_ITEM_UAE_AED = '1996';
      
  // Do we have a subsidiary?
  var subsidiary = nlapiGetFieldValue('subsidiary');
  if (!subsidiary) {
    return; // No
  }
  
  // Do we have a currency?
  var currency = nlapiGetFieldValue('currency');
  if (!currency) {
    return; // No
  }
    
  // Remove the item if it already exists  
  var i = 1, n = nlapiGetLineItemCount('item') + 1;  
  for (; i < n; i++) {
    var itemId = nlapiGetLineItemValue('item', 'internalid', i);
    if (itemId == REMITTANCE_ITEM_UK_GBP ||
      itemId == REMITTANCE_ITEM_UK_USD ||
      itemId == REMITTANCE_ITEM_UK_EUR ||
      itemId == REMITTANCE_ITEM_US_USD ||
      itemId == REMITTANCE_ITEM_US_EUR ||
      itemId == REMITTANCE_ITEM_US_SGD ||
      itemId == REMITTANCE_ITEM_UK_SGD ||
      itemId == REMITTANCE_ITEM_US_CAD||
      itemId == REMITTANCE_ITEM_SG_USD ||
      itemId == REMITTANCE_ITEM_SG_SGD ||
      itemId == REMITTANCE_ITEM_UAE_USD ||
      itemId == REMITTANCE_ITEM_UAE_AED) {
      nlapiRemoveLineItem('item', i);
    }
  }
  
  // Subsidiary is United Kingdom and currency is GBP
  if (subsidiary == SUBSIDIARY_UK && currency == CURRENCY_GBP) {
    nlapiInsertLineItem('item', 1);
    nlapiSetCurrentLineItemValue('item', 'item', REMITTANCE_ITEM_UK_GBP, true, true);
    nlapiCommitLineItem('item');
  }
  
  // Subsidiary is United Kingdom and currency is USD
  if (subsidiary == SUBSIDIARY_UK && currency == CURRENCY_USD) {
    nlapiInsertLineItem('item', 1);
    nlapiSetCurrentLineItemValue('item', 'item', REMITTANCE_ITEM_UK_USD, true, true);
    nlapiCommitLineItem('item');
  }
  
  // Subsidiary is United Kingdom and currency is EUR
  if (subsidiary == SUBSIDIARY_UK && currency == CURRENCY_EUR) {
    nlapiInsertLineItem('item', 1);
    nlapiSetCurrentLineItemValue('item', 'item', REMITTANCE_ITEM_UK_EUR, true, true);
    nlapiCommitLineItem('item');
  }
  
  // Subsidiary is United Kingdom and currency is SGD
  if (subsidiary == SUBSIDIARY_UK && currency == CURRENCY_SGD) {
    nlapiInsertLineItem('item', 1);
    nlapiSetCurrentLineItemValue('item', 'item', REMITTANCE_ITEM_UK_SGD, true, true);
    nlapiCommitLineItem('item');
  }

 // Subsidiary is United Kingdom and currency is not USD or EUR or GBP or SGD
  if (subsidiary == SUBSIDIARY_UK && currency != CURRENCY_GBP && currency != CURRENCY_USD && currency != CURRENCY_EUR && currency != CURRENCY_SGD) {
    nlapiInsertLineItem('item', 1);
    nlapiSetCurrentLineItemValue('item', 'item', REMITTANCE_ITEM_UK_GBP, true, true);
    nlapiCommitLineItem('item');
  }
  
  // Subsidiary is United States and currency is USD
  if (subsidiary == SUBSIDIARY_US && currency == CURRENCY_USD) {
    nlapiInsertLineItem('item', 1);
    nlapiSetCurrentLineItemValue('item', 'item', REMITTANCE_ITEM_US_USD, true, true);
    nlapiCommitLineItem('item');
  }
  
  // Subsidiary is United States and currency is CAD
  if (subsidiary == SUBSIDIARY_US && currency == CURRENCY_CAD) {
    nlapiInsertLineItem('item', 1);
    nlapiSetCurrentLineItemValue('item', 'item', REMITTANCE_ITEM_US_CAD, true, true);
    nlapiCommitLineItem('item');
  }
  
  // Subsidiary is United States and currency is EUR
  if (subsidiary == SUBSIDIARY_US && currency == CURRENCY_EUR) {
    nlapiInsertLineItem('item', 1);
    nlapiSetCurrentLineItemValue('item', 'item', REMITTANCE_ITEM_US_EUR, true, true);
    nlapiCommitLineItem('item');
      }
  
  // Subsidiary is United States and currency is SGD
  if (subsidiary == SUBSIDIARY_US && currency == CURRENCY_SGD) {
    nlapiInsertLineItem('item', 1);
    nlapiSetCurrentLineItemValue('item', 'item', REMITTANCE_ITEM_US_SGD, true, true);
    nlapiCommitLineItem('item');
  }

 // Subsidiary is United States and currency is not USD or CAD or EUR or SGD 
  if (subsidiary == SUBSIDIARY_US && currency != CURRENCY_USD && currency != CURRENCY_CAD && currency != CURRENCY_EUR && currency != CURRENCY_SGD) {
    nlapiInsertLineItem('item', 1);
    nlapiSetCurrentLineItemValue('item', 'item', REMITTANCE_ITEM_US_USD, true, true);
    nlapiCommitLineItem('item');
  }

 // Subsidiary is Singapore and currency is USD
  if (subsidiary == SUBSIDIARY_SG && currency == CURRENCY_USD) {
    nlapiInsertLineItem('item', 1);
    nlapiSetCurrentLineItemValue('item', 'item', REMITTANCE_ITEM_SG_USD, true, true);
    nlapiCommitLineItem('item');
  }

 // Subsidiary is Singapore and currency is SGD
  if (subsidiary == SUBSIDIARY_SG && currency == CURRENCY_SGD) {
    nlapiInsertLineItem('item', 1);
    nlapiSetCurrentLineItemValue('item', 'item', REMITTANCE_ITEM_SG_SGD, true, true);
    nlapiCommitLineItem('item');
  }

 // Subsidiary is Singapore and currency is not USD or SGD 
  if (subsidiary == SUBSIDIARY_SG && currency != CURRENCY_USD && currency != CURRENCY_SGD) {
    nlapiInsertLineItem('item', 1);
    nlapiSetCurrentLineItemValue('item', 'item', REMITTANCE_ITEM_SG_SGD, true, true);
    nlapiCommitLineItem('item');
  }

 // Subsidiary is UAE and currency is USD
  if (subsidiary == SUBSIDIARY_UAE && currency == CURRENCY_USD) {
    nlapiInsertLineItem('item', 1);
    nlapiSetCurrentLineItemValue('item', 'item', REMITTANCE_ITEM_UAE_USD, true, true);
    nlapiCommitLineItem('item');
  }

 // Subsidiary is UAE and currency is AED
  if (subsidiary == SUBSIDIARY_UAE && currency == CURRENCY_AED) {
    nlapiInsertLineItem('item', 1);
    nlapiSetCurrentLineItemValue('item', 'item', REMITTANCE_ITEM_UAE_AED, true, true);
    nlapiCommitLineItem('item');
  }

 // Subsidiary is UAE and currency is not USD or AED 
  if (subsidiary == SUBSIDIARY_UAE && currency != CURRENCY_USD && currency != CURRENCY_AED) {
    nlapiInsertLineItem('item', 1);
    nlapiSetCurrentLineItemValue('item', 'item', REMITTANCE_ITEM_UAE_AED, true, true);
    nlapiCommitLineItem('item');
  }

}
