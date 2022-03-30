function beforeSubmitSetStatus(type)
{
	nlapiLogExecution('DEBUG', 'Sales Order needs to be sent to Apigee');
	nlapiSetFieldValue('custbody_sent_to_apigee', 'F');
}