//last update date: 09/21/17 - New


function CreateVendorBill()
{
 try
 {
  //Search custom Partners Commissions
  
  var arrFilter = new Array(); 
  var arrColumns = new Array(); 
  
  arrFilter[0] = new nlobjSearchFilter('custrecord_liv_pcomm_bill_internal_id', null, 'isempty',  'null' ); 
  arrFilter[1] = new nlobjSearchFilter('custrecord_liv_pcomm_ns_create_bill', null, 'is',  'T' ); 
  
  
  //Define search columns

  arrColumns.push(new nlobjSearchColumn('internalid'));
  arrColumns.push(new nlobjSearchColumn('custrecord_liv_pcomm_ns_create_bill'));
  arrColumns.push(new nlobjSearchColumn('custrecord_liv_pcomm_ns_bill_no').setSort(false));
  arrColumns.push(new nlobjSearchColumn('custrecord_liv_pcomm_ns_client_code').setSort(false));  
  arrColumns.push(new nlobjSearchColumn('custrecord_liv_pcomm_ns_partner'));
  arrColumns.push(new nlobjSearchColumn('custrecord_liv_pcomm_ns_customer'));
  arrColumns.push(new nlobjSearchColumn('custrecord_liv_pcomm_ns_bill_date'));
  arrColumns.push(new nlobjSearchColumn('custrecord_liv_pcomm_bill_terms'));
  arrColumns.push(new nlobjSearchColumn('custrecord_liv_pcomm_bill_exp_acct'));
  arrColumns.push(new nlobjSearchColumn('custrecord_liv_pcomm_ns_bill_qty'));
  arrColumns.push(new nlobjSearchColumn('custrecord_liv_pcomm_bill_rate'));
  arrColumns.push(new nlobjSearchColumn('custrecord_liv_pcomm_bill_amt'));
  arrColumns.push(new nlobjSearchColumn('custrecord_liv_pcomm_ns_subsidiary'));


  var previousinvoice = null ;
  var firstline = false ;
  var editinvoice = false;
  var recordid = 0;
  var invoiceid = 0;
  var previousinvoiceid = 0;
  
  var arrResult = nlapiSearchRecord('customrecord_liv_partners_comm', null, arrFilter, arrColumns);

  if(arrResult)
  {
    for (var i = 0;  i < arrResult.length; i++)

      {
             var customrecord = arrResult[i];
             currentinvoice = customrecord.getValue('custrecord_liv_pcomm_ns_bill_no');
             recordid = customrecord.getValue('internalid');
            
             
             if (i == 0) //first record
             {
                 previousinvoice = customrecord.getValue('custrecord_liv_pcomm_ns_bill_no');
                 firstline = true;
                 invoiceid = createBillRec(customrecord, editinvoice, null, firstline) ;        
                 previousinvoiceid = invoiceid ;   
             }
             else
             {
                if (currentinvoice == previousinvoice)
                {
                // Find created invoice number and flag edit invoice
                   nlapiLogExecution('DEBUG', 'ACTIVITY', 'currentinvoice == previousinvoice');
                   nlapiLogExecution('DEBUG', 'VALUE', 'previousinvoiceid: '+previousinvoiceid);
                
                   firstline = false;
                   editinvoice = true ;
                   
                   invoiceid = createBillRec(customrecord,editinvoice, previousinvoiceid,firstline) ; 
                   previousinvoiceid = invoiceid ;     
                   
                   editinvoice = false;    
                
                }
                else
                {
  
                  // create for next invoice
                   nlapiLogExecution('DEBUG', 'ACTIVITY', 'Create Next Invoice'); 
                  
                   previousinvoice = currentinvoice;
                   firstline = true;
                   invoiceid = createBillRec(customrecord, editinvoice, null, firstline) ; 
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
		   nlapiLogExecution('DEBUG', 'Process Error for Partner Comm. Internal ID : '+recordid, error.getCode() + ': ' + error.getDetails());
		   throw nlapiCreateError('Create Invoice','',recordid,error.getCode(), error.toString());
	   }
	   else 
	   {    	
			nlapiLogExecution('DEBUG', 'Unexpected Error for Partner Comm. Internal ID : '+recordid, error.toString());
			throw nlapiCreateError('Create Invoice ','',+recordid,'Undefined Error Code', error.toString());
	   }
  }
} // end function CreateInvoice

function createBillRec(customrecord, editinvoice, previousinvoiceid, firstline)
/********************************************************************************************/
/*** Purpose: Create Invoice Record function                                              ***/
/********************************************************************************************/
{
	nlapiLogExecution('DEBUG', 'ACTIVITY', 'createBillRec Started...');
	    
	    var today = new Date();
	    var recordid = customrecord.getValue('internalid');
	    var vendorid = customrecord.getValue('custrecord_liv_pcomm_ns_partner');
	    var invoicenum = customrecord.getValue('custrecord_liv_pcomm_ns_bill_no');
        var trxdate = customrecord.getValue('custrecord_liv_pcomm_ns_bill_date'); 
        var clientcode = customrecord.getValue('custrecord_liv_pcomm_ns_client_code');
        var customer = customrecord.getText('custrecord_liv_pcomm_ns_customer');
        var customerid = customrecord.getValue('custrecord_liv_pcomm_ns_customer');
        var terms = customrecord.getValue('custrecord_liv_pcomm_bill_terms');
        var expenseacct = customrecord.getValue('custrecord_liv_pcomm_bill_exp_acct');
        var billqty = customrecord.getValue('custrecord_liv_pcomm_ns_bill_qty');
        var billrate = customrecord.getValue('custrecord_liv_pcomm_bill_rate');
        var billamt = customrecord.getValue('custrecord_liv_pcomm_bill_amt');
        var memo = null;
        var subsidiary = customrecord.getValue('custrecord_liv_pcomm_ns_subsidiary');
        
        nlapiLogExecution('DEBUG', 'VALUE', 'Bill No: '+ invoicenum);
        nlapiLogExecution('DEBUG', 'VALUE', 'Bill Amt: '+ billamt);
        
        if (editinvoice == false)
        {
           nlapiLogExecution('DEBUG', 'ACTIVITY', 'Inside nlapiCreateRecord');
	       var record = nlapiCreateRecord('vendorbill', {recordmode:'dynamic'});
	    }
	    else
	    {
	        nlapiLogExecution('DEBUG', 'ACTIVITY', 'Inside nlapiLoadRecord');
	        nlapiLogExecution('DEBUG', 'VALUE', 'Previous Invoice ID : '+ previousinvoiceid);
	        var record = nlapiLoadRecord('vendorbill', previousinvoiceid) ;
	    }
	    
	    
		try
		{
		
		 if (nvl(billamt,0) > 0)
	     {  
	        // Set Field Value for Invoice Header
	        nlapiLogExecution('DEBUG', 'VALUE', 'Inside Total Billing Amt: '+ billamt);
	        
	        if ((firstline == true) && (editinvoice == false))
	        {
	            nlapiLogExecution('DEBUG', 'VALUE', 'Inside Firstline : '+ firstline);
	        
	            record.setFieldValue('tranid', invoicenum);
	            record.setFieldValue('externalid', invoicenum);
	            record.setFieldValue('trandate', formatDate(trxdate));
	            record.setFieldValue('entity', vendorid); 
	            record.setFieldValue('terms', terms) ;
	            record.setFieldValue('subsidiary', subsidiary) ;
	            
	        }
	        
	        memo = convertdate(trxdate, 'MONTHYY')+' '+clientcode+' - Billable Members : '+billqty;
	     
            record.selectNewLineItem('expense');
	        record.setCurrentLineItemValue('expense','account',expenseacct); 
	        record.setCurrentLineItemValue('expense','department', 25); 
            record.setCurrentLineItemValue('expense', 'memo', memo);
            record.setCurrentLineItemValue('expense', 'amount', billamt);
            record.setCurrentLineItemValue('expense','custcol_liv_customer_name', customerid);
            record.commitLineItem('expense'); 
            
            var strRecID = nlapiSubmitRecord(record, true, true);
                
            
	
	        nlapiLogExecution('DEBUG', 'VALUE', 'Partner Comm. Record ID : '+recordid);
            nlapiLogExecution('DEBUG', 'VALUE', 'strRecID : '+strRecID);
          
            // return response with internal id
            if (strRecID)	
            {
                var currentrecord = nlapiLoadRecord('customrecord_liv_partners_comm',recordid, {recordmode: 'dynamic'});
                currentrecord.setFieldValue('custrecord_liv_pcomm_bill_internal_id', strRecID);
                currentrecord.setFieldValue('custrecord_liv_pcomm_bill_creation_date', today);
                currentrecord.setFieldValue('custrecord_liv_pcomm_bill_error_msg', ' ');
                var strCustomID = nlapiSubmitRecord(currentrecord, true, true); 
                return (strRecID) ;
            }
     
       
         } //nvl(totalbillingamt,0) > 0)
         else
         {
                nlapiLogExecution('DEBUG', 'ACTIVITY', 'inside else nvl(totalbillingamt,0) > 0)');
                var currentrecord = nlapiLoadRecord('customrecord_liv_partners_comm',recordid, {recordmode: 'dynamic'});
                currentrecord.setFieldValue('custrecord_liv_pcomm_bill_error_msg', 'Total Bill Amount is zero. Bill not created.');
                currentrecord.setFieldValue('custrecord_liv_pcomm_bill_internal_id', 'No vendor bill generated');
                currentrecord.setFieldValue('custrecord_liv_pcomm_bill_creation_date', today);
                var strCustomID = nlapiSubmitRecord(currentrecord, true, true);
                return (previousinvoiceid) ;
         
         }
	          nlapiLogExecution('DEBUG', 'ACTIVITY', 'create Bill Ended Sucessfully');
			
		}catch(error)
		{
						if (error.getDetails != undefined) 
					   {
							nlapiLogExecution('DEBUG', 'Bill creation error for billing summary internal id: '+recordid, error.getCode() + ': ' + error.getDetails());
							 var currentrecord = nlapiLoadRecord('customrecord_liv_partners_comm',recordid, {recordmode: 'dynamic'});
                             currentrecord.setFieldValue('custrecord_liv_pcomm_bill_error_msg', error.getCode() + ': ' + error.getDetails());
                             nlapiSubmitRecord(currentrecord, true, true);
					   }
					   else 
					   {    
							nlapiLogExecution('DEBUG', 'Unexpected bill creation error for billing summary internal id : '+recordid, error.toString());
							 var currentrecord = nlapiLoadRecord('customrecord_liv_partners_comm',recordid, {recordmode: 'dynamic'});
                             currentrecord.setFieldValue('custrecord_liv_pcomm_bill_error_msg', error.toString());
                             nlapiSubmitRecord(currentrecord, true, true);
					   }
		}

        
        
        
	nlapiLogExecution('DEBUG', 'VALUE', 'Usage: '+nlapiGetContext().getRemainingUsage());
	nlapiLogExecution('DEBUG', 'ACTIVITY', 'createBillRec Ended Sucessfully');
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


