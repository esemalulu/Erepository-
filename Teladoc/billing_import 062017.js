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
      var upfrontmeters = nlapiGetFieldValue('custrecord_liv_bs_upfront_meter_qty') ;
      var replmeters = nlapiGetFieldValue('custrecord_liv_bs_repl_meter_qty') ;
      
      // Get Early Term Qty
      var earlytermtotal = nlapiGetFieldValue('custrecord_liv_bs_early_term_total') ;
      var earlyterm1 = nlapiGetFieldValue('custrecord_liv_bs_early_term_1mon') ;
      var earlyterm2 = nlapiGetFieldValue('custrecord_liv_bs_early_term_2mon') ;
      var earlyterm3 = nlapiGetFieldValue('custrecord_liv_bs_early_term_3mon') ;
      var earlyterm4 = nlapiGetFieldValue('custrecord_liv_bs_early_term_4mon') ;
      var earlyterm5 = nlapiGetFieldValue('custrecord_liv_bs_early_term_5mon') ;
      var earlyterm6 = nlapiGetFieldValue('custrecord_liv_bs_early_term_6mon') ;
      var earlyterm7 = nlapiGetFieldValue('custrecord_liv_bs_early_term_7mon') ;
      var earlyterm8 = nlapiGetFieldValue('custrecord_liv_bs_early_term_8mon') ;
      var earlyterm9 = nlapiGetFieldValue('custrecord_liv_bs_early_term_9mon') ;
      var earlyterm10 = nlapiGetFieldValue('custrecord_liv_bs_early_term_10mon') ;
      var earlyterm11 = nlapiGetFieldValue('custrecord_liv_bs_early_term_11mon') ;
      var earlyterm12 = nlapiGetFieldValue('custrecord_liv_bs_early_term_12mon') ;
      
      
      if (clientcode == null)
      { 
         clientcode = 'N/A' ;
       }
       
      var pccodeID = getPromoCodeId(clientcode) ;
      
      nlapiLogExecution('DEBUG','PCCodeID value:'+ pccodeID) ;
      
            
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
               var terminationprice = results.getValue(columns[12]); 
      
               nlapiLogExecution('DEBUG','Upfront Price: '+upfrontprice) ;
               nlapiLogExecution('DEBUG','Bundle Price: '+bundleprice) ;
               nlapiLogExecution('DEBUG','Replacement Price: '+replacementprice) ;
               
               // Set new Field Value
         
               nlapiSetFieldValue('custrecord_liv_bs_ns_pppm_price', Math.abs(parseFloat(bundleprice)));
               nlapiSetFieldValue('custrecord_liv_bs_ns_upfront_price', Math.abs(parseFloat(upfrontprice)));
               nlapiSetFieldValue('custrecord_liv_bs_ns_replace_price', Math.abs(parseFloat(replacementprice)));
               nlapiSetFieldValue('custrecord_liv_bs_ns_termination_price', Math.abs(parseFloat(terminationprice)));
           
               
             } //for loop
        } // end if
      

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
		arrColumns.push(new nlobjSearchColumn('custentity_liv_client_type'));
		arrColumns.push(new nlobjSearchColumn('custentity_liv_medical_claims_billing'));
		arrColumns.push(new nlobjSearchColumn('custentity_liv_members_disc_qty'));
	
		
		
	   
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
             var categorytext = custrecord.getText('category');
             var invoiceprefix = custrecord.getValue('custentity_liv_invoice_prefix');
             var referralfee = custrecord.getValue('custentity_liv_referral_fee');
             var programdesc = custrecord.getValue('custentity_liv_program_item_desc');
             var cum_enrollment = custrecord.getValue('custentity_liv_cumulative_enrollment');
             var cap_enrollment = custrecord.getValue('custentity_liv_capped_enrollment_no');
             var clienttype = custrecord.getText('custentity_liv_client_type');
             var medicalclaims = custrecord.getValue('custentity_liv_medical_claims_billing');
             var discactivemembers = custrecord.getValue('custentity_liv_members_disc_qty'); 
             
             var invoicesuffix =  convertdate(billing_date, 'MMDDYY'); 
             var invoicenum = invoiceprefix+invoicesuffix;
             
             // Amount Calculation
             
             var programamt = bundleprice * (activemembers - discactivemembers) ;
             var referralamt = referralfee * (activemembers - discactivemembers) ;
             var replamt = replacementprice *  replmeters ;
             
              if (categorytext == 'Upfront')
              {
                 var upfrontamt = upfrontprice * upfrontmeters ; 
              }
              if (categorytext == 'Bundled')
              {
                 var earlytermtotal = 0;
                 var earlytermdesc = null ;
                
                 var earlyterm1amt = nvl(earlyterm1,0) * terminationprice ; 
                 var earlyterm2amt = (nvl(earlyterm2,0) * 2) * terminationprice ; 
                 var earlyterm3amt = (nvl(earlyterm3,0) * 3) * terminationprice ;
                 var earlyterm4amt = (nvl(earlyterm4,0) * 4) * terminationprice ;
                 var earlyterm5amt = (nvl(earlyterm5,0) * 5) * terminationprice ;
                 var earlyterm6amt = (nvl(earlyterm6,0) * 6) * terminationprice ;
                 var earlyterm7amt = (nvl(earlyterm7,0) * 7) * terminationprice ;
                 var earlyterm8amt = (nvl(earlyterm8,0) * 8) * terminationprice ;
                 var earlyterm9amt = (nvl(earlyterm9,0) * 9) * terminationprice ;
                 var earlyterm10amt = (nvl(earlyterm10,0) * 10) * terminationprice ;
                 var earlyterm11amt = (nvl(earlyterm11,0) * 11) * terminationprice ;
                 var earlyterm12amt = (nvl(earlyterm12,0) * 12) * terminationprice ;
                 
                 earlytermtotal = earlyterm1amt+earlyterm2amt+earlyterm3amt+earlyterm4amt+earlyterm5amt+earlyterm6amt+earlyterm7amt+earlyterm9amt+earlyterm10amt+earlyterm11amt+earlyterm12amt;
                 
                 if (nvl(earlyterm1,0) != 0) { earlytermdesc = earlyterm1 + ' member(s) @1 mon remaining' };
                 if (nvl(earlyterm2,0) != 0) { earlytermdesc = earlytermdesc + ' , ' + earlyterm2 + ' member(s) @2 mons remaining' };
                 if (nvl(earlyterm3,0) != 0) { earlytermdesc = earlytermdesc + ' , ' + earlyterm3 + ' member(s) @3 mons remaining' };
                 if (nvl(earlyterm4,0) != 0) { earlytermdesc = earlytermdesc + ' , ' + earlyterm4 + ' member(s) @4 mons remaining' };
                 if (nvl(earlyterm5,0) != 0) { earlytermdesc = earlytermdesc + ' , ' + earlyterm5 + ' member(s) @5 mons remaining' };
                 if (nvl(earlyterm6,0) != 0) { earlytermdesc = earlytermdesc + ' , ' + earlyterm6 + ' member(s) @6 mons remaining' };
                 if (nvl(earlyterm7,0) != 0) { earlytermdesc = earlytermdesc + ' , ' + earlyterm7 + ' member(s) @7 mons remaining' };
                 if (nvl(earlyterm8,0) != 0) { earlytermdesc = earlytermdesc + ' , ' + earlyterm8 + ' member(s) @8 mons remaining' };
                 if (nvl(earlyterm9,0) != 0) { earlytermdesc = earlytermdesc + ' , ' + earlyterm9 + ' member(s) @9 mons remaining' };
                 if (nvl(earlyterm10,0) != 0) { earlytermdesc = earlytermdesc + ' , ' + earlyterm10 + ' member(s) @10 mons remaining' };
                 if (nvl(earlyterm11,0) != 0) { earlytermdesc = earlytermdesc + ' , ' + earlyterm11 + ' member(s) @11 mons remaining' };
                 if (nvl(earlyterm12,0) != 0) { earlytermdesc = earlytermdesc + ' , ' + earlyterm12 + ' member(s) @12 mons remaining' };
                
              }
            
             
             // Check Billing Exceptions
             
             if (cum_enrollment > cap_enrollment && cap_enrollment != 0)
             {
                 nlapiSetFieldValue('custrecord_liv_bs_ns_billing_exceptions', 'Enrollment cap exceeded.' );
             }
            
             if (clienttype == 'Internal' || clienttype == 'Direct to Consumer (D2C)')
             {
                nlapiSetFieldValue('custrecord_liv_bs_ns_billable','F');
             }
             
             if (categorytext == 'Fee for Service')
             {
                nlapiSetFieldValue('custrecord_liv_bs_ns_billable','F');
                nlapiSetFieldValue('custrecord_liv_bs_ns_billing_exceptions', 'Fee for Service client will be manually billed' );
             }
             
             nlapiLogExecution('DEBUG', 'VALUE', 'Medical Claims: '+medicalclaims);
             if (medicalclaims == 'T')
             {
                nlapiSetFieldValue('custrecord_liv_bs_ns_billable','F');
                nlapiSetFieldValue('custrecord_liv_bs_ns_billing_exceptions', 'Not billable - medical claims billing.' );
             }
             
             
             programdesc = programdesc + ' - ' + convertdate(billing_date, 'MONTHYY'); 
             
              nlapiLogExecution('DEBUG', 'VALUE', 'Active Members: '+activemembers);
              nlapiLogExecution('DEBUG', 'VALUE', 'Referral Fee: '+referralfee);
              nlapiLogExecution('DEBUG', 'VALUE', 'Referral Amt: '+referralamt);
  
              nlapiSetFieldValue('custrecord_liv_bs_ns_customer', custrecordid);
              nlapiSetFieldValue('custrecord_liv_bs_ns_category', category);
              nlapiSetFieldValue('custrecord_liv_bs_ns_invoice_number', invoicenum );
              nlapiSetFieldValue('custrecord_liv_bs_ns_program_desc', programdesc );
              
              nlapiSetFieldValue('custrecord_liv_bs_ns_referral_fee_amt', referralamt );
              nlapiSetFieldValue('custrecord_liv_bs_ns_program_amt', programamt );
              nlapiSetFieldValue('custrecord_liv_bs_ns_upfront_amt', upfrontamt );
              nlapiSetFieldValue('custrecord_liv_bs_ns_replacement_amt', replamt );
              nlapiSetFieldValue('custrecord_liv_bs_ns_termination_amt', earlytermtotal );
              nlapiSetFieldValue('custrecord_liv_bs_ns_termination_desc',earlytermdesc );


              
        
            }
          } // arrResult
          else
          {
              nlapiSetFieldValue('custrecord_liv_bs_ns_billing_exceptions', 'Unable to find NetSuite Customer' );
              nlapiSetFieldValue('custrecord_liv_bs_ns_billable','F');
          
          }
          
          
    

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


function nvl(value1, value2)
{
  if (value1 == null)
  {
    return value2;
  }
  else
  { 
    return value1 ;
  }
}
   
   
   
   
   
   

   