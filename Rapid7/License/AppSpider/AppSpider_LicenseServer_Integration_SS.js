/*
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       14 May 2015     efagone
 *
 * MB: 5/19/16 - Change #1216 R7APPS-61 New AppSpider Licensable Feature: Restricting Number of Web Apps
 */

/*
 *
 The AppSpider LicenseServer Integration script handles web service calls between NetSuite and the AppSpider Licensing Server.  ** Details of the web services API can be found in the AppSpider Licensing API Guide.

The script executes on the beforeSubmit trigger for Create/Edit events on AppSpider License records. It is responsible for creation (createLicense) of AppSpider Licenses and updates (updateLicense) to previously created licenses.

Global Script Parameters store the following key variables:
	- AppSpider Licensing Endpoint URL - The URL of the AppSpider License server API
	- AppSpider Licensing Endpoint URL (Sandbox) - The URL of the STAGING AppSpider License server API.  
	- AppSpider Licensing Auth  - The Basic Authentication header used to authorize use of the API.
	- AppSpider Licensing Auth (Sandbox) - The STAGING Basic Authentication header used to authorize use of the API.

	** Important - There is currently NO STAGING ENVIRONMENT for AppSpider Licensing

	To ensure production data is not incorrectly adjusted an environment check is executed at the beginning of the process. If environment is NOT Production and there is no parameter for a different endpoint from the AppSpider production URL, then a fake product key is set and the script exits without any web service interaction.

Furthermore, a Restriced License (runRestrictedUserChecks) check is executed before the create/update license functions.  If either the Blacklisted/Restricted fields are true then the license Expiration Date will be set to YESTERDAY.

Successful calls to the AppSpider License server will return:
	- Product Key - Used to set the AppSpider License record field Product Key (this is only set on create)
	- license ID - Used to set the AppSpider License record field License ID

The API documentation can be found in the various flavors 
	https://download.appspider.rapid7.com/api/swagger.pdf
	https://download.appspider.rapid7.com/api/swagger.json
	https://download.appspider.rapid7.com/api/swagger.yaml
 

** If there is an error during the createOrUpdateLicense function the script will throw a hard error and halt.
 */

var context = nlapiGetContext();
//endpoint = 'https://customers.ntobjectives.com/api/';
//accessToken = '7hZzaA0uMezuNX6qFGho2iD0oCs3fMuv';

var appSpiderEnv = {
	PRODUCTION: {
		url: context.getSetting('SCRIPT', 'custscriptr7_appspider_api_endpoint_prod'),
		token: context.getSetting('SCRIPT', 'custscriptr7_appspider_api_token_prod')
	},
	STAGING: {
		url: context.getSetting('SCRIPT', 'custscriptr7_appspider_api_endpoint_sand'),
		token: context.getSetting('SCRIPT', 'custscriptr7_appspider_api_token_sand')
	}
};

var activeEnv = appSpiderEnv.PRODUCTION;
var defaultFailMsg = 'Failed to create license. Please contact Rapid7 Support';

/*
 * The recordType (internal id) corresponds to the "Applied To" record in your script deployment. 
 * @appliedtorecord recordType
 * 
 * @param {String} type Operation types: create, edit, delete, xedit
 *                      approve, reject, cancel (SO, ER, Time Bill, PO & RMA only)
 *                      pack, ship (IF)
 *                      markcomplete (Call, Task)
 *                      reassign (Case)
 *                      editforecast (Opp, Estimate)
 * @returns {Void}
 */
function appsp_beforeSubmit(type){

	// --------------------- BEGIN ENVIRONMENT CHECK ---------------------		
	if (['PRODUCTION'].indexOf(nlapiGetContext().getEnvironment()) == -1) {
		//Set active environment to staging
		activeEnv = appSpiderEnv.STAGING;
		
		//if environment is not production and there is no config for a different endpoint from appspider production url, then set fake product key and exit
		//otherwise, continue on using the separate staging url
		if (!appSpiderEnv.STAGING.url || appSpiderEnv.STAGING.url == appSpiderEnv.PRODUCTION.url) {
			if (type == 'create' || type == 'copy') {
				generateRandomProductKey();
			}
			return;
		}
	}
	// --------------------- END ENVIRONMENT CHECK ---------------------
	
	//make request to AppSpider server
	if (type == 'create' || (type == 'edit' && (nlapiStringToDate(nlapiGetFieldValue('created')) >= nlapiStringToDate('11/23/2015')))) { // Licenses created before integration deployed should be skipped
		runRestrictedUserChecks();
		createOrUpdateLicense();
	}
	else {
		throw nlapiCreateError('FEATURE_UNAVAILABLE', 'Cannot trigger actions on anything other than create or edit', false);
	}
	
}

