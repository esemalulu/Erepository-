function testIt(){

	var meet = new meetingObject(55011, 'testy', new Date('8/24/2013 10:00 PM'), new Date('8/24/2013 11:00 PM'));
	var objExisting = g2m_getMeetingsByOrganizer(meet)
	var objmeet = g2m_createMeeting(meet);
	var updated = g2m_getMeeting(objmeet);
	var x = 0;
}

function meetingObject(gtm_organizer, subject, dtStart, dtEnd, meetingid, recurring, allDay){

	var organizerToken = '';
	var organizerKey = '';
	nlapiLogExecution('DEBUG', 'meetingObject', gtm_organizer);
	if (gtm_organizer != null && gtm_organizer != '') {
		var empFields = nlapiLookupField('employee', gtm_organizer, new Array('custentityr7empgtmaccesstoken', 'custentityr7empgtmorganizerkey'));
		organizerToken = empFields['custentityr7empgtmaccesstoken'];
		organizerKey = empFields['custentityr7empgtmorganizerkey'];
		if (organizerToken == null || organizerToken == '') {
			throw nlapiCreateError('PROBLEM', 'Organizer must authenticate GTM credentials.');
		}
	}
	
	var arrStartTimeStamps = getZTimestamp(dtStart, allDay);
	if (allDay == 'T') {
		dtEnd = nlapiAddDays(dtEnd, 1);
	}
	var arrEndTimeStamps = getZTimestamp(dtEnd, allDay);
	var arrNowTimeStamps = getZTimestamp(new Date());
	nlapiLogExecution('DEBUG', 'meetingObject', 'OrganizerToken = ' + organizerToken);
	this.employeeId = gtm_organizer;
	this.token = organizerToken;
	this.orgKey = organizerKey;
	this.meetingid = meetingid + '';
	this.subject = subject;
	this.nowtime = arrNowTimeStamps[0];
	this.starttime = arrStartTimeStamps[1];
	this.endtime = arrEndTimeStamps[1];
	this.icsstarttime = arrStartTimeStamps[0];
	this.icsendtime = arrEndTimeStamps[0];
	this.passwordrequired = 'false';
	this.timezonekey = '';
	this.conferencecallinfo = 'Hybrid';

	if (recurring) {
		this.meetingtype = 'Recurring';
	}
	else {
		this.meetingtype = 'Scheduled';
	}
}

function g2m_getGroups(){
	
	/*
	 * Documentation: https://developer.citrixonline.com/api/gotomeeting-rest-api/apimethod/get-groups
	 * API URL: https://api.getgo.com/G2M/rest/groups
	 */
	
	//Setting up URL              
	var url = 'https://api.getgo.com/G2M/rest/groups';

	var response = nlapiRequestURL(url, null, g2m_authHeaders(g2m_adminToken()), 'GET');
	
	if (response != null && response != '') {
		var body = response.getBody();
		
		if (body != null && body != '') {
			return JSON.parse(body);
		}
	}
	
	return null;
	
}

function g2m_adminToken(){

	var username = 'errol_fagone@rapid7.com';
	var password = '6MRvCHWTUpnow8d43';
	var apiKey = '659c993aa543ce376e392f57b6ae838d';
	
	var authURL = ' https://api.getgo.com/oauth/access_token?grant_type=password&user_id=' + username + '&password=' + password + '&client_id=' + apiKey;
	
	var authHeaders = new Array();
	authHeaders['Accept'] = 'application/json';
	authHeaders['Content-Type'] = 'application/json';
	
	var response = nlapiRequestURL(authURL, null, authHeaders);
	
	if (response != null && response != '') {
		var body = response.getBody();
		
		if (body != null && body != '') {
			var objResponse = JSON.parse(body);
			
			return objResponse.access_token;
		}
	}
	
	return null;
}

function g2m_authHeaders(token){

	//Setting up Headers 
	var authHeaders = new Array();
	authHeaders['Accept'] = 'application/json';
	authHeaders['Content-Type'] = 'application/json';
	authHeaders['Authorization'] = 'OAuth oauth_token=' + token;
	return authHeaders;
}

