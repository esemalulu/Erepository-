/*
 * @author efagone
 */
var objJobs = {};
var zc_serverObject = {};

function zc_pageInit(type){

	if (nlapiGetFieldValue('custpage_ispopup') == 'T') {
		if (jQuery('#innerwrapper')) {
			jQuery('#innerwrapper').css('padding-left', '10px');
		}
	}
	
	zc_serverObject = JSON.parse(nlapiGetFieldValue('custpage_client_json'));
}

function zc_fieldChanged(type, name, linenum){
	
	if (name == 'custpage_project'){
		zc_sourceContacts(nlapiGetFieldValue('custpage_project'));
		sourceTemplates(nlapiGetFieldValue('custpage_project'));
	}
}

function zc_sourceContacts(jobId){

	nlapiRemoveSelectOption('custpage_contact');
	nlapiInsertSelectOption('custpage_contact', '', '', true);
	
	var objJob = getJobObject(jobId);
	if (objJob && objJob.contacts) {
		for (var contactId in objJob.contacts) {
			if (objJob.contacts[contactId].email) {
				var name = objJob.contacts[contactId].name + ((objJob.contacts[contactId].primary) ? ' (Primary)' : '');
				nlapiInsertSelectOption('custpage_contact', objJob.contacts[contactId].internalid, name, (objJob.contacts[contactId].primary) ? true : false);
			}
		}
	}
	
	return;
}

function sourceTemplates(jobId){

	nlapiRemoveSelectOption('custpage_template');
	nlapiInsertSelectOption('custpage_template', '', '', true);
	
	var objJob = getJobObject(jobId);
	var arrTemplates = zc_serverObject.templates;
	
	if (objJob) {
		for (var i = 0; arrTemplates && i < arrTemplates.length; i++) {
			if (arrTemplates[i].jobTypes && arrTemplates[i].jobTypes.indexOf(objJob.type) != -1) {
				var name = arrTemplates[i].name + ((arrTemplates[i].isDefault) ? ' (Default)' : '');
				nlapiInsertSelectOption('custpage_template', arrTemplates[i].internalid, name, (arrTemplates[i].isDefault) ? true : false);
			}
		}
	}
	return;
}
	
function getJobObject(jobId){

	if (!jobId) {
		return null;
	}
	
	if (objJobs.hasOwnProperty(jobId)) {
		return objJobs[jobId];
	}
	
	var arrFilters = [];
	arrFilters.push(new nlobjSearchFilter('internalid', null, 'anyof', jobId));
	
	var arrColumns = [];
	arrColumns.push(new nlobjSearchColumn('internalid'));
	arrColumns.push(new nlobjSearchColumn('jobname'));
	arrColumns.push(new nlobjSearchColumn('customer'));
	arrColumns.push(new nlobjSearchColumn('custentityr7type'));
	arrColumns.push(new nlobjSearchColumn('custentityr7projectmanager'));
	arrColumns.push(new nlobjSearchColumn('internalid', 'custentityr7primengagementcontact'));
	arrColumns.push(new nlobjSearchColumn('entityid', 'custentityr7primengagementcontact'));
	arrColumns.push(new nlobjSearchColumn('email', 'custentityr7primengagementcontact'));
	arrColumns.push(new nlobjSearchColumn('internalid', 'custentityr7othercustomercontacts'));
	arrColumns.push(new nlobjSearchColumn('entityid', 'custentityr7othercustomercontacts'));
	arrColumns.push(new nlobjSearchColumn('email', 'custentityr7othercustomercontacts'));
	
	var savedsearch = nlapiCreateSearch('job', arrFilters, arrColumns);
	var resultSet = savedsearch.runSearch();
	
	var objJob = null;
	var rowNum = 0;
	do {
		var resultSlice = resultSet.getResults(rowNum, rowNum + 1000);
		for (var i = 0; resultSlice && i < resultSlice.length; i++) {
			rowNum++;
			
			if (!objJob) {
				objJob = {
					internalid: resultSlice[i].getValue('internalid'),
					name: resultSlice[i].getValue('jobname'),
					customer: resultSlice[i].getValue('customer'),
					type: resultSlice[i].getValue('custentityr7type'),
					projectManager: resultSlice[i].getValue('custentityr7projectmanager'),
					contacts: {},
					projecttasks: {}
				};
			}
			
			//push other contacts
			if (resultSlice[i].getValue('internalid', 'custentityr7othercustomercontacts')) {
				objJob.contacts[resultSlice[i].getValue('internalid', 'custentityr7othercustomercontacts')] = {
					internalid: resultSlice[i].getValue('internalid', 'custentityr7othercustomercontacts'),
					name: resultSlice[i].getValue('entityid', 'custentityr7othercustomercontacts'),
					email: resultSlice[i].getValue('email', 'custentityr7othercustomercontacts'),
					primary: false
				};
			}
			
			//push primary contacts
			if (resultSlice[i].getValue('internalid', 'custentityr7primengagementcontact')) {
				objJob.contacts[resultSlice[i].getValue('internalid', 'custentityr7primengagementcontact')] = {
					internalid: resultSlice[i].getValue('internalid', 'custentityr7primengagementcontact'),
					name: resultSlice[i].getValue('entityid', 'custentityr7primengagementcontact'),
					email: resultSlice[i].getValue('email', 'custentityr7primengagementcontact'),
					primary: true
				};
			}
		}
	}
	while (resultSlice.length >= 1000);
	
	objJobs[jobId] = objJob;
	return objJob;
}
