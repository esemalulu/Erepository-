/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       22 Dec 2012     mburstein
 *
 */

/**
 * @param {nlobjRequest} request Request object
 * @param {nlobjResponse} response Response object
 * @returns {Void} Any output is written via response object
 */
function twilioSmsRequest(request, response){
	
	// Phone # we are texting
	var to = request.getParameter('custparam_to');
	// Body text of the message
	var body = request.getParameter('custparam_body');
	//var sid = request.getParameter('custparam_sid');
	
	// If params are good then send an SMS through Twilio
	if (to != null && to != '' && body != null && body != '') {
	
		try {
			var twilioResponse = initiateTwilioSMS(to, body);
			var twilioResponseBody = twilioResponse.getBody();
			var twilioResponseCode = twilioResponse.getCode();
			nlapiLogExecution('DEBUG', 'smsResponse: ', twilioResponse);
			nlapiLogExecution('DEBUG', 'smsResponseBody: ', twilioResponseBody);
			nlapiLogExecution('DEBUG', 'smsResponseCode: ', twilioResponseCode);
			
			if (twilioResponseCode = '201') { // Check for Success Response Code 201
				//response.verified = true;
				response.setContentType('XMLDOC');
				response.write(twilioResponseBody);
				
				// Can use <Sid> from response as tracker for specific SMS sessions.
			}
			else {
				//response.verified = false;
				response.writeLine('FAIL');
			}
		} 
		catch (e) {
			nlapiLogExecution('ERROR', 'Could not send SMS: ', e);
			response.writePage('Sorry, an error occurred with your request.  Please try again.');
		}
	}
	// If paramaters are empty respond with error message
	else {
		var responseError = '';
		if (to == null || to == '') {
			responseError += 'Please enter a valid phone number.\n';
		}
		if (body == null || body == '') {
			responseError += 'Please enter a valid text message.\n';
		}
		response.writeLine(responseError);
	}
}

/**
 * Send SMS Text Message
 * @param {phone} phone number SMS is sent to
 * @param {body} body text of the SMS message
 * (optional) @param {smsSid} A 34 character unique identifier for the message. May be used to later retrieve this message from the Twilio REST API.
 * @returns {Void} Any output is written via response object
 */
function initiateTwilioSMS(to,body){
	
	//var smsSid = getRandomString(34);
	
	// SID used for Twilio APP - 'Netsuite SMS'
	var smsApplicationID = 'AP937a47c62c1560550b334d20cdd398e3'; // Twilio Application SID for 'Netsuite SMS'
	var from = '18572643507'; // Derek Zanga Twilio Phone Number
	
	var params = new Array();
	params['From'] = encodeURIComponent(from);
	params['To'] = encodeURIComponent(to);
	params['Body'] = body;//encodeURIComponent(body);
	params['ApplicationSid'] = smsApplicationID;
	
	var authHeader = new Array();
	authHeader['Authorization'] = 'Basic QUM4ODA4OWUxMzI2MTIzYmYwYmYxNDliMGI2MTBmMDg2NTo2YzlkNTM2NmQ5YTU5MGM0MGE5ZTk3MWQ2N2UyMjhkNg==';
	
	var accountSID = 'AC88089e1326123bf0bf149b0b610f0865'; // Derek Zanga Twilio Account SID
	
	//var smsTwilioURL = 'https://api.twilio.com/2010-04-01/Accounts/+'+accountSID+'/SMS/Messages.xml';
	var smsTwilioURL = 'https://api.twilio.com/2010-04-01/Accounts/'+accountSID+'/SMS/Messages.xml';
	var response = nlapiRequestURL(smsTwilioURL, params, authHeader);
	
	return response;
}