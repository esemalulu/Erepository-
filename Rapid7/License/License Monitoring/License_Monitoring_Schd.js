/**
 * Module Description
 * 
 * Author	mburstein
 * 
 * Version 	1.00
 * Date 	18 Sep 2012
 * 
 * Version 	2.00
 * Date		16 Jun 2013 
 * 
 * 
 * License Monitoring runs a series of searches to check licensing operations are functioning accordingly.
 * 	
 * 	Includes checks for:
 * 		License Creation
 * 		License Updates
 * 		License Request
 * 	
 * 	Products:
 * 		Nexpose
 * 		Metasploit
 * 		Mobilisafe
 * 
 * 	Notifies:
 * 		netsuite_admin@rapid7.com for all failures
 * 		nagios_alerts@rapid7.com for all failures that realate to IT systems
 * 
 * MB: 6/16/13 - Turning Twilio back on 
 * MB: 9/5/13 - Added alertPhoneStatsDown() function, legacy script to check phone statsare being reported properly
 * MB: 11/7/13 - Updated Twilio Handling to v2
 * MB: 5/3/14 - Updating firstname to include randomstring
 * Use function twilioSMS(arrayTo,body,cookie) to send error text as SMS via Twilio
 * Updated License Monitoring to include check for License Request Processing.  Cleaned up extraneous lines of code.
 * 
 * MB: 3/21/15 - Commented out Mobilisafe checks
 * 
 * @requires License_Monitoring_Library_Script.js
 * @script customscriptr7licensemonitoring
 *
 * @module License Monitoring
 */
// How to determine external vs internal created license
// How do we know if Netsuite is functional, external suitelet ping

/**
 * @class monitorLicenseCreation
 * @module License Monitoring
 */
function monitorLicenseCreation(){
	this.context = nlapiGetContext();
	
	// --------------------- BEGIN ENVIRONMENT CHECK ---------------------
	if (['PRODUCTION'].indexOf(nlapiGetContext().getEnvironment()) == -1) {
		return;
	}
	// --------------------- END ENVIRONMENT CHECK ---------------------
	
	this.startingTime = new Date().getTime();
	this.rescheduleScript = false;
	this.debug = true;
	
	var exitScript = false;
	
	// Grab product type variables @Library = Grab_ACR_ProductTypes_Library.js
	this.arrProductTypes = grabAllProductTypes();
	
	// Hardcode contact values in r7Contact Object type testContact
	// MB: 5/3/14 - Updating firstname to include randomstring
	var firstName = 'test' + getRandomString(4);
	r7Contact = new testContact(firstName, "license", "monitor", "r7formtest", "Personal", "nsmonitoring@rapid7.com", "3107604652", "US", "CA", "266530", "T");
	var arrEmailCC = new Array();

	/*
	 * Check recent licenses created using acrId for product
	 * 1 = Nexpose
	 * 2 = Metasploit
	 * 3 = Managed Service
	 * 6 = Mobilisafe
	 */
	var NXacrId = 1;
	var MSacrId = 2;
	
	//var MBacrId = 6;
	var acrId = 0; // initialize acrId
	// Check if NX licenses created in last hour
	var nxLicenseCount = 0;
	try {
		nxLicenseCount = checkLastLicense(NXacrId);
		nxLicenseCount = 0; // Set the NX licence count to ZERO so the script will create the record in order to check NX Lic server availability.
	} catch(err) {
		licenseMonitoringReport(arrProductTypes[NXacrId]['name'], r7Contact, 'countLicenses', arrEmailCC, err, null);
		return;
	}
	// Check if MS licenses created in last hour
	var msLicenseCount = null;
	try {
		msLicenseCount = checkLastLicense(MSacrId);
		msLicenseCount = 0; // Set the MS licence count to ZERO so the script will create the record in order to check MS Lic server availability.
	} catch(err) {
		licenseMonitoringReport(arrProductTypes[MSacrId]['name'], r7Contact, 'countLicenses', arrEmailCC, err, null);
		return;
	}
	
	// Check last updates and send email alert if none
	//checkUpdateServer();
	// Check LRPs are being processed within 5 minutes
	checkLRP();
	
	// Check Phone stats are working - legacy 
	alertPhoneStatsDown();
	
	/*
	 * Nexpose Check
	 */
	if (unitsLeft(1500) && timeLeft(7)) {
		acrId = NXacrId;
		if (nxLicenseCount == 0) { // If no licenses created in last hour, test forms			
			// hardcode accesscode for NX Enterprise Trial License 3-Days
			r7Contact.productaxscode = 'nxfgkwwDLL';
			r7Contact.returnpath = 'https://www.rapid7.com';
			// Post properties of r7Contact object to IPR suitelet
			subimtLicenseForm(r7Contact, acrId);
		}
	}
	/*
	 * Metasploit Check
	 */
	if (unitsLeft(1500) && timeLeft(7)) {
		acrId = MSacrId;
		if (msLicenseCount == 0) { // If no licenses created in last hour, test forms
			r7Contact.product = 'Metasploit Express';
			r7Contact.productaxscode = 'msEADnTY3r';
			r7Contact.returnpath = 'https://www.rapid7.com';
			// Post properties of r7Contact object to IPR suitelet
			subimtLicenseForm(r7Contact, acrId);
		}
	}
	// Updated created contact email to @rapid7.com so it is ignored in registration/activation numbers
	updateEmails(r7Contact);
	
	// ADDED BY BSD - Send email message to monitoring team, so we ensure that script is working...
	// Refer to License_Monitoring_Library_Script.js
	sendSelfMonitorEmail(); 
	
	// reschedule Script
	if (rescheduleScript && !exitScript) {
		nlapiLogExecution('ERROR', 'Rescheduling script (script/deploy id)', context.getScriptId() + ' : ' + context.getDeploymentId());
		nlapiScheduleScript(context.getScriptId(), context.getDeploymentId());
	}
}

