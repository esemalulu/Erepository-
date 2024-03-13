/*
 * @author efagone
 */

function zc_srp_project_assignment_suitelet_helpe(request, response) {

	try {
		nlapiLogExecution('AUDIT', 'request.getBody', request.getBody());
		var objRequest = (request.getBody()) ? JSON.parse(request.getBody()) : {};
		var objResponse = {
			success : false,
			error : null
		};

		var suiteletActions = {
			'create_new_srp_assignment' : function() {

				objResponse = create_new_srp_assignment(objRequest);
			},
			'create_new_srp_assignment_link' : function() {

				objResponse = create_new_srp_assignment_link(objRequest);
			},
			'default' : function() {

				objResponse = {
					success : false,
					error : 'INVALID_OPERATION'
				};
			}
		};

		(suiteletActions[objRequest.operation] || suiteletActions['default'])();

	}
	catch (e) {
		nlapiLogExecution('ERROR', 'ERROR zc_srp_project_assignment_suitelet_helper', e);
		objResponse = {
			success : false,
			error : e
		};
	}

	nlapiLogExecution('AUDIT', 'Response', JSON.stringify(objResponse));
	response.setContentType('JSON');
	response.write(JSON.stringify(objResponse));
	return;
}

function create_new_srp_assignment_link(objRequest) {

	try {
		if (objRequest.projectname) {
			objRequest.projectname = objRequest.projectname.trim();
		}
		var recAssignment = nlapiCreateRecord('customrecordzc_srp_project_assignments', {
			recordmode : 'dynamic'
		});
		
		recAssignment.setFieldValue('custrecordzc_srp_projassign_salesorder', (objRequest.salesorder) ? objRequest.salesorder : '');
		recAssignment.setFieldValue('custrecordzc_srp_projassign_opportunity', (objRequest.opportunity) ? objRequest.opportunity : '');
		recAssignment.setFieldValue('custrecordzc_srp_projassign_item', (objRequest.item) ? objRequest.item : '');
		recAssignment.setFieldValue('custrecordzc_srp_projassign_lineid', objRequest.lineid);	
		recAssignment.setFieldValue('custrecordzc_srp_projassign_item_desc', (objRequest.memo) ? objRequest.memo : '');
		recAssignment.setFieldValue('custrecordzc_srp_projassign_projectname', objRequest.projectname);
		recAssignment.setFieldValue('custrecordzc_srp_projassign_projectlink', objRequest.project_id);
		var id = nlapiSubmitRecord(recAssignment, true, true);
		
		var projFields = nlapiLookupField('job', objRequest.project_id, ['entityid', 'jobname']);
		
		return {
			success : true,
			id : objRequest.project_id,
			projectname : projFields.entityid + ' ' + projFields.jobname
		};

	}
	catch (e) {
		nlapiLogExecution('ERROR', 'create_new_srp_assignment', e);
		return {
			success : false,
			error : e
		};
	}
}

function create_new_srp_assignment(objRequest) {

	try {
		if (objRequest.projectname) {
			objRequest.projectname = objRequest.projectname.trim();
		}
		var objJob = getProjectIdByName(objRequest.projectname);

		if (!objJob || !objJob.id) {
			return {
				success : false,
				error : 'Could not find job'
			};
		}
		
		var ruleId = null;
		if (objRequest.template) {
			ruleId = nlapiLookupField('projecttemplate', objRequest.template, 'custentity_r7_arm_rev_forecast');
		}
		
		var recAssignment = nlapiCreateRecord('customrecordzc_srp_project_assignments', {
			recordmode : 'dynamic'
		});
		recAssignment.setFieldValue('custrecordzc_srp_projassign_salesorder', (objRequest.salesorder) ? objRequest.salesorder : '');
		recAssignment.setFieldValue('custrecordzc_srp_projassign_opportunity', (objRequest.opportunity) ? objRequest.opportunity : '');
		recAssignment.setFieldValue('custrecordzc_srp_projassign_item', (objRequest.item) ? objRequest.item : '');
		recAssignment.setFieldValue('custrecordzc_srp_projassign_lineid', objRequest.lineid);
		if (ruleId) {
			recAssignment.setFieldValue('custrecordzc_srp_projassign_revrecrule', ruleId);
		}
		recAssignment.setFieldValue('custrecordzc_srp_projassign_item_desc', (objRequest.memo) ? objRequest.memo : '');
		recAssignment.setFieldValue('custrecordzc_srp_projassign_projectname', objRequest.projectname);
		recAssignment.setFieldValue('custrecordzc_srp_projassign_projectlink', objJob.id);
		nlapiSubmitRecord(recAssignment, true, true);
		
		return {
			success : true,
			id : objJob.id,
			projectname : objJob.entityid + ' ' + objJob.jobname
		};

	}
	catch (e) {
		nlapiLogExecution('ERROR', 'create_new_srp_assignment', e);
		return {
			success : false,
			error : e
		};
	}
}

function getProjectIdByName(projectName) {

	try {
		if (!projectName) {
			return null;
		}

		var arrFilters = [];
		arrFilters.push(new nlobjSearchFilter('isinactive', null, 'is', 'F'));
		arrFilters.push(new nlobjSearchFilter('entityid', null, 'is', projectName));
		arrFilters.push(new nlobjSearchFilter('datecreated', null, 'onorafter', 'yesterday'));

		var arrColumns = [];
		arrColumns.push(new nlobjSearchColumn('internalid').setSort(true));
		arrColumns.push(new nlobjSearchColumn('entityid'));
		arrColumns.push(new nlobjSearchColumn('jobname'));
		
		var arrResults = nlapiSearchRecord('job', null, arrFilters, arrColumns);

		if (arrResults && arrResults.length > 0) {
			return {
				id: arrResults[0].getValue('internalid'),
				entityid: arrResults[0].getValue('entityid'),
				jobname: arrResults[0].getValue('jobname')
			};
		}
	}
	catch (e) {
		nlapiLogExecution('ERROR', 'Could not getProjectIdByName', e);
	}

	return null;

}