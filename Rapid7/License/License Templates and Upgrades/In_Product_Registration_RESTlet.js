/**
 * @NApiVersion 2.x
 * @NScriptType Restlet
 * @NModuleScope SameAccount
 */
/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 *   1.0    12.08.2016      i.grinenko
 *
 *	This RESTlet receives license requests and creates LRP-records.
 *	Requests should have the following format (with some examples):
 *	{
 *  	"lrp": {
 *	        "ip": "8.8.8.8",
 *	        "firstName": "John",
 *	        "lastName": "Smith",
 *	        "countryCode": "US",
 *	        "stateOrProvince": "",
 *	        "jobTitle": "tester",
 *	        "typeOfUse": "4",
 *	        "email": "john@smith.com",
 *	        "phone": "+12345678989",
 *	        "companyName": "John&Co",
 *	        "language": "",
 *	        "accessCode": "xUvhzF31Ah",
 *	        "redirectCode": ""
 *          "leadSource": "",
 *          "recapRemoteIP": "",
 *          "recapResponse": "",
 *          "lrpsid": ""
 *	    }
 *	}
 *
 *	RESTlet will answer in following format:
 *	{
 *      "redirectionUrl": ""
 *  }
 *  
 *  In case of errors response will have the following format:
 *  {
 *      "error": {
 *          "code": "",
 *          "message": ""
 *      }
 *  }
 */

