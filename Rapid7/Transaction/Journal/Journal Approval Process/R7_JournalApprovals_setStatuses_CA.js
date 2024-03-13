/*
 * @author efagone
 */

function setStatuses(){
	
	var context = nlapiGetContext();
	var tranId = nlapiGetRecordId();
	var userId = nlapiGetUser();

	var statusToSet = context.getSetting('SCRIPT', 'custscriptr7journapprovca_statusset');
	
	if (tranId != null && tranId != '' && statusToSet != null && statusToSet != '') {
	
		var nowDateTime = nlapiDateToString(new Date(), 'datetimetz');
		
		var arrSearchFilters = new Array();
		arrSearchFilters[0] = new nlobjSearchFilter('custrecordr7approvalquote', null, 'is', tranId);
		arrSearchFilters[1] = new nlobjSearchFilter('custrecordr7approvalstatus', null, 'anyof', new Array(1, 2, 3, 4, 7));
		
		var arrSearchColumns = new Array();
		arrSearchColumns[0] = new nlobjSearchColumn('custrecordr7approvalapprover');
		arrSearchColumns[1] = new nlobjSearchColumn('custrecordr7approvalcomments');
		arrSearchColumns[2] = new nlobjSearchColumn('custrecordr7approvalstatus');
		
		var arrSearchResults = nlapiSearchRecord('customrecordr7approvalrecord', null, arrSearchFilters, arrSearchColumns);
		
		for (var i = 0; arrSearchResults != null && i < arrSearchResults.length; i++) {
		
			var searchResult = arrSearchResults[i];
			var approvalId = searchResult.getId();
			var currentApproverText = searchResult.getText(arrSearchColumns[0]);
			var currentApproverValue = searchResult.getValue(arrSearchColumns[0]);
			var currentStatusId = searchResult.getValue(arrSearchColumns[2]);
			
			if (currentApproverValue == userId) {
				var newComments = '';
				if (statusToSet == 3) {
					newComments = 'Approved by: ' + currentApproverText;
				}
				else 
					if (statusToSet == 4) {
						newComments = 'Rejected by: ' + currentApproverText;
					}
				
				var fields = new Array();
				fields[0] = 'custrecordr7approvalcomments';
				fields[1] = 'custrecordr7approvalstatus';
				fields[2] = 'custrecordr7approvaldateresponded';
				
				var values = new Array();
				values[0] = newComments;
				values[1] = statusToSet;
				values[2] = nowDateTime;
				nlapiSubmitField('customrecordr7approvalrecord', approvalId, fields, values);
			}
			else 
				if (statusToSet == 4 && currentStatusId == 3) { //rejected
					var newComments = '';
					
					var fields = new Array();
					fields[0] = 'custrecordr7approvalcomments';
					fields[1] = 'custrecordr7approvalstatus';
					fields[2] = 'custrecordr7approvaldateresponded';
					
					var values = new Array();
					values[0] = newComments;
					values[1] = 1; //not requested
					values[2] = '';
					
					nlapiSubmitField('customrecordr7approvalrecord', approvalId, fields, values);
				}
		}
				
		checkTransactionStatus(tranId);
	}
}

function getNewTranStatus(tranId){
	
	var arrSearchFilters = new Array();
	arrSearchFilters[0] = new nlobjSearchFilter('custrecordr7approvalquote', null, 'is', tranId);
	
	this.arrSearchColumns = new Array();
	arrSearchColumns[0] = new nlobjSearchColumn('custrecordr7approveopportunity');
	arrSearchColumns[1] = new nlobjSearchColumn('custrecordr7approvalquote');
	arrSearchColumns[2] = new nlobjSearchColumn('custrecordr7approvalrule');
	arrSearchColumns[3] = new nlobjSearchColumn('custrecordr7approvaldescription');
	arrSearchColumns[4] = new nlobjSearchColumn('custrecordr7approvalapprover');
	arrSearchColumns[5] = new nlobjSearchColumn('custrecordr7approvalstatus');
	arrSearchColumns[6] = new nlobjSearchColumn('custrecordr7approvalcomments');
	arrSearchColumns[5].setSort(true);
	
	var arrSearchResults = nlapiSearchRecord('customrecordr7approvalrecord', null, arrSearchFilters, arrSearchColumns);

	var hasPending = false;
	var hasNotRequested = false;
	
	for (var j = 0; arrSearchResults != null && j < arrSearchResults.length; j++) {
		var approvalRec = arrSearchResults[j];
		var currentApprovalStatus = arrSearchResults[j].getValue(arrSearchColumns[5]);
		
		if (currentApprovalStatus == 4) { //rejected
			return 4; //rejected
		}
		if (currentApprovalStatus == 2) { //pending
			hasPending = true;
		}
		if (currentApprovalStatus == 1) { //not requested
			hasNotRequested = true;
		}
		
	}
	
	if (hasNotRequested) {
		return 1; //not requested
	}
	
	if (hasPending) {
		return 2; //pending
	}
	
	return 3; //approved

}

function checkTransactionStatus(tranId){
	
	var newTranStatusId = getNewTranStatus(tranId);
	var tranFields = nlapiLookupField('transaction', tranId, new Array('custbodyr7quoteapprovalrequester', 'tranid', 'custbodyr7quoteorderapprovalstatus'));
	var currentTranStatusId = tranFields['custbodyr7quoteorderapprovalstatus'];
	
	var records = new Array();
	records['transaction'] = tranId;
				
	if (newTranStatusId != currentTranStatusId) {
		var recTranToSubmit = nlapiLoadRecord(nlapiGetRecordType(), tranId);
		recTranToSubmit.setFieldValue('custbodyr7quoteorderapprovalstatus', newTranStatusId);
		nlapiSubmitRecord(recTranToSubmit);
		
		var journalNumber = tranFields['tranid'];
		var toURL = nlapiRequestURL(nlapiResolveURL('SUITELET','customscriptretrieveurl','customdeployretrieveurl',true)).getBody();
		var recordURL = '<a href="'+toURL+ nlapiResolveURL('RECORD', nlapiGetRecordType(), tranId) + '">' + journalNumber + '</a>';
		
		var requester = tranFields['custbodyr7quoteapprovalrequester'];
		if (requester == null || requester == '') {
			requester = 55011;
		}
		
		var requesterEmail = nlapiLookupField('employee', requester, 'email');
		
		if (newTranStatusId == '3') { //approved
			// https://issues.corp.rapid7.com/browse/APPS-9461 added notification of approve for requestor
			var subject = 'Journal ' + journalNumber + ' has been approved';
			var body = '' +
			'Journal Number ' + recordURL + 'is approved';
			
			
			nlapiSendEmail(requester, requester, subject, body, null, null, records, null);
		}
		if (newTranStatusId == '4') { //rejected
			var subject = 'Journal ' + journalNumber + ' has been rejected';
			var body = '' +
			'Journal Number ' + recordURL + 'is rejected';
			
			nlapiSendEmail(requester, requester, subject, body, null, null, records, null);
		}
	}
	
}