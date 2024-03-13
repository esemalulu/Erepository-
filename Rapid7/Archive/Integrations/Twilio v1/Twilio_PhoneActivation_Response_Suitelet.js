/*
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       30 Aug 2012     mburstein
 *
 */

/*
 * @param {nlobjRequest} request Request object
 * @param {nlobjResponse} response Response object
 * @returns {Void} Any output is written via response object
 */


//Security implications?  How to make sure that if someone accesses this suitelet, no detrimental NS modifications
function twilioPhoneActivation(request, response){

	var digits = request.getParameter('Digits');
	//nlapiLogExecution('DEBUG', 'digitsHeader', digits);
	
	if (digits == null || digits == '') {
	
		var responseXml = phoneActivationResponse();
		nlapiLogExecution('DEBUG', 'responseXml', responseXml);
		response.setContentType('XMLDOC');
		response.write(responseXml);
	}
	else {
		nlapiLogExecution('DEBUG','digits: ',digits);
		// If digits entered correctly then update database and reset license.
		var accessCodeVerified = updateTwilioDB(digits);
		if (accessCodeVerified) {		
			var responseXml = goodByeResponse();
			response.setContentType('XMLDOC');
			response.write(responseXml);
		}
		else{
		// If digits incorrect, prompt user again.
			var responseXml = tryAgainResponse();
			response.setContentType('XMLDOC');
			response.write(responseXml);
		}
	}
}

function phoneActivationResponse(){
	//var actionURL = 'https://forms.netsuite.com/app/site/hosting/scriptlet.nl?script=562&deploy=1&compid=663271&h=7e74c5dcbe6e19327e66';
	var responseXml = [
		'<?xml version="1.0" encoding="utf-8"?>\n',
		'<Response>\n',
			'\t<Gather method="GET" timeout="10" numDigits="5">\n',
        		'\t\t<Say>Please enter your 5 digit access code</Say>\n',
    			'\t<Leave />', 
			'\t</Gather>\n',
			'<Say>Sorry, you took too long to enter your access code.  Good Bye.</Say>\n',
		'</Response>',
		];
	return responseXml.join('');
}

function goodByeResponse(){
	var responseXml = [
	'<?xml version="1.0" encoding="utf-8"?>\n',
	'<Response>\n', 
		'\t<Say>Damn!  Your license has been reset. That is fucking bullshit. Good Bye.</Say>\n',
		//'\t<Say>Thank you, your license has been reset.  Good Bye.</Say>\n',
		'\t<Leave />', 
	'</Response>'
	];
	return responseXml.join('');
}

function tryAgainResponse(){
	var responseXml = [
	'<?xml version="1.0" encoding="utf-8"?>\n',
	'<Response>\n', 
		'\t<Say>You have entered an invalid access code.  Please try again.</Say>\n',
		'\t<Gather method="GET" timeout="10" numDigits="5">\n',
        	'\t\t<Say>Please enter your 5 digit access code</Say>\n',
    			'\t<Leave />', 
			'\t</Gather>\n',
			'<Say>Sorry, you took too long to enter your access code.  Good Bye.</Say>\n',
	'</Response>'
	];
	return responseXml.join('');
}

function updateTwilioDB(digits){
	var filters = new Array();
	filters[0] = new nlobjSearchFilter( 'custrecordr7twiliodbaccesscode', null, 'is', digits);
	
	var columns = new Array();
	columns[0] = new nlobjSearchColumn('internalid');
	
	var searchResults = nlapiSearchRecord('customrecordr7twiliodb', null, filters, columns);
	if(searchResults !=null){
		var idTwilioDB = searchResults[0].getValue(columns[0]);
		nlapiLogExecution('DEBUG','Submitted Record',idTwilioDB);
		var recTwilioDB = nlapiLoadRecord('customrecordr7twiliodb',idTwilioDB);
		recTwilioDB.setFieldValue('custrecordr7twiliodbverified','T');	
		try {
			var id = nlapiSubmitRecord(recTwilioDB);
			nlapiLogExecution('DEBUG','Submitted Record',id);
			return true;
		}
		catch(e){
			nlapiLogExecution('DEBUG','Error updating TwilioDB verified',e);
			return false;
		}
	}
	else{
		return false;
	}
}



