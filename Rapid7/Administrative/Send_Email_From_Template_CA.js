/**
 *  Workflow Action (wa)<br/>
 *  
 * 
 * existing:<br/>
 * filename: ./Administrative/Send_Email_From_Template_CA.js ; 116975<br/>
 * script id: customscriptr7sendemailfromtemplate_ca  ; 459 ; Send Email From Template <br/>
 * deploy id: 
 * customdeploy7 ; 647 ; Appliance RMA <br/>
 * customdeployr7sendemail_ca_contact ; 322 ; Contact<br/>
 * customdeployr7sendemailfromtemplate_ca ; 668 ; Employee Notification Msg Sent<br/>
 * customdeployr7sendemail_ca_hbr ; 497 ; Hardware Build Request<br/>
 * customdeployr7sendemail_ca_metasploitlic ; 575 ; Metasploit Licensing<br/>
 * customdeployr7sendemail_ca_nexposelic ; 574 ; Nexpose Licensing<br/>
 * customdeployr7sendemail_ca_opportunity ; 345 ; Opportunity<br/>
 * customdeployr7sendemail_ca_eventattendee ; 385 ; R7 Event Attendees<br/>

 * 
 * <br/>
 * proposed:<br/>
 * filename: ./ACR/r7_wa_sendemailfromtemplate.js<br/>
 * script id: customscript_r7_wa_sendemailfromtemplate<br/>
 * deploy id:
 * customdeploy_r7_wa_sendemailfromtemplateappliancerma
 * customdeploy_r7_wa_sendemailfromtemplatecontact
 * customdeploy_r7_wa_sendemailfromtemplateemployeenotificationmsgsent
 * customdeploy_r7_wa_sendemailfromtemplatehardwarebuildrequest
 * customdeploy_r7_wa_sendemailfromtemplatemetasplointlicensing
 * customdeploy_r7_wa_sendemailfromtemplatenexposelicensing
 * customdeploy_r7_wa_sendemailfromtemplateopportunitiy
 * customdeploy_r7_wa_sendemailfromtemplater7eventattendees
 * 
 * @class r7_wa_SendEmailFromTemplate
 * 
 * @author efagone<br/>
 */

/**
 * @method sendEmail
 */
