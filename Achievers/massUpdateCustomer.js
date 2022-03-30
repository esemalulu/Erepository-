function afterSubmit(type)
{
var newId = nlapiGetRecordId();
var newType = nlapiGetRecordType();
nlapiLogExecution('DEBUG','<After Submit Script> type:'+type+', RecordType:
'+newType+', Id:'+newId);
}