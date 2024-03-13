/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       11 Sep 2013     mburstein
 *
 *	This suitelet handles public license reset requests from the Rapid7 License Reset hosted Web Application.  A proper license reset request includes the following:
 *		Product Key / Serial #
 *		Email
 *		Mobile Phone Number
 *  
 *  On POST, this suitelet will search to verify the given parameters.
 *  	If deemed valid a License Reset Validation Record will be created.
 *  	Else, an error message will be passed back to the referrer.
 */

/**
 * @param {nlobjRequest} request Request object
 * @param {nlobjResponse} response Response object
 * @returns {Void} Any output is written via response object
 */
function validateResetRequest(request, response){
	this.requestOriginatingFrom = request.getHeader("Referer");
	this.validLicense = false;
	
	// Testing headers - REMOVE WHEN DONE
	/*var headers = request.getAllHeaders();
	 for (header in headers) {
	 nlapiLogExecution('DEBUG', header, headers[header]);
	 }*/
	try {
		if (request.getMethod() == 'POST') {
			// Set response to javascript type for json
			//response.setContentType('JAVASCRIPT')
			var objResponse = {
				text : '',
				success : false		
			};
		
			// If the POST request doesn't come from the Netsuite Hosted App then return error.
			/*if(requestOriginatingFrom != 'https://system.netsuite.com/c.663271/r7LicenseReset%2520Public/r7LicenseReset.html' || requestOriginatingFrom != 'https://system.netsuite.com/c.663271/r7LicenseReset%2520Public/r7LicenseReset.html'){
			 response.write('The originating page is invalid.');
			 return;
			 }*/
			
			// Make sure that license lookup value is only 19 or 40 char
			var submittedLicense = stripChar(request.getParameter('license'));
			if (submittedLicense.length != 40 && submittedLicense.length != 19) {
				objResponse.text = 'The submitted license is in an invalid format.';
				response.write(objResponse);
				return;
			}
			// initialize the code
			this.code = getCode(5);	
			this.publicId = getRandomString(6);
			//this.arrProductTypes = grabAllProductTypes();
			/**
			 * The validationRequest Object holds the request parameters for validation checking
			 * @property validationRequest
			 * @param license The product key or serial number
			 * @param email
			 * @param phone
			 */
			var validationRequest = {
				license: submittedLicense,
				email: request.getParameter('email'),
				phone: request.getParameter('phone'),
			};
			
			for (param in validationRequest) {
				nlapiLogExecution('DEBUG', param, validationRequest[param]);
			}
			nlapiLogExecution('DEBUG', 'referer', requestOriginatingFrom);
			
			var licenseResult = globalSearchLicense(validationRequest.license);
			if (licenseResult.licenseExists) {
				var validEmail = validContactEmailDomain(validationRequest.email, licenseResult.contact);
					nlapiLogExecution('DEBUG', 'validEmail', validEmail);
				if (validEmail){
					validLicense = true;
				}
			}
			
			// If the license is valid then create a validation record
			if (validLicense) {
				if (!licenseResult.expired) {
					var validationRecord = createResetValidationRecord(validationRequest, licenseResult);
					// Send Twilio SMS
					var twilioRequestURL = nlapiResolveURL('SUITELET', 'customscriptr7twiliorequestssuitelet', 'customdeployr7twiliorequestssuitelet', true);
					try {
						var requestURLParams = {
							custparam_type: 'sms',
							custparam_to: stripPhone(validationRequest.phone),
							custparam_body: code,
						};
						var twilioResponse = nlapiRequestURL(twilioRequestURL, requestURLParams);
						objResponse.text = publicId;
						objResponse.success = true;
						response.write(objResponse);
						return;
					} 
					catch (e) {
						nlapiLogExecution('ERROR', 'Could not initiate Twilio SMS', 'To: ' + validationRequest.phone + '\nsmsBody: ' + code + ' Error: ' + e);
					}
				}	
				else{
					objResponse.text = 'The requested license is expired.';
					response.write(objResponse);
					return;
				}		
			}
			else{
				objResponse.text = 'The information you provided does not match our records.  Please try again.';
				response.write(objResponse);
				return;
			}
		}
	} 
	catch (e) {
		nlapiLogExecution('ERROR', 'ERROR', e);
	}
}

