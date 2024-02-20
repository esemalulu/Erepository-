/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       28 Jan 2015     pbontrager
 *
 */

/**
 * @param {String} recType Record type internal id
 * @param {Number} recId Record internal id
 * @returns {Void}
 */
function SetLegalNameToEntityId(rec_type, rec_id) {

	var vendorRecord = nlapiLoadRecord(rec_type, rec_id);
	var legalName = vendorRecord.getFieldValue('entityid');
	vendorRecord.setFieldValue('legalname', legalName);
	nlapiSubmitRecord(vendorRecord);
}
