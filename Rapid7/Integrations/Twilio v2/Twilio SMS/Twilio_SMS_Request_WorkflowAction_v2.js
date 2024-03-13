/**
 * 
 * Module Description
 * 
 * Author	mburstein
 * Version	2.00
 * Date		13 Aug 2013
 * 
 * @record
 * @script
 * @scriptlink <a href=""></a>      
 *
 */

/**
 * Use function twilioSMS(arrayTo,body) to send error text as SMS via Twilio
 * 
 * @param{arrayTo} array of receiving phone numbers
 * @param{body} body text for SMS message
 * returns{Object} twilioObject for use with sendBCCTwilioSMSRequest function
 */

function twilioSMSAction() {
	
	var context = nlapiGetContext();
	//if (context.getExecutionContext() == 'workflow') {
	
		var toNumber = context.getSetting('SCRIPT', 'custscriptr7twiliosmsreq_workact_v2_to');
		nlapiLogExecution('DEBUG', 'toNumber', toNumber);
		// If smsBody is greater than 160 char then it will be split into multiple messages
		var smsBody = context.getSetting('SCRIPT', 'custscriptr7twiliosmsreq_workact_v2_body');
		nlapiLogExecution('DEBUG', 'smsBody', smsBody);
		
		// Body can't be greater than 160 char
		var sId = context.getSetting('SCRIPT', 'custscriptr7twiliosmsreq_workact_v2_sid');
		nlapiLogExecution('DEBUG', 'sId', sId);
		
		if (paramExists(toNumber)) {
			// Format phone, replace all non digit chars
			toNumber = formatPhone(toNumber);
			nlapiLogExecution('DEBUG', 'Formatted Phone #', toNumber);
		}
		
		var requestURLParams = {
			custparam_type: 'sms',
			custparam_to: toNumber,
			custparam_body: smsBody,
		//custparam_sid : sId
		};
		var twilioRequestURL = nlapiResolveURL('SUITELET', 'customscriptr7twiliorequestssuitelet', 'customdeployr7twiliorequestssuitelet', true);
		nlapiLogExecution('DEBUG', 'REQUEST URL', twilioRequestURL);
		try {
			var twilioResponse = nlapiRequestURL(twilioRequestURL, requestURLParams);
			return handleTwilioResponse(twilioResponse);
		} 
		catch (e) {
			nlapiLogExecution('ERROR', 'Could not initiate Twilio SMS', 'To: ' + toNumber + '\nsmsBody: ' + smsBody + ' Error: ' + e);
		}
	//}	
}
