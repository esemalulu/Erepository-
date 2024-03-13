/*
 * @author efagone
 */

function isBlacklisted(request, response){

		try {
			var userId = nlapiGetUser();
			var contactId = request.getParameter('custparam_contactid');
			var email = request.getParameter('custparam_email');
			
			if ((email == null || email == '') && (contactId != null && contactId != '')) {
				email = nlapiLookupField('contact', contactId, 'email');
			}
			
			var domain = email.substr(email.indexOf('@', 0));
			
			var arrSearchFilters = new Array();
			arrSearchFilters[0] = new nlobjSearchFilter('isinactive', null, 'is', 'F');
			arrSearchFilters[1] = new nlobjSearchFilter('custrecordr7domainemailblacklistemail', null, 'is', email);
			arrSearchFilters[1].setLeftParens(1);
			arrSearchFilters[1].setOr(true);
			arrSearchFilters[2] = new nlobjSearchFilter('formulatext', null, 'is', domain);
			arrSearchFilters[2].setLeftParens(1);
			arrSearchFilters[2].setFormula("SUBSTR({custrecordr7domainemailblacklistemail}, INSTR({custrecordr7domainemailblacklistemail}, '@'))");
			arrSearchFilters[3] = new nlobjSearchFilter('custrecordr7domainemailblacklistdomain', null, 'is', 'T');
			arrSearchFilters[3].setRightParens(2);
			
			var arrSearchColumns = new Array();
			arrSearchColumns[0] = new nlobjSearchColumn('internalid');
			arrSearchColumns[1] = new nlobjSearchColumn('custrecordr7domainemailblacklistemail');
			arrSearchColumns[2] = new nlobjSearchColumn('custrecordr7domainemailblacklistdomain');
			
			var arrSearchResults = nlapiSearchRecord('customrecordr7domainemailblacklist', null, arrSearchFilters, arrSearchColumns);
			
			if (arrSearchResults != null && arrSearchResults.length >= 1) {
				response.writeLine('T');
			}
			else {
				response.writeLine('F');
			}
			
		} 
		catch (e) {
			var adminUser =  nlapiLoadConfiguration('companypreferences').getFieldValue('custscriptr7_system_info_email_sender');
			nlapiSendEmail(adminUser, adminUser, 'Error on isBlacklisted Suitelet', 'Error: ' + e);
			nlapiLogExecution('ERROR', 'Error on isBlacklisted Suitelet', e);
			response.writeLine('F');
		}

}