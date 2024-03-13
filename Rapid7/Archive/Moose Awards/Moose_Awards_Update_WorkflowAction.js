/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       04 Apr 2013     mburstein
 *
 */

/**
 * @returns {Void} Any or no return value
 */
function updateMooseAwards(){

	var context = nlapiGetContext();
	if (context.getExecutionContext() == 'workflow') {
		var params = new Object();
		/*
		 * Get the Update Type Publish (checkbox) value.  
		 * 		If the value is false then close the nomination period by updating current period
		 * 		if false then update status to publish - last quarter nominations for all non-winners and publish winners for all winners
		 */
		var updateTypePublish = context.getSetting('SCRIPT', 'custscriptr7mooseawardwfupdatepublish');
		nlapiLogExecution('DEBUG','updateTypePublish',updateTypePublish);
		// Schedule script to update Current Period
		if (updateTypePublish != 'T') {
			params['custscriptr7updatetypepublish'] = 'F';
			nlapiScheduleScript(707, 1, params);
		}
		// Schedule script to update status
		else {
			params['custscriptr7updatetypepublish'] = 'T';
			// Moose Awards Update Status Scheduled
			nlapiScheduleScript(707, 1, params);
		}
	}
}