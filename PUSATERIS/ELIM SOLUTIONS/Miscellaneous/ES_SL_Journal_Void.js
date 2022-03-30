/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       31 Mar 2016     Fan
 *
 */

/**
 * @param {nlobjRequest} request Request object
 * @param {nlobjResponse} response Response object
 * @returns {Void} Any output is written via response object
 */
function suitelet(request, response){
	var id = request.getParameter('esId');
	if (id) {
		var results = nlapiSearchRecord('journalentry', null, 
				['custbody_es_void_transaction', 'is', id]);
		if (!results || !results[0]) {
			if (nlapiLookupField('journalentry', id, 'status') == 'approved') {
				var record = nlapiCopyRecord('journalentry', id, {recordmode: 'dynamic'});
				record.setFieldValue('custbody_es_void_transaction', id);
				record.setFieldValue('trandate', nlapiDateToString(new Date()));
				record.setFieldValue('approved','F');
				record.setFieldValue('custbody_es_approval_status', 1);
				var count = record.getLineItemCount('line');
				for (var l = 1; l <= count; l += 1) {
					record.selectLineItem('line', l);
					var credit = record.getCurrentLineItemValue('line', 'credit');
					var debit = record.getCurrentLineItemValue('line', 'debit');
					record.setCurrentLineItemValue('line', 'credit', debit);
					record.setCurrentLineItemValue('line', 'debit', credit);
					record.commitLineItem('line');
				}
				var voidRecordId = nlapiSubmitRecord(record);
				response.sendRedirect('RECORD', 'journalentry', voidRecordId, false);
				return;
			}
		}
		response.sendRedirect('RECORD', 'journalentry', id, false);
	}
}
