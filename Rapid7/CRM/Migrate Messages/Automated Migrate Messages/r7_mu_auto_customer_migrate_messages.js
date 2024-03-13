function r7_run_massUpdate(recordType, customerId)
{
    var linkedId = nlapiLookupField(recordType, customerId, 'custentityr7linkedcustomer');
    var id = addToRecordTypeForMigrate(customerId, linkedId);
    if(id)
    {
        var scheduleId = nlapiGetContext().getSetting('SCRIPT', 'custscript_r7muschscriptid');
        var status = nlapiScheduleScript(scheduleId, 'customdeploy_r7muautomigmessages');
        nlapiLogExecution('AUDIT', 'status', status);
    }
}

function addToRecordTypeForMigrate(customerId, customerToId)
{
    var id;
    var record = nlapiCreateRecord('customrecord_r7migratedmessages');
        record.setFieldValue('custrecord_r7customerid', customerId);
        record.setFieldValue('custrecord_r7customertoid', customerToId);
    try {
        id = nlapiSubmitRecord(record);
    }
    catch (e) {
        nlapiLogExecution('ERROR', 'ERROR during record creation', e);
    }
    return id;
}