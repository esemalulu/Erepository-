function afterSubmit(type)
{
  type = type.toLowerCase();
  var recordId = nlapiGetRecordId();
  var recordType = nlapiGetRecordType();
  recordType = recordType.toLowerCase();

  // Create new system event
  var systemEvent = nlapiCreateRecord('customrecord_systemevent');
  systemEvent.setFieldValue('custrecord_systemevent_type', type);
  systemEvent.setFieldValue('custrecord_systemevent_record_type', recordType);
  systemEvent.setFieldValue('custrecord_systemevent_record_id', recordId);
  nlapiSubmitRecord(systemEvent);
}