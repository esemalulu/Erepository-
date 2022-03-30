/*  Script Filename:  removedStoreOppForm.js
	Script Name:  JAV_SS_ReplaceOppForm
	
	Created By:  Robert Gama - Javelin Technologies - robert.gama@javelin-tech.com
	Version:  1.0
	
	Description:	This script is meant to check if opportunity records have a 
					stored form with them.  If they do it is suppose to change the form to a current form.
					Originally 
	
	Important Variables:
	Name:  Script Complete, ID: custbody_scriptranonthisrecord, Type: Transaction Body Field
		There is a custom field on opportunities only accessable to administrators called () 
		that is used as a flag for records that have had their form updated.
	Name:  NewOppFormScriptIndex, ID:  custscript_opportunityformscriptindex, Type:  Script Parameter
		When running you should set this parameter on the script deployment page if you don't want to
		start at the first record.
	
*/ 
/*  API Governance - Usage Per API
		Scheduled scripts get 10,000 units			After this is used up the script will reschedule itself
		nlobjSearchResultSet.getResults - 10		This script: var resultslice = resultset.getResults( searchid, searchid+1000 );
		nlobjSearchResultSet.forEachResult - 10		This script: for (var rs in resultslice) { 
		nlapiLoadRecord - 10						This script: opportunityRecord = nlapiLoadRecord(objSearchResultArray[intSearchIndex].getRecordType(), opportunityID, {recordmode:'dynamic'});
		nlapiSubmitRecord - 20						This script: nlapiSubmitRecord(opportunityRecord, { disabletriggers : true, enablesourcing : false }, true);
*/
/*  List of current opportunity forms
	Edit	115	Javelin Standard Opportunity - New GP	Opportunity 	
	Edit	120	TestJavelin Standard Opportunity	Opportunity	 	 	
	Edit	121	Javelin Sales Role Opportunity	Opportunity	 	 	
	Edit	123	Javelin Simple Opportunity	Opportunity	 	 	
	Edit	126	Javelin Managers Opportunity	Opportunity	 	 	
	Edit	130	Javelin Standard Opportunity	Opportunity	 	 	
	Edit	131	Javelin Adventace Opportunity	Opportunity	 	
	Edit	132	Test GP Opportunity Form	Opportunity	 	
	Edit	146	Javelin Adventace Opportunity V2	Opportunity

*/


