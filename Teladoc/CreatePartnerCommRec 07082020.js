//last update date: 09/20/17 - New
//last update date: 11/26/18 NS-236


function CreatePartnerCommRec()
{
 try
 {
 
      //Search custom billing summary
        nlapiLogExecution('DEBUG', 'ACTIVITY', 'Search Billing Summary : ');
  
      	var arrFilter = new Array(); 
      	var arrColumns = new Array();  
       // var p_date = nlapiGetContext().getSetting('SCRIPT', 'custscript_date') ;
  
      	arrFilter[0] = new nlobjSearchFilter('custrecord_bs2_ns_create_partner_bill', null, 'is',  'T' ); 
      	arrFilter[1] = new nlobjSearchFilter('custrecord_bs2_ns_partner_comm_id', null, 'isempty',  'null' ); 
      //	arrFilter[?] = new nlobjSearchFilter('custrecord_liv_bs_ns_internal_id', null, 'isnotempty',  'null' ); 
      //	arrFilter[1] = new nlobjSearchFilter('custrecord_liv_bs_date', null, 'is', nlapiGetContext().getSetting('SCRIPT', 'custscript_date')  ); 
  
       //Define search columns

       	arrColumns.push(new nlobjSearchColumn('internalid'));
       	arrColumns.push(new nlobjSearchColumn('custrecord_bs2_partner').setSort(false));
       	arrColumns.push(new nlobjSearchColumn('custrecord_bs2_ns_customer').setSort(false));
       	arrColumns.push(new nlobjSearchColumn('custrecord_bs2_ns_invoice_number').setSort(false));
       	arrColumns.push(new nlobjSearchColumn('custrecord_bs2_client_code').setSort(false));  
       	arrColumns.push(new nlobjSearchColumn('custrecord_bs2_date'));
       	arrColumns.push(new nlobjSearchColumn('custrecord_bs2_ns_internal_id'));
       	arrColumns.push(new nlobjSearchColumn('custrecord_bs2_ns_create_partner_bill'));
       	arrColumns.push(new nlobjSearchColumn('custrecord_bs2_ns_partner_fee'));
       	arrColumns.push(new nlobjSearchColumn('custrecord_bs2_ns_partner_exp_acct'));
  		arrColumns.push(new nlobjSearchColumn('custrecord_bs2_ns_partner_terms'));
  		arrColumns.push(new nlobjSearchColumn('custrecord_bs2_ns_vendor_bill_prefix'));
  		arrColumns.push(new nlobjSearchColumn('custrecord_bs2_ns_invoice_members_qty'));
  	    arrColumns.push(new nlobjSearchColumn('custrecord_bs2_contract_number'));
  
 
  		var recordid = 0; 
  		var partnercommid = 0;
  
  		var arrResult = nlapiSearchRecord('customrecord_liv_billing_summary_v2', null, arrFilter, arrColumns);
  		nlapiLogExecution('DEBUG', 'VALUE', 'Start Script');
  

  		if(arrResult)
  		{
    		for (var i = 0;  i < arrResult.length; i++)

      		{
             	var customrecord = arrResult[i];

             	recordid = customrecord.getValue('internalid');
             	partnercommid = createRec(customrecord) ;   
             	nlapiLogExecution('DEBUG', 'VALUE', 'partnercommid : '+partnercommid);
             	if(partnercommid)
             	{
             	   var bsrecord = nlapiLoadRecord('customrecord_liv_billing_summary_v2',recordid, {recordmode: 'dynamic'});
             	   bsrecord.setFieldValue('custrecord_bs2_ns_partner_comm_id', partnercommid) ;
             	   var bsrecid = nlapiSubmitRecord(bsrecord, true, true);
             	   nlapiLogExecution('DEBUG', 'VALUE', 'bsrecid : '+bsrecid);
             	   
             	} 
            
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

function createRec(customrecord)
/********************************************************************************************/
/*** Purpose: Create Partner Commissions Record function                                  ***/
/********************************************************************************************/
{
	nlapiLogExecution('DEBUG', 'ACTIVITY', 'createRec Started...');
	    
	    var today = new Date();
	    
	     var recordid = customrecord.getValue('internalid');
	     var arinvoice = customrecord.getValue('custrecord_bs2_ns_invoice_number');
         var arinvoiceid = customrecord.getValue('custrecord_bs2_ns_internal_id');
         var arcustomer = customrecord.getValue('custrecord_bs2_ns_customer');
         var arclientcode = customrecord.getValue('custrecord_bs2_client_code');
         var arinvoicedate = customrecord.getValue('custrecord_bs2_date');
         var createbill = customrecord.getValue('custrecord_bs2_ns_create_partner_bill');
         var vendorid = customrecord.getValue('custrecord_bs2_partner');
         var billrate = customrecord.getValue('custrecord_bs2_ns_partner_fee');
         var billexpacct = customrecord.getValue('custrecord_bs2_ns_partner_exp_acct');
         var billterms = customrecord.getValue('custrecord_bs2_ns_partner_terms');
         var billprefix = customrecord.getValue('custrecord_bs2_ns_vendor_bill_prefix');
         var billqty = customrecord.getValue('custrecord_bs2_ns_invoice_members_qty');
         var contractnumber = customrecord.getValue('custrecord_bs2_contract_number');
         var periodno = convertdate(arinvoicedate,'YYYY-MM') ;
             
         var record = nlapiCreateRecord('customrecord_liv_partners_comm', {recordmode:'dynamic'});
         
         var billno = billprefix+convertdate(arinvoicedate, 'MONTHYY')
         var billamt = nvl(billqty,0) * nvl(billrate,0);
       
		try
		{
		
	        record.setFieldValue('custrecord_liv_pcomm_ns_create_bill', createbill);
	        record.setFieldValue('custrecord_liv_pcomm_ns_partner', vendorid);
	        record.setFieldValue('custrecord_liv_pcomm_ns_customer', arcustomer);
	        record.setFieldValue('custrecord_liv_pcomm_ns_client_code', arclientcode);
	        record.setFieldValue('custrecord_liv_pcomm_ns_invoice_date', formatDate(arinvoicedate)); 
	        record.setFieldValue('custrecord_liv_pcomm_ns_invoice_number',arinvoice);
	        record.setFieldValue('custrecord_liv_pcomm_ns_billed_qty', billqty) ;
	        record.setFieldValue('custrecord_liv_pcomm_ns_partner_fee', billrate) ;
	        record.setFieldValue('custrecord_liv_pcomm_ns_bill_no', billno) ;
	        record.setFieldValue('custrecord_liv_pcomm_ns_bill_date', formatDate(arinvoicedate) ) ;
	        record.setFieldValue('custrecord_liv_pcomm_bill_terms', billterms) ;
	        record.setFieldValue('custrecord_liv_pcomm_bill_exp_acct', billexpacct) ;
	        record.setFieldValue('custrecord_liv_pcomm_ns_bill_qty', billqty) ;
	        record.setFieldValue('custrecord_liv_pcomm_bill_rate', billrate) ;
	        record.setFieldValue('custrecord_liv_pcomm_bill_amt', billamt) ;
	        record.setFieldValue('custrecord_liv_pcomm_period_no', periodno) ;
	        record.setFieldValue('custrecord_liv_pcomm_ns_contract_number', contractnumber) ;
	   
            var strRecID = nlapiSubmitRecord(record, true, true);
                
            nlapiLogExecution('DEBUG', 'ACTIVITY', 'create Record Ended Sucessfully');
	
            nlapiLogExecution('DEBUG', 'VALUE', 'strRecID : '+strRecID);

		}catch(error)
		{
			if (error.getDetails != undefined) 
			{
				nlapiLogExecution('DEBUG', 'Record creation error for billing summary internal id: '+recordid, error.getCode() + ': ' + error.getDetails());
                throw error;
			}
			else 
			{    
				nlapiLogExecution('DEBUG', 'Unexpected record creation error for billing summary internal id : '+recordid, error.toString());
                throw error;
			}
		}

        return (strRecID) ;
        
        
	nlapiLogExecution('DEBUG', 'VALUE', 'Usage: '+nlapiGetContext().getRemainingUsage());
	nlapiLogExecution('DEBUG', 'ACTIVITY', 'createRec Ended Sucessfully');
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
   if (inputformat == 'YYYY-MM')
   { 
     nlapiLogExecution('DEBUG','Date format:'+ inputformat) ;
     var year = newdate.getFullYear();
     var datestring = year + "-" + ("0" + (newdate.getMonth() + 1).toString()).substr(-2) 

      nlapiLogExecution('DEBUG','datestring : '+ datestring) ;
     
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


