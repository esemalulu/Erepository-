var searchId = 4164;
var searchRecord = "customrecordphonestatistics";

var deleteRecordsToo = true;
var deleteSearchId = 4165;
var deleteSearchRecord = "customrecordphonestatistics";

var customRecord = "customrecordr7phonestatsarchive";
var customRecordFields = new Array(
"custrecordr7phonestatsarchivedateofcall",
"custrecordr7phonestatsarchiveemployee",
"custrecordr7phonestatsarchivemanager",
"custrecordr7phonestatsarchivenocalls",
"custrecordr7phonestatsarchivetotaltime",
"custrecordr7phonestatsarchivelongestcall",
"custrecordr7phonestatsarchiveavgcall",
"custrecordr7phonestatsarchivefirstcall",
"custrecordr7phonestatsarchivelastcall",
"custrecordr7phonestatsarchiveunresolved",
"custrecordr7phonestatsarchivestage0",
"custrecordr7phonestatsarchivestage1",
"custrecordr7phonestatsarchivestage2",
"custrecordr7phonestatsarchivestage36",
"custrecordr7phonestatsarchivestage79",
"custrecordr7phonestatsarchivelostclosed",
"custrecordr7phonestatsarchivecustomer",
"custrecordr7phonestatsarchiveactive",
"custrecordr7phonestatsarchiveinactive",
"custrecordr7phonestatsarchiveprimary",
"custrecordr7phonestatsarchivebuyer",
"custrecordr7phonestatsarchivetester",
"custrecordr7phonestatsarchiverecommender",
"custrecordr7phonestatsarchiverecommender",
"custrecordr7phonestatsarchivenorole");



