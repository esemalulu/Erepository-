//last update date: 111618 - Send Tax Email
//10/25/2020
function LIVSendTaxEmail()
{
	try
	{
        var templateid = 21; // Sales Tax Email template
        /*var inv_folder = 'Salex Tax Invoices/2020 Tax';
        var inv_detail_folder = 'Salex Tax Invoices/2020 Tax Details';*/
        //var empid = 503672; // Employee Name for from address. // SB2 -- Livongo Tax
        var empid = 640328; // Employee Name for from address. // Prod -- Livongo Tax
        
        //var searchObj = nlapiLoadSearch("invoice", "customsearch1141");//SB2
        var searchObj = nlapiLoadSearch("invoice", "customsearch1160");//Prod
        
        var rs = searchObj.runSearch();
        // invoice internal id, Bill to customer name, Bill to customer_id, customer_email
        var arrResult = rs.getResults(0,1000);
        if(arrResult)
        {
            nlapiLogExecution('DEBUG', 'VALUE', 'Total Processing result set: '+ arrResult.length);
	        for (var i = 0;  i < arrResult.length; i++)
	        {
	        	var invoiceAttached = false;
	        	var detailsAttached = false;
	        	
	            var customrecord = arrResult[i];
	            var invid = customrecord.getValue("internalid");
	            var custname = customrecord.getValue("companyname","customer",null);
	            var custid = customrecord.getValue("entity");
	            
	            var custemail = customrecord.getValue("email");
	            var ccemail = customrecord.getValue("custbody_liv_cc_email");
	            var ccemailArr =  ccemail.split(',');
	            /*var custemail = 'anil.sharma@livongo.com';
	            var ccemail = 'ram.gorantla@livongo.com';
	            var ccemailArr =  'ram.gorantla@livongo.com';*/
	
	
	            // Prepare email.
	            var emailMerger = nlapiCreateEmailMerger(templateid); // Initiate Email Merger
	            emailMerger.setTransaction(invid); // Set the transaction ID to populate the variables on the template
	            var mergeResult = emailMerger.merge(); // Merge the template with the email
	
	            var emailSubject = mergeResult.getSubject(); // Get the subject for the email
	            var emailBody = mergeResult.getBody(); // Get the body for the email
	            var attachments = new Array();
			   // Prepare the attachments.
			   var k = 0;
			   var inv_folder = 'Sales Tax Invoices/2020 Sales Tax';
			   try
			   {
	               //attachments[k] = nlapiLoadFile(inv_folder + '/SalesTaxInvoice_' + custid + '.pdf');
	               attachments[k] = nlapiLoadFile(inv_folder + '/SalesTaxInvoice_' + custid );
	               //attachments[i] = nlapiLoadFile(currFile);
	               nlapiLogExecution('DEBUG', 'VALUE', 'Invoice Pdf file ID is : '+ attachments[k].getId());
	               k++;
	               invoiceAttached = true;
	            }
	            catch(err)
	            {
	               nlapiLogExecution('AUDIT', 'VALUE', 'Error to load PDF file: ' + 'SalesTaxInvoice_' + custid + '.pdf');
	            }
	            
	            var inv_detail_folder = 'Sales Tax Invoices/2020 SalesTax Details';
	            try
	            {
	                attachments[k] = nlapiLoadFile(inv_detail_folder + '/Invoice_' + custid + '_TaxDetails.pdf');
	                //attachments[i] = nlapiLoadFile(currFile);
	                nlapiLogExecution('DEBUG', 'VALUE', 'Invoice Detail Pdf file ID is : '+ attachments[k].getId());
	                k++;
	                detailsAttached = true; 
	            }
	            catch(err)
	            {
	                nlapiLogExecution('AUDIT', 'VALUE', 'Error to load Detail PDF file: ' + 'Invoice_' + custid + '_TaxDetails.pdf');
	            }
	            // Sending email now..
	            if(invoiceAttached == true && detailsAttached ==true){
		            nlapiSendEmail(empid, custemail, emailSubject, emailBody, ccemailArr, null, null, attachments);
		            nlapiSubmitField('invoice',invid,'custbody_st_invoice_emailed','T');
		            nlapiLogExecution('DEBUG', 'VALUE', 'Successfully send mail for Invoice ID: '+ invid  );
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
