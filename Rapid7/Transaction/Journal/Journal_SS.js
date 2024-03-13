/*
 * Module Description
 *
 * Version    Date            Author           Remarks
 * 1.00       31 Mar 2013     efagone
 *
 */

/*
 * The recordType (internal id) corresponds to the "Applied To" record in your script deployment.
 * @appliedtorecord recordType
 *
 * @param {String} type Operation types: create, edit, delete, xedit
 *                      approve, reject, cancel (SO, ER, Time Bill, PO & RMA only)
 *                      pack, ship (IF)
 *                      markcomplete (Call, Task)
 *                      reassign (Case)
 *                      editforecast (Opp, Estimate)
 * @returns {Void}
 */
function beforeSubmit(type){

	try {
		nlapiLogExecution('DEBUG', 'type - User: ' + nlapiGetUser(), type);
		this.type = type;
		this.oldRecord = nlapiGetOldRecord();
		this.updatedFields = nlapiGetNewRecord().getAllFields();

		if (type == 'create' || type == 'copy') {
			nlapiSetFieldValue('custbodyr7sid', getRandomString(15));
		}

		if (type == 'create' || type == 'edit') {
			payrollBatchCleanup();
		}
		if (type == 'edit' || type == 'create' || type == 'copy' || type == 'xedit') {
			nlapiLogExecution('DEBUG', 'Checking status', 'yes');
			//final step
			checkStatusOK();
		}
	}
	catch (err) {
        nlapiLogExecution('ERROR', 'Error on journal_ss beforeSubmit', err);
        var adminUser = nlapiLoadConfiguration('companypreferences').getFieldValue('custscriptr7_system_info_email_sender');
        nlapiSendEmail(adminUser, adminUser, 'Error on journal_ss beforeSubmit', 'Error: ' + err, 'derek_zanga@rapid7.com');
    }
}

function beforeLoad(type, form){

	if(type == 'copy'){
		nlapiSetFieldValue('custbodyr7quoteorderapprovalstatus', 1); //Not Yet Requested
		nlapiSetFieldValue('approved', 'F');
		nlapiSetFieldValue('status', 'Pending Approval');
	}

	if (type == 'view'&&nlapiGetFieldValue('custbodyr7quoteorderapprovalstatus')==='3'&&!nlapiGetFieldValue('custbodyr7_man_reversal_tran_id')&&!nlapiGetFieldValue('reversalentry')) {
		form.setScript('customscript_windowopen_cs');
		//add condition to show button
		var suiteletURL = nlapiResolveURL('SUITELET', 'customscriptr7_create_reversal_je', 'customdeployr7_create_reversal_je', false);
		nlapiLogExecution('DEBUG', 'suiteletURL',suiteletURL);
		suiteletURL += '&custpage_jeid=' + nlapiGetRecordId() + '&custpage_jetype=' + nlapiGetRecordType();
		nlapiLogExecution('DEBUG', 'suiteletURL',suiteletURL);
		form.addButton('custpage_create_reverse_je', 'Reverse JE', 'replaceWindow(\'' + suiteletURL + '\');');
	}

}

function checkStatusOK(){

	var dateCreated = getNewFieldValue('createddate');

	if (dateCreated != null && dateCreated != '') {
		dateCreated = nlapiStringToDate(dateCreated);
	}
	else {
		dateCreated = new Date();
	}

	var dateLegacy = nlapiStringToDate('5/2/2013');
	if (dateCreated >= dateLegacy) {
		nlapiLogExecution('DEBUG', 'logic time', 'yes');
		var voidTran = nlapiGetFieldValue('void');
		var isFromRevRec = nlapiGetFieldValue('isfromrevrec');
		var isFromAmortization = nlapiGetFieldValue('isfromamortization');
		var isFromExpenseAllocation = nlapiGetFieldValue('isfromexpensealloc');
		var parentExpenseAllocation = nlapiGetFieldValue('parentexpensealloc');

		if (voidTran == 'T' || isFromAmortization == 'T' || isFromRevRec == 'T' /*|| isFromExpenseAllocation == 'T' || (parentExpenseAllocation != null && parentExpenseAllocation != '')*/) {
			nlapiLogExecution('DEBUG', 'approving', 'auto');
			nlapiSetFieldValue('custbodyr7quoteorderapprovalstatus', 3);
			nlapiSetFieldValue('approved', 'T');

			return;
		}

		var currentCustomStatus = getNewFieldValue('custbodyr7quoteorderapprovalstatus');
		nlapiLogExecution('DEBUG', 'currentCustomStatus', currentCustomStatus);
		var setNativeStatus = null;
		switch (currentCustomStatus) {
			case '1': //not requested
				setNativeStatus = 'F'; //pending
				break;
			case '2': //pending approval
				setNativeStatus = 'F'; //pending
				break;
			case '3': //approved
				setNativeStatus = 'T'; //approved
				break;
			case '4': //rejected
				setNativeStatus = 'F'; //rejected
				break;

		}
		nlapiLogExecution('DEBUG', 'setNativeStatus', setNativeStatus);
		if (setNativeStatus != null) {
			nlapiSetFieldValue('approved', setNativeStatus);
		}
	}
}

function payrollBatchCleanup(){

	var hasCriteriaAccount = false;
	var missingAllDeptLocs = true;
	var lineCount = nlapiGetLineItemCount('line');
	if (lineCount != 4) {
		return;
	}
	for (var i = 1; lineCount > 0 && i <= lineCount; i++) {

		var account = nlapiGetLineItemValue('line', 'account', i);
		var department = nlapiGetLineItemValue('line', 'department', i);
		var location = nlapiGetLineItemValue('line', 'location', i);

		if (account == 326) {
			hasCriteriaAccount = true;
		}

		if ((department != null && department != '') || (location != null && location != '')) {
			missingAllDeptLocs = false;
		}
	}

	if (hasCriteriaAccount && missingAllDeptLocs) {
		var lineCount = nlapiGetLineItemCount('line');
		for (var i = 1; lineCount > 0 && i <= lineCount; i++) {

			var account = nlapiGetLineItemValue('line', 'account', i);
			var department = nlapiGetLineItemValue('line', 'department', i);
			var location = nlapiGetLineItemValue('line', 'location', i);

			if (account == 194) {
				nlapiSetLineItemValue('line', 'account', i, 196);
			}
			if (department == null || department == '') {
				nlapiSetLineItemValue('line', 'department', i, 50);
			}
			if (location == null || location == '') {
				nlapiSetLineItemValue('line', 'location', i, 1);
			}
		}
		nlapiSetFieldValue('custbodyr7quoteorderapprovalstatus', 3);
		nlapiSetFieldValue('approved', 'T');
	}
}

function getNewFieldValue(fieldId){
	// if the record is direct list edited or mass updated, run the script
	if (type == 'xedit') {
		// loop through the returned fields
		for (var i = 0; i < updatedFields.length; i++) {
			//nlapiLogExecution('DEBUG', 'field', updatedFields[i]);
			if (updatedFields[i] == fieldId) {
				return nlapiGetFieldValue(fieldId);
			}
		}
		return oldRecord.getFieldValue(fieldId);
	}
	else {
		return nlapiGetFieldValue(fieldId);
	}
}
