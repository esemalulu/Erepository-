/*
 * @author efagone
 */


/*
 * @method zc_srp_survey_send_suitelet
 * @param request
 * @param response
 */

function zc_srp_survey_send_suitelet(request, response){

	if (request.getMethod() == 'GET') {
		
		if (!userHasPermission('send_srp_surveys')) {
			throw nlapiCreateError('INSUFFICIENT_PERMISSION', 'You do not have access to view this page. Please contact your Administrator.');
		}
		var jobId = request.getParameter('custparam_job_id');
		var isPopup = request.getParameter('custparam_popup');
		
		var form = nlapiCreateForm('Send Project Survey', (isPopup == 'T') ? true : false);
		form.setScript('customscriptzc_srp_survey_send_suite_cs');
		
		form.addField('custpage_project', 'select', 'Project', 'job');
		form.addField('custpage_contact', 'select', 'Contact');
		form.addField('custpage_template', 'select', 'Survey Template');
		form.addField('custpage_client_json', 'inlinehtml', 'Client JSON').setDisplayType('hidden');
		form.addField('custpage_ispopup', 'checkbox').setDisplayType('hidden');
		
		form.getField('custpage_project').setDisplaySize(300);
		form.getField('custpage_contact').setDisplaySize(300);
		form.getField('custpage_template').setDisplaySize(300);
		
		form.getField('custpage_project').setMandatory(true);
		form.getField('custpage_contact').setMandatory(true);
		form.getField('custpage_template').setMandatory(true);
		
		form.getField('custpage_project').setLayoutType('normal', 'startcol');
		
		//DEFAULTS
		form.getField('custpage_client_json').setDefaultValue(JSON.stringify({
			templates: getSurveyTemplatesByJobType()
		}));
		form.getField('custpage_ispopup').setDefaultValue(isPopup);
		
		if (jobId) {
			form.getField('custpage_project').setDefaultValue(jobId);
			form.getField('custpage_project').setDisplayType('inline');
		}
		
		var objJob = getJobObject(jobId);
		
		//SOURCING
		if (objJob) {
			sourceTemplates(form.getField('custpage_template'), objJob.custentityr7type);
			sourceContacts(form.getField('custpage_contact'), objJob);
		}
		form.addSubmitButton('Send');
		
		response.writePage(form);
		return;
	}
	
	if (request.getMethod() == 'POST') {
	
		var jobId = request.getParameter('custpage_project');
		var contactId = request.getParameter('custpage_project');

		var objResponse = sendSurvey({
			job: request.getParameter('custpage_project'),
			contact: request.getParameter('custpage_contact'),
			survey_conf: request.getParameter('custpage_template'),
			isManual: true
		});
		response.writeLine("<html><body onload='win_close()'><script language='Javascript'>function win_close(){ window.opener = top; window.close(); }</script></body></html>");
		return;
		
	}
	
}

function sourceContacts(fld, objJob){

	fld.addSelectOption('', '');

	if (objJob && objJob.contacts) {
		for (var contactId in objJob.contacts) {
			if (objJob.contacts[contactId].email) {
				var name = objJob.contacts[contactId].name + ((objJob.contacts[contactId].primary) ? ' (Primary)' : '');
				fld.addSelectOption(objJob.contacts[contactId].internalid, name, (objJob.contacts[contactId].primary) ? true : false);
			}
		}
	}
	return;
}

function sourceTemplates(fld, jobTypeId){

	fld.addSelectOption('', '');
	
	var arrTemplates = getSurveyTemplatesByJobType(jobTypeId);	
	for (var i = 0; arrTemplates && i < arrTemplates.length; i++) {
		var name = arrTemplates[i].name + ((arrTemplates[i].isDefault) ? ' (Default)' : '');
		fld.addSelectOption(arrTemplates[i].internalid, name, (arrTemplates[i].isDefault) ? true : false);
	}
	return;
}
