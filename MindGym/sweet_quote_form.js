/**
 * Quote Form Script
 *
 */

/**
 * Constants
 */ 
var SUBSIDIARY_UK = '2';
var SUBSIDIARY_US = '3';
var SUBSIDIARY_SG = '4';
var SUBSIDIARY_UAE = '5';
var US_QUOTE_FORM_ID = '127';
var UK_QUOTE_FORM_ID = '111';
var SG_QUOTE_FORM_ID = '141';
var UAE_QUOTE_FORM_ID = '145';
var IMPORTANT_REQUIREMENT_ITEM_UK = '1868';
var IMPORTANT_REQUIREMENT_ITEM_US = '1870';
var IMPORTANT_REQUIREMENT_ITEM_UAE = '2495';
var IMPORTANT_REQUIREMENT_ITEM_SGD = '2496';

/**
 * PageInit hook
 *
 * @return {Void}
 */
function localform_pageInit(type) {

  // Check if the correct form is being used
  var subsidiary = nlapiGetFieldValue('subsidiary');
  var formID = nlapiGetFieldValue('customform');
  if ((subsidiary == SUBSIDIARY_US) && (formID != US_QUOTE_FORM_ID)) {
      nlapiSetFieldValue('customform', US_QUOTE_FORM_ID);
      return true;
}
  if ((subsidiary == SUBSIDIARY_SG) && (formID != SG_QUOTE_FORM_ID)) {
      nlapiSetFieldValue('customform', SG_QUOTE_FORM_ID);
      return true;
}
  
 if ((subsidiary == SUBSIDIARY_UAE) && (formID != UAE_QUOTE_FORM_ID)) {
      nlapiSetFieldValue('customform', UAE_QUOTE_FORM_ID);
      return true;
} 
  
  var type = type.toLowerCase();
  var clientId = nlapiGetFieldValue('entity');
  var subsidiary = nlapiGetFieldValue('subsidiary');
      
  // Update the client message
  transactionFormLib_setDefaultClientMessage(subsidiary);
    
  // Populate T&C fields
  if (clientId) {
    var client = nlapiLoadRecord('customer', clientId);
    nlapiSetFieldValue('custbody_cli_termsaccepted', client.getFieldValue('custentity_clifrm_agreedterms'));
    nlapiSetFieldValue('custbody_cli_termsdoc', client.getFieldValue('custentity_cli_termsdoc'));
  }
  
  // Set the owner field (if it is empty)
  var owner = nlapiGetFieldValue('custbody_owner');
  if (owner == '') {
    nlapiSetFieldValue('custbody_owner', nlapiGetUser());
  }
  
  // Set default value for sales order count
  /**
  var salesOrderCount = nlapiGetFieldValue('custbody_sales_order_count');
  if (salesOrderCount == '' || type == 'copy') {
    nlapiSetFieldValue('custbody_sales_order_count', 0);
  }
  */
  
  // Set default value for invoice count
  var invoiceCount = nlapiGetFieldValue('custbody_invoice_count');
  if (invoiceCount == '' || type == 'copy') {
    nlapiSetFieldValue('custbody_invoice_count', 0);
  }
  
  // Add 'Important Requirements' item
  if (clientId && (type == 'create' || type == 'copy')) {
    addImportantRequirementsItem();
  }
  
  // Reset sales referral (lead source) field 
  if (type == 'create' || type == 'copy') {
    nlapiSetFieldValue('leadsource', '');
  }
}

/**
 * SaveRecord hook
 *
 * @return {Boolean}
 */
function localform_saveRecord() {
		
  
  // If the Created From field is set then make
  // the Opportunity field mandatory 
  var createdFrom = nlapiGetFieldValue('createdfrom');
  if (createdFrom) {
    var opportunity = nlapiGetFieldValue('opportunity');
    if (!opportunity) {
      alert('Please enter value(s) for: Opportunity');
      return false;
    }
  }
  
  return true;
}

/**
 * FieldChanged hook
 *
 * @return {Void}
 */
