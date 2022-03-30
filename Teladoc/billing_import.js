/* Last Updated: 13-Jun-2017 */

function beforeSubmit(type)
{
  //applies only to CSV Import and Create event
  
  if ( (type == 'create') &&  (nlapiGetContext().getExecutionContext() == 'csvimport'))
  {
      
      // Search record existence in custom record
       var arrFilter = new Array(); 
       var billing_date = nlapiGetFieldValue('custrecord_liv_bs_date');
       var clientcode = nlapiGetFieldValue('custrecord_liv_bs_client_code');
       
       
       nlapiLogExecution('DEBUG','Billing Date value:'+ billing_date) ;
       nlapiLogExecution('DEBUG','Client Code value:'+ clientcode) ;
    
	   arrFilter[0] = new nlobjSearchFilter('custrecord_liv_bs_date', null, 'on',  billing_date ); 
	   arrFilter[1] = new nlobjSearchFilter('custrecord_liv_bs_client_code', null, 'is',  clientcode ); 

	    //Define search columns
	
	    var arrColumns = new Array();
		arrColumns.push(new nlobjSearchColumn('custrecord_liv_bs_date'));
		arrColumns.push(new nlobjSearchColumn('custrecord_liv_bs_ns_internal_id'));
	
	   
	    //Execute search
	    
		var arrResult = nlapiSearchRecord('customrecord_liv_billing_summary', null, arrFilter, arrColumns);
		
		nlapiLogExecution('DEBUG','Billing Date value:'+ billing_date) ;
	
		

       if(arrResult) //  found - delete records first
        {
           nlapiLogExecution('DEBUG','arrResult:'+ arrResult.length) ;
        
           var current_rec = arrResult[0];
           var rec_id = current_rec.getId();
           var ns_internalid = current_rec.getValue('custrecord_liv_bs_ns_internal_id');
       
           nlapiLogExecution('DEBUG','NS Internal ID:'+ ns_internalid) ;
           
           if (ns_internalid > 0) // not empty
           {
              throw 'Billing record and invoice record already exist.  Refer to NS Internal ID : '+ ns_internalid ;
           }
           else
           {
               nlapiDeleteRecord('customrecord_liv_billing_summary', rec_id);
               nlapiLogExecution('DEBUG', 'ACTIVITY', 'Call processRecords');
               processRecords(type) ;
           } 
        }
        else
        {
              nlapiLogExecution('DEBUG', 'ACTIVITY', 'Call processRecords');
              processRecords(type) ;
        }

  }

} // end function beforeSumit




