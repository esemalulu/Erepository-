function EmailBlastToSpecificPartners( type )
{
	nlapiLogExecution('DEBUG', 'Script Execution Started', "----------------------");
	var records_limit = 100;
	var context = nlapiGetContext();
	try {
		var searchresults = nlapiSearchRecord('customrecord_email_blaster_partner_list', 'customsearch_email_blaster_partner_list');
		nlapiLogExecution('DEBUG', 'Email Blast partners execution records limit', records_limit);
		if ( searchresults == null ) {
			nlapiLogExecution('DEBUG', 'No Records exist to trigger Email Blast', "----------------------");
			return;
		}
		for ( var i = 0; i < records_limit; i++ )
		{
			nlapiLogExecution('DEBUG', 'No of Records Executed', i+1);
			//Setting up the subject and body of the email
			var subject = 'etailz update on Amazon fee increase';
			var body = 'Hello,' + "<br /><br />" +
					   'As a valued partner of etailz, we are reaching out to you in order to review the Amazon fulfilment fee increase of 12% that is being implemented as of Feb 22, 2018. While fees have been increasing over the years, this year\'s change is the largest increase to date, and in order to continue purchasing your product we are requesting your help in covering part of this increase.' + "<br /><br />" +
					   'We are looking to you to extend etailz a 10% ongoing discount that will be applied to each P.O. moving forward. This discount will allow us to continue purchasing our current product selection and act as your valued partner on the Amazon platform. Without this continued discount, we will ultimately need to decrease our product selection and in some cases, may, unfortunately, be forced to stop selling your brand altogether.' + "<br /><br />" +
					   'Please reply to confirm that the requested discount is authorized and we will immediately update costing in our system in order to avoid lags in our purchasing schedule.' + "<br /><br />" +
					   'We look forward to our continued partnership in 2018!' + "<br /><br /><br />" + 
					   'Thank you.' + "<br /><br />" +
					   'Etailz Team!' + "<br /><br />" +
					   '<div style="background-color: #09222a; width: 172px"><img src="https://www.etailz.com/wp-content/uploads/2017/06/etailz-icon.png"></div>';
			var emailArray = [];
			if(!searchresults[i].getValue('custentitymain_email_c', 'custrecord_email_blaster_partner_list')) {
				var contactFilters = new Array();
				var columns = new Array();
				columns[0] = new nlobjSearchColumn('email');
				contactFilters[0] = new nlobjSearchFilter('company', null, 'is', searchresults[i].getValue('custrecord_email_blaster_partner_list'));
				contactFilters[1] = new nlobjSearchFilter('email', null, 'isnotempty');
				//Search for for the contact records which has email address
				var contactResults = nlapiSearchRecord('contact', null, contactFilters, columns);
				if(contactResults !=null) {
					for (var j = 0; j < contactResults.length; j++)
					{
						emailArray.push(contactResults[j].getValue('email'));
						nlapiLogExecution('DEBUG', 'email_' + j, contactResults[j].getValue('email'));
					}
				}
			} else {
				emailArray.push(searchresults[i].getValue('custentitymain_email_c', 'custrecord_email_blaster_partner_list'));
			}
			var partnerOpt = searchresults[i].getValue('custentityprtnr_opt','custrecord_email_blaster_partner_list');
			if(emailArray.length > 0) {
				nlapiSendEmail(partnerOpt, emailArray, subject, body);
				nlapiLogExecution('DEBUG', 'Email Sent successfully', 'Emails got triggered :: ' + emailArray.join(','));
			}
			nlapiSubmitField('customrecord_email_blaster_partner_list', searchresults[i].getId(), 'custrecord_email_blaster_mail_sent', nlapiDateToString( new Date() ));
			nlapiLogExecution('AUDIT', 'context.getRemainingUsage()', context.getRemainingUsage());
			/*if ( context.getRemainingUsage() <= 0 && (i+1) < searchresults.length )
			{
				var status = nlapiScheduleScript(context.getScriptId(), context.getDeploymentId())
				if ( status == 'QUEUED' )
				break;  
			}*/
			nlapiLogExecution('DEBUG', 'Script Execution Ended', "----------------------");
		}
	} catch (e) {
		nlapiLogExecution('DEBUG', 'Exception:::' + e.name, e.lineNumber + ' ' + e.message);
	}
}