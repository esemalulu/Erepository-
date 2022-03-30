var eflt = [new nlobjSearchFilter('custrecord_adl_isprocessed',null,'is','F'),
new nlobjSearchFilter('custrecord_adl_reclik', null, 'anyof','@NONE@')];
var ecol = [new nlobjSearchColumn('custrecord_adl_internalid')];
var rslt = nlapiSearchRecord('customrecord_aux_duplicate_loads', null, eflt, ecol);

for (var i=0; rslt && i < rslt.length; i++) {
//update link
nlapiSubmitField('customrecord_aux_duplicate_loads',rslt[i].getId(), 'custrecord_adl_reclik',rslt[i].getValue('custrecord_adl_internalid'));
}
