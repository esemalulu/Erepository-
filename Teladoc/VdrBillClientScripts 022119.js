//NS-131
//Last updated: 02/21/19 NS-302 Prevent Saving on Duplicate Vendor Invoice Number

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

//NS-302
function fieldChanged(type,name){
 
if(name === 'entity'){
 
  var refNum = nlapiGetFieldValue('tranid');
  var tranNum = nlapiGetFieldValue('transactionnumber');
  if (refNum != null && refNum != '') 
  {
   var vendor = nlapiGetFieldValue('entity');
   var filter = new Array();
   filter[0] = new nlobjSearchFilter('tranid',null,'is',refNum);
   filter[1] = new nlobjSearchFilter('mainline',null,'is','T');
   filter[2] = new nlobjSearchFilter('entity',null,'is', vendor);
   var column = new Array();
   column[0] = new nlobjSearchColumn('internalid');
   column[1] = new nlobjSearchColumn('tranid');
   var searchResults = nlapiSearchRecord('vendorbill',null, filter,column);
   if (searchResults != null && searchResults.length > 0)
   {
    alert('Vendor invoice/reference# is already in the system : ' + searchResults[0].getValue('tranid'));
    return false;
   }
  }
  }
 
 return true;  
}