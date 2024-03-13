/**
 * 
 * Module Description
 * 
 * Version	1.00
 * Date		17 Mar 2013
 * Author	efagone
 * 
 * This suitelet takes an incomming license registration and creates a License Request Processing (LRP) record.
 * LRP records are placed in a scheduled queue for processing.  Once processed the LRP will create and deliver a Nexpose/Metasploit license for the specific registration.
 * 
 * License Monitoring will throw an error if the most recent LRP has not been processed within 5 minutes.
 * 
 * @record customrecordr7licreqprocessing
 * @script
 * @scriptlink <a href=""></a>      
 * 
 * @module In Product Registration Suitelet
 * @main In Product Registration Suitelet
 * 
 * 
 * MB: 4/24/15 - 363 - Update In Product Registration script to capture address for MS Export compliance 
 * 		Added parameters/logic to store user submitted street, city, zip for non-US/Canada registrations.  This was a requirement for export compliance.
 */

/**
 * Create License Request Processing record for processing license registration 
 * 
 * @class createCustomerContactLicense
 * @module In Product Registration Suitelet
 * @param {nlobjRequest} request Request object
 * @param {nlobjResponse} response Response object
 * @return {Void} Any output is written via response object
 * @appliedtorecord customrecordr7licreqprocessing
 */

