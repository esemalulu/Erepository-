/*
 * @author efagone
 */

function zc_data_Suitelet(request, response){

	nlapiLogExecution('DEBUG', 'HIT', 'OUCH');
	var parameters = request.getAllParameters();
	var headers = request.getAllHeaders();
	//Values for headers, parameters
	var logHeaderParams = '\n--------------------\nHEADERS:\n--------------------\n';
	for (head in headers) {
		logHeaderParams += head + ': ' + headers[head] + '\n';
	}
	
	logHeaderParams += '\n--------------------\nPARAMS:\n--------------------\n';
	for (param in parameters) {
		logHeaderParams += param + ': ' + parameters[param] + '\n';
	}
	nlapiLogExecution('AUDIT', 'Parameters/Headers', logHeaderParams + '\n\n\n\nBODY:\n' + request.getBody());
	
	var cmd = request.getParameter('cmd');
	var objResponse = {};
	switch (request.getMethod()) {
	
		case 'GET':
			if (cmd == 'getAttendees') {
				var objValidation = validateAttendeeSID(request.getParameter('co_id'), request.getParameter('attendee_sid'), request.getParameter('event_sid'));
				if (!objValidation.success) {
					nlapiLogExecution('ERROR', objValidation.err_code, objValidation.error);
					
					objValidation.contact_id = null;

				}
				objResponse = getAttendees(objValidation.contact_id, request.getParameter('event_sid'));
				break;
			}
			
			break;
			
		case 'POST':
			var json = request.getBody();
			var objRequest = {};
			if (!isBlank(json)) {
				objRequest = JSON.parse(json);
			}
			if (objRequest.action == 'remove') {
				break;
			}
			if (objRequest.action == 'edit' || objRequest.action == 'create') {
				objResponse = updateAttendee(objRequest, cmd);
				break;
			}
			break;
	}
	
	nlapiLogExecution('AUDIT', 'Response', JSON.stringify(objResponse));
	response.setContentType('JSON');
	response.write(JSON.stringify(objResponse));
	return;
	
}

function updateAttendee(objRequest, cmd){

	var data = objRequest.data;
	if (isBlank(data.firstname)) {
		return {
			fieldErrors: [{
				name: "firstname",
				status: "Please specify a first name."
			}]
		};
	}
	
	if (isBlank(data.lastname)) {
		return {
			fieldErrors: [{
				name: "lastname",
				status: "Please specify a last name."
			}]
		};
	}
	
	if (isBlank(data.title)) {
		return {
			fieldErrors: [{
				name: "title",
				status: "Please specify a job title."
			}]
		};
	}
	
	if (isBlank(data.email)) {
		return {
			fieldErrors: [{
				name: "email",
				status: "Please specify an email address."
			}]
		};
	}
	
	if (isBlank(data.phone) && isBlank(data.mobile)) {
		return {
			fieldErrors: [{
				name: "firstname",
				status: "Please specify a phone number."
			}]
		};
	}
	
	var objValidation = validateAttendeeSID(data.contact_id, data.attendee_sid, data.event_sid);
	if (!objValidation.success) {
		return {
			error: 'Could not update registration. Please contact Rapid7.'
		};
	}
	
	var rec = nlapiLoadRecord('customrecordr7eventattendees', objValidation.attendee_id);
	
	var removeRow = false;
	if (cmd == 'transfer') {
		var newContactId = grabSameEmailContact(data.customer_id, data.email);
		
		if (isBlank(newContactId)) {
			newContactId = createContact(data);
		}
				
		rec.setFieldValue('custrecordr7eventattendeescontactint', newContactId);
		
		removeRow = (newContactId != data.contact_id) ? true : false;
	}
	
	rec.setFieldValue('custrecordr7eventattendeesfirst', data.firstname);
	rec.setFieldValue('custrecordr7eventattendeeslast', data.lastname);
	rec.setFieldValue('custrecordr7eventattendeesemail', data.email);
	rec.setFieldValue('custrecordr7eventattendeesphone', data.phone);
	rec.setFieldValue('custrecordr7eventattendeesmobile', data.mobile);
	rec.setFieldValue('custrecordr7eventattendeesjob', data.title);
	rec.setFieldValue('custrecordr7eventattendeescomments', data.comments);
	rec.setFieldValue('custrecordr7eventattendeesconfsent', 'F');
	
	try {
		nlapiSubmitRecord(rec);
	} 
	catch (e) {
		nlapiLogExecution('ERROR', 'Could not update attendee', e);
		return {
			error: e.getDetails()
		};
	}
	
	return getAttendees(null, null, objValidation.attendee_id, removeRow);
	
}

