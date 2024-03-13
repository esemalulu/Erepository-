/*
 * @author efagone
 */

function unsubscribe(request, response){
	
	var success = '<html><body>You have been unsubscribed. Thank you.</body></html>'
	var fail = '<html><body>An error occurred. Please email <a href="mailto:info@rapid7.com?Subject=UNSUBSCRIBE">info@rapid7.com</a> to request that you are unsubscribed from all email campaigns.</body></html>'

	if (request.getMethod() == 'GET') {
	
		//grab all parameters supplied
		var contactId = request.getParameter('custparam_unsubscribe');
		var email = request.getParameter('custparam_email');
		if (contactId != null && contactId != '' && email != null && email != '') {
			var contactEmail = nlapiLookupField('contact', contactId, 'email');
			
			if (email == contactEmail) {
				nlapiSubmitField('contact', contactId, 'globalsubscriptionstatus', 2);
				var adminUser =  nlapiLoadConfiguration('companypreferences').getFieldValue('custscriptr7_system_info_email_sender');
				nlapiSendEmail(adminUser, adminUser, 'A contact has unsubscribed: ' + contactEmail, 'ContactId: ' + contactId + '\nEmail: ' + contactEmail);
				response.writeLine(success);
			}
			else {
				response.writeLine(fail);
			}
		}
		else {
			response.writeLine(fail);
		}
	}
}