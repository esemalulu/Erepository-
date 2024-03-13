/*
 * @author efagone
 */
function approveOrders(request, response){
	
	var suiteletURL = nlapiResolveURL('SUITELET', 'customscriptr7approvalssuitelet', 'customdeployr7_approvalssuitelet_quote', true);
	var sId = request.getParameter('custparamsid');
	if (sId != '' && sId != null) {
		var quoteId = getQuoteId(sId);
	}
	var userId = request.getParameter('custparamuser');

	var cancelRecId = request.getParameter('custparamrecid');
	
	if (request.getParameter('custparammessage') == 'cancel' && cancelRecId!=''){
		cancelApproval(cancelRecId, quoteId);
		nlapiSetRedirectURL('EXTERNAL', suiteletURL + '&custparamsid=' + sId + '&custparamuser=' + userId);
	}

		if (request.getMethod() == 'GET' && (quoteId != null || userId != null)) {
		
			var quoteNum = nlapiLookupField('estimate', quoteId, 'number');
			
			var arrSearchFilters = new Array();
			arrSearchFilters[0] = new nlobjSearchFilter('custrecordr7approvalquote', null, 'is', quoteId);
			
			this.arrSearchColumns = new Array();
			arrSearchColumns[0] = new nlobjSearchColumn('custrecordr7approveopportunity');
			arrSearchColumns[1] = new nlobjSearchColumn('custrecordr7approvalquote');
			arrSearchColumns[2] = new nlobjSearchColumn('custrecordr7approvalrule');
			arrSearchColumns[3] = new nlobjSearchColumn('custrecordr7approvaldescription');
			arrSearchColumns[4] = new nlobjSearchColumn('custrecordr7approvalapprover');
			arrSearchColumns[5] = new nlobjSearchColumn('custrecordr7approvalstatus');
			arrSearchColumns[6] = new nlobjSearchColumn('custrecordr7approvalcomments');
			arrSearchColumns[5].setSort(true);
			var toURL = nlapiRequestURL(nlapiResolveURL('SUITELET','customscriptretrieveurl','customdeployretrieveurl',true)).getBody();
			
			var arrSearchResults = nlapiSearchRecord('customrecordr7approvalrecord', null, arrSearchFilters, arrSearchColumns);
			
			if (arrSearchResults != null) {
				arrSearchResults.sort(myCustomSort);
			}
			
			// creating form object
            var quoteURL = toURL.replace('extsystem', 'app') + '/app/accounting/transactions/estimate.nl?id=' + quoteId;
			
			form = new nlapiCreateForm('Order Approvals', true);
			form.setScript('customscriptr7approvalssuiteletscript');
            var fldQuoteNumber = form.addField('custpage_quotenumber', 'text');
			fldQuoteNumber.setDefaultValue('<big>Quote Number: <b>' + '<a href="' + quoteURL + '" target="_blank">' + quoteNum + '</a></big></b>');
			fldQuoteNumber.setDisplayType('inline');
			fldQuoteNumber.setLayoutType('startrow', 'startrow');
			
			var fldSID = form.addField('custpage_sid', 'text');
			fldSID.setDefaultValue(sId);
			fldSID.setDisplayType('hidden');
			
			var fldUserId = form.addField('custpage_userid', 'text');
			fldUserId.setDefaultValue(userId);
			fldUserId.setDisplayType('hidden');
			
			var fldQuoteStatusId = form.addField('custpage_quotestatusid', 'text');
			fldQuoteStatusId.setDisplayType('hidden');
			
			
			var imgQuoteStatus = form.addField('custpage_quotestatusimage', 'inlinehtml', 'Quote Status');
			imgQuoteStatus.setLayoutType('endrow', 'startcol');
			
			
			
			//creating list objects
			
			myList = form.addSubList('custpage_approval_results', 'list', 'My Pending Approvals');
			myList.addField('custpage_recid', 'text', 'RecId').setDisplayType('hidden');
			myList.addField('custpage_rule', 'text', 'Rule');
			myList.addField('custpage_description', 'textarea', 'Description');
			myList.addField('custpage_approver', 'text', 'Approver');
			myList.addField('custpage_status', 'text', 'Status');
			var fldMyApprove = myList.addField('custpage_approve', 'checkbox', 'Approve').setDefaultValue('T');
			var fldMyReject = myList.addField('custpage_reject', 'checkbox', 'Reject');
			
			var comments = myList.addField('custpage_comments', 'textarea', 'Comments');
			comments.setDisplayType('entry');
			comments.setDisplaySize(60, 1);
			
			approversList = form.addSubList('custpage_all_approval_results', 'list', 'All Approvals');
			approversList.addField('custpage_recid_all', 'text', 'RecId').setDisplayType('hidden');
			approversList.addField('custpage_rule_all', 'text', 'Rule');
			approversList.addField('custpage_description_all', 'textarea', 'Description');
			approversList.addField('custpage_approver_all', 'text', 'Approver');
			approversList.addField('custpage_status_all', 'text', 'Status');
			var fldCommentsAll = approversList.addField('custpage_comments_all', 'textarea', 'Comments');
			fldCommentsAll.setDisplaySize(60, 3);
			approversList.addField('custpage_cancel_all', 'textarea', 'Cancel');
			
			notificationList = form.addSubList('custpage_all_notification_results', 'list', 'Notifications');
			notificationList.addField('custpage_recid_notifications', 'text', 'RecId').setDisplayType('hidden');
			notificationList.addField('custpage_rule_notifications', 'text', 'Rule');
			notificationList.addField('custpage_description_notifications', 'textarea', 'Description');
			notificationList.addField('custpage_approver_notifications', 'text', 'Notified');
			notificationList.addField('custpage_status_notifications', 'text', 'Status');
			notificationList.addField('custpage_cancel_notifications', 'textarea', 'Approve/Reject');
			
			
			//setting variables needed to populate list 
			var rejected = false;
			var pending = false;
			var approved = false;
			var myApprovalslineNo = 1
			var notificationLineNo = 1;
			var approvalsLineNo = 1;
            var quoteStatusId = '';

            //yes we want to use the prod url for images for all environments
            var prodImageBaseUrl = 'https://663271.app.netsuite.com';
			
			// populating lists
			for (var i = 0; arrSearchResults != null && i < arrSearchResults.length; i++) {
			
				searchResults = arrSearchResults[i];
				var approverId = searchResults.getValue(arrSearchColumns[4]);
				var statusId = searchResults.getValue(arrSearchColumns[5]);
				var recId = searchResults.getId();
				var rule = searchResults.getText(arrSearchColumns[2]);
				var description = searchResults.getValue(arrSearchColumns[3]);
				var approver = searchResults.getText(arrSearchColumns[4]);
				var status = searchResults.getText(arrSearchColumns[5]);
				var comments = searchResults.getValue(arrSearchColumns[6]);
				
				if (approverId == userId && (statusId == '2' || statusId == '1')) {
				
					myList.setLineItemValue('custpage_recid', myApprovalslineNo, recId);
					myList.setLineItemValue('custpage_rule', myApprovalslineNo, rule);
					myList.setLineItemValue('custpage_description', myApprovalslineNo, description);
					myList.setLineItemValue('custpage_approver', myApprovalslineNo, approver);
					myList.setLineItemValue('custpage_status', myApprovalslineNo, status);
					myApprovalslineNo = myApprovalslineNo + 1;
                    imgQuoteStatus.setDefaultValue('<img src="' + prodImageBaseUrl+'/core/media/media.nl?id=100562&c=663271&h=3261ece08cf02f32d7ae">');
					fldQuoteStatusId.setDefaultValue(statusId);
					quoteStatusId = statusId;
					pending = true;
				}
				else 
					if (statusId == '1' || statusId == '2' || statusId == '3' || statusId == '4') {
					
						approversList.setLineItemValue('custpage_recid_all', approvalsLineNo, recId);
						approversList.setLineItemValue('custpage_rule_all', approvalsLineNo, rule);
						approversList.setLineItemValue('custpage_description_all', approvalsLineNo, description);
						approversList.setLineItemValue('custpage_approver_all', approvalsLineNo, approver);
						approversList.setLineItemValue('custpage_status_all', approvalsLineNo, formatStatus(statusId, status));
						approversList.setLineItemValue('custpage_comments_all', approvalsLineNo, comments);
						
						if (approverId == userId && (statusId == '3' || statusId == '4')) {
							var url = suiteletURL + '&custparamsid=' + sId + '&custparamuser=' + userId + '&custparammessage=cancel' + '&custparamrecid=' + recId;
							approversList.setLineItemValue('custpage_cancel_all', approvalsLineNo, '<center><a href="' + url + '"' + '>Cancel' + '</a></center>');
						}
						
                        approvalsLineNo = approvalsLineNo + 1;

                        
						
						if (statusId == '4') { //rejected
                            imgQuoteStatus.setDefaultValue('<img src="' + prodImageBaseUrl + '/core/media/media.nl?id=74065&c=663271&h=3368eb584d24174a2920">');
							fldQuoteStatusId.setDefaultValue('4');
							quoteStatusId = '4';
							rejected = true;
						}
						
						if ((statusId == '2' || statusId == '1') && !rejected) { //pending approval
                            imgQuoteStatus.setDefaultValue('<img src="' + prodImageBaseUrl + '/core/media/media.nl?id=100562&c=663271&h=3261ece08cf02f32d7ae">');
							fldQuoteStatusId.setDefaultValue(statusId);
							quoteStatusId = statusId;
							pending = true;
						}
						
						if ((statusId == '3' || statusId == '5') && !rejected && !pending) { //approved or replaced
                            imgQuoteStatus.setDefaultValue('<img src="' + prodImageBaseUrl + '/core/media/media.nl?id=74064&c=663271&h=3c72ecd490a2b9cc5f5b">');
							fldQuoteStatusId.setDefaultValue('3');
							quoteStatusId = '3';
							approved = true;
						}
						
						if (statusId == '6' && !rejected && !pending && !approved) { //expired
							imgQuoteStatus.setDefaultValue(formatStatus(statusId, status));
						}
						
					}
				
				if (statusId == '7' || statusId == '5') {
				
					notificationList.setLineItemValue('custpage_recid_notifications', notificationLineNo, recId);
					notificationList.setLineItemValue('custpage_rule_notifications', notificationLineNo, rule);
					notificationList.setLineItemValue('custpage_description_notifications', notificationLineNo, description);
					notificationList.setLineItemValue('custpage_approver_notifications', notificationLineNo, approver);
					notificationList.setLineItemValue('custpage_status_notifications', notificationLineNo, status);
					notificationList.setLineItemValue('custpage_comments_notifications', notificationLineNo, comments);
					if (approverId == userId && statusId == '7') {
						var url = suiteletURL + '&custparamsid=' + sId + '&custparamuser=' + userId + '&custparammessage=cancel' + '&custparamrecid=' + recId;
						notificationList.setLineItemValue('custpage_cancel_notifications', notificationLineNo, '<center><a href="' + url + '"' + '>Convert' + '</a></center>');
					}
					notificationLineNo = notificationLineNo + 1;
					
				}
			}
			
			if (quoteStatusId == '3') {
				var lineCountApprovals = approversList.getLineItemCount();
				var lineCountNotifications = notificationList.getLineItemCount();
				
				for (var i = 1; i <= lineCountApprovals; i++) {
					approversList.setLineItemValue('custpage_cancel_all', i, '');
				}
				for (var i = 1; i <= lineCountNotifications; i++) {
					notificationList.setLineItemValue('custpage_cancel_notifications', i, '');
				}
				
			}
			
			updateQuoteStatus(quoteId, quoteStatusId, quoteNum);
			
			form.addSubmitButton('Submit');
			
			response.writePage(form);
		}
	
	
	if (request.getMethod() == 'POST') {
	
		var lineCount = request.getLineItemCount('custpage_approval_results');
		var sId = request.getParameter('custpage_sid');
		var quoteId = getQuoteId(sId);
		var userId = request.getParameter('custpage_userid');
		var quoteStatusId = request.getParameter('custpage_quotestatusid');
		var currentQuoteStatusId = nlapiLookupField('estimate', quoteId, 'custbodyr7quoteorderapprovalstatus');
		nlapiLogExecution('DEBUG', 'quotestatusid', quoteStatusId);
		
		for (var i = 1; i <= lineCount; i++) {
		
			var approveBox = request.getLineItemValue('custpage_approval_results', 'custpage_approve', i);
			nlapiLogExecution('DEBUG', 'approveBox', approveBox);
			var rejectBox = request.getLineItemValue('custpage_approval_results', 'custpage_reject', i);
			nlapiLogExecution('DEBUG', 'rejectBox', rejectBox);
			
			if (approveBox == 'T' || rejectBox == 'T') {
			
				var recId = request.getLineItemValue('custpage_approval_results', 'custpage_recid', i);
				nlapiLogExecution('DEBUG', 'recId', recId);
				var comments = request.getLineItemValue('custpage_approval_results', 'custpage_comments', i);
				nlapiLogExecution('DEBUG', 'comments', comments);
				
				var now = nlapiDateToString(new Date(), 'datetimetz')
				
				if (approveBox == 'T') {
					var status = 3;
				}
				else {
					var status = 4;
				}
				
				nlapiLogExecution('DEBUG', 'status', status);
				
				var fields = new Array();
				fields[0] = 'custrecordr7approvalstatus';
				fields[1] = 'custrecordr7approvalcomments';
				fields[2] = 'custrecordr7approvaldateresponded';
				
				var values = new Array();
				values[0] = status;
				values[1] = comments;
				values[2] = '';
				
				nlapiSubmitField('customrecordr7approvalrecord', recId, fields, values);
				
				
			}
		}
		
		updateQuoteStatus(quoteId, quoteStatusId, quoteNum);
		
		var arrParams = new Array();
		arrParams['custparamsid'] = sId;
		arrParams['custparamuser'] = userId;
				
		try {
			nlapiSetRedirectURL('EXTERNAL', suiteletURL, null, null, arrParams);
		} 
		catch (e) {
			nlapiSetRedirectURL('SUITELET', 'customscriptr7approvalssuitelet', 'customdeployr7_approvalssuitelet_quote', null, arrParams);
		}
		
	}
	
}

