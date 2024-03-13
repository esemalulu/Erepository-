/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       08 Jan 2013     mburstein
 *
 */

/**
 * Use function twilioSMS(arrayTo,body) to send error text as SMS via Twilio
 * 
 * @param{arrayTo} array of receiving phone numbers
 * @param{body} body text for SMS message
 * returns{Object} twilioObject for use with sendBCCTwilioSMSRequest function
 */

/**
 * @returns {Void} Any or no return value
 */
function twilioSMSAction() {
	
	var context = nlapiGetContext();
	nlapiLogExecution('DEBUG', 'Context', context.getExecutionContext());
	if (context.getExecutionContext() == 'workflow') {
		
		// sendBCC is multiSelect so returns array of contact IDs
		var sendTo = context.getSetting('SCRIPT', 'custscriptr7sendtextto');
		nlapiLogExecution('DEBUG','sendTo',sendTo);
		// Body can't be greater than 160 char
		var smsBody = context.getSetting('SCRIPT', 'custscriptr7smsbody');
		nlapiLogExecution('DEBUG','smsBody',smsBody);
		
		// Body can't be greater than 160 char
		var conversationId = context.getSetting('SCRIPT', 'custscriptr7conversationid');
		nlapiLogExecution('DEBUG','conversationId',conversationId);
		
		if (sendTo != null && sendTo != '') {
			// Format phone, replace all non digit chars
			sendTo = formatPhone(sendTo);	
			nlapiLogExecution('DEBUG', 'Formatted Phone #', sendTo);
		}
		
		try {
			// Send to, body, and conversation ID to Twilio Request SMS script
			var smsId = twilioSMS(sendTo, smsBody,conversationId);
	
			if (smsId.indexOf('Error') != -1) {
				nlapiLogExecution('DEBUG', 'SMS Successful', 'To: ' + sendTo + '\nBody: ' + smsBody);
			}
			nlapiLogExecution('DEBUG', 'SMS ID', smsId);
			return smsId;
		} 
		catch (e) {
			nlapiLogExecution('ERROR', 'Could not SMS', 'To: ' + sendTo + '\nBody: ' + smsBody + 'Error: ' + e);
			return null;
		}	
	}
}

function formatPhone(phone){
	return phone.replace(/\D/g,"");
}

