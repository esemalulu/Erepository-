
var MEETING_CANCELATION_TEXT = '';
MEETING_CANCELATION_TEXT += 'This meeting has been canceled. Please reach out to your Account Executive to reschedule.\n\n';
MEETING_CANCELATION_TEXT += 'Please call (617) 247-1717 if you require assistance.\n';
MEETING_CANCELATION_TEXT += 'Thank you and have a wonderful day!\n';


function beforeLoad(type, form, request){

	var context = nlapiGetContext();
	var userId = nlapiGetUser();

	if (type == 'create' && nlapiGetFieldValue('customform') == 48 && context.getExecutionContext() == 'userinterface' && request.getParameter('r7stick') != 'T') {
	
		var date = request.getParameter('date');
		var startTime = request.getParameter('time');
		var endTime = request.getParameter('endtime');
		var transaction = request.getParameter('transaction');
		var company = request.getParameter('company');
		var contact = request.getParameter('contact');
		var arrEmployees = new Array();
		
		/*
		 var attendeeCount = nlapiGetLineItemCount('attendee');
		 for (var i = 1; i <= attendeeCount; i++) {
		 arrEmployees[arrEmployees.length] = nlapiGetLineItemValue('attendee', 'attendee', i);
		 }
		 */
		var params = new Array();
		params['custparam_date'] = date;
		params['custparam_time'] = startTime;
		params['custparam_endtime'] = endTime;
		params['custparam_contact'] = contact;
		params['custparam_customer'] = company;
		params['custparam_opportunity'] = transaction;
		
		//params['custparam_employeelist'] = arrEmployees.join();
		
		nlapiSetRedirectURL('SUITELET', 'customscriptr7livemeetinglanding_suitele', 'customdeployr7livemeetinglanding_suitele', false, params);
		
	}
	
	if (type == 'view') {
	
		var currentStatus = nlapiGetFieldValue('status');
		var secSolRep = nlapiGetFieldValue('custeventr7eventsupportrep');
		var salesRep = nlapiGetFieldValue('custeventr7salesrepateventcreation');
		var organizer = nlapiGetFieldValue('organizer');
		
		form.setScript('customscript_windowopen_cs');
		
		var organizerIsInactive = 'F';
		if (organizer != null && organizer != '') {
			organizerIsInactive = nlapiLookupField('employee', organizer, 'isinactive');
		}
		
		if ((currentStatus != 'CANCELLED' && (userId == secSolRep || userId == salesRep || userId == organizer)) || organizerIsInactive == 'T' || userId == 55011) {
			var suiteletURL = nlapiResolveURL('SUITELET', 'customscriptr7lmupdateeventsuitelet', 'customdeployr7lmupdateeventsuitelet', false);
			var url = suiteletURL + '&custparam_eventid=' + nlapiGetRecordId();
			form.addButton('custpage_updateeventnotes', 'Update Event Information', "popUpWindow('" + url + "', '700','600');");
		}
		
	}
	
	//Execute the logic only when editing the record in the browser UI and using LiveMeeting form
	if ((type == 'edit' || type == 'create') && context.getExecutionContext() == 'userinterface' && nlapiGetFieldValue('customform') == 48) {
	
		try {
			form.getField('custeventr7eventcancellationreason').setMandatory(true);
			form.getField('custeventr7eventpartnercontactsinvolved').setDisplayType('hidden');
			var fldTempPartnerContacts = form.addField('custpage_partnercontactstemp', 'multiselect', 'Partner Contacts Involved');
			fldTempPartnerContacts.setDisplayType('normal');
			form.insertField(fldTempPartnerContacts, 'custeventr7eventpartnercontactsinvolved');
			
			sourcePartnerContacts(fldTempPartnerContacts, type);
		} 
		catch (e) {
			nlapiSendEmail(55011, 55011, 'Error on Temp Partner Field - EVENTS', 'Error: ' + e);
		}

	}
	
	if (type == 'view' && userId == 55011) {
		var recId = nlapiGetRecordId();
		form.addButton('custpage_deleteevent', 'Delete Event', "if (confirm('Are you sure you want to delete?')) nlapiDeleteRecord('calendarevent', " + recId + ");");
	}
	
}

function beforeSubmit(type){

	this.context = nlapiGetContext();
	this.recOld = nlapiGetOldRecord();
	
	if (recOld == null) {
		recOld = nlapiGetNewRecord();
	}
	
	if (type == 'create' || type == 'copy') {
		//This is needed for the ICS id. Every event should have one.
		nlapiSetFieldValue('custeventr7apimeetingid', getRandomString(12));
	}
	
	if (type == 'delete') {
	
		if (nlapiGetFieldValue('custeventr7lmeventtemplate') == 'T') {
			throw nlapiCreateError('NODELETE', 'Unable to delete. This event is used as a template for Live Meeting Events. Uncheck the Live Meeting Event Template field to allow deletion.', true);
		}
		else {
			nlapiLogExecution('AUDIT', 'Record Deleted', 'Title: ' + nlapiGetFieldValue('title') + '\nInternalId: ' + nlapiGetRecordId() + '\nDeleted by: ' + nlapiGetUser());
		}
	}
	
	//Execute the logic only when editing the record in the browser UI and using LiveMeeting form
	if ((type == 'edit' || type == 'create') && context.getExecutionContext() == 'userinterface' && nlapiGetFieldValue('customform') == 48) {
	
		try {
			var tempPartnerContact = nlapiGetFieldValue('custpage_partnercontactstemp');
			var currentPartnerContact = nlapiGetFieldValue('custeventr7eventpartnercontactsinvolved');
			
			if (tempPartnerContact != currentPartnerContact) {
			
				nlapiSetFieldValue('custeventr7eventpartnercontactsinvolved', tempPartnerContact);
			}
		} 
		catch (e) {
			nlapiSendEmail(55011, 55011, 'Error on Temp Partner Field - EVENTS BeforeSubmit', 'Error: ' + e);
		}
	}
	
	if (type != 'delete' && type != 'xedit') {
		if (nlapiGetFieldValue('custeventr7eventconfcalltype') == 3) { //none
			deleteExistingMeetingFromEvent(true, true);
		}
		else 
			if (nlapiGetFieldValue('custeventr7lmeventtemplate') != 'T' && !isThisOld()) {
				var isAvail = checkSecSolRepAvailability();
				if (!isAvail[0]) {
					throw nlapiCreateError('BOOKED', 'Security Solutions Rep is already booked at the selected time.\n\nConflicting Event: ' + isAvail[1]);
					
				}
				runWebConferenceIntegration();
			}
	}
	
	if (type == 'delete') {
		deleteExistingMeetingFromEvent(true, true);
	}
	
}

function afterSubmit(type){

	if (type == 'edit' || type == 'create') {
		blockOffConfBridges();
	}
}

function deleteExistingMeetingFromEvent(GoToMeetingDelete, bridgeDelete){

	if (GoToMeetingDelete) {
		var gtm_Organizer = recOld.getFieldValue('custeventr7gtmorganizer');
		var currentMeetingId = nlapiGetFieldValue('custeventr7gtmmeetingid');
		
		if (currentMeetingId != null && currentMeetingId != '') {
			var objMeeting = new meetingObject(gtm_Organizer, null, null, null, currentMeetingId);
			g2m_deleteMeeting(objMeeting);
			
		}

		nlapiSetFieldValue('custeventr7eventjoinurl', '');
		nlapiSetFieldValue('custeventr7gtmmeetingid', '');
		nlapiSetFieldValue('custeventr7gtmorganizer', '');
	}
	
	if (bridgeDelete) {
		nlapiSetFieldValue('custeventr7confbridgecode', '');
		nlapiSetFieldValue('custeventr7eventconfcallinfo', '');
	}
}

