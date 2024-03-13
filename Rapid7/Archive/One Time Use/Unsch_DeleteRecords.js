function deleteRecords(){
	
	crash
	
	var ctx = nlapiGetContext();
	var recordType='customrecordr7datascrub';
	
	var results = nlapiSearchRecord(recordType);
	
	while (results != null && unitsLeft(100)) {
		for (var i = 0; results != null && i < results.length && unitsLeft(100); i++) {
			nlapiDeleteRecord(recordType, results[i].getId());
		}
		results = nlapiSearchRecord(recordType);
	}
	
	if (i + 1 < results.length) {
		wasteUnits(availableUnits() - 30);
		nlapiScheduleScript(ctx.getScriptId(), ctx.getDeploymentId());
	}
}

function availableUnits(){
	return nlapiGetContext().getRemainingUsage();
}


function unitsLeft(number){
    var unitsLeft = nlapiGetContext().getRemainingUsage();
    if (unitsLeft >= number) {
        return true;
    }
    return false;
}

function wasteUnits(number){
	var beginningUsage = nlapiGetContext().getRemainingUsage();
	var remainingUsage = nlapiGetContext().getRemainingUsage();
	while (remainingUsage >= beginningUsage - number) {
		var someWastefulActivity = nlapiLookupField('customer', 130910, 'isinactive');
		remainingUsage = nlapiGetContext().getRemainingUsage();
	}
}
