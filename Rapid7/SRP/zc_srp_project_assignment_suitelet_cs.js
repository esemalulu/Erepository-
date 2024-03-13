/*
 * @author efagone
 */
var helperSuiteletURL = nlapiResolveURL('SUITELET', 'customscriptzc_srp_project_assignment_he', 'customdeployzc_srp_project_assignment_he', false);
var context = nlapiGetContext();

var assignmentType = {
		JOB: 'srp_project',
		JOB_PEND: 'srp_project_pending',
		TEMPLATE: 'srp_project_template'
};

var callbacksPending = 0;
var inProcess = false;

function callbackResponded(){
	callbacksPending--;
	if (!inProcess && callbacksPending < 1) {
		callbacksPending = 0;
		setFormComplete();
	}
	return;
}

function setFormInProcess(){
	inProcess = true;
	jQuery(window).bind('beforeunload', function(){
		return 'The system is currently processing your request. Leaving this page during this process is not recommended.';
	});
	jQuery('#custpage_srp_submit').prop("disabled", true);
	jQuery('#custpage_srp_submit').prop('value', 'Processing...');
	jQuery('#secondarycustpage_srp_submit').prop("disabled", true);
	jQuery('#secondarycustpage_srp_submit').prop('value', 'Processing...');
	jQuery('body').css('cursor', 'progress');
}

function setFormComplete(){
	jQuery(window).unbind('beforeunload');
	window.onbeforeunload = null;
	jQuery('#custpage_srp_submit').prop("disabled", false);
	jQuery('#custpage_srp_submit').prop('value', 'Process');
	jQuery('#secondarycustpage_srp_submit').prop("disabled", false);
	jQuery('#secondarycustpage_srp_submit').prop('value', 'Process');
	jQuery('body').css('cursor', 'default');
	
	if (allLinesProcessed()) {
		alert('All lines have been processed.');
	}
}

function zc_pageInit(){

	var lineCount = nlapiGetLineItemCount('custpage_srp_assignments');
	for (var i = 1; i <= lineCount; i++) {
		var projectType = nlapiGetLineItemValue('custpage_srp_assignments', 'custpage_assignment_type', i);
		var projectId = nlapiGetLineItemValue('custpage_srp_assignments', 'custpage_assignment_id', i);
		
		if (projectId && projectType == assignmentType.TEMPLATE) {
			var itemName = nlapiGetLineItemValue('custpage_srp_assignments', 'custpage_item', i);
			var lineId = nlapiGetLineItemValue('custpage_srp_assignments', 'custpage_line', i);
			var orderNumber = nlapiGetFieldValue('custpage_ordernum');
			var defTemplateName = orderNumber + ': ' + itemName + ' (line ' + lineId + ')';
			nlapiSetLineItemValue('custpage_srp_assignments', 'custpage_projectname', i, defTemplateName);
			nlapiSetLineItemDisabled('custpage_srp_assignments', 'custpage_projectname', false, i);
		}
		else {
			//nlapiSetLineItemValue('custpage_srp_assignments', 'custpage_projectname', i, label);
			nlapiSetLineItemDisabled('custpage_srp_assignments', 'custpage_projectname', true, i);
		}
	}
	
	//AUTO-SUBMIT
	var autoSubmit = true;
	for (var i = 1; i <= lineCount; i++) {
		var projectType = nlapiGetLineItemValue('custpage_srp_assignments', 'custpage_assignment_type', i);
		var projectName = nlapiGetLineItemValue('custpage_srp_assignments', 'custpage_projectname', i) || '';
		var projectId = nlapiGetLineItemValue('custpage_srp_assignments', 'custpage_assignment_id', i);
		
		if (!projectId || (projectType == assignmentType.TEMPLATE && !projectName.trim())) {
			autoSubmit = false;
			break;
		}
	}
	
	
//processLines(true);
	if (autoSubmit){
		
	}

	// Check to see if any projects will be automatically created
	if (hasAutoCreateProjects()) {
		alert('This order has projects that will be automatically created. These projects are identified below with a red icon.\n\n' +
			'These projects cannot be created manually');
	}
}

