/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       04 Feb 2013     mburstein
 *
 */

/**
 * @param {String} type Context Types: scheduled, ondemand, userinterface, aborted, skipped
 * @returns {Void}
 */

/**
 * This scheduled script is used to offload EAT processing when the afterSubmit:Email_Association_Tags_SS.js hits the governance limit
 * EAMs remaining in arrMastersToUpdate are passed to the scheduled script for processing
 * 
 */
function processMasterScheduled(type) {
	this.context = nlapiGetContext();
	var strRemainingMasters = context.getSetting('SCRIPT', 'custscriptr7emailassociationmastertemp');
	if ( strRemainingMasters != null && strRemainingMasters != '') {
		nlapiLogExecution('DEBUG','Remaining Masters',strRemainingMasters);
		var arrMastersToUpdate = strRemainingMasters.split(",");
			
		var mastersLeftToUpdate = queueUpMasterProcessing(arrMastersToUpdate);
		
		scheduleRemainingMasters(mastersLeftToUpdate);
	}
}