function runRestrictedUserChecks(){

	var contactId = nlapiGetFieldValue('custrecordr7asplicensecontact');
	var isBlackListed = checkBlacklisted(contactId);
	var isRestricted = checkRestricted(contactId);
	
	var strToday = nlapiDateToString(new Date());
	var dtToday = nlapiStringToDate(strToday);
	
	var strcurrentExpiration = nlapiGetFieldValue('custrecordr7asplicenseexpirationdate') || strToday;
	var dtCurrentExpiration = nlapiStringToDate(strcurrentExpiration);
	
	if (isBlackListed) {
		if (dtCurrentExpiration >= dtToday) {
			nlapiSetFieldValue('custrecordr7asplicenseexpirationdate', nlapiDateToString(nlapiAddDays(new Date(), -1)));
		}
	}
	
	if (isRestricted) {
		if (dtCurrentExpiration >= dtToday) {
			nlapiSetFieldValue('custrecordr7asplicenseexpirationdate', nlapiDateToString(nlapiAddDays(new Date(), -1)));
		}
		if (type == 'create') {
			throw nlapiCreateError('ERROR', 'Failed to create license.  Please contact Rapid7 Support', true);
		}
	}
	
	return true;
}

function createOrUpdateLicense(){

	var serverOp = {
		CREATE: 'createLicense',
		UPDATE: 'updateLicense'
	};
	
	var objLicense = {};
	
	//SET OPERATION
	var productKey = nlapiGetFieldValue('custrecordr7asplicenseproductkey');
	
	objLicense.op = (!productKey) ? serverOp.CREATE : serverOp.UPDATE;
	objLicense.productKey = productKey;
	objLicense.licenseType = getLicenseType(nlapiGetFieldValue('custrecordr7asplicenseordertype'));
	objLicense.accountExpirationTime = formatISO8601(nlapiGetFieldValue('custrecordr7asplicenseexpirationdate'));
	objLicense.licenseExpirationTime = formatISO8601((nlapiGetFieldValue('custrecordr7asplicenseperpetuallicense') == 'T') ? '12/31/2037' : nlapiGetFieldValue('custrecordr7asplicenseexpirationdate'));
	objLicense.customerName = nlapiGetFieldText('custrecordr7asplicensecustomer');
	objLicense.emailAddress = getContactProperties(nlapiGetFieldValue('custrecordr7asplicensecontact'), 'email');
	//Validate Contact Email
	if (!objLicense.emailAddress) {
		throw nlapiCreateError('INVALID_EMAIL', 'Invalid Contact Email');
	}
	objLicense.firstName = getContactProperties(nlapiGetFieldValue('custrecordr7asplicensecontact'), 'firstname');
	objLicense.lastName = getContactProperties(nlapiGetFieldValue('custrecordr7asplicensecontact'), 'lastname');
	
	// MB: 5/19/16 - Change #1216 R7APPS-61 New AppSpider Licensable Feature: Restricting Number of Web Apps
	objLicense.numberApps = nlapiGetFieldValue('custrecordr7asplicensenumofapps'); // Max value 64, defaults 0 on server
	objLicense.numberConcurrent = nlapiGetFieldValue('custrecordr7asplicensenumofconcurscans'); // Max value 16, defaults 1 on server
	if (nlapiGetFieldValue('custrecordr7asplicenseevalmode') == 'T') {
		objLicense.evalMode = 'true';
	}

	// TS: 5/14/18 - New Ability for Unlimited Engines. When this value is True, the AppSpider Server allows this license's key to be authenticated infinitely
	objLicense.unlimitedEngines = nlapiGetFieldValue('custrecordr7asplicenseunlimitedengines');

	//VALIDATIONS
	//Validate Contact Email
	if (!objLicense.emailAddress) {
		throw nlapiCreateError('INVALID_EMAIL', 'Invalid Contact Email');
	}
	if (objLicense.numberApps > 64){
		throw nlapiCreateError('EXCEEDED_MAX_APPS', 'Max Number of Apps is 64');
	}
	if (objLicense.numberConcurrent > 16){
		throw nlapiCreateError('EXCEEDED_MAX_SCANS', 'Max Number of Concurrent Scans is 16');
	}
	// Deprecate AppSpiderEval per Dan Kuykendall: In fact, licenseType of AppSpiderPro along with evalMode as true is the same as AppSpiderEval. I would like to use this model and depreciate licenseType of AppSpiderEval to make this cleaner.
	if (objLicense.licenseType == 'AppSpiderEval'){
		objLicense.licenseType = 'AppSpiderPro';
		objLicense.evalMode = 'true';		
	}
	
	//SEND REQUEST
	var objHeaders = {
		AccessToken: activeEnv.token
	};
	
	var serverResponse = nlapiRequestURL(activeEnv.url, JSON.stringify(objLicense), objHeaders, 'POST');
nlapiLogExecution('DEBUG', 'ObjLicense', JSON.stringify(objLicense));
	
	if (!serverResponse || serverResponse.getCode() != 200) {
		var msg = (!serverResponse) ? 'The response is null' : 'Code: ' + serverResponse.getCode() + '\nBody: ' + serverResponse.getBody();
		nlapiLogExecution('ERROR', 'The license server is responding with non-200', msg);
		throw nlapiCreateError('BAD_RESPONSE', msg, false);
	}
	
	// All should be OK, so parse the JSON 
	var objServerResponse = {};
	try {
		objServerResponse = JSON.parse(serverResponse.getBody());
	} 
	catch (e) {
		nlapiLogExecution('EMERGENCY', 'An error occurred while attempting to parse the server response', e);
		throw nlapiCreateError('REQUEST_FAILED', defaultFailMsg, true);
	}
	
	if (objServerResponse.errorMsg) {
		nlapiLogExecution('EMERGENCY', 'An error occurred on server', objServerResponse.errorMsg);
		throw nlapiCreateError('REQUEST_FAILED', defaultFailMsg, true);
	}
	
	if (objLicense.op == serverOp.CREATE) {
		nlapiSetFieldValue('custrecordr7asplicenseproductkey', objServerResponse.productKey);
	}
	if (objServerResponse.licenseId) {
		nlapiSetFieldValue('custrecordr7asplicenseid', objServerResponse.licenseId);
	}
	//generate random license id
	nlapiSetFieldValue('custrecordr7asplicenseserialid', generateRandomLicenseId());
	
	return true;
}

