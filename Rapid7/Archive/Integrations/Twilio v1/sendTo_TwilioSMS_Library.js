/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       22 Dec 2012     mburstein
 *
 */
 /**
  * 
  * function twilioSMS
  * @param{arrayTo} array of receiving phone numbers
  * @param{body} body text for SMS message
  * @param{cookie} cookie for SMS conversation tracking
  * returns{Object} smsId
  * 
  * function sendToTwilioSMSRequest
  * @param{twilioObject} object containing To phone number and Body of SMS text
  * @param{cookie} cookie for SMS conversation tracking
  * returns{String} SID of SMS message session, null if fail
  */
 
function twilioSMS(to, body, conversationId){
	
	// If conversation (use ID or record?) is null than came from script most likely?
	// TODO or do we want to always create a conversation record when we send an SMS 
	if (conversationId == null) {
		var recConversation = nlapiCreateRecord('customrecordr7twiliosmsconversation');
		conversationId = nlapiSubmitRecord(recConversation);
	}
	/*
	 * Create Object to send SMS through Twilio
	 */
	
	// There is a maximum text length of 160 char
	if(body.length < 160){
		var objTwilio = new Object();
		objTwilio['To'] = to;
		objTwilio['Body'] = body;
		// Get Cookie value from new Conversation Record
		objTwilio['r7cookie'] = nlapiLookupField('customrecordr7twiliosmsconversation', conversationId, 'custrecordr7twiliosmsconversationcookie');
		
		var smsSid = sendToTwilioSmsRequest(objTwilio);
		return smsSid;
	}
	else{
		var smsSid = 'Error Text greater than 160 char, cannot SMS.';
		nlapiLogExecution('ERROR','Body Text Too Long',smsSid);
		return smsSid;
	}
}
 
function sendToTwilioSmsRequest(objTwilio){

	if (objTwilio != null) {
		//checkStatusObj.authCode = '4cLJ5RyDHb8hVhmVCxCm6raT9DXtEVd2bBsLvRoRjUMwEpyL2vpRj5v6VNV3yb';
		var suiteletURL = nlapiResolveURL('SUITELET', 'customscriptr7twiliosmsrequest', 'customdeployr7r7twiliosmsrequest', true);
		
		var postdata = new Object();
		var headers = new Object();
		
		for (prop in objTwilio) {
			if (prop != 'r7cookie') {
				postdata['custparam_' + prop.toLowerCase()] = objTwilio[prop];
				nlapiLogExecution('DEBUG', 'custparam_' + prop.toLowerCase(), objTwilio[prop]);
				nlapiLogExecution('DEBUG', 'POST custparam_' + prop.toLowerCase(), postdata['custparam_' + prop.toLowerCase()]);
			}
			else {
				// Handle r7cookie prop seperately for header
				headers['r7cookie'] = objTwilio[prop];
				nlapiLogExecution('DEBUG', prop.toLowerCase(), objTwilio[prop]);
			}
		}
		
		try {
			var response = nlapiRequestURL(suiteletURL, postdata, headers);
			
			var responseCode = response.getCode();
			var responseBody = response.getBody();
			var responseXML = nlapiStringToXML(responseBody);
			
			nlapiLogExecution('DEBUG', ' Twilio SMS Response Code', responseCode);
			nlapiLogExecution('DEBUG', ' Twilio SMS Response Body', responseBody);
			if (responseCode == 200) {
				//var verifiedNode = 
				var smsSid = selectNodeValueByName(responseXML, 'Sid');
				//nlapiLogExecution('DEBUG','SMS SID:', smsSid);
				if (smsSid != null && smsSid != '') {
					// If successful update the conversation record
					//updateConversation(objTwilio);
					return smsSid;
				}
				else {
					return null;
				}
			}
		} 
		catch (e) {
			nlapiLogExecution('DEBUG', 'Could not request Twilio SMS Request Suitelet: ', e);
			return null;
		}
	}
	else {
		return null;
	}
}

function updateConversation(objTwilio){
	
}

