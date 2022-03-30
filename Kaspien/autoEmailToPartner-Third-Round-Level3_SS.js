function autoReminderForPartner() {
	var recLimit = 49;
	try {
		var poSearchResults = nlapiSearchRecord('purchaseorder', 'customsearch_po_third_round_followup_3');
		if(poSearchResults !== null && poSearchResults.length > 0) {
			nlapiLogExecution('DEBUG', 'Start', '================ Start =======================');
			for (var i = 0; i < recLimit; i++) {
				if(i >= poSearchResults.length) break;
				var emailsToSend = [];
				var internalIds = [];
				var documentIds = [];
				if(poSearchResults[i].getValue(poSearchResults[i].getAllColumns()[7]).indexOf(",") !== -1){
					documentIds = poSearchResults[i].getValue(poSearchResults[i].getAllColumns()[6]).split(",");
					internalIds = poSearchResults[i].getValue(poSearchResults[i].getAllColumns()[7]).split(",");
				} else {
					internalIds.push(poSearchResults[i].getValue(poSearchResults[i].getAllColumns()[7]));
					documentIds.push(poSearchResults[i].getValue(poSearchResults[i].getAllColumns()[6]));
				}
				nlapiLogExecution('DEBUG', 'documentIds', documentIds.length);
				nlapiLogExecution('DEBUG', 'internalIds', internalIds.length);
				var validDocumentIds = [];
				var validInternalIds = [];
				for(var j = 0; j < internalIds.length; j++){
					nlapiLogExecution('DEBUG', 'Started the Processing for PO Internal Id::' + internalIds[j], '---------- Started the Processing for PO Internal Id::' + internalIds[j] + '---------');
					var filters = new Array();
					filters[0] = new nlobjSearchFilter('context',"systemNotes","anyof",["UIF"]);
					filters[1] = new nlobjSearchFilter("type", null,"anyof", ["PurchOrd"]);
					filters[2] = new nlobjSearchFilter("field","systemNotes","noneof",["custbody_auto_email_sent_3round_fup1", "custbody_auto_email_sent_3round_fup2","custbody_auto_email_sent_3round_fup3"]);
					filters[3] = new nlobjSearchFilter("mainline",null,"is",["T"]);
					filters[4] = new nlobjSearchFilter("internalidnumber",null,"equalto",[internalIds[j]]);
					var columns = new Array();
					columns[0] = new nlobjSearchColumn('date', 'systemNotes', 'MAX');
					columns[0].setSort();
					var poRecords = nlapiSearchRecord('purchaseorder',null,filters,columns);
					nlapiLogExecution('DEBUG', 'poRecords', JSON.stringify(poRecords));
					//if(poRecords === null || poRecords.length <= 0) continue;
					//if(JSON.parse(JSON.stringify(poRecords))[0].columns == null) continue;
					//if(!Object.keys(JSON.parse(JSON.stringify(poRecords))[0].columns).length) continue;
					var poRec = nlapiLoadRecord('purchaseorder',internalIds[j]);
					var sysMaxDate = poRec.getFieldValue('custbody_auto_email_sent_dt_2nd_fup2');
					if(poRecords === null || poRecords.length <= 0 || JSON.parse(JSON.stringify(poRecords))[0].columns == null || !Object.keys(JSON.parse(JSON.stringify(poRecords))[0].columns).length) {
					} else {
						sysMaxDate = (new Date(sysMaxDate) < new Date(poRecords[0].getValue('date', 'systemNotes', 'MAX'))) ? poRecords[0].getValue('date', 'systemNotes', 'MAX') : sysMaxDate;
					}
					nlapiLogExecution('DEBUG', 'System Notes Max Date', nlapiDateToString(new Date(sysMaxDate)) + " For the PO Internal id:" + internalIds[j]);
					nlapiLogExecution('DEBUG', 'Actual date of email triggering(Max Date + 4)', nlapiDateToString(nlapiAddDays(new Date(sysMaxDate), 4)) + " For the PO Internal id:" + internalIds[j]);

					if(new Date() <= nlapiAddDays(new Date(sysMaxDate), 4)) continue;
					validDocumentIds.push(documentIds[j]);
					validInternalIds.push(internalIds[j]);
				}
				nlapiLogExecution('DEBUG', 'valid DocumentIds', validDocumentIds);
				nlapiLogExecution('DEBUG', 'valid InternalIds', validInternalIds);
				if(validInternalIds.length <= 0) continue;
				// send mail
				if(poSearchResults[i].getValue("custentityorder_email_c",'vendor', 'group') && poSearchResults[i].getValue("custentityorder_email_c",'vendor', 'group') != '- None -') emailsToSend.push(poSearchResults[i].getValue("custentityorder_email_c",'vendor', 'group'));
				if(poSearchResults[i].getValue("custentitysecondary_order_email_c",'vendor', 'group') && poSearchResults[i].getValue("custentitysecondary_order_email_c",'vendor', 'group') != '- None -') emailsToSend.push(poSearchResults[i].getValue("custentitysecondary_order_email_c",'vendor', 'group'));
				try	{
					sendMailToPartners(emailsToSend, validDocumentIds.join(", "), poSearchResults[i].getValue("custentitypom_team",'vendor','group'));
				} catch ( e ) {
					nlapiLogExecution( 'DEBUG', 'error', JSON.stringify(e) );
					if ( e instanceof nlobjError ) nlapiLogExecution( 'DEBUG', 'system error', e.getCode() + '\n' + e.getDetails() );
					else nlapiLogExecution( 'DEBUG', 'unexpected error', e.toString() );
				}
				for(var index=0; index < validInternalIds.length; index++) {
					nlapiSubmitField('purchaseorder', validInternalIds[index], ['custbody_auto_email_sent_3round_fup3', 'custbody_auto_email_sent_dt_3rnd_fup3'], ['T' ,nlapiDateToString(new Date(), 'date')]);
				}
			}
			nlapiLogExecution('DEBUG', 'End', '================ End =======================');
		}
	} catch ( e ) {
		nlapiLogExecution( 'DEBUG', 'error', JSON.stringify(e) );
		if ( e instanceof nlobjError ) nlapiLogExecution( 'DEBUG', 'system error', e.getCode() + '\n' + e.getDetails() );
		else nlapiLogExecution( 'DEBUG', 'unexpected error', e.toString() );
	}
}

