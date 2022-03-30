//last update date: 111618 - NS-236 - Billing Summary V2
//113018 - move contract number to custom col field
//121418 - fixed bug with htn meter item desc and htn replc meter item
//121818 - NS-249 - HTN admin fee and bundled admin fee
//010919 - NS-259 - bug fix : billing summary record id not populated on invoice record / HTN Standalone referral amt
//012419 - NS-269 - tag in Salesforce Opportunity ID to invoice line
//021319 - NS-287 - support bundle discount %
//053019 - WM/DPP
//100719 - WM / DPP Referral Fee
//03232020 - Added NVL function for price/amount
//03232020 - Added clientcode grouping to item description.
//06232020 - Added Wholeperson Items

function CreateInvoice()
{
 try
 {
  //Search custom billing summary

  var arrFilter = new Array();
  var arrColumns = new Array();

  //var pdate = nlapiGetContext().getSetting('SCRIPT', 'custscript_liv_date');//SB1
  var pdate = nlapiGetContext().getSetting('SCRIPT', 'custscript_liv_date2');//Prod
  nlapiLogExecution('DEBUG', 'Script Parameter','pdate = '+pdate);
  
  arrFilter[0] = new nlobjSearchFilter('custrecord_bs2_ns_internal_id', null, 'isempty',  'null' );
  arrFilter[1] = new nlobjSearchFilter('custrecord_bs2_billable', null, 'is',  'T' );
  arrFilter[2] = new nlobjSearchFilter('custrecord_bs2_date', null, 'on',  pdate );


  //Define output columns for search results

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


  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_ns_htn_term_item'));
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_ns_htn_term_item_desc'));
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_cb_active_members_qty'));


  
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

  //WM & DPP
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_wm_active_members_qty'));
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_wm_only_active_members_q'));
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_ns_wm_pppm_price'));
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_ns_wm_program_amt'));
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_ns_wm_program_item'));
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_wm_program_desc'));
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_ns_wm_repl_meter_qty'));
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_ns_wm_replace_price'));
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_ns_wm_replacement_amt'));
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_ns_wm_repl_item'));
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_ns_wm_repl_item_desc'));
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_wm_early_term_total'));
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_ns_wm_term_amt'));
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_ns_wm_term_item'));
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_ns_wm_term_item_desc'));
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_dpp_active_members_qty'));
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_dpp_only_active_members_q'));
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_ns_dpp_pppm_price'));
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_ns_dpp_program_amt'));
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_ns_dpp_program_item'));
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_dpp_program_desc'));
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_ns_dpp_repl_meter_qty'));
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_ns_dpp_replace_price'));
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_ns_dpp_replacement_amt'));
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_ns_dpp_repl_item'));
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_ns_dpp_repl_item_desc'));
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_dpp_early_term_total'));
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_ns_dpp_term_price'));
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_ns_dpp_term_amt'));
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_ns_dpp_term_item'));
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_ns_dpp_term_item_desc'));

  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_ns_termination_price'));
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_ns_wm_term_price'));
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_ns_termination_price'));

  // WM & DPP
  
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_ns_wm_admin_fee_amt'));
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_wm_only_active_members_q'));

  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_ns_dpp_admin_fee'));
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_ns_dpp_admin_fee'));

  // Bundled Qty and Bundled Amt
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_bundle_discount_qty'));
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_bundle_discount_amt'));

  //program bundles
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_dmwm_active_members_qty')); //DM + WM qty
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_dmwm_program_amt'));  //DM + WM amt
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_dmwm_discount_amt')); //DM + WM disc

  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_dpphtn_active_members_qty')); //DPP + HTN qty
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_dpphtn_program_amt')); //DPP + HTN amt
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_dpphtn_discount_amt')); //DPP + HTN disc

  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_dmhtnwm_active_members_q'));
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_dmhtnwm_program_amt'));
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_dmhtnwm_discount_amt'));
  
  //WP
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_ns_wp_item'));
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_ns_wp_desc'));
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_wp_meter_qty'));
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_ns_wp_price'));
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_ns_wp_amt'));
  
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_ns_htn_wp_item'));
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_ns_htn_wp_item_desc'));
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_ns_htn_wp_meter_qty'));
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_ns_htn_wp_price'));
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_ns_htn_wp_amt'));
  
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_ns_dpp_wp_item'));
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_ns_dpp_wp_item_desc'));
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_ns_dpp_wp_meter_qty'));
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_ns_dpp_wp_price'));
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_ns_dpp_wp_amt'));
  
  //WP Early Term
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_ns_wp_term_item'));
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_ns_wp_term_desc'));
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_wp_term_qty'));
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_ns_wp_term_price'));
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_ns_wp_term_amt'));
  
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_ns_htn_wp_term_item'));
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_ns_htn_wp_term_item_desc'));
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_ns_htn_wp_term_qty'));
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_ns_htn_wp_term_price'));
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_ns_htn_wp_term_amt'));
  
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_ns_dpp_wp_term_item'));
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_ns_dpp_wp_term_item_desc'));
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_ns_dpp_wp_term_qty'));
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_ns_dpp_wp_term_price'));
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_ns_dpp_wp_term_amt'));
  
  //BH2
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_bh2_program_item'));
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_bh2_program_item_desc'));
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_bh2_participants_qty'));
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_bh2_program_price'));
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_bh2_program_amt'));
  
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_bh2_pepm_program_item'));
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_bh2_pepm_prog_item_desc'));
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_bh2_pepm_participants_qty'));
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_bh2_pepm_program_price'));
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_bh2_pepm_program_amt'));
  
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_tier2_json'));
  
  /*arrColumns.push(new nlobjSearchColumn('custrecord_bs2_ns_invoice_members_qty'));// NS INVOICE BILLED MEMBERS
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_ns_dbt_referral_fee'));// NS DBT REFERRAL FEE
*/    
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_ns_dbt_admin_members'));//NS DBT Admin Member Qty
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_ns_referral_fee'));//NS ADMIN FEE
  
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_ns_htn_admin_members'));//NS HTN Admin Member Qty	
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_ns_htn_admin_fee'));//NS HTN ADMIN FEE
  
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_ns_wm_admin_members'));//NS WM Admin Member Qty	
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_ns_wm_admin_fee'));//NS WM ADMIN FEE
  
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_ns_dpp_admin_members'));//NS DPP Admin Member Qty
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_ns_dpp_admin_fee'));//NS DPP ADMIN FEE
  
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_ns_htn_dbt_admin_members'));//NS HTN DBT Admin Member Qty	
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_ns_htn_dbt_admin_fee'));//NS HTN DBT ADMIN FEE
  
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_ns_wm_dbt_admin_members'));//NS WM DBT Admin Member Qty
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_ns_wm_dbt_admin_fee'));//NS WM DBT ADMIN FEE
  
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_ns_wm_htn_admin_members'));//NS WM HTN Admin Member Qty  
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_ns_wm_htn_admin_fee'));//NS WM HTN ADMIN FEE
  
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_ns_wm_htn_dbt_admin_membe'));//NS WM HTN DBT Admin Member Qty	
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_ns_wm_htn_dbt_admin_fee'));//NS WM HTN DBT ADMIN FEE
  
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_ns_wm2_htn_admin_members'));//NS WM2 HTN Admin Member Qty	
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_ns_wm2_htn_admin_fee'));//NS WM2 HTN ADMIN FEE
  
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_ns_wm2_htn_dbt_admin_memb'));//NS WM2 HTN DBT Admin Member Qty	
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_ns_wm2_htn_dbt_admin_fee'));//NS WM2 HTN DBT ADMIN FEE
    
  arrColumns.push(new nlobjSearchColumn('custrecord_get_partner_admin_fee_from_rs'));//Get Partner Admin Fee From RS
  
  var previousinvoice = null ;
  var firstline = false ;
  var editinvoice = false;
  var recordid = 0;
  var invoiceid = 0;
  var previousinvoiceid = 0;

  //var arrResult = nlapiSearchRecord('customrecord_liv_billing_summary_v2', null, arrFilter, arrColumns);
  var arrResult = searchAllRecord('customrecord_liv_billing_summary_v2', null, arrFilter, arrColumns);
  
  if(arrResult)
	  nlapiLogExecution('DEBUG', 'Search Results','arrResult Length = '+arrResult.length);
  else 
	  nlapiLogExecution('DEBUG', 'Search Results','arrResult is NULL');
  
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
        var  ccgrouping = customrecord.getValue('custrecord_bs2_grouping');


        var htnearlytermtotal = customrecord.getValue('custrecord_bs2_htn_early_term_total') ;
       // var cbearlytermtotal = customrecord.getValue('custrecord_bs2_cb_early_term_total') ;

       //Tax Line
        var createtaxline = customrecord.getValue('custrecord_bs2_create_tax_line') ;
        var taxamount = customrecord.getValue('custrecord_bs2_tax_amount') ;
        var taxrate = customrecord.getValue('custrecord_bs2_tax_rate') ;
        var taxitem = customrecord.getValue('custrecord_bs2_tax_item') ;
        var taxitemdesc = customrecord.getValue('custrecord_bs2_tax_item_desc') ;

        //WM

        var wmpppmprice = customrecord.getValue('custrecord_bs2_ns_wm_pppm_price');
        var wmreplprice = customrecord.getValue('custrecord_bs2_ns_wm_replace_price');
        //var wmupfrontprice = customrecord.getValue('custrecord_bs2_ns_wm_upfront_price');

        var wmprogitem = customrecord.getValue('custrecord_bs2_ns_wm_program_item');
        var wmprogdesc = customrecord.getValue('custrecord_bs2_wm_program_desc');
        var wmreplitem = customrecord.getValue('custrecord_bs2_ns_wm_repl_item');
        var wmrepldesc = customrecord.getValue('custrecord_bs2_ns_wm_repl_item_desc');
        var wmtermitem = customrecord.getValue('custrecord_bs2_ns_wm_term_item');
        var wmtermdesc = customrecord.getValue('custrecord_bs2_ns_wm_term_item_desc');

        var wmprogqty = customrecord.getValue('custrecord_bs2_wm_active_members_qty');
        var wmreplqty = customrecord.getValue('custrecord_bs2_ns_wm_repl_meter_qty') ;
        var wmearlytermtotal = customrecord.getValue('custrecord_bs2_wm_early_term_total') ;
        var wmtermamt = customrecord.getValue('custrecord_bs2_ns_wm_term_amt') ;


        //DPP

        var dpppppmprice = customrecord.getValue('custrecord_bs2_ns_dpp_pppm_price');
        var dppreplprice = customrecord.getValue('custrecord_bs2_ns_dpp_replace_price');
        //var dppupfrontprice = customrecord.getValue('custrecord_bs2_ns_dpp_upfront_price');

        var dppprogitem = customrecord.getValue('custrecord_bs2_ns_dpp_program_item');
        var dppprogdesc = customrecord.getValue('custrecord_bs2_dpp_program_desc');
        var dppreplitem = customrecord.getValue('custrecord_bs2_ns_dpp_repl_item');
        var dpprepldesc = customrecord.getValue('custrecord_bs2_ns_dpp_repl_item_descc');
        var dpptermitem = customrecord.getValue('custrecord_bs2_ns_dpp_term_item');
        var dpptermdesc = customrecord.getValue('custrecord_bs2_ns_dpp_term_item_desc');

        var dppprogqty = customrecord.getValue('custrecord_bs2_dpp_active_members_qty');
        var dppreplqty = customrecord.getValue('custrecord_bs2_ns_dpp_repl_meter_qty') ;
        var dppearlytermtotal = customrecord.getValue('custrecord_bs2_dpp_early_term_total') ;
        var dpptermamt = customrecord.getValue('custrecord_bs2_ns_dpp_term_amt') ;

        //BH2
        var bh2item = customrecord.getValue('custrecord_bs2_bh2_program_item');
        var bh2itemdesc = customrecord.getValue('custrecord_bs2_bh2_program_item_desc');
        var bh2qty = customrecord.getValue('custrecord_bs2_bh2_participants_qty');
        var bh2price = customrecord.getValue('custrecord_bs2_bh2_program_price');
        var bh2amt = customrecord.getValue('custrecord_bs2_bh2_program_amt');
        
        var bh2pepmitem = customrecord.getValue('custrecord_bs2_bh2_pepm_program_item');
        var bh2pepmitemdesc = customrecord.getValue('custrecord_bs2_bh2_pepm_prog_item_desc');
        var bh2pepmqty = customrecord.getValue('custrecord_bs2_bh2_pepm_participants_qty');
        var bh2pepmprice = customrecord.getValue('custrecord_bs2_bh2_pepm_program_price');
        var bh2pepmamt = customrecord.getValue('custrecord_bs2_bh2_pepm_program_amt');
        
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

        nlapiLogExecution('AUDIT', 'ITEM VALUES', 'progitem = '+progitem);
        nlapiLogExecution('AUDIT', 'ITEM VALUES', 'progdesc = '+progdesc);
        
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

        nlapiLogExecution('AUDIT', 'ITEM VALUES', 'htnprogitem = '+htnprogitem);
        nlapiLogExecution('AUDIT', 'ITEM VALUES', 'htnprogdesc = '+htnprogdesc);
        
        //Combined quantities
        var bundleqty = customrecord.getValue('custrecord_bs2_bundle_discount_qty'); // Bundle Qty
        var cbprogqty = customrecord.getValue('custrecord_bs2_cb_active_members_qty');
        var dmwmprogqty = customrecord.getValue('custrecord_bs2_dmwm_active_members_qty');
        var dpphtnprogqty = customrecord.getValue('custrecord_bs2_dpphtn_active_members_qty');
        var dmhtnwmprogqty = customrecord.getValue('custrecord_bs2_dmhtnwm_active_members_qty');

        //
        //var cbdiscountamt = customrecord.getValue('custrecord_bs2_cb_pppm_discount_amt') ;
        var cbdiscountamt = customrecord.getValue('custrecord_bs2_bundle_discount_amt');  // Budndle discount amount
        var cbdiscountprice = customrecord.getValue('custrecord_bs2_cb_pppm_discount_price') ;
        var cbdiscountpct = customrecord.getValue('custrecord_bs2_cb_bundled_discount_pct') ; //NS-287
        var cbdiscountitem = customrecord.getValue('custrecord_bs2_cb_discount_item') ;
        var cbdmhtnprogamt = customrecord.getValue('custrecord_bs2_dmhtn_program_amt') ; //NS-287

        //Multi product
        var dmwmdiscountamt = customrecord.getValue('custrecord_bs2_dmwm_discount_amt') ;
        var dmwmprogamt = customrecord.getValue('custrecord_bs2_dmwm_program_amt') ;


        var dpphtndiscountamt = customrecord.getValue('custrecord_bs2_dpphtn_discount_amt') ;
        var dpphtnprogamt = customrecord.getValue('custrecord_bs2_dpphtn_program_amt') ;

        var dmhtnwmdiscountamt = customrecord.getValue('custrecord_bs2_dmhtnwm_discount_amt') ;
        var dmhtnwmprogamt = customrecord.getValue('custrecord_bs2_dmhtnwm_program_amt') ;

        // Replacement Meter
        var replitem = customrecord.getValue('custrecord_bs2_ns_replacement_item');
        var repldesc = customrecord.getValue('custrecord_bs2_ns_replc_desc');

        nlapiLogExecution('AUDIT', 'ITEM VALUES', 'replitem = '+replitem);
        nlapiLogExecution('AUDIT', 'ITEM VALUES', 'repldesc = '+repldesc);        

        var htnreplitem = customrecord.getValue('custrecord_bs2_ns_htn_repl_item');
        var htnrepldesc = customrecord.getValue('custrecord_bs2_ns_htn_repl_item_desc');
        var htnreplqty = customrecord.getValue('custrecord_bs2_ns_htn_repl_meter_qty');
        var htnreplprice = customrecord.getValue('custrecord_bs2_ns_htn_replace_price');

        nlapiLogExecution('AUDIT', 'ITEM VALUES', 'htnreplitem = '+htnreplitem);
        nlapiLogExecution('AUDIT', 'ITEM VALUES', 'htnrepldesc = '+htnrepldesc);   
        
        /*****Wholeperson*****/
        //DBT        
        var wpitem = customrecord.getValue('custrecord_bs2_ns_wp_item');
        var wpitemdesc = customrecord.getValue('custrecord_bs2_ns_wp_desc');
        var wpqty = customrecord.getValue('custrecord_bs2_wp_meter_qty');
        var wpprice = customrecord.getValue('custrecord_bs2_ns_wp_price');
        var wpamt = customrecord.getValue('custrecord_bs2_ns_wp_amt');
        
        nlapiLogExecution('AUDIT', 'ITEM VALUES', 'wpitem = '+wpitem);
        nlapiLogExecution('AUDIT', 'ITEM VALUES', 'wpitemdesc = '+wpitemdesc);
        nlapiLogExecution('DEBUG', 'WP Values', 'wpqty = '+wpqty);
        nlapiLogExecution('DEBUG', 'WP Values', 'wpprice = '+wpprice);
        nlapiLogExecution('DEBUG', 'WP Values', 'wpamt = '+wpamt);
        
        
        //HTN
        var htnwpitem = customrecord.getValue('custrecord_bs2_ns_htn_wp_item');
        var htnwpitemdesc = customrecord.getValue('custrecord_bs2_ns_htn_wp_item_desc');
        var htnwpqty = customrecord.getValue('custrecord_bs2_ns_htn_wp_meter_qty');
        var htnwpprice = customrecord.getValue('custrecord_bs2_ns_htn_wp_price');
        var htnwpamt = customrecord.getValue('custrecord_bs2_ns_htn_wp_amt');
        
        nlapiLogExecution('AUDIT', 'ITEM VALUES', 'htnwpitem = '+htnwpitem);
        nlapiLogExecution('AUDIT', 'ITEM VALUES', 'htnwpitemdesc = '+htnwpitemdesc);
        nlapiLogExecution('DEBUG', 'WP Values', 'htnwpqty = '+htnwpqty);
        nlapiLogExecution('DEBUG', 'WP Values', 'htnwpprice = '+htnwpprice);
        nlapiLogExecution('DEBUG', 'WP Values', 'htnwpamt = '+htnwpamt);
        
        //DPP
        var dppwpitem = customrecord.getValue('custrecord_bs2_ns_dpp_wp_item');
        var dppwpitemdesc = customrecord.getValue('custrecord_bs2_ns_dpp_wp_item_desc');
        var dppwpqty = customrecord.getValue('custrecord_bs2_ns_dpp_wp_meter_qty');
        var dppwpprice = customrecord.getValue('custrecord_bs2_ns_dpp_wp_price');
        var dppwpamt = customrecord.getValue('custrecord_bs2_ns_dpp_wp_amt');
        
        nlapiLogExecution('AUDIT', 'ITEM VALUES', 'dppwpitem = '+dppwpitem);
        nlapiLogExecution('AUDIT', 'ITEM VALUES', 'dppwpitemdesc = '+dppwpitemdesc);
        nlapiLogExecution('DEBUG', 'WP Values', 'dppwpqty = '+dppwpqty);
        nlapiLogExecution('DEBUG', 'WP Values', 'dppwpprice = '+dppwpprice);
        nlapiLogExecution('DEBUG', 'WP Values', 'dppwpamt = '+dppwpamt);
                
        /***********************/
        /*****Wholeperson Early Termination*****/
        //DBT        
        var wptermitem = customrecord.getValue('custrecord_bs2_ns_wp_term_item');
        var wptermitemdesc = customrecord.getValue('custrecord_bs2_ns_wp_term_desc');
        var wptermqty = customrecord.getValue('custrecord_bs2_wp_term_qty');
        var wptermprice = customrecord.getValue('custrecord_bs2_ns_wp_term_price');
        var wptermamt = customrecord.getValue('custrecord_bs2_ns_wp_term_amt');
        
        nlapiLogExecution('AUDIT', 'ITEM VALUES', 'wptermitem = '+wptermitem);
        nlapiLogExecution('AUDIT', 'ITEM VALUES', 'wptermitemdesc = '+wptermitemdesc);
        nlapiLogExecution('DEBUG', 'WP Values', 'wptermqty = '+wptermqty);
        nlapiLogExecution('DEBUG', 'WP Values', 'wptermprice = '+wptermprice);
        nlapiLogExecution('DEBUG', 'WP Values', 'wptermamt = '+wptermamt);
        
        
        //HTN
        var htnwptermitem = customrecord.getValue('custrecord_bs2_ns_htn_wp_term_item');
        var htnwptermitemdesc = customrecord.getValue('custrecord_bs2_ns_htn_wp_term_item_desc');
        var htnwptermqty = customrecord.getValue('custrecord_bs2_ns_htn_wp_term_qty');
        var htnwptermprice = customrecord.getValue('custrecord_bs2_ns_htn_wp_term_price');
        var htnwptermamt = customrecord.getValue('custrecord_bs2_ns_htn_wp_term_amt');
        
        nlapiLogExecution('AUDIT', 'ITEM VALUES', 'htnwptermitem = '+htnwptermitem);
        nlapiLogExecution('AUDIT', 'ITEM VALUES', 'htnwptermitemdesc = '+htnwptermitemdesc);
        nlapiLogExecution('DEBUG', 'WP Values', 'htnwptermqty = '+htnwptermqty);
        nlapiLogExecution('DEBUG', 'WP Values', 'htnwptermprice = '+htnwptermprice);
        nlapiLogExecution('DEBUG', 'WP Values', 'htnwptermamt = '+htnwptermamt);
        
        //DPP
        var dppwptermitem = customrecord.getValue('custrecord_bs2_ns_dpp_wp_term_item');
        var dppwptermitemdesc = customrecord.getValue('custrecord_bs2_ns_dpp_wp_term_item_desc');
        var dppwptermqty = customrecord.getValue('custrecord_bs2_ns_dpp_wp_term_qty');
        var dppwptermprice = customrecord.getValue('custrecord_bs2_ns_dpp_wp_term_price');
        var dppwptermamt = customrecord.getValue('custrecord_bs2_ns_dpp_wp_term_amt');
        
        nlapiLogExecution('AUDIT', 'ITEM VALUES', 'dppwptermitem = '+dppwptermitem);
        nlapiLogExecution('AUDIT', 'ITEM VALUES', 'dppwptermitemdesc = '+dppwptermitemdesc);
        nlapiLogExecution('DEBUG', 'WP Values', 'dppwptermqty = '+dppwptermqty);
        nlapiLogExecution('DEBUG', 'WP Values', 'dppwptermprice = '+dppwptermprice);
        nlapiLogExecution('DEBUG', 'WP Values', 'dppwptermamt = '+dppwptermamt);
                
        /***********************/

        if (nvl(ovrreplmeters,0) > 0 )
        {
           var replqty = nvl(ovrreplmeters,0)  ;
           nlapiLogExecution('DEBUG', 'VALUE', 'if replqty: '+replqty);
        }


        if (nvl(ovrreplmeters,0) == 0 )
        {
           var replqty = nvl(replmeters,0)  ;
           nlapiLogExecution('DEBUG', 'VALUE', 'replqty = nvl(replmeters,0) '+replqty);
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


        // 100719 WM & DPP
        var wmreferralitem = customrecord.getValue('custrecord_bs2_ns_referral_fee_item');
        var wmreferraldesc = customrecord.getValue('custrecord_bs2_ns_referral_fee_desc');
        var wmreferralrate = customrecord.getValue('custrecord_bs2_ns_wm_admin_fee');
        var wmreferralamt = customrecord.getValue('custrecord_bs2_ns_wm_admin_fee_amt');
        var wmreferralqty = customrecord.getValue('custrecord_bs2_wm_only_active_members_q');  //259

        var dppreferralitem = customrecord.getValue('custrecord_bs2_ns_referral_fee_item');
        var dppreferraldesc = customrecord.getValue('custrecord_bs2_ns_referral_fee_desc');
        var dppreferralrate = customrecord.getValue('custrecord_bs2_ns_dpp_admin_fee');
        var dppreferralamt = customrecord.getValue('custrecord_bs2_ns_dpp_admin_fee_amt');
        var dppreferralqty = customrecord.getValue('custrecord_bs2_dpp_only_active_members_q');  //259



        //NS-249
        var bundledreferralitem = customrecord.getValue('custrecord_bs2_ns_referral_fee_item');
        var bundledreferraldesc = customrecord.getValue('custrecord_bs2_ns_referral_fee_desc');
        var bundledreferralrate = customrecord.getValue('custrecord_bs2_ns_bundled_admin_fee');
        var bundledreferralamt = customrecord.getValue('custrecord_bs2_ns_bundled_admin_fee_amt');
        var bundledreferralqty = customrecord.getValue('custrecord_bs2_cb_active_members_qty');

        var getPartnerAdminFeeFromRS = customrecord.getValue('custrecord_get_partner_admin_fee_from_rs');
        
        var dbtAdminQty = customrecord.getValue('custrecord_bs2_ns_dbt_admin_members');
        var dbtAdminRate = customrecord.getValue('custrecord_bs2_ns_referral_fee');
        var dbtReferralitem = customrecord.getValue('custrecord_bs2_ns_referral_fee_item');
        var dbtReferraldesc = customrecord.getValue('custrecord_bs2_ns_referral_fee_desc');
        
        var htnAdminQty = customrecord.getValue('custrecord_bs2_ns_htn_admin_members');
        var htnAdminRate = customrecord.getValue('custrecord_bs2_ns_htn_admin_fee');
        var htnReferralitem = customrecord.getValue('custrecord_bs2_ns_referral_fee_item');
        var htnReferraldesc = customrecord.getValue('custrecord_bs2_ns_referral_fee_desc');
        
        var wmAdminQty = customrecord.getValue('custrecord_bs2_ns_wm_admin_members');
        var wmAdminRate = customrecord.getValue('custrecord_bs2_ns_wm_admin_fee');
        var wmReferralitem = customrecord.getValue('custrecord_bs2_ns_referral_fee_item');
        var wmReferraldesc = customrecord.getValue('custrecord_bs2_ns_referral_fee_desc');
        
        var dppAdminQty = customrecord.getValue('custrecord_bs2_ns_dpp_admin_members');
        var dppAdminRate = customrecord.getValue('custrecord_bs2_ns_dpp_admin_fee');
        var dppReferralitem = customrecord.getValue('custrecord_bs2_ns_referral_fee_item');
        var dppReferraldesc = customrecord.getValue('custrecord_bs2_ns_referral_fee_desc');
        
        var htndbtAdminQty = customrecord.getValue('custrecord_bs2_ns_htn_dbt_admin_members');
        var htndbtAdminRate = customrecord.getValue('custrecord_bs2_ns_htn_dbt_admin_fee');
        var htndbtReferralitem = customrecord.getValue('custrecord_bs2_ns_referral_fee_item');
        var htndbtReferraldesc = customrecord.getValue('custrecord_bs2_ns_referral_fee_desc');
        
        var wmdbtAdminQty = customrecord.getValue('custrecord_bs2_ns_wm_dbt_admin_members');
        var wmdbtAdminRate = customrecord.getValue('custrecord_bs2_ns_wm_dbt_admin_fee');
        var wmdbtReferralitem = customrecord.getValue('custrecord_bs2_ns_referral_fee_item');
        var wmdbtReferraldesc = customrecord.getValue('custrecord_bs2_ns_referral_fee_desc');
        
        var wmhtnAdminQty = customrecord.getValue('custrecord_bs2_ns_wm_htn_admin_members');
        var wmhtnAdminRate = customrecord.getValue('custrecord_bs2_ns_wm_htn_admin_fee');
        var wmhtnReferralitem = customrecord.getValue('custrecord_bs2_ns_referral_fee_item');
        var wmhtnReferraldesc = customrecord.getValue('custrecord_bs2_ns_referral_fee_desc');
        
        var wmhtndbtAdminQty = customrecord.getValue('custrecord_bs2_ns_wm_htn_dbt_admin_membe');
        var wmhtndbtAdminRate = customrecord.getValue('custrecord_bs2_ns_wm_htn_dbt_admin_fee');
        var wmhtndbtReferralitem = customrecord.getValue('custrecord_bs2_ns_referral_fee_item');
        var wmhtndbtReferraldesc = customrecord.getValue('custrecord_bs2_ns_referral_fee_desc');
        
        var wm2htnAdminQty = customrecord.getValue('custrecord_bs2_ns_wm2_htn_admin_members');
        var wm2htnAdminRate = customrecord.getValue('custrecord_bs2_ns_wm2_htn_admin_fee');
        var wm2htnReferralitem = customrecord.getValue('custrecord_bs2_ns_referral_fee_item');
        var wm2htnReferraldesc = customrecord.getValue('custrecord_bs2_ns_referral_fee_desc');
        
        var wm2htndbtAdminQty = customrecord.getValue('custrecord_bs2_ns_wm2_htn_dbt_admin_memb');
        var wm2htndbtAdminRate = customrecord.getValue('custrecord_bs2_ns_wm2_htn_dbt_admin_fee');
        var wm2htndbtReferralitem = customrecord.getValue('custrecord_bs2_ns_referral_fee_item');
        var wm2htndbtReferraldesc = customrecord.getValue('custrecord_bs2_ns_referral_fee_desc');
        
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

             nlapiLogExecution('AUDIT', 'LINE ITEM VALUES', 'progitem = '+progitem);
             
               record.selectNewLineItem('item');
	           record.setCurrentLineItemValue('item','item',progitem);
               record.setCurrentLineItemValue('item', 'description', appendClientCode(progdesc, ccgrouping));
               record.setCurrentLineItemValue('item', 'quantity', progqty);
               record.setCurrentLineItemText('item', 'price', 'Custom');
               record.setCurrentLineItemValue('item', 'rate', nvl(pppmprice,0));
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
                  record.setCurrentLineItemValue('item', 'rate', nvl(pppmdiscprice,0));
                  record.setCurrentLineItemValue('item', 'amount', Math.abs(parseFloat(nvl(newamt,0))));

               }
               record.commitLineItem('item');
               nlapiLogExecution('DEBUG', 'VALUE', 'After commit line item : ');
            }

			if (nvl(htnprogqty,0) > 0)
            //if ((nvl(htnprogqty,0) > 0) && (nvl(htnpppmprice,0) > 0))
            {
				nlapiLogExecution('AUDIT', 'LINE ITEM VALUES', 'htnprogitem = '+htnprogitem);
               nlapiLogExecution('DEBUG', 'VALUE', 'HTN Program Item : ');
               record.selectNewLineItem('item');
	           record.setCurrentLineItemValue('item','item',htnprogitem);
               record.setCurrentLineItemValue('item', 'description', appendClientCode(htnprogdesc,ccgrouping));
               record.setCurrentLineItemValue('item', 'quantity', htnprogqty);
               record.setCurrentLineItemText('item', 'price', 'Custom'); //101718
               record.setCurrentLineItemValue('item', 'rate', nvl(htnpppmprice,0));
               record.setCurrentLineItemText('item', 'custcol_liv_invoice_client_code', clientcode);
               record.setCurrentLineItemValue('item', 'custcol_liv_sol_contract_number', contractnumber);
               record.setCurrentLineItemValue('item', 'custcol_liv_sf_opportunity_id', sfopporid);  //NS-269
               record.commitLineItem('item');
            }

            //WM
            if (nvl(wmprogqty,0) > 0)
            //if ((nvl(wmprogqty,0) > 0) && (nvl(wmpppmprice,0) > 0))
            {
            	nlapiLogExecution('AUDIT', 'LINE ITEM VALUES', 'wmprogitem = '+wmprogitem);
               nlapiLogExecution('DEBUG', 'VALUE', 'WM Program Item : ');
               record.selectNewLineItem('item');
	           record.setCurrentLineItemValue('item','item',wmprogitem);
               record.setCurrentLineItemValue('item', 'description', appendClientCode(wmprogdesc, ccgrouping));
               record.setCurrentLineItemValue('item', 'quantity', wmprogqty);
               record.setCurrentLineItemText('item', 'price', 'Custom'); //101718
               record.setCurrentLineItemValue('item', 'rate', nvl(wmpppmprice,0));
               record.setCurrentLineItemText('item', 'custcol_liv_invoice_client_code', clientcode);
               record.setCurrentLineItemValue('item', 'custcol_liv_sol_contract_number', contractnumber);
               record.setCurrentLineItemValue('item', 'custcol_liv_sf_opportunity_id', sfopporid);  //NS-269
               record.commitLineItem('item');
            }

            //DPP
            if (nvl(dppprogqty,0) > 0)
            //if ((nvl(dppprogqty,0) > 0) && (nvl(dpppppmprice,0) > 0))
            {
            	nlapiLogExecution('AUDIT', 'LINE ITEM VALUES', 'dppprogitem = '+dppprogitem);
               nlapiLogExecution('DEBUG', 'VALUE', 'DPP Program Item : ');
               record.selectNewLineItem('item');
	           record.setCurrentLineItemValue('item','item',dppprogitem);
               record.setCurrentLineItemValue('item', 'description', appendClientCode(dppprogdesc, ccgrouping));
               record.setCurrentLineItemValue('item', 'quantity', dppprogqty);
               record.setCurrentLineItemText('item', 'price', 'Custom'); //101718
               record.setCurrentLineItemValue('item', 'rate', nvl(dpppppmprice,0));
               record.setCurrentLineItemText('item', 'custcol_liv_invoice_client_code', clientcode);
               record.setCurrentLineItemValue('item', 'custcol_liv_sol_contract_number', contractnumber);
               record.setCurrentLineItemValue('item', 'custcol_liv_sf_opportunity_id', sfopporid);  //NS-269
               record.commitLineItem('item');
            }

            //BH2
            if (nvl(bh2qty,0) > 0)
            //if ((nvl(dppprogqty,0) > 0) && (nvl(dpppppmprice,0) > 0))
            {
            	nlapiLogExecution('AUDIT', 'LINE ITEM VALUES', 'bh2item = '+bh2item);
               nlapiLogExecution('DEBUG', 'VALUE', 'BH2 Program Item : ');
               record.selectNewLineItem('item');
	           record.setCurrentLineItemValue('item','item',bh2item);
               record.setCurrentLineItemValue('item', 'description', appendClientCode(bh2itemdesc, ccgrouping));
               record.setCurrentLineItemValue('item', 'quantity', bh2qty);
               record.setCurrentLineItemText('item', 'price', 'Custom'); //101718
               record.setCurrentLineItemValue('item', 'rate', nvl(bh2price,0));
               record.setCurrentLineItemText('item', 'custcol_liv_invoice_client_code', clientcode);
               record.setCurrentLineItemValue('item', 'custcol_liv_sol_contract_number', contractnumber);
               record.setCurrentLineItemValue('item', 'custcol_liv_sf_opportunity_id', sfopporid);  //NS-269
               record.commitLineItem('item');
            }
            
            if (nvl(bh2pepmqty,0) > 0)
                //if ((nvl(dppprogqty,0) > 0) && (nvl(dpppppmprice,0) > 0))
                {
            	nlapiLogExecution('AUDIT', 'LINE ITEM VALUES', 'bh2pepmitem = '+bh2pepmitem);
                   nlapiLogExecution('DEBUG', 'VALUE', 'BH2 Program Item : ');
                   record.selectNewLineItem('item');
    	           record.setCurrentLineItemValue('item','item',bh2pepmitem);
                   record.setCurrentLineItemValue('item', 'description', appendClientCode(bh2pepmitemdesc, ccgrouping));
                   record.setCurrentLineItemValue('item', 'quantity', bh2pepmqty);
                   record.setCurrentLineItemText('item', 'price', 'Custom'); //101718
                   record.setCurrentLineItemValue('item', 'rate', nvl(bh2pepmprice,0));
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

//Begin Alex
            // bundle discount item
             //if (nvl(cbprogqty,0) > 0)
             if (nvl(bundleqty,0) > 0)
            {
               nlapiLogExecution('DEBUG', 'VALUE', 'CB Discount Program Item : '+cbdiscountitem);
               nlapiLogExecution('DEBUG', 'VALUE', 'CB Qty : '+cbprogqty);
               nlapiLogExecution('DEBUG', 'VALUE', 'CB Rate : '+cbdiscountprice);
               nlapiLogExecution('DEBUG', 'VALUE', 'CB Discount % : '+cbdiscountpct);
               nlapiLogExecution('DEBUG', 'VALUE', 'Bundle Qty : '+bundleqty);
               nlapiLogExecution('DEBUG', 'VALUE', 'Bundle discount amt : '+cbdiscountamt);


               var unitprice = nvl((cbdiscountprice * -1),0);
               nlapiLogExecution('DEBUG', 'VALUE', 'Unit price : ' +unitprice ) ;

              // if (nvl(cbdiscountprice,'NA') != 'NA')
               if (cbdiscountprice != 0)
               {
                  var cbdmhtndesc = 'Program Bundle Discount' ;
                  //var unitprice = (cbdiscountprice * -1);
                  nlapiLogExecution('DEBUG', 'VALUE', '(cbdiscountprice != 0): '+(cbdiscountprice != 0));
                  cbdmhtnprogamt = null; //set grossamt to zero
                  
                  nlapiLogExecution('AUDIT', 'LINE ITEM VALUES', 'cbdiscountitem = '+cbdiscountitem);
                  
                  record.selectNewLineItem('item');
	              record.setCurrentLineItemValue('item','item',cbdiscountitem);
                  record.setCurrentLineItemValue('item', 'description', appendClientCode(cbdmhtndesc, ccgrouping)); //NS-287
                  //record.setCurrentLineItemValue('item', 'quantity', cbprogqty);
                  record.setCurrentLineItemValue('item', 'quantity', bundleqty);
                  record.setCurrentLineItemText('item', 'price', 'Custom');
                  record.setCurrentLineItemValue('item', 'rate', nvl(unitprice,0));
                  record.setCurrentLineItemValue('item', 'amount', nvl(cbdiscountamt,0));  //NS-287
                  record.setCurrentLineItemText('item', 'custcol_liv_invoice_client_code', clientcode);
                  record.setCurrentLineItemValue('item', 'custcol_liv_sol_contract_number', contractnumber);
                  record.setCurrentLineItemValue('item', 'custcol_liv_sf_opportunity_id', sfopporid);  //NS-269
                  record.commitLineItem('item');
               }
               else
               {
                  nlapiLogExecution('DEBUG', 'VALUE', 'else (cbdiscountprice != 0): '+(cbdiscountprice != 0));
                  var cbdmhtndesc = 'Program Bundle Discount '+cbdiscountpct+'%.' ;
                  var base = 100;
                  var unitprice = (cbdiscountpct/base).toFixed(2) ;

                  if (cbdiscountamt != 0) //dm & htn
                  {
                      nlapiLogExecution('DEBUG', 'VALUE', 'cbdiscountamt : '+cbdiscountamt);
                      record.selectNewLineItem('item');
	                  record.setCurrentLineItemValue('item','item',cbdiscountitem);
                      record.setCurrentLineItemValue('item', 'description', 'Diabetes & Hypertension Bundle Discount '+cbdiscountpct+'%.' + '(' + ccgrouping + ')'); //NS-287
                      record.setCurrentLineItemValue('item', 'quantity', cbprogqty);
                      record.setCurrentLineItemText('item', 'price', 'Custom');
                      //record.setCurrentLineItemValue('item', 'rate', 1);
                      record.setCurrentLineItemValue('item', 'amount', nvl(cbdiscountamt,0));  //NS-287
                      record.setCurrentLineItemText('item', 'custcol_liv_invoice_client_code', clientcode);
                      record.setCurrentLineItemValue('item', 'custcol_liv_sol_contract_number', contractnumber);
                      record.setCurrentLineItemValue('item', 'custcol_liv_sf_opportunity_id', sfopporid);  //NS-269
                      record.setCurrentLineItemValue('item', 'custcol_liv_gross_amount', nvl(cbdmhtnprogamt,0) );  //NS-269
                      record.commitLineItem('item');
                   }
                  if (dmwmdiscountamt != 0) //dm & wm
                  {
                      nlapiLogExecution('DEBUG', 'VALUE', 'dmwmdiscountamt : '+dmwmdiscountamt);
                      record.selectNewLineItem('item');
	                  record.setCurrentLineItemValue('item','item',cbdiscountitem);
                      record.setCurrentLineItemValue('item', 'description', 'Diabetes & Weight Management Bundle Discount '+cbdiscountpct+'%.' +'('+ccgrouping+')'); //NS-287
                      record.setCurrentLineItemValue('item', 'quantity', dmwmprogqty);
                      record.setCurrentLineItemText('item', 'price', 'Custom');
                      //record.setCurrentLineItemValue('item', 'rate', 1);
                      record.setCurrentLineItemValue('item', 'amount', nvl(dmwmdiscountamt,0));  //NS-287
                      record.setCurrentLineItemText('item', 'custcol_liv_invoice_client_code', clientcode);
                      record.setCurrentLineItemValue('item', 'custcol_liv_sol_contract_number', contractnumber);
                      record.setCurrentLineItemValue('item', 'custcol_liv_sf_opportunity_id', sfopporid);  //NS-269
                      record.setCurrentLineItemValue('item', 'custcol_liv_gross_amount',nvl(dmwmprogamt,0) );
                      record.commitLineItem('item');
                   }
                  if (dpphtndiscountamt != 0) //dpp & htn
                  {
                      nlapiLogExecution('DEBUG', 'VALUE', 'dpphtndiscountamt : '+dpphtndiscountamt);
                      record.selectNewLineItem('item');
	                  record.setCurrentLineItemValue('item','item',cbdiscountitem);
                      record.setCurrentLineItemValue('item', 'description', 'DPP & Hypertension Bundle Discount '+cbdiscountpct+'%.' +'('+ccgrouping+')'); //NS-287
                      record.setCurrentLineItemValue('item', 'quantity', dpphtnprogqty);
                      record.setCurrentLineItemText('item', 'price', 'Custom');
                      //record.setCurrentLineItemValue('item', 'rate', 1);
                      record.setCurrentLineItemValue('item', 'amount', nvl(dpphtndiscountamt,0));  //NS-287
                      record.setCurrentLineItemText('item', 'custcol_liv_invoice_client_code', clientcode);
                      record.setCurrentLineItemValue('item', 'custcol_liv_sol_contract_number', contractnumber);
                      record.setCurrentLineItemValue('item', 'custcol_liv_sf_opportunity_id', sfopporid);  //NS-269
                      record.setCurrentLineItemValue('item', 'custcol_liv_gross_amount', nvl(dpphtnprogamt,0) );
                      record.commitLineItem('item');
                   }
                  if (nvl(dmhtnwmdiscountamt,0) != 0) //dm & htn & wm
                  {
                      nlapiLogExecution('DEBUG', 'VALUE', 'dmhtnwmdiscountamt : '+dmhtnwmdiscountamt);
                      record.selectNewLineItem('item');
	                  record.setCurrentLineItemValue('item','item',cbdiscountitem);
                      record.setCurrentLineItemValue('item', 'description', 'Diabetes, Hypertension & Weight Managemnet Bundle Discount '+cbdiscountpct+'%.' +'('+ccgrouping+')'); //NS-287
                      record.setCurrentLineItemValue('item', 'quantity', dmhtnwmprogqty);
                      record.setCurrentLineItemText('item', 'price', 'Custom');
                      //record.setCurrentLineItemValue('item', 'rate', 1);
                      record.setCurrentLineItemValue('item', 'amount', nvl(dmhtnwmdiscountamt,0));  //NS-287
                      record.setCurrentLineItemText('item', 'custcol_liv_invoice_client_code', clientcode);
                      record.setCurrentLineItemValue('item', 'custcol_liv_sol_contract_number', contractnumber);
                      record.setCurrentLineItemValue('item', 'custcol_liv_sf_opportunity_id', sfopporid);  //NS-269
                      record.setCurrentLineItemValue('item', 'custcol_liv_gross_amount',nvl(dmhtnwmprogamt,0) );
                      record.commitLineItem('item');
                   }
               }
            }
            //end
    //End Alex


            // Replacement Item
            if (nvl(replqty,0) > 0)
            {
            	nlapiLogExecution('AUDIT', 'LINE ITEM VALUES', 'replitem = '+replitem);
                nlapiLogExecution('DEBUG', 'VALUE', 'Replacement Qty: '+replqty);
                nlapiLogExecution('DEBUG', 'VALUE', 'Replacement Item: ');
                record.selectNewLineItem('item');
	            record.setCurrentLineItemValue('item','item',replitem);
                record.setCurrentLineItemValue('item', 'description', appendClientCode(repldesc, ccgrouping));
                record.setCurrentLineItemValue('item', 'quantity', replqty);
                record.setCurrentLineItemText('item', 'price', 'Custom');
                record.setCurrentLineItemValue('item', 'rate', nvl(replprice,0));
                record.setCurrentLineItemText('item', 'custcol_liv_invoice_client_code', clientcode);
                record.setCurrentLineItemValue('item', 'custcol_liv_sol_contract_number', contractnumber);
                record.setCurrentLineItemValue('item', 'custcol_liv_sf_opportunity_id', sfopporid);  //NS-269
                record.commitLineItem('item');
            }

            // NS159 HTN Replacement Item
            if (nvl(htnreplqty,0) > 0)
            {
            	nlapiLogExecution('AUDIT', 'LINE ITEM VALUES', 'htnreplitem = '+htnreplitem);
                nlapiLogExecution('DEBUG', 'VALUE', 'HTN Replacement Item : ');
                record.selectNewLineItem('item');
	            record.setCurrentLineItemValue('item','item',htnreplitem);
                record.setCurrentLineItemValue('item', 'description', appendClientCode(htnrepldesc, ccgrouping));
                record.setCurrentLineItemValue('item', 'quantity', htnreplqty);
                record.setCurrentLineItemText('item', 'price', 'Custom');
                record.setCurrentLineItemValue('item', 'rate', nvl(htnreplprice,0) );
                record.setCurrentLineItemText('item', 'custcol_liv_invoice_client_code', clientcode);
                
                record.setCurrentLineItemValue('item', 'custcol_liv_sol_contract_number', contractnumber);
                record.setCurrentLineItemValue('item', 'custcol_liv_sf_opportunity_id', sfopporid);  //NS-269
                record.commitLineItem('item');
            }

            //WM
            if (nvl(wmreplqty,0) > 0)
            {
            	nlapiLogExecution('AUDIT', 'LINE ITEM VALUES', 'wmreplitem = '+wmreplitem);
                nlapiLogExecution('DEBUG', 'VALUE', 'WM Replacement Item : ');
                record.selectNewLineItem('item');
	            record.setCurrentLineItemValue('item','item',wmreplitem);
                record.setCurrentLineItemValue('item', 'description', appendClientCode(wmrepldesc, ccgrouping));
                record.setCurrentLineItemValue('item', 'quantity', wmreplqty);
                record.setCurrentLineItemText('item', 'price', 'Custom');
                record.setCurrentLineItemValue('item', 'rate', nvl(wmreplprice,0) );
                record.setCurrentLineItemText('item', 'custcol_liv_invoice_client_code', clientcode);
                record.setCurrentLineItemValue('item', 'custcol_liv_sol_contract_number', contractnumber);
                record.setCurrentLineItemValue('item', 'custcol_liv_sf_opportunity_id', sfopporid);  //NS-269
                record.commitLineItem('item');
            }
            //DPP
            if (nvl(dppreplqty,0) > 0)
            {
            	nlapiLogExecution('AUDIT', 'LINE ITEM VALUES', 'dppreplitem = '+dppreplitem);
                nlapiLogExecution('DEBUG', 'VALUE', 'DPP Replacement Item : ');
                record.selectNewLineItem('item');
	            record.setCurrentLineItemValue('item','item',dppreplitem);
                record.setCurrentLineItemValue('item', 'description', appendClientCode(dpprepldesc, ccgrouping));
                record.setCurrentLineItemValue('item', 'quantity', dppreplqty);
                record.setCurrentLineItemText('item', 'price', 'Custom');
                record.setCurrentLineItemValue('item', 'rate', nvl(dppreplprice,0) );
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
                	nlapiLogExecution('AUDIT', 'LINE ITEM VALUES', 'termitem = '+termitem);
                   nlapiLogExecution('DEBUG', 'VALUE', 'Bundled Early Term : ');

	               var termitem = customrecord.getValue('custrecord_bs2_ns_termination_item');
                   var termdesc = customrecord.getValue('custrecord_bs2_ns_termination_desc');
                   var termamt = customrecord.getValue('custrecord_bs2_ns_termination_amt');
                   var termprice = customrecord.getValue('custrecord_bs2_ns_termination_price');

                   record.selectNewLineItem('item');
                   nlapiLogExecution('DEBUG', 'VALUE', 'Term Id : '+termitem);

	               record.setCurrentLineItemValue('item','item',termitem);
                   record.setCurrentLineItemValue('item', 'description', appendClientCode(termdesc, ccgrouping));
                   record.setCurrentLineItemValue('item', 'quantity', earlytermtotal);
                   record.setCurrentLineItemText('item', 'price', 'Custom');
                   record.setCurrentLineItemValue('item', 'rate', nvl(termprice,0)  );
                   record.setCurrentLineItemValue('item', 'amount', Math.abs(parseFloat(nvl(termamt,0))));
                   record.setCurrentLineItemText('item', 'custcol_liv_invoice_client_code', clientcode);
                   record.setCurrentLineItemValue('item', 'custcol_liv_sol_contract_number', contractnumber);
                   record.setCurrentLineItemValue('item', 'custcol_liv_sf_opportunity_id', sfopporid);  //NS-269
                   record.commitLineItem('item');
                }


                if (nvl(htnearlytermtotal,0) > 0)
                {
                	nlapiLogExecution('AUDIT', 'LINE ITEM VALUES', 'htntermitem = '+htntermitem);
                   nlapiLogExecution('DEBUG', 'VALUE', 'HTN Early Term : ');
	               var htntermitem = customrecord.getValue('custrecord_bs2_ns_htn_term_item');
                   var htntermdesc = customrecord.getValue('custrecord_bs2_ns_htn_term_item_desc');
                   var htntermamt = customrecord.getValue('custrecord_bs2_ns_htn_term_amt');
                   var htntermprice = customrecord.getValue('custrecord_bs2_ns_htn_term_price');

                   record.selectNewLineItem('item');
	               record.setCurrentLineItemValue('item','item',htntermitem);
                   record.setCurrentLineItemValue('item', 'description', appendClientCode(htntermdesc, ccgrouping));
                   record.setCurrentLineItemValue('item', 'quantity', htnearlytermtotal);
                   record.setCurrentLineItemText('item', 'price', 'Custom');
                   record.setCurrentLineItemValue('item', 'rate', nvl(htntermprice,0)  );
                   record.setCurrentLineItemValue('item', 'amount', Math.abs(parseFloat(nvl(htntermamt,0))));
                   record.setCurrentLineItemText('item', 'custcol_liv_invoice_client_code', clientcode);
                   record.setCurrentLineItemValue('item', 'custcol_liv_sol_contract_number', contractnumber);
                   record.setCurrentLineItemValue('item', 'custcol_liv_sf_opportunity_id', sfopporid);  //NS-269
                   record.commitLineItem('item');
                }
                //WM
                if (nvl(wmearlytermtotal,0) > 0)
                {
                	nlapiLogExecution('AUDIT', 'LINE ITEM VALUES', 'wmtermitem = '+wmtermitem);
                   nlapiLogExecution('DEBUG', 'VALUE', 'WM Early Term : ');

                   var wmtermprice = customrecord.getValue('custrecord_bs2_ns_wm_term_price');


                   record.selectNewLineItem('item');
	               record.setCurrentLineItemValue('item','item',wmtermitem);
                   record.setCurrentLineItemValue('item', 'description', appendClientCode(wmtermdesc, ccgrouping));
                   record.setCurrentLineItemValue('item', 'quantity', wmearlytermtotal);
                   record.setCurrentLineItemText('item', 'price', 'Custom');
                   record.setCurrentLineItemValue('item', 'rate', nvl(wmtermprice,0)  );
                   record.setCurrentLineItemValue('item', 'amount', Math.abs(parseFloat(nvl(wmtermamt,0))));
                   record.setCurrentLineItemText('item', 'custcol_liv_invoice_client_code', clientcode);
                   record.setCurrentLineItemValue('item', 'custcol_liv_sol_contract_number', contractnumber);
                   record.setCurrentLineItemValue('item', 'custcol_liv_sf_opportunity_id', sfopporid);  //NS-269
                   record.commitLineItem('item');
                }
                //DPP
                if (nvl(dppearlytermtotal,0) > 0)
                {
                	nlapiLogExecution('AUDIT', 'LINE ITEM VALUES', 'dpptermitem = '+dpptermitem);
                   nlapiLogExecution('DEBUG', 'VALUE', 'DPP Early Term : ');

                   var dpptermprice = customrecord.getValue('custrecord_bs2_ns_dpp_term_price');

                   record.selectNewLineItem('item');
	               record.setCurrentLineItemValue('item','item',dpptermitem);
                   record.setCurrentLineItemValue('item', 'description', appendClientCode(dpptermdesc, ccgrouping));
                   record.setCurrentLineItemValue('item', 'quantity', dppearlytermtotal);
                   record.setCurrentLineItemText('item', 'price', 'Custom');
                   record.setCurrentLineItemValue('item', 'rate', nvl(dpptermprice,0)  );
                   record.setCurrentLineItemValue('item', 'amount', Math.abs(parseFloat(nvl(dpptermamt,0))));
                   record.setCurrentLineItemText('item', 'custcol_liv_invoice_client_code', clientcode);
                   record.setCurrentLineItemValue('item', 'custcol_liv_sol_contract_number', contractnumber);
                   record.setCurrentLineItemValue('item', 'custcol_liv_sf_opportunity_id', sfopporid);  //NS-269
                   record.commitLineItem('item');
                }
                
      	      //-----------------------------WP Early Ternination START-----------------------------
    	      //DBT
                if (nvl(wptermqty,0) > 0)
                {
                	nlapiLogExecution('AUDIT', 'LINE ITEM VALUES', 'wpitem = '+wptermitem);
                    nlapiLogExecution('DEBUG', 'VALUE', 'if (nvl(wptermqty,0) > 0)');
                    record.selectNewLineItem('item');
    	            record.setCurrentLineItemValue('item','item',wptermitem);
                    record.setCurrentLineItemValue('item', 'description', appendClientCode(wptermitemdesc, ccgrouping));
                    record.setCurrentLineItemValue('item', 'quantity', wptermqty);
                    record.setCurrentLineItemText('item', 'price', 'Custom');
                    record.setCurrentLineItemValue('item', 'rate', nvl(wptermprice,0) );
                    record.setCurrentLineItemText('item', 'custcol_liv_invoice_client_code', clientcode);
                    record.setCurrentLineItemValue('item', 'custcol_liv_sol_contract_number', contractnumber);
                    record.setCurrentLineItemValue('item', 'custcol_liv_sf_opportunity_id', sfopporid);  //NS-269
                    record.commitLineItem('item');
                }
    	        
                //HTN
                if (nvl(htnwptermqty,0) > 0)
                {
                	nlapiLogExecution('AUDIT', 'LINE ITEM VALUES', 'htnwpitem = '+htnwptermitem);
                    nlapiLogExecution('DEBUG', 'VALUE', 'Inside if (nvl(htnwptermqty,0) > 0)');
                    record.selectNewLineItem('item');
    	            record.setCurrentLineItemValue('item','item',htnwptermitem);
                    record.setCurrentLineItemValue('item', 'description', appendClientCode(htnwptermitemdesc, ccgrouping));
                    record.setCurrentLineItemValue('item', 'quantity', htnwptermqty);
                    record.setCurrentLineItemText('item', 'price', 'Custom');
                    record.setCurrentLineItemValue('item', 'rate', nvl(htnwptermprice,0) );
                    record.setCurrentLineItemText('item', 'custcol_liv_invoice_client_code', clientcode);
                    record.setCurrentLineItemValue('item', 'custcol_liv_sol_contract_number', contractnumber);
                    record.setCurrentLineItemValue('item', 'custcol_liv_sf_opportunity_id', sfopporid);  //NS-269
                    record.commitLineItem('item');
                }

                //DPP
                if (nvl(dppwptermqty,0) > 0)
                {
                	nlapiLogExecution('AUDIT', 'LINE ITEM VALUES', 'dppwpitem = '+dppwptermitem);
                    nlapiLogExecution('DEBUG', 'VALUE', 'Inside if (nvl(dppwptermqty,0) > 0)');
                    record.selectNewLineItem('item');
    	            record.setCurrentLineItemValue('item','item',dppwptermitem);
                    record.setCurrentLineItemValue('item', 'description', appendClientCode(dppwptermitemdesc, ccgrouping));
                    record.setCurrentLineItemValue('item', 'quantity', dppwptermqty);
                    record.setCurrentLineItemText('item', 'price', 'Custom');
                    record.setCurrentLineItemValue('item', 'rate', nvl(dppwptermprice,0) );
                    record.setCurrentLineItemText('item', 'custcol_liv_invoice_client_code', clientcode);
                    record.setCurrentLineItemValue('item', 'custcol_liv_sol_contract_number', contractnumber);
                    record.setCurrentLineItemValue('item', 'custcol_liv_sf_opportunity_id', sfopporid);  //NS-269
                    record.commitLineItem('item');
                }
    	        
                //-----------------------------WP Early Ternination  END-----------------------------
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

                 nlapiLogExecution('AUDIT', 'LINE ITEM VALUES', 'upfrontitem = '+upfrontitem);
                 record.selectNewLineItem('item');
	             record.setCurrentLineItemValue('item','item',upfrontitem);
                 record.setCurrentLineItemValue('item', 'description', appendClientCode(upfrontdesc, ccgrouping));
                 record.setCurrentLineItemValue('item', 'quantity', upfrontqty);
                 record.setCurrentLineItemText('item', 'price', 'Custom');
                 record.setCurrentLineItemValue('item', 'rate', nvl(upfrontprice,0) );
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
            	  nlapiLogExecution('AUDIT', 'LINE ITEM VALUES', 'htnupfrontitem = '+htnupfrontitem);
	             nlapiLogExecution('DEBUG', 'VALUE', 'Inside HTN Upfront Category: '+category);
	             nlapiLogExecution('DEBUG', 'VALUE', 'HTN Upfront Desc: '+htnupfrontdesc);

                 record.selectNewLineItem('item');
	             record.setCurrentLineItemValue('item','item',htnupfrontitem);
                 record.setCurrentLineItemValue('item', 'description', appendClientCode(htnupfrontdesc, ccgrouping));
                 record.setCurrentLineItemValue('item', 'quantity', htnupfrontqty);
                 record.setCurrentLineItemText('item', 'price', 'Custom');
                 record.setCurrentLineItemValue('item', 'rate', nvl(htnupfrontprice,0) );
                 record.setCurrentLineItemText('item', 'custcol_liv_invoice_client_code', clientcode);
                 record.setCurrentLineItemValue('item', 'custcol_liv_sol_contract_number', contractnumber);
                 record.setCurrentLineItemValue('item', 'custcol_liv_sf_opportunity_id', sfopporid);  //NS-269
                 record.commitLineItem('item');
              }



	        } // end if category = 'Upfront'

	        
	      //-----------------------------WP START-----------------------------
	        nlapiLogExecution('DEBUG', 'WP Qty', 'wpqty = '+wpqty);
	        nlapiLogExecution('DEBUG', 'WP Qty', 'htnwpqty = '+htnwpqty);
	        nlapiLogExecution('DEBUG', 'WP Qty', 'dppwpqty = '+dppwpqty);
	        
	      //DBT
            if (nvl(wpqty,0) > 0)
            {
            	nlapiLogExecution('AUDIT', 'LINE ITEM VALUES', 'wpitem = '+wpitem);
                nlapiLogExecution('DEBUG', 'VALUE', 'if (nvl(wpqty,0) > 0)');
                record.selectNewLineItem('item');
	            record.setCurrentLineItemValue('item','item',wpitem);
                record.setCurrentLineItemValue('item', 'description', appendClientCode(wpitemdesc, ccgrouping));
                record.setCurrentLineItemValue('item', 'quantity', wpqty);
                record.setCurrentLineItemText('item', 'price', 'Custom');
                record.setCurrentLineItemValue('item', 'rate', nvl(wpprice,0) );
                record.setCurrentLineItemText('item', 'custcol_liv_invoice_client_code', clientcode);
                record.setCurrentLineItemValue('item', 'custcol_liv_sol_contract_number', contractnumber);
                record.setCurrentLineItemValue('item', 'custcol_liv_sf_opportunity_id', sfopporid);  //NS-269
                record.commitLineItem('item');
            }
	        
            //HTN
            if (nvl(htnwpqty,0) > 0)
            {
            	nlapiLogExecution('AUDIT', 'LINE ITEM VALUES', 'htnwpitem = '+htnwpitem);
                nlapiLogExecution('DEBUG', 'VALUE', 'Inside if (nvl(htnwpqty,0) > 0)');
                record.selectNewLineItem('item');
	            record.setCurrentLineItemValue('item','item',htnwpitem);
                record.setCurrentLineItemValue('item', 'description', appendClientCode(htnwpitemdesc, ccgrouping));
                record.setCurrentLineItemValue('item', 'quantity', htnwpqty);
                record.setCurrentLineItemText('item', 'price', 'Custom');
                record.setCurrentLineItemValue('item', 'rate', nvl(htnwpprice,0) );
                record.setCurrentLineItemText('item', 'custcol_liv_invoice_client_code', clientcode);
                record.setCurrentLineItemValue('item', 'custcol_liv_sol_contract_number', contractnumber);
                record.setCurrentLineItemValue('item', 'custcol_liv_sf_opportunity_id', sfopporid);  //NS-269
                record.commitLineItem('item');
            }

            //DPP
            if (nvl(dppwpqty,0) > 0)
            {
            	nlapiLogExecution('AUDIT', 'LINE ITEM VALUES', 'dppwpitem = '+dppwpitem);
                nlapiLogExecution('DEBUG', 'VALUE', 'Inside if (nvl(dppwpqty,0) > 0)');
                record.selectNewLineItem('item');
	            record.setCurrentLineItemValue('item','item',dppwpitem);
                record.setCurrentLineItemValue('item', 'description', appendClientCode(dppwpitemdesc, ccgrouping));
                record.setCurrentLineItemValue('item', 'quantity', dppwpqty);
                record.setCurrentLineItemText('item', 'price', 'Custom');
                record.setCurrentLineItemValue('item', 'rate', nvl(dppwpprice,0) );
                record.setCurrentLineItemText('item', 'custcol_liv_invoice_client_code', clientcode);
                record.setCurrentLineItemValue('item', 'custcol_liv_sol_contract_number', contractnumber);
                record.setCurrentLineItemValue('item', 'custcol_liv_sf_opportunity_id', sfopporid);  //NS-269
                record.commitLineItem('item');
            }
	        
            //-----------------------------WP END-----------------------------

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
                
                nlapiLogExecution('AUDIT', 'LINE ITEM VALUES', 'upfrontitem = '+upfrontitem);
                nlapiLogExecution('DEBUG', 'VALUE', 'FFS Upfront Meter : ');
                record.selectNewLineItem('item');
	            record.setCurrentLineItemValue('item','item',upfrontitem);
                record.setCurrentLineItemValue('item', 'description', appendClientCode(upfrontdesc, ccgrouping));
                record.setCurrentLineItemValue('item', 'quantity', upfrontqty);
                record.setCurrentLineItemText('item', 'price', 'Custom'); //101718
                record.setCurrentLineItemValue('item', 'rate', nvl(upfrontfee,0));
                record.setCurrentLineItemValue('item', 'amount', Math.abs(parseFloat(upfrontamt)));
                record.setCurrentLineItemText('item', 'custcol_liv_invoice_client_code', clientcode); // NS-140
                record.setCurrentLineItemValue('item', 'custcol_liv_sol_contract_number', contractnumber);
                record.setCurrentLineItemValue('item', 'custcol_liv_sf_opportunity_id', sfopporid);  //NS-269
                record.commitLineItem('item');
                }

                if (nvl(stripsqty,0) != 0)
               {

                	nlapiLogExecution('AUDIT', 'LINE ITEM VALUES', 'stripsitem = '+stripsitem);
                var stripsitem = customrecord.getValue('custrecord_bs2_ns_strips_item');
                var stripsdesc = customrecord.getValue('custrecord_bs2_ns_strips_item_desc');
                var stripsfee = customrecord.getValue('custrecord_bs2_ffs_test_strips_fee');
                nlapiLogExecution('DEBUG', 'VALUE', 'FFS Strip : ');
                record.selectNewLineItem('item');
	            record.setCurrentLineItemValue('item','item',stripsitem);
                record.setCurrentLineItemValue('item', 'description', appendClientCode(stripsdesc,ccgrouping));
                record.setCurrentLineItemValue('item', 'quantity', stripsqty);
                record.setCurrentLineItemText('item', 'price', 'Custom');
                record.setCurrentLineItemValue('item', 'rate', nvl(stripsfee,0));
                record.setCurrentLineItemValue('item', 'amount', Math.abs(parseFloat(stripsamt)));
                record.setCurrentLineItemText('item', 'custcol_liv_invoice_client_code', clientcode);
                record.setCurrentLineItemValue('item', 'custcol_liv_sol_contract_number', contractnumber);
                record.setCurrentLineItemValue('item', 'custcol_liv_sf_opportunity_id', sfopporid);  //NS-269
                record.commitLineItem('item');
                }

                if (nvl(lancetsqty,0) != 0)
               {
                	nlapiLogExecution('AUDIT', 'LINE ITEM VALUES', 'lancetsitem = '+lancetsitem);
                var lancetsitem = customrecord.getValue('custrecord_bs2_ns_lancets_item');
                var lancetsdesc = customrecord.getValue('custrecord_bs2_ns_lancets_item_desc');
                var lancetsfee = customrecord.getValue('custrecord_bs2_ffs_lancets_fee');
                nlapiLogExecution('DEBUG', 'VALUE', 'FFS Lancet : ');
                record.selectNewLineItem('item');
	            record.setCurrentLineItemValue('item','item',lancetsitem);
                record.setCurrentLineItemValue('item', 'description', appendClientCode(lancetsdesc, ccgrouping));
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
            	   nlapiLogExecution('AUDIT', 'LINE ITEM VALUES', 'lancingitem = '+lancingitem);
                var lancingitem = customrecord.getValue('custrecord_bs2_ns_lancing_item');
                var lancingdesc = customrecord.getValue('custrecord_bs2_ns_lancing_item_desc');
                var lancingfee = customrecord.getValue('custrecord_bs2_ffs_lancing_device_fee');
                nlapiLogExecution('DEBUG', 'VALUE', 'FFS Lancing : ');
                record.selectNewLineItem('item');
	            record.setCurrentLineItemValue('item','item',lancingitem);
                record.setCurrentLineItemValue('item', 'description', appendClientCode(lancingdesc, ccgrouping));
                record.setCurrentLineItemValue('item', 'quantity', lancingqty);
                record.setCurrentLineItemText('item', 'price', 'Custom');
                record.setCurrentLineItemValue('item', 'rate', nvl(lancingfee,0));
                record.setCurrentLineItemValue('item', 'amount', Math.abs(parseFloat(lancingamt)));
                record.setCurrentLineItemText('item', 'custcol_liv_invoice_client_code', clientcode);
                record.setCurrentLineItemValue('item', 'custcol_liv_sol_contract_number', contractnumber);
                record.setCurrentLineItemValue('item', 'custcol_liv_sf_opportunity_id', sfopporid);  //NS-269
                record.commitLineItem('item');
                }

               if (nvl(ctrlsolqty,0) != 0)
               {
            	   nlapiLogExecution('AUDIT', 'LINE ITEM VALUES', 'ctrlsolitem = '+ctrlsolitem);
                var ctrlsolitem = customrecord.getValue('custrecord_bs2_ns_ctrlsol_item');
                var ctrlsoldesc = customrecord.getValue('custrecord_bs2_ns_ctrlsol_item_desc');
                var ctrlsolfee = customrecord.getValue('custrecord_bs2_ffs_ctrl_solution_fee');
                nlapiLogExecution('DEBUG', 'VALUE', 'FFS Control Sol : ');
                record.selectNewLineItem('item');
	            record.setCurrentLineItemValue('item','item',ctrlsolitem);
                record.setCurrentLineItemValue('item', 'description', appendClientCode(ctrlsoldesc, ccgrouping));
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

	        //Tier-2
	        nlapiLogExecution('AUDIT','tier2JSONString = ',tier2JSONString);
	        var tier2JSONString = customrecord.getValue('custrecord_bs2_tier2_json');
	        if(tier2JSONString.length > 0){
	        	var tier2JSONObj = JSON.parse(tier2JSONString);
	        	for(var z=0;z<tier2JSONObj.length;z++){
	        		if(tier2JSONObj[z].program == 'DBT'){
	        			   nlapiLogExecution('AUDIT', 'LINE ITEM VALUES', 'progitem = '+progitem);
	    	               nlapiLogExecution('DEBUG', 'VALUE', 'HTN Program Item : ');
	    	               record.selectNewLineItem('item');
	    		           record.setCurrentLineItemValue('item','item',progitem);
	    	               record.setCurrentLineItemValue('item', 'description', appendClientCode(progdesc,ccgrouping)+' - Tier-2');
	    	               record.setCurrentLineItemValue('item', 'quantity', tier2JSONObj[z].dbt2_active_quantity);
	    	               record.setCurrentLineItemText('item', 'price', 'Custom'); //101718
	    	               record.setCurrentLineItemValue('item', 'rate', nvl(tier2JSONObj[z].dbt2_active_rate,0));
	    	               record.setCurrentLineItemText('item', 'custcol_liv_invoice_client_code', clientcode);
	    	               record.setCurrentLineItemValue('item', 'custcol_liv_sol_contract_number', contractnumber);
	    	               record.setCurrentLineItemValue('item', 'custcol_liv_sf_opportunity_id', sfopporid);  //NS-269
	    	               record.commitLineItem('item');
	        		}
	        		/*if(tier2JSONObj[z].program == 'DBT Upfront'){
	        			   nlapiLogExecution('AUDIT', 'LINE ITEM VALUES', 'htnprogitem = '+htnprogitem);
	    	               nlapiLogExecution('DEBUG', 'VALUE', 'HTN Program Item : ');
	    	               record.selectNewLineItem('item');
	    		           record.setCurrentLineItemValue('item','item',htnprogitem);
	    	               record.setCurrentLineItemValue('item', 'description', appendClientCode(htnprogdesc,ccgrouping)+' - Tier-2');
	    	               record.setCurrentLineItemValue('item', 'quantity', tier2JSONObj[z].dbt2_upfront_quantity);
	    	               record.setCurrentLineItemText('item', 'price', 'Custom'); //101718
	    	               record.setCurrentLineItemValue('item', 'rate', nvl(tier2JSONObj[z].dbt2_upfront_rate,0));
	    	               record.setCurrentLineItemText('item', 'custcol_liv_invoice_client_code', clientcode);
	    	               record.setCurrentLineItemValue('item', 'custcol_liv_sol_contract_number', contractnumber);
	    	               record.setCurrentLineItemValue('item', 'custcol_liv_sf_opportunity_id', sfopporid);  //NS-269
	    	               record.commitLineItem('item');
		        		}*/
	        		if(tier2JSONObj[z].program == 'DBT WP'){
	        			   nlapiLogExecution('AUDIT', 'LINE ITEM VALUES', 'wpitem = '+wpitem);
	    	               nlapiLogExecution('DEBUG', 'VALUE', 'HTN Program Item : ');
	    	               record.selectNewLineItem('item');
	    		           record.setCurrentLineItemValue('item','item',wpitem);
	    	               record.setCurrentLineItemValue('item', 'description', appendClientCode(htnprogdesc,ccgrouping)+' - Tier-2');
	    	               record.setCurrentLineItemValue('item', 'quantity', tier2JSONObj[z].dbt2_wp_quantity);
	    	               record.setCurrentLineItemText('item', 'price', 'Custom'); //101718
	    	               record.setCurrentLineItemValue('item', 'rate', nvl(tier2JSONObj[z].dbt2_wp_rate,0));
	    	               record.setCurrentLineItemText('item', 'custcol_liv_invoice_client_code', clientcode);
	    	               record.setCurrentLineItemValue('item', 'custcol_liv_sol_contract_number', contractnumber);
	    	               record.setCurrentLineItemValue('item', 'custcol_liv_sf_opportunity_id', sfopporid);  //NS-269
	    	               record.commitLineItem('item');
		        		}
	        		if(tier2JSONObj[z].program == 'HTN'){
	        			   nlapiLogExecution('AUDIT', 'LINE ITEM VALUES', 'htnprogitem = '+htnprogitem);
	    	               nlapiLogExecution('DEBUG', 'VALUE', 'HTN Program Item : ');
	    	               record.selectNewLineItem('item');
	    		           record.setCurrentLineItemValue('item','item',htnprogitem);
	    	               record.setCurrentLineItemValue('item', 'description', appendClientCode(htnprogdesc,ccgrouping)+' - Tier-2');
	    	               record.setCurrentLineItemValue('item', 'quantity', tier2JSONObj[z].htn2_active_quantity);
	    	               record.setCurrentLineItemText('item', 'price', 'Custom'); //101718
	    	               record.setCurrentLineItemValue('item', 'rate', nvl(tier2JSONObj[z].htn2_active_rate,0));
	    	               record.setCurrentLineItemText('item', 'custcol_liv_invoice_client_code', clientcode);
	    	               record.setCurrentLineItemValue('item', 'custcol_liv_sol_contract_number', contractnumber);
	    	               record.setCurrentLineItemValue('item', 'custcol_liv_sf_opportunity_id', sfopporid);  //NS-269
	    	               record.commitLineItem('item');
		        		}
	        		/*if(tier2JSONObj[z].program == 'HTN Upfront'){
	        			   nlapiLogExecution('AUDIT', 'LINE ITEM VALUES', 'htnprogitem = '+htnprogitem);
	    	               nlapiLogExecution('DEBUG', 'VALUE', 'HTN Program Item : ');
	    	               record.selectNewLineItem('item');
	    		           record.setCurrentLineItemValue('item','item',htnprogitem);
	    	               record.setCurrentLineItemValue('item', 'description', appendClientCode(htnprogdesc,ccgrouping)+' - Tier-2');
	    	               record.setCurrentLineItemValue('item', 'quantity', tier2JSONObj[z].htn2_upfront_quantity);
	    	               record.setCurrentLineItemText('item', 'price', 'Custom'); //101718
	    	               record.setCurrentLineItemValue('item', 'rate', nvl(tier2JSONObj[z].htn2_upfront_rate,0));
	    	               record.setCurrentLineItemText('item', 'custcol_liv_invoice_client_code', clientcode);
	    	               record.setCurrentLineItemValue('item', 'custcol_liv_sol_contract_number', contractnumber);
	    	               record.setCurrentLineItemValue('item', 'custcol_liv_sf_opportunity_id', sfopporid);  //NS-269
	    	               record.commitLineItem('item');
		        		}*/
	        		if(tier2JSONObj[z].program == 'HTN WP'){
	        			   nlapiLogExecution('AUDIT', 'LINE ITEM VALUES', 'htnwpitem = '+htnwpitem);
	    	               nlapiLogExecution('DEBUG', 'VALUE', 'HTN Program Item : ');
	    	               record.selectNewLineItem('item');
	    		           record.setCurrentLineItemValue('item','item',htnwpitem);
	    	               record.setCurrentLineItemValue('item', 'description', appendClientCode(htnwpitemdesc,ccgrouping)+' - Tier-2');
	    	               record.setCurrentLineItemValue('item', 'quantity', tier2JSONObj[z].htn2_wp_quantity);
	    	               record.setCurrentLineItemText('item', 'price', 'Custom'); //101718
	    	               record.setCurrentLineItemValue('item', 'rate', nvl(tier2JSONObj[z].htn2_wp_rate,0));
	    	               record.setCurrentLineItemText('item', 'custcol_liv_invoice_client_code', clientcode);
	    	               record.setCurrentLineItemValue('item', 'custcol_liv_sol_contract_number', contractnumber);
	    	               record.setCurrentLineItemValue('item', 'custcol_liv_sf_opportunity_id', sfopporid);  //NS-269
	    	               record.commitLineItem('item');
		        		}
	        		if(tier2JSONObj[z].program == 'WM'){
	        			   nlapiLogExecution('AUDIT', 'LINE ITEM VALUES', 'wmprogitem = '+wmprogitem);
	    	               nlapiLogExecution('DEBUG', 'VALUE', 'HTN Program Item : ');
	    	               record.selectNewLineItem('item');
	    		           record.setCurrentLineItemValue('item','item',wmprogitem);
	    	               record.setCurrentLineItemValue('item', 'description', appendClientCode(wmprogdesc,ccgrouping)+' - Tier-2');
	    	               record.setCurrentLineItemValue('item', 'quantity', tier2JSONObj[z].wm2_active_quantity);
	    	               record.setCurrentLineItemText('item', 'price', 'Custom'); //101718
	    	               record.setCurrentLineItemValue('item', 'rate', nvl(tier2JSONObj[z].wm2_active_rate,0));
	    	               record.setCurrentLineItemText('item', 'custcol_liv_invoice_client_code', clientcode);
	    	               record.setCurrentLineItemValue('item', 'custcol_liv_sol_contract_number', contractnumber);
	    	               record.setCurrentLineItemValue('item', 'custcol_liv_sf_opportunity_id', sfopporid);  //NS-269
	    	               record.commitLineItem('item');
		        		}
	        		if(tier2JSONObj[z].program == 'DPP'){
	        			   nlapiLogExecution('AUDIT', 'LINE ITEM VALUES', 'dppprogitem = '+dppprogitem);
	    	               nlapiLogExecution('DEBUG', 'VALUE', 'HTN Program Item : ');
	    	               record.selectNewLineItem('item');
	    		           record.setCurrentLineItemValue('item','item',dppprogitem);
	    	               record.setCurrentLineItemValue('item', 'description', appendClientCode(dppprogdesc,ccgrouping)+' - Tier-2');
	    	               record.setCurrentLineItemValue('item', 'quantity', tier2JSONObj[z].pd2_active_quantity);
	    	               record.setCurrentLineItemText('item', 'price', 'Custom'); //101718
	    	               record.setCurrentLineItemValue('item', 'rate', nvl(tier2JSONObj[z].pd2_active_rate,0));
	    	               record.setCurrentLineItemText('item', 'custcol_liv_invoice_client_code', clientcode);
	    	               record.setCurrentLineItemValue('item', 'custcol_liv_sol_contract_number', contractnumber);
	    	               record.setCurrentLineItemValue('item', 'custcol_liv_sf_opportunity_id', sfopporid);  //NS-269
	    	               record.commitLineItem('item');
		        		}
	        		if(tier2JSONObj[z].program == 'DPP WP'){
	        			   nlapiLogExecution('AUDIT', 'LINE ITEM VALUES', 'dppwpitem = '+dppwpitem);
	    	               nlapiLogExecution('DEBUG', 'VALUE', 'HTN Program Item : ');
	    	               record.selectNewLineItem('item');
	    		           record.setCurrentLineItemValue('item','item',dppwpitem);
	    	               record.setCurrentLineItemValue('item', 'description', appendClientCode(dppwpitemdesc,ccgrouping)+' - Tier-2');
	    	               record.setCurrentLineItemValue('item', 'quantity', tier2JSONObj[z].pd2_wp_quantity);
	    	               record.setCurrentLineItemText('item', 'price', 'Custom'); //101718
	    	               record.setCurrentLineItemValue('item', 'rate', nvl(tier2JSONObj[z].pd2_wp_rate,0));
	    	               record.setCurrentLineItemText('item', 'custcol_liv_invoice_client_code', clientcode);
	    	               record.setCurrentLineItemValue('item', 'custcol_liv_sol_contract_number', contractnumber);
	    	               record.setCurrentLineItemValue('item', 'custcol_liv_sf_opportunity_id', sfopporid);  //NS-269
	    	               record.commitLineItem('item');
		        		}
	        		
	        		/*if(tier2JSONObj[z].program == 'HTN-DBT'){
	        			   nlapiLogExecution('AUDIT', 'LINE ITEM VALUES', 'cbdiscountitem = '+cbdiscountitem);
	    	               nlapiLogExecution('DEBUG', 'VALUE', 'HTN Program Item : ');
	    	               record.selectNewLineItem('item');
	    		           record.setCurrentLineItemValue('item','item',cbdiscountitem);
	    	               record.setCurrentLineItemValue('item', 'description', appendClientCode(htnprogdesc,ccgrouping)+' - Tier-2');
	    	               record.setCurrentLineItemValue('item', 'quantity', tier2JSONObj[z].comb_htn2_dbt2_quantity);
	    	               record.setCurrentLineItemText('item', 'price', 'Custom'); //101718
	    	               record.setCurrentLineItemValue('item', 'rate', nvl(tier2JSONObj[z].comb_htn2_dbt2_rate,0));
	    	               record.setCurrentLineItemText('item', 'custcol_liv_invoice_client_code', clientcode);
	    	               record.setCurrentLineItemValue('item', 'custcol_liv_sol_contract_number', contractnumber);
	    	               record.setCurrentLineItemValue('item', 'custcol_liv_sf_opportunity_id', sfopporid);  //NS-269
	    	               record.commitLineItem('item');
		        		}
	        		if(tier2JSONObj[z].program == 'WM-DBT'){
	        			   nlapiLogExecution('AUDIT', 'LINE ITEM VALUES', 'cbdiscountitem = '+cbdiscountitem);
	    	               nlapiLogExecution('DEBUG', 'VALUE', 'HTN Program Item : ');
	    	               record.selectNewLineItem('item');
	    		           record.setCurrentLineItemValue('item','item',cbdiscountitem);
	    	               record.setCurrentLineItemValue('item', 'description', appendClientCode(htnprogdesc,ccgrouping)+' - Tier-2');
	    	               record.setCurrentLineItemValue('item', 'quantity', tier2JSONObj[z].comb_wm2_dbt2_quantity);
	    	               record.setCurrentLineItemText('item', 'price', 'Custom'); //101718
	    	               record.setCurrentLineItemValue('item', 'rate', nvl(tier2JSONObj[z].comb_wm2_dbt2_rate,0));
	    	               record.setCurrentLineItemText('item', 'custcol_liv_invoice_client_code', clientcode);
	    	               record.setCurrentLineItemValue('item', 'custcol_liv_sol_contract_number', contractnumber);
	    	               record.setCurrentLineItemValue('item', 'custcol_liv_sf_opportunity_id', sfopporid);  //NS-269
	    	               record.commitLineItem('item');
		        		}
	        		if(tier2JSONObj[z].program == 'PD-DBT'){
	        			   nlapiLogExecution('AUDIT', 'LINE ITEM VALUES', 'cbdiscountitem = '+cbdiscountitem);
	    	               nlapiLogExecution('DEBUG', 'VALUE', 'HTN Program Item : ');
	    	               record.selectNewLineItem('item');
	    		           record.setCurrentLineItemValue('item','item',cbdiscountitem);
	    	               record.setCurrentLineItemValue('item', 'description', appendClientCode(htnprogdesc,ccgrouping)+' - Tier-2');
	    	               record.setCurrentLineItemValue('item', 'quantity', tier2JSONObj[z].comb_pd2_dbt2_quantity);
	    	               record.setCurrentLineItemText('item', 'price', 'Custom'); //101718
	    	               record.setCurrentLineItemValue('item', 'rate', nvl(tier2JSONObj[z].comb_pd2_dbt2_rate,0));
	    	               record.setCurrentLineItemText('item', 'custcol_liv_invoice_client_code', clientcode);
	    	               record.setCurrentLineItemValue('item', 'custcol_liv_sol_contract_number', contractnumber);
	    	               record.setCurrentLineItemValue('item', 'custcol_liv_sf_opportunity_id', sfopporid);  //NS-269
	    	               record.commitLineItem('item');
		        		}
	        		if(tier2JSONObj[z].program == 'PD-HTN'){
	        			   nlapiLogExecution('AUDIT', 'LINE ITEM VALUES', 'cbdiscountitem = '+cbdiscountitem);
	    	               nlapiLogExecution('DEBUG', 'VALUE', 'HTN Program Item : ');
	    	               record.selectNewLineItem('item');
	    		           record.setCurrentLineItemValue('item','item',cbdiscountitem);
	    	               record.setCurrentLineItemValue('item', 'description', appendClientCode(htnprogdesc,ccgrouping)+' - Tier-2');
	    	               record.setCurrentLineItemValue('item', 'quantity', tier2JSONObj[z].comb_pd2_htn2_quantity);
	    	               record.setCurrentLineItemText('item', 'price', 'Custom'); //101718
	    	               record.setCurrentLineItemValue('item', 'rate', nvl(tier2JSONObj[z].comb_pd2_htn2_rate,0));
	    	               record.setCurrentLineItemText('item', 'custcol_liv_invoice_client_code', clientcode);
	    	               record.setCurrentLineItemValue('item', 'custcol_liv_sol_contract_number', contractnumber);
	    	               record.setCurrentLineItemValue('item', 'custcol_liv_sf_opportunity_id', sfopporid);  //NS-269
	    	               record.commitLineItem('item');
		        		}	        		
	        		if(tier2JSONObj[z].program == 'WM-PD'){
	        			   nlapiLogExecution('AUDIT', 'LINE ITEM VALUES', 'cbdiscountitem = '+cbdiscountitem);
	    	               nlapiLogExecution('DEBUG', 'VALUE', 'HTN Program Item : ');
	    	               record.selectNewLineItem('item');
	    		           record.setCurrentLineItemValue('item','item',cbdiscountitem);
	    	               record.setCurrentLineItemValue('item', 'description', appendClientCode(htnprogdesc,ccgrouping)+' - Tier-2');
	    	               record.setCurrentLineItemValue('item', 'quantity', tier2JSONObj[z].comb_wm2_pd2_quantity);
	    	               record.setCurrentLineItemText('item', 'price', 'Custom'); //101718
	    	               record.setCurrentLineItemValue('item', 'rate', nvl(tier2JSONObj[z].comb_wm2_pd2_rate,0));
	    	               record.setCurrentLineItemText('item', 'custcol_liv_invoice_client_code', clientcode);
	    	               record.setCurrentLineItemValue('item', 'custcol_liv_sol_contract_number', contractnumber);
	    	               record.setCurrentLineItemValue('item', 'custcol_liv_sf_opportunity_id', sfopporid);  //NS-269
	    	               record.commitLineItem('item');
		        		}
	        		if(tier2JSONObj[z].program == 'WM-HTN'){
	        			   nlapiLogExecution('AUDIT', 'LINE ITEM VALUES', 'cbdiscountitem = '+cbdiscountitem);
	    	               nlapiLogExecution('DEBUG', 'VALUE', 'HTN Program Item : ');
	    	               record.selectNewLineItem('item');
	    		           record.setCurrentLineItemValue('item','item',cbdiscountitem);
	    	               record.setCurrentLineItemValue('item', 'description', appendClientCode(htnprogdesc,ccgrouping)+' - Tier-2');
	    	               record.setCurrentLineItemValue('item', 'quantity', tier2JSONObj[z].comb_wm2_htn2_quantity);
	    	               record.setCurrentLineItemText('item', 'price', 'Custom'); //101718
	    	               record.setCurrentLineItemValue('item', 'rate', nvl(tier2JSONObj[z].comb_wm2_htn2_rate,0));
	    	               record.setCurrentLineItemText('item', 'custcol_liv_invoice_client_code', clientcode);
	    	               record.setCurrentLineItemValue('item', 'custcol_liv_sol_contract_number', contractnumber);
	    	               record.setCurrentLineItemValue('item', 'custcol_liv_sf_opportunity_id', sfopporid);  //NS-269
	    	               record.commitLineItem('item');
		        		}
	        		if(tier2JSONObj[z].program == 'WM-HTN-DBT'){
	        			   nlapiLogExecution('AUDIT', 'LINE ITEM VALUES', 'cbdiscountitem = '+cbdiscountitem);
	    	               nlapiLogExecution('DEBUG', 'VALUE', 'HTN Program Item : ');
	    	               record.selectNewLineItem('item');
	    		           record.setCurrentLineItemValue('item','item',cbdiscountitem);
	    	               record.setCurrentLineItemValue('item', 'description', appendClientCode(htnprogdesc,ccgrouping)+' - Tier-2');
	    	               record.setCurrentLineItemValue('item', 'quantity', tier2JSONObj[z].comb_wm2_htn2_dbt2_quantity);
	    	               record.setCurrentLineItemText('item', 'price', 'Custom'); //101718
	    	               record.setCurrentLineItemValue('item', 'rate', nvl(tier2JSONObj[z].comb_wm2_htn2_dbt2_rate,0));
	    	               record.setCurrentLineItemText('item', 'custcol_liv_invoice_client_code', clientcode);
	    	               record.setCurrentLineItemValue('item', 'custcol_liv_sol_contract_number', contractnumber);
	    	               record.setCurrentLineItemValue('item', 'custcol_liv_sf_opportunity_id', sfopporid);  //NS-269
	    	               record.commitLineItem('item');
		        		}
	        		if(tier2JSONObj[z].program == 'PD-HTN-DBT'){
	        			   nlapiLogExecution('AUDIT', 'LINE ITEM VALUES', 'cbdiscountitem = '+cbdiscountitem);
	    	               nlapiLogExecution('DEBUG', 'VALUE', 'HTN Program Item : ');
	    	               record.selectNewLineItem('item');
	    		           record.setCurrentLineItemValue('item','item',cbdiscountitem);
	    	               record.setCurrentLineItemValue('item', 'description', appendClientCode(htnprogdesc,ccgrouping)+' - Tier-2');
	    	               record.setCurrentLineItemValue('item', 'quantity', tier2JSONObj[z].comb_pd2_htn2_dbt2_quantity);
	    	               record.setCurrentLineItemText('item', 'price', 'Custom'); //101718
	    	               record.setCurrentLineItemValue('item', 'rate', nvl(tier2JSONObj[z].comb_pd2_htn2_dbt2_rate,0));
	    	               record.setCurrentLineItemText('item', 'custcol_liv_invoice_client_code', clientcode);
	    	               record.setCurrentLineItemValue('item', 'custcol_liv_sol_contract_number', contractnumber);
	    	               record.setCurrentLineItemValue('item', 'custcol_liv_sf_opportunity_id', sfopporid);  //NS-269
	    	               record.commitLineItem('item');
		        		}
	        		if(tier2JSONObj[z].program == 'WM-PD-DBT'){
	        			   nlapiLogExecution('AUDIT', 'LINE ITEM VALUES', 'cbdiscountitem = '+cbdiscountitem);
	    	               nlapiLogExecution('DEBUG', 'VALUE', 'HTN Program Item : ');
	    	               record.selectNewLineItem('item');
	    		           record.setCurrentLineItemValue('item','item',cbdiscountitem);
	    	               record.setCurrentLineItemValue('item', 'description', appendClientCode(htnprogdesc,ccgrouping)+' - Tier-2');
	    	               record.setCurrentLineItemValue('item', 'quantity', tier2JSONObj[z].comb_wm2_pd2_dbt2_quantity);
	    	               record.setCurrentLineItemText('item', 'price', 'Custom'); //101718
	    	               record.setCurrentLineItemValue('item', 'rate', nvl(tier2JSONObj[z].comb_wm2_pd2_dbt2_rate,0));
	    	               record.setCurrentLineItemText('item', 'custcol_liv_invoice_client_code', clientcode);
	    	               record.setCurrentLineItemValue('item', 'custcol_liv_sol_contract_number', contractnumber);
	    	               record.setCurrentLineItemValue('item', 'custcol_liv_sf_opportunity_id', sfopporid);  //NS-269
	    	               record.commitLineItem('item');
		        		}
	        		if(tier2JSONObj[z].program == 'WM-PD-HTN'){
	        			   nlapiLogExecution('AUDIT', 'LINE ITEM VALUES', 'cbdiscountitem = '+cbdiscountitem);
	    	               nlapiLogExecution('DEBUG', 'VALUE', 'HTN Program Item : ');
	    	               record.selectNewLineItem('item');
	    		           record.setCurrentLineItemValue('item','item',cbdiscountitem);
	    	               record.setCurrentLineItemValue('item', 'description', appendClientCode(htnprogdesc,ccgrouping)+' - Tier-2');
	    	               record.setCurrentLineItemValue('item', 'quantity', tier2JSONObj[z].comb_wm2_pd2_htn2_quantity);
	    	               record.setCurrentLineItemText('item', 'price', 'Custom'); //101718
	    	               record.setCurrentLineItemValue('item', 'rate', nvl(tier2JSONObj[z].comb_wm2_pd2_htn2_rate,0));
	    	               record.setCurrentLineItemText('item', 'custcol_liv_invoice_client_code', clientcode);
	    	               record.setCurrentLineItemValue('item', 'custcol_liv_sol_contract_number', contractnumber);
	    	               record.setCurrentLineItemValue('item', 'custcol_liv_sf_opportunity_id', sfopporid);  //NS-269
	    	               record.commitLineItem('item');
		        		}*/
	        		if(tier2JSONObj[z].program == 'Bundle Discount'){
	        			   nlapiLogExecution('AUDIT', 'LINE ITEM VALUES', 'cbdiscountitem = '+cbdiscountitem);
	    	               nlapiLogExecution('DEBUG', 'VALUE', 'HTN Program Item : ');
	    	               record.selectNewLineItem('item');
	    		           record.setCurrentLineItemValue('item','item',cbdiscountitem);
	    	               record.setCurrentLineItemValue('item', 'description', appendClientCode('Program Bundle Discount - Tier 2',ccgrouping));
	    	               record.setCurrentLineItemValue('item', 'quantity', tier2JSONObj[z].bundle_disc2_quantity);
	    	               record.setCurrentLineItemText('item', 'price', 'Custom'); //101718
	    	               record.setCurrentLineItemValue('item', 'rate', nvl(tier2JSONObj[z].bundle_disc2_rate,0));
	    	               record.setCurrentLineItemValue('item', 'amount', nvl(tier2JSONObj[z].bundle_disc2_price,0)); 
	    	               record.setCurrentLineItemText('item', 'custcol_liv_invoice_client_code', clientcode);
	    	               record.setCurrentLineItemValue('item', 'custcol_liv_sol_contract_number', contractnumber);
	    	               record.setCurrentLineItemValue('item', 'custcol_liv_sf_opportunity_id', sfopporid);  //NS-269
	    	               record.commitLineItem('item');
		        		}
	        	}
	        }
	        
	          // Referral Item
	        if(getPartnerAdminFeeFromRS == 'T'){
	        	//DBT
	        	if (nvl(dbtAdminQty,0) > 0 && nvl(dbtAdminRate,0) != 0 )
	            {
	        		dbtReferraldesc = dbtReferraldesc + ' - Diabetes Management' ;
	                record.selectNewLineItem('item');
		            record.setCurrentLineItemValue('item','item',dbtReferralitem);
	                record.setCurrentLineItemValue('item', 'description', appendClientCode(dbtReferraldesc, ccgrouping));
	                record.setCurrentLineItemValue('item', 'quantity', dbtAdminQty);
	                record.setCurrentLineItemText('item', 'price', 'Custom');
	                record.setCurrentLineItemValue('item', 'rate', (nvl(dbtAdminRate,0)));
	                record.setCurrentLineItemText('item', 'custcol_liv_invoice_client_code', clientcode);
	                record.setCurrentLineItemValue('item', 'custcol_liv_sol_contract_number', contractnumber);
	                record.setCurrentLineItemValue('item', 'custcol_liv_sf_opportunity_id', sfopporid);  //NS-269
	                record.commitLineItem('item');
	            }
	        	//HTN
	        	if (nvl(htnAdminQty,0) > 0 && nvl(htnAdminRate,0) != 0 )
	            {
	        		htnReferraldesc = htnReferraldesc + ' - Hypertension' ;
	                record.selectNewLineItem('item');
		            record.setCurrentLineItemValue('item','item',htnReferralitem);
	                record.setCurrentLineItemValue('item', 'description', appendClientCode(htnReferraldesc, ccgrouping));
	                record.setCurrentLineItemValue('item', 'quantity', htnAdminQty);
	                record.setCurrentLineItemText('item', 'price', 'Custom');
	                record.setCurrentLineItemValue('item', 'rate', (nvl(htnAdminRate,0)));
	                record.setCurrentLineItemText('item', 'custcol_liv_invoice_client_code', clientcode);
	                record.setCurrentLineItemValue('item', 'custcol_liv_sol_contract_number', contractnumber);
	                record.setCurrentLineItemValue('item', 'custcol_liv_sf_opportunity_id', sfopporid);  //NS-269
	                record.commitLineItem('item');
	            }
	        	//WM
	        	if (nvl(wmAdminQty,0) > 0 && nvl(wmAdminRate,0) != 0 )
	            {
	        		wmReferraldesc = wmReferraldesc + ' - Weight Management' ;
	                record.selectNewLineItem('item');
		            record.setCurrentLineItemValue('item','item',wmReferralitem);
	                record.setCurrentLineItemValue('item', 'description', appendClientCode(wmReferraldesc, ccgrouping));
	                record.setCurrentLineItemValue('item', 'quantity', wmAdminQty);
	                record.setCurrentLineItemText('item', 'price', 'Custom');
	                record.setCurrentLineItemValue('item', 'rate', (nvl(wmAdminRate,0)));
	                record.setCurrentLineItemText('item', 'custcol_liv_invoice_client_code', clientcode);
	                record.setCurrentLineItemValue('item', 'custcol_liv_sol_contract_number', contractnumber);
	                record.setCurrentLineItemValue('item', 'custcol_liv_sf_opportunity_id', sfopporid);  //NS-269
	                record.commitLineItem('item');
	            }
	        	//DPP
	        	if (nvl(dppAdminQty,0) > 0 && nvl(dppAdminRate,0) != 0 )
	            {
	        		dppReferraldesc = dppReferraldesc + ' - Diabetes Prevention' ;
	                record.selectNewLineItem('item');
		            record.setCurrentLineItemValue('item','item',dppReferralitem);
	                record.setCurrentLineItemValue('item', 'description', appendClientCode(dppReferraldesc, ccgrouping));
	                record.setCurrentLineItemValue('item', 'quantity', dppAdminQty);
	                record.setCurrentLineItemText('item', 'price', 'Custom');
	                record.setCurrentLineItemValue('item', 'rate', (nvl(dppAdminRate,0)));
	                record.setCurrentLineItemText('item', 'custcol_liv_invoice_client_code', clientcode);
	                record.setCurrentLineItemValue('item', 'custcol_liv_sol_contract_number', contractnumber);
	                record.setCurrentLineItemValue('item', 'custcol_liv_sf_opportunity_id', sfopporid);  //NS-269
	                record.commitLineItem('item');
	            }
	        	//HTN-DBT
	        	if (nvl(htndbtAdminQty,0) > 0 && nvl(htndbtAdminRate,0) != 0 )
	            {
	        		htndbtReferraldesc = htndbtReferraldesc + ' - Hypertension & Diabetes Management' ;
	                record.selectNewLineItem('item');
		            record.setCurrentLineItemValue('item','item',htndbtReferralitem);
	                record.setCurrentLineItemValue('item', 'description', appendClientCode(htndbtReferraldesc, ccgrouping));
	                record.setCurrentLineItemValue('item', 'quantity', htndbtAdminQty);
	                record.setCurrentLineItemText('item', 'price', 'Custom');
	                record.setCurrentLineItemValue('item', 'rate', (nvl(htndbtAdminRate,0)));
	                record.setCurrentLineItemText('item', 'custcol_liv_invoice_client_code', clientcode);
	                record.setCurrentLineItemValue('item', 'custcol_liv_sol_contract_number', contractnumber);
	                record.setCurrentLineItemValue('item', 'custcol_liv_sf_opportunity_id', sfopporid);  //NS-269
	                record.commitLineItem('item');
	            }
	        	//WM-DBT
	        	if (nvl(wmdbtAdminQty,0) > 0 && nvl(wmdbtAdminRate,0) != 0 )
	            {
	        		wmdbtReferraldesc = wmdbtReferraldesc + ' - Weight Management & Diabetes Management' ;
	                record.selectNewLineItem('item');
		            record.setCurrentLineItemValue('item','item',wmdbtReferralitem);
	                record.setCurrentLineItemValue('item', 'description', appendClientCode(wmdbtReferraldesc, ccgrouping));
	                record.setCurrentLineItemValue('item', 'quantity', wmdbtAdminQty);
	                record.setCurrentLineItemText('item', 'price', 'Custom');
	                record.setCurrentLineItemValue('item', 'rate', (nvl(wmdbtAdminRate,0)));
	                record.setCurrentLineItemText('item', 'custcol_liv_invoice_client_code', clientcode);
	                record.setCurrentLineItemValue('item', 'custcol_liv_sol_contract_number', contractnumber);
	                record.setCurrentLineItemValue('item', 'custcol_liv_sf_opportunity_id', sfopporid);  //NS-269
	                record.commitLineItem('item');
	            }
	        	//WM-HTN
	        	if (nvl(wmhtnAdminQty,0) > 0 && nvl(wmhtnAdminRate,0) != 0 )
	            {
	        		wmhtnReferraldesc = wmhtnReferraldesc + ' - Weight Management & Hypertension' ;
	                record.selectNewLineItem('item');
		            record.setCurrentLineItemValue('item','item',wmhtnReferralitem);
	                record.setCurrentLineItemValue('item', 'description', appendClientCode(wmhtnReferraldesc, ccgrouping));
	                record.setCurrentLineItemValue('item', 'quantity', wmhtnAdminQty);
	                record.setCurrentLineItemText('item', 'price', 'Custom');
	                record.setCurrentLineItemValue('item', 'rate', (nvl(wmhtnAdminRate,0)));
	                record.setCurrentLineItemText('item', 'custcol_liv_invoice_client_code', clientcode);
	                record.setCurrentLineItemValue('item', 'custcol_liv_sol_contract_number', contractnumber);
	                record.setCurrentLineItemValue('item', 'custcol_liv_sf_opportunity_id', sfopporid);  //NS-269
	                record.commitLineItem('item');
	            }
	        	//WM-HTN-DBT
	        	if (nvl(wmhtndbtAdminQty,0) > 0 && nvl(wmhtndbtAdminRate,0) != 0 )
	            {
	        		wmhtndbtReferraldesc = wmhtndbtReferraldesc + ' - Weight Management, Hypertension & Diabetes Management' ;
	                record.selectNewLineItem('item');
		            record.setCurrentLineItemValue('item','item',wmhtndbtReferralitem);
	                record.setCurrentLineItemValue('item', 'description', appendClientCode(wmhtndbtReferraldesc, ccgrouping));
	                record.setCurrentLineItemValue('item', 'quantity', wmhtndbtAdminQty);
	                record.setCurrentLineItemText('item', 'price', 'Custom');
	                record.setCurrentLineItemValue('item', 'rate', (nvl(wmhtndbtAdminRate,0)));
	                record.setCurrentLineItemText('item', 'custcol_liv_invoice_client_code', clientcode);
	                record.setCurrentLineItemValue('item', 'custcol_liv_sol_contract_number', contractnumber);
	                record.setCurrentLineItemValue('item', 'custcol_liv_sf_opportunity_id', sfopporid);  //NS-269
	                record.commitLineItem('item');
	            }
	        	//WM2-HTN
	        	if (nvl(wm2htnAdminQty,0) > 0 && nvl(wm2htnAdminRate,0) != 0 )
	            {
	        		wm2htnReferraldesc = wm2htnReferraldesc + ' - Weight Management - Tier 2 & Hypertension' ;
	                record.selectNewLineItem('item');
		            record.setCurrentLineItemValue('item','item',wm2htnReferralitem);
	                record.setCurrentLineItemValue('item', 'description', appendClientCode(wm2htnReferraldesc, ccgrouping));
	                record.setCurrentLineItemValue('item', 'quantity', wm2htnAdminQty);
	                record.setCurrentLineItemText('item', 'price', 'Custom');
	                record.setCurrentLineItemValue('item', 'rate', (nvl(wm2htnAdminRate,0)));
	                record.setCurrentLineItemText('item', 'custcol_liv_invoice_client_code', clientcode);
	                record.setCurrentLineItemValue('item', 'custcol_liv_sol_contract_number', contractnumber);
	                record.setCurrentLineItemValue('item', 'custcol_liv_sf_opportunity_id', sfopporid);  //NS-269
	                record.commitLineItem('item');
	            }
	        	//WM2-HTN-DBT
	        	if (nvl(wm2htndbtAdminQty,0) > 0 && nvl(wm2htndbtAdminRate,0) != 0 )
	            {
	        		wm2htndbtReferraldesc = wm2htndbtReferraldesc + ' - Weight Management - Tier 2, Hypertension & Diabetes Management' ;
	                record.selectNewLineItem('item');
		            record.setCurrentLineItemValue('item','item',wm2htndbtReferralitem);
	                record.setCurrentLineItemValue('item', 'description', appendClientCode(wm2htndbtReferraldesc, ccgrouping));
	                record.setCurrentLineItemValue('item', 'quantity', wm2htndbtAdminQty);
	                record.setCurrentLineItemText('item', 'price', 'Custom');
	                record.setCurrentLineItemValue('item', 'rate', (nvl(wm2htndbtAdminRate,0)));
	                record.setCurrentLineItemText('item', 'custcol_liv_invoice_client_code', clientcode);
	                record.setCurrentLineItemValue('item', 'custcol_liv_sol_contract_number', contractnumber);
	                record.setCurrentLineItemValue('item', 'custcol_liv_sf_opportunity_id', sfopporid);  //NS-269
	                record.commitLineItem('item');
	            }
	        }
	        else{
	            if (nvl(referralqty,0) > 0 && nvl(referralrate,0) > 0 && createcmfee == 'F')
	            {
	            	nlapiLogExecution('AUDIT', 'LINE ITEM VALUES', 'referralitem = '+referralitem);	
	                nlapiLogExecution('DEBUG', 'VALUE', 'Referral : ');
	                referraldesc = referraldesc + ' - Diabetes Management' ;
	                record.selectNewLineItem('item');
		            record.setCurrentLineItemValue('item','item',referralitem);
	                record.setCurrentLineItemValue('item', 'description', appendClientCode(referraldesc, ccgrouping));
	                record.setCurrentLineItemValue('item', 'quantity', referralqty);
	                record.setCurrentLineItemText('item', 'price', 'Custom');
	                record.setCurrentLineItemValue('item', 'rate', (nvl(referralrate,0) * -1));
	                record.setCurrentLineItemText('item', 'custcol_liv_invoice_client_code', clientcode);
	                record.setCurrentLineItemValue('item', 'custcol_liv_sol_contract_number', contractnumber);
	                record.setCurrentLineItemValue('item', 'custcol_liv_sf_opportunity_id', sfopporid);  //NS-269
	                record.commitLineItem('item');
	            }
	
	            // NS-159 - Referral Item
	            if (nvl(htnreferralqty,0) > 0 && nvl(htnreferralrate,0) > 0 )
	            {
	            	nlapiLogExecution('AUDIT', 'LINE ITEM VALUES', 'htnreferralitem = '+htnreferralitem);	
	                nlapiLogExecution('DEBUG', 'VALUE', 'HTN Referral : ');
	                htnreferraldesc = htnreferraldesc + ' - Hypertension' ;
	                record.selectNewLineItem('item');
		            record.setCurrentLineItemValue('item','item',htnreferralitem);
	                record.setCurrentLineItemValue('item', 'description', appendClientCode(htnreferraldesc, ccgrouping));
	                record.setCurrentLineItemValue('item', 'quantity', htnreferralqty);
	                record.setCurrentLineItemText('item', 'price', 'Custom');
	                record.setCurrentLineItemValue('item', 'rate', (nvl(htnreferralrate,0) * -1));
	                record.setCurrentLineItemText('item', 'custcol_liv_invoice_client_code', clientcode);
	                record.setCurrentLineItemValue('item', 'custcol_liv_sol_contract_number', contractnumber);
	                record.setCurrentLineItemValue('item', 'custcol_liv_sf_opportunity_id', sfopporid);  //NS-269
	                record.commitLineItem('item');
	            }
	
	            //100719 WM Referral
	            if (nvl(wmreferralqty,0) > 0 && nvl(wmreferralrate,0) > 0 )
	            {
	            	nlapiLogExecution('AUDIT', 'LINE ITEM VALUES', 'wmreferralitem = '+wmreferralitem);	
	                nlapiLogExecution('DEBUG', 'VALUE', 'WM Referral : ');
	                wmreferraldesc = wmreferraldesc + ' - Weight Management' ;
	                record.selectNewLineItem('item');
		            record.setCurrentLineItemValue('item','item',wmreferralitem);
	                record.setCurrentLineItemValue('item', 'description', appendClientCode(wmreferraldesc, ccgrouping));
	                record.setCurrentLineItemValue('item', 'quantity', wmreferralqty);
	                record.setCurrentLineItemText('item', 'price', 'Custom');
	                record.setCurrentLineItemValue('item', 'rate', (nvl(wmreferralrate,0) * -1));
	                record.setCurrentLineItemText('item', 'custcol_liv_invoice_client_code', clientcode);
	                record.setCurrentLineItemValue('item', 'custcol_liv_sol_contract_number', contractnumber);
	                record.setCurrentLineItemValue('item', 'custcol_liv_sf_opportunity_id', sfopporid);  //NS-269
	                record.commitLineItem('item');
	            }
	
	            //100719 DPP Referral
	            if (nvl(dppreferralqty,0) > 0 && nvl(dppreferralrate,0) > 0 )
	            {
	            	nlapiLogExecution('AUDIT', 'LINE ITEM VALUES', 'dppreferralitem = '+dppreferralitem);	
	                nlapiLogExecution('DEBUG', 'VALUE', 'DPP Referral : ');
	                dppreferraldesc = dppreferraldesc + ' - Diabetes Prevention' ;
	                record.selectNewLineItem('item');
		            record.setCurrentLineItemValue('item','item',dppreferralitem);
	                record.setCurrentLineItemValue('item', 'description', appendClientCode(dppreferraldesc, ccgrouping));
	                record.setCurrentLineItemValue('item', 'quantity', dppreferralqty);
	                record.setCurrentLineItemText('item', 'price', 'Custom');
	                record.setCurrentLineItemValue('item', 'rate', (nvl(dppreferralrate,0) * -1));
	                record.setCurrentLineItemText('item', 'custcol_liv_invoice_client_code', clientcode);
	                record.setCurrentLineItemValue('item', 'custcol_liv_sol_contract_number', contractnumber);
	                record.setCurrentLineItemValue('item', 'custcol_liv_sf_opportunity_id', sfopporid);  //NS-269
	                record.commitLineItem('item');
	            }
	
	            // NS-249 - bundled htn admin fee
	            if (nvl(bundledreferralqty,0) > 0 && nvl(bundledreferralrate,0) > 0 )
	            {
	            	nlapiLogExecution('AUDIT', 'LINE ITEM VALUES', 'bundledreferralitem = '+bundledreferralitem);
	                nlapiLogExecution('DEBUG', 'VALUE', 'Bundled Referral : ');
	                bundledreferraldesc = bundledreferraldesc + ' - Diabetes Management & Hypertension' ;
	                record.selectNewLineItem('item');
		            record.setCurrentLineItemValue('item','item',bundledreferralitem);
	                record.setCurrentLineItemValue('item', 'description', appendClientCode(bundledreferraldesc, ccgrouping));
	                record.setCurrentLineItemValue('item', 'quantity', bundledreferralqty);
	                record.setCurrentLineItemText('item', 'price', 'Custom');
	                record.setCurrentLineItemValue('item', 'rate', (nvl(bundledreferralrate,0) * -1));
	                record.setCurrentLineItemText('item', 'custcol_liv_invoice_client_code', clientcode);
	                record.setCurrentLineItemValue('item', 'custcol_liv_sol_contract_number', contractnumber);
	                record.setCurrentLineItemValue('item', 'custcol_liv_sf_opportunity_id', sfopporid);  //NS-269
	                record.commitLineItem('item');
	            }
	        }
            //lapsed
	        if (nvl(lapsedqty,0) > 0 && showlapsed == 'T')
	        {
	        	nlapiLogExecution('AUDIT', 'LINE ITEM VALUES', 'lapseditem = '+lapseditem);
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
	        	nlapiLogExecution('AUDIT', 'LINE ITEM VALUES', 'taxitem = '+taxitem);
	            record.selectNewLineItem('item');
	            record.setCurrentLineItemValue('item','item',taxitem);
                record.setCurrentLineItemValue('item', 'description', appendClientCode(taxitemdesc, ccgrouping));
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

function appendClientCode(value1, cc)
{
	var value2 = value1;
	if (value1 != null && cc != null && value1.length > 0 && cc.length > 0)
	{
		if (value1.search(cc) < 0)
		{
		 value2 = value1 + '(' + cc + ')';
	 	}
	}
	return value2;
}

function searchAllRecord (recordType, searchId, searchFilter, searchColumns)
{
	var arrSearchResults = [];
	var count=1000, min=0, max=1000;

	var searchObj = false;

	if (searchId) 
	{
		searchObj = nlapiLoadSearch(recordType, searchId);
		if (searchFilter)
		{
			searchObj.addFilters(searchFilter);
		}
			
		if (searchColumns)
		{
			searchObj.addColumns(searchColumns);
		}			
	} 
	else 
	{
		searchObj = nlapiCreateSearch(recordType, searchFilter, searchColumns);
	}

	var rs = searchObj.runSearch();

	while( count == 1000 )
	{
		var resultSet = rs.getResults(min, max);
		arrSearchResults = arrSearchResults.concat(resultSet);
		min = max;
		max+=1000;
		count = resultSet.length;
	}

	if(arrSearchResults)
	{
		nlapiLogExecution('DEBUG', 'searchAllRecord', 'Total search results('+recordType+'): '+arrSearchResults.length);
	}
	return arrSearchResults;		
}
