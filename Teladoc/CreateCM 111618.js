//last update date: 111618 - NS-236 - Billing Summary V2

function CreateCM()
{
 try
 {
  //Search custom billing summary
  
  var arrFilter = new Array(); 
  var arrColumns = new Array(); 
  
  arrFilter[0] = new nlobjSearchFilter('custrecord_bs2_ns_cm_internal_id', null, 'isempty',  'null' ); 
  arrFilter[1] = new nlobjSearchFilter('custrecord_bs2_billable', null, 'is',  'T' ); 
  arrFilter[2] = new nlobjSearchFilter('custrecord_bs2_ns_create_cm_fee', null, 'is',  'T' ); 
  
  
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
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_early_term_1mon'));
 // arrColumns.push(new nlobjSearchColumn('custrecord_liv_bs_early_term_2mon'));
 // arrColumns.push(new nlobjSearchColumn('custrecord_liv_bs_early_term_3mon'));
 // arrColumns.push(new nlobjSearchColumn('custrecord_liv_bs_early_term_4mon'));
 // arrColumns.push(new nlobjSearchColumn('custrecord_liv_bs_early_term_5mon'));
 // arrColumns.push(new nlobjSearchColumn('custrecord_liv_bs_early_term_6mon'));
 // arrColumns.push(new nlobjSearchColumn('custrecord_liv_bs_early_term_7mon'));
 // arrColumns.push(new nlobjSearchColumn('custrecord_liv_bs_early_term_8mon'));
 // arrColumns.push(new nlobjSearchColumn('custrecord_liv_bs_early_term_9mon'));
 // arrColumns.push(new nlobjSearchColumn('custrecord_liv_bs_early_term_10mon'));
 // arrColumns.push(new nlobjSearchColumn('custrecord_liv_bs_early_term_11mon'));
 // arrColumns.push(new nlobjSearchColumn('custrecord_liv_bs_early_term_12mon'));
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
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_ns_cm_customer'));
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_ns_subsidiary'));  
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_ns_currency'));    
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_contract_number')); 
  arrColumns.push(new nlobjSearchColumn('custrecord_bs2_contract_id')); 
  



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
                 invoiceid = createCMRec(customrecord, editinvoice, null, firstline) ;        
                 previousinvoiceid = invoiceid ;   
             }
             else
             {
                if (currentinvoice == previousinvoice)
                {
                // Find created invoice number and flag edit invoice
   
                   firstline = false;
                   editinvoice = true ;
                   
                   invoiceid = createCMRec(customrecord,editinvoice, previousinvoiceid,firstline) ; 
                   previousinvoiceid = invoiceid ;     
                   
                   editinvoice = false;    
                
                }
                else
                {
  
                  // create for next invoice
                   previousinvoice = currentinvoice;
                   firstline = true;
                   invoiceid = createCMRec(customrecord, editinvoice, null, firstline) ; 
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
		   throw nlapiCreateError('Create Credit Memo','',recordid,error.getCode(), error.toString());
	   }
	   else 
	   {    	
			nlapiLogExecution('DEBUG', 'Unexpected Error for Billing Summary Internal ID : '+recordid, error.toString());
			throw nlapiCreateError('Create Credit Memo ','',+recordid,'Undefined Error Code', error.toString());
	   }
  }
} // end function CreateCM

