/**
 *
 * Script create sales orders from jobs
 *
 *
 */

var SWEET_CANCELLATION_AMOUNT_100PERCENT = '1';
var SWEET_CANCELLATION_AMOUNT_50PERCENT = '2';
var SWEET_CANCELLATION_AMOUNT_NOFEE = '3';
var SWEET_CANCELLATION_FEE_ITEM = '1507';
var SWEET_CANCELLATION_FEE_ITEM = '1507';
 
/**
 * Main
 */
function sweet_so_createfromjobs_scheduled(type)
{
  nlapiLogExecution('DEBUG', 'Function', 'Start::sweet_so_createfromjobs_scheduled');
  
  try {
  
    var context = nlapiGetContext();
    
    // Get list of clients and buyers
    var result = nlapiSearchRecord('job', '180', null, null);
    
    if (result) {
      var i = 53, n = result.length;
      nlapiLogExecution('DEBUG', 'Var', 'n=' + n);
      
      for (; i < n; i++) {
        nlapiLogExecution('DEBUG', 'Var', 'i+1=' + (i + 1));
        nlapiLogExecution('DEBUG', 'Var', 'Remaining Usage=' + context.getRemainingUsage());
        
        // Get client
        var clientId = result[i].getValue('customer', null, 'group');
        var client = nlapiLoadRecord('customer', clientId);
        nlapiLogExecution('DEBUG', 'Var', 'Client=' + clientId);
        
        // Get buyer
        var buyerId = result[i].getValue('internalid', 'CUSTENTITY_BO_BUYER', 'group');
        nlapiLogExecution('DEBUG', 'Var', 'Buyer=' + buyerId);
        
        // Get jobs
        var filters = new Array();
        filters.push(new nlobjSearchFilter('customer', null, 'is', clientId));
        filters.push(new nlobjSearchFilter('custentity_bo_buyer', null, 'is', buyerId));
        var jobs = nlapiSearchRecord('job', '219', filters, null);
        
        if (jobs) {
          
          // Create sales orders
          salesOrder = nlapiCreateRecord('salesorder');
          
          // Set client
          salesOrder.setFieldValue('entity', clientId);
          
          // Set exchange rate
          var exchangeRate = '1';
          var currency = client.getFieldValue('currency');
          switch (currency) {
            case '1':
              exchangeRate = '1'; // British Pound
              break;
            case '2':
              exchangeRate = '.69350531'; // US Dollar
              break;
            case '4':
              exchangeRate = '.90150002'; // Euro
              break;
            default:
              throw nlapiCreateError('SWEET_UNKNOWN_CURRENCY', "Unknown currency (" + currency + ").");
          }
          salesOrder.setFieldValue('exchangerate', exchangeRate);
          
          // Set buyer
          salesOrder.setFieldValue('custbody_buyer', buyerId);
          
          // T&C approved
          salesOrder.setFieldValue('custbody_cli_termsaccepted', client.getFieldValue('custentity_clifrm_agreedterms'));
          
          // T&C document
          salesOrder.setFieldValue('custbody_cli_termsdoc', client.getFieldValue('custentity_cli_termsdoc'));
          
          // Order status
          salesOrder.setFieldValue('orderstatus', 'B'); // Pending fulfillment
          
          // Payment method
          salesOrder.setFieldValue('custentity_paymentmethod', client.getFieldValue('custentity_paymentmethod'));
          
          // Add sales order items
          var j = 0, m = jobs.length;
          nlapiLogExecution('DEBUG', 'Var', '#jobs=' + m);
          var linenum = 0;
          for (; j < m; j++) {
            //nlapiLogExecution('DEBUG', 'Var', 'Remaining Usage=' + context.getRemainingUsage());
            linenum++;
            //nlapiLogExecution('DEBUG', 'Var', (j + 1) + '=' + jobs[j].getValue('entityid'));
            salesOrder.insertLineItem('item', linenum);
            
            // Item
            var item = nlapiLoadRecord('serviceitem', jobs[j].getValue('custentity_bo_item'));
            salesOrder.setLineItemValue('item', 'item', linenum, jobs[j].getValue('custentity_bo_item'));
            
            // Options
            sweet_setItemOptions(salesOrder, linenum, jobs[j]);
            
            // Description
            salesOrder.setLineItemValue('item', 'description', linenum, item.getFieldValue('salesdescription'));
            
            // Rate
            var rate = jobs[j].getValue('custentity_neocortex_amount');
            salesOrder.setLineItemValue('item', 'rate', linenum, rate);
            
            // If job is cancelled
            if (jobs[j].getValue('custentity_bo_iscancelled') == 'T') {
            
              // Close item
              salesOrder.setLineItemValue('item', 'isclosed', linenum, 'T');
              
              // Add fee
              var fee = jobs[j].getValue('custentity_bo_cancellationfee');
              if (fee && fee != SWEET_CANCELLATION_AMOUNT_NOFEE) {
              
                // Add new item
                linenum++;
                salesOrder.insertLineItem('item', linenum);
                
                // Item
                salesOrder.setLineItemValue('item', 'item', linenum, SWEET_CANCELLATION_FEE_ITEM);
                
                // Options
                sweet_setItemOptions(salesOrder, linenum, jobs[j]);
                
                // Rate
                switch (fee) {
                  case SWEET_CANCELLATION_AMOUNT_100PERCENT:
                    break; // Do nothing
                  case SWEET_CANCELLATION_AMOUNT_50PERCENT:
                    rate = 0.50 * rate;
                    break;
                  default:
                    throw nlapiCreateError('SWEET_INVALID_CANCELLATION_AMOUNT', "Invalid cancellation fee option. (" + fee + ")");
                }
                salesOrder.setLineItemValue('item', 'rate', linenum, rate);
              }
            }
          }
          
          var salesOrderId = nlapiSubmitRecord(salesOrder);
          if (salesOrderId) {
            nlapiLogExecution('DEBUG', 'Var', 'salesOrderId=' + salesOrderId);
          } else {
            nlapiLogExecution('DEBUG', 'Var', 'Failed to create a sales order');
          }
        }
      }
    }
  } catch (e) {
    throw e;
  }
  
  nlapiLogExecution('DEBUG', 'Function', 'End::sweet_so_createfromjobs_scheduled');
}


