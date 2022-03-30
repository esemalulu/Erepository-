
//search through list of all retroactive quotes
var lastProcId = '';
var flt = null;
if (lastProcId) {
	flt = [];
	flt.push(new nlobjSearchFilter('internalidnumber', null, 'lessthan', lastProcId));
}
var rslt = nlapiSearchRecord(null,'customsearch3967', flt, null);

for (var j=0; rslt && j < rslt.length; j++) {
	var qrec = nlapiLoadRecord('estimate', rslt[j].getId());

	var itemSubTotal = 0.0;
	var itemTotalQty = 0;
	var itemTaxRate = 0.0;
	
	var lineCount = qrec.getLineItemCount('item');
	for (var qi=1; qi <= lineCount; qi++) {
		qrec.selectLineItem('item', qi);
		var taxrate = qrec.getCurrentLineItemValue('item','taxrate1');
		var taxrate2 = qrec.getCurrentLineItemValue('item','taxrate2');
		nlapiLogExecution('debug','rate 1 // rate 2',taxrate+' // '+taxrate2);
		
		if (itemTaxRate <= 0.0) {
			var taxrate = qrec.getCurrentLineItemValue('item','taxrate1');
			var taxrate2 = qrec.getCurrentLineItemValue('item','taxrate2');
			
			if (taxrate && taxrate.indexOf('%') > -1) {
				taxrate = parseFloat(taxrate.replace('%',''));
				if (parseFloat(taxrate) > 0.0) {
					itemTaxRate = taxrate;
				}
			}
			
			if (taxrate2 && taxrate2.indexOf('%') > -1) {
				taxrate2 = parseFloat(taxrate2.replace('%',''));
				if (parseFloat(taxrate2) > 0.0) {
					itemTaxRate = itemTaxRate + taxrate2;
				}
			}
		}
		
		itemSubTotal = itemSubTotal + parseFloat(qrec.getCurrentLineItemValue('item', 'amount'));
		itemTotalQty = itemTotalQty + parseInt(qrec.getCurrentLineItemValue('item', 'quantity'));
	}

	var savingsAmt = 500 * itemTotalQty;
	nlapiLogExecution('debug','Savings', savingsAmt);
	var amt12mSubtotal = itemSubTotal;
	var amt12mGstHst = itemSubTotal * (itemTaxRate/100);
	var amt12mTotal = amt12mSubtotal + amt12mGstHst;

	var amt36mSubtotal = itemSubTotal * 3;
	//1/11/2014 - Modify 12% discount calculation to 36mSubtotal * 0.88 instead of dividing by 1.12
	var amt36mSavingsSubtotal = amt36mSubtotal * 0.88;
	var amt36mSavings = amt36mSubtotal - amt36mSavingsSubtotal;
	var amt36mSavingsSubtotalGstHst = amt36mSavingsSubtotal * (itemTaxRate/100);
	var amt36mTotal = amt36mSavingsSubtotal + amt36mSavingsSubtotalGstHst;

	//3/4/2015 - Add in 60 months calculations
	var amt60mSubtotal = itemSubTotal * 5;
	var amt60mSavings = amt60mSubtotal * 0.2;
	var amt60mSavingsSubtotal = amt60mSubtotal - amt60mSavings;
	var amt60mSavingsSubtotalGstHst = amt60mSavingsSubtotal * (itemTaxRate/100);
	var amt60mTotal = amt60mSavingsSubtotal + amt60mSavingsSubtotalGstHst;

	qrec.setFieldValue('custbody_ax_print_60m_subtotal', amt60mSubtotal.toFixed(2));
	qrec.setFieldValue('custbody_ax_print_60m_subtotal_savings', amt60mSavingsSubtotal.toFixed(2));
	qrec.setFieldValue('custbody_ax_print_60m_savings', amt60mSavings.toFixed(2));
	qrec.setFieldValue('custbody_ax_print_60m_sts_gsthst', amt60mSavingsSubtotalGstHst.toFixed(2));
	qrec.setFieldValue('custbody_ax_print_60m_total', amt60mTotal.toFixed(2));

	alert('updating quote id '+rslt[j].getId());
	nlapiSubmitRecord(qrec, false, true);
	
	//break;
}


