/*
 ***********************************************************************
 *
 * Date: 	November 29th 2010
 *
 ***********************************************************************/

/**
 * Update cases from a custom record which is deleted after update
 * @param {string} type type of action (create, edit, ...)
 */
function afterSubmit(type) {
	if (type != "delete") {
		var crRecord = nlapiLoadRecord('customrecord73', nlapiGetRecordId());
		nlapiLogExecution('audit', 'updating case #' + crRecord.getFieldValue('custrecord_case'));
		var caseRecord = nlapiLoadRecord('supportcase', crRecord.getFieldValue('custrecord_case'));
		caseRecord.setFieldValue('custevent_caseproduct', crRecord.getFieldValue('custrecord_product_category'));
		caseRecord.setFieldValue('custevent_casecategory', crRecord.getFieldValue('custrecord_category'));
		nlapiSubmitRecord(caseRecord, true, true);
		
		nlapiDeleteRecord('customrecord73', nlapiGetRecordId());
	}
}
