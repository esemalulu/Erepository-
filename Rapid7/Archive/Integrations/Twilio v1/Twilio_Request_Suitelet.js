/*
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       30 Aug 2012     efagone			
 *
 */

/*
 * @param {nlobjRequest} request Request object
 * @param {nlobjResponse} response Response object
 * @returns {Void} Any output is written via response object
 */
function twilioRequest(request, response){

	var phone = request.getParameter('custparam_phone');
	var code = request.getParameter('custparam_code');
	//var sid = request.getParameter('custparam_sid');
	
	if (phone != null && phone != '' && code != null && code != ''){
		
		//create twilio db record
		var checkStatusObj = createTwilioDBRec(phone, code);
		if (checkStatusObj != null && checkStatusObj != false) {
			nlapiLogExecution('DEBUG', 'Phone: ', phone);
			nlapiLogExecution('DEBUG', 'Code: ', code);
			//nlapiLogExecution('DEBUG', 'SID: ', sid);	
			try {
				var callResponse = initiateTwilioCall(phone, code);
				nlapiLogExecution('DEBUG','callResponse: ', callResponse);
				nlapiLogExecution('DEBUG','callResponseBody: ', callResponse.getBody());
				nlapiLogExecution('DEBUG','callResponseCode: ', callResponse.getCode());
				var verified = startStatusCheck(checkStatusObj); //setTimeout(startStatusCheck(checkStatusObj), 3000);
				if (verified) {
					//response.verified = true;
					response.writeLine('Verified!');
				}
				else {
					//response.verified = false;
					response.writeLine('Not Verified!');
				}
			} 
			catch (e) {
				nlapiLogExecution('DEBUG', 'Could not complete call: ', e);
				response.verified = false;
				response.writePage('Sorry, an error occurred with your request.  Please try again.');
			}
		}			
		else{
			response.verified = false;
			response.writePage('Sorry, you have entered an invalid request.');
		}
	}
}

function createTwilioDBRec(phone, code){
	
	var recType = 'customrecordr7twiliodb';
	var recTwilioDB = nlapiCreateRecord('customrecordr7twiliodb');
	recTwilioDB.setFieldValue('custrecordr7twiliodbphone', phone);
	recTwilioDB.setFieldValue('custrecordr7twiliodbaccesscode', code);
	//recTwilioDB.setFieldValue('custrecordr7twiliodbsid',sid);
	var recId = nlapiSubmitRecord(recTwilioDB);
	
	// id of field status to check, we want the verified field and the sid
	var fieldIds = new Array();
	fieldIds[0] = 'custrecordr7twiliodbverified';
	fieldIds[1] = 'custrecordr7twiliodbsid';
	
	// Build object to kick off status checker with recType:recId pair and field to check
	if (recId != null && recId != '' && recType != null && recId != '') {
		var checkStatusObj = new Object();
		checkStatusObj.recId = recId;
		checkStatusObj.rectype = recType;
		checkStatusObj.fieldIds =  serialize(fieldIds);	//fieldIds;
		// Set timer value, 30 seconds
		//checkStatusObj.timer = 30;
		return checkStatusObj;		
	}
	else{
		return false;
	}	
}

function startStatusCheck(checkStatusObj){
	// Kick off status checker with recType:recId pair and field to check
	if(checkStatusObj != null){
		//checkStatusObj.authCode = '4cLJ5RyDHb8hVhmVCxCm6raT9DXtEVd2bBsLvRoRjUMwEpyL2vpRj5v6VNV3yb';
		var suiteletURL = nlapiResolveURL('SUITELET', 'customscriptr7statuscheckersuitelet', 'customdeployr7statuscheckersuitelet', true);
		nlapiLogExecution('DEBUG', ' SuiteletURL', suiteletURL);
		var postdata = new Object();
		for(prop in checkStatusObj){
			postdata['custparam_'+prop.toLowerCase()] = checkStatusObj[prop];
			nlapiLogExecution('DEBUG','custparam_'+prop.toLowerCase(),checkStatusObj[prop]);
			nlapiLogExecution('DEBUG','POST custparam_'+prop.toLowerCase(),postdata['custparam_'+prop.toLowerCase()]);
		}
		// Hardcode auth code, no _
		postdata['custparamauthcode'] = '4cLJ5RyDHb8hVhmVCxCm6raT9DXtEVd2bBsLvRoRjUMwEpyL2vpRj5v6VNV3yb';	
		try {
			//figure out why this gets unexpected error
			var response = nlapiRequestURL(suiteletURL, postdata);
			
			var responseCode = response.getCode();
			var responseBody = response.getBody();
			var responseXML = nlapiStringToXML(responseBody);
			
			nlapiLogExecution('DEBUG', ' Status Checker Response Code', responseCode);
			nlapiLogExecution('DEBUG', ' Status Checker Response Body', responseBody);
			if(responseCode == 200){
				//var verifiedNode = 
				var verified = selectNodeValueByName(responseXML,'custrecordr7twiliodbverified');
				nlapiLogExecution('DEBUG','verified xml:', verified);
				if (verified == 'T') {
					return true;
				}
				else {
					return false;
				}
			}
		}
		catch (e) {
			nlapiLogExecution('DEBUG', 'Could not request Status Checker Suitelet: ', e);
			return false;
		}
	}
	else{
		return false;
	}	
}

function initiateTwilioCall(phone, code){
	
	var from = '16172471717';
	
	var params = new Array();
	params['From'] = encodeURIComponent(from);
	params['To'] = encodeURIComponent(phone);
	params['ApplicationSid'] = 'AP88fd7c1d7a47de365c3091b4ef982648';
	
	var authHeader = new Array();
	authHeader['Authorization'] = 'Basic QUM4ODA4OWUxMzI2MTIzYmYwYmYxNDliMGI2MTBmMDg2NTo2YzlkNTM2NmQ5YTU5MGM0MGE5ZTk3MWQ2N2UyMjhkNg==';
	
	var makeCallURL = 'https://api.twilio.com/2010-04-01/Accounts/AC88089e1326123bf0bf149b0b610f0865/Calls.xml';
	
	var response = nlapiRequestURL(makeCallURL, params, authHeader);
	
	return response;
}

