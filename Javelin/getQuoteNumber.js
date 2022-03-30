function populateCustomRecord() {
	var currentForm = nlapiGetFieldValue('customform');
	if (currentForm == '156') {
		var referenceList = '';  //'Invoice Document References:\n';
		var quoteInvoicePair = {};
		var quoteInvoiceList = [];

		//var paymentReceiptRecord = nlapiLoadRecord('customerpayment', nlapiGetRecordId());
		//var relatedInvoicesQty = paymentReceiptRecord.getLineItemCount('apply');
		var relatedInvoicesQty = nlapiGetLineItemCount('apply');
		
		nlapiLogExecution('debug','rel inv qty', relatedInvoicesQty);
		
		for (var invoiceNum = 1; invoiceNum <= relatedInvoicesQty ; invoiceNum++) {
			//var invoiceInternalID = paymentReceiptRecord.getLineItemValue('apply', 'internalid', invoiceNum);
			var invoiceInternalID = nlapiGetLineItemValue('apply', 'internalid', invoiceNum);
		
			nlapiLogExecution('debug','invoice INT ID', invoiceInternalID);
			
			var invoiceNumber = nlapiLookupField('invoice', invoiceInternalID, 'tranid');
			var salesOrderInternalID = nlapiLookupField('invoice', invoiceInternalID, 'createdfrom');
			
			nlapiLogExecution('debug','SO ID from Inv ID', salesOrderInternalID);
			
			var salesOrderNumber = nlapiLookupField('salesorder', salesOrderInternalID, 'tranid');
			
			try {
				var quoteInternalID = nlapiLookupField('salesorder', salesOrderInternalID, 'createdfrom');
				var quoteNumber = nlapiLookupField('estimate', quoteInternalID, 'tranid');	
			}
			catch (err2) {
				log('Error', err2.toString() + ', : There was no quote for this order');
				return true;
			}
			
			quoteInvoicePair.invoice = invoiceNumber;
			quoteInvoicePair.quote = quoteNumber;
			quoteInvoiceList[invoiceNum - 1] = quoteInvoicePair;
			referenceList = referenceList + quoteNumber + ', ';
			log('Invoice - Quote List', 'Invoice: ' + quoteInvoicePair.invoice + ', Quote: ' + quoteInvoicePair.quote);
		}

		referenceList = referenceList.replace(/, $/g, '');
		//paymentReceiptRecord.setFieldValue( 'custbody_quotenumberforinvoice', referenceList);
		nlapiSetFieldValue('custbody_quotenumberforinvoice', referenceList);
		
		try {
			//var newID = nlapiSubmitRecord(paymentReceiptRecord, true, true);	// Ignore mandatory fields

			log('Invoice - Quote List', referenceList);

		}
		catch (err) {
			log('Error', err.toString());
			return true;
		}
	}
	else {
		log('populateCustomRecord', 'Was not the subscription renewal form');
		
	}
}

function log(title, details) {
	nlapiLogExecution('DEBUG', title, details);
}