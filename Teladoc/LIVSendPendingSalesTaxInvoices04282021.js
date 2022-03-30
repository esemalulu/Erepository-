//last update date: 111618 - Send Tax Email
//10/25/2020
function LIVSendTaxEmail()
{
	nlapiLogExecution('DEBUG', 'LIVSendTaxEmail', '*****START*****');
	var currentCustomerId = '';
	var nextCustomerId = '';
	var sameCustomerRows = [];
	var isLastGroup = false;
	
	 //var arrResult = nlapiSearchRecord(null, "customsearch1272");//SB1
     var arrResult = nlapiSearchRecord(null, "customsearch1323");//Prod
	 nlapiLogExecution('DEBUG', 'VALUE', 'arrResult.length: '+ arrResult.length);
	 for (var i = 0;  i < arrResult.length; i++)
     {
		currentCustomerId = arrResult[i].getValue('custrecord_customer');
 		if(arrResult[i+1]){
 			nextCustomerId = arrResult[i+1].getValue('custrecord_customer');
 		}
 		
 		nlapiLogExecution('DEBUG', 'VALUE', 'currentCustomerId = '+currentCustomerId); 
 		nlapiLogExecution('DEBUG', 'VALUE', 'nextCustomerId = '+nextCustomerId); 
 		
 		if(currentCustomerId == nextCustomerId){
			sameCustomerRows.push(arrResult[i].getId());
			if(arrResult[i+1]){
				sameCustomerRows.push(arrResult[i+1].getId());
			}
			else{
				isLastGroup = true;
			}		         
		}
		else
		{
			if(sameCustomerRows.length == 0){
				sameCustomerRows.push(arrResult[i].getId());
    		}
			sameCustomerRows = sameCustomerRows.getUnique();
			sendEmail(sameCustomerRows);
			
        	sameCustomerRows = [];
        	currentCustomerId = '';
        	nextCustomerId = '';
		}
 		
		if(isLastGroup){
			sameCustomerRows = sameCustomerRows.getUnique();
			sendEmail(sameCustomerRows);
			
        	sameCustomerRows = [];
        	currentCustomerId = '';
        	nextCustomerId = '';
		}
    }
	 nlapiLogExecution('DEBUG', 'LIVSendTaxEmail', '*****END*****');
}

function sendEmail(sameCustomerRows){
	nlapiLogExecution('DEBUG', 'sendEmail', '*****START*****');
	try
	{
    	var templateid = 23; // Sales Tax Email (2021)
        //var templateid = 24; // Sales Tax Email (2021) - Followup
    	var empid = 640328; // Employee Name for from address. //Livongo Tax
     
    	var invoiceAttached = false;
    	var detailsAttached = false;
      
    	var firstCustomrecordId = sameCustomerRows[0];
    	var firstCustomrecord = nlapiLoadRecord('customrecord_pending_st_invoices',firstCustomrecordId);
      
    	var invid = firstCustomrecord.getFieldValue("custrecord_invoice_no");
    	var custid = firstCustomrecord.getFieldValue("custrecord_customer");
    	var detailedInvoicePDF = firstCustomrecord.getFieldValue("custrecord_detailed_inv_link");
     
    	var custemail = firstCustomrecord.getFieldValue("custrecord_cust_email");
      	var ccemail = firstCustomrecord.getFieldValue("custrecord_cc_email");
      	var ccemailArr =  ccemail.split(',');
      
    	/*var custemail = 'anil.sharma@teladochealth.com';
    	var ccemail = 'ram.gorantla@teladochealth.com';
    	var ccemailArr =  'ram.gorantla@teladochealth.com';*/
      
    	var k = 0;
    	var attachments = new Array();

    	//Attach Invoice PDFs 
    	if(sameCustomerRows && sameCustomerRows.length > 0)
    	{
    		nlapiLogExecution('DEBUG', 'VALUE', 'Total Processing result set: '+ sameCustomerRows.length);
	        for (var j = 0;  j < sameCustomerRows.length; j++)
	        {
	        	var customrecordId = sameCustomerRows[j];
	            var customrecord = nlapiLoadRecord('customrecord_pending_st_invoices',customrecordId);
	            
	            var invoicePDF = customrecord.getFieldValue("custrecord_invoice_link");

	            // Prepare the attachments.
			   //var k = 0;
			   try
			   {
	               attachments[k] = nlapiLoadFile(invoicePDF);
	               nlapiLogExecution('DEBUG', 'VALUE', 'Invoice Pdf file ID is : '+ attachments[k].getId());
	               k++;
	               invoiceAttached = true;
	            }
	            catch(err)
	            {
	               nlapiLogExecution('AUDIT', 'VALUE', 'Error to load PDF file: ' + invoicePDF);
	            }           
	        }//for
      	}//if
      
      	//Attache the Detailed Invoice PDF
      	try
      	{
      		attachments[k] = nlapiLoadFile(detailedInvoicePDF);
      		nlapiLogExecution('DEBUG', 'VALUE', 'Invoice Detail Pdf file ID is : '+ attachments[k].getId());
      		k++;
      		detailsAttached = true; 
      	}
      	catch(err)
      	{
      		nlapiLogExecution('AUDIT', 'VALUE', 'Error to load Detail PDF file: ' + detailedInvoicePDF);
      	}	 
      
      	// Prepare email.
      	var emailMerger = nlapiCreateEmailMerger(templateid); // Initiate Email Merger
      	//emailMerger.setTransaction(invid); // Set the transaction ID to populate the variables on the template
      	var mergeResult = emailMerger.merge(); // Merge the template with the email

      	var emailSubject = mergeResult.getSubject(); // Get the subject for the email
      	var emailBody = mergeResult.getBody(); // Get the body for the email
      	
	    var customer = [];
	    
	    customer['entity'] = custid;
	    // Sending email now..
	    if(invoiceAttached == true && detailsAttached == true){
	    	nlapiSendEmail(empid, custemail, emailSubject, emailBody, ccemailArr, null, customer, attachments);
	        nlapiLogExecution('DEBUG', 'VALUE', 'Successfully send mail for Customer ID: '+ custid  );
	          
	        for(var l=0;l<sameCustomerRows.length;l++){
	        	nlapiSubmitField('customrecord_pending_st_invoices',sameCustomerRows[l],'custrecord_email_sent','T');
  			}
	     }
	}
	catch(e)
	{
      nlapiLogExecution('DEBUG', 'VALUE', 'Failed to send email');
      nlapiLogExecution('DEBUG', 'VALUE', 'Error = '+e);
      
	}
	nlapiLogExecution('DEBUG', 'sendEmail', '*****END*****');
}


Array.prototype.getUnique = function() {
	 var o = {}, a = [], i, e;
	 for (i = 0; e = this[i]; i++) {o[e] = 1};
	 for (e in o) {a.push (e)};
	 return a;
}