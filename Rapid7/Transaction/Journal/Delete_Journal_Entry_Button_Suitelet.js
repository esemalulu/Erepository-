/*
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       13 Sep 2012     efagone
 *
 */

/*
 * @param {nlobjRequest} request Request object
 * @param {nlobjResponse} response Response object
 * @returns {Void} Any output is written via response object
 */
function deleteJournals(request, response){

	var responseText = 'Problem deleting journals.';
	
	var userId = nlapiGetUser();
	
	if (userId == 283872 || userId == 944519 || userId == 2 || userId == 1230735) {
		if (request.getMethod() == 'POST') {
		
			var tranId = request.getParameter('custparam_tranid');
			
			if (tranId != null && tranId != '') {
			
				try {
				
					var arrSearchFilters = new Array();
					arrSearchFilters[arrSearchFilters.length] = new nlobjSearchFilter('memo', null, 'startswith', 'Rev Rec');
					arrSearchFilters[arrSearchFilters.length] = new nlobjSearchFilter('createdfrom', null, 'is', tranId);
					arrSearchFilters[arrSearchFilters.length] = new nlobjSearchFilter('datecreated', null, 'onorafter', nlapiStringToDate('1/1/2000'));
					
					var arrSearchColumns = new Array();
					arrSearchColumns[0] = new nlobjSearchColumn('internalid', null, 'group');
					
					var arrSearchResults = nlapiSearchRecord('journalentry', null, arrSearchFilters, arrSearchColumns);
					
					var numDeleted = 0;
					
					var tooMany = false;
					
					if (arrSearchResults != null && arrSearchResults.length > 60) {
						tooMany = true;
						'Too many journal entries found: ' + arrSearchResults.length;
					}
					
					for (var i = 0; arrSearchResults != null && i < arrSearchResults.length && !tooMany; i++) {
					
						var journalId = arrSearchResults[i].getValue(arrSearchColumns[0]);
						
						nlapiLogExecution('DEBUG', 'Deleting Journal Entry', journalId);
						try {
							nlapiDeleteRecord('journalentry', journalId);
							numDeleted++;
						} 
						catch (e2) {
						
						}
						
					}
					
					responseText = numDeleted + ' Journal entries deleleted.';
					
				} 
				catch (e) {
					responseText = 'Problem deleting journals.\n\nError: ' + e;
				}
			}
			else {
				responseText = 'Problem deleting journals. Missing required parameter.';
			}
			
		}
	}
	else {
		responseText = 'You do not have permissions do perform this action.';
	}
	
	response.writeLine(responseText);
	
}
