/*
 * @author mburstein
 */

/**
 * SOAP Request Library 
 * 
 * This library script is a reusable set of functions for building SOAP XML requests.
 * The SOAP Request Library consists of the following functions:
 * 		- addNamespaces(array)							Takes an array parameter of namespace attributes and builds xmlns: attributes for SOAP Envelope
 * 
 * 		- soapEnvelope(sHeader,sBody,arrayNamespaces)	Takes parameters sHeader, sBody and arrayNamespaces, which are the return values of the soapHeader(),soapBody(), addNamespaces() functions. 
 * 															Wraps the rest of the SOAP request with the appropriate SOAP envelope, including namespaces
 * 
 * 		- soapHeader(header)							Takes parameter header, application specific XML headers.
 * 															Includes security attributes etc., must be modified according to specific WSDL.
 * 
 * 		- soapBody(payload)								Build payload for SOAP request.  Takes parameter of application specific payload.
 * 
 * 		- wsSecurity(username,password)					This is an optional function for adding user/pass authentication following WS-Security standards.
 * 
 */

//  The functions use array.join as method of concatenation

/*
 *   [CODE EXAMPLE:]
 *   
Create an array of namespace attributes, addNamespaces() function will take care of 'xmlns:'
 	var arrayNamespaces = new Array;
 		arrayNamespaces.push('soapenv="http://schemas.xmlsoap.org/soap/envelope/"');
		arrayNamespaces.push('v1="http://api.icims.com/v1"');	

POST URL
	var url = 'https://rapid7.icims.com/api/v1/data';
	
User credentials:
 	var username = 'username';
 	var password = 'password';

Application specific header.  SOAP headers hold a variety of optional info, most commonly security authentication mechanisms
	var header = wsSecurity(username,password);

Application specific payload.
 	var payload;
	payload +=   '<v1:GetRequest>';
	payload +=   	'<v1:PersonReference>';
	payload +=     		'<v1:SystemId>'+applicantId+'</v1:SystemId>';		
	payload +=    	'</v1:PersonReference>';
	payload +=   '</v1:GetRequest>';

Any additional POST headers (optional)
	var postHeaders = new Array();	
	postHeaders = postHeaders['SOAPAction'] = 'https://rapid7.icims.com/api/v1/data';
	
Build request using functions
	var header = wsSecurity(username,password);
	var sHeader = soapHeader(header);
	var sBody = soapBody(payload);
	var soapRequest = soapEnvelope(sHeader,sBody,arrayNamespaces);
	
Send the request to specified URL, with payload and special headers.  Store in response variable.	
	var response = nlapiRequestURL( url, soapRequest, postHeaders);
/*
 *  [/CODE EXAMPLE]
 */


// format xmlns attributes for SOAP
function addNamespaces(array){
	var namespaces = array;
	var xmlns = '';
	for (var n=0; n<namespaces.length; n++){
		xmlns += 'xmlns:'+namespaces[n]+' ';
	}
	return xmlns;
}

// SOAP Envelope
function soapEnvelope(sHeader,sBody,arrayNamespaces){
	var soap = [
	'<?xml version="1.0" encoding="utf-8"?>',
	'<soapenv:Envelope '+addNamespaces(arrayNamespaces)+'>',
		sHeader,
		sBody,
	'</soapenv:Envelope>'
	];
	return soap.join('');
}

// SOAP Header
function soapHeader(header){
	var soap = [
	'<soapenv:Header>',
		header,
	'</soapenv:Header>'
	];
	return soap.join('');
}

function soapBody(payload){
	var soap = [
	'<soapenv:Body>',
		payload,
	'</soapenv:Body>'
	];
	return soap.join('');
}

function wsSecurity(username,password){ // Optional function for username/pass WS-Security authentication
	var soap = [
	'<wsse:Security soapenv:mustUnderstand="1" xmlns:wsse="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd">',
		'<wsse:UsernameToken wsu:Id="UsernameToken-5151722" xmlns:wsu="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd">',
			'<wsse:Username>'+username+'</wsse:Username>',
				'<wsse:Password Type="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-username-token-profile-1.0#PasswordText">'+password+'</wsse:Password>',
		'</wsse:UsernameToken>',
	'</wsse:Security>'
	];
	return soap.join('');
}