function myCustomSort(a, b){
	var resultA = a.getText(arrSearchColumns[5]) + a.getText(arrSearchColumns[4]) + a.getValue(arrSearchColumns[2]);
	var resultB = b.getText(arrSearchColumns[5]) + b.getText(arrSearchColumns[4]) + b.getValue(arrSearchColumns[2]);
	
	if (resultA < resultB) //sort string ascending
		return -1
	if (resultA > resultB) 
		return 1
	return 0 //default return value (no sorting)
}

function cancelApproval(recId, quoteId){
	
	var currentQuoteStatusId = nlapiLookupField('estimate', quoteId, 'custbodyr7quoteorderapprovalstatus');
	
	if (currentQuoteStatusId != '4' && currentQuoteStatusId != '2'){
		nlapiSubmitField('estimate', quoteId, 'custbodyr7quoteorderapprovalstatus', '2');
	}

	var fields = new Array();
	fields[0] = 'custrecordr7approvalstatus';
	fields[1] = 'custrecordr7approvaldateresponded';
	
	var values = new Array();
	values[0] = '2';
	values[1] = '';
	
	nlapiSubmitField('customrecordr7approvalrecord', recId, fields, values);
	
}

function formatStatus(statusId, text){

	if (statusId == '3') {  //approved
		return '<b><font color=#007A00">' + text + '</font></b>';
	}
	else 
		if (statusId == '4') { //rejected
			return '<b><font color="#FF0000">' + text + '</font></b>';
		}
		else {
			return text;
		}
}

