/*
 * @author efagone
 */

var timeLimitInMinutes;
var startingTime = new Date().getTime();
var context = nlapiGetContext();
var rescheduleScript = false;

function processProjectOrderLink(singleProjectAssignmentId){

	nlapiLogExecution('AUDIT', 'Starting processProjectAssignments()', 'now');
	
	if (rescheduleScript) {
		return;
	}
	
	var objProjectAssignmentToProcess = {};
	
	var arrFilters = [];
	if (singleProjectAssignmentId) {
		arrFilters.push(new nlobjSearchFilter('internalid', null, 'is', singleProjectAssignmentId));
	}
	arrFilters.push(new nlobjSearchFilter('isinactive', null, 'is', 'F'));
	arrFilters.push(new nlobjSearchFilter('custrecordzc_srp_projassign_proj_updated', null, 'is', 'T'));
	arrFilters.push(new nlobjSearchFilter('custrecordzc_srp_projassign_linkedtoline', null, 'is', 'F'));
	arrFilters.push(new nlobjSearchFilter('custrecordzc_srp_projassign_link_error', null, 'isempty'));

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
			
			if (!resultSlice[rs].getValue('custrecordzc_srp_projassign_salesorder') || !resultSlice[rs].getValue('custrecordzc_srp_projassign_lineid')) {
				continue;
			}
			
			if (!objProjectAssignmentToProcess.hasOwnProperty(resultSlice[rs].getValue('custrecordzc_srp_projassign_salesorder'))) {
				objProjectAssignmentToProcess[resultSlice[rs].getValue('custrecordzc_srp_projassign_salesorder')] = {};
			}
			
			objProjectAssignmentToProcess[resultSlice[rs].getValue('custrecordzc_srp_projassign_salesorder')][resultSlice[rs].getValue('custrecordzc_srp_projassign_lineid')] = {
				internalid: resultSlice[rs].getValue('internalid'),
				lineid: resultSlice[rs].getValue('custrecordzc_srp_projassign_lineid'),
				project_id: resultSlice[rs].getValue('custrecordzc_srp_projassign_projectlink')
			};
		}
	}
	while (resultSlice.length >= 1000);
	
	//update sales orders
	for (var salesOrderId in objProjectAssignmentToProcess) {
		if (!unitsLeft() || !timeLeft()) {
			rescheduleScript = true;
			break;
		}
		var objOrderProjectAssignment = objProjectAssignmentToProcess[salesOrderId];
		
		try {
			setProjectOnSalesOrder(salesOrderId, objOrderProjectAssignment);
		} 
		catch (e) {
			var errorCode = (e instanceof nlobjError) ? e.getCode() : e.toString();
			
			if (errorCode.indexOf('RCRD_HAS_BEEN_CHANGED') >= 0) { //give it another shot
				try {
					setProjectOnSalesOrder(salesOrderId, objOrderProjectAssignment);
				} 
				catch (e2) {
					objOrderProjectAssignment.error = e2.toString();
					nlapiLogExecution('ERROR', 'Could not set job for sales order', e2);
				}
			}
			else {
				objOrderProjectAssignment.error = e.toString();
				nlapiLogExecution('ERROR', 'Could not set job for sales order', e);
			}
		}
		
		//now update all the proj assignments
		var errorTxt = (objOrderProjectAssignment.hasOwnProperty('error')) ? objOrderProjectAssignment.error : null;
		for (var lineId in objOrderProjectAssignment) {
		        if (lineId == 'error' || !objOrderProjectAssignment[lineId].internalid){
                                continue;
                        }
			if (!errorTxt) {
				nlapiDeleteRecord('customrecordzc_srp_project_assignments', objOrderProjectAssignment[lineId].internalid);
			}
			else {
				nlapiSubmitField('customrecordzc_srp_project_assignments', objOrderProjectAssignment[lineId].internalid, ['custrecordzc_srp_projassign_linkedtoline', 'custrecordzc_srp_projassign_link_error'], ['F', errorTxt]);
			}
		}
	}
	
	return true;
}