function createCustomerContactLicense(request, response){

	//this.response = response2;
	/**
	 * The website the user registration came from.  Useful for sourcing. 
	 * 
	 * @property requestOriginatingFrom
	 * @type String
	 */
	this.requestOriginatingFrom = request.getHeader("Referer");
	
	try {
	
		if (request.getMethod() == 'POST') {
		
//			var url = request.getURL();
			var context = nlapiGetContext();
			
//			var governmentPageCode = context.getSetting('SCRIPT', 'custscriptr7governmentpage');
			var rejectPageCode = context.getSetting('SCRIPT', 'custscriptr7embargopage');
		
			var approveMetasploitProPageCode = context.getSetting('SCRIPT', 'custscriptr7approvepagemetaspl');
			var approveMetasploitComPageCode = context.getSetting('SCRIPT', 'custscriptr7approvepagemetasplcom');
			var reviewMetasploitProPageCode = context.getSetting('SCRIPT', 'custscriptr7reviewpagemspro');
			var reviewMetasploitComPageCode = context.getSetting('SCRIPT', 'custscriptr7reviewpagemscom');

//			nlapiLogExecution('DEBUG', 'governmentPageCode', governmentPageCode); 
			nlapiLogExecution('DEBUG', 'rejectPageCode', rejectPageCode); 
			
			nlapiLogExecution('DEBUG', 'approveMetasploitProPageCode', approveMetasploitProPageCode); 
			nlapiLogExecution('DEBUG', 'approveMetasploitComPageCode', approveMetasploitComPageCode); 
			/**
			 * Holds submitted registration parameters.
			 * An LRP record will be created with the given paramaters and license will be delivered to the registrant after processing.
			 * 
			 * @property parameters
			 * @param firstName {custparamfirstname} Registrant first name
			 * @param lastName {custparamlastname} Registrant last name
			 * @param jobTitle {custparamtitle} Registrant job title
			 * @param companyName {custparamcompanyname} Registrant company name
			 * @param typeOfUse {typeofuse} Type of use for license
			 * @param email {custparamemail} Registrant email address
			 * @param phone {custparamphone} Registrant phone number
			 * @param language {custparamlanguage} Form Language for localization
			 * @param street {custparamstreet} Registrant street address (only required for outside US/Canada)
			 * @param city {custparamcity} Registrant city (only required for outside US/Canada)
			 * @param zipCode {custparamzipcode} Registrant zip code (only required for outside US/Canada)
			 * @param country {custparamcountry} Registrant country
			 * @param stateOrProvince {custparamstate} Registrant state
			 * @param annualRevenue {custparamcustentityr7annualrevenue} Registrant company annual revenue
			 * @param leadSource {custparamleadsource} Lead source passed over from the requesting web form
			 * @param redirectCode {custparamredirectcode} The form to redirect a user after a successful submission
			 * @param accessCode {custparamproductaxscode} The access code is a randomly created code which identifies this specific license request. This value is passed over by the requesting form to identify what license or upgrade the request is for.
			 * @param recapRemoteIP {custparam_remoteip} The IP address of the user who solved the CAPTCHA.
			 * @param recapResponse {custparam_response} The value of "recaptcha_response_field" sent via the form
			 */
			
			this.parameters = request.getAllParameters();
			var headers = request.getAllHeaders();
			
			//Values for headers, parameters
			var logHeaderParams = '\n--------------------\nHEADERS:\n--------------------\n';
			for (head in headers) {
				logHeaderParams += head + ': ' + headers[head] + '\n';
			}
			
			logHeaderParams += '\n--------------------\nPARAMS:\n--------------------\n';
			logHeaderParams += 'FORM: In_Product_Registration_Suitelet.js\n';
			for (param in parameters) {
				logHeaderParams += param + ': ' + parameters[param] + '\n';
			}
			
			var clientIP = headers['NS-Client-IP'];
			var firstName = request.getParameter("custparamfirstname");
			var lastName = request.getParameter("custparamlastname");
			var jobTitle = request.getParameter("custparamtitle");
			var companyName = request.getParameter("custparamcompanyname");
			var typeOfUse = request.getParameter("typeofuse");
			var email = request.getParameter("custparamemail");
			var phone = request.getParameter("custparamphone");
			var language = request.getParameter("custparamlanguage");
			var street = request.getParameter("custparamstreet");
			var city = request.getParameter("custparamcity");
			var zipCode = request.getParameter("custparamzipcode");
			var country = request.getParameter("custparamcountry");
			var stateOrProvince = request.getParameter("custparamstate");
			var annualRevenue = request.getParameter("custparamcustentityr7annualrevenue");
			var leadSource = request.getParameter("custparamleadsource");
			var redirectCode = request.getParameter("custparamredirectcode");
			var accessCode = request.getParameter("custparamproductaxscode");
			var recapRemoteIP = request.getParameter('custparam_remoteip');
			var recapResponse = request.getParameter('custparam_response');
			var lrp_sid = request.getParameter('custparam_lrpsid');
			
			nlapiLogExecution('AUDIT', 'Parameters/Headers - ' + email, logHeaderParams);			
			
			/**
			 * @event Null/Invalid accessCode
			 * @for createCustomerContactLicense
			 * @param {String}formError Your request cannot be processed presently. Please contact Rapid7 Support.
			 */
			if (isEmpty(accessCode)) {
				nlapiLogExecution("ERROR", "Null/Invalid accessCode", accessCode);
				redirectToErrorPage(response, "Your request cannot be processed presently. Please contact Rapid7 Support.");
				return;
			}
			
			var templateId = getTemplateIdForAccessCode(accessCode);
			
			if (isEmpty(templateId)) {
				nlapiLogExecution("ERROR", "Null/Invalid accessCode", accessCode);
				redirectToErrorPage(response, "Your request cannot be processed presently. Please contact Rapid7 Support.");
				return;
			}		
			/**
			 * @event Null/Invalid First Name
			 * @for createCustomerContactLicense
			 * @param {String}formError Please enter a valid first name.
			 */
			//Check firstName
			if (isEmpty(firstName)) {
				nlapiLogExecution("ERROR", "Null/Invalid First Name", firstName);
				redirectToErrorPage(response, "Please enter a valid first name.");
				return;
			}			
			/**
			 * @event Null/Invalid Last Name
			 * @for createCustomerContactLicense
			 * @param {String}formError Please enter a valid last name.
			 */
			//Check lastName
			if (isEmpty(lastName)) {
				nlapiLogExecution("ERROR", "Null/Invalid Last Name", lastName);
				redirectToErrorPage(response, "Please enter a valid last name.");
				return;
			}
			/**
			 * @event Null/Invalid Company Name
			 * @for createCustomerContactLicense
			 * @param {String}formError Please enter a valid company name.
			 */
			//Check CompanyName
			if (isEmpty(companyName)) {
				nlapiLogExecution("ERROR", "Null/Invalid Company Name", companyName);
				redirectToErrorPage(response, "Please enter a valid company name.");
				return;
			}		

			/**
			 * @event Null/Invalid email
			 * @for createCustomerContactLicense
			 * @param {String}formError Please enter a valid work email.
			 */
			//Check email 
			if (email == null || email == '' || email.indexOf('@') == -1) {
				nlapiLogExecution("ERROR", "Null/Invalid email", email);
				redirectToErrorPage(response, "Please enter a valid work email.");
				return;
			}

			if (!validCampaignId(leadSource)) {
				leadSource = '256104';
				nlapiLogExecution('DEBUG', 'CampaignId set for invalid campaign Id', leadSource);
			}
			
			
			if (!validTypeOfUseId(typeOfUse)) {
				typeOfUse = '';
				nlapiLogExecution('DEBUG', 'typeOfUse set for invalid typeOfUse Id', typeOfUse);
			}
			
			//submit request
			var recRequest = nlapiCreateRecord('customrecordr7licreqprocessing');
			recRequest.setFieldValue('custrecordr7_licreqproc_clientipaddress', clientIP);
			recRequest.setFieldValue('custrecordr7licreq_leadsource', leadSource);
			recRequest.setFieldValue('custrecordr7licreq_firstname', firstName);
			recRequest.setFieldValue('custrecordr7licreq_lastname', lastName);
			recRequest.setFieldValue('custrecordr7licreq_jobtitle', jobTitle);
			recRequest.setFieldValue('custrecordr7licreq_email', email);
			recRequest.setFieldValue('custrecordr7licreq_phone', phone);
			recRequest.setFieldValue('custrecordr7licreqproc_language', language);
			recRequest.setFieldValue('custrecordr7licreq_streetaddress', street);
			recRequest.setFieldValue('custrecordr7licreq_city', city);
			recRequest.setFieldValue('custrecordr7licreq_zip', zipCode);			
			recRequest.setFieldValue('custrecordr7licreq_country', country);
			recRequest.setFieldValue('custrecordr7licreq_state', stateOrProvince);
			recRequest.setFieldValue('custrecordr7licreq_companyname', companyName);
			recRequest.setFieldValue('custrecordr7licreq_annualrevenue', annualRevenue);
			recRequest.setFieldValue('custrecord7licreq_typeofuse', typeOfUse);
			recRequest.setFieldValue('custrecordr7licreq_lictempupgraderec', templateId);
			recRequest.setFieldValue('custrecordr7licreq_referer', headers['Referer']);
			recRequest.setFieldValue('custrecordr7licreq_reqlog', logHeaderParams);
			recRequest.setFieldValue('custrecordr7licreq_recaptcha_remoteip', recapRemoteIP);
			recRequest.setFieldValue('custrecordr7licreq_recaptcha_response', recapResponse);
			recRequest.setFieldValue('custrecordr7licreq_lrpsid', lrp_sid);
			
//			var redirectionID;
			try {
				var id = nlapiSubmitRecord(recRequest, false, true);
				var grayListed = nlapiLookupField('customrecordr7licreqprocessing', id, 'custrecordr7_licreqproc_graylisted');
				nlapiLogExecution('DEBUG', 'GrayListed', grayListed);
//				var reason = parseInt(nlapiLookupField('customrecordr7licreqprocessing', id, 'custrecordr7licreq_exportclassification'));
				var reason = nlapiLookupField('customrecordr7licreqprocessing', id, 'custrecordr7licreq_exportclassification');
				if(reason == undefined || reason == null || reason == ''){
					// Empty reason treated as "Request approved"
					reason = REASON_NONE;
				}else{
					reason = parseInt(reason);
				}
				nlapiLogExecution('DEBUG', 'Reason', reason);
			} 
			catch (err) {
			
				if (err.getCode() == 'FWD') {
					nlapiLogExecution('AUDIT', err.getCode(), err.getDetails());
					redirectToErrorPage(response, err.getDetails());
					return;
				}
				else {
					nlapiLogExecution('ERROR', 'Something Went Wrong License Request', 'Email: ' + email + '\nCompany Name: ' + companyName + '\nError: ' + err);
					var adminUser =  nlapiLoadConfiguration('companypreferences').getFieldValue('custscriptr7_system_info_email_sender');
					nlapiSendEmail(adminUser, adminUser, 'Something went wrong license req', 'Email: ' + email + '\nCompany Name: ' + companyName + '\nError: ' + err);
					throw nlapiCreateError('ERROR', err.getDetails(), true);
				}
			}
			
			switch (reason){
				case REASON_EMBARGO:{
					redirectCode = rejectPageCode; 
					break;
					}
				case REASON_NONE:{
					/**
					 * All requests for Metasploit has to be redirected to their respective 
					 * Localized "Thank_you" page based on redirectCode passed to Suitelet's call
					 * 
					 * ...
					 * Right now, all approved Metasploit requests are redirecting to English thank you page. 
					 * Instead, all approved Metasploit requests should be redirected to their respective language 
					 * Metasploit thankyou pages.  
					 * Redirected code for these pages are sent in the request. 
					 * We use similar logic for all other product pages. 
					 * ...
					 */
					redirectCode = isMetasploit(accessCode)?(
										// In case if redirectCode was empty in the Request
										isEmpty(redirectCode)
										?
										(
											// Use accessCode to find the redirectCode
											isMetasploitPro(accessCode)
											?
											approveMetasploitProPageCode
											:
											approveMetasploitComPageCode
										)
										:
										redirectCode
									)
									:
									redirectCode;
					break;
				}
				case REASON_GOVERNMENT:{
					redirectCode = isMetasploitPro(accessCode) ? reviewMetasploitProPageCode : reviewMetasploitComPageCode;
					break;
				}
				case REASON_IP_COUNTRY_MISSING:{
					redirectCode = rejectPageCode;
					break;
				}
				default:{
					/**
					 * All requests for Metasploit has to be redirected to their respective 
					 * Localized "Thank_you" page based on redirectCode passed to Suitelet's call
					 * 
					 * ...
					 * Right now, all approved Metasploit requests are redirecting to English thank you page. 
					 * Instead, all approved Metasploit requests should be redirected to their respective language 
					 * Metasploit thankyou pages.  
					 * Redirected code for these pages are sent in the request. 
					 * We use similar logic for all other product pages. 
					 * ...
					 */
					redirectCode = isMetasploit(accessCode)?(
										// In case if redirectCode was empty in the Request
										isEmpty(redirectCode)
										?
										(
											// Use accessCode to find the redirectCode
											isMetasploitPro(accessCode)
											?
											approveMetasploitProPageCode
											:
											approveMetasploitComPageCode
										)
										:
										redirectCode
									)
									:
									redirectCode;
					break;
				}
			}
			nlapiLogExecution('DEBUG', 'redirectionCode after switch', redirectCode);

			// Check if it is monitoring
			if (jobTitle=='monitor' && companyName.substring(0,10)=='r7formtest' && leadSource=='266530') {
				nlapiLogExecution('DEBUG', 'Check if Monitoring', jobTitle + ' - ' + companyName + ' - ' + leadSource);
				nlapiLogExecution('AUDIT', 'Monitoring request', 'It was monitoring request. Returning code 200.');
				response.write('<html><body>Done</body></html>');
				return;
			} 
			
			/**
			 * The website to return the registrant to after successful registration.  
			 * It will be one of the following 3 scenarios:
			 * 	
			 * 	returnPath = redirectURL if a valid redirectCode is provided	
			 * 	returnPath = The Default Redirect URL (custrecordr7lictemp_redirecturl) from the license template if redirectCode is not valid
			 * 	returnPath = http://www.rapid7.com if no default is specified for the template license
			 * 
			 * @property returnPath
			 * @type String
			 */

			nlapiLogExecution('DEBUG', 'templateId', templateId);
			
			var returnPath = nlapiLookupField('customrecordr7lictemplatesupgrades', templateId, 'custrecordr7lictemp_redirecturl');
			if (redirectCode != null && redirectCode != '') {
			    var redirectURL = grabRedirectURL(redirectCode);
			    
			    if (redirectURL != null && redirectURL != '') {
			     returnPath = redirectURL;
			    }
			}
			nlapiLogExecution("DEBUG", "Return Path is:", returnPath);
			
			if (returnPath == null || returnPath == '') {
				returnPath = 'https://www.rapid7.com';
				nlapiLogExecution("ERROR", "Return Path not specified.", returnPath);
				var adminUser =  nlapiLoadConfiguration('companypreferences').getFieldValue('custscriptr7_system_info_email_sender');
				nlapiSendEmail(adminUser, adminUser, 'Template Missing Default URL', 'TemplateId: ' + templateId);
			}
			nlapiLogExecution('DEBUG', 'returnPath', returnPath);
				response.sendRedirect('EXTERNAL', returnPath);
			
		}
	}
	catch (err) {
		nlapiLogExecution('ERROR', " Details: " + err);
		redirectToErrorPage(response, "Your request cannot be processed presently. Please contact Rapid7 Support.");
	}
}

