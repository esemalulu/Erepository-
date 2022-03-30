/**
 * Scheduled script to go thorugh ALL Supplier (Vendor) record and get count of coaches in each country
 * Script runs every Sat.
 */


//Script level parameter specific to this script
var paramLastProcId = nlapiGetContext().getSetting('SCRIPT', 'custscript_cntcoach_id');

function countCoachesByCountry() {
	
	try {
		
		//search against vendor record to get count
		var vflt = [new nlobjSearchFilter('isinactive', null, 'is','F'),
		            new nlobjSearchFilter('custentity_coach_masterrecord', null, 'is','T'),
		            new nlobjSearchFilter('category', null, 'anyof','5')];
		
		if (paramLastProcId) {
			vflt.push(new nlobjSearchFilter('internalidnumber', 'custentity_coach_primarydeliverycountry', 'lessthan', paramLastProcId));
		}
		
		var vcol = [new nlobjSearchColumn('internalid', 'custentity_coach_primarydeliverycountry','group').setSort(true),
		            new nlobjSearchColumn('custentity_coach_primarydeliverycountry', null, 'group'),
		            new nlobjSearchColumn('entityid', null, 'count')];
		
		var vrs = nlapiSearchRecord('vendor', null, vflt, vcol);
		
		//loop through each vendor
		for (var v=0; vrs && v < vrs.length; v++) {
			
			var ctrid = vrs[v].getValue('custentity_coach_primarydeliverycountry', null, 'group');
			var ctrtext = vrs[v].getText('custentity_coach_primarydeliverycountry', null, 'group');
			var ccnt = vrs[v].getValue('entityid', null, 'count');
			
			log('debug','country // count', ctrid+' - '+ctrtext+' // '+ccnt);
			
			//update country record
			nlapiSubmitField('customrecord_country', ctrid, 'custrecord_country_coaches', ccnt, false);
			
			log('debug','Usage Left',nlapiGetContext().getRemainingUsage());
			
			if ( (v+1)==1000 || (nlapiGetContext().getRemainingUsage() < 100 && v < (v+1)) ) {
				var param = new Object();
				param['custscript_cntcoach_id'] = ctrid;
				var qstatus = nlapiScheduleScript(nlapiGetContext().getScriptId(), nlapiGetContext().getDeploymentId(), param);
				if (qstatus=='QUEUED') {
					break;
				}
			}			
		}
		
	} catch (setcnterr) {
		throw nlapiCreateError('SET_COACHCOUNT_ERR', 'Error occured while attempting to set Coach Count on Country records: '+getErrText(setcnterr), false);
	}
}