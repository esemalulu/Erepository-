//NS-124

function validateLine(group)
{
   var newType = nlapiGetRecordType();
 
  if ( newType == 'journalentry' && group == 'line' )
   {
      var account = nlapiGetCurrentLineItemValue('line','account') ;
      var invoiceno = nlapiGetCurrentLineItemValue('line','custcol_liv_invoice_no') ;
      var entity = nlapiGetCurrentLineItemValue('line','entity') ;
      
    // alert (account);
    //  alert (invoiceno);
      
      if (account == 694)
      {
        if (!invoiceno)
        {
           alert ('Please select Invoice no. from list');
           return false;
        }
        if (!entity)
        {
           alert ('Please select Name from list');
           return false;
        }
     }

   }
   return true;
}