function sweet_setItemOptions(salesOrder, linenum, job)
{
  // Course
  salesOrder.setLineItemValue('item', 'custcol_bo_course', linenum, job.getValue('custentity_bo_course'));
  
  // Date
  salesOrder.setLineItemValue('item', 'custcol_bo_date', linenum, job.getValue('enddate'));
  
  // Time
  salesOrder.setLineItemValue('item', 'custcol_bo_time', linenum, job.getValue('custentity_bo_eventtime'));
  
  // Approx. Time
  salesOrder.setLineItemValue('item', 'custcol_bo_approxtime', linenum, job.getValue('custentity_bo_approxtime'));
  
  // Address 1
  salesOrder.setLineItemValue('item', 'custcol_bo_address1', linenum, job.getValue('custentity_bo_eventaddress1'));
  
  // Address 2
  salesOrder.setLineItemValue('item', 'custcol_bo_address2', linenum, job.getValue('custentity_bo_eventaddress2'));
  
  // Postcode
  salesOrder.setLineItemValue('item', 'custcol_bo_postcode', linenum, job.getValue('custentity_bo_eventpostcode'));
  
  // City
  salesOrder.setLineItemValue('item', 'custcol_bo_city', linenum, job.getValue('custentity_bo_eventcity'));
  
  // State
  salesOrder.setLineItemValue('item', 'custcol_bo_state', linenum, job.getValue('custentity_bo_eventstate'));
  
  // Country
  salesOrder.setLineItemValue('item', 'custcol_bo_country', linenum, job.getValue('custentity_bo_eventcountry'));
  
  // Quantity
  salesOrder.setLineItemValue('item', 'quantity', linenum, 1);
  
  // Job
  salesOrder.setLineItemValue('item', 'job', linenum, job.getId());
}
