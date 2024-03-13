/*
 * @author efagone
 * 
 * MB: 8/19/16 - Added denied party screening checks using Amber Road Integration Library
 */

function updateTheCheckboxes(){

	var timeLimitInMinutes = 10;
	this.timeLimitInMilliseconds = timeLimitInMinutes * 60 * 1000;
	this.startingTime = new Date().getTime();
	this.context = nlapiGetContext();
	this.rescheduleScript = false;
	
	//MB: 8/19/16 - Added denied party screening checks using Amber Road Integration Library
	// 10/21/2020 - Removed denied party screening checks using Amber Road Integration Library 
	// https://issues.corp.rapid7.com/browse/APPS-12965
	// processDeniedPartyStatus('customer');
	processOpenSalesOpps();
	processCountryAssignmentFromHDB();
	processDNBMatchCleanup();
	
	
	if (rescheduleScript) {
		nlapiLogExecution('DEBUG', 'Rescheduling script (script/deploy id)', context.getScriptId() + ' : ' + context.getDeploymentId());
		var status = nlapiScheduleScript(context.getScriptId());
		nlapiLogExecution('DEBUG', 'Schedule Status', status);
	}	
}

function processCountryAssignmentFromHDB(){

	var arrSearchResults = nlapiSearchRecord('customer', 16063);
	
	for (var i = 0; arrSearchResults != null && i < arrSearchResults.length && timeLeft() && unitsLeft(); i++) {
	
		var searchResult = arrSearchResults[i];
		var columns = searchResult.getAllColumns();
		var customerId = searchResult.getValue(columns[0]);
		var newCountry = searchResult.getValue(columns[3]);

		try {
			var rec = nlapiLoadRecord('customer', customerId);
			rec.setFieldText('custentityr7corporatecountry', newCountry);
			nlapiSubmitRecord(rec, true, true);
		} 
		catch (e) {
			var adminUser =  nlapiLoadConfiguration('companypreferences').getFieldValue('custscriptr7_system_info_email_sender');
			nlapiSendEmail(adminUser, adminUser, 'Could not update customer record', 'processCountryAssignmentFromHDB(): ' + e);
		}
	}
}

function processDNBMatchCleanup(){

	var arrSearchResults = nlapiSearchRecord('customer', 19998);
	
	for (var i = 0; arrSearchResults != null && i < arrSearchResults.length && timeLeft() && unitsLeft(); i++) {
	
		var searchResult = arrSearchResults[i];
		var columns = searchResult.getAllColumns();
		var customerId = searchResult.getValue(columns[0]);

		try {
			var rec = nlapiLoadRecord('customer', customerId);
			nlapiSubmitRecord(rec, true, true);
		} 
		catch (e) {
			var adminUser =  nlapiLoadConfiguration('companypreferences').getFieldValue('custscriptr7_system_info_email_sender');
			nlapiSendEmail(adminUser, adminUser, 'Could not update customer record', 'processDNBMatchCleanup(): ' + e);
		}
	}
}

function processOpenSalesOpps(){
	// changed to not be a checkbox....
	var arrSearchResults = nlapiSearchRecord('customer', 13517);
	
	for (var i = 0; arrSearchResults != null && i < arrSearchResults.length && timeLeft() && unitsLeft(); i++) {
	
		var searchResult = arrSearchResults[i];
		var columns = searchResult.getAllColumns();
		var customerId = searchResult.getValue(columns[0]);
		var actualOpenOpps = searchResult.getValue(columns[3]);

		try {
			nlapiSubmitField('customer', customerId, 'custentityr7hasopensalesopp', actualOpenOpps);
		} 
		catch (e) {
			var adminUser =  nlapiLoadConfiguration('companypreferences').getFieldValue('custscriptr7_system_info_email_sender');
			nlapiSendEmail(adminUser, adminUser, 'Could not update customer record', 'processOpenSalesOppCheckbox(): ' + e);
		}
	}	
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
	if (unitsLeft <= 100) {
		nlapiLogExecution('DEBUG', 'Ran out of units', 'yup');
		rescheduleScript = true;
		return false;
	}
	return true;
}

