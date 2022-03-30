function userEventBeforeSubmit(type){

var newrec = nlapiGetNewRecord();
var locked = nlapiLookupField(newrec.getRecordType(), newrec.id, 'custrecord_liv_cc_ns_je_internal_id');
if(locked)
{
     throw "You cannot edit this record.  Journal has been created.";
}
 }