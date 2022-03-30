//NS-131

function validateLine(group)
{
   var newType = nlapiGetRecordType();
 
  if ( newType == 'vendorbill' && group == 'expense' )
   {
      var account = nlapiGetCurrentLineItemValue('expense','account') ;
      var amortizationsched = nlapiGetCurrentLineItemValue('expense','amortizationsched') ;
      var amortizstartdate = nlapiGetCurrentLineItemValue('expense','amortizstartdate') ;
      var amortizationenddate = nlapiGetCurrentLineItemValue('expense','amortizationenddate') ;
       
      
     
    //  alert (invoiceno);
      
      if (account == 127 || account == 150 || account == 151 || account == 670 || account ==671 || account == 672 ||account == 673 || account ==753)
      {
        //alert (account);
        if (!amortizationsched)
        {
           alert ('Please select Amortization Schedule from list');
           return false;
        }
        if (!amortizstartdate)
        {
           alert ('Please enter Amortization Start Date');
           return false;
        }
        if (!amortizationenddate)
        {
           alert ('Please enter Amortization End Date');
           return false;
        }
     }

   }
   return true;
}