// Client script to set the transaction message to the defaults
function pageInit(type) {
	// If the type of event is create or copy then set the default message
	if (type == 'create' || type == 'copy') {
		setDefaultMessage();
	}
}

function fieldChanged(type, name) {
	if (name == 'currency') {
		setDefaultMessage();
	}
}


function setDefaultMessage() {

	var recordType;
	var MESSAGE_QUOTATION = 6;  // Notes for Quotation message
	var MESSAGE_SALE_USD = 12;  // Javelin Invoice - USD message
	var MESSAGE_SALE_CAD = 7;  // Javelin Invoice - CAD message
	var CURRENCY_CAD = 1;  // value for the currency field if Canadian dollars
	var CURRENCY_USD = 3;  // value for the currency field if US dollars

	recordType = nlapiGetRecordType();
	
	
	
	// If the transaction is a quote
	if (recordType == 'estimate') {
		nlapiSetFieldValue('messagesel', MESSAGE_QUOTATION);
	}
	// If an invoice OR sales order
	else if (recordType == 'invoice' || recordType == 'salesorder') {
		// get the currency of the transaction
		var currency = nlapiGetFieldValue('currency');
		// If a USD transaction
		if (currency == CURRENCY_USD) {
			nlapiSetFieldValue('messagesel', MESSAGE_SALE_USD);
		}
		// If a CAD transaction
		else if (currency == CURRENCY_CAD) {
			nlapiSetFieldValue('messagesel', MESSAGE_SALE_CAD);
		}
	}
	// alert('Currency = ' + currency + ', recordType = ' + recordType );
} 