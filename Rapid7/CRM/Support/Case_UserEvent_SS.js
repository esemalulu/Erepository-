/* This scripts sends support surveys to customers 
 * who have had their cases close recently.
 * 
 * @author - Suvarshi Bhadra, Rapid7 LLC
 */

function beforeSubmit(type){
	
	if (type == 'create' || type == 'copy' || type == 'edit') {
		
		var currentSID = nlapiGetFieldValue('custeventr7sid');
		
		if (currentSID == null || currentSID == '' || type == 'create' || type == 'copy') {
			nlapiSetFieldValue('custeventr7sid', getRandomString(40));
		}
	}
	
}

function afterSubmit(type){

	var record = nlapiLoadRecord('supportcase', nlapiGetRecordId());
	var caseId = record.getId();
	var userId = nlapiGetUser();
	
	if ((type == 'create' || type == 'edit') && userId == 241368) {
		var sfCaseNumber = record.getFieldValue('custeventr7salesforcecasenumber');
		var currentCaseNumber = record.getFieldValue('casenumber');
		
		if (sfCaseNumber != null && sfCaseNumber != '' && sfCaseNumber != currentCaseNumber) {
		
			var dateCreated = nlapiStringToDate(record.getFieldValue('createddate'));
			var dateLegacy = nlapiStringToDate('8/1/2011'); //only overriding the case number after this date
			if (dateCreated == null || dateCreated == '') {
				dateCreated = new Date();
			}
			
			if (dateCreated > dateLegacy) {
				nlapiLogExecution('DEBUG', 'Overriding NS Case Number', 'yup');
				try {
					var rec = nlapiLoadRecord(record.getRecordType(), caseId);
					rec.setFieldValue('casenumber', sfCaseNumber);
					nlapiSubmitRecord(rec, true, true);
				}
				catch (e){
					nlapiSendEmail(55011, 55011, 'Could not save case', 'SF case number override. \nCase ID: ' + caseId + '\SFcaseNumber: ' + sfCaseNumber + '\nError: ' + e);
				}
			}
		}
	}
	
	/*
	 * Removed per email from Amanda Bretz on 10/1/2013 
	 * They are sending through Salesforce now
	 *
	if (type != 'delete') {
		var surveySent = record.getFieldValue('custeventr7casesurveysent');
		var status = record.getFieldValue('status');
		var stage = record.getFieldValue('stage');
		nlapiLogExecution('DEBUG', 'Survey sent', surveySent);
		nlapiLogExecution('DEBUG', 'Stage', stage);
		if (status == '5' && surveySent == 'F') {
			sendSupportSurvey(record);
			nlapiSubmitField(record.getRecordType(), record.getId(), 'custeventr7casesurveysent', 'T');
		}
		else if (stage == 'CLOSED' && surveySent == 'F'){
			nlapiSubmitField(record.getRecordType(), record.getId(), 'custeventr7casesurveysent', 'T');
		}
	}
	*/

}

function sendSupportSurvey(record){
	nlapiLogExecution("DEBUG", 'Send Support Survey Begin Execution', '------------');

	var context = nlapiGetContext();
	/* 5 = 'Closed' */
	var internalOnly = record.getFieldValue('custeventcaseinternalonly');
	var customerId = record.getFieldValue('company');
	var email = record.getFieldValue('email');
	var contactId = record.getFieldValue('contact');
	var helpDesk = record.getFieldValue('helpdesk');
	var supportTier = record.getFieldValue('custeventr7supporttier');
	var empFromInternalId = context.getSetting('SCRIPT', 'custscriptr7empinternalidfrom');
	var empBccEmail = context.getSetting('SCRIPT', 'custscriptr7empinternalidbcc');
	var contactRole = context.getRole();
	
	var dontSendSurvey = 'T';
	var stage = '';
	
	if (customerId != null && customerId.length > 0) {
		dontSendSurvey = nlapiLookupField('customer', customerId, 'custentityr7excludesupportsurveys');
		stage = nlapiLookupField('customer', customerId, 'stage');
	}

		
	if ((internalOnly == null || internalOnly == 'F') && (email != null && email.length > 1) && (contactId != null && contactId.length > 0) && helpDesk != 'T' && (supportTier != 7 && supportTier != 8 && supportTier != 9) &&
	(dontSendSurvey == null || dontSendSurvey == 'F') &&
	stage == 'CUSTOMER' &&
	(contactRole != 1051 && contactRole != 1007 && contactRole != 1041 && contactRole != 1005 && contactRole != 21 && contactRole != 15 && contactRole != 14)) {
	
		var supportSurveyDate = nlapiLookupField('contact', contactId, 'custentityr7datelastsupportsurvey');
		if (supportSurveyDate == null || supportSurveyDate.length < 1) {
			//nlapiLogExecution('DEBUG','Support Survey Date is null. Email will be sent.',supportSurveyDate);
			
			var body = nlapiMergeRecord('287', nlapiGetRecordType(), nlapiGetRecordId());
			nlapiSendEmail(empFromInternalId, email, body.getName(), body.getValue(), null, empBccEmail);
			
			d = new Date();
			;
			var formattedDate = (d.getMonth() + 1) + "/" + d.getDate() + "/" + d.getFullYear();
			nlapiSubmitField('contact', contactId, 'custentityr7datelastsupportsurvey', formattedDate);
		}
		else {
			nlapiLogExecution('DEBUG', 'Support Survey Date is not null', supportSurveyDate);
			
			var todaysDate = new Date();
			var lastFormattedDates = supportSurveyDate.split('/');
			var lastDate = new Date();
			lastDate.setFullYear(lastFormattedDates[2], parseInt(lastFormattedDates[0]) - 1, lastFormattedDates[1]);
			
			var oneDay = 1000 * 60 * 60 * 24;
			
			var dayParameter = 7;
			dayParameter = nlapiGetContext().getSetting('SCRIPT', 'custscriptr7surveynumberdays');
			
			var daysDifference = parseInt((todaysDate.getTime() - lastDate.getTime()) / oneDay);
			
			if (todaysDate.getTime() - lastDate.getTime() > dayParameter * oneDay) {
				nlapiLogExecution('DEBUG', 'Sending support survey', 'yup');
				var body = nlapiMergeRecord('287', nlapiGetRecordType(), nlapiGetRecordId());
				nlapiSendEmail(empFromInternalId, email, body.getName(), body.getValue(), null, new Array(empBccEmail));
				d = new Date();
				var formattedDate = (d.getMonth() + 1) + "/" + d.getDate() + "/" + d.getFullYear();
				nlapiSubmitField('contact', contactId, 'custentityr7datelastsupportsurvey', formattedDate);
								
			}
		}
	}
	nlapiLogExecution("DEBUG", 'Send Support Survey End Execution', '------------');
}

function getRandomString(string_length){
    var chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXTZabcdefghiklmnopqrstuvwxyz';
    var randomstring = '';
    for (var i = 0; i < string_length; i++) {
        var rnum = Math.floor(Math.random() * chars.length);
        randomstring += chars.substring(rnum, rnum + 1);
    }
    return randomstring;
}