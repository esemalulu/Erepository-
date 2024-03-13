/*
 * @author efagone
 */

function updateEvent(request, response){
	
	if (request.getMethod() == 'GET'){
		
		var userId = nlapiGetUser();
		var eventId = request.getParameter('custparam_eventid');
		
		if (eventId == null || eventId == ''){
			throw nlapiCreateError('MISSING_PARAM', 'Request is missing a required parameter', true);
		}
		
		var recEvent = nlapiLoadRecord('calendarevent', eventId);
		var secSolRep = recEvent.getFieldValue('custeventr7eventsupportrep');
		var salesRep = recEvent.getFieldValue('custeventr7salesrepateventcreation');
		var organizer = recEvent.getFieldValue('organizer');
			
		var organizerIsInactive = 'F';
		if (organizer != null && organizer != '') {
			organizerIsInactive = nlapiLookupField('employee', organizer, 'isinactive');
		}
		
		if (userId != secSolRep && userId != organizer && userId != salesRep && userId != 55011 && organizerIsInactive == 'F'){
			throw nlapiCreateError('PERMISSION', 'Only the event Organizer and/or Security Solutions Rep can modify event', true);
		}
		
		var form = nlapiCreateForm('Update Event', true);
		form.setScript('customscriptr7lmupdateevensuitelet_cs');
		form.addFieldGroup('primarygroup', 'Update Event Information');
		
		var fldEventId = form.addField('custpage_eventid', 'text').setDisplayType('hidden');
		var fldAPIId = form.addField('custpage_apiid', 'text').setDisplayType('hidden');
		var fldStatusOriginal = form.addField('custpage_status_orig', 'text').setDisplayType('hidden');
		var fldChangeOrganizer = form.addField('custpage_changeorganizer', 'select', 'Change Organizer', 'employee', 'primarygroup').setDisplayType('hidden');
		var fldStatus = form.addField('custpage_status', 'select', 'Status', null, 'primarygroup');
		var fldCancelReason = form.addField('custpage_cancelreason', 'select', 'Reason', null, 'primarygroup');
		var fldproductServices = form.addField('custpage_productservices', 'multiselect', 'Products/Services Involved', 'customlistr7prodservicesinvolved', 'primarygroup');
		var fldNotes = form.addField('custpage_internalnotes', 'longtext', 'Internal Notes', null, 'primarygroup');
		
		if (organizerIsInactive == 'T') {
			fldChangeOrganizer.setDisplayType('normal');
		}
		
		sourceStatus(fldStatus);
		sourceCancelReason(form, fldCancelReason);
		
		fldStatus.setDisplaySize(150);
		fldCancelReason.setDisplaySize(150);
		fldNotes.setDisplaySize(150, 20);
		
		fldStatus.setMandatory(true);
		
		fldChangeOrganizer.setLayoutType('normal', 'startcol');
		
		fldNotes.setPadding(1);
		
		fldCancelReason.setDisabled(true);
		
		fldEventId.setDefaultValue(eventId);
		fldAPIId.setDefaultValue(recEvent.getFieldValue('custeventr7apimeetingid'));
		fldStatusOriginal.setDefaultValue(recEvent.getFieldValue('status'));
		fldCancelReason.setDefaultValue(recEvent.getFieldValue('custeventr7eventcancellationreason'));
		fldproductServices.setDefaultValue(recEvent.getFieldValues('custeventr7prodservicesinvolved'));
		fldStatus.setDefaultValue(recEvent.getFieldValue('status'));
		fldNotes.setDefaultValue(recEvent.getFieldValue('custeventr7eventinternalnotes'));
		
		if (recEvent.getFieldValue('status') == 'CANCELLED'){
			fldStatus.setDisabled(true);
			fldCancelReason.setDisabled(true);
		}
		
		form.addSubmitButton('Submit');

		response.writePage(form);
	}
	
	if (request.getMethod() == 'POST') {
	
		var userId = nlapiGetUser();
		var eventId = request.getParameter('custpage_eventid');
		var status = request.getParameter('custpage_status');
		var internalNotes = request.getParameter('custpage_internalnotes');
		var migrateEventTo = request.getParameter('custpage_changeorganizer');
		var productsServices = request.getParameter('custpage_productservices');
		
		if (eventId == null || eventId == '') {
			throw nlapiCreateError('MISSING_PARAM', 'Request is missing a required parameter', true);
		}
		
		var recEvent = nlapiLoadRecord('calendarevent', eventId);
		
		var secSolRep = recEvent.getFieldValue('custeventr7eventsupportrep');
		var salesRep = recEvent.getFieldValue('custeventr7salesrepateventcreation');
		var organizer = recEvent.getFieldValue('organizer');
		
		var responseText = "<html><body onload='win_close()'><script language='Javascript'>function win_close(){ window.opener = top; window.close(); }</script></body></html>";
		
		if (organizer != null && organizer != '' && migrateEventTo != null && migrateEventTo != '') {
			var organizerIsInactive = nlapiLookupField('employee', organizer, 'isinactive');
			
			if (organizerIsInactive == 'T') {
				recEvent.setFieldValue('organizer', migrateEventTo);
				responseText = 'Successfully Changed Organizer.';
			}
			else {
				throw nlapiCreateError('PERMISSION', 'Cannot change organizer if current organizer is active.', true);
			}
		}
		
		if (userId != secSolRep && userId != organizer && userId != salesRep && (migrateEventTo == null || migrateEventTo == '')) {
			if (nlapiGetRole() != 3) { //ADMIN
				throw nlapiCreateError('PERMISSION', 'Only the event Organizer and/or Security Solutions Rep can modify event', true);
			}
		}
		
		recEvent.setFieldValue('status', status);
		recEvent.setFieldValue('custeventr7eventinternalnotes', internalNotes);
		recEvent.setFieldValue('custeventr7prodservicesinvolved', productsServices);
		
		if (status == 'CANCELLED') {
			recEvent.setFieldValue('custeventr7eventcancellationreason', request.getParameter('custpage_cancelreason'));
		}
		
		nlapiSubmitRecord(recEvent, true, true);
		
		response.writeLine(responseText);
		
	}
		
}

function sourceStatus(fld){
	
	fld.addSelectOption('', '');
	fld.addSelectOption('COMPLETE', 'Complete');
	fld.addSelectOption('CONFIRMED', 'Confirmed');
	fld.addSelectOption('TENTATIVE', 'Tentative');
	fld.addSelectOption('CANCELLED', 'Cancelled');

}

function sourceCancelReason(form, fld){
	
	fld.addSelectOption('', '');
	
	var fldTemp = form.addField('custpagetemp47813553693', 'select', 'temp', '246').setDisplayType('hidden');
	var arrSelectOptions = fldTemp.getSelectOptions();
	
	for (var i =0; arrSelectOptions != null && i < arrSelectOptions.length; i++){
		
		fld.addSelectOption(arrSelectOptions[i].getId(), arrSelectOptions[i].getText());
		
	}
}
