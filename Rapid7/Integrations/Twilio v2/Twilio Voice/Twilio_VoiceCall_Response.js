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
 * @param {nlobjRequest} request Request object
 * @param {nlobjResponse} response Response object
 * @returns {Void} Any output is written via response object
 */
function twilioVoice_Response(request, response){
	
	response.setContentType('XMLDOC');
	
	var Params = {
		recType : request.getParameter('custparam_rectype'),
		fieldId : request.getParameter('custparam_fieldid'),
		sId : request.getParameter('custparam_sid'),
		sIdField : request.getParameter('custparam_sidfield'),
		//digits : request.getParameter('custparam_digits')
		voiceType : request.getParameter('custparam_voicetype'),
	};
	for(param in Params){
		nlapiLogExecution('DEBUG',param,Params[param]);
	}
	
	if (paramExists(Params.recType) && paramExists(Params.fieldId) && paramExists(Params.sId) && paramExists(Params.sIdField)) {
		Params['msg'] = lookupVoiceMsg(Params);
		if (!paramExists(Params['msg'])) {
			nlapiLogExecution('ERROR', 'COULD NOT FIND MSG FOR SID: ', Params.sId);
		}
		else {
			twilioSayXML = twilioResponse(Params);
			nlapiLogExecution('DEBUG', 'responseXml', twilioSayXML);
			response.write(twilioSayXML);
		}
	}
	else{
		twilioIncomingSayXML = twilioIncomingResponse();
		response.write(twilioIncomingSayXML);
	}
}

function lookupVoiceMsg(params){
	var arrFilters = new Array();
	arrFilters[arrFilters.length] = new nlobjSearchFilter(params.sIdField, null, 'is', params.sId);
	var arrColumns = new Array();
	arrColumns[0] = new nlobjSearchColumn(params.fieldId);
	
	var results = nlapiSearchRecord(params.recType,null,arrFilters,arrColumns);
	for (var i = 0; results != null && i < 1; i++) {
		return results[i].getValue(arrColumns[0]);
	}
}

function twilioResponse(Params){
	var responseXml = [
		'<?xml version="1.0" encoding="utf-8"?>\n',
		'<Response>\n',
			'\t<Say loop="2" voice="'+Params['voiceType']+'">'+Params['msg']+'</Say>\n',
		'</Response>',
		];
	return responseXml.join('');
}

function twilioIncomingResponse(){
	var responseXml = [
		'<?xml version="1.0" encoding="utf-8"?>\n',
		'<Response>\n',
			'\t<Say loop="2">You have reached a Rapid 7 automated message.  If you received this message in error please call 6 1 7 2 4 7 1 7 1 7.</Say>\n',		
		'</Response>',
		];
	return responseXml.join('');
}