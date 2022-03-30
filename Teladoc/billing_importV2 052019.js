/* Last Updated: 11/07/18 - get billing attributes from Contracts record */
/* Last Updated: 12/18/18 - NS246 - support HTN Admin Fee */
/* Last Updated: 01/09/19 - NS-259 - bug fix HTN Admin Fee */
/* Last Updated: 02/12/19 - NS-287 - add bundle discount % feature */


function beforeSubmit(type)
{
  //applies only to CSV Import and Create event
  
  if ( (type == 'create') &&  (nlapiGetContext().getExecutionContext() == 'csvimport'))
  {
           
       // Get the value of the Discount item from parameter
       var discountitem = nlapiGetContext().getSetting('SCRIPT', 'custscript_b2_discount_item');
       
       
      // Search record existence in custom record
       var arrFilter = new Array(); 
       var billing_date = nlapiGetFieldValue('custrecord_bs2_date');
       var clientcode = nlapiGetFieldValue('custrecord_bs2_client_code');
       var grouping = nlapiGetFieldValue('custrecord_bs2_grouping');
       var recordtype = nlapiGetFieldValue('custrecord_bs2_record_type');
       var state = nlapiGetFieldValue('custrecord_bs2_state');
       var city = nlapiGetFieldValue('custrecord_bs2_city');
       var zip = nlapiGetFieldValue('custrecord_bs2_zip');
       
       nlapiLogExecution('DEBUG','Billing Date value:'+ billing_date) ;
       nlapiLogExecution('DEBUG','Client Code value:'+ clientcode) ;
       nlapiLogExecution('DEBUG','Record Type value:'+ recordtype) ;
    
	   arrFilter[0] = new nlobjSearchFilter('custrecord_bs2_date', null, 'on',  billing_date ); 
	   arrFilter[1] = new nlobjSearchFilter('custrecord_bs2_client_code', null, 'is',  clientcode ); 
	   arrFilter[2] = new nlobjSearchFilter('custrecord_bs2_grouping', null, 'is',  grouping ); 
	   arrFilter[3] = new nlobjSearchFilter('custrecord_bs2_record_type', null, 'is',  recordtype );

	    //Define search columns
	
	    var arrColumns = new Array();
		arrColumns.push(new nlobjSearchColumn('custrecord_bs2_date'));
		arrColumns.push(new nlobjSearchColumn('custrecord_bs2_ns_internal_id'));
	
	   
	    //Execute search
	    
		var arrResult = nlapiSearchRecord('customrecord_liv_billing_summary_v2', null, arrFilter, arrColumns);
		
		nlapiLogExecution('DEBUG','Billing Date value:'+ billing_date) ;
	
		

       if(arrResult) //  found - delete records first
        {
           nlapiLogExecution('DEBUG','arrResult:'+ arrResult.length) ;
        
           var current_rec = arrResult[0];
           var rec_id = current_rec.getId();
           var ns_internalid = current_rec.getValue('custrecord_bs2_ns_internal_id');
       
           nlapiLogExecution('DEBUG','NS Internal ID:'+ ns_internalid) ;
           
           if (nvl(ns_internalid,0) > 0) // not empty
           {
              throw 'Billing record and invoice record already exist.  Refer to NS Internal ID : '+ ns_internalid ;
           }
           else
           {
               if (recordtype == 'Billing')
               {
                   nlapiDeleteRecord('customrecord_liv_billing_summary_v2', rec_id);
                }
                   nlapiLogExecution('DEBUG', 'ACTIVITY', 'Call processRecords');
                   processRecords(type, discountitem) ;
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
      var clientcode = nlapiGetFieldValue('custrecord_bs2_client_code'); 
      var billing_date = nlapiGetFieldValue('custrecord_bs2_date');
      var activemembers = nlapiGetFieldValue('custrecord_bs2_active_members_qty');
      var upfrontmeters = nlapiGetFieldValue('custrecord_bs2_upfront_meter_qty') ;
      var replmeters = nlapiGetFieldValue('custrecord_bs2_repl_meter_qty') ;
      var grouping = nlapiGetFieldValue('custrecord_bs2_grouping') ;
      var recordtype = nlapiGetFieldValue('custrecord_bs2_record_type') ;
      var ltdreplmeters = nlapiGetFieldValue('custrecord_bs2_ltd_repl_meter_qty') ; //NS-87
      
    
      
      // Get Early Term Qty
      var earlytermtotal = nlapiGetFieldValue('custrecord_bs2_early_term_total') ;
      var totalearlyterm = nlapiGetFieldValue('custrecord_bs2_early_term_total') ;
      var earlyterm1 = nlapiGetFieldValue('custrecord_bs2_early_term_1mon') ;
   
      
      // NS-106 FFS */
      var stripsqty = nlapiGetFieldValue('custrecord_bs2_strip_units_qty') ;
      var lancetsqty = nlapiGetFieldValue('custrecord_bs2_lancet_units_qty') ;
      var controlsolqty = nlapiGetFieldValue('custrecord_bs2_control_solutions_qty') ;
      var lancingqty = nlapiGetFieldValue('custrecord_bs2_lancing_devices_qty') ;
      
      // NS-159 hypertension //
      var htnactivemembers = nlapiGetFieldValue('custrecord_bs2_htn_active_members_qty');
      var htnupfrontmeters = nlapiGetFieldValue('custrecord_bs2_htn_upfront_meter_qty') ;
      var htnreplmeters = nlapiGetFieldValue('custrecord_bs2_ns_htn_repl_meter_qty') ;
      
      var htnearlytermtotal = nlapiGetFieldValue('custrecord_bs2_htn_early_term_total') ;
      var htnearlyterm1 = nlapiGetFieldValue('custrecord_bs2_ns_htn_early_term_1mon') ;
      var combactivemembers = nlapiGetFieldValue('custrecord_bs2_cb_active_members_qty');
      // end NS-159
      
      //NS-259
      var htnonlyactivemembers = nlapiGetFieldValue('custrecord_bs2_htn_only_active_members_q');
      
      // NS-335 Weight Management  //
      var wmactivemembers = nlapiGetFieldValue('custrecord_bs2_wm_active_members_qty');
      var wmreplmeters = nlapiGetFieldValue('custrecord_bs2_ns_wm_repl_meter_qty') ;
      var wmearlytermtotal = nlapiGetFieldValue('custrecord_bs2_wm_early_term_total') ;
      var wmonlyactivemembers = nlapiGetFieldValue('custrecord_bs2_wm_only_active_members_q');
      
      //DPP
      var dppactivemembers = nlapiGetFieldValue('custrecord_bs2_dpp_active_members_qty');
      var dppreplmeters = nlapiGetFieldValue('custrecord_bs2_ns_dpp_repl_meter_qty') ;
      var dppearlytermtotal = nlapiGetFieldValue('custrecord_bs2_dpp_early_term_total') ;
      var dpponlyactivemembers = nlapiGetFieldValue('custrecord_bs2_dpp_only_active_members_q');
      
      //Combined Active Members
      var dmwmactivemembers = nlapiGetFieldValue('custrecord_bs2_dmwm_active_members_qty');
      var dpphtnactivemembers = nlapiGetFieldValue('custrecord_bs2_dpphtn_active_members_qty');
      var dmhtnwmactivemembers = nlapiGetFieldValue('custrecord_bs2_dmhtnwm_active_members_qty');
      //
      
      //Get cumulative active members qty
      var activememberssum = nlapiGetFieldValue('custrecord_bs2_active_members_qty_sum');
      
      
      
      if (clientcode == null)
      { 
         clientcode = 'N/A' ;
       }
       
      var pccodeID = getPromoCodeId(clientcode) ;
      
      nlapiLogExecution('DEBUG','PCCodeID value:'+ pccodeID) ;
      
            
      
       // Search for Contracts
       
       var arrFilter = new Array(); 
       //arrFilter[0] = new nlobjSearchFilter('custrecord_liv_cm_client_code', null, 'anyof',  [pccodeID] );
       arrFilter[0] = new nlobjSearchFilter('custrecord_liv_cm_client_code', null, 'anyof',  [pccodeID] );

       //var searchresults = nlapiSearchRecord('customer','customsearch_liv_customers_download', arrFilter, null);
       var arrResult = nlapiSearchRecord('customrecord_liv_contracts','customsearch_liv_contracts', arrFilter, null);

	   
	   
        if(arrResult)
        {
          for (var i = 0;  i < arrResult.length; i++)
           {
           
           
               var results=arrResult[i];
               var columns=results.getAllColumns();  
               
               
               var subsidiary        = results.getValue(columns[0]); 
               var autocreateinvoice = results.getValue(columns[1]);
               var inactivebilling   = results.getValue(columns[2]);
               var clientcode        = results.getValue(columns[3]);
               var contractnumber    = results.getValue(columns[4]);
               var activemembersdiscqty = results.getValue(columns[5]);
               var bundleprice       = results.getValue(columns[6]);
               var pppmdiscvol       = results.getValue(columns[7]);
               var upfrontprice      = results.getValue(columns[8]);
               var repldeviceresp    = results.getValue(columns[9]);
               var replmeterfoccap   = results.getValue(columns[10]);
               var replacementprice  = results.getValue(columns[11]);
               var terminationprice  = results.getValue(columns[12]);
               var lt9monthtermprice = results.getValue(columns[13]);
               var gte9monthtermprice = results.getValue(columns[14]);
               
               
               var flattermprice     = results.getValue(columns[15]);
               var createcmforfee    = results.getValue(columns[16]);
               var cmcustomer        = results.getValue(columns[17]);
               var adminfee          = results.getValue(columns[18]);
               var invoiceprefix     = results.getValue(columns[19]);
               var billtocustomer    = results.getValue(columns[20]);
               var soldtocustomer    = results.getValue(columns[21]);
               var currentpo         = results.getValue(columns[22]);
               var clienttype        = results.getValue(columns[23]);
               var medicalclaims     = results.getValue(columns[24]);
               var pricingmodel      = results.getValue(columns[25]);
               var categorytext      = results.getText(columns[25]);
               var paymentterm       = results.getValue(columns[26]);
               var partner           = results.getValue(columns[27]);
               var enrollmentcap     = results.getValue(columns[28]);
               var ptm               = results.getValue(columns[29]);
               var progitem          = results.getValue(columns[30]);
               var progitemdesc      = results.getValue(columns[31]);
               var upfrontitem       = results.getValue(columns[32]);
               var upfrontitemdesc   = results.getValue(columns[33]);
               var replitem          = results.getValue(columns[34]);
               var replitemdesc      = results.getValue(columns[35]);
               var termitem          = results.getValue(columns[36]);
               var termitemdesc      = results.getValue(columns[37]);
               var adminfeeitem      = results.getValue(columns[38]);
               var adminfeeitemdesc  = results.getValue(columns[39]);
               var htnadminfee       = results.getValue(columns[40]);
               var showlapsedusers   = results.getValue(columns[41]);
               var lapsedusersitem   = results.getValue(columns[42]);
               var lapsedusersitemdesc = results.getValue(columns[43]);
               var ffsprogfee        = results.getValue(columns[44]);
               var ffsupfrontmeterfee = results.getValue(columns[45]);
               var ffsteststripsfee  = results.getValue(columns[46]);
               var ffsteststripitem  = results.getValue(columns[47]);
               var ffsteststripitemdesc = results.getValue(columns[48]);
               var ffslancetsfee     = results.getValue(columns[49]);
               var ffslancetsitem    = results.getValue(columns[50]);
               var ffslancetsitemdesc = results.getValue(columns[51]);
               var ffslancingdevfee   = results.getValue(columns[52]);
               var ffslancingdevitem  = results.getValue(columns[53]);
               var ffslancingdevitemdesc = results.getValue(columns[54]);
               var ffsctrlsolfee      = results.getValue(columns[55]);
               var ffsctrlsolitem     = results.getValue(columns[56]);
               var ffsctrlsolitemdesc = results.getValue(columns[57]);
               var htnbundleprice      = results.getValue(columns[58]);
               var htnitem             = results.getValue(columns[59]);
               var htnitemdesc         = results.getValue(columns[60]);
               var htnreplprice        = results.getValue(columns[61]);
               var htnreplitem         = results.getValue(columns[62]);
               var htnreplitemdesc     = results.getValue(columns[63]);
               var htnupfrontprice     = results.getValue(columns[64]);
               var htnupfrontitem      = results.getValue(columns[65]);
               var htnupfrontitemdesc  = results.getValue(columns[66]);
               var htnearlytermprice   = results.getValue(columns[67]);
               var htnearlytermitem    = results.getValue(columns[68]);
               var htnearlytermitemdesc = results.getValue(columns[69]);
               var bundleddiscount     = results.getValue(columns[70]);
               var createtaxline       = results.getValue(columns[71]);
               var taxitem             = results.getValue(columns[72]);
               var taxitemdesc         = results.getValue(columns[73]);
               var taxrate             = results.getValue(columns[74]);
               var current_enrolled    = results.getValue(columns[75]);
               var partnerfee          = results.getValue(columns[76]);
               var bundleditem         = results.getValue(columns[77]);
               var contractid         = results.getValue(columns[78]);
               var email              = results.getValue(columns[79]);
               var bundledadminfee    = results.getValue(columns[80]);  //NS-246
               var launchdate          = results.getValue(columns[81]); 
               var bundleddiscountpct  = results.getValue(columns[82]);  //NS-287
               var contractstatus      = results.getValue(columns[83]);  //NS-287
               //WM
               var wmprice      = results.getValue(columns[84]);
               var wmprogitem   = results.getValue(columns[85]);
               var wmprogitemdesc   = results.getValue(columns[86]);
               var wmupfrontprice   = results.getValue(columns[87]);
               var wmupfrontprogitem   = results.getValue(columns[88]);
               var wmupfrontprogitemdesc   = results.getValue(columns[89]);
               var wmrepldeviceresp   = results.getValue(columns[90]);
               var wmreplprice   = results.getValue(columns[91]);
               var wmreplprogitem   = results.getValue(columns[92]);
               var wmreplprogitemdesc   = results.getValue(columns[93]);
               var wmtermprice   = results.getValue(columns[94]);
               var wmtermprogitem  = results.getValue(columns[95]);
               var wmtermprogitemdesc   = results.getValue(columns[96]);
               var wmadminfee   = results.getValue(columns[97]);
               //DPP
               var dppprice      = results.getValue(columns[98]);
               var dppprogitem   = results.getValue(columns[99]);
               var dppprogitemdesc   = results.getValue(columns[100]);
               var dppupfrontprice   = results.getValue(columns[101]);
               var dppupfrontprogitem   = results.getValue(columns[102]);
               var dppupfrontprogitemdesc   = results.getValue(columns[103]);
               var dpprepldeviceresp   = results.getValue(columns[104]);
               var dppreplprice   = results.getValue(columns[105]);
               var dppreplprogitem   = results.getValue(columns[106]);
               var dppreplprogitemdesc   = results.getValue(columns[107]);
               var dpptermprice   = results.getValue(columns[108]);
               var dpptermprogitem  = results.getValue(columns[109]);
               var dpptermprogitemdesc   = results.getValue(columns[110]);
               var dppadminfee   = results.getValue(columns[111]);

    
               nlapiLogExecution('DEBUG','Upfront Price: '+upfrontprice) ;
               nlapiLogExecution('DEBUG','Bundle Price: '+bundleprice) ;
               nlapiLogExecution('DEBUG','Replacement Price: '+replacementprice) ;
               
              
        
                 // Set new Field Value
               nlapiSetFieldValue('custrecord_bs2_billable', autocreateinvoice);
               nlapiSetFieldValue('custrecord_bs2_ns_billing_inactive', inactivebilling);
               //nlapiSetFieldValue('custrecord_bs2_client_code', clientcode);
               nlapiSetFieldValue('custrecord_bs2_contract_number', contractnumber);
               nlapiSetFieldValue('custrecord_bs2_ns_members_disc_qty', activemembersdiscqty);
               nlapiSetFieldValue('custrecord_bs2_ns_pppm_price', Math.abs(parseFloat(bundleprice)));
               nlapiSetFieldValue('custrecord_bs2_ns_pppm_discount_vol',pppmdiscvol);
               nlapiSetFieldValue('custrecord_bs2_ns_pppm_discount_vol',pppmdiscvol);
               nlapiSetFieldValue('custrecord_bs2_ns_upfront_price', Math.abs(parseFloat(upfrontprice)));
               nlapiSetFieldValue('custrecord_bs2_ns_pppm_discount_vol',pppmdiscvol);
               nlapiSetFieldValue('custrecord_bs2_ns_repl_device_resp',repldeviceresp);
               nlapiSetFieldValue('custrecord_bs2_ns_repl_meter_foc_cap',replmeterfoccap);
               nlapiSetFieldValue('custrecord_bs2_ns_replace_price', Math.abs(parseFloat(replacementprice)));
               nlapiSetFieldValue('custrecord_bs2_ns_termination_price', Math.abs(parseFloat(terminationprice)));
               nlapiSetFieldValue('custrecord_bs2_ns_lt_9_mo_term_fee', Math.abs(parseFloat(lt9monthtermprice)));
               nlapiSetFieldValue('custrecord_bs2_ns_gte_9_mo_term_fee', Math.abs(parseFloat(gte9monthtermprice)));
               nlapiSetFieldValue('custrecord_bs2_ns_flat_term_price', Math.abs(parseFloat(flattermprice)));
               nlapiSetFieldValue('custrecord_bs2_ns_create_cm_fee',createcmforfee);
               nlapiSetFieldValue('custrecord_bs2_ns_cm_customer',cmcustomer);
               nlapiSetFieldValue('custrecord_bs2_ns_referral_fee',Math.abs(parseFloat(adminfee)));
               nlapiSetFieldValue('custrecord_bs2_invoice_prefix',invoiceprefix);
               nlapiSetFieldValue('custrecord_bs2_ns_bill_to_customer',billtocustomer);
               nlapiSetFieldValue('custrecord_bs2_ns_customer',soldtocustomer);
               nlapiSetFieldValue('custrecord_bs2_ns_current_po',currentpo);
               nlapiSetFieldValue('custrecord_bs2_ns_client_type',clienttype);
               nlapiSetFieldValue('custrecord_bs2_medical_claims',medicalclaims);
               nlapiSetFieldValue('custrecord_bs2_ns_category',pricingmodel);
               nlapiSetFieldValue('custrecord_bs2_ns_payment_term',paymentterm );
               nlapiSetFieldValue('custrecord_bs2_partner',partner);
               nlapiSetFieldValue('custrecord_bs2_ns_enrollment_cap',enrollmentcap );
               nlapiSetFieldValue('custrecord_bs2_ns_min_participation',ptm);
               nlapiSetFieldValue('custrecord_bs2_ns_program_item',progitem);
               nlapiSetFieldValue('custrecord_bs2_ns_program_desc',progitemdesc);
               nlapiSetFieldValue('custrecord_bs2_ns_upfront_item',upfrontitem);
               nlapiSetFieldValue('custrecord_bs2_ns_upfront_desc',upfrontitemdesc);
               nlapiSetFieldValue('custrecord_bs2_ns_replacement_item',replitem);
               nlapiSetFieldValue('custrecord_bs2_ns_replc_desc',replitemdesc);
               nlapiSetFieldValue('custrecord_bs2_ns_termination_item',termitem);
               nlapiSetFieldValue('custrecord_bs2_ns_termination_desc',termitemdesc);
               nlapiSetFieldValue('custrecord_bs2_ns_referral_fee_item',adminfeeitem );
               nlapiSetFieldValue('custrecord_bs2_ns_referral_fee_desc',adminfeeitemdesc);
               nlapiSetFieldValue('custrecord_bs2_ns_htn_admin_fee',Math.abs(parseFloat(htnadminfee)));
               nlapiSetFieldValue('custrecord_bs2_ns_bundled_admin_fee',Math.abs(parseFloat(bundledadminfee))); //NS-246
               nlapiSetFieldValue('custrecord_bs2_ns_show_lapsed_users',showlapsedusers );
               nlapiSetFieldValue('custrecord_bs2_ns_lapsed_users_item',lapsedusersitem);
               nlapiSetFieldValue('custrecord_bs2_ns_lapsed_users_desc',lapsedusersitemdesc);
               nlapiSetFieldValue('custrecord_bs2_ffs_program_fee',Math.abs(parseFloat(ffsprogfee)));
               nlapiSetFieldValue('custrecord_bs2_ffs_upfront_meter_fee',Math.abs(parseFloat(ffsupfrontmeterfee)));
               nlapiSetFieldValue('custrecord_bs2_ffs_test_strips_fee',Math.abs(parseFloat(ffsteststripsfee)));;
               nlapiSetFieldValue('custrecord_bs2_ns_strips_item',ffsteststripitem);
               nlapiSetFieldValue('custrecord_bs2_ns_strips_item_desc',ffsteststripitemdesc);
               nlapiSetFieldValue('custrecord_bs2_ffs_lancets_fee',Math.abs(parseFloat(ffslancetsfee)));
               nlapiSetFieldValue('custrecord_bs2_ns_lancets_item',ffslancetsitem);
               nlapiSetFieldValue('custrecord_bs2_ns_lancets_item_desc',ffslancetsitemdesc);
               nlapiSetFieldValue('custrecord_bs2_ffs_lancing_device_fee',Math.abs(parseFloat(ffslancingdevfee)));
               nlapiSetFieldValue('custrecord_bs2_ns_lancing_item',ffslancingdevitem);
               nlapiSetFieldValue('custrecord_bs2_ns_lancing_item_desc',ffslancingdevitemdesc);
               nlapiSetFieldValue('custrecord_bs2_ffs_ctrl_solution_fee',Math.abs(parseFloat(ffsctrlsolfee)));
               nlapiSetFieldValue('custrecord_bs2_ns_ctrlsol_item',ffsctrlsolitem);
               nlapiSetFieldValue('custrecord_bs2_ns_ctrlsol_item_desc',ffsctrlsolitemdesc);
               nlapiSetFieldValue('custrecord_bs2_ns_htn_pppm_price',Math.abs(parseFloat(htnbundleprice)));
               nlapiSetFieldValue('custrecord_bs2_ns_htn_program_item',htnitem);
               nlapiSetFieldValue('custrecord_bs2_htn_program_desc',htnitemdesc);
               nlapiSetFieldValue('custrecord_bs2_ns_htn_replace_price',Math.abs(parseFloat(htnreplprice)));
               nlapiSetFieldValue('custrecord_bs2_ns_htn_repl_item',htnreplitem );
               nlapiSetFieldValue('custrecord_bs2_ns_htn_repl_item_desc',htnreplitemdesc);
               nlapiSetFieldValue('custrecord_bs2_ns_htn_upfront_price',Math.abs(parseFloat(htnupfrontprice)));
               nlapiSetFieldValue('custrecord_bs2_ns_htn_upfront_item',htnupfrontitem );
               nlapiSetFieldValue('custrecord_bs2_ns_htn_upfront_item_d',htnupfrontitemdesc);
               nlapiSetFieldValue('custrecord_bs2_ns_htn_term_price',Math.abs(parseFloat(htnearlytermprice)));
               nlapiSetFieldValue('custrecord_bs2_ns_htn_term_item',htnearlytermitem);
               nlapiSetFieldValue('custrecord_bs2_ns_htn_term_item_desc',htnearlytermitemdesc);
               nlapiSetFieldValue('custrecord_bs2_cb_pppm_discount_price',Math.abs(parseFloat(bundleddiscount)));
               nlapiSetFieldValue('custrecord_bs2_create_tax_line',createtaxline);
               nlapiSetFieldValue('custrecord_bs2_tax_item',taxitem);
               nlapiSetFieldValue('custrecord_bs2_tax_item_desc',taxitemdesc);
               nlapiSetFieldValue('custrecord_bs2_tax_rate',Math.abs(parseFloat(taxrate)));
               nlapiSetFieldValue('custrecord_bs2_ns_partner_fee',Math.abs(parseFloat(partnerfee)));
               nlapiSetFieldValue('custrecord_bs2_cb_discount_item',bundleditem);
               nlapiSetFieldValue('custrecord_bs2_contract_id',contractid);
               nlapiSetFieldValue('custrecord_bs2_ns_email',email);
               nlapiSetFieldValue('custrecord_bs2_cb_bundled_discount_pct',bundleddiscountpct);
               nlapiSetFieldValue('custrecord_bs2_contract_status',contractstatus);
               
               //WM
               nlapiSetFieldValue('custrecord_bs2_wm_active_members_qty',wmactivemembers);
               nlapiSetFieldValue('custrecord_bs2_ns_wm_pppm_price', Math.abs(parseFloat(wmprice)));
               nlapiSetFieldValue('custrecord_bs2_ns_wm_program_item',wmprogitem);
               nlapiSetFieldValue('custrecord_bs2_wm_program_desc',wmprogitemdesc);
               nlapiSetFieldValue('custrecord_bs2_ns_wm_repl_meter_qty',wmreplmeters);
               nlapiSetFieldValue('custrecord_bs2_ns_wm_replace_price',Math.abs(parseFloat(wmreplprice)));
               nlapiSetFieldValue('custrecord_bs2_ns_wm_repl_item',wmreplprogitem);
               nlapiSetFieldValue('custrecord_bs2_ns_wm_repl_item_desc',wmreplprogitemdesc);
               nlapiSetFieldValue('custrecord_bs2_wm_early_term_total',wmearlytermtotal);
               nlapiSetFieldValue('custrecord_bs2_ns_wm_term_price',Math.abs(parseFloat(wmtermprice)));
               nlapiSetFieldValue('custrecord_bs2_ns_wm_term_item',wmtermprogitem);
               nlapiSetFieldValue('custrecord_bs2_ns_wm_term_item_desc',wmtermprogitemdesc);

               //DPP
               nlapiSetFieldValue('custrecord_bs2_dpp_active_members_qty',dppactivemembers);
               nlapiSetFieldValue('custrecord_bs2_ns_dpp_pppm_price', Math.abs(parseFloat(dppprice)));
               nlapiSetFieldValue('custrecord_bs2_ns_dpp_program_item',dppprogitem);
               nlapiSetFieldValue('custrecord_bs2_dpp_program_desc',dppprogitemdesc);
               nlapiSetFieldValue('custrecord_bs2_ns_dpp_repl_meter_qty',dppreplmeters);
               nlapiSetFieldValue('custrecord_bs2_ns_dpp_replace_price',Math.abs(parseFloat(dppreplprice)));
               nlapiSetFieldValue('custrecord_bs2_ns_dpp_repl_item',dppreplprogitem);
               nlapiSetFieldValue('custrecord_bs2_ns_dpp_repl_item_desc',dppreplprogitemdesc);
               nlapiSetFieldValue('custrecord_bs2_dpp_early_term_total',dppearlytermtotal);
               nlapiSetFieldValue('custrecord_bs2_ns_dpp_term_price',Math.abs(parseFloat(dpptermprice)));
               nlapiSetFieldValue('custrecord_bs2_ns_dpp_term_item',dpptermprogitem);
               nlapiSetFieldValue('custrecord_bs2_ns_dpp_term_item_desc',dppprogitemdesc);
               
           
             htnitemdesc = htnitemdesc + ' - ' + convertdate(billing_date, 'MONTHYY') + ' ('+grouping+' )'; 
             wmprogitemdesc = wmprogitemdesc + ' - ' + convertdate(billing_date, 'MONTHYY') + ' ('+grouping+' )'; 
             dppprogitemdesc = dppprogitemdesc + ' - ' + convertdate(billing_date, 'MONTHYY') + ' ('+grouping+' )'; 
             
             
         //    combprogramdesc = combprogramdesc + ' - ' + convertdate(billing_date, 'MONTHYY') + ' ('+grouping+' )'; 

             var invoicesuffix =  convertdate(billing_date, 'MMDDYY'); 
             var invoicenum = invoiceprefix+invoicesuffix;
             
             // Amount Calculation
            
             var qtycompare =  (nvl(activemembers,0) - nvl(activemembersdiscqty,0)) ;
             
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
             enrollmentcap = parseInt(nvl(enrollmentcap,0));
             current_enrolled = parseInt(nvl(current_enrolled,0));
    
             if (enrollmentcap != 0)
             {
                 //if (current_enrolled > enrollmentcap)
                 nlapiLogExecution('DEBUG','activememberssum : '+activememberssum ) ;
                 if (activememberssum > enrollmentcap)
                 {
                   //nlapiLogExecution('DEBUG','NS-214 current_enrolled : '+current_enrolled) ;
                   //nlapiLogExecution('DEBUG','NS-214 cap_enrollment : '+enrollmentcap) ;
                   var origactivemembers = activemembers;
                   activemembers = enrollmentcap ;
                   
                   //Line below commented out on 6/10/19.  Should force billing team to review enrollment cap and manual overwrite of active members.
                   //nlapiSetFieldValue('custrecord_bs2_active_members_qty', activemembers );
                  
                   
                 }
             }
            
            
             
             var programamt = bundleprice * (nvl(activemembers,0) - nvl(activemembersdiscqty,0)) ;
             var referralamt = (adminfee * (nvl(activemembers,0) - nvl(activemembersdiscqty,0)))*-1 ;
             
             //NS-159 HTN
             var htnprogramamt = htnbundleprice * (nvl(htnactivemembers,0))  ;
             var htnreferralamt = (htnadminfee * (nvl(htnonlyactivemembers,0)))*-1 ; //NS-259
             var htnreplamt = htnreplprice *  nvl(htnreplmeters,0) ;
             
             //WM
             var wmprogramamt = wmprice * (nvl(wmactivemembers,0))  ;
             //var wmreferralamt = (wmadminfee * (nvl(wmonlyactivemembers,0)))*-1 ; 
             var wmreplamt = wmreplprice *  nvl(wmreplmeters,0) ;
 
             //NS-287 Bundled Discount %
           
             var combdmamt = bundleprice * (nvl(combactivemembers,0))  ;   //DM
             var combhtnamt =  htnbundleprice * (nvl(combactivemembers,0))  ; //HTN
             var combprogramamt = combdmamt + combhtnamt ;
             
             // DM + WM
             
             var dmwmamt1 = bundleprice * (nvl(dmwmactivemembers,0))  ;   
             var dmwmamt2 =  wmprice * (nvl(dmwmactivemembers,0))  ;
             var dmwmamt = dmwmamt1+ dmwmamt2 ;

             //DPP + HTN
             var dpphtnamt1 = htnbundleprice * (nvl(dpphtnactivemembers,0))  ;   
             var dpphtnamt2 =  dppprice * (nvl(dpphtnactivemembers,0))  ;
             var dpphtnamt = dpphtnamt1+ dpphtnamt2 ;
             
             //DM + HTN + WM
             var dmhtnwmamt1 = bundleprice * (nvl(dmhtnwmactivemembers,0))  ;   
             var dmhtnwmamt2 = htnbundleprice * (nvl(dmhtnwmactivemembers,0))  ;   
             var dmhtnwmamt3 = wmprice * (nvl(dmhtnwmactivemembers,0))  ;   
            
             
             var dmhtnwmamt = dmhtnwmamt1 + dmhtnwmamt2 + dmhtnwmamt3;
             

             var combdiscamt = ((bundleddiscount * (nvl(combactivemembers,0)))*-1) ;  //discount based on fee
             var base = 100 ;
             var combdiscrate = (bundleddiscountpct/base).toFixed(2) ;
             
             var combdiscpctamt = ((combdiscrate * combprogramamt)*-1) ;
             
             var dmwmdiscpctamt = ((combdiscrate * dmwmamt)*-1) ;
             var dpphtndiscpctamt = ((combdiscrate * dpphtnamt)*-1) ;
             var dmhtnwmdiscpctamt = ((combdiscrate * dmhtnwmamt)*-1) ;
             
             if (nvl(combdiscamt,0) != 0)
             {
                 var combprogdiscamt = (combdiscamt) ;
             }
             else
             {
                 var combprogdiscamt = (combdiscpctamt) ;
             }
             
              
              nlapiLogExecution('DEBUG','bundled discount : '+bundleddiscount) ;
              nlapiLogExecution('DEBUG','bundled discount pct : '+bundleddiscountpct) ;
              nlapiLogExecution('DEBUG','discount rate : '+combdiscrate) ;
              nlapiLogExecution('DEBUG','combdiscamt : '+combdiscamt) ;
              nlapiLogExecution('DEBUG','combdiscpctamt : '+combdiscpctamt) ;
              nlapiLogExecution('DEBUG','combactivemembers : '+combactivemembers) ;
              nlapiLogExecution('DEBUG','combdmamt : '+combdmamt) ;
              nlapiLogExecution('DEBUG','combhtnamt : '+combhtnamt) ;
              nlapiLogExecution('DEBUG','combprogramamt : '+combprogramamt) ;
              nlapiLogExecution('DEBUG','combprogdiscamt : '+combprogdiscamt) ;
              nlapiLogExecution('DEBUG','discount item : '+discountitem) ;
              nlapiLogExecution('DEBUG','dmwmamt : '+dmwmamt) ;
              nlapiLogExecution('DEBUG','dpphtnamt : '+dpphtnamt) ;
              nlapiLogExecution('DEBUG','dmwmdiscpctamt : '+dmwmdiscpctamt) ;
              nlapiLogExecution('DEBUG','dpphtndiscpctamt : '+dpphtndiscpctamt) ;
              nlapiLogExecution('DEBUG','dpphtnwmdisctpctamt : '+dmhtnwmdiscpctamt) ;

              
              
             //NS-246
             var bundledreferralamt = (bundledadminfee * (nvl(combactivemembers,0)))*-1 ;
             
             //Might need to add referral fee for other products.  no requirements yet as of 05/21/19
             
    

             var replfocmsg = null;
             
             nlapiLogExecution('DEBUG','Replc FOC Cap : '+replmeterfoccap) ;
             nlapiLogExecution('DEBUG','LTD Repl Meters : '+ltdreplmeters) ;
             
             if (nvl(replmeterfoccap,0) == 0)
             {
                nlapiLogExecution('DEBUG','nvl(replmeterfoccap,0) == 0') ;
                var replamt = replacementprice *  nvl(replmeters,0) ;
             }
             else
             {
                 if (nvl(ltdreplmeters,0) > nvl(replmeterfoccap,0))
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
             
              nlapiLogExecution('DEBUG','pricing model'+pricingmodel) ;
              nlapiLogExecution('DEBUG','categorytext'+categorytext) ;
              
               
              if (categorytext == 'Fee for Service')
              {
                 var programamt = ffsprogfee * (nvl(activemembers,0) - nvl(activemembersdiscqty,0)) ;
                 var upfrontamt = ffsupfrontmeterfee * nvl(upfrontmeters,0) ; 
                 var ffs_stripamt = ffsteststripsfee * nvl(stripsqty,0) ;
                 var ffs_lancetamt = ffslancetsfee * nvl(lancetsqty,0) ;
                 var ffs_lancingamt = ffslancingdevfee * nvl(lancingqty,0) ;
                 var ffs_controlsolamt = ffsctrlsolfee * nvl(controlsolqty,0);
                 
                 var totalbillingamt = (nvl(programamt,0))+ (nvl(upfrontamt,0)) + (nvl(ffs_stripamt,0)) + (nvl(ffs_lancetamt,0)) +(nvl(ffs_lancingamt,0)) + (nvl(ffs_controlsolamt,0));
              }
            

             
              if (categorytext == 'Upfront')
              {
                 var upfrontamt = upfrontprice * nvl(upfrontmeters,0) ; 
                 var htnupfrontamt = htnupfrontprice * nvl(htnupfrontmeters,0) ; 
                 
                 var totalbillingamt = (nvl(programamt,0))+ (nvl(replamt,0)) + (nvl(referralamt,0)) + (nvl(upfrontamt,0))+(nvl(htnprogramamt,0))+(nvl(htnreplamt,0))+(nvl(htnreferralamt,0))+(nvl(htnupfrontamt,0))+(nvl(combprogdiscamt,0))+(nvl(bundledreferralamt,0));
                
              }
              
              if (categorytext == 'Bundled')
              {
                 var earlytermtotal = 0;
                 var htnearlytermtotalamt = 0;
                 var combearlytermtotalamt = 0;
                 var wmearlytermtotalamt = 0;
                 var dppearlytermtotalamt = 0;
                 
                 var earlytermdesc = 'Early Termination : ' ;
                
               if (nvl(flattermprice,0) == 0)
                 {
                    
                  //  var gte9monthqty = nvl(earlyterm9,0)+nvl(earlyterm10,0)+nvl(earlyterm11,0)+nvl(earlyterm12,0);
                  
                    var earlyterm2 = 0 ;
                    var earlyterm3 = 0 ;
                    var earlyterm4 = 0 ;
                    var earlyterm5 = 0 ;
                    var earlyterm6 = 0 ;
                    var earlyterm7 = 0 ;
                    var earlyterm8 = 0 ;
                    var earlyterm9 = 0 ;
                    var earlyterm10 = 0 ;
                    var earlyterm11 = 0 ;
                    var earlyterm12 = 0 ;
         
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
                
                    var htnearlyterm2 = 0;
                    var htnearlyterm3 = 0;
                    var htnearlyterm4 = 0;
                    var htnearlyterm5 = 0;
                    var htnearlyterm6 = 0;
                    var htnearlyterm7 = 0;
                    var htnearlyterm8 = 0;
                    var htnearlyterm9 = 0;
                    var htnearlyterm10 = 0;
                    var htnearlyterm11 = 0;
                    var htnearlyterm12 = 0;
                    
                    
                    var htnearlytermdesc = 'Hypertension Early Termination : ' ;
                    nlapiLogExecution('DEBUG','Inside (nvl(htnearlytermtotal,0) != 0) ');
                    nlapiLogExecution('DEBUG','htnearlytermprice : '+htnearlytermprice);
                    var htnearlyterm1amt = nvl(htnearlyterm1,0) * nvl(htnearlytermprice,0) ; 
                    var htnearlyterm2amt = (nvl(htnearlyterm2,0) * 2) * nvl(htnearlytermprice,0) ; 
                    var htnearlyterm3amt = (nvl(htnearlyterm3,0) * 3) * nvl(htnearlytermprice,0) ;
                    var htnearlyterm4amt = (nvl(htnearlyterm4,0) * 4) * nvl(htnearlytermprice,0) ;
                    var htnearlyterm5amt = (nvl(htnearlyterm5,0) * 5) * nvl(htnearlytermprice,0) ;
                    var htnearlyterm6amt = (nvl(htnearlyterm6,0) * 6) * nvl(htnearlytermprice,0) ;
                    var htnearlyterm7amt = (nvl(htnearlyterm7,0) * 7) * nvl(htnearlytermprice,0) ;
                    var htnearlyterm8amt = (nvl(htnearlyterm8,0) * 8) * nvl(htnearlytermprice,0) ;
                    var htnearlyterm9amt = (nvl(htnearlyterm9,0) * 9) * nvl(htnearlytermprice,0) ;
                    var htnearlyterm10amt = (nvl(htnearlyterm10,0) * 10) * nvl(htnearlytermprice,0) ;
                    var htnearlyterm11amt = (nvl(htnearlyterm11,0) * 11) * nvl(htnearlytermprice,0) ;
                    var htnearlyterm12amt = (nvl(htnearlyterm12,0) * 12) * nvl(htnearlytermprice,0) ;
                    
                    if (nvl(htnearlyterm1,0) != 0) { htnearlytermdesc = htnearlytermdesc + htnearlyterm1 + ' member(s).' }; //NS-220
              
                    
                    htnearlytermtotalamt = htnearlyterm1amt+htnearlyterm2amt+htnearlyterm3amt+htnearlyterm4amt+htnearlyterm5amt+htnearlyterm6amt+htnearlyterm7amt+htnearlyterm8amt+htnearlyterm9amt+htnearlyterm10amt+htnearlyterm11amt+htnearlyterm12amt;

                }
                
                 //WM
                
                if (nvl(wmearlytermtotal,0) != 0)
                {
                
                    
                    
                    var wmearlytermdesc = 'Weight Management Early Termination : ' ;
                    nlapiLogExecution('DEBUG','Inside (nvl(wmearlytermtotal,0) != 0) ');
                    nlapiLogExecution('DEBUG','wmearlytermprice : '+wmtermprice);
                    
                    var wmearlyterm1amt = nvl(wmearlytermtotal,0) * nvl(wmtermprice,0) ; 
                    
                    if (nvl(wmearlytermtotal,0) != 0) { wmearlytermdesc = wmearlytermdesc + wmearlytermtotal + ' member(s).' }; 
              
                    
                    wmearlytermtotalamt = wmearlyterm1amt;

                }      
    
                  
                  
                earlytermtotal = earlyterm1amt+earlyterm2amt+earlyterm3amt+earlyterm4amt+earlyterm5amt+earlyterm6amt+earlyterm7amt+earlyterm8amt+earlyterm9amt+earlyterm10amt+earlyterm11amt+earlyterm12amt;
  
                var totalbillingamt = (nvl(programamt,0))+ (nvl(replamt,0)) + (nvl(referralamt,0)) + (nvl(earlytermtotal,0))+(nvl(htnprogramamt,0))+(nvl(htnreplamt,0))+(nvl(htnupfrontamt,0))+(nvl(htnreferralamt,0))+(nvl(htnearlytermtotalamt,0))+(nvl(combprogdiscamt,0))+(nvl(bundledreferralamt,0))+(nvl(wmprogramamt,0))+(nvl(wmreplamt,0))+(nvl(wmearlytermtotalamt,0))+(nvl(dmwmdiscpctamt,0));
                nlapiLogExecution('DEBUG','total billing amt : '+totalbillingamt);
                
                //calculate tax on totalbilling amt
                if (createtaxline == 'T')
                {
                    nlapiLogExecution('DEBUG','Inside Create Tax Line : '+createtaxline) ;
                    var taxamt = calctax(totalbillingamt, taxrate) ;
                    nlapiLogExecution('DEBUG','Tax amt : '+taxamt) ;
                    totalbillingamt = totalbillingamt + taxamt;
                
                
                }
                
                 nlapiLogExecution('DEBUG','(nvl(programamt,0)) : '+(nvl(programamt,0)));
                 nlapiLogExecution('DEBUG','(nvl(replamt,0)) : '+(nvl(replamt,0)));
                 nlapiLogExecution('DEBUG','(nvl(referralamt,0)) : '+(nvl(referralamt,0)));
                 nlapiLogExecution('DEBUG','(nvl(earlytermtotal,0)) : '+(nvl(earlytermtotal,0)));
                 nlapiLogExecution('DEBUG','(nvl(htnprogramamt,0)) : '+(nvl(htnprogramamt,0)));
                 nlapiLogExecution('DEBUG','(nvl(htnreplamt,0)) : '+(nvl(htnreplamt,0)));
                 nlapiLogExecution('DEBUG','(nvl(htnupfrontamt,0)) : '+(nvl(htnupfrontamt,0)));
                 nlapiLogExecution('DEBUG','(nvl(htnearlytermtotalamt,0)) : '+(nvl(htnearlytermtotalamt,0)));
                 nlapiLogExecution('DEBUG','(nvl(htnreferralamt,0)) : '+(nvl(htnreferralamt,0)));
                 nlapiLogExecution('DEBUG','(nvl(bundledreferralamt,0)) : '+(nvl(bundledreferralamt,0)));
                // nlapiLogExecution('DEBUG','(nvl(combprogramamt,0)) : '+(nvl(combprogramamt,0)));
                 nlapiLogExecution('DEBUG','(nvl(htnearlytermtotalamt,0)) : '+(nvl(htnearlytermtotalamt,0)));
                 nlapiLogExecution('DEBUG','(nvl(combprogdiscamt,0)) : '+(nvl(combprogdiscamt,0)));
                 
             
                 
              } //End Bundled
              
    
            
             
             // Check Billing Exceptions
             var billingexceptions = '||';
             
             if (replfocmsg)
             {
                billingexceptions = billingexceptions + replfocmsg ; //NS-87
                nlapiLogExecution('DEBUG','billingexceptions after replfocmsg : '+billingexceptions) ;
                nlapiSetFieldValue('custrecord_bs2_ns_billing_exceptions', billingexceptions );
                nlapiSetFieldValue('custrecord_bs2_repl_meter_qty', 0 ); //101718

             }
             
             
             if (inactivebilling == 'T')
             {
                nlapiSetFieldValue('custrecord_bs2_billable','F');
                billingexceptions = 'Customer is flagged as inactive for billing. || '
                nlapiSetFieldValue('custrecord_bs2_ns_billing_exceptions', billingexceptions );
             }
             
             if (totalbillingamt == 0)
             {
                nlapiSetFieldValue('custrecord_bs2_billable','F');
                billingexceptions = billingexceptions + 'Total billing amount is zero. || ' ;
                nlapiSetFieldValue('custrecord_bs2_ns_billing_exceptions', billingexceptions );
             }
             //NS-287
             if (contractstatus == 'Terminated')
             {
                nlapiSetFieldValue('custrecord_bs2_billable','F');
                billingexceptions = billingexceptions + 'Contract Status is Terminated. || ' ;
                nlapiSetFieldValue('custrecord_bs2_ns_billing_exceptions', billingexceptions );
             }
            

             //if (nvl(current_enrolled,0) > enrollmentcap && enrollmentcap != 0)
             if (nvl(activememberssum,0) > enrollmentcap && enrollmentcap != 0)
             {
                //billingexceptions = billingexceptions + 'Enrollment cap exceeded - '+ enrollmentcap + '. ' + 'Use cap as billing quantity.  Platform billable active members : '+origactivemembers+'.|| '; 
                billingexceptions = billingexceptions + 'This contract has enrollment cap - '+ enrollmentcap + '. ' + 'Please review and confirm enrollment cap.  If enrollment cap is valid, overwrite active members quantity in billing summary record.  Active members sum : '+activememberssum+'|| '; 
                nlapiSetFieldValue('custrecord_bs2_ns_billing_exceptions', billingexceptions );
             }
            
             if (clienttype == 'Internal' || clienttype == 'Direct to Consumer (D2C)')
             {
                nlapiSetFieldValue('custrecord_bs2_billable','F');
             }
           
             
              nlapiLogExecution('DEBUG', 'VALUE', 'Record Type: '+recordtype);
              
             if (recordtype == 'Sales Tax')
             {
                nlapiSetFieldValue('custrecord_bs2_billable','F');
                billingexceptions = billingexceptions + 'Sales Tax Reporting' 
                nlapiSetFieldValue('custrecord_bs2_ns_billing_exceptions', billingexceptions);
                nlapiSetFieldValue('custrecord_bs2_ns_internal_id',-9999);
             }
             

             if (clientcode == 'JTEKT')
             {
                 progitemdesc = cleanString(grouping);
             }
             else
             {
                 progitemdesc = progitemdesc + ' - ' + convertdate(billing_date, 'MONTHYY') + ' ('+grouping+' )'; 
             }
             

             
              nlapiLogExecution('DEBUG', 'VALUE', 'Active Members: '+activemembers);
              nlapiLogExecution('DEBUG', 'VALUE', 'Referral Fee: '+adminfee);
              nlapiLogExecution('DEBUG', 'VALUE', 'Referral Amt: '+referralamt);
              nlapiLogExecution('DEBUG', 'VALUE', 'Prog Desc : '+progitemdesc);
              nlapiLogExecution('DEBUG', 'VALUE', 'Client Code : '+clientcode);
              nlapiLogExecution('DEBUG', 'VALUE', 'Total Billing Amount : '+totalbillingamt);
              
              nlapiSetFieldValue('custrecord_bs2_ns_invoice_number', invoicenum );
              nlapiSetFieldValue('custrecord_bs2_ns_program_desc', progitemdesc );
              
              nlapiSetFieldValue('custrecord_bs2_ns_referral_fee_amt', referralamt );
              nlapiSetFieldValue('custrecord_bs2_ns_program_amt', programamt );
              nlapiSetFieldValue('custrecord_bs2_ns_upfront_amt', upfrontamt );
              nlapiSetFieldValue('custrecord_bs2_ns_replacement_amt', replamt );
              nlapiSetFieldValue('custrecord_bs2_ns_termination_amt', earlytermtotal );
              nlapiSetFieldValue('custrecord_bs2_ns_termination_desc',earlytermdesc );
              nlapiSetFieldValue('custrecord_bs2_ns_total_billing_amt',totalbillingamt );


              nlapiSetFieldValue('custrecord_bs2_ns_ffs_lancets_amt',ffs_lancetamt );
              nlapiSetFieldValue('custrecord_bs2_ns_ffs_strips_amt', ffs_stripamt );
              nlapiSetFieldValue('custrecord_bs2_ns_ffs_lancing_amt',ffs_lancingamt );
              nlapiSetFieldValue('custrecord_bs2_ns_ffs_control_sol_amt',ffs_controlsolamt );

              nlapiSetFieldValue('custrecord_bs2_ns_htn_admin_fee_amt', htnreferralamt );
              nlapiSetFieldValue('custrecord_bs2_ns_htn_program_amt', htnprogramamt );
              nlapiSetFieldValue('custrecord_bs2_htn_upfront_amt', htnupfrontamt );
              nlapiSetFieldValue('custrecord_bs2_ns_htn_replacement_amt', htnreplamt );
              nlapiSetFieldValue('custrecord_bs2_ns_htn_term_amt', htnearlytermtotalamt );

              nlapiSetFieldValue('custrecord_bs2_ns_cb_term_amt', combearlytermtotalamt );
              nlapiSetFieldValue('custrecord_bs2_htn_program_desc', htnitemdesc );
             
              nlapiSetFieldValue('custrecord_bs2_ns_htn_term_item_desc',htnearlytermdesc );
              nlapiSetFieldValue('custrecord_bs2_cb_pppm_discount_amt', combprogdiscamt );
              
              nlapiSetFieldValue('custrecord_bs2_tax_amount', taxamt );
              
              //NS-246
              nlapiSetFieldValue('custrecord_bs2_ns_bundled_admin_fee_amt', bundledreferralamt );
              
              //NS-287
              nlapiSetFieldValue('custrecord_bs2_dmhtn_program_amt', combprogramamt );
              nlapiSetFieldValue('custrecord_bs2_cb_bundled_discount_pct', bundleddiscountpct);
              
              //WM
              //nlapiSetFieldValue('custrecord_bs2_ns_wm_admin_fee_amt', wmreferralamt );
              nlapiSetFieldValue('custrecord_bs2_ns_wm_program_amt', wmprogramamt );
              nlapiSetFieldValue('custrecord_bs2_ns_wm_replacement_amt', wmreplamt );
              nlapiSetFieldValue('custrecord_bs2_ns_wm_term_amt', wmearlytermtotalamt );
              nlapiSetFieldValue('custrecord_bs2_wm_program_desc', wmprogitemdesc );
              nlapiSetFieldValue('custrecord_bs2_ns_wm_term_item_desc',wmearlytermdesc );
              
              // Multi product conditions discount
              nlapiSetFieldValue('custrecord_bs2_dmwm_program_amt', dmwmamt );
			  nlapiSetFieldValue('custrecord_bs2_dpphtn_program_amt', dpphtnamt );
			  nlapiSetFieldValue('custrecord_bs2_dmhtnwm_program_amt', dmhtnwmamt);
			  //New
			  nlapiSetFieldValue('custrecord_bs2_dmwm_discount_amt', dmwmdiscpctamt );
			  nlapiSetFieldValue('custrecord_bs2_dpphtn_discount_amt', dpphtndiscpctamt );
			  nlapiSetFieldValue('custrecord_bs2_dmhtnwm_discount_amt', dmhtnwmdiscpctamt );

   
          } // for loop
       }
       else
       {
               nlapiSetFieldValue('custrecord_bs2_ns_billing_exceptions', 'Unable to find NetSuite Customer' );
              nlapiSetFieldValue('custrecord_bs2_billable','F');
          
        }  //arrResult

    

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
   
function calctax(num, rate){
  var taxamt = num * (rate/100) ;
  nlapiLogExecution('DEBUG','tax amt: '+ taxamt ) ;
  return taxamt ;
}

   

   