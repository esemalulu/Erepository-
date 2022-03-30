function createJobRecord()
{
	var customer = nlapiGetNewRecord();
	var customer_internalId = customer.getFieldValue('internalId');
	var job = nlapiCreateRecord('job');
	job.setFieldValue('parent', customer_internalId);
	job.setFieldValue('title', 'Andre Test Job 1');
	id = nlapiSubmitRecord(job, true);	
}