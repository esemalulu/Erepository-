/**
 * Module Description
 *
 * Version    Date            Author           Remarks
 * 2.00       17 Jun 2013     mburstein		   Updated for sendActivationEmails from script rather than workflow.  Waiting to upload till after BlackHat.
 *
 *
 */
function processEventSalesOrder(recOrder, orderUpdates) {
	// Add logic in search
	// Use Search SCRIPT - Event Registration Process SO  id=11125
	// var arrSearchResults = nlapiSearchRecord('transaction', 11125);

	try {
		var orderObject = getOrderObject(recOrder);
		var arrEventItems = orderObject.getEventItems();

		this.arrParentEndDates = new Array();
		this.arrParentStartDates = new Array();
		this.licenseEmailsToSend = new Array();

		//map items by lineID
		var orderLineCount = recOrder.getLineItemCount('item');
		this.itemLineNums = new Array();

		for (var i = 1; i <= orderLineCount; i++) {
			var lineId = recOrder.getLineItemValue('item', 'id', i);
			itemLineNums[lineId] = i;
		}

		for (var i = 0; arrEventItems != null && i < arrEventItems.length && unitsLeft(1500) && timeLeft(); i++) {
			var eventItem = arrEventItems[i];
			var lineNum = eventItem['lineNum'];

			try {
				recOrder = processEvents(recOrder, eventItem, orderUpdates);
				recOrder = setEventLineDates(recOrder, eventItem, orderUpdates);
				nlapiLogExecution('DEBUG', 'Processed EVENT', eventItem['activationKey']);
			} catch (e) {
				nlapiSendEmail(55011, 55011, 'ERROR PROCESSING AN ACR EVENT', e.name + ' : ' + e.message, 'michael_burstein@rapid7.com');
				recOrder.setLineItemValue('item', 'custcolr7translicenseid', lineNum, 'XXX');
				orderUpdates.lines[lineNum]['custcolr7translicenseid'] = 'XXX';
				exitScript = true;
				break;
			}
		}

		determineOrderStartEndDates(recOrder, orderUpdates, orderObject);

		// We no longer want to save the sales order here.  We will process the `orderUpdates` object later
		// nlapiSubmitRecord(recOrder, true, true);
		//sendActivationEmails();
	} catch (e) {
		//luke is not ins SB1, add him later 194952346, TODO: change to the global option
		nlapiLogExecution('ERROR', 'Order ID: ' + recOrder.getId() + '\nError: ' + e.name + ' : ' + e.message);
		var adminUser = nlapiLoadConfiguration('companypreferences').getFieldValue('custscriptr7_system_info_email_sender');
		nlapiSendEmail(
			adminUser,
			[adminUser, 87335123, 131416698, 192569849],
			'ERROR PROCESS ACR EVENT SCRIP',
			'Order ID: ' + recOrder.getId() + '\nError: ' + e.name + ' : ' + e.message
		);
		if (e.getCode() === 'RCRD_HAS_BEEN_CHANGED ') {
			nlapiSubmitField('salesorder', record.getId(), 'custbodyr7_rcrd_change_error_happened', 'T');
		}
	}
	nlapiLogExecution('DEBUG', 'Finished Events', 'yup');
}

