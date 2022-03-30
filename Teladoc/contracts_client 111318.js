/* last updated date : 11/13/18 - NS-236 */

function fieldChanged(type, name, linenum)
{
	try{
	
	var context = nlapiGetContext().getExecutionContext() ;

	
  if (context == 'userinterface')
  {

     
      if (name == 'custrecord_liv_cm_invoice_prefix' )
      {
         var invoiceprefix = nlapiGetFieldValue('custrecord_liv_cm_invoice_prefix')
        
         
         var filter = new nlobjSearchFilter('custrecord_liv_cm_invoice_prefix', null, 'is', invoiceprefix);
         var column = new Array();
         column[0] = new nlobjSearchColumn('custrecord_liv_cm_contract_number');
         column[1] = new nlobjSearchColumn('custrecord_liv_cm_client_code');
       
         
         var searchResults = nlapiSearchRecord('customrecord_liv_contracts',null, filter,column);
           

         for(var i = 0; searchResults != null ; i++)
         {
                   var searchResult = searchResults[i];
                   var contractnumber = searchResult.getValue('custrecord_liv_cm_contract_number');
                   var clientcode = searchResult.getText('custrecord_liv_cm_client_code');
          
         //          nlapiLogExecution('debug','companyname',companyname);
                   alert('Invoice Prefix '+ invoiceprefix + ' already used by contract no. '+contractnumber+' '+clientcode+'. Please use a different prefix.');
                   return false;
         } // end for
      } //end if
      
      
    } //end if context


	}catch(error){
		nlapiLogExecution('ERROR','validateField',error.toString());
	}

}