function sendEmail(){

	var context = nlapiGetContext();
	nlapiLogExecution('DEBUG', 'Context', context.getExecutionContext()); // expect workflow
	
	// Extract Script Record info into local variables. 
	// There are 8 different record types possible.
	var sendFrom = context.getSetting('SCRIPT', 'custscriptr7sendemailfrom');
	var sendToEmail = context.getSetting('SCRIPT', 'custscriptr7sendemailtoemail');
	var sendTo = context.getSetting('SCRIPT', 'custscriptr7sendemailto');
	var sendCC = context.getSetting('SCRIPT', 'custscriptr7sendemailcc');
	var sendBCC = context.getSetting('SCRIPT', 'custscriptr7sendemailbcc');
	var templateId = context.getSetting('SCRIPT', 'custscriptr7sendemailtemplate');
	var attachActivity = context.getSetting('SCRIPT', 'custscriptr7sendemailattachactivity');
	var attachCustomRecType = context.getSetting('SCRIPT', 'custscriptr7sendemailcustomrecordtype');
	var attachCustomRecId = context.getSetting('SCRIPT', 'custscriptr7sendemailcustomrecordid');
	var attachEntity = context.getSetting('SCRIPT', 'custscriptr7sendemailattachentity');
	var attachOpportunity = context.getSetting('SCRIPT', 'custscriptr7sendemailattachopportunity');
	var attachTransaction = context.getSetting('SCRIPT', 'custscriptr7sendemailattachtransaction');
	var attachTransactionPDF = context.getSetting('SCRIPT', 'custscriptr7sendemailattachtranspdf');
	var attachFile = context.getSetting('SCRIPT', 'custscriptr7sendemailattachfile');
	
	// Determine internalId of person to whom the email will be sent.
	// sendToEmail takes precedence over sendTo
	if (sendToEmail != null && sendToEmail != '') {
		sendTo = sendToEmail;
	}
	else {
		// If record type is 'contact' (one of the 8 possible),
		// try to use the contact id as a sendTo internalId
		if ((sendTo == null || sendTo == '') && nlapiGetRecordType() == 'contact') {
			sendTo = nlapiGetRecordId(); //internalId
		}
	}
	
	// Convert the internalId sendCC into a string email address using the
	// employee record
	if (sendCC != null && sendCC != '') {
		sendCC = nlapiLookupField('employee', sendCC, 'email');
	}
	
	if (sendBCC != null && sendBCC != '') {
		sendBCC = nlapiLookupField('employee', sendBCC, 'email');
	}
	
	// There better be a sendTo internalId. If not then exit with: return 'F'
	// 
	if (sendTo != null && sendTo != '') {
		// Determine the contactEmail address from what is available.
		try {
			var contactEmail = '';
			if (sendToEmail != null && sendToEmail != '') {
				contactEmail = sendToEmail; // This looks weird. Assigning an internalId. Shouldn't it be an email address string?
			}
			else {
				contactEmail = nlapiLookupField('contact', sendTo, 'email');
			}
		} 
		catch (e) {
			contactEmail = '';
		}
		
		//Fill in the data for all the CRMSDK 'NL...' tags. 
		var unsubscribeLink = '<a href="https://forms.netsuite.com/app/site/hosting/scriptlet.nl?script=460&deploy=1&compid=663271&h=bf7dc917ab5ac8ff7230&custparam_unsubscribe=' + sendTo + '&custparam_email=' + contactEmail + '">Unsubscribe</a>';
		
		//mapping fields
		var custFields = new Array();
		custFields['NLCUSTOMUNSUBSCRIBE'] = unsubscribeLink;
		custFields['NLCUSTOM1'] = context.getSetting('SCRIPT', 'custscriptr7sendemailnlcustom1');
		custFields['NLCUSTOM2'] = context.getSetting('SCRIPT', 'custscriptr7sendemailnlcustom2');
		custFields['NLCUSTOM3'] = context.getSetting('SCRIPT', 'custscriptr7sendemailnlcustom3');
		custFields['NLCUSTOM4'] = context.getSetting('SCRIPT', 'custscriptr7sendemailnlcustom4');
		custFields['NLCUSTOM5'] = context.getSetting('SCRIPT', 'custscriptr7sendemailnlcustom5');
		custFields['NLCUSTOM6'] = context.getSetting('SCRIPT', 'custscriptr7sendemailnlcustom6');
		custFields['NLCUSTOM7'] = context.getSetting('SCRIPT', 'custscriptr7sendemailnlcustom7');
		custFields['NLCUSTOM8'] = context.getSetting('SCRIPT', 'custscriptr7sendemailnlcustom8');
		custFields['NLCUSTOM9'] = context.getSetting('SCRIPT', 'custscriptr7sendemailnlcustom9');
		custFields['NLCUSTOM10'] = context.getSetting('SCRIPT', 'custscriptr7sendemailnlcustom10');
		custFields['NLCUSTOM11'] = context.getSetting('SCRIPT', 'custscriptr7sendemailnlcustom11');
		custFields['NLCUSTOM12'] = context.getSetting('SCRIPT', 'custscriptr7sendemailnlcustom12');
		custFields['NLCUSTOM13'] = context.getSetting('SCRIPT', 'custscriptr7sendemailnlcustom13');
		custFields['NLCUSTOM14'] = context.getSetting('SCRIPT', 'custscriptr7sendemailnlcustom14');
		custFields['NLCUSTOM15'] = context.getSetting('SCRIPT', 'custscriptr7sendemailnlcustom15');
		
		// Samanage # brian_vaughan@rapid7.com 20150403
		var subject, body;
		var templateVersion = nlapiLoadRecord('emailtemplate', templateId).getFieldValue('templateversion');
		if(templateVersion != 'FREEMARKER') { // CRMSDK Note: this is being deprecated.
			var merge;
			try {
				merge = nlapiMergeRecord(templateId, 'contact', sendTo, null, null, custFields);
			} 
			catch (e) {
				merge = nlapiMergeRecord(templateId, nlapiGetRecordType(), nlapiGetRecordId(), null, null, custFields);
			}
			
			subject = merge.getName();
			body = merge.getValue();
		}
		else { // the new FREEMARKER
			var emailMerger = nlapiCreateEmailMerger(templateId);

			try {
				emailMerger.setCustomRecord('contact', sendTo);
			}
			catch (e) {
				emailMerger.setCustomRecord(nlapiGetRecordType(), nlapiGetRecordId());
			}

			var mergeResult = emailMerger.merge();
			subject = mergeResult.getSubject();
			body = mergeResult.getBody();
			
			// This is a kludge to fix the loss of the 6th parameter of nlapiMergeRecord
			// Substitute the custFields values into places where the custFields keys appear.
			for(var key in custFields) {
				nlapiLogExecution('DEBUG',key,custFields[key]);
				var regex = new RegExp('\<'+key+'\>', 'g');
				subject = subject.replace(regex, custFields[key]);
				body = body.replace(regex, custFields[key]);
			}
		}
		// Samanage # brian_vaughan@rapid7.com 20150403

		body = mergeNativeFields(body);
		body = mergeAdditionalCUSEATS(body);
		
		var records = new Array();
		if (attachActivity != null && attachActivity != '') {
			records['activity'] = attachActivity;
		}
		if (attachCustomRecType != null && attachCustomRecType != '' && attachCustomRecId != null && attachCustomRecId != '') {
			records['recordtype'] = attachCustomRecType;
			records['record'] = attachCustomRecId;
		}
		if (attachEntity != null && attachEntity != '') {
			records['entity'] = attachEntity;
		}
		if (attachTransaction != null && attachTransaction != '') {
			records['transaction'] = attachTransaction;
		}
		if (attachOpportunity != null && attachOpportunity != '') { //opp takes precedence
			records['transaction'] = attachOpportunity;
		}
		var transactionPDF = null;
		if (attachTransactionPDF != null && attachTransactionPDF != '') {
			transactionPDF = nlapiPrintRecord('transaction', attachTransactionPDF, 'PDF');
		}
		
		// If no transaction PDF then add attach file by ID
		if (transactionPDF == null && attachFile != null && attachFile != '') {
			var file = nlapiLoadFile(attachFile);
			var fileType = file.getType();
			var folder = file.getFolder();
			// Must be in the 'Attachments to Send Folder' ID 5046 or subfolder mburstein ID 1188501
			if (fileType == 'PDF' && (folder == 5046 || folder == 1188501)) {
				transactionPDF = file;
			}
			else {
				nlapiLogExecution('DEBUG', 'File not valid.', fileType + ' ' + folder);
				transactionPDF = null;
			}
		}
		
		try {	
			nlapiSendEmail(sendFrom, sendTo, subject, body, sendCC, sendBCC, records, transactionPDF);
			nlapiLogExecution('DEBUG', 'Successfully sent email', 'From: ' + sendFrom + '\nTo: ' + sendTo);
			return 'T';
		} 
		catch (e) {
			nlapiLogExecution('ERROR', 'Could not send email', 'From: ' + sendFrom + '\nTo: ' + sendTo + '\nError: ' + e);
			//nlapiSendEmail(55011, 55011, 'Could not send email', 'From: ' + sendFrom + '\nTo: ' + sendTo);
			return 'F';
		}
	}
	
	return 'F';
}