function zc_srp_submit() {

	var lineCount = nlapiGetLineItemCount('custpage_srp_assignments');
	for (var i = 1; i <= lineCount; i++) {
		var projectType = nlapiGetLineItemValue('custpage_srp_assignments', 'custpage_assignment_type', i);
		var projectName = nlapiGetLineItemValue('custpage_srp_assignments', 'custpage_projectname', i) || '';
		var item = nlapiGetLineItemValue('custpage_srp_assignments', 'custpage_item', i);
		var line = nlapiGetLineItemValue('custpage_srp_assignments', 'custpage_line', i);

		if (projectType == assignmentType.TEMPLATE && !projectName.trim()) {
			alert('Please specify a Project Name for:\n' + item + ' [line ' + line + ']');
			return false;
		}
	}

	processLines();
	
	return true;
}

function processLines(isAutoProcess){
	setFormInProcess();
	
	var linesProcessed = 0;
	var lineCount = nlapiGetLineItemCount('custpage_srp_assignments');

	for (var i = 1; i <= lineCount; i++) {
		var projectType = nlapiGetLineItemValue('custpage_srp_assignments', 'custpage_assignment_type', i);
		var projectId = nlapiGetLineItemValue('custpage_srp_assignments', 'custpage_assignment_id', i);

		var autoCreateProject = nlapiGetLineItemValue('custpage_srp_assignments', 'custpage_auto_create_project', i) === 'T';
		if (autoCreateProject) {
			continue;
		}

		if (projectType) {
			jQuery('#zc_srp_assign_select_' + i).prop('disabled', 'disabled');
			nlapiSetLineItemDisabled('custpage_srp_assignments', 'custpage_projectname', true, i);
			
			if (projectType == assignmentType.TEMPLATE && projectId) {
				linesProcessed++;
				createProjectFromTemplate({
					template: projectId,
					projectname: nlapiGetLineItemValue('custpage_srp_assignments', 'custpage_projectname', i),
					item: nlapiGetLineItemValue('custpage_srp_assignments', 'custpage_item_id', i),
					memo: nlapiGetLineItemValue('custpage_srp_assignments', 'custpage_description', i),
					linenum: i,
					lineid: nlapiGetLineItemValue('custpage_srp_assignments', 'custpage_line', i)
				});
			}
			else 
				if (projectType == assignmentType.JOB_PEND && projectId) {
					linesProcessed++;
					linkProject({
						template: projectId,
						projectname: nlapiGetLineItemValue('custpage_srp_assignments', 'custpage_projectname', i),
						item: nlapiGetLineItemValue('custpage_srp_assignments', 'custpage_item_id', i),
						memo: nlapiGetLineItemValue('custpage_srp_assignments', 'custpage_description', i),
						linenum: i,
						lineid: nlapiGetLineItemValue('custpage_srp_assignments', 'custpage_line', i),
						project_id: projectId
					});
				}
		}
	}
	
	inProcess = false;
	if (linesProcessed < 1){
		setFormComplete();
		if (!isAutoProcess) {
			alert('Please select an assignment to process.');
		}
	}
}

function hasAutoCreateProjects() {
	var lineCount = nlapiGetLineItemCount('custpage_srp_assignments');

	for (var i = 1; i <= lineCount; i++) {
		var autoCreateProject = nlapiGetLineItemValue('custpage_srp_assignments', 'custpage_auto_create_project', i) === 'T';

		if (autoCreateProject) {
			return true;
		}
	}
	return false;
}

function allLinesProcessed(){

	var lineCount = nlapiGetLineItemCount('custpage_srp_assignments');
	for (var i = 1; i <= lineCount; i++) {
	
		var projectType = nlapiGetLineItemValue('custpage_srp_assignments', 'custpage_assignment_type', i);
		var projectId = nlapiGetLineItemValue('custpage_srp_assignments', 'custpage_assignment_id', i);
		if (!(projectType && projectType != assignmentType.TEMPLATE && projectId)) {
			return false;
		}
	}
	return true;
}

