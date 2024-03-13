/*
 * @author efagone
 */
function requestNotifications() {

	var recQuote = nlapiGetNewRecord();
	var quoteId = recQuote.getId();
	var sId = recQuote.getFieldValue('custbodyr7sid');
	var customerName = recQuote.getFieldText('entity');
	var quoteNumber = recQuote.getFieldValue('tranid');
	this.userId = nlapiGetUser();
	var toURL = nlapiRequestURL(nlapiResolveURL('SUITELET','customscriptretrieveurl','customdeployretrieveurl',true)).getBody();
	var suiteletURL = nlapiResolveURL('SUITELET',
			'customscriptr7approvalssuitelet',
			'customdeployr7_approvalssuitelet_quote', true);
	var recordURL = '<a href="'+toURL+'/app/accounting/transactions/estimate.nl?id='
			+ quoteId + '">' + quoteNumber + '</a><br>';

	var arrSearchFilters = new Array();
	arrSearchFilters[0] = new nlobjSearchFilter('custrecordr7approvalquote',
			null, 'is', quoteId);
	arrSearchFilters[1] = new nlobjSearchFilter('custrecordr7approvalstatus',
			null, 'anyof', new Array(1, 2, 4, 7));
	// arrSearchFilters[2] = new
	// nlobjSearchFilter('custrecordr7approvaldaterequested', null, 'isempty');

	var arrSearchColumns = new Array();
	arrSearchColumns[0] = new nlobjSearchColumn('custrecordr7approvalrule');
	arrSearchColumns[1] = new nlobjSearchColumn(
			'custrecordr7approvaldescription');
	arrSearchColumns[2] = new nlobjSearchColumn('custrecordr7approvalapprover');
	arrSearchColumns[3] = new nlobjSearchColumn('custrecordr7approvalquote');
	arrSearchColumns[4] = new nlobjSearchColumn('custrecordr7approvalstatus');
	arrSearchColumns[5] = new nlobjSearchColumn(
			'custrecordr7approveopportunity');
	arrSearchColumns[6] = new nlobjSearchColumn(
			'custrecordr7approvaldaterequested');

	var arrSearchResults = nlapiSearchRecord('customrecordr7approvalrecord',
			null, arrSearchFilters, arrSearchColumns);

	var arrNotificationIds = new Array();

	for ( var i in arrSearchResults) {
		arrNotificationIds[arrNotificationIds.length] = arrSearchResults[i]
				.getValue(arrSearchColumns[2]);
	}

	arrNotificationIds = unique(arrNotificationIds);

	// MB: 10/16/14 - Updated nlapiPrintRecord to use custom transaction form R7
	// Sales Order (vMB) - ID 158
	// This was to add "Created From RA column on renewal quotes
	var salesRepDept = nlapiLookupField('employee', recQuote.getFieldValue('salesrep'), 'department');
	// If sales rep department is Account Management(10) then it's renewal so
	// show Created from RA column
	/*
	 * if (salesRepDept == 10) { var fileQuote = nlapiPrintRecord('transaction',
	 * quoteId, 'HTML', {'formnumber': 158}); }
	 */
	if (isCreatedFromRa(recQuote)) {
		var fileQuote = nlapiPrintRecord('transaction', quoteId, 'HTML', {
			'formnumber' : 158
		});
	}
	else {
		var fileQuote = nlapiPrintRecord('transaction', quoteId, 'HTML')
	}
	var quoteHTML = fileQuote.getValue();
	quoteHTML = quoteHTML.replace(quoteNumber, recordURL);
	var quoteMemo = recQuote.getFieldValue('memo');
	if (quoteMemo != '' && quoteMemo != null && quoteMemo != 'null') {
		quoteMemo = '<b>MEMO:</b><br> ' + quoteMemo
				+ '<br>';
	} else {
		quoteMemo = '';
	}
	// https://issues.corp.rapid7.com/browse/APPS-13174
	var quoteBillingSchedule = recQuote.getFieldText('custbodysfbillingschedule');
	if (quoteBillingSchedule != '' && quoteBillingSchedule != null && quoteBillingSchedule != 'null') {
		quoteBillingSchedule = '<b>BILLING SCHEDULE:</b><br> ' + quoteBillingSchedule
				+ '<br>';
	} else {
		quoteBillingSchedule = '';
	}
	var quoteBillingScheduleNotes = recQuote.getFieldValue('custbodysfbillingschedulenotes');
	if (quoteBillingScheduleNotes != '' && quoteBillingScheduleNotes != null && quoteBillingScheduleNotes != 'null') {
		quoteBillingScheduleNotes = '<b>BILLING SCHEDULE NOTES:</b><br> ' + quoteBillingScheduleNotes
				+ '<br>';
	} else {
		quoteBillingScheduleNotes = '';
	}

	// https://issues.corp.rapid7.com/browse/APPS-10698
	var quotePartner = recQuote.getFieldText('partner');
	if (quotePartner != '' && quotePartner != null && quotePartner != 'null') {
		quotePartner = '<b>PARTNER:</b><br> ' + quotePartner
				+ '<br>';
	} else {
		quotePartner = '';
	}
	var quoteBillingParty = recQuote.getFieldText('custbodyr7billingresponsibleparty');
	if (quoteBillingParty != '' && quoteBillingParty != null && quoteBillingParty != 'null') {
		quoteBillingParty = '<b>BILLING RESPONSIBLE PARTY:</b><br> ' + quoteBillingParty
				+ '<br>';
	} else {
		quoteBillingParty = '';
	}

	var quoteExpirationDate = recQuote.getFieldValue('duedate');
	if (quoteExpirationDate != '' && quoteExpirationDate != null && quoteExpirationDate != 'null') {
		quoteExpirationDate = '<b>EXPIRATION DATE:</b><br> ' + quoteExpirationDate
			+ '<br>';
	} else {
		quoteExpirationDate = '';
	}

	var sfOpportunityNumber = recQuote.getFieldValue('custbodyr7_sf_oppnumber');
	sfOpportunityNumber = '<b>SF OPPORTUNITY NUMBER:</b><br> ' + sfOpportunityNumber + '<br>';

	var now = nlapiDateToString(new Date(), 'datetimetz');

	var fields = new Array();
	fields[0] = 'custrecordr7approvalstatus';
	fields[1] = 'custrecordr7approvaldaterequested';

	var values = new Array();

	// nlapiLogExecution('DEBUG', '# to notify', arrNotificationIds.length);

	for (var i = 0; i < arrNotificationIds.length && arrNotificationIds != null; i++) {

		var notifyId = arrNotificationIds[i];
		var bodyText = '<p style="font-family:calibri;font-size:14px;">';
		var approvalText = '<b><a href="' + suiteletURL + '&custparamsid='
				+ sId + '&custparamuser=' + notifyId
				+ '">APPROVALS:</a></b><br>';
		var notificationText = '<b><a href="' + suiteletURL + '&custparamsid='
				+ sId + '&custparamuser=' + notifyId
				+ '">NOTIFICATIONS:</a></b><br>';
		var approvalCounter = 1;
		var notificationCounter = 1;
		var hasApprovals = false;
		var hasNotifcations = false;

		for (var j = 0; j < arrSearchResults.length && arrSearchResults != null; j++) {

			searchResult = arrSearchResults[j];
			var resultRule = searchResult.getText(arrSearchColumns[0]);
			var resultDesc = searchResult.getValue(arrSearchColumns[1]);
			var resultApprover = searchResult.getText(arrSearchColumns[2]);
			var resultApproverId = searchResult.getValue(arrSearchColumns[2]);
			var resultQuote = searchResult.getText(arrSearchColumns[3]);
			var resultStatus = searchResult.getValue(arrSearchColumns[4]);
			var dateRequested = searchResult.getValue(arrSearchColumns[6]);

			if (notifyId == resultApproverId
					&& (resultStatus == 1 || resultStatus == 2 || resultStatus == 4)) {

				if (notifyId == userId) {
					nlapiLogExecution('DEBUG', 'requestor is notifyee',
							'marking approved');
					hasApprovals = false;
					values[0] = 3;
					values[1] = now;
				} else {
					nlapiLogExecution('DEBUG', 'approval', 'yup');
					approvalText += ' '
							+ approvalCounter + ')   ' + '<b>' + resultRule
							+ ':</b>   ' + resultDesc + '<br>';
					approvalCounter = approvalCounter + 1;
					hasApprovals = true;
					values[0] = 2;
					values[1] = now;
				}

				try {
					nlapiSubmitField('customrecordr7approvalrecord',
							searchResult.getId(), fields, values);
				} catch (e) {
					nlapiLogExecution('ERROR', e.name, e.message);
				}
			}

			if (notifyId == resultApproverId && resultStatus == 7
					&& dateRequested == '') {

				if (notifyId == userId) {
					nlapiLogExecution('DEBUG', 'requestor is notifyee',
							'marking approved');
					hasNotifcations = false;
				} else {
					nlapiLogExecution('DEBUG', 'notification', 'yup');
					notificationText += ' '
							+ notificationCounter + ')   ' + '<b>' + resultRule
							+ ':</b>   ' + resultDesc + '<br>';
					notificationCounter = notificationCounter + 1;
					hasNotifcations = true;
				}
				values[0] = 7;
				values[1] = now;

				try {
					nlapiSubmitField('customrecordr7approvalrecord',
							searchResult.getId(), fields, values);
				} catch (e) {
					nlapiLogExecution('ERROR', e.name, e.message);
				}

			}

		}

		if (hasApprovals || hasNotifcations) {

			var records = new Array();
			records['transaction'] = quoteId;

            //yes we want to use the prod url for images for all environments
            var prodImageBaseUrl = 'https://663271.app.netsuite.com';

            var approveButton = '<br><a href="'
                + suiteletURL
                + '&custparamsid='
                + sId
                + '&custparamuser='
                + notifyId
                + '"> <img src="' + prodImageBaseUrl + '/core/media/media.nl?id=74066&c=663271&h=ea1395b47f55ad2cf45b"></a>';

			var approverName = nlapiLookupField('employee', notifyId, 'entityid');
			nlapiLogExecution('debug', 'approverName', approverName);
			approverName = '<b>APPROVER NAME:</b><br> ' + approverName + '<br>';

			var subjectText = 'NOTIFICATION ' + customerName + ': '
					+ quoteNumber;

			if (hasApprovals) {
				bodyText += approvalText + '<br>';
				bodyText += quoteExpirationDate;
				subjectText = 'APPROVAL ' + customerName + ': ' + quoteNumber;
			}
			if (hasNotifcations) {
				bodyText += notificationText;

			}
			bodyText += quoteMemo;
			bodyText += quotePartner;
			bodyText += quoteBillingParty;
			bodyText += quoteBillingSchedule;
			bodyText += quoteBillingScheduleNotes;
			bodyText += approverName;
			bodyText += sfOpportunityNumber;
			bodyText += '</p>';
			bodyText += approveButton;
			bodyText += '<br>---------------------------------------------------------------<br>';
			bodyText += quoteHTML;

			nlapiLogExecution('DEBUG', 'notifyId', notifyId);
			nlapiLogExecution('DEBUG', 'userId', userId);
			nlapiLogExecution('DEBUG', 'subjectText', subjectText);
			nlapiLogExecution('DEBUG', 'bodyText', bodyText);

			
			if (notifyId != null && notifyId != "") {
                // https://issues.corp.rapid7.com/browse/APPS-13551
				// check if notifiable employee is in an approval group -> send the email to shared group inbox
				
				// notifySharedInbox = null | email string
                var notifySharedInbox = getApprovalGroupInbox(notifyId);
                if (notifySharedInbox) {
                    nlapiSendEmail(userId, notifySharedInbox, subjectText, bodyText);
                } else {
                    nlapiSendEmail(userId, notifyId, subjectText, bodyText);
                }
            }
		}
	}

	checkForAlreadyApproved(recQuote, quoteId, quoteNumber, customerName);

}

