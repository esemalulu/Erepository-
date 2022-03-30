/**
 * Scheduled script to go thorugh ALL Booking record and do the following:
 * - Copy over Coach Time/Zone
 * - Calculate all Timezone values
 */

//Set at the company preference level. 
//Parameters created on CBL:UE: Set Timezone Values User Event Script
var paramErrorNotifierEmployee = nlapiGetContext().getSetting('SCRIPT', 'custscript_tzbk_employee');
var paramErrorCcEmails = nlapiGetContext().getSetting('SCRIPT','custscript_tzbk_cclist');
if (paramErrorCcEmails) {
	paramErrorCcEmails = paramErrorCcEmails.split(',');
}

//Script level parameter specific to this script
var paramLastProcId = nlapiGetContext().getSetting('SCRIPT', 'custscript_calctz_id');

function calculateBookingTimezoneValues() {
	
	try {
		
		//search all Booking (job) records
		//should ignore all Parent Gym item booking records
		var bflt = [new nlobjSearchFilter('isinactive', null, 'is','F'),
		            new nlobjSearchFilter('enddate', null, 'isnotempty',''),
		            new nlobjSearchFilter('custentity_bo_eventtime', null, 'isnotempty',''),
		            new nlobjSearchFilter('custentity_bo_eventtimezone', null, 'noneof','@NONE@')];
		
		if (paramLastProcId) {
			bflt.push(new nlobjSearchFilter('internalidnumber', null, 'lessthan', paramLastProcId));
		}
		
		var bcol = [new nlobjSearchColumn('internalid').setSort(true)];
		
		var brs = nlapiSearchRecord('job', null, bflt, bcol);
		
		//loop through each job and Load and Save
		//brs.length
		for (var b=0; brs && b < brs.length; b++) {
			
			try {			
				var bookrec = nlapiLoadRecord('job', brs[b].getValue('internalid'));
				nlapiSubmitRecord(bookrec, true, true);
				log('debug','Booking (Job)', 'Job ID '+brs[b].getValue('internalid'));
			} catch (recsaveerr) {
				log('error','Error Saving Booking Record',brs[b].getValue('internalid')+' Failed to Save: '+getErrText(recsaveerr));
				
			}
			
			if ( (b+1)==1000 || (nlapiGetContext().getRemainingUsage() < 50 && b < (b+1)) ) {
				var param = new Object();
				param['custscript_calctz_id'] = brs[b].getValue('internalid');
				var qstatus = nlapiScheduleScript(nlapiGetContext().getScriptId(), nlapiGetContext().getDeploymentId(), param);
				
				log('debug','Rescheduled on Booking',brs[b].getValue('internalid'));
				
				if (qstatus=='QUEUED') {
					break;
				}
			}			
		}
		
	} catch (settzerr) {
		throw nlapiCreateError('SETTZ_ERR', 'Error occured while attempting to set Time Zone Values on Booking Records: '+getErrText(settzerr), false);
	}
}