// testContact object constructor function
function testContact(firstname,lastname,jobtitle,companyname,use,email,phone,country,state,leadSource,eula){
	this.firstname = firstname;
	this.lastname = lastname;
	this.title = jobtitle;
	this.companyname = companyname;
	this.use = use;
	this.email = email;  //encodeURIComponent()
	this.phone = phone;	
	this.country = country;
	this.state = state;
	//this.custentityr7annualrevenue = annualRevenue;
	this.leadsource = leadSource;
	this.custentityr7eulaonlineagreement = eula;
	//set returnpath and product manually
	//this.returnpath = escape(returnPath);
	//this.product = escape(product);
}		
	
function checkLastLicense(acrId){
	var licenseCount = 0;
	
	var licenseRecordId = arrProductTypes[acrId]['recordid'];
	// Hardcode array of search IDs
	var arrLicenseSearchIds = new Object;
	// Use Search SCRIPT - Check Last NX License  id=11437
	arrLicenseSearchIds[1] = 11437;
	// Use Search SCRIPT - Check Last MS License  id=11451
	arrLicenseSearchIds[2] = 11451;
	// Grab searchId using acrId
	var licenseSearchId = arrLicenseSearchIds[acrId];	
	
	var results = nlapiSearchRecord(licenseRecordId, licenseSearchId);
	if (results != null) {
		var columns = results[0].getAllColumns();
		licenseCount = results[0].getValue(columns[0]);
	}
	return licenseCount;
}

/**
 * Change email domain to @rapid7.com
 * 
 * @method updateEmails
 * @param {Object} r7Contact Object holding new contact record field values
 * @return {Void}
 */ 