function processProjectFields(singleProjectAssignmentId){
	nlapiLogExecution('AUDIT', 'Starting updateProjectFields()', 'now');
	
	if (rescheduleScript) {
		return {
			success: true
		};
	}
	
	var objProjectAssignmentToProcess = {};
	
	var arrFilters = [];
	if (singleProjectAssignmentId) {
		arrFilters.push(new nlobjSearchFilter('internalid', null, 'is', singleProjectAssignmentId));
	}
	arrFilters.push(new nlobjSearchFilter('isinactive', null, 'is', 'F'));
	arrFilters.push(new nlobjSearchFilter('custrecordzc_srp_projassign_proj_updated', null, 'is', 'F'));
	arrFilters.push(new nlobjSearchFilter('mainline', 'custrecordzc_srp_projassign_salesorder', 'is', 'T'));
	
	var arrColumns = [];
	arrColumns.push(new nlobjSearchColumn('internalid'));
	arrColumns.push(new nlobjSearchColumn('custrecordzc_srp_projassign_customer'));
	arrColumns.push(new nlobjSearchColumn('custrecordzc_srp_projassign_salesorder'));
	arrColumns.push(new nlobjSearchColumn('custrecordzc_srp_projassign_item'));
	arrColumns.push(new nlobjSearchColumn('custrecordzc_srp_projassign_item_desc'));
	arrColumns.push(new nlobjSearchColumn('custrecordzc_srp_projassign_lineid'));
	arrColumns.push(new nlobjSearchColumn('custrecordzc_srp_projassign_projectname'));
	arrColumns.push(new nlobjSearchColumn('custrecordzc_srp_projassign_projectlink'));
	arrColumns.push(new nlobjSearchColumn('opportunity', 'custrecordzc_srp_projassign_salesorder'));
	arrColumns.push(new nlobjSearchColumn('custentityr7accountmanager', 'custrecordzc_srp_projassign_customer'));
	
	var newSearch = nlapiCreateSearch('customrecordzc_srp_project_assignments');
	newSearch.setFilters(arrFilters);
	newSearch.setColumns(arrColumns);
	var resultSet = newSearch.runSearch();
	
	var rowNum = 0;
	do {
		var resultSlice = resultSet.getResults(rowNum, rowNum + 1000);
		for (var rs in resultSlice) {
			rowNum++;
			
			var csm_emp= resultSlice[rs].getValue('custentityr7accountmanager', 'custrecordzc_srp_projassign_customer');

			objProjectAssignmentToProcess[resultSlice[rs].getValue('internalid')] = {
				internalid: resultSlice[rs].getValue('internalid'),
				lineid: resultSlice[rs].getValue('custrecordzc_srp_projassign_lineid'),
				project_id: resultSlice[rs].getValue('custrecordzc_srp_projassign_projectlink'),
				customer: resultSlice[rs].getValue('custrecordzc_srp_projassign_customer'),
				memo: resultSlice[rs].getValue('custrecordzc_srp_projassign_item_desc'),
				item: resultSlice[rs].getValue('custrecordzc_srp_projassign_item'),
				salesorder: resultSlice[rs].getValue('custrecordzc_srp_projassign_salesorder'),
				opportunity: resultSlice[rs].getValue('opportunity', 'custrecordzc_srp_projassign_salesorder'),
				csm: csmValidation(csm_emp) ? csm_emp: "",
				currency:nlapiLookupField('salesorder', resultSlice[rs].getValue('custrecordzc_srp_projassign_salesorder'), 'currency')

			};
		}
	}
	while (resultSlice.length >= 1000);
	
	//update projects
	for (var assignmentId in objProjectAssignmentToProcess) {
	
		if (!unitsLeft() || !timeLeft()) {
			rescheduleScript = true;
			break;
		}
		
		try {
			setProjectFields(objProjectAssignmentToProcess[assignmentId]);
			if (singleProjectAssignmentId) {
				return {
					success: true
				};
			}
		} 
		catch (e) {
			var errorCode = (e instanceof nlobjError) ? e.getCode() : e.toString();
			
			if (errorCode.indexOf('RCRD_HAS_BEEN_CHANGED') >= 0) { //give it another shot
				try {
					setProjectFields(objProjectAssignmentToProcess[assignmentId]);
					if (singleProjectAssignmentId) {
						return {
							success: true
						};
					}
					continue;
				} 
				catch (e2) {
					nlapiLogExecution('ERROR', 'Could not update job fields', e2);
					nlapiSubmitField('customrecordzc_srp_project_assignments', objProjectAssignmentToProcess[assignmentId].internalid, 'custrecordzc_srp_projassign_proj_error', e2.toString());
				}
			}
			else 
				if (errorCode.indexOf('IS_UNDER_CONSTRUCTION') >= 0) {
					//do nothing
					if (singleProjectAssignmentId) {
						return {
							success: false,
							underconstruction: true
						};
					}
				}
				else {
					nlapiLogExecution('ERROR', 'Could not update job fields', e);
					nlapiSubmitField('customrecordzc_srp_project_assignments', objProjectAssignmentToProcess[assignmentId].internalid, 'custrecordzc_srp_projassign_proj_error', e.toString());
					if (singleProjectAssignmentId) {
						return {
							success: false
						};
					}
				}
		}
		
	}
	
	return {
		success: true
	};
}

