/**
 * This script is Triggered by scheduled New Campaign Engagement creation process.
 * UnScheduled Scheduled script.
 */


function dailySetEngmntStatusOnPhoneCall() {

	//Search for list of all Phone calls created TODAY by automated Workflow process
	//1. Phone Calls created TOODAY 
	//2. Subject Starts with "Mktg Lead - Contact"
	//3. Engagement Status (custevent_aux_phonecallengstatus) is NOT Set 
	var phflt = [new nlobjSearchFilter('title', null,'startswith','Mktg Lead - Contact'),
	             new nlobjSearchFilter('createddate', null,'on','today'),
	             new nlobjSearchFilter('custevent_aux_phonecallengstatus', null, 'anyof', '@NONE@'),
	             new nlobjSearchFilter('contact', null, 'noneof', '@NONE@')];
	var phcol = [new nlobjSearchColumn('internalid').setSort(true),
	             new nlobjSearchColumn('contact')];
	var phrs = nlapiSearchRecord('phonecall', null, phflt, phcol);
	
	for (var i=0; phrs && i < phrs.length; i++) 
	{
		//Last Engagement Status Value for processing contact
		var contactid = phrs[i].getValue('contact');
		log('debug','contactid','Phone call ID: '+phrs[i].getValue('internalid')+' // '+contactid);
		if (contactid)
		{
			var egflt = [new nlobjSearchFilter('custrecord_engrec_contact_name', null, 'anyof', contactid),
			             new nlobjSearchFilter('isinactive', null, 'is', 'F')];
			var egcol = [new nlobjSearchColumn('custrecord_engrec_date_created').setSort(true),
			             new nlobjSearchColumn('custrecord_engrec_engage_status')];
			var egrs = nlapiSearchRecord('customrecord_aux_engagment_record', null, egflt, egcol);
			
			if (egrs && egrs.length > 0)
			{
				try {
					nlapiSubmitField('phonecall', phrs[i].getValue('internalid'), 'custevent_aux_phonecallengstatus', egrs[0].getValue('custrecord_engrec_engage_status'), false);
					log('debug','Updated','Phone Call '+phrs[i].getValue('internalid')+' // Status '+egrs[0].getValue('custrecord_engrec_engage_status'));
				} catch (phupderr) {
					log('error','Error Updating Phone Call', 'Phone Call ID: '+phrs[i].getValue('internalid')+' // '+getErrText(phupderr));
				}
			}
		}
	}
}