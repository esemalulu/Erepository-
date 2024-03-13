/*
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       12 Aug 2013     efagone
 *
 */

function beforeLoad(type, form){
	
	var sidFieldId = getSidField();
	if (type == 'copy'){
		var fldSID = form.getField(sidFieldId);
		fldSID.setDefaultValue('');
		var fldProcessed = form.getField('custrecordr7employeenotificationprocess');
		fldProcessed.setDefaultValue('F');
	}
}

function beforeSubmit(type){
	var sidFieldId = getSidField();
	if (type == 'create' || type == 'copy') {
		nlapiSetFieldValue(sidFieldId, getRandomString(15));
		nlapiSetFieldValue('custrecordr7employeenotificationprocess', 'F');
	}
}

function afterSubmit(type){

	if (type != 'delete') {
		var processed = nlapiGetFieldValue('custrecordr7employeenotificationprocess');
		if (processed == 'F') {
			nlapiScheduleScript(772); //process script
		}
	}
}

function getSidField(){
	var recType = nlapiGetRecordType();
	var sidFieldId = new String();
	switch(recType){
		// Employee Notification System
		case 'customrecordr7employeenotificationmsgsnt':
			sidFieldId = 'custrecordr7employeenotifysid';
			break;
		// Employee Notification Msg Sent
		case 'customrecordr7employeenotificationsystem':
			sidFieldId = 'custrecordr7employeenotificationsid';
			break;
	}
	return sidFieldId;
}