function processRecords(type)
{   

      var newId = nlapiGetRecordId();
      var newType = nlapiGetRecordType();
      var clientcode = nlapiGetFieldValue('custrecord_liv_bs_client_code'); 
      var billing_date = nlapiGetFieldValue('custrecord_liv_bs_date');
      var activemembers = nlapiGetFieldValue('custrecord_liv_bs_active_members_qty');
      
      nlapiLogExecution('DEBUG','<Before Submit Script> type:'+type+', RecordType: '+newType+', Id:'+newId);
      nlapiLogExecution('DEBUG','Client Code value:'+ clientcode) ;
      nlapiLogExecution('DEBUG','Billing Date value:'+ billing_date) ;
      
      if (clientcode == null)
      { 
         clientcode = 'N/A' ;
       }
       
      var pccodeID = getPromoCodeId(clientcode) ;
      
      nlapiLogExecution('DEBUG','PCCodeID value:'+ pccodeID) ;
      

// Search for Client

       var arrFilter = new Array(); 
    
	   arrFilter[0] = new nlobjSearchFilter('custentity_liv_pccode', null, 'anyof',  [pccodeID] ); // Internal ID PromoCode in Custom List

	    //Define search columns
	
	    var arrColumns = new Array();
		arrColumns.push(new nlobjSearchColumn('companyname'));
		arrColumns.push(new nlobjSearchColumn('category'));
		arrColumns.push(new nlobjSearchColumn('custentity_liv_referral_fee'));
		arrColumns.push(new nlobjSearchColumn('custentity_liv_program_item_desc'));
		arrColumns.push(new nlobjSearchColumn('custentity_liv_client_type'));
		arrColumns.push(new nlobjSearchColumn('custentity_liv_expense_dept'));
		arrColumns.push(new nlobjSearchColumn('custentity_liv_expense_acct'));
		arrColumns.push(new nlobjSearchColumn('custentity_liv_invoice_prefix'));
		arrColumns.push(new nlobjSearchColumn('custentity_liv_cumulative_enrollment'));
		arrColumns.push(new nlobjSearchColumn('custentity_liv_capped_enrollment_no'));
		
		
	   
	    //Execute customer search
	    
		var arrResult = nlapiSearchRecord('customer', null, arrFilter, arrColumns);
	 	//nlapiLogExecution('DEBUG', 'VALUE', 'Customer Search Result: '+arrResult.length)
		
        if(arrResult)
        {
          for (var i = 0;  i < arrResult.length; i++)
           {
             var custrecord = arrResult[i];
             var custrecordid = custrecord.getId();
             var companyname = custrecord.getValue('companyname');
             var category = custrecord.getValue('category');
             var invoiceprefix = custrecord.getValue('custentity_liv_invoice_prefix');
             var referralfee = custrecord.getValue('custentity_liv_referral_fee');
             var programdesc = custrecord.getValue('custentity_liv_program_item_desc');
             var cum_enrollment = custrecord.getValue('custentity_liv_cumulative_enrollment');
             var cap_enrollment = custrecord.getValue('custentity_liv_capped_enrollment_no');
             
             var invoicesuffix =  convertdate(billing_date, 'MMDDYY'); 
             var invoicenum = invoiceprefix+invoicesuffix;
             var referralamt = referralfee * activemembers ;
             
             if (cum_enrollment > cap_enrollment && cap_enrollment != 0)
             {
                 nlapiSetFieldValue('custrecord_liv_bs_ns_billing_exceptions', 'Enrollment cap exceeded.' );
             }
            
            
             
             programdesc = programdesc + ' - ' + convertdate(billing_date, 'MONTHYY'); 
             
             nlapiLogExecution('DEBUG', 'VALUE', 'Active Members: '+activemembers);
             nlapiLogExecution('DEBUG', 'VALUE', 'Referral Fee: '+referralfee);
             nlapiLogExecution('DEBUG', 'VALUE', 'Referral Amt: '+referralamt);
             
            // var parent = custrecord.getValue('parent');
            // var clientname = custrecord.getValue('custentity_liv_jira_client_name');
             
            // var clienttype = custrecord.getValue('custentity_liv_client_type');
            // var salesrep = custrecord.getValue('salesrep');
            // var expenseaccount = custrecord.getValue('custentity_liv_expense_acct');
            // var expensedept = custrecord.getValue('custentity_liv_expense_dept');
             
             
             
            //   nlapiLogExecution('DEBUG', 'VALUE', 'Company Name: '+companyname);
            //   nlapiLogExecution('DEBUG', 'VALUE', 'Parent Company: '+parent);
            //   nlapiLogExecution('DEBUG', 'VALUE', 'Client Name: '+clientname);
            //   nlapiLogExecution('DEBUG', 'VALUE', 'Category: '+category);
            //   nlapiLogExecution('DEBUG', 'VALUE', 'Expense Department: '+expensedept);
            //   nlapiLogExecution('DEBUG', 'VALUE', 'Expense Account: '+expenseaccount);

            
             
            

              nlapiSetFieldValue('custrecord_liv_bs_ns_customer', custrecordid);
              nlapiSetFieldValue('custrecord_liv_bs_ns_category', category);
              nlapiSetFieldValue('custrecord_liv_bs_ns_invoice_number', invoicenum );
              nlapiSetFieldValue('custrecord_liv_bs_ns_referral_fee_amt', referralamt );
              nlapiSetFieldValue('custrecord_liv_bs_ns_program_desc', programdesc );
              
        
            }
          } // arrResult
          
          
          
          
          
       // Search Price 
       
     
       var arrFilter = new Array(); 
       arrFilter[0] = new nlobjSearchFilter('custentity_liv_pccode', null, 'anyof',  [pccodeID] );

       var searchresults = nlapiSearchRecord('customer','customsearch_liv_customers_download', arrFilter, null);

       if(searchresults) 
       { 
           for(var z=0; z < searchresults.length; z++) 
           { 

               var results=searchresults[z];
               var columns=results.getAllColumns();  

               var search_pccode =results.getValue(columns[1]); 
               var upfrontprice = results.getValue(columns[9]);  ;   
               var bundleprice = results.getValue(columns[10]);  ; 
               var replacementprice = results.getValue(columns[11]);  ; 
      
               nlapiLogExecution('DEBUG','Upfront Price: '+upfrontprice) ;
               nlapiLogExecution('DEBUG','Bundle Price: '+bundleprice) ;
               nlapiLogExecution('DEBUG','Replacement Price: '+replacementprice) ;
               
               // Set new Field Value
         
               nlapiSetFieldValue('custrecord_liv_bs_ns_pppm_price', Math.abs(parseFloat(bundleprice)));
               nlapiSetFieldValue('custrecord_liv_bs_ns_upfront_price', Math.abs(parseFloat(upfrontprice)));
               nlapiSetFieldValue('custrecord_liv_bs_ns_replace_price', Math.abs(parseFloat(replacementprice)));
           
               
             } //for loop
        } // end if
    
    

} //end processRecords