function g2m_deleteMeeting(objMeeting, gtm_organizer){

	/*
	 * Documentation: https://developer.citrixonline.com/api/gotomeeting-rest-api/apimethod/delete-meeting
	 * API URL:  https://api.getgo.com/G2M/rest/meetings/{meetingId}
	 *
	 * RESPONSE:
	 * HTTP/1.1 204 No Content
	 */
	//Setting up URL              
	var url = 'https://api.getgo.com/G2M/rest/meetings/' + objMeeting.meetingid;
	
	var tokenToUse = objMeeting.token;
	if (gtm_organizer != null && gtm_organizer != '') {
		var organizerToken = nlapiLookupField('employee', gtm_organizer, 'custentityr7empgtmaccesstoken');
		tokenToUse = organizerToken;
	}
	
	var response = nlapiRequestURL(url, null, g2m_authHeaders(tokenToUse), 'DELETE');
	
	if (response != null && response != '') {
		if (response.getCode() == 204) {
			return true;
		}
	}
	
	return false;

}

function g2m_startMeeting(meetingid, token){

	/*
	 * Documentation: https://developer.citrixonline.com/api/gotomeeting-rest-api/apimethod/start-meeting
	 * API URL:  https://api.getgo.com/G2M/rest/meetings/{meetingId}/start
	 * 
	 * RESPONSE:
	 * hostURL
	 */
	
	//Setting up URL              
	var url = 'https://api.getgo.com/G2M/rest/meetings/' + meetingid + '/start';

	var response = nlapiRequestURL(url, null, g2m_authHeaders(token), 'GET');
	
	if (response != null && response != '') {
		var body = response.getBody();
		
		if (body != null && body != '') {
			objStart = JSON.parse(body);
			return objStart.hostURL;
		}
	}
	
	throw nlapiCreateError('PROBLEM', 'Could not start GoToMeeting. Please contact Administrator.');
}

function g2m_createMeeting(objMeeting, conferenceCallDetails){

	/*
	 * Documentation: https://developer.citrixonline.com/api/gotomeeting-rest-api/apimethod/create-meeting
	 * API URL:  https://api.getgo.com/G2M/rest/meetings
	 *
	 *
	 REQUEST:
	 subject: A required string description of the meeting. Should not be longer then 100 characters.
	 starttime: A required iso8601 UTC string.
	 endtime: A required iso8601 UTC string.
	 passwordrequired: A required string controller whether or not the meeting will require a password; set to "true" or "false". (There is no way to set the password via the API, so normally this should be set to "false".)
	 conferencecallinfo:	A required string. Can be one of the following options; PSTN (PSTN only), Free (PSTN and VoIP), Hybrid, (PSTN and VoIP), Private (you provide numbers and access code), or VoIP (VoIP only). You may also enter plain text for numbers and access codes with a limit of 255 characters.
	 timezonekey: DEPRECATED. Must be provided and set to empty string "".
	 meetingtype: A required string: Immediate, Scheduled or Recurring
	 
	 RESPONSE:
	 [
	 	{
	 	"joinURL":"https:\/\/www3.gotomeeting.com\/join\/762836476",
		"maxParticipants":26,
		"uniqueMeetingId":200000000212521696,
		"conferenceCallInfo":"",
		"meetingid":762836476
		}
	 ]
	 
	 */
	//Setting up URL  
	
	/*
	var existingMeetings = g2m_getMeetingsByOrganizer(objMeeting);
	if (existingMeetings != null && existingMeetings.length > 0){
		throw nlapiCreateError('PROBLEM', 'Could not create GoToMeeting. An existing meeting was found: ' + existingMeetings[0].subject);
	}    
	*/        
	var url = 'https://api.getgo.com/G2M/rest/meetings';
	
	//Setting up Datainput
	var objReq = new Object();
	objReq.subject = objMeeting.subject;
	objReq.starttime = objMeeting.starttime;
	objReq.endtime = objMeeting.endtime;
	objReq.passwordrequired = objMeeting.passwordrequired;
	if (conferenceCallDetails != null && conferenceCallDetails != '') {
		objReq.conferencecallinfo = conferenceCallDetails;
	}
	else {
		objReq.conferencecallinfo = objMeeting.conferencecallinfo;
	}
	objReq.timezonekey = '';
	objReq.meetingtype = objMeeting.meetingtype;
	
	
	//Stringifying JSON
	var myJSONText = JSON.stringify(objReq);
	
	var response = nlapiRequestURL(url, myJSONText, g2m_authHeaders(objMeeting.token), 'POST');
	
	if (response != null && response != '') {
		var body = response.getBody();
		nlapiLogExecution('DEBUG', 'Response body', body);
		if (body != null && body != '') {
			var objResp = JSON.parse(body);
			
			if (objResp[0] != null) {
				return objResp[0];
			}
			if (objResp.int_err_code != null && objResp.int_err_code != '') {
				throw nlapiCreateError('PROBLEM', objResp.int_err_code + '\n' + objResp.msg + '\n\n' + myJSONText);
			}
			if (objResp.err != null && objResp.err != '') {
				throw nlapiCreateError('PROBLEM', objResp.err + '\n' + objResp.message + '\n\n' + myJSONText);
			}
		}
	}
	nlapiLogExecution('ERROR', 'Could not create GoToMeeting. - url', url);
	nlapiLogExecution('ERROR', 'Could not create GoToMeeting. - response body', response.getBody());
	nlapiLogExecution('ERROR', 'Could not create GoToMeeting. - myJSONText', myJSONText);
	throw nlapiCreateError('PROBLEM', 'Could not create GoToMeeting. Please contact Administrator.');
}

