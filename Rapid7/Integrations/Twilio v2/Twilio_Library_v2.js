/**
 * 
 * Module Description
 * 
 * Author	mburstein
 * Version	1.00
 * Date		12 Aug 2013
 * 
 * @record
 * @script
 * @scriptlink <a href=""></a>      
 *
 */
/**
 * Check if the parameter value exists and not null/blank/undefined.
 * @method paramExists
 * @param {Object} value
 * @return {Boolean}
 */
function paramExists(value){
	if (value != null && value != '' && value != 'undefined') {
		return true;
	}
	else {
		return false;
	}
}

function formatPhone(phone){
	return phone.replace(/\D/g,"");
}

function getVoiceTypeFromId(voiceTypeId){
	var voices = {
		1 : 'man',
		2 : 'woman',
		3 : 'alice'
	};
	return voices[voiceTypeId];
}

function handleTwilioResponse(twilioResponse){
	nlapiLogExecution('DEBUG', 'twilioResponse Code: ', twilioResponse.getCode());
	if (twilioResponse.getCode() != 200) {
		var errorText = 'twilioResponse Code: ' + twilioResponse.getCode() + ' \nCould not complete Twilio SMS request.';
		nlapiLogExecution('ERROR',errorText);
		return errorText;
	}
	else {
		var twilioResponseXML = nlapiStringToXML(twilioResponse.getBody());
		nlapiLogExecution('DEBUG', 'twilioResponse', twilioResponse);
		nlapiLogExecution('DEBUG', 'twilioResponseBody', twilioResponse.getBody());
		nlapiLogExecution('DEBUG', 'twilioResponseXML', twilioResponseXML);
		
		var concatId = getConcatReturn(twilioResponseXML);
		nlapiLogExecution('DEBUG', 'concatId', concatId);
		return concatId;
	}
}

function getConcatReturn(twilioResponseXML){
	var objTwilioReturnVals = {
		twilSid : selectNodeValueByName(twilioResponseXML, 'Sid'),
		twilStatus : selectNodeValueByName(twilioResponseXML, 'Status'),
		twilTo : selectNodeValueByName(twilioResponseXML, 'To'),
		twilFrom : selectNodeValueByName(twilioResponseXML, 'From')
	};
	
	for(prop in objTwilioReturnVals){
		nlapiLogExecution('DEBUG', prop, objTwilioReturnVals[prop]);
	}
	
	if (paramExists(objTwilioReturnVals['twilSid']) && objTwilioReturnVals['twilStatus'] == 'queued') {
		// Return concat ID
		var concatId = objTwilioReturnVals['twilFrom'] + objTwilioReturnVals['twilTo'];
		concatId = concatId.replace(/\+/g,"");
		nlapiLogExecution('DEBUG', 'concatId', concatId);
		return concatId;
	}
	else {
		return 'Something went wrong. Could not get smsSid.';
	}
}

