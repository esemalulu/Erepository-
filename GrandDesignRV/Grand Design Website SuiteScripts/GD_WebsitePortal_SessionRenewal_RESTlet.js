/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       29 Sep 2015     ibrahima
 *
 */

/**
 * Restlet method used to renew webstore session by submitting field to a contact record.
 * @param {Object} dataIn Parameter object
 * @returns {Object} Output object
 */
function GD_WebStore_RenewSession(dataIn) 
{
	//Get the checkoutDomain. We'll return the checkoutDomain, so we can make a REST call on the client side that creates a new record on the checkoutDomain, which keeps that session active
	var domain = '';
	var context = nlapiGetContext();
	if(context)
	{
		domain = context.getSetting('SCRIPT', 'custscriptwebsitemyaccountdomainurl');
	}
	
	//Make a request on the shopping domain, so that session stays active too
	var now = new Date();
	var suiteletURL = nlapiResolveURL('SUITELET', 'customscriptreqshopcartlookupdatasuitele', 'customdeployreqshopcartlookupdatasuitele', true) + '&dealerid=' + nlapiGetUser() + '&type=preferences&time=' + now.getTime();
	
	var headers = new Array();
	headers['User-Agent-x'] = 'SuiteScript-Call';
	headers['Content-Type'] = 'application/json';
	headers['Cache-Control'] = 'no-cache';
	var lookupDataJSON = null;
	try
	{
		var suiteletResponse = nlapiRequestURL(suiteletURL, null, headers);
		lookupDataJSON = JSON.parse(suiteletResponse.getBody());
	}
	catch(e)
	{
		nlapiLogExecution('error', 'Error', JSON.stringify(e));
	}
	
	return domain;
}