function createContact(data){

	var newContact = nlapiCreateRecord('contact', {
		recordmode: 'dynamic'
	});
	
	newContact.setFieldValue('company', data.customer_id);
	newContact.setFieldValue('firstname', data.firstname);
	newContact.setFieldValue('lastname', data.lastname);
	newContact.setFieldValue('email', data.email);
	newContact.setFieldValue('title', data.title);
	newContact.setFieldValue('phone', data.phone);
	newContact.setFieldValue('mobilephone', data.mobile);
	
	try {
		var id = nlapiSubmitRecord(newContact, true, true);
	} 
	catch (err) {
		id = err.getInternalId(); //If error was thrown in afterSubmit script
		nlapiLogExecution('ERROR', 'Details', err);
		
		if (err.getCode() == 'CONTACT_ALREADY_EXISTS'){
			newContact.setFieldValue('entityid', data.firstname + ' ' + data.lastname + '.dup' + getRandomString(5));
			id = nlapiSubmitRecord(newContact, null, true);
		}
		
		if (id == null || id == '') {
			throw nlapiCreateError(err.getCode(), err.getDetails());
		}
	}
	
	return id;
}

function getAttendees(contactId, eventSID, attendeeID, removeRow){
	
	if (removeRow == null){
		removeRow = false;
	}
	
	var arrData = [];
	var eventTitle = null;
	
	if ((!isBlank(contactId) && !isBlank(eventSID)) || !isBlank(attendeeID)) {
		// Current Daya Population
		var arrFilters = [];
		arrFilters.push(new nlobjSearchFilter('custrecordr7eventattendeesstatus', null, 'anyof', 2));
		
		if (contactId != null && contactId != '') {
			arrFilters[arrFilters.length] = nlobjSearchFilter('custrecordr7eventattendeescontactint', null, 'anyof', contactId);
			arrFilters[arrFilters.length] = nlobjSearchFilter('custrecordr7eventregmastersid', 'custrecordr7eventattendeesmaster', 'is', eventSID);
		}
		else {
			arrFilters.push(new nlobjSearchFilter('internalid', null, 'anyof', attendeeID));
		}

		var arrColumns = [];
		arrColumns.push(new nlobjSearchColumn('internalid'));
		arrColumns.push(new nlobjSearchColumn('custrecordr7eventattendeesmaster'));
		arrColumns.push(new nlobjSearchColumn('custrecordr7eventregmastersid', 'custrecordr7eventattendeesmaster'));
		arrColumns.push(new nlobjSearchColumn('custrecordr7eventregtitle', 'custrecordr7eventattendeesmaster'));
		arrColumns.push(new nlobjSearchColumn('custrecordr7eventattendeescompanyint'));
		arrColumns.push(new nlobjSearchColumn('custrecordr7eventattendeescontactint'));
		arrColumns.push(new nlobjSearchColumn('custrecordr7eventattendeesfirst'));
		arrColumns.push(new nlobjSearchColumn('custrecordr7eventattendeeslast'));
		arrColumns.push(new nlobjSearchColumn('custrecordr7eventattendeescompany'));
		arrColumns.push(new nlobjSearchColumn('custrecordr7eventattendeesemail'));
		arrColumns.push(new nlobjSearchColumn('custrecordr7eventattendeesphone'));
		arrColumns.push(new nlobjSearchColumn('custrecordr7eventattendeesmobile'));
		arrColumns.push(new nlobjSearchColumn('custrecordr7eventattendeesjob'));
		arrColumns.push(new nlobjSearchColumn('custrecordr7eventattendeescomments'));
		arrColumns.push(new nlobjSearchColumn('custrecordr7eventattendeessid'));
		arrColumns.push(new nlobjSearchColumn('custrecordr7eventattendee_sid'));
		
		var newSearch = nlapiCreateSearch('customrecordr7eventattendees');
		newSearch.setFilters(arrFilters);
		newSearch.setColumns(arrColumns);
		var resultSet = newSearch.runSearch();
		
		var rowNum = 0;
		do {
			var resultSlice = resultSet.getResults(rowNum, rowNum + 1000);
			for (var rs in resultSlice) {
				var result = resultSlice[rs];
				
				var objAttendee = {};
				//objAttendee.DT_RowClass = 'uir-list-row-tr';
				objAttendee.DT_RowId = 'row_' + result.getValue(arrColumns[0]);
				objAttendee.nsid = result.getValue('internalid');
				objAttendee.contact_id = result.getValue('custrecordr7eventattendeescontactint');
				objAttendee.customer_id = result.getValue('custrecordr7eventattendeescompanyint');
				objAttendee.event_sid = result.getValue('custrecordr7eventregmastersid', 'custrecordr7eventattendeesmaster');
				objAttendee.event_title = result.getValue('custrecordr7eventregtitle', 'custrecordr7eventattendeesmaster');
				eventTitle = objAttendee.event_title;
				objAttendee.attendee_sid = result.getValue('custrecordr7eventattendee_sid');
				objAttendee.registration_id = result.getValue('custrecordr7eventattendeessid');
				
				objAttendee.firstname = result.getValue('custrecordr7eventattendeesfirst');
				objAttendee.lastname = result.getValue('custrecordr7eventattendeeslast');
				objAttendee.email = result.getValue('custrecordr7eventattendeesemail');
				objAttendee.phone = result.getValue('custrecordr7eventattendeesphone');
				objAttendee.mobile = result.getValue('custrecordr7eventattendeesmobile');
				objAttendee.title = result.getValue('custrecordr7eventattendeesjob');
				objAttendee.comments = '';
				
				if (attendeeID != null && attendeeID != '') {
					return {
						row: objAttendee,
						removeRow: removeRow
					};
				}
				
				arrData[arrData.length] = objAttendee;
				rowNum++;
			}
		}
		while (resultSlice.length >= 1000);
	}
	
	if (isBlank(eventTitle)) {
		eventTitle = grabEventTitleBySID(eventSID);
	}
	
	return {
		data: arrData,
		contact: {
			id: contactId
		},
		attendee: {
			id: attendeeID
		},
		event: {
			name: eventTitle
		}
	};
}

