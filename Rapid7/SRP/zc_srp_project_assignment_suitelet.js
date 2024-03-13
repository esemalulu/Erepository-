/*
 * @author efagone
 */


var objProjectTemplateMap = getProjectTemplateMap();
var objProjectMap, objProjectAssignmentMap;

var assignmentType = {
		JOB: 'srp_project',
		JOB_PEND: 'srp_project_pending',
		TEMPLATE: 'srp_project_template'
};


function zc_srp_project_assignment_suitelet(request, response){

	if (request.getMethod() == 'GET') {
		var orderId = request.getParameter('custparam_transaction');
		if (orderId == null || orderId == '') {
			throw nlapiCreateError('MISSING_PARAM', 'This suitelet requires a valid custparam_transaction parameter', true);
		}
		
		if (!userHasPermission('srp_project_assignment')) {
			throw nlapiCreateError('INSUFFICIENT_PERMISSION', 'You do not have permission to view this page. Please contact your administrator.', true);
		}
		
		var objOrder = getOrderObject(orderId);

		form = new nlapiCreateForm('Project Assignment', false);
		form.setScript('customscriptzc_srp_project_assignment_cs');
		
		form.addField('custpage_customer', 'select', 'Customer', 'customer').setDisplayType('inline');
		form.getField('custpage_customer').setDefaultValue(objOrder.customer_id);
		form.addField('custpage_order', 'select', 'Sales Order', 'transaction').setDisplayType('inline');
		form.getField('custpage_order').setDefaultValue(orderId);
		form.addField('custpage_estimate', 'select', 'Quote', 'transaction').setDisplayType('inline');
		form.getField('custpage_estimate').setDefaultValue(objOrder.estimate);
		form.addField('custpage_opportunity', 'select', 'Opportunity', 'transaction').setDisplayType('inline');
		form.getField('custpage_opportunity').setDefaultValue(objOrder.opportunity);
		form.addField('custpage_trandate', 'date', 'Date').setDisplayType('inline');
		form.getField('custpage_trandate').setDefaultValue(objOrder.trandate);
		form.addField('custpage_salesrep', 'text', 'Sales Rep').setDisplayType('inline');
		form.getField('custpage_salesrep').setDefaultValue(objOrder.salesrep_text);
		form.addField('custpage_ordernum', 'text').setDisplayType('hidden');
		form.getField('custpage_ordernum').setDefaultValue(objOrder.number);
		form.addField('custpage_cssurl', 'text').setDisplayType('hidden');
		form.getField('custpage_cssurl').setDefaultValue(getFileURL('zc_srp_project_assignment_suitelet.css'));
		form.addTab('custpage_assignmenttab', 'Line Items To Assign');
		
		var assignmentList = form.addSubList('custpage_srp_assignments', 'list', 'Line Items', 'custpage_assignmenttab');
		assignmentList.addField('custpage_line', 'text', 'Line');
		assignmentList.addField('custpage_item_id', 'text').setDisplayType('hidden');
		assignmentList.addField('custpage_item', 'text', 'Item');
		assignmentList.addField('custpage_description', 'textarea', 'Description');
		assignmentList.addField('custpage_quantity', 'float', 'Quantity');
		assignmentList.addField('custpage_rate', 'float', 'Rate');
		assignmentList.addField('custpage_amount', 'float', 'Amount');
		assignmentList.addField('custpage_assignment', 'textarea', 'Project Assignment');
		assignmentList.addField('custpage_alert', 'textarea', '');
		assignmentList.addField('custpage_auto_create_project', 'checkbox', '').setDisplayType('hidden');
		assignmentList.addField('custpage_projectname', 'text', 'Project Name');
		assignmentList.getField('custpage_projectname').setDisplayType('entry');
		assignmentList.getField('custpage_projectname').setDisplaySize(40);
		assignmentList.addField('custpage_assignment_type', 'text').setDisplayType('hidden');
		assignmentList.addField('custpage_assignment_id', 'text').setDisplayType('hidden');
		assignmentList.addField('custpage_assignment_status', 'textarea', 'Status');
		
		var currentLineNum = 1;
		
		for (var line in objOrder.items) {
			var objLine = objOrder.items[line];

			var itemConfiguredToAutoCreateProject = nlapiLookupField('item', objLine.item, 'custitemr7createpsoengagement') === 'T';
			var projectShouldAutoCreate = !objLine['project_id'] && objLine['srp_templates'].length === 1 && itemConfiguredToAutoCreateProject;

			assignmentList.setLineItemValue('custpage_line', currentLineNum, objLine.line);
			assignmentList.setLineItemValue('custpage_item_id', currentLineNum, objLine.item);
			assignmentList.setLineItemValue('custpage_item', currentLineNum, objLine.item_text);
			assignmentList.setLineItemValue('custpage_description', currentLineNum, objLine.memo);
			assignmentList.setLineItemValue('custpage_quantity', currentLineNum, objLine.quantity);
			assignmentList.setLineItemValue('custpage_rate', currentLineNum, objLine.rate);
			assignmentList.setLineItemValue('custpage_amount', currentLineNum, objLine.amount);
			assignmentList.setLineItemValue('custpage_assignment_type', currentLineNum, (objLine.project_id) ? assignmentType.JOB : '' || (objLine.srp_templates.length >= 1) ? assignmentType.TEMPLATE : '');
			assignmentList.setLineItemValue('custpage_assignment_id', currentLineNum, objLine.project_id || objLine.project_assignment.project_id || ((objLine.srp_templates.length >= 1) ? objLine.srp_templates[0] : '') || '');
			assignmentList.setLineItemValue('custpage_projectname', currentLineNum, objLine.project_name || objLine.project_assignment.project_name || '');
			assignmentList.setLineItemValue('custpage_alert', currentLineNum, projectShouldAutoCreate ? alertIcon() : '');
			assignmentList.setLineItemValue('custpage_auto_create_project', currentLineNum, projectShouldAutoCreate ? 'T' : 'F');
			assignmentList.setLineItemValue('custpage_assignment', currentLineNum, getAssignmentHTML({
				customer: objOrder.customer_id,
				srp_templates: objLine.srp_templates,
				linenum: currentLineNum,
				assignment_type: assignmentList.getLineItemValue('custpage_assignment_type', currentLineNum),
				project_id: assignmentList.getLineItemValue('custpage_assignment_id', currentLineNum),
				project_name: assignmentList.getLineItemValue('custpage_projectname', currentLineNum)
			}));
			assignmentList.setLineItemValue('custpage_assignment_status', currentLineNum, getStatusHTML({
				linenum: currentLineNum,
				assignment_type: assignmentList.getLineItemValue('custpage_assignment_type', currentLineNum),
				project_id: assignmentList.getLineItemValue('custpage_assignment_id', currentLineNum)
			}));

			currentLineNum++;
		}
		
		form.addButton('custpage_srp_submit', 'Process', 'zc_srp_submit()');
		//form.addSubmitButton('Submit');
		response.writePage(form);
		
	}
	
	if (request.getMethod() == 'POST') {
		
		if (!userHasPermission('srp_project_assignment')) {
			throw nlapiCreateError('INSUFFICIENT_PERMISSION', 'You do not have permission to view this page. Please contact your administrator.', true);
		}
		
		var objOrderUpdates = {};
		objOrderUpdates.items = {};
		
		var lineCount = request.getLineItemCount('custpage_srp_assignments');
		for (var i = 1; i <= lineCount; i++) {
			var lineId = request.getLineItemValue('custpage_srp_assignments', 'custpage_line', i);
			var itemId = request.getLineItemValue('custpage_srp_assignments', 'custpage_item', i);
			var projectType = request.getLineItemValue('custpage_srp_assignments', 'custpage_assignment_type', i);
			var projectId = request.getLineItemValue('custpage_srp_assignments', 'custpage_assignment_id', i);
			var projectName = request.getLineItemValue('custpage_srp_assignments', 'custpage_projectname', i);
			
			var jobId;
			if (projectType == 'srp_project_template' && projectId) {
				var createResponse = createProjectFromTemplate(projectId, projectName);
				if (createResponse.success) {
					jobId = createResponse.id;
				}
			}
			else 
				if (projectType == 'srp_project' && projectId) {
					jobId = projectId
				}
			
			if (jobId) {
				objOrderUpdates.items[lineId] = {
					job: jobId
				};
			}
		}
	}
	
}