function processEvents(recOrder, eventItem, orderUpdates) {
	var lineId = eventItem['lineId'];
	var lineNum = eventItem['lineNum'];
	var licenseId = eventItem['licenseId'];
	var acrId = eventItem['acrId'];
	var itemOptionId = arrProductTypes[acrId]['optionid'];
	var licRecord = arrProductTypes[acrId]['recordid'];
	var itemProperties = eventItem['itemProperties'];
	var emailTemplate = itemProperties['custitemr7itemactivationemailtemplate'];

	// Get Event Attendee Fields values
	var customerId = recOrder.getFieldValue('entity');
	var strSalesOrder = recOrder.getFieldValue('tranid');
	//var salesRepId = recOrder.getFieldValue('salesrep');
	//var soStatus = recOrder.getFieldValue('status');
	var promoCode = recOrder.getFieldValue('promocode');
	var leadSource = recOrder.getFieldValue('leadsource');
	var strToday = nlapiDateToString(new Date());
	var commentsInternal = strToday + ' - ' + strSalesOrder + ' submitted.\n';
	var lineContact = recOrder.getLineItemValue('item', 'custcolr7translinecontact', lineNum);

	//activationKey is registrationId
	var activationKey = recOrder.getLineItemValue('item', itemOptionId, lineNum);

	//Set Event Attendee Fields
	var eventAttendeeFields = new Array();
	var orderId = recOrder.getId();
	eventAttendeeFields['custrecordr7eventattendeescompanyint'] = customerId;
	eventAttendeeFields['custrecordr7eventattendeessalesorder'] = orderId;
	eventAttendeeFields['custrecordr7eventattendeespromocode'] = promoCode;
	eventAttendeeFields['custrecordr7eventattendeesleadsource'] = leadSource;
	eventAttendeeFields['custrecordr7eventattendeesstatus'] = 2; // 1 is Pending, 2 is Approved
	eventAttendeeFields['custrecordr7eventattendeetype'] = 1; // Attendee
	eventAttendeeFields['custrecordr7eventattendeescommentsint'] = commentsInternal;

	/*
	 * If the line-item is an Event Order && and the Registration Id is set then Web order
	 * MB: 5/13/13 - Added source != null to distinguish web orders.
	 */
	// Get Source for branching eCommerce
	var source = recOrder.getFieldValue('source');
	if (source == '') {
		source = null;
	}

	if (activationKey != '' && activationKey != null && (licenseId == '' || licenseId == null || source != null)) {
		commentsInternal += 'Web Order.';

		try {
			// Search for Event Attendee Record with matching registration Id
			var objAttRecord = searchAttRecord(activationKey);
			var recId = objAttRecord.recId;
			var attId = objAttRecord.attId;
			var attEmail = objAttRecord.attEmail;
			if (recId != null && recId != '') {
				//Lookup the primarycontact of the customer.  If line contact is empty find contact by attEmail.
				if (lineContact == null || lineContact == '') {
					lineContact = findLineContact(customerId, attEmail, objAttRecord);
				}
				// Set Contact
				eventAttendeeFields['custrecordr7eventattendeescontactint'] = lineContact;

				// Attach Sales Order to ATT record
				var webOrInt = 'WEB';
				var recEventAttendeeId = attachSalesOrder(eventAttendeeFields, recId, webOrInt);
				if (recEventAttendeeId == null) {
					nlapiLogExecution('ERROR', 'Could not attach SO to ATT record', 'problem: Most likely caused by Attendee - Customer email mismatch.');
					return;
				} else {
					// Get Event Master ID from ATT record
					var eventMasterId = memoizedLookupField('customrecordr7eventattendees', recId, 'custrecordr7eventattendeesmaster');
					// Add ATT ID  and line contact to Sales Order line item and Event Master ID
					recOrder.setLineItemValue('item', 'custcolr7translicenseid', lineNum, attId);
					recOrder.setLineItemValue('item', 'custcolr7translinecontact', lineNum, lineContact);
					recOrder.setLineItemValue('item', 'custcolr7eventmaster', lineNum, eventMasterId);

					orderUpdates.lines[lineNum]['custcolr7translicenseid'] = attId;
					orderUpdates.lines[lineNum]['custcolr7translinecontact'] = lineContact;
					orderUpdates.lines[lineNum]['custcolr7eventmaster'] = eventMasterId;

					// if sku has no template then use Event Master Template
					if (emailTemplate == null || emailTemplate == '') {
						emailTemplate = memoizedLookupField('customrecordr7eventregmaster', eventMasterId, 'custrecordr7eventregconfemail');
					}
					licenseEmailsToSend[licenseEmailsToSend.length] = [licRecord, recEventAttendeeId, emailTemplate, acrId];
				}
			}
		} catch (e) {
			var adminUser = nlapiLoadConfiguration('companypreferences').getFieldValue('custscriptr7_system_info_email_sender');
			nlapiSendEmail(adminUser, adminUser, 'ERROR PROCESS EVENT ' + webOrInt + ' ORDER SCRIPT', e.name + ' : ' + e.message);
			recOrder.setLineItemValue('item', 'custcolr7translicenseid', lineNum, 'XXX');
			orderUpdates.lines[lineNum]['custcolr7translicenseid'] = 'XXX';
		}
	} else {
		/*
		 * 	Else Process Internal Order
		 */
		var eventMasterId = recOrder.getLineItemValue('item', 'custcolr7eventmaster', lineNum);
		if (eventMasterId != null && eventMasterId != '') {
			commentsInternal += 'Internal Order.';
			eventAttendeeFields['custrecordr7eventattendeescommentsint'] = commentsInternal;

			try {
				// Get contact record fields from lineContact
				if (lineContact != null && lineContact != '') {
					var recContact = nlapiLoadRecord('contact', lineContact);
					var firstName = recContact.getFieldValue('firstname');
					var lastName = recContact.getFieldValue('lastname');
					var email = recContact.getFieldValue('email');
					var phone = recContact.getFieldValue('phone');
					var mobilePhone = recContact.getFieldValue('mobilephone');
					var jobTitle = recContact.getFieldValue('title');
					// If first/last are both in firstname, then split
					if ((lastName == null || lastName == '') && firstName.indexOf(' ') != -1) {
						var arrName = firstName.split(' ');
						firstName = arrName[0];
						lastName = arrName[1];
					}
				}
				var customerName = recOrder.getFieldText('entity');
				// Build Array of record values
				eventAttendeeFields['custrecordr7eventattendeesmaster'] = eventMasterId;
				eventAttendeeFields['custrecordr7eventattendeescompany'] = customerName;
				eventAttendeeFields['custrecordr7eventattendeescontactint'] = lineContact;
				eventAttendeeFields['custrecordr7eventattendeesfirst'] = firstName;
				eventAttendeeFields['custrecordr7eventattendeeslast'] = lastName;
				eventAttendeeFields['custrecordr7eventattendeesemail'] = email;
				eventAttendeeFields['custrecordr7eventattendeesphone'] = phone;
				eventAttendeeFields['custrecordr7eventattendeesmobile'] = mobilePhone;
				eventAttendeeFields['custrecordr7eventattendeesjob'] = jobTitle;
				eventAttendeeFields['custrecordr7eventattendeessku'] = recOrder.getLineItemValue('item', 'item', lineNum);

				//If event has a voucher code pool, grab next voucher code
				var voucherCode = getVoucherCode(recOrder, eventMasterId);
				if (voucherCode != null && voucherCode != '') {
					eventAttendeeFields['custrecordr7eventattendeesvcode'] = voucherCode;
				}

				var webOrInt = 'INTERNAL';
				var recEventAttendeeId = createEventAttendee(eventAttendeeFields, webOrInt);

				if (recEventAttendeeId == null) {
					var inactiveSkuError = new Error('Item ' + recOrder.getLineItemValue('item', 'item', lineNum) + ' is inactive.');
					nlapiLogExecution('ERROR', 'Could not create ATT record', inactiveSkuError);
					throw inactiveSkuError;
					return;
				} else {
					var lookedUpEventAttendee = nlapiLookupField('customrecordr7eventattendees', recEventAttendeeId, ['custrecordr7eventattendeessid', 'name']);
					var registrationId = lookedUpEventAttendee['custrecordr7eventattendeessid'];
					var attId = lookedUpEventAttendee['name'];
				}
				// Add ATT ID  and regSID to Sales Order line item
				if (registrationId != null && registrationId != '' && attId != null && attId != '') {
					recOrder.setLineItemValue('item', 'custcolr7translicenseid', lineNum, attId);
					recOrder.setLineItemValue('item', itemOptionId, lineNum, registrationId);
					orderUpdates.lines[lineNum]['custcolr7translicenseid'] = attId;
					orderUpdates.lines[lineNum][itemOptionId] = registrationId;

					// if sku has no template then use Event Master Template
					if (emailTemplate == null || emailTemplate == '') {
						emailTemplate = memoizedLookupField('customrecordr7eventregmaster', eventMasterId, 'custrecordr7eventregconfemail');
					}
					licenseEmailsToSend[licenseEmailsToSend.length] = [licRecord, recEventAttendeeId, emailTemplate, acrId];
				}
			} catch (e) {
				var adminUser = nlapiLoadConfiguration('companypreferences').getFieldValue('custscriptr7_system_info_email_sender');
				nlapiSendEmail(adminUser, adminUser, 'ERROR PROCESS EVENT ' + webOrInt + ' ORDER SCRIPT', e.name + ' : ' + e.message);
				recOrder.setLineItemValue('item', 'custcolr7translicenseid', lineNum, 'XXX');
				orderUpdates.lines[lineNum]['custcolr7translicenseid'] = 'XXX';
			}
		}
	}
	// Send email to notify
	if (recEventAttendeeId != null && recEventAttendeeId != '') {
		//sendEventReportEmail(strSalesOrder,attId,recOrder,orderId, recEventAttendeeId,commentsInternal);
	}
	return recOrder;
}

