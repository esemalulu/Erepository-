/*
 * @author efagone
 */

function deleteAllPSORecords(){
	
	var timeLimitInMinutes = 5;
	this.timeLimitInMilliseconds = timeLimitInMinutes * 60 * 1000;
	this.startingTime = new Date().getTime();
	 
	this.context = nlapiGetContext();
	
	//delete components
	var arrSearchResultsComponents = nlapiSearchRecord('customrecordr7psocomponent', null, null, null);
	
	for (var i=0; arrSearchResultsComponents!=null && i < arrSearchResultsComponents.length && unitsLeft() && timeLeft(); i++) {
	
		var searchResultComponent = arrSearchResultsComponents[i];
		var compId = searchResultComponent.getId();
		nlapiDeleteRecord('customrecordr7psocomponent', compId);
	}

    //delete engagements
	var arrSearchResultsEngagements = nlapiSearchRecord('customrecordr7psoengagement', null, null, null);
	
	for (var i=0; arrSearchResultsEngagements!=null && i < arrSearchResultsEngagements.length && unitsLeft() && timeLeft(); i++) {
	
		var searchResultEngagement = arrSearchResultsEngagements[i];
		var engId = searchResultEngagement.getId();
		nlapiDeleteRecord('customrecordr7psoengagement', engId);
	}
	
	//delete parent jobs
	var arrSearchResultsParentJobs = nlapiSearchRecord('customrecordr7psoparentjob', null, null, null);
	
	for (var i=0; arrSearchResultsParentJobs!=null && i < arrSearchResultsParentJobs.length && unitsLeft() && timeLeft(); i++) {
	
		var searchResultParentJob = arrSearchResultsParentJobs[i];
		var parentId = searchResultParentJob.getId();
		var salesOrderId = nlapiLookupField('customrecordr7psoparentjob', parentId, 'custrecordr7psojobsalesorder');
		
		nlapiSubmitField('salesorder', salesOrderId, 'custbodyr7salesorderpsojobcreated', 'F');
		nlapiDeleteRecord('customrecordr7psoparentjob', parentId);
		 	
	}

//also clear the Sales Order 'parent job created' flag
/*	
	var arrSearchFilter_SalesOrder = new Array();
	arrSearchFilter_SalesOrder[0] = new nlobjSearchFilter('custbodyr7salesorderpsojobcreated', null, 'is', 'T');
	
	var arrSearchColumn_SalesOrder = new Array();
	arrSearchColumn_SalesOrder[0] = new nlobjSearchColumn('internalid', null, 'group');
	
	var arrSearchResultsSalesOrders = nlapiSearchRecord('salesorder', null, arrSearchFilter_SalesOrder, arrSearchColumn_SalesOrder);
	
	for (var i=0; arrSearchResultsSalesOrders!=null && i < arrSearchResultsSalesOrders.length && unitsLeft() && timeLeft(); i++) {
	
		var salesOrderId = arrSearchResultsSalesOrders[i].getValue(arrSearchColumn_SalesOrder[0]);
		nlapiSubmitField('salesorder', salesOrderId, 'custbodyr7salesorderpsojobcreated', 'F');
			 	
	}
*/	
	
}

function timeLeft(){
	var presentTime =new Date().getTime(); 
	
	if (presentTime - startingTime > timeLimitInMilliseconds) {
		nlapiLogExecution('DEBUG', 'Hit Time Limit. Rescheduling script (script/deploy id)', context.getScriptId() + ' : ' + context.getDeploymentId());
		var status = nlapiScheduleScript(context.getScriptId(), context.getDeploymentId());
		nlapiLogExecution('DEBUG', 'Schedule Status', status);
		return false;
	}
	
	return true;
}

function unitsLeft(){
	
	var remainingUsage = context.getRemainingUsage();
	
	if (remainingUsage <= 500) {
		nlapiLogExecution('DEBUG', 'Remaining Usage Is Low', remainingUsage);
		nlapiLogExecution('DEBUG', 'Rescheduling script (script/deploy id)', context.getScriptId() + ' : ' + context.getDeploymentId());
		var status = nlapiScheduleScript(context.getScriptId(), context.getDeploymentId());
		nlapiLogExecution('DEBUG', 'Schedule Status', status);
		return false;
	}
	
	return true;
}