function localform_fieldChanged(type, name, linenum) {
  // Todo
}

/**
 * PostSourcing hook
 *
 * @return {Void}
 */
function localform_postSourcing(type, name) {  
   var subsidiary = nlapiGetFieldValue('subsidiary');
   if (subsidiary == SUBSIDIARY_UK){
  // Add 'Important Requirements' item
  if (name == 'entity') {
    addImportantRequirementsItem();
  }
 }
  
  // Update the client message
  if (name == 'entity') {
    transactionFormLib_setDefaultClientMessage(subsidiary);
  }

//Prepopulate Country field

 if(type =='item' && name =='item')
  {
    // Once all the fields from item are sourced
    var rate = nlapiGetCurrentLineItemValue('item', 'rate');
    var line = nlapiGetCurrentLineItemIndex(type);
    var country =  nlapiGetCurrentLineItemValue('item', 'custcol_bo_country');
var itemId = nlapiGetCurrentLineItemValue('item', 'item');
if(itemId != null && itemId != 1868 && itemId != 1870 && itemId !=2495 && itemId != 2496){
    if(country == null || country.length == 0)
    {
        var formId =  nlapiGetFieldValue( 'customform');
        if(formId == US_QUOTE_FORM_ID)
       {
                      nlapiSetCurrentLineItemValue('item',  'custcol_bo_country', 229,true,true);
        }
        if(formId == UK_QUOTE_FORM_ID)
             nlapiSetCurrentLineItemValue('item',  'custcol_bo_country', 228);
        if(formId == UAE_QUOTE_FORM_ID)
             nlapiSetCurrentLineItemValue('item',  'custcol_bo_country', 226);
        if(formId == SG_QUOTE_FORM_ID)
             nlapiSetCurrentLineItemValue('item',  'custcol_bo_country', 193);
    }
  }
}

}

/**
 * Add 'Important Requirements' item based on subsidiary
 *
 * @return {Void}
 */
function addImportantRequirementsItem() {
    
  // Do we have a subsidiary?
  var subsidiary = nlapiGetFieldValue('subsidiary');
  if (!subsidiary) {
    return; // No
  }
    
  // Remove the item if it already exists  
  var i = 1, n = nlapiGetLineItemCount('item') + 1;  
  for (; i < n; i++) {
    var itemId = nlapiGetLineItemValue('item', 'internalid', i);
    if (itemId == IMPORTANT_REQUIREMENT_ITEM_UK || itemId == IMPORTANT_REQUIREMENT_ITEM_US) {
      nlapiRemoveLineItem('item', i);
    }
  }
  
  // Add item if subsidiary is United Kingdom
  if (subsidiary == SUBSIDIARY_UK) {
    nlapiInsertLineItem('item', 1);
    nlapiSetCurrentLineItemValue('item', 'item', IMPORTANT_REQUIREMENT_ITEM_UK, true, true);
    nlapiCommitLineItem('item');
  }
  
  // Add item if subsidiary is United States
  if (subsidiary == SUBSIDIARY_US) {
    nlapiInsertLineItem('item', 1);
    nlapiSetCurrentLineItemValue('item', 'item', IMPORTANT_REQUIREMENT_ITEM_US, true, true);
    nlapiCommitLineItem('item');
  }

  // Add item if subsidiary is United Arab Emirates
  if (subsidiary == SUBSIDIARY_UAE) {
    nlapiInsertLineItem('item', 1);
    nlapiSetCurrentLineItemValue('item', 'item', IMPORTANT_REQUIREMENT_ITEM_UAE, true, true);
    nlapiCommitLineItem('item');
  }

  // Add item if subsidiary is Singapore
  if (subsidiary == SUBSIDIARY_SG) {
    nlapiInsertLineItem('item', 1);
    nlapiSetCurrentLineItemValue('item', 'item', IMPORTANT_REQUIREMENT_ITEM_SGD, true, true);
    nlapiCommitLineItem('item');
  }
}