function grabSameEmailContact(customerId, email){

	if (email != null && email != '') {
	
		var arrFilters = new Array();
		arrFilters[0] = new nlobjSearchFilter('isinactive', null, 'is', 'F');
		arrFilters[1] = new nlobjSearchFilter('email', null, 'is', email);
		arrFilters[2] = new nlobjSearchFilter('company', null, 'is', customerId);
		
		var arrColumns = new Array();
		arrColumns[0] = new nlobjSearchColumn('internalid');

		var arrResults = nlapiSearchRecord('contact', null, arrFilters, arrColumns);

		for (var i = 0; arrResults != null && i < arrResults.length; i++) {
			var contactId = arrResults[i].getValue(arrColumns[0]);

			if (contactId != null && contactId != '') {
				return contactId;
			}
		}
	}

	return null;
}

function valToArray(val){
	return (!isBlank(val)) ? val.split(',') : [];
}

function labelToArray(val){
	return (!isBlank(val)) ? val.split(',').join(', ') : [];
}

function formatText(str){
	str = str.replace(new RegExp("\r\n", 'g'), "<br>");
	str = str.replace(new RegExp("\n", 'g'), "<br>");
	str = str.replace(new RegExp("\r", 'g'), "<br>");
	return str;
}

function validateAttendeeSID(contactId, attendeeSID, eventSID){
	
	if (isBlank(contactId) || isBlank(attendeeSID) || isBlank(eventSID)){
		return {
			success: false,
			err_code: 'MISSING_REQUIRED_PARAM',
			error: 'Missing required parameter. Please contact Rapid7.'
		};
	}
	
	var arrFilters = [];
	arrFilters.push(new nlobjSearchFilter('custrecordr7eventattendee_sid', null, 'is', attendeeSID));
	arrFilters.push(new nlobjSearchFilter('custrecordr7eventattendeesstatus', null, 'anyof', 2));
	
	var arrColumns = [];
	arrColumns.push(new nlobjSearchColumn('internalid'));
	arrColumns.push(new nlobjSearchColumn('custrecordr7eventattendeesmaster'));
	arrColumns.push(new nlobjSearchColumn('custrecordr7eventregmastersid', 'custrecordr7eventattendeesmaster'));
	arrColumns.push(new nlobjSearchColumn('custrecordr7eventregtitle', 'custrecordr7eventattendeesmaster'));
	arrColumns.push(new nlobjSearchColumn('custrecordr7eventattendeescontactint'));
	arrColumns.push(new nlobjSearchColumn('custrecordr7eventattendeesfirst'));
	arrColumns.push(new nlobjSearchColumn('custrecordr7eventattendeeslast'));
	arrColumns.push(new nlobjSearchColumn('custrecordr7eventattendeescompany'));
	arrColumns.push(new nlobjSearchColumn('custrecordr7eventattendeesemail'));
	arrColumns.push(new nlobjSearchColumn('custrecordr7eventattendeesphone'));
	arrColumns.push(new nlobjSearchColumn('custrecordr7eventattendeesmobile'));
	arrColumns.push(new nlobjSearchColumn('custrecordr7eventattendeesjob'));
	arrColumns.push(new nlobjSearchColumn('custrecordr7eventattendeescomments'));
	
	var arrResults = nlapiSearchRecord('customrecordr7eventattendees', null, arrFilters, arrColumns);
	
	if (arrResults == null || arrResults.length <= 0){
		return {
			success: false,
			err_code: 'INVALID_ATTENDEE_SID',
			error: 'Could not determine registration status. Please contact Rapid7.'
		};
	}

	if (contactId != arrResults[0].getValue('custrecordr7eventattendeescontactint')){
		return {
			success: false,
			err_code: 'INVALID_CONTACT_ID',
			error: 'Could not determine registration status. Please contact Rapid7.'
		};
	}

	if (eventSID != arrResults[0].getValue('custrecordr7eventregmastersid', 'custrecordr7eventattendeesmaster')){
		return {
			success: false,
			err_code: 'INVALID_EVENT_SID',
			error: 'Could not determine registration status. Please contact Rapid7.'
		};
	}
	
	return {
		success: true,
		err_code: null,
		error: null,
		attendee_id: arrResults[0].getId(),
		contact_id: arrResults[0].getValue('custrecordr7eventattendeescontactint'),
		event_sid: arrResults[0].getValue('custrecordr7eventregmastersid', 'custrecordr7eventattendeesmaster'),
		event_title: arrResults[0].getValue('custrecordr7eventregtitle', 'custrecordr7eventattendeesmaster')	
	};

	
}

function grabEventTitleBySID(event_sid){

	if (isBlank(event_sid)) {
		return '';
	}
	
	var arrFilters = [];
	arrFilters.push(new nlobjSearchFilter('custrecordr7eventregmastersid', null, 'is', event_sid));
	
	var arrColumns = [];
	arrColumns.push(new nlobjSearchColumn('internalid'));
	arrColumns.push(new nlobjSearchColumn('custrecordr7eventregmastersid'));
	arrColumns.push(new nlobjSearchColumn('custrecordr7eventregtitle'));
	
	
	var arrResults = nlapiSearchRecord('customrecordr7eventregmaster', null, arrFilters, arrColumns);
	
	if (arrResults != null && arrResults.length > 0) {
		return arrResults[0].getValue('custrecordr7eventregtitle');
	}
	
	return '';
}

function isBlank(value){
	return (value == null || value == '' || value == 'null') ? true : false;
}

function getRandomString(string_length){
    var chars = '0123456789';
    var randomstring = '';
    for (var i = 0; i < string_length; i++) {
        var rnum = Math.floor(Math.random() * chars.length);
        randomstring += chars.substring(rnum, rnum + 1);
    }
    return randomstring;
}
