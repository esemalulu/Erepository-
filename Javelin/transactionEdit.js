function lookupTransaction(request, response) {
	if (request.getMethod() == 'GET' ) {

		if ((request.getParameter('custparam_transnumber')) != null && (request.getParameter('custparam_transtype')) != null ) {

			var requestString = 'https://system.netsuite.com/app/site/hosting/scriptlet.nl?script=89&deploy=1&custparam_transnumber=' + request.getParameter('custparam_transnumber')  + '&custparam_transtype=' + request.getParameter('custparam_transtype');
			nlapiLogExecution('DEBUG', 'request', requestString);

			var typeFilter = request.getParameter('custparam_transtype');
			
			switch(typeFilter) {
				case 'salesorder':
					typeFilter = 'SalesOrd';
					break;
				case 'estimate':
					typeFilter = 'Estimate';
					break;
				case 'opportunity':
					typeFilter = 'Opprtnty';
					break;
				case 'invoice':
					typeFilter = 'CustInvc';
					break;
			}

			var filters = new Array();
			var columns = new Array();


			filters[0] = new nlobjSearchFilter('tranid', null, 'is', request.getParameter('custparam_transnumber' ));
			filters[1] = new nlobjSearchFilter('type', null, 'is', typeFilter); //request.getParameter('custparam_transtype' ));
			filters[2] = new nlobjSearchFilter('mainline', null, 'is', 'T');
			columns[0] = new nlobjSearchColumn('internalid', null, null );
			//columns[1] = new nlobjSearchColumn('type', null, null );

			var results = nlapiSearchRecord('transaction', null, filters, columns);

			if (results != null ) {
				var resultString = '' ;

				for (var i = 0; i < results.length ; i++) {

					var result = results[i];
					var transInternalID = result.getValue('internalid');
					resultString = resultString + transInternalID;
					//var transType = result.getValue('type');

					if (i != parseInt (results.length - 1)) {
						resultString = resultString + '|' ;
					}
				}
				nlapiLogExecution('DEBUG', 'request results', resultString);
				//response.write(resultString);
				nlapiSetRedirectURL( 'RECORD', request.getParameter('custparam_transtype'), transInternalID, true );
			}
			else {
				nlapiLogExecution('DEBUG', 'resultString', 'Not Found');
				response.write('Sorry I could not find that transaction' );
			}
		}
	}
}

//https://system.netsuite.com/app/help/helpcenter.nl?topic=EDIT_TRAN_ESTIMATE

//https://system.netsuite.com/app/site/hosting/scriptlet.nl?script=89&deploy=1&custparam_transnumber=SA12231&custparam_transtype=salesorder

//https://forms.netsuite.com/app/site/hosting/scriptlet.nl?script=89&deploy=1&compid=265419&h=3c07fb4c9bb0fd892555&custparam_transnumber=SA12231&custparam_transtype=salesorder

/*
Transaction Type, Transaction Type ID
*************************************
Assembly Build, Build
Assembly Unbuild, Unbuild
Bill, VendBill
Bill CCard, VendCard
Bill Credit, VendCred
Bill Payment, VendPymt
Bin Putaway Worksheet, BinWksht
Bin Transfer, BinTrnfr
CCard Refund, CardRfnd
Cash Refund, CashRfnd
Cash Sale, CashSale
Check, Check
Commission, Commissn
Credit Card, CardChrg
Credit Memo, CustCred
Currency Revaluation, FxReval
Customer Deposit, CustDep
Customer Refund, CustRfnd
Deposit, Deposit
Deposit Application, DepAppl
Estimate, Estimate
Expense Report, ExpRept
Inventory Adjustment, InvAdjst
Inventory Distribution, InvDistr
Inventory Transfer, InvTrnfr
Inventory Worksheet, InvWksht
Invoice, CustInvc
Item Fulfillment, ItemShip
Item Receipt, ItemRcpt
Journal, Journal
Liability Adjustment, LiaAdjst
Opportunity, Opprtnty
Paycheck, Paycheck
Payment, CustPymt
Payroll Adjustment, YtdAdjst
Payroll Liability Check, LiabPymt
Purchase Order, PurchOrd
Return Authorization, RtnAuth
Sales Order, SalesOrd
Sales Tax Payment, TaxPymt
Statement Charge, CustChrg
Tax Liability Cheque, TaxLiab
Transfer, Transfer
Vendor Return Authorization, VendAuth
Work Order, WorkOrd
*/