function setEventLineDates(recOrder, lineItem, orderUpdates) {
	var lineNum = lineItem['lineNum'];
	var acrId = lineItem['acrId'];

	var strToday = nlapiDateToString(new Date());

	var itemId = recOrder.getLineItemValue('item', 'item', lineNum);
	var defaultTerm = nlapiLookupField('item', itemId, 'custitemr7itemdefaultterm');
	var lineId = recOrder.getLineItemValue('item', 'id', lineNum);
	var quantity = recOrder.getLineItemValue('item', 'quantity', lineNum);
	var unitType = recOrder.getLineItemValue('item', 'custcolr7itemqtyunit', lineNum);

	var eventMaster = recOrder.getLineItemValue('item', 'custcolr7eventmaster', lineNum);
	if (eventMaster != null && eventMaster != '') {
		var fields = new Array('custrecordr7eventregdate', 'custrecordr7eventregenddate');
		var eventMasterFields = nlapiLookupField('customrecordr7eventregmaster', eventMaster, fields);
		var eventMasterStartDate = eventMasterFields.custrecordr7eventregdate;
		var eventMasterEndDate = eventMasterFields.custrecordr7eventregenddate;
		var eventStartDate = new Date();
		var eventEndDate = new Date();

		// if Event Master StartDate not empty
		if (eventMasterStartDate != null && eventMasterStartDate != '') {
			// if masterStartDate before today then make revrec start today
			if (nlapiStringToDate(eventMasterStartDate) < nlapiStringToDate(strToday)) {
				eventStartDate = strToday;
			} else {
				// else use master startdate
				eventStartDate = eventMasterStartDate;
			}
		} else {
			// if master startDate is empty then set revrec start to today
			eventStartDate = strToday;
		}
		// if Event Master EndDate not empty

		if (eventMasterEndDate != null && eventMasterEndDate != '') {
			// if masterEndDate before today then make revrec End today
			if (nlapiStringToDate(eventMasterEndDate) < nlapiStringToDate(strToday)) {
				eventEndDate = strToday;
			} else {
				//if master end date is greater than 1 year from today,
				//set end date to be 1 year from today
				var oneYearFromToday = nlapiAddMonths(new Date(), 12);
				if (nlapiStringToDate(eventMasterEndDate) > oneYearFromToday) {
					eventEndDate = convertEndDate(eventStartDate, quantity, unitType, defaultTerm);
				} else {
					// else use master startdate
					eventEndDate = eventMasterEndDate;
				}
			}
		} else {
			// if no eventmaster enddate, revrec enddate is 1 yr from startdate
			eventEndDate = convertEndDate(eventStartDate, quantity, unitType, defaultTerm);
		}

		recOrder.setLineItemValue('item', 'revrecstartdate', lineNum, eventStartDate);
		recOrder.setLineItemValue('item', 'revrecenddate', lineNum, eventEndDate);
		//EITF-08-01
		recOrder.setLineItemValue('item', 'custcolr7startdate', lineNum, eventStartDate);
		recOrder.setLineItemValue('item', 'custcolr7enddate', lineNum, eventEndDate);

		orderUpdates.lines[lineNum]['revrecstartdate'] = eventStartDate;
		orderUpdates.lines[lineNum]['revrecenddate'] = eventEndDate;
		orderUpdates.lines[lineNum]['custcolr7startdate'] = eventStartDate;
		orderUpdates.lines[lineNum]['custcolr7enddate'] = eventEndDate;
	}
	return recOrder;
}

