//last update date: 111618 - NS-236 - Billing Summary V2
//113018 - move contract number to custom col field
//121418 - fixed bug with htn meter item desc and htn replc meter item
//121818 - NS-249 - HTN admin fee and bundled admin fee
//010919 - NS-259 - bug fix : billing summary record id not populated on invoice record / HTN Standalone referral amt
//012419 - NS-269 - tag in Salesforce Opportunity ID to invoice line	
//021319 - NS-287 - support bundle discount %


function CreateInvoice()
{
 try
 {
  //Search custom billing summary
  
  var arrFilter = new Array(); 
  var arrColumns = new Array(); 
  
  var pdate = nlapiGetContext().getSetting('SCRIPT', 'custscript_liv_date2');
  
  arrFilter[0] = new nlobjSearchFilter('custrecord_bs2_ns_internal_id', null, 'isempty',  'null' ); 
  arrFilter[1] = new nlobjSearchFilter('custrecord_bs2_billable', null, 'is',  'T' ); 
  arrFilter[2] = new nlobjSearchFilter('custrecord_bs2_date', null, 'on',  pdate ); 
  //arrFilter[3] = new nlobjSearchFilter('custrecord_bs2_client_code', null, 'is',  'ASSAABLOY' ); 
  
  
  //Define search columns

  arrColumns.push(new nlobjSearchColumn('internalid'));
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_billable'));
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_ns_customer').setSort(false));
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_ns_invoice_number').setSort(false));
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_client_code').setSort(false));  
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_grouping').setSort(false)); 
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_ns_current_po'));
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_ns_category'));
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_date'));
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_active_members_qty'));
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_ns_members_disc_qty'));
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_upfront_meter_qty'));
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_repl_meter_qty'));
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_lapsed_members_qty')); 
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_ns_min_participation'));
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_early_term_total'));
  //arrColumns.push(new nlobjSearchColumn('custrecord_liv_bs2_early_term_1mon'));
  //arrColumns.push(new nlobjSearchColumn('custrecord_liv_bs_early_term_2mon'));
  //arrColumns.push(new nlobjSearchColumn('custrecord_liv_bs_early_term_3mon'));
  //arrColumns.push(new nlobjSearchColumn('custrecord_liv_bs_early_term_4mon'));
  //arrColumns.push(new nlobjSearchColumn('custrecord_liv_bs_early_term_5mon'));
  //arrColumns.push(new nlobjSearchColumn('custrecord_liv_bs_early_term_6mon'));
  //arrColumns.push(new nlobjSearchColumn('custrecord_liv_bs_early_term_7mon'));
  //arrColumns.push(new nlobjSearchColumn('custrecord_liv_bs_early_term_8mon'));
  //arrColumns.push(new nlobjSearchColumn('custrecord_liv_bs_early_term_9mon'));
  //arrColumns.push(new nlobjSearchColumn('custrecord_liv_bs_early_term_10mon'));
  //arrColumns.push(new nlobjSearchColumn('custrecord_liv_bs_early_term_11mon'));
  //arrColumns.push(new nlobjSearchColumn('custrecord_liv_bs_early_term_12mon'));
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_ns_ovr_active_members'));
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_ns_ovr_upfront_meter'));
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_ns_ovr_repl_meter'));
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_ns_ovr_lapsed_members'));
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_ns_program_item'));
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_ns_program_desc'));
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_ns_pppm_price'));
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_ns_program_amt'));
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_ns_upfront_item'));
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_ns_upfront_desc'));
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_ns_upfront_price'));
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_ns_upfront_amt'));
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_ns_replacement_item'));
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_ns_replc_desc'));
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_ns_replace_price'));
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_ns_replacement_amt'));
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_ns_termination_item'));
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_ns_termination_desc'));
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_ns_termination_price'));
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_ns_termination_amt'));
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_ns_referral_fee_item'));
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_ns_referral_fee_desc'));
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_ns_referral_fee'));
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_ns_referral_fee_amt'));
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_ns_show_lapsed_users'));
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_ns_lapsed_users_item'));
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_ns_lapsed_users_desc'));
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_ns_total_billing_amt'));
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_ns_billing_inactive'));
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_ns_payment_term'));
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_ns_create_cm_fee'));
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_ns_subsidiary'));  
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_ns_currency'));    
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_active_members_qty_sum'));    
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_ns_pppm_discount_vol'));    
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_ns_pppm_discount_price'));    
 
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_strip_units_qty'));
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_lancet_units_qty'));
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_lancing_devices_qty'));
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_control_solutions_qty'));
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_ffs_program_fee'));
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_ffs_upfront_meter_fee'));
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_ffs_lancets_fee'));
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_ns_ffs_lancets_amt'));
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_ffs_test_strips_fee'));
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_ns_ffs_strips_amt'));
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_ns_ffs_lancing_amt'));
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_ffs_ctrl_solution_fee'));
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_ns_ffs_control_sol_amt')); 
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_ns_strips_item'));
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_ns_strips_item_desc'));
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_ns_lancets_item'));
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_ns_lancets_item_desc'));
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_ns_lancing_item'));
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_ns_lancing_item_desc'));
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_ns_ctrlsol_item'));
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_ns_ctrlsol_item_desc'));

  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_htn_active_members_qty'));
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_ns_htn_pppm_price'));
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_ns_htn_program_amt'));
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_ns_htn_program_item'));
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_htn_program_desc'));
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_ns_htn_repl_meter_qty'));
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_ns_htn_replace_price'));
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_ns_htn_replacement_amt'));
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_ns_htn_repl_item'));
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_ns_htn_repl_item_desc'));
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_htn_upfront_meter_qty'));
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_ns_htn_upfront_price'));
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_htn_upfront_amt'));
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_ns_htn_upfront_item'));
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_htn_only_active_members_q'));
  
  
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_htn_early_term_total'));
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_ns_htn_term_price'));
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_ns_htn_term_amt'));
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_ns_htn_early_term_1mon'));
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_ns_htn_upfront_item_d'));
//  arrColumns.push(new nlobjSearchColumn('custrecord_liv_bs_ns_htn_early_term_2mon'));
//  arrColumns.push(new nlobjSearchColumn('custrecord_liv_bs_ns_htn_early_term_3mon'));
//  arrColumns.push(new nlobjSearchColumn('custrecord_liv_bs_ns_htn_early_term_4mon'));
//  arrColumns.push(new nlobjSearchColumn('custrecord_liv_bs_ns_htn_early_term_5mon'));
//  arrColumns.push(new nlobjSearchColumn('custrecord_liv_bs_ns_htn_early_term_6mon'));
//  arrColumns.push(new nlobjSearchColumn('custrecord_liv_bs_ns_htn_early_term_7mon'));
//  arrColumns.push(new nlobjSearchColumn('custrecord_liv_bs_ns_htn_early_term_8mon'));
//  arrColumns.push(new nlobjSearchColumn('custrecord_liv_bs_ns_htn_early_term_9mon'));
//  arrColumns.push(new nlobjSearchColumn('custrecord_liv_bs_ns_htn_early_term_10mo'));
//  arrColumns.push(new nlobjSearchColumn('custrecord_liv_bs_ns_htn_early_term_11mo'));
//  arrColumns.push(new nlobjSearchColumn('custrecord_liv_bs_ns_htn_early_term_12mo'));

  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_ns_htn_term_item'));
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_ns_htn_term_item_desc'));
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_cb_active_members_qty'));
  
 // arrColumns.push(new nlobjSearchColumn('custrecord_liv_bs_ns_cb_pppm_price'));
 // arrColumns.push(new nlobjSearchColumn('custrecord_liv_bs_ns_cb_program_amt'));
 // arrColumns.push(new nlobjSearchColumn('custrecord_liv_bs_ns_cb_program_item'));
 // arrColumns.push(new nlobjSearchColumn('custrecord_liv_bs_cb_program_desc'));
 // arrColumns.push(new nlobjSearchColumn('custrecord_liv_bs_cb_early_term_total'));
 // arrColumns.push(new nlobjSearchColumn('custrecord_liv_bs_ns_cb_term_price'));
 // arrColumns.push(new nlobjSearchColumn('custrecord_liv_bs_ns_cb_term_amt'));
 // arrColumns.push(new nlobjSearchColumn('custrecord_liv_bs_ns_cb_early_term_1mon'));
 // arrColumns.push(new nlobjSearchColumn('custrecord_liv_bs_ns_cb_early_term_2mon'));
 // arrColumns.push(new nlobjSearchColumn('custrecord_liv_bs_ns_cb_early_term_3mon'));
 // arrColumns.push(new nlobjSearchColumn('custrecord_liv_bs_ns_cb_early_term_5mon'));
 // arrColumns.push(new nlobjSearchColumn('custrecord_liv_bs_ns_cb_early_term_6mon'));
 // arrColumns.push(new nlobjSearchColumn('custrecord_liv_bs_ns_cb_early_term_7mon'));
 // arrColumns.push(new nlobjSearchColumn('custrecord_liv_bs_ns_cb_early_term_8mon'));
 // arrColumns.push(new nlobjSearchColumn('custrecord_liv_bs_ns_cb_early_term_9mon'));
 // arrColumns.push(new nlobjSearchColumn('custrecord_liv_bs_ns_cb_early_term_10mon'));
 // arrColumns.push(new nlobjSearchColumn('custrecord_liv_bs_ns_cb_early_term_11mon'));
 // arrColumns.push(new nlobjSearchColumn('custrecord_liv_bs_ns_cb_early_term_12mon'));
 //arrColumns.push(new nlobjSearchColumn('custrecord_liv_bs_ns_cb_term_item'));
 //arrColumns.push(new nlobjSearchColumn('custrecord_liv_bs_ns_cb_term_item_desc'));
 
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_ns_htn_admin_fee'));
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_ns_htn_admin_fee_amt'));
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_cb_discount_item'));
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_cb_pppm_discount_price'));
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_cb_bundled_discount_pct'));  //NS-287
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_dmhtn_program_amt'));  //NS-287
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_cb_pppm_discount_amt'));
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_ns_bundled_admin_fee'));    //NS-249
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_ns_bundled_admin_fee_amt')); //NS-249
  
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_ns_bill_to_customer')); 
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_contract_number')); 
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_contract_id')); 
  
  // Tax line
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_create_tax_line')); 
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_tax_amount')); 
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_tax_rate')); 
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_tax_item')); 
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_tax_item_desc')); 
  
  //NS-269
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_sf_opportunity_id')); 



  var previousinvoice = null ;
  var firstline = false ;
  var editinvoice = false;
  var recordid = 0;
  var invoiceid = 0;
  var previousinvoiceid = 0;
  
  var arrResult = nlapiSearchRecord('customrecord_liv_billing_summary_v2', null, arrFilter, arrColumns);

  if(arrResult)
  {
    for (var i = 0;  i < arrResult.length; i++)

      {
             var customrecord = arrResult[i];
             currentinvoice = customrecord.getValue('custrecord_bs2_ns_invoice_number');
             recordid = customrecord.getValue('internalid');
            
             
             if (i == 0) //first record
             {
                 previousinvoice = customrecord.getValue('custrecord_bs2_ns_invoice_number');
                 firstline = true;
                 invoiceid = createInvoiceRec(customrecord, editinvoice, null, firstline) ;        
                 previousinvoiceid = invoiceid ;   
             }
             else
             {
                if (currentinvoice == previousinvoice)
                {
                // Find created invoice number and flag edit invoice
   
                   firstline = false;
                   editinvoice = true ;
                   
                   invoiceid = createInvoiceRec(customrecord,editinvoice, previousinvoiceid,firstline) ; 
                   previousinvoiceid = invoiceid ;     
                   
                   editinvoice = false;    
                
                }
                else
                {
  
                  // create for next invoice
                   previousinvoice = currentinvoice;
                   firstline = true;
                   invoiceid = createInvoiceRec(customrecord, editinvoice, null, firstline) ; 
                   previousinvoiceid = invoiceid ;  
                
                }
            
            
             
             } //end else
            
             nlapiLogExecution('DEBUG', 'VALUE', 'Processing arrResult: '+i +' of '+arrResult.length);

             // Get the remaining usage points of the scripts
             var usage = nlapiGetContext().getRemainingUsage();

            // If the script's remaining usage points are bellow 1,000 ...       
             if (usage < 1000) 
             {
	           // ...yield the script
	           var state = nlapiYieldScript();
	            // Throw an error or log the yield results
	           if (state.status == 'FAILURE')
		          throw "Failed to yield script";
	              else if (state.status == 'RESUME')
		          nlapiLogExecution('DEBUG','Resuming script');
              }
   

       } //end for loop
    } // arrResult
  }catch(error) 
  {
	   if (error.getDetails != undefined) 
	   {
		   nlapiLogExecution('DEBUG', 'Process Error for Billing Summary Internal ID : '+recordid, error.getCode() + ': ' + error.getDetails());
		   throw nlapiCreateError('Create Invoice','',recordid,error.getCode(), error.toString());
	   }
	   else 
	   {    	
			nlapiLogExecution('DEBUG', 'Unexpected Error for Billing Summary Internal ID : '+recordid, error.toString());
			throw nlapiCreateError('Create Invoice ','',+recordid,'Undefined Error Code', error.toString());
	   }
  }
} // end function CreateInvoice