function runWebConferenceIntegration(){

	this.integrationSystemNotes = '';
	this.objChangeGroups = getFieldChangeGroups();
	
	var gtm_Organizer = nlapiGetFieldValue('custeventr7gtmorganizer');
	
	var currentMeetingId = nlapiGetFieldValue('custeventr7gtmmeetingid');
	var dtStart = new Date(nlapiGetFieldValue('startdate') + ' ' + nlapiGetFieldValue('starttime'));
	var dtEnd = new Date(nlapiGetFieldValue('startdate') + ' ' + nlapiGetFieldValue('endtime'));
	var title = nlapiGetFieldValue('title');
	var recurring = (nlapiGetFieldValue('_frequency') != 'NONE') ? true : false;
	
	this.objMeeting = new meetingObject(gtm_Organizer, title, dtStart, dtEnd, currentMeetingId, recurring);
	this.nowTimeStamp = objMeeting.nowtime;
	this.logTimeStamp = nlapiDateToString(new Date(), 'datetime');
	
	clearAttendeesList();
	persistAttendeesList();
	
	//If API MeetingID is null or empty create event
	if (nlapiGetFieldValue('status') != 'CANCELLED') {
		if (((nlapiGetFieldValue('custeventr7gtmmeetingid') == null || nlapiGetFieldValue('custeventr7gtmmeetingid') == '') && (nlapiGetFieldValue('custeventr7eventconfcalltype') == 1 || nlapiGetFieldValue('custeventr7eventconfcalltype') == 4)) ||
		((nlapiGetFieldValue('custeventr7confbridgecode') == null || nlapiGetFieldValue('custeventr7confbridgecode') == '') && nlapiGetFieldValue('custeventr7eventconfcalltype') == 2)) {
			//Create event and persist APIMeetingId and other details onto record
			createAPIEvent();
		}
		else 
			if (objChangeGroups.editFlag) {
				//else edit event and persist details from API Vendor onto record	
				editAPIEvent();
			}
	}
	else {
	
		deleteExistingMeetingFromEvent(true, true);
		
		if (objChangeGroups.cancellEvent) {
			sendCancellations();
		}
	}
	
	if (integrationSystemNotes != '' && integrationSystemNotes != null) {
		var currentNotes = nlapiGetFieldValue('custeventr7eventlivemeetingsysnotes');
		if (currentNotes != '' && currentNotes != null) {
			integrationSystemNotes = currentNotes + integrationSystemNotes;
		}
		nlapiSetFieldValue('custeventr7eventlivemeetingsysnotes', integrationSystemNotes);
		
	}
	nlapiSetFieldValue('sendemail', 'F');
}

function persistAttendeesList(){
	
	nlapiLogExecution('DEBUG','Attendee List',nlapiGetLineItemCount('attendee'));
	
	var presenterList = parsePresenterList(true);
	
	for(var i=0;presenterList!=null && i<presenterList.length;i++){
		nlapiLogExecution('DEBUG','Adding employee id',presenterList[i]);
		nlapiSelectNewLineItem('attendee');
		nlapiSetCurrentLineItemValue('attendee','attendee',presenterList[i]);
		nlapiSetCurrentLineItemValue('attendee','response','ACCEPTED');  
		nlapiSetCurrentLineItemValue('attendee','sendemail','F');
		nlapiCommitLineItem('attendee');   
	}
	
}

function sendCancellations(){
	
	nlapiLogExecution('DEBUG','In Send Cancellations','yup');
	
	//was told by presales to never send cancellations to customers, only internal cancellations should be sent
    var audienceList = parseAudienceList();
    var presenterList = parsePresenterList();
	var allAttendeeList = audienceList.concat(presenterList);
    
	var audienceInviteText = MEETING_CANCELATION_TEXT; 
	var presenterInviteText = MEETING_CANCELATION_TEXT;
   
    var icsInviteFileA = createICSInviteFileCancel(audienceInviteText, allAttendeeList, false);
    var icsInviteFileP = createICSInviteFileCancel(presenterInviteText, allAttendeeList, false);
	var icsInviteFileS = createICSInviteFileCancel(presenterInviteText, allAttendeeList, true);
	
    var organizer = nlapiGetFieldValue('organizer');
	var salesRep = nlapiGetFieldValue('custeventr7salesrepateventcreation'); 
	if (salesRep == null || salesRep == ''){
		salesRep = organizer;
	}
	var empInfo = emailForEmployeeId(salesRep);
    var salesRepEmail = empInfo[1];
	
    var subject = nlapiGetFieldValue('title');
	
	var sendToCustomer = nlapiGetFieldValue('custeventr7livemeetingsendcancellations');
    
	if (audienceInviteText != null && sendToCustomer == 'T') {
        for (var i = 0; audienceList != null && i < audienceList.length; i++) {
            nlapiLogExecution('DEBUG', 'Sending audience cancellation with ics files to', audienceList[i]);
            //nlapiSendEmail(salesRep, audienceList[i], subject + '', audienceInviteText, null, null, null, icsInviteFileA);
			var sent = customSendEmail(salesRep, audienceList[i], subject, audienceInviteText, null, null, icsInviteFileA);
			if (sent) {
				integrationSystemNotes += logTimeStamp + ': Sending cancellation email to ' + audienceList[i] + '<br>';
			}
        }
    }

     
    if (presenterInviteText != null) {
        for (var i = 0; presenterList != null && i < presenterList.length; i++) {
			
			var sent = false;
			if (salesRepEmail != null && presenterList[i] == salesRepEmail.toLowerCase()) {
				sent = customSendEmail(salesRep, presenterList[i], subject, presenterInviteText, null, null, icsInviteFileS);
			}
			else {
				sent = customSendEmail(salesRep, presenterList[i], subject, presenterInviteText, null, null, icsInviteFileP);
			}
			if (sent) {
				nlapiLogExecution('DEBUG', 'Sending presenter cancellation with ics files to', presenterList[i]);
				integrationSystemNotes += logTimeStamp + ': Sending cancellation email to ' + presenterList[i] + '<br>';
			}
		}
    }
}


function createICSInviteFileCancel(inviteText, attendees, salesRepICS){
	var subject = nlapiGetFieldValue('title');
   	var locationTextICS = nlapiGetFieldValue('custeventr7eventonsitelocation');
    
	if (locationTextICS==null || locationTextICS==''){
	locationTextICS = 'Live Meeting';
	}
    	    
	var organizer = nlapiGetFieldValue('organizer');
	var salesRep = nlapiGetFieldValue('custeventr7salesrepateventcreation'); 
	if (salesRep == null || salesRep == ''){
		salesRep = organizer;
	}
	var empInfo = emailForEmployeeId(salesRep);
	var organizerName = empInfo[0];
	var organizerEmail = empInfo[1];
    
	var sequenceId = nlapiGetFieldValue('custeventr7icssequenceid');
	
	var descriptionText = formatInviteText(inviteText) + '' ;
	
    var contents = "" +
    'BEGIN:VCALENDAR' +
    '\n' +
    'VERSION:2.0' + 
	'\n' + 
    'PRODID:-//RAPID7//NS MEETING INTG//EN' +
    '\n' +
    'METHOD:CANCEL' +
    '\n' +
    'BEGIN:VEVENT' +
    '\n' +
    'UID:' + nlapiGetFieldValue('custeventr7apimeetingid') + '@administration.rapid7.com' +
    '\n';
	
	contents += 'ATTENDEE;CUTYPE=INDIVIDUAL;ROLE=REQ-PARTICIPANT;PARTSTAT=ACCEPTED;CN=' + organizerName + ':mailto:' + organizerEmail + '\n';
	if (attendees != null) {
		for (var i = 0; i < attendees.length; i++) {
			if (attendees[i] != organizerEmail || true) {
				contents += 'ATTENDEE;CUTYPE=INDIVIDUAL;ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;RSVP=TRUE;CN=' + attendees[i] + ':mailto:' + attendees[i] + '\n';
			}
		}
	}
	
	contents += 
    'SEQUENCE:' + sequenceId  +
    '\n' +
    'LOCATION:' + locationTextICS +
	'\n';
    
	if (!salesRepICS){
		contents += 'ORGANIZER;CN=' + organizerName + ':MAILTO:' + organizerEmail;
	}
	else {
		contents += 'ORGANIZER;CN=NS Integration:MAILTO:nsintegration@rapid7.com';
	}
	
    contents +=  '\n' + 
	'DESCRIPTION:' + descriptionText + 
	'\n' + 
	'SUMMARY:' + subject + //descriptionText + 
	'\n' + 
    'DTSTART:' + objMeeting.icsstarttime +
    '\n' +
    'DTEND:' + objMeeting.icsendtime +
    '\n' +
    'DTSTAMP:' + nowTimeStamp +
    '\n' +
    'STATUS:CANCELLED' +
    '\n' +
    'BEGIN:VALARM' +
    '\n' +
    'ACTION:DISPLAY' +
	'\n' +
	'TRIGGER;RELATED=START:-PT15M' +
    '\n' +
    'END:VALARM' +
	'\n' +
    'END:VEVENT' +
    '\n' +
    'END:VCALENDAR' +
    '\n' +
    '';
    
    //var encodedContent = Base64.encode(contents);
    return contents;
	
}

