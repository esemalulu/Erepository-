/*
 * @author efagone
 */

function r7printcheck_suitelet(request, response){

	var userId = nlapiGetUser();
	var tranId = null;
	
	//try {
	return;
		tranId = request.getParameter('custparam_tran');
		var res = nlapiRequestURL('https://debugger.netsuite.com/app/accounting/print/hotprint.nl?regular=T&sethotprinter=T&template=&whence=&printtype=transaction&trantype=paycheck&label=Paycheck&id=339952');
		var body = res.getBody();
		
	//	var filePDF = nlapiPrintRecord('transaction', tranId, 'DEFAULT', {trantype: 'paycheck'});
		response.setContentType('PDF', 'paycheck.pdf', 'inline');
		//response.write(filePDF.getValue());
		response.write(body);
		return;
		
		
	//} 
	//catch (e) {
	//	nlapiSendEmail(55011, 55011, 'Error on printing check', 'tranId: ' + tranId + '\n\nError: ' + e);
	//	nlapiLogExecution('ERROR', 'Error on printing check', 'tranId: ' + tranId + '\n\nError: ' + e);
	//	response.writeLine(e);
	//	return;
	//}
	
}

function formatAmount(amount){

	if (amount != null && amount != '') {
		return parseFloat(amount);	
	}
	
	return 0;
}

