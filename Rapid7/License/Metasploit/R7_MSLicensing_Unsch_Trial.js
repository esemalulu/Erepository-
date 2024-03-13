/**
 *  Scheduled (sc)<br/>
 * 
 * DEADCODE
 * The first line of code executes this:
 * 	var searchResults = nlapiSearchRecord('customrecordr7metasploitlicensing',4501);
 * There isn't anything special about record id 4501. This leads me to conclude this
 * file contains code that is only run once on a manually edited record id.
 * What I find confusing is the multiple deployment entries and 2 are scheduled. This
 * implies the script is actually used for something.
 * Also the record id 4501 internally would be MSL4501 due to the configuration. This
 * implies 4501 points to an internal id not the id of the record. This too is confusing
 * to me and makes me doubt my conclusions.
 * It could be active code that does nothing because nlapiSearchRecord() returns a null.
 * There is a record at MSL4501 so why a null is returned by nlapiSearchRecord() is 
 * confusing.
 * 
 *  _warning: email sent from 2<br/>
 *  
 * existing:<br/>
 * filename: ./Metasploit Licensing/R7_MSLicensing_Unsch_Trial.js  ; 34641<br/>
 * script id: customscriptr7_mslicensing_unsch_trial ; 176 ; R7_MSLicensing_Unsch_Trial<br/>
 * deploy id: <br/>
 * customdeployr7_mslicensing_unsch_trial ; 10 ; R7_MSLicensing_Unsch_Trial ; one time event on 5/17/2010<br/>
 * customdeploythe_one_deployment_which_sho; 45 ; R7_MSLicensing_Unsch_Trial 14 ; one time event on 8/24/2010<br/>
 * customdeploy16; 46 ; R7_MSLicensing_Unsch_Trial 15 ; one time event on 8/24/2010<br/>
 * customdeploy17; 47 ; R7_MSLicensing_Unsch_Trial 16 ; one time event on 8/24/2010<br/>
 * customdeploy18; 53 ; R7_MSLicensing_Unsch_Trial 17 ; one time event on 8/24/2010<br/>
 * customdeployms_eoh ; 62 ; R7_MSLicensing_Unsch_Trial 13 ; occurs every day starting on 8/12/2010<br/>
 * customdeploysch_moh ; 63 ; R7_MSLicensing_Unsch_Trial ; 	occurs every day starting on 8/12/2010<br/>
 * 
 * <br/>
 * proposed:<br/>
 * filename: ./Metasploit Licensing/r7_sc_mslicensingunschtrial.js<br/>
 * script id: customscript_r7_sc_mslicensingunschtrial<br/>
 * deploy id: customdeploy_r7_sc_mslicensingunschtrial<br/>
 * 
 * 
 * @class r7_sc_MSLicensingUnschTrial_DEAD
 * 
 */

/**
 * @method createLicenseAndNotifyContact
 */
function createLicenseAndNotifyContact(){
		
		var searchResults = nlapiSearchRecord('customrecordr7metasploitlicensing',4501);
		
		var alertOnce = false;
		while (searchResults != null && nlapiGetContext().getRemainingUsage() > 200) {
			for (var i = 0; i < searchResults.length && (nlapiGetContext().getRemainingUsage() > 200); i++) {
				
				processLicenseRecord(searchResults[i].getValue('internalid'));	
				
				sleep(45);		
			}
			var searchResults = nlapiSearchRecord('customrecordr7metasploitlicensing',4501);
			if(searchResults!=null && searchResults.length>=2 && !alertOnce){
					alertOnce = true;
					var errorText = "5+ License records backed up from Autocreate METASPLOIT License Script";
					errorText += "\n Please investigate.";
					errorText += "\n This is the only alert you will receive for this execution.";
					errorText += "\n Thank you.";
					var adminUser =  nlapiLoadConfiguration('companypreferences').getFieldValue('custscriptr7_system_info_email_sender');
					nlapiSendEmail(adminUser,adminUser,'Alert from Autocreate METASPLOIT License Script',errorText,'derek_zanga@rapid7.com');
			}
		}
		
		if(searchResults!=null){
			nlapiScheduleScript(nlapiGetContext().getScriptId(),nlapiGetContext().getDeploymentId());
		}
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
	//records['entity'] = contactId;
	
	var subject, body;
	var templateVersion = nlapiLoadRecord('emailtemplate', emailTemplateId).getFieldValue('templateversion');

	if (templateVersion != 'FREEMARKER') { // CRMSDK Note: this is being deprecated.
		var merge = nlapiMergeRecord(emailTemplateId, 'customrecordr7metasploitlicensing', internalId);
		subject = merge.getName();
		body = merge.getValue();
	}
	else { // the new FREEMARKER
		var emailMerger = nlapiCreateEmailMerger(emailTemplateId);
		emailMerger.setCustomRecord('customrecordr7metasploitlicensing', internalId);
		
		var mergeResult = emailMerger.merge();
		subject = mergeResult.getSubject();
		body = mergeResult.getBody();
	}

	var sentEmailSuccess = false;
	try {
		nlapiSendEmail(sendEmailFrom, contactId, subject, body, null, null, records);
		sentEmailSuccess = true;
	}catch(err){
		var adminUser =  nlapiLoadConfiguration('companypreferences').getFieldValue('custscriptr7_system_info_email_sender');
		nlapiSendEmail(adminUser, contactId, subject, body, null, null, records);
		sentEmailSuccess = true;
	}
	/* Notifying the contact with his license information */
	
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
	
	try {
		if (notifySalesRep == 'T') {
			var adminUser =  nlapiLoadConfiguration('companypreferences').getFieldValue('custscriptr7_system_info_email_sender');
			nlapiSendEmail(adminUser, salesRepEmail, 'Metasploit License Download', notificationText);
		}
	}catch(err){}
	/* Notifying the salesRep and the notificationList */
	nlapiLogExecution('DEBUG', 'All Done', '--------------------------------');
	}
}
