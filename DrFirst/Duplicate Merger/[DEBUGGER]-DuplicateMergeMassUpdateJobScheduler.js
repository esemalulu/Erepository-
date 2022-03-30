Scripted Custom Duplicate Detection and Merge Processor

- SuiteAnswers:
https://netsuite.custhelp.com/app/answers/detail/a_id/26506#bridgehead_N3074408
https://netsuite.custhelp.com/app/answers/detail/a_id/26507/kw/script%20Duplicate%20merge

MASTERSELECTIONMODE_SELECT_BY_ID

var jobId = '';
var manager = nlapiGetJobManager('DUPLICATERECORDS');
var future = manager.getFuture(jobId);
alert(future.isDone());

function testMergeLPC_Records() {

	var duplicateRecords = ['265600', '2561886'];
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
	mergeJobRequest.setMasterId('145499');

	// Set duplicate records. Pass in parameter is an array of duplicate record IDs
	mergeJobRequest.setRecords(duplicateRecords);

	// Set the merge operation type.
	mergeJobRequest.setOperation(mergeJobRequest.OPERATION_MERGE);

	// Submit a job to process asynchronously. Submitting the job does not execute the job.
	// Submitting the job places the job in the queue.
	jobId = manager.submit(mergeJobRequest);

	// Check the job status
	var future = manager.getFuture(jobId);

	// See if job has completed.
	future.isDone();

	// See if job has been cancelled. Note, for merge duplicate records, this method will always return false
	future.isCancelled();

}