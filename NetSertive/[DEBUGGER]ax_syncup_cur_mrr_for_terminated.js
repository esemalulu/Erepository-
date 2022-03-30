
//Search terminated Actuals customrecord_ax_baseline_mrr 

var tflt = [new nlobjSearchFilter('custrecord_abmrr_subs_status', null, 'anyof',['2']),
            new nlobjSearchFilter('isinactive', null, 'is','F'),
            new nlobjSearchFilter('custentity_ax_calc_amrr','custrecord_abmrr_customer','isempty','')];

var tcol = [new nlobjSearchColumn('internalid','custrecord_abmrr_customer').setSort(true),
            new nlobjSearchColumn('custrecord_abmrr_customer'),
            new nlobjSearchColumn('custrecord_abmrr_linevalue'),
            new nlobjSearchColumn('custentity_ax_calc_amrr','CUSTRECORD_ABMRR_CUSTOMER')];

var trs = nlapiSearchRecord('customrecord_ax_baseline_mrr', null, tflt, tcol);

//go through and subtract out line value from customer mrr
for (var i=0; trs && i < trs.length; i++) {
	
	var custid = trs[i].getValue('custrecord_abmrr_customer');
	
	nlapiSubmitField('customer', custid, 'custentity_ax_calc_amrr', 0.0, false);
	
	/**
	var rcaflt = [new nlobjSearchFilter('isinactive', null, 'is','F'),
	              new nlobjSearchFilter('custrecord_abmrr_customer', null, 'anyof',custid),
	              new nlobjSearchFilter('custrecord_abmrr_subs_status', null, 'noneof','2')];
	var rcacol = [new nlobjSearchColumn('custrecord_abmrr_linevalue', null, 'sum')];

	var rcars = nlapiSearchRecord('customrecord_ax_baseline_mrr', null, rcaflt, rcacol);
	if (rcars && rcars.length > 0) {
		var actualMrrVal = rcars[0].getValue('custrecord_abmrr_linevalue', null, 'sum');
		
		nlapiSubmitField('customer', _cid, 'custentity_ax_calc_amrr', actualMrrVal, false);
									
	}
	
	var curmrr = parseFloat(trs[i].getValue('custentity_ax_calc_amrr','CUSTRECORD_ABMRR_CUSTOMER'));
	var lineval = parseFloat(trs[i].getValue('custrecord_abmrr_linevalue'));
	
	
	if (curmrr <= 0) {
		continue;
	}
	
	alert(custid+' // '+curmrr+' // '+lineval);
	
	nlapiSubmitField('customer', custid, 'custentity_ax_calc_amrr', curmrr-lineval, false);
	*/
}