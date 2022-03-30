function attachCompany() {
	// customsearch_contactnocompanybutattached  

	var searchResults = nlapiSearchRecord('contact', 'customsearch_contactnocompanybutattached' , null, null);
	var i;
	for (i = 0; i < searchResults.length; i++) {
		if (searchResults && searchResults.length > 0) {
			var thisContact = searchResults[i];
			var contactID = thisContact.getId( );
			var companyID = thisContact.getValue('internalid', 'company');
			log('attachCompany', 'Contact ID: ' + contactID + ', Company ID:  ' + companyID);
			var contactRecord = nlapiLoadRecord('contact', contactID);
			contactRecord.setFieldValue('company', companyID);
			contactRecord.setFieldValue('entityid', (thisContact.getValue('entityid') + ' (dup)') );
			var j = 2;
			var newContactID;
			var success = false;
			while (success == false && j < 8) {
				try {
					log('attachCompany', 'Attempting to add company to contact');
					newContactID = nlapiSubmitRecord(contactRecord, true, true);
					success = true;
					return true;
				}
				catch (err) {
					if (err instanceof nlobjError ) {
						log('attachCompany', 'Error saving contact record.  Error: ' + err.getCode() + '\n' + err.getDetails() );
					}
					else {
						log('attachCompany', 'Unexpected Error: ' + err.toString() );
					}
					
					contactRecord.setFieldValue('entityid', (thisContact.getValue('entityid') + ' (' + j + ')') );
					
					j++;
				}
			}
		}
	}
}



function log(title, details) {
	nlapiLogExecution('DEBUG',title,details);
}