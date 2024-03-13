function doIt(type){
	if (type == 'create' || type == 'edit') {
	
		var record = nlapiLoadRecord(
		nlapiGetRecordType(),
		nlapiGetRecordId()
		);
		
	if(record.getFieldValue('custrecordr7msresetunprocessed')=='T'){
			nlapiScheduleScript(scheduledScriptId,deploymentId);		
	}
}
}
var scheduledScriptId = 251;
var deploymentId = 1;