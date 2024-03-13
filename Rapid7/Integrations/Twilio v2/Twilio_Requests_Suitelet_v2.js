/**
 * 
 * Module Description
 * 
 * Author	mburstein
 * Version	2.00
 * Date		12 Aug 2013
 * 
 * @record
 * @script
 * @scriptlink <a href=""></a>      
 *
 * @module Twilio Requests Suitelet
 * @main Twilio Requests Suitelet
 */

/**
 * Send SMS message or initiate voice call through Twilio
 * 
 * @class twilio_request
 * @module Twilio Requests Suitelet
 * @param {nlobjRequest} request Request object
 * @param {nlobjResponse} response Response object
 * @return {Void} Any output is written via response object
 */
function twilio_request(request, response){
	/**
	 * What type of Twilio request.  Param: custparam_type.  Can be: sms, voice
	 * @property type
	 */ 
	this.type = request.getParameter('custparam_type');	
	/**
	 * @event Null Twilio Type
	 * @for twilio_request
	 * @param {String}errorText Twilio Request Type is required.
	 */
	if (!paramExists(type)) {
		response.write('Twilio Request Type is required.');
		return;
	}
	/**
	 * Holds Param objects.  Each Param has the following properties:
	 * 	value = The Param value sent in the request
	 * 	reqSMS = Is the Param required for SMS
	 * 	reqVoice = Is the Param required for Voice
	 * 	exists = Is the Param empty/null
	 * 
	 * @property Params
	 * @param to {custparam_to} The phone number Twilio message is delivered to
	 * @param body {custparam_body} The sms message.  For voice calls, the body is used to create a conversation record, which is retrieved via the url param and used to construct the TwiML response XML
	 * @param url {custparamcompanyname}An external suitelet used to retrieve the TwiML response XML.  The custparam_sid param must be passed to retrieve the message body from the associated conversation database record.
	 * @param code {custparam_code} Optional digits to be used for number entry on voice call
	 */
	var Params = {
		to : new Param('custparam_to',true,true),
		body : new Param('custparam_body',true,false),
		url : new Param('custparam_url',false,true),
		code : new Param('custparam_code',false,false)
	};
	/**
	 * @event Missing Required Parameters
	 * @for twilio_request
	 * @param {String}errorText Insufficient required param: {paramName}
	 */
	var errorText = checkParams(Params);
	if (errorText.error) {
		response.write(errorText.msg);
		return;
	}
	
	nlapiLogExecution('DEBUG', 'TO', Params.to.value);
	nlapiLogExecution('DEBUG', 'BODY', Params.body.value);
	/**
 * The response from the twilio API when initiating an sms/voice message
 * @property twilioResponse
 */
	switch (type) {
		case 'sms':
			// If the body of the text is greater than 160 then split into multiple texts
			var bodyParts = splitSMSBody(Params.body.value);
			for (bodyPart in bodyParts) {
				var twilioResponse = initiateTwilioSMS(Params.to.value, bodyParts[bodyPart]);
			}
			break;
		case 'voice':
			var twilioResponse = initiateTwilioCall(Params.to.value, Params.url.value, Params.code.value);
			break;
	}
	response.setContentType('XMLDOC');
	response.write(twilioResponse.getBody());
	return twilioResponse;
}
/**
 * Create a Param class object
 * @method Param
 * @param {Object} param The parameter name
 * @param {Object} reqSms Is the parameter required for SMS
 * @param {Object} reqVoice Is the parameter required for Voice
 */
function Param(param,reqSms,reqVoice){
	var value = request.getParameter(param);
	this.value = value;
	this.reqSms = reqSms;
	this.reqVoice = reqVoice;
	this.errorText = 'Insufficient required param: '+param+'<br />';
	this.exists = paramExists(value);
}
/**
 * Check if required params exist, if not then return an error
 * @method checkParams
 * @param {Object} params
 * @return {Object} errorText An object containing bool value for if there is an error and a string value for the error msg
 */
