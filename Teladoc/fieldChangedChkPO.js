function fieldChangedChkPO(type,name)
{

   if (name == 'entity' )
      {
         var vendor = nlapiGetFieldValue('entity')
         var filter = new nlobjSearchFilter('entity', null, 'is', vendor);
         var column = new Array();
         column[0] = new nlobjSearchColumn('tranid');
         column[1] = new nlobjSearchColumn('status');
         
         var searchResults = nlapiSearchRecord('purchaseorder',null, filter,column);
           
         for(var i = 0; searchResults != null && i < searchResults.length; i++)
         {
                   var searchResult = searchResults[i];
                   var po = searchResult.getValue('tranid');
                   var status = searchResult.getValue('status');
                   nlapiLogExecution('debug','PO',po);
                   alert('PO # '+ po + ' exists for this vendor with status '+status+'. If this is not for prepayment, please bill from the Purchase Order page.');
                   return false;
         } // end for
      } //end if
      
    
} 
