/*
 * @author efagone
 */

function createLMEvent(request, response){

	if (request.getMethod() == 'GET') {
	
		//grab all parameters supplied
		var opportunityId = request.getParameter('custparam_opportunity');
		var customerId = request.getParameter('custparam_customer');
		var contactId = request.getParameter('custparam_contact');
		
		var redirect = false;
		if ((customerId == null || customerId == '') && (opportunityId == null || opportunityId == '') && (contactId == null || contactId == '')) {
			redirect = true;
			customerId = 130910;
		}
		
		var form = nlapiCreateForm('Create New Event', false);
		form.setScript('customscriptr7livemeetinglanding_suit_cs');
		form.addFieldGroup('primarygroup', 'Primary Infomation');
		form.addFieldGroup('eventgroup', 'Event Details');
		
		var fldCustomer = form.addField('custpage_customer', 'select', 'Customer', 'customer', 'primarygroup');
		var fldIsPartner = form.addField('custpage_ispartner', 'checkbox').setDisplayType('hidden');
		var fldEventType = form.addField('custpage_eventtype', 'select', 'Event Type', null, 'primarygroup');
		var fldOpportunity = form.addField('custpage_opportunity', 'select', 'Opportunity', null, 'primarygroup');
		
		var fldPassDate = form.addField('custpage_date', 'text').setDisplayType('hidden');
		var fldPassTime = form.addField('custpage_time', 'text').setDisplayType('hidden');
		var fldPassEndTime = form.addField('custpage_endtime', 'text').setDisplayType('hidden');
		var fldPassEmployeeList = form.addField('custpage_employeelist', 'select', null, 'employee').setDisplayType('hidden');
		
		fldPassDate.setDefaultValue(request.getParameter('custparam_date'));
		fldPassTime.setDefaultValue(request.getParameter('custparam_time'));
		fldPassEndTime.setDefaultValue(request.getParameter('custparam_endtime'));
		
		if (request.getParameter('custparam_employeelist') != null && request.getParameter('custparam_employeelist') != '') {
			var arrEmployeeList = request.getParameter('custparam_employeelist').split(",");
			fldPassEmployeeList.setDefaultValue(arrEmployeeList);
		}
		
	
		var fldCustomerContacts = form.addField('custpage_custcontacts', 'multiselect', 'Customer Contact(s)', null, 'eventgroup');
		
		fldCustomer.setDisplaySize(250);
		fldOpportunity.setDisplaySize(350);
		fldEventType.setDisplaySize(350);
		fldCustomerContacts.setDisplaySize(250, 10);
		
		fldCustomer.setMandatory(true);
		fldOpportunity.setMandatory(true);
		fldEventType.setMandatory(true);

		fldCustomer.setLayoutType('normal', 'startcol');

		if (customerId == null || customerId == '') {
		
			if (opportunityId != null && opportunityId != '') {
				customerId = findCustomer(opportunityId);
			}
			else 
				if (contactId != null && contactId != '') {
					customerId = findCustomerContact(contactId);
				}
		}
		if (customerId == null || customerId == '') {
			customerId = 130910;
			redirect = true;
		}
		
		fldCustomer.setDefaultValue(customerId);
		try {
			if (isPartner(customerId)) {
				fldOpportunity.setMandatory(false);
				fldIsPartner.setDefaultValue('T');
			}
		}
		catch (e){
			nlapiLogExecution('ERROR', 'Could not find company type', e);
		}
		
		if (redirect == false) {
			fldCustomer.setDisplayType('inline');
		}
		
		sourceOpportunities(customerId, fldOpportunity);
		sourceContacts(customerId, fldCustomerContacts);
		sourceEventTypes(fldEventType);

		fldCustomerContacts.setDefaultValue(contactId);
		
		if (opportunityId != '' && opportunityId != null) {
			fldOpportunity.setDefaultValue(opportunityId);
			fldOpportunity.setDisplayType('inline');
		}
		
		form.addSubmitButton('Continue');
		response.writePage(form);
		
	}
	
	if (request.getMethod() == 'POST') {
		
		var customerId = request.getParameter('custpage_customer');
		var eventType = request.getParameter('custpage_eventtype');
		var opportunityId = request.getParameter('custpage_opportunity');

		if (eventType != null && eventType != '' && customerId != null && customerId != '') {
		
			var recEvent = nlapiLoadRecord('calendarevent', eventType);
			var customerName = nlapiLookupField('customer', customerId, 'companyname');
			var recOpportunity = null;
			if (opportunityId != null && opportunityId != '') {
				recOpportunity = nlapiLoadRecord('opportunity', opportunityId);
			}

			var params = new Array();
			params['record.status'] = 'TENTATIVE';
			params['record.title'] = customEncodeURIComponent(recEvent.getFieldValue('title') + ' - ' + customerName);
			params['record.organizer'] = nlapiGetUser();
			params['record.custeventr7eventcustominvitationmessage'] = customEncodeURIComponent(recEvent.getFieldValue('custeventr7eventcustominvitationmessage'));
			params['record.custeventr7eventconfcalltype'] = recEvent.getFieldValue('custeventr7eventconfcalltype');
			params['record.custeventr7eventcustomercontactsinvld'] = request.getParameter('custpage_custcontacts');
			//params['record.custeventr7eventemployeesinvolved'] = request.getParameter('custpage_employeelist');
			params['record.company'] = customerId;
			params['record.transaction'] = opportunityId;
			params['record.custeventr7eventtype'] = recEvent.getFieldValue('custeventr7eventtype');
			params['cf'] = 48;
			params['r7stick'] = 'T';
			
			if (recOpportunity != null) {
                                params['record.custeventr7eventsupportrep'] = recOpportunity.getFieldValue('custbodyr7presalesopprep');
				//params['record.custeventr7eventbridgeloc'] = recOpportunity.getFieldValue('location');
                                //Change accorging GoTo Meeting conference bridges location
                                var salesRepId = recOpportunity.getFieldValue('salesrep');
                                params['record.custeventr7eventbridgeloc'] = nlapiLookupField('employee', salesRepId, 'location');
				params['record.custeventr7salesrepateventcreation'] = salesRepId;
				
			}
			if (request.getParameter('custpage_date') != null && request.getParameter('custpage_date') != '' && request.getParameter('custpage_time') != null && request.getParameter('custpage_time') != '' && request.getParameter('custpage_endtime') != null && request.getParameter('custpage_endtime') != '') {
				params['date'] = request.getParameter('custpage_date');
				params['time'] = request.getParameter('custpage_time');
				params['endtime'] = request.getParameter('custpage_endtime');
			}
			nlapiSetRedirectURL('RECORD', 'calendarevent', null, 'edit', params);
			
			
		}
		
	}
}