function linkProject(objParams){

	try {
		var objHeaders = {
			'Content-Type': 'application/json'
		};
		
		var objPostData = {
			operation: 'create_new_srp_assignment_link',
			salesorder: nlapiGetFieldValue('custpage_order'),
			opportunity: nlapiGetFieldValue('custpage_opportunity'),
			customer: nlapiGetFieldValue('custpage_customer'),
			lineid: objParams.lineid,
			item: objParams.item,
			memo: objParams.memo,
			projectname: (objParams.projectname) ? objParams.projectname.trim() : '',
			project_id: objParams.project_id
		};
		
		setLineStatus({
			linenum: objParams.linenum,
			status_id: 2
		});
		
		callbacksPending++;
		nlapiRequestURL(helperSuiteletURL, JSON.stringify(objPostData), objHeaders, linkProjectCallback(objParams), 'POST');
		
	} 
	catch (e) {
		return {
			success: false,
			code: 'UNEXPECTED_ERROR_NS_PROJECT',
			details: 'Could not link project\n' + e
		};
	}
}

var linkProjectCallback = function(objParams){

	return function(response, textStatus, jqXHR){
	
		try {
			if (response && response.getBody()) {
				var objResponse = JSON.parse(response.getBody());
				if (objResponse.success) {
					nlapiSetLineItemValue('custpage_srp_assignments', 'custpage_assignment_type', objParams.linenum, assignmentType.JOB);
					nlapiSetLineItemValue('custpage_srp_assignments', 'custpage_assignment_id', objParams.linenum, objResponse.id);
					setLineStatus({
						linenum: objParams.linenum,
						status_id: 3,
						project_id: objResponse.id,
						project_name: objResponse.projectname
					});
					return;
				}
			}
			setLineStatus({
				linenum: objParams.linenum,
				status_id: 4,
				error: 'Could not create link. Please notify administrator.'
			});
			return;
			
		} 
		catch (e) {
			setLineStatus({
				linenum: objParams.linenum,
				status_id: 4,
				error: e
			});
			return;
		}
		
		setLineStatus({
			linenum: objParams.linenum,
			status_id: 4
		});
		return;
	};
};

function createProjectFromTemplate(objParams){

	try {
		var objHeaders = {
			'Content-Type': 'application/x-www-form-urlencoded'
		};
		
		var objPayload = {
			createproject: 'Create Project',
			targettype: 'job',
			type: 'projectTemplate',
			id: objParams.template,
			targetname: (objParams.projectname) ? objParams.projectname.trim() : ''
		};

		setLineStatus({
			linenum: objParams.linenum,
			status_id: 2
		});
		
		callbacksPending++;
		nlapiRequestURL('/app/accounting/project/applyprojecttemplate.nl', objPayload, objHeaders, createProjectCallback(objParams), 'POST');		
	} 
	catch (e) {
		return {
			success: false,
			code: 'UNEXPECTED_ERROR_NS_PROJECT',
			details: 'Could not create project from tempalte\n' + e
		};
	}
	
}

var createProjectCallback = function(objParams){

	return function(response, textStatus, jqXHR){
	
		try {
			if (response && (response.getCode() == 200 || response.getCode() == 206)) {
			
				if (response.getBody().substr(0, 5) == '<?xml') {
				
					var xmlResponse = nlapiStringToXML(response.getBody());
					
					var onlineError = nlapiSelectNode(xmlResponse, 'onlineError');
					if (onlineError) {
						var code = nlapiSelectValue(onlineError, 'code') || 'UNEXPECTED_ERROR_07';
						var details = nlapiSelectValue(onlineError, 'detail') || 'null';
						setLineStatus({
							linenum: objParams.linenum,
							status_id: 4,
							error: code + ': ' + details
						});
						return;
					}
				}
				
				var objHeaders = {
					'Content-Type': 'application/json'
				};
				
				var objPostData = {
					operation: 'create_new_srp_assignment',
					salesorder: nlapiGetFieldValue('custpage_order'),
					opportunity: nlapiGetFieldValue('custpage_opportunity'),
					customer: nlapiGetFieldValue('custpage_customer'),
					item: objParams.item,
					memo: objParams.memo,
					template: objParams.template,
					lineid: objParams.lineid,
					projectname: (objParams.projectname) ? objParams.projectname.trim() : ''
				};
				
				var response = nlapiRequestURL(helperSuiteletURL, JSON.stringify(objPostData), objHeaders, null, 'POST');
				
				if (response && response.getBody()) {
					var objResponse = JSON.parse(response.getBody());
					if (objResponse.success) {
						nlapiSetLineItemValue('custpage_srp_assignments', 'custpage_assignment_type', objParams.linenum, assignmentType.JOB);
						nlapiSetLineItemValue('custpage_srp_assignments', 'custpage_assignment_id', objParams.linenum, objResponse.id);
						setLineStatus({
							linenum: objParams.linenum,
							status_id: 3,
							project_id: objResponse.id,
							project_name: objResponse.projectname
						});
						return;
					}
				}
				
				setLineStatus({
					linenum: objParams.linenum,
					status_id: 4,
					error: 'Could not create link'
				});
				return;
			}
			
		} 
		catch (e) {
			setLineStatus({
				linenum: objParams.linenum,
				status_id: 4,
				error: e
			});
			return;
		}
		
		setLineStatus({
			linenum: objParams.linenum,
			status_id: 4
		});
		return;
	};
};

