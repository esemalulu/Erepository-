/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       18 Jul 2017     vkarbhar
 *
 */

/**
 * @param {String} type Context Types: scheduled, ondemand, userinterface, aborted, skipped
 * @returns {Void}
 */
var USAGE_LIMIT_THRESHOLD = 500;
function scheduled(type) {
//	if(type=='scheduled' || type=='userinterface')
//	{
		try
		{
			 var arrSearchResult = largeSavedSearch('customsearch_all_bins');
             nlapiLogExecution('DEBUG', 'length', 'arrSearchResult.length = '+arrSearchResult.length);
			 if ( arrSearchResult != null )
			    {
			    	for (var i = 0; i < arrSearchResult.length; i++)
			    	{
			    		try
			    		{
				    		checkUsageLimit(USAGE_LIMIT_THRESHOLD);
				    		var recordInternalId = arrSearchResult[i].getValue('internalid');
                         
				    		if(recordInternalId)
				    		{
				   	            nlapiLogExecution('DEBUG', 'recordInternalId', 'recordInternalId = '+recordInternalId);
				    			nlapiDeleteRecord('bin', recordInternalId);
				    		}
			    		}
			    		catch(error)
			   		 {                     
			   			var toErrorMessage = '';
			   	        if (error.getDetails != undefined) {
			   	        	toErrorMessage = error.getCode() + ': ' + error.getDetails();
			   	            nlapiLogExecution('ERROR', 'Deletion Error', 'Process Error = '+toErrorMessage);
			   	        } else {
			   	        	toErrorMessage = error.toString();
			   	            nlapiLogExecution('ERROR', 'Deletion Error', 'Unexpected Error = '+toErrorMessage);
			   	        }
			   		    continue;
			   		  }//end of catch
			    	}
			    }
		}
		catch(error)
		 {                     
			var toErrorMessage = '';
	        if (error.getDetails != undefined) {
	        	toErrorMessage = error.getCode() + ': ' + error.getDetails();
	            nlapiLogExecution('ERROR', 'Deletion Error', 'Process Error = '+toErrorMessage);
	        } else {
	        	toErrorMessage = error.toString();
	            nlapiLogExecution('ERROR', 'Deletion Error', 'Unexpected Error = '+toErrorMessage);
	        }
		   
		  }//end of catch
//	}

}
function largeSavedSearch(id)
{
	
	var recSearch = nlapiLoadSearch('bin', 'customsearch_all_bins');
    nlapiLogExecution('DEBUG', 'recordInternalId', 'id = '+id);
	var recSearchResults = recSearch.runSearch();
	var recResultIndex = 0; 
	var recResultStep = 1000; 
	var recResultSet; 
	var recArray = new Array();
	do 
	{
	    recResultSet = recSearchResults.getResults(recResultIndex, recResultIndex + recResultStep);
	    recResultIndex = recResultIndex + recResultStep;
	    if(recResultSet.length>0)
	       recArray = recArray.concat(recResultSet);

	} while (recResultSet.length > 0); 
	
	return recArray;
} 

//function to check remaining usage limit
function checkUsageLimit(intUsageLimitThreshold)
{
    var stLoggerTitle = 'checkUsageLimit'; 
    var intRemainingUsage = nlapiGetContext().getRemainingUsage();
    nlapiLogExecution('DEBUG', stLoggerTitle, 'Remaining Usage = ' + intRemainingUsage);
    if (intRemainingUsage < intUsageLimitThreshold) 
    {   
        var state = nlapiYieldScript();
        var reason = 'Reason: ' + state.reason + ' Info: ' + state.information + ' Size: ' + state.size;
        if (state.status == 'FAILURE')
        {
            nlapiLogExecution('ERROR', stLoggerTitle, 'Exit. Failed to yield script. ' + reason);
            throw nlapiCreateError('SCRIPT_ERROR', 'Exit. Failed to yield script. ' + reason);
            
        }
        else if (state.status == 'RESUME')
        {
            nlapiLogExecution('AUDIT', stLoggerTitle, 'Yield. Resuming script. ' + reason);
        }
    }       
}
