function returnAll(){
 
  var recID = nlapiGetRecordId();
  var url = nlapiResolveURL('SUITELET', 'customscript_open_record_sl', 'customdeploy_open_record_sl')+'&inv=' + recID;
  document.location=url;
  
}