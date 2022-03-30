/**
 * Opportunity library
 *
 */

var SWEET = SWEET || {};
SWEET.Opportunity = SWEET.Opportunity || {};

//11/3/2015 - Ticket 1287 
//WIP status deleted. 
//var SWEET_OPPORTUNITY_STATUS_WON_IN_PROGRESS = '56';

/**
 * Update revenue recognition by calculating weighted amount on items
 *
 * NOTE: Will update self.
 *
 * @return {Void}
 */
SWEET.Opportunity.self_updateRevenueRecognition = function() {
  var status = nlapiGetFieldValue('entitystatus');
  if (status == '56') { // Won In Progress
    probability = 100;
  } else {
    try {
      probability = nlapiGetFieldValue('probability').match('^(.+)%$');
      probability = parseFloat(probability[1]);
    } catch (e) {
      probability = 0;
    }
  }
  
  if (probability < 60) {
    probability = 0;
  }
  
  var linenum = 1, n = nlapiGetLineItemCount('item') + 1;
  for (; linenum < n; linenum++) {
    amount = nlapiGetLineItemValue('item', 'amount', linenum);
    nlapiSetLineItemValue('item', 'custcol_revrec_amount', linenum, amount * (probability / 100));
  }
}

/**
 * Update revenue recognition by calculating
 * DEPRECATED as of 3/6/2015
 * @param {String} opportunityId
 * @return {Void}
 */
SWEET.Opportunity.updateStatus = function(opportunityId) {
  if (opportunityId) {

/*
   //Script Optimization start
    var opportunity = nlapiLoadRecord('opportunity', opportunityId);
    var status = opportunity.getFieldValue('entitystatus');
    var wonInProgress = (opportunity.getFieldValue('custbody_opp_woninprogress') == 'T');

    nlapiLogExecution('DEBUG', 'status ', status);
    nlapiLogExecution('DEBUG', 'wonInProgress ', wonInProgress);

    if (wonInProgress && status != SWEET_OPPORTUNITY_STATUS_WON_IN_PROGRESS) {
      opportunity.setFieldValue('entitystatus', SWEET_OPPORTUNITY_STATUS_WON_IN_PROGRESS);
      opportunity.setFieldValue('probability', '99.99');
      nlapiSubmitRecord(opportunity);
    } 
   //Script Optimization end
*/

/**
 * 11/3/2015 - Ticket 1287 removed due to deletion of custbody_opp_woninprogress field
    var columns = nlapiLookupField('opportunity', opportunityId, ['entitystatus', 'custbody_opp_woninprogress']);
    var status = columns.entitystatus
    var wonInProgress = columns.custbody_opp_woninprogress== 'T'
    nlapiLogExecution('DEBUG', 'status ', status);
    nlapiLogExecution('DEBUG', 'wonInProgress ', wonInProgress);
    if (wonInProgress && status != SWEET_OPPORTUNITY_STATUS_WON_IN_PROGRESS) {
      nlapiSubmitField('opportunity', opportunityId, ['entitystatus', 'probability'], [SWEET_OPPORTUNITY_STATUS_WON_IN_PROGRESS, '99.99']);
    }
  */
  }
}

/**
* Calculate totals and reset timing and duration
*
* @param {String} opportunityId
* @return {Void}
*/

SWEET.Opportunity.calculateTotals = function(opportunityId) {
  if (opportunityId) {    
    nlapiLogExecution('DEBUG', 'Start', 'script starts');  
    // Create the filter
    var filters = new Array();
    filters.push(new nlobjSearchFilter('opportunity', null, 'is', opportunityId));
    filters.push(new nlobjSearchFilter('mainline',null,'is','T'));
  
    // Run the search query for sales orders
    var results = nlapiSearchRecord('salesorder', null, filters);
    
    // Run the search query for quotes
    //filters.push(new nlobjSearchFilter('custbody_sales_order_count',null,'equalto',0));
    //var qresults = nlapiSearchRecord('estimate', null, filters);
    
    // Calculate Booked total
    var bookedTotal = 0;
    
    for (var i = 0; results != null && i < results.length; i++) {
      var record = nlapiLoadRecord('salesorder', results[i].getId());
      bookedTotal = bookedTotal + parseFloat(record.getFieldValue('total'));
    }
    
    // Calculate Quoted total
    var quotedtotal = 0;
    /**
    for (var i = 0; qresults != null && i < qresults.length; i++) {
      var qrecord = nlapiLoadRecord('estimate', qresults[i].getId());
      quotedtotal = quotedtotal + parseFloat(qrecord.getFieldValue('total'));
    }
    */
    
    // Retrieve opportunity record
    var opportunity = nlapiLoadRecord('opportunity', opportunityId);
    
    // Calculate Remaining amount
    var remainingAmount = parseFloat(opportunity.getFieldValue('projectedtotal')) - bookedTotal - quotedtotal;
    if (remainingAmount < 0) {
      remainingAmount = 0;
    }
    var weightedTotal = parseFloat(opportunity.getFieldValue('probability'))/100 * remainingAmount;
   
    // Set field values in opportunity record
    //opportunity.setFieldValue('custbody_op_bookedtotal', bookedTotal);
    //opportunity.setFieldValue('custbody_op_quotedtotal', quotedtotal);
    opportunity.setFieldValue('custbody_op_remainingamount', remainingAmount);
    //opportunity.setFieldValue('custbody_op_weightedtotal', weightedTotal);
    
    // Submit opportunity record with the changes
    nlapiSubmitRecord(opportunity);
    
  }
  nlapiLogExecution('DEBUG', 'End', 'script ends');
}