function createProjectFromTemplate(templateId, projectName){

	try {
		var objHeaders = {
			'Content-Type': 'application/x-www-form-urlencoded'
		};
		
		var objPayload = {
			createproject: 'Create Project',
			targettype: 'job',
			type: 'projectTemplate',
			id: templateId,
			targetname: projectName
		};
		
		var response = nlapiRequestURL('/app/accounting/project/applyprojecttemplate.nl', objPayload, objHeaders, 'POST');
		
		if (!response || !response.getBody()) {
			var msg = (response == null) ? 'The response is null' : response.getBody();
			return {
				success: false,
				code: 'TEMPLATE_POST_NON200',
				details: 'Non 200 response POSTING project tempalte'
			};
		}
		
		// All should be OK, so parse the XML the server should have supplied us.
		var responseLocation = response.getHeader('Location');
		
		if (!responseLocation) {
			return {
				success: false,
				code: 'RESPONSE_LOCATION_ERROR',
				details: 'response location is null'
			};
		}
		
		var jobId = responseLocation.substr(responseLocation.indexOf('id=') + 1, responseLocation.substr(responseLocation.indexOf('id=') + 1).search(/[^\d]/));
		return {
			success: true,
			id: jobId
		};
	} 
	catch (e) {
		return {
			success: false,
			code: 'UNEXPECTED_ERROR_NS_PROJECT',
			details: 'Could not create project from tempalte\n' + e
		};
	}
	
}

