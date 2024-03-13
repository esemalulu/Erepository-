function pageInit_lm(type){
	//Populate the Attendees sublist with all preSales Reps
	//from that location
		
	if (nlapiGetFieldValue('status') == 'CANCELLED') {
		nlapiSetFieldMandatory('custeventr7eventcancellationreason', true);
		nlapiDisableField('custeventr7eventcancellationreason', false);
		nlapiDisableField('custeventr7livemeetingsendcancellations', false);
	}
	else {
		nlapiSetFieldMandatory('custeventr7eventcancellationreason', false);
		nlapiDisableField('custeventr7eventcancellationreason', true);
		nlapiSetFieldValue('custeventr7eventcancellationreason', '');
		nlapiDisableField('custeventr7livemeetingsendcancellations', true);
	}
		
	if (nlapiGetFieldValue('custeventr7eventconfcalltype') != 1 && nlapiGetFieldValue('custeventr7eventconfcalltype') != 4) {
		nlapiDisableField('custeventr7gtmorganizer', true);
		nlapiSetFieldValue('custeventr7gtmorganizer', '', false);
		nlapiSetFieldMandatory('custeventr7gtmorganizer', false);
	}
	else {
		nlapiDisableField('custeventr7gtmorganizer', false);
		nlapiSetFieldMandatory('custeventr7gtmorganizer', true);
	}
	
	if (nlapiGetFieldValue('custeventr7lmeventtemplate') == 'T') {
		nlapiSetFieldMandatory('custeventr7confbridgecode', false);
		nlapiSetFieldMandatory('custeventr7eventbridgeloc', false);
		nlapiSetFieldMandatory('custeventr7salesrepateventcreation', false);
		nlapiSetFieldMandatory('custeventr7gtmorganizer', false);
		nlapiSetFieldMandatory('custeventr7eventconfcalltype', false);
	}
	
	if (nlapiGetFieldValue('custeventr7onsite') == 'T') {
		nlapiSetFieldMandatory('custeventr7eventonsitelocation', true);
		nlapiDisableField('custeventr7eventonsitelocation', false);
	}
	else {
		nlapiSetFieldMandatory('custeventr7eventonsitelocation', false);
		nlapiDisableField('custeventr7eventonsitelocation', true);
	}
	
	if (type == 'create' || type == 'copy') {
		repopulateAttendeesList();
	}
	
	var eventType = nlapiGetFieldValue('custeventr7eventtype');
	
	if (eventType != 37) {
		nlapiSetFieldMandatory('custeventr7salesrepateventcreation', true);
		var recurrenceDoc = document.getElementById('recurrencelnk');
		if (recurrenceDoc == null) {
			recurrenceDoc = document.getElementById('recurrence_pane');
		}
		if (recurrenceDoc != null) {
			recurrenceDoc.style.display = 'none';
		}
		
	}
	else {
		var recurrenceDoc = document.getElementById('recurrencelnk');
		if (recurrenceDoc == null) {
			recurrenceDoc = document.getElementById('recurrence_pane');
		}
		if (recurrenceDoc != null) {
			recurrenceDoc.style.display = '';
		}
		nlapiSetFieldMandatory('custeventr7salesrepateventcreation', false);
	}	
	
	var attendeesDoc = document.getElementById('istatuslnk');
	if (attendeesDoc == null) {
		attendeesDoc = document.getElementById('istatus_pane');
	}
	if (attendeesDoc != null) {
		attendeesDoc.style.display = 'none';
	}
}

