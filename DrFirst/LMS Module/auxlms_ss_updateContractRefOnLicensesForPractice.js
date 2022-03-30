/**
 * Scheduled script with multiple unscheduled deployments to handle trigger from User Event.
 * This script is triggered when contract reference on practice is changed by NS User. 
 * THis script is designed to go through ALL License records for THAT practice and update its' 
 * contract external IDs
 */
function updateContractRefOnLicense() {
	
	//grab changes
	var paramUpdPracticeId = nlapiGetContext().getSetting('SCRIPT', 'custscript_sb137_updpracticeid');
	var paramNewContractId = nlapiGetContext().getSetting('SCRIPT', 'custscript_sb137_newcontractid');
	
	//Passed in by Scheduled script incase it needs to reschedule
	var paramLastProcLicId = nlapiGetContext().getSetting('SCRIPT', 'custscript_sb137_lastproclicid');
	
	//Exit out if one or both parameter values are missing
	if (!paramUpdPracticeId || !paramNewContractId)
	{
		log('error',
			'LMS LICENSE UPDATE TRIGGER ERROR',
			'Unable to trigger contract reference update on licenses for practice due to missing Practice and/or Contract IDs // '+
			'Practice Parameter Value: '+paramUpdPracticeId+' // '+
			'Contract Parameter Value: '+paramNewContractId);
		throw nlapiCreateError(
				'LMS-ERR', 
				'Unable to trigger contract reference update on licenses for practice due to missing Practice and/or Contract IDs //'+
				'Practice Parameter Value: '+paramUpdPracticeId+' // '+
				'Contract Parameter Value: '+paramNewContractId
				, true);
	}
	
	//Search for list of matching licenses to update
	var licflt = [new nlobjSearchFilter('custrecord_lmslc_practice', null, 'anyof', paramUpdPracticeId)];
	var liccol = [new nlobjSearchColumn('internalid').setSort(true)];
	
	if (paramLastProcLicId)
	{
		licflt.push(new nlobjSearchFilter('internalidnumber', null, 'lessthan', paramLastProcLicId));
	}
	
	var licrs = nlapiSearchRecord('customrecord_lmslic', null, licflt, liccol);
	
	//loop thorugh and delete the records
	for (var i=0; licrs && i < licrs.length; i++) {
		
		//Update the contract ref. field
		//11/16/2015 - Need to Update UI Updated date as well
		var updFlds = ['custrecord_lmslc_contract', 'custrecord_lmslc_uiupdatedt'],
			updVals = [paramNewContractId, 'T'];
		nlapiSubmitField('customrecord_lmslic', licrs[i].getValue('internalid'), updFlds, updVals, true);
		
		//Set % completed of script processing
		var pctCompleted = Math.round(((i+1) / licrs.length) * 100);
		nlapiGetContext().setPercentComplete(pctCompleted);
		
		//reschedule if gov is running low or legnth is 1000
		if (((i+1)==1000) || (nlapiGetContext().getRemainingUsage() <= 100)) {
			var rparam = {
				'custscript_sb137_updpracticeid':paramUpdPracticeId,
				'custscript_sb137_newcontractid':paramNewContractId,
				'custscript_sb137_lastproclicid':licrs[i].getValue('internalid')
			};
			
			nlapiScheduleScript(nlapiGetContext().getScriptId(), nlapiGetContext().getDeploymentId(), rparam);
			
			log('audit','Rescheduled',JSON.stringify(rparam));
		}
	}
}