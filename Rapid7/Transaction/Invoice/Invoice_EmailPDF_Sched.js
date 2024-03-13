function SendEmail(type){	
	try{
		var context = nlapiGetContext();
		var emailTemplate = context.getSetting('SCRIPT', 'custscriptr7param_email_invoice_template');
		nlapiLogExecution('DEBUG', 'Email Template ID ', emailTemplate);

	 	//saved search created by rapid7
	 	var searchId = context.getSetting('SCRIPT', 'custscriptr7param_email_invoice_search');
	 	var search = nlapiLoadSearch("invoice",searchId);
	 	var resultset = search.runSearch();

	 	var step = 999;
	 	var start = 0;
	 	var end = start + step;

		// get results
		var results = resultset.getResults(start, end);

		do {

			// process results

			for(var j in results) {

				var invoiceId = results[j].getId();
				nlapiLogExecution("DEBUG","DEBUG , id : ", invoiceId);

				var invoiceRecord = nlapiLoadRecord("invoice",invoiceId);
				// Get the internal id of the customer
				var customerId = invoiceRecord.getFieldValue("entity");	

				//gets the value of the field 'Invoice to be emailed'
				var sendEmail = invoiceRecord.getFieldValue("custbody_tt_invoice_to_be_email");

				//gets the value of the field 'Invoice Email Send'
				var hasBeenSend = invoiceRecord.getFieldValue("custbody_tt_invoice_email_send_new");	

				if(customerId && customerId != null && sendEmail == "T" && hasBeenSend == "F"){
					// Get the internal id of the partner
					var partnerId = invoiceRecord.getFieldValue("partner");	

					// If the Billing Responsible Party is Partner/Reseller then pull Billing Contact field from Partner, otherwise pull from Customer
					var billingContact = '';
					var billingResponsibleParty = invoiceRecord.getFieldValue("custbodyr7billingresponsibleparty");
					if (billingResponsibleParty == 3 && partnerId && partnerId != '' ){  // 3 = Partner/Reseller
						billingContact = nlapiLookupField('partner', partnerId, 'custentity_tt_billing_contact');
					}
					else{
						billingContact = invoiceRecord.getFieldValue("custbody_tt_billing_contact");						
					}
					//if the field is checked
					if(billingContact && billingContact != null){	
						
						 //gets the body of the email to be send, merged with the template and the invoice
						 var emailMerger = nlapiCreateEmailMerger(emailTemplate);

						 emailMerger.setTransaction(invoiceId);

						 var mergeResult = emailMerger.merge();

						 var emailSubject = mergeResult.getSubject();

						 var emailBody = mergeResult.getBody();

			             //gets the pdf of the sales order
			             var pdf = nlapiPrintRecord('TRANSACTION', invoiceId, 'PDF', null);

			             //gets the internal id of the AR COLLECTION REP, which is by default Stadolnik, Matthew
			             var senderId = invoiceRecord.getFieldValue("custbodyr7arcollectionrep");
			             var records = new Object();
			             records['transaction'] = parseInt(invoiceId);

			             //send the email to the billing contact    
			             nlapiLogExecution("DEBUG","Before Sending Email","before Sending Email");
			             if (senderId && senderId !=''){
				             try{
				            	 var replyTo = context.getSetting('SCRIPT', 'custscriptr7param_replyto_email');
				            	 nlapiSendEmail(senderId, billingContact, emailSubject, emailBody,null,null,records,pdf,null,null,replyTo);
				             }
				             catch(e){
								var adminUser =  nlapiLoadConfiguration('companypreferences').getFieldValue('custscriptr7_system_info_email_sender');
				            	nlapiSendEmail(adminUser, adminUser, 'Could not email customer their invoice' + invoiceRecord.getFieldValue('tranid'), e.name + ' : ' + e.message);
				             }
			             }
			             else{
							var adminUser =  nlapiLoadConfiguration('companypreferences').getFieldValue('custscriptr7_system_info_email_sender');
			            	nlapiSendEmail(adminUser, adminUser,'Could not email Customer Invoice' + invoiceRecord.getFieldValue('tranid'), 'Could not email customer their invoice.  AR COLLECTION REP is empty on '+ invoiceRecord.getFieldValue('tranid'));
			             }
			             //set the field Invoice Email Send to true

			             invoiceRecord.setFieldValue("custbody_tt_invoice_email_send_new","T");
			             


			             var date = new Date();
			             var year = date.getFullYear();
			             var month = parseInt(date.getMonth())+1;
			             var day = date.getDate();

						 //gets the email address of the customer
						 var billingEmail = nlapiLookupField('entity',billingContact,'email');
						 
						 //Create a review of the email being send in the 'Air Comment' field with the recipient and the date
						 var ArComment = month+'/'+day+'/'+year+' - Invoice emailed to: '+billingEmail;

						 invoiceRecord.setFieldValue("custbodyr7arcomments",ArComment);

						 nlapiSubmitRecord(invoiceRecord);
						 		 
					}    		
				}
			}
		// continue

		start = end + 1;

		end = start + step;


		results = resultset.getResults(start, end);
		nlapiYieldScript();
		} while(results != null && results.length > 0);

}catch(e){  	
		nlapiLogExecution('ERROR', 'ERROR', e);
	}
}