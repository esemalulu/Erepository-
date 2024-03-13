function afterSubmit(type,id){
	
	if(type=='edit'){
	var record = nlapiLoadRecord(nlapiGetRecordType(),nlapiGetRecordId());
	var dateLicenseWasCreated = nlapiStringToDate(record.getFieldValue('created'));
	var dateScriptWasImplemented = new Date();dateScriptWasImplemented.setFullYear(2010,3,1);
	nlapiLogExecution('DEBUG','Date License Was Created',record.getFieldValue('created'));
	nlapiLogExecution('DEBUG','First Access Presently',record.getFieldValue('custrecordr7nxfirstaccessdate'));
	nlapiLogExecution('DEBUG','Last Access Presently',record.getFieldValue('custrecordr7nxlastaccessed'));
		
	if((record.getFieldValue('custrecordr7nxfirstaccessdate')==null ||
	record.getFieldValue('custrecordr7nxfirstaccessdate')==''
	)
	&& (record.getFieldValue('custrecordr7nxlastaccessed')!=null || 
	record.getFieldValue('custrecordr7nxlastaccessed')!='') && 
	dateLicenseWasCreated > dateScriptWasImplemented){
		//record.setFieldValue('custrecordr7nxfirstaccessdate') = record.getFieldValue('custrecordr7nxlastaccessed');
		nlapiLogExecution('DEBUG','Setting First Access To',record.getFieldValue('custrecordr7nxlastaccessed'));
	nlapiSubmitField(nlapiGetRecordType(),nlapiGetRecordId(),'custrecordr7nxfirstaccessdate',record.getFieldValue('custrecordr7nxlastaccessed'));
	}
	}
}