/**
 * Lookup the appropriate URL for the given redirectCode from the customrecordr7marketingurlredirect record.
 * 
 * @method grabRedirectURL
 * @param {String} redirectCode
 * @return URL if a valid code is used
 */

function grabRedirectURL(redirectCode){
	
	var arrSearchFilters = new Array();
	arrSearchFilters[arrSearchFilters.length] = new nlobjSearchFilter('custrecordr7marketingurlcode', null, 'is', redirectCode);
	
	var arrSearchColumns = new Array();
	arrSearchColumns[0] = new nlobjSearchColumn('custrecordr7marketingurlendpoint');
	
	var arrSearchResults = nlapiSearchRecord('customrecordr7marketingurlredirect', null, arrSearchFilters, arrSearchColumns);
	
	if (arrSearchResults != null) {
		return arrSearchResults[0].getValue(arrSearchColumns[0]);
	}
	
	return null;
}

/**
 * Search Netsuite for the given campaignId to determine validity.  
 * If this returns false, the script will default to 256104 for invalid campaign.
 * 
 * @method validCampaignId
 * @param {Object} campaignId The leadSource paramater
 * @return {Boolean} true if the campaignId is valid
 */
function validCampaignId(campaignId){
    nlapiLogExecution('DEBUG', "CampaignId to test", campaignId);
    if (campaignId == null || campaignId == '') 
        return false;
    var results = nlapiSearchRecord('campaign', null, new nlobjSearchFilter('internalid', null, 'is', campaignId));
    if (results != null && results.length >= 1) {
        return true;
        nlapiLogExecution('DEBUG', "CampaignId: " + campaignId, "is valid");
    }
    nlapiLogExecution('DEBUG', "CampaignId: " + campaignId, "is not valid");
    return false;
}

