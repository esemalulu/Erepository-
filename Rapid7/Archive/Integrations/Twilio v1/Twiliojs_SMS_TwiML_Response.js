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
function twilioSMSResponse(request, response){

	var params = request.getAllParameters();
	for (param in params) {
		nlapiLogExecution('DEBUG', param, params[param]);
	}
	// param SmsStatus should be 'received' on success
	if (params['SmsStatus'] == 'received') {
		var responseXml = SmsTwiMLResponse();
		response.setContentType('XMLDOC');
		response.write(responseXml);
	}
	else{
		// Do Nothing
		return;
	}	
}


function SmsTwiMLResponse(){
	//var actionURL = 'https://forms.netsuite.com/app/site/hosting/scriptlet.nl?script=562&deploy=1&compid=663271&h=7e74c5dcbe6e19327e66';
	var responseXml = [
		'<?xml version="1.0" encoding="utf-8"?>\n',
		'<Response>\n',
			'\t<Sms>You suck Derek.\n',//+body+
			'\t</Sms>\n',
		'</Response>',
		];
	return responseXml.join('');
}



	
	/*var to = request.getParameter('To');
	 var from = request.getParameter('From');
	 var body = request.getParameter('Body');
	 nlapiLogExecution('DEBUG', 'To\nFrom\nBody', to+'\n'+from+'\n'+body);
	 
	 if (to != null && to != '' && from != null && from != '' && body != null && body != '') {
	 
	 var responseXml = SmsTwiMLResponse(to,from,body);
	 nlapiLogExecution('DEBUG', 'responseXml', responseXml);
	 response.setContentType('XMLDOC');
	 response.write(responseXml);
	 }
	 else {
	 // If missing param then fail
	 nlapiLogExecution('DEBUG','FAIL: ','FAIL');
	 var responseXml = 'FAIL';
	 response.setContentType('XMLDOC');
	 response.write(responseXml);
	 }
}*/


/*
function SmsTwiMLResponse(to,from,body){
	//var actionURL = 'https://forms.netsuite.com/app/site/hosting/scriptlet.nl?script=562&deploy=1&compid=663271&h=7e74c5dcbe6e19327e66';
	var responseXml = [
		'<?xml version="1.0" encoding="utf-8"?>\n',
		'<Response>\n',
			'\t<Sms to="'+to+'" from="'+from+'" body="Testing">\n',//+body+
			'\t</Sms>\n',
		'</Response>',
		];
	return responseXml.join('');
}*/
