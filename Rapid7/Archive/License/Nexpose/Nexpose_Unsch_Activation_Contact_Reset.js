this.username = 'support';
this.password = 'h7KtvLjWSwPnI';

function reset(){

	var results = getRecordsToReset();
	
	for (var i = 0; results.searchResults != null && i < results.searchResults.length; i++) {
	
		var LiecenseRecId = null;
		var resetRecId = results.searchResults[i].getId();
		var resetContactId = results.searchResults[i].getValue(results.searchColumns[0]);
		var resetExpirationId = results.searchResults[i].getValue(results.searchColumns[1]);
		var resetLicenseId = results.searchResults[i].getValue(results.searchColumns[2]);
		var resetLicense = results.searchResults[i].getValue(results.searchColumns[3]);
		
		try {
			//Process all records
			LiecenseRecId = processRecord(resetRecId, resetContactId, resetExpirationId, resetLicenseId, resetLicense);		
		} 
		catch (err) {
			nlapiLogExecution('ERROR', 'Could not process record', err);
		}
		
		//If processing was successful check off checkbox
		if (LiecenseRecId != null) {
			nlapiSubmitField('customrecordr7nexposelicensingreset', resetRecId, 'custrecordr7nxresetunprocessed', 'F');
		}
	}
}

//Process an individual record
function processRecord(resetRecId, resetContactId, resetExpirationId, resetLicenseId, resetLicense){

	var LicenseRecId = null;
	if (resetLicenseId != null && resetLicenseId != '') {
		//Loading the nexpose record
		var nxLicenseRecord = nlapiLoadRecord('customrecordr7nexposelicensing', resetLicenseId);
		
		//Setting new contact
		if (resetContactId != null && resetContactId != '') {
			nxLicenseRecord.setFieldValue('custrecordr7nxlicensecontact', resetContactId);
		}
		
		//Setting new expiration date
		if (resetExpirationId != null && resetExpirationId != '') {
			nxLicenseRecord.setFieldValue('custrecordr7nxlicenseexpirationdate', resetExpirationId);
		}
		
		//Submitting license record
		var LicenseRecId = nlapiSubmitRecord(nxLicenseRecord);	
		
		//Reset activation count
		if (resetLicense == 'T') {
			resetActivationCount(nxLicenseRecord);
		}
	}
	return LicenseRecId;
}


//Get results to process
function getRecordsToReset(){

	var arrSearchFilters = new Array();
	arrSearchFilters[0] = new nlobjSearchFilter('custrecordr7nxresetunprocessed', null, 'is', 'T');
	
	var arrSearchColumns = new Array()
	arrSearchColumns[0] = new nlobjSearchColumn('custrecordr7nxresetnewcontact');
	arrSearchColumns[1] = new nlobjSearchColumn('custrecordr7nxresetnewexpirationdate');
	arrSearchColumns[2] = new nlobjSearchColumn('custrecordr7nxresetnexposelicense');
	arrSearchColumns[3] = new nlobjSearchColumn('custrecordr7nxresetresetactivation');
	
	
	var arrSearchResults = nlapiSearchRecord('customrecordr7nexposelicensingreset', null, arrSearchFilters, arrSearchColumns);
	
	var returnResults = {};
	returnResults.searchColumns = arrSearchColumns;
	returnResults.searchResults = arrSearchResults;
	
	return returnResults;
}


function resetActivationCount(nxLicenseRecord){

	var productKey = nxLicenseRecord.getFieldValue('custrecordr7nxproductkey');
	var authURL = 'https://208.118.227.13:9669/uadmin/j_security_check';
	var resetURL = 'https://208.118.227.13:9669/uadmin/command?op=resetActivation&productKey=' + productKey;
	
	var firstResponse = nlapiRequestURL(resetURL, null, null, null);
	
	var postParams = new Array();
	postParams['j_username'] = escape(username);
	postParams['j_password'] = escape(password);
	
	var authHeaders = new Array();
	authHeaders['Cookie'] = firstResponse.getHeader('Set-Cookie');
	
	var authResponse = nlapiRequestURL(authURL, postParams, authHeaders, null);
	
	var resetResponse = nlapiRequestURL(resetURL, null, authHeaders, null);
	var resetBody = resetResponse.getBody();
	
	nlapiLogExecution('DEBUG', 'Product Key/Response on Reset', productKey + ' :: ' + resetBody);
	
	if (resetBody.indexOf("Product key reactivated successfully") == '-1') {
	
		nlapiSendEmail(55011, 55011, 'ERROR: Nexpose License Reset', productKey + ' could not be reset.\n\n' + resetBody);
		
	}
	
}