function updateEmails(r7Contact){

	var decodedEmail = decodeURIComponent(r7Contact.email);
	var filters = new Array();
	filters[0] = new nlobjSearchFilter( 'firstname', null, 'startswith', r7Contact.firstname);
	filters[1] = new nlobjSearchFilter( 'lastname', null, 'startswith', r7Contact.lastname);
	filters[2] = new nlobjSearchFilter( 'email', null, 'is', decodedEmail);
	filters[3] = new nlobjSearchFilter( 'companyname', 'customer', 'startswith', r7Contact.companyname);
	
	var columns = new Array();
	columns[0] = new nlobjSearchColumn('internalid', null, null);
	
	var results = nlapiSearchRecord('contact', null, filters, columns);
	for (var i = 0; results != null && i < results.length; i++) {
		var result = results[i];
		var contactId = result.getValue(columns[0]);
		var domain = decodedEmail.substr(decodedEmail.indexOf('@', 0) + 1);
		var r7Email = decodedEmail.replace(domain, 'rapid7.com');
		
		// Update Contact Record email field value
		var recContact = nlapiLoadRecord('contact', contactId);
		recContact.setFieldValue('email', r7Email);
		try {
			nlapiSubmitRecord(recContact, null, true);
		} 
		catch (e) {
			nlapiLogExecution('ERROR', 'Could not update contact' + contactId + ' email', e);
		}
	}
}	

function licenseMonitoringReport(productType,r7Contact,phase,arrEmailCC,exception,extraInfo){
        var toURL = nlapiRequestURL(nlapiResolveURL('SUITELET','customscriptretrieveurl','customdeployretrieveurl',true)).getBody();
	var emailSubject = 'License Monitoring Report - '+productType+ ' ' +phase;
	var emailBodyInfo = '';
	// Object of phases
	var objPhase = new Object();
	objPhase.countLicenses = 'Could not count last licenses of ' + productType;
	objPhase.submitIprFail = 'Error while submitting data for '+ productType +' LRP';
	objPhase.iprFail = 'Could not request '+ productType +' IPR form'; 	// Info is error
	objPhase.iprNoKey = productType+ 'IPR Form operational with success code 302 but failure to generate Product Key';
	objPhase.customerFail = 'Could not create ' + productType + ' Customer record';
	objPhase.contactFail = 'Could not create ' + productType + ' Contact record'; //.  Customer Record: '+extraInfo;
	objPhase.licenseFail = 'Could not create ' + productType + ' license record'; //.  Contact Record: '+extraInfo;
	objPhase.checkLRP = 'Could not check recent LRPs';
	objPhase.LRPEmail = 'Could not send email on LRP check error';
	objPhase.LRPSMS = 'Could not send SMS on LRP check error';
		
	var objPhaseCodes = new Object();
	objPhaseCodes.countLicenses = 101;
	objPhaseCodes.submitIprFail = 301;
	objPhaseCodes.iprFail = 601; 	// Info is error
	objPhaseCodes.iprNoKey = 651;
	objPhaseCodes.customerFail = 451;
	objPhaseCodes.contactFail = 401;
	objPhaseCodes.licenseFail = 501;
	objPhaseCodes.checkLRP = 201;
	objPhaseCodes.LRPEmail = 202;
	objPhaseCodes.LRPSMS = 203;
		
	if (extraInfo != undefined && extraInfo != null) {
		emailBodyInfo += '<p><b>Additional Information</b></p><p>'+extraInfo+'</p>';
	}
	
	emailBodyInfo += '<p><b>Contact Info</b></p>';
	emailBodyInfo += '<p>';
	if (r7Contact.contactIid != null && r7Contact.contactIid != '') {
		emailBodyInfo += 'Name: <a href="'+toURL+'/app/common/entity/contact.nl?id='+r7Contact.contactIid+'">' + r7Contact.firstname + ' ' + r7Contact.lastname+'</a><br>';
	}
	else {
		emailBodyInfo += 'Name: ' + r7Contact.firstname + ' ' + r7Contact.lastname+'<br>';
//		emailBodyInfo += 'Job Title: ' + r7Contact.title+'<br>';
	}
	emailBodyInfo += 'Job Title: ' + r7Contact.title+'<br>';
	if(r7Contact.customerIid != null && r7Contact.customerIid != ''){
		emailBodyInfo += 'Company: <a href="'+toURL+'/app/common/entity/custjob.nl?id='+r7Contact.customerIid+'">' + r7Contact.companyname + '</a><br>';
	}
	else{
		emailBodyInfo += 'Company: '+ r7Contact.companyname+'<br>';	
	}
	emailBodyInfo += 'Use: ' + r7Contact.use + '<br>';
	emailBodyInfo += 'Email: ' + r7Contact.email+ '<br>';
	emailBodyInfo += 'Phone: ' + r7Contact.phone+ '<br>';
	emailBodyInfo += 'Country: ' + r7Contact.country+ '<br>';
	emailBodyInfo += 'State: ' + r7Contact.state+ '<br>';
	emailBodyInfo += 'Lead Source: ' + r7Contact.leadsource+ '<br>';
	emailBodyInfo += 'Product Access Code: ' + r7Contact.productaxscode+ '<br>';
	emailBodyInfo += '</p>';	
	
	// Array of CC emails  Edit: this array will get passed in
	//var arrEmailCC = new Array(firstCC,secondCC);
	
	if (exception != undefined && exception != null && exception != '') {
		if ( exception instanceof nlobjError )
		    emailBodyInfo += '<p><b>Exception Information</b></p><p>Code: '+exception.getCode()+'<br/>Description: '+exception.getDetails()+'</p>'
		else
			emailBodyInfo += '<p><b>Exception Information</b></p><p><code>'+exception.toString()+'</code></p>';
		var stackTrace = exception.stackTrace[0];
		for (var i=1;i<exception.stackTrace.length;i++) {
			stackTrace += '<br/>' + exception.stackTrace[i];
		}
		emailBodyInfo += '<p><b>StackTrace</b></p><p>'+stackTrace+'</p>';
	}
	
	emailBodyInfo += '<p><b>Error Code: ' + objPhaseCodes[phase] + '</b></p>';
	
	var errorPhase = objPhase[phase];
	var fullEmailBody = errorPhase +' '+ emailBodyInfo;
	
//	arrEmailCC.push('support@bostonsd.com'); // <- Hardcoded value removed
	arrEmailCC.push(getMonitoringEmail()); // New version - see library script
	var adminUser =  nlapiLoadConfiguration('companypreferences').getFieldValue('custscriptr7_system_info_email_sender');
	nlapiSendEmail( adminUser, adminUser, emailSubject, fullEmailBody, arrEmailCC , null, null ); //to netsuite_admin@rapid7.com  cc arrEmailCC
	sendTwilioSms(emailSubject +' '+ errorPhase);
	return errorPhase;
}

