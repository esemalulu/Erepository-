/**
 * 
 * Module Description
 * 
 * Author	mburstein
 * Version	2.00
 * Date		09 Aug 2013
 * 
 * @record
 * @script
 * @scriptlink <a href=""></a>      
 *
 */

/**
 * @returns {Void} Any or no return value
 */
function twilioVoiceAction() {
	
	var context = nlapiGetContext();
	if (context.getExecutionContext() == 'workflow') {

		var toNumber = context.getSetting('SCRIPT', 'custscriptr7twiliovoice_tonumber');
		var recType = context.getSetting('SCRIPT', 'custscriptr7twiliovoice_rectype');
		var fieldId = context.getSetting('SCRIPT', 'custscriptr7twiliovoice_fieldid');
		var sId = context.getSetting('SCRIPT', 'custscriptr7twiliovoice_sid');
		var sIdField = context.getSetting('SCRIPT','custscriptr7twiliovoice_sidfield');
		var voiceTypeId = context.getSetting('SCRIPT','custscriptr7twiliovoice_voicetype');
		var voiceType;
		if(paramExists(voiceTypeId)){
			voiceType = getVoiceTypeFromId(voiceTypeId);
		}
		else{
			voiceType = 'man';
		}
		
		if (paramExists(toNumber)) {
			// Format phone, replace all non digit chars
			toNumber = formatPhone(toNumber);	
			nlapiLogExecution('DEBUG', 'Formatted Phone #', toNumber);
		}
		
		var responseURLParams = {
			custparam_rectype : recType,
			custparam_fieldid : fieldId,
			custparam_sid : sId,
			custparam_sidfield : sIdField,
			custparam_voicetype : voiceType
		};
		var twilioResponseURL = nlapiResolveURL('SUITELET', 'customscriptr7twiliovoiceresp_suitelet', 'customdeployr7twiliovoiceresp_suitelet', true);
		for(param in responseURLParams){
			twilioResponseURL+='&'+param+'='+responseURLParams[param];
		}
		
		var requestURLParams = {
			custparam_type: 'voice',
			custparam_to: toNumber,
			custparam_url : twilioResponseURL
		};
		nlapiLogExecution('DEBUG','twilioResponseURL',twilioResponseURL);
		var twilioRequestURL = nlapiResolveURL('SUITELET', 'customscriptr7twiliorequestssuitelet', 'customdeployr7twiliorequestssuitelet', true);
		
		nlapiLogExecution('DEBUG','REQUEST URL',twilioRequestURL);
		try {
			var twilioResponse = nlapiRequestURL(twilioRequestURL, requestURLParams);
			return handleTwilioResponse(twilioResponse);
		} 
		catch (e) {
			nlapiLogExecution('ERROR', 'Could not initiate Twilio call', 'To: ' + toNumber + '\nrecType: ' + recType + ' Error: ' + e);
			return e;
		}
	}
}