// Strip everything but char/digit and dash (-)
function stripChar(string){
	var newString = string.replace(/[^A-Za-z\d-]/g,"");
	return newString;
}
function stripPhone(phone){
	var newPhone = 1;
	newPhone += phone.replace(/[^\d]/g, "");
	return newPhone;
}

// Run a global search for the submitted PK/serial#.  Return recid,
function globalSearchLicense(license){
	var licenseResult = {
		licenseExists : false
	};
	var searchResults = nlapiSearchGlobal(license);
	for (var i = 0; i < searchResults.length && searchResults !=null; i++) {
		var searchResult = searchResults[i];
		var recId = searchResult.getId();
		var recType = searchResult.getRecordType();
		var arrProductTypes = grabAllProductTypes(recType);
		var contactFieldId = arrProductTypes[recType]['contact'];
		
		// Check expiration
		var expirationFieldId = arrProductTypes[recType]['expiration'];
		var dateExpiration = nlapiLookupField(recType, recId, expirationFieldId);
		var today = new Date();
		if (dateExpiration >= today) {
			licenseResult.expired = false;
		}
		else {
			licenseResult.expired = true;
		}
		
		licenseResult.recid = recId;
		licenseResult.rectype = recType;
		licenseResult.name = searchResult.getValue('name');
		licenseResult.contact = nlapiLookupField(recType, recId, contactFieldId);	
		licenseResult.licenseExists = true;		
	}
	for(param in licenseResult){
		nlapiLogExecution('DEBUG', param, licenseResult[param]);
	}
	return licenseResult;
}

// Check if the submitted email domain is the same as the license contact email domain
function validContactEmailDomain(email,contact){
	var domain = email.substr(email.indexOf('@', 0) + 1);
	var contactEmail = nlapiLookupField('contact', contact, 'email');
	var contactEmailDomain = contactEmail.substr(contactEmail.indexOf('@', 0) + 1);
	
	nlapiLogExecution('DEBUG', 'domain', domain);
	nlapiLogExecution('DEBUG', 'contactEmail', contactEmail);
	nlapiLogExecution('DEBUG', 'contactEmailDomain', contactEmailDomain);
	
	if (domain.toLowerCase() == contactEmailDomain.toLowerCase()) {
		return true;
	}
	else {
		return false;
	}
}

function createResetValidationRecord(validationRequest,licenseResult){
		var rec = nlapiCreateRecord('customrecordr7licresetvalidation');
		rec.setFieldValue('custrecordr7licresetvalidationsublic', validationRequest.license);
		rec.setFieldValue('custrecordr7licresetvalidationemail', validationRequest.email);
		rec.setFieldValue('custrecordr7licresetvalidationphone', validationRequest.phone);
		rec.setFieldValue('custrecordr7licresetvalidationlicid', licenseResult.recid);
		rec.setFieldValue('custrecordr7licresetvalidationtypeid', licenseResult.rectype);
		rec.setFieldValue('custrecordr7licresetvalidationcontactid', licenseResult.contact);
		rec.setFieldValue('custrecordr7licresetvalidationcode', code); // Random 5 digits
		rec.setFieldValue('custrecordr7licresetvalidationpubid',publicId);
		return nlapiSubmitRecord(rec);
}

function getCode(string_length){
    var chars = '0123456789';
    var randomstring = '';
    for (var i = 0; i < string_length; i++) {
        var rnum = Math.floor(Math.random() * chars.length);
        randomstring += chars.substring(rnum, rnum + 1);
    }
    return randomstring;
}