function setLineStatus(params){

	jQuery("#zc_srp_assign_status_container_" + params.linenum).html(getStatusHTML(params));

	if (params.status_id === 3 && params.project_id) {
		jQuery("#zc_srp_assign_select_container_" + params.linenum).html('<a class="dottedlink" href="' + nlapiResolveURL('RECORD', 'job', params.project_id) + '" target="_blank">' + params.project_name + '</a>');
		nlapiSetLineItemValue('custpage_srp_assignments', 'custpage_projectname', params.linenum, params.project_name);
		nlapiSetLineItemDisabled('custpage_srp_assignments', 'custpage_projectname', true, params.linenum);
	}
	
	if (params.status_id == 3 || params.status_id == 4){
		callbackResponded();
	}
}

function getStatusHTML(params){

	var statuses = {
		1: function(){ //unassigned
			return '<p style="color:black;">Unassigned</p>';
		},
		2: function(){ //processing
			return '<p style="color:black;">Processing</p>';
		},
		3: function(){ //complete
			return '<p style="color:green;">Completed</p>';
		},
		4: function(){ //failed
			return '<p style="color:red;">Failed' + ((params.error) ? (': ' + params.error) : '') + '</p>';
		},
		'default': function(){ //complete
			return '<p style="color:black;"></p>';
		}
	};
	
	return (statuses[params.status_id] || statuses['default'])();
}

jQuery(document).ready(function(){

	'use strict';
	
	var cssURL = nlapiGetFieldValue('custpage_cssurl');
	if (document.createStyleSheet) {
		document.createStyleSheet(cssURL);
	}
	else {
		jQuery('<link rel="stylesheet" type="text/css" href="' + cssURL + '" />').appendTo('head');
	}

	setTimeout(function(){
		jQuery('.zc_srp_select_container').show();
	}, 150);

	jQuery(".zc_srp_assign_select").change(function(){
		
		var id = jQuery(this).attr('id');
		var row_index = id.substr(id.lastIndexOf('_') + 1);
		var selected = jQuery("option:selected", this);
		var grpId = selected.closest('optgroup').prop('id');
		var val = selected.val();
		var label = selected.text();
		
		nlapiSetLineItemValue('custpage_srp_assignments', 'custpage_assignment_type', row_index, grpId);
		nlapiSetLineItemValue('custpage_srp_assignments', 'custpage_assignment_id', row_index, val);
		
		if (grpId == assignmentType.TEMPLATE) {
			var itemName = nlapiGetLineItemValue('custpage_srp_assignments', 'custpage_item', row_index);
			var lineId = nlapiGetLineItemValue('custpage_srp_assignments', 'custpage_line', row_index);
			var orderNumber = nlapiGetFieldValue('custpage_ordernum');
			var defTemplateName = orderNumber + ': ' + itemName + ' (line ' + lineId + ')';
			nlapiSetLineItemValue('custpage_srp_assignments', 'custpage_projectname', row_index, defTemplateName);
			nlapiSetLineItemDisabled('custpage_srp_assignments', 'custpage_projectname', false, row_index);
		}
		else {
			nlapiSetLineItemValue('custpage_srp_assignments', 'custpage_projectname', row_index, label);
			nlapiSetLineItemDisabled('custpage_srp_assignments', 'custpage_projectname', true, row_index);
		}
	});
	
	jQuery('#tr_custpage_srp_submit').addClass('pgBntB');
	jQuery('#tr_secondarycustpage_srp_submit').addClass('pgBntB');
});

function isBlank(val) {

	return (val == null || val === '') ? true : false;
}