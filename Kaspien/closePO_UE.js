/**
 * This is responsible to 'Close' the Purchase Order when the PO Status is "19 Closed"
 */
function setStatusToClose(type) {
	nlapiLogExecution('DEBUG', 'Triggered Close PO UE After Submit', 'After submit start');
	if(nlapiGetFieldValue("custbodyetailz_po_status") !== '19' ||
	nlapiGetFieldValue("status") !== "Pending Receipt" || 
	(nlapiGetFieldValue("custbodyetailz_po_amz_status") !== '9' && nlapiGetFieldValue("custbodyetailz_po_amz_status") !== '10'))
	return false;
	var rec = nlapiLoadRecord('purchaseorder',nlapiGetRecordId());
	var count = rec.getLineItemCount('item');
	for(i=1; i<=count; i++) {
		rec.setLineItemValue('item', 'isclosed', i, 'T');
	}
	nlapiSubmitRecord(rec, true);
	nlapiLogExecution('DEBUG', 'Triggered Close PO UE After Submit', 'After submit end');
}