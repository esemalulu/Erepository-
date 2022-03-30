/**
 * One time script to run on DEBUGGER
 * to go through reporting contract records with missing contract pillar
 *  and fill it in
 *  
 * 
 * Version    Date            Author           Remarks
 * 1.00       20 Sep 2016     json
 *
 */

function setContractPillarVal()
{
	var rcflt = [new nlobjSearchFilter('custrecord_cracv_ctrpillar', null, 'anyof','@NONE@')],
	rccol = [new nlobjSearchColumn('internalid').setSort(true),
	         new nlobjSearchColumn('custrecord_cracv_ctrpillar'),
	         new nlobjSearchColumn('custrecord_crc_ctrpillar','custrecord_cracv_contractref')],
	rcrs = nlapiSearchRecord('customrecord_axcr_acv', null, rcflt, rccol);

	for (var i=0; i < rcrs.length; i+=1)
	{
		
		alert(rcrs[i].getValue('internalid'));
		
		var arPillar = rcrs[i].getValue('custrecord_crc_ctrpillar','custrecord_cracv_contractref').split(','),
			curPillar = rcrs[i].getValue('custrecord_cracv_ctrpillar');
		
		alert(rcrs[i].getValue('internalid')+' // '+arPillar+' // Current: '+curPillar);
	
		var rec = nlapiLoadRecord('customrecord_axcr_acv', rcrs[i].getValue('internalid'));
		rec.setFieldValues('custrecord_cracv_ctrpillar', arPillar);
		nlapiSubmitRecord(rec, true, true);
		
		
		//Reschedule logic 
		//Add In Reschedule Logic
		//Set % completed of script processing
		var pctCompleted = Math.round(((i+1) / rcrs.length) * 100);
		nlapiGetContext().setPercentComplete(pctCompleted);

		//------------ Reschedule check -------------------
		if ((i+1)==1000 || ((i+1) < rcrs.length && nlapiGetContext().getRemainingUsage() < 1000)) 
		{
			//execute reschedule
			nlapiScheduleScript(
				nlapiGetContext().getScriptId(), 
				nlapiGetContext().getDeploymentId(), 
				null
			);
			break;
		}
		
	}
}