function repopulateAttendeesList(){

	nlapiSetFieldValue('sendemail', 'F');
		
	//Get Opp Record from nlapiGetFieldValue('customfield') set by 
	var oppId = nlapiGetFieldValue('transaction');
	
	if (oppId == null || oppId == '') {
		return;
	}
	
	try {
		var oppRecord = nlapiLoadRecord('opportunity', oppId);
	} 
	catch (err) {
		return;
	}
	
	var reps = obtainAttendeeListFromMattTurnerRules(oppRecord);	
	
	//alert("Reps obtained" + reps.length);
	
	while (nlapiGetLineItemCount('attendee') > 0) {
		//alert("Removing line item");
		nlapiSelectLineItem('attendee', 1);
		nlapiRemoveLineItem('attendee');
	}
	
	nlapiSetFieldValue('sendemail', 'T');
	
	for (var i = 0; reps != null && reps.length > 0 && i < reps.length; i++) {
		nlapiSelectNewLineItem('attendee');
		nlapiSetCurrentLineItemValue('attendee', 'attendee', reps[i], true, true);
		nlapiCommitLineItem('attendee');
	}
	
	nlapiRefreshLineItems('attendee');
	nlapiSetFieldValue('sendemail', 'F');
	
	if (reps == null || reps.length == 0) {
		alert("No Security Solutions Resources found. Please contact your nearest Sales Coordinator.");
	}
	
}

function fieldChanged_lm(type, name){

	var apiMeetingId = nlapiGetFieldValue('custeventr7apimeetingid') || nlapiGetFieldValue('custeventr7gtmmeetingid');
	
	if (name == 'custeventr7eventconfcalltype') {
		if (nlapiGetFieldValue('custeventr7eventconfcalltype') != 1 && nlapiGetFieldValue('custeventr7eventconfcalltype') != 4) {
			nlapiDisableField('custeventr7gtmorganizer', true);
			nlapiSetFieldValue('custeventr7gtmorganizer', '', false);
			nlapiSetFieldMandatory('custeventr7gtmorganizer', false);
		}
		else {
			nlapiDisableField('custeventr7gtmorganizer', false);
			nlapiSetFieldMandatory('custeventr7gtmorganizer', true);
		}
	}
	
	if (name == 'custeventr7lmeventtemplate') {
	
		if (nlapiGetFieldValue(name) == 'T') {
			nlapiSetFieldMandatory('custeventr7confbridgecode', false);
			nlapiSetFieldMandatory('custeventr7eventbridgeloc', false);
			nlapiSetFieldMandatory('custeventr7salesrepateventcreation', false);
			nlapiSetFieldMandatory('custeventr7gtmorganizer', false);
			nlapiSetFieldMandatory('custeventr7eventconfcalltype', false);
		}
	}
	
	if (name == 'custeventr7onsite') {
		if (nlapiGetFieldValue(name) == 'T') {
			nlapiSetFieldMandatory('custeventr7eventonsitelocation', true);
			nlapiDisableField('custeventr7eventonsitelocation', false);
		}
		else {
			nlapiSetFieldMandatory('custeventr7eventonsitelocation', false);
			nlapiDisableField('custeventr7eventonsitelocation', true);
		}
	}
	
	if (name == 'status') {
		if (nlapiGetFieldValue(name) == 'CANCELLED') {
			nlapiSetFieldMandatory('custeventr7eventcancellationreason', true);
			nlapiDisableField('custeventr7eventcancellationreason', false);
			nlapiSetFieldMandatory('custeventr7livemeetingsendcancellations', true);
			nlapiDisableField('custeventr7livemeetingsendcancellations', false);
		}
		else {
			nlapiSetFieldMandatory('custeventr7eventcancellationreason', false);
			nlapiDisableField('custeventr7eventcancellationreason', true);
			nlapiSetFieldValue('custeventr7eventcancellationreason', '');
			nlapiSetFieldMandatory('custeventr7livemeetingsendcancellations', false);
			nlapiDisableField('custeventr7livemeetingsendcancellations', true);
		}
	}
		
	if (name == 'custeventr7eventtype' || name == 'transaction') {
		repopulateAttendeesList();
	}
	
	if (name == 'custeventr7eventtype') {
		var eventType = nlapiGetFieldValue(name);
		if (eventType == 37) {
			nlapiSetFieldMandatory('custeventr7salesrepateventcreation', false);
			var recurrenceDoc = document.getElementById('recurrencelnk');
			if (recurrenceDoc == null) {
				recurrenceDoc = document.getElementById('recurrence_pane');
			}
			if (recurrenceDoc != null) {
				recurrenceDoc.style.display = '';
			}
		}
		else {
			var recurrenceDoc = document.getElementById('recurrencelnk');
			if (recurrenceDoc == null) {
				recurrenceDoc = document.getElementById('recurrence_pane');
			}
			if (recurrenceDoc != null) {
				recurrenceDoc.style.display = 'none';
			}
			nlapiSetFieldMandatory('custeventr7salesrepateventcreation', true);
		}
	}
	
	
	if (name == 'status') {
	
		if (nlapiGetFieldValue('status') == 'CANCELLED' && apiMeetingId != null && apiMeetingId != '') {
			alert("Cancelling");
		}
	}
	
}

