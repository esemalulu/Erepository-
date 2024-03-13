function createLicenseAndNotifyContact(){
		
		var searchResults = nlapiSearchRecord('customrecordr7metasploitlicensing',4501);
		
		while (searchResults != null && nlapiGetContext().getRemainingUsage() > 200) {
			for (var i = 0; i < searchResults.length && (nlapiGetContext().getRemainingUsage() > 200); i++) {
				processLicenseRecord(searchResults[i].getValue('internalid'));			
			}
			var searchResults = nlapiSearchRecord('customrecordr7metasploitlicensing',4501);
			if(searchResults!=null && searchResults.length>=2){
					var errorText = "5+ License records backed up from Autocreate METASPLOIT License Script";
					errorText += "\n Please investigate. Thank you.";
					nlapiSendEmail(2,2,'Alert from Autocreate METASPLOIT License Script',errorText,'derek_zanga@rapid7.com');
			}
		}
		
		if(searchResults!=null){
			nlapiScheduleScript(nlapiGetContext().getScriptId(),nlapiGetContext.getDeploymentId());
		}
}

function processLicenseRecord(internalId){
			
	var minimumCost = 150;
	
	
	if (nlapiGetContext().getRemainingUsage() > minimumCost) {
			
	nlapiLogExecution('DEBUG','InteralId License Record',internalId);
			
			
	/* Gathering details from the license record for the email*/
	var licenseRecord = nlapiLoadRecord('customrecordr7metasploitlicensing', internalId);
	var templateId = licenseRecord.getFieldValue('custrecordr7mslicensemarketingtemplate');	
	var templateId2 = licenseRecord.getFieldText('custrecordr7mslicensemarketingtemplate')
	
	nlapiLogExecution('DEBUG','Template Id Value',templateId);
	nlapiLogExecution('DEBUG','Template Id Text',templateId2);
	
	var contactId = licenseRecord.getFieldValue('custrecordr7mslicensecontact');
	var noIP = licenseRecord.getFieldValue('custrecordr7mslicensenumberips');
	var mspltLicense = "MSL"+internalId;
	
	nlapiLogExecution('DEBUG', 'ContactId', contactId);
				
	/* Gathering details for the download email From the contact record*/
	try {
		var contactRecord = nlapiLoadRecord('contact', contactId);
	}
	catch(err){
		nlapiLogExecution("DEBUG",'Error Loading contact record '+err.name,err.message);
		return;
	}			
	var contactEmailAddress = contactRecord.getFieldValue('email');
	var contactName = contactRecord.getFieldValue('entityid');
	var companyId = contactRecord.getFieldValue('company');
	var companyName = contactRecord.getFieldText('company');
				
	var fieldsFromContactRecord = "CompanyId:" + companyId + " CompanyName:" + companyName + " ContactName:" + contactName + " ContactEmailAddress:" + contactEmailAddress;
	nlapiLogExecution('DEBUG', 'FieldsFromContactRecord', fieldsFromContactRecord);
				
	var salesRepEmail = nlapiLookupField('customer', companyId, 'salesrep');
	/* Gathering details for the download email From the contact record*/			
				
	/*From the template record*/
	var templateRecord = nlapiLoadRecord('customrecordr7mslicensemarketingtemplate', templateId);
	var emailTemplateId = templateRecord.getFieldValue('custrecordr7mslicensetempemailactivation');
	var days = templateRecord.getFieldValue('custrecordr7mslicensetempexpirationdays');
	var sendEmailFrom = templateRecord.getFieldValue('custrecordr7mslicensetempsendemailfrom');
	var notificationList = templateRecord.getFieldValues('custrecordr7mslicensetempnotification');
	var notifySalesRep = templateRecord.getFieldValue('custrecordr7mslicensetempnotifysalesrep');
	var description = templateRecord.getFieldValue('altname');
	var owner = templateRecord.getFieldValue('owner');
	var fieldsFromTemplateRecord = "EmailTemplate:" + emailTemplateId + " SendEmailFrom:" + sendEmailFrom +
				" NotifySalesRep:" +
				notifySalesRep;
	nlapiLogExecution('DEBUG', 'FieldsFromTemplateRecord', fieldsFromTemplateRecord);
				
				
	/* Submitting the licensing record to get all relv. info from licensing server */
	//This is all we set on the license record to indicate the license has been processed
		
	licenseRecord.setFieldValue('custrecordr7mslicensemarketingtemplate', null);
	try {
		nlapiSubmitRecord(licenseRecord);
	}catch(err){
		nlapiLogExecution("ERROR",'Error Submitting licenseRecord'+err.name,err.message);
		return 0;
	}
	/* Submitting the licensing record to get all relv. info from licensing server */
	

	/* Notifying the contact with his license information */
	if(sendEmailFrom==null || sendEmailFrom==null){
		sendEmailFrom = salesRepEmail; 
	}
	if(sendEmailFrom==null || sendEmailFrom==null){
		sendEmailFrom = owner;
	}
				
	var records = new Array();
	records['recordtype'] = 'customrecordr7metasploitlicensing';
	records['record'] = internalId;
	var body = nlapiMergeRecord(emailTemplateId, 'customrecordr7metasploitlicensing', internalId);
	nlapiSendEmail(sendEmailFrom, contactEmailAddress, body.getName(), body.getValue(), null, null, records);
	/* Notifying the contact with his license information */
				
				
	/* Notifying the salesRep and the notificationList */
	var notificationText = contactName + " from " + companyName + " has been automatically given" +
	" a " + noIP + " Metasploit License " + mspltLicense + 
	" expiring on " +
	nlapiDateToString(nlapiAddDays(new Date(), days)) +
	". This was created from the '" +
	description +
	"' template.";
				
	if (notificationList != null) {
		for (var j = 0; j < notificationList.length; j++) {
		nlapiSendEmail(owner, notificationList[j], 'Metasploit License Download', notificationText);
		nlapiLogExecution('DEBUG','Notification List',notificationList[j]);
		}
	}
				
	if (notifySalesRep == 'T') {
		nlapiSendEmail(owner, salesRepEmail, 'Metasploit License Download', notificationText);
	}
	/* Notifying the salesRep and the notificationList */
	nlapiLogExecution('DEBUG', 'All Done', '--------------------------------');
	}
}