function clearAttendeesList(){
	while (nlapiGetLineItemCount('attendee') >= 1) {
		nlapiRemoveLineItem('attendee', '1');
	}
}

function createAPIEvent(){

	nlapiLogExecution('DEBUG', 'Creating API Event', 'yup');
	
	var presenterCallInfo = '';
	var audienceCallInfo = '';
	var audienceDialInfo = '';
	var presenterDialInfo = '';
	
	if (nlapiGetFieldValue('custeventr7eventconfcalltype') == 1) {
		deleteExistingMeetingFromEvent(false, true);
		var objResponse = g2m_createMeeting(objMeeting);
		
		if (objResponse == null) {
			nlapiLogExecution('DEBUG', 'Response body null', 'yup');
			nlapiSendEmail(55011, 55011, 'GTM response body is null', nlapiGetFieldValue('organizer') + ': GTM probably did not get sent out. \n\n' + 'Event ID: ' + nlapiGetRecordId());
			integrationSystemNotes += logTimeStamp + ': Response body from Live Meeting is null<br>';
			return;
		}
		
		var joinURL = 'https://www.gotomeeting.com/join/' + objResponse.meetingid;
		//Persisting meeting Id
		if (objResponse.meetingid != null) {
			nlapiSetFieldValue('custeventr7gtmmeetingid', objResponse.meetingid + '');
			nlapiSetFieldValue('custeventr7eventconfcallinfo', objResponse.conferenceCallInfo);
			nlapiSetFieldValue('custeventr7eventjoinurl', joinURL);
			nlapiSetFieldValue('custeventr7gtmorganizer', objMeeting.employeeId);
			
			presenterCallInfo = objResponse.conferenceCallInfo;
			audienceCallInfo = presenterCallInfo;
			
			var arrNumbers = objResponse.conferenceCallInfo.split('\n');
			var conferenceNumber = getFirstNumber(arrNumbers);
			var accessCode = getAccessCode(arrNumbers);
			
			audienceDialInfo = conferenceNumber + ',,,' + accessCode;
			presenterDialInfo = audienceDialInfo;
		}
		else {
			throw nlapiCreateError('WEBCONF_ERR', 'The meeting was not created due to an unforeseen error.', true);
		}
	}
	else 
		if (nlapiGetFieldValue('custeventr7eventconfcalltype') == 2) {
			try {
				deleteExistingMeetingFromEvent(true, false);
				
				var currentBridge = nlapiGetFieldValue('custeventr7confbridgecode');
				var arrAvailableCode = null;
				
				if (currentBridge == null || currentBridge == '') {
					arrAvailableCode = grabConferenceBridge(nlapiGetFieldValue('custeventr7eventbridgeloc'));
					if (arrAvailableCode == null) {
						throw nlapiCreateError('ERROR', 'Could not find any available conference bridges.');
					}
				}
				else {
					arrAvailableCode = grabConferenceBridge(null, currentBridge);
					if (arrAvailableCode == null) {
						throw nlapiCreateError('ERROR', 'Could not find any available conference bridges.');
					}
				}
				
				nlapiSetFieldValue('custeventr7confbridgecode', arrAvailableCode[0]);
				nlapiSetFieldValue('custeventr7eventconfcallinfo', arrAvailableCode[2]);
				
				presenterCallInfo = arrAvailableCode[2];
				audienceCallInfo = arrAvailableCode[1];
				audienceDialInfo = arrAvailableCode[3] + ',,,' + arrAvailableCode[5];
				presenterDialInfo = arrAvailableCode[3] + ',,,' + arrAvailableCode[4];
				
			} 
			catch (e) {
				nlapiSendEmail(55011, 55011, 'Could not grab available bridge', 'location: ' + nlapiGetFieldValue('custeventr7eventbridgeloc') + '\nuser: ' + nlapiGetUser() + '\n\nError: ' + e);
				throw nlapiCreateError('ERROR', 'Could not find any available conference bridges.');
			}
			
		}
		else 
			if (nlapiGetFieldValue('custeventr7eventconfcalltype') == 4) { //GTM w/ Global Conferencing
				try {
					deleteExistingMeetingFromEvent(true, true);
					
					//Grab Bridge
					var currentBridge = nlapiGetFieldValue('custeventr7confbridgecode');
					var arrAvailableCode = null;
					
					if (currentBridge == null || currentBridge == '') {
						arrAvailableCode = grabConferenceBridge(nlapiGetFieldValue('custeventr7eventbridgeloc'));
						if (arrAvailableCode == null) {
							throw nlapiCreateError('ERROR', 'Could not find any available conference bridges.');
						}
					}
					else {
						arrAvailableCode = grabConferenceBridge(null, currentBridge);
						if (arrAvailableCode == null) {
							throw nlapiCreateError('ERROR', 'Could not find any available conference bridges.');
						}
					}
					
					nlapiSetFieldValue('custeventr7confbridgecode', arrAvailableCode[0]);
					nlapiSetFieldValue('custeventr7eventconfcallinfo', arrAvailableCode[2]);
					
					presenterCallInfo = arrAvailableCode[2];
					audienceCallInfo = arrAvailableCode[1];
					audienceDialInfo = arrAvailableCode[3] + ',,,' + arrAvailableCode[5];
					presenterDialInfo = arrAvailableCode[3] + ',,,' + arrAvailableCode[4];
					
					nlapiLogExecution('AUDIT', 'audienceCallInfo', myEscapeXML(audienceCallInfo));
				} 
				catch (e) {
					nlapiSendEmail(55011, 55011, 'Could not grab available bridge', 'location: ' + nlapiGetFieldValue('custeventr7eventbridgeloc') + '\nuser: ' + nlapiGetUser() + '\n\nError: ' + e);
					throw nlapiCreateError('ERROR', 'Could not find any available conference bridges.');
				}
				//Create Meeting
				var objResponse = g2m_createMeeting(objMeeting, myEscapeXML(audienceCallInfo));
				
				if (objResponse == null) {
					nlapiLogExecution('DEBUG', 'Response body null', 'yup');
					nlapiSendEmail(55011, 55011, 'GTM response body is null', nlapiGetFieldValue('organizer') + ': GTM probably did not get sent out. \n\n' + 'Event ID: ' + nlapiGetRecordId());
					integrationSystemNotes += logTimeStamp + ': Response body from Live Meeting is null<br>';
					return;
				}
				
				var joinURL = 'https://www.gotomeeting.com/join/' + objResponse.meetingid;
				//Persisting meeting Id
				if (objResponse.meetingid != null) {
					nlapiSetFieldValue('custeventr7gtmmeetingid', objResponse.meetingid + '');
					nlapiSetFieldValue('custeventr7eventjoinurl', joinURL);
					nlapiSetFieldValue('custeventr7gtmorganizer', objMeeting.employeeId);
				}
				else {
					throw nlapiCreateError('WEBCONF_ERR', 'The meeting was not created due to an unforeseen error.', true);
				}
			}
			else {
				deleteExistingMeetingFromEvent(true, true);
				return;
			}
	
	var sequenceId = nlapiGetFieldValue('custeventr7icssequenceid');
	if (sequenceId == null || sequenceId == '') {
		nlapiSetFieldValue('custeventr7icssequenceid', 0);
	}
	else {
		sequenceId = parseInt(sequenceId) + 1;
		nlapiSetFieldValue('custeventr7icssequenceid', sequenceId);
	}
	
	var presenterList = parsePresenterList();
	var audienceList = parseAudienceList();
	var allAttendeeList = audienceList.concat(presenterList);
	
	var addedMessage = nlapiGetFieldValue('custeventr7eventcustominvitationmessage');
	
	var audienceMeetingInfo = '';
	if (nlapiGetFieldValue('custeventr7eventconfcalltype') == 1 || nlapiGetFieldValue('custeventr7eventconfcalltype') == 4) { //goToMeeting
		audienceMeetingInfo += 'Please join the meeting.\n' + joinURL + "\n\n";
	}
	audienceMeetingInfo += 'Conference Call Information:\n' + audienceCallInfo + '\n\n';
	audienceMeetingInfo += 'Please call +1 (617) 247-1717 if you require assistance.  Thank you and have a wonderful day!' + '\n\n';
	
	var presenterMeetingInfo = '';
	if (nlapiGetFieldValue('custeventr7eventconfcalltype') == 1 || nlapiGetFieldValue('custeventr7eventconfcalltype') == 4) { //goToMeeting
		presenterMeetingInfo += 'Please join the meeting.\n' + joinURL + "\n\n";
	}
	presenterMeetingInfo += 'Conference Call Information:\n' + presenterCallInfo + '\n\n';
	presenterMeetingInfo += 'Please call +1 (617) 247-1717 if you require assistance.  Thank you and have a wonderful day!' + '\n\n';
	
	var audienceInviteText = audienceMeetingInfo + addedMessage + '\n\n';
	
	var presenterInviteText = presenterMeetingInfo + addedMessage + '\n\n';
	
	var organizer = nlapiGetFieldValue('organizer');
	var salesRep = nlapiGetFieldValue('custeventr7salesrepateventcreation');
	if (salesRep == null || salesRep == '') {
		salesRep = organizer;
	}
	var empInfo = emailForEmployeeId(salesRep);
	var salesRepEmail = empInfo[1];
	
	var icsInviteFileA = createICSInviteFile(audienceMeetingInfo, allAttendeeList, false, audienceDialInfo);
	var icsInviteFileP = createICSInviteFile(presenterMeetingInfo, allAttendeeList, false, presenterDialInfo);
	var icsInviteFileS = createICSInviteFile(presenterMeetingInfo, allAttendeeList, true, presenterDialInfo);
	
	var subject = nlapiGetFieldValue('title');
	if (audienceInviteText != null) {
		for (var i = 0; audienceList != null && i < audienceList.length; i++) {
			nlapiLogExecution('DEBUG', 'Sending audience invite with ics files to', audienceList[i]);
			//nlapiSendEmail(salesRep, audienceList[i], subject + '', audienceInviteText, null, null, null, icsInviteFileA);
			var sent = customSendEmail(salesRep, audienceList[i], subject, audienceInviteText, null, null, icsInviteFileA);
			if (sent) {
				integrationSystemNotes += logTimeStamp + ': Sending invite email to ' + audienceList[i] + '<br>';
			}
		}
	}
	
	if (presenterInviteText != null) {
		for (var i = 0; presenterList != null && i < presenterList.length; i++) {
		
			var sent = false;
			if (salesRepEmail != null && presenterList[i].toLowerCase() == salesRepEmail.toLowerCase()) {
				sent = customSendEmail(salesRep, presenterList[i], subject, presenterInviteText, null, null, icsInviteFileS);
			}
			else {
				sent = customSendEmail(salesRep, presenterList[i], subject, presenterInviteText, null, null, icsInviteFileP);
			}
			if (sent) {
				nlapiLogExecution('DEBUG', 'Sending presenter invite with ics files to', presenterList[i]);
				integrationSystemNotes += logTimeStamp + ': Sending invite email to ' + presenterList[i] + '<br>';
			}
		}
	}
}

