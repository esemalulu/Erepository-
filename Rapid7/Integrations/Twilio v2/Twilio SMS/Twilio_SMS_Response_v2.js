/**
 * 
 * Module Description
 * 
 * Author	mburstein
 * Version	2.00
 * Date		13 Aug 2013
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
function twilioSMSResponse(request, response){
	
	this.params = request.getAllParameters();
	// If the conditionalResponse var remains false then the automated message will respond. If it's true a conditional message response will be sent from a separate workflow.
	this.conditionalResponse = false;
	
	var responseXml = '';
	// param SmsStatus should be 'received' on success
	if (params['SmsStatus'] == 'received') {
		
		var objTwilioReturnVals = createTwilioResponseObject(params);
		
		// If there's an error with the SMS then do nothing
		if (objTwilioReturnVals == false) {
			// Do Nothing
			return;
		}
		else {	
			// Create a record to track responses but send message anyway if there's an error.
			try {
				var responseRecId = createEmpNotificationResponseRec(objTwilioReturnVals);
			} 
			catch (e) {
				nlapiLogExecution('ERROR', 'ERROR With incoming Twilio Message', e);
			// nlapiSendEmail
			}
			
			// If there is no matching concatId then general response
			if (!conditionalResponse){
				responseXml = twilioIncoming_GeneralResponse();
			}
			else{
				// Do Nothing
				//responseXml = twilioIncoming_ConditionalResponse();
			}		
		}		
			
		response.setContentType('XMLDOC');
		response.write(responseXml);
		return;		
	}
	else {
		// Do Nothing
		return;
	}	
}

function twilioIncoming_GeneralResponse(){
	var responseText = 'You have reached a Rapid7 automated message.  If you received this message in error please call 617 247-1717.';
	var responseXml = [
		'<?xml version="1.0" encoding="utf-8"?>\n',
		'<Response>\n',
			'\t<Sms>'+responseText,
			'\t</Sms>\n',
		'</Response>',
		];
	return responseXml.join('');
}
function twilioIncoming_ConditionalResponse(){
	var responseText = 'I AM TWILIO!';
	var responseXml = [
		'<?xml version="1.0" encoding="utf-8"?>\n',
		'<Response>\n',
			'\t<Sms>'+responseText,
			'\t</Sms>\n',
		'</Response>',
		];
	return responseXml.join('');
}

/**
 * Create an object to store the incoming params for record
 * @method createTwilioResponseObject
 * @param {Object} params
 */
function createTwilioResponseObject(params){
	var objTwilioReturnVals = {
		twilSid : params['SmsSid'],
		twilStatus : params['SmsStatus'],
		twilTo : params['To'],
		twilFrom : params['From'],
		twilFromZip : params['FromZip'],
		twilFromCity : params['FromCity'],
		twilFromState : params['FromState'],
		twilFromCountry : params['FromCountry'],
		twilBody : params['Body']
	};
	if (paramExists(objTwilioReturnVals['twilSid'])) {
		// get concat ID Always Internal Twilio # first.
		var concatId = objTwilioReturnVals['twilTo'] + objTwilioReturnVals['twilFrom'];
		concatId = concatId.replace(/\+/g, "");
		objTwilioReturnVals['concatId'] = concatId;
	}
	else{
		// Return false if there's an error
		return false;
	}
	
	for (prop in objTwilioReturnVals) {
		nlapiLogExecution('DEBUG', prop, objTwilioReturnVals[prop]);
	}
	return objTwilioReturnVals;
}
/**
 * Create an Employee Notification Message Response record (customrecordr7employeenotificationmsgres) for the specific twilio response params.
 * @param {Object} objTwilioReturnVals
 */
function createEmpNotificationResponseRec(objTwilioReturnVals){
	var responseRec = nlapiCreateRecord('customrecordr7employeenotificationmsgres');
	responseRec.setFieldValue('custrecordr7employeeresponseto',objTwilioReturnVals['twilTo']);
	responseRec.setFieldValue('custrecordr7employeeresponsefrom',objTwilioReturnVals['twilFrom']);
	responseRec.setFieldValue('custrecordr7employeeresponsefromzip',objTwilioReturnVals['twilFromZip']);
	responseRec.setFieldValue('custrecordr7employeeresponsefromcity',objTwilioReturnVals['twilFromCity']);
	responseRec.setFieldValue('custrecordr7employeeresponsefromstate',objTwilioReturnVals['twilFromState']);
	responseRec.setFieldValue('custrecordr7employeeresponsefromcountry',objTwilioReturnVals['twilFromCountry']);
	responseRec.setFieldValue('custrecordr7employeeresponseconcatid',objTwilioReturnVals['concatId']);
	responseRec.setFieldValue('custrecordr7employeeresponseresponse',objTwilioReturnVals['twilBody']);
	
	/// Get Previous Message ID
	var sentENSMsgId = findConcatIdMatch(objTwilioReturnVals['concatId']);
	if (sentENSMsgId){
		nlapiLogExecution('DEBUG','previous id',sentENSMsgId);
		responseRec.setFieldValue('custrecordr7employeeresponsemessagesent',sentENSMsgId);
		conditionalResponse = true;
	}	
	var responseRecId = nlapiSubmitRecord(responseRec);
	return responseRecId;
}


// TODO Put a filter to check for messages older than X amout of time..Need to determine what the time is and what to do.
function findConcatIdMatch(concatId){
	var arrSearchFilters = new Array();
	arrSearchFilters[arrSearchFilters.length] = new nlobjSearchFilter('custrecordr7employeenotifyconcatid', null, 'is', concatId); // The concat ID of the sent matches the response
	arrSearchFilters[arrSearchFilters.length] = new nlobjSearchFilter('created', null, 'onorafter', 'weeksago1'); // The original message was sent more than a week ago
	
	var arrSearchColumns = new Array();
	arrSearchColumns[0] = new nlobjSearchColumn('created').setSort(true);
	
	var arrSearchResults = nlapiSearchRecord('customrecordr7employeenotificationmsgsnt', null, arrSearchFilters, arrSearchColumns);
	
	// If no results then there is no conversation
	if (arrSearchResults == null) {
		return false;
	}
	else {
		// else return the most recent matching customrecordr7employeenotificationmsgres record id
		return arrSearchResults[0].getId();
	}
}
