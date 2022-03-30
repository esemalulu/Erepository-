/* Last Updated: 13-Jun-2017 */
/* [NETSUITE-49] 09/29/17 - Support Sales Tax records */
/* last updated : 10/30/17 - NETSUITE-68 - allow auto invoice for medical claims */
/* last updated : 01/08/18 - NETSUITE-106 - support FFS invoicing */
/* last updated : 01/18/18 - NETSUITE-87 - Replacement Meter FOC Cap */
/* last updated : 05/03/18 - NETSUITE-157 - Early Termination bug */
/* last updated : 05/15/18 - NETSUITE-159 - Support Hypertension billing */
/* last update  : 06/05/18 - NETSUITE-164 - fixed earlyterm gte9months use case */
/* last update  : 07/11/18 - Support discount item for HTN billing */
/* last updated : 09/24/18 - Enrollment Cap billing NS-214 */
/* last updated : 09/30/18 - NS-220 change early term desc */
/* last updated : 10/17/18 - Overwrite replacement quantity */

function beforeSubmit(type)
{
  //applies only to CSV Import and Create event
  
  if ( (type == 'create') &&  (nlapiGetContext().getExecutionContext() == 'csvimport'))
  {
           
       // Get the value of the Discount item from parameter
       var discountitem = nlapiGetContext().getSetting('SCRIPT', 'custscript_lv_discount_item');
       
       
      // Search record existence in custom record
       var arrFilter = new Array(); 
       var billing_date = nlapiGetFieldValue('custrecord_liv_bs_date');
       var clientcode = nlapiGetFieldValue('custrecord_liv_bs_client_code');
       var grouping = nlapiGetFieldValue('custrecord_liv_bs_grouping');
       var recordtype = nlapiGetFieldValue('custrecord_liv_bs_record_type');
       var state = nlapiGetFieldValue('custrecord_liv_bs_state');
       var city = nlapiGetFieldValue('custrecord_liv_bs_city');
       var zip = nlapiGetFieldValue('custrecord_liv_bs_zip');
       
       nlapiLogExecution('DEBUG','Billing Date value:'+ billing_date) ;
       nlapiLogExecution('DEBUG','Client Code value:'+ clientcode) ;
       nlapiLogExecution('DEBUG','Record Type value:'+ recordtype) ;
    
	   arrFilter[0] = new nlobjSearchFilter('custrecord_liv_bs_date', null, 'on',  billing_date ); 
	   arrFilter[1] = new nlobjSearchFilter('custrecord_liv_bs_client_code', null, 'is',  clientcode ); 
	   arrFilter[2] = new nlobjSearchFilter('custrecord_liv_bs_grouping', null, 'is',  grouping ); 
	   arrFilter[3] = new nlobjSearchFilter('custrecord_liv_bs_record_type', null, 'is',  recordtype );

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
               if (recordtype == 'Billing')
               {
                   nlapiDeleteRecord('customrecord_liv_billing_summary', rec_id);
                }
                   nlapiLogExecution('DEBUG', 'ACTIVITY', 'Call processRecords');
                   processRecords(type) ;
           } 
        }
        else
        {
              nlapiLogExecution('DEBUG', 'ACTIVITY', 'Call processRecords');
              processRecords(type, discountitem) ;
        }

  }

} // end function beforeSumit




