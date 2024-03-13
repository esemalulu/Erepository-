function afterSubmit(type,id){
	var record = nlapiLoadRecord(nlapiGetRecordType(),nlapiGetRecordId());
	var ctx = nlapiGetContext();
	if(ctx.getExecutionContext()=='userinterface'){
		if(type=='create'||type=='copy'||type=='edit'){
			fieldValues = record.getFieldTexts('custrecordr7taskautoschedule');
			if(taskParameterRecordIsRunOnce(fieldValues)){
				nlapiScheduleScript(151);
			}
		}
	}	
}

function taskParameterRecordIsRunOnce(fieldValues){
	var verdict = false;
	for(var i=0;fieldValues!=null && i<fieldValues.length;i++){
		if(fieldValues[i]=='Run Once'){
			verdict = true;
			break;
		}
	}
	return verdict;
}