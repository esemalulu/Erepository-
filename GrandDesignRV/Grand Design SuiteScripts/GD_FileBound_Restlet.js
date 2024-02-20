/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       18 Jan 2016     ibrahima
 *
 */

var TRANSACTION_TYPE_BILL = 'vendorbill';
var TRANSACTION_TYPE_BILLCREDIT = 'vendorcredit';
var TRANSACTION_TYPE_ITEMRECEIPT = 'itemreceipt';
var TRANSACTION_TYPE_BILLPAYMENT = 'vendorpayment';
//var TRANSACTION_TYPE_CREDITMEMO = 'creditmemo';

/**
 * Gets File Bound Transaction JSON given the transaction type and number.
 * @param {Object} dataIn Parameter object
 * @returns {Array} Output object
 */
function GD_GetFileBoundTransaction_Rest(dataIn) 
{
	var transactionArray = new Array();

	if(dataIn.tranType != undefined && dataIn.tranType != null && dataIn.tranType != '' &&
	   dataIn.tranNumber != undefined && dataIn.tranNumber != null && dataIn.tranNumber != '')
	{
							
		var filters = new Array();
		filters[filters.length] = new nlobjSearchFilter('mainline', null, 'is', 'T');
		filters[filters.length] = new nlobjSearchFilter('recordtype', null, 'is', dataIn.tranType);
		filters[filters.length] = new nlobjSearchFilter('tranid', null, 'is', dataIn.tranNumber);
		
		var cols = new Array();
		cols[cols.length] = new nlobjSearchColumn('type', null, null);
		cols[cols.length] = new nlobjSearchColumn('entity', null, null);
		cols[cols.length] = new nlobjSearchColumn('entityid', 'vendor', null);
		cols[cols.length] = new nlobjSearchColumn('companyname', 'customer', null);
		cols[cols.length] = new nlobjSearchColumn('custentityrvscreditdealer', 'customer', null);
		cols[cols.length] = new nlobjSearchColumn('tranid', null, null);
		cols[cols.length] = new nlobjSearchColumn('trandate', null, null);
		cols[cols.length] = new nlobjSearchColumn('duedate', null, null);
		cols[cols.length] = new nlobjSearchColumn('terms', null, null);
		cols[cols.length] = new nlobjSearchColumn('custbodyrvsunit', null, null);
		cols[cols.length] = new nlobjSearchColumn('memo', null, null);
		cols[cols.length] = new nlobjSearchColumn('otherrefnum', null, null);
		cols[cols.length] = new nlobjSearchColumn('amount', null, null);
		cols[cols.length] = new nlobjSearchColumn('account', null, null);
		cols[cols.length] = new nlobjSearchColumn('createdfrom', null, null);
		cols[cols.length] = new nlobjSearchColumn('custbodycreatedfromvcbnumber', null, null);
		cols[cols.length] = new nlobjSearchColumn('custbodyrvscreditmemotype', null, null);
		
		var tranResults = nlapiSearchRecord('transaction', null, filters, cols);	
		nlapiLogExecution('debug', 'GD_GetFileBoundTransaction_Rest', 'dataIn.tranType = ' + dataIn.tranType + '; dataIn.tranNumber = ' + dataIn.tranNumber);
		
		if(tranResults == null || tranResults.length == 0)
			nlapiLogExecution('debug', 'GD_GetFileBoundTransaction_Rest', 'No Record Found');
		
		FillTransactionArray(dataIn, tranResults, transactionArray);		
	}
	
	return transactionArray;
}

/**
 * Fills transaction JSON array based on the transaction search results.
 * @param tranResults
 * @param transactionArray
 */
