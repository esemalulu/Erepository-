/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       15 Dec 2015     clayr
 *
 */

/**
 * @param {String} recType Record type internal id
 * @param {Number} recId Record internal id
 * @returns {Void}
 */
function massUpdateReceiptRate(recType, recId) {
	
	try {
		
		if (recType == 'customrecord_item_receipt_update') {
						
			// Load the record found by Mass Update
			var recCustReceipt = nlapiLoadRecord(recType, recId);
			
			//retrieve the data from the record 
			var billRate = recCustReceipt.getFieldValue('custrecord_rate');
			var lineId = recCustReceipt.getFieldValue('custrecord_receipt_line_id');
			var receiptId = recCustReceipt.getFieldValue('custrecord_receipt_internal_id');
			
			recReceipt = nlapiLoadRecord('itemreceipt',receiptId);		// Get the Item Receipt Record
			
			recReceipt.setFieldValue('exchangerate','1.0');				// Set the exchange rate
			recReceipt.selectLineItem('item',lineId);					// Select the Line Id
			recReceipt.setCurrentLineItemValue('item','rate',billRate);	// Set the Bill Rate
			recReceipt.commitLineItem('item');
			
			nlapiSubmitRecord(recReceipt);								// Save record to Database
			
			nlapiSubmitField(recType,recId,'custrecord_item_receipt_processed','T');  // Set the Processed Flag
			
			nlapiLogExecution('DEBUG', 'Update Item Receipt Rate', 'recType: ' + recType + '; recId: ' + recId +
					'; billRate: ' + billRate + '; receiptId: ' + receiptId + '; lineId: ' + lineId);
			
		}
		
	} catch (err) {
		
		var errMessage = 'ErrCode: ' + err.name + '; err: ' + err.message;
		
		nlapiSubmitField(recType,recId,'custrecord_msg',errMessage.substring(0,299));  // Store the error message
		
		nlapiLogExecution('ERROR', 'Update Item Reciept Rate','recType: ' + recType + '; recId: ' + recId +
				'; billRate: ' + billRate + '; receiptId: ' + receiptId + '; lineId: ' + lineId +
				'; ' + errMessage);
		
	}

}
