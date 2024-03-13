/*
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       31 Aug 2012     efagone
 *
 */

/*
 * @param {nlobjRequest} request Request object
 * @param {nlobjResponse} response Response object
 * @returns {Void} Any output is written via response object
 */

function isEmpAvailable(request, response){

	var internalId = request.getParameter('custparam_internalid');
	var secSolRepId = request.getParameter('custparam_secsolrep');
	var gtm_organizer = request.getParameter('custparam_gtmorganizer');
	var date = request.getParameter('custparam_date');
	var startTime = request.getParameter('custparam_starttime');
	var endTime = request.getParameter('custparam_endtime');
	var checkByEvent = request.getParameter('custparam_checkbyevent');
	
	try {
	
		var isAvailable = true;
		var conflictsWith = '';
		var dtStartUTC = null;
		var dtEndUTC = null;
			
		if (internalId != null && internalId != '' && checkByEvent == 'T') {
		
			var arrDates = getEventUTCDates(internalId);
			dtStartUTC = arrDates[0];
			dtEndUTC = arrDates[1];
			nlapiLogExecution('DEBUG', 'Checking Conflict For Dates', 'Start: ' + dtStartUTC + '\nEnd: ' + dtEndUTC);
			
		}
		else {
			dtStartUTC = new Date(startTime);
			dtEndUTC = new Date(endTime);
			nlapiLogExecution('DEBUG', 'Checking Conflict For Dates', 'startTime: ' + startTime + '\nStart: ' + dtStartUTC + '\nEnd: ' + dtEndUTC);
		}

		if (((secSolRepId != null && secSolRepId != '') || (gtm_organizer != null && gtm_organizer != '')) && dtStartUTC != null && dtStartUTC != '' && dtEndUTC != null && dtEndUTC != '' && date != null && date != '') {
					
			var arrSearchFilters = new Array();
			if (internalId != null && internalId != '') {
				arrSearchFilters[arrSearchFilters.length] = new nlobjSearchFilter('internalid', null, 'noneof', internalId);
			}
			if (secSolRepId != null && secSolRepId != '') {
				arrSearchFilters[arrSearchFilters.length] = new nlobjSearchFilter('custeventr7eventsupportrep', null, 'anyof', secSolRepId);
			}
			else 
				if (gtm_organizer != null && gtm_organizer != '') {
					arrSearchFilters[arrSearchFilters.length] = new nlobjSearchFilter('custeventr7gtmorganizer', null, 'anyof', gtm_organizer);
				}
			arrSearchFilters[arrSearchFilters.length] = new nlobjSearchFilter('date', null, 'on', date);
			arrSearchFilters[arrSearchFilters.length] = new nlobjSearchFilter('status', null, 'anyof', new Array('CONFIRMED', 'TENTATIVE'));

			var arrSearchResults = nlapiSearchRecord('calendarevent', 14561, arrSearchFilters);
			
			for (var i = 0; arrSearchResults != null && i < arrSearchResults.length; i++) {

				var eventId = arrSearchResults[i].getId();
				
				var columns = arrSearchResults[i].getAllColumns();
				var eventTitle = arrSearchResults[i].getValue(columns[1]);
				var strCurrentStartUTC = arrSearchResults[i].getValue(columns[3]);
				var strCurrentEndUTC = arrSearchResults[i].getValue(columns[4]);
				
				var dtCurrentStart = new Date(strCurrentStartUTC);
				var dtCurrentEnd = new Date(strCurrentEndUTC);
				
				var dtCurrentStartUTC = new Date(Date.UTC(dtCurrentStart.getFullYear(), dtCurrentStart.getMonth(), dtCurrentStart.getDate(), dtCurrentStart.getHours(), dtCurrentStart.getMinutes()));
				var dtCurrentEndUTC = new Date(Date.UTC(dtCurrentEnd.getFullYear(), dtCurrentEnd.getMonth(), dtCurrentEnd.getDate(), dtCurrentEnd.getHours(), dtCurrentEnd.getMinutes()));
				
				nlapiLogExecution('DEBUG', 'Checking With Dates For Event ' + eventId, 'Start: ' + dtCurrentStartUTC + '\nEnd: ' + dtCurrentEndUTC);
				if (dtCurrentStartUTC <= dtStartUTC && dtCurrentEndUTC > dtStartUTC) {
					conflictsWith = eventTitle + ' (ID: ' + eventId + ')';
					isAvailable = false;
					break;
				}
				if (dtCurrentStartUTC < dtEndUTC && dtCurrentEndUTC >= dtEndUTC) {
					conflictsWith = eventTitle + ' (ID: ' + eventId + ')';
					isAvailable = false;
					break;
				}
			}

		}
		
		if (!isAvailable) {
			nlapiLogExecution('DEBUG', 'Found Conflict', 'Conflicts with: ' + conflictsWith);
			response.write(conflictsWith);
		}
		else {
			response.write('T');
		}
	} 
	catch (e) {
		var adminUser =  nlapiLoadConfiguration('companypreferences').getFieldValue('custscriptr7_system_info_email_sender');
		nlapiSendEmail(adminUser, adminUser, 'ERROR availability suitelet', 'Error: ' + e);
		response.write('T');
	}
	
}

function getEventUTCDates(eventId){

	if (eventId != null && eventId != '') {
		var arrFilters = new Array();
		arrFilters[arrFilters.length] = new nlobjSearchFilter('internalid', null, 'is', eventId);
		
		var arrSearchResults = nlapiSearchRecord('calendarevent', 14561, arrFilters);
		
		if (arrSearchResults != null && arrSearchResults.length > 0) {
		
			var columns = arrSearchResults[0].getAllColumns();
			var strStartUTC = arrSearchResults[0].getValue(columns[3]);
			var strEndUTC = arrSearchResults[0].getValue(columns[4]);
			
			var dtStart = new Date(strStartUTC);
			var dtEnd = new Date(strEndUTC);
			
			var dtStartUTC = new Date(Date.UTC(dtStart.getFullYear(), dtStart.getMonth(), dtStart.getDate(), dtStart.getHours(), dtStart.getMinutes()));
			var dtEndUTC = new Date(Date.UTC(dtEnd.getFullYear(), dtEnd.getMonth(), dtEnd.getDate(), dtEnd.getHours(), dtEnd.getMinutes()));
			
			return new Array(dtStartUTC, dtEndUTC);
		}
		
	}
	
	throw nlapiCreateError('PROBLEM', 'Could not determine UTC start/end time');
}

		

