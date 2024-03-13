/*
 * @author efagone
 */

function approveAllRecs(){

	var tranId = nlapiGetRecordId();
	var userId = nlapiGetUser();
	
	if (tranId != null && tranId != '') {
	
		var nowDateTime = nlapiDateToString(new Date(), 'datetimetz');
		
		var arrSearchFilters = new Array();
		arrSearchFilters[0] = new nlobjSearchFilter('custrecordr7approvalquote', null, 'is', tranId);
		arrSearchFilters[1] = new nlobjSearchFilter('custrecordr7approvalstatus', null, 'anyof', new Array(1, 2, 4));
		
		var arrSearchColumns = new Array();
		arrSearchColumns[0] = new nlobjSearchColumn('custrecordr7approvalapprover');
		arrSearchColumns[1] = new nlobjSearchColumn('custrecordr7approvalcomments');
		
		var arrSearchResults = nlapiSearchRecord('customrecordr7approvalrecord', null, arrSearchFilters, arrSearchColumns);
		
		for (var i = 0; arrSearchResults != null && i < arrSearchResults.length; i++) {
		
			var searchResult = arrSearchResults[i];
			var approvalId = searchResult.getId();
			var currentApprover = searchResult.getText(arrSearchColumns[0]);
			var comments = searchResult.getValue(arrSearchColumns[1]);
			
			if (comments != null && comments != '') {
				comments = ': ' + comments;
			}
			if (comments == null) {
				comments = '';
			}
			var newComments = 'Approval Override (' + currentApprover + ')' + comments;
			
			var fields = new Array();
			fields[0] = 'custrecordr7approvalcomments';
			fields[1] = 'custrecordr7approvalstatus';
			fields[2] = 'custrecordr7approvalapprover';
			fields[3] = 'custrecordr7approvaldateresponded';
			
			var values = new Array();
			values[0] = newComments;
			values[1] = 3;
			values[2] = userId;
			values[3] = nowDateTime;
			
			nlapiSubmitField('customrecordr7approvalrecord', approvalId, fields, values);
		}
		
		nlapiSubmitField(nlapiGetRecordType(), tranId, 'custbodyr7quoteorderapprovalstatus', 3);
		
	}
}