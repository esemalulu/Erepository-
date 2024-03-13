/*
 * @author mburstein
 * 
 *	MB: 1/15/14 - Added event attendee limit check.  Inactivate event if attendee limit reached. 
 */

// 8/22/13 - Adjusted script to make new sID on copy
// MB: 4/7/14 - Add inactivation for events whos end date was over a week ago

function beforeLoad(type, form){
	
	var sidFieldId = getSidField();
	if (type == 'copy'){
		var fldSID = form.getField(sidFieldId);
		fldSID.setDefaultValue('');
	}
}

function beforeSubmit(type){

	if (type == 'create' || type == 'copy') {
		nlapiSetFieldValue('custrecordr7eventattendeessid', getRandomString(10).toUpperCase()); //REGISTRATION ID
		nlapiSetFieldValue(getSidField(), getRandomString(35)); //SID
	}
	
}

function afterSubmit(type){
	
	if (type != 'delete') {
		var recType = nlapiGetRecordType();
		var recId = nlapiGetRecordId();
		var rec = nlapiLoadRecord(recType,recId);
		
		if (recType == 'customrecordr7eventregmaster') {
				
			// Count the number of event attendees
			var numberOfAttendees = countAttendees(recId);
			
			// Update the number of attendees on Event Master Record
			var submitId = updateAttendeeCount(recId, numberOfAttendees);
		}
		else if (recType == 'customrecordr7eventattendees') {
			var recMasterId = rec.getFieldValue('custrecordr7eventattendeesmaster');
			// Count the number of event attendees
			if (recMasterId != null && recMasterId != ''){
				var numberOfAttendees = countAttendees(recMasterId);
				// Update the number of attendees on Event Master Record
				var submitId = updateAttendeeCount(recMasterId, numberOfAttendees);
			}
			// Check if event master needs voucher
			var requiresVoucher = nlapiLookupField('customrecordr7eventregmaster',recMasterId,'custrecordr7eventregvoucher');
			if (requiresVoucher != 'F') {
				// Update Event Voucher pool if voucher code is used
				var voucherCodeId = rec.getFieldValue('custrecordr7eventattendeesvcode');
				if (voucherCodeId != null && voucherCodeId != '') {
					var recVoucher = nlapiLoadRecord('customrecordr7eventvoucherpool', voucherCodeId);
					recVoucher.setFieldValue('custrecordr7eventvoucherpooleventattende', nlapiGetRecordId());
					recVoucher.setFieldValue('custrecordr7eventvoucherpoolinactive', 'T');
					nlapiSubmitRecord(recVoucher, true, true);
				}
				else{
					nlapiLogExecution('ERROR','Event Needs Voucher Code',nlapiGetRecordId());
				}
			}
			nlapiScheduleScript(746); // Event Attendee Status Updates Scheduled 
		}
	}
}

function getSidField(){
	var recType = nlapiGetRecordType();
	var sidFieldId = new String();
	switch(recType){
		// Event Registration Attendee
		case 'customrecordr7eventattendees':
			sidFieldId = 'custrecordr7eventattendee_sid';
			break;
		// Event Registration Master
		case 'customrecordr7eventregmaster':
			sidFieldId = 'custrecordr7eventregmastersid';
			break;
	}
	return sidFieldId;
}

function countAttendees(recId){
	var numberOfAttendees = 0;
	var filters = new Array();
	filters[0] = new nlobjSearchFilter( 'custrecordr7eventattendeesmaster', null, 'is', recId); // All attendees for event = recId
	filters[1] = new nlobjSearchFilter( 'custrecordr7eventattendeesstatus', null, 'is', 2); // Approved
	
	var columns = new Array();
	columns[0] = new nlobjSearchColumn('internalid', null, 'count');
	
	var searchResults = nlapiSearchRecord('customrecordr7eventattendees', null, filters, columns);
	if (searchResults != null) {
		numberOfAttendees = searchResults[0].getValue(columns[0]);
	}

	return numberOfAttendees;
}

function updateAttendeeCount(recId, numberOfAttendees){
	var recEventMaster = nlapiLoadRecord('customrecordr7eventregmaster',recId);
	recEventMaster.setFieldValue('custrecordr7eventregnumberofattendees', numberOfAttendees);
	// Check event size - if number of attendees = limit then inactivate the event
	var eventLimit = recEventMaster.getFieldValue('custrecordr7eventreglimit');
	// MB: 4/7/14 - Add inactivation for events whos end date was over a week ago
	var eventEndDate = recEventMaster.getFieldValue('custrecordr7eventregenddate');
	var today = new Date();
	if(eventEndDate != null && eventEndDate != ''){
		eventEndDate = nlapiStringToDate(eventEndDate);
	}
	else{
		// if no end date then set to arbitrary future date
		eventEndDate = new Date(2020,12,31);
	}
	/*if ( (eventLimit != null && eventLimit != '' && (eventLimit - numberOfAttendees) <= 0) ||  eventEndDate.setDate(eventEndDate.getDate()+7) < today ){
		recEventMaster.setFieldValue('isinactive', 'T'); // inactivate event
	}*/
	var submitId = nlapiSubmitRecord(recEventMaster, false);
	return submitId;
}