function g2m_getMeetingsByOrganizer(objMeeting){

	/*
	 * Documentation: https://developer.citrixonline.com/api/gotomeeting-rest-api/apimethod/get-meetings-organizer
	 * API URL: https://api.getgo.com/G2M/rest/organizers/{organizerKey}/meetings
	 *
	 *
	 REQUEST:
	 GET 
	https://api.getgo.com/G2M/rest/organizers/12345/meetings?history=true&amp;startDate=2012-06-01T09:00:00Z&amp;endDate=2012-06-26T09:00:00Z
	HTTP 1.1
	Accept: application/json
	Content-type: application/json
	Authorization: OAuth oauth_token=1234567890
	 
	 RESPONSE:
	 [{"organizerkey":3000000000009,
	"firstName":"Laine",
	"lastName":"Somebody",
	"email":"laine@somewhere.com",
	"groupName":"Admins for East Coast",
	"meetingInstanceKey":0,
	"meetingId":"331-536-871",
	"subject":"Meet Now",
	"meetingType":"Scheduled",
	"duration":155,
	"startTime":"06\/14\/2012 11:14:43",
	"endTime":"06\/14\/2012 13:49:58",
	"conferenceCallInfo":"Australia: +61 2 9037 1944\nCanada: +1 (647) 977-5956\nUnited Kingdom: +44 (0) 207 151 1850\nIreland: +353 (0) 15 290 180\nUnited States: +1 (773) 945-1031\nAccess Code: 111-952-374",
	"numAttendees":7}]
	 
	 */
	//Setting up URL              
	var url = 'https://api.getgo.com/G2M/rest/organizers/' +  objMeeting.orgKey + '/meetings';
	
	//Setting up Datainput
	//url += '?scheduled=true';
	url += '?history=true';
	url += '&startDate=' + objMeeting.starttime;
	url += '&endDate=' + objMeeting.endtime;

	var response = nlapiRequestURL(url, null, g2m_authHeaders(g2m_adminToken()), 'GET');
	
	if (response != null && response != '') {
		var body = response.getBody();
		
		if (body != null && body != '') {
			var objResp = JSON.parse(body);

			if (objResp != null && objResp.int_err_code != null && objResp.int_err_code != '') {
				throw nlapiCreateError('PROBLEM', 'Could not get meeting details:\n' + objResp.int_err_code + '\n' + objResp.msg);
			}
			
			if (objResp != null) {
				return objResp;
			}
		}
	}
	
	throw nlapiCreateError('PROBLEM', 'Could not get meeting details GoToMeeting. Please contact Administrator.');
}