/**
 * This function searches companies that need to be checked for Denied Party Status against Amber Road.  
 * 	Customer Search: SCRIPT - Company Denied Party Screening Queue is used to load the results.  Results are sent to Amber Road using the AmberRoad_Integration_Library.js functions.
 * 	The results from screening are stored in the Denied Party Status field and the Denied Party Status Date Last Checked field is set to today.
 * 	If there are any errors the Denied Party Status Field is set to Error
 * @method processDeniedPartyStatus
 * @param {String} recTypeId - record type ID
 * @throws {Error} Denied Party Status check fails.  Denied Party Status will be set to Error (3)
 * @return {Void}
 */
/* no longer in use: 10/21/2020 https://issues.corp.rapid7.com/browse/APPS-12965
function processDeniedPartyStatus(recTypeId){
	// Create arrays for nlapiSubmitField fields/values.  Initialize with today's date for date last checked
	var fieldsToSet = ['custentityr7rps_status_lastchecked'];
	var valuesToSet = [nlapiDateToString(new Date())];
	// Search records to get company inputs for Amber Road screening.  The column order of the provided search is important
	var arrSearchResults = nlapiSearchRecord(recTypeId, 'customsearch_companyrpsqueue'); // Customer Search: SCRIPT - Company Denied Party Screening Queue
	for (var i = 0; arrSearchResults != null && i < arrSearchResults.length && timeLeft() && unitsLeft(); i++) {
		var columns = arrSearchResults[i].getAllColumns();
		var recId = arrSearchResults[i].getId();
		var companyName = arrSearchResults[i].getValue(columns[0]);
		var contactName = arrSearchResults[i].getValue(columns[1]);
		var secondaryContactName = arrSearchResults[i].getValue(columns[2]);
		var address1 = arrSearchResults[i].getValue(columns[3]);
		var address2 = arrSearchResults[i].getValue(columns[4]);
		var address3 = arrSearchResults[i].getValue(columns[5]);
		var city = arrSearchResults[i].getValue(columns[6]);
		var stateCode = arrSearchResults[i].getValue(columns[7]);
		var stateName = arrSearchResults[i].getValue(columns[8]);
		var postalCode = arrSearchResults[i].getValue(columns[9]);
		var countryCode = arrSearchResults[i].getValue(columns[10]);
		var countryName = arrSearchResults[i].getValue(columns[11]);
		var currentDeniedPartyStatus = arrSearchResults[i].getValue('custentityr7rps_status');
		var currentDeniedPartyDate = arrSearchResults[i].getValue('custentityr7rps_status_lastchecked');
		try {
			// Format the result into an Amber Road ready object using Amber Road Library
			var objAR = new amberRoadObject(recTypeId,recId,companyName,contactName,secondaryContactName,address1,address2,address3,city,stateCode,stateName,postalCode,countryCode,countryName);
			// Send the company info to Amber Road for Denied Party Screening using object method
			var deniedPartyResult = objAR.screenCompany();
			if(!deniedPartyResult){
				throw nlapiCreateError('PROBLEM SETTING DPS STATUS', 'Could not get Denied Party Status', true);					
			}
			// Set Denied Party Status fields based on results. Only set if the value has changed.
			if(currentDeniedPartyStatus != deniedPartyResult){
				fieldsToSet.push('custentityr7rps_status');	
				valuesToSet.push(deniedPartyResult);				
			}
			// Set Denied Party Status and Date on record
			nlapiSubmitField(recTypeId,recId,fieldsToSet,valuesToSet);	
		} 
		catch (e) {
			nlapiLogExecution('ERROR','Error Setting Denied Party Status','Record Type:' + recTypeId + '\n Record ID: ' + recId +'\n'+e.name+'\n'+e.message);
			var adminUser =  nlapiLoadConfiguration('companypreferences').getFieldValue('custscriptr7_system_info_email_sender');
			nlapiSendEmail(adminUser, adminUser, 'Error Setting Denied Party Status','Record Type:' + recTypeId + '\n Record ID: ' + recId +'\n'+e.name+'\n'+e.message);
			fieldsToSet.push('custentityr7rps_status');	
			valuesToSet.push(3); // Set DPS to Error
			nlapiSubmitField(recTypeId,recId,fieldsToSet,valuesToSet);
		}
	}
	
}
*/