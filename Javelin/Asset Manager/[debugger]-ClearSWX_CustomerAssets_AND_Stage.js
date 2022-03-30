
//Clear SWX Customer Assets record
var swxcars = nlapiSearchRecord('customrecord_ax_cswx_assets', null, null, [new nlobjSearchColumn('internalid')]);
if (swxcars && swxcars.length > 0) {
	alert('SWX Customer Assets: '+swxcars.length);
	for (var sx=0; sx < swxcars.length; sx++) {
		nlapiDeleteRecord('customrecord_ax_cswx_assets', swxcars[sx].getId());
	}
	
} else {
	alert('SWX Customer Assets: '+0);
}




//Clear SWX Asset Monthly Load Stage  
var swxstage = nlapiSearchRecord('customrecord_ax_swxa_stage', null, null, [new nlobjSearchColumn('internalid')]);
if (swxstage && swxstage.length > 0) {
	alert('SWX Asset Monthly Load Stage: '+swxstage.length);
	for (var ss=0; ss < swxstage.length; ss++) {
		nlapiDeleteRecord('customrecord_ax_swxa_stage', swxstage[ss].getId());
	}
	
} else {
	alert('SWX Asset Monthly Load Stage: '+0);
}


//Quote tax calculation fix
var rs = nlapiSearchRecord(null,'customsearch3329',null,null);
for (var i=0; i < rs.length; i++) {
	alert(rs[i].getValue('tranid')+' // '+rs[i].getId());
	
	var itemTaxRate = 0.0;
	var itemSubTotal = 0.0;
	var itemTotalQty = 0;
	
	//if (rs[i].getValue('taxtotal') != rs[i].getValue('custbody_ax_print_12m_gsthst')) {
		
		var qrec = nlapiLoadRecord('estimate', rs[i].getId());
		for (var l=1; l <=qrec.getLineItemCount('item'); l++) {
			qrec.selectLineItem('item', l);
			var taxrate = qrec.getCurrentLineItemValue('item','taxrate1');
			var taxrate2 = qrec.getCurrentLineItemValue('item','taxrate2');
			//alert('---------- Line '+l+' = Tax Rate 1: '+taxrate+' // Tax Rate 2: '+taxrate2);
			
			itemSubTotal = itemSubTotal + parseFloat(qrec.getCurrentLineItemValue('item', 'amount'));
			itemTotalQty = itemTotalQty + parseInt(qrec.getCurrentLineItemValue('item', 'quantity'));
			
			/**
			alert('---------- Line '+l+' = Amount: '+parseFloat(qrec.getCurrentLineItemValue('item', 'amount'))+
										  ' // Quantity: '+qrec.getCurrentLineItemValue('item', 'quantity')+
										  ' // Item SubTotal: '+itemSubTotal+
										  ' // Item Total Qty: '+itemTotalQty);
			*/
			
			//1/11/2014 - Based on client, all line items will have same tax rate. 
			//			  If itemTaxRate is 0.0, as items are added, calculate tax to use by adding rate 1 and rate 2
			var taxrate = qrec.getCurrentLineItemValue('item','taxrate1');
			var taxrate2 = qrec.getCurrentLineItemValue('item','taxrate2');
			
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
			//alert('rate 1 // rate 2',taxrate+' // '+taxrate2+' // TOTAL: '+itemTaxRate);
		}
		
		var amt12mSubtotal = itemSubTotal;
		var amt12mGstHst = itemSubTotal * (itemTaxRate/100);
		var amt12mTotal = amt12mSubtotal + amt12mGstHst;
		
		var amt36mSubtotal = itemSubTotal * 3;
		//1/11/2014 - Modify 12% discount calculation to 36mSubtotal * 0.88 instead of dividing by 1.12
		var amt36mSavingsSubtotal = amt36mSubtotal * 0.88;
		var amt36mSavings = amt36mSubtotal - amt36mSavingsSubtotal;
		var amt36mSavingsSubtotalGstHst = amt36mSavingsSubtotal * (itemTaxRate/100);
		var amt36mTotal = amt36mSavingsSubtotal + amt36mSavingsSubtotalGstHst;
		
		//alert('---- Tax Total: '+rs[i].getValue('taxtotal')+' // Print 12 Month: '+rs[i].getValue('custbody_ax_print_12m_gsthst'));
		//alert('Tax: '+itemTaxRate+' // SubTotal: '+itemSubTotal+' // Total Qty: '+itemTotalQty);
		//alert('----NEW Calc:  Tax Total: '+rs[i].getValue('taxtotal')+' // Print 12 Month: '+amt12mGstHst);
		
		qrec.setFieldValue('custbody_ax_print_12m_gsthst', amt12mGstHst.toFixed(2));
		qrec.setFieldValue('custbody_ax_print_12m_subtotal', amt12mSubtotal.toFixed(2));
		qrec.setFieldValue('custbody_ax_print_12m_total', amt12mTotal.toFixed(2));
		qrec.setFieldValue('custbody_ax_print_36m_subtotal_savings', amt36mSavingsSubtotal.toFixed(2));
		qrec.setFieldValue('custbody_ax_print_36m_savings', amt36mSavings.toFixed(2));
		qrec.setFieldValue('custbody_ax_print_36m_sts_gsthst', amt36mSavingsSubtotalGstHst.toFixed(2));
		qrec.setFieldValue('custbody_ax_print_36m_total', amt36mTotal.toFixed(2));
		
		nlapiSubmitRecord(qrec, false, true);
		
		
		alert(rs[i].getValue('tranid')+' // '+itemTaxRate);
	//}
}
