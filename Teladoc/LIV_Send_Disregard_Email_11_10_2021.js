function LIVSendDisregardEmail()
{
	nlapiLogExecution('DEBUG', 'LIVSendDisregardEmail', '*****START*****');
	var templateid = 25; // Retraction Email Template (2021)
	var empid = 1787; //Michelle Vandenberg
	try{
	     var arrResult = nlapiSearchRecord(null, "customsearch_retraction_email_search");//Prod
		 nlapiLogExecution('DEBUG', 'VALUE', 'arrResult.length: '+ arrResult.length);
		 for (var i = 0;  i < arrResult.length; i++)
	     {
			 //var custemail = 'anil.sharma@teladochealth.com';
			 var custemail = arrResult[i].getValue("custrecord_to_email_addr");
			 	// Prepare email.
		      	var emailMerger = nlapiCreateEmailMerger(templateid); // Initiate Email Merger
		      	var mergeResult = emailMerger.merge(); // Merge the template with the email
	
		      	var emailSubject = mergeResult.getSubject(); // Get the subject for the email
		      	var emailBody = mergeResult.getBody(); // Get the body for the email
		      	
		      	nlapiSendEmail(empid, custemail, emailSubject, emailBody, null, null, null, null);
		        
		        nlapiSubmitField('customrecord_retraction_email',arrResult[i].getId(),'custrecord_email_was_sent','T');
	  			
	     	}	
		}
		catch(e)
		{
	      nlapiLogExecution('DEBUG', 'VALUE', 'Failed to send email');
	      nlapiLogExecution('DEBUG', 'VALUE', 'Error = '+e);
	      
		}
	    nlapiLogExecution('DEBUG', 'LIVSendDisregardEmail', '*****END*****');
}