function g2m_updateMeeting(objMeeting, conferenceCallDetails){

	/*
	 * Documentation: https://developer.citrixonline.com/api/gotomeeting-rest-api/apimethod/update-meeting
	 * API URL: https://api.getgo.com/G2M/rest/meetings/{meetingId}
	 *
	 *
	 subject: A required string description of the meeting. Should not be longer then 100 characters.
	 starttime: A required iso8601 UTC string.
	 endtime: A required iso8601 UTC string.
	 passwordrequired: A required string controller whether or not the meeting will require a password; set to "true" or "false". (There is no way to set the password via the API, so normally this should be set to "false".)
	 conferencecallinfo:	A required string. Can be one of the following options; PSTN (PSTN only), Free (PSTN and VoIP), Hybrid, (PSTN and VoIP), Private (you provide numbers and access code), or VoIP (VoIP only). You may also enter plain text for numbers and access codes with a limit of 255 characters.
	 timezonekey: DEPRECATED. Must be provided and set to empty string "".
	 meetingtype: A required string: Immediate, Scheduled or Recurring
	 uniquemeetinginstance: The unique meeting instance when the meeting is recurring.
	 
	 RESPONSE:
	 HTTP/1.1 204 No Content
	 
	 */
	/*
	var existingMeetings = g2m_getMeetingsByOrganizer(objMeeting);
	for (var i = 0; existingMeetings != null && i < existingMeetings.length; i++) {
		var existingId = existingMeetings[i].meetingId;
		existingId = existingId.replace(/\D/g, '');
		
		if (existingId != objMeeting.meetingid) {
			throw nlapiCreateError('PROBLEM', 'Could not create GoToMeeting. An existing meeting was found. ' + existingMeetings[i].subject);
		}
	}
	*/
	//Setting up URL              
	var url = 'https://api.getgo.com/G2M/rest/meetings/' + objMeeting.meetingid;
	
	//Setting up Datainput
	var objReq = new Object();
	objReq.subject = objMeeting.subject;
	objReq.starttime = objMeeting.starttime;
	objReq.endtime = objMeeting.endtime;
	objReq.passwordrequired = objMeeting.passwordrequired;
	if (conferenceCallDetails != null && conferenceCallDetails != '') {
		objReq.conferencecallinfo = conferenceCallDetails;
	}
	else {
		objReq.conferencecallinfo = objMeeting.conferencecallinfo;
	}
	objReq.timezonekey = '';
	objReq.meetingtype = objMeeting.meetingtype;
	
	//Stringifying JSON
	var myJSONText = JSON.stringify(objReq);
	
	var response = nlapiRequestURL(url, myJSONText, g2m_authHeaders(objMeeting.token), 'PUT');
	
	if (response != null && response != '') {
		if (response.getCode() == 204) {
			return true;
		}
		var body = response.getBody();
		
		if (body != null && body != '') {
			var objResp = JSON.parse(body);
			nlapiLogExecution('ERROR', 'Could not update GoToMeeting.', response.getBody());
			throw nlapiCreateError('PROBLEM', 'Could not update GoToMeeting. Please contact Administrator (a).\n\n' + objResp.int_err_code + '\n' + objResp.msg);
		}
	}
	nlapiLogExecution('ERROR', 'Could not update GoToMeeting. - url', url);
	nlapiLogExecution('ERROR', 'Could not update GoToMeeting. - response body', response.getBody());
	nlapiLogExecution('ERROR', 'Could not update GoToMeeting. - myJSONText', myJSONText);
	throw nlapiCreateError('PROBLEM', 'Could not update GoToMeeting. Please contact Administrator (b).');
}

function g2m_getMeeting(objMeeting){

	/*
	 * Documentation: https://developer.citrixonline.com/api/gotomeeting-rest-api/apimethod/get-meeting
	 * API URL: https://api.getgo.com/G2M/rest/meetings/{meetingId}
	 *
	 *
	 REQUEST:
	 GET 
	https://api.getgo.com/G2M/rest/meetings/123456789 
	HTTP 1.1
	Accept: application/json
	Content-type:application/json
	Authorization: OAuth oauth_token=54321
	 
	 RESPONSE:
	 [{"createTime":"2012-06-25T22:10:46.+0000",
	"status":"INACTIVE",
	"subject":"test",
	"startTime":"2012-12-01T09:00:00.+0000",
	"conferenceCallInfo":"Australia: +61 2 9037 1944\nCanada: +1 (647) 977-5956\nUnited Kingdom: +44 (0) 207 151 1850\nIreland: +353 (0) 15 290 180\nUnited States: +1 (773) 945-1031\nAccess Code: 111-952-374",
	"passwordRequired":"false",
	"meetingType":"Scheduled",
	"maxParticipants":26,
	"endTime":"2012-12-01T10:00:00.+0000",
	"uniqueMeetingId":1230000000456789,
	"meetingId":123456789}]
	 
	 */
	//Setting up URL              
	var url = 'https://api.getgo.com/G2M/rest/meetings/' + objMeeting.meetingid;

	var response = nlapiRequestURL(url, null, g2m_authHeaders(objMeeting.token), 'GET');
	
	if (response != null && response != '') {
		var body = response.getBody();
		
		if (body != null && body != '') {
			var objResp = JSON.parse(body);
			if (objResp.int_err_code == null || objResp.int_err_code == '') {
				return objResp[0];
			}
			throw nlapiCreateError('PROBLEM', objResp.int_err_code + '\n' + objResp.msg);
		}
	}
	
	throw nlapiCreateError('PROBLEM', 'Could not get meeting details GoToMeeting. Please contact Administrator.');
}

