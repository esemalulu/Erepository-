var constStringNoRecord = 'Record Does NOT Exists';


/**
 * Entry function to trigger custom Duplicate Merge process.
 * This function will access "AX:Duplicate Merge Stage" custom record and
 * execute scripted duplicate merge process.
 * 
 * Status of each submitted merge can be viewed on Duplicate Resolution page (List > Mass Update > Duplicate Resolution Status
 */
function processCustomDupMerge() {	
	//Search for Unprocessed Stage Records
	var dflt = [new nlobjSearchFilter('isinactive', null, 'is', 'F'),
	            new nlobjSearchFilter('custrecord_dms_jobid', null, 'isempty','')];
		
	var dcol = [new nlobjSearchColumn('custrecord_dms_masterid', null,'group').setSort(true)];
	
	var drs = nlapiSearchRecord('customrecord_ax_dupmerge_stage', null, dflt, dcol);

	for (var d=0; drs && d < drs.length; d+=1) 
	{
		var masterId = drs[d].getValue('custrecord_dms_masterid', null,'group');
		
		var hasMasterRecord = true;
		//Checkt to make sure masterId exists.
		try 
		{
			nlapiLoadRecord('customer', masterId);
		} 
		catch (mastererr) 
		{
			hasMasterRecord = false;
		}
		
		//1. Loop thorugh each Master Internal ID and search and return all Duplicates to merge 
		var ddflt = [new nlobjSearchFilter('isinactive', null, 'is', 'F'),
			         new nlobjSearchFilter('custrecord_dms_masterid', null, 'equalto',masterId)];
		
		var ddcol = [new nlobjSearchColumn('custrecord_dms_duplicatetid').setSort(true),
		             new nlobjSearchColumn('internalid')];
		
		var ddrs = nlapiSearchRecord('customrecord_ax_dupmerge_stage', null, ddflt, ddcol);
		
		//JSON Record 
		var dupJson = {
			'stagerec':{}, //Key :: Value = Dup Id :: Record Internal ID. Used to update job ids
			'dupids':[], //Represents Duplicate record IDs to be processed.  Used for looking up which ones are valid
			'validdupids':[], //Represents Duplicate record IDs that actually exists in NetSuite.
			'jobid':'' //Represent queued up JobID for THIS Master ID
		};
		
		//---------------Assume Results - Build and Submit Mass Duplicate Job-------------------------------------------
		//ONLY process 200
		for (var dd=0; dd < ddrs.length; dd+=1)
		{
			var dupId = ddrs[dd].getValue('custrecord_dms_duplicatetid');
			var recInternalId = ddrs[dd].getValue('internalid');
			
			dupJson.stagerec[dupId] = recInternalId;
			dupJson.dupids.push(dupId);
			
			//Break out if 200 is met. Let the remainder get processed next execution
			if ((dd+1) == 200) {
				break;
			}			
		}
		
		//Next step is to look up list of all Dup Ids that are valid and exists in System
		var validflt = [new nlobjSearchFilter('internalid', null, 'anyof', dupJson.dupids)];
		var validrs = nlapiSearchRecord('customer',null, validflt, null);
		for (var v=0; validrs && v < validrs.length; v+=1)
		{
			dupJson.validdupids.push(validrs[v].getId());
		}
		
		log('debug', 'masterId // JSON object', masterId+' // '+JSON.stringify(dupJson));
		
		//Only Queue up Mass Merge Job if there are Valid DupIds
		if (dupJson.validdupids.length > 0 && hasMasterRecord)
		{
			// Get a job manager instance.
			var manager = nlapiGetJobManager('DUPLICATERECORDS');

			// Create the merge job object.
			var mergeJobRequest = manager.createJobRequest();

			// Set the entity type.
			//include all three types
			mergeJobRequest.setEntityType(mergeJobRequest.ENTITY_CUSTOMER);

			// Set the master. Specifically set to be by ID
			mergeJobRequest.setMasterSelectionMode(mergeJobRequest.MASTERSELECTIONMODE_SELECT_BY_ID);
			
			//Set the Master ID
			mergeJobRequest.setMasterId(masterId);

			// Set duplicate records. Pass in parameter is an array of duplicate record IDs
			mergeJobRequest.setRecords(dupJson.validdupids);

			// Set the merge operation type.
			mergeJobRequest.setOperation(mergeJobRequest.OPERATION_MERGE);

			// Submit a job to process asynchronously. Submitting the job does not execute the job.
			// Submitting the job places the job in the queue.
			dupJson.jobid = manager.submit(mergeJobRequest);
		}
		
		//Once processing is done, go back and UPDATE Queue Record by looping thoruhg ALL Dup IDs
		//If Dup ID is NOT one of validdupids, update job id as "Record Does NOT Exists".
		for (var f=0; f < dupJson.dupids.length; f+=1)
		{
			var jobIdValue = dupJson.jobid;
			if (!hasMasterRecord || !dupJson.validdupids.contains(dupJson.dupids[f]))
			{
				jobIdValue = constStringNoRecord;
			}
			
			log('debug','jobid',jobIdValue);
			
			//Check to see if Master ID is valid and/or active/inactive
			var masterValueToSet = masterId;
			if (hasMasterRecord) 
			{
				var masterIsInactive = nlapiLookupField('customer', masterId, 'isinactive', false);
				
				if (masterIsInactive == 'T')
				{
					masterValueToSet = '';
				}
			}
			
			//Update Each Stage record with proper Job ID Value and set Master Record ID
			var queueUpdFld = ['custrecord_dms_jobid','custrecord_dms_masterrec'];
			var queueUpdVal = [jobIdValue, masterValueToSet];
			nlapiSubmitField('customrecord_ax_dupmerge_stage', dupJson.stagerec[dupJson.dupids[f]], queueUpdFld, queueUpdVal, false);
		}
		//--------------------------------------------------------------------------------------
		
		log('debug','Remaining Usage ',nlapiGetContext().getRemainingUsage());
		
		//Set % completed of script processing
		var pctCompleted = Math.round(((d+1) / drs.length) * 100);
		nlapiGetContext().setPercentComplete(pctCompleted);
		
		if ((d+1)==1000 || ((d+1) < drs.length && nlapiGetContext().getRemainingUsage() < 1000)) 
		{
			//reschedule
			nlapiLogExecution('debug','Getting Rescheduled at', masterId);
			nlapiScheduleScript(nlapiGetContext().getScriptId(), nlapiGetContext().getDeploymentId(), null);
			break;
		}
	}
}


