/*
 * @author efagone
 */

function zc_srpsurvey_beforeSubmit(type){

	try {
	
		if (type == 'create' || type == 'edit') {
			sourceJobFromSID();
		}
		
	} 
	catch (e) {
		nlapiLogExecution('ERROR', 'Problem zc_srpsurvey_beforeSubmit', e);
	}
	
}

function zc_srpsurvey_afterSubmit(type){

	try {
		
	} 
	catch (e) {
		nlapiLogExecution('ERROR', 'Problem zc_srpsurvey_afterSubmit', e);
	}
	
}

function sourceJobFromSID(){

	try {
		var sid = nlapiGetFieldValue('custrecordr7srpsurvey_job_sid');
		var jobId = nlapiGetFieldValue('custrecordr7srpsurvey_job');
		
		if (sid && !jobId) {
		
			var objJob = getJobBySID(sid);
			
			if (objJob && objJob.hasOwnProperty('job_id')) {
			
				nlapiSetFieldValue('custrecordr7srpsurvey_customer', objJob.customer_id);
				nlapiSetFieldValue('custrecordr7srpsurvey_job', objJob.job_id);
				nlapiSetFieldValue('custrecordr7srpsurvey_projecttask', objJob.projecttask_id);
				
				//nlapiSetFieldValue('custrecordr7srpsurvey_resources', objJob.resources);

			}
		}
		
	} 
	catch (e) {
		nlapiLogExecution('ERROR', 'Problem sourceJobFromSID', e);
	}
}

function getJobBySID(sid){

	if (!sid) {
		return null;
	}
	
	var arrFilters = [];
	arrFilters.push(new nlobjSearchFilter('custentityr7_project_sid', null, 'is', sid));
	
	var arrColumns = [];
	arrColumns.push(new nlobjSearchColumn('internalid'));
	arrColumns.push(new nlobjSearchColumn('customer'));
	//arrColumns.push(new nlobjSearchColumn('internalid', 'resourceallocation')); //resource allocation
	
	var arrResults = nlapiSearchRecord('job', null, arrFilters, arrColumns);
	
	var objJobs = {};
	for (var i = 0; arrResults && i < arrResults.length; i++) {
		
		var jobId = arrResults[i].getValue('internalid');
		
		var objJob = (objJobs.hasOwnProperty(jobId)) ? objJobs[jobId] : {
			job_id: jobId,
			projecttask_id: null,
			customer_id: arrResults[i].getValue('customer'),
			resources: []
		};
		
		//objJob.resources.push(arrResults[i].getValue('internalid', 'resourceallocation'));
		
		objJobs[jobId] = objJob;
	}
	
	for (var jobId in objJobs) {
		return objJobs[jobId];
	}
	
	return null;
}
