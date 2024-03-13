/*
 * MB: 9/27/16 - Removeed the createLicense() afterSubmit function.  It is legacy code that is no longer needed.
 * 				 Converted user access restrictions to use Check Custom Script Permissions
 * 				 Removed legacy PSO Survey sent button
 */
function beforeLoad(type, form){
	if (type == 'view') {
		var contactId = nlapiGetRecordId();
		var customerId = nlapiGetFieldValue('company');
		form.setScript('customscript_windowopen_cs');
		var suiteletURL = nlapiResolveURL('SUITELET', 'customscriptr7createlicensefromtemplate', 'customdeployr7createlicensefromtemplate', false);
		var url = suiteletURL + '&custparam_customer=' + customerId + '&custparam_contact=' + contactId;
		
		// The create license button uses the same custom script permission as the customer record button
		if (customerId && userHasPermission('create_license_button')) {
			form.addButton('custpage_create_evallicense', 'Create License', 'popUpWindow(\'' + url + '\', \'500\',\'500\');');
		}
		
		if (userHasPermission('contact_salesforce_flag_button')) {
			if (nlapiGetFieldValue('custentityr7saleforceupdateflag') == 'T') {
				form.addButton('custpage_syncto_salesforce', 'Unset SF Flag', 'nlapiSubmitField(nlapiGetRecordType(), nlapiGetRecordId(), \'custentityr7saleforceupdateflag\', \'F\');');
			}
			else {
				form.addButton('custpage_syncto_salesforce', 'Set SF Flag', 'nlapiSubmitField(nlapiGetRecordType(), nlapiGetRecordId(), \'custentityr7saleforceupdateflag\', \'T\');');
			}

		}
		// The create event button uses the same custom script permission as the customer record button
		if (userHasPermission('create_event_button')) {
			if (nlapiGetFieldValue('email') != null && nlapiGetFieldValue('email') != '') {
				var eventSuiteletURL = nlapiResolveURL('SUITELET', 'customscriptr7livemeetinglanding_suitele', 'customdeployr7livemeetinglanding_suitele', false);
				eventSuiteletURL = eventSuiteletURL + '&custparam_contact=' + contactId;
				form.addButton('custpage_createevent', 'Create Event', 'replaceWindow(\'' + eventSuiteletURL + '\');');
			}
		}
	}
}