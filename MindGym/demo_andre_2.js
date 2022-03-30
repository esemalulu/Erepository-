function createJobRecord()
{
	var customer_internalId = '36';
	var job_name = "Andre Test Job";
	var date = new Date();
	var job = nlapiCreateRecord('job');
	job.setFieldValue('parent', customer_internalId);
	job.setFieldValue('title', job_name+date);
	id = nlapiSubmitRecord(job, true);	
}