function getOrderObject(orderId){

	var processbeginTime = new Date();
	if (!orderId) {
		return null;
	}
	objProjectAssignmentMap = getExistingProjectAssignmentMap({
		salesorder: orderId
	});
	
	var arrFilters = [];
	arrFilters.push(new nlobjSearchFilter('internalid', null, 'is', orderId));
	//arrFilters.push(new nlobjSearchFilter('mainline', null, 'is', 'F'));
	arrFilters.push(new nlobjSearchFilter('taxline', null, 'is', 'F'));
	arrFilters.push(new nlobjSearchFilter('cogs', null, 'is', 'F'));
	arrFilters.push(new nlobjSearchFilter('shipping', null, 'is', 'F'));
	
	var arrColumns = [];
	//Ids
	arrColumns.push(new nlobjSearchColumn('internalid'));
	arrColumns.push(new nlobjSearchColumn('type'));
        // Transaction number field
	//arrColumns.push(new nlobjSearchColumn('transactionnumber'));
        // Documnet number field
    arrColumns.push(new nlobjSearchColumn('number'));
    arrColumns.push(new nlobjSearchColumn('subsidiary'));
	arrColumns.push(new nlobjSearchColumn('createdfrom'));
	arrColumns.push(new nlobjSearchColumn('opportunity'));
	arrColumns.push(new nlobjSearchColumn('trandate'));
	arrColumns.push(new nlobjSearchColumn('salesrep'));
	arrColumns.push(new nlobjSearchColumn('internalid', 'customermain'));
	arrColumns.push(new nlobjSearchColumn('entityid', 'customermain'));
	arrColumns.push(new nlobjSearchColumn('companyname', 'customermain'));
	//Items
	arrColumns.push(new nlobjSearchColumn('line'));
	arrColumns.push(new nlobjSearchColumn('item'));
	arrColumns.push(new nlobjSearchColumn('quantity'));
	arrColumns.push(new nlobjSearchColumn('rate'));
	arrColumns.push(new nlobjSearchColumn('amount'));
	arrColumns.push(new nlobjSearchColumn('memo'));
	arrColumns.push(new nlobjSearchColumn('custitemr7defaultsrptemplates', 'item'));
	arrColumns.push(new nlobjSearchColumn('internalid', 'job'));
	arrColumns.push(new nlobjSearchColumn('entityid', 'job'));
	arrColumns.push(new nlobjSearchColumn('jobname', 'job'));
	//Other
	arrColumns.push(new nlobjSearchColumn('status'));
	arrColumns.push(new nlobjSearchColumn('terms'));
	arrColumns.push(new nlobjSearchColumn('totalamount'));
	arrColumns.push(new nlobjSearchColumn('taxtotal'));
	
	var arrResults = nlapiSearchRecord('transaction', null, arrFilters, arrColumns);
	
	var objOrder = {};
	objOrder.items = {};
	
	for (var i = 0; arrResults != null && i < arrResults.length; i++) {
	
		//Header Fields
		objOrder.customer_id = arrResults[i].getValue('internalid', 'customermain');
		objOrder.customer_name = arrResults[i].getValue('companyname', 'customermain');
		objOrder.customer_entityid = arrResults[i].getValue('entityid', 'customermain');
		objOrder.internalid = arrResults[i].getValue('internalid');
		objOrder.type = getRecTypeId(arrResults[i].getValue('type'));
		objOrder.type_text = arrResults[i].getText('type');
		objOrder.salesrep_text = arrResults[i].getText('salesrep');
		//objOrder.number = arrResults[i].getValue('transactionnumber');
                objOrder.number = arrResults[i].getValue('number');
		objOrder.estimate = arrResults[i].getValue('createdfrom');
		objOrder.opportunity = arrResults[i].getValue('opportunity');
		objOrder.trandate = arrResults[i].getValue('trandate');
		objOrder.status = arrResults[i].getValue('status');
		objOrder.terms = arrResults[i].getValue('terms');
		objOrder.totalamount = arrResults[i].getValue('totalamount');
		objOrder.taxtotal = arrResults[i].getValue('taxtotal');
		
		var lineId = arrResults[i].getValue('line');
		var defaultTemplates = arrResults[i].getValue('custitemr7defaultsrptemplates', 'item');
		if (lineId && defaultTemplates) {
			objOrder.items['line_' + lineId] = {
				line: arrResults[i].getValue('line'),
				item: arrResults[i].getValue('item'),
				item_text: arrResults[i].getText('item'),
				quantity: arrResults[i].getValue('quantity'),
				rate: arrResults[i].getValue('rate'),
				amount: arrResults[i].getValue('amount'),
				memo: arrResults[i].getValue('memo'),
				project_id: arrResults[i].getValue('internalid', 'job'),
				project_name: (arrResults[i].getValue('entityid', 'job')) ? (arrResults[i].getValue('entityid', 'job') + ' ' + arrResults[i].getValue('jobname', 'job')) : '',
				project_assignment: (objProjectAssignmentMap[orderId] && objProjectAssignmentMap[orderId][lineId]) ? objProjectAssignmentMap[orderId][lineId] : {},
				srp_templates: getSrpTemplates(txtToArray(arrResults[i].getValue('custitemr7defaultsrptemplates', 'item')), arrResults[i].getValue('subsidiary'))
			};
			
		}
	}
	
	nlapiLogExecution('AUDIT', 'Time (in seconds) to build NetSuite order object - ID:' + orderId, (new Date().getTime() - processbeginTime.getTime()) / 1000);
	return objOrder;
}

