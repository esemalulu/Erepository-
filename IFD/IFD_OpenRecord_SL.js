function openrecord(request,response){

  var tranid = request.getParameter('inv');
  var rec = nlapiLoadRecord('invoice',tranid);
  var count = rec.getLineItemCount('item');
  nlapiLogExecution('DEBUG', 'count', count);
  var issubmit = false;
  for(var i=1; i<= count; i++){
    var isreturn = rec.getLineItemValue('item','custcol_return',i);
    nlapiLogExecution('DEBUG', 'isreturn', isreturn);
    if(isreturn != 'T'){
      issubmit = true;      
      nlapiLogExecution('DEBUG', 'return not true');
      rec.setLineItemValue('item','custcol_return',i,'T');
      //rec.commitLineItem('item');      
    }
  }
  nlapiLogExecution('DEBUG', 'issubmit', issubmit);
  if(issubmit == true){
    var recid = nlapiSubmitRecord(rec);   
    nlapiLogExecution('DEBUG', 'after submit');
  }
  //var url = nlapiResolveURL('RECORD', 'invoice', tranid, 'view');
  //window.location = url;
  nlapiSetRedirectURL( 'RECORD', 'invoice', tranid, false );
}