function sourceEventTypes(fld){

	fld.addSelectOption('', '');
	
	var arrSearchFilters = new Array();
	arrSearchFilters[arrSearchFilters.length] = new nlobjSearchFilter('custeventr7lmeventtemplate', null, 'is', 'T');
	
	var arrSearchColumns = new Array();
	arrSearchColumns[0] = new nlobjSearchColumn('internalid', null, 'group');
	arrSearchColumns[1] = new nlobjSearchColumn('title', null, 'max');
	arrSearchColumns[2] = new nlobjSearchColumn('custeventr7lmeventtypecategory', null, 'max').setSort(false);
	
	var arrSearchResults = nlapiSearchRecord('calendarevent', null, arrSearchFilters, arrSearchColumns);
	
	if (arrSearchResults != null) {
		arrSearchResults = arrSearchResults.sort(myCustomSort);
	}
	var arrOthers = new Array();
	
	for (var i = 0; arrSearchResults != null && i < arrSearchResults.length; i++) {
	
		var eventId = arrSearchResults[i].getValue(arrSearchColumns[0]);
		var eventType = arrSearchResults[i].getValue(arrSearchColumns[2]);
		var eventTitle = arrSearchResults[i].getValue(arrSearchColumns[1]);
		
		if (eventType.toLowerCase() != 'other') {
			fld.addSelectOption(eventId, eventType + ' - ' + eventTitle);
		}
		else {
			arrOthers[arrOthers.length] = new Array(eventId, 'Other - ' + eventTitle);
		}
		
	}
	
	for (var i = 0; arrOthers != null && i < arrOthers.length; i++) {
	
		fld.addSelectOption(arrOthers[i][0], arrOthers[i][1]);
	}
}

function customEncodeURIComponent(str){
	
	//str = encodeURIComponent(str);
	//str = str.replace(/%20/g, '+');
	
	return str;
	
}

function calculateStartEndTime(startTime, duration){
	
	var startHour = startTime.substr(0, startTime.indexOf(':'));
	var startMin = startTime.substr(startTime.indexOf(':') + 1, 2);
	var startAMPM = startTime.substr(startTime.indexOf(' '));
	
	if (startAMPM.toLowerCase() == 'pm' && startHour != '12'){
		startHour = parseInt(startHour) + 12;
	}
	
	var durationHours = duration.substr(0, duration.indexOf('.'));
	var durationMins = duration.substr(duration.indexOf('.'), duration.indexOf(' ') - 1);
	
	var tempDate = new Date(2012, 01, 01, startHour, startMin);
	var adminUser =  nlapiLoadConfiguration('companypreferences').getFieldValue('custscriptr7_system_info_email_sender');
	nlapiSendEmail(adminUser, adminUser, 'timeInfo', tempDate + '\n' + startHour + '\n' + startMin + '\n' + startAMPM + '\n' + durationHours + '\n' + durationMins);
		
	if (startHour != null && startHour != '' && durationHours != null && durationHours != ''){
		tempDate.setHours(tempDate.getHours() + parseFloat(durationHours));	
	}
	if (startMin != null && startMin != '' && durationMins != null && durationMins != ''){
		tempDate.setMinutes(tempDate.getMinutes() + (parseFloat(durationMins) * 60));	
	}
	
	var newStartTime = nlapiDateToString(tempDate, 'timeofday');
	
	nlapiSendEmail(adminUser, adminUser, 'newStartTime', newStartTime);
	
	return newStartTime;
	
}