function validateField_lm(type, name, lineNum){

	if (name == 'transaction') {
		var tranId = nlapiGetFieldValue('transaction');
		if (tranId != null && tranId != '') {
			var tranType = nlapiLookupField('transaction', nlapiGetFieldValue('transaction'), 'type');
			
			if (tranType != 'Opprtnty') {
				alert('Transaction selected is not an Opportunity. Please select an Opportunity.');
				return false;
			}
		}
	}
	return true;
}

function obtainAttendeeListFromMattTurnerRules(oppRecord){
	var attendeeList = new Array();

	var oppDetails = getKeyFeaturesOfOpp(oppRecord);
	
	var customerId = oppRecord.getFieldValue('entity');
	var customerFields = nlapiLookupField('customer', customerId, new Array('custentityr7fortune1000', 'territory'));
	var fortune1000 = customerFields['custentityr7fortune1000'];
	var salesTerritory = customerFields['territory'];
	var salesRep = nlapiGetFieldValue('custeventr7salesrepateventcreation');
	
	if (salesRep != null && salesRep != '') {
		//first grab any specif resouces availble to the sales rep
		var searchFilters = new Array();
		searchFilters[searchFilters.length] = new nlobjSearchFilter('custrecordr7presalesresourceres', null, 'is', 'notempty');
		searchFilters[searchFilters.length] = new nlobjSearchFilter('isinactive', null, 'is', 'F');
		searchFilters[searchFilters.length] = new nlobjSearchFilter('custrecordr7preresource_individemp', null, 'anyof', salesRep);
		
		var searchColumns = new Array(new nlobjSearchColumn('custrecordr7presalesresourceres'));
		
		var results = nlapiSearchRecord('customrecordr7presalesresource', null, searchFilters, searchColumns);

		for (var i = 0; results != null && i < results.length; i++) {
			attendeeList[attendeeList.length] = results[i].getValue('custrecordr7presalesresourceres');
		}
		
	}
	
	//normal rules
	var searchFilters = new Array();
	
	searchFilters[searchFilters.length] = new nlobjSearchFilter('custrecordr7presalesresourceres', null, 'is', 'notempty');
	searchFilters[searchFilters.length] = new nlobjSearchFilter('isinactive', null, 'is', 'F');
	//Employee location
	if (nlapiGetFieldValue('custeventr7salesrepateventcreation') != null && nlapiGetFieldValue('custeventr7salesrepateventcreation') != '') {
		var location = nlapiGetFieldValue('custeventr7eventsalesreplocation');

		searchFilters[searchFilters.length] = new nlobjSearchFilter('custrecordr7presaleslocation', null, 'anyof', new Array('@NONE@', location));
		
	}
	
	//presales at risk
	if (oppDetails.presalesAtRisk != null && oppDetails.presalesAtRisk != '' && oppDetails.presalesAtRisk != 'F') {
		searchFilters[searchFilters.length] = new nlobjSearchFilter('custrecordr7presalesresatrish', null, 'is', oppDetails.presalesAtRisk);
	}
	
	//rapid track opp
	if (oppDetails.rapidTrack != null && oppDetails.rapidTrack != '' && oppDetails.rapidTrack != 'F') {
		searchFilters[searchFilters.length] = new nlobjSearchFilter('custrecordr7presalesresrapidtrack', null, 'is', oppDetails.rapidTrack);
	}
	
	//Fortune1000
	if (fortune1000 != null && fortune1000 != '' && fortune1000 != 'F') {
		searchFilters[searchFilters.length] = new nlobjSearchFilter('custrecordr7presalesresfort1000opp', null, 'is', 'T');
	}
	
	//Sales Territory
	if (salesTerritory != null && salesTerritory != '') {
		searchFilters[searchFilters.length] = new nlobjSearchFilter('custrecordr7presalesresourceterritory', null, 'anyof', new Array('@NONE@', salesTerritory));
	}
	
	//Opportunity Type
	if (oppDetails.opportunityType != null && oppDetails.opportunityType != '') {
		searchFilters[searchFilters.length] = new nlobjSearchFilter('custrecordr7presalesresopptype', null, 'anyof', new Array('@NONE@', oppDetails.opportunityType));
	}
	
	//Event Type
	if (nlapiGetFieldValue('custeventr7eventtype') != null && nlapiGetFieldValue('custeventr7eventtype') != '') {
		searchFilters[searchFilters.length] = new nlobjSearchFilter('custrecordr7presalesreseventtype', null, 'anyof', new Array('@NONE@', nlapiGetFieldValue('custeventr7eventtype')));
	}
	
	if (oppDetails.projectedTotal != null && oppDetails.projectedTotal != '') {
		var projectedTotal = parseInt(oppDetails.projectedTotal);
		
		searchFilters[searchFilters.length] = new nlobjSearchFilter('custrecordr7presalesresopplowerlimit', null, 'lessthanorequalto', projectedTotal);
		searchFilters[searchFilters.length] = new nlobjSearchFilter('custrecordr7presalesreslimit', null, 'greaterthanorequalto', projectedTotal);
	}
	
	if (oppDetails.partner != null && oppDetails.partner != ''){
		searchFilters[searchFilters.length] = new nlobjSearchFilter('custrecordr7presalesresourcepartner', null, 'anyof', new Array(1, 3));
	} else {
		searchFilters[searchFilters.length] = new nlobjSearchFilter('custrecordr7presalesresourcepartner', null, 'anyof', new Array(2, 3));
	}
	
	var searchColumns = new Array(new nlobjSearchColumn('custrecordr7presalesresourceres'));
	
	var results = nlapiSearchRecord('customrecordr7presalesresource', null, searchFilters, searchColumns);

	for (var i = 0; results != null && results.length >= 1 && i < results.length; i++) {
		attendeeList[attendeeList.length] = results[i].getValue('custrecordr7presalesresourceres');
	}
	
	attendeeList[attendeeList.length] = nlapiGetUser();
	return unique(attendeeList);
	
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

function getKeyFeaturesOfOpp(oppRecord){
	
	var features = new Object();
	features.opportunityType =oppRecord.getFieldValues('custbodyr7opportunitytype');
	features.projectedTotal=oppRecord.getFieldValue('projectedtotal');
	features.presalesAtRisk =oppRecord.getFieldValue('custbodyr7presalesoppatrisk');
	features.fortune1000=oppRecord.getFieldValue('custentityr7fortune1000');
	features.presalesRadar=oppRecord.getFieldValues('custbodyr7presalesoppradar');
	features.partner=oppRecord.getFieldValue('partner');
	features.salesrep=oppRecord.getFieldValue('salesrep');
	features.rapidTrack=oppRecord.getFieldValue('custbodyr7opprapid7track');
	// features.salesRepTerritory = 'boom'; //hold off for MT
	// features.supportCaseStatus = 'boom'; //hold off for now

	return features;
}


function findPreSalesReps(location){
	var searchFilters = new Array();
	searchFilters[searchFilters.length] = new nlobjSearchFilter('salesrep',null,'is','T');
	searchFilters[searchFilters.length] = new nlobjSearchFilter('location',null,'is',location);
	var searchResults = nlapiSearchRecord('employee',null,searchFilters);
	return searchResults;	
}

function saveRecord_lm(){
	
	var userId = nlapiGetUser();
	var roleId = nlapiGetRole();
	
	if (userId == 55011) {
		return true;
	}
	
	var eventType = nlapiGetFieldValue('custeventr7eventtype');
	var secSolRep = nlapiGetFieldValue('custeventr7eventsupportrep');
	var gtm_organizer = nlapiGetFieldValue('custeventr7gtmorganizer');
	
	if (secSolRep == null || secSolRep == '') {
		if (eventType != 41 && eventType != 11 && userId != 55011) {
			nlapiSetFieldMandatory('custeventr7eventsupportrep', true);
			alert('Please select a Security Solutions Rep.');
			return false;
		}
	}
	
	var confirmedTimes = confirmStartEndTime();
	if (!confirmedTimes) {
		return false;
	}
	
	if (roleId != 1057 && roleId != 1026 && roleId != 1081 && roleId != 1072 && roleId != 1025 && userId != 55011) {
		var validSecSolRep = isValidSecSolRep();
		if (!validSecSolRep) {
			return false;
		}
	}
	if (secSolRep != null && secSolRep != '') {
		var secSolAvailable = checkSecSolRepAvailability();
		if (!secSolAvailable) {
			return false;
		}
	}
	
	if (gtm_organizer != null && gtm_organizer != '' && gtm_organizer != secSolRep) {
		var orgAvailable = checkGTMOrgAvailability();
		if (!orgAvailable) {
			return false;
		}
	}
	
	return true;
}

function isValidSecSolRep(){

	var secSolRep = nlapiGetFieldValue('custeventr7eventsupportrep');
	
	if (secSolRep != null && secSolRep != '') {
		try {
			var oppRecord = nlapiLoadRecord('opportunity', nlapiGetFieldValue('transaction'));
			var reps = obtainAttendeeListFromMattTurnerRules(oppRecord);
			
			var foundRep = false;
			for (var i = 0; reps != null && i < reps.length; i++) {
			
				if (reps[i] == secSolRep) {
					foundRep = true;
					break;
				}
			}
			
			if (!foundRep) {
				alert('You have selected an invalid Security Solutions Rep. Please choose one from the list below.');
				repopulateAttendeesList();
				return false;
			}
		} 
		catch (err) {
			return true;
		}
	}
	
	return true;
}

function confirmStartEndTime(){

	try {
		var startTime = nlapiGetFieldValue('starttime');
		var endTime = nlapiGetFieldValue('endtime');
		
		var startDate = nlapiStringToDate('01/01/2000 ' + startTime);
		var endDate = nlapiStringToDate('01/01/2000 ' + endTime);
		
		var startHour = startDate.getHours();
		var endHour = endDate.getHours();
		
		if (startHour < 7 || startHour > 17) {
			return confirm('NOTICE:\nAre you sure you would like to schedule this event ' + startTime + ' - ' + endTime + '?');
		}
		
		if (endHour < 7 || endHour > 17) {
			return confirm('NOTICE:\nAre you sure you would like to schedule this event ' + startTime + ' - ' + endTime + '?');
		}
	} 
	catch (e) {
		return true;
	}
	
	return true;
}

function checkSecSolRepAvailability(){

	var secSolRep = nlapiGetFieldValue('custeventr7eventsupportrep');
	var date = nlapiGetFieldValue('startdate');
	var startTime = nlapiGetFieldValue('starttime');
	var endTime = nlapiGetFieldValue('endtime');
	var status = nlapiGetFieldValue('status');
	
	if (status == 'COMPLETED' || status == 'CANCELLED') {
		return true;
	}
	
	if (secSolRep != null && secSolRep != '' && date != null && date != '' && startTime != null && startTime != '' && endTime != null && endTime != '') {
	
		var dtStart = new Date(date + ' ' + startTime);
		var dtEnd = new Date(date + ' ' + endTime);
		
		var strStartUTC = dtStart.toUTCString();
		var strEndUTC = dtEnd.toUTCString();

		var params = new Array();
		params['custparam_internalid'] = nlapiGetRecordId();
		params['custparam_secsolrep'] = secSolRep;
		params['custparam_date'] = date;
		params['custparam_starttime'] = strStartUTC;
		params['custparam_endtime'] = strEndUTC;

		var response = nlapiRequestURL('/app/site/hosting/scriptlet.nl?script=564&deploy=1&time=' + Math.floor(Math.random() * 9999999), params);
		
		var isAvailable = response.getBody();
		
		if (isAvailable != 'T') {
			alert('Security Solutions Rep is already booked at the selected time.\n\nConflicting Event: ' + isAvailable);
			repopulateAttendeesList();
			return false;
		}
	}
	
	return true;
	
}

function checkGTMOrgAvailability(){

	var gtm_organizer = nlapiGetFieldValue('custeventr7gtmorganizer');
	var date = nlapiGetFieldValue('startdate');
	var startTime = nlapiGetFieldValue('starttime');
	var endTime = nlapiGetFieldValue('endtime');
	var status = nlapiGetFieldValue('status');
	
	if (status == 'COMPLETED' || status == 'CANCELLED') {
		return true;
	}
	
	if (gtm_organizer != null && gtm_organizer != '' && date != null && date != '' && startTime != null && startTime != '' && endTime != null && endTime != '') {
	
		var dtStart = new Date(date + ' ' + startTime);
		var dtEnd = new Date(date + ' ' + endTime);
		
		var strStartUTC = dtStart.toUTCString();
		var strEndUTC = dtEnd.toUTCString();

		var params = new Array();
		params['custparam_internalid'] = nlapiGetRecordId();
		params['custparam_gtmorganizer'] = gtm_organizer;
		params['custparam_date'] = date;
		params['custparam_starttime'] = strStartUTC;
		params['custparam_endtime'] = strEndUTC;

		var response = nlapiRequestURL('/app/site/hosting/scriptlet.nl?script=564&deploy=1&time=' + Math.floor(Math.random() * 9999999), params);
		
		var isAvailable = response.getBody();
		
		if (isAvailable != 'T') {
			alert('The GoToMeeting Organizer is already booked at the selected time.\n\nConflicting Event ID: ' + isAvailable);
			repopulateAttendeesList();
			return false;
		}
	}
	
	return true;
	
}

function getSupersetOfPresenters(){
	var presenterList = new Array();
    
    if (nlapiGetFieldValue('custeventr7eventsupportrep') != null) {
        presenterList[presenterList.length] = nlapiGetFieldValue('custeventr7eventsupportrep');
    }
    
    if (nlapiGetFieldValue('custeventr7salesrepateventcreation') != null) {
        presenterList[presenterList.length] = nlapiGetFieldValue('custeventr7salesrepateventcreation');
    }
	
    if (nlapiGetFieldValue('organizer') != null) {
        presenterList[presenterList.length] = nlapiGetFieldValue('organizer');
    }
    
    if (nlapiGetFieldValues('custeventr7eventemployeesinvolved') != null) {
        var list = nlapiGetFieldValues('custeventr7eventemployeesinvolved');
        for (var i = 0; list != null && i < list.length; i++) {
            presenterList[presenterList.length] = list[i];
        }
    }
    
 	var redundantList = presenterList;
	var temp = new Array(); var nonRedundantList = new Array();
	for(var i=0;i<redundantList.length;i++){
		temp[redundantList[i]]=1;
	}
	for (key in temp){
		if(temp[key]==1)nonRedundantList[nonRedundantList.length] = key; 
	}
	
    return nonRedundantList;
}


