/**
 * Sales Order (Auto) Fulfillment Script
 *
 * This script will automatically fulfill sales orders line items that have completed jobs.
 *
 * Script should be scheduled to run during weekdays (exclude Saturday and Sunday)
 *
 */

/**
 * Main
 */
function scheduled_soFulfillment(type) {
  
  var salesOrderItems = getSalesOrderItemsPendingFulfillment();
  
  var recordCount = salesOrderItems ? salesOrderItems.length : 0;
  var recordsProcessed = 0;
  var recordsProcessedPass = 0;
  var recordsProcessedFail = 0;
  var log = new Array();
  var maxRecords = 20;
  var limitReached = recordCount > maxRecords;
  
  if (salesOrderItems) {
  
    // For each sales order item...
    var i = 0;
    var n = limitReached ? maxRecords : recordCount;
    for (; i < n; i++) {
      
      try {
        var salesOrderId = salesOrderItems[i].getId();
        var salesOrderNumber = salesOrderItems[i].getValue('tranid');
        var jobId = salesOrderItems[i].getValue('internalid', 'job');
        var jobNumber = salesOrderItems[i].getValue('entityid', 'job');
        
        log.push("Sales order " + salesOrderNumber + " (" + salesOrderId + ")");
        log.push("Job " + jobNumber + " (" + jobId + ")");
        
        // Load sales order
        var salesOrder = nlapiLoadRecord('salesorder', salesOrderId);
        
        // Open any closed items (closed because of pre-payment)
        var isChanged = false
        var closedItems = new Array();
        var j = 1, m = salesOrder.getLineItemCount('item') + 1;
        for (; j < m; j++) {
          if ((salesOrder.getLineItemValue('item', 'isclosed', j) == 'T') &&
              (salesOrder.getLineItemValue('item', 'quantity', j) > 0)) {
            isChanged = true;
            salesOrder.setLineItemValue('item', 'isclosed', j, 'F');
            closedItems.push(j);
            log.push("DEBUG: Opened item on line " + j);
          }
        }
        
        if (isChanged) {
          nlapiSubmitRecord(salesOrder);
        }
        
        // Transform sales order to item fulfillment
        var itemFulfillment = nlapiTransformRecord('salesorder', salesOrderId, 'itemfulfillment');
        
        // Only fulfill items attached to job (could be many)
        var pass = false;
        var j = 1, m = itemFulfillment.getLineItemCount('item') + 1;
        
        //Fulfillment Phase 2 - Grab Fields from Booking Record
        var jobvals = null;
        try {
        	jobvals = nlapiLookupField('job',jobId,['custentity_cbl_packffloc','custentity_bo_shippingaddress','custentity_bo_packtracking'],false);
        } catch (jobluerr) {
        	nlapiLogExecution('error', 'Error Job Val Lookup', jobluerr.toString());
        }
        
        //Set Tracking # from Booking record to Item Fulfillment Tracking number
        itemFulfillment.setFieldValue('custbody_if_ship_tracking', jobvals['custentity_bo_packtracking']);
        
        for (; j < m; j++) {
          var lineEntity = itemFulfillment.getLineItemValue('item', 'lineentity', j);
          if (lineEntity == jobId && !pass) {
        	  //Fulfillment Phase 2 - Set Location from Booking Record
        	  if (jobvals && jobvals['custentity_cbl_packffloc']) {
        		  itemFulfillment.setLineItemValue('item', 'location', j, jobvals['custentity_cbl_packffloc']);
        	  }
        	  
        	  
        	  itemFulfillment.setLineItemValue('item', 'itemreceive', j, 'T');
        	  pass = true;
          } else {
            itemFulfillment.setLineItemValue('item', 'itemreceive', j, 'F');
          }
        }
        
        // Save item fulfillment
        if (pass) {
        	
        	//Fulfillment Phase 2 - Set Defult Shipping Address from Booking
        	if (jobvals && jobvals['custentity_bo_shippingaddress']) {
        		itemFulfillment.setFieldValue('shipaddress', jobvals['custentity_bo_shippingaddress']);
        	}
        	
          nlapiSubmitRecord(itemFulfillment);
          recordsProcessedPass++;
        } else {
          
          // Something went wrong, log the error
          log.push("ERROR: Can't find item using job (" + jobNumber + ") on sales order (" + salesOrderNumber + ")");
          recordsProcessedFail++;
        }
        
        // Reverse any changes we made on sales order
        if (isChanged) {
          
          // Load sales order with fresh values
          var salesOrder = nlapiLoadRecord('salesorder', salesOrderId);
          
          var j = 0, m = closedItems.length;
          for (; j < m; j++) {
            salesOrder.setLineItemValue('item', 'isclosed', closedItems[j], 'T');
            log.push("DEBUG: Closed item on line " + closedItems[j]);
          }
          
          // Save
          nlapiSubmitRecord(salesOrder);
        }
        
      } catch (e) {
        if (e instanceof nlobjError) {
          log.push("EXCEPTION: (" + e.getCode() + ") " + e.getDetails());
        } else {
          log.push("EXCEPTION: " + e.toString());
        }
        
        recordsProcessedFail++;
      }
      recordsProcessed++;
    }
  }
  
  // If error, send report
  if (recordsProcessedFail) {
  
    author = '2'; // Andre Borgstrom
    recipient = '2'; // Andre Borgstrom
    subject = "Sales Order Fulfillment Error";
    
    body = new Array();
    body.push("This is an automated report.");
    body.push("Found " + recordCount + " sales order items with jobs pending fulfillment.");
    body.push("Script failed to fulfill " + recordsProcessedFail + " items");
    body = body.join('\n') + '\n' + log.join('\n'); // Append log to body
    
    nlapiSendEmail(author, recipient, subject, body);
  }
  
  if (recordsProcessed) {
    
//    author = '2'; // Andre Borgstrom
//    recipient = '2'; // Andre Borgstrom
//    subject = "Sales Order Fulfillment Debug";
    
//    nlapiSendEmail(author, recipient, subject, log.join('\n'));
  }
}

/**
 * Get sales order items with jobs where status is delivered
 *
 * @return {Array}
 */
function getSalesOrderItemsPendingFulfillment() {

  // Set filters
  var filters = new Array();
  
  // SalesOrd:B = Pending Fulfillment
  // SalesOrd:E = Pending Billing/Partially Fulfilled
  // SalesOrd:D = Partially Fulfilled
  var status = ['SalesOrd:B', 'SalesOrd:E', 'SalesOrd:D'];
  filters.push(new nlobjSearchFilter('type', null, 'anyof', 'SalesOrd'));
  filters.push(new nlobjSearchFilter('status', null, 'anyof', status));
  filters.push(new nlobjSearchFilter('shiprecvstatusline', null, 'is', 'F'));
  filters.push(new nlobjSearchFilter('custentity_bo_isdelivered', 'job', 'is', 'T'));
  
  // Set columns
  var columns = new Array();
  columns.push(new nlobjSearchColumn('internalid'));
  columns.push(new nlobjSearchColumn('tranid'));
  columns.push(new nlobjSearchColumn('internalid', 'job'));
  columns.push(new nlobjSearchColumn('entityid', 'job'));
  
  return nlapiSearchRecord('transaction', null, filters, columns);
}