function FillTransactionArray(dataIn, tranResults, transactionArray)
{
	if(tranResults != null && tranResults.length > 0)
	{
		var transaction = null;
		var isCreditDealer = 'F';
		for(var i = 0; i < tranResults.length; i++)
		{
			isCreditDealer = tranResults[i].getValue('custentityrvscreditdealer', 'customer');
			transaction = GetEmptyTransactionJSON();
			
			//transaction.errorMessage = ''; //no error
			transaction.internalId = tranResults[i].getId();
			transaction.type = tranResults[i].getRecordType();
			transaction.vendorId = tranResults[i].getValue('internalid', 'vendor');
			transaction.vendorName = ConvertNSFieldToString(tranResults[i].getValue('entityid', 'vendor'));
			transaction.dealerId = tranResults[i].getValue('internalid', 'customer');
			transaction.dealerName = ConvertNSFieldToString(tranResults[i].getValue('companyname', 'customer'));
			if(isCreditDealer == 'T') //credit dealer, grab parent dealer name, exclude ":Credit" suffix.
				transaction.dealerName = GetCreditDealerParentNameWithoutNumber(ConvertNSFieldToString(tranResults[i].getText('entity')));
				
			transaction.tranNumber = ConvertNSFieldToString(tranResults[i].getValue('tranid'));
			transaction.tranDate = ConvertNSFieldToString(tranResults[i].getValue('trandate'));
			transaction.dueDate = ConvertNSFieldToString(tranResults[i].getValue('duedate'));
			transaction.termsId = tranResults[i].getValue('terms');
			transaction.termsName = ConvertNSFieldToString(tranResults[i].getText('terms'));
			transaction.unitId = tranResults[i].getValue('custbodyrvsunit');
			transaction.vin = ConvertNSFieldToString(tranResults[i].getText('custbodyrvsunit'));
			transaction.memo = tranResults[i].getValue('memo');
			transaction.refNumber = ConvertNSFieldToString(tranResults[i].getValue('otherrefnum'));
			transaction.createdFromId = tranResults[i].getValue('createdfrom');
			transaction.createdFromName = ConvertNSFieldToString(tranResults[i].getText('createdfrom'));
			transaction.createdFromVCBId = tranResults[i].getValue('custbodycreatedfromvcbnumber');
			transaction.createdFromVCBName = ConvertNSFieldToString(tranResults[i].getText('custbodycreatedfromvcbnumber'));
			transaction.creditMemoType = trim(tranResults[i].getText('custbodyrvscreditmemotype'));
			transaction.accounts = trim(tranResults[i].getText('account'));
			transaction.amount = ConvertNSFieldToFloat(tranResults[i].getValue('amount'));
			if(transaction.amount < 0)
				transaction.amount = (-1 * transaction.amount); //make the amount to be positive number
			
			if(dataIn.tranType == TRANSACTION_TYPE_BILL)
			{
				SetVendorBillFieldValues(transaction, tranResults[i].getId());
			}
			else if(dataIn.tranType == TRANSACTION_TYPE_BILLCREDIT)
			{
				SetBillCreditFieldValues(transaction, tranResults[i].getId());
			}
			else if(dataIn.tranType == TRANSACTION_TYPE_ITEMRECEIPT)
			{
				if(transaction.createdFromId != null && transaction.createdFromId != '' && 
				   transaction.createdFromName.toLowerCase().indexOf('purchase') != -1 && transaction.createdFromName.toLowerCase().indexOf('#') != -1)
				{
					transaction.poNumbers = transaction.createdFromName.substring(transaction.createdFromName.toLowerCase().indexOf('#') + 1);
				}
			}
			else if(dataIn.tranType == TRANSACTION_TYPE_BILLPAYMENT)
			{
				SetBillPaymentFieldValues(transaction, tranResults[i].getId());
			}
			
			transactionArray.push(transaction);
		}
	}
}

/**
 * Sets Bill Credit specific fields.
 * @param transaction
 * @param billCreditId
 */