function updateQuoteStatus(quoteId, quoteStatusId, quoteNumber){

	var quoteFields = nlapiLookupField('transaction', quoteId, new Array('custbodyr7quoteapprovalrequester', 'salesrep', 'custbodyr7quoteorderapprovalstatus', 'custbodyr7_approved_quote_pdf'));
	var currentQuoteStatusId = quoteFields['custbodyr7quoteorderapprovalstatus'];
	
	var records = new Array();
	var toURL = nlapiRequestURL(nlapiResolveURL('SUITELET','customscriptretrieveurl','customdeployretrieveurl',true)).getBody();
	records['transaction'] = quoteId;
				
	if (quoteStatusId != currentQuoteStatusId && quoteStatusId != '' && quoteStatusId != null) {
		nlapiSubmitField('estimate', quoteId, 'custbodyr7quoteorderapprovalstatus', quoteStatusId);
		
        var recordURL = '<a href="' + toURL.replace('extsystem', 'app') + '/app/accounting/transactions/estimate.nl?id=' + quoteId + '">' + quoteNumber + '</a>';
		var quoteFieldsText = nlapiLookupField('transaction', quoteId, new Array('entity', 'salesrep'), 'text');
		
		var customerName = quoteFieldsText['entity'];
		var requester = quoteFields['custbodyr7quoteapprovalrequester'];
		if (requester == null || requester == ''){
			requester = 55011;
		}
		
		var requesterEmail = nlapiLookupField('employee', requester, 'email');
		
		var salesRep = quoteFields['salesrep'];
		var salesRepText = quoteFieldsText['salesrep'];

		function setTimeout(aFunction, milliseconds){
			var date = new Date();
			date.setMilliseconds(date.getMilliseconds() + milliseconds);
			while(new Date() < date){
			}
			
			return aFunction();
		}
		
		if (quoteStatusId == '3') { //approved
			// var packageQuoteURL = nlapiResolveURL('SUITELET', 'customscript_r7_pck_transaction_suitelet', 'customdeploy_r7_pck_transaction_suitelet', 'external');
			// packageQuoteURL += '&id='+quoteId;
			// var response = nlapiRequestURL(packageQuoteURL);
			
			var fileQuotePDFId =  quoteFields['custbodyr7_approved_quote_pdf'];
			var fileQuotePDF = fileQuotePDFId ? nlapiLoadFile(fileQuotePDFId) : nlapiPrintRecord("transaction", quoteId, "PDF");
			
			var subject = 'Quote ' + quoteNumber + ' is approved';
			var body = '' +
			'CUSTOMER: ' +
			customerName +
			'\nQUOTE: ' +
			quoteNumber +
			'\nSALES REP: ' +
			salesRepText +
			'\n\nYour Quote has been approved and is attached.' + fileQuotePDF;
			
			// https://issues.corp.rapid7.com/browse/APPS-16546 delay email sending to give system some time to stamp APPROVED status on the quote, otherwise DRAFT background remains
			nlapiLogExecution('DEBUG', 'email sent here', 'yes')
			setTimeout(function(){ nlapiSendEmail(requester, salesRep, subject, body, requesterEmail, null, records, fileQuotePDF); }, 1000);
		}
		if (quoteStatusId == '4' && requester != null && requester != '') { //rejected
			var approvalrecordSearch = nlapiSearchRecord("customrecordr7approvalrecord",null,
				[
					["custrecordr7approvalquote","anyof",quoteId],
					"AND",
					["custrecordr7approvalstatus","anyof","4"]
				],
				[
					new nlobjSearchColumn("custrecordr7approvalrule"),
					new nlobjSearchColumn("custrecordr7approvaldescription"),
					new nlobjSearchColumn("custrecordr7approvalapprover"),
					new nlobjSearchColumn("custrecordr7approvalcomments")
				]
			);

			var subject = 'Quote ' + quoteNumber + ' has been rejected';
			var emailBody = buildHtmlBody(customerName, recordURL, salesRepText, approvalrecordSearch);
			nlapiSendEmail(requester, requester, subject, emailBody, null, null, records, null);
		}
	}
	
}