/**
 * @method mergeNativeFields
 * @private
 * @param {String} body
 * @returns {String} body
 */
function mergeNativeFields(body){

	var regex = /\<NL[A-Za-z0-9]*>/g;
	var matches = [];
	var match;
	
	while (match = regex.exec(body)) {
		matches.push(match[0]);
	}
	
	matches = unique(matches);
	
	for (var i = 0; matches != null && i < matches.length; i++) {
		var match = matches[i];
		var fieldId = match.substr(3, match.length - 4);
		var fieldValue = '';
		try {
			fieldValue = nlapiLookupField(nlapiGetRecordType(), nlapiGetRecordId(), fieldId);
		}
		catch (e){
			
		}
		
		if (fieldValue != null && fieldValue != '') {
			var replaceRegex = new RegExp(match, 'g');
			
			body = body.replace(replaceRegex, fieldValue);
		}
	}
	
	return body;
}

/**
 * @merge mergeAdditionalCUSEATS
 * @private
 * @param {String} body
 * @returns {String} body
 */
function mergeAdditionalCUSEATS(body){

	var regex = /\{NLCUSEAT\d+\}/g;
	var matches = [];
	var match;
	
	while (match = regex.exec(body)) {
		matches.push(match[0]);
	}
	
	matches = unique(matches);
	
	for (var i = 0; matches != null && i < matches.length; i++) {
		var match = matches[i];
		var eatId = match.substr(9, match.length - 10);
		var eatContent = '';
		try {
			eatContent = nlapiLookupField('customrecordr7emailassociationtags', eatId, 'custrecordr7eathtmlcontent');
		} 
		catch (e) {
		
		}
		
		if (eatContent != null && eatContent != '') {
			var replaceRegex = new RegExp(match, 'g');
			
			body = body.replace(replaceRegex, eatContent);
		}
	}
	
	return body;
}

/**
 * @method unique
 * @private
 * @param {Array} a
 * @returns {Array} a
 */
function unique(a){
	a.sort();
	for (var i = 1; i < a.length;) {
		if (a[i - 1] == a[i]) {
			a.splice(i, 1);
		}
		else {
			i++;
		}
	}
	return a;
}
