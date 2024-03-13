function sendEmail(email){

	var context = nlapiGetContext();
	nlapiLogExecution('DEBUG', 'Context', context.getExecutionContext()); // expect workflow
	
	var sendFrom = email.sendFrom;;
	var sendToName = email.sendToName;
	var sendTo = email.sendTo;
	var sendCC = email.sendCC;
	var sendBCC = email.sendBCC;
	var templateId = email.templateId;
	var attachActivity = email.attachActivity;
	var attachCustomRecType = email.attachCustomRecType;
	var attachCustomRecId = email.attachCustomRecId;
	var attachEntity = email.attachEntity;
	var attachOpportunity = email.attachOpportunity;
	var attachTransaction = email.attachTransaction;
	var attachTransactionPDF = email.attachTransactionPDF;
	var attachFile = email.attachFile;
		// If record type is 'contact' (one of the 8 possible),
		// try to use the contact id as a sendTo internalId
		if ((sendTo == null || sendTo == '') && nlapiGetRecordType() == 'contact') {
			sendTo = nlapiGetRecordId(); //internalId
		}
	
	// Convert the internalId sendCC into a string email address using the
	// employee record
	if (sendCC != null && sendCC != '') {
		sendCC = nlapiLookupField('employee', sendCC, 'email');
	}
	
	if (sendBCC != null && sendBCC != '') {
		sendBCC = nlapiLookupField('employee', sendBCC, 'email');
	}
		
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
		//		emailMerger.setCustomRecord(nlapiGetRecordType(), nlapiGetRecordId());
			}
			catch (e) {
				emailMerger.setCustomRecord(nlapiGetRecordType(), nlapiGetRecordId());
			}

			var mergeResult = emailMerger.merge();
			subject = mergeResult.getSubject();
			body = mergeResult.getBody();
			
			if(sendToName != null && sendToName != ''){
				// Substitute values into places where keys appear.
				var key = 'NLFIRSTNAME';
				var regex = new RegExp('\<'+key+'\>', 'g');
				//	subject = subject.replace(regex, 'FieldValue1');
					body = body.replace(regex, sendToName);
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
			
		} 
		catch (e) {
			nlapiLogExecution('ERROR', 'Could not send email', 'From: ' + sendFrom + '\nTo: ' + sendTo + '\nError: ' + e);
			//nlapiSendEmail(55011, 55011, 'Could not send email', 'From: ' + sendFrom + '\nTo: ' + sendTo);
			
		}
//	}
}

/**
 * @method mergeNativeFields
 * @private
 * @param {String} body
 
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
