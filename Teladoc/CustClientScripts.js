// NS-127 3/7/18 - Check invoice prefix for duplicates

function fieldChanged(type,name)

{

   //NS-127
   if (name == 'custentity_liv_invoice_prefix' )
      {
         var invoiceprefix = nlapiGetFieldValue('custentity_liv_invoice_prefix')
       //  nlapiLogExecution('debug','invoiceprefix ', invoiceprefix);
         
         var filter = new nlobjSearchFilter('custentity_liv_invoice_prefix', null, 'is', invoiceprefix);
         var column = new Array();
         column[0] = new nlobjSearchColumn('companyname');
       
         
         var searchResults = nlapiSearchRecord('customer',null, filter,column);
           

         for(var i = 0; searchResults != null ; i++)
         {
                   var searchResult = searchResults[i];
                   var companyname = searchResult.getValue('companyname');
          
         //          nlapiLogExecution('debug','companyname',companyname);
                   alert('Invoice Prefix '+ invoiceprefix + ' already used by '+companyname+'. Please use a different prefix.');
                   return false;
         } // end for
      } //end if
      
    return true;
} 
