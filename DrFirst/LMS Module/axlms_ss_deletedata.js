//Change it to Delete all inactive ones

function lmsDataLoadCleaner() {
	//1. Find what records to delete
	// Go through in this order customrecord_lmslic, customrecord_lmsl, customrecord_lmsp, customrecord_lmsc
	
	//Go through licenses records 
	var cols = [new nlobjSearchColumn('internalid').setSort(true)];
	var rsrec = nlapiSearchRecord('customrecord_lmslic', null, null, cols);
	/**
	if (!rsrec) {
		//Go through location records
		rsrec = nlapiSearchRecord('customrecord_lmsl', null, null, cols);
		if (!rsrec) {
			//Go through practice records
			rsrec = nlapiSearchRecord('customrecord_lmsp', null, [new nlobjSearchFilter('internalid',null,'noneof',['1','12000'])], cols);
			if (!rsrec) {
				//Go through contract records
				rsrec = nlapiSearchRecord('customrecord_lmsc', null, null, cols);
			}
		}
	}
	*/
	//loop thorugh and delete the records
	for (var i=0; rsrec && i < rsrec.length; i++) {
		
		if (i==0) {
			nlapiLogExecution('debug', 'Processing', rsrec[i].getRecordType()+' // First ID To Delete: '+rsrec[i].getId());
		}
		
		try
		{
			nlapiDeleteRecord(rsrec[i].getRecordType(), rsrec[i].getId());
		}
		catch (errordelete)
		{
			log('error','Error deleting',rsrec[i].getId()+' // '+getErrText(errordelete));
		}
		
		
		//Set % completed of script processing
		var pctCompleted = Math.round(((i+1) / rsrec.length) * 100);
		nlapiGetContext().setPercentComplete(pctCompleted);
		
		//reschedule if gov is running low or legnth is 1000
		if (((i+1)==1000) || (nlapiGetContext().getRemainingUsage() <= 50)) {
			nlapiScheduleScript(nlapiGetContext().getScriptId(), nlapiGetContext().getDeploymentId(), null);
		}
	}
	
}


//--- REVERSE ORder
function lmsReverseDataLoadCleaner() {
	//1. Find what records to delete
	// Go through in this order customrecord_lmslic, customrecord_lmsl, customrecord_lmsp, customrecord_lmsc
	//Go through licenses records 
	var cols = [new nlobjSearchColumn('internalid').setSort()];
	var rsrec = nlapiSearchRecord('customrecord_lmslic', null, null, cols);
	/*
	if (!rsrec) {
		//Go through location records
		rsrec = nlapiSearchRecord('customrecord_lmsl', null, null, cols);
		if (!rsrec) {
			//Go through practice records
			rsrec = nlapiSearchRecord('customrecord_lmsp', null, [new nlobjSearchFilter('internalid',null,'noneof',['1','12000'])], cols);
			if (!rsrec) {
				//Go through contract records
				rsrec = nlapiSearchRecord('customrecord_lmsc', null, null, cols);
			}
		}
	}
	*/
	//loop thorugh and delete the records
	for (var i=0; rsrec && i < rsrec.length; i++) {
		
		if (i==0) {
			nlapiLogExecution('debug', 'Processing', rsrec[i].getRecordType()+' // First ID To Delete: '+rsrec[i].getId());
		}
		
		try
		{
			nlapiDeleteRecord(rsrec[i].getRecordType(), rsrec[i].getId());
		}
		catch (errordelete)
		{
			log('error','Error deleting',rsrec[i].getId()+' // '+getErrText(errordelete));
		}
		
		//Set % completed of script processing
		var pctCompleted = Math.round(((i+1) / rsrec.length) * 100);
		nlapiGetContext().setPercentComplete(pctCompleted);
		
		//reschedule if gov is running low or legnth is 1000
		if (((i+1)==1000) || (nlapiGetContext().getRemainingUsage() <= 50)) {
			nlapiScheduleScript(nlapiGetContext().getScriptId(), nlapiGetContext().getDeploymentId(), null);
		}
	}
	
}