function removeStoredOpportunityForm() {

	var context = nlapiGetContext();
	var usageRemaining = context.getRemainingUsage();
	
	var objSearchResultArray = [];
	var opportunityID;
	var opportunityRecord;
	var storedForm;
	
	objSearchResultArray = getSearchResults();
	if (objSearchResultArray !=null && objSearchResultArray.length > 0) { 
	
		nlapiLogExecution('DEBUG', 'objSearchResultArray', 'objSearchResultArray length = ' + objSearchResultArray.length);
		
		var initialValue = parseInt(nlapiGetContext().getSetting('SCRIPT', 'custscript_opportunityformscriptindex'));
		//var initialValue = parseInt(customParameter);  // when using a script parameter to set defaults
		
		nlapiLogExecution('DEBUG', 'Script for loop initial value', 'Initial value = ' + initialValue);
		var thisSessionCounter = 0;  // Counter for number of records processes in this instance of the script
		var numberSkipped = 0;  // Counter for the number of records not submitted since it had the right form or no form
		for (var intSearchIndex = initialValue; intSearchIndex <  objSearchResultArray.length ; intSearchIndex ++) { 
			//nlapiLogExecution('DEBUG', 'removeStoredOpportunityForm', 'Attempting to iterate search results.  intSearchIndex = ' + intSearchIndex);
			thisSessionCounter ++;  //  Increment the number of records processes in this instance of the script
			

			usageRemaining = context.getRemainingUsage();  //  API Governance - Scheduled scripts get 10,000 units
			if (usageRemaining > 200) { 

				opportunityID = objSearchResultArray[intSearchIndex].getValue('internalid'); 
				opportunityRecord = nlapiLoadRecord(objSearchResultArray[intSearchIndex].getRecordType(), opportunityID, {recordmode:'dynamic'});
				storedForm = opportunityRecord.getFieldValue('customform');
				
				if (storedForm != null && storedForm != '146') {  // if there is a stored form that is not the new form stored on the opportunity
					nlapiLogExecution('DEBUG', 'Stored Form not 146', 'Attempting to change stored form for record: ' + opportunityID + ', Search Index =' + 
						intSearchIndex + ' of ' + objSearchResultArray.length + ', This session counter = ' + thisSessionCounter + ', Old Stored form = ' + storedForm);
					opportunityRecord.setFieldValue('customform', '146');  //  Set the custom form to the new form
					opportunityRecord.setFieldValue('custbody_scriptranonthisrecord', 'T');  // Flag that the record has had it's form changed
					nlapiSubmitRecord(opportunityRecord, { disabletriggers : true, enablesourcing : false }, true); // Disables mandatory fields 
				}
				else {
					numberSkipped++;
					nlapiLogExecution('DEBUG', 'Stored Form is null', 'There is no stored opportunity form for opportunityID = ' + opportunityID + 
						', Search Index =' + intSearchIndex + ' of ' + objSearchResultArray.length + ', This session counter = ' + thisSessionCounter);
				}

			}
			else {
				if ( (intSearchIndex + 1 ) < objSearchResultArray.length) {
					nlapiLogExecution('DEBUG', 'Usage Exceeded', 'Number not submitted: ' + numberSkipped);
					var resumeValue = initialValue * 1 + numberSkipped;  // when the script re-runs we have to jump passed the skipped records as I didn't flag and submit those.
					var myParams = [];  // A parameter array to hold the next starting value of the for loop index when the script is rescheduled
					myParams.custscript_opportunityformscriptindex = resumeValue;
					nlapiLogExecution('DEBUG', 'Usage Exceeded', 'Script usage limit has been exceeded, stopped at searchIndex = ' + intSearchIndex + ' of ' + objSearchResultArray.length);
					nlapiLogExecution('AUDIT', 'Summary', 'Script search index = ' + intSearchIndex + ' of ' + objSearchResultArray.length + 
						', Processed: ' + thisSessionCounter + ', Did not submit: ' + numberSkipped + ', Setting begin counter to: ' + resumeValue);
					var status = nlapiScheduleScript(context.getScriptId(), context.getDeploymentId(), myParams);
					if ( status == 'QUEUED' ) {  // Make sure the script has been scheduled and queued, if so quit.
						nlapiLogExecution('DEBUG', 'Reschedule Script', 'Script has been successfully rescheduled');
						break;     	
					}
					nlapiLogExecution('DEBUG', 'Reschedule Script', 'There was a problem rescheduling the script');
					break;
				}
				else {
					break;
				}
			}
		}
	}
}

/*  function getSearchResults()

	Special Note:  Originally thought we would be able to process all the results of a saved search over 1000 records
	so the function is meant to return all search results available.  Wasn't neccessary since governance 
	limits were hit in the calling function, still left as is.
	
	Description:  	Function creates and runs a saved search object and save the results to a resultset object.
					The function uses getResults with a beginning and ending value to create 'pages' of results.
					Each page is called a resultslice, then each result in the slice is then pushed to a results[] array.
					It will keep on getting new resulslices until all the results have been added to the result array.
					
	Return:			results  (array of results)
*/
function getSearchResults() {
	
	var results = [];
	var filters = new Array();
	var columns = new Array();
	// filter out any opportunities for which the script has already changed the form
	filters[0] = new nlobjSearchFilter('custbody_scriptranonthisrecord', null, 'is', 'F');   
	//filters[1] = new nlobjSearchFilter('winlossreason', null, 'noneof', '@NONE@');  // old filter not used anymore.
	columns[0] = new nlobjSearchColumn('internalid').setSort(true);  // sorted search results in descending order by internalid.
	
	var savedSearch = nlapiCreateSearch('opportunity', filters, columns); //  using nlapiCreateSearch to define a savedSearch object
	var resultset = savedSearch.runSearch();  // run the savedSearch and assign results to the resultset
	
	nlapiLogExecution('DEBUG', 'Function getSearchResults', 'Performing savedSearch');
		
	var searchid = 0;
	do {
	    var resultslice = resultset.getResults( searchid, searchid+1000 );  // Assign the first 1000 results to an array called resultslice
	    for (var rs in resultslice) { 
	        results.push( resultslice[rs] );  //  Add the resultslice values to the results array
	        searchid++;
	    }
	} while (resultslice.length >= 1000);

	return results;  // returns a large array with all the results

}