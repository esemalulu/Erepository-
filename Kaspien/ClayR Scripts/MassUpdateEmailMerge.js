/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       19 Feb 2016     clayr
 *
 */

/**
 * @param {String} recType Record type internal id
 * @param {Number} recId Record internal id
 * @returns {Void}
 */
function massUpdateEmailMerge(recType, recId) {
	
	try {
		if (recType == 'vendor') {
			
			var recVendor = nlapiLoadRecord(recType, recId);
			
			var priceEmail = recVendor.getFieldValue('custentityprice_sheet_email_c');
			
			var emailTemplate = nlapiGetContext().getSetting('SCRIPT','custscript_email_template');
			var emailSender = nlapiGetContext().getSetting('SCRIPT','custscript_partner_opt_member');
			
			var emailMerger = nlapiCreateEmailMerger(emailTemplate);	// Pricing List Reminder Email Template; 9
			
			emailMerger.setEntity('vendor', recId);			// RATT TEST VENDOR; 76800
			
			var emailMergeResult = emailMerger.merge();
			var emailSubject = emailMergeResult.getSubject();
			var emailBody = emailMergeResult.getBody();
			var emailCc = null;
			var emailBcc = null;
			var emailRecords = null;
			var emailAttachments = null;
			var emailNotifyOnBounce = true;
			var emailInternalOnly = null;
			var emailReplyTo = 'pricesheet@etailz.com';		// pricesheet@etailz.com
			
			// Send email to Pricing Email;	Sender: Lauren Jacobson; 1275
			nlapiSendEmail(emailSender,priceEmail,emailSubject,emailBody,emailCc,emailBcc,emailRecords,emailAttachments,emailNotifyOnBounce,emailInternalOnly,emailReplyTo);
			
			// Create current Date Time String
			var objDate = new Date();
			var currDate = (objDate.getMonth()+1) + '/' + objDate.getDate() + '/' +  objDate.getFullYear() + ' ';
			var currHours = objDate.getHours();  // Returns Hours from 0 to 23
			
			// Convert Hours to 12 Hour standard
			if (currHours > 12) {
				var currHoursAmPm = currHours - 12;
				var currAmPm = 'pm';
			} else if (currHours == 12) {
				var currHoursAmPm = currHours;
				var currAmPm = 'pm';
			} else if (currHours > 0) {
				var currHoursAmPm = currHours;
				var currAmPm = 'am';				
			} else {
				var currHoursAmPm = 12;		// Midnight; getHours returned 0
				var currAmPm = 'am';								
			}
			
			var currTime = currHoursAmPm + ':' + objDate.getMinutes() + ':' + objDate.getSeconds() + ' ' + currAmPm;
			var currDateTime = currDate + currTime;
			
			nlapiSubmitField(recType,recId,'custentityprice_sheet_email_date',currDateTime);  // Set the Pricing Email Date; '02/22/2016 1:40:00 pm'
			
			nlapiLogExecution('DEBUG', 'Mass Update Email Merge', 'recType: ' + recType + '; internalId: ' + recId + 
					'; Subject: ' + emailSubject + '; currDateTime: ' + currDateTime + '; emailTemplate: ' + emailTemplate + 
					'; emailSender: ' + emailSender);
			
		}
		
	} catch (err) {
		
		nlapiLogExecution('ERROR', 'Mass Update Email Merge', 'recType: ' + recType+ '; internalId: ' + recId +  
				'; errCode: ' + err.name + '; err: ' + err.message);
			
	}

}
