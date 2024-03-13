/*
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       20 Mar 2013     efagone
 *
 */

/*
 * @returns {Void} Any or no return value
 */
function workflowAction_opp_association(){
	
	var context = nlapiGetContext();
	nlapiLogExecution('DEBUG', 'context', context.getExecutionContext());
	
	if (context.getExecutionContext() == 'workflow') {

		var taskId = context.getSetting('SCRIPT', 'custscriptr7bdrtaskopp_taskid');
		var oppId = context.getSetting('SCRIPT', 'custscriptr7bdrtaskopp_opp');
		
		updateRelatedTasks(taskId, oppId);
	}
}

function updateRelatedTasks(taskId, oppId){
	
	if (taskId != null && taskId != '' && oppId != null && oppId != '') {
		var arrSearchFilters = new Array();
		arrSearchFilters[0] = new nlobjSearchFilter('internalid', null, 'anyof', taskId);
		arrSearchFilters[0].setLeftParens(1);
		arrSearchFilters[0].setOr(true);
		arrSearchFilters[1] = new nlobjSearchFilter('custeventr7originatingtask', null, 'anyof', taskId);
		arrSearchFilters[1].setRightParens(1);
		arrSearchFilters[2] = new nlobjSearchFilter('internalid', 'transaction', 'noneof', oppId);
		
		var arrSearchColumns = new Array();
		arrSearchColumns[0] = new nlobjSearchColumn('internalid');
		
		var arrSearchResults = nlapiSearchRecord('task', null, arrSearchFilters, arrSearchColumns);
		
		for (var i = 0; arrSearchResults != null && i < arrSearchResults.length; i++) {
		
			try {
				nlapiSubmitField('task', arrSearchResults[i].getId(), 'transaction', oppId);
			} 
			catch (e) {
				var adminUser =  nlapiLoadConfiguration('companypreferences').getFieldValue('custscriptr7_system_info_email_sender');
				nlapiSendEmail(adminUser, adminUser, 'Could not update task record', 'updateRelatedTasks(): ' + e + '\nID: ' + arrSearchResults[i].getId());
			}
			
		}
	}
}
