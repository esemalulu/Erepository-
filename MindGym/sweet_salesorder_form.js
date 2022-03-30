/**
 * Sales Order Form Script
 *
 */

/**
 * Constants
 */ 
var SUBSIDIARY_US = '3';
var SUBSIDIARY_UAE = '5';
var SUBSIDIARY_SGD = '4';
var US_Sales_Order_FORM_ID = '137';
var UAE_Sales_Order_FORM_ID = '146';
var SGD_Sales_Order_FORM_ID = '143';

/**
 * PageInit hook
  *
 */
function localform_pageInit(type) {

  // Check if the correct form is being used
  var subsidiary = nlapiGetFieldValue('subsidiary');
  var formID = nlapiGetFieldValue('customform');
  //Dec 22 2015 - part of Sales Order Review. These are inactive forms.
  /**
  if ((subsidiary == SUBSIDIARY_US) && (formID != US_Sales_Order_FORM_ID)) {
      nlapiSetFieldValue('customform', US_Sales_Order_FORM_ID);
      return true;
  }


  if ((subsidiary == SUBSIDIARY_UAE) && (formID != UAE_Sales_Order_FORM_ID)) {
      nlapiSetFieldValue('customform', UAE_Sales_Order_FORM_ID);
      return true;
  }

  if ((subsidiary == SUBSIDIARY_SGD) && (formID != SGD_Sales_Order_FORM_ID)) {
      nlapiSetFieldValue('customform', SGD_Sales_Order_FORM_ID);
      return true;
  }
  */
  
  var type = type.toLowerCase();
  var clientId = nlapiGetFieldValue('entity');
  var subsidiary = nlapiGetFieldValue('subsidiary');
      
  // Update the client message
  transactionFormLib_setDefaultClientMessage(subsidiary);

  switch (type) {
    case 'copy':
      clientId = nlapiGetFieldValue('entity');
      
      if (clientId) {
        
    	  // Populate T&C fields
    	  //Dec 22 2015 - 
    	  //var client = nlapiLoadRecord('customer', clientId);
    	  var lookupFld = ['custentity_clifrm_agreedterms','custentity_cli_termsdoc'];
    	  var clientVals = nlapiLookupField('customer', clientId, lookupFld, false);
    	  nlapiSetFieldValue('custbody_cli_termsaccepted', clientVals['custentity_clifrm_agreedterms']); //client.getFieldValue('custentity_clifrm_agreedterms')
     	  nlapiSetFieldValue('custbody_cli_termsdoc', clientVals['custentity_cli_termsdoc']); //client.getFieldValue('custentity_cli_termsdoc')
      }
      
      
      // Tick revenue recognition commitment (if not ticked already)
      //var revRecCommitment = nlapiGetFieldValue('revreconrevcommitment');
      //if (revRecCommitment == 'F') {
      //  nlapiSetFieldValue('revreconrevcommitment', 'T');
      //}
      

      break;
    case 'edit':
      var locked = (nlapiGetFieldValue('custbody_locked') == 'T');
      
      if (locked) {
        var approval = (nlapiGetFieldValue('custbody_so_approvalinprogress') == 'T');
        if (approval) {
          alert('Approval in progress. You won\'t be able to edit this sales order until the process is completed.');
        } else {
          alert('This sales order is locked. You won\'t be able to edit the record.');
        }
      }
    default:
      // Do nothing
  }
}

/**
 * PostSourcing hook
 *
 * @return {Void}
 */
function localform_postSourcing(type, name) {
  
  // Update the client message
  if (name == 'entity') {
    var subsidiary = nlapiGetFieldValue('subsidiary');
    transactionFormLib_setDefaultClientMessage(subsidiary);
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
