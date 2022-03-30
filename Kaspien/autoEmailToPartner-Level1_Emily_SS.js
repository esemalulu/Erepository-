function autoReminderForPartner() {
	var recLimit = 49;
	try {
		var poSearchResults = nlapiSearchRecord('purchaseorder', 'customsearch_po_followup_emily');
		if(poSearchResults !== null && poSearchResults.length > 0) {
			nlapiLogExecution('DEBUG', 'Start', '================ Start =======================');
			for (var i = 0; i < recLimit; i++) {
				if(i >= poSearchResults.length) break;
				var emailsToSend = [];
				var internalIds = [];
				var documentIds = [];
				if(poSearchResults[i].getValue(poSearchResults[i].getAllColumns()[7]).indexOf(",") !== -1){
					internalIds = poSearchResults[i].getValue(poSearchResults[i].getAllColumns()[8]).split(",");
					documentIds = poSearchResults[i].getValue(poSearchResults[i].getAllColumns()[7]).split(",");
				} else {
					internalIds.push(poSearchResults[i].getValue(poSearchResults[i].getAllColumns()[8]));
					documentIds.push(poSearchResults[i].getValue(poSearchResults[i].getAllColumns()[7]));
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
					filters[2] = new nlobjSearchFilter("field","systemNotes","noneof",["CUSTBODY_AUTOEMAIL_SENT_FUP1_EMILY"]);
					filters[3] = new nlobjSearchFilter("mainline",null,"is",["T"]);
					filters[4] = new nlobjSearchFilter("internalidnumber",null,"equalto",[internalIds[j]]);
					var columns = new Array();
					columns[0] = new nlobjSearchColumn('date', 'systemNotes', 'MAX');
					columns[0].setSort();
					var poRecords = nlapiSearchRecord('purchaseorder',null,filters,columns);
					nlapiLogExecution('DEBUG', 'poRecords', JSON.stringify(poRecords));
					if(poRecords === null || poRecords.length <= 0 || JSON.parse(JSON.stringify(poRecords))[0].columns == null || !Object.keys(JSON.parse(JSON.stringify(poRecords))[0].columns).length) {
						var filters_create = new Array();
						filters_create[0] = new nlobjSearchFilter('context',"systemNotes","anyof",["WSS"]);
						filters_create[1] = new nlobjSearchFilter('type',"systemNotes","is",["T"]);
						filters_create[2] = new nlobjSearchFilter("type", null,"anyof", ["PurchOrd"]);
						filters_create[3] = new nlobjSearchFilter("field","systemNotes","noneof",["CUSTBODY_AUTOEMAIL_SENT_FUP1_EMILY"]);
						filters_create[4] = new nlobjSearchFilter("mainline",null,"is",["T"]);
						filters_create[5] = new nlobjSearchFilter("internalidnumber",null,"equalto",[internalIds[j]]);
						var columns_create = new Array();
						columns_create[0] = new nlobjSearchColumn('date', 'systemNotes', 'MAX');
						columns_create[0].setSort();
						poRecords = nlapiSearchRecord('purchaseorder',null,filters_create,columns_create);
						nlapiLogExecution('DEBUG', 'poRecords_create', JSON.stringify(poRecords));
					}
					if(poRecords === null || poRecords.length <= 0) continue;
					if(JSON.parse(JSON.stringify(poRecords))[0].columns == null) continue;
					if(!Object.keys(JSON.parse(JSON.stringify(poRecords))[0].columns).length) continue;
					var sysMaxDate = poRecords[0].getValue('date', 'systemNotes', 'MAX');
					nlapiLogExecution('DEBUG', 'System Notes Max Date', nlapiDateToString(new Date(sysMaxDate)) + " For the PO Internal id:" + internalIds[j]);
					nlapiLogExecution('DEBUG', 'Actual date of email triggering(Max Date + 7)', nlapiDateToString(nlapiAddDays(new Date(sysMaxDate), 7)) + " For the PO Internal id:" + internalIds[j]);
					if(new Date() < nlapiAddDays(new Date(sysMaxDate), 7)) continue;
					validDocumentIds.push(documentIds[j]);
					validInternalIds.push(internalIds[j]);
				}
				nlapiLogExecution('DEBUG', 'validDocumentIds', validDocumentIds.length);
				if(validInternalIds.length <= 0) continue;
				// send mail
				if(poSearchResults[i].getValue("custentityorder_email_c",'vendor', 'group') && poSearchResults[i].getValue("custentityorder_email_c",'vendor', 'group') != '- None -') emailsToSend.push(poSearchResults[i].getValue("custentityorder_email_c",'vendor', 'group'));
				if(poSearchResults[i].getValue("custentitysecondary_order_email_c",'vendor', 'group') && poSearchResults[i].getValue("custentitysecondary_order_email_c",'vendor', 'group') != '- None -') emailsToSend.push(poSearchResults[i].getValue("custentitysecondary_order_email_c",'vendor', 'group'));
				try	{
					sendMailToPartners(emailsToSend, validDocumentIds.join(", "), poSearchResults[i].getValue("custbodyetailz_pom_employee",null,'group'));
				} catch ( e ) {
					nlapiLogExecution( 'DEBUG', 'error', JSON.stringify(e) );
					if ( e instanceof nlobjError ) nlapiLogExecution( 'DEBUG', 'system error', e.getCode() + '\n' + e.getDetails() );
					else nlapiLogExecution( 'DEBUG', 'unexpected error', e.toString() );
				}
				for(var index=0; index < validInternalIds.length; index++) {
					nlapiSubmitField('purchaseorder', validInternalIds[index], ['custbody_autoemail_sent_fup1_emily', 'custbody_autoemail_snt_on_fup1_emily'], ['T' ,nlapiDateToString(new Date(), 'date')]);
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
	var emailTemplate = nlapiLoadFile('Templates/Marketing Templates/POFollowupAutomation-1-Email.html').getValue();
	var objRenderer = nlapiCreateTemplateRenderer();
	objRenderer.setTemplate(emailTemplate);
	var body = objRenderer.renderToString();
	body = body.replace("<PO_IDS>", poId);
	body = body.replace("<POM_EMAIL>", replyTo);
	nlapiSendEmail(pomEmployee, emailsToSend, subject, body, null, null, null, null, true, emailsToSend);
	nlapiLogExecution('DEBUG', 'Email Sent successfully for PO Id::' + poId, '---------- Emails got triggered :: ' + emailsToSend.join(',') + ' ----------');
}