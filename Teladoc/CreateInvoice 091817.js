//last update date: 07/12/17
//last update date: 07/31/17 - .setSort on Grouping field
//last update date: 091817 - add payment terms to invoice
//last update date: 091817 - add Create CM for Fees

function CreateInvoice()
{
 try
 {
  //Search custom billing summary
  
  var arrFilter = new Array(); 
  var arrColumns = new Array(); 
  
  arrFilter[0] = new nlobjSearchFilter('custrecord_liv_bs_ns_internal_id', null, 'isempty',  'null' ); 
  arrFilter[1] = new nlobjSearchFilter('custrecord_liv_bs_ns_billable', null, 'is',  'T' ); 
  
  
  //Define search columns

  arrColumns.push(new nlobjSearchColumn('internalid'));
  arrColumns.push(new nlobjSearchColumn('custrecord_liv_bs_ns_billable'));
  arrColumns.push(new nlobjSearchColumn('custrecord_liv_bs_ns_customer').setSort(false));
  arrColumns.push(new nlobjSearchColumn('custrecord_liv_bs_ns_invoice_number').setSort(false));
  arrColumns.push(new nlobjSearchColumn('custrecord_liv_bs_client_code').setSort(false));  
  arrColumns.push(new nlobjSearchColumn('custrecord_liv_bs_grouping').setSort(false)); 
  arrColumns.push(new nlobjSearchColumn('custrecord_liv_bs_ns_current_po'));
  arrColumns.push(new nlobjSearchColumn('custrecord_liv_bs_ns_category'));
  arrColumns.push(new nlobjSearchColumn('custrecord_liv_bs_date'));
  arrColumns.push(new nlobjSearchColumn('custrecord_liv_bs_active_members_qty'));
  arrColumns.push(new nlobjSearchColumn('custrecord_liv_bs_ns_members_disc_qty'));
  arrColumns.push(new nlobjSearchColumn('custrecord_liv_bs_upfront_meter_qty'));
  arrColumns.push(new nlobjSearchColumn('custrecord_liv_bs_repl_meter_qty'));
  arrColumns.push(new nlobjSearchColumn('custrecord_liv_bs_lapsed_members_qty')); 
  arrColumns.push(new nlobjSearchColumn('custrecord_liv_bs_ns_min_participation'));
  arrColumns.push(new nlobjSearchColumn('custrecord_liv_bs_early_term_total'));
  arrColumns.push(new nlobjSearchColumn('custrecord_liv_bs_early_term_1mon'));
  arrColumns.push(new nlobjSearchColumn('custrecord_liv_bs_early_term_2mon'));
  arrColumns.push(new nlobjSearchColumn('custrecord_liv_bs_early_term_3mon'));
  arrColumns.push(new nlobjSearchColumn('custrecord_liv_bs_early_term_4mon'));
  arrColumns.push(new nlobjSearchColumn('custrecord_liv_bs_early_term_5mon'));
  arrColumns.push(new nlobjSearchColumn('custrecord_liv_bs_early_term_6mon'));
  arrColumns.push(new nlobjSearchColumn('custrecord_liv_bs_early_term_7mon'));
  arrColumns.push(new nlobjSearchColumn('custrecord_liv_bs_early_term_8mon'));
  arrColumns.push(new nlobjSearchColumn('custrecord_liv_bs_early_term_9mon'));
  arrColumns.push(new nlobjSearchColumn('custrecord_liv_bs_early_term_10mon'));
  arrColumns.push(new nlobjSearchColumn('custrecord_liv_bs_early_term_11mon'));
  arrColumns.push(new nlobjSearchColumn('custrecord_liv_bs_early_term_12mon'));
  arrColumns.push(new nlobjSearchColumn('custrecord_liv_bs_ns_ovr_active_members'));
  arrColumns.push(new nlobjSearchColumn('custrecord_liv_bs_ns_ovr_upfront_meter'));
  arrColumns.push(new nlobjSearchColumn('custrecord_liv_bs_ns_ovr_repl_meter'));
  arrColumns.push(new nlobjSearchColumn('custrecord_liv_bs_ns_ovr_lapsed_members'));
  arrColumns.push(new nlobjSearchColumn('custrecord_liv_bs_ns_program_item'));
  arrColumns.push(new nlobjSearchColumn('custrecord_liv_bs_ns_program_desc'));
  arrColumns.push(new nlobjSearchColumn('custrecord_liv_bs_ns_pppm_price'));
  arrColumns.push(new nlobjSearchColumn('custrecord_liv_bs_ns_program_amt'));
  arrColumns.push(new nlobjSearchColumn('custrecord_liv_bs_ns_upfront_item'));
  arrColumns.push(new nlobjSearchColumn('custrecord_liv_bs_ns_upfront_desc'));
  arrColumns.push(new nlobjSearchColumn('custrecord_liv_bs_ns_upfront_price'));
  arrColumns.push(new nlobjSearchColumn('custrecord_liv_bs_ns_upfront_amt'));
  arrColumns.push(new nlobjSearchColumn('custrecord_liv_bs_ns_replacement_item'));
  arrColumns.push(new nlobjSearchColumn('custrecord_liv_bs_ns_repl_desc'));
  arrColumns.push(new nlobjSearchColumn('custrecord_liv_bs_ns_replace_price'));
  arrColumns.push(new nlobjSearchColumn('custrecord_liv_bs_ns_replacement_amt'));
  arrColumns.push(new nlobjSearchColumn('custrecord_liv_bs_ns_termination_item'));
  arrColumns.push(new nlobjSearchColumn('custrecord_liv_bs_ns_termination_desc'));
  arrColumns.push(new nlobjSearchColumn('custrecord_liv_bs_ns_termination_price'));
  arrColumns.push(new nlobjSearchColumn('custrecord_liv_bs_ns_termination_amt'));
  arrColumns.push(new nlobjSearchColumn('custrecord_liv_bs_ns_referral_fee_item'));
  arrColumns.push(new nlobjSearchColumn('custrecord_liv_bs_ns_referral_fee_desc'));
  arrColumns.push(new nlobjSearchColumn('custrecord_liv_bs_ns_referral_fee'));
  arrColumns.push(new nlobjSearchColumn('custrecord_liv_bs_ns_referral_fee_amt'));
  arrColumns.push(new nlobjSearchColumn('custrecord_liv_bs_ns_show_lapsed_users'));
  arrColumns.push(new nlobjSearchColumn('custrecord_liv_bs_ns_lapsed_users_item'));
  arrColumns.push(new nlobjSearchColumn('custrecord_liv_bs_ns_lapsed_users_desc'));
  arrColumns.push(new nlobjSearchColumn('custrecord_liv_bs_ns_total_billing_amt'));
  arrColumns.push(new nlobjSearchColumn('custrecord_liv_bs_ns_billing_inactive'));
  arrColumns.push(new nlobjSearchColumn('custrecord_liv_bs_ns_payment_term'));
  arrColumns.push(new nlobjSearchColumn('custrecord_liv_bs_ns_create_cm_fee'));


  var previousinvoice = null ;
  var firstline = false ;
  var editinvoice = false;
  var recordid = 0;
  var invoiceid = 0;
  var previousinvoiceid = 0;
  
  var arrResult = nlapiSearchRecord('customrecord_liv_billing_summary', null, arrFilter, arrColumns);

  if(arrResult)
  {
    for (var i = 0;  i < arrResult.length; i++)

      {
             var customrecord = arrResult[i];
             currentinvoice = customrecord.getValue('custrecord_liv_bs_ns_invoice_number');
             recordid = customrecord.getValue('internalid');
            
             
             if (i == 0) //first record
             {
                 previousinvoice = customrecord.getValue('custrecord_liv_bs_ns_invoice_number');
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
	    var customerid = customrecord.getValue('custrecord_liv_bs_ns_customer');
	    var invoicenum = customrecord.getValue('custrecord_liv_bs_ns_invoice_number');
        var trxdate = customrecord.getValue('custrecord_liv_bs_date'); 
        var showlapsed = customrecord.getValue('custrecord_liv_bs_ns_show_lapsed_users');
        var po = customrecord.getValue('custrecord_liv_bs_ns_current_po'); 
        var category = customrecord.getText('custrecord_liv_bs_ns_category');
        var activemembers = customrecord.getValue('custrecord_liv_bs_active_members_qty');
        var discactivemembers = customrecord.getValue('custrecord_liv_bs_ns_members_disc_qty'); 
        var upfrontmeters = customrecord.getValue('custrecord_liv_bs_upfront_meter_qty') ;
        var replmeters = customrecord.getValue('custrecord_liv_bs_repl_meter_qty') ;
        var lapsedmembers = customrecord.getValue('custrecord_liv_bs_lapsed_members_qty') ;
        var earlytermtotal = customrecord.getValue('custrecord_liv_bs_early_term_total') ;
        var ovractivemembers = customrecord.getValue('custrecord_liv_bs_ns_ovr_active_members');
        var ovrupfrontmeters = customrecord.getValue('custrecord_liv_bs_ns_ovr_upfront_meter');
        var ovrreplmeters = customrecord.getValue('custrecord_liv_bs_ns_ovr_repl_meter');
        var ovrlapsedmembers = customrecord.getValue('custrecord_liv_bs_ns_ovr_lapsed_members');
        var totalbillingamt = customrecord.getValue('custrecord_liv_bs_ns_total_billing_amt');
        var terms = customrecord.getValue('custrecord_liv_bs_ns_payment_term');
        var createcmfee = customrecord.getValue('custrecord_liv_bs_ns_create_cm_fee');
       

        
        // Program Item
        var progitem = customrecord.getValue('custrecord_liv_bs_ns_program_item'); 
        var progdesc = customrecord.getValue('custrecord_liv_bs_ns_program_desc'); 
        
        if (nvl(ovractivemembers,0) > 0 )
        {
           var progqty = nvl(ovractivemembers,0) - nvl(discactivemembers,0) ;
        }
        
        if (nvl(ovractivemembers,0) == 0 )   
        {
           var progqty = nvl(activemembers,0) - nvl(discactivemembers,0) ;
        }
      
        // Replacement Meter
        var replitem = customrecord.getValue('custrecord_liv_bs_ns_replacement_item'); 
        var repldesc = customrecord.getValue('custrecord_liv_bs_ns_repl_desc'); 
        
        if (nvl(ovrreplmeters,0) > 0 )
        {
           var replqty = nvl(ovrreplmeters,0)  ;
        }
        
        if (nvl(ovrreplmeters,0) == 0 )   
        {
           var replqty = nvl(replmeters,0)  ;
        }
        
              
        // Referral Fee
        var referralitem = customrecord.getValue('custrecord_liv_bs_ns_referral_fee_item'); 
        var referraldesc = customrecord.getValue('custrecord_liv_bs_ns_referral_fee_desc'); 
        var referralrate = customrecord.getValue('custrecord_liv_bs_ns_referral_fee');
        
        if (nvl(ovractivemembers,0) > 0 )
        {
           var referralqty = nvl(ovractivemembers,0) - nvl(discactivemembers,0) ;
        }
        
        if (nvl(ovractivemembers,0) == 0 )   
        {
           var referralqty = nvl(activemembers,0) - nvl(discactivemembers,0) ;
        }
   
        // Lapsed 
   	       var lapseditem = customrecord.getValue('custrecord_liv_bs_ns_lapsed_users_item'); 
           var lapseddesc = customrecord.getValue('custrecord_liv_bs_ns_lapsed_users_desc'); 
   
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
	        
	            record.setFieldValue('tranid', invoicenum);
	            record.setFieldValue('externalid', invoicenum);
	            record.setFieldValue('trandate', formatDate(trxdate));
	            record.setFieldValue('entity', customerid); 
	            record.setFieldValue('otherrefnum',po);
	            record.setFieldValue('terms', terms) ;
	        }
	        
	        
	        // Program Item
            if (nvl(progqty,0) > 0)
            {
               record.selectNewLineItem('item');
	           record.setCurrentLineItemValue('item','item',progitem); 
               record.setCurrentLineItemValue('item', 'description', progdesc);
               record.setCurrentLineItemValue('item', 'quantity', progqty);
               record.commitLineItem('item'); 
            }
            
            // Replacement Item
            if (nvl(replqty,0) > 0)
            {
                record.selectNewLineItem('item');
	            record.setCurrentLineItemValue('item','item',replitem); 
                record.setCurrentLineItemValue('item', 'description', repldesc);
                record.setCurrentLineItemValue('item', 'quantity', replqty);
                record.commitLineItem('item'); 
            }
            
          
	        
	        if (category == 'Bundled')
	        {
	          // Termination
	          nlapiLogExecution('DEBUG', 'VALUE', 'Inside Bundled Category: '+category);
	          
	           var termitem = customrecord.getValue('custrecord_liv_bs_ns_termination_item'); 
               var termdesc = customrecord.getValue('custrecord_liv_bs_ns_termination_desc'); 
               var termamt = customrecord.getValue('custrecord_liv_bs_ns_termination_amt');
   
                if (nvl(earlytermtotal,0) > 0)
                {
                   record.selectNewLineItem('item');
	               record.setCurrentLineItemValue('item','item',termitem); 
                   record.setCurrentLineItemValue('item', 'description', termdesc);
                   record.setCurrentLineItemValue('item', 'quantity', earlytermtotal);
                   record.setCurrentLineItemValue('item', 'amount', Math.abs(parseFloat(termamt)));
                   record.commitLineItem('item'); 
                }

            } // end if category = 'Bundled'
	        
	        
	        if (category == 'Upfront')
	        {
	        // Upfront Meter
	         nlapiLogExecution('DEBUG', 'VALUE', 'Inside Upfront Category: '+category);
	           var upfrontitem = customrecord.getValue('custrecord_liv_bs_ns_upfront_item'); 
               var upfrontdesc = customrecord.getValue('custrecord_liv_bs_ns_upfront_desc'); 
   
               if (nvl(ovrupfrontmeters,0) > 0 )
               {
                   var upfrontqty = nvl(ovrupfrontmeters,0) 
               }
        
               if (nvl(ovrupfrontmeters,0) == 0 )   
               {
                   var upfrontqty = nvl(upfrontmeters,0)  ;
               }
               
                record.selectNewLineItem('item');
	            record.setCurrentLineItemValue('item','item',upfrontitem); 
                record.setCurrentLineItemValue('item', 'description', upfrontdesc);
                record.setCurrentLineItemValue('item', 'quantity', upfrontqty);
                record.commitLineItem('item'); 
	        
	        } // end if category = 'Upfront'
	        
	          // Referral Item
            if (nvl(referralqty,0) > 0 && referralrate > 0 && createcmfee == 'F')
            {
                record.selectNewLineItem('item');
	            record.setCurrentLineItemValue('item','item',referralitem); 
                record.setCurrentLineItemValue('item', 'description', referraldesc);
                record.setCurrentLineItemValue('item', 'quantity', referralqty);
                record.setCurrentLineItemValue('item', 'rate', (referralrate * -1));
                record.commitLineItem('item'); 
            }
            
            //lapsed
	        if (nvl(lapsedqty,0) > 0 && showlapsed == 'T')
	        {
	            record.selectNewLineItem('item');
	            record.setCurrentLineItemValue('item','item',lapseditem); 
                record.setCurrentLineItemValue('item', 'description', lapseddesc);
                record.setCurrentLineItemValue('item', 'quantity', lapsedqty);
                record.setCurrentLineItemValue('item', 'rate', 0);
                record.commitLineItem('item'); 
	        }
	    
            var strRecID = nlapiSubmitRecord(record, true, true);
                
            nlapiLogExecution('DEBUG', 'ACTIVITY', 'create Invoice Ended Sucessfully');
	
            nlapiLogExecution('DEBUG', 'VALUE', 'strRecID : '+strRecID);
          
            // return response with internal id
            if (strRecID)	
            {
                var currentrecord = nlapiLoadRecord('customrecord_liv_billing_summary',recordid, {recordmode: 'dynamic'});
                currentrecord.setFieldValue('custrecord_liv_bs_ns_internal_id', strRecID);
                currentrecord.setFieldValue('custrecord_liv_bs_ns_creation_date', today);
                currentrecord.setFieldValue('custrecord_liv_bs_ns_invoice_members_qty',progqty);
                currentrecord.setFieldValue('custrecord_liv_bs_ns_error_msg', ' ');
                var strCustomID = nlapiSubmitRecord(currentrecord, true, true);
                nlapiLogExecution('DEBUG', 'VALUE', 'strCustomID : '+strCustomID);
                
            }
     
       
         } //nvl(totalbillingamt,0) > 0)
         else
         {
                var currentrecord = nlapiLoadRecord('customrecord_liv_billing_summary',recordid, {recordmode: 'dynamic'});
                currentrecord.setFieldValue('custrecord_liv_bs_ns_error_msg', 'Total Billing Amount is zero. Invoice not created.');
                var strCustomID = nlapiSubmitRecord(currentrecord, true, true);
         
         }
	          
			
		}catch(error)
		{
						if (error.getDetails != undefined) 
					   {
							nlapiLogExecution('DEBUG', 'Invoice creation error for billing summary internal id: '+recordid, error.getCode() + ': ' + error.getDetails());
							 var currentrecord = nlapiLoadRecord('customrecord_liv_billing_summary',recordid, {recordmode: 'dynamic'});
                             currentrecord.setFieldValue('custrecord_liv_bs_ns_error_msg', error.getCode() + ': ' + error.getDetails());
                             nlapiSubmitRecord(currentrecord, true, true);
					   }
					   else 
					   {    
							nlapiLogExecution('DEBUG', 'Unexpected invoice creation error for billing summary internal id : '+recordid, error.toString());
							 var currentrecord = nlapiLoadRecord('customrecord_liv_billing_summary',recordid, {recordmode: 'dynamic'});
                             currentrecord.setFieldValue('custrecord_liv_bs_ns_error_msg', error.toString());
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
   


