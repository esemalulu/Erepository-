/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       05 Oct 2012     efagone
 *
 */

/**
 * @param {String} type Context Types: scheduled, ondemand, userinterface, aborted, skipped
 * @returns {Void}
 */
function grabLatestStatistics(type){

	var timeLimitInMinutes = 10;
	this.timeLimitInMilliseconds = timeLimitInMinutes * 60 * 1000;
	this.startingTime = new Date().getTime();
	this.context = nlapiGetContext();
	this.rescheduleScript = false;
	this.statisticsIndex = nlapiGetContext().getSetting('SCRIPT', 'custscriptr7mblcurrentstatid');
	nlapiLogExecution('DEBUG', 'statisticsIndex', statisticsIndex);
	
	if (statisticsIndex == null || statisticsIndex == '') {
		statisticsIndex = 0;
	}
	
	try {
		updateStatistics();
	} 
	catch (e) {
		var adminUser =  nlapiLoadConfiguration('companypreferences').getFieldValue('custscriptr7_system_info_email_sender');
		nlapiSendEmail(adminUser, adminUser, 'Error on Mobilisafe Usage Statistics Scheduled Script', 'Error: ' + e);
	}
	
	if (rescheduleScript) {
		nlapiLogExecution('DEBUG', 'Rescheduling script', context.getScriptId());
		var params = new Array();
		params['custscriptr7mblcurrentstatid'] = statisticsIndex;
		var status = nlapiScheduleScript(context.getScriptId(), null, params);
		nlapiLogExecution('DEBUG', 'Schedule Status', status);
	}
	
}

function updateStatistics(){

	try {
	
		var headers = new Array();
		headers['Authorization'] = 'Basic YmlsbGluZ0Btb2JpbGlzYWZlLmNvbTpPMUYxWjV1TTBzODU0MFUh';
		
		var statisticsURL = 'https://mobilisafe.rapid7.com/api/statistics';
		
		var response = nlapiRequestURL(statisticsURL, null, headers);
		
		// Make sure the license server didn't throw an error back to us.  If it did, yell at the user.
		if (response == null || response.getCode() != 200) {
			var msg;
			if (response == null) {
				msg = "The response is null";
			}
			else {
				msg = response.getBody();
			}
			
			nlapiLogExecution('ERROR', 'The license server is responding with non-200', msg);
			var adminUser =  nlapiLoadConfiguration('companypreferences').getFieldValue('custscriptr7_system_info_email_sender');
			nlapiSendEmail(adminUser, adminUser, 'Error Mobilisafe Statistics', 'he license server is responding with non-200\nError: ' + msg);
		}
		
		// All should be OK, so parse the XML doc the server should have supplied us.
		var responseXML = null;
		try {
			responseXML = nlapiStringToXML(response.getBody());
		} 
		catch (e) {
			nlapiLogExecution('ERROR', 'An error occurred while attempting to parse the response doc', e);
			var adminUser =  nlapiLoadConfiguration('companypreferences').getFieldValue('custscriptr7_system_info_email_sender');
			nlapiSendEmail(adminUser, adminUser, 'Error Mobilisafe Statistics', 'Error: ' + e);
		}
		
		// A null doc can't possibly be good...
		if (responseXML == null) {
			var adminUser =  nlapiLoadConfiguration('companypreferences').getFieldValue('custscriptr7_system_info_email_sender');
			nlapiSendEmail(adminUser, adminUser, 'Error Mobilisafe Statistics', 'ResponseXML is null');
		}
		
		
		var list = nlapiSelectNode(responseXML, '//list');
		var statistics = nlapiSelectNodes(list, '//statistics');
		statistics.sort(myCustomSort);	
		
		for (var i = 0; statistics != null && i < statistics.length && timeLeft() && unitsLeft(); i++) {
			
			var currentStatistic = statistics[i];
			
			var statisticsId = nlapiSelectValue(currentStatistic, '@id');
			nlapiLogExecution('DEBUG', 'statisticsId', statisticsId);
			if (statisticsId > statisticsIndex) {
				var dateCreated = nlapiSelectValue(currentStatistic, 'dateCreated');
				var numberOfDevices = nlapiSelectValue(currentStatistic, 'numberOfDevices');
				var numberOfActiveEmployees = nlapiSelectValue(currentStatistic, 'numberOfActiveEmployees');
				var productKey = nlapiSelectValue(currentStatistic, 'productkey');
				var organization = nlapiSelectNode(currentStatistic, '//organization');
				var organizationId = nlapiSelectValue(organization, '@id');
				
				var dateConverted = '';
				if (dateCreated != null && dateCreated != '') {
					var year = dateCreated.substr(0, 4);
					var month = dateCreated.substr(5, 2);
					var day = dateCreated.substr(8, 2);
					dateConverted = month + '/' + day + '/' + year;
				}
				
				var licenseId = findLicenceByPK(productKey);
				
				if (licenseId != null && licenseId != '') {
					var recMobilisafeLic = nlapiLoadRecord('customrecordr7mobilisafelicense', licenseId);
					recMobilisafeLic.setFieldValue('custrecordr7mblicense_donotsync', 'T');
					recMobilisafeLic.setFieldValue('custrecordr7mblicense_id', statisticsId);
					recMobilisafeLic.setFieldValue('custrecordr7mblicense_statisticsdate', dateConverted);
					recMobilisafeLic.setFieldValue('custrecordr7mblicense_customer_id', organizationId);
					recMobilisafeLic.setFieldValue('custrecordr7mblicense_numberdevices', numberOfDevices);
					recMobilisafeLic.setFieldValue('custrecordr7mblicense_numberemployees', numberOfActiveEmployees);
					nlapiSubmitRecord(recMobilisafeLic);
				}
				statisticsIndex = statisticsId;
			}
		}
		
	} 
	catch (e) {
	
	}
	
}

function myCustomSort(a, b){
	var statA = nlapiSelectValue(a, '@id');
	var statB = nlapiSelectValue(b, '@id');
	
	if (statA < statB) //sort string ascending
		return -1;
	if (statA > statB) 
		return 1;
	return 0; //default return value (no sorting)
}

function findLicenceByPK(productKey){

	nlapiLogExecution('DEBUG', 'findLicenceByPK()', 'productKey: ' + productKey);
	
	if (productKey != null && productKey != '') {
	
		var arrSearchFilters = new Array();
		arrSearchFilters[arrSearchFilters.length] = new nlobjSearchFilter('custrecordr7mblicenseproductkey', null, 'is', productKey);

		var arrSearchResults = nlapiSearchRecord('customrecordr7mobilisafelicense', null, arrSearchFilters);
		
		if (arrSearchResults != null && arrSearchResults.length >= 1) {
		
			return arrSearchResults[0].getId();
		}
		else {
			return null;
		}
	}
	
	return null;
	
}

function timeLeft(){
	var presentTime = new Date().getTime();
	if (presentTime - startingTime > timeLimitInMilliseconds) {
		nlapiLogExecution('DEBUG', 'Ran out of time', 'yup');
		rescheduleScript = true;
		return false;
	}
	return true;
}

function unitsLeft(){
	var unitsLeft = context.getRemainingUsage();
	if (unitsLeft <= 300) {
		nlapiLogExecution('DEBUG', 'Ran out of units', 'yup');
		rescheduleScript = true;
		return false;
	}
	return true;
}