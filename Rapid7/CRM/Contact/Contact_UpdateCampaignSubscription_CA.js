/*
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       24 Jul 2013     efagone
 *
 */

/*
 * @returns boolean of success
 */

function updateCampSubs_action(){

	var context = nlapiGetContext();
	
	var contactId = context.getSetting('SCRIPT', 'custscriptr7campsubcontact');
	var onboardCampSubId = context.getSetting('SCRIPT', 'custscriptr7campsubonboardcamp');
	
	if (contactId != null && contactId != '' && onboardCampSubId != null && onboardCampSubId != '') {
		var arrNewSubscriptions = new Array();
		
		var recContact = nlapiLoadRecord('contact', contactId);
		
		var arrCurrentSubscriptions = recContact.getFieldValues('custentityr7onboardingcampaignsubscript');
		for (var i = 0; arrCurrentSubscriptions != null && i < arrCurrentSubscriptions.length; i++) {
			arrNewSubscriptions[arrNewSubscriptions.length] = arrCurrentSubscriptions[i];
		}
		
		arrNewSubscriptions[arrNewSubscriptions.length] = onboardCampSubId;
		
		recContact.setFieldValues('custentityr7onboardingcampaignsubscript', arrNewSubscriptions);
		
		try {
			nlapiSubmitRecord(recContact, true, true);
		} 
		catch (e) {
			return 'F';
		}
		
		return 'T';
	}
	
	return 'F';
}


