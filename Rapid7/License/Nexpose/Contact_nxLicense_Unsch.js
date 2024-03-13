function createLicenseAndNotifyContact(){

	//boomk;	
	
	var timeLimitInMinutes = 10;
	this.timeLimitInMilliseconds = timeLimitInMinutes * 60 * 1000;
	this.startingTime = new Date().getTime();
	this.context = nlapiGetContext();
	this.rescheduleScript = false;
	
	var executionContext = context.getExecutionContext();
	var ecCompany = context.getCompany();
	var ecDepartment = context.getDepartment();
	var ecEmail = context.getEmail();
	var ecEnv = context.getEnvironment();
	var ecLocation = context.getLocation();
	var ecName = context.getName();
	var ecRole = context.getRole();
	var ecRoleCenter = context.getRoleCenter();
	var ecSubsidiary = context.getSubsidiary();
	var ecUser = context.getUser();
	executionContext = "Execution Context:" + executionContext + "\nCompany:" + ecCompany + "\nDepartment:" + ecDepartment + "\nEmail:" + ecEmail + "\nEnvironment:" + ecEnv + "\nLocation:" + ecLocation + "\nName:" + ecName + "\nRole:" + ecRole + "\nRoleCenter:" + ecRoleCenter + "\nSubsidiary:" + ecSubsidiary + "\nUser:" + ecUser;
	nlapiLogExecution('DEBUG', 'Execution Context Details', executionContext);
	
	var searchResults = nlapiSearchRecord('customrecordr7nexposelicensing', 3022);
	var alertOnce = false;
	
	if (searchResults != null) {
		for (var i = 0; i < searchResults.length && unitsLeft() && timeLeft(); i++) {
		
			processLicenseRecord(searchResults[i].getValue('internalid'));
			sleep(25);
		}
		
		var searchResults = nlapiSearchRecord('customrecordr7nexposelicensing', 3022);
		if (searchResults != null && searchResults.length >= 5 && !alertOnce) {
			alertOnce = true;
			var errorText = "5+ License records backed up from AutocreateNeXposeLicense Script";
			errorText += "\n Please investigate.";
			errorText += "\n This is the only alert you will receive for this execution.";
			errorText += "\n Thank you.";
			nlapiSendEmail(2, 2, 'Alert from Autocreate NeXpose License Script', errorText, 'errol_fagone@rapid7.com');
		}
		
		if (rescheduleScript) {
			nlapiLogExecution('DEBUG', 'Rescheduling script (script/deploy id)', context.getScriptId() + ' : ' + context.getDeploymentId());
			var status = nlapiScheduleScript(context.getScriptId(), context.getDeploymentId());
			nlapiLogExecution('DEBUG', 'Schedule Status', status);
		}
	}
}

function timeLeft(){
	var presentTime = new Date().getTime();
	if (presentTime - startingTime > timeLimitInMilliseconds) {
		nlapiLogExecution('DEBUG', 'Ran out of time', 'yup');
		rescheduleScript = true;
		return false;
	}
	return true;
}

function unitsLeft(){
	var unitsLeft = context.getRemainingUsage();
	if (unitsLeft <= 200) {
		nlapiLogExecution('DEBUG', 'Ran out of units', 'yup');
		rescheduleScript = true;
		return false;
	}
	return true;
}

function sleep(timeInSeconds){
	var timeStart = new Date();
	var timeFinish = new Date();
	var duration = timeInSeconds * 1000;
	while(timeFinish.getTime() - timeStart.getTime() < duration){
		timeFinish = new Date();
	}
}



