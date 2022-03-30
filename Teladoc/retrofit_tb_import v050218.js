/* Last Updated: 05/02/18 New Script */


function beforeSubmit(type)
{
  //applies only to CSV Import and Create event
  
  if ( (type == 'create') &&  (nlapiGetContext().getExecutionContext() == 'csvimport'))
  {
  
  		    var debit = nlapiGetFieldValue('custrecord_liv_retrofit_tb_debit');
            var credit = nlapiGetFieldValue('custrecord_liv_retrofit_tb_credit');
           
            var debitamt = nvl(debit,0);
            var creditamt = nvl(credit,0);
            
            var net = (debitamt - creditamt) ;
            
            nlapiSetFieldValue('custrecord_liv_retrofit_tb_net',net);
            
            
            nlapiLogExecution('DEBUG','debitamt:'+ debitamt) ;
            nlapiLogExecution('DEBUG','creditamt:'+ creditamt) ;
            nlapiLogExecution('DEBUG','net:'+ net) ;
      
      
            processRecords(type) ;
      
  }
    

  if ( (type == 'xedit') &&  (nlapiGetContext().getExecutionContext() != 'csvimport'))
  {
    var newrec = nlapiGetNewRecord();
    var locked = nlapiLookupField(newrec.getRecordType(), newrec.id, 'custrecord_liv_retrofit_ns_je_doc_no');

    if(locked) 
    {
       throw "You cannot edit this record.  Journal has been created.";
    }
   }

} // end function beforeSumit




function processRecords(type)
{   

      var newId = nlapiGetRecordId();
      var newType = nlapiGetRecordType();
      var arrFilter = new Array(); 
      
      var qbacct = nlapiGetFieldValue('custrecord_liv_retrofit_qb_account_name');
      
    
       arrFilter[0] = new nlobjSearchFilter('custrecord_liv_retrofit_qb_account', null, 'is',  qbacct );  
	
	    //Define search columns
	
	    var arrColumns = new Array();
	
		arrColumns.push(new nlobjSearchColumn('custrecord_liv_retrofit_ns_account'));
	    arrColumns.push(new nlobjSearchColumn('custrecord_liv_retrofit_ns_dept'));
	   
	    //Execute search
	    
		var arrResult = nlapiSearchRecord('customrecord_liv_retrofit_coa_mapping', null, arrFilter, arrColumns);
		
		nlapiLogExecution('DEBUG','QB Acct Name:'+ qbacct) ;
		
		
		
		 if(arrResult) //  
        {
           nlapiLogExecution('DEBUG','arrResult:'+ arrResult.length) ;
           

           var current_rec = arrResult[0];
           var rec_id = current_rec.getId();
           var nsaccount = current_rec.getValue('custrecord_liv_retrofit_ns_account');
           var nsdept = current_rec.getValue('custrecord_liv_retrofit_ns_dept');
       
           
           nlapiSetFieldValue('custrecord_liv_retrofit_tb_ns_account',nsaccount);
           nlapiSetFieldValue('custrecord_liv_retrofit_tb_ns_dept',nsdept);
           

        }
        
    
 

} //end processRecords



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
   
   
   
   

   