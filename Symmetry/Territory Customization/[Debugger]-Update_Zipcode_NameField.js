/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       25 Jan 2014     AnJoe
 *
 */
var flt  = null;
var procId = '';
if (procId) {
	flt = [new nlobjSearchFilter('internalidnumber', null, 'lessthan',procId)];
}
var col = [new nlobjSearchColumn('internalid').setSort(true)];

var rs = nlapiSearchRecord('customrecord_aux_territoryzips', null, flt, col);

for (var i=0; i < rs.length; i++) {
	alert(rs[i].getId());
	var rec = nlapiLoadRecord('customrecord_aux_territoryzips', rs[i].getId());
	nlapiSubmitRecord(rec, false, true);
}