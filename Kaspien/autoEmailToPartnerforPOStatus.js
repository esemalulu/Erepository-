function autoReminderForPartner() {
	var recLimit = 99;
	var poSearchResults = nlapiSearchRecord('purchaseorder', 'customsearch_auto_reminder_partner');
	if(poSearchResults !== null && poSearchResults.length > 0) {
		for (var i = 0; i < recLimit; i++) {
			if(i >= poSearchResults.length) break;
			nlapiLogExecution('DEBUG', 'Date check', nlapiDateToString(new Date()) + '==' + nlapiDateToString(addBusinessDays(new Date(poSearchResults[i].getValue("trandate")), 7)));
			nlapiLogExecution('DEBUG', 'Date created for #PO ' + poSearchResults[i].getId() + ' is', poSearchResults[i].getValue("trandate"));
			if(nlapiDateToString(new Date()) == nlapiDateToString(addBusinessDays(new Date(poSearchResults[i].getValue("trandate")), 7))) {
				// send mail
				sendMailToPartners(poSearchResults[i].getValue("internalid",'vendor'), poSearchResults[i].getValue("custbodypo_primary_email"), poSearchResults[i].getValue("tranid"), poSearchResults[i].getValue("custbodyetailz_pom_employee"));
				nlapiSubmitField('purchaseorder', poSearchResults[i].getId(), ['custbody_auto_email_sent', 'custbody_auto_email_sent_on_date'], ['T' ,nlapiDateToString(new Date(), 'date')]);
			}
		}
	}
}

function sendMailToPartners(vendorId, primaryOrderEmail, poId, pomEmployee) {
	try {
		var vendorRecord = nlapiLoadRecord('vendor', vendorId);
		if(!vendorRecord || !pomEmployee) return false;
		var fromPOM = pomEmployee;
		var to = (primaryOrderEmail.indexOf("(") != -1) ? primaryOrderEmail.substr(0, primaryOrderEmail.indexOf("(")).replace(" ", "") : primaryOrderEmail;
		nlapiLogExecution('DEBUG', 'From record', fromPOM);
		nlapiLogExecution('DEBUG', 'To Email::', to);
		if(!to || !fromPOM) { 
			nlapiLogExecution('DEBUG', 'No Primary Order Email Exists.'); 
			return false;
		}
		nlapiLogExecution('DEBUG', 'CC email::', nlapiLookupField('employee', fromPOM, 'email'));
		var replyTo = nlapiLookupField('employee', fromPOM, 'email');
		var subject = 'Purchase Order_' + poId;
		var emailTemplate = nlapiLoadFile('Templates/Marketing Templates/062518-ET-AutoEmailAlertsforPOM-Email.html').getValue();
		var objRenderer = nlapiCreateTemplateRenderer();
		objRenderer.setTemplate(emailTemplate);
		var body = objRenderer.renderToString();
		body = body.replace("<PO_NAME>", vendorRecord.getFieldValue("altname"));
		body = body.replace("<PO_ID>", poId);
		body = body.replace("<SUBJECT>", subject);
		nlapiSendEmail(fromPOM, to, subject, body, nlapiLookupField('employee', fromPOM, 'email'), null, null, null, true, replyTo);

		nlapiLogExecution('DEBUG', 'Email Sent successfully', 'Emails got triggered :: ' + to);
	}  catch ( e ) {
		nlapiLogExecution( 'DEBUG', 'error', JSON.stringify(e) );
		if ( e instanceof nlobjError ) nlapiLogExecution( 'DEBUG', 'system error', e.getCode() + '\n' + e.getDetails() );
		else nlapiLogExecution( 'DEBUG', 'unexpected error', e.toString() );
	}
}

function addBusinessDays(baseDate, daysToAdd) {
   var newDate = baseDate;
   var bussDayCounter = 0;
   try {
      while ( bussDayCounter < daysToAdd ) {
          newDate = nlapiAddDays(newDate, 1);
          if ( newDate.getDay() == 0 ) newDate = nlapiAddDays(newDate, 1);
          else if ( newDate.getDay() == 6 ) newDate = nlapiAddDays(newDate, 2);
          bussDayCounter++;
      }
      return newDate;
    }  catch ( e ) {
		nlapiLogExecution( 'DEBUG', 'error', JSON.stringify(e) );
		if ( e instanceof nlobjError ) nlapiLogExecution( 'DEBUG', 'system error', e.getCode() + '\n' + e.getDetails() );
		else nlapiLogExecution( 'DEBUG', 'unexpected error', e.toString() );
	}
}