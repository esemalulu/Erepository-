/*
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       01 Feb 2013     efagone
 *
 */

/*
 * @param {String} type Context Types: scheduled, ondemand, userinterface, aborted, skipped
 * @returns {Void}
 */

function process() {

	var timeLimitInMinutes = 10;
	this.timeLimitInMilliseconds = timeLimitInMinutes * 60 * 1000;
	this.startingTime = new Date().getTime();
	this.context = nlapiGetContext();
	this.rescheduleScript = false;
	
	sendPSOSurveys();
	
	if (rescheduleScript) {
		nlapiLogExecution('DEBUG', 'Rescheduling script (script/deploy id)', context.getScriptId());
		var status = nlapiScheduleScript(context.getScriptId());
		nlapiLogExecution('DEBUG', 'Schedule Status', status);
	}
}

function sendPSOSurveys(){

	var arrSearchResults = nlapiSearchRecord('customrecordr7psoengagement', 10685);
	
	for (var i = 0; arrSearchResults != null && i < arrSearchResults.length && timeLeft() && unitsLeft(); i++) {
	
		var searchResult = arrSearchResults[i];
		var columns = searchResult.getAllColumns();
		var engId = searchResult.getId();
		var customerId = searchResult.getValue(columns[2]);
		var engTypeId = searchResult.getValue(columns[4]);
		var engContactId = searchResult.getValue(columns[6]);
		var engProjectManagerId = searchResult.getValue(columns[8]);
		var parentJobId = searchResult.getValue(columns[9]);
		
		var dateLastPSOSurvey = nlapiLookupField('contact', engContactId, 'custentityr7datelastpsosurvey');
		
		if (engContactId == null || engContactId == '') {
			//no one to send survey to   :(
			nlapiSubmitField('customrecordr7psoengagement', engId, 'custrecordr7psoengsurveysendattempted', 'T');
			continue;
		}
		
		if (dateLastPSOSurvey != null && dateLastPSOSurvey != '') {
			var sevenDaysAgo = nlapiAddDays(new Date(), -7);
			
			if (nlapiStringToDate(dateLastPSOSurvey) > sevenDaysAgo) {
				//contact already recieved survey in this acceptable range
				nlapiSubmitField('customrecordr7psoengagement', engId, 'custrecordr7psoengsurveysendattempted', 'T');
				continue;
			}
		}
		
		if (engProjectManagerId == null || engProjectManagerId == '') {
			nlapiLogExecution('ERROR', 'Null project mangaer sending surveys', 'Defaulting to Admin' + '\n\nEngId: ' + engId);
			engProjectManagerId = nlapiLoadConfiguration('companypreferences').getFieldValue('custscriptr7_system_info_email_sender');
		}
		
		var emailTemplateId = null;

		//type list
		//	1	Assessment
		//	2	Audit
		//	3	Deployment
		//	6	Server Build
		//	7	Training - Metasploit
		//	5	Training - Nexpose
		//	8	Webinar
		
		switch (engTypeId) {
			case '1':
				emailTemplateId = 1011;
				break;
			case '2':
				emailTemplateId = 1011;
				break;
			case '3':
				emailTemplateId = 1012;
				break;
			case '4':
				break;
			case '5':
				emailTemplateId = 1012;
				break;
			case '6':
				break;
			case '7':
				emailTemplateId = 1012;
				break;
			case '8':
				break;
		}
		
		if (emailTemplateId != null && emailTemplateId != '') {
			
			var subject, body;
			var templateVersion = nlapiLoadRecord('emailtemplate', emailTemplateId).getFieldValue('templateversion');

			if(templateVersion != 'FREEMARKER') { // CRMSDK Note: this is being deprecated.
				var merge = nlapiMergeRecord(emailTemplateId, 'customrecordr7psoengagement', engId, 'contact', engContactId);
				subject = merge.getName();
				body = merge.getValue();
			}
			else { // the new FREEMARKER
				var emailMerger = nlapiCreateEmailMerger(emailTemplateId);
				emailMerger.setCustomRecord('customrecordr7psoengagement', engId);
				emailMerger.setEntity('contact', engContactId);
	
				var mergeResult = emailMerger.merge();
				subject = mergeResult.getSubject();
				body = mergeResult.getBody();
			}
											
			var records = new Array();
			records['recordtype'] = 'customrecordr7psoengagement';
			records['record'] = engId;
			
			var success = false;
			
			try {
				nlapiSendEmail(engProjectManagerId, engContactId, subject, body, null, new Array('abby_mulligan@rapid7.com'), records);
				nlapiLogExecution('DEBUG', 'Successfully sent survey email', 'From: ' + engProjectManagerId + '\nTo: ' + engContactId);
				success = true;
			} 
			catch (e) {
				nlapiLogExecution('ERROR', 'Could not send survey email', 'From: ' + engProjectManagerId + '\nTo: ' + engContactId + '\nError: ' + e);
				var adminUser =  nlapiLoadConfiguration('companypreferences').getFieldValue('custscriptr7_system_info_email_sender');
				nlapiSendEmail(adminUser, adminUser, 'Could not send email', 'From: ' + engProjectManagerId + '\nTo: ' + engContactId);
				success = false;
			}
			
			if (success) {
			
				try {
					nlapiSubmitField('contact', engContactId, 'custentityr7datelastpsosurvey', nlapiDateToString(new Date()));
				} 
				catch (e) {
					nlapiLogExecution('ERROR', 'Could not update date last survey - contact', 'Contact: ' + engContactId + '\nError: ' + e);
				}
				
				try {
					nlapiSubmitField('customrecordr7psoengagement', engId, new Array('custrecordr7psoengsurveysendattempted', 'custrecordr7psoengdatesurveysent'), new Array('T', nlapiDateToString(new Date())));
				} 
				catch (e) {
					nlapiLogExecution('ERROR', 'Could not update survey attemp checkbox - eng', 'Eng: ' + engId + '\nError: ' + e);
				}
				
				//type list
				//	1	Assessment
				//	2	Audit
				//	3	Deployment
				//	6	Server Build
				//	7	Training - Metasploit
				//	5	Training - Nexpose
				//	8	Webinar
				
				switch (engTypeId) {
					case '1':
						nlapiSubmitField('customrecordr7psoparentjob', parentJobId, 'custrecordr7psojobdatesurveysentauditass', nlapiDateToString(new Date()));
						break;
					case '2':
						nlapiSubmitField('customrecordr7psoparentjob', parentJobId, 'custrecordr7psojobdatesurveysentauditass', nlapiDateToString(new Date()));
						break;
					case '3':
						nlapiSubmitField('customrecordr7psoparentjob', parentJobId, 'custrecordr7psojobdatesurveysenttraining', nlapiDateToString(new Date()));
						break;
					case '4':
						break;
					case '5':
						nlapiSubmitField('customrecordr7psoparentjob', parentJobId, 'custrecordr7psojobdatesurveysenttraining', nlapiDateToString(new Date()));
						break;
					case '6':
						break;
					case '7':
						nlapiSubmitField('customrecordr7psoparentjob', parentJobId, 'custrecordr7psojobdatesurveysenttraining', nlapiDateToString(new Date()));
						break;
					case '8':
						break;
				}
			}
		}
	}
	
	if (i >= 999) {
		rescheduleScript = true;
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