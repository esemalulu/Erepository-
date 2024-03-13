/*
 * @author efagone
 */

function r7_beforeSubmit(type){

	try {
		
		if (type == 'create') {
			setADPid();
		}
		
	} 
	catch (err) {
		nlapiLogExecution('ERROR', 'Problem employee beforeSubmit', err);
	}
	
}

function r7_afterSubmit(type){

	try {
		if (type == 'create') {
			checkADPId();
		}
	} 
	catch (err) {
		nlapiLogExecution('ERROR', 'Problem employee afterSubmit', err);
	}
	
}

function checkADPId(){
	if (ADPIdExists(nlapiGetFieldValue('custentityr7_adpemployeeid'))) {
		nlapiLogExecution('ERROR', 'DUPLICATE custentityr7_adpemployeeid', nlapiGetFieldValue('custentityr7_adpemployeeid'));
		var adminUser =  nlapiLoadConfiguration('companypreferences').getFieldValue('custscriptr7_system_info_email_sender');
		nlapiSendEmail(adminUser, adminUser, 'DUPLICATE ADP ID for employee', 'ADP ID: ' + nlapiGetFieldValue('custentityr7_adpemployeeid') + '\n\nEmployee: ' + nlapiGetRecordId());
	}
}

function setADPid(){

	try {
		nlapiSetFieldValue('custentityr7_adpemployeeid', parseInt(getLastADPid()) + 1);
	} 
	catch (e) {
		nlapiLogExecution('ERROR', 'Problem setting custentityr7_adpemployeeid', e);
	}
}

function getLastADPid(){

	var arrColumns = new Array();
	arrColumns[0] = new nlobjSearchColumn('custentityr7_adpemployeeid', null, 'max');
	
	var arrResults = nlapiSearchRecord('employee', null, null, arrColumns);
	
	return arrResults[0].getValue(arrColumns[0]);
	
}

function ADPIdExists(adpId){

	if (adpId == null || adpId == '') {
		return false;
	}
	
	var arrFilters = new Array();
	if (nlapiGetRecordId() != null && nlapiGetRecordId() != '') {
		arrFilters[arrFilters.length] = new nlobjSearchFilter('internalid', null, 'noneof', nlapiGetRecordId());
	}
	arrFilters[arrFilters.length] = new nlobjSearchFilter('custentityr7_adpemployeeid', null, 'equalto', adpId);
	
	var arrResults = nlapiSearchRecord('employee', null, arrFilters);
	
	if (arrResults != null && arrResults.length >= 1) {
		return true;
	}
	
	return false;
}
