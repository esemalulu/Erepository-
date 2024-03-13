/**
 * 
 * Module Description
 * 
 * Author	mburstein
 * Version	1.00
 * Date		08 Aug 2013
 * 
 * @record
 * @script
 * @scriptlink <a href=""></a>      
 *
 */

/**
 * @param {String} type Context Types: scheduled, ondemand, userinterface, aborted, skipped
 * @returns {Void}
 */
function updateStates(type) {

	var timeLimitInMinutes = 10;
	this.timeLimitInMilliseconds = timeLimitInMinutes * 60 * 1000;
	this.startingTime = new Date().getTime();
	this.context = nlapiGetContext();
	this.rescheduleScript = false;
	
	// Get the States/Province/Country record values through web services
	var responseStates = getStates();
	var statesXML = nlapiStringToXML(responseStates.getBody());
	// Format an object to use for record updates/creates
	var objStates = formatStates(statesXML);
	
	var body ='';
	for (var i = 0; objStates != null && i < objStates.length && timeLeft() && unitsLeft(); i++) {
		var state = objStates[i];
		var objCountry = formatCountry(state['country']);
		
		/*var rec = nlapiLoadRecord('customrecordr7statecountrycus',i+1);
		rec.setFieldValue('name',state['id']);
		rec.setFieldValue('custrecordr7statecountrycuscountry',objCountry['country']);
		rec.setFieldValue('custrecordr7statecountrycusstate',state['state']);
		rec.setFieldValue('custrecordr7statecountrycuscountryid',objCountry['countryId']);
		nlapiSubmitRecord(rec);*/
		body += objCountry['countryId']+' : '+objCountry['country'] +' : '+state['id']+' : '+state['state']+'<br />';
		
	}
	nlapiSendEmail(340932,340932,'SPC',body);
	
	
	
	if (rescheduleScript) {
		nlapiLogExecution('DEBUG', 'Reschedule Strcript', context.getScriptId());
		var status = nlapiScheduleScript(context.getScriptId());
		nlapiLogExecution('DEBUG', 'Schedule Status', status);
	}	
}
/**
 * Build an object to format the States/Provinces/Countries.
 * 
 * @method formatStates
 * @param {String} responseStates Response body from the webservices call
 * @return {Object} Returns and object for XML/JSON formatting and stores a text version in 'this'
 */
function formatStates(xml){
	
	var arrElementNames = new Array('listAcct:shortname', 'listAcct:country', 'listAcct:fullName');
	var nodeValues = nlapiSelectValues(xml, "//*[name()='"+arrElementNames[1]+"'] | //*[name()='"+arrElementNames[0]+"'] | //*[name()='"+arrElementNames[2]+"']");
	var objStates = new Array();
	var ln = nodeValues.length;
	while (ln > 0) {
		var tmpArray = nodeValues.splice(0, 3);
		objStates[objStates.length] = {	
			'id' : tmpArray[2],
			'country' : tmpArray[0],
			'state' : tmpArray[1], 
		};
		ln -= 3;
	}	
	return objStates;
}

function formatCountry(country){
	var objCountry = {
		'country': '',
		'countryId': ''
	};
	switch (country) {
		case '_unitedStates':
			objCountry['country'] = 'United States';
			objCountry['countryId'] = 'US';
			break;
		case '_canada':
			objCountry['country'] = 'Canada';
			objCountry['countryId'] = 'CA';
			break;
		case '_unitedKingdomGB':
			objCountry['country'] = 'United Kingdom (GB)';
			objCountry['countryId'] = 'GB'; 
			break;
		case '_australia':
			objCountry['country'] = 'Australia';
			objCountry['countryId'] = 'AU';
			break;
		case '_china':
			objCountry['country'] = 'China';
			objCountry['countryId'] = 'CN';
			break;
		case '_mexico':
			objCountry['country'] = 'Mexico';
			objCountry['countryId'] = 'MX';
			break;
		case '_japan':
			objCountry['country'] = 'Japan';
			objCountry['countryId'] = 'JP';
			break;
	}
	return objCountry;
}

function getStates(email, password, accountId, roleId){
var email = 'r7getlist@rapid7.com';
var password = 'fd8!2Jds@v3';
var accountId = '663271';
var roleId = '1103';

    var head = new Array();
    head['SoapAction'] = '"getAll"';
    head['Content-Type'] = 'application/soap+xml';
   
    var soap = '';
   
    soap += '<?xml version="1.0" encoding="utf-8"?>';
    soap += '<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">';
    soap += '<soap:Header>';
    soap += '<applicationInfo xmlns="urn:messages_2013_1.platform.webservices.netsuite.com">';
    soap += '<applicationId />';
    soap += '</applicationInfo>';
    soap += '<passport xmlns="urn:messages_2013_1.platform.webservices.netsuite.com">';
    soap += '<email xmlns="urn:core_2013_1.platform.webservices.netsuite.com">' + email + '</email>';
    soap += '<password xmlns="urn:core_2013_1.platform.webservices.netsuite.com">' + password + '</password>';
    soap += '<account xmlns="urn:core_2013_1.platform.webservices.netsuite.com">' + accountId + '</account>';
    soap += '<role internalId="' + roleId + '" externalId="" xmlns="urn:core_2013_1.platform.webservices.netsuite.com">';
    soap += '<name />';
    soap += '</role>';
    soap += '</passport>';
    soap += '</soap:Header>';
    soap += '<soap:Body>';
    soap += ' <getAll xmlns="urn:messages_2013_1.platform.webservices.netsuite.com">';
    soap += '<record recordType="state" />';
    soap += '</getAll>';
    soap += '</soap:Body>';
    soap += '</soap:Envelope>';
   
    var url = 'https://663271.suitetalk.api.netsuite.com/services/NetSuitePort_2013_1';
    var response = nlapiRequestURL(url, soap, head);
	return response;
}

function timeLeft(){
	var presentTime = new Date().getTime();
	if (presentTime - startingTime > timeLimitInMilliseconds) {
		nlapiLogExecution('AUDIT', 'Ran out of time', 'yup');
		rescheduleScript = true;
		return false;
	}
	return true;
}

function unitsLeft(units){
	if (units == null || units == ''){
		units = 100;
	}
	var unitsLeft = context.getRemainingUsage();
	if (unitsLeft <= units) {
		nlapiLogExecution('AUDIT', 'Ran out of units', 'yup');
		rescheduleScript = true;
		return false;
	}
	return true;
}
