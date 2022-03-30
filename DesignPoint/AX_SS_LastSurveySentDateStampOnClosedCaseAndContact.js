/**
 * Script to execute Weekly Every Monday to find most recent date of closed case for contact and update following fields to CURRENT Date:
 * Contact: custentity_lastsurveysent
 * Case: custevent_lastsurveysentcase
 * 
 * Assumes it does NOT need to reschedule
 * Assumes saved search always returns internalID of case and InternalID of Contact record
 * 		- Assumes Date Closed Summary is MAXIMUM
 * Assumes saved search result is ALWAYS sorted as:
 * 		- Sort by Contact DESC order
 * 		- Sort by Date Closed DESC order
 */
//Saved search parameter is NOT a drop down since the search may not be a public search
var paramSavedSearchId = ctx.getSetting('SCRIPT','custscript_ccdtstamp_savedsearchid');

function procDateStampOnClosedCases(type) {
	
	var strToday = nlapiDateToString(new Date());	
	
	try {

		if (!paramSavedSearchId) {
			throw nlapiCreateError('CLOSEDCASEDATESTAMPERR', 'Missing Internal ID of Saved Search to run against.', false);
		}
		
		var crs = nlapiSearchRecord(null, paramSavedSearchId, null, null);
		
		var lastProcContactId = '';
		for (var c=0; crs && c < crs.length; c++) {
			
			//Assume first occurence is always the max case/contact
			var contactId = crs[c].getValue('internalid','contact','group');
			var contactText = crs[c].getValue('contact',null,'group');
			var caseId = crs[c].getValue('internalid',null,'group');
			
			//only process if contact hasn't already been processed
			if (lastProcContactId != contactId) {
				
				nlapiSubmitField('supportcase', caseId, 'custevent_lastsurveysentcase', strToday, false);
				nlapiSubmitField('contact', contactId, 'custentity_lastsurveysent', strToday, false);
				
				log('debug','Executing Update','UPDATE Case ID: '+caseId+' // Contact: '+contactText+' ('+contactId+')');
				
				lastProcContactId = contactId;
			} else {
				log('debug','Skipping Update','SKIP Case ID: '+caseId+' // Contact: '+contactText+' ('+contactId+')');
			}
		}
		
	} catch (ccdterr) {
		
		log('error','Survey Sent Date Stamp Error',getErrText(ccdterr));
		throw nlapiCreateError('CLOSEDCASEDATESTAMPERR', getErrText(ccdterr), false);
		
	}
	
	
}