function archive(){

	var ctx = nlapiGetContext();
	var leftOffIndex = ctx.getSetting('SCRIPT', 'custscriptleftoffindex');
	var leftOffLastRunDate = ctx.getSetting('SCRIPT', 'custscriptleftofflastrun');
	nlapiLogExecution('DEBUG', 'Left Off Index', leftOffIndex);
	nlapiLogExecution('DEBUG', 'Left Off Last Completed Run Date', leftOffLastRunDate);
	
	if (leftOffIndex == null || leftOffIndex === '') {
		leftOffIndex = 0;
	}
	
	var archivingDone = false;
	var deletingDone = false;
	
	var lastRunDate = leftOffLastRunDate;
	
	if (lastRunDate == null || lastRunDate == '') {
		lastRunDate = nlapiStringToDate(obtainLastRunDate());
	}
	else {
		lastRunDate = nlapiStringToDate(lastRunDate);
	}
	
	nlapiLogExecution('DEBUG', 'Using Left Off Index', leftOffIndex);
	nlapiLogExecution('DEBUG', 'Using Last Completed Run Date', lastRunDate);
	
	var arrSearchFilters = new Array();
	arrSearchFilters[arrSearchFilters.length] = nlobjSearchFilter('custrecordr7phonedateofcall', null, 'on', nlapiAddDays(lastRunDate, 1));
	
	var results = nlapiSearchRecord(searchRecord, searchId, arrSearchFilters);
	
	if (results != null) {
		nlapiLogExecution('DEBUG', 'Results length', results.length);
	}
	else {
		nlapiLogExecution('DEBUG', 'Results length', 0);
	}
	
	this.activityLog = "Inactive/Active Employee Log";
	
	for (var i = leftOffIndex; results != null && i < results.length && unitsLeft(100); i++) {
	
		//nlapiLogExecution('DEBUG', 'At i=', i);
		
		var record = nlapiCreateRecord(customRecord);
		var columns = results[i].getAllColumns();
		for (var j = 0; j < customRecordFields.length; j++) {
			if (columns[j].type == 'select') {
				var value = parseInt(results[i].getValue(columns[j])) + "";
				record.setFieldValue(customRecordFields[j], value);
			}
			else {
				record.setFieldValue(customRecordFields[j], results[i].getValue(columns[j]));
			}
		}
		try {
			//nlapiLogExecution('DEBUG', 'Starting activateEmployeeSubmitRecordInactivateEmployee routine', 'yup');
			activateEmployeeSubmitRecordInactivateEmployee(record);
		} 
		catch (e) {
			nlapiLogExecution('ERROR', "ERROR:" + e.name, "MESSAGE:" + e.message);
		}
	}
	var adminUser =  nlapiLoadConfiguration('companypreferences').getFieldValue('custscriptr7_system_info_email_sender');
	nlapiSendEmail(adminUser, adminUser, 'Activity Log of Activation/Inactivation', activityLog);
	
	
	//Checking if archiving is done	
	if (results == null || i >= results.length) {
		archivingDone = true;
	}
	nlapiLogExecution('DEBUG', 'Archiving Done', archivingDone);
	
	//Only if archiving is done go into deleting
	if (archivingDone) {
		if (deleteRecordsToo) {
		
			var deleteSearchResults = nlapiSearchRecord('customrecordphonestatistics', deleteSearchId);
			
			if (deleteSearchResults != null){
				nlapiLogExecution('Debug', 'Deleting', deleteSearchResults.length + ' results to delete.');
			}
			
			for (var k = 0; deleteSearchResults != null && k < deleteSearchResults.length && unitsLeft(60); k++) {
				
				nlapiDeleteRecord('customrecordphonestatistics', deleteSearchResults[k].getId());
				
				if (k == 999) {
					nlapiLogExecution('DEBUG', 'Getting more results', 'yup');
					deleteSearchResults = nlapiSearchRecord('customrecordphonestatistics', deleteSearchId);
					k = 0;
				}
				
			}
			
			if (deleteSearchResults == null || k == deleteSearchResults.length) {
				nlapiLogExecution('Debug', 'Finished Deleting Old Records', 'yup');
				deletingDone = true;
			}
		}
		else {
			deletingDone = true;
		}
	}
	
	//if both archiving and deleting are done quit
	if (!archivingDone || !deletingDone) {
		//scheduling script to continue archiving current day
		nlapiLogExecution('DEBUG', nlapiDateToString(nlapiAddDays(lastRunDate, 1)) + ' is NOT FINISHED.', 'Scheduling same day to finish it.');
		
		var params = new Array();
		params['custscriptleftoffindex'] = i;
		params['custscriptleftofflastrun'] = nlapiDateToString(lastRunDate);
		
		nlapiScheduleScript(ctx.getScriptId(), null, params);
	}
	else 
		if (archivingDone && deletingDone && lastRunDate < nlapiAddDays(new Date(), -14)) {
			//scheduling script to archive following day
			nlapiLogExecution('DEBUG', nlapiDateToString(nlapiAddDays(lastRunDate, 1)) + ' is complete.', 'Scheduling next day.');
			
			var params = new Array();
			params['custscriptleftoffindex'] = 0;
			params['custscriptleftofflastrun'] = nlapiDateToString(nlapiAddDays(lastRunDate, 1));
			nlapiScheduleScript(ctx.getScriptId(), null, params);
		}
	
}

function obtainLastRunDate(){

	var arrSearchResults = nlapiSearchRecord('customrecordr7phonestatsarchive', 12594);
	
	if (arrSearchResults != null) {
		var columns = arrSearchResults[0].getAllColumns();
		
		return arrSearchResults[0].getValue(columns[0]);
	}
	
	return null;
}

function unitsLeft(number){
    var unitsLeft = nlapiGetContext().getRemainingUsage();
    if (unitsLeft >= number) {
        return true;
    }
	nlapiLogExecution('DEBUG', 'Ran out of units', 'yup');
    return false;
}

