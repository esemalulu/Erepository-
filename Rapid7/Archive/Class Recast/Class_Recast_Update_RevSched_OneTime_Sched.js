/*
 * @author efagone
 * 
 * 
https://system.sandbox.netsuite.com/app/common/search/searchresults.nl?searchid=18949

Only change line items for period 1/2013 and forward (leave line items for 2012 and earlier alone)
Take a snapshot of current period for the journal -vs- revsched line -- force revsched line to match old journal period upon edit of line
For target revsched line, delete all journals and repost with new income acct and original journal posting period

 */

function updateRevRecs_Class_Sched(){
	
	var timeLimitInMinutes = 10;
	this.timeLimitInMilliseconds = timeLimitInMinutes * 60 * 1000;
	this.startingTime = new Date().getTime();
	this.context = nlapiGetContext();
	this.rescheduleScript = false;
	
	var context = nlapiGetContext();
	
	//var objAccountingPeriods = getAccountPeriodIds();
	
	var searchId = context.getSetting('SCRIPT', 'custscriptr7classrecastonetime_srchid');
	if (!searchId){
		return;
	}
	
	var arrSearchResults = nlapiSearchRecord('transaction', searchId);
	
	for (var i = 0; arrSearchResults != null && i < arrSearchResults.length && timeLeft() && unitsLeft(300); i++) {
	
		try {
		
			var columns = arrSearchResults[i].getAllColumns();
			var revRecId = arrSearchResults[i].getValue(columns[9]);
			
			var recSched = nlapiLoadRecord('revrecschedule', revRecId);

			var lineCount = recSched.getLineItemCount('recurrence');
			for (var j = 1; j <= lineCount; j++) {
				
				var currentPostPeriodYear = parseInt(recSched.getLineItemValue('recurrence', 'postingperiod_display', j).substr(4));
				if (isNaN(currentPostPeriodYear) || currentPostPeriodYear < 2011) {
					//only doing 2011+
					continue; 
				}
				
				var currentLineJournalId = recSched.getLineItemValue('recurrence', 'journaldoc', j);
				try {
					if (currentLineJournalId) {
						nlapiDeleteRecord('journalentry', currentLineJournalId);
					}
				} 
				catch (edelj) {
				
				}
			}
						
			var recSched = nlapiLoadRecord('revrecschedule', revRecId);
			
			var newIncomeAccount = arrSearchResults[i].getValue(columns[8]);
			
			var lineCount = recSched.getLineItemCount('recurrence');
			for (var j = 1; j <= lineCount; j++) {

				var currentAmount = recSched.getLineItemValue('recurrence', 'recamount', j);

				var currentPostPeriodYear = parseInt(recSched.getLineItemValue('recurrence', 'postingperiod_display', j).substr(4));
				if (isNaN(currentPostPeriodYear) || currentPostPeriodYear < 2011) {
					//only doing 2011+
					continue;
				}
				
				var currentLineJournalId = recSched.getLineItemValue('recurrence', 'journaldoc', j);
				try {
					if (currentLineJournalId) {
						nlapiDeleteRecord('journalentry', currentLineJournalId);
					}
				} 
				catch (edelj) {
				
				}
				
				recSched.setLineItemValue('recurrence', 'incomeaccount', j, newIncomeAccount);
				recSched.setLineItemValue('recurrence', 'recamount', j, currentAmount);
			}
			
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

	var objAccountingPeriods = {};
	
	var arrFilters = [];
	arrFilters[0] = new nlobjSearchFilter('isinactive', null, 'is', 'F');
	
	var arrColumns = [];
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