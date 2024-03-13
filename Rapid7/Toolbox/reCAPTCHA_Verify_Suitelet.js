/*
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       13 Mar 2013     efagone
 *
 */

/*
 * @param {nlobjRequest} request Request object
 * @param {nlobjResponse} response Response object
 * @returns {Void} Any output is written via response object
 */
function reCAPTCHA_suitelet(request, response){

	/*
	 * POST to:
	 *  https://www.google.com/recaptcha/api/siteverify
	 *
	 * Required params:
	 * 	secret (required)	Your secret key
	 *	remoteip (optional)		The IP address of the user who solved the CAPTCHA.
	 *	response (required)		The value of "recaptcha_response_field" sent via the form
	 */
	var context = nlapiGetContext();
	
	if (request.getParameter('custparam_auth') != context.getSetting('SCRIPT', 'custscriptr7recaptcha_authcode')) {
		response.setContentType('JSON');
		return;
	}
	
	var verifyURL = 'https://www.google.com/recaptcha/api/siteverify';
	verifyURL += '?secret=' + context.getSetting('SCRIPT', 'custscriptr7recaptchaverify_secret');
	verifyURL += '&response=' + request.getParameter('custparam_response');
	verifyURL += '&remoteip=' + request.getParameter('custparam_remoteip');
	
	var verifyResponse = nlapiRequestURL(verifyURL);
	var verifyBody = verifyResponse.getBody();
	
	nlapiLogExecution('DEBUG', 'verifyBody', verifyBody);
	
	response.setContentType('JSON');
	response.write(verifyBody);
	return;
}