function checkUpdateServer(){
	
	var product = '';
	
	var nxLastContact = checkLastUpdate(1);
	if (nxLastContact > 0) {
		product = 'Nexpose';
		sendUpdateServerReport(product, nxLastContact);
	}

	var msLastContact = checkLastUpdate(2);
	if (msLastContact > 0) {
		product = 'Metasploit';
		sendUpdateServerReport(product, msLastContact);
	}
}

/**
 * @method sendUpdateServerReport
 */
function sendUpdateServerReport(product, lastContact){
	var ccArray = new Array();
	//ccArray[0] = 'nagios_alerts@rapid7.com';
	//ccArray[1] = 'engineeringservices@rapid7.com';
	
	var subject = 'CRITICAL - CHECK ' + product + ' UPDATE SERVER';
	var body = '\nLast Update was ' + lastContact + '.';
	var adminUser =  nlapiLoadConfiguration('companypreferences').getFieldValue('custscriptr7_system_info_email_sender');
	nlapiSendEmail( adminUser, adminUser, subject, body , ccArray, null, null ); 
	sendTwilioSms(subject+body);
	nlapiLogExecution('ERROR', subject, body);
	
}
/**
 * 
 * @method checkLRP
 */
function checkLRP(){
        var toURL = nlapiRequestURL(nlapiResolveURL('SUITELET','customscriptretrieveurl','customdeployretrieveurl',true)).getBody();
	var objIssuesLRP = null;
	try {
		objIssuesLRP = checkRecentLRP();
	} catch(err){
		nlapiLogExecution('ERROR','Checking LRP',err.getCode() + ': ' + err.getDetails());
		licenseMonitoringReport('', r7Contact, 'checkLRP', arrEmailCC, err, null);
//		return false;
		return;
	}
//	var result = false;
	for (prop in objIssuesLRP) {
		var subject = 'CRITICAL-CHECK LRP';
		var body = '';
		for (subProp in objIssuesLRP[prop]) {
			// If the detail field is a record ID then we want a link
			if (subProp == 'id') {
				body += '\n'+toURL+'/app/common/custom/custrecordentry.nl?rectype=585&id=' + objIssuesLRP[prop][subProp];
			}
			else {
				body += ' ' + objIssuesLRP[prop][subProp];
			}
		}
		try {
			var adminUser =  nlapiLoadConfiguration('companypreferences').getFieldValue('custscriptr7_system_info_email_sender');
			nlapiSendEmail(adminUser, 'netsuite_admin@rapid7.com', subject, body);
		} catch(err) {
			licenseMonitoringReport('', r7Contact, 'LRPEmail', arrEmailCC, err, null);
//			result = false;
		}
		try {
			sendTwilioSms(subject + body);
		} catch(err) {
			licenseMonitoringReport('', r7Contact, 'LRPSMS', arrEmailCC, err, null);
//			result = false;
		}
		nlapiLogExecution('ERROR', subject, body);
	}
	
//	return result;
}