function getLicenseType(orderType){

	var nsTypes = {
		'1': 'AppSpiderExpress', //Express
		'2': 'AppSpiderPro', //Pro
		'3': 'AppSpiderEnterprise', //Enterprise
		'4': 'AppSpiderEval', //Eval
		'6': 'AppSpiderPro' //Enterprise Engine == Pro
	};
	
	if (!nsTypes.hasOwnProperty(orderType)) {
		throw nlapiCreateError('INVALID_ORDER_TYPE', orderType);
	}
	return nsTypes[orderType];
	
}

/*
 * Returns an ISO 8601 format date string for a provided date object.
 *
 * @param date The date.
 */
function formatISO8601(strDate){


	//Formats the provided number to the specified precision.
	function formatNumber(n, precision){
		var s = '' + n;
		for (var i = s.length; i < precision; i++) {
			s = '0' + s;
		}
		return s;
	}
	
	try {
	
		if (!strDate) {
			nlapiLogExecution('DEBUG', 'An error occured while attempting to parse a date', e);
			throw nlapiCreateError('REQUEST_FAILED', 'Could not parse date. Null Date', true);
		}
		
		var dtDate = nlapiStringToDate(strDate);
		
		var yr = formatNumber(dtDate.getUTCFullYear(), 4);
		var mo = formatNumber(dtDate.getUTCMonth() + 1, 2);
		var dt = formatNumber(dtDate.getUTCDate(), 2);
		
		return yr + mo + dt + 'T235959999';
	} 
	catch (e) {
		nlapiLogExecution('DEBUG', 'An error occured while attempting to parse a date', e);
		throw nlapiCreateError('REQUEST_FAILED', 'Could not parse date.', true);
	}
	
}

function generateRandomProductKey(){
	
	var chars = 'BCDEFGHJKLMNPQRSTVWXYZ0123456789';
	var randomKey = '0000-0000-';
	for (var i = 0; i < 8; i++) {
		var rnum = Math.floor(Math.random() * chars.length);
		randomKey += chars.substring(rnum, rnum + 1);
		
		if (i == 3) {
			randomKey += '-';
		}
	}
	
	nlapiSetFieldValue('custrecordr7asplicenseid', '101010101010');
	nlapiSetFieldValue('custrecordr7asplicenseserialid', '1010101010101010101010101010101010101010');
	nlapiSetFieldValue('custrecordr7asplicenseproductkey', randomKey);
	
	return;
}

function generateRandomLicenseId(){
	var chars = 'ABCDEF0123456789';
	var randomStr = '';
	for (var i = 0; i < 40; i++) {
		var rnum = Math.floor(Math.random() * chars.length);
		randomStr += chars.substring(rnum, rnum + 1);
	}
	return randomStr;
}

var objContactProps = {}; //object used to store and re-use contact properties
var arrContactFieldsToLookup = [
		'isinactive',
		'internalid',
		'email',
		'firstname',
		'lastname'
]; //list of fields needed to be retrieved from item record

function getContactProperties(recId, specificFieldId){

	if (!recId) {
		return null;
	}
	
	if (objContactProps.hasOwnProperty(recId)) {
		if (specificFieldId != null && specificFieldId != '') {
			return objContactProps[recId][specificFieldId];
		}
		return objContactProps[recId];
	}
	
	objContactProps[recId] = nlapiLookupField('contact', recId, arrContactFieldsToLookup);
	
	if (objContactProps[recId] == null) {
		return null;
	}
	if (specificFieldId != null && specificFieldId != '') {
		return objContactProps[recId][specificFieldId];
	}
	return objContactProps[recId];
	
}