function createCMRec(customrecord, editinvoice, previousinvoiceid, firstline)
/********************************************************************************************/
/*** Purpose: Create Invoice Record function                                              ***/
/********************************************************************************************/
{
	nlapiLogExecution('DEBUG', 'ACTIVITY', 'createCMRec Started...');
	    
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
        var cmcustomerid = customrecord.getValue('custrecord_bs2_ns_cm_customer');
        var subsidiary = customrecord.getValue('custrecord_bs2_ns_subsidiary');   
        var currency = customrecord.getValue('custrecord_bs2_ns_currency');     
        var contractnumber = customrecord.getValue('custrecord_bs2_contract_number');
        var contractid = customrecord.getValue('custrecord_bs2_contract_id');  
        
       

              
        // Referral Fee
        var billing_date = customrecord.getValue('custrecord_bs2_date');
        var billingmth =  convertdate(billing_date, 'MMDDYY'); 
        
        var referralitem = customrecord.getValue('custrecord_bs2_ns_referral_fee_item'); 
        var referraldesc = customrecord.getValue('custrecord_bs2_ns_referral_fee_desc'); 
        var referralrate = customrecord.getValue('custrecord_bs2_ns_referral_fee');
        var clientcode = customrecord.getValue('custrecord_bs2_grouping');
        
        referraldesc = referraldesc +' '+ billingmth + ' - '+ clientcode;
    
        
        if (nvl(ovractivemembers,0) > 0 )
        {
           var referralqty = nvl(ovractivemembers,0) - nvl(discactivemembers,0) ;
        }
        
        if (nvl(ovractivemembers,0) == 0 )   
        {
           var referralqty = nvl(activemembers,0) - nvl(discactivemembers,0) ;
        }
   

        if (editinvoice == false)
        {
	       var record = nlapiCreateRecord('creditmemo', {recordmode:'dynamic'});
	       nlapiLogExecution('DEBUG', 'VALUE', 'Total Billing Amt: '+ totalbillingamt);
	    }
	    else
	    {
	        var record = nlapiLoadRecord('invoice', previousinvoiceid) ;
	    }
	    
	    
		try
		{
		
		 if (nvl(referralqty,0) > 0)
	     {  
	        // Set Field Value for CM Header
	        nlapiLogExecution('DEBUG', 'VALUE', 'Inside Total Billing Amt: '+ totalbillingamt);
	        
	        if ((firstline == true) && (editinvoice == false))
	        {
	            nlapiLogExecution('DEBUG', 'VALUE', 'Inside Firstline : '+ firstline);
	        
	            record.setFieldValue('tranid', invoicenum+'CM ('+clientcode+')');
	            record.setFieldValue('externalid', invoicenum+'CM'+clientcode);
	            record.setFieldValue('trandate', formatDate(trxdate));
	            record.setFieldValue('entity', cmcustomerid); 
	            record.setFieldValue('otherrefnum',po);
	            record.setFieldValue('subsidiary',subsidiary);  //ns-62
	            record.setFieldValue('department',25);
	            record.setFieldValue('custbody_liv_so_contract_number',contractnumber);
 	            record.setFieldValue('custbody_liv_contract_id',contractid);
 	            
 	           // record.setFieldValue('currency',currency);      //ns-62
	           
	        }
	        
	         // Referral Item
            if (nvl(referralqty,0) > 0 && referralrate > 0 )
            {
                
                record.selectNewLineItem('item');
	            record.setCurrentLineItemValue('item','item',referralitem); 
                record.setCurrentLineItemValue('item', 'description', referraldesc);
                record.setCurrentLineItemValue('item', 'quantity', referralqty);
                record.setCurrentLineItemText('item', 'price', 'Custom'); 
                record.setCurrentLineItemValue('item', 'rate', referralrate);
                record.setCurrentLineItemText('item', 'custcol_liv_invoice_client_code', clientcode); // NS-140
                record.commitLineItem('item'); 
            }
            
	    
            var strRecID = nlapiSubmitRecord(record, true, true);
                
            nlapiLogExecution('DEBUG', 'ACTIVITY', 'create CM Ended Sucessfully');
	
            nlapiLogExecution('DEBUG', 'VALUE', 'strRecID : '+strRecID);
          
            // return response with internal id
            if (strRecID)
            {
                var currentrecord = nlapiLoadRecord('customrecord_liv_billing_summary_v2',recordid, {recordmode: 'dynamic'});
                currentrecord.setFieldValue('custrecord_bs2_ns_cm_internal_id', strRecID);
                currentrecord.setFieldValue('custrecord_bs2_ns_cm_creation_date', today);
                currentrecord.setFieldValue('custrecord_bs2_ns_cm_error_msg', ' ');
                var strCustomID = nlapiSubmitRecord(currentrecord, true, true);
                nlapiLogExecution('DEBUG', 'VALUE', 'strCustomID : '+strCustomID);
                
            }
     
       
         } //nvl(totalbillingamt,0) > 0)
         else
         {
                var currentrecord = nlapiLoadRecord('customrecord_liv_billing_summary_v2',recordid, {recordmode: 'dynamic'});
                currentrecord.setFieldValue('custrecord_bs2_ns_error_msg', 'Total Credit Amount is zero. CM not created.');
                var strCustomID = nlapiSubmitRecord(currentrecord, true, true);
         
         }
	          
			
		}catch(error)
		{
						if (error.getDetails != undefined) 
					   {
							nlapiLogExecution('DEBUG', 'CM creation error for billing summary internal id: '+recordid, error.getCode() + ': ' + error.getDetails());
							 var currentrecord = nlapiLoadRecord('customrecord_liv_billing_summary_v2',recordid, {recordmode: 'dynamic'});
                             currentrecord.setFieldValue('custrecord_bs2_ns_cm_error_msg', error.getCode() + ': ' + error.getDetails());
                             nlapiSubmitRecord(currentrecord, true, true);
					   }
					   else 
					   {    
							nlapiLogExecution('DEBUG', 'Unexpected CM creation error for billing summary internal id : '+recordid, error.toString());
							 var currentrecord = nlapiLoadRecord('customrecord_liv_billing_summary_v2',recordid, {recordmode: 'dynamic'});
                             currentrecord.setFieldValue('custrecord_bs2_ns_cm_error_msg', error.toString());
                             nlapiSubmitRecord(currentrecord, true, true);
					   }
		}

        return (strRecID) ;
        
        
	nlapiLogExecution('DEBUG', 'VALUE', 'Usage: '+nlapiGetContext().getRemainingUsage());
	nlapiLogExecution('DEBUG', 'ACTIVITY', 'createCMRec Ended Sucessfully');
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



