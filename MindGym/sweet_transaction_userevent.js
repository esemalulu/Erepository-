/**
 * Transaction user event scripts
 * June 18th 2015: Aux: Can be removed once verified
 * 
 * Dec. 11 2015 -
 * After Sales Order record review, DA approves deletion of this script record.
 * THIS NOTE is to document that the action was done. Below are Script Record Definition
 * Prior to Deletion:
 * Script Info
 * Type: User Event
 * Name: Transaction Server
 * ID: customscript_transaction_server
 * After Submit Function: userevent_afterSubmit
 * Libraries: sweet_transaction_lib.js
 * Deployments: Invoice, Sales Order
 * 
 */

/**
 * After submit
 *
 * @param type
 * @return void
 */
function userevent_afterSubmit(type) {

  type = type.toLowerCase();
  recordType = nlapiGetRecordType().toLowerCase();
  recordId = nlapiGetRecordId();
  
  switch (type) {
    case 'edit':
    case 'create':
    case 'delete':
      switch (recordType) {
        case 'invoice':
        case 'salesorder':
          _updateSalesFunnelData(recordId);
          break;
      }
      break;
    default:
      // Do nothing
  }
}

/**
 * Update sales funnel data
 *
 * @param {int} recordId
 * @return {void}
 */
function _updateSalesFunnelData(recordId) {
  
  nlapiLogExecution('DEBUG', 'Info', 'test called. recordId=' + recordId);
  
  var createdFrom = nlapiGetFieldValue('createdfrom');
  nlapiLogExecution('DEBUG', 'Info', 'createdFrom=' + createdFrom);
  
  if (createdFrom) {

    // Identify the transction type
    var filter = new Array();
    filter.push(new nlobjSearchFilter('internalid', null, 'is', createdFrom));
    var columns = new Array();
    var result =  nlapiSearchRecord('transaction', null, filter, columns);
    
    if (result) {
      var linkedRecordType = result[0].getRecordType();
      var linkedRecordId = result[0].getId();
      
      // If it is an estimate then update the counter fields
      if (linkedRecordType == 'estimate') {
        sweet_lib_updateSalesFunnelDataOnQuote(linkedRecordId);
      }
    }
  }
}

