/*
 * @author efagone
 */

function beforeSubmit(type){

	if (type == 'create'){
		
		var sId = getRandomString(15); 
		nlapiSetFieldValue('custrecordr7approvalsid', sId);
	}
	
}

function afterSubmit(type){

	var context = nlapiGetContext();
	nlapiLogExecution('DEBUG', 'executioncontext', context.getExecutionContext());
	var nowDateTime = nlapiDateToString(new Date(), 'datetimetz');
	var recApproval = nlapiGetNewRecord();
	var approvalId = recApproval.getId();
	var newStatus = recApproval.getFieldValue('custrecordr7approvalstatus');
	var currentRespondedDate = recApproval.getFieldValue('custrecordr7approvaldateresponded');
	
	if (type == 'create') {
	
		if (newStatus == 3 && currentRespondedDate == '') {
			nlapiSubmitField('customrecordr7approvalrecord', approvalId, 'custrecordr7approvaldateresponded', nowDateTime);
		}
		
	}
	
	if (type != 'create' && type != 'delete') {
	
		var oldStatus = nlapiGetOldRecord().getFieldValue('custrecordr7approvalstatus');
		
		if (newStatus == 3 && oldStatus != 3) {
			nlapiSubmitField('customrecordr7approvalrecord', approvalId, 'custrecordr7approvaldateresponded', nowDateTime);
		}
		else 
			if (newStatus == 4 && oldStatus != 4) {
				nlapiSubmitField('customrecordr7approvalrecord', approvalId, 'custrecordr7approvaldateresponded', nowDateTime);
			}
			else 
				if (newStatus != 3) {
					nlapiSubmitField('customrecordr7approvalrecord', approvalId, 'custrecordr7approvaldateresponded', '');
				}
		
	}
	
}

function getRandomString(string_length){
    var chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXTZabcdefghiklmnopqrstuvwxyz';
    var randomstring = '';
    for (var i = 0; i < string_length; i++) {
        var rnum = Math.floor(Math.random() * chars.length);
        randomstring += chars.substring(rnum, rnum + 1);
    }
    return randomstring;
}