function setProjectFields(objProjectAssignment){

	var fldsToSet = {};
	soSubsidiary = nlapiLookupField('salesorder', objProjectAssignment.salesorder, 'subsidiary');
	fldsToSet['parent'] = objProjectAssignment.customer;
	fldsToSet['subsidiary'] = soSubsidiary;
	fldsToSet['custentityr7salesorder'] = objProjectAssignment.salesorder;
	fldsToSet['custentityr7opppage'] = objProjectAssignment.opportunity;
	fldsToSet['custentityr7itemnum'] = objProjectAssignment.item;
	fldsToSet['custentityr7itemdisplayname'] = objProjectAssignment.memo;
	fldsToSet['custentityr7accountmanager'] = objProjectAssignment.csm;
	fldsToSet['currency'] = objProjectAssignment.currency;

	// https://issues.corp.rapid7.com/browse/APPS-9973
	specialTermsLookup = nlapiLookupField('salesorder', objProjectAssignment.salesorder, ['custbody_r7_pre_approved_expenses', 'custbody_r7_use_of_subcontractors', 'custbodysfbillingschedule']);
	specialTermsFieldValue = "";
	if (specialTermsLookup['custbodysfbillingschedule'] != "" && specialTermsLookup['custbodysfbillingschedule'] != null) {
		var billingSchedule = nlapiLookupField('customlistsfbillingschedulelist', specialTermsLookup['custbodysfbillingschedule'], ['name']);
		specialTermsFieldValue += (billingSchedule['name'] + " \n");
	}
	if (specialTermsLookup['custbody_r7_pre_approved_expenses'] == "T" || specialTermsLookup['custbody_r7_pre_approved_expenses'] == true) {
		specialTermsFieldValue += "Expenses must be preapproved by Customer. \n";
	}
	if (specialTermsLookup['custbody_r7_use_of_subcontractors'] == "T" || specialTermsLookup['custbody_r7_use_of_subcontractors'] == true) {
		specialTermsFieldValue += "No subcontractors will be engaged by Rapid7 on this services engagement without approval by Customer. \n";
	}
	fldsToSet['custentityr7specialcontractterms'] = specialTermsFieldValue;
	
	// https://issues.corp.rapid7.com/browse/APPS-9486
	servicesSpecialistLookup = nlapiLookupField('customer', objProjectAssignment.customer, 'custentity_r7_services_specialist');
	if (servicesSpecialistLookup != "" || servicesSpecialistLookup != null) {
		fldsToSet['custentity_r7_services_specialist'] = servicesSpecialistLookup;
	}
	
	var rec = nlapiLoadRecord('job', objProjectAssignment.project_id, {
		recordmode: 'dynamic'
	});
	for (var fldId in fldsToSet) {
		rec.setFieldValue(fldId, fldsToSet[fldId]);
	}
	nlapiSubmitRecord(rec, true, true);
	
	//now update the assignment record
	nlapiSubmitField('customrecordzc_srp_project_assignments', objProjectAssignment.internalid, 'custrecordzc_srp_projassign_proj_updated', 'T');
}



function setProjectOnSalesOrder(salesOrderId, objOrderProjectAssignment){
	
	var isUpdated = false;
	var recSalesOrder = nlapiLoadRecord('salesorder', salesOrderId);
	
	var lineCount = recSalesOrder.getLineItemCount('item');
	for (var i = 1; i <= lineCount; i++) {
	
		var lineId = recSalesOrder.getLineItemValue('item', 'line', i);
		var jobId = recSalesOrder.getLineItemValue('item', 'job', i);
		var ffProjectId = recSalesOrder.getLineItemValue('item', 'custcol_r7_ff_project_id', i);
		
		if (!jobId && objOrderProjectAssignment.hasOwnProperty(lineId)) {
			recSalesOrder.setLineItemValue('item', 'job', i, objOrderProjectAssignment[lineId].project_id);
			nlapiSubmitField('job',objOrderProjectAssignment[lineId].project_id,'custentity_r7_ff_project_id_line',ffProjectId);
			isUpdated = true;
		}
	}	
	if (isUpdated) {
		nlapiSubmitRecord(recSalesOrder, false, true);
	}
	return;
}

function timeLeft(){
	if (!timeLimitInMinutes){
		return true;
	}
	var presentTime = new Date().getTime();
	if (rescheduleScript || presentTime - startingTime > (timeLimitInMinutes * 60 * 1000)) {
		nlapiLogExecution('AUDIT', 'Ran out of time', 'yup');
		rescheduleScript = true;
		return false;
	}
	return true;
}

function unitsLeft(){
	var unitsLeft = context.getRemainingUsage();
	if (rescheduleScript || unitsLeft <= 100) {
		nlapiLogExecution('AUDIT', 'Ran out of units', 'yup');
		rescheduleScript = true;
		return false;
	}
	return true;
}

function csmValidation(csm) {
	if (csm) {
		var csm_fields = nlapiLookupField('employee', csm, ['isinactive', 'custentityr7isaccountmanager']);
		nlapiLogExecution('debug','CSM Inactive', csm_fields['isinactive']);
		nlapiLogExecution('debug','CSM Account Manager', csm_fields['custentityr7isaccountmanager']);

		if (csm_fields['isinactive'] == 'T' || csm_fields['custentityr7isaccountmanager'] == 'F') {
			return false;
		}
	}
	return true;
}