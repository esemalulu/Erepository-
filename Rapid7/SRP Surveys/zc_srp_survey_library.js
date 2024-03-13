/*
 * @author efagone
 */

var context = nlapiGetContext();

function getProjectTasksByJob(jobId){

	var arrProjectTasks = [];
	
	if (jobId) {
		var arrFilters = [];
		arrFilters.push(new nlobjSearchFilter('company', null, 'anyof', jobId));
		
		var arrColumns = [];
		arrColumns.push(new nlobjSearchColumn('internalid'));
		arrColumns.push(new nlobjSearchColumn('title').setSort());
		
		var savedsearch = nlapiCreateSearch('projecttask', arrFilters, arrColumns);
		var resultSet = savedsearch.runSearch();
		
		var rowNum = 0;
		do {
			var resultSlice = resultSet.getResults(rowNum, rowNum + 1000);
			for (var i = 0; resultSlice && i < resultSlice.length; i++) {
				rowNum++;
				arrProjectTasks.push({
					internalid: resultSlice[i].getValue('internalid'),
					title: resultSlice[i].getValue('title')
				});
			}
		}
		while (resultSlice.length >= 1000);
	}
	
	return arrProjectTasks;
}

function getSurveyTemplatesByJobType(jobTypeId){

	var arrTemplates = [];
	
	var arrFilters = [];
	arrFilters.push(new nlobjSearchFilter('isinactive', null, 'is', 'F'));
	if (jobTypeId) {
		arrFilters.push(new nlobjSearchFilter('custrecordr7_srpsurveyconf_jobtype', null, 'anyof', jobTypeId));
	}
	var arrColumns = [];
	arrColumns.push(new nlobjSearchColumn('internalid'));
	arrColumns.push(new nlobjSearchColumn('name').setSort());
	arrColumns.push(new nlobjSearchColumn('custrecordr7_srpsurveyconf_jobtype'));
	arrColumns.push(new nlobjSearchColumn('custrecordr7_srpsurveyconf_template'));
	arrColumns.push(new nlobjSearchColumn('custrecordr7_srpsurveyconf_default'));
	
	var savedsearch = nlapiCreateSearch('customrecord_r7_srp_survey_configuration', arrFilters, arrColumns);
	var resultSet = savedsearch.runSearch();
	
	var rowNum = 0;
	do {
		var resultSlice = resultSet.getResults(rowNum, rowNum + 1000);
		for (var i = 0; resultSlice && i < resultSlice.length; i++) {
			rowNum++;
			arrTemplates.push({
				internalid: resultSlice[i].getValue('internalid'),
				name: resultSlice[i].getValue('name'),
				jobTypes: (resultSlice[i].getValue('custrecordr7_srpsurveyconf_jobtype') || '').split(','),
				template: resultSlice[i].getValue('custrecordr7_srpsurveyconf_template'),
				isDefault: (resultSlice[i].getValue('custrecordr7_srpsurveyconf_default') == 'T')
			});
		}
	}
	while (resultSlice.length >= 1000);
	
	return arrTemplates;
}