function g2m_getOrganizerByEmail(email){

	/*
	 * Documentation: https://developer.citrixonline.com/api/gotomeeting-rest-api/apimethod/get-organizer-email
	 * API URL: https://api.getgo.com/G2M/rest/organizers?email={organizer_email}
	 *
	 *
	 REQUEST:
	 GET 
	 https://api.getgo.com/G2M/rest/organizers?email=test-1@test.com
	 HTTP 1.1 
	 Accept: application/json 
	 Content-type:application/json
	 Authorization: OAuth oauth_token=1234567890
	 
	 RESPONSE:
	 HTTP/1.1 200 OK 
	Content-Type: application/json   
	{"organizerkey":123456,    
	"groupkey":789,    
	"email":"test-1@test.com",    
	"firstname":"first-1",    
	"lastname":"last-1",    
	"groupname":"testgroup",    
	"status":"active",    
	"maxnumattendeesallowed":25}
	 
	 */
	//Setting up URL              
	var url = 'https://api.getgo.com/G2M/rest/organizers?email=' + email;

	var response = nlapiRequestURL(url, null, g2m_authHeaders(g2m_adminToken()), 'GET');
	
	if (response != null && response != '') {
		var body = response.getBody();
		
		if (body != null && body != '') {
			var objResp = JSON.parse(body);
			if (objResp.int_err_code == null || objResp.int_err_code == '') {
				return objResp;
			}
			throw nlapiCreateError('PROBLEM', objResp.int_err_code + '\n' + objResp.msg);
		}
	}
	
	throw nlapiCreateError('PROBLEM', 'Could not get organizer by email GoToMeeting. Please contact Administrator.');
}

function g2m_createOrganizer(employeeId){

	/*
	 * Documentation: https://developer.citrixonline.com/api/gotomeeting-rest-api/apimethod/create-organizer
	 * API URL: https://api.getgo.com/G2M/rest/groups/{groupKey}/organizers
	 *
	 *
	 REQUEST:
	 POST 
	https://api.getgo.com/G2M/rest/groups/20000023/organizers 
	HTTP 1.1 
	Accept: application/json 
	Content-type:application/json
	Authorization: OAuth oauth_token=1234567890
	{"organizerEmail":"test@test.com", 
	"productType":"g2m"}
	 
	 RESPONSE:
	 HTTP/1.1 201 Created Content-Type: application/json   66777899
	 
	 */
	//Setting up URL              
	var url = 'https://api.getgo.com/G2M/rest/organizers?email=' + email;

	var response = nlapiRequestURL(url, null, g2m_authHeaders(g2m_adminToken()), 'GET');
	
	if (response != null && response != '') {
		var body = response.getBody();
		
		if (body != null && body != '') {
			var objResp = JSON.parse(body);
			if (objResp.int_err_code != null && objResp.int_err_code != '') {
				return null;
			}
			return objResp;
		}
	}
	
	throw nlapiCreateError('PROBLEM', 'Could not get organizer by email GoToMeeting. Please contact Administrator.');
}

function g2m_retrieveAccessToken(code){

	/*
	 * Documentation: https://developer.citrixonline.com/api/gotomeeting-rest-api/apimethod/create-organizer
	 * API URL: https://api.getgo.com/oauth/access_token?grant_type=authorization_code&amp;code={responseKey}&amp;client_id={api_key}
	 *
	 *
	 RESPONSE:
	 HTTP/1.1 201 Created Content-Type: application/json   66777899
	 
	 {
	 "access_token":"1234567890",
	 "expires_in":"30758399",
	 "refresh_token":"7ae3a10234234161914ec65b8db6650c",
	 "organizer_key":"2000000000003345",
	 "account_key":"200000000000002211",
	 "account_type":"corporate"
	 }
	 */
	var apiKey = 'Vcebqkhz4R2P2fN3ljWPUsSF3jQdCyGx';
	
	var url = 'https://api.getgo.com/oauth/access_token?grant_type=authorization_code&code=' + code + '&client_id=' + apiKey;
	
	var response = nlapiRequestURL(url, null, null, 'GET');
	
	if (response == null || response == '' || response.getCode() != 200) {
		throw nlapiCreateError('PROBLEM', 'Could not get user Access Token GoToMeeting. Please contact Administrator.');
	}
	
	var body = response.getBody();
	
	if (body != null && body != '') {
		var objResp = JSON.parse(body);
		return objResp;
	}
	
}