function SetBillCreditFieldValues(transaction, billCreditId)
{
	if(transaction.createdFromVCBName != '')
		transaction.createdFromVCBName = 'Chargeback #' + transaction.createdFromVCBName;
	
	var bill = nlapiLoadRecord(TRANSACTION_TYPE_BILLCREDIT, billCreditId);
	var uniqueItemHash = new HashTable(); //used to store unique account numbers under expense tab.
	//set accounts as comma and space separated.
	for(var k = 1; k <= bill.getLineItemCount('expense'); k++)
	{
		var accountName = ConvertNSFieldToString(bill.getLineItemText('expense', 'account', k));
		if(accountName != '')
		{
			if(uniqueItemHash.getItem(accountName) == null)
			{
				if(transaction.accounts == '')
					transaction.accounts = accountName;
				else
					transaction.accounts += ', ' + accountName;
				
				uniqueItemHash.setItem(accountName, accountName);
			}
		}					
	}
}

/**
 * Sets Vendor Bill speciifrc field values.
 * @param transaction
 * @param billId
 */
function SetVendorBillFieldValues(transaction, billId)
{
	var bill = nlapiLoadRecord(TRANSACTION_TYPE_BILL, billId);
	var uniqueItemHash = new HashTable(); //used to store unique receipts, account numbers and po numbers.
	
	transaction.amount = ConvertNSFieldToFloat(bill.getFieldValue('usertotal'));
	if(transaction.amount < 0)
		transaction.amount  = (-1 * transaction.amount);
	
	//set receipts as comma and space separated.
	for(var i = 1; i <= bill.getLineItemCount('item'); i++)
	{
		var bill_line_receipts = bill.getLineItemTexts('item', 'billreceipts', i);	
		if(bill_line_receipts != null && bill_line_receipts.length > 0)
		{
			for(var j = 0; j < bill_line_receipts.length; j++)
			{
				if(uniqueItemHash.getItem(bill_line_receipts[j]) == null)
				{
					if(transaction.receipts == '')
						transaction.receipts = bill_line_receipts[j];
					else
						transaction.receipts += ', ' + bill_line_receipts[j];
					
					uniqueItemHash.setItem(bill_line_receipts[j], bill_line_receipts[j]);
				}
			}
		}
	}
	
	//set accounts as comma and space separated.
	uniqueItemHash = new HashTable();
	for(var k = 1; k <= bill.getLineItemCount('expense'); k++)
	{
		var accountName = ConvertNSFieldToString(bill.getLineItemText('expense', 'account', k));
		if(accountName != '')
		{
			if(uniqueItemHash.getItem(accountName) == null)
			{
				if(transaction.accounts == '')
					transaction.accounts = accountName;
				else
					transaction.accounts += ', ' + accountName;
				
				uniqueItemHash.setItem(accountName, accountName);
			}
		}					
	}
	
	//set poNumbers as comma and space separated.
	uniqueItemHash = new HashTable();
	for(var l = 1; l <= bill.getLineItemCount('purchaseorders'); l++)
	{
		var poNumber = ConvertNSFieldToString(bill.getLineItemValue('purchaseorders', 'poid', l));
		if(poNumber != '')
		{
			if(uniqueItemHash.getItem(poNumber) == null)
			{
				if(transaction.poNumbers == '')
					transaction.poNumbers = poNumber;
				else
					transaction.poNumbers += ', ' + poNumber;	
				
				uniqueItemHash.setItem(poNumber, poNumber);
			}
		}					
	}
}

/**
 * Sets bill payment specific field values.
 * @param transaction
 * @param billPaymentId
 */