function createInvoiceRec(customrecord, editinvoice, previousinvoiceid, firstline)
/********************************************************************************************/
/*** Purpose: Create Invoice Record function                                              ***/
/********************************************************************************************/
{
	nlapiLogExecution('DEBUG', 'ACTIVITY', 'createInvoiceRec Started...');
	    
	    var today = new Date();
	    var recordid = customrecord.getValue('internalid');
	    var customerid = customrecord.getValue('custrecord_bs2_ns_customer');
	    var invoicenum = customrecord.getValue('custrecord_bs2_ns_invoice_number');
        var trxdate = customrecord.getValue('custrecord_bs2_date'); 
        var showlapsed = customrecord.getValue('custrecord_bs2_ns_show_lapsed_users');
        var po = customrecord.getValue('custrecord_bs2_ns_current_po'); 
        var category = customrecord.getText('custrecord_bs2_ns_category');
        var activemembers = customrecord.getValue('custrecord_bs2_active_members_qty');
        var discactivemembers = customrecord.getValue('custrecord_bs2_ns_members_disc_qty'); 
        var upfrontmeters = customrecord.getValue('custrecord_bs2_upfront_meter_qty') ;
        var replmeters = customrecord.getValue('custrecord_bs2_repl_meter_qty') ;
        var lapsedmembers = customrecord.getValue('custrecord_bs2_lapsed_members_qty') ;
        var earlytermtotal = customrecord.getValue('custrecord_bs2_early_term_total') ;
        var ovractivemembers = customrecord.getValue('custrecord_bs2_ns_ovr_active_members');
        var ovrupfrontmeters = customrecord.getValue('custrecord_bs2_ns_ovr_upfront_meter');
        var ovrreplmeters = customrecord.getValue('custrecord_bs2_ns_ovr_repl_meter');
        var ovrlapsedmembers = customrecord.getValue('custrecord_bs2_ns_ovr_lapsed_members');
        var totalbillingamt = customrecord.getValue('custrecord_bs2_ns_total_billing_amt');
        var terms = customrecord.getValue('custrecord_bs2_ns_payment_term');
        var createcmfee = customrecord.getValue('custrecord_bs2_ns_create_cm_fee');
        var subsidiary = customrecord.getValue('custrecord_bs2_ns_subsidiary');   
        var currency = customrecord.getValue('custrecord_bs2_ns_currency');       
        var activememberssum = customrecord.getValue('custrecord_bs2_active_members_qty_sum');       
        var pppmdiscvol = customrecord.getValue('custrecord_bs2_ns_pppm_discount_vol');       
        var pppmdiscprice = customrecord.getValue('custrecord_bs2_ns_pppm_discount_price');   
        var sfopporid = customrecord.getValue('custrecord_bs2_sf_opportunity_id'); //NS-269
           
        
        var pppmprice = customrecord.getValue('custrecord_bs2_ns_pppm_price'); 
        var replprice = customrecord.getValue('custrecord_bs2_ns_replace_price'); 
        var upfrontprice = customrecord.getValue('custrecord_bs2_ns_upfront_price');
        
        var contractnumber = customrecord.getValue('custrecord_bs2_contract_number');
        var contractid = customrecord.getValue('custrecord_bs2_contract_id');
      
        // FFS
        var ffsprogfee = customrecord.getValue('custrecord_bs2_ffs_program_fee');
        var stripsqty =  customrecord.getValue('custrecord_bs2_strip_units_qty');
        var stripsamt =  customrecord.getValue('custrecord_bs2_ns_ffs_strips_amt');
        var lancetsqty =  customrecord.getValue('custrecord_bs2_lancet_units_qty');
        var lancetsamt =  customrecord.getValue('custrecord_bs2_ns_ffs_lancets_amt');
        var lancingqty =  customrecord.getValue('custrecord_bs2_lancing_devices_qty');
        var lancingamt =  customrecord.getValue('custrecord_bs2_ns_ffs_lancing_amt');
        var ctrlsolqty =  customrecord.getValue('custrecord_bs2_control_solutions_qty');
        var ctrlsolamt =  customrecord.getValue('custrecord_bs2_ns_ffs_control_sol_amt');
      
        var  clientcode = customrecord.getValue('custrecord_bs2_client_code'); 
        
       
        var htnearlytermtotal = customrecord.getValue('custrecord_bs2_htn_early_term_total') ;
       // var cbearlytermtotal = customrecord.getValue('custrecord_bs2_cb_early_term_total') ;
       
       //Tax Line
        var createtaxline = customrecord.getValue('custrecord_bs2_create_tax_line') ;
        var taxamount = customrecord.getValue('custrecord_bs2_tax_amount') ;
        var taxrate = customrecord.getValue('custrecord_bs2_tax_rate') ;
        var taxitem = customrecord.getValue('custrecord_bs2_tax_item') ;
        var taxitemdesc = customrecord.getValue('custrecord_bs2_tax_item_desc') ;
        
        
       
        var billtocustomerid = customrecord.getValue('custrecord_bs2_ns_bill_to_customer') ;
        if (!billtocustomerid)
        {  
            billtocustomerid = customerid ;
        }
        var soldtocustomerid = customerid ;
        
        nlapiLogExecution('DEBUG', 'VALUE', 'Bill To Customer ID : '+ billtocustomerid);
 	    nlapiLogExecution('DEBUG', 'VALUE', 'Sold To Customer ID : '+ soldtocustomerid);
        
   
        // Program Item
        var progitem = customrecord.getValue('custrecord_bs2_ns_program_item'); 
        var progdesc = customrecord.getValue('custrecord_bs2_ns_program_desc'); 

        if (nvl(ovractivemembers,0) > 0 )
        {
           var progqty = nvl(ovractivemembers,0) - nvl(discactivemembers,0) ;
        }
        
        if (nvl(ovractivemembers,0) == 0 )   
        {
           var progqty = nvl(activemembers,0) - nvl(discactivemembers,0) ;
        }
      
        //HTN
        var htnprogitem = customrecord.getValue('custrecord_bs2_ns_htn_program_item'); 
        var htnprogdesc = customrecord.getValue('custrecord_bs2_htn_program_desc'); 
        var htnprogqty = customrecord.getValue('custrecord_bs2_htn_active_members_qty'); 
        var htnpppmprice = customrecord.getValue('custrecord_bs2_ns_htn_pppm_price'); 
        
    
        
        
        //var cbprogitem = customrecord.getValue('custrecord_liv_bs_ns_cb_program_item'); 
        //var cbprogdesc = customrecord.getValue('custrecord_liv_bs_cb_program_desc'); 
        var cbprogqty = customrecord.getValue('custrecord_bs2_cb_active_members_qty');
        //var cbpppmprice = customrecord.getValue('custrecord_liv_bs_ns_cb_pppm_price');
        
        //  
        var cbdiscountamt = customrecord.getValue('custrecord_bs2_cb_pppm_discount_amt') ;
        var cbdiscountprice = customrecord.getValue('custrecord_bs2_cb_pppm_discount_price') ;
        var cbdiscountpct = customrecord.getValue('custrecord_bs2_cb_bundled_discount_pct') ; //NS-287
        var cbdiscountitem = customrecord.getValue('custrecord_bs2_cb_discount_item') ;

        var cbdmhtnprogamt = customrecord.getValue('custrecord_bs2_dmhtn_program_amt') ; //NS-287
        
      
        
        //NS-159 End
        
     
        // Replacement Meter
        var replitem = customrecord.getValue('custrecord_bs2_ns_replacement_item'); 
        var repldesc = customrecord.getValue('custrecord_bs2_ns_replc_desc'); 
        
      
        var htnreplitem = customrecord.getValue('custrecord_bs2_ns_htn_repl_item'); 
        var htnrepldesc = customrecord.getValue('custrecord_bs2_ns_htn_repl_item_desc'); 
        var htnreplqty = customrecord.getValue('custrecord_bs2_ns_htn_repl_meter_qty'); 
        var htnreplprice = customrecord.getValue('custrecord_bs2_ns_htn_replace_price');
        
        
     
        if (nvl(ovrreplmeters,0) > 0 )
        {
           var replqty = nvl(ovrreplmeters,0)  ;
           nlapiLogExecution('DEBUG', 'VALUE', 'if replqty: '+replqty);
        }
        
       
        if (nvl(ovrreplmeters,0) == 0 )   
        {
           var replqty = nvl(replmeters,0)  ;
        }
   
        
              
        // Referral Fee
        var referralitem = customrecord.getValue('custrecord_bs2_ns_referral_fee_item'); 
        var referraldesc = customrecord.getValue('custrecord_bs2_ns_referral_fee_desc'); 
        var referralrate = customrecord.getValue('custrecord_bs2_ns_referral_fee');
        
        
        var htnreferralitem = customrecord.getValue('custrecord_bs2_ns_referral_fee_item'); 
        var htnreferraldesc = customrecord.getValue('custrecord_bs2_ns_referral_fee_desc'); 
        var htnreferralrate = customrecord.getValue('custrecord_bs2_ns_htn_admin_fee');
        var htnreferralamt = customrecord.getValue('custrecord_bs2_ns_htn_admin_fee_amt');
        //var htnreferralqty = customrecord.getValue('custrecord_bs2_htn_active_members_qty');  //259
        var htnreferralqty = customrecord.getValue('custrecord_bs2_htn_only_active_members_q');  //259
        
        
        //NS-249
        var bundledreferralitem = customrecord.getValue('custrecord_bs2_ns_referral_fee_item'); 
        var bundledreferraldesc = customrecord.getValue('custrecord_bs2_ns_referral_fee_desc'); 
        var bundledreferralrate = customrecord.getValue('custrecord_bs2_ns_bundled_admin_fee');
        var bundledreferralamt = customrecord.getValue('custrecord_bs2_ns_bundled_admin_fee_amt');
        var bundledreferralqty = customrecord.getValue('custrecord_bs2_cb_active_members_qty');

        
        
        if (nvl(ovractivemembers,0) > 0 )
        {
           var referralqty = nvl(ovractivemembers,0) - nvl(discactivemembers,0) ;
        }
        
        if (nvl(ovractivemembers,0) == 0 )   
        {
           var referralqty = nvl(activemembers,0) - nvl(discactivemembers,0) ;
        }
   
        // Lapsed 
   	       var lapseditem = customrecord.getValue('custrecord_bs2_ns_lapsed_users_item'); 
           var lapseddesc = customrecord.getValue('custrecord_bs2_ns_lapsed_users_desc'); 
   
        if (nvl(ovrlapsedmembers,0) > 0 )
        {
           var lapsedqty = nvl(ovrlapsedmembers,0) 
        }
        
        if (nvl(ovrlapsedmembers,0) == 0 )   
        {
           var lapsedqty = nvl(lapsedmembers,0)  ;
        }
   
   
   
        nlapiLogExecution('DEBUG', 'VALUE', 'Record ID: '+recordid);
        nlapiLogExecution('DEBUG', 'VALUE', 'Date: '+trxdate);
        nlapiLogExecution('DEBUG', 'VALUE', 'Invoice #: '+invoicenum);
        nlapiLogExecution('DEBUG', 'VALUE', 'Category: '+category);
        nlapiLogExecution('DEBUG', 'VALUE', 'Show Lapsed Users: '+showlapsed);
        nlapiLogExecution('DEBUG', 'VALUE', 'Lapsed Item: '+lapseditem);
        nlapiLogExecution('DEBUG', 'VALUE', 'Lapsed Qty: '+lapsedqty);
        nlapiLogExecution('DEBUG', 'VALUE', 'Active Members Qty: '+nvl(activemembers,0));
        nlapiLogExecution('DEBUG', 'VALUE', 'Overwrite Active Members Qty: '+nvl(ovractivemembers,0));
        nlapiLogExecution('DEBUG', 'VALUE', 'Discount Active Members Qty: '+nvl(discactivemembers,0));
        nlapiLogExecution('DEBUG', 'VALUE', 'Program Qty: '+ Math.abs(parseFloat(progqty)));
        nlapiLogExecution('DEBUG', 'VALUE', 'Replacement Qty: '+ nvl(replqty,0));
        nlapiLogExecution('DEBUG', 'VALUE', 'Referral Qty: '+ nvl(referralqty,0));
        nlapiLogExecution('DEBUG', 'VALUE', 'Terms: '+ terms);

        
        
        if (editinvoice == false)
        {
	       var record = nlapiCreateRecord('invoice', {recordmode:'dynamic'});
	       nlapiLogExecution('DEBUG', 'VALUE', 'Total Billing Amt: '+ totalbillingamt);
	    }
	    else
	    {
	        var record = nlapiLoadRecord('invoice', previousinvoiceid) ;
	    }
	    
	    
		try
		{
		
		 if (nvl(totalbillingamt,0) > 0)
	     {  
	        // Set Field Value for Invoice Header
	        nlapiLogExecution('DEBUG', 'VALUE', 'Inside Total Billing Amt: '+ totalbillingamt);
	        
	        if ((firstline == true) && (editinvoice == false))
	        {
	            nlapiLogExecution('DEBUG', 'VALUE', 'Inside Firstline : '+ firstline);
	            nlapiLogExecution('DEBUG', 'VALUE', 'Bill To Customer ID : '+ billtocustomerid);
 	            nlapiLogExecution('DEBUG', 'VALUE', 'Sold To Customer ID : '+ soldtocustomerid);
	        
	            record.setFieldValue('tranid', invoicenum);
	            record.setFieldValue('externalid', invoicenum);
	            record.setFieldValue('trandate', formatDate(trxdate));
	            //record.setFieldValue('entity', customerid); 
	             record.setFieldValue('entity', billtocustomerid);  //NS-218
	            record.setFieldValue('custbody_liv_sold_to_customer', soldtocustomerid);  //NS-218
	            
	            record.setFieldValue('otherrefnum',po);
	            record.setFieldValue('terms', terms) ;
	            record.setFieldValue('subsidiary',subsidiary);  //ns-62
 	            record.setFieldValue('currency',currency);      //ns-62
 	            record.setFieldValue('custbody_liv_bs2_record_id',recordid); //ns-259
 	            //record.setFieldValue('custbody_liv_so_contract_number',contractnumber);
 	            //record.setFieldValue('custbody_liv_contract_id',contractid);
 	            
 	            
 	            
 	           
	        }
	        
	        
	        // Program Item
            if (nvl(progqty,0) > 0)
            {
            
            
             if (category == 'Fee for Service')
             {
                pppmprice = ffsprogfee ;
             }
            
               record.selectNewLineItem('item');
	           record.setCurrentLineItemValue('item','item',progitem); 
               record.setCurrentLineItemValue('item', 'description', progdesc);
               record.setCurrentLineItemValue('item', 'quantity', progqty);
               record.setCurrentLineItemText('item', 'price', 'Custom'); 
               record.setCurrentLineItemValue('item', 'rate', pppmprice);   
               record.setCurrentLineItemText('item', 'custcol_liv_invoice_client_code', clientcode); 
               record.setCurrentLineItemValue('item', 'custcol_liv_sol_contract_number', contractnumber);
               record.setCurrentLineItemValue('item', 'custcol_liv_sf_opportunity_id', sfopporid);  //NS-269
               
               
               
               nlapiLogExecution('DEBUG', 'VALUE', 'inside (nvl(progqty,0) > 0) : '+ progitem);
 
               
               
               if ( (nvl(activememberssum,0) > nvl(pppmdiscvol,0)) && (nvl(pppmdiscvol,0) != 0) )
               {
                  
                  var newamt = nvl(pppmdiscprice,0) * progqty ;
                  
                  nlapiLogExecution('DEBUG', 'VALUE', 'activememberssum > pppmdiscvol, price: '+ pppmdiscprice);
                  nlapiLogExecution('DEBUG', 'VALUE', 'activememberssum > pppmdiscvol, newamt: '+ newamt);
                  nlapiLogExecution('DEBUG', 'VALUE', 'inside (nvl(progqty,0) > 0) : '+ progitem);
                  record.setCurrentLineItemText('item', 'price', 'Custom'); 
                  record.setCurrentLineItemValue('item', 'rate', pppmdiscprice);
                  record.setCurrentLineItemValue('item', 'amount', Math.abs(parseFloat(newamt)));
                  
               }
               record.commitLineItem('item');
               nlapiLogExecution('DEBUG', 'VALUE', 'After commit line item : ');
            }
             
            if (nvl(htnprogqty,0) > 0)
            {
               nlapiLogExecution('DEBUG', 'VALUE', 'HTN Program Item : ');
               record.selectNewLineItem('item');
	           record.setCurrentLineItemValue('item','item',htnprogitem); 
               record.setCurrentLineItemValue('item', 'description', htnprogdesc);
               record.setCurrentLineItemValue('item', 'quantity', htnprogqty);
               record.setCurrentLineItemText('item', 'price', 'Custom'); //101718
               record.setCurrentLineItemValue('item', 'rate', htnpppmprice);
               record.setCurrentLineItemText('item', 'custcol_liv_invoice_client_code', clientcode); 
               record.setCurrentLineItemValue('item', 'custcol_liv_sol_contract_number', contractnumber);
               record.setCurrentLineItemValue('item', 'custcol_liv_sf_opportunity_id', sfopporid);  //NS-269
               record.commitLineItem('item');
            }
            
            // commented out to use discount item
            /*
            // NS159 - Combo Program Item
            if (nvl(cbprogqty,0) > 0)
            {
               nlapiLogExecution('DEBUG', 'VALUE', 'Combo Program Item : ');
               record.selectNewLineItem('item');
	           record.setCurrentLineItemValue('item','item',cbprogitem); 
               record.setCurrentLineItemValue('item', 'description', cbprogdesc);
               record.setCurrentLineItemValue('item', 'quantity', cbprogqty);
               record.setCurrentLineItemValue('item', 'rate', cbpppmprice);
               record.setCurrentLineItemText('item', 'custcol_liv_invoice_client_code', clientcode); // NS-140
               record.commitLineItem('item');
            }
            */
            
            // bundle discount item
             if (nvl(cbprogqty,0) > 0)
            {
               nlapiLogExecution('DEBUG', 'VALUE', 'CB Discount Program Item : '+cbdiscountitem);
               nlapiLogExecution('DEBUG', 'VALUE', 'CB Qty : '+cbprogqty);
               nlapiLogExecution('DEBUG', 'VALUE', 'CB Rate : '+cbdiscountprice);
               nlapiLogExecution('DEBUG', 'VALUE', 'CB Discount % : '+cbdiscountpct);
               
               
               var unitprice = nvl((cbdiscountprice * -1),0);
               nlapiLogExecution('DEBUG', 'VALUE', 'Unit price : ' +unitprice ) ;
               
              // if (nvl(cbdiscountprice,'NA') != 'NA')
               if (cbdiscountprice != 0)
               {
                  var cbdmhtndesc = 'Program Bundle Discount' ;
                  //var unitprice = (cbdiscountprice * -1);
                  nlapiLogExecution('DEBUG', 'VALUE', 'CB Rate : '+cbdiscountprice);
                  cbdmhtnprogamt = null; //set grossamt to zero
                  
                  record.selectNewLineItem('item');
	              record.setCurrentLineItemValue('item','item',cbdiscountitem); 
                  record.setCurrentLineItemValue('item', 'description', cbdmhtndesc); //NS-287
                  record.setCurrentLineItemValue('item', 'quantity', cbprogqty);
                  record.setCurrentLineItemText('item', 'price', 'Custom'); 
                  record.setCurrentLineItemValue('item', 'rate', unitprice);
                  record.setCurrentLineItemValue('item', 'amount', cbdiscountamt);  //NS-287
                  record.setCurrentLineItemText('item', 'custcol_liv_invoice_client_code', clientcode); 
                  record.setCurrentLineItemValue('item', 'custcol_liv_sol_contract_number', contractnumber);
                  record.setCurrentLineItemValue('item', 'custcol_liv_sf_opportunity_id', sfopporid);  //NS-269
                  record.commitLineItem('item');
               }
               else
               {    
                  var cbdmhtndesc = 'Program Bundle Discount '+cbdiscountpct+'%.' ;
                  var base = 100;
                  var unitprice = (cbdiscountpct/base).toFixed(2) ;

                  
                  record.selectNewLineItem('item');
	              record.setCurrentLineItemValue('item','item',cbdiscountitem); 
                  record.setCurrentLineItemValue('item', 'description', cbdmhtndesc); //NS-287
                  record.setCurrentLineItemValue('item', 'quantity', cbprogqty);
                  record.setCurrentLineItemText('item', 'price', 'Custom'); 
                  record.setCurrentLineItemValue('item', 'rate', unitprice);
                  record.setCurrentLineItemValue('item', 'amount', cbdiscountamt);  //NS-287
                  record.setCurrentLineItemText('item', 'custcol_liv_invoice_client_code', clientcode); 
                  record.setCurrentLineItemValue('item', 'custcol_liv_sol_contract_number', contractnumber);
                  record.setCurrentLineItemValue('item', 'custcol_liv_sf_opportunity_id', sfopporid);  //NS-269
                  record.setCurrentLineItemValue('item', 'custcol_liv_gross_amount',cbdmhtnprogamt );  //NS-269
                  record.commitLineItem('item');
               }        
/*
               record.selectNewLineItem('item');
	           record.setCurrentLineItemValue('item','item',cbdiscountitem); 
               //record.setCurrentLineItemValue('item', 'description', 'Program Bundle Discount'); //NS-287
               record.setCurrentLineItemValue('item', 'description', cbdmhtndesc); //NS-287
               record.setCurrentLineItemValue('item', 'quantity', cbprogqty);
               record.setCurrentLineItemText('item', 'price', 'Custom'); 
               //record.setCurrentLineItemValue('item', 'rate', (cbdiscountprice * -1)); //NS-287
               record.setCurrentLineItemValue('item', 'rate', unitprice);
               record.setCurrentLineItemValue('item', 'amount', cbdiscountamt);  //NS-287
               record.setCurrentLineItemText('item', 'custcol_liv_invoice_client_code', clientcode); 
               record.setCurrentLineItemValue('item', 'custcol_liv_sol_contract_number', contractnumber);
               record.setCurrentLineItemValue('item', 'custcol_liv_sf_opportunity_id', sfopporid);  //NS-269
               record.setCurrentLineItemValue('item', 'custcol_liv_gross_amount',cbdmhtnprogamt );  //NS-269
               record.commitLineItem('item');
*/
            }
            

            
            // Replacement Item
            if (nvl(replqty,0) > 0)
            {
                nlapiLogExecution('DEBUG', 'VALUE', 'Replacement Item: '+replitem);
                nlapiLogExecution('DEBUG', 'VALUE', 'Replacement Qty: '+replqty);
                nlapiLogExecution('DEBUG', 'VALUE', 'Replacement rate: '+replprice);
                nlapiLogExecution('DEBUG', 'VALUE', 'Replacement Qty: '+replqty);
                
                record.selectNewLineItem('item');
	            record.setCurrentLineItemValue('item','item',replitem); 
                record.setCurrentLineItemValue('item', 'description', repldesc);
                record.setCurrentLineItemValue('item', 'quantity', replqty);
                record.setCurrentLineItemText('item', 'price', 'Custom'); 
                record.setCurrentLineItemValue('item', 'rate', replprice); 
                record.setCurrentLineItemText('item', 'custcol_liv_invoice_client_code', clientcode); 
                record.setCurrentLineItemValue('item', 'custcol_liv_sol_contract_number', contractnumber);
                record.setCurrentLineItemValue('item', 'custcol_liv_sf_opportunity_id', sfopporid);  //NS-269
                record.commitLineItem('item'); 
            }
                        
            // NS159 HTN Replacement Item
            if (nvl(htnreplqty,0) > 0)
            {
                nlapiLogExecution('DEBUG', 'VALUE', 'HTN Replacement Item : ');
                record.selectNewLineItem('item');
	            record.setCurrentLineItemValue('item','item',htnreplitem); 
                record.setCurrentLineItemValue('item', 'description', htnrepldesc);
                record.setCurrentLineItemValue('item', 'quantity', htnreplqty);
                record.setCurrentLineItemText('item', 'price', 'Custom'); 
                record.setCurrentLineItemValue('item', 'rate', htnreplprice ); 
                record.setCurrentLineItemText('item', 'custcol_liv_invoice_client_code', clientcode); 
                record.setCurrentLineItemValue('item', 'custcol_liv_sol_contract_number', contractnumber);
                record.setCurrentLineItemValue('item', 'custcol_liv_sf_opportunity_id', sfopporid);  //NS-269
                record.commitLineItem('item'); 
            }
          
	        
	        if (category == 'Bundled')
	        {
	          // Termination
	          nlapiLogExecution('DEBUG', 'VALUE', 'Inside Bundled Category (Termination): '+category);

   
                if (nvl(earlytermtotal,0) > 0)
                {
                   nlapiLogExecution('DEBUG', 'VALUE', 'Bundled Early Term : ');
                	          
	               var termitem = customrecord.getValue('custrecord_bs2_ns_termination_item'); 
                   var termdesc = customrecord.getValue('custrecord_bs2_ns_termination_desc'); 
                   var termamt = customrecord.getValue('custrecord_bs2_ns_termination_amt');
                   
                   record.selectNewLineItem('item');
                   nlapiLogExecution('DEBUG', 'VALUE', 'Term Id : '+termitem);
                   
	               record.setCurrentLineItemValue('item','item',termitem); 
                   record.setCurrentLineItemValue('item', 'description', termdesc);
                   record.setCurrentLineItemValue('item', 'quantity', earlytermtotal);
                   record.setCurrentLineItemValue('item', 'amount', Math.abs(parseFloat(termamt)));
                   record.setCurrentLineItemText('item', 'custcol_liv_invoice_client_code', clientcode); 
                   record.setCurrentLineItemValue('item', 'custcol_liv_sol_contract_number', contractnumber);
                   record.setCurrentLineItemValue('item', 'custcol_liv_sf_opportunity_id', sfopporid);  //NS-269
                   record.commitLineItem('item'); 
                }
                
               
                if (nvl(htnearlytermtotal,0) > 0)
                {
                
                   nlapiLogExecution('DEBUG', 'VALUE', 'HTN Early Term : ');	          
	               var htntermitem = customrecord.getValue('custrecord_bs2_ns_htn_term_item'); 
                   var htntermdesc = customrecord.getValue('custrecord_bs2_ns_htn_term_item_desc'); 
                   var htntermamt = customrecord.getValue('custrecord_bs2_ns_htn_term_amt');
                   
                   record.selectNewLineItem('item');
	               record.setCurrentLineItemValue('item','item',htntermitem); 
                   record.setCurrentLineItemValue('item', 'description', htntermdesc);
                   record.setCurrentLineItemValue('item', 'quantity', htnearlytermtotal);
                   record.setCurrentLineItemValue('item', 'amount', Math.abs(parseFloat(htntermamt)));
                   record.setCurrentLineItemText('item', 'custcol_liv_invoice_client_code', clientcode); 
                   record.setCurrentLineItemValue('item', 'custcol_liv_sol_contract_number', contractnumber);
                   record.setCurrentLineItemValue('item', 'custcol_liv_sf_opportunity_id', sfopporid);  //NS-269
                   record.commitLineItem('item'); 
                }
                
                /* commented out - no charge for early term - use discount item
                //NS-159 - Combo
                if (nvl(cbearlytermtotal,0) > 0)
                {
                   nlapiLogExecution('DEBUG', 'VALUE', 'Combo Early Term : ');
                	          
	               var cbtermitem = customrecord.getValue('custrecord_liv_bs_ns_cb_term_item'); 
                   var cbtermdesc = customrecord.getValue('custrecord_liv_bs_ns_cb_term_item_desc'); 
                   var cbtermamt = customrecord.getValue('custrecord_liv_bs_ns_cb_term_amt');
                   
                   record.selectNewLineItem('item');
	               record.setCurrentLineItemValue('item','item',cbtermitem); 
                   record.setCurrentLineItemValue('item', 'description', cbtermdesc);
                   record.setCurrentLineItemValue('item', 'quantity', cbearlytermtotal);
                   record.setCurrentLineItemValue('item', 'amount', Math.abs(parseFloat(cbtermamt)));
                   record.setCurrentLineItemText('item', 'custcol_liv_invoice_client_code', clientcode); // NS-140
                   record.commitLineItem('item'); 
                }
                */

            } // end if category = 'Bundled'
	        
	        
	        if (category == 'Upfront')
	        {
	        // Upfront Meter
	           
	           var upfrontqty = customrecord.getValue('custrecord_bs2_upfront_meter_qty'); 
	           var upfrontitem = customrecord.getValue('custrecord_bs2_ns_upfront_item'); 
               var upfrontdesc = customrecord.getValue('custrecord_bs2_ns_upfront_desc');  
                 
	          if (nvl(upfrontqty,0) > 0)
	          { 
	             nlapiLogExecution('DEBUG', 'VALUE', 'Inside Upfront Category: '+category);
	            
             
   
                 if (nvl(ovrupfrontmeters,0) > 0 )
                 {
                   //var upfrontqty = nvl(ovrupfrontmeters,0) 
                   upfrontqty = nvl(ovrupfrontmeters,0) ;
                 }
        
                 if (nvl(ovrupfrontmeters,0) == 0 )   
                 {
                    //var upfrontqty = nvl(upfrontmeters,0)  ;
                    upfrontqty = nvl(upfrontmeters,0)  ;
                 }
                 nlapiLogExecution('DEBUG', 'VALUE', 'Upfront Meter Qty : '+upfrontqty);
                 nlapiLogExecution('DEBUG', 'VALUE', 'Upfront Meter Desc : '+upfrontdesc);
                 
                 
                 record.selectNewLineItem('item');
	             record.setCurrentLineItemValue('item','item',upfrontitem); 
                 record.setCurrentLineItemValue('item', 'description', upfrontdesc);
                 record.setCurrentLineItemValue('item', 'quantity', upfrontqty);
                 record.setCurrentLineItemText('item', 'price', 'Custom'); 
                 record.setCurrentLineItemValue('item', 'rate', upfrontprice ); 
                 record.setCurrentLineItemText('item', 'custcol_liv_invoice_client_code', clientcode); 
                 record.setCurrentLineItemValue('item', 'custcol_liv_sol_contract_number', contractnumber);
                 record.setCurrentLineItemValue('item', 'custcol_liv_sf_opportunity_id', sfopporid);  //NS-269
                 record.commitLineItem('item'); 
              }
              
               var htnupfrontqty = customrecord.getValue('custrecord_bs2_htn_upfront_meter_qty'); 
	           var htnupfrontitem = customrecord.getValue('custrecord_bs2_ns_htn_upfront_item'); 
               var htnupfrontdesc = customrecord.getValue('custrecord_bs2_ns_htn_upfront_item_d');  
               var htnupfrontprice = customrecord.getValue('custrecord_bs2_ns_htn_upfront_price');  
              
              if (nvl(htnupfrontqty,0) > 0)
	          { 
	             nlapiLogExecution('DEBUG', 'VALUE', 'Inside HTN Upfront Category: '+category);
	             nlapiLogExecution('DEBUG', 'VALUE', 'HTN Upfront Desc: '+htnupfrontdesc);
                 
                 record.selectNewLineItem('item');
	             record.setCurrentLineItemValue('item','item',htnupfrontitem); 
                 record.setCurrentLineItemValue('item', 'description', htnupfrontdesc);
                 record.setCurrentLineItemValue('item', 'quantity', htnupfrontqty);
                 record.setCurrentLineItemText('item', 'price', 'Custom'); 
                 record.setCurrentLineItemValue('item', 'rate', htnupfrontprice ); 
                 record.setCurrentLineItemText('item', 'custcol_liv_invoice_client_code', clientcode); 
                 record.setCurrentLineItemValue('item', 'custcol_liv_sol_contract_number', contractnumber);
                 record.setCurrentLineItemValue('item', 'custcol_liv_sf_opportunity_id', sfopporid);  //NS-269
                 record.commitLineItem('item'); 
              }
            
              
	        
	        } // end if category = 'Upfront'
	        
	        
	        if (category == 'Fee for Service') //NS-106
	        {
	        // Fee for Service
	         nlapiLogExecution('DEBUG', 'VALUE', 'Inside FFS Category: '+category);
	           

               if (nvl(ovrupfrontmeters,0) > 0 )
               {
                   var upfrontqty = nvl(ovrupfrontmeters,0) 
               }
        
               if (nvl(ovrupfrontmeters,0) == 0 )   
               {
                   var upfrontqty = nvl(upfrontmeters,0)  ;
               }
               
               if (upfrontqty != 0)
               {
                var upfrontitem = customrecord.getValue('custrecord_bs2_ns_upfront_item'); 
                var upfrontdesc = customrecord.getValue('custrecord_bs2_ns_upfront_desc'); 
                var upfrontfee = customrecord.getValue('custrecord_bs2_ffs_upfront_meter_fee'); 
                var upfrontamt = customrecord.getValue('custrecord_bs2_ns_upfront_amt'); 
                
                nlapiLogExecution('DEBUG', 'VALUE', 'FFS Upfront Meter : ');
                record.selectNewLineItem('item');
	            record.setCurrentLineItemValue('item','item',upfrontitem); 
                record.setCurrentLineItemValue('item', 'description', upfrontdesc);
                record.setCurrentLineItemValue('item', 'quantity', upfrontqty);
                record.setCurrentLineItemText('item', 'price', 'Custom'); //101718
                record.setCurrentLineItemValue('item', 'rate', upfrontfee);
                record.setCurrentLineItemValue('item', 'amount', Math.abs(parseFloat(upfrontamt)));
                record.setCurrentLineItemText('item', 'custcol_liv_invoice_client_code', clientcode); // NS-140
                record.setCurrentLineItemValue('item', 'custcol_liv_sol_contract_number', contractnumber);
                record.setCurrentLineItemValue('item', 'custcol_liv_sf_opportunity_id', sfopporid);  //NS-269
                record.commitLineItem('item'); 
                }
                
                if (nvl(stripsqty,0) != 0)
               {
               
                var stripsitem = customrecord.getValue('custrecord_bs2_ns_strips_item'); 
                var stripsdesc = customrecord.getValue('custrecord_bs2_ns_strips_item_desc'); 
                var stripsfee = customrecord.getValue('custrecord_bs2_ffs_test_strips_fee'); 
                nlapiLogExecution('DEBUG', 'VALUE', 'FFS Strip : ');
                record.selectNewLineItem('item');
	            record.setCurrentLineItemValue('item','item',stripsitem); 
                record.setCurrentLineItemValue('item', 'description', stripsdesc);
                record.setCurrentLineItemValue('item', 'quantity', stripsqty);
                record.setCurrentLineItemText('item', 'price', 'Custom'); 
                record.setCurrentLineItemValue('item', 'rate', stripsfee);
                record.setCurrentLineItemValue('item', 'amount', Math.abs(parseFloat(stripsamt)));
                record.setCurrentLineItemText('item', 'custcol_liv_invoice_client_code', clientcode); 
                record.setCurrentLineItemValue('item', 'custcol_liv_sol_contract_number', contractnumber);
                record.setCurrentLineItemValue('item', 'custcol_liv_sf_opportunity_id', sfopporid);  //NS-269
                record.commitLineItem('item'); 
                }
                
                if (nvl(lancetsqty,0) != 0)
               {
               
                var lancetsitem = customrecord.getValue('custrecord_bs2_ns_lancets_item'); 
                var lancetsdesc = customrecord.getValue('custrecord_bs2_ns_lancets_item_desc'); 
                var lancetsfee = customrecord.getValue('custrecord_bs2_ffs_lancets_fee'); 
                nlapiLogExecution('DEBUG', 'VALUE', 'FFS Lancet : ');
                record.selectNewLineItem('item');
	            record.setCurrentLineItemValue('item','item',lancetsitem); 
                record.setCurrentLineItemValue('item', 'description', lancetsdesc);
                record.setCurrentLineItemValue('item', 'quantity', lancetsqty);
                record.setCurrentLineItemText('item', 'price', 'Custom'); //101718
                record.setCurrentLineItemValue('item', 'rate', lancetsfee);
                record.setCurrentLineItemValue('item', 'amount', Math.abs(parseFloat(lancetsamt)));
                record.setCurrentLineItemText('item', 'custcol_liv_invoice_client_code', clientcode); // NS-140
                record.setCurrentLineItemValue('item', 'custcol_liv_sol_contract_number', contractnumber);
                record.setCurrentLineItemValue('item', 'custcol_liv_sf_opportunity_id', sfopporid);  //NS-269
                record.commitLineItem('item'); 
                }
                
               if (nvl(lancingqty,0) != 0)
               {
               
                var lancingitem = customrecord.getValue('custrecord_bs2_ns_lancing_item'); 
                var lancingdesc = customrecord.getValue('custrecord_bs2_ns_lancing_item_desc'); 
                var lancingfee = customrecord.getValue('custrecord_bs2_ffs_lancing_device_fee'); 
                nlapiLogExecution('DEBUG', 'VALUE', 'FFS Lancing : ');
                record.selectNewLineItem('item');
	            record.setCurrentLineItemValue('item','item',lancingitem); 
                record.setCurrentLineItemValue('item', 'description', lancingdesc);
                record.setCurrentLineItemValue('item', 'quantity', lancingqty);
                record.setCurrentLineItemText('item', 'price', 'Custom'); 
                record.setCurrentLineItemValue('item', 'rate', lancingfee);
                record.setCurrentLineItemValue('item', 'amount', Math.abs(parseFloat(lancingamt)));
                record.setCurrentLineItemText('item', 'custcol_liv_invoice_client_code', clientcode); 
                record.setCurrentLineItemValue('item', 'custcol_liv_sol_contract_number', contractnumber);
                record.setCurrentLineItemValue('item', 'custcol_liv_sf_opportunity_id', sfopporid);  //NS-269
                record.commitLineItem('item'); 
                }
                
               if (nvl(ctrlsolqty,0) != 0)
               {
               
                var ctrlsolitem = customrecord.getValue('custrecord_bs2_ns_ctrlsol_item'); 
                var ctrlsoldesc = customrecord.getValue('custrecord_bs2_ns_ctrlsol_item_desc'); 
                var ctrlsolfee = customrecord.getValue('custrecord_bs2_ffs_ctrl_solution_fee'); 
                nlapiLogExecution('DEBUG', 'VALUE', 'FFS Control Sol : ');
                record.selectNewLineItem('item');
	            record.setCurrentLineItemValue('item','item',ctrlsolitem); 
                record.setCurrentLineItemValue('item', 'description', ctrlsoldesc);
                record.setCurrentLineItemValue('item', 'quantity', ctrlsolqty);
                record.setCurrentLineItemText('item', 'price', 'Custom'); 
                record.setCurrentLineItemValue('item', 'rate', ctrlsolfee);
                record.setCurrentLineItemValue('item', 'amount', Math.abs(parseFloat(ctrlsolamt)));
                record.setCurrentLineItemText('item', 'custcol_liv_invoice_client_code', clientcode); 
                record.setCurrentLineItemValue('item', 'custcol_liv_sol_contract_number', contractnumber);
                record.setCurrentLineItemValue('item', 'custcol_liv_sf_opportunity_id', sfopporid);  //NS-269
                record.commitLineItem('item'); 
                }
    
	        
	        } // end if category = 'Fee for Service'
	        
	          // Referral Item
            if (nvl(referralqty,0) > 0 && referralrate > 0 && createcmfee == 'F')
            {
                nlapiLogExecution('DEBUG', 'VALUE', 'Referral : ');
                referraldesc = referraldesc + ' - Diabetes Management' ;
                record.selectNewLineItem('item');
	            record.setCurrentLineItemValue('item','item',referralitem); 
                record.setCurrentLineItemValue('item', 'description', referraldesc);
                record.setCurrentLineItemValue('item', 'quantity', referralqty);
                record.setCurrentLineItemText('item', 'price', 'Custom'); 
                record.setCurrentLineItemValue('item', 'rate', (referralrate * -1));
                record.setCurrentLineItemText('item', 'custcol_liv_invoice_client_code', clientcode); 
                record.setCurrentLineItemValue('item', 'custcol_liv_sol_contract_number', contractnumber);
                record.setCurrentLineItemValue('item', 'custcol_liv_sf_opportunity_id', sfopporid);  //NS-269
                record.commitLineItem('item'); 
            }
            
            // NS-159 - Referral Item
            if (nvl(htnreferralqty,0) > 0 && htnreferralrate > 0 )
            {
                nlapiLogExecution('DEBUG', 'VALUE', 'HTN Referral : ');
                htnreferraldesc = htnreferraldesc + ' - Hypertension' ;
                record.selectNewLineItem('item');
	            record.setCurrentLineItemValue('item','item',htnreferralitem); 
                record.setCurrentLineItemValue('item', 'description', htnreferraldesc);
                record.setCurrentLineItemValue('item', 'quantity', htnreferralqty);
                record.setCurrentLineItemText('item', 'price', 'Custom'); 
                record.setCurrentLineItemValue('item', 'rate', (htnreferralrate * -1));
                record.setCurrentLineItemText('item', 'custcol_liv_invoice_client_code', clientcode); 
                record.setCurrentLineItemValue('item', 'custcol_liv_sol_contract_number', contractnumber);
                record.setCurrentLineItemValue('item', 'custcol_liv_sf_opportunity_id', sfopporid);  //NS-269
                record.commitLineItem('item'); 
            }
            
            // NS-249 - bundled htn admin fee
            if (nvl(bundledreferralqty,0) > 0 && bundledreferralrate > 0 )
            {
                nlapiLogExecution('DEBUG', 'VALUE', 'Bundled Referral : ');
                bundledreferraldesc = bundledreferraldesc + ' - Diabetes Management & Hypertension' ;
                record.selectNewLineItem('item');
	            record.setCurrentLineItemValue('item','item',bundledreferralitem); 
                record.setCurrentLineItemValue('item', 'description', bundledreferraldesc);
                record.setCurrentLineItemValue('item', 'quantity', bundledreferralqty);
                record.setCurrentLineItemText('item', 'price', 'Custom'); 
                record.setCurrentLineItemValue('item', 'rate', (bundledreferralrate * -1));
                record.setCurrentLineItemText('item', 'custcol_liv_invoice_client_code', clientcode); 
                record.setCurrentLineItemValue('item', 'custcol_liv_sol_contract_number', contractnumber);
                record.setCurrentLineItemValue('item', 'custcol_liv_sf_opportunity_id', sfopporid);  //NS-269
                record.commitLineItem('item'); 
            }
            
            //lapsed
	        if (nvl(lapsedqty,0) > 0 && showlapsed == 'T')
	        {
	            nlapiLogExecution('DEBUG', 'VALUE', 'Lapsed : ');
	            record.selectNewLineItem('item');
	            record.setCurrentLineItemValue('item','item',lapseditem); 
                record.setCurrentLineItemValue('item', 'description', lapseddesc);
                record.setCurrentLineItemValue('item', 'quantity', lapsedqty);
                record.setCurrentLineItemText('item', 'price', 'Custom'); 
                record.setCurrentLineItemValue('item', 'rate', 0);
                record.setCurrentLineItemText('item', 'custcol_liv_invoice_client_code', clientcode); 
                record.setCurrentLineItemValue('item', 'custcol_liv_sol_contract_number', contractnumber);
                record.setCurrentLineItemValue('item', 'custcol_liv_sf_opportunity_id', sfopporid);  //NS-269
                record.commitLineItem('item'); 
	        }
	        
	        //tax line
	        if (createtaxline == 'T')
	        {
	            record.selectNewLineItem('item');
	            record.setCurrentLineItemValue('item','item',taxitem); 
                record.setCurrentLineItemValue('item', 'description', taxitemdesc);
               // record.setCurrentLineItemValue('item', 'quantity', ctrlsolqty);
                record.setCurrentLineItemText('item', 'price', 'Custom'); 
                record.setCurrentLineItemValue('item', 'rate', taxrate);
                record.setCurrentLineItemValue('item', 'amount', Math.abs(parseFloat(taxamount)));
                record.setCurrentLineItemText('item', 'custcol_liv_invoice_client_code', clientcode); 
                record.setCurrentLineItemValue('item', 'custcol_liv_sol_contract_number', contractnumber);
                record.setCurrentLineItemValue('item', 'custcol_liv_sf_opportunity_id', sfopporid);  //NS-269
                record.commitLineItem('item'); 
	        }
	        

        
	    
            var strRecID = nlapiSubmitRecord(record, true, true);
                
            nlapiLogExecution('DEBUG', 'ACTIVITY', 'create Invoice Ended Sucessfully');
	
            nlapiLogExecution('DEBUG', 'VALUE', 'strRecID : '+strRecID);
          
            // return response with internal id
            if (strRecID)	
            {
                var currentrecord = nlapiLoadRecord('customrecord_liv_billing_summary_v2',recordid, {recordmode: 'dynamic'});
                currentrecord.setFieldValue('custrecord_bs2_ns_internal_id', strRecID);
                currentrecord.setFieldValue('custrecord_bs2_ns_creation_date', today);
                currentrecord.setFieldValue('custrecord_bs2_ns_invoice_members_qty',progqty);
                currentrecord.setFieldValue('custrecord_bs2_ns_error_msg', ' ');
                var strCustomID = nlapiSubmitRecord(currentrecord, true, true);
                nlapiLogExecution('DEBUG', 'VALUE', 'strCustomID : '+strCustomID);
                
            }
     
       
         } //nvl(totalbillingamt,0) > 0)
         else
         {
                var currentrecord = nlapiLoadRecord('customrecord_liv_billing_summary_v2',recordid, {recordmode: 'dynamic'});
                currentrecord.setFieldValue('custrecord_bs2_ns_error_msg', 'Total Billing Amount is zero. Invoice not created.');
                var strCustomID = nlapiSubmitRecord(currentrecord, true, true);
         
         }
	          
			
		}catch(error)
		{
						if (error.getDetails != undefined) 
					   {
							nlapiLogExecution('DEBUG', 'Invoice creation error for billing summary internal id: '+recordid, error.getCode() + ': ' + error.getDetails());
							 var currentrecord = nlapiLoadRecord('customrecord_liv_billing_summary_v2',recordid, {recordmode: 'dynamic'});
                             currentrecord.setFieldValue('custrecord_bs2_ns_error_msg', error.getCode() + ': ' + error.getDetails());
                             nlapiSubmitRecord(currentrecord, true, true);
					   }
					   else 
					   {    
							nlapiLogExecution('DEBUG', 'Unexpected invoice creation error for billing summary internal id : '+recordid, error.toString());
							 var currentrecord = nlapiLoadRecord('customrecord_liv_billing_summary_v2',recordid, {recordmode: 'dynamic'});
                             currentrecord.setFieldValue('custrecord_bs2_ns_error_msg', error.toString());
                             nlapiSubmitRecord(currentrecord, true, true);
					   }
		}

        return (strRecID) ;
        
        
	nlapiLogExecution('DEBUG', 'VALUE', 'Usage: '+nlapiGetContext().getRemainingUsage());
	nlapiLogExecution('DEBUG', 'ACTIVITY', 'createInvoiceRec Ended Sucessfully');
}

function formatDate(strDate)
{
	if(strDate.indexOf('/') != -1)
	{
		return strDate;
	}
	return strDate.substring(0,2)+'/'+strDate.substring(2,4)+'/'+strDate.substring(4);
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
   


