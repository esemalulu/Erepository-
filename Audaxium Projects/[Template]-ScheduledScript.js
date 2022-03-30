/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       04 Sep 2015     json
 *
 */

/**
 * @param {String} type Context Types: scheduled, ondemand, userinterface, aborted, skipped
 * @returns {Void}
 */
function scheduled(type) {
	// This is not required so grab it separately
	var paramLastProcId = nlapiGetContext().getSetting('SCRIPT', 'custscript_[script idxx]_lastprocid');
	
	//Search. Adhoc or using saved search
	var flt = null;
	
	if (paramLastProcId)
	{
		flt = [];
		//IF the search is sorted in DESC
		flt.push(new nlobjSearchFilter('internalidnumber', null, 'lessthan', paramLastProcId));
		
		//IF the search is sorted in ASC
		//flt.push(new nlobjSearchFilter('internalidnumber', null, 'greaterthan', paramLastProcId));
	}
	
	//Search result will be ordered either in ASC or DESC of internal ID
	var rs = nlapiSearchRecord(null, '[script id]', flt, null);
	
	for (var i=0; rs && i < rs.length; i+=1)
	{
		try
		{
			//[... Do some processs]
		}
		catch (err)
		{
			
		}
		
		
		//Set % completed of script processing
		var pctCompleted = Math.round(((i+1) / rs.length) * 100);
		nlapiGetContext().setPercentComplete(pctCompleted);
		
		//AFter each record is processed, you check to see if you need to reschedule
		if ((i+1)==1000 || ((i+1) < rs.length && nlapiGetContext().getRemainingUsage() < 500)) 
		{
			//reschedule
			log('debug','Getting Rescheduled at', rs[i].getValue('internalid'));
			var rparam = new Object();
			rparam['custscript_[script idxx]_lastprocid'] = rs[i].getValue('internalid');
			
			nlapiScheduleScript(nlapiGetContext().getScriptId(), nlapiGetContext().getDeploymentId(), rparam);
			break;
		}
		
		
	}
	
	
}
