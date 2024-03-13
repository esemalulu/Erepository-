/*
 * @author efagone
 */

var objItemProps = new Object();

function ratable_dates_only_suitelet_dateONLY(request, response){

	if (request.getMethod() == 'GET') {
		var tranId = request.getParameter('custparam_transaction');
		var tranType = request.getParameter('custparam_trantype');
		nlapiLogExecution('DEBUG', 'tranId', tranId);
		nlapiLogExecution('DEBUG', 'tranType', tranType);
		
		if (tranId != null && tranId != '' && tranType != null && tranType != '') {
		
			var success = makeChanges_dateONLY(tranType, tranId);

			if (success == true) {
				nlapiSetRedirectURL('RECORD', tranType, tranId);
				return;
			}
			else {
				response.writeLine(success);
				return;
			}
			
		}
	}
	
	response.writeLine('Something went wrong. Please contact your Administrator.');
	return;
}

function makeChanges_dateONLY(tranType, tranId){

	try {
	
		var recTran = nlapiLoadRecord(tranType, tranId);
		
		//run e81
		recTran = setLocations(recTran);
		recTran = processE81_dateONLY(recTran);
		nlapiSubmitRecord(recTran, false, true);
		
		return true;
	} 
	catch (e) {
		var msg = '';
		
		if (e instanceof nlobjError) {
			msg = 'Code: ' + e.getCode() + ' \nDetails: ' + e.getDetails() + '\nStackTrace: \n';
			var st = e.getStackTrace();
			// nlobjError.getStackTrace() is documented as returning an array, but actually (sometimes?) returns a single string...
			if ((typeof st !== 'undefined') && (st !== null)) {
				if (typeof st === 'string') {
					msg += '\n' + st;
				}
				else { // in case we ever do get an array...
					for (var n = 0; n < st.length; n++) {
						if (st[n] !== 'undefined') {
							msg += '\n' + st[n];
						}
					}
				}
			}
		}
		else {
			msg = e.toString();
		}
		var adminUser =  nlapiLoadConfiguration('companypreferences').getFieldValue('custscriptr7_system_info_email_sender');
		nlapiSendEmail(adminUser, adminUser, 'Error on setting custom ESP', 'Transaction ID: ' + tranId + '\n\nError: ' + msg);
		nlapiLogExecution('ERROR', 'Error on setting custom ESP', 'Transaction ID: ' + tranId + '\n\nError: ' + msg);
		return msg;
	}
	
}

function getRecTypeId(recType){

	switch (recType) {
		case 'CustInvc':
			recType = 'invoice';
			break;
		case 'Invoice':
			recType = 'invoice';
			break;
		case 'CashSale':
			recType = 'cashsale';
			break;
		case 'Cash Sale':
			recType = 'cashsale';
			break;
		case 'SalesOrd':
			recType = 'salesorder';
			break;
		case 'Sales Order':
			recType = 'salesorder';
			break;
		case 'CustCred':
			recType = 'creditmemo';
			break;
		case 'Credit Memo':
			recType = 'creditmemo';
			break;
		case 'CashRfnd':
			recType = 'cashrefund';
			break;
		case 'Cash Refund':
			recType = 'cashrefund';
			break;
	}
	
	return recType;
}
