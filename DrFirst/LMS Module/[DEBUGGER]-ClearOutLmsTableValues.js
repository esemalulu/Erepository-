
var rs = nlapiSearchRecord('customrecord_lmslic', null, null, null);
for (var i=0; rs && i < rs.length; i++) {
	nlapiDeleteRecord('customrecord_lmslic', rs[i].getId());
}