function getZTimestamp(dateObject, allDay){
	//20110614T163817Z

	if (dateObject == null || dateObject == '' || dateObject == 'Invalid Date') {
		return new Array(null, null);
	}
	nlapiLogExecution('DEBUG', 'dateObject', dateObject);
	var arrOffsets = findTzOffset(dateObject, true);
	var offsetHours = arrOffsets[0];
	var offsetMinutes = arrOffsets[1];
	
	var year = dateObject.getFullYear();
	var month = dateObject.getMonth();
	var date = dateObject.getDate();
	var hours = 0;
	var minutes = 0;
	if (allDay != 'T') {
		hours = dateObject.getHours() - offsetHours;
		minutes = dateObject.getMinutes() - offsetMinutes;
	}
	
	var newDateObjectISO = new Date(Date.UTC(year, month, date, hours, minutes));
	var newDateObjectICS = new Date(year, month, date, hours, minutes);
	
	year = newDateObjectICS.getFullYear();
	month = newDateObjectICS.getMonth() + 1;
	date = newDateObjectICS.getDate();
	hours = newDateObjectICS.getHours();
	minutes = newDateObjectICS.getMinutes();
	
	var icsTimeStamp = add0s(year, 4) + '' + add0s(month, 2) + add0s(date, 2) + 'T' + add0s(hours, 2) + add0s(minutes, 2) + '00';
	if (allDay != 'T') {
		icsTimeStamp += 'Z';
	}
	nlapiLogExecution('DEBUG', 'newDateObjectISO', newDateObjectISO);
	var isoTimeStamp = newDateObjectISO.toISOString();
	var utcString = newDateObjectISO.toUTCString();
	
	return new Array(icsTimeStamp, isoTimeStamp, utcString);
}

function findTzOffset(dateObject){

	var userTZ = nlapiGetContext().getSetting('PREFERENCE', 'TIMEZONE');
	
	var arrSearchFilters = new Array();
	arrSearchFilters[0] = new nlobjSearchFilter('name', null, 'is', userTZ);
	
	var arrSearchColumns = new Array();
	arrSearchColumns[0] = new nlobjSearchColumn('custrecordr7tzdbstandardtimehours');
	arrSearchColumns[1] = new nlobjSearchColumn('custrecordr7tzdbstandardtimeminutes');
	arrSearchColumns[2] = new nlobjSearchColumn('custrecordr7tzdbsummertimehours');
	arrSearchColumns[3] = new nlobjSearchColumn('custrecordr7tzdbsummertimeminutes');
	
	var arrSearchResults = nlapiSearchRecord('customrecordr7tzdatabase', null, arrSearchFilters, arrSearchColumns);
	
	if (arrSearchResults != null) {
		var standardHours = arrSearchResults[0].getValue(arrSearchColumns[0]);
		var standardMinutes = arrSearchResults[0].getValue(arrSearchColumns[1]);
		var summerHours = arrSearchResults[0].getValue(arrSearchColumns[2]);
		var summerMinutes = arrSearchResults[0].getValue(arrSearchColumns[3]);
	}
	else {
		return 0;
	}
	
	if (isSummerTime(dateObject)) {
		return new Array(parseFloat(summerHours), parseFloat(summerMinutes));
	}
	else {
		return new Array(parseFloat(standardHours), parseFloat(standardMinutes));
	}
	
}

function isSummerTime(dateObject){

	//this is assuming that NS datacenters stay in SanFran
	var PSTOffset = 8;
	//var currentOffset = (new Date().getTimezoneOffset()) / (60);
	var meetingDateOffset = (dateObject.getTimezoneOffset()) / (60);
	var daylightSavingsOffset = PSTOffset - meetingDateOffset;
	
	nlapiLogExecution('DEBUG', 'Daylight saving subtraction', daylightSavingsOffset);
	
	if (daylightSavingsOffset == 1) {
		return true;
	}
	else {
		return false;
	}
	
}

function add0s(txt, digit){
	
    txt = txt + '';
    for (var i = txt.length; i < digit; i++) {
        txt = "0" + txt;
    }
    return txt;
}