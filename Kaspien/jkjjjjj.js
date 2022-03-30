/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       18 mar 2016     billk
 *
 */

/**
 * The recordType (internal id) corresponds to the "Applied To" record in your script deployment. 
 * @appliedtorecord recordType
 * 
 * @param {String} type Operation types: create, edit, delete, xedit
 *                      approve, reject, cancel (SO, ER, Time Bill, PO & RMA only)
 *                      pack, ship (IF)
 *                      markcomplete (Call, Task)
 *                      reassign (Case)
 *                      editforecast (Opp, Estimate)
 * @returns {Void}
 */
function afterSubmitCopy3PMToVendor(type){
  
  try {
    
    if (type == 'create' || type == 'edit') {
      
      // Get current vendor record and the customer internal id.
      var customerId = nlapiGetFieldValue('custentitycustomer_internal_id');
      var vendorId = nlapiGetRecordId();
      
      var columns = new Array();
      var filters = new Array();
      
      // Define column to return and search filter criteria.
      columns[0] = new nlobjSearchColumn('internalid');
      filters[0] = new nlobjSearchFilter('custrecordprospect_parent',null,'anyOf',customerId);

      // Search for 3PM that have customer = customer internal id 
      var searchRecords = nlapiSearchRecord('customrecord3pm_requests',null,filters,columns);
      
      var j = 0;
      var recId = '';
      
      // Loop through returned 3PM and attach them to the vendor
      for (var i in searchRecords) {
        
        j++;
          
        recId = searchRecords[i].getId();
          
        nlapiSubmitField('customrecord3pm_requests', recId,'custrecordvendor_parent',vendorId);       
        
      }
      
      nlapiLogExecution('DEBUG', '3PM Records', 'type: ' + type + '; customerId: ' + customerId + '; vendorId: ' + vendorId + '; 3PM: ' + j);
      
    }
    
  } catch (err) {
    
    nlapiLogExecution('ERROR', 'Copy 3PM to Vendor', 'type: ' + type + '; customerId: ' + customerId +  
        '; errName: ' + err.name + '; errMsg: ' + err.message);
    
  }
 
}