function checkParams(params){
	var errorText = {
		error : false,
		msg : ''
	};
	for (param in params){
		var objParam = params[param];
		// If type is sms and the param is required but does not exist append errorText
		if (type == 'sms' && objParam.reqSms && !objParam.exists) {
			errorText.error = true;
			errorText.msg += objParam.errorText;
		}
		// If type is voice and the param is required but does not exist append errorText
		if (type == 'voice' && objParam.reqVoice && !objParam.exists) {
			errorText.error = true;
			errorText.msg += objParam.errorText;
		}
	}
	return errorText;
}

/**
 * If the body of the text is greater than 160 then split into multiple texts
 * @param {Object} body
 * @return {Array} bodyParts array of body messages
 */
function splitSMSBody(body){
	var bodyParts = splitInto(body, 160);
	return bodyParts;
}

/**
 * Split a string into an array every len char
 * @param {String} str A string
 * @param {Number} len Length of pieces
 */
function splitInto(string, len) {
    var regex = new RegExp('.{' + len + '}|.{1,' + Number(len-1) + '}', 'g');
    return string.match(regex);
}

function initiateTwilioCall(to, url, code){
	/**
	 * The originating Twilio number for voice calls
	 * @property voiceFrom
	 */ 
	var voiceFrom = '16172471717'; // Twilio number
	
	var params = new Array();
	params['From'] = encodeURIComponent(voiceFrom);
	params['To'] = encodeURIComponent(to);
	params['Url'] = url;
	params['Method'] = 'GET';
	//params['ApplicationSid'] = 'AP972c701919add54b37a91267b4012fe4';
	
	var authHeader = new Array();
	authHeader['Authorization'] = 'Basic QUM4ODA4OWUxMzI2MTIzYmYwYmYxNDliMGI2MTBmMDg2NTo2YzlkNTM2NmQ5YTU5MGM0MGE5ZTk3MWQ2N2UyMjhkNg==';
	
	var makeCallURL = 'https://api.twilio.com/2010-04-01/Accounts/AC88089e1326123bf0bf149b0b610f0865/Calls.xml';
	
	var response = nlapiRequestURL(makeCallURL, params, authHeader);
	
	return response;
}
/**
 * Send SMS Text Message
 * @param {phone} phone number SMS is sent to
 * @param {body} body text of the SMS message
 * (optional) @param {smsSid} A 34 character unique identifier for the message. May be used to later retrieve this message from the Twilio REST API.
 * @returns {Void} Any output is written via response object
 */
function initiateTwilioSMS(to,body){
	/**
	 * The originating Twilio number for SMS messages 
	 * @property smsFrom
	 */ 
	var smsFrom = '18572643507'; // Derek Zanga Twilio Phone Number
	//var smsSid = getRandomString(34);
	
	// SID used for Twilio APP - 'Netsuite SMS'
	var smsApplicationID = 'AP937a47c62c1560550b334d20cdd398e3'; // Twilio Application SID for 'Netsuite SMS'
	
	var params = new Array();
	params['From'] = encodeURIComponent(smsFrom);
	params['To'] = encodeURIComponent(to);
	params['Body'] = body;//encodeURIComponent(body);
	params['ApplicationSid'] = smsApplicationID;
	
	var authHeader = new Array();
	authHeader['Authorization'] = 'Basic QUM4ODA4OWUxMzI2MTIzYmYwYmYxNDliMGI2MTBmMDg2NTo2YzlkNTM2NmQ5YTU5MGM0MGE5ZTk3MWQ2N2UyMjhkNg==';
	
	var accountSID = 'AC88089e1326123bf0bf149b0b610f0865'; // Derek Zanga Twilio Account SID
	
	var smsTwilioURL = 'https://api.twilio.com/2010-04-01/Accounts/'+accountSID+'/SMS/Messages.xml';
	var response = nlapiRequestURL(smsTwilioURL, params, authHeader);
	
	return response;
}