function getSrpTemplates(srpArr,soSubsidiary){
	var filteredTemplates = [];
	for (var i = 0;i<srpArr.length;i++){
		var templateSubsidiary = nlapiLookupField('projecttemplate', srpArr[i], 'subsidiary');
		if (templateSubsidiary==soSubsidiary){
			filteredTemplates.push(srpArr[i])
		}
	}
	return filteredTemplates
}

function getProjectTemplateMap(){

	var objMap = {};
	
	var arrColumns = [];
	arrColumns[0] = new nlobjSearchColumn('internalid');
	arrColumns[1] = new nlobjSearchColumn('entityid');
	
	var newSearch = nlapiCreateSearch('projecttemplate');
	newSearch.setColumns(arrColumns);
	var resultSet = newSearch.runSearch();
	
	var rowNum = 0;
	do {
		var resultSlice = resultSet.getResults(rowNum, rowNum + 1000);
		for (var rs in resultSlice) {
			rowNum++;
			
			objMap[resultSlice[rs].getValue('internalid')] = {
				value: resultSlice[rs].getValue('internalid'),
				label: resultSlice[rs].getValue('entityid')
			}
		}
	}
	while (resultSlice.length >= 1000);
	
	return objMap;
}

function getExistingProjectsMap(customerId){

	objProjectMap = {};
	
	var arrFilters = [];
	arrFilters.push(new nlobjSearchFilter('parent', null, 'is', customerId));
	arrFilters.push(new nlobjSearchFilter('status', null, 'noneof', [1, 75, 76, 98]));
	
	var arrColumns = [];
	arrColumns.push(new nlobjSearchColumn('internalid'));
	arrColumns.push(new nlobjSearchColumn('entityid'));
	arrColumns.push(new nlobjSearchColumn('customer'));
	arrColumns.push(new nlobjSearchColumn('jobname'));
	arrColumns.push(new nlobjSearchColumn('internalid', 'transaction'));
	
	var newSearch = nlapiCreateSearch('job');
	newSearch.setFilters(arrFilters);
	newSearch.setColumns(arrColumns);
	var resultSet = newSearch.runSearch();
	
	var rowNum = 0;
	do {
		var resultSlice = resultSet.getResults(rowNum, rowNum + 1000);
		for (var rs in resultSlice) {
			rowNum++;
			
			var existingTransactionLink = resultSlice[rs].getValue('internalid', 'transaction');
			if (!resultSlice[rs].getValue('customer') || existingTransactionLink) {
				continue;
			}
			
			if (!objProjectMap.hasOwnProperty(resultSlice[rs].getValue('customer'))) {
				objProjectMap[resultSlice[rs].getValue('customer')] = [];
			}
			
			objProjectMap[resultSlice[rs].getValue('customer')].push({
				value: resultSlice[rs].getValue('internalid'),
				label: resultSlice[rs].getValue('entityid') + ' ' + resultSlice[rs].getValue('jobname')
			});
		}
	}
	while (resultSlice.length >= 1000);
	
	return objProjectMap;
}

