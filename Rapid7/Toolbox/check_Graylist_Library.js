/**
 * MB: 4/28/15 - Change 346 - Add Reply To Param for Graylist Export Email
 * 		Added reply to param for send email.
 * 
 * 	Change 277 nlapiMergeRecord Deprecation Script Cleanup
 * 		Added branching for mergeRecord function deprecation
 * 
 * 	Change 377 NS264 and NS265 - Geo IP Services integration for Export Compliance
 * 		Errol updated script to add altCountry - Which is passed from LRP processing as the GeoIP Country code 
 * 
 * MB: 5/20/15 - Chaneg 415 - LRP Graylist Update - No country fix
 * 		Return True (graylisted) if Country/GeoIP Counrty are blank
 */

var SEND_EMAIL_FROM = 99939050; //Service account

function isGraylisted(email, country, typeOfUse, productText, altCountry){

	try {
		
		nlapiLogExecution('AUDIT', 'email', email);
		nlapiLogExecution('AUDIT', 'country', country);
		nlapiLogExecution('AUDIT', 'typeOfUse', typeOfUse);
		nlapiLogExecution('AUDIT', 'productText', productText);
		nlapiLogExecution('AUDIT', 'altCountry', altCountry);
		
		if (email == null || email == '') {
			//email should always be passed... it is required
			return false;
		}
		 /**
		  * MB: 5/20/15 - Chaneg 415 - LRP Graylist Update - No country fix
		  * 		Return True (graylisted) if Country/GeoIP Counrty are blank
		  */
		if (country == null || country == '') {
			// country is required for export.  If blank, graylist
			return true;
		}
		if (altCountry == null || altCountry == '') {
			// altCountry (GeoIP Country) is required for export.  If blank, graylist
			return true;
		}
		
		var domain = email.substr(email.indexOf('@', 0)+1);
		
		var arrFilters = [];
		arrFilters[0] = new nlobjSearchFilter('isinactive', null, 'is', 'F');
		
		//check domain
		arrFilters[1] = new nlobjSearchFilter('formulatext', null, 'is', domain);
		arrFilters[1].setFormula("SUBSTR({custrecordr7graylistdomain}, INSTR({custrecordr7graylistdomain}, '@')+1)");
		arrFilters[1].setLeftParens(1);
		arrFilters[1].setOr(true);
		arrFilters[2] = new nlobjSearchFilter('custrecordr7graylistdomain', null, 'isempty');
		arrFilters[2].setRightParens(1);
		
		//check domain extension
		arrFilters[3] = new nlobjSearchFilter('formulanumeric', null, 'equalto', 1);
		arrFilters[3].setFormula("CASE WHEN {custrecordr7graylistextension} = '' THEN 1 WHEN {custrecordr7graylistextension} IS NULL THEN 1 WHEN '" + domain + "' LIKE '%' || {custrecordr7graylistextension} THEN 1 ELSE 0 END");
		
		if (typeOfUse != null && typeOfUse != '') {
			arrFilters[arrFilters.length] = new nlobjSearchFilter('custrecordr7graylisttypeofuse', null, 'anyof', ['@NONE@', typeOfUse]);
		}
		else {
			arrFilters[arrFilters.length] = new nlobjSearchFilter('custrecordr7graylisttypeofuse', null, 'anyof', '@NONE@');
		}
		
		// MB: 5/20/15 - Removed check for null country/alt counrty values as they are now required.
		arrFilters[arrFilters.length] = new nlobjSearchFilter('custrecordr7countriescountryid', 'custrecordr7graylistcountry', 'isempty');
		arrFilters[arrFilters.length - 1].setLeftParens(1);
		arrFilters[arrFilters.length - 1].setOr(true);
		/*
		 * Change 377 NS264 and NS265 - Geo IP Services integration for Export Compliance
		 * if ip country is not null then search for ANY country/IP country per requirement:
		 * 		 "Graylist all requests where either user submitted country or GeoIP country are outside the US and Canada"
		 */ 
		arrFilters[arrFilters.length] = new nlobjSearchFilter('formulanumeric', null, 'equalto', 1);
		arrFilters[arrFilters.length - 1].setFormula("CASE WHEN {custrecordr7graylistcountry.custrecordr7countriescountryid} = ANY('"+country+"','"+altCountry+"') THEN 1 ELSE 0 END");
	
		arrFilters[arrFilters.length - 1].setRightParens(1);
		
		
		var arrColumns = [];
		arrColumns[0] = new nlobjSearchColumn('internalid');
		arrColumns[1] = new nlobjSearchColumn('custrecordr7graylistemailtemp');
		arrColumns[2] = new nlobjSearchColumn('custrecordr7graylistreplyto');
		
		var recordType = 'customrecordr7graylist';
		var arrResults = nlapiSearchRecord(recordType, null, arrFilters, arrColumns);
		
		if (arrResults != null && arrResults.length >= 1) {
		
			var recordId = arrResults[0].getId();
			var emailTemplateId = arrResults[0].getValue(arrColumns[1]);
			var replyTo = arrResults[0].getValue(arrColumns[2]);
			nlapiLogExecution('AUDIT', 'replyTo', replyTo);
			
			if (emailTemplateId != null && emailTemplateId != '') {
				
				/**
				 * Change 277 nlapiMergeRecord Deprecation Script Cleanup
				 * 		Added branching for mergeRecord function deprecation
				 * 		Branch between freemarker/crmsdk to allow old function nlapiMergeRecord and new function nlapiCreateEmailMerger
				 */
				var templateVersion = nlapiLoadRecord('emailtemplate', emailTemplateId).getFieldValue('templateversion');
				if (templateVersion != 'FREEMARKER') {						
					var mergeResult = nlapiMergeRecord(emailTemplateId, recordType, recordId);
					var emailSubject = mergeResult.getName();
					var emailBody = mergeResult.getValue();
				}
				else {
					var emailMerger = nlapiCreateEmailMerger(emailTemplateId);
					emailMerger.setCustomRecord(recordType, recordId);
					var mergeResult = emailMerger.merge();
					var emailSubject = mergeResult.getSubject();
					var emailBody = mergeResult.getBody();
				}
				
				var records = new Array();
				records['recordtype'] = recordType;
				records['record'] = recordId;
				
				
				/**
				 * Change 346 - Add Reply To Param for Graylist Export Email
				 * 		If replay to is empty then make it NULL - This is to avoid error Code: "SSS_INVALID_REPLYTO_EMAIL Details: The reply-to email is not valid."
				 */
				if (replyTo == ''){
					replyTo = null;
				}
				//send email to user
				nlapiSendEmail(SEND_EMAIL_FROM, email, emailSubject, emailBody, null, null, records, null, null, null, replyTo);
			}
			return true;
		}
	} 
	catch (e) {
		var adminUser =  nlapiLoadConfiguration('companypreferences').getFieldValue('custscriptr7_system_info_email_sender');
		nlapiSendEmail(adminUser, adminUser, 'Error on isGraylisted', 'Error: ' + e);
		nlapiLogExecution('ERROR', 'Error on isGraylisted', e);
		return false;
	}
	return false;
}