function processLicenseRecord(internalId){
			
			/* Calculating costs 
			 * Loading License Record - 20 
			 * Loading Contact Record - 20
			 * Loading Template Record - 20
			 * Submitting License Record - 20
			 * Sending Email to Contact - 20
			 * Sending Email to Notification List - 20
			 * Looking up SalesRep Email - 10 
			 * Sending Email to SalesRep - 20
			 * Minimum Cost = 150 
			 */
			
			var minimumCost = 150
			
			if (nlapiGetContext().getRemainingUsage() > minimumCost) {
			
				nlapiLogExecution('DEBUG','InteralId License Record',internalId);
			
			
				/*From the license record*/
				var licenseRecord = nlapiLoadRecord('customrecordr7nexposelicensing', internalId);
				var templateId = licenseRecord.getFieldValue('custrecordr7nxlicensemarketingtemplate');	
				var templateId2 = licenseRecord.getFieldText('custrecordr7nxlicensemarketingtemplate')
				nlapiLogExecution('DEBUG','Template Id Value',templateId);
				nlapiLogExecution('DEBUG','Template Id Text',templateId2);
				
								
				var contactId = licenseRecord.getFieldValue('custrecordr7nxlicensecontact');
				var noIP = licenseRecord.getFieldValue('custrecordr7nxlicensenumberips');
				var nxposeLicense = "NXL"+internalId;
				
				nlapiLogExecution('DEBUG', 'ContactId', contactId);
				
				/*From the contact record*/
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
				
				var salesRep = nlapiLookupField('customer', companyId, 'salesrep');
				var salesRepText = nlapiLookupField('customer', companyId, 'salesrep', 'text');
				
				if (salesRepText.substr(0, 7) == 'Queue -' || salesRep == '' || salesRep == null) {
					nlapiLogExecution('DEBUG', 'salesRep is empty (or a queue)', 'Setting to DZ');
					salesRep = '2'; //setting to DZ
				}
				
				/*From the template record*/
				var templateRecord = nlapiLoadRecord('customrecordr7nxlicensemarketingtemplate', templateId);
				var emailTemplateId = templateRecord.getFieldValue('custrecordr7nxlicensetempemailactivation');
				var days = templateRecord.getFieldValue('custrecordr7nxlicensetempexpirationdays');
				var sendEmailFrom = templateRecord.getFieldValue('custrecordr7nxlicensetempsendemailfrom');
				var notificationList = templateRecord.getFieldValues('custrecordr7nxlicensetempnotification');
				var notifySalesRep = templateRecord.getFieldValue('custrecordr7nxlicensetempnotifysalesrep');
				var description = templateRecord.getFieldValue('altname');
				var owner = templateRecord.getFieldValue('owner');
				
				var fieldsFromTemplateRecord = "EmailTemplate:" + emailTemplateId + " SendEmailFrom:" + sendEmailFrom +
				" NotifySalesRep:" +
				notifySalesRep;
				nlapiLogExecution('DEBUG', 'FieldsFromTemplateRecord', fieldsFromTemplateRecord);
				
				
				/* Submitting the licensing record to get all relv. info from licensing server */
				licenseRecord.setFieldValue('custrecordr7nxlicensemarketingtemplate', null);
				
				try {
					nlapiSubmitRecord(licenseRecord);
				}catch(err){
					nlapiLogExecution("ERROR",'Error Submitting licenseRecord '+err.name,err.message);
					return 0;
				}
				
				/* Notifying the contact with his license information */
				if (sendEmailFrom == null || sendEmailFrom == '') {
					sendEmailFrom = salesRep;
				}
				if (sendEmailFrom == null || sendEmailFrom == '') {
					sendEmailFrom = owner;
				}
				
				var records = new Array();
				//records['contact'] = contactId;
				records['recordtype'] = 'customrecordr7nexposelicensing';
				records['record'] = internalId;
				var body = nlapiMergeRecord(emailTemplateId, 'customrecordr7nexposelicensing', internalId);
				nlapiSendEmail(sendEmailFrom, contactEmailAddress, body.getName(), body.getValue(), null, null, records);
				/* Notifying the contact with his license information */
				
				
				/* Notifying the salesRep and the notificationList */
				var notificationText = contactName + " from " + companyName + " has been automatically given" +
				" a " + noIP + " IP NeXpose License " + nxposeLicense + 
				" expiring on " +
				nlapiDateToString(nlapiAddDays(new Date(), days)) +
				". This was created from the '" +
				description +
				"' template.";
				
				if (notificationList != null) {
					for (var j = 0; j < notificationList.length; j++) {
						nlapiSendEmail(owner, notificationList[j], 'NeXpose License Download', notificationText);
						nlapiLogExecution('DEBUG','Notification List',notificationList[j]);
					}
				}
				
				if (notifySalesRep == 'T' && salesRep != null && salesRep != '') {
					nlapiSendEmail(owner, salesRep, 'NeXpose License Download', notificationText);
				}
				/* Notifying the salesRep and the notificationList */
				
				nlapiLogExecution('DEBUG', 'All Done', '--------------------------------');
			}
}