function sourceCompanies(customerId, fldCustomer){

	fldCustomer.addSelectOption('', '');
	
	var arrSearchFilters = new Array();
	arrSearchFilters[arrSearchFilters.length] = new nlobjSearchFilter('isinactive', null, 'is', 'F');
	
	var arrSearchColumns = new Array();
	arrSearchColumns[0] = new nlobjSearchColumn('companyname').setSort(true);
	arrSearchColumns[1] = new nlobjSearchColumn('internalid');

	var arrSearchResults = nlapiSearchRecord('customer', null, arrSearchFilters, arrSearchColumns);
	
	for (var i = 0; arrSearchResults != null && i < arrSearchResults.length; i++) {
	
		var searchResult = arrSearchResults[i];
		var companyId = searchResult.getId();
		var companyName = searchResult.getValue(arrSearchColumns[0]);
		
		fldCustomer.addSelectOption(companyId, 'Customer: ' + companyName);
	}
	
	var arrSearchFilters = new Array();
	arrSearchFilters[arrSearchFilters.length] = new nlobjSearchFilter('isinactive', null, 'is', 'F');
	
	var arrSearchColumns = new Array();
	arrSearchColumns[0] = new nlobjSearchColumn('companyname').setSort(true);
	arrSearchColumns[1] = new nlobjSearchColumn('internalid');
	
	var arrSearchResults = nlapiSearchRecord('partner', null, arrSearchFilters, arrSearchColumns);
	
	for (var i = 0; arrSearchResults != null && i < arrSearchResults.length; i++) {
	
		var searchResult = arrSearchResults[i];
		var companyId = searchResult.getId();
		var companyName = searchResult.getValue(arrSearchColumns[0]);
		
		fldCustomer.addSelectOption(companyId, 'Partner: ' + companyName);
	}
	
}

function sourceOpportunities(customerId, fldOpportunity){
	
	fldOpportunity.addSelectOption('', '');
	
	var arrSearchFilters = new Array();
	arrSearchFilters[arrSearchFilters.length] = new nlobjSearchFilter('entity', null, 'is', customerId);
	arrSearchFilters[arrSearchFilters.length] = new nlobjSearchFilter('probability', null, 'greaterthan', 0);
	arrSearchFilters[arrSearchFilters.length] = new nlobjSearchFilter('probability', null, 'lessthan', 100);
	
	var arrSearchColumns = new Array();
	arrSearchColumns[0] = new nlobjSearchColumn('tranid').setSort(true);
	arrSearchColumns[1] = new nlobjSearchColumn('title');
	arrSearchColumns[2] = new nlobjSearchColumn('entitystatus');
	arrSearchColumns[3] = new nlobjSearchColumn('expectedclosedate');
	
	var arrSearchResults = nlapiSearchRecord('opportunity', null, arrSearchFilters, arrSearchColumns);
	
	for (var i = 0; arrSearchResults != null && i < arrSearchResults.length; i++) {
		
		var searchResult = arrSearchResults[i];
		var oppId = searchResult.getId();
		var tranId = searchResult.getValue(arrSearchColumns[0]);
		var title = searchResult.getValue(arrSearchColumns[1]);
		
		var optionText = tranId + ': ' + title;
		
		fldOpportunity.addSelectOption(oppId, optionText);
	}
	
}

function sourceStartTime(form, fld){
	
	fld.addSelectOption('', '');
	
	var fldTemp = form.addField('custpagetemp463568791693', 'select', null, '479').setDisplayType('hidden');
	var arrSelectOptions = fldTemp.getSelectOptions();
	
	for (var i =0; arrSelectOptions != null && i < arrSelectOptions.length; i++){
		
		fld.addSelectOption(arrSelectOptions[i].getText(), arrSelectOptions[i].getText());
		
	}
}

function sourceDuration(form, fld){
	
	fld.addSelectOption('', '');
	
	var fldTemp = form.addField('custpagetemp038327216', 'select', null, '480').setDisplayType('hidden');
	var arrSelectOptions = fldTemp.getSelectOptions();
	
	for (var i =0; arrSelectOptions != null && i < arrSelectOptions.length; i++){
		
		fld.addSelectOption(arrSelectOptions[i].getText(), arrSelectOptions[i].getText());
		
	}
}