function editAPIEvent(){

	nlapiLogExecution('DEBUG', 'Editing API Event', 'yup');
	
	var meetingId = '';
	var presenterCallInfo = '';
	var audienceCallInfo = '';
	var audienceDialInfo = '';
	var presenterDialInfo = '';
	
	if (nlapiGetFieldValue('custeventr7eventconfcalltype') == 1) {
		deleteExistingMeetingFromEvent(false, true);
		
		var oldGTMOrganizer = recOld.getFieldValue('custeventr7gtmorganizer');
		var newGTMOrganizer = objMeeting.employeeId;
		var objResponse = null;
		
		if (oldGTMOrganizer != newGTMOrganizer) {
			g2m_deleteMeeting(objMeeting, oldGTMOrganizer);
			nlapiSetFieldValue('custeventr7gtmmeetingid', '');
			nlapiSetFieldValue('custeventr7eventconfcallinfo', '');
			nlapiSetFieldValue('custeventr7eventjoinurl', '');
			nlapiSetFieldValue('custeventr7gtmorganizer', newGTMOrganizer);
			//Create GTM
			objResponse = g2m_createMeeting(objMeeting);
			meetingId = objResponse.meetingid;
			objMeeting.meetingid = meetingId;
			objChangeGroups.nonAudienceChange = true;
		}
		else {
			g2m_updateMeeting(objMeeting);
			objResponse = g2m_getMeeting(objMeeting);
			meetingId = objResponse.meetingId;
		}
		
		if (objResponse == null) {
			nlapiLogExecution('DEBUG', 'Response body null', 'yup');
			nlapiSendEmail(55011, 55011, 'GTM response body is null', nlapiGetFieldValue('organizer') + ': GTM probably did not get sent out. \n\n' + 'Event ID: ' + nlapiGetRecordId());
			integrationSystemNotes += logTimeStamp + ': Response body from Live Meeting is null<br>';
			return;
		}
		
		var joinURL = 'https://www.gotomeeting.com/join/' + meetingId;
		//Persisting meeting Id
		if (meetingId != null) {
			nlapiSetFieldValue('custeventr7gtmmeetingid', meetingId + '');
			nlapiSetFieldValue('custeventr7eventconfcallinfo', objResponse.conferenceCallInfo);
			nlapiSetFieldValue('custeventr7eventjoinurl', joinURL);
			nlapiSetFieldValue('custeventr7gtmorganizer', objMeeting.employeeId);
			
			presenterCallInfo = objResponse.conferenceCallInfo;
			audienceCallInfo = presenterCallInfo;
			
			var arrNumbers = objResponse.conferenceCallInfo.split('\n');
			var conferenceNumber = getFirstNumber(arrNumbers);
			var accessCode = getAccessCode(arrNumbers);
			
			audienceDialInfo = conferenceNumber + ',,,' + accessCode;
			presenterDialInfo = audienceDialInfo;
		}
		else {
			throw nlapiCreateError('WEBCONF_ERR', 'The meeting was not created due to an unforeseen error.', true);
		}
	}
	else 
		if (nlapiGetFieldValue('custeventr7eventconfcalltype') == 2) {
			try {
				deleteExistingMeetingFromEvent(true, false);
				
				var currentBridge = nlapiGetFieldValue('custeventr7confbridgecode');
				var arrAvailableCode = null;
				
				if (currentBridge == null || currentBridge == '') {
					arrAvailableCode = grabConferenceBridge(nlapiGetFieldValue('custeventr7eventbridgeloc'));
					if (arrAvailableCode == null) {
						throw nlapiCreateError('ERROR', 'Could not find any available conference bridges.');
					}
				}
				else {
					arrAvailableCode = grabConferenceBridge(null, currentBridge);
					if (arrAvailableCode == null) {
						throw nlapiCreateError('ERROR', 'Could not find any available conference bridges.');
					}
				}
				
				nlapiSetFieldValue('custeventr7confbridgecode', arrAvailableCode[0]);
				nlapiSetFieldValue('custeventr7eventconfcallinfo', arrAvailableCode[2]);
				
				presenterCallInfo = arrAvailableCode[2];
				audienceCallInfo = arrAvailableCode[1];
				audienceDialInfo = arrAvailableCode[3] + ',,,' + arrAvailableCode[5];
				presenterDialInfo = arrAvailableCode[3] + ',,,' + arrAvailableCode[4];
				
			} 
			catch (e) {
				nlapiSendEmail(55011, 55011, 'Could not grab available bridge', 'location: ' + nlapiGetFieldValue('custeventr7eventbridgeloc') + '\nuser: ' + nlapiGetUser() + '\n\nError: ' + e);
				throw nlapiCreateError('ERROR', 'Could not find any available conference bridges.');
			}
			
		}
		else 
			if (nlapiGetFieldValue('custeventr7eventconfcalltype') == 4) { //GTM w/ Global Conferencing
				try {
					//Grab Bridge
					var currentBridge = nlapiGetFieldValue('custeventr7confbridgecode');
					var arrAvailableCode = null;
					
					if (currentBridge == null || currentBridge == '') {
						arrAvailableCode = grabConferenceBridge(nlapiGetFieldValue('custeventr7eventbridgeloc'));
						if (arrAvailableCode == null) {
							throw nlapiCreateError('ERROR', 'Could not find any available conference bridges.');
						}
					}
					else {
						arrAvailableCode = grabConferenceBridge(null, currentBridge);
						if (arrAvailableCode == null) {
							throw nlapiCreateError('ERROR', 'Could not find any available conference bridges.');
						}
					}
					
					nlapiSetFieldValue('custeventr7confbridgecode', arrAvailableCode[0]);
					nlapiSetFieldValue('custeventr7eventconfcallinfo', arrAvailableCode[2]);
					
					presenterCallInfo = arrAvailableCode[2];
					audienceCallInfo = arrAvailableCode[1];
					audienceDialInfo = arrAvailableCode[3] + ',,,' + arrAvailableCode[5];
					presenterDialInfo = arrAvailableCode[3] + ',,,' + arrAvailableCode[4];
					
					nlapiLogExecution('AUDIT', 'audienceCallInfo', myEscapeXML(audienceCallInfo));
				} 
				catch (e) {
					nlapiSendEmail(55011, 55011, 'Could not grab available bridge', 'location: ' + nlapiGetFieldValue('custeventr7eventbridgeloc') + '\nuser: ' + nlapiGetUser() + '\n\nError: ' + e);
					throw nlapiCreateError('ERROR', 'Could not find any available conference bridges.');
				}
				//Create Meeting
				var oldGTMOrganizer = recOld.getFieldValue('custeventr7gtmorganizer');
				var newGTMOrganizer = objMeeting.employeeId;
				var objResponse = null;
				
				if (oldGTMOrganizer != newGTMOrganizer) {
					g2m_deleteMeeting(objMeeting, oldGTMOrganizer);
					nlapiSetFieldValue('custeventr7gtmmeetingid', '');
					nlapiSetFieldValue('custeventr7eventjoinurl', '');
					nlapiSetFieldValue('custeventr7gtmorganizer', newGTMOrganizer);
					//Create GTM
					objResponse = g2m_createMeeting(objMeeting, myEscapeXML(audienceCallInfo));
					meetingId = objResponse.meetingid;
					objMeeting.meetingid = meetingId;
					objChangeGroups.nonAudienceChange = true;
				}
				else {
					g2m_updateMeeting(objMeeting, myEscapeXML(audienceCallInfo));
					objResponse = g2m_getMeeting(objMeeting);
					meetingId = objResponse.meetingId;
				}
				
				if (objResponse == null) {
					nlapiLogExecution('DEBUG', 'Response body null', 'yup');
					nlapiSendEmail(55011, 55011, 'GTM response body is null', nlapiGetFieldValue('organizer') + ': GTM probably did not get sent out. \n\n' + 'Event ID: ' + nlapiGetRecordId());
					integrationSystemNotes += logTimeStamp + ': Response body from Live Meeting is null<br>';
					return;
				}
				
				var joinURL = 'https://www.gotomeeting.com/join/' + meetingId;
				//Persisting meeting Id
				if (meetingId != null) {
					nlapiSetFieldValue('custeventr7gtmmeetingid', meetingId + '');
					nlapiSetFieldValue('custeventr7eventjoinurl', joinURL);
					nlapiSetFieldValue('custeventr7gtmorganizer', objMeeting.employeeId);
				}
				else {
					throw nlapiCreateError('WEBCONF_ERR', 'The meeting was not created due to an unforeseen error.', true);
				}
			}
			else {
				deleteExistingMeetingFromEvent(true, true);
				return;
			}
	
	var sequenceId = nlapiGetFieldValue('custeventr7icssequenceid');
	if (sequenceId == null || sequenceId == '') {
		nlapiSetFieldValue('custeventr7icssequenceid', 0);
	}
	else {
		sequenceId = parseInt(sequenceId) + 1;
		nlapiSetFieldValue('custeventr7icssequenceid', sequenceId);
	}
	
	var presenterList = parsePresenterList();
	var addedRemovedPresenterLists = parseAddedRemoved(presenterList, parsePresenterList(false, true));
	var addedPresenterList = addedRemovedPresenterLists[0];
	var removedPresenterList = addedRemovedPresenterLists[1];
	
	var audienceList = parseAudienceList();
	var addedRemovedAudienceLists = parseAddedRemoved(audienceList, parseAudienceList(false, true));
	var addedAudienceList = addedRemovedAudienceLists[0];
	var removedAudienceList = addedRemovedAudienceLists[1];
	
	
	
	var addedMessage = nlapiGetFieldValue('custeventr7eventcustominvitationmessage');
	
	var audienceMeetingInfo = '';
	if (nlapiGetFieldValue('custeventr7eventconfcalltype') == 1 || nlapiGetFieldValue('custeventr7eventconfcalltype') == 4) { //goToMeeting
		audienceMeetingInfo += 'Please join the meeting.\n' + joinURL + "\n\n";
	}
	audienceMeetingInfo += 'Conference Call Information:\n' + audienceCallInfo + '\n\n';
	audienceMeetingInfo += 'Please call +1 (617) 247-1717 if you require assistance.  Thank you and have a wonderful day!' + '\n\n';
	
	var presenterMeetingInfo = '';
	if (nlapiGetFieldValue('custeventr7eventconfcalltype') == 1 || nlapiGetFieldValue('custeventr7eventconfcalltype') == 4) { //goToMeeting
		presenterMeetingInfo += 'Please join the meeting.\n' + joinURL + "\n\n";
	}
	presenterMeetingInfo += 'Conference Call Information:\n' + presenterCallInfo + '\n\n';
	presenterMeetingInfo += 'Please call +1 (617) 247-1717 if you require assistance.  Thank you and have a wonderful day!' + '\n\n';
	
	var audienceInviteText = audienceMeetingInfo + addedMessage + '\n\n';
	
	var presenterInviteText = presenterMeetingInfo + addedMessage + '\n\n';
	
	var organizer = nlapiGetFieldValue('organizer');
	var salesRep = nlapiGetFieldValue('custeventr7salesrepateventcreation');
	if (salesRep == null || salesRep == '') {
		salesRep = organizer;
	}
	var empInfo = emailForEmployeeId(salesRep);
	var salesRepEmail = empInfo[1];
	
	var subject = nlapiGetFieldValue('title');
	
	//The audience for ics files is determined by whether
	//the meeting was changed - email everybody
	//only invitees were changed - email added invitees
	
	if (objChangeGroups.nonAudienceChange) {
		//For non-audience edits send email invite to everybody
		nlapiLogExecution('DEBUG', 'Sending Email to Everybody', 'Meeting details were updated');
		icsAudienceList = audienceList;
		icsPresenterList = presenterList;
		
	}
	else 
		if (objChangeGroups.presenterChange) { //strictly people change
			nlapiLogExecution('DEBUG', 'Sending Email to Newly added attendees/presenter', 'Invitees were updated');
			icsAudienceList = addedAudienceList;
			icsPresenterList = addedPresenterList;
			
		}
	
	if (removedPresenterList != null) {
	
		for (var i = 0; i < removedPresenterList.length; i++) {
		
			var sent = false;
			if (salesRepEmail != null && removedPresenterList[i] == salesRepEmail.toLowerCase()) {
				var icsInviteFileCancelS = createICSInviteFileCancel(MEETING_CANCELATION_TEXT, removedPresenterList, true, presenterDialInfo);
				sent = customSendEmail(salesRep, removedPresenterList[i], subject, MEETING_CANCELATION_TEXT, null, null, icsInviteFileCancelS);
			}
			else {
				var icsInviteFileCancelP = createICSInviteFileCancel(MEETING_CANCELATION_TEXT, removedPresenterList, false, presenterDialInfo);
				sent = customSendEmail(salesRep, removedPresenterList[i], subject, MEETING_CANCELATION_TEXT, null, null, icsInviteFileCancelP);
			}
			if (sent) {
				nlapiLogExecution('DEBUG', 'Sending presenter cancellation with ics files to', removedPresenterList[i]);
				integrationSystemNotes += logTimeStamp + ': Sending cancellation email to ' + removedPresenterList[i] + '<br>';
			}
		}
	}
	
	var allAttendeeList = icsAudienceList.concat(icsPresenterList);
	
	var icsInviteFileA = createICSInviteFile(audienceMeetingInfo, allAttendeeList, false, audienceDialInfo);
	var icsInviteFileP = createICSInviteFile(presenterMeetingInfo, allAttendeeList, false, presenterDialInfo);
	var icsInviteFileS = createICSInviteFile(presenterMeetingInfo, allAttendeeList, true, presenterDialInfo);
	
	if (audienceInviteText != null) {
		for (var i = 0; icsAudienceList != null && i < icsAudienceList.length; i++) {
			nlapiLogExecution('DEBUG', 'Sending audience invite with ics files to', icsAudienceList[i]);
			var sent = customSendEmail(salesRep, icsAudienceList[i], subject, audienceInviteText, null, null, icsInviteFileA);
			if (sent) {
				integrationSystemNotes += logTimeStamp + ': Sending invite email to ' + icsAudienceList[i] + '<br>';
			}
		}
	}
	
	if (presenterInviteText != null) {
		for (var i = 0; icsPresenterList != null && i < icsPresenterList.length; i++) {
		
			var sent = false;
			if (salesRepEmail != null && icsPresenterList[i] == salesRepEmail.toLowerCase()) {
				sent = customSendEmail(salesRep, icsPresenterList[i], subject, presenterInviteText, null, null, icsInviteFileS);
			}
			else {
				sent = customSendEmail(salesRep, icsPresenterList[i], subject, presenterInviteText, null, null, icsInviteFileP);
			}
			if (sent) {
				nlapiLogExecution('DEBUG', 'Sending presenter invite with ics files to', icsPresenterList[i]);
				integrationSystemNotes += logTimeStamp + ': Sending invite email to ' + icsPresenterList[i] + '<br>';
			}
		}
	}
}