function sendMailToPartners( emailsToSend, poId, pomEmployee) {
	nlapiLogExecution('DEBUG', 'Sending emails started for PO Id::' + poId, '---------- Sending emails started ----------');
	if(!poId) return false;
	if(!pomEmployee) return false;
	nlapiLogExecution('DEBUG', 'From record', pomEmployee);
	nlapiLogExecution('DEBUG', 'To Email::', emailsToSend);
	if(!emailsToSend.length || !pomEmployee) { 
		nlapiLogExecution('DEBUG', 'No Primary & Secondary Order Emails Exist.'); 
		return false;
	}
	var replyTo = nlapiLookupField('employee', pomEmployee, 'email');
	nlapiLogExecution('DEBUG', 'POM Employee Email', replyTo);
	var subject = 'etailz POs - Followup';
	var emailTemplate = nlapiLoadFile('Templates/Marketing Templates/POFollowupAutomation-3-Email.html').getValue();
	var objRenderer = nlapiCreateTemplateRenderer();
	objRenderer.setTemplate(emailTemplate);
	var body = objRenderer.renderToString();
	body = body.replace("<PO_IDS>", poId);
	body = body.replace("<POM_EMAIL>", replyTo);
	nlapiSendEmail(pomEmployee, emailsToSend, subject, body, null, null, null, null, true, replyTo);
	nlapiLogExecution('DEBUG', 'Email Sent successfully for PO Id::' + poId, '---------- Emails got triggered :: ' + emailsToSend.join(',') + ' ----------');
}