/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       30 Oct 2015     clayr
 *
 */

/**
 * @param {String} recType Record type internal id
 * @param {Number} recId Record internal id
 * @returns {Void}
 */
function massUpdateItemReceiptDelete(recType, recId) {
	
	try {
		if (recType == 'customrecord_item_receipt_deletion') {
			
			// Get current case record and the PO internal id.
			var recCustIRD = nlapiLoadRecord(recType, recId);
			
			var recReceiptId = recCustIRD.getFieldValue('custrecord_receipt_internal_id2');
			var recReceiptExtId = recCustIRD.getFieldValue('custrecord_receipt_external_id');
	
			nlapiLogExecution('DEBUG', 'Delete Duplicate Item Receipts', 'Receipt Internal Id: ' + recReceiptId + 'Receipt External Id:' + recReceiptExtId );
			
			nlapiDeleteRecord('itemReceipt',recReceiptId);
			
			nlapiSubmitField(recType,recId,'custrecord_item_receipt_processed2','T');  // Set the Processed Flag
						
		}
		
	} catch (err) {
		
		nlapiLogExecution('ERROR', 'Mass Remove Item Receipts', 'recType: ' + recType+ '; internalId: ' + recId + 
				'; errCode: ' + err.name + '; err: ' + err.message);
			
	}


}