function SetBillPaymentFieldValues(transaction, billPaymentId)
{
	var billPayment = nlapiLoadRecord(TRANSACTION_TYPE_BILLPAYMENT, billPaymentId);
	
	//Hash tables used to store unique transaction # of Bills and Bill Credits applied to Bill Payment.
	var appliedToHash = new HashTable(); 
	var appliedBillArray = new Array();
	
	//nlapiLogExecution('debug', 'BillPayment', 'Bill Payment ID ' + billPayment.getId() +  ' has lines: ' + billPayment.getLineItemCount('apply'));
	//set Applied To REF NO. in poNumbers property
	var refNum = null;
	var isApplyTo = null;
	
	for(var k = 1; k <= billPayment.getLineItemCount('apply'); k++)
	{
		refNum = ConvertNSFieldToString(billPayment.getLineItemValue('apply', 'refnum', k));
		isApplyTo = billPayment.getLineItemValue('apply', 'apply', k);
		if(refNum != null && refNum != '' && isApplyTo != null)
		{
			if(isApplyTo == 'T') //"Applied To" sublist: set poNumbers property in transaction JSON.
			{
				if(appliedToHash.getItem(refNum) == null) //refNum has not been added
				{
					if(transaction.poNumbers == '')
						transaction.poNumbers = refNum;
					else
						transaction.poNumbers += ', ' + refNum;
					
					appliedBillArray.push(billPayment.getLineItemValue('apply', 'internalid', k));
					
					appliedToHash.setItem(refNum, refNum);
				}		
			}
		}					
	}
	
	//Now retrieve bill credits that are associated with the applied bills in this Bill Payment.
	if(appliedBillArray.length > 0)
	{
		var cols = new Array();
		cols.push(new nlobjSearchColumn('tranid', null, null));
		
		var filters = Array();
		filters.push(new nlobjSearchFilter('appliedtotransaction', null, 'anyof', appliedBillArray));
		
		var billCreditResults = nlapiSearchRecord(TRANSACTION_TYPE_BILLCREDIT, null, filters, cols);
		
		if(billCreditResults != null && billCreditResults.length > 0)
		{
			appliedToHash = new HashTable();
			var billCreditNum = null;
			
			for(var i = 0; i < billCreditResults.length; i++)
			{
				billCreditNum = ConvertNSFieldToString(billCreditResults[i].getValue('tranid'));
				
				if(billCreditNum != '' && appliedToHash.getItem(billCreditNum) == null)
				{
					if(transaction.receipts == '')
						transaction.receipts = billCreditNum;
					else
						transaction.receipts += ', ' + billCreditNum;
					
					appliedToHash.setItem(billCreditNum, billCreditNum);
				}
			}
		}
	}
}

/**
 * Gets credit dealer name without the "Credit" suffix and without the dealer number.
 * @param dealerFullName
 * @returns
 */
function GetCreditDealerParentNameWithoutNumber(dealerFullName)
{
	var dealerName = trim(dealerFullName.substring(0, dealerFullName.indexOf(':'))); //remove ": Credit" part.
	var namePartArray = dealerName.split(' ');
	
	if(namePartArray.length > 1 && !isNaN(namePartArray[0]))
	{
		dealerName = '';
		for(var i = 1; i < namePartArray.length; i++)
		{
			dealerName += namePartArray[i] + ' ';
		}
	}
	
	return trim(dealerName);
}

/**
 * Gets an empty transaction JSON object.
 * @returns {___anonymous5069_5079}
 */
function GetEmptyTransactionJSON()
{
	var transaction = new Object();
	
	//transaction.errorMessage = ''; 
	transaction.internalId = null;
	transaction.type = '';
	transaction.vendorId = null;
	transaction.vendorName = '';
	transaction.dealerId = null;
	transaction.dealerName = '';
	transaction.tranNumber = '';
	transaction.tranDate = '';
	transaction.dueDate = '';
	transaction.termsId = null;
	transaction.termsName = '';
	transaction.unitId = null;
	transaction.vin = '';
	transaction.memo = '';
	transaction.refNumber = '';
	transaction.amount = 0;
	transaction.createdFromId = null;
	transaction.createdFromName = '';
	transaction.createdFromVCBId = null;
	transaction.createdFromVCBName = '';
	transaction.creditMemoType = '';
	transaction.accounts = '';
	transaction.receipts = '';
	transaction.poNumbers = '';	
	return transaction;
}