define(['/SuiteScripts/License Registration RESTlet/Library/LRP_Validation_Library_v2.js',
        'N/error', 'N/record', 'N/runtime'],
function(validationLibrary, error, record, runtime) {

	var REASON_NONE            = 1;
	var REASON_EMBARGO         = 2;
	var REASON_GOVERNMENT      = 3;
	var REASON_IP_COUNTRY_MISSING = 4;
	var REASON_RESTRICTED_PARTY = 8;
	var EXCEPTIONS_LIST = [
	                       'INVALID_REQUEST',
	                       'INVALID_ACCESS_CODE',
	                       'INVALID_TEMPLATE_ID',
	                       'INVALID_FIRST_NAME',
	                       'INVALID_LAST_NAME',
	                       'INVALID_COMPANY_NAME',
	                       'INVALID_EMAIL_FORMAT',
	                       'PREVIOUS_REQUEST_IS_NOT_PROCESSED',
	                       'INVALID_EMAIL_ADDRESS',
	                       'FREEMIUM_EMAIL',
	                       'LICENSE_IS_ALREADY_ISSUED',
	                       'UNEXPECTED_ERROR'
	                       ];

    /**
     * Function called upon sending a GET request to the RESTlet.
     *
     * @param {Object} requestParams - Parameters from HTTP request URL; parameters will be passed into function as an Object (for all supported content types)
     * @returns {string | Object} HTTP response body; return string when request Content-Type is 'text/plain'; return Object when request Content-Type is 'application/json'
     * @since 2015.1
     */
    function doGet(requestParams) {

    }

    /**
     * Function called upon sending a PUT request to the RESTlet.
     *
     * @param {string | Object} requestBody - The HTTP request body; request body will be passed into function as a string when request Content-Type is 'text/plain'
     * or parsed into an Object when request Content-Type is 'application/json' (in which case the body must be a valid JSON)
     * @returns {string | Object} HTTP response body; return string when request Content-Type is 'text/plain'; return Object when request Content-Type is 'application/json'
     * @since 2015.2
     */
    function doPut(requestBody) {

    }


    /**
     * Function called upon sending a POST request to the RESTlet.
     *
     * @param {string | Object} requestBody - The HTTP request body; request body will be passed into function as a string when request Content-Type is 'text/plain'
     * or parsed into an Object when request Content-Type is 'application/json' (in which case the body must be a valid JSON)
     * @returns {string | Object} HTTP response body; return string when request Content-Type is 'text/plain'; return Object when request Content-Type is 'application/json'
     * @since 2015.2
     */
    function doPost(requestBody) {
    	var answer;
    	try {
	    	var request = readRequestBody(requestBody);
          log.audit({
    			title: 'RequestBody',
    			details: JSON.stringify(request)
    		});
	    	request = prevalidations(request);
	    	var lrp = createLrp(request);
	    	lrp = submitLrp(lrp);
	    	answer = buildAnswer(request, lrp);
    	} catch (err) {
    		log.error({
    			title: 'doPost',
    			details: err
    		});
    		if (EXCEPTIONS_LIST.indexOf(err.name) < 0) {
    			throw err;
    		}
    		answer = new Object();
    		answer.error = new Object();
    		answer.error.code = err.name;
    		answer.error.message = err.message;
    	}
      log.audit({
			title: 'response',
			details: JSON.stringify(answer)
		});
    	return answer;
    }

    /**
     * Function called upon sending a DELETE request to the RESTlet.
     *
     * @param {Object} requestParams - Parameters from HTTP request URL; parameters will be passed into function as an Object (for all supported content types)
     * @returns {string | Object} HTTP response body; return string when request Content-Type is 'text/plain'; return Object when request Content-Type is 'application/json'
     * @since 2015.2
     */
    function doDelete(requestParams) {

    }

    /**
     * Parses the request's body.
     * @param requestBody
     * @returns parsed request
     * @throws INVALID_REQUEST Request is not formatted properly
     */
    function readRequestBody(requestBody) {
    	var ret = new Object();
    	
    	if (requestBody == null) {
    		log.error({
    			title: 'readRequestBody',
    			details: 'No request body found.'
    		});
    		throw error.create({
    			name: 'INVALID_REQUEST',
    			message: 'There was an error with your request. <a href="https://www.rapid7.com/contact/">Please contact us</a>.'
    		});
    	}
    	if (requestBody.lrp == null) {
    		log.error({
    			title: 'readRequestBody',
    			details: 'No LRP info found.'
    		});
    		throw error.create({
    			name: 'INVALID_REQUEST',
    			message: 'There was an error with your request. <a href="https://www.rapid7.com/contact/">Please contact us</a>.'
    		});
    	}
    	
    	// Collect raw data
    	ret.ip = requestBody.lrp.ip;
    	ret.firstName = requestBody.lrp.firstName;
    	ret.lastName = requestBody.lrp.lastName;
    	ret.countryCode = requestBody.lrp.countryCode;
    	ret.stateOrProvince = requestBody.lrp.stateOrProvince;
    	ret.jobTitle = requestBody.lrp.jobTitle;
    	ret.typeOfUse = requestBody.lrp.typeOfUse;
    	ret.email = requestBody.lrp.email;
    	ret.phone = requestBody.lrp.phone;
    	ret.companyName = requestBody.lrp.companyName;
    	ret.language = requestBody.lrp.language;
    	ret.accessCode = requestBody.lrp.accessCode;
    	ret.redirectCode = requestBody.lrp.redirectCode;
    	ret.leadSource = requestBody.lrp.leadSource;
    	ret.recapRemoteIP = requestBody.lrp.recapRemoteIP;
    	ret.recapResponse = requestBody.lrp.recapResponse;
    	ret.lrpsid = requestBody.lrp.lrpsid;
    	ret.referer = requestBody.lrp.referer;
    	ret.httpHeader = requestBody.lrp.httpHeader;
    	
    	// Collect linked data
    	ret.templateId = validationLibrary.getTemplateIdForAccessCode(ret.accessCode);
    	
    	return ret;
    }

    /**
     * Does simple pre-validations and throws exceptions if any validation fails.
     * @param request
     * @returns Validated request
     * @throws INVALID_ACCESS_CODE Access Code can not be empty
     * @throws INVALID_TEMPLATE_ID The product with the received Access Code is not found
     * @throws INVALID_FIRST_NAME First name can not be empty
     * @throws INVALID_LAST_NAME Last name can not be empty
     * @throws INVALID_COMPANY_NAME Company name can not be empty
     * @throws INVALID_EMAIL_FORMAT Email Address must include "@"-character
     */
    function prevalidations(request) {
    	if (validationLibrary.isEmpty(request.accessCode)) {
    		log.debug({
    			title: 'prevalidations (' + request.email + ')',
    			details: 'INVALID_ACCESS_CODE: ' + request.accessCode
    		});
    		throw error.create({
    			name: 'INVALID_ACCESS_CODE',
    			message: 'There was an error with your request. <a href="https://www.rapid7.com/contact/">Please contact us</a>.'
    		});
    	}
    	if (validationLibrary.isEmpty(request.templateId)) {
    		log.debug({
    			title: 'prevalidations (' + request.email + ')',
    			details: 'INVALID_TEMPLATE_ID: Template ID = ' + request.templateId + ' for Access Code = ' + request.accessCode + ' IS INVALID'
    		});
    		throw error.create({
    			name: 'INVALID_TEMPLATE_ID',
    			message: 'There was an error with your request. <a href="https://www.rapid7.com/contact/">Please contact us</a>.'
    		});
    	}
    	if (validationLibrary.isEmpty(request.firstName)) {
    		log.debug({
    			title: 'prevalidations (' + request.email + ')',
    			details: 'INVALID_FIRST_NAME: ' + request.firstName
    		});
    		throw error.create({
    			name: 'INVALID_FIRST_NAME',
    			message: 'First name is required'
    		});
    	}
    	if (validationLibrary.isEmpty(request.lastName)) {
    		log.debug({
    			title: 'prevalidations (' + request.email + ')',
    			details: 'INVALID_LAST_NAME: ' + request.lastName
    		});
    		throw error.create({
    			name: 'INVALID_LAST_NAME',
    			message: 'Last name is required'
    		});
    	}
    	if (validationLibrary.isEmpty(request.companyName)) {
    		log.debug({
    			title: 'prevalidations (' + request.email + ')',
    			details: 'INVALID_COMPANY_NAME: ' + request.companyName
    		});
    		throw error.create({
    			name: 'INVALID_COMPANY_NAME',
    			message: 'Company name is required'
    		});
    	}
    	if (validationLibrary.isEmpty(request.email) || request.email.indexOf('@') == -1) {
    		log.debug({
    			title: 'prevalidations (' + request.email + ')',
    			details: 'INVALID_EMAIL_FORMAT: ' + request.email
    		});
    		throw error.create({
    			name: 'INVALID_EMAIL_FORMAT',
    			message: 'Email Address must include "@" character'
    		});
    	}
    	if (!validationLibrary.isValidCampaignId(request.leadSource)) {
    		log.debug({
    			title: 'prevalidations (' + request.email + ')',
    			details: 'Lead source id (' + request.leadSource + ') is not valid'
    		});
    		request.leadSource = 256104;
    	}
    	if (!validationLibrary.isValidTypeOfUseId(request.typeOfUse) && validationLibrary.isMetasploit(request.accessCode))
        {
    		log.debug({
    			title: 'prevalidations (' + request.email + ')',
    			details: 'typeOfUse id (' + request.typeOfUse + ') is not valid. AccessCode = ' + request.accessCode
    		});
    		request.typeOfUse = null;
    	}
    	
    	return request;
    }

    /**
     * Parses request-object and builds an object ready to be submitted.
     * @param request
     * @returns object ready to be submitted
     */
    function createLrp(request) {
    	var ret = record.create({
    		type: 'customrecordr7licreqprocessing'
    	});
    	
		ret.setValue({fieldId:'custrecordr7_licreqproc_clientipaddress',value:request.ip});
		ret.setValue({fieldId:'custrecordr7licreq_leadsource',value:request.leadSource});
		ret.setValue({fieldId:'custrecordr7licreq_firstname',value:request.firstName});
		ret.setValue({fieldId:'custrecordr7licreq_lastname',value:request.lastName});
		ret.setValue({fieldId:'custrecordr7licreq_jobtitle',value:request.jobTitle});
		ret.setValue({fieldId:'custrecordr7licreq_email',value:request.email});
		ret.setValue({fieldId:'custrecordr7licreq_phone',value:request.phone});
		ret.setValue({fieldId:'custrecordr7licreqproc_language',value:request.language});
		ret.setValue({fieldId:'custrecordr7licreq_country',value:request.countryCode});
		ret.setValue({fieldId:'custrecordr7licreq_state',value:request.stateOrProvince});
		ret.setValue({fieldId:'custrecordr7licreq_companyname',value:request.companyName});
		ret.setValue({fieldId:'custrecord7licreq_typeofuse',value:request.typeOfUse});
		ret.setValue({fieldId:'custrecordr7licreq_lictempupgraderec',value:request.templateId});
		ret.setValue({fieldId:'custrecordr7licreq_recaptcha_remoteip',value:request.recapRemoteIP});
		ret.setValue({fieldId:'custrecordr7licreq_recaptcha_response',value:request.recapResponse});
		ret.setValue({fieldId:'custrecordr7licreq_lrpsid',value:request.lrpsid});
		ret.setValue({fieldId:'custrecordr7licreq_referer',value:request.referer});
		ret.setValue({fieldId:'custrecordr7licreq_reqlog',value:request.httpHeader});
		
    	return ret;
    }

    /**
     * Submits LRP to NS.
     * @param lrp
     * @throws PREVIOUS_REQUEST_IS_NOT_PROCESSED A request with the same data was sent before and was not processed yet
     * @throws INVALID_EMAIL_ADDRESS Email domain does not exist
     * @throws FREEMIUM_EMAIL Email is freemium
     * @throws LICENSE_IS_ALREADY_ISSUED License with the same parameters has been already issued
     * @returns resulting object
     */
    function submitLrp(lrp) {
    	var id = lrp.save();
    	log.debug({
    		title: 'submitLrp (' + lrp.getValue({fieldId:'custrecordr7licreq_email'}) + ')',
    		details: 'ID: ' + id
    	});
    	lrp = record.load({
    		type: 'customrecordr7licreqprocessing',
    		id: id
    	});
    	return lrp;
    }

    /**
     * Builds an answer according to passed LRP.
     * @param lrp
     * @returns answer ready to be returned by the RESTlet
     */
    function buildAnswer(request, lrp) {
        var ret = new Object();
        ret.redirectUrl = getRedirectUrl(request, lrp);
        log.debug({
            title: 'buildAnswer (' + lrp.getValue({fieldId:'custrecordr7licreq_email'}) + ')',
            details: 'redirectUrl: ' + ret.redirectUrl
        });
        return ret;
    }
    
    /**
     * Builds a redirect URL according to passed LRP.
     * @param request
     * @param lrp
     * @returns Redirect URL
     */
    function getRedirectUrl(request, lrp) {
		var rejectPageCode = runtime.getCurrentScript().getParameter({name:'custscriptr7iprembargopage'});
		var reviewMetasploitProPageCode = runtime.getCurrentScript().getParameter({name:'custscriptr7iprreviewpagemspro'});
		var reviewMetasploitComPageCode = runtime.getCurrentScript().getParameter({name:'custscriptr7iprreviewpagemscom'});

		var reason = lrp.getValue({fieldId: 'custrecordr7licreq_exportclassification'});
    	var accessCode = request.accessCode;
    	var redirectCode = request.redirectCode;
    	
		if(reason == undefined || reason == null || reason == ''){
			// Empty reason treated as "Request approved"
			reason = REASON_NONE;
		}else{
			reason = parseInt(reason);
		}
    	log.debug({
    		title: 'getRedirectUrl (' + lrp.getValue({fieldId:'custrecordr7licreq_email'}) + ')',
    		details: 'reason: ' + reason
    	});
		
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
			redirectCode = substituteForMetasploit(redirectCode, accessCode);
			break;
		}
		case REASON_GOVERNMENT:{
			redirectCode = validationLibrary.isMetasploitPro(accessCode) ? reviewMetasploitProPageCode : reviewMetasploitComPageCode;
			break;
		}
		case REASON_IP_COUNTRY_MISSING:{
			redirectCode = rejectPageCode;
			break;
		}
		case REASON_RESTRICTED_PARTY:{
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
			redirectCode = substituteForMetasploit(redirectCode, accessCode);
			break;
			}
		}
    	log.debug({
    		title: 'getRedirectUrl (' + lrp.getValue({fieldId:'custrecordr7licreq_email'}) + ')',
    		details: 'redirectCode: ' + redirectCode
    	});
		
		var returnPath = validationLibrary.getDefaultRedirectUrl(request.templateId);
		if (redirectCode != null && redirectCode != '') {
		    var redirectURL = validationLibrary.grabRedirectUrl(redirectCode);
		    
		    if (redirectURL != null && redirectURL != '') {
		     returnPath = redirectURL;
		    }
		}
    	log.debug({
    		title: 'getRedirectUrl (' + lrp.getValue({fieldId:'custrecordr7licreq_email'}) + ')',
    		details: 'returnPath: ' + returnPath
    	});
		
		if (returnPath == null || returnPath == '') {
			returnPath = 'https://www.rapid7.com';
	    	log.error({
	    		title: 'getRedirectUrl',
	    		details: 'The redirect URL for AccessCode = ' + request.accessCode + ' and RedirectCode = ' + request.redirectCode +' is empty'
	    	});
		}
		
		return returnPath;
    }
    
    /**
     * Substitutes current redirectCode with one for metasploit if needed.
     * @param redirectCode
     * @returns Redirect code
     */
    function substituteForMetasploit(redirectCode, accessCode) {
		var approveMetasploitProPageCode = runtime.getCurrentScript().getParameter({name:'custscriptr7iprapprovepagemetaspl'});
		var approveMetasploitComPageCode = runtime.getCurrentScript().getParameter({name:'custscriptr7iprapprovepagemetasplcom'});
		
    	return validationLibrary.isMetasploit(accessCode)?(
				// In case if redirectCode was empty in the Request
    			validationLibrary.isEmpty(redirectCode)
				?
				(
					// Use accessCode to find the redirectCode
						validationLibrary.isMetasploitPro(accessCode)
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
	}
    
    return {
        'get': doGet,
        put: doPut,
        post: doPost,
        'delete': doDelete
    };
    
});