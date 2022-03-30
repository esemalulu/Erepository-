/**
 * Scheduled script to copy over vendor records Timezone (custentity_bo_eventtimezone) to new Coach/Time Zone (custentity_coach_timezone)
 * This is one time script to execute
 * Mass update will not work in this case because new field Coach/Time Zone uses sourcing filter.
 * Mass update column does NOT support custom field that uses sourcing filter.
 */

var paramLastProcId = nlapiGetContext().getSetting('SCRIPT', 'custscript_copytz_id');

function copyOldVendorTzToNewTz() {
	
	try {
		
		var vflt = [new nlobjSearchFilter('custentity_bo_eventtimezone', null, 'noneof', '@NONE@'),
		            new nlobjSearchFilter('isinactive', null, 'is','F')];
		
		if (paramLastProcId) {
			vflt.push(new nlobjSearchFilter('internalidnumber', null, 'lessthan', paramLastProcId));
		}
		
		var vcol = [new nlobjSearchColumn('internalid').setSort(true),
		            new nlobjSearchColumn('custentity_bo_eventtimezone')];
		
		var vrs = nlapiSearchRecord('vendor', null, vflt, vcol);
		
		//loop through and sync
		for (var v=0; vrs && v < vrs.length; v++) {
			
			try {			
				//submit value
				nlapiSubmitField('vendor', vrs[v].getValue('internalid'), 'custentity_coach_timezone', vrs[v].getValue('custentity_bo_eventtimezone'), true);
				log('debug','Synced', 'Vendor ID '+vrs[v].getValue('internalid')+' Coach/Time Zone set to '+vrs[v].getValue('custentity_bo_eventtimezone'));
			} catch (reccopyerr) {
				log('error','Error updating new tz field',getErrText(reccopyerr));
				
			}
			
			if ( (v+1)==1000 || (nlapiGetContext().getRemainingUsage() < 50 && v < (v+1)) ) {
				var param = new Object();
				param['custscript_copytz_id'] = vrs[v].getValue('internalid');
				var qstatus = nlapiScheduleScript(nlapiGetContext().getScriptId(), nlapiGetContext().getDeploymentId(), param);
				if (qstatus=='QUEUED') {
					break;
				}
			}			
		}
		
	} catch (copytzerr) {
		throw nlapiCreateError('COPYTZ_ERR', 'Error occured while copying over old Timezone value to new Coach/Time Zone: '+getErrText(copytzerr), false);
	}
	
}