function activateEmployeeSubmitRecordInactivateEmployee(record){
	var employeeId = record.getFieldValue('custrecordr7phonestatsarchiveemployee');
	var employeeName = record.getFieldText('custrecordr7phonestatsarchiveemployee');
	var isInactive = nlapiLookupField('employee',employeeId,'isinactive');	
	
	var managerId = record.getFieldValue('custrecordr7phonestatsarchivemanager');
	var managerName = record.getFieldText('custrecordr7phonestatsarchivemanager');
	var managerIsInactive = nlapiLookupField('employee',managerId,'isinactive');
	var toURL = nlapiRequestURL(nlapiResolveURL('SUITELET','customscriptretrieveurl','customdeployretrieveurl',true)).getBody();
	
	if(isInactive=='T' || managerIsInactive=='T'){
		try {
			
			if (isInactive == 'T') {
				activateEmployee(employeeId);
				nlapiLogExecution('DEBUG', 'Activating Employee ', employeeName + " " + employeeId );
				activityLog += '\n\n Activated Employee '+ employeeName + " " + employeeId + " "+toURL+"/app/common/entity/employee.nl?id="+employeeId;
			}
			
			if(managerIsInactive=='T'){
				nlapiLogExecution('DEBUG','Activating Employee(Manager)', managerName + " " + managerId);
				activateEmployee(managerId);
				activityLog += '\nActivated Employee(Manager) '+ managerName + " " + managerId + " "+toURL+"/app/common/entity/employee.nl?id="+managerId;
			}
			
			nlapiSubmitRecord(record);
			nlapiLogExecution('DEBUG','Submitting Record','yup');
			
			if (isInactive == 'T') {
				inactivateEmployee(employeeId);
				nlapiLogExecution('DEBUG', 'Inactivating Employee', employeeName + " " +employeeId + " "+toURL+"/app/common/entity/employee.nl?id="+employeeId);
				activityLog += '\nInactivated Employee '+ employeeName + " " +employeeId;
			}
			
			if(managerIsInactive=='T'){
				nlapiLogExecution('DEBUG','Inactivating Employee(Manager)', managerName + " " + managerId);
				inactivateEmployee(managerId);
				activityLog += '\nInactivated Employee(Manager) '+ managerName + " " + managerId + " "+toURL+"/app/common/entity/employee.nl?id="+managerId;
			}		
		}catch(e){
			nlapiLogExecution('ERROR','Error on activating/inactivating employee',e);
			var emailText = 
			'Error while activating/inactivating  the following employee: ' + employeeName + 
			' <a href="'+toURL+'/app/common/entity/entity.nl?id=' + employeeId + '"> employee </a>' +
			'\n<br> or his/her manager '+ managerName + 
			' <a href="'+toURL+'/app/common/entity/entity.nl?id=' + managerId + '"> manager </a>' +
			'\n\n\n<br> Please investigate.'+
			'\n'+
			'<br>Thanks'+
			'<br>Netsuite'+
			'\n<br><br>Activity Log';
			var adminUser =  nlapiLoadConfiguration('companypreferences').getFieldValue('custscriptr7_system_info_email_sender');
			nlapiSendEmail(adminUser,adminUser,
			'Error on activating/inactivating employee',
			emailText);
		}	
	}else{
		nlapiSubmitRecord(record);
		//nlapiLogExecution('DEBUG','Submitted Record No activation/inactivation necessary','yup');
	}
}

function activateEmployee(employeeInternalId){
	nlapiSubmitField('employee',employeeInternalId,'isinactive','F');
}
function inactivateEmployee(employeeInternalId){
	nlapiSubmitField('employee',employeeInternalId,'isinactive','T');
}


/*
Date
Employee
Manager
noOfCalls
TotalTime
LongestCall
AvgCall
FirstCall
lastCall
Unresolve
Stage0
Stage1
Stage2
Stage36
Stage79
LostClosed
Customer
Active
Inactive
Primary
Buyer
Tester
Recommender
Other 
NoRole
*/



