/*
 * @author suvarshi
 */

function updateCustomerLevelLeadSource(){

	//crash	
	nlapiLogExecution('DEBUG', 'The unscheduled script has been chained', 'successfully');
	
	var timeLimitInMinutes = 10;
	this.timeLimitInMilliseconds = timeLimitInMinutes * 60 * 1000;
	this.startingTime = new Date().getTime();
	this.context = nlapiGetContext();
	this.rescheduleScript = false;
	
	var searchResults = nlapiSearchRecord('contact', 2106);
	
	var lastContactId = null;
	var maxResponseDate = null;
	var responseDate = null;
	
	var contactRecord, stop, maxResponseDateDate, maxResponseDateTime;
	var searchResult, responseDate, companyId, campaignId, presentContactId, lastResponseDate;
	
	for (var i = 0; searchResults != null && i < searchResults.length && timeLeft() && unitsLeft(); i++) {
	
		searchResult = searchResults[i];
		
		responseDate = searchResult.getValue('responsedate', 'campaignresponse');
		companyId = searchResult.getValue('company');
		campaignId = searchResult.getValue('internalid', 'campaignresponse');
		presentContactId = searchResult.getValue('internalid');
		
		if (companyId != null && campaignId != null) {
			try {
				//Changed from nlapiSubmitField to nlapiSubmitRecord based on DZ,JQ,SB meeting on 
				//April 28,2011
				
				var customerRecord = nlapiLoadRecord('customer', companyId);
				customerRecord.setFieldValue('leadsource', campaignId);
				nlapiSubmitRecord(customerRecord);
				nlapiLogExecution('DEBUG', 'Submitted the customer Record ' + companyId + 'with Lead Src', campaignId);
			} 
			catch (err) {
				nlapiLogExecution('ERROR', 'Could not submit leadsource', 'CustomerId:' + companyId + " Leadsource:" + campaignId);
			}
			
			contactRecord = nlapiLoadRecord('contact', presentContactId);
			maxResponseDate = responseDate;
			stop = maxResponseDate.indexOf(' ');
			maxResponseDateDate = maxResponseDate.substring(0, stop);
			maxResponseDateTime = maxResponseDate.substring(stop + 1);
			contactRecord.setFieldValue('custentityr7contactcampaignresponsedate', maxResponseDateDate);
			contactRecord.setFieldValue('custentityr7contactcampaignresponsetime', maxResponseDateTime);
			
			nlapiSubmitRecord(contactRecord);
			nlapiLogExecution('DEBUG', 'Submitted the contact Record', maxResponseDate + " " + presentContactId + " " + companyId);
		}
	}
	
	if (rescheduleScript) {
		nlapiLogExecution('DEBUG', 'Rescheduling script (script/deploy id)', context.getScriptId() + ' : ' + context.getDeploymentId());
		var status = nlapiScheduleScript(context.getScriptId(), context.getDeploymentId());
		nlapiLogExecution('DEBUG', 'Schedule Status', status);
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
	if (unitsLeft <= 200) {
		nlapiLogExecution('DEBUG', 'Ran out of units', 'yup');
		rescheduleScript = true;
		return false;
	}
	return true;
}