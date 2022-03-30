//last update date: 111618 - Send Tax Email
//10/25/2020
function LIVSendTaxEmail()
{
	try
	{
        var templateid = 22; // Sales Tax Email template
        var empid = 640328; // Employee Name for from address. // Prod -- Livongo Tax
        
        //var searchObj = nlapiLoadSearch(null, "customsearch1186");//SB1 - Sales Tax Bulletin Customers Search
        var searchObj = nlapiLoadSearch(null, "customsearch1195");//Prod - Sales Tax Bulletin Customers Search
        
        var rs = searchObj.runSearch();
        var arrResult = rs.getResults(0,1000);
        if(arrResult)
        {
            nlapiLogExecution('DEBUG', 'VALUE', 'Total Processing result set: '+ arrResult.length);
	        for (var i = 0;  i < arrResult.length; i++)
	        {
	        	var billetinAttached = false;
	        	
	            var customrecord = arrResult[i];
	            var email = customrecord.getValue("custrecord_email_address");
	            var ccEmail = customrecord.getValue("custrecord_cc_email_address");
	            var custid = customrecord.getValue("custrecord_customer_internal_id");
	            
	            var ccemailArr =  ccEmail.split(',');
	
	            // Prepare email.
	            var emailMerger = nlapiCreateEmailMerger(templateid); // Initiate Email Merger
	            //emailMerger.setTransaction(invid); // Set the transaction ID to populate the variables on the template
	            var mergeResult = emailMerger.merge(); // Merge the template with the email
	
	            var emailSubject = mergeResult.getSubject(); // Get the subject for the email
	            var emailBody = mergeResult.getBody(); // Get the body for the email
	            
			   // Prepare the attachments.	      
	            var attachments = new Array();
	            try
	            {
	                attachments[0] = nlapiLoadFile('Sales Tax Invoices/Livongo_Sales Tax Bulletin.pdf');
	                //attachments[i] = nlapiLoadFile(currFile);
	                nlapiLogExecution('DEBUG', 'VALUE', 'Livongo_Sales Tax Bulletin Pdf file ID is : '+ attachments[0].getId());
	              
	                billetinAttached = true; 
	            }
	            catch(err)
	            {
	                nlapiLogExecution('AUDIT', 'VALUE', 'Error to load Livongo_Sales Tax Bulletin PDF file: Livongo_Sales Tax Bulletin.pdf');
	            }
	            
	            var customer = [];
	            customer['entity'] = custid;
	            // Sending email now..
	            if(billetinAttached ==true){
		            nlapiSendEmail(empid, email, emailSubject, emailBody, ccemailArr, null, customer, attachments);
		            nlapiSubmitField('customrecord_sales_tax_bulletin_customer',customrecord.getId(),'custrecord_bulletin_sent','T');
		            nlapiLogExecution('DEBUG', 'VALUE', 'Successfully sent bulletin for Customer Internal ID: '+ custid  );
	            }
	        }
        }
	}
	catch(e)
	{
        nlapiLogExecution('DEBUG', 'VALUE', 'Failed to send email');
        //Exception block
	}
}
