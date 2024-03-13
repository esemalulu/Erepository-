/*
 * @author efagone
 */

function checkBlacklisted(contactId, email){

	try {
		
		if ((email == null || email == '') && (contactId != null && contactId != '')) {
			email = nlapiLookupField('contact', contactId, 'email');
		}
		
		if (email == null || email == '') {
			return false;
		}
		
		var domain = email.substr(email.indexOf('@', 0));
		
		var arrSearchFilters = new Array();
		arrSearchFilters[0] = new nlobjSearchFilter('isinactive', null, 'is', 'F');
		arrSearchFilters[1] = new nlobjSearchFilter('custrecordr7domainemailblacklistemail', null, 'is', email);
		arrSearchFilters[1].setLeftParens(2);
		arrSearchFilters[2] = new nlobjSearchFilter('custrecordr7domainemailblacklistdomain', null, 'is', 'F');
		arrSearchFilters[2].setRightParens(1);
		arrSearchFilters[2].setOr(true);
		arrSearchFilters[3] = new nlobjSearchFilter('formulatext', null, 'is', domain);
		arrSearchFilters[3].setLeftParens(1);
		arrSearchFilters[3].setFormula("SUBSTR({custrecordr7domainemailblacklistemail}, INSTR({custrecordr7domainemailblacklistemail}, '@'))");
		arrSearchFilters[4] = new nlobjSearchFilter('custrecordr7domainemailblacklistdomain', null, 'is', 'T');
		arrSearchFilters[4].setRightParens(2);
		
		var arrSearchColumns = new Array();
		arrSearchColumns[0] = new nlobjSearchColumn('internalid');
		arrSearchColumns[1] = new nlobjSearchColumn('custrecordr7domainemailblacklistemail');
		arrSearchColumns[2] = new nlobjSearchColumn('custrecordr7domainemailblacklistdomain');
		
		var arrSearchResults = nlapiSearchRecord('customrecordr7domainemailblacklist', null, arrSearchFilters, arrSearchColumns);
		
		if (arrSearchResults != null && arrSearchResults.length >= 1) {
			var adminUser =  nlapiLoadConfiguration('companypreferences').getFieldValue('custscriptr7_system_info_email_sender');
			nlapiSendEmail(adminUser, adminUser, 'Contact is BLACKLISTED', 'ContactId: ' + contactId + '\nEmail: ' + email);
			return true;
		}
		else {
			return false;
		}
		
	} 
	catch (e) {
		var adminUser =  nlapiLoadConfiguration('companypreferences').getFieldValue('custscriptr7_system_info_email_sender');
		nlapiSendEmail(adminUser, adminUser, 'Error on isBlacklisted function', 'Error: ' + e);
		nlapiLogExecution('ERROR', 'Error on isBlacklisted function', e);
		return false;
	}
	
}

function checkRestricted(contactId, email){

	try {
		
		if ((email == null || email == '') && (contactId != null && contactId != '')) {
			email = nlapiLookupField('contact', contactId, 'email');
		}
		
		if (email == null || email == ''){
			return false;
		}
		
		var domainExt = email.substr(email.lastIndexOf('.'));
		
		var arrSearchFilters = new Array();
		arrSearchFilters[0] = new nlobjSearchFilter('isinactive', null, 'is', 'F');
		arrSearchFilters[1] = new nlobjSearchFilter('custrecordr7domainextensioncategory', null, 'is', 2);
		arrSearchFilters[2] = new nlobjSearchFilter('name', null, 'is', domainExt);
		
		var arrSearchResults = nlapiSearchRecord('customrecordr7domainextensions', null, arrSearchFilters);
		
		if (arrSearchResults != null && arrSearchResults.length >= 1) {
			var adminUser =  nlapiLoadConfiguration('companypreferences').getFieldValue('custscriptr7_system_info_email_sender');
			nlapiSendEmail(adminUser, adminUser, 'Contact is RESTRICTED', 'ContactId: ' + contactId + '\nEmail: ' + email);
			return true;
		}
		else {
			return false;
		}
		
	} 
	catch (e) {
		var adminUser =  nlapiLoadConfiguration('companypreferences').getFieldValue('custscriptr7_system_info_email_sender');
		nlapiSendEmail(adminUser, adminUser, 'Error on isRestricted function', 'Error: ' + e);
		nlapiLogExecution('ERROR', 'Error on isRestricted function', e);
		return false;
	}
	
}