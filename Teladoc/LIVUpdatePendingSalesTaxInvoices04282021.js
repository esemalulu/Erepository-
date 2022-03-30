function afterSubmit(type)
{
	try{
		nlapiLogExecution('DEBUG','<After Submit Script> type:'+type,'*****START*****');
		
		var recId = nlapiGetRecordId();
		var recType = nlapiGetRecordType();
		nlapiLogExecution('DEBUG','<After Submit Script> type:'+type+', RecordType: '+recType+', Id:'+recId);

		var rec = nlapiLoadRecord(recType, recId);
		var invoiceInternalId = rec.getFieldValue('custrecord_invoice_no');
		nlapiLogExecution('DEBUG','<After Submit Script> type:'+type,'invoiceInternalId = '+invoiceInternalId);
			
		var filters = [];
		filters.push(new nlobjSearchFilter( 'internalid', null, 'anyof',invoiceInternalId));
		filters.push(new nlobjSearchFilter( 'mainline', null, 'is', 'T'));
		filters.push(new nlobjSearchFilter( 'type', null, 'anyof','CustInvc'));
		var columns = [];
		columns.push(new nlobjSearchColumn('entity'));
		columns.push(new nlobjSearchColumn('email'));
		columns.push(new nlobjSearchColumn('custbody_liv_cc_email'));
		
		var results = nlapiSearchRecord('invoice', null, filters, columns); 	
		nlapiLogExecution('DEBUG','<After Submit Script> type:'+type,'results.length = '+results.length);
		
		var customer = results[0].getValue('entity');
		var toEmail = results[0].getValue('email');
		var ccEmail = results[0].getValue('custbody_liv_cc_email');
		//var ccEmailArr =  ccEmail.split(',');
		nlapiLogExecution('DEBUG','<After Submit Script> type:'+type,'customer Id = '+customer);
			
		var pdfFile = nlapiPrintRecord('TRANSACTION', results[0].getId(), 'PDF');
		/*var file = nlapiPrintRecord('TRANSACTION', ifid, 'PDF', {
	        formnumber: 107
	    });*/
		pdfFile.setName('Sales_Tax_Invoice_'+invoiceInternalId+'_'+customer+'.pdf');
		//pdfFile.setFolder(342115);//SB1 -- Pending ST Invoices
		pdfFile.setFolder(371480);//Prod -- Pending ST Invoices
		var pdfFileID = nlapiSubmitFile(pdfFile);
		
		//Search for Detailed PDF File
		var detailPDFFile = nlapiLoadFile('Sales Tax Invoices/Pending ST Detailed Invoices/Sales_Tax_Invoice_Details_'+customer+'.pdf');
		var detailPDFFileId = detailPDFFile.getId()
		
		//Set Data on custom record
		rec.setFieldValue('custrecord_customer',customer);
		rec.setFieldValue('custrecord_cust_email',toEmail);
		rec.setFieldValue('custrecord_cc_email',ccEmail);
		rec.setFieldValue('custrecord_invoice_link',pdfFileID);
		rec.setFieldValue('custrecord_detailed_inv_link',detailPDFFileId);
		
		nlapiSubmitRecord(rec);
		
		nlapiLogExecution('DEBUG','<After Submit Script> type:'+type,'*****END*****');
	}
	catch(e){
		nlapiLogExecution('DEBUG','<After Submit Script> type:'+type,'Error = '+e);
	}
}