function sourceContacts(customerId, fldContact){
	
	var arrSearchFilters = new Array();
	arrSearchFilters[arrSearchFilters.length] = new nlobjSearchFilter('isinactive', null, 'is', 'F');
	arrSearchFilters[arrSearchFilters.length] = new nlobjSearchFilter('company', null, 'is', customerId);
	arrSearchFilters[arrSearchFilters.length] = new nlobjSearchFilter('email', null, 'isnotempty');
	
	var arrSearchColumns = new Array();
	arrSearchColumns[0] = new nlobjSearchColumn('entityid');
	arrSearchColumns[1] = new nlobjSearchColumn('email');
	
	var arrSearchResults = nlapiSearchRecord('contact', null, arrSearchFilters, arrSearchColumns);
	
	for (var i = 0; arrSearchResults != null && i < arrSearchResults.length; i++) {
		
		var searchResult = arrSearchResults[i];
		var contactId = searchResult.getId();
		var contactName = searchResult.getValue(arrSearchColumns[0]);
	
		fldContact.addSelectOption(contactId, contactName);
	
	}
	
}

function validCustomer(customerId){

	if (customerId != null && customerId != '') {
		var arrSearchFilters = new Array();
		arrSearchFilters[0] = new nlobjSearchFilter('internalid', null, 'is', customerId);
		
		var arrSearchResults = nlapiSearchRecord('customer', null, arrSearchFilters);
		
		if (arrSearchResults != null) {
			return true;
		}
	}
	else {
		return false;
	}
}

function findCustomer(oppId){

	if (oppId != '' && oppId != null) {
		var arrSearchFilters = new Array();
		arrSearchFilters[0] = new nlobjSearchFilter('internalid', null, 'is', oppId);
		
		var arrSearchColumns = new Array();
		arrSearchColumns[0] = new nlobjSearchColumn('entity');
		
		var arrSearchResults = nlapiSearchRecord('opportunity', null, arrSearchFilters, arrSearchColumns);
		
		if (arrSearchResults != null) {
			var companyId = arrSearchResults[0].getValue(arrSearchColumns[0]);
			return companyId;
		}
		else 
			return '';
	}
	else {
		return '';
	}
}

function findCustomerContact(contactId){

	if (contactId != '' && contactId != null) {
		var arrSearchFilters = new Array();
		arrSearchFilters[0] = new nlobjSearchFilter('internalid', null, 'is', contactId);
		
		var arrSearchColumns = new Array();
		arrSearchColumns[0] = new nlobjSearchColumn('company');
		
		var arrSearchResults = nlapiSearchRecord('contact', null, arrSearchFilters, arrSearchColumns);
		
		if (arrSearchResults != null) {
			var companyId = arrSearchResults[0].getValue(arrSearchColumns[0]);
			//nlapiSendEmail(55011, 55011, 'CompanyId', 'is ' + companyId + 'contactid is: ' + contactId);
			return companyId;
		}
		else 
			return '';
	}
	else {
		return '';
	}
}

function isPartner(customerId){

	if (customerId != '' && customerId != null) {
		var arrSearchFilters = new Array();
		arrSearchFilters[0] = new nlobjSearchFilter('internalid', null, 'is', customerId);

		var arrSearchResults = nlapiSearchRecord('partner', null, arrSearchFilters);
		
		if (arrSearchResults != null && arrSearchResults.length > 0) {
			return true;
		}
	}
	return false;
}

function grabAvailableConferenceBridge(location){
	
	var arrSearchFilters = new Array();
	arrSearchFilters[arrSearchFilters.length] = new nlobjSearchFilter('custrecordcustrecordr7conflocation', null, 'is', location);
	arrSearchFilters[arrSearchFilters.length] = new nlobjSearchFilter('custrecordr7confbridgecodeavailable', null, 'is', 'T');
	
	var arrSearchResults = nlapiSearchRecord('customrecordr7conferencebridge', null, arrSearchFilters);
	
	if (arrSearchResults != null) {
				
		return arrSearchResults[0].getId();
	}
	
	return '';
}

function myCustomSort(a, b){
	//nlapiSendEmail(55011, 55011, 'a.getValue','is: ' + a.getValue('custeventr7lmeventtypecategory'));
	var resultA = a.getValue('custeventr7lmeventtypecategory', null, 'max') + a.getValue('title', null, 'max');
	var resultB = b.getValue('custeventr7lmeventtypecategory', null, 'max') + b.getValue('title', null, 'max');
	
	if (resultA < resultB) //sort string ascending
		return -1;
	if (resultA > resultB) 
		return 1;
	return 0; //default return value (no sorting)
}