function findLineContact(customerId, attEmail, objAttRecord) {
	var filters = new Array();
	filters[0] = new nlobjSearchFilter('company', null, 'is', customerId);
	filters[1] = new nlobjSearchFilter('email', null, 'is', attEmail);

	var columns = new Array();
	columns[0] = new nlobjSearchColumn('internalid');

	var arrLineContacts = nlapiSearchRecord('contact', null, filters, columns);
	if (arrLineContacts != null && arrLineContacts != '') {
		for (var m = 0; arrLineContacts != null && m < arrLineContacts.length; m++) {
			var arrLineContact = arrLineContacts[m];
			// Create an array of search columns
			var columns = arrLineContact.getAllColumns();
			// Return Managed Service internalId and Id from results
			var lineContact = arrLineContact.getValue(columns[0]);
		}
		return lineContact;
	} else {
		var filters = new Array();
		filters[0] = new nlobjSearchFilter('company', null, 'is', customerId);
		filters[1] = new nlobjSearchFilter('firstname', null, 'is', objAttRecord.attFirst + ' ' + objAttRecord.attLast);
		filters[1].setOr(true);
		filters[2] = new nlobjSearchFilter('firstname', null, 'is', objAttRecord.attFirst);
		filters[2].setLeftParens(1);
		filters[3] = new nlobjSearchFilter('lastname', null, 'is', objAttRecord.attLast);
		filters[3].setRightParens(1);

		var columns = new Array();
		columns[0] = new nlobjSearchColumn('internalid');

		var arrLineContacts = nlapiSearchRecord('contact', null, filters, columns);
		if (arrLineContacts != null && arrLineContacts != '') {
			for (var m = 0; arrLineContacts != null && m < arrLineContacts.length; m++) {
				var arrLineContact = arrLineContacts[m];
				// Create an array of search columns
				var columns = arrLineContact.getAllColumns();
				// Return Managed Service internalId and Id from results
				var lineContact = arrLineContact.getValue(columns[0]);
			}
			return lineContact;
		} else {
			// Get contact info from ATT record using objAttRecord
			// Create contact record
			try {
				var recContact = nlapiCreateRecord('contact');
				recContact.setFieldValue('firstname', objAttRecord.attFirst);
				recContact.setFieldValue('lastname', objAttRecord.attLast);
				recContact.setFieldValue('title', objAttRecord.attJob);
				recContact.setFieldValue('email', objAttRecord.attEmail);
				recContact.setFieldValue('phone', objAttRecord.attPhone);
				recContact.setFieldValue('company', customerId);
				var lineContact = nlapiSubmitRecord(recContact, null, true);
				return lineContact;
			} catch (e) {
				nlapiLogExecution('ERROR', ' Details: ' + e);
			}
		}
	}
}