function getJobObject(jobId){

	if (!jobId) {
		return null;
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
	arrColumns.push(new nlobjSearchColumn('internalid', 'projecttask'));
	arrColumns.push(new nlobjSearchColumn('title', 'projecttask'));
	
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
			
			//push tasks
			if (resultSlice[i].getValue('internalid', 'projecttask')) {
				objJob.projecttasks[resultSlice[i].getValue('internalid', 'projecttask')] = {
					internalid: resultSlice[i].getValue('internalid', 'projecttask'),
					name: resultSlice[i].getValue('title', 'projecttask')
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
	
	return objJob;
}

/*
 * @params
 * job
 * contact
 * contact_lastsurvey
 * sendfrom
 * survey_conf
 * template
 * isManual
 */
function sendSurvey(params){

	if (!params || !params.job) {
		return;
	}
	
	var recJob = nlapiLoadRecord('job', params.job); //doing a full load of record to also be used later in nlobjTemplateRenderer
	
	if (!recJob.getFieldValue('custentityr7_project_sid')) {
		try {
			//re-submit to pull an SID
			//should almost never need to happen
			nlapiSubmitRecord(recJob, true, true);
			recJob = nlapiLoadRecord('job', params.job);
		} 
		catch (e) {
		
		}
	}

	if (!params.template) {
		if (params.survey_conf) {
			params.template = nlapiLookupField('customrecord_r7_srp_survey_configuration', params.survey_conf, 'custrecordr7_srpsurveyconf_template');
		}
		else {
			//find default
			var arrTemplates = getSurveyTemplatesByJobType(recJob.getFieldValue('custentityr7jobtype'));
			for (var i = 0; arrTemplates && i < arrTemplates.length; i++) {
				//since no conf was specified, only take a default template
				if (arrTemplates[i].isDefault) {
					params.template = arrTemplates[i].template;
					break;
				}
			}
		}
	}
	
	if (!params.hasOwnProperty('contact')){
		//only set this is the contact param was not set at all (vs null/empty)
		params.contact = recJob.getFieldValue('custentityr7primengagementcontact');
	}
	
	if (!params.contact || !params.template) {
		//no one to send survey to   :(
		nlapiSubmitField('job', params.job, 'custentityr7_srp_surveyattempted', 'T');
		return;
	}
	
	var recContact = nlapiLoadRecord('contact', params.contact); //doing a full load of record to also be used later in nlobjTemplateRenderer
	
	var minDaysBetweenSurvey = parseInt(context.getSetting('SCRIPT', 'custscriptr7_srp_mindaysbetweensurveys') || 0);
	nlapiLogExecution('DEBUG', 'minDaysBetweenSurvey', minDaysBetweenSurvey);
	//CHECK CONTACT LAST SURVEY DATE
	if (!params.isManual) {
		// only do this check if this is an automated send
		if (!params.hasOwnProperty('contact_lastsurvey')) {
			params.contact_lastsurvey = recContact.getFieldValue('custentityr7_srp_lastsurveydate');
		}
		
		if (params.contact_lastsurvey) {
			var minNextSurveyDate = nlapiAddDays(new Date(), minDaysBetweenSurvey * -1);
			
			if (nlapiStringToDate(params.contact_lastsurvey) > minNextSurveyDate) {
				//contact already recieved survey in this acceptable range
				nlapiSubmitField('job', params.job, 'custentityr7_srp_surveyattempted', 'T');
				return;
			}
		}
	}
	
	if (!params.hasOwnProperty('sendfrom')){
		params.sendfrom = recJob.getFieldValue('custentityr7projectmanager');
	}
	
	if (!params.sendfrom) {
		var defaultSendFrom = context.getSetting('SCRIPT', 'custscriptr7_srp_defaultsurveysendfrom');
		if (defaultSendFrom) {
			params.sendfrom = defaultSendFrom;
		}
	}
	
	if (!params.sendfrom) {
		//should never happen
		throw nlapiCreateError('MISSING_REQ_PARAM', 'Could not determine a send from. This means there was no Project Manager listed and no default send from configured.');
	}
	
	var recEmailTemplate = nlapiLoadRecord('emailtemplate',params.template); 

	var renderer = nlapiCreateTemplateRenderer();
	renderer.addRecord('project', recJob);
	renderer.addRecord('entity', recContact);
	
	renderer.setTemplate(recEmailTemplate.getFieldValue('subject'));
	var subject = renderer.renderToString();
	
	renderer.setTemplate(recEmailTemplate.getFieldValue('content'));
	var body = renderer.renderToString();

	var records = [];
	records['entity'] = params.job;
	
	var success = false;
	var messages = [];
	
	try {
		nlapiSendEmail(params.sendfrom, params.contact, subject, body, null, null, records);
		nlapiLogExecution('AUDIT', 'Successfully sent survey email', 'From: ' + params.sendfrom + '\nTo: ' + params.contact);
		success = true;
	} 
	catch (e) {
		nlapiLogExecution('ERROR', 'Could not send survey email', 'From: ' + params.sendfrom + '\nTo: ' + params.contact + '\nError: ' + e);
		try {
			nlapiSendEmail(params.sendfrom, params.sendfrom, 'Could not send SRP survey email', 'Project: ' + params.job + '\nFrom: ' + params.sendfrom + '\nTo: ' + params.contact);
		} 
		catch (e2) {
		
		}
		success = false;
		messages.push(e);
	}
	
	if (success) {
	
		try {
			nlapiSubmitField('contact', params.contact, 'custentityr7datelastpsosurvey', nlapiDateToString(new Date()));
		} 
		catch (e) {
			nlapiLogExecution('ERROR', 'Could not update date last survey - contact', 'Contact: ' + params.contact + '\nError: ' + e);
			messages.push(e);
		}
		
		try {
			nlapiSubmitField('job', params.job, new Array('custentityr7_srp_surveyattempted', 'custentityr7_srp_surveydatesent'), ['T', nlapiDateToString(new Date())]);
		} 
		catch (e) {
			nlapiLogExecution('ERROR', 'Could not update survey attempted checkbox - job', 'Job: ' + params.job + '\nError: ' + e);
			messages.push(e);
		}
	}
	
	return {
		success: success,
		messages: messages
	};
}
