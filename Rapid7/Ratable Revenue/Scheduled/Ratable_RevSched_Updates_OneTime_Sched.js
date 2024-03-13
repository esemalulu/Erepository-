/*
 * @author efagone
 * 
 * 

To confirm, you would want the script on the Revenue Recognition Schedules to:

1) delete the journal entry (if any) -- I included both IID and Number in the far-right (you may need to run a routine to delete these before it will let you update the line items)
2) change the Period on the Rev Rec Line Sequence Number to be the "Should Be This Period" value
3) all other line items, amounts, periods, etc. on the schedule will remain exactly the same (except of course for those that are also are listed on this search)
4) as you update the line item periods they should start to fall off the search


The overall concept is we don't want the revenue schedules to be posting in periods before the source transaction was posted.  
There are some exceptions (PSO primarily) and they have been excluded from this search.

 */

function updateRevRecs_Sched(){

	var timeLimitInMinutes = 10;
	this.timeLimitInMilliseconds = timeLimitInMinutes * 60 * 1000;
	this.startingTime = new Date().getTime();
	this.context = nlapiGetContext();
	this.rescheduleScript = false;
	
	var context = nlapiGetContext();
	
	var objAccountingPeriods = getAccountPeriodIds();
	
	var searchId = context.getSetting('SCRIPT', 'custscript1');
	
	var arrSearchResults = nlapiSearchRecord('customrecord913', searchId);
	
	for (var i = 0; arrSearchResults != null && i < arrSearchResults.length && timeLeft() && unitsLeft(300); i++) {
	
		try {
		
			var columns = arrSearchResults[i].getAllColumns();
			var revRecId = arrSearchResults[i].getValue(columns[0]);
			
			 try {
			 	var deleteJournalId = arrSearchResults[i].getValue(columns[3]);
			 	nlapiDeleteRecord('journalentry', deleteJournalId);
			 } 
			 catch (edelj) {
			 
			 }
				 
			var recSched = nlapiLoadRecord('revrecschedule', revRecId);
			
			do {
				var keepGoing = false;
				
				var lineId = arrSearchResults[i].getValue(columns[1]);
				var newPostingPeriod = objAccountingPeriods[arrSearchResults[i].getValue(columns[2])];

				var lineCount = recSched.getLineItemCount('recurrence');
				for (var j = 1; j <= lineCount; j++) {
					var currentLineId = recSched.getLineItemValue('recurrence', 'id', j);
					
					if (currentLineId == lineId) {
						recSched.setLineItemValue('recurrence', 'postingperiod', j, newPostingPeriod);
						break;
					}
				}
				
				/*
				 try {
				 var deleteJournalId = arrSearchResults[i].getValue(columns[3]);
				 nlapiDeleteRecord('journalentry', deleteJournalId);
				 }
				 catch (edelj) {
				 
				 }
				 */
				try {
					nlapiSubmitField('customrecord913', arrSearchResults[i].getId(), 'custrecordr7revper_done', 'T');
				} 
				catch (ecomp) {
				
				}
				
				if (i < arrSearchResults.length - 1) {
					var nextrevRecId = arrSearchResults[i + 1].getValue(columns[0]);
					if (nextrevRecId == revRecId) {
						keepGoing = true;
						i++;
					}
				}
			}
			while (keepGoing);
			
			nlapiSubmitRecord(recSched);
		} 
		catch (e) {
			nlapiLogExecution('ERROR', 'Error updating rev rec schedule', 'InternalID: ' + revRecId + '\nError: ' + e);
		}
	}
	
	if (rescheduleScript) {
		nlapiLogExecution('DEBUG', 'Rescheduling script (script/deploy id)', context.getDeploymentId());
		var status = nlapiScheduleScript(context.getScriptId(), context.getDeploymentId());
		nlapiLogExecution('DEBUG', 'Schedule Status', status);
	}
}

function getAccountPeriodIds(){

	var objAccountingPeriods = new Object();
	
	var arrFilters = new Array();
	arrFilters[0] = new nlobjSearchFilter('isinactive', null, 'is', 'F');
	
	var arrColumns = new Array();
	arrColumns[0] = new nlobjSearchColumn('internalid');
	arrColumns[1] = new nlobjSearchColumn('periodname');
	
	var newSearch = nlapiCreateSearch('accountingperiod', arrFilters, arrColumns);
	var resultSet = newSearch.runSearch();
	
	var rowNum = 0;
	do {
		var resultSlice = resultSet.getResults(rowNum, rowNum + 1000);
		for (var rs in resultSlice) {

			objAccountingPeriods[resultSlice[rs].getValue(arrColumns[1])] = resultSlice[rs].getValue(arrColumns[0]);
			
			rowNum++;
		}
	}
	while (resultSlice.length >= 1000);
	
	return objAccountingPeriods;
}

function timeLeft(){
	var presentTime = new Date().getTime();
	if (presentTime - startingTime > timeLimitInMilliseconds) {
		nlapiLogExecution('DEBUG', 'Ran out of time', 'yup');
		rescheduleScript = true;
		return false;
	}
	return true;
}

function unitsLeft(){
	var unitsLeft = context.getRemainingUsage();
	if (unitsLeft <= 100) {
		nlapiLogExecution('DEBUG', 'Ran out of units', 'yup');
		rescheduleScript = true;
		return false;
	}
	return true;
}