function processRecords(type, discountitem)
{   

      var newId = nlapiGetRecordId();
      var newType = nlapiGetRecordType();
      var clientcode = nlapiGetFieldValue('custrecord_liv_bs_client_code'); 
      var billing_date = nlapiGetFieldValue('custrecord_liv_bs_date');
      var activemembers = nlapiGetFieldValue('custrecord_liv_bs_active_members_qty');
      var upfrontmeters = nlapiGetFieldValue('custrecord_liv_bs_upfront_meter_qty') ;
      var replmeters = nlapiGetFieldValue('custrecord_liv_bs_repl_meter_qty') ;
      var grouping = nlapiGetFieldValue('custrecord_liv_bs_grouping') ;
      var recordtype = nlapiGetFieldValue('custrecord_liv_bs_record_type') ;
      var ltdreplmeters = nlapiGetFieldValue('custrecord_liv_bs_ltd_repl_meter_qty') ; //NS-87
      
    
      
      // Get Early Term Qty
      var earlytermtotal = nlapiGetFieldValue('custrecord_liv_bs_early_term_total') ;
      var totalearlyterm = nlapiGetFieldValue('custrecord_liv_bs_early_term_total') ;
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
      
      // NS-106 FFS */
      var stripsqty = nlapiGetFieldValue('custrecord_liv_bs_strip_units_qty') ;
      var lancetsqty = nlapiGetFieldValue('custrecord_liv_bs_lancet_units_qty') ;
      var controlsolqty = nlapiGetFieldValue('custrecord_liv_bs_control_solutions_qty') ;
      var lancingqty = nlapiGetFieldValue('custrecord_liv_bs_lancing_devices_qty') ;
      
      // NS-159 hypertension //
      var htnactivemembers = nlapiGetFieldValue('custrecord_liv_bs_htn_active_members_qty');
      var htnupfrontmeters = nlapiGetFieldValue('custrecord_liv_bs_htn_upfront_meter_qty') ;
      var htnreplmeters = nlapiGetFieldValue('custrecord_liv_bs_ns_htn_repl_meter_qty') ;
      
      var htnearlytermtotal = nlapiGetFieldValue('custrecord_liv_bs_htn_early_term_total') ;
      var htnearlyterm1 = nlapiGetFieldValue('custrecord_liv_bs_ns_htn_early_term_1mon') ;
      var htnearlyterm2 = nlapiGetFieldValue('custrecord_liv_bs_ns_htn_early_term_2mon') ;
      var htnearlyterm3 = nlapiGetFieldValue('custrecord_liv_bs_ns_htn_early_term_3mon') ;
      var htnearlyterm4 = nlapiGetFieldValue('custrecord_liv_bs_ns_htn_early_term_4mon') ;
      var htnearlyterm5 = nlapiGetFieldValue('custrecord_liv_bs_ns_htn_early_term_5mon') ;
      var htnearlyterm6 = nlapiGetFieldValue('custrecord_liv_bs_ns_htn_early_term_6mon') ;
      var htnearlyterm7 = nlapiGetFieldValue('custrecord_liv_bs_ns_htn_early_term_7mon') ;
      var htnearlyterm8 = nlapiGetFieldValue('custrecord_liv_bs_ns_htn_early_term_8mon') ;
      var htnearlyterm9 = nlapiGetFieldValue('custrecord_liv_bs_ns_htn_early_term_9mon') ;
      var htnearlyterm10 = nlapiGetFieldValue('custrecord_liv_bs_ns_htn_early_term_10mo') ;
      var htnearlyterm11 = nlapiGetFieldValue('custrecord_liv_bs_ns_htn_early_term_11mo') ;
      var htnearlyterm12 = nlapiGetFieldValue('custrecord_liv_bs_ns_htn_early_term_12mo') ;
      
      var combactivemembers = nlapiGetFieldValue('custrecord_liv_bs_cb_active_members_qty');
      var combearlytermtotal = nlapiGetFieldValue('custrecord_liv_bs_cb_early_term_total') ;
      var combearlyterm1 = nlapiGetFieldValue('custrecord_liv_bs_ns_cb_early_term_1mon') ;
      var combearlyterm2 = nlapiGetFieldValue('custrecord_liv_bs_ns_cb_early_term_2mon') ;
      var combearlyterm3 = nlapiGetFieldValue('custrecord_liv_bs_ns_cb_early_term_3mon') ;
      var combearlyterm4 = nlapiGetFieldValue('custrecord_liv_bs_ns_cb_early_term_4mon') ;
      var combearlyterm5 = nlapiGetFieldValue('custrecord_liv_bs_ns_cb_early_term_5mon') ;
      var combearlyterm6 = nlapiGetFieldValue('custrecord_liv_bs_ns_cb_early_term_6mon') ;
      var combearlyterm7 = nlapiGetFieldValue('custrecord_liv_bs_ns_cb_early_term_7mon') ;
      var combearlyterm8 = nlapiGetFieldValue('custrecord_liv_bs_ns_cb_early_term_8mon') ;
      var combearlyterm9 = nlapiGetFieldValue('custrecord_liv_bs_ns_cb_early_term_9mon') ;
      var combearlyterm10 = nlapiGetFieldValue('custrecord_liv_bs_ns_cb_early_term_10mon') ;
      var combearlyterm11 = nlapiGetFieldValue('custrecord_liv_bs_ns_cb_early_term_11mon') ;
      var combearlyterm12 = nlapiGetFieldValue('custrecord_liv_bs_ns_cb_early_term_12mon') ;
      
      // end NS-159
      
      
      
      
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
               var flattermprice = results.getValue(columns[15]);
               var lt9monthtermprice = results.getValue(columns[16]);
               var gte9monthtermprice = results.getValue(columns[17]);
               var pppmdiscvol = results.getValue(columns[18]);
               var pppmdiscprice = results.getValue(columns[19]);
      
               nlapiLogExecution('DEBUG','Upfront Price: '+upfrontprice) ;
               nlapiLogExecution('DEBUG','Bundle Price: '+bundleprice) ;
               nlapiLogExecution('DEBUG','Replacement Price: '+replacementprice) ;
               
               // Set new Field Value
         
               nlapiSetFieldValue('custrecord_liv_bs_ns_pppm_price', Math.abs(parseFloat(bundleprice)));
               nlapiSetFieldValue('custrecord_liv_bs_ns_upfront_price', Math.abs(parseFloat(upfrontprice)));
               nlapiSetFieldValue('custrecord_liv_bs_ns_replace_price', Math.abs(parseFloat(replacementprice)));
               nlapiSetFieldValue('custrecord_liv_bs_ns_termination_price', Math.abs(parseFloat(terminationprice)));
               nlapiSetFieldValue('custrecord_liv_bs_ns_flat_term_price', Math.abs(parseFloat(flattermprice)));
               nlapiSetFieldValue('custrecord_liv_bs_ns_lt_9_mo_term_fee', Math.abs(parseFloat(lt9monthtermprice)));
               nlapiSetFieldValue('custrecord_liv_bs_ns_gte_9_mo_term_fee', Math.abs(parseFloat(gte9monthtermprice)));
           
               
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
		arrColumns.push(new nlobjSearchColumn('custentity_liv_current_enrolled')); // NS-214
		arrColumns.push(new nlobjSearchColumn('custentity_liv_capped_enrollment_no'));
		arrColumns.push(new nlobjSearchColumn('custentity_liv_client_type'));
		arrColumns.push(new nlobjSearchColumn('custentity_liv_medical_claims_billing'));
		arrColumns.push(new nlobjSearchColumn('custentity_liv_members_disc_qty'));
		arrColumns.push(new nlobjSearchColumn('custentity_liv_billing_inactive'));
		arrColumns.push(new nlobjSearchColumn('custentity_liv_repl_meter_foc_cap')); // NS-87
		/* NS-106 */
		arrColumns.push(new nlobjSearchColumn('custentity_liv_ffs_program_fee'));
		arrColumns.push(new nlobjSearchColumn('custentity_liv_ffs_upfront_fee'));
		arrColumns.push(new nlobjSearchColumn('custentity_liv_ffs_test_strips_fee'));
		arrColumns.push(new nlobjSearchColumn('custentity_liv_ffs_lancets_fee'));
		arrColumns.push(new nlobjSearchColumn('custentity_liv_ffs_lancing_device_fee'));
		arrColumns.push(new nlobjSearchColumn('custentity_liv_ffs_control_solution_fee'));
		
		//NS-159
		arrColumns.push(new nlobjSearchColumn('custentity_liv_htn_admin_fee'));
		arrColumns.push(new nlobjSearchColumn('custentity_liv_htn_program_fee'));
		arrColumns.push(new nlobjSearchColumn('custentity_liv_htn_upfront_meter_fee'));
		arrColumns.push(new nlobjSearchColumn('custentity_liv_htn_repl_meter_fee'));
		arrColumns.push(new nlobjSearchColumn('custentity_liv_htn_early_term_fee'));
		arrColumns.push(new nlobjSearchColumn('custentity_liv_combo_program_fee'));
		arrColumns.push(new nlobjSearchColumn('custentity_liv_combon_early_term_fee'));
		arrColumns.push(new nlobjSearchColumn('custentity_liv_htn_program_item_desc'));
		arrColumns.push(new nlobjSearchColumn('custentity_liv_combo_item_desc'));
		arrColumns.push(new nlobjSearchColumn('custentity_liv_combo_program_discount'));
		
		
	   
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
             var current_enrolled = custrecord.getValue('custentity_liv_current_enrolled'); //NS-214
             var cap_enrollment = custrecord.getValue('custentity_liv_capped_enrollment_no');
             var clienttype = custrecord.getText('custentity_liv_client_type');
             var medicalclaims = custrecord.getValue('custentity_liv_medical_claims_billing');
             var discactivemembers = custrecord.getValue('custentity_liv_members_disc_qty'); 
             var billinginactive = custrecord.getValue('custentity_liv_billing_inactive');
             
             var replfoccap = custrecord.getValue('custentity_liv_repl_meter_foc_cap') ; //NS-87
     
             
             /* NS-106 */
             var ffs_program_fee = custrecord.getValue('custentity_liv_ffs_program_fee');
		     var ffs_upfront_fee = custrecord.getValue('custentity_liv_ffs_upfront_fee');
		     var ffs_strips_fee = custrecord.getValue('custentity_liv_ffs_test_strips_fee');
		     var ffs_lancets_fee = custrecord.getValue('custentity_liv_ffs_lancets_fee');
		     var ffs_lancing_fee = custrecord.getValue('custentity_liv_ffs_lancing_device_fee');
		     var ffs_ctrlsol_fee = custrecord.getValue('custentity_liv_ffs_control_solution_fee');
		     /* NS-106 */
		     
		     //NS-159
		     var htnadminfee = custrecord.getValue('custentity_liv_htn_admin_fee') ;
             var htnpppmprice = custrecord.getValue('custentity_liv_htn_program_fee') ;
             var htnupfrontprice = custrecord.getValue('custentity_liv_htn_upfront_meter_fee') ;
             var htnreplacementprice = custrecord.getValue('custentity_liv_htn_repl_meter_fee') ;
             var htntermprice = custrecord.getValue('custentity_liv_htn_early_term_fee') ;
             var htnprogramdesc = custrecord.getValue('custentity_liv_htn_program_item_desc');
      
             var combpppmprice = custrecord.getValue('custentity_liv_combo_program_fee') ;
             var combtermprice = custrecord.getValue('custentity_liv_combon_early_term_fee') ;
             var combprogramdesc = custrecord.getValue('custentity_liv_combo_item_desc');
             
             var combpppmdiscount = custrecord.getValue('custentity_liv_combo_program_discount') ;
             
             
             htnprogramdesc = htnprogramdesc + ' - ' + convertdate(billing_date, 'MONTHYY') + ' ('+grouping+' )'; 
             combprogramdesc = combprogramdesc + ' - ' + convertdate(billing_date, 'MONTHYY') + ' ('+grouping+' )'; 
             
             
      
             nlapiLogExecution('DEBUG','htnadminfee:'+ htnadminfee) ;
             nlapiLogExecution('DEBUG','htnpppmprice:'+ htnpppmprice) ;
             nlapiLogExecution('DEBUG','htnupfrontprice:'+ htnupfrontprice) ;
             nlapiLogExecution('DEBUG','htnreplacementprice:'+ htnreplacementprice) ;
             nlapiLogExecution('DEBUG','htntermprice:'+ htntermprice) ;
             nlapiLogExecution('DEBUG','htnearlytermtotal:'+ htnearlytermtotal) ;
             nlapiLogExecution('DEBUG','combo discount price:'+ combpppmdiscount) ;
             //
             
             var invoicesuffix =  convertdate(billing_date, 'MMDDYY'); 
             var invoicenum = invoiceprefix+invoicesuffix;
             
             // Amount Calculation
             
             var qtycompare =  (nvl(activemembers,0) - nvl(discactivemembers,0)) ;
             if (isNaN(pppmdiscvol) || pppmdiscvol == "") 
             {
                 pppmdiscvol = 0;
             }
             
             nlapiLogExecution('DEBUG','Qtycompare : '+qtycompare) ;
             nlapiLogExecution('DEBUG','pppmdiscvol : '+pppmdiscvol) ;
             
             if (pppmdiscvol != 0)
             {
             
                 if (qtycompare > pppmdiscvol)
                 {
                     bundleprice = pppmdiscprice;
                     nlapiLogExecution('DEBUG','Inside qtycompare ') ;
             
                  }
                  
             }
             
             nlapiLogExecution('DEBUG','BundlePrice after Compare : '+bundleprice) ;
             
             //NS-214
             cap_enrollment = parseInt(nvl(cap_enrollment,0));
             current_enrolled = parseInt(nvl(current_enrolled,0));
             
             if (cap_enrollment != 0)
             {
                 if (current_enrolled > cap_enrollment)
                 {
                   //nlapiLogExecution('DEBUG','NS-214 current_enrolled : '+current_enrolled) ;
                   //nlapiLogExecution('DEBUG','NS-214 cap_enrollment : '+cap_enrollment) ;
                   var origactivemembers = activemembers;
                   activemembers = cap_enrollment ;
                   nlapiSetFieldValue('custrecord_liv_bs_active_members_qty', activemembers );
                   
                 }
             }
            
            
             
             var programamt = bundleprice * (nvl(activemembers,0) - nvl(discactivemembers,0)) ;
             var referralamt = (referralfee * (nvl(activemembers,0) - nvl(discactivemembers,0)))*-1 ;
             
             //NS-159 HTN
             var htnprogramamt = htnpppmprice * (nvl(htnactivemembers,0))  ;
             var htnreferralamt = (htnadminfee * (nvl(htnactivemembers,0)))*-1 ;
             var htnreplamt = htnreplacementprice *  nvl(htnreplmeters,0) ;
             
             var combprogramamt = combpppmprice * (nvl(combactivemembers,0))  ;
             
             var combprogdiscamt = combpppmdiscount * (nvl(combactivemembers,0)) ;
             
              nlapiLogExecution('DEBUG','combpppmdiscount : '+combpppmdiscount) ;
              nlapiLogExecution('DEBUG','combactivemembers : '+combactivemembers) ;
              nlapiLogExecution('DEBUG','combprogdiscamt : '+combprogdiscamt) ;
              nlapiLogExecution('DEBUG','discount item : '+discountitem) ;
              
             //
             

             var replfocmsg = null;
             
             nlapiLogExecution('DEBUG','Replc FOC Cap : '+replfoccap) ;
             nlapiLogExecution('DEBUG','LTD Repl Meters : '+ltdreplmeters) ;
             
             if (nvl(replfoccap,0) == 0)
             {
                nlapiLogExecution('DEBUG','nvl(replfoccap,0) == 0') ;
                var replamt = replacementprice *  nvl(replmeters,0) ;
             }
             else
             {
                 if (nvl(ltdreplmeters,0) > nvl(replfoccap,0))
                 {
                    nlapiLogExecution('DEBUG','(nvl(ltdreplmeters,0) > nvl(replfoccap,0))') ;
                    var replamt = replacementprice *  nvl(replmeters,0) ;  
                 }
                 else
                 {
                    var replamt = 0 ;
                    nlapiLogExecution('DEBUG','replacement meter is FOC') ;
                    var replfocmsg = 'Replacement meter is FOC. ||';
                 }

             }
             
          
             // NS-106 
              if (categorytext == 'Fee for Service')
              {
                 var programamt = ffs_program_fee * (nvl(activemembers,0) - nvl(discactivemembers,0)) ;
                 var upfrontamt = ffs_upfront_fee * nvl(upfrontmeters,0) ; 
                 var ffs_stripamt = ffs_strips_fee * nvl(stripsqty,0) ;
                 var ffs_lancetamt = ffs_lancets_fee * nvl(lancetsqty,0) ;
                 var ffs_lancingamt = ffs_lancing_fee * nvl(lancingqty,0) ;
                 var ffs_controlsolamt = ffs_ctrlsol_fee * nvl(controlsolqty,0);
                 
                 var totalbillingamt = (nvl(programamt,0))+ (nvl(upfrontamt,0)) + (nvl(ffs_stripamt,0)) + (nvl(ffs_lancetamt,0)) +(nvl(ffs_lancingamt,0)) + (nvl(ffs_controlsolamt,0));
              }
            

             
              if (categorytext == 'Upfront')
              {
                 var upfrontamt = upfrontprice * nvl(upfrontmeters,0) ; 
                 var htnupfrontamt = htnupfrontprice * nvl(htnupfrontmeters,0) ; 
                 
                 //var totalbillingamt = (nvl(programamt,0))+ (nvl(replamt,0)) + (nvl(referralamt,0)) + (nvl(upfrontamt,0));
                 
                 var totalbillingamt = (nvl(programamt,0))+ (nvl(replamt,0)) + (nvl(referralamt,0)) + (nvl(upfrontamt,0))+(nvl(htnprogramamt,0))+(nvl(htnreplamt,0))+(nvl(htnreferralamt,0))+(nvl(htnupfrontamt,0));

              }
              if (categorytext == 'Bundled')
              {
                 var earlytermtotal = 0;
                 var htnearlytermtotalamt = 0;
                 var combearlytermtotalamt = 0;
                 
                 var earlytermdesc = 'Early Termination : ' ;
                
               if (nvl(flattermprice,0) == 0)
                 {
                    
                  //  var gte9monthqty = nvl(earlyterm9,0)+nvl(earlyterm10,0)+nvl(earlyterm11,0)+nvl(earlyterm12,0);
                    
                    var gte9monthqty = Math.abs(parseFloat(nvl(earlyterm9,0)))+Math.abs(parseFloat(nvl(earlyterm10,0)))+Math.abs(parseFloat(nvl(earlyterm11,0)))+Math.abs(parseFloat(nvl(earlyterm12,0)));
                    
                    nlapiLogExecution('DEBUG','gte9monthqty : '+gte9monthqty) ;
                    nlapiLogExecution('DEBUG','lt9monthtermprice : '+lt9monthtermprice);
                    nlapiLogExecution('DEBUG','gte9monthtermprice : '+gte9monthtermprice);
                  
                    
                    if (lt9monthtermprice != 0)
                    {
                    var earlyterm1amt = nvl(earlyterm1,0) * nvl(lt9monthtermprice,0) ; 
                    var earlyterm2amt = (nvl(earlyterm2,0) * 2) * nvl(lt9monthtermprice,0) ; 
                    var earlyterm3amt = (nvl(earlyterm3,0) * 3) * nvl(lt9monthtermprice,0) ;
                    var earlyterm4amt = (nvl(earlyterm4,0) * 4) * nvl(lt9monthtermprice,0) ;
                    var earlyterm5amt = (nvl(earlyterm5,0) * 5) * nvl(lt9monthtermprice,0) ;
                    var earlyterm6amt = (nvl(earlyterm6,0) * 6) * nvl(lt9monthtermprice,0) ;
                    var earlyterm7amt = (nvl(earlyterm7,0) * 7) * nvl(lt9monthtermprice,0) ;
                    var earlyterm8amt = (nvl(earlyterm8,0) * 8) * nvl(lt9monthtermprice,0) ;
                    }
                    else
                    {
                       nlapiLogExecution('DEBUG','Inside Else  (lt9monthtermprice != 0)  : ');
                       var earlyterm1amt = nvl(earlyterm1,0) * nvl(terminationprice,0) ; 
                       var earlyterm2amt = (nvl(earlyterm2,0) * 2) * nvl(terminationprice,0) ; 
                       var earlyterm3amt = (nvl(earlyterm3,0) * 3) * nvl(terminationprice,0) ;
                       var earlyterm4amt = (nvl(earlyterm4,0) * 4) * nvl(terminationprice,0) ;
                       var earlyterm5amt = (nvl(earlyterm5,0) * 5) * nvl(terminationprice,0) ;
                       var earlyterm6amt = (nvl(earlyterm6,0) * 6) * nvl(terminationprice,0) ;
                       var earlyterm7amt = (nvl(earlyterm7,0) * 7) * nvl(terminationprice,0) ;
                       var earlyterm8amt = (nvl(earlyterm8,0) * 8) * nvl(terminationprice,0) ;
                       nlapiLogExecution('DEBUG','earlyterm8  : '+earlyterm8);
                       nlapiLogExecution('DEBUG','terminationprice  : '+terminationprice);
                       nlapiLogExecution('DEBUG','earlyterm8amt  : '+earlyterm8amt);
                    }
                    
                    if (gte9monthtermprice != 0)
                    {
                       /* below is a bug
                       var earlyterm9amt =  (gte9monthqty * gte9monthtermprice) ;
                       var earlyterm10amt = 0;
                       var earlyterm11amt = 0;
                       var earlyterm12amt = 0 ;    
                       */
                       //Fixed bug
                       var earlyterm9amt  =  (nvl(earlyterm9,0) * 9) * nvl(gte9monthtermprice,0) ;
                       var earlyterm10amt =  (nvl(earlyterm10,0) * 10) * nvl(gte9monthtermprice,0) ;
                       var earlyterm11amt =  (nvl(earlyterm11,0) * 11) * nvl(gte9monthtermprice,0) ;
                       var earlyterm12amt =  (nvl(earlyterm12,0) * 12) * nvl(gte9monthtermprice,0) ;
                       
                      
                       nlapiLogExecution('DEBUG','earlyterm9amt : '+earlyterm9amt);
                    }
                    else
                    {
                       nlapiLogExecution('DEBUG','Inside Else (gte9monthtermprice != 0)  : ');
                       var earlyterm9amt = (nvl(earlyterm9,0) * 9) * nvl(terminationprice,0) ;
                       var earlyterm10amt = (nvl(earlyterm10,0) * 10) * nvl(terminationprice,0) ;
                       var earlyterm11amt = (nvl(earlyterm11,0) * 11) * nvl(terminationprice,0) ;
                       var earlyterm12amt = (nvl(earlyterm12,0) * 12) * nvl(terminationprice,0) ;
                       nlapiLogExecution('DEBUG','earlyterm11  : '+earlyterm11);
                       nlapiLogExecution('DEBUG','terminationprice  : '+terminationprice);
                       nlapiLogExecution('DEBUG','earlyterm11amt  : '+earlyterm11amt);
                    }
                    
                    if (nvl(earlyterm1,0) != 0) { earlytermdesc = earlytermdesc + earlyterm1 + ' member(s).' }; //NS-220
                    
                    /* commented out NS-220
                     if (nvl(earlyterm1,0) != 0) { earlytermdesc = earlytermdesc + earlyterm1 + ' member(s) @1 mon remaining. ' };
                     if (nvl(earlyterm2,0) != 0) { earlytermdesc = earlytermdesc + earlyterm2 + ' member(s) @2 mons remaining. ' };
                     if (nvl(earlyterm3,0) != 0) { earlytermdesc = earlytermdesc + earlyterm3 + ' member(s) @3 mons remaining. ' };
                     if (nvl(earlyterm4,0) != 0) { earlytermdesc = earlytermdesc + earlyterm4 + ' member(s) @4 mons remaining. ' };
                     if (nvl(earlyterm5,0) != 0) { earlytermdesc = earlytermdesc + earlyterm5 + ' member(s) @5 mons remaining. ' };
                     if (nvl(earlyterm6,0) != 0) { earlytermdesc = earlytermdesc + earlyterm6 + ' member(s) @6 mons remaining. ' };
                     if (nvl(earlyterm7,0) != 0) { earlytermdesc = earlytermdesc + earlyterm7 + ' member(s) @7 mons remaining. ' };
                     if (nvl(earlyterm8,0) != 0) { earlytermdesc = earlytermdesc + earlyterm8 + ' member(s) @8 mons remaining. ' };
                     if (nvl(earlyterm9,0) != 0) { earlytermdesc = earlytermdesc + earlyterm9 + ' member(s) @9 mons remaining. ' };
                     if (nvl(earlyterm10,0) != 0) { earlytermdesc = earlytermdesc + earlyterm10 + ' member(s) @10 mons remaining. ' };
                     if (nvl(earlyterm11,0) != 0) { earlytermdesc = earlytermdesc + earlyterm11 + ' member(s) @11 mons remaining. ' };
                     if (nvl(earlyterm12,0) != 0) { earlytermdesc = earlytermdesc + earlyterm12 + ' member(s) @12 mons remaining. ' };
                    */
                    
                }
                else
                {
                    var earlyterm1amt = nvl(totalearlyterm,0) * nvl(flattermprice,0) ; 
                    var earlyterm2amt = 0;
                    var earlyterm3amt = 0;
                    var earlyterm4amt = 0;
                    var earlyterm5amt = 0;
                    var earlyterm6amt = 0;
                    var earlyterm7amt = 0;
                    var earlyterm8amt = 0;
                    var earlyterm9amt = 0;
                    var earlyterm10amt = 0;
                    var earlyterm11amt = 0;
                    var earlyterm12amt = 0 ;     
                    earlytermdesc = nvl(totalearlyterm,0)+' early termination member(s) @$'+nvl(flattermprice,0);
                             
                }
                
                //NS-159 HTN
                
                if (nvl(htnearlytermtotal,0) != 0)
                {
                    var htnearlytermdesc = 'Hypertension Early Termination : ' ;
                    nlapiLogExecution('DEBUG','Inside (nvl(htnearlytermtotal,0) != 0) ');
                    nlapiLogExecution('DEBUG','htntermprice : '+htntermprice);
                    var htnearlyterm1amt = nvl(htnearlyterm1,0) * nvl(htntermprice,0) ; 
                    var htnearlyterm2amt = (nvl(htnearlyterm2,0) * 2) * nvl(htntermprice,0) ; 
                    var htnearlyterm3amt = (nvl(htnearlyterm3,0) * 3) * nvl(htntermprice,0) ;
                    var htnearlyterm4amt = (nvl(htnearlyterm4,0) * 4) * nvl(htntermprice,0) ;
                    var htnearlyterm5amt = (nvl(htnearlyterm5,0) * 5) * nvl(htntermprice,0) ;
                    var htnearlyterm6amt = (nvl(htnearlyterm6,0) * 6) * nvl(htntermprice,0) ;
                    var htnearlyterm7amt = (nvl(htnearlyterm7,0) * 7) * nvl(htntermprice,0) ;
                    var htnearlyterm8amt = (nvl(htnearlyterm8,0) * 8) * nvl(htntermprice,0) ;
                    var htnearlyterm9amt = (nvl(htnearlyterm9,0) * 9) * nvl(htntermprice,0) ;
                    var htnearlyterm10amt = (nvl(htnearlyterm10,0) * 10) * nvl(htntermprice,0) ;
                    var htnearlyterm11amt = (nvl(htnearlyterm11,0) * 11) * nvl(htntermprice,0) ;
                    var htnearlyterm12amt = (nvl(htnearlyterm12,0) * 12) * nvl(htntermprice,0) ;
                    
                    if (nvl(htnearlyterm1,0) != 0) { htnearlytermdesc = htnearlytermdesc + htnearlyterm1 + ' member(s).' }; //NS-220
                    
                    /* Commented out NS-220
                    if (nvl(htnearlyterm1,0) != 0) { htnearlytermdesc = htnearlytermdesc + htnearlyterm1 + ' member(s) @1 mon remaining. ' };
                    if (nvl(htnearlyterm2,0) != 0) { htnearlytermdesc = htnearlytermdesc + htnearlyterm2 + ' member(s) @2 mons remaining. ' };
                    if (nvl(htnearlyterm3,0) != 0) { htnearlytermdesc = htnearlytermdesc + htnearlyterm3 + ' member(s) @3 mons remaining. ' };
                    if (nvl(htnearlyterm4,0) != 0) { htnearlytermdesc = htnearlytermdesc + htnearlyterm4 + ' member(s) @4 mons remaining. ' };
                    if (nvl(htnearlyterm5,0) != 0) { htnearlytermdesc = htnearlytermdesc + htnearlyterm5 + ' member(s) @5 mons remaining. ' };
                    if (nvl(htnearlyterm6,0) != 0) { htnearlytermdesc = htnearlytermdesc + htnearlyterm6 + ' member(s) @6 mons remaining. ' };
                    if (nvl(htnearlyterm7,0) != 0) { htnearlytermdesc = htnearlytermdesc + htnearlyterm7 + ' member(s) @7 mons remaining. ' };
                    if (nvl(htnearlyterm8,0) != 0) { htnearlytermdesc = htnearlytermdesc + htnearlyterm8 + ' member(s) @8 mons remaining. ' };
                    if (nvl(htnearlyterm9,0) != 0) { htnearlytermdesc = htnearlytermdesc + htnearlyterm9 + ' member(s) @9 mons remaining. ' };
                    if (nvl(htnearlyterm10,0) != 0) { htnearlytermdesc = htnearlytermdesc + htnearlyterm10 + ' member(s) @10 mons remaining. ' };
                    if (nvl(htnearlyterm11,0) != 0) { htnearlytermdesc = htnearlytermdesc + htnearlyterm11 + ' member(s) @11 mons remaining. ' };
                    if (nvl(htnearlyterm12,0) != 0) { htnearlytermdesc = htnearlytermdesc + htnearlyterm12 + ' member(s) @12 mons remaining. ' };
                    */
                    
                    htnearlytermtotalamt = htnearlyterm1amt+htnearlyterm2amt+htnearlyterm3amt+htnearlyterm4amt+htnearlyterm5amt+htnearlyterm6amt+htnearlyterm7amt+htnearlyterm8amt+htnearlyterm9amt+htnearlyterm10amt+htnearlyterm11amt+htnearlyterm12amt;

                }
                if (nvl(combearlytermtotal,0) != 0)
                {
                    var combearlytermdesc = 'Diabetes/Hypertension Early Termination : ' ;
                    nlapiLogExecution('DEBUG','Inside (nvl(comboearlytermtotal,0) != 0) ');
                    nlapiLogExecution('DEBUG','combtermprice : '+combtermprice);
                    
                    var combearlyterm1amt = nvl(combearlyterm1,0) * nvl(combtermprice,0) ; 
                    var combearlyterm2amt = (nvl(combearlyterm2,0) * 2) * nvl(combtermprice,0) ; 
                    var combearlyterm3amt = (nvl(combearlyterm3,0) * 3) * nvl(combtermprice,0) ;
                    var combearlyterm4amt = (nvl(combearlyterm4,0) * 4) * nvl(combtermprice,0) ;
                    var combearlyterm5amt = (nvl(combearlyterm5,0) * 5) * nvl(combtermprice,0) ;
                    var combearlyterm6amt = (nvl(combearlyterm6,0) * 6) * nvl(combtermprice,0) ;
                    var combearlyterm7amt = (nvl(combearlyterm7,0) * 7) * nvl(combtermprice,0) ;
                    var combearlyterm8amt = (nvl(combearlyterm8,0) * 8) * nvl(combtermprice,0) ;
                    var combearlyterm9amt = (nvl(combearlyterm9,0) * 9) * nvl(combtermprice,0) ;
                    var combearlyterm10amt = (nvl(combearlyterm10,0) * 10) * nvl(combtermprice,0) ;
                    var combearlyterm11amt = (nvl(combearlyterm11,0) * 11) * nvl(combtermprice,0) ;
                    var combearlyterm12amt = (nvl(combearlyterm12,0) * 12) * nvl(combtermprice,0) ;
                    
                    if (nvl(combearlyterm1,0) != 0) { combearlytermdesc = combearlytermdesc + combearlyterm1 + ' member(s).' };
                    
                    /* commented out NS-220
                    if (nvl(combearlyterm1,0) != 0) { combearlytermdesc = combearlytermdesc + combearlyterm1 + ' member(s) @1 mon remaining. ' };
                    if (nvl(combearlyterm2,0) != 0) { combearlytermdesc = combearlytermdesc + combearlyterm2 + ' member(s) @2 mons remaining. ' };
                    if (nvl(combearlyterm3,0) != 0) { combearlytermdesc = combearlytermdesc + combearlyterm3 + ' member(s) @3 mons remaining. ' };
                    if (nvl(combearlyterm4,0) != 0) { combearlytermdesc = combearlytermdesc + combearlyterm4 + ' member(s) @4 mons remaining. ' };
                    if (nvl(combearlyterm5,0) != 0) { combearlytermdesc = combearlytermdesc + combearlyterm5 + ' member(s) @5 mons remaining. ' };
                    if (nvl(combearlyterm6,0) != 0) { combearlytermdesc = combearlytermdesc + combearlyterm6 + ' member(s) @6 mons remaining. ' };
                    if (nvl(combearlyterm7,0) != 0) { combearlytermdesc = combearlytermdesc + combearlyterm7 + ' member(s) @7 mons remaining. ' };
                    if (nvl(combearlyterm8,0) != 0) { combearlytermdesc = combearlytermdesc + combearlyterm8 + ' member(s) @8 mons remaining. ' };
                    if (nvl(combearlyterm9,0) != 0) { combearlytermdesc = combearlytermdesc + combearlyterm9 + ' member(s) @9 mons remaining. ' };
                    if (nvl(combearlyterm10,0) != 0) { combearlytermdesc = combearlytermdesc + combearlyterm10 + ' member(s) @10 mons remaining. ' };
                    if (nvl(combearlyterm11,0) != 0) { combearlytermdesc = combearlytermdesc + combearlyterm11 + ' member(s) @11 mons remaining. ' };
                    if (nvl(combearlyterm12,0) != 0) { combearlytermdesc = combearlytermdesc + combearlyterm12 + ' member(s) @12 mons remaining. ' };
                    */
                    
                    combearlytermtotalamt = combearlyterm1amt+combearlyterm2amt+combearlyterm3amt+combearlyterm4amt+combearlyterm5amt+combearlyterm6amt+combearlyterm7amt+combearlyterm8amt+combearlyterm9amt+combearlyterm10amt+combearlyterm11amt+combearlyterm12amt;
 					nlapiLogExecution('DEBUG','combearlytermtotalamt : '+combearlytermtotalamt);
                
                }
            
                //
                
                 
                 earlytermtotal = earlyterm1amt+earlyterm2amt+earlyterm3amt+earlyterm4amt+earlyterm5amt+earlyterm6amt+earlyterm7amt+earlyterm8amt+earlyterm9amt+earlyterm10amt+earlyterm11amt+earlyterm12amt;

                // var totalbillingamt = (nvl(programamt,0))+ (nvl(replamt,0)) + (nvl(referralamt,0)) + (nvl(earlytermtotal,0))+(nvl(htnprogramamt,0))+(nvl(htnreplamt,0))+(nvl(htnupfrontamt,0))+(nvl(htnreferralamt,0))+(nvl(htnearlytermtotalamt,0))+(nvl(combprogramamt,0))+(nvl(combearlytermtotalamt,0));
                 var totalbillingamt = (nvl(programamt,0))+ (nvl(replamt,0)) + (nvl(referralamt,0)) + (nvl(earlytermtotal,0))+(nvl(htnprogramamt,0))+(nvl(htnreplamt,0))+(nvl(htnupfrontamt,0))+(nvl(htnreferralamt,0))+(nvl(htnearlytermtotalamt,0))+(nvl(combprogdiscamt,0));
                
                 nlapiLogExecution('DEBUG','(nvl(programamt,0)) : '+(nvl(programamt,0)));
                 nlapiLogExecution('DEBUG','(nvl(replamt,0)) : '+(nvl(replamt,0)));
                 nlapiLogExecution('DEBUG','(nvl(referralamt,0)) : '+(nvl(referralamt,0)));
                 nlapiLogExecution('DEBUG','(nvl(earlytermtotal,0)) : '+(nvl(earlytermtotal,0)));
                 nlapiLogExecution('DEBUG','(nvl(htnprogramamt,0)) : '+(nvl(htnprogramamt,0)));
                 nlapiLogExecution('DEBUG','(nvl(htnreplamt,0)) : '+(nvl(htnreplamt,0)));
                 nlapiLogExecution('DEBUG','(nvl(htnupfrontamt,0)) : '+(nvl(htnupfrontamt,0)));
                 nlapiLogExecution('DEBUG','(nvl(htnearlytermtotalamt,0)) : '+(nvl(htnearlytermtotalamt,0)));
                 nlapiLogExecution('DEBUG','(nvl(htnreferralamt,0)) : '+(nvl(htnreferralamt,0)));
                 nlapiLogExecution('DEBUG','(nvl(combprogramamt,0)) : '+(nvl(combprogramamt,0)));
                 nlapiLogExecution('DEBUG','(nvl(htnearlytermtotalamt,0)) : '+(nvl(htnearlytermtotalamt,0)));
                 nlapiLogExecution('DEBUG','(nvl(combprogdiscamt,0)) : '+(nvl(combprogdiscamt,0)));
                 
              }
            
             
             // Check Billing Exceptions
             var billingexceptions = '||';
             
             if (replfocmsg)
             {
                billingexceptions = billingexceptions + replfocmsg ; //NS-87
                nlapiLogExecution('DEBUG','billingexceptions after replfocmsg : '+billingexceptions) ;
                nlapiSetFieldValue('custrecord_liv_bs_ns_billing_exceptions', billingexceptions );
                nlapiSetFieldValue('custrecord_liv_bs_repl_meter_qty', 0 ); //101718

             }
             
             
             if (billinginactive == 'T')
             {
                nlapiSetFieldValue('custrecord_liv_bs_ns_billable','F');
                billingexceptions = 'Customer is flagged as inactive for billing. || '
                nlapiSetFieldValue('custrecord_liv_bs_ns_billing_exceptions', billingexceptions );
             }
             
             if (totalbillingamt == 0)
             {
                nlapiSetFieldValue('custrecord_liv_bs_ns_billable','F');
                billingexceptions = billingexceptions + 'Total billing amount is zero. || ' ;
                nlapiSetFieldValue('custrecord_liv_bs_ns_billing_exceptions', billingexceptions );
             }
            
             
            /* Commented out NS-214 
             // 090617 // if (cum_enrollment > cap_enrollment && cap_enrollment != 0)
             if (nvl(activemembers,0) > cap_enrollment && cap_enrollment != 0)
             {
                billingexceptions = billingexceptions + 'Enrollment cap exceeded. || '; 
                nlapiSetFieldValue('custrecord_liv_bs_ns_billing_exceptions', billingexceptions );
             }
             */
             if (nvl(current_enrolled,0) > cap_enrollment && cap_enrollment != 0)
             {
                billingexceptions = billingexceptions + 'Enrollment cap exceeded - '+ cap_enrollment + '. ' + 'Use cap as billing quantity.  Platform billable active members : '+origactivemembers+'.|| '; 
                nlapiSetFieldValue('custrecord_liv_bs_ns_billing_exceptions', billingexceptions );
             }
            
             if (clienttype == 'Internal' || clienttype == 'Direct to Consumer (D2C)')
             {
                nlapiSetFieldValue('custrecord_liv_bs_ns_billable','F');
             }
           
           /* NS-106  
             if (categorytext == 'Fee for Service')
             {
                nlapiSetFieldValue('custrecord_liv_bs_ns_billable','F');
                billingexceptions = billingexceptions + 'Fee for Service client will be manually billed. || '
                nlapiSetFieldValue('custrecord_liv_bs_ns_billing_exceptions', billingexceptions );
             }
            */
             
             /* NETSUITE-68
             nlapiLogExecution('DEBUG', 'VALUE', 'Medical Claims: '+medicalclaims);
             if (medicalclaims == 'T')
             {
                nlapiSetFieldValue('custrecord_liv_bs_ns_billable','F');
                billingexceptions = billingexceptions + 'Not billable - medical claims billing. || ' 
                nlapiSetFieldValue('custrecord_liv_bs_ns_billing_exceptions', billingexceptions);
             }
             */
             
              nlapiLogExecution('DEBUG', 'VALUE', 'Record Type: '+recordtype);
              
             if (recordtype == 'Sales Tax')
             {
                nlapiSetFieldValue('custrecord_liv_bs_ns_billable','F');
                billingexceptions = billingexceptions + 'Sales Tax Reporting' 
                nlapiSetFieldValue('custrecord_liv_bs_ns_billing_exceptions', billingexceptions);
                nlapiSetFieldValue('custrecord_liv_bs_ns_internal_id',-9999);
             }
             

             if (clientcode == 'JTEKT')
             {
                 programdesc = cleanString(grouping);
             }
             else
             {
                 programdesc = programdesc + ' - ' + convertdate(billing_date, 'MONTHYY') + ' ('+grouping+' )'; 
             }
             
              nlapiLogExecution('DEBUG', 'VALUE', 'Active Members: '+activemembers);
              nlapiLogExecution('DEBUG', 'VALUE', 'Referral Fee: '+referralfee);
              nlapiLogExecution('DEBUG', 'VALUE', 'Referral Amt: '+referralamt);
              nlapiLogExecution('DEBUG', 'VALUE', 'Prog Desc : '+programdesc);
              nlapiLogExecution('DEBUG', 'VALUE', 'Client Code : '+clientcode);
  
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
              nlapiSetFieldValue('custrecord_liv_bs_ns_total_billing_amt',totalbillingamt );
              
              // NS-106
              nlapiSetFieldValue('custrecord_liv_bs_ns_ffs_lancets_amt',ffs_lancetamt );
              nlapiSetFieldValue('custrecord_liv_bs_ns_ffs_strips_amt', ffs_stripamt );
              nlapiSetFieldValue('custrecord_liv_bs_ns_ffs_lancing_amt',ffs_lancingamt );
              nlapiSetFieldValue('custrecord_liv_bs_ns_ffs_control_sol_amt',ffs_controlsolamt );
              
              //NS-159
              nlapiSetFieldValue('custrecord_liv_bs_ns_htn_admin_fee_amt', htnreferralamt );
              nlapiSetFieldValue('custrecord_liv_bs_ns_htn_program_amt', htnprogramamt );
              nlapiSetFieldValue('custrecord_liv_bs_htn_upfront_amt', htnupfrontamt );
              nlapiSetFieldValue('custrecord_liv_bs_ns_htn_replacement_amt', htnreplamt );
              nlapiSetFieldValue('custrecord_liv_bs_ns_htn_term_amt', htnearlytermtotalamt );
              
              nlapiSetFieldValue('custrecord_liv_bs_ns_cb_program_amt', combprogramamt );
              nlapiSetFieldValue('custrecord_liv_bs_ns_cb_term_amt', combearlytermtotalamt );
              nlapiSetFieldValue('custrecord_liv_bs_htn_program_desc', htnprogramdesc );
              nlapiSetFieldValue('custrecord_liv_bs_cb_program_desc', combprogramdesc );
              nlapiSetFieldValue('custrecord_liv_bs_ns_htn_term_item_desc',htnearlytermdesc );
              nlapiSetFieldValue('custrecord_liv_bs_ns_cb_term_item_desc',combearlytermdesc );
              
              nlapiSetFieldValue('custrecord_liv_bs_cb_pppm_discount_amt', combprogdiscamt );
              
              
              
              
             // nlapiSetFieldValue('custrecord_liv_bs_ns_termination_desc',earlytermdesc );
            
          
        
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
   
function cleanString(input) 
{
    var output = "";
    for (var i=0; i<input.length; i++) {
        if (input.charCodeAt(i) <= 127) {
            output += input.charAt(i);
        }
    }
    return output;
}
   
   
   
   

   