function parseAddedRemoved(newList, oldList){

	//PARSE ADDED
	var addedList = new Object()
	for (var i = 0; newList != null && i < newList.length; i++) {
		addedList[newList[i]] = 1;
	}
	
	for (var i = 0; oldList != null && i < oldList.length; i++) {
		if (addedList.hasOwnProperty(oldList[i])) {
			delete addedList[oldList[i]];
		}
	}
	
	var newlyAddedList = new Array();
	for (key in addedList) {
		newlyAddedList[newlyAddedList.length] = key;
	}
	//DONE PARSING ADDED
	
	//PARSE REMOVED
	var removeList = new Object();
	for (var i = 0; oldList != null && i < oldList.length; i++) {
		removeList[oldList[i]] = 1;
	}
	
	for (var i = 0; newList != null && i < newList.length; i++) {
		if (removeList.hasOwnProperty(newList[i])) {
			delete removeList[newList[i]];
		}
	}
	
	var newlyRemovedList = new Array();
	for (key in removeList) {
		newlyRemovedList[newlyRemovedList.length] = key;
	}
	//DONE PARSING REMOVED
	
	return new Array(newlyAddedList, newlyRemovedList);
	
}

function createICSInviteFile(inviteText, attendees, salesRepICS, locationDialInfo){

    var subject = nlapiGetFieldValue('title');
    var locationTextICS = nlapiGetFieldValue('custeventr7eventonsitelocation');
    
	if (locationTextICS == null || locationTextICS == '') {
		locationTextICS = locationDialInfo;
	}

	var organizer = nlapiGetFieldValue('organizer');
	var salesRep = nlapiGetFieldValue('custeventr7salesrepateventcreation'); 
	if (salesRep == null || salesRep == ''){
		salesRep = organizer;
	}
	var empInfo = emailForEmployeeId(salesRep);
	var organizerName = empInfo[0];
	var organizerEmail = empInfo[1];
		
	var descriptionText = formatInviteText(inviteText) + '' ;
	
    var contents = "" +

    'BEGIN:VCALENDAR' +
    '\n' +
    'VERSION:2.0' + 
	'\n' + 
    'PRODID:-//RAPID7//NS MEETING INTG//EN' +
    '\n' +
    'METHOD:REQUEST' +
    '\n' +
    'BEGIN:VEVENT' +
    '\n' +
    'UID:' + nlapiGetFieldValue('custeventr7apimeetingid') + '@administration.rapid7.com' +
    '\n';
	
	contents += 'ATTENDEE;CUTYPE=INDIVIDUAL;ROLE=REQ-PARTICIPANT;PARTSTAT=ACCEPTED;RSVP=FALSE;CN=' + organizerName + ':mailto:' + organizerEmail + '\n';
	if (attendees != null) {
		for (var i = 0; i < attendees.length; i++) {
			if (attendees[i] != organizerEmail) {
				contents += 'ATTENDEE;CUTYPE=INDIVIDUAL;ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;RSVP=TRUE;CN=' + attendees[i] + ':mailto:' + attendees[i] + '\n';
			}
		}
	}
	
	contents += 
    'SEQUENCE:' + nlapiGetFieldValue('custeventr7icssequenceid')  +
    '\n' +
    'LOCATION:' + locationTextICS +
	'\n';
	
	if (!salesRepICS){
		contents += 'ORGANIZER;CN=' + organizerName + ':MAILTO:' + organizerEmail;
	}
	else {
		contents += 'ORGANIZER;CN=NS Integration:MAILTO:nsintegration@rapid7.com';
	}
    
    contents += '\n' + 
	'DESCRIPTION:' + descriptionText + 
	'\n' + 
	'SUMMARY:' + subject + //descriptionText + 
	'\n' + 
    'DTSTART:' + objMeeting.icsstarttime +
    '\n' +
    'DTEND:' + objMeeting.icsendtime +
    '\n' +
    'DTSTAMP:' + nowTimeStamp +
    '\n' +
    'CREATED:' + nowTimeStamp +
    '\n' +
    'LAST-MODIFIED:' + nowTimeStamp +
    '\n' +
    'STATUS:CONFIRMED' +
    '\n' +
	'BEGIN:VALARM' +
    '\n' +
    'ACTION:DISPLAY' +
	'\n' +
	'TRIGGER;RELATED=START:-PT15M' +
    '\n' +
    'END:VALARM' +
	'\n' +
    'END:VEVENT' +
    '\n' +
    'END:VCALENDAR' +
    '\n' +
    '';


	var encodedContent = Base64.encode(contents);
    return contents;
}

