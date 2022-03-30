/**
 * Scheduled script to go through list of all contacts with NO LeadSource (contactsource) and attempt to set FIRST campaign response as the source value.
 *   
 */

function setContactLeadSourceAsFirstCampaignRespo() {
	
	var lflt = [new nlobjSearchFilter('contactsource', null, 'anyof','@NONE@'),
	            new nlobjSearchFilter('internalid','campaignresponse','noneof','@NONE@'),
	            new nlobjSearchFilter('isinactive', null, 'is','F')];
	
	var lcol = [new nlobjSearchColumn('internalid').setSort(true),
	            new nlobjSearchColumn('entityid')];
	
	//Search for all contacts with missing lead source that HAS campaign response.
	var lrs = nlapiSearchRecord('contact', null, lflt, lcol);	
	
	for (var i=0; lrs && i < lrs.length; i++) {
		
		log('debug','processing',lrs[i].getValue('internalid')+' // '+lrs[i].getValue('entityid'));
		
		try 
		{
			
			//Search for Campaign Response SORTED ASC for THIS contact
			var cflt = [new nlobjSearchFilter('internalid',null,'anyof',lrs[i].getValue('internalid'))];
			var ccol = [new nlobjSearchColumn('createddate','campaignResponse',null).setSort(),
			            new nlobjSearchColumn('internalid','campaignResponse',null),
			            new nlobjSearchColumn('campaignid','campaignResponse', null)];
			var crs = nlapiSearchRecord('contact', null, cflt, ccol);
			
			//Update with Campaign Response ID
			nlapiSubmitField('contact', lrs[i].getValue('internalid'), 'contactsource', crs[0].getValue('internalid','campaignResponse',null), true);
			
			//Assume there IS a result and ONLY grab the first one since this is ORDERED in Created Date ASC. 
			log('debug',' ----- Campaign Response:',crs[0].getValue('internalid','campaignResponse',null)+' // '+crs[0].getValue('campaignid','campaignResponse',null)+' // '+crs[0].getValue('createddate','campaignResponse',null));
		} 
		catch (lserr) 
		{
			
			log('error','Error Processing First Campaign Lookup','Contact ID: '+lrs[i].getValue('internalid')+' // '+getErrText(lserr));
			
		}
		
		//Set % completed of script processing
		var pctCompleted = Math.round(((i+1) / lrs.length) * 100);
		nlapiGetContext().setPercentComplete(pctCompleted);
		
		//log('debug','Left Over Usage', nlapiGetContext().getRemainingUsage());
		
		//Reschedule logic
		if ((i+1)==1000 || ((i+1) < lrs.length && nlapiGetContext().getRemainingUsage() < 500)) {
			//reschedule
			log('debug','Rescheduling','Rescheduling after '+lrs[i].getValue('internalid'));
			nlapiScheduleScript(nlapiGetContext().getScriptId(), nlapiGetContext().getDeploymentId(), null);
			break;
		}
		
	}	
}