function getExistingProjectAssignmentMap(params){

	objProjectAssignmentMap = {};
	
	var arrFilters = [];
	if (params.hasOwnProperty('salesorder')) {
		arrFilters.push(new nlobjSearchFilter('custrecordzc_srp_projassign_salesorder', null, 'is', params.salesorder));
	}
	if (params.hasOwnProperty('customer')) {
		arrFilters.push(new nlobjSearchFilter('custrecordzc_srp_projassign_customer', null, 'is', params.customer));
	}
	
	arrFilters.push(new nlobjSearchFilter('custrecordzc_srp_projassign_linkedtoline', null, 'is', 'F'));

	var arrColumns = [];
	arrColumns.push(new nlobjSearchColumn('internalid'));
	arrColumns.push(new nlobjSearchColumn('custrecordzc_srp_projassign_customer'));
	arrColumns.push(new nlobjSearchColumn('custrecordzc_srp_projassign_salesorder'));
	arrColumns.push(new nlobjSearchColumn('custrecordzc_srp_projassign_lineid'));
	arrColumns.push(new nlobjSearchColumn('custrecordzc_srp_projassign_projectname'));
	arrColumns.push(new nlobjSearchColumn('custrecordzc_srp_projassign_projectlink'));
	
	var newSearch = nlapiCreateSearch('customrecordzc_srp_project_assignments');
	newSearch.setFilters(arrFilters);
	newSearch.setColumns(arrColumns);
	var resultSet = newSearch.runSearch();
	
	var rowNum = 0;
	do {
		var resultSlice = resultSet.getResults(rowNum, rowNum + 1000);
		for (var rs in resultSlice) {
			rowNum++;

			if (!objProjectAssignmentMap.hasOwnProperty(resultSlice[rs].getValue('custrecordzc_srp_projassign_salesorder'))) {
				objProjectAssignmentMap[resultSlice[rs].getValue('custrecordzc_srp_projassign_salesorder')] = {};
			}
			
			objProjectAssignmentMap[resultSlice[rs].getValue('custrecordzc_srp_projassign_salesorder')][resultSlice[rs].getValue('custrecordzc_srp_projassign_lineid')] = {
				lineid: resultSlice[rs].getValue('custrecordzc_srp_projassign_lineid'),
				project_name: resultSlice[rs].getText('custrecordzc_srp_projassign_projectlink'),
				project_id: resultSlice[rs].getValue('custrecordzc_srp_projassign_projectlink')
			};
		}
	}
	while (resultSlice.length >= 1000);
	
	return objProjectAssignmentMap;
}

function txtToArray(val){

	return (val) ? val.split(',') : [];
}

