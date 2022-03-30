function fieldChangedChkDeposit(type,name)
{

   if (name == 'entity' )
      {
         var vendor = nlapiGetFieldValue('entity');
         
         var filter = new nlobjSearchFilter('entity', null, 'is', vendor);
         
        // var searchResults = nlapiSearchRecord('purchaseorder',null, filter,column);
         var searchResults = nlapiSearchRecord('transaction','customsearch_liv_14306_deposit_balance', filter, null);
         
     
           for(var i = 0; searchResults != null && i < searchResults.length; i++)
         {
          nlapiLogExecution('DEBUG', 'VALUE', 'i '+i);
          
                  var results=searchResults[i];
                  var columns=results.getAllColumns();  
                  var vendorname        = results.getValue(columns[0]); 
                  var amount            = results.getValue(columns[1]);
                  
                
                  
                  if (vendor == vendorname)
                  {

                     alert('This vendor has a deposit (14306 Deposit) of : '+amount);
                   return false;
                  }
         } // end for
      } //end if
} 