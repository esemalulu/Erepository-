function afterSubmitPushToPardot(type) {
	//nlapiLogExecution('debug', 'afterSubmitPushToPardot', 'User event type: ' + type);
	if (type == 'create' || type == 'edit') {  // If a new contact is saved

		var contactId = nlapiGetRecordId();	  // Get the internal ID of the new contact
		var contact = nlapiLoadRecord('contact', contactId);  // Load that contact record into the script
		var email = contact.getFieldValue('email');  // Get the email field
		if (email != null) {   // If the email is not null do the following
			var authenticationString = getPardotAuthentication();  // Get the Pardot authentication.  Called the function getPardotAuthentication
			if (authenticationString != false) {  // As long as the authentication did not fail go on
				// Populate the variables to create the Pardot upsert (update or insert) url command
				var firstName= contact.getFieldValue('firstname');  
				var lastName= contact.getFieldValue('lastname');
				var companyID= contact.getFieldValue('company');
				var existingPardotURL = contact.getFieldValue('custentitypi_url');
				var objCompany = nlapiLoadRecord('customer', companyID);
				var companyName = objCompany.getFieldValue('companyname');
				var phone = contact.getFieldValue('phone');
				var title = contact.getFieldValue('title');
				var varCount =0;  //This is the count of the number of fields to be added/updated in Pardot
				
				// This is the base upsert query for Pardot onto which the additional variables wil be appended
				var url = 'https://pi.pardot.com/api/prospect/version/3/do/upsert/email/' + email;
				url = url + authenticationString;  //appends on the user_key and the api_key 
				
				// If the variables are not equal to null add them to the url command
				if (firstName != null) {
					url = url + '&first_name=' + encodeURIComponent(firstName);
					varCount = varCount + 1;
				}
				if (lastName != null) {
					url = url + '&last_name=' + encodeURIComponent(lastName);
					varCount = varCount + 1;
				}
				if (companyName != null) {
					url = url + '&company=' + encodeURIComponent(companyName);
					varCount = varCount + 1;
				}
				if (phone != null) {
					url = url + '&phone=' + encodeURIComponent(phone);
					varCount = varCount + 1;
				}
				if (title != null) {
					url = url + '&job_title=' + encodeURIComponent(title);
					varCount = varCount + 1;
				}
				
				//nlapiLogExecution('debug', 'afterSubmitPushToPardot', 'URL after encoding: ' + url);  // For debugging
				
				// Submit the URL - command to Netsuite to execute the command in Pardot
				nlapiRequestURL(url, null, null );
				// If the Netsuite field custentitypi_url is queued or null then change that field to processing
				if (existingPardotURL == 'http://queued' || existingPardotURL == null) {
					nlapiSubmitField('contact', contactId, 'custentitypi_url', 'http://processing');
				}
				// Record the transaction to the script execution log
				nlapiLogExecution('debug', 'afterSubmitPushToPardot', 'Sent contact email to Pardot, ' + varCount + ' other fields were pushed');
			}
		}
	}
}

function getPardotAuthentication() {
		var pardotUserEmail='rob.macewen@audaxium.com';
		var pardotPassword='Audaxium10';
		var user_key='4e157590f10a4fd92a29030d4034cdb1';
		var url = 'https://pi.pardot.com/api/index?email='+pardotUserEmail+'&password='+pardotPassword+'&user_key='+user_key;
		var api_key;
		// Submit the authentication request to Pardot in order to get an api_key for further commands.  Save the response
		var response = nlapiRequestURL(url, null, null );
		// Convert the response to an XML response for parsing
		var responseXML = nlapiStringToXML( response.getBody() );
		// Select the value of the api_key from the XML response
		api_key = nlapiSelectValue( responseXML, '//api_key' );
		// As long as there is an api_key, create the authentication string and return it to be appended on the url command
		if (api_key) {
			var authenticationString =  '?user_key=' + user_key + '&api_key=' + api_key ;
			nlapiLogExecution('debug', 'afterSubmitPushToPardot', 'Pardot Authentication Successful');
			return authenticationString;
		}
		else {
			nlapiLogExecution('debug', 'afterSubmitPushToPardot', 'Pardot Authentication Failed');
			return false;
		}
}