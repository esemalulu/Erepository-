function autoEmailCustomerWithUnpaidInvoices() {
	var recLimit = 113;
	var customerSearchResults = nlapiSearchRecord('customer', 'customsearch_unpaid_invoice_auto_cust');
	if(customerSearchResults !== null && customerSearchResults.length > 0) {
		for (var i = 0; i < recLimit; i++) {
			if(i >= customerSearchResults.length) break;
			nlapiLogExecution('DEBUG', 'customer Id::', customerSearchResults[i].getValue("entity", "transaction"));
			var to = customerSearchResults[i].getValue("email", "contact");
			var account_manager_id =  customerSearchResults[i].getValue("custentityprtnr_opt");
			nlapiLogExecution('DEBUG', 'account_manager_id::', account_manager_id);
			nlapiLogExecution('DEBUG', 'TO::', to);
			nlapiLogExecution('DEBUG', 'Invoice Internal Id::', customerSearchResults[i].getValue("internalid", "transaction"));
			if(!to.length || !account_manager_id) continue;
			// send mail
			var retVal = sendMailToPartners(to, customerSearchResults[i].getValue("entityid"), customerSearchResults[i].getValue("tranid", "transaction"), account_manager_id, customerSearchResults[i].getText("custentityprtnr_opt"));
			try {
				if(retVal) nlapiSubmitField('invoice', customerSearchResults[i].getValue("internalid", "transaction"), ['custbody_unpaid_inv_email_sent', 'custbody_unpaid_inv_email_sent_date'], ['T' ,nlapiDateToString(new Date(), 'date')]);
			} catch ( e ) {
				nlapiLogExecution( 'DEBUG', 'error', JSON.stringify(e) );
				if ( e instanceof nlobjError ) nlapiLogExecution( 'DEBUG', 'system error', e.getCode() + '\n' + e.getDetails() );
				else nlapiLogExecution( 'DEBUG', 'unexpected error', e.toString() );
			}
		}
	}
}

function sendMailToPartners(to, partner_name, invoice_id, account_manager_id, account_manager_name) {
	nlapiLogExecution('DEBUG', 'Sending emails started for invoice Id::' + invoice_id, '---------- Sending emails started ----------');
	var replyTo = nlapiLookupField('employee', account_manager_id, 'email');
	var subject = 'Marketing services and influencers - Invoice: #' + invoice_id;
	var emailTemplate = nlapiLoadFile('Templates/Marketing Templates/InvoiceAutomation-Email.html').getValue();
	nlapiLogExecution('DEBUG', 'Invoice Id::', invoice_id);
	nlapiLogExecution('DEBUG', 'From record Id::', account_manager_id);
	nlapiLogExecution('DEBUG', 'To Email::', to);
	nlapiLogExecution('DEBUG', 'Reply To email::', replyTo);
	var objRenderer = nlapiCreateTemplateRenderer();
	objRenderer.setTemplate(emailTemplate);
	var body = objRenderer.renderToString();
	body = body.replace("<PARTNER_NAME>", partner_name);
	body = body.replace("<INVOICE_IDS>", invoice_id);
	body = body.replace("<SUBJECT>", subject);
	body = body.replace("<ACCOUNT_MANAGER_NAME>", account_manager_name);
	try {
		var file = nlapiLoadFile('Marketing Invoices/' + invoice_id + '.pdf');
		nlapiSendEmail(account_manager_id, to, subject, body, replyTo, null, null, file, null, true, replyTo);
		nlapiLogExecution('DEBUG', 'Email Sent successfully for invoice Id::' + invoice_id, 'Emails got triggered :: ' + to);
		return true;
	}  catch ( e ) {
		nlapiLogExecution( 'DEBUG', 'error', JSON.stringify(e) );
		if ( e instanceof nlobjError ) nlapiLogExecution( 'DEBUG', 'system error', e.getCode() + '\n' + e.getDetails() );
		else nlapiLogExecution( 'DEBUG', 'unexpected error', e.toString() );
		return false;
	}
}