/**
 * Search Netsuite for the given typeOfUse to determine validity.  
 * If this returns false, the script will default to null for invalid typeOfUse.
 * 
 * @method validTypeOfUseId
 * @param {Object} typeOfUse The typeOfUse paramater
 * @return {Boolean} true if the typeOfUse is valid
 */
function validTypeOfUseId(typeOfUse){

	try {
		if (typeOfUse == null || typeOfUse == '') {
			return false;
		}
		
		var arrResults = nlapiSearchRecord('customlistr7licreq_typeofuse', null, new nlobjSearchFilter('isinactive', null, 'is', 'F'));
		
		for (var i = 0; arrResults != null && i < arrResults.length; i++) {
			if (typeOfUse.toString() == arrResults[i].getId().toString()) {
				return true;
			}
		}
	} 
	catch (e) {
		nlapiLogExecution('ERROR', 'ERROR on validTypeOfUseId', typeOfUse);
	}
	
	return false;
}


/**
 * Redirect to the originating form with previously submitted parameters and the error message
 * 
 * @method redirectToErrorPage
 * @for createCustomerContactLicense
 * @param {Object} response response object from the suitelet
 * @param {String} msg Error message
 * @param {String} requestOriginatingFrom The originating form address from 'this'
 * @return {Void} 
 */
