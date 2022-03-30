/* Last Updated: 03/10/19 - new */


function beforeSubmit(type)
{
  //applies only to CSV Import and Create event
 // nlapiLogExecution('DEBUG','Type'+ type) ;
 // nlapiLogExecution('DEBUG','Context '+ (nlapiGetContext().getExecutionContext() == 'csvimport')) ;
  
 if ( (type == 'create') &&  (nlapiGetContext().getExecutionContext() == 'csvimport'))
  {
           

       var btcompanynametmp = nlapiGetFieldValue('custrecord_liv_rev_bt_company_name_tmp');
       var stcustomertmp = nlapiGetFieldValue('custrecord_liv_rev_st_customer_temp');
       
       var account = nlapiGetFieldValue('custrecord_liv_rev_account');
       var accounttext = nlapiGetFieldText('custrecord_liv_rev_account');
       var btcompanyname = nlapiGetFieldText('custrecord_liv_rev_bt_company_name');
       var btcompanyorig = nlapiGetFieldText('custrecord_liv_rev_bt_customer_orig');
       var stcustomer = nlapiGetFieldText('custrecord_liv_rev_st_customer');
       var stcompanyname = nlapiGetFieldValue('custrecord_liv_rev_st_company_name');
       var qbname = nlapiGetFieldValue('custrecord_liv_rev_qb_name_mapped');
       var contractnumber = nlapiGetFieldValue('custrecord_liv_rev_st_contract_number');
       var clientcode = nlapiGetFieldValue('custrecord_liv_rev_client_code');
       
       var btcompanynamedisp = null;
       
      // nlapiLogExecution('DEBUG','ST Company Name:'+ stcompanyname) ;
       
       var transformed = 0;
     //  var stcompanyname = null;

      // for debugging only
      
       nlapiLogExecution('DEBUG','Bill To Company Name Tmp:'+ btcompanynametmp) ;
       /*
       nlapiLogExecution('DEBUG','Account:'+ account) ;
       nlapiLogExecution('DEBUG','Account Text:'+ accounttext) ;
       nlapiLogExecution('DEBUG','BT Company Name:'+ btcompanyname) ;
       nlapiLogExecution('DEBUG','ST Customer:'+ stcustomer) ;
       nlapiLogExecution('DEBUG','QB Name:'+ qbname) ;
       nlapiLogExecution('DEBUG','Contract Number:'+ contractnumber) ;
       nlapiLogExecution('DEBUG','Client Code:'+ clientcode) ;
      */
       
       /* Customer Mapping */
       if (btcompanynametmp == 'AB Life')  
       {
          btcompanynametmp = 'Activision Blizzard';
          stcustomertmp = 'Activision Blizzard';
          stcompanyname = 'Activision Blizzard';
          
          //nlapiLogExecution('DEBUG','Transformed BT Company Name Tmp:'+ btcompanynametmp) ;
          //nlapiLogExecution('DEBUG','Transformed BT Company Name Tmp:'+ stcustomertmp) ;
          
          nlapiSetFieldText('custrecord_liv_rev_bt_company_name', btcompanynametmp);
          nlapiSetFieldText('custrecord_liv_rev_bt_customer_orig', btcompanynametmp);
          nlapiSetFieldValue('custrecord_liv_rev_bt_company_name_disp', btcompanynametmp);
          nlapiSetFieldText('custrecord_liv_rev_st_customer', stcustomertmp);
          nlapiSetFieldValue('custrecord_liv_rev_st_company_name', stcustomertmp);
          nlapiSetFieldText('custrecord_liv_rev_st_customer_orig', stcustomertmp);
          transformed = 1;
       }
       if (btcompanynametmp == 'Aria')  
       {
          btcompanynametmp = 'Jefferson';
          stcustomertmp = 'Aria Health';
          stcompanyname = 'Aria Health';
          
          //nlapiLogExecution('DEBUG','Transformed BT Company Name Tmp:'+ btcompanynametmp) ;
          //nlapiLogExecution('DEBUG','Transformed BT Company Name Tmp:'+ stcustomertmp) ;
          
          nlapiSetFieldText('custrecord_liv_rev_bt_company_name', btcompanynametmp);
          nlapiSetFieldText('custrecord_liv_rev_bt_customer_orig', btcompanynametmp);
          nlapiSetFieldValue('custrecord_liv_rev_bt_company_name_disp', btcompanynametmp);
          nlapiSetFieldText('custrecord_liv_rev_st_customer', stcustomertmp);
          nlapiSetFieldValue('custrecord_liv_rev_st_company_name', stcustomertmp);
          nlapiSetFieldText('custrecord_liv_rev_st_customer_orig', stcustomertmp);
          transformed = 1;
       }
        if (btcompanynametmp == 'Aria Health')  
       {
          btcompanynametmp = 'Jefferson';
          stcustomertmp = 'Aria Health';
          stcompanyname = 'Aria Health';
          
          //nlapiLogExecution('DEBUG','Transformed BT Company Name Tmp:'+ btcompanynametmp) ;
          //nlapiLogExecution('DEBUG','Transformed BT Company Name Tmp:'+ stcustomertmp) ;
          
          nlapiSetFieldText('custrecord_liv_rev_bt_company_name', btcompanynametmp);
          nlapiSetFieldText('custrecord_liv_rev_bt_customer_orig', btcompanynametmp);
          nlapiSetFieldValue('custrecord_liv_rev_bt_company_name_disp', btcompanynametmp);
          nlapiSetFieldText('custrecord_liv_rev_st_customer', stcustomertmp);
          nlapiSetFieldValue('custrecord_liv_rev_st_company_name', stcustomertmp);
          nlapiSetFieldText('custrecord_liv_rev_st_customer_orig', stcustomertmp);
          transformed = 1;
       }
       if (btcompanynametmp == 'ATI')  
       {
          btcompanynametmp = 'Air Transport International (ATI)';
          stcustomertmp = 'Air Transport International (ATI)';
          stcompanyname = 'Air Transport International (ATI)';
          
          //nlapiLogExecution('DEBUG','Transformed BT Company Name Tmp:'+ btcompanynametmp) ;
          //nlapiLogExecution('DEBUG','Transformed BT Company Name Tmp:'+ stcustomertmp) ;
          
          nlapiSetFieldText('custrecord_liv_rev_bt_company_name', btcompanynametmp);
          nlapiSetFieldText('custrecord_liv_rev_bt_customer_orig', btcompanynametmp);
          nlapiSetFieldValue('custrecord_liv_rev_bt_company_name_disp', btcompanynametmp);
          nlapiSetFieldText('custrecord_liv_rev_st_customer', stcustomertmp);
          nlapiSetFieldValue('custrecord_liv_rev_st_company_name', stcustomertmp);
          nlapiSetFieldText('custrecord_liv_rev_st_customer_orig', stcustomertmp);
          transformed = 1;
       }
       if (btcompanynametmp == 'BCBS KC')  
       {
          btcompanynametmp = 'HCSC';
          stcustomertmp = 'HCSC : BCBS Kansas City';
          stcompanyname = 'BCBS Kansas City';
          
          //nlapiLogExecution('DEBUG','Transformed BT Company Name Tmp:'+ btcompanynametmp) ;
          //nlapiLogExecution('DEBUG','Transformed BT Company Name Tmp:'+ stcustomertmp) ;
          
          nlapiSetFieldText('custrecord_liv_rev_bt_company_name', btcompanynametmp);
          nlapiSetFieldText('custrecord_liv_rev_bt_customer_orig', btcompanynametmp);
          nlapiSetFieldValue('custrecord_liv_rev_bt_company_name_disp', btcompanynametmp);
          nlapiSetFieldText('custrecord_liv_rev_st_customer', stcustomertmp);
          nlapiSetFieldValue('custrecord_liv_rev_st_company_name', stcompanyname);
          nlapiSetFieldText('custrecord_liv_rev_st_customer_orig', stcustomertmp);
          transformed = 1;
       }
       if (btcompanynametmp == 'BCD')  
       {
          btcompanynametmp = 'United Healthcare (UHC)';
          stcustomertmp = 'United Healthcare (UHC) : BCD Travel';
          stcompanyname = 'BCD Travel';
          
          //nlapiLogExecution('DEBUG','Transformed BT Company Name Tmp:'+ btcompanynametmp) ;
          //nlapiLogExecution('DEBUG','Transformed BT Company Name Tmp:'+ stcustomertmp) ;
          
          nlapiSetFieldText('custrecord_liv_rev_bt_company_name', btcompanynametmp);
          nlapiSetFieldText('custrecord_liv_rev_bt_customer_orig', btcompanynametmp);
          nlapiSetFieldValue('custrecord_liv_rev_bt_company_name_disp', btcompanynametmp);
          nlapiSetFieldText('custrecord_liv_rev_st_customer', stcustomertmp);
          nlapiSetFieldValue('custrecord_liv_rev_st_company_name', stcompanyname);
          nlapiSetFieldText('custrecord_liv_rev_st_customer_orig', stcustomertmp);
          transformed = 1;
       }
       
       //* NEW *
       if  (btcompanynametmp == 'Advocate Health Care (RF)')  
       {
          btcompanynamedisp = 'Advocate Health';
          stcompanyname = 'Advocate Health';
          
          //nlapiLogExecution('DEBUG','Transformed BT Company Name Tmp:'+ btcompanynametmp) ;
          //nlapiLogExecution('DEBUG','Transformed BT Company Name Tmp:'+ stcustomertmp) ;
          
          nlapiSetFieldText('custrecord_liv_rev_bt_company_name', btcompanynametmp);
          nlapiSetFieldText('custrecord_liv_rev_bt_customer_orig', btcompanynametmp);
          nlapiSetFieldValue('custrecord_liv_rev_bt_company_name_disp', btcompanynamedisp);
          nlapiSetFieldText('custrecord_liv_rev_st_customer', stcustomertmp);
          nlapiSetFieldValue('custrecord_liv_rev_st_company_name', stcompanyname);
          nlapiSetFieldText('custrecord_liv_rev_st_customer_orig', stcustomertmp);
          transformed = 1;
       }       
       if  (btcompanynametmp == 'Anthem, Inc.')  
       {
          btcompanynamedisp = 'Anthem';
          stcompanyname = 'Anthem';
          
          //nlapiLogExecution('DEBUG','Transformed BT Company Name Tmp:'+ btcompanynametmp) ;
          //nlapiLogExecution('DEBUG','Transformed BT Company Name Tmp:'+ stcustomertmp) ;
          
          nlapiSetFieldText('custrecord_liv_rev_bt_company_name', btcompanynametmp);
          nlapiSetFieldText('custrecord_liv_rev_bt_customer_orig', btcompanynametmp);
          nlapiSetFieldValue('custrecord_liv_rev_bt_company_name_disp', btcompanynamedisp);
          nlapiSetFieldText('custrecord_liv_rev_st_customer', stcustomertmp);
          nlapiSetFieldValue('custrecord_liv_rev_st_company_name', stcompanyname);
          nlapiSetFieldText('custrecord_liv_rev_st_customer_orig', stcustomertmp);
          transformed = 1;
       }       
       if  (btcompanynametmp == 'Aramark - FSS')  
       {
          btcompanynamedisp = 'Aramark';
          stcompanyname = 'Aramark';
          
          //nlapiLogExecution('DEBUG','Transformed BT Company Name Tmp:'+ btcompanynametmp) ;
          //nlapiLogExecution('DEBUG','Transformed BT Company Name Tmp:'+ stcustomertmp) ;
          
          nlapiSetFieldText('custrecord_liv_rev_bt_company_name', btcompanynametmp);
          nlapiSetFieldText('custrecord_liv_rev_bt_customer_orig', btcompanynametmp);
          nlapiSetFieldValue('custrecord_liv_rev_bt_company_name_disp', btcompanynamedisp);
          nlapiSetFieldText('custrecord_liv_rev_st_customer', stcustomertmp);
          nlapiSetFieldValue('custrecord_liv_rev_st_company_name', stcompanyname);
          nlapiSetFieldText('custrecord_liv_rev_st_customer_orig', stcustomertmp);
          transformed = 1;
       }   
       if  (btcompanynametmp == 'Highmark, Inc.')  
       {
          btcompanynamedisp = 'Highmark';
          stcompanyname = 'Highmark';
          
          //nlapiLogExecution('DEBUG','Transformed BT Company Name Tmp:'+ btcompanynametmp) ;
          //nlapiLogExecution('DEBUG','Transformed BT Company Name Tmp:'+ stcustomertmp) ;
          
          nlapiSetFieldText('custrecord_liv_rev_bt_company_name', btcompanynametmp);
          nlapiSetFieldText('custrecord_liv_rev_bt_customer_orig', btcompanynametmp);
          nlapiSetFieldValue('custrecord_liv_rev_bt_company_name_disp', btcompanynamedisp);
          nlapiSetFieldText('custrecord_liv_rev_st_customer', stcustomertmp);
          nlapiSetFieldValue('custrecord_liv_rev_st_company_name', stcompanyname);
          nlapiSetFieldText('custrecord_liv_rev_st_customer_orig', stcustomertmp);
          transformed = 1;
       }   
       if  (btcompanynametmp == 'Yum! Restaurant Services - SOW C202804')  
       {
          btcompanynamedisp = 'Yum Restaurant Services Group, Inc.';
          stcompanyname = 'Yum Restaurant Services Group, Inc.';
          
          //nlapiLogExecution('DEBUG','Transformed BT Company Name Tmp:'+ btcompanynametmp) ;
          //nlapiLogExecution('DEBUG','Transformed BT Company Name Tmp:'+ stcustomertmp) ;
          
          nlapiSetFieldText('custrecord_liv_rev_bt_company_name', btcompanynametmp);
          nlapiSetFieldText('custrecord_liv_rev_bt_customer_orig', btcompanynametmp);
          nlapiSetFieldValue('custrecord_liv_rev_bt_company_name_disp', btcompanynamedisp);
          nlapiSetFieldText('custrecord_liv_rev_st_customer', stcustomertmp);
          nlapiSetFieldValue('custrecord_liv_rev_st_company_name', stcompanyname);
          nlapiSetFieldText('custrecord_liv_rev_st_customer_orig', stcustomertmp);
          transformed = 1;
       }   
       if  (btcompanynametmp == 'Voya Financial.')  
       {
          btcompanynamedisp = 'Voya Financial';
          stcompanyname = 'Voya Financial';
          
          //nlapiLogExecution('DEBUG','Transformed BT Company Name Tmp:'+ btcompanynametmp) ;
          //nlapiLogExecution('DEBUG','Transformed BT Company Name Tmp:'+ stcustomertmp) ;
          
          nlapiSetFieldText('custrecord_liv_rev_bt_company_name', btcompanynametmp);
          nlapiSetFieldText('custrecord_liv_rev_bt_customer_orig', btcompanynametmp);
          nlapiSetFieldValue('custrecord_liv_rev_bt_company_name_disp', btcompanynamedisp);
          nlapiSetFieldText('custrecord_liv_rev_st_customer', stcustomertmp);
          nlapiSetFieldValue('custrecord_liv_rev_st_company_name', stcompanyname);
          nlapiSetFieldText('custrecord_liv_rev_st_customer_orig', stcustomertmp);
          transformed = 1;
       }   
     
        if  (stcustomertmp == 'CSAA Insurance Services') 
       {
          btcompanynametmp = 'CSAA Insurance Group, a AAA Insurer';
          stcustomertmp = 'CSAA Insurance Group, a AAA Insurer';
          stcompanyname = 'CSAA Insurance Group, a AAA Insurer';
          
          //nlapiLogExecution('DEBUG','Transformed BT Company Name Tmp:'+ btcompanynametmp) ;
          //nlapiLogExecution('DEBUG','Transformed BT Company Name Tmp:'+ stcustomertmp) ;
          
          nlapiSetFieldText('custrecord_liv_rev_bt_company_name', btcompanynametmp);
          nlapiSetFieldText('custrecord_liv_rev_bt_customer_orig', btcompanynametmp);
          nlapiSetFieldValue('custrecord_liv_rev_bt_company_name_disp', btcompanynametmp);
          nlapiSetFieldText('custrecord_liv_rev_st_customer', stcustomertmp);
          nlapiSetFieldValue('custrecord_liv_rev_st_company_name', stcustomertmp);
          nlapiSetFieldText('custrecord_liv_rev_st_customer_orig', stcustomertmp);
          transformed = 1;
       }
        if  (stcustomertmp == 'Greyhound') 
       {
          btcompanynametmp = 'Cigna';
          stcustomertmp = 'Cigna : Greyhound Lines Inc.';
          stcompanyname = 'Greyhound Lines Inc.';
          
          //nlapiLogExecution('DEBUG','Transformed BT Company Name Tmp:'+ btcompanynametmp) ;
          //nlapiLogExecution('DEBUG','Transformed BT Company Name Tmp:'+ stcustomertmp) ;
          
          nlapiSetFieldText('custrecord_liv_rev_bt_company_name', btcompanynametmp);
          nlapiSetFieldText('custrecord_liv_rev_bt_customer_orig', btcompanynametmp);
          nlapiSetFieldValue('custrecord_liv_rev_bt_company_name_disp', btcompanynametmp);
          nlapiSetFieldText('custrecord_liv_rev_st_customer', stcustomertmp);
          nlapiSetFieldValue('custrecord_liv_rev_st_company_name', stcompanyname);
          nlapiSetFieldText('custrecord_liv_rev_st_customer_orig', stcustomertmp);
          transformed = 1;
       }
       if  (stcustomertmp == 'Greyhound Lines Inc.') 
       {
          btcompanynametmp = 'Cigna';
          stcustomertmp = 'Cigna : Greyhound Lines Inc.';
          stcompanyname = 'Greyhound Lines Inc.';
          
          //nlapiLogExecution('DEBUG','Transformed BT Company Name Tmp:'+ btcompanynametmp) ;
          //nlapiLogExecution('DEBUG','Transformed BT Company Name Tmp:'+ stcustomertmp) ;
          
          nlapiSetFieldText('custrecord_liv_rev_bt_company_name', btcompanynametmp);
          nlapiSetFieldText('custrecord_liv_rev_bt_customer_orig', btcompanynametmp);
          nlapiSetFieldValue('custrecord_liv_rev_bt_company_name_disp', btcompanynametmp);
          nlapiSetFieldText('custrecord_liv_rev_st_customer', stcustomertmp);
          nlapiSetFieldValue('custrecord_liv_rev_st_company_name', stcompanyname);
          nlapiSetFieldText('custrecord_liv_rev_st_customer_orig', stcustomertmp);
          transformed = 1;
       }
        if  (stcustomertmp == 'HCP') 
       {
          btcompanynametmp = 'Healthcare Partners';
          stcustomertmp = 'Healthcare Partners';
          stcompanyname = 'Healthcare Partners';
          
          //nlapiLogExecution('DEBUG','Transformed BT Company Name Tmp:'+ btcompanynametmp) ;
          //nlapiLogExecution('DEBUG','Transformed BT Company Name Tmp:'+ stcustomertmp) ;
          
          nlapiSetFieldText('custrecord_liv_rev_bt_company_name', btcompanynametmp);
          nlapiSetFieldText('custrecord_liv_rev_bt_customer_orig', btcompanynametmp);
          nlapiSetFieldValue('custrecord_liv_rev_bt_company_name_disp', btcompanynametmp);
          nlapiSetFieldText('custrecord_liv_rev_st_customer', stcustomertmp);
          nlapiSetFieldValue('custrecord_liv_rev_st_company_name', stcustomertmp);
          nlapiSetFieldText('custrecord_liv_rev_st_customer_orig', stcustomertmp);
          transformed = 1;
       }       
        if  (stcustomertmp == 'HealthSCOPE') 
       {
          btcompanynametmp = 'HealthSCOPE Benefits';
          stcustomertmp = 'HealthSCOPE Benefits';
          stcompanyname = 'HealthSCOPE Benefits';
          
          //nlapiLogExecution('DEBUG','Transformed BT Company Name Tmp:'+ btcompanynametmp) ;
          //nlapiLogExecution('DEBUG','Transformed BT Company Name Tmp:'+ stcustomertmp) ;
          
          nlapiSetFieldText('custrecord_liv_rev_bt_company_name', btcompanynametmp);
          nlapiSetFieldText('custrecord_liv_rev_bt_customer_orig', btcompanynametmp);
          nlapiSetFieldValue('custrecord_liv_rev_bt_company_name_disp', btcompanynametmp);
          nlapiSetFieldText('custrecord_liv_rev_st_customer', stcustomertmp);
          nlapiSetFieldValue('custrecord_liv_rev_st_company_name', stcustomertmp);
          nlapiSetFieldText('custrecord_liv_rev_st_customer_orig', stcustomertmp);
          transformed = 1;
       }       
        if  (stcustomertmp == 'NCLH') 
       {
          btcompanynametmp = 'Norwegian Cruise Lines';
          stcustomertmp = 'Norwegian Cruise Lines';
          stcompanyname = 'Norwegian Cruise Lines';
          
          //nlapiLogExecution('DEBUG','Transformed BT Company Name Tmp:'+ btcompanynametmp) ;
          //nlapiLogExecution('DEBUG','Transformed BT Company Name Tmp:'+ stcustomertmp) ;
          
          nlapiSetFieldText('custrecord_liv_rev_bt_company_name', btcompanynametmp);
          nlapiSetFieldText('custrecord_liv_rev_bt_customer_orig', btcompanynametmp);
          nlapiSetFieldValue('custrecord_liv_rev_bt_company_name_disp', btcompanynametmp);
          nlapiSetFieldText('custrecord_liv_rev_st_customer', stcustomertmp);
          nlapiSetFieldValue('custrecord_liv_rev_st_company_name', stcustomertmp);
          nlapiSetFieldText('custrecord_liv_rev_st_customer_orig', stcustomertmp);
          transformed = 1;
       }
        if  (stcustomertmp == 'Optima') 
       {
          btcompanynametmp = 'Optima Health';
          stcustomertmp = 'Optima Health';
          stcompanyname = 'Optima Health';
          
          //nlapiLogExecution('DEBUG','Transformed BT Company Name Tmp:'+ btcompanynametmp) ;
          //nlapiLogExecution('DEBUG','Transformed BT Company Name Tmp:'+ stcustomertmp) ;
          
          nlapiSetFieldText('custrecord_liv_rev_bt_company_name', btcompanynametmp);
          nlapiSetFieldText('custrecord_liv_rev_bt_customer_orig', btcompanynametmp);
          nlapiSetFieldValue('custrecord_liv_rev_bt_company_name_disp', btcompanynametmp);
          nlapiSetFieldText('custrecord_liv_rev_st_customer', stcustomertmp);
          nlapiSetFieldValue('custrecord_liv_rev_st_company_name', stcustomertmp);
          nlapiSetFieldText('custrecord_liv_rev_st_customer_orig', stcustomertmp);
          transformed = 1;
       }       
        if  (stcustomertmp == 'Saulsbury') 
       {
          btcompanynametmp = 'Saulsbury Industries';
          stcustomertmp = 'Saulsbury Industries';
          stcompanyname = 'Saulsbury Industries';
          
          //nlapiLogExecution('DEBUG','Transformed BT Company Name Tmp:'+ btcompanynametmp) ;
          //nlapiLogExecution('DEBUG','Transformed BT Company Name Tmp:'+ stcustomertmp) ;
          
          nlapiSetFieldText('custrecord_liv_rev_bt_company_name', btcompanynametmp);
          nlapiSetFieldText('custrecord_liv_rev_bt_customer_orig', btcompanynametmp);
          nlapiSetFieldValue('custrecord_liv_rev_bt_company_name_disp', btcompanynametmp);
          nlapiSetFieldText('custrecord_liv_rev_st_customer', stcustomertmp);
          nlapiSetFieldValue('custrecord_liv_rev_st_company_name', stcustomertmp);
          nlapiSetFieldText('custrecord_liv_rev_st_customer_orig', stcustomertmp);
          transformed = 1;
       }       
        if  (stcustomertmp == 'Sioux Falls') 
       {
          btcompanynametmp = 'City of Sioux Falls';
          stcustomertmp = 'City of Sioux Falls';
          stcompanyname = 'City of Sioux Falls';
          
          //nlapiLogExecution('DEBUG','Transformed BT Company Name Tmp:'+ btcompanynametmp) ;
          //nlapiLogExecution('DEBUG','Transformed BT Company Name Tmp:'+ stcustomertmp) ;
          
          nlapiSetFieldText('custrecord_liv_rev_bt_company_name', btcompanynametmp);
          nlapiSetFieldText('custrecord_liv_rev_bt_customer_orig', btcompanynametmp);
          nlapiSetFieldValue('custrecord_liv_rev_bt_company_name_disp', btcompanynametmp);
          nlapiSetFieldText('custrecord_liv_rev_st_customer', stcustomertmp);
          nlapiSetFieldValue('custrecord_liv_rev_st_company_name', stcustomertmp);
          nlapiSetFieldText('custrecord_liv_rev_st_customer_orig', stcustomertmp);
          transformed = 1;
       }       
        if  (stcustomertmp == 'Sitel Direct') 
       {
          btcompanynametmp = 'Sitel';
          stcustomertmp = 'Sitel';
          stcompanyname = 'Sitel';
          
          //nlapiLogExecution('DEBUG','Transformed BT Company Name Tmp:'+ btcompanynametmp) ;
          //nlapiLogExecution('DEBUG','Transformed BT Company Name Tmp:'+ stcustomertmp) ;
          
          nlapiSetFieldText('custrecord_liv_rev_bt_company_name', btcompanynametmp);
          nlapiSetFieldText('custrecord_liv_rev_bt_customer_orig', btcompanynametmp);
          nlapiSetFieldValue('custrecord_liv_rev_bt_company_name_disp', btcompanynametmp);
          nlapiSetFieldText('custrecord_liv_rev_st_customer', stcustomertmp);
          nlapiSetFieldValue('custrecord_liv_rev_st_company_name', stcustomertmp);
          nlapiSetFieldText('custrecord_liv_rev_st_customer_orig', stcustomertmp);
          transformed = 1;
       }       
        if  (stcustomertmp == 'Time Warner') 
       {
          btcompanynametmp = 'Anthem';
          stcustomertmp = 'Anthem : WarnerMedia (Formerly Time Warner Inc)';
          stcompanyname = 'WarnerMedia (Formerly Time Warner Inc)';
          
          //nlapiLogExecution('DEBUG','Transformed BT Company Name Tmp:'+ btcompanynametmp) ;
          //nlapiLogExecution('DEBUG','Transformed BT Company Name Tmp:'+ stcustomertmp) ;
          
          nlapiSetFieldText('custrecord_liv_rev_bt_company_name', btcompanynametmp);
          nlapiSetFieldText('custrecord_liv_rev_bt_customer_orig', btcompanynametmp);
          nlapiSetFieldValue('custrecord_liv_rev_bt_company_name_disp', btcompanynametmp);
          nlapiSetFieldText('custrecord_liv_rev_st_customer', stcustomertmp);
          nlapiSetFieldValue('custrecord_liv_rev_st_company_name', stcompanyname);
          nlapiSetFieldText('custrecord_liv_rev_st_customer_orig', stcustomertmp);
          transformed = 1;
       }       
    if  (stcustomertmp == 'UHC') 
       {
          btcompanynametmp = 'United Healthcare (UHC)';
          stcustomertmp = 'United Healthcare (UHC)';
          stcompanyname = 'United Healthcare (UHC)';
          
          //nlapiLogExecution('DEBUG','Transformed BT Company Name Tmp:'+ btcompanynametmp) ;
          //nlapiLogExecution('DEBUG','Transformed BT Company Name Tmp:'+ stcustomertmp) ;
          
          nlapiSetFieldText('custrecord_liv_rev_bt_company_name', btcompanynametmp);
          nlapiSetFieldText('custrecord_liv_rev_bt_customer_orig', btcompanynametmp);
          nlapiSetFieldValue('custrecord_liv_rev_bt_company_name_disp', btcompanynametmp);
          nlapiSetFieldText('custrecord_liv_rev_st_customer', stcustomertmp);
          nlapiSetFieldValue('custrecord_liv_rev_st_company_name', stcustomertmp);
          nlapiSetFieldText('custrecord_liv_rev_st_customer_orig', stcustomertmp);
          transformed = 1;
       }          
    if  (stcustomertmp == 'UHC : Regus') 
       {
          btcompanynametmp = 'United Healthcare (UHC)';
          stcustomertmp = 'United Healthcare (UHC) : Regus';
          stcompanyname = 'Regus';
          
          //nlapiLogExecution('DEBUG','Transformed BT Company Name Tmp:'+ btcompanynametmp) ;
          //nlapiLogExecution('DEBUG','Transformed BT Company Name Tmp:'+ stcustomertmp) ;
          
          nlapiSetFieldText('custrecord_liv_rev_bt_company_name', btcompanynametmp);
          nlapiSetFieldText('custrecord_liv_rev_bt_customer_orig', btcompanynametmp);
          nlapiSetFieldValue('custrecord_liv_rev_bt_company_name_disp', btcompanynametmp);
          nlapiSetFieldText('custrecord_liv_rev_st_customer', stcustomertmp);
          nlapiSetFieldValue('custrecord_liv_rev_st_company_name', stcompanyname);
          nlapiSetFieldText('custrecord_liv_rev_st_customer_orig', stcustomertmp);
          transformed = 1;
       }      
    if  (stcustomertmp == 'UHC : Caliber') 
       {
          btcompanynametmp = 'United Healthcare (UHC)';
          stcustomertmp = 'United Healthcare (UHC) : Caliber Home Loans';
          stcompanyname = 'Caliber Home Loans';
          
          //nlapiLogExecution('DEBUG','Transformed BT Company Name Tmp:'+ btcompanynametmp) ;
          //nlapiLogExecution('DEBUG','Transformed BT Company Name Tmp:'+ stcustomertmp) ;
          
          nlapiSetFieldText('custrecord_liv_rev_bt_company_name', btcompanynametmp);
          nlapiSetFieldText('custrecord_liv_rev_bt_customer_orig', btcompanynametmp);
          nlapiSetFieldValue('custrecord_liv_rev_bt_company_name_disp', btcompanynametmp);
          nlapiSetFieldText('custrecord_liv_rev_st_customer', stcustomertmp);
          nlapiSetFieldValue('custrecord_liv_rev_st_company_name', stcompanyname);
          nlapiSetFieldText('custrecord_liv_rev_st_customer_orig', stcustomertmp);
          transformed = 1;
       }            
    if  (stcustomertmp == 'Wonderful Company') 
       {
          btcompanynametmp = 'The Wonderful Company';
          stcustomertmp = 'The Wonderful Company';
          stcompanyname = 'The Wonderful Company';
          
          //nlapiLogExecution('DEBUG','Transformed BT Company Name Tmp:'+ btcompanynametmp) ;
          //nlapiLogExecution('DEBUG','Transformed BT Company Name Tmp:'+ stcustomertmp) ;
          
          nlapiSetFieldText('custrecord_liv_rev_bt_company_name', btcompanynametmp);
          nlapiSetFieldText('custrecord_liv_rev_bt_customer_orig', btcompanynametmp);
          nlapiSetFieldValue('custrecord_liv_rev_bt_company_name_disp', btcompanynametmp);
          nlapiSetFieldText('custrecord_liv_rev_st_customer', stcustomertmp);
          nlapiSetFieldValue('custrecord_liv_rev_st_company_name', stcustomertmp);
          nlapiSetFieldText('custrecord_liv_rev_st_customer_orig', stcustomertmp);
          transformed = 1;
       }       
    if  (stcustomertmp == 'Cerner Corporation : MCG Health') 
       {
          btcompanynametmp = 'Cerner Corporation';
          stcustomertmp = 'Cerner Corporation : AU Health (Formerly MCG Health Inc.)';
          stcompanyname = 'AU Health (Formerly MCG Health Inc.)';
          
          //nlapiLogExecution('DEBUG','Transformed BT Company Name Tmp:'+ btcompanynametmp) ;
          //nlapiLogExecution('DEBUG','Transformed BT Company Name Tmp:'+ stcustomertmp) ;
          
          nlapiSetFieldText('custrecord_liv_rev_bt_company_name', btcompanynametmp);
          nlapiSetFieldText('custrecord_liv_rev_bt_customer_orig', btcompanynametmp);
          nlapiSetFieldValue('custrecord_liv_rev_bt_company_name_disp', btcompanynametmp);
          nlapiSetFieldText('custrecord_liv_rev_st_customer', stcustomertmp);
          nlapiSetFieldValue('custrecord_liv_rev_st_company_name', stcompanyname);
          nlapiSetFieldText('custrecord_liv_rev_st_customer_orig', stcustomertmp);
          transformed = 1;
       }              
      if  (stcustomertmp == 'Cerner Corporation : UMC Lubbock') 
       {
          btcompanynametmp = 'Cerner Corporation';
          stcustomertmp = 'Cerner Corporation : UMC Health System';
          stcompanyname = 'UMC Health System';
          
          //nlapiLogExecution('DEBUG','Transformed BT Company Name Tmp:'+ btcompanynametmp) ;
          //nlapiLogExecution('DEBUG','Transformed BT Company Name Tmp:'+ stcustomertmp) ;
          
          nlapiSetFieldText('custrecord_liv_rev_bt_company_name', btcompanynametmp);
          nlapiSetFieldText('custrecord_liv_rev_bt_customer_orig', btcompanynametmp);
          nlapiSetFieldValue('custrecord_liv_rev_bt_company_name_disp', btcompanynametmp);
          nlapiSetFieldText('custrecord_liv_rev_st_customer', stcustomertmp);
          nlapiSetFieldValue('custrecord_liv_rev_st_company_name', stcompanyname);
          nlapiSetFieldText('custrecord_liv_rev_st_customer_orig', stcustomertmp);
          transformed = 1;
       }         
       if  (stcustomertmp == 'Cigna : Disney') 
       {
          btcompanynametmp = 'Cigna';
          stcustomertmp = 'Cigna : The Walt Disney Company';
          stcompanyname = 'The Walt Disney Company';
          
          //nlapiLogExecution('DEBUG','Transformed BT Company Name Tmp:'+ btcompanynametmp) ;
          //nlapiLogExecution('DEBUG','Transformed BT Company Name Tmp:'+ stcustomertmp) ;
          
          nlapiSetFieldText('custrecord_liv_rev_bt_company_name', btcompanynametmp);
          nlapiSetFieldText('custrecord_liv_rev_bt_customer_orig', btcompanynametmp);
          nlapiSetFieldValue('custrecord_liv_rev_bt_company_name_disp', btcompanynametmp);
          nlapiSetFieldText('custrecord_liv_rev_st_customer', stcustomertmp);
          nlapiSetFieldValue('custrecord_liv_rev_st_company_name', stcompanyname);
          nlapiSetFieldText('custrecord_liv_rev_st_customer_orig', stcustomertmp);
          transformed = 1;
       }         
       if  (stcustomertmp == 'Cigna : Fedex') 
       {
          btcompanynametmp = 'Cigna';
          stcustomertmp = 'Cigna : Fedex Corporation';
          stcompanyname = 'Fedex Corporation';
          
          //nlapiLogExecution('DEBUG','Transformed BT Company Name Tmp:'+ btcompanynametmp) ;
          //nlapiLogExecution('DEBUG','Transformed BT Company Name Tmp:'+ stcustomertmp) ;
          
          nlapiSetFieldText('custrecord_liv_rev_bt_company_name', btcompanynametmp);
          nlapiSetFieldText('custrecord_liv_rev_bt_customer_orig', btcompanynametmp);
          nlapiSetFieldValue('custrecord_liv_rev_bt_company_name_disp', btcompanynametmp);
          nlapiSetFieldText('custrecord_liv_rev_st_customer', stcustomertmp);
          nlapiSetFieldValue('custrecord_liv_rev_st_company_name', stcompanyname);
          nlapiSetFieldText('custrecord_liv_rev_st_customer_orig', stcustomertmp);
          transformed = 1;
       }           
        if  (stcustomertmp == 'DECM : Lincoln') 
       {
          btcompanynametmp = 'DECM';
          stcustomertmp = 'DECM : Lincoln Industries';
          stcompanyname = 'Lincoln Industries';
          
          //nlapiLogExecution('DEBUG','Transformed BT Company Name Tmp:'+ btcompanynametmp) ;
          //nlapiLogExecution('DEBUG','Transformed BT Company Name Tmp:'+ stcustomertmp) ;
          
          nlapiSetFieldText('custrecord_liv_rev_bt_company_name', btcompanynametmp);
          nlapiSetFieldText('custrecord_liv_rev_bt_customer_orig', btcompanynametmp);
          nlapiSetFieldValue('custrecord_liv_rev_bt_company_name_disp', btcompanynametmp);
          nlapiSetFieldText('custrecord_liv_rev_st_customer', stcustomertmp);
          nlapiSetFieldValue('custrecord_liv_rev_st_company_name', stcompanyname);
          nlapiSetFieldText('custrecord_liv_rev_st_customer_orig', stcustomertmp);
          transformed = 1;
       }           
       
        if  (stcustomertmp == 'ESI : ACME') 
       {
          btcompanynametmp = 'Express Scripts';
          stcustomertmp = 'Express Scripts : ACME';
          stcompanyname = 'ACME';
          
          //nlapiLogExecution('DEBUG','Transformed BT Company Name Tmp:'+ btcompanynametmp) ;
          //nlapiLogExecution('DEBUG','Transformed BT Company Name Tmp:'+ stcustomertmp) ;
          
          nlapiSetFieldText('custrecord_liv_rev_bt_company_name', btcompanynametmp);
          nlapiSetFieldText('custrecord_liv_rev_bt_customer_orig', btcompanynametmp);
          nlapiSetFieldValue('custrecord_liv_rev_bt_company_name_disp', btcompanynametmp);
          nlapiSetFieldText('custrecord_liv_rev_st_customer', stcustomertmp);
          nlapiSetFieldValue('custrecord_liv_rev_st_company_name', stcompanyname);
          nlapiSetFieldText('custrecord_liv_rev_st_customer_orig', stcustomertmp);
          transformed = 1;
       }         
        if  (stcustomertmp == 'ESI : Bimbo Bakeries') 
       {
          btcompanynametmp = 'Express Scripts';
          stcustomertmp = 'Express Scripts : Bimbo Bakeries';
          stcompanyname = 'Bimbo Bakeries';
          
          //nlapiLogExecution('DEBUG','Transformed BT Company Name Tmp:'+ btcompanynametmp) ;
          //nlapiLogExecution('DEBUG','Transformed BT Company Name Tmp:'+ stcustomertmp) ;
          
          nlapiSetFieldText('custrecord_liv_rev_bt_company_name', btcompanynametmp);
          nlapiSetFieldText('custrecord_liv_rev_bt_customer_orig', btcompanynametmp);
          nlapiSetFieldValue('custrecord_liv_rev_bt_company_name_disp', btcompanynametmp);
          nlapiSetFieldText('custrecord_liv_rev_st_customer', stcustomertmp);
          nlapiSetFieldValue('custrecord_liv_rev_st_company_name', stcompanyname);
          nlapiSetFieldText('custrecord_liv_rev_st_customer_orig', stcustomertmp);
          transformed = 1;
       }            
        if  (stcustomertmp == 'ESI : Curtiss-Wright') 
       {
          btcompanynametmp = 'Express Scripts';
          stcustomertmp = 'Express Scripts : Curtiss-Wright';
          stcompanyname = 'Curtiss-Wright';
          
          //nlapiLogExecution('DEBUG','Transformed BT Company Name Tmp:'+ btcompanynametmp) ;
          //nlapiLogExecution('DEBUG','Transformed BT Company Name Tmp:'+ stcustomertmp) ;
          
          nlapiSetFieldText('custrecord_liv_rev_bt_company_name', btcompanynametmp);
          nlapiSetFieldText('custrecord_liv_rev_bt_customer_orig', btcompanynametmp);
          nlapiSetFieldValue('custrecord_liv_rev_bt_company_name_disp', btcompanynametmp);
          nlapiSetFieldText('custrecord_liv_rev_st_customer', stcustomertmp);
          nlapiSetFieldValue('custrecord_liv_rev_st_company_name', stcompanyname);
          nlapiSetFieldText('custrecord_liv_rev_st_customer_orig', stcustomertmp);
          transformed = 1;
       }          
        if  (stcustomertmp == 'ESI : Herman Miller') 
       {
          btcompanynametmp = 'Express Scripts';
          stcustomertmp = 'Express Scripts : Herman Miller, Inc.';
          stcompanyname = 'Herman Miller, Inc.';
          
          //nlapiLogExecution('DEBUG','Transformed BT Company Name Tmp:'+ btcompanynametmp) ;
          //nlapiLogExecution('DEBUG','Transformed BT Company Name Tmp:'+ stcustomertmp) ;
          
          nlapiSetFieldText('custrecord_liv_rev_bt_company_name', btcompanynametmp);
          nlapiSetFieldText('custrecord_liv_rev_bt_customer_orig', btcompanynametmp);
          nlapiSetFieldValue('custrecord_liv_rev_bt_company_name_disp', btcompanynametmp);
          nlapiSetFieldText('custrecord_liv_rev_st_customer', stcustomertmp);
          nlapiSetFieldValue('custrecord_liv_rev_st_company_name', stcompanyname);
          nlapiSetFieldText('custrecord_liv_rev_st_customer_orig', stcustomertmp);
          transformed = 1;
       }         
        if  (stcustomertmp == 'ESI : Insight') 
       {
          btcompanynametmp = 'Express Scripts';
          stcustomertmp = 'Express Scripts : Insight';
          stcompanyname = 'Insight';
          
          //nlapiLogExecution('DEBUG','Transformed BT Company Name Tmp:'+ btcompanynametmp) ;
          //nlapiLogExecution('DEBUG','Transformed BT Company Name Tmp:'+ stcustomertmp) ;
          
          nlapiSetFieldText('custrecord_liv_rev_bt_company_name', btcompanynametmp);
          nlapiSetFieldText('custrecord_liv_rev_bt_customer_orig', btcompanynametmp);
          nlapiSetFieldValue('custrecord_liv_rev_bt_company_name_disp', btcompanynametmp);
          nlapiSetFieldText('custrecord_liv_rev_st_customer', stcustomertmp);
          nlapiSetFieldValue('custrecord_liv_rev_st_company_name', stcompanyname);
          nlapiSetFieldText('custrecord_liv_rev_st_customer_orig', stcustomertmp);
          transformed = 1;
       }          
        if  (stcustomertmp == 'ESI : Intel Corporation') 
       {
          btcompanynametmp = 'Express Scripts';
          stcustomertmp = 'Express Scripts : Intel Corporation';
          stcompanyname = 'Intel Corporation';
          
          //nlapiLogExecution('DEBUG','Transformed BT Company Name Tmp:'+ btcompanynametmp) ;
          //nlapiLogExecution('DEBUG','Transformed BT Company Name Tmp:'+ stcustomertmp) ;
          
          nlapiSetFieldText('custrecord_liv_rev_bt_company_name', btcompanynametmp);
          nlapiSetFieldText('custrecord_liv_rev_bt_customer_orig', btcompanynametmp);
          nlapiSetFieldValue('custrecord_liv_rev_bt_company_name_disp', btcompanynametmp);
          nlapiSetFieldText('custrecord_liv_rev_st_customer', stcustomertmp);
          nlapiSetFieldValue('custrecord_liv_rev_st_company_name', stcompanyname);
          nlapiSetFieldText('custrecord_liv_rev_st_customer_orig', stcustomertmp);
          transformed = 1;
       }          
        if  (stcustomertmp == 'ESI : Intelsat') 
       {
          btcompanynametmp = 'Express Scripts';
          stcustomertmp = 'Express Scripts : Intelsat';
          stcompanyname = 'Intelsat';
          
          //nlapiLogExecution('DEBUG','Transformed BT Company Name Tmp:'+ btcompanynametmp) ;
          //nlapiLogExecution('DEBUG','Transformed BT Company Name Tmp:'+ stcustomertmp) ;
          
          nlapiSetFieldText('custrecord_liv_rev_bt_company_name', btcompanynametmp);
          nlapiSetFieldText('custrecord_liv_rev_bt_customer_orig', btcompanynametmp);
          nlapiSetFieldValue('custrecord_liv_rev_bt_company_name_disp', btcompanynametmp);
          nlapiSetFieldText('custrecord_liv_rev_st_customer', stcustomertmp);
          nlapiSetFieldValue('custrecord_liv_rev_st_company_name', stcompanyname);
          nlapiSetFieldText('custrecord_liv_rev_st_customer_orig', stcustomertmp);
          transformed = 1;
       }   
       
        if  (stcustomertmp == 'ESI : JB Hunt') 
       {
          btcompanynametmp = 'Express Scripts';
          stcustomertmp = 'Express Scripts : JB Hunt';
          stcompanyname = 'JB Hunt';
          
          //nlapiLogExecution('DEBUG','Transformed BT Company Name Tmp:'+ btcompanynametmp) ;
          //nlapiLogExecution('DEBUG','Transformed BT Company Name Tmp:'+ stcustomertmp) ;
          
          nlapiSetFieldText('custrecord_liv_rev_bt_company_name', btcompanynametmp);
          nlapiSetFieldText('custrecord_liv_rev_bt_customer_orig', btcompanynametmp);
          nlapiSetFieldValue('custrecord_liv_rev_bt_company_name_disp', btcompanynametmp);
          nlapiSetFieldText('custrecord_liv_rev_st_customer', stcustomertmp);
          nlapiSetFieldValue('custrecord_liv_rev_st_company_name', stcompanyname);
          nlapiSetFieldText('custrecord_liv_rev_st_customer_orig', stcustomertmp);
          transformed = 1;
       }   
        if  (stcustomertmp == 'ESI : Mosaic Company') 
       {
          btcompanynametmp = 'Express Scripts';
          stcustomertmp = 'Express Scripts : The Mosaic Company';
          stcompanyname = 'The Mosaic Company';
          
          //nlapiLogExecution('DEBUG','Transformed BT Company Name Tmp:'+ btcompanynametmp) ;
          //nlapiLogExecution('DEBUG','Transformed BT Company Name Tmp:'+ stcustomertmp) ;
          
          nlapiSetFieldText('custrecord_liv_rev_bt_company_name', btcompanynametmp);
          nlapiSetFieldText('custrecord_liv_rev_bt_customer_orig', btcompanynametmp);
          nlapiSetFieldValue('custrecord_liv_rev_bt_company_name_disp', btcompanynametmp);
          nlapiSetFieldText('custrecord_liv_rev_st_customer', stcustomertmp);
          nlapiSetFieldValue('custrecord_liv_rev_st_company_name', stcompanyname);
          nlapiSetFieldText('custrecord_liv_rev_st_customer_orig', stcustomertmp);
          transformed = 1;
       }   
        if  (stcustomertmp == 'ESI : Pepsi') 
       {
          btcompanynametmp = 'Express Scripts';
          stcustomertmp = 'Express Scripts : PepsiCo';
          stcompanyname = 'PepsiCo';
          
          //nlapiLogExecution('DEBUG','Transformed BT Company Name Tmp:'+ btcompanynametmp) ;
          //nlapiLogExecution('DEBUG','Transformed BT Company Name Tmp:'+ stcustomertmp) ;
          
          nlapiSetFieldText('custrecord_liv_rev_bt_company_name', btcompanynametmp);
          nlapiSetFieldText('custrecord_liv_rev_bt_customer_orig', btcompanynametmp);
          nlapiSetFieldValue('custrecord_liv_rev_bt_company_name_disp', btcompanynametmp);
          nlapiSetFieldText('custrecord_liv_rev_st_customer', stcustomertmp);
          nlapiSetFieldValue('custrecord_liv_rev_st_company_name', stcompanyname);
          nlapiSetFieldText('custrecord_liv_rev_st_customer_orig', stcustomertmp);
          transformed = 1;
       }   
        if  (stcustomertmp == 'ESI : Rayonier') 
       {
          btcompanynametmp = 'Express Scripts';
          stcustomertmp = 'Express Scripts : Rayonier Advanced Materials';
          stcompanyname = 'Rayonier Advanced Materials';
          
          //nlapiLogExecution('DEBUG','Transformed BT Company Name Tmp:'+ btcompanynametmp) ;
          //nlapiLogExecution('DEBUG','Transformed BT Company Name Tmp:'+ stcustomertmp) ;
          
          nlapiSetFieldText('custrecord_liv_rev_bt_company_name', btcompanynametmp);
          nlapiSetFieldText('custrecord_liv_rev_bt_customer_orig', btcompanynametmp);
          nlapiSetFieldValue('custrecord_liv_rev_bt_company_name_disp', btcompanynametmp);
          nlapiSetFieldText('custrecord_liv_rev_st_customer', stcustomertmp);
          nlapiSetFieldValue('custrecord_liv_rev_st_company_name', stcompanyname);
          nlapiSetFieldText('custrecord_liv_rev_st_customer_orig', stcustomertmp);
          transformed = 1;
       }   
        if  (stcustomertmp == 'ESI : Reynolds') 
       {
          btcompanynametmp = 'Express Scripts';
          stcustomertmp = 'Express Scripts : Reynolds';
          stcompanyname = 'Reynolds';
          
          //nlapiLogExecution('DEBUG','Transformed BT Company Name Tmp:'+ btcompanynametmp) ;
          //nlapiLogExecution('DEBUG','Transformed BT Company Name Tmp:'+ stcustomertmp) ;
          
          nlapiSetFieldText('custrecord_liv_rev_bt_company_name', btcompanynametmp);
          nlapiSetFieldText('custrecord_liv_rev_bt_customer_orig', btcompanynametmp);
          nlapiSetFieldValue('custrecord_liv_rev_bt_company_name_disp', btcompanynametmp);
          nlapiSetFieldText('custrecord_liv_rev_st_customer', stcustomertmp);
          nlapiSetFieldValue('custrecord_liv_rev_st_company_name', stcompanyname);
          nlapiSetFieldText('custrecord_liv_rev_st_customer_orig', stcustomertmp);
          transformed = 1;
       }   
        if  (stcustomertmp == 'ESI : RSM US') 
       {
          btcompanynametmp = 'Express Scripts';
          stcustomertmp = 'Express Scripts : RSM US LLP';
          stcompanyname = 'RSM US LLP';
          
          //nlapiLogExecution('DEBUG','Transformed BT Company Name Tmp:'+ btcompanynametmp) ;
          //nlapiLogExecution('DEBUG','Transformed BT Company Name Tmp:'+ stcustomertmp) ;
          
          nlapiSetFieldText('custrecord_liv_rev_bt_company_name', btcompanynametmp);
          nlapiSetFieldText('custrecord_liv_rev_bt_customer_orig', btcompanynametmp);
          nlapiSetFieldValue('custrecord_liv_rev_bt_company_name_disp', btcompanynametmp);
          nlapiSetFieldText('custrecord_liv_rev_st_customer', stcustomertmp);
          nlapiSetFieldValue('custrecord_liv_rev_st_company_name', stcompanyname);
          nlapiSetFieldText('custrecord_liv_rev_st_customer_orig', stcustomertmp);
          transformed = 1;
       }   
        if  (stcustomertmp == 'ESI : Windstream') 
       {
          btcompanynametmp = 'Express Scripts';
          stcustomertmp = 'Express Scripts : Windstream Communications';
          stcompanyname = 'Windstream Communications';
          
          //nlapiLogExecution('DEBUG','Transformed BT Company Name Tmp:'+ btcompanynametmp) ;
          //nlapiLogExecution('DEBUG','Transformed BT Company Name Tmp:'+ stcustomertmp) ;
          
          nlapiSetFieldText('custrecord_liv_rev_bt_company_name', btcompanynametmp);
          nlapiSetFieldText('custrecord_liv_rev_bt_customer_orig', btcompanynametmp);
          nlapiSetFieldValue('custrecord_liv_rev_bt_company_name_disp', btcompanynametmp);
          nlapiSetFieldText('custrecord_liv_rev_st_customer', stcustomertmp);
          nlapiSetFieldValue('custrecord_liv_rev_st_company_name', stcompanyname);
          nlapiSetFieldText('custrecord_liv_rev_st_customer_orig', stcustomertmp);
          transformed = 1;
       }   
        if  (stcustomertmp == 'HCSC : Fortune Brand') 
       {
          btcompanynametmp = 'HCSC';
          stcustomertmp = 'HCSC : Fortune Brands Home & Security';
          stcompanyname = 'Fortune Brands Home & Security';
          
          //nlapiLogExecution('DEBUG','Transformed BT Company Name Tmp:'+ btcompanynametmp) ;
          //nlapiLogExecution('DEBUG','Transformed BT Company Name Tmp:'+ stcustomertmp) ;
          
          nlapiSetFieldText('custrecord_liv_rev_bt_company_name', btcompanynametmp);
          nlapiSetFieldText('custrecord_liv_rev_bt_customer_orig', btcompanynametmp);
          nlapiSetFieldValue('custrecord_liv_rev_bt_company_name_disp', btcompanynametmp);
          nlapiSetFieldText('custrecord_liv_rev_st_customer', stcustomertmp);
          nlapiSetFieldValue('custrecord_liv_rev_st_company_name', stcompanyname);
          nlapiSetFieldText('custrecord_liv_rev_st_customer_orig', stcustomertmp);
          transformed = 1;
       }   
       
        if  (stcustomertmp == 'HCSC : McLane') 
       {
          btcompanynametmp = 'HCSC';
          stcustomertmp = 'HCSC : McLane Company, Inc.';
          stcompanyname = 'McLane Company, Inc.';
          
          //nlapiLogExecution('DEBUG','Transformed BT Company Name Tmp:'+ btcompanynametmp) ;
          //nlapiLogExecution('DEBUG','Transformed BT Company Name Tmp:'+ stcustomertmp) ;
          
          nlapiSetFieldText('custrecord_liv_rev_bt_company_name', btcompanynametmp);
          nlapiSetFieldText('custrecord_liv_rev_bt_customer_orig', btcompanynametmp);
          nlapiSetFieldValue('custrecord_liv_rev_bt_company_name_disp', btcompanynametmp);
          nlapiSetFieldText('custrecord_liv_rev_st_customer', stcustomertmp);
          nlapiSetFieldValue('custrecord_liv_rev_st_company_name', stcompanyname);
          nlapiSetFieldText('custrecord_liv_rev_st_customer_orig', stcustomertmp);
          transformed = 1;
       }   
       
        if  (stcustomertmp == 'NANA') 
       {
          btcompanynametmp = 'NANA Development Company';
          stcustomertmp = 'NANA Development Company';
          stcompanyname = 'NANA Development Company';
          
          //nlapiLogExecution('DEBUG','Transformed BT Company Name Tmp:'+ btcompanynametmp) ;
          //nlapiLogExecution('DEBUG','Transformed BT Company Name Tmp:'+ stcustomertmp) ;
          
          nlapiSetFieldText('custrecord_liv_rev_bt_company_name', btcompanynametmp);
          nlapiSetFieldText('custrecord_liv_rev_bt_customer_orig', btcompanynametmp);
          nlapiSetFieldValue('custrecord_liv_rev_bt_company_name_disp', btcompanynametmp);
          nlapiSetFieldText('custrecord_liv_rev_st_customer', stcustomertmp);
          nlapiSetFieldValue('custrecord_liv_rev_st_company_name', stcustomertmp);
          nlapiSetFieldText('custrecord_liv_rev_st_customer_orig', stcustomertmp);
          transformed = 1;
       }          
        if  (stcustomertmp == 'Office Depot, Inc.') 
       {
          btcompanynametmp = 'Office Depot';
          stcustomertmp = 'Office Depot';
          stcompanyname = 'Office Depot';
          
          //nlapiLogExecution('DEBUG','Transformed BT Company Name Tmp:'+ btcompanynametmp) ;
          //nlapiLogExecution('DEBUG','Transformed BT Company Name Tmp:'+ stcustomertmp) ;
          
          nlapiSetFieldText('custrecord_liv_rev_bt_company_name', btcompanynametmp);
          nlapiSetFieldText('custrecord_liv_rev_bt_customer_orig', btcompanynametmp);
          nlapiSetFieldValue('custrecord_liv_rev_bt_company_name_disp', btcompanynametmp);
          nlapiSetFieldText('custrecord_liv_rev_st_customer', stcustomertmp);
          nlapiSetFieldValue('custrecord_liv_rev_st_company_name', stcustomertmp);
          nlapiSetFieldText('custrecord_liv_rev_st_customer_orig', stcustomertmp);
          transformed = 1;
       }    
        if  (stcustomertmp == 'St. Joseph') 
       {
          btcompanynametmp = 'St. Joseph Heritage';
          stcustomertmp = 'St. Joseph Heritage';
          stcompanyname = 'St. Joseph Heritage';
          
          //nlapiLogExecution('DEBUG','Transformed BT Company Name Tmp:'+ btcompanynametmp) ;
          //nlapiLogExecution('DEBUG','Transformed BT Company Name Tmp:'+ stcustomertmp) ;
          
          nlapiSetFieldText('custrecord_liv_rev_bt_company_name', btcompanynametmp);
          nlapiSetFieldText('custrecord_liv_rev_bt_customer_orig', btcompanynametmp);
          nlapiSetFieldValue('custrecord_liv_rev_bt_company_name_disp', btcompanynametmp);
          nlapiSetFieldText('custrecord_liv_rev_st_customer', stcustomertmp);
          nlapiSetFieldValue('custrecord_liv_rev_st_company_name', stcustomertmp);
          nlapiSetFieldText('custrecord_liv_rev_st_customer_orig', stcustomertmp);
          transformed = 1;
       }           
        if  (stcustomertmp == 'Tanner') 
       {
          btcompanynametmp = 'Tanner Medical Center';
          stcustomertmp = 'Tanner Medical Center';
          stcompanyname = 'Tanner Medical Center';
          
          //nlapiLogExecution('DEBUG','Transformed BT Company Name Tmp:'+ btcompanynametmp) ;
          //nlapiLogExecution('DEBUG','Transformed BT Company Name Tmp:'+ stcustomertmp) ;
          
          nlapiSetFieldText('custrecord_liv_rev_bt_company_name', btcompanynametmp);
          nlapiSetFieldText('custrecord_liv_rev_bt_customer_orig', btcompanynametmp);
          nlapiSetFieldValue('custrecord_liv_rev_bt_company_name_disp', btcompanynametmp);
          nlapiSetFieldText('custrecord_liv_rev_st_customer', stcustomertmp);
          nlapiSetFieldValue('custrecord_liv_rev_st_company_name', stcustomertmp);
          nlapiSetFieldText('custrecord_liv_rev_st_customer_orig', stcustomertmp);
          transformed = 1;
       }           
       
        if  (stcustomertmp == 'UMASS : UMass Activated') 
       {
          btcompanynametmp = 'UMass Memorial Health System';
          stcustomertmp = 'UMass Memorial Health System : UMass Activated';
          stcompanyname = 'UMass Activated';
          
          //nlapiLogExecution('DEBUG','Transformed BT Company Name Tmp:'+ btcompanynametmp) ;
          //nlapiLogExecution('DEBUG','Transformed BT Company Name Tmp:'+ stcustomertmp) ;
          
          nlapiSetFieldText('custrecord_liv_rev_bt_company_name', btcompanynametmp);
          nlapiSetFieldText('custrecord_liv_rev_bt_customer_orig', btcompanynametmp);
          nlapiSetFieldValue('custrecord_liv_rev_bt_company_name_disp', btcompanynametmp);
          nlapiSetFieldText('custrecord_liv_rev_st_customer', stcustomertmp);
          nlapiSetFieldValue('custrecord_liv_rev_st_company_name', stcompanyname);
          nlapiSetFieldText('custrecord_liv_rev_st_customer_orig', stcustomertmp);
          transformed = 1;
       }   
        if  (stcustomertmp == 'UMASS : UMass Not Activated') 
       {
          btcompanynametmp = 'UMass Memorial Health System';
          stcustomertmp = 'UMass Memorial Health System : UMass Not Activated';
          stcompanyname = 'UMass Not Activated';
          
          //nlapiLogExecution('DEBUG','Transformed BT Company Name Tmp:'+ btcompanynametmp) ;
          //nlapiLogExecution('DEBUG','Transformed BT Company Name Tmp:'+ stcustomertmp) ;
          
          nlapiSetFieldText('custrecord_liv_rev_bt_company_name', btcompanynametmp);
          nlapiSetFieldText('custrecord_liv_rev_bt_customer_orig', btcompanynametmp);
          nlapiSetFieldValue('custrecord_liv_rev_bt_company_name_disp', btcompanynametmp);
          nlapiSetFieldText('custrecord_liv_rev_st_customer', stcustomertmp);
          nlapiSetFieldValue('custrecord_liv_rev_st_company_name', stcompanyname);
          nlapiSetFieldText('custrecord_liv_rev_st_customer_orig', stcustomertmp);
          transformed = 1;
       }              
         if  (stcustomertmp == 'UMASS : Umass Not Activated') 
       {
          btcompanynametmp = 'UMass Memorial Health System';
          stcustomertmp = 'UMass Memorial Health System : UMass Not Activated';
          stcompanyname = 'UMass Not Activated';
          
          //nlapiLogExecution('DEBUG','Transformed BT Company Name Tmp:'+ btcompanynametmp) ;
          //nlapiLogExecution('DEBUG','Transformed BT Company Name Tmp:'+ stcustomertmp) ;
          
          nlapiSetFieldText('custrecord_liv_rev_bt_company_name', btcompanynametmp);
          nlapiSetFieldText('custrecord_liv_rev_bt_customer_orig', btcompanynametmp);
          nlapiSetFieldValue('custrecord_liv_rev_bt_company_name_disp', btcompanynametmp);
          nlapiSetFieldText('custrecord_liv_rev_st_customer', stcustomertmp);
          nlapiSetFieldValue('custrecord_liv_rev_st_company_name', stcompanyname);
          nlapiSetFieldText('custrecord_liv_rev_st_customer_orig', stcustomertmp);
          transformed = 1;
       }              
       if ( (accounttext == '49101 Intercompany Revenue') || (accounttext == '49102 Intercompany Profit (10%)') )
       {
          btcompanynametmp = null;
          stcustomertmp = null;
          
          nlapiSetFieldText('custrecord_liv_rev_bt_company_name', btcompanynametmp);
          nlapiSetFieldText('custrecord_liv_rev_bt_customer_orig', btcompanynametmp);
          nlapiSetFieldValue('custrecord_liv_rev_bt_company_name_disp', btcompanynametmp);
          nlapiSetFieldText('custrecord_liv_rev_st_customer', stcustomertmp);
          nlapiSetFieldValue('custrecord_liv_rev_st_company_name', stcustomertmp);
          nlapiSetFieldText('custrecord_liv_rev_st_customer_orig', stcustomertmp);
          transformed = 1;

       }
       
       nlapiLogExecution('DEBUG','QB name: '+ qbname) ;
        if (qbname == 'UHC : Turner')  
       {
          btcompanynametmp = 'United Healthcare (UHC)';
          stcustomertmp = 'United Healthcare (UHC) : Turner';
          stcompanyname = 'Turner';
          
          //nlapiLogExecution('DEBUG','Transformed BT Company Name Tmp:'+ btcompanynametmp) ;
          //nlapiLogExecution('DEBUG','Transformed BT Company Name Tmp:'+ stcustomertmp) ;
          
          nlapiSetFieldText('custrecord_liv_rev_bt_company_name', btcompanynametmp);
          nlapiSetFieldText('custrecord_liv_rev_bt_customer_orig', btcompanynametmp);
          nlapiSetFieldValue('custrecord_liv_rev_bt_company_name_disp', btcompanynametmp);
          nlapiSetFieldText('custrecord_liv_rev_st_customer', stcustomertmp);
          nlapiSetFieldValue('custrecord_liv_rev_st_company_name', stcompanyname);
          nlapiSetFieldText('custrecord_liv_rev_st_customer_orig', stcustomertmp);
          transformed = 1;
       }
        if (qbname == 'Aria')  
       {
          btcompanynametmp = 'Jefferson';
          stcustomertmp = 'Aria Health';
          stcompanyname = 'Aria Health';
          
          //nlapiLogExecution('DEBUG','Transformed BT Company Name Tmp:'+ btcompanynametmp) ;
          //nlapiLogExecution('DEBUG','Transformed BT Company Name Tmp:'+ stcustomertmp) ;
          
          nlapiSetFieldText('custrecord_liv_rev_bt_company_name', btcompanynametmp);
          nlapiSetFieldText('custrecord_liv_rev_bt_customer_orig', btcompanynametmp);
          nlapiSetFieldValue('custrecord_liv_rev_bt_company_name_disp', btcompanynametmp);
          nlapiSetFieldText('custrecord_liv_rev_st_customer', stcustomertmp);
          nlapiSetFieldValue('custrecord_liv_rev_st_company_name', stcustomertmp);
          nlapiSetFieldValue('custrecord_liv_rev_st_state', 'PA');  //legacy quickbooks.  Confirmed in QB, the state is PA for Aria.
          nlapiSetFieldText('custrecord_liv_rev_st_customer_orig', stcustomertmp);
          transformed = 1;
       }
        if  (qbname == 'Sitel Direct') 
       {
          btcompanynametmp = 'Sitel';
          stcustomertmp = 'Sitel';
          stcompanyname = 'Sitel';
          
          //nlapiLogExecution('DEBUG','Transformed BT Company Name Tmp:'+ btcompanynametmp) ;
          //nlapiLogExecution('DEBUG','Transformed BT Company Name Tmp:'+ stcustomertmp) ;
          
          nlapiSetFieldText('custrecord_liv_rev_bt_company_name', btcompanynametmp);
          nlapiSetFieldText('custrecord_liv_rev_bt_customer_orig', btcompanynametmp);
          nlapiSetFieldValue('custrecord_liv_rev_bt_company_name_disp', btcompanynametmp);
          nlapiSetFieldText('custrecord_liv_rev_st_customer', stcustomertmp);
          nlapiSetFieldValue('custrecord_liv_rev_st_company_name', stcustomertmp);
          nlapiSetFieldText('custrecord_liv_rev_st_customer_orig', stcustomertmp);
          transformed = 1;
       }       
       

       
       if (transformed == 0)
       {
          nlapiSetFieldText('custrecord_liv_rev_bt_company_name', btcompanynametmp);
          nlapiSetFieldText('custrecord_liv_rev_bt_customer_orig', btcompanynametmp);
          nlapiSetFieldValue('custrecord_liv_rev_bt_company_name_disp', btcompanynametmp);
          nlapiSetFieldText('custrecord_liv_rev_st_customer', stcustomertmp);
          nlapiSetFieldValue('custrecord_liv_rev_st_company_name', stcompanyname);
          nlapiSetFieldText('custrecord_liv_rev_st_customer_orig', stcustomertmp);
       }
       
  // Search for Contracts

      if (nvl(stcustomertmp,0) != 0)
      { 
       nlapiLogExecution('DEBUG','Search Contracts') ;
       
       var arrFilter = new Array(); 
 
       nlapiLogExecution('DEBUG','Client code:'+ nvl(clientcode,0)) ;
       nlapiLogExecution('DEBUG','ST Customer tmp:'+ nvl(stcustomertmp,0)) ;
       
       var str = nvl(clientcode,'0').search(",");
        nlapiLogExecution('DEBUG','str: '+ str) ;
       
       if (nvl(clientcode,0) != 0 && str == -1)
       {
            nlapiLogExecution('DEBUG','before getPromoCodeID') ;
           var clientcodeid = getPromoCodeId(clientcode) ;

          //  nlapiLogExecution('DEBUG','Search Criteria clientcodeid'+ clientcodeid) ;

            arrFilter[0] = new nlobjSearchFilter('custrecord_liv_cm_client_code', null, 'anyof',  [clientcodeid] );
            arrFilter[1] = new nlobjSearchFilter('custrecord_liv_cm_contract_status', null, 'isnot',  'Terminated' );
            arrFilter[2] = new nlobjSearchFilter('custrecord_liv_cm_client_code', null, 'noneof',  245 ); //PENDING
            
          //  arrFilter[2] = new nlobjSearchFilter('custrecord_liv_cm_client_code', null, 'noneof',  231 ); //PARENT
          //  arrFilter[3] = new nlobjSearchFilter('custrecord_liv_cm_client_code', null, 'noneof',  245 ); //PENDING
        }
        else
        {
           nlapiLogExecution('DEBUG','Search Criteria stcustomertmp'+ stcustomertmp) ;
            
            arrFilter[0] = new nlobjSearchFilter('formulatext', null, 'is', stcustomertmp);
            arrFilter[0].setFormula('{custrecord_liv_cm_sold_to_customer}');
            arrFilter[1] = new nlobjSearchFilter('custrecord_liv_cm_contract_status', null, 'isnot',  'Terminated' );
            arrFilter[2] = new nlobjSearchFilter('formulatext', null, 'isnotempty', null);
            arrFilter[2].setFormula('{custrecord_liv_cm_client_code}');
            arrFilter[3] = new nlobjSearchFilter('custrecord_liv_cm_client_code', null, 'noneof',  245 ); //PENDING
            
            
            //arrFilter[2] = new nlobjSearchFilter('custrecord_liv_cm_client_code', null, 'isnotempty',  null ); //PARENT
            arrFilter[3] = new nlobjSearchFilter('custrecord_liv_cm_client_code', null, 'noneof',  245 ); //PENDING

        }
 


       var arrResult = nlapiSearchRecord('customrecord_liv_contracts','customsearch_liv_contracts', arrFilter, null);
       
       

        if(arrResult)
        {
          for (var i = 0;  i < arrResult.length; i++)
           {
           
               var results=arrResult[i];
               var columns=results.getAllColumns();  
               var contractid = (results.getValue('internalId'));

               var cclientcode        = results.getText(columns[3]);
               var ccontractnumber    = results.getValue(columns[4]);
               var adminfee          = results.getValue(columns[18]);
               var cpricingmodeltext      = results.getText(columns[25]);
               var partner           = results.getValue(columns[27]);
               var htnadminfee       = results.getValue(columns[40]);
               var partnerfee          = results.getValue(columns[76]);
               var bundleadminfee    = results.getValue(columns[80]);
               var claunchdate         = results.getValue(columns[81]);
               
           //    nlapiLogExecution('DEBUG','Contract Client code '+ cclientcode) ;
               
                if (arrResult.length > 1)
               {
                  nlapiSetFieldValue('custrecord_liv_rev_cont_lkp_exceptions', 'Multiple contract records found');
              //    nlapiLogExecution('DEBUG','Multiple Contract ID'+ contractid) ;
               }
               
               if (nvl(clientcode,0) == 0)
               {
                   nlapiSetFieldValue('custrecord_liv_rev_client_code', cclientcode);
               }
               if (nvl(contractnumber,0) == 0)
               {
                   nlapiSetFieldValue('custrecord_liv_rev_st_contract_number', ccontractnumber);
               }
               //nlapiLogExecution('DEBUG','Launch Date'+ claunchdate) ;
               
               
               nlapiSetFieldValue('custrecord_liv_rev_st_contract_launch_dt', claunchdate);
               nlapiSetFieldValue('custrecord_liv_rev_st_pricing_model', cpricingmodeltext);
               nlapiSetFieldValue('custrecord_liv_rev_partner', partner);
               nlapiSetFieldValue('custrecord_liv_rev_partner_fee', partnerfee);
               nlapiSetFieldValue('custrecord_liv_rev_admin_fee', adminfee);
               nlapiSetFieldValue('custrecord_liv_rev_htn_admin_fee', htnadminfee);
               nlapiSetFieldValue('custrecord_liv_rev_bundle_admin_fee', bundleadminfee);
               
            } //end for
               
        } //end if   
       } //end (nvl(stcustomertmp,0) != 0)
       
    /* Search for bill to customer */
    
    if (nvl(btcompanynametmp,0) != 0)
    {
       nlapiLogExecution('DEBUG','Search Bill To Customer') ;
       var arrFilter = new Array(); 
    
       arrFilter[0] = new nlobjSearchFilter('formulatext', null, 'is', btcompanynametmp);
       arrFilter[0].setFormula('{parent}');
       
	    //Define search columns
	
	    var arrColumns = new Array();
	
		arrColumns.push(new nlobjSearchColumn('parent'));
		arrColumns.push(new nlobjSearchColumn('companyname'));
		arrColumns.push(new nlobjSearchColumn('custentity_liv_billing_partner_flag'));
	    arrColumns.push(new nlobjSearchColumn('custentity_celigo_sfnc_salesforce_id'));
	    arrColumns.push(new nlobjSearchColumn('custentity_liv_manual_salesforce_id'));

	   
	    //Execute search
	    
		var arrResult = nlapiSearchRecord('customer', null, arrFilter, arrColumns);
		
      if(arrResult) 
        {
           
           var current_rec = arrResult[0];
           var rec_id = current_rec.getId();
           var billingpartner = current_rec.getValue('custentity_liv_billing_partner_flag');
           var btsalesforceid = current_rec.getValue('custentity_celigo_sfnc_salesforce_id');
           var manualsalesforceid = current_rec.getValue('custentity_liv_manual_salesforce_id');
           var companyname = current_rec.getValue('companyname');
           var parent = current_rec.getValue('parent');
           nlapiLogExecution('DEBUG','BT Salesforce ID '+ btsalesforceid) ;
           nlapiLogExecution('DEBUG','Manual Salesforce ID '+ manualsalesforceid) ;
           nlapiLogExecution('DEBUG','nvl(btsalesforceid, manualsalesforceid)'+nvl(btsalesforceid, manualsalesforceid)) ;
           
           if ( nvl(btsalesforceid,0) == 0)
           {
               btsalesforceid = manualsalesforceid;
            }
           
           nlapiSetFieldValue('custrecord_liv_rev_billing_partner', billingpartner);
           nlapiSetFieldValue('custrecord_liv_rev_bt_sf_account_id', btsalesforceid);
           

           
            // nlapiLogExecution('DEBUG','Billing Partner Flag '+ billingpartner) ;
            // nlapiLogExecution('DEBUG','Parent '+ parent) ;
            // nlapiLogExecution('DEBUG','Company Name '+ companyname) ;
        }   
      }  
        
    /* Search for sold to customer */
    
    if (nvl(stcompanyname,0) !=0 )
    {
       
       nlapiLogExecution('DEBUG','Search Sold To Customer') ;
       var arrFilter = new Array(); 
        nlapiLogExecution('DEBUG','ST Company Name '+ stcompanyname) ;
       arrFilter[0] = new nlobjSearchFilter('formulatext', null, 'is', stcompanyname);
       arrFilter[0].setFormula('{companyname}');
       
	    //Define search columns
	
	    var arrColumns = new Array();
	
		arrColumns.push(new nlobjSearchColumn('parent'));
		arrColumns.push(new nlobjSearchColumn('companyname'));
	    arrColumns.push(new nlobjSearchColumn('custentity_celigo_sfnc_salesforce_id'));
	    arrColumns.push(new nlobjSearchColumn('custentity_liv_manual_salesforce_id'));

	   
	    //Execute search
	    
		var arrResult = nlapiSearchRecord('customer', null, arrFilter, arrColumns);
		
      if(arrResult) 
        {
           
           var current_rec = arrResult[0];
           var rec_id = current_rec.getId();
     
           var stsalesforceid = current_rec.getValue('custentity_celigo_sfnc_salesforce_id');
           var manualsalesforceid = current_rec.getValue('custentity_liv_manual_salesforce_id');
           var companyname = current_rec.getValue('companyname');
           var parent = current_rec.getValue('parent');
           
           if ( nvl(stsalesforceid,0) == 0)
           {
               stsalesforceid = manualsalesforceid;
            }

           nlapiSetFieldValue('custrecord_liv_rev_st_sf_account_id', stsalesforceid);
           
           nlapiLogExecution('DEBUG','ST Salesforce ID '+ stsalesforceid) ;
           nlapiLogExecution('DEBUG','Parent '+ parent) ;
           nlapiLogExecution('DEBUG','Company Name '+ companyname) ;
        }   
      }  

  } //end if
    
} // end function beforeSumit


function getPromoCodeId(pccode) //get internal id for Multi-Select custom list
{
     var col = new Array();
     var arrFilter = new Array(); 
   
 //    nlapiLogExecution('DEBUG', 'ACTIVITY', 'Search Custom List');
 //    nlapiLogExecution('DEBUG','Custom List PCCode value:'+ pccode) ;
     
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

   

   