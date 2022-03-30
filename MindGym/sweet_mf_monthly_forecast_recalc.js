/**
 * Recalculate monthly forecasts
 */
 
 function main() {
 
  nlapiLogExecution('DEBUG', 'Start', 'mf script starts');
  
  //Open Statuses array
  var open = new Array('59', '60', '61', '62', '63', '64');
  
  // Set today's date and convert to appropriate format
  var today = new Date();
  today = nlapiDateToString(today);
    
  // Create the filter
	var filters = new Array();
  filters.push(new nlobjSearchFilter('custbody_op_contractstartdate', null, 'before', today));
  filters.push(new nlobjSearchFilter('custbody_op_distribution_curve', null, 'noneof', '@NONE@'));
  filters.push(new nlobjSearchFilter('entitystatus', null, 'anyof', open));
  
  // Run the search query
	var searchresults = nlapiSearchRecord('opportunity', null, filters);
  nlapiLogExecution('DEBUG', 'number of opportunities found', searchresults.length);
  
  for ( var i = 0; searchresults != null && i < searchresults.length; i++ ) {
    var searchresult = searchresults[i];
    
    var opportunity = nlapiLoadRecord('opportunity', searchresult.getId());
    
    if (opportunity.getFieldValue('custbody_op_distribution_curve')){
    nlapiLogExecution('DEBUG', 'updating', searchresult.getId());
    SWEET.Opportunity.createMonthlyForecast(searchresult.getId());
    }
  }

  nlapiLogExecution('DEBUG', 'End', 'mf script ends');
 }