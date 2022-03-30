/* NETSUITE-63 */
//last update date: 10/19/17

function CreateAccrualsRec()
{
 try
 {
   
       var arrFilter = new Array(); 
       var today = new Date();
       var todays_date = today.getDate();
       var todays_month = today.getMonth() + 1; //adding one because getMonth returns the previous numeric month
       var todays_year = today.getFullYear();
       var last = new Date(todays_year, todays_month, 0);  //the last day of the month
       var last_date = last.getDate();

     if (todays_date == last_date)
     {
       var searchresults = nlapiSearchRecord('transaction','customsearch_liv_uninvoiced_receipts', null, null);

       if(searchresults) 
       { 
           for(var z=0; z < searchresults.length; z++) 
           { 
       
               var results=searchresults[z];
               var columns=results.getAllColumns();  
               
               var recordid         = results.getId() ;
               var subsidiary       = results.getValue(columns[0]); 
               var asofdate         = results.getValue(columns[1]); 
               var trandate         = results.getValue(columns[2]); 
               var period           = results.getValue(columns[3]);  ;   
               var docnumber        = results.getValue(columns[4]);  ; 
               var type             = results.getValue(columns[5]);  ;
               var status           = results.getValue(columns[6]); 
               var vendorname       = results.getValue(columns[7]);
               var item             = results.getValue(columns[8]);
               var memo             = results.getValue(columns[9]);
               var expenseacct      = results.getValue(columns[10]);
               var qty              = results.getValue(columns[11]);
               var rate             = results.getValue(columns[12]);
               var docamt           = results.getValue(columns[13]);
               var qtyreceived      = results.getValue(columns[14]);
               var qtybilled        = results.getValue(columns[15]);
               var qtyaccrue        = results.getValue(columns[16]);
               var accrueamt        = results.getValue(columns[17]);
               
               var period           = convertdate(today, 'YYYY-MM') ;
               var jename           = 'Period End Accruals '+ period ;
               
      
               nlapiLogExecution('DEBUG', 'VALUE', 'Processing arrResult: '+z +' of '+searchresults.length);
               nlapiLogExecution('DEBUG','SearchResult Document Number: '+docnumber) ; 
               nlapiLogExecution('DEBUG','Je Name: '+jename) ;
               nlapiLogExecution('DEBUG','Period: '+period) ;
               
               var record = nlapiCreateRecord('customrecord_liv_accruals', {recordmode:'dynamic'});
               

	           record.setFieldValue('custrecord_liv_accruals_autocreate_je', 'T');
	           record.setFieldValue('custrecord_liv_accruals_as_of_date', asofdate);
	           record.setFieldValue('custrecord_liv_accruals_doc_date', trandate);
	           record.setFieldValue('custrecord_liv_accruals_doc_number', docnumber); 
	           record.setFieldValue('custrecord_liv_accruals_type',type);
	           record.setFieldValue('custrecord_liv_accruals_status', status) ;
	           record.setFieldText('custrecord_liv_accruals_vendor_name', vendorname) ;
	           record.setFieldValue('custrecord_liv_accruals_item', item) ;
	           record.setFieldValue('custrecord_liv_accruals_memo', memo ) ;
	           record.setFieldValue('custrecord_liv_accruals_account',expenseacct) ;
	           record.setFieldValue('custrecord_liv_accruals_rate',rate) ;
	           record.setFieldValue('custrecord_liv_accruals_qty',qty ) ;
	           record.setFieldValue('custrecord_liv_accruals_amount', docamt) ;
	           record.setFieldValue('custrecord_liv_accruals_qty_received', qtyreceived) ;
	           record.setFieldValue('custrecord_liv_accruals_qty_billed', qtybilled) ;
	           record.setFieldValue('custrecord_liv_accruals_qty_to_accrue', qtyaccrue) ;
	           record.setFieldValue('custrecord_liv_accruals_amount_to_accrue', accrueamt) ;
	           record.setFieldValue('custrecord_liv_accruals_ns_je_name', jename) ;
	           record.setFieldValue('custrecord_liv_accruals_ns_je_date', today) ;
	           record.setFieldValue('custrecord_liv_accruals_ns_subsidiary', subsidiary) ;
	           
	   
               var strRecID = nlapiSubmitRecord(record, true, true);
                
               nlapiLogExecution('DEBUG', 'ACTIVITY', 'create Record Ended Sucessfully');
               nlapiLogExecution('DEBUG', 'VALUE', 'strRecID : '+strRecID);


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
               
             } //for loop
        } // end if
    } //end last day check
       
  }catch(error) 
  {
	   if (error.getDetails != undefined) 
	   {
		   nlapiLogExecution('DEBUG', 'Process Error for Internal ID : '+recordid, error.getCode() + ': ' + error.getDetails());
		   throw nlapiCreateError('Create Accruals Record Error','',recordid,error.getCode(), error.toString());
	   }
	   else 
	   {    	
			nlapiLogExecution('DEBUG', 'Unexpected Error for Internal ID : '+recordid, error.toString());
			throw nlapiCreateError('Create Accruals Record Error ','',+recordid,'Undefined Error Code', error.toString());
	   }
  }
} // end function CreateAccrualsRec

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