function redirectToErrorPage(response, msg){
	/**
	 * If there is an error it's returned in the Response paramter errormsg
	 * @property errormsg
	 * @type String
	 */
	parameters['errormsg'] = msg;
	parameters['h'] = null;
	parameters['deploy'] = null;
	parameters['compid'] = null;
	parameters['script'] = null;
	
	nlapiLogExecution('ERROR', 'Details:', 'requestOriginatingFrom: ' + requestOriginatingFrom + '\nmsg: ' + msg);
	
	if (requestOriginatingFrom == null || requestOriginatingFrom == ''){
		requestOriginatingFrom = 'https://www.rapid7.com';
	}
	response.sendRedirect('EXTERNAL', requestOriginatingFrom, null, null, parameters);
}
/**
 * Check if the given string is empty.
 * @method isEmpty
 * @for createCustomerContactLicense
 * @param {String} str response object from the suitelet
 * @return {Boolean} true if empty
 */
function isEmpty(str){

	if (str != null && str != '') {
		str = str.replace(/\s/g, '');
	}
	
	if (str == null || str == '' || str.length < 1){
		return true;
	}
	
	return false;
}

/**
 * Lookup the template license associated with the given access code
 * @method getTemplateIdForAccessCode
 * @param {String} accessCode
 * @return {Integer} templateId
 */
function getTemplateIdForAccessCode(accessCode){

	var arrSearchFilters = new Array();
	arrSearchFilters[arrSearchFilters.length] = new nlobjSearchFilter('custrecordr7lictemp_accesscode', null, 'is', accessCode);
	
	var arrSearchResults = nlapiSearchRecord('customrecordr7lictemplatesupgrades', null, arrSearchFilters);
	
	if (arrSearchResults != null) {
		return arrSearchResults[0].getId();
	}
	
	return null;
}