function timeLeft(timeLimitInMinutes){

	if (timeLimitInMinutes == null || timeLimitInMinutes == '') {
		timeLimitInMinutes = 11;
	}
	var timeLimitInMilliseconds = timeLimitInMinutes * 60 * 1000;
	
	var presentTime = new Date().getTime();
	if (presentTime - startingTime > timeLimitInMilliseconds) {
		nlapiLogExecution('ERROR', 'Ran out of time', 'yup');
		rescheduleScript = true;
		return false;
	}
	return true;
}

function unitsLeft(number){
	var unitsLeft = context.getRemainingUsage();
	if (unitsLeft <= number) {
		nlapiLogExecution('ERROR', 'Ran out of units', 'yup');
		rescheduleScript = true;
		return false;
	}
	return true;
}
/**
 * Check if the parameter value exists and not null/blank/undefined.
 * @method paramExists
 * @param {Object} value
 * @return {Boolean}
 */
function paramExists(value){
	if (value != null && value != '' && value != 'undefined') {
		return true;
	}
	else {
		return false;
	}
}
/**
 * Send the argument as the body of an sms message
 * @method sendTwilioSms
 * @param {Object} smsbody
 */
function sendTwilioSms(smsBody){
	// MB 11/7/13 - Use the numbers for the netsuite admin group	
	
	/*
	 * Create Array of phone numbers to send to Twilio SMS Request
	 * TODO - grab the numbers dynamically from employee record?
	 */ 
	var twilioToNumbers = new Array();
	twilioToNumbers[twilioToNumbers.length] = '18186743579'; // Michael Burstein
	twilioToNumbers[twilioToNumbers.length] = '19782704965'; // Caitlin Swofford
	//twilioToNumbers[twilioToNumbers.length] = '19148446971'; // Owen Karlsson
	
	//twilioToNumbers[twilioToNumbers.length] = '16176333820'; // Derek Zanga
	//twilioToNumbers[twilioToNumbers.length] = '19788528833'; // Errol Fagone

	// Get the twilio suitelet url
	var twilioRequestURL = nlapiResolveURL('SUITELET', 'customscriptr7twiliorequestssuitelet', 'customdeployr7twiliorequestssuitelet', true);
	nlapiLogExecution('DEBUG', 'REQUEST URL', twilioRequestURL);
	
	for (num in twilioToNumbers) {
		var toNumber = twilioToNumbers[num];
		if (paramExists(toNumber)) {
			// Format phone, replace all non digit chars
			toNumber = toNumber.replace(/\D/g,"");
			nlapiLogExecution('DEBUG', 'Formatted Phone #', toNumber);
		}
		
		var requestURLParams = {
			custparam_type: 'sms',
			custparam_to: toNumber,
			custparam_body: smsBody,
		};
		
		try {
			nlapiRequestURL(twilioRequestURL, requestURLParams);
		} 
		catch (e) {
			nlapiLogExecution('ERROR', 'Could not initiate Twilio SMS', 'To: ' + toNumber + '\nsmsBody: ' + smsBody + ' Error: ' + e);
		}
	}	
}