/**
 * Check on status of JOB and record for users to see
 */
function checkDupeMergeProgress() {
	
	//Search for all queued stage where it's been processed (Job ID is not empty) but Status hasn't been updated 
	var progflt = [new nlobjSearchFilter('custrecord_dms_jobid', null, 'isnotempty'),
	               new nlobjSearchFilter('custrecord_dms_procstatus', null, 'isempty')];
	
	var progcol = [new nlobjSearchColumn('internalid').setSort(true),
	               new nlobjSearchColumn('custrecord_dms_jobid')];
	
	var progrs = nlapiSearchRecord('customrecord_ax_dupmerge_stage', null, progflt, progcol);
	
	//Go through all and check/set status for each job
	for (var p=0; progrs && p < progrs.length; p+=1)
	{
		var jobId = progrs[p].getValue('custrecord_dms_jobid');
		var status = '';
		var statusLink = '';
		if (jobId == constStringNoRecord)
		{
			status = 'No Need to Process';
		}
		else 
		{
			//check to see what the status is
			// Get a job manager instance.
			var jobManager = nlapiGetJobManager('DUPLICATERECORDS');
			// Check the job status
			var jobStatus = jobManager.getFuture(jobId);
			
			if (jobStatus.isDone())
			{
				status = 'Done - Check Status Under List > Mass Update > Duplicate Resolution Status';
				statusLink = '/app/common/entity/duplicatemanagement/dupejoberrors.nl?jobId='+jobId;
			}
		}
		
		if (status) 
		{
			
			var updfld = ['custrecord_dms_procstatus','custrecord_dms_statusdetailpage'];
			var updval = [status, statusLink];
			
			nlapiSubmitField('customrecord_ax_dupmerge_stage', progrs[p].getValue('internalid'), updfld, updval, false);
		}
		
		log('debug','Remaining Usage ',nlapiGetContext().getRemainingUsage());
		
		//Set % completed of script processing
		var pctCompleted = Math.round(((p+1) / progrs.length) * 100);
		nlapiGetContext().setPercentComplete(pctCompleted);
		
		if ((p+1)==1000 || ((p+1) < progrs.length && nlapiGetContext().getRemainingUsage() < 1000)) 
		{
			//reschedule
			nlapiLogExecution('debug','Getting Rescheduled at', progrs[p].getValue('internalid'));
			nlapiScheduleScript(nlapiGetContext().getScriptId(), nlapiGetContext().getDeploymentId(), null);
			break;
		}
		
	}
	
}
