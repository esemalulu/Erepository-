/*
 * @author efagone
 */

function zc_run_srp_misc_scheduled(){
	
	//set time limit
	timeLimitInMinutes = 10;
	
	//run all processes (from library)
	processProjectFields();
	processProjectOrderLink();
	
	//run standalone processes (not in library)
	syncProjectAmountsWithSalesOrder();
	
	nlapiLogExecution('AUDIT', 'Finished Script', 'Thank you and have a good day.');
	
	if (rescheduleScript) {
		nlapiLogExecution('AUDIT', 'Rescheduling script (script/deploy id)', 'yup');
		var status = nlapiScheduleScript(context.getScriptId());
		nlapiLogExecution('DEBUG', 'Schedule Status', status);
	}
	
}

function syncProjectAmountsWithSalesOrder(){

	nlapiLogExecution('AUDIT', 'Starting syncProjectAmountsWithSalesOrder()', 'now');
	//SCRIPT: SRP Project/Sales Order Sync
	if (rescheduleScript) {
		return;
	}
	
	var savedsearch = nlapiLoadSearch('job', 'customsearchzc_srp_jobsalesorder_sync');
	var resultSet = savedsearch.runSearch();
	
	var countProcessed = 0;
	var rowNum = 0;
	
	do {
		var resultSlice = resultSet.getResults(rowNum, rowNum + 1000);
		for (var rs in resultSlice) {
			if (!timeLeft() || !unitsLeft()) {
				break;
			}
			rowNum++;
			
			var columns = resultSlice[rs].getAllColumns();
			var recId = resultSlice[rs].getValue(columns[0]);
			var newAmount = resultSlice[rs].getValue(columns[2]);
			var newAmount606 = resultSlice[rs].getValue(columns[3]);

			try {
				nlapiLogExecution('DEBUG', 'Processing result', recId);
				nlapiSubmitField('job', recId, 'custentityr7jobvsoeallocation', newAmount);
				nlapiSubmitField('job', recId, 'custentityr7_606_jobvsoeallocation', newAmount606);
				countProcessed++;
			} 
			catch (e) {
				nlapiLogExecution('ERROR', 'Could not submit record ' + recId, e);
			}
			
		}
	}
	while (resultSlice.length >= 1000 && !rescheduleScript);
	
	nlapiLogExecution('AUDIT', 'Number of records processed (customsearchzc_srp_jobsalesorder_sync)', countProcessed);
	
	return true;
}