function getApprovalGroupInbox(notifyId) {
    var approvalGroupSearch = nlapiSearchRecord(
        "customrecord_r7_quote_approval_group",
        null,
        [["custrecord_r7_group_members", "anyof", notifyId]],
        [new nlobjSearchColumn("custrecord_r7_shared_email_inbox")]
	);
	var sharedInbox = null;
    for (var i = 0; approvalGroupSearch != null && i < approvalGroupSearch.length; i++) {
		// should return only one result
        var currentSearchResult = approvalGroupSearch[i];
        sharedInbox = currentSearchResult.getValue(
            "custrecord_r7_shared_email_inbox"
        );
	}
	return sharedInbox
}

function checkForAlreadyApproved(recQuote, quoteId, quoteNumber, customerName) {
	var arrSearchFilters = new Array();
	var toURL = nlapiRequestURL(nlapiResolveURL('SUITELET','customscriptretrieveurl','customdeployretrieveurl',true)).getBody();
	arrSearchFilters[0] = new nlobjSearchFilter('custrecordr7approvalquote',
			null, 'is', quoteId);
	arrSearchFilters[1] = new nlobjSearchFilter('custrecordr7approvalstatus',
			null, 'anyof', new Array(1, 2, 4));

	var arrSearchResults = nlapiSearchRecord('customrecordr7approvalrecord',
			null, arrSearchFilters, null);

	var currentQuoteStatusId = recQuote
			.getFieldValue('custbodyr7quoteorderapprovalstatus');

	var fields = new Array();
	fields[0] = 'custbodyr7quoteorderapprovalstatus';
	fields[1] = 'custbodyr7quoteapprovalrequester';

	var values = new Array();
	values[0] = currentQuoteStatusId;
	values[1] = userId;

	var recordURL = '<a href="'+toURL+'/app/accounting/transactions/estimate.nl?id='
			+ quoteId + '">' + quoteNumber + '</a>';

	if (arrSearchResults == null || arrSearchResults.length <= 0) {
		values[0] = '3';
	} else {
		values[0] = '2';
	}
	
	nlapiSubmitField('estimate', quoteId, fields, values);
	
	if (values[0] == '3') { // if approved
		var salesRep = recQuote.getFieldValue('salesrep');
		var salesRepText = recQuote.getFieldText('salesrep');
		
		var records = new Array();
		records['transaction'] = quoteId;
		
		var subject = 'Quote ' + quoteNumber + ' is approved';
		var body = '' + 'CUSTOMER: ' + customerName + '\nQUOTE: ' + quoteNumber
		+ '\nSALES REP: ' + salesRepText
		+ '\n\nYour Quote has been approved and is attached.'+fileQuotePDF;
		
		var userEmail = nlapiLookupField('employee', userId, 'email');
		
		function setTimeout(aFunction, milliseconds){
			var date = new Date();
			date.setMilliseconds(date.getMilliseconds() + milliseconds);
			while (new Date() < date) {}
			return aFunction();
		}
		nlapiLogExecution('DEBUG', 'email sent here', 'yes')
		// https://issues.corp.rapid7.com/browse/APPS-16546 delay email sending to give system some time to stamp APPROVED status on the quote, otherwise DRAFT background remains
		setTimeout(function () {
			// var packageQuoteURL = nlapiResolveURL('RESTLET', 'customscript_r7_pck_transaction_restlet', 'customdeploy_r7_pck_transaction_restlet');
			// packageQuoteURL += '&transactionId='+quoteId;
			// var response = nlapiRequestURL(packageQuoteURL);

			var fileQuotePDFId = recQuote.getFieldValue('custbodyr7_approved_quote_pdf');
			var fileQuotePDF = fileQuotePDFId ? nlapiLoadFile(fileQuotePDFId) : nlapiPrintRecord("transaction", quoteId, "PDF");
            nlapiSendEmail(userId, salesRep, subject, body, userEmail, null, records, fileQuotePDF); 
        }, 1000);
	}

}

function unique(a) {
	a.sort();
	for (var i = 1; i < a.length;) {
		if (a[i - 1] == a[i]) {
			a.splice(i, 1);
		} else {
			i++;
		}
	}
	return a;
}

/**
 * Returns true if the Quote is created from a Renewal
 * @param recQuote
 * @returns {Boolean}
 */
function isCreatedFromRa(recQuote) {
	var isCreatedFromRa = false;
	var lineItemCount = recQuote.getLineItemCount('item');
	for (var i = 1; i <= lineItemCount; i++) {
		
		 var createdFromRa = recQuote.getLineItemValue('item', 'custcolr7createdfromra', i);
		 nlapiLogExecution('DEBUG','createdFromRa',createdFromRa);	
		if (createdFromRa!=null && createdFromRa!="") { 
			isCreatedFromRa = true;
			break;
		}
	}
	nlapiLogExecution('DEBUG', 'isCreatedFromRa', isCreatedFromRa);
	return isCreatedFromRa;
}