function getAssignmentHTML(params){

	if (!objProjectMap) {
		objProjectMap = getExistingProjectsMap(params.customer);
	}
	
	for (var i = 0; params.srp_templates && i < params.srp_templates.length; i++) {
		params.srp_templates[i] = objProjectTemplateMap[params.srp_templates[i]] || [];
	}
	
	params.srp_templates = params.srp_templates.sort(myCustomSort);
	
	var assignmentHTML = '';
	assignmentHTML += '<div id="zc_srp_assign_select_container_' + params.linenum + '" class="zc_srp_select_container" style="display:none;">';
	
	if (params.project_id && params.assignment_type != assignmentType.TEMPLATE) {
		assignmentHTML += '		<a class="dottedlink" href="' + nlapiResolveURL('RECORD', 'job', params.project_id) + '" target="_blank">' + params.project_name + '</a>';
	}
	else {
		assignmentHTML += '		<select id="zc_srp_assign_select_' + params.linenum + '" class="zc_srp_assign_select">';
		assignmentHTML += '			<option ' + ((params.srp_templates.length == 1) ? '' : 'selected="selected" ') + 'value=""></option>';
		
		//EXISTING
		var arrExisting = objProjectMap[params.customer];
		if (arrExisting && arrExisting.length > 0) {
			assignmentHTML += '			<optgroup id="' + assignmentType.JOB_PEND + '" label="' + 'Existing Projects' + '">';
			for (var i = 0; arrExisting && i < arrExisting.length; i++) {
				assignmentHTML += '			<option value="' + arrExisting[i].value + '">' + arrExisting[i].label + '</option>';
			}
			assignmentHTML += '			</optgroup>';
		}
		
		//TEMPLATES
		if (params.srp_templates && params.srp_templates.length > 0) {
			assignmentHTML += '			<optgroup id="' + assignmentType.TEMPLATE + '" label="' + 'Project Templates' + '">';
			for (var i = 0; params.srp_templates && i < params.srp_templates.length; i++) {
				assignmentHTML += '			<option ' + ((params.srp_templates.length == 1) ? 'selected="selected" ' : '') + 'value="' + params.srp_templates[i].value + '">' + params.srp_templates[i].label + '</option>';
			}
			assignmentHTML += '			</optgroup>';
		}
		
		assignmentHTML += '		</select>';
	}
	assignmentHTML += '</div>';
	
	return assignmentHTML;
	
}

function getStatusHTML(params){

	var assignmentHTML = '';
	assignmentHTML += '<div id="zc_srp_assign_status_container_' + params.linenum + '">';
	if (params.project_id && params.assignment_type != assignmentType.TEMPLATE) {
		assignmentHTML += '<p style="color:green;max-width:100px;">Completed</p>';
	}
	assignmentHTML += '</div>';
	
	return assignmentHTML;
	
}

function getRecTypeId(recType){

	switch (recType) {
		case 'Opprtnty':
			recType = 'opportunity';
			break;
		case 'Opportunity':
			recType = 'opportunity';
			break;
		case 'CustInvc':
			recType = 'invoice';
			break;
		case 'Invoice':
			recType = 'invoice';
			break;
		case 'CashSale':
			recType = 'cashsale';
			break;
		case 'Cash Sale':
			recType = 'cashsale';
			break;
		case 'SalesOrd':
			recType = 'salesorder';
			break;
		case 'Sales Order':
			recType = 'salesorder';
			break;
		case 'CustCred':
			recType = 'creditmemo';
			break;
		case 'Credit Memo':
			recType = 'creditmemo';
			break;
		case 'CashRfnd':
			recType = 'cashrefund';
			break;
		case 'Cash Refund':
			recType = 'cashrefund';
			break;
	}
	
	return recType;
}

function getFileURL(filename){

	if (!filename) {
		return null;
	}
	
	var arrFilters = [];
	arrFilters.push(new nlobjSearchFilter('name', null, 'is', filename));
	
	var arrColumns = [];
	arrColumns.push(new nlobjSearchColumn('internalid').setSort(false));
	arrColumns.push(new nlobjSearchColumn('url'));
	
	var arrResults = nlapiSearchRecord('file', null, arrFilters, arrColumns);
	
	if (arrResults && arrResults.length > 0) {
		return arrResults[0].getValue('url');
	}
	return null;
}

function alertIcon() {
	return '<img style="height: 1.5em; width=1.5em" title="This project will be created automatically" src="data:image/png;base64,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">';
}

function myCustomSort(a, b){
	var valA = a.label;
	var valB = b.label;
	
	if (valA < valB) //sort string ascending
		return -1;
	if (valA > valB) 
		return 1;
	return 0; //default return value (no sorting)
}
