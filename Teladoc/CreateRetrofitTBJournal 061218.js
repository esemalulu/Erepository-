/* NETSUITE-XX */
//last update date: 05/02/18

function CreateRetrofitTBJournal()
{
 try
 {
   var arrFilter = new Array(); 
   var today = new Date(); 
   
    // Get the value of the Date parameter 
    var p_jename = nlapiGetContext().getSetting('SCRIPT', 'custscript_liv_rf_jename');
    
   	
    arrFilter[0] = new nlobjSearchFilter('custrecord_liv_retrofit_tb_doc_no', null, 'is',  p_jename ); 
    

	//Define search columns
	
	var arrColumns = new Array(); 
	arrColumns.push(new nlobjSearchColumn('internalid').setSort(false));
	arrColumns.push(new nlobjSearchColumn('custrecord_liv_retrofit_tb_subsidiary'));
	arrColumns.push(new nlobjSearchColumn('custrecord_liv_retrofit_tb_date'));
	arrColumns.push(new nlobjSearchColumn('custrecord_liv_retrofit_tb_doc_no'));
	arrColumns.push(new nlobjSearchColumn('custrecord_liv_retrofit_tb_je_memo'));
	arrColumns.push(new nlobjSearchColumn('custrecord_liv_retrofit_qb_account_name'));
	arrColumns.push(new nlobjSearchColumn('custrecord_liv_retrofit_je_line_memo'));
	arrColumns.push(new nlobjSearchColumn('custrecord_liv_retrofit_tb_debit'));
	arrColumns.push(new nlobjSearchColumn('custrecord_liv_retrofit_tb_credit'));
	arrColumns.push(new nlobjSearchColumn('custrecord_liv_retrofit_tb_ns_account')); 
	arrColumns.push(new nlobjSearchColumn('custrecord_liv_retrofit_tb_ns_dept')); 
	arrColumns.push(new nlobjSearchColumn('custrecord_liv_retrofit_tb_net')); 


 
    var previousje = null ;
    var firstline = false ;
    var newheader = false;
    var editje = false;
    var recordid = 0;
    var jeid = 0;
    var previousjeid = 0;
    var lastrecord = false;
    var controltotal = 0;

  
    var arrResult = nlapiSearchRecord('customrecord_liv_retrofit_tb', null, arrFilter, arrColumns);
  	nlapiLogExecution('DEBUG', 'VALUE', 'Start Script');
  	
  

  if(arrResult)
  {
    for (var i = 0;  i < arrResult.length; i++)
      {
             nlapiLogExecution('DEBUG', 'VALUE', 'Processing arrResult: '+i +' of '+arrResult.length);
             
             var today = new Date();
             var customrecord = arrResult[i];
             
             var recordid = customrecord.getValue('internalid');
             var currentje = customrecord.getValue('custrecord_liv_retrofit_tb_doc_no');
             var jename = customrecord.getValue('custrecord_liv_retrofit_tb_doc_no');
             var subsidiary = customrecord.getValue('custrecord_liv_retrofit_tb_subsidiary');
             var trxdate = customrecord.getValue('custrecord_liv_retrofit_tb_date'); 
             var jememo = customrecord.getValue('custrecord_liv_retrofit_tb_je_memo'); 
             
             var qbacct = customrecord.getValue('custrecord_liv_retrofit_qb_account_name');
             var jelinememo = customrecord.getValue('custrecord_liv_retrofit_je_line_memo');
             var debit = customrecord.getValue('custrecord_liv_retrofit_tb_debit');
             var credit = customrecord.getValue('custrecord_liv_retrofit_tb_credit');
             var account = customrecord.getValue('custrecord_liv_retrofit_tb_ns_account');
             var dept = customrecord.getValue('custrecord_liv_retrofit_tb_ns_dept');
             var net = customrecord.getValue('custrecord_liv_retrofit_tb_net');
             

          if (i == 0) //first line - create journal header
          {   
             
             var externalid = currentje ;
     
        
             nlapiLogExecution('DEBUG', 'VALUE', 'Record ID: '+ recordid);
             nlapiLogExecution('DEBUG', 'VALUE', 'Je No: '+ jename);
             nlapiLogExecution('DEBUG', 'VALUE', 'i : '+ i);
             nlapiLogExecution('DEBUG', 'VALUE', 'Current Je: '+ currentje);
             nlapiLogExecution('DEBUG', 'VALUE', 'Previous Je: '+ previousje);
             nlapiLogExecution('DEBUG', 'VALUE', 'current External ID: '+ externalid);
             
              nlapiLogExecution('DEBUG', 'ACTIVITY', 'nlapiCreateRecord');
	          var record = nlapiCreateRecord('journalentry', {recordmode:'dynamic'}); 
             
              // JE Header
	         	record.setFieldValue('tranid', jename);
	         	record.setFieldValue('externalid', externalid);
	         	record.setFieldValue('trandate', formatDate(trxdate));
	         	record.setFieldValue('memo', jememo); 
	         	record.setFieldValue('subsidiary', subsidiary);  
	         	
	      }  // i == 0
	         	
	          // JE  Line    
	         record.selectNewLineItem('line');
	         if (net > 0)
	         {
	            nlapiLogExecution('DEBUG', 'ACTIVITY', 'Insert Debit Line');
	            var debitamt = Math.abs(debit);
                record.selectNewLineItem('line');  
                record.setCurrentLineItemValue('line', 'account', account);
                record.setCurrentLineItemValue('line', 'department', dept);
                record.setCurrentLineItemValue('line', 'memo',  jelinememo); 
                record.setCurrentLineItemValue('line', 'debit', Math.abs(parseFloat(debit)));
                record.commitLineItem('line'); 
              }
             else
             {
                nlapiLogExecution('DEBUG', 'ACTIVITY', 'Insert Credit Line');
                var creditamt = Math.abs(credit);
                record.selectNewLineItem('line');  
                record.setCurrentLineItemValue('line', 'account', account);
                record.setCurrentLineItemValue('line', 'department', dept); 
                record.setCurrentLineItemValue('line', 'memo',  jelinememo); 
                record.setCurrentLineItemValue('line', 'credit', Math.abs(parseFloat(credit)));
                record.commitLineItem('line'); 
             }
             
          
         
             
                 // Get the remaining usage points of the scripts
             var usage = nlapiGetContext().getRemainingUsage();

            // If the script's remaining usage points are bellow 1,000 ...       
             if (usage < 900) 
             {
	           // ...yield the script
	           var state = nlapiYieldScript();
	            // Throw an error or log the yield results
	           if (state.status == 'FAILURE')
		          throw "Failed to yield script";
	              else if (state.status == 'RESUME')
		          nlapiLogExecution('DEBUG','Resuming script');
              }
   

             
        } // end for loop
        
            var strRecID = nlapiSubmitRecord(record, true, true);   // save last record
            nlapiLogExecution('DEBUG', 'VALUE', 'Journal Internal ID : '+ strRecID);
            
            if (strRecID)
            { 
            
               var arrFilter = new Array(); 

               arrFilter[0] = new nlobjSearchFilter('custrecord_liv_retrofit_tb_doc_no', null, 'is',  jename ); 
               var arrColumns = new Array();
	
	           arrColumns.push(new nlobjSearchColumn('internalid'));
               var arrResult = nlapiSearchRecord('customrecord_liv_retrofit_tb', null, arrFilter, arrColumns);
  	 
               if(arrResult)
               {
                  for (var i = 0;  i < arrResult.length; i++)
                  {
                      var currentrecord = arrResult[i];
             
                      var recordid = currentrecord.getValue('internalid');
                      
                      var updaterecord = nlapiLoadRecord('customrecord_liv_retrofit_tb',recordid, {recordmode: 'dynamic'});
                      
                      updaterecord.setFieldValue('custrecord_liv_retrofit_tb_ns_je_doc_no', strRecID);
                      updaterecord.setFieldValue('custrecord_liv_retrofit_tb_ns_je_created', today); 
                      var strCustomID = nlapiSubmitRecord(updaterecord, true, true); 
                  }
                  
               }
            }
            
             
     } // end arrResult                  
                
           
             
         
  }catch(error) 
  {
	   if (error.getDetails != undefined) 
	   {
		   nlapiLogExecution('DEBUG', 'Process Error for TB Internal ID : '+recordid, error.getCode() + ': ' + error.getDetails());
		   var currentrecord = nlapiLoadRecord('customrecord_liv_retrofit_tb',recordid, {recordmode: 'dynamic'});
           currentrecord.setFieldValue('custrecord_liv_retrofit_tb_je_error',error.getCode() + ': ' + error.getDetails());
           var strCustomID = nlapiSubmitRecord(currentrecord, true, true); 
		   throw nlapiCreateError('Create Retrofit TB JE Error','',recordid,error.getCode(), error.toString());
	   }
	   else 
	   {    	
			nlapiLogExecution('DEBUG', 'Unexpected Error for Retrofit TB JE Error : '+recordid, error.toString());
			var currentrecord = nlapiLoadRecord('customrecord_liv_retrofit_tb',recordid, {recordmode: 'dynamic'});
            currentrecord.setFieldValue('custrecord_liv_retrofit_tb_je_error',error.toString());
            var strCustomID = nlapiSubmitRecord(currentrecord, true, true); 
			throw nlapiCreateError('Create Retrofit TB JE Error ','',+recordid,'Undefined Error Code', error.toString());
	   }
  }
} // end function 


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