function formatInviteText(inviteText){
	var originalText = inviteText;
	inviteText = encodeHtml(inviteText);
	
	var sampleText="DESCRIPTION;LANGUAGE=en-US:When: Wednesday\, July 27\, 2011 2:30 PM-3:00 PM";
	var separatorLength = sampleText.length;
	
	for(var i=separatorLength;inviteText!=null && i<inviteText.length;i=i+separatorLength){
		inviteText	= inviteText.substring(0,i) + "\n " + inviteText.substring(i);
	}
	var textContents = "Original Text:\n" + originalText + "\n\nFormatted Text:\n" + inviteText;
		
	return inviteText;
}

function encodeHtml(encodedHtml){
	if (encodedHtml != null) {
		encodedHtml = encodedHtml.replace(/(\r\n|\n|\r)/gm, "\\n");
	}
	return encodedHtml;
}

function myEscapeXML(str){
	if (str != null) {
		//https://conf.cfer.com/?&ac=2989075&an=8005032899&startview=gos&login=true
		str = str.replace(/"/g, '&quot;');
		str = str.replace(/'/g, "&apos;");
		str = str.replace(/</g, '&lt;');
		str = str.replace(/>/g, '&gt;');
		str = str.replace(/&/g, '&amp;');
	}
	return str;
}

function emailForEmployeeId(empId){
	
	var employeeValues = nlapiLookupField('employee', empId, new Array('firstname', 'lastname', 'email'));
	var empName = employeeValues['firstname'] + ' ' + employeeValues['lastname'];
	var empEmail = employeeValues['email'];

    return new Array(empName, empEmail);
}

function parseAudienceList(idOnly, oldList){

	var audienceList = new Array();
	
	var customerContacts = nlapiGetFieldValues('custeventr7eventcustomercontactsinvld');
	var partnerContacts = nlapiGetFieldValues('custeventr7eventpartnercontactsinvolved');
	
	if (oldList) {
		customerContacts = recOld.getFieldValues('custeventr7eventcustomercontactsinvld');
		partnerContacts = recOld.getFieldValues('custeventr7eventpartnercontactsinvolved');
	}
	
	if (customerContacts != null) {
		var list = customerContacts;
		for (var i = 0; list != null && i < list.length; i++) {
			audienceList[audienceList.length] = list[i];
		}
	}
	
	if (partnerContacts != null) {
		var partnerList = partnerContacts;
		for (var i = 0; partnerList != null && i < partnerList.length; i++) {
			audienceList[audienceList.length] = partnerList[i];
		}
	}
	
	if (idOnly) {
		swapForActive('contact', audienceList, 'internalid');
	}
	return swapForActive('contact', audienceList, 'email');
}

function parsePresenterList(idOnly, oldList){

	var presenterList = new Array();
	
	var secSolRep = nlapiGetFieldValue('custeventr7eventsupportrep');
	var gtm_Organizer = nlapiGetFieldValue('custeventr7gtmorganizer');
	var salesRep = nlapiGetFieldValue('custeventr7salesrepateventcreation');
	var organizer = nlapiGetFieldValue('organizer');
	var employeesInvolved = nlapiGetFieldValues('custeventr7eventemployeesinvolved');
	
	if (oldList) {
		secSolRep = recOld.getFieldValue('custeventr7eventsupportrep');
		gtm_Organizer = recOld.getFieldValue('custeventr7gtmorganizer');
		salesRep = recOld.getFieldValue('custeventr7salesrepateventcreation');
		organizer = recOld.getFieldValue('organizer');
		employeesInvolved = recOld.getFieldValues('custeventr7eventemployeesinvolved');
	}
	
	if (secSolRep != null && secSolRep != '') {
		presenterList[presenterList.length] = secSolRep;
	}
	
	if (gtm_Organizer != null && gtm_Organizer != '') {
		presenterList[presenterList.length] = gtm_Organizer;
	}
	
	if (salesRep != null && salesRep != '') {
		presenterList[presenterList.length] = salesRep;
	}
	
	if (organizer != null && organizer != '') {
		presenterList[presenterList.length] = organizer;
	}
	
	if (employeesInvolved != null && employeesInvolved != '') {
		for (var i = 0; i < employeesInvolved.length; i++) {
			presenterList[presenterList.length] = employeesInvolved[i];
		}
	}
	
	if (idOnly) {
		return swapForActive('employee', presenterList, 'internalid');
	}
	return swapForActive('employee', presenterList, 'email');
}

function swapForActive(recType, arrIds, field){

	var arrList = new Array();
	
	if (arrIds != null && arrIds.length > 0) {
		
		arrIds = unique(arrIds);
		
		var arrFilters = new Array();
		arrFilters[arrFilters.length] = new nlobjSearchFilter('isinactive', null, 'is', 'F');
		arrFilters[arrFilters.length] = new nlobjSearchFilter('internalid', null, 'anyof', arrIds);
					
		var arrColumns = new Array();
		arrColumns[0] = new nlobjSearchColumn('internalid');
		arrColumns[1] = new nlobjSearchColumn(field);
		
		var arrSearchResults = nlapiSearchRecord(recType, null, arrFilters, arrColumns);
		
		for (var i = 0; arrSearchResults != null && i < arrSearchResults.length; i++) {
		
			var fieldValue = arrSearchResults[i].getValue(arrColumns[1]);
			
			if (fieldValue != null && fieldValue != '') {
				fieldValue = fieldValue.toLowerCase();
			}
			else {
				fieldValue = '';
			}
			arrList[arrList.length] = fieldValue;
		}
	}
	
	return arrList;
}

function isActiveEmployee(empId){

	var isInactive = nlapiLookupField('employee', empId, 'isinactive');
	nlapiLogExecution('DEBUG','isActiveEmployee function', 'Employee: ' + empId + '\nisInactive: ' + isInactive);
	if (isInactive=='T'){
		return false;
	}
	return true;
}

function sourcePartnerContacts(fld, type){

	if (nlapiGetFieldValue('transaction') != null && nlapiGetFieldValue('transaction') != '') {
		
		var arrAllOptions = new Array();
		
		if (type != 'create') {
			var currentPartnerContacts = nlapiGetFieldValues('custeventr7eventpartnercontactsinvolved');

			for (var i = 0; currentPartnerContacts != null && i < currentPartnerContacts.length; i++) {
				arrAllOptions[currentPartnerContacts[i]] = nlapiLookupField('contact', currentPartnerContacts[i], 'entityid');
			}
		}
		
		var partnerCompanyId = nlapiLookupField('transaction', nlapiGetFieldValue('transaction'), 'partner');
		
		if (partnerCompanyId != null && partnerCompanyId != '') {
			var arrSearchFilters = new Array();
			arrSearchFilters[arrSearchFilters.length] = new nlobjSearchFilter('isinactive', null, 'is', 'F');
			arrSearchFilters[arrSearchFilters.length - 1].setLeftParens(1);
			arrSearchFilters[arrSearchFilters.length] = new nlobjSearchFilter('company', null, 'anyof', partnerCompanyId);
			arrSearchFilters[arrSearchFilters.length - 1].setOr(true);
			arrSearchFilters[arrSearchFilters.length] = new nlobjSearchFilter('internalid', 'partner', 'anyof', partnerCompanyId);
			arrSearchFilters[arrSearchFilters.length - 1].setRightParens(1);
			
			var arrSearchColumns = new Array();
			arrSearchColumns[0] = new nlobjSearchColumn('entityid').setSort();
			
			var arrSearchResults = nlapiSearchRecord('contact', null, arrSearchFilters, arrSearchColumns);

			for (var i = 0; arrSearchResults != null && i < arrSearchResults.length; i++) {
			
				var searchResult = arrSearchResults[i];
				var contactId = searchResult.getId();
				var contactName = searchResult.getValue(arrSearchColumns[0]);
				
				arrAllOptions[contactId] = contactName;
			}
						
			for (key in arrAllOptions) {
			
				fld.addSelectOption(key, arrAllOptions[key]);
			}
			
			fld.setDefaultValue(nlapiGetFieldValues('custeventr7eventpartnercontactsinvolved'));
		}
	}
}

function unique(a){
	a.sort();
	for (var i = 1; i < a.length;) {
		if (a[i - 1] == a[i]) {
			a.splice(i, 1);
		}
		else {
			i++;
		}
	}
	return a;
}

function isThisOld(){
		var stEndDate = nlapiGetFieldValue('startdate') + ' ' + nlapiGetFieldValue('endtime');
		var dtEndDate = nlapiStringToDate(stEndDate);
		var now = new Date();
		
		if (now > dtEndDate){
			return true;
		}
		
		return false;
}

function getRandomString(string_length){
    var chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    var randomstring = '';
    for (var i = 0; i < string_length; i++) {
        var rnum = Math.floor(Math.random() * chars.length);
        randomstring += chars.substring(rnum, rnum + 1);
    }
    return randomstring;
}

function getAccessCode(arrNumbers){
	var accessCode = '';
	for (var i = 0; arrNumbers != null && i < arrNumbers.length; i++) {
		if (arrNumbers[i] != null && arrNumbers[i].substr(0, 11) == 'Access Code') {
			var unFormattedAccessCode = arrNumbers[i].substr(arrNumbers[i].indexOf(':') + 2);
			accessCode = unFormattedAccessCode.replace(/\D/g, '');
		}
	}
	return accessCode;
}

function getFirstNumber(arrNumbers){
	var number = '';
	if (arrNumbers != null && arrNumbers.length > 0) {
		number = arrNumbers[0].substr(arrNumbers[0].indexOf(':') + 2);
	}
	
	return number;
}

function grabConferenceBridge(location, confBridgeId){

	var arrFilters = new Array();
	if (confBridgeId != null && confBridgeId != '') {
		arrFilters[arrFilters.length] = new nlobjSearchFilter('internalid', null, 'is', confBridgeId);
	}
	else {
		arrFilters[arrFilters.length] = new nlobjSearchFilter('isinactive', null, 'is', 'F');
		arrFilters[arrFilters.length] = new nlobjSearchFilter('custrecordcustrecordr7conflocation', null, 'is', location);
		arrFilters[arrFilters.length] = new nlobjSearchFilter('custrecordr7confbridgecodeavailable', null, 'is', 'T');
	}
	
	var arrColumns = new Array();
	arrColumns[0] = new nlobjSearchColumn('internalid');
	arrColumns[1] = new nlobjSearchColumn('custrecordr7confbridgecustomerfacingdesc');
	arrColumns[2] = new nlobjSearchColumn('custrecordr7confbridgeinternaldesc');
	arrColumns[3] = new nlobjSearchColumn('custrecordr7confbridgeconfnumber');
	arrColumns[4] = new nlobjSearchColumn('custrecordr7confbridgeleadercode');
	arrColumns[5] = new nlobjSearchColumn('custrecordr7confparticipantcode');
	
	var arrSearchResults = nlapiSearchRecord('customrecordr7conferencebridge', null, arrFilters, arrColumns);
	
	if (arrSearchResults != null) {
		
		var recBridge = nlapiLoadRecord('customrecordr7conferencebridge', arrSearchResults[0].getId());
		var id = arrSearchResults[0].getId();
		var externalDesc = recBridge.getFieldValue('custrecordr7confbridgecustomerfacingdesc');
		var internalDesc = recBridge.getFieldValue('custrecordr7confbridgeinternaldesc');
		var confNumber = recBridge.getFieldValue('custrecordr7confbridgeconfnumber');
		var leaderCode = recBridge.getFieldValue('custrecordr7confbridgeleadercode');
		var participantCode = recBridge.getFieldValue('custrecordr7confparticipantcode');
		
		return new Array(id, externalDesc, internalDesc, confNumber, leaderCode, participantCode);
	}
	
	return null;
}

function blockOffConfBridges(){

	var newConfCode = nlapiGetFieldValue('custeventr7confbridgecode');
	var startDate = nlapiStringToDate(nlapiGetFieldValue('startdate'));
	
	if (startDate >= nlapiAddDays(new Date(), -1)) {
		if (newConfCode != null && newConfCode != '') {
		
			var available = nlapiLookupField('customrecordr7conferencebridge', newConfCode, new Array('custrecordr7confbridgecodeavailable', 'custrecordr7conferencebridgeeventlink'));
			
			if (available['custrecordr7confbridgecodeavailable'] == 'F') {
				if (nlapiGetRecordId() != available['custrecordr7conferencebridgeeventlink'] && available['custrecordr7conferencebridgeeventlink'] != null && available['custrecordr7conferencebridgeeventlink'] != '') {
					throw nlapiCreateError("CONF_CODE_SELECTED", "Please select another conference bridge code. Another user just selected this code.", false);
				}
			}
			
			var setFields = new Array();
			setFields[0] = 'custrecordr7confbridgeeventinternalid';
			setFields[1] = 'custrecordr7confbridgecodeavailable';
			setFields[2] = 'custrecordr7conferencebridgeeventlink';
			setFields[3] = 'custrecordr7confbridgelastused';
			
			var setFieldValues = new Array();
			setFieldValues[0] = nlapiGetRecordId();
			setFieldValues[1] = 'F';
			setFieldValues[2] = nlapiGetRecordId();
			setFieldValues[3] = nlapiDateToString(new Date());
			
			nlapiSubmitField('customrecordr7conferencebridge', newConfCode, setFields, setFieldValues);
		}
		
		/*
		if (oldConfCode != null && oldConfCode != '' && oldConfCode != newConfCode) {
		
			var setFields = new Array();
			setFields[0] = 'custrecordr7confbridgeeventinternalid';
			setFields[1] = 'custrecordr7confbridgecodeavailable';
			setFields[2] = 'custrecordr7conferencebridgeeventlink';
			
			var setFieldValues = new Array();
			setFieldValues[0] = '';
			setFieldValues[1] = 'T';
			setFieldValues[2] = '';
			
			nlapiSubmitField('customrecordr7conferencebridge', oldConfCode, setFields, setFieldValues);
		}
		*/
	}
}

function checkSecSolRepAvailability(){

	var secSolRep = nlapiGetFieldValue('custeventr7eventsupportrep');
	var date = nlapiGetFieldValue('startdate');
	var startTime = nlapiGetFieldValue('starttime');
	var endTime = nlapiGetFieldValue('endtime');
	var status = nlapiGetFieldValue('status');
	
	if (status == 'COMPLETED' || status == 'CANCELLED') {
		return new Array(true, null);;
	}
	
	if (secSolRep != null && secSolRep != '' && date != null && date != '' && startTime != null && startTime != '' && endTime != null && endTime != '') {
	
		var dtStart = new Date(date + ' ' + startTime);
		var dtEnd = new Date(date + ' ' + endTime);
		
		var strStartUTC = getZTimestamp(dtStart);
		var strEndUTC = getZTimestamp(dtEnd);

		var params = new Array();
		params['custparam_internalid'] = nlapiGetRecordId();
		params['custparam_secsolrep'] = secSolRep;
		params['custparam_date'] = date;
		params['custparam_starttime'] = strStartUTC[1];
		params['custparam_endtime'] = strEndUTC[1];

		var response = nlapiRequestURL('https://663271.extforms.netsuite.com/app/site/hosting/scriptlet.nl?script=564&deploy=1&compid=663271&h=dd6bfa097fd37c5d37ff&time=' + Math.floor(Math.random() * 9999999), params);
		
		var isAvailable = response.getBody();
		
		if (isAvailable != 'T') {
			return new Array(false, isAvailable);
		}
	}
	
	return new Array(true, null);
	
}

function getChangedFields(arrAllFields){
	
	arrAllFields = unique(arrAllFields);
	
	var arrChangeFields = new Array();

	for (var i = 0; i < arrAllFields.length; i++) {
		var oldValue = recOld.getFieldValue(arrAllFields[i]);
		var newValue = nlapiGetFieldValue(arrAllFields[i]);
		
		if (oldValue == null){
			oldValue = '';
		}
		if (newValue == null){
			newValue = '';
		}
		
		if (oldValue != newValue) {
			arrChangeFields[arrAllFields[i]] = 1;
		} else {
			arrChangeFields[arrAllFields[i]] = 0;
		}
	}
	
	return arrChangeFields;
}

function getFieldChangeGroups(){

	var oldEvent = isThisOld();
	
	var objChangeGroups = new Object();
	objChangeGroups.cancellEvent = false;
	objChangeGroups.nonAudienceChange = false;
	objChangeGroups.presenterChange = false;
	objChangeGroups.editFlag = false;
	
	if (oldEvent) {
		return objChangeGroups;
	}
	
	//nonaudience fields
	var arrNonAudienceChangeFields = new Array();
	arrNonAudienceChangeFields[arrNonAudienceChangeFields.length] = 'starttime';
	arrNonAudienceChangeFields[arrNonAudienceChangeFields.length] = 'endtime';
	arrNonAudienceChangeFields[arrNonAudienceChangeFields.length] = 'startdate';
	arrNonAudienceChangeFields[arrNonAudienceChangeFields.length] = 'title';
	arrNonAudienceChangeFields[arrNonAudienceChangeFields.length] = 'status';
	arrNonAudienceChangeFields[arrNonAudienceChangeFields.length] = 'custeventr7eventcustominvitationmessage';
	arrNonAudienceChangeFields[arrNonAudienceChangeFields.length] = 'custeventr7eventonsitelocation';
	arrNonAudienceChangeFields[arrNonAudienceChangeFields.length] = 'custeventr7eventconfcalltype';
	
	//presenter fields
	var arrPresenterChangeFields = new Array();
	arrPresenterChangeFields[arrPresenterChangeFields.length] = 'custeventr7eventemployeesinvolved';
	arrPresenterChangeFields[arrPresenterChangeFields.length] = 'custeventr7eventcustomercontactsinvld';
	arrPresenterChangeFields[arrPresenterChangeFields.length] = 'custeventr7eventpartnercontactsinvolved';
	arrPresenterChangeFields[arrPresenterChangeFields.length] = 'organizer';
	arrPresenterChangeFields[arrPresenterChangeFields.length] = 'custeventr7eventsupportrep';
	arrPresenterChangeFields[arrPresenterChangeFields.length] = 'custeventr7gtmorganizer';
	arrPresenterChangeFields[arrPresenterChangeFields.length] = 'custeventr7salesrepateventcreation';
	
	var arrAllFields = arrNonAudienceChangeFields.concat(arrPresenterChangeFields);
	var arrChangedFields = getChangedFields(arrAllFields);
	
	for (var i = 0; i < arrNonAudienceChangeFields.length; i++) {
		if (arrChangedFields.hasOwnProperty(arrNonAudienceChangeFields[i])) {
			if (arrChangedFields[arrNonAudienceChangeFields[i]] == 1) {
				//SPECIAL STATUS LOGIC
				if (arrNonAudienceChangeFields[i] == 'status') {
					var oldStatus = recOld.getFieldValue('status');
					var newStatus = nlapiGetFieldValue('status');
					
					if (newStatus == 'CANCELLED') {
						objChangeGroups.cancellEvent = true;
					}
					else {
						if (newStatus != 'CANCELLED') {							
							if (oldStatus == 'CANCELLED') {
								objChangeGroups.nonAudienceChange = true;
								objChangeGroups.editFlag = true;
							}
						}
					}
				}
				else { //EVERYTHING ELSE
					objChangeGroups.nonAudienceChange = true;
					objChangeGroups.editFlag = true;
				}
			}
		}
	}
	
	for (var i = 0; i < arrPresenterChangeFields.length; i++) {
		if (arrChangedFields.hasOwnProperty(arrPresenterChangeFields[i])) {
			if (arrChangedFields[arrPresenterChangeFields[i]] == 1) {
				objChangeGroups.presenterChange = true;
				objChangeGroups.editFlag = true;
				break;
			}
		}
	}
	
	return objChangeGroups;
}
