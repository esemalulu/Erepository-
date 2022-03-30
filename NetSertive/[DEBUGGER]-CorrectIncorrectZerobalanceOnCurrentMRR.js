
//Status of Renewed or Paused
var zflt = [new nlobjSearchFilter('custentity_ax_calc_amrr', null, 'equalto',0),
            new nlobjSearchFilter('custrecord_abmrr_subs_status', 'custrecord_abmrr_customer', 'anyof',[1,3])];

var zcol = [new nlobjSearchColumn('internalid')];

var zrs = nlapiSearchRecord('customer', null, zflt, zcol);

for (var i=0; zrs && i < zrs.length; i++) {
	
	//search for sum of actual mrr value
	var aflt = [new nlobjSearchFilter('custrecord_abmrr_customer', null, 'anyof', zrs[i].getId()),
	            new nlobjSearchFilter('custrecord_abmrr_subs_status', null, 'anyof',[1,3]),
	            new nlobjSearchFilter('isinactive', null, 'is', 'F')];
	var acol = [new nlobjSearchColumn('custrecord_abmrr_linevalue', null, 'sum')];
	
	var arx = nlapiSearchRecord('customrecord_ax_baseline_mrr', null, aflt, acol);
	
	if (arx && arx.length > 0) {
		
		nlapiSubmitField('customer', zrs[i].getId(), 'custentity_ax_calc_amrr', arx[0].getValue('custrecord_abmrr_linevalue', null, 'sum'), false);
		
	}
}
