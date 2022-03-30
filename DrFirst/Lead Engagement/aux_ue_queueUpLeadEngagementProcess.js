/**
 * SCRIPT IS DELETED on 4/20/2015 DUE to NetSuite Issue.
 * - User Event deployed against Campaign Response works when User or Scripts takes action but NOT when system takes action; form fill.
 * THIS is an issue that needs to be addressed by NetSuite.
 * In the mean time Campaign Response monitoring is handled by Scheduled Script running on 15 min. interval
 * 
 *
*/

function queueLeadEngAfterSubmit(type, form, request)
{
	log('debug','campaign action', type+' // '+nlapiGetRecordId());
	//ONLY trigger for CREATE
	if (type != 'create') 
	{
		return;
	}
	
	try 
	{
		//Add additional record types to process here
		var procRecType = ['contact'];
		
		//Need to identify if entity is contact
		var entityId = nlapiGetFieldValue('entity');
		var entityRecType = '';
		
		log('debug','entityId',entityId);
		
		var eflt = [new nlobjSearchFilter('internalid',null,'anyof',entityId)];
		var ecol = [new nlobjSearchColumn('type')];
		var ers = nlapiSearchRecord('entity', null, eflt, ecol);
		
		if (ers && ers.length > 0) 
		{
			entityRecType = ers[0].getRecordType();
			log('debug','entity type', entityRecType);
			//Make sure entity record type is one of to be processed record type
			if (!procRecType.contains(entityRecType))
			{
				log('audit','No Need to queue lead engagement for record type', 'Record Type // Record ID: '+entityRecType+' // '+entityId);
				return;
			}
		}
		
		var qparam = {
			'custscript_sct102_proctype':'2', //Pass in value of 2 for On Single Contact 
			'custscript_sct102_dormantsearchid':'', //Pass in empty value for dormant search
			'custscript_sct102_exectid':entityId // Pass in THIS record's Entity value
		};
	
		var queueStatus = nlapiScheduleScript('customscript_aux_ss_dailyleadengagement', null, qparam);
		
		log('debug','Processing Queue Lead Engagement','Entity ID ('+entityRecType+') on THIS Campaign: '+entityId);
		
		if (queueStatus != 'QUEUED') {
			throw nlapiCreateError('LEAD-ENGAGEMENT-ERROR', 
					'Failed to queue up Lead Engagement Proc for Contact ID '+nlapiGetFieldValue('entity'), false);
		}
	} 
	catch (engqueueerr) 
	{
		log('error','Real Time Lead Engagement Queue Error',getErrText(engqueueerr));
	}
}