function getQuoteId(sId){

	var arrSearchResults = nlapiSearchRecord('estimate', null, new nlobjSearchFilter('custbodyr7sid', null, 'is', sId));
	if (arrSearchResults == null) {
		nlapiCreateError('INVALID ID', 'You have entered an invalid parameter value');
	}
	else 
		return arrSearchResults[0].getId();
}

function buildHtmlBody(customerName, recordURL, salesRepText, approvalrecordSearch) {
	var htmlText = "";
	htmlText += "<html lang='en'>"
	htmlText += "<head>"
	htmlText += "<title>Quote Rejection Email</title>"
	htmlText += "<style>"
	htmlText += ".rejection th {"
	htmlText += "min-width: 100px;"
	htmlText += "padding: 0 10px;"
	htmlText += "font-weight: bold;"
	htmlText += "border: solid black 1px;"
	htmlText += "}"
	htmlText += ".rejection td {"
	htmlText += "padding: 10px;"
	htmlText += "border: solid black 1px;"
	htmlText += "}"
	htmlText += "</style>"
	htmlText += "</head>"
	htmlText += "<body>"
	htmlText += "CUSTOMER:  " + customerName + " <br>"
	htmlText += "QUOTE: " + recordURL + " <br>"
	htmlText += "SALES REP: " + salesRepText + "<br><br>"
	htmlText += "Below are the Approver Rules that got rejected:"
	htmlText += "<div class='rejection'>"
	htmlText += "<table>"
	htmlText += "<thead>"
	htmlText += "<tr>"
	htmlText += "<th>Rule</th>"
	htmlText += "<th>Description</th>"
	htmlText += "<th>Approver</th>"
	htmlText += "<th>Comments</th>"
	htmlText += "</tr>"
	htmlText += "</thead>"
	htmlText += "<tbody>"

	if(approvalrecordSearch){
		for(var i=0;i<approvalrecordSearch.length;i++){

			var approverRule = approvalrecordSearch[i].getText('custrecordr7approvalrule');
			var approverDesc = approvalrecordSearch[i].getValue('custrecordr7approvaldescription');
			var approver = approvalrecordSearch[i].getText('custrecordr7approvalapprover');
			var comments = approvalrecordSearch[i].getValue('custrecordr7approvalcomments');

			htmlText += "<tr>";
			htmlText += "<td>"+approverRule+"</td>";
			htmlText += "<td>"+approverDesc+"</td>";
			htmlText += "<td>"+approver+"</td>";
			htmlText += "<td>"+comments+"</td>";
			htmlText += "</tr>";
		}
	}

	htmlText += "</tbody>"

	htmlText += "</table>"
	htmlText += "</div>"
	htmlText += "</body>"
	htmlText += "</html>"

	return htmlText;
}
