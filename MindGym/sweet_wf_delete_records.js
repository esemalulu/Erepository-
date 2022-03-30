/**
 * Delete Records
 */
 
 function deleteRecords() {
 
  nlapiLogExecution('DEBUG', 'Start', 'workflow script starts');
  
  //get opportunity ID that relates to records being deleted
  var opportunity = nlapiGetContext().getSetting('SCRIPT', 'custscript_wf_opportunity');

  // Create the filter
	var filters = new Array();
	filters.push(new nlobjSearchFilter('custrecord_mf_opportunity', null, 'anyof', opportunity));
  
  // Run the search query
	var searchresults = nlapiSearchRecord('customrecord_monthly_forecast', null, filters);
  
  for ( var i = 0; searchresults != null && i < searchresults.length; i++ ) {
    var searchresult = searchresults[i];
    nlapiLogExecution('DEBUG', 'Deleting record id:', searchresult.getId());
    nlapiDeleteRecord(searchresult.getRecordType(),searchresult.getId());
  }

  nlapiLogExecution('DEBUG', 'End', 'workflow script ends');
 }