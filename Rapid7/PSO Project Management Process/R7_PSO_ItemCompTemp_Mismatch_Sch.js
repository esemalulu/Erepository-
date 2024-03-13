/*
 * @author efagone
 */
function updateDurationPercent(){

	var timeLimitInMinutes = 10;
	this.timeLimitInMilliseconds = timeLimitInMinutes * 60 * 1000;
	this.startingTime = new Date().getTime();
	this.context = nlapiGetContext();
	this.rescheduleScript = false;
	
	var arrSearchColumns = new Array();
	arrSearchColumns[0] = new nlobjSearchColumn('internalid', 'custrecordr7psoitemcompitem', 'group');
	arrSearchColumns[1] = new nlobjSearchColumn('custrecordr7psoitemcomppercent', null, 'sum');
	arrSearchColumns[2] = new nlobjSearchColumn('custrecordr7psoitemcompduration', null, 'sum');
	arrSearchColumns[3] = new nlobjSearchColumn('custitemr7psototalpercentage', 'custrecordr7psoitemcompitem', 'max');
	arrSearchColumns[4] = new nlobjSearchColumn('custitemr7psototalduration', 'custrecordr7psoitemcompitem', 'max');
	
	var arrSearchResults = nlapiSearchRecord('customrecordr7psoitemcomp', null, null, arrSearchColumns);
	
	for (var i = 0; i < arrSearchResults.length && timeLeft() && unitsLeft(); i++) {
	
		var itemId = arrSearchResults[i].getValue(arrSearchColumns[0]);
		var percent = arrSearchResults[i].getValue(arrSearchColumns[1]);
		var duration = arrSearchResults[i].getValue(arrSearchColumns[2]);
		var itemPercent = arrSearchResults[i].getValue(arrSearchColumns[3]);
		var itemDuration = arrSearchResults[i].getValue(arrSearchColumns[4]);
		
		if (percent != itemPercent || duration != itemDuration) {
		
			var itemResult = nlapiSearchRecord('item', null, nlobjSearchFilter('internalid', null, 'is', itemId), null);
			var itemType = itemResult[0].getRecordType();
			
			var fields = new Array();
			fields[0] = 'custitemr7psototalpercentage';
			fields[1] = 'custitemr7psototalduration';
			
			var values = new Array();
			values[0] = percent;
			values[1] = duration;
			
			nlapiSubmitField(itemType, itemId, fields, values);
			
		}
	}
	
	if (rescheduleScript) {
		nlapiLogExecution('DEBUG', 'Rescheduling script (script/deploy id)', context.getScriptId() + ' : ' + context.getDeploymentId());
		var status = nlapiScheduleScript(context.getScriptId(), context.getDeploymentId());
		nlapiLogExecution('DEBUG', 'Schedule Status', status);
	}
	
}

function timeLeft(){
	var presentTime = new Date().getTime();
	if (presentTime - startingTime > timeLimitInMilliseconds) {
		nlapiLogExecution('DEBUG', 'Ran out of time', 'yup');
		rescheduleScript = true;
		return false;
	}
	return true;
}

function unitsLeft(){
	var unitsLeft = context.getRemainingUsage();
	if (unitsLeft <= 100) {
		nlapiLogExecution('DEBUG', 'Ran out of units', 'yup');
		rescheduleScript = true;
		return false;
	}
	return true;
}
