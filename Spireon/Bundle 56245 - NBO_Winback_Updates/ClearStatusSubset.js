function UEASClearStatusSubset(type)
{
	if (type != 'delete')
	{
		var customerRecord = nlapiLoadRecord(nlapiGetRecordType(), nlapiGetRecordId());
		var customerStatus = customerRecord.getFieldValue('entitystatus');
		var customerStatusSubset = customerRecord.getFieldValue('custentity316');
		if (customerStatus == 93 || customerStatus == 95 || customerStatus == 94 || customerStatus == 92 || customerStatus == 99 || customerStatus == 98 || customerStatus == 97 || customerStatus == 63 || customerStatus == 100 || customerStatus == 101 || (customerStatus == 13 && (customerStatusSubset != 60 && customerStatusSubset != 61 && customerStatusSubset != 62)))
		{
			customerRecord.setFieldValue('custentity316', '');
			customerRecord = nlapiSubmitRecord(customerRecord, true, true);
		}
	}
}