//Web
function attachSalesOrder(fields, recId, webOrInt) {
	var acrId = 5; // Hardcode to Events
	var licRecord = arrProductTypes[acrId]['recordid'];
	// Load ATT record and update SO
	var recEventAttendee = nlapiLoadRecord('customrecordr7eventattendees', recId);
	for (field in fields) {
		recEventAttendee.setFieldValue(field, fields[field]);
	}
	try {
		var id = null;
		id = nlapiSubmitRecord(recEventAttendee, null, true);
	} catch (err) {
		id = err.getInternalId(); //If error was thrown in afterSubmit script
		nlapiLogExecution('ERROR', ' Details: ' + err);
		var adminUser = nlapiLoadConfiguration('companypreferences').getFieldValue('custscriptr7_system_info_email_sender');
		nlapiSendEmail(
			adminUser,
			adminUser,
			'ERROR PROCESS EVENT ' + webOrInt + ' ORDER SCRIPT.  COULD NOT ATTACH SALES ORDER.',
			err.name + ' : ' + err.message
		);
	}

	licenseEmailsToSend[licenseEmailsToSend.length] = [licRecord, id, fields['custitemr7itemactivationemailtemplate'], acrId];
	return id;
}

//Internal
function createEventAttendee(fields, webOrInt) {
	// Create ATT record and from SO
	var recEventAttendee = nlapiCreateRecord('customrecordr7eventattendees');
	for (field in fields) {
		recEventAttendee.setFieldValue(field, fields[field]);
	}
	try {
		var id = null;
		id = nlapiSubmitRecord(recEventAttendee, null, true);
	} catch (err) {
		id = err.getInternalId(); //If error was thrown in afterSubmit script
		nlapiLogExecution('ERROR', ' Details: ' + err);
		var adminUser = nlapiLoadConfiguration('companypreferences').getFieldValue('custscriptr7_system_info_email_sender');
		nlapiSendEmail(
			adminUser,
			adminUser,
			'ERROR PROCESS EVENT ' + webOrInt + ' ORDER SCRIPT.  COULD NOT CREATE ATTENDEE RECORD.',
			err.name + ' : ' + err.message
		);
	}
	return id;
}

function getVoucherCode(recOrder, eventMasterId) {
	// Lookup all Voucher Codes for Event Master
	var filters = new Array();
	filters[0] = new nlobjSearchFilter('custrecordr7eventvoucherpooleventmaster', null, 'anyof', eventMasterId);
	// Not inactive
	filters[1] = new nlobjSearchFilter('custrecordr7eventvoucherpoolinactive', null, 'isnot', 'T');
	filters[2] = new nlobjSearchFilter('custrecordr7eventvoucherpooleventattende', null, 'is', '@NONE@');
	filters[3] = new nlobjSearchFilter('isinactive', null, 'is', 'F');

	// Sort by numerical order
	var columns = new Array();
	columns[0] = new nlobjSearchColumn('internalid').setSort(false);

	// Grab next voucher code
	var voucherCodes = nlapiSearchRecord('customrecordr7eventvoucherpool', null, filters, columns);

	// Only grab first Voucher Code
	if (voucherCodes != null) {
		var voucherCode = voucherCodes[0];
		return voucherCode.getValue(columns[0]);
	}
	/*
	 * TODO if we add item field for 'Needs Voucher Code' then implement this else
	 * This notification will be implemented in Voucher Confirmation email workflow
	 
	else{
		var strSalesOrder = recOrder.getFieldValue('tranid');
		arrCC = newArray('jessie_kim@rapid7.com');
		emailBody ='<a href="https://663271.app.netsuite.com/app/accounting/transactions/salesord.nl?id='+orderId+'">'+strSalesOrder+'</a> needs a voucher code.';
		nlapiSendEmail(340932,340932,'NO VOUCHER CODES',emailBody,arrCC);
	}*/
}

function sendEventReportEmail(strSalesOrder, attId, recOrder, orderId, recEventAttendeeId, commentsInternal) {
	// My ID
	var adminUser = nlapiLoadConfiguration('companypreferences').getFieldValue('custscriptr7_system_info_email_sender');
	//var emailCC = nlapiLookupField('employee',149990,'email');	// Suzannah Cooke
	var emailSubject = 'Event Registration Order Processed ' + strSalesOrder + ' attched to ' + attId;
	var emailBody = '<p><a href="https://663271.app.netsuite.com/app/common/custom/custrecordentry.nl?rectype=447&id=' + recEventAttendeeId + '">';
	emailBody +=
		attId +
		'</a> updated with <a href="https://663271.app.netsuite.com/app/accounting/transactions/salesord.nl?id=' +
		orderId +
		'">' +
		strSalesOrder +
		'</a>.</p>';
	emailBody += '<p>' + commentsInternal + '</p>';
	nlapiSendEmail(adminUser, adminUser, emailSubject, emailBody, null); //emailCC);
}

function searchAttRecord(registrationId) {
	// Search for Event Attendee Record with matching registration Id
	var filters = new Array();
	filters[0] = new nlobjSearchFilter('custrecordr7eventattendeessid', null, 'is', registrationId);

	var columns = new Array();
	columns[0] = new nlobjSearchColumn('internalid');
	columns[1] = new nlobjSearchColumn('name');
	columns[2] = new nlobjSearchColumn('custrecordr7eventattendeesemail');
	columns[3] = new nlobjSearchColumn('custrecordr7eventattendeesfirst');
	columns[4] = new nlobjSearchColumn('custrecordr7eventattendeeslast');
	columns[5] = new nlobjSearchColumn('custrecordr7eventattendeesjob');
	columns[6] = new nlobjSearchColumn('custrecordr7eventattendeesphone');

	var arrSearchResultsAttendees = nlapiSearchRecord('customrecordr7eventattendees', null, filters, columns);
	for (var m = 0; arrSearchResultsAttendees != null && m < arrSearchResultsAttendees.length; m++) {
		var arrSearchResultsAttendee = arrSearchResultsAttendees[m];
		// Return Managed Service internalId and Id from results
		// Build an object to store properties of the ATT record for reuse in findLineContact
		var objAttRecord = new Object();
		objAttRecord.recId = arrSearchResultsAttendee.getValue(columns[0]);
		objAttRecord.attId = arrSearchResultsAttendee.getValue(columns[1]);
		objAttRecord.attEmail = arrSearchResultsAttendee.getValue(columns[2]);
		objAttRecord.attFirst = arrSearchResultsAttendee.getValue(columns[3]);
		objAttRecord.attLast = arrSearchResultsAttendee.getValue(columns[4]);
		objAttRecord.attJob = arrSearchResultsAttendee.getValue(columns[5]);
		objAttRecord.attPhone = arrSearchResultsAttendee.getValue(columns[6]);
	}
	return objAttRecord;
}