function getPromoCodeId(pccode) //get internal id for Multi-Select custom list
{
     var col = new Array();
     var arrFilter = new Array(); 
   
     nlapiLogExecution('DEBUG', 'ACTIVITY', 'Search Custom List');
     nlapiLogExecution('DEBUG','Custom List PCCode value:'+ pccode) ;
     
	 arrFilter[0] = new nlobjSearchFilter('name', null, 'is',  pccode );
	 
     col[0] = new nlobjSearchColumn('internalid');
  
     
     var results = nlapiSearchRecord('customlist_liv_pccode', null, arrFilter, col);
     
     for ( var i = 0; results != null && i < results.length; i++ )
     {
        var res = results[i];
        var listID = (res.getValue('internalId'));
  
        nlapiLogExecution('DEBUG','Custom List PCCode ID value:'+ listID) ;
        
        return listID ;
      } 
      
}

function convertdate(inputdate, inputformat) 
{


  var newdate = new Date(inputdate);
   
    
   if (inputformat == 'MMDDYY')
   {
     nlapiLogExecution('DEBUG','Date format:'+ inputformat) ;
     var datestring = ("0" + (newdate.getMonth() + 1).toString()).substr(-2) + ("0" + newdate.getDate().toString()).substr(-2)  +  (newdate.getFullYear().toString()).substr(2);
 
     return datestring ;
   }  
   if (inputformat == 'MM/DD/YY')
   { 
     nlapiLogExecution('DEBUG','Date format:'+ inputformat) ;
     var datestring = ("0" + (newdate.getMonth() + 1).toString()).substr(-2) + "/" + ("0" + newdate.getDate().toString()).substr(-2)  + "/" + (newdate.getFullYear().toString()).substr(2);
     
     return datestring ;
   }  
   if (inputformat == 'MONTHYY')
   { 
     nlapiLogExecution('DEBUG','Date format:'+ inputformat) ;

     var monthNames = [
     "January", "February", "March",
     "April", "May", "June", "July",
     "August", "September", "October",
     "November", "December"
        ];

     var day = newdate.getDate();
     var monthIndex = newdate.getMonth();
     var year = newdate.getFullYear();
     
     var datestring =  monthNames[monthIndex] + ' ' + year;
     
     return datestring ;
   }  


}
   
   
   
   
   
   

   