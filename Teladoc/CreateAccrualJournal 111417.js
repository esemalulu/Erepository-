//New : 11/14/17

function CreateAccrualJournal()
{
 try
 {
   var arrFilter = new Array(); 
   var today = new Date(); 
    
   	
    arrFilter[0] = new nlobjSearchFilter('custrecord_liv_accruals_ns_je_id', null, 'isempty',  'null' ); 
    arrFilter[1] = new nlobjSearchFilter('custrecord_liv_accruals_autocreate_je', null, 'is',  'T' ); 

	//Define search columns
	
	var arrColumns = new Array(); 
	//arrColumns.push(new nlobjSearchColumn('custrecord_liv_cc_control_account').setSort(false));
	//arrColumns.push(new nlobjSearchColumn('custrecord_liv_cc_post_date').setSort(false));
	//arrColumns.push(new nlobjSearchColumn('custrecord_liv_cc_ns_je_no').setSort(false));
	
	arrColumns.push(new nlobjSearchColumn('internalid'));
	arrColumns.push(new nlobjSearchColumn('custrecord_liv_accruals_doc_date'));
	arrColumns.push(new nlobjSearchColumn('custrecord_liv_accruals_doc_number'));
	arrColumns.push(new nlobjSearchColumn('custrecord_liv_accruals_vendor_name'));
	arrColumns.push(new nlobjSearchColumn('custrecord_liv_accruals_expense_acct'));
	arrColumns.push(new nlobjSearchColumn('custrecord_liv_accruals_expense_dept'));
	arrColumns.push(new nlobjSearchColumn('custrecord_liv_accruals_amount_to_accrue')); 
	arrColumns.push(new nlobjSearchColumn('custrecord_liv_accruals_ovrwrite_amount'));  
	arrColumns.push(new nlobjSearchColumn('custrecord_liv_accruals_ns_subsidiary'));
	arrColumns.push(new nlobjSearchColumn('custrecord_liv_accruals_ns_je_name'));
	arrColumns.push(new nlobjSearchColumn('custrecord_liv_accruals_ns_je_date'));
	arrColumns.push(new nlobjSearchColumn('custrecord_liv_accruals_ns_accrual_acct'));
	arrColumns.push(new nlobjSearchColumn('custrecord_liv_accruals_memo'));
	arrColumns.push(new nlobjSearchColumn('custrecord_liv_accruals_currency'));
	

 
    var previousje = null ;
    var firstline = false ;
    var newheader = false;
    var editje = false;
    var recordid = 0;
    var jeid = 0;
    var previousjeid = 0;
    var lastrecord = false;
    var controltotal = 0;
    var jememo = null;

  
    var arrResult = nlapiSearchRecord('customrecord_liv_accruals', null, arrFilter, arrColumns);
  	nlapiLogExecution('DEBUG', 'VALUE', 'Start Script');
  	
  

  if(arrResult)
  {
    for (var i = 0;  i < arrResult.length; i++)
      {
             nlapiLogExecution('DEBUG', 'VALUE', 'Processing arrResult: '+i +' of '+arrResult.length);
             
             var today = new Date();
             var customrecord = arrResult[i];
             
             var currentje = customrecord.getValue('custrecord_liv_accruals_ns_je_name');
             var recordid = customrecord.getValue('internalid');
             var amount = customrecord.getValue('custrecord_liv_accruals_amount_to_accrue');
             var ovramount = customrecord.getValue('custrecord_liv_accruals_ovrwrite_amount');
	         var vendorid = customrecord.getValue('custrecord_liv_accruals_vendor_name');
	         var jenum = customrecord.getValue('custrecord_liv_accruals_ns_je_name');
             var trxdate = customrecord.getValue('custrecord_liv_accruals_ns_je_date'); 
             var accrualacct = customrecord.getValue('custrecord_liv_accruals_ns_accrual_acct');
             var expenseacct = customrecord.getValue('custrecord_liv_accruals_expense_acct');
             var department = customrecord.getValue('custrecord_liv_accruals_expense_dept');
             var subsidiary = customrecord.getValue('custrecord_liv_accruals_ns_subsidiary');
             var docno = customrecord.getValue('custrecord_liv_accruals_doc_number');
             var docdate = customrecord.getValue('custrecord_liv_accruals_doc_date');
             var memo = customrecord.getValue('custrecord_liv_accruals_memo');
             var currency = customrecord.getValue('custrecord_liv_accruals_currency');
             
             jememo = formatDate(docdate) + ' '+ docdate + ' ' + memo ;
     
        
             nlapiLogExecution('DEBUG', 'VALUE', 'Record ID: '+ recordid);
             nlapiLogExecution('DEBUG', 'VALUE', 'Je No: '+ jenum);
             nlapiLogExecution('DEBUG', 'VALUE', 'Accrual Amt: '+ amount);
             nlapiLogExecution('DEBUG', 'VALUE', 'i : '+ i);
             nlapiLogExecution('DEBUG', 'VALUE', 'Current Je: '+ currentje);
             nlapiLogExecution('DEBUG', 'VALUE', 'Previous Je: '+ previousje);
             
             if (i ==0)
             { 
                previousje = currentje ;
                nlapiLogExecution('DEBUG', 'ACTIVITY', 'nlapiCreateRecord');
	            var record = nlapiCreateRecord('journalentry', {recordmode:'dynamic'});   
	            
	            // JE Header
	         	record.setFieldValue('tranid', jenum);
	         	record.setFieldValue('externalid', jenum);
	         	record.setFieldValue('trandate', formatDate(trxdate));
	         	record.setFieldValue('memo', jenum); 
	         	record.setFieldText('subsidiary', subsidiary); 
	         	record.setFieldValue('currency', currency); 
	         	
             }
             
	         
	         if ((previousje != currentje) & (i !=0))
	         {
	              nlapiLogExecution('DEBUG', 'ACTIVITY', 'New JE record - Save Previous Record');
	              previousje = currentje ;
	              var strRecID = nlapiSubmitRecord(record, true, true);
	              nlapiLogExecution('DEBUG', 'VALUE', 'Journal Internal ID : '+ strRecID);
	              
	              nlapiLogExecution('DEBUG', 'ACTIVITY', 'nlapiCreateRecord');
	              var record = nlapiCreateRecord('journalentry', {recordmode:'dynamic'}); 
	              
	              // JE Header
	              record.setFieldValue('tranid', jenum);
	              record.setFieldValue('externalid', jenum);
	              record.setFieldValue('trandate', formatDate(trxdate));
	              record.setFieldValue('memo', jenum); 
	              record.setFieldText('subsidiary', subsidiary);   
	              record.setFieldValue('currency', currency); 
	              
	         }
	     
	         // JE Expense Line    
	       
	            nlapiLogExecution('DEBUG', 'VALUE', 'ovramount : '+ ovramount);
	            nlapiLogExecution('DEBUG', 'VALUE', 'amount : '+ amount);
	            
	            if (ovramount == null || !ovramount)
	            {
	               nlapiLogExecution('DEBUG', 'VALUE', 'inside !ovramount : '+ ovramount);
	            }
	            else
	            {
	               nlapiLogExecution('DEBUG', 'VALUE', 'inside amount : '+ amount);
	            }
	            
	            var jeamt = nvl(ovramount,amount) ;
	            nlapiLogExecution('DEBUG', 'VALUE', 'jeamt : '+ jeamt);
	         
	            nlapiLogExecution('DEBUG', 'ACTIVITY', 'Insert Expense Line');
	            
	            var debitamt = Math.abs(jeamt);
	            
                record.selectNewLineItem('line');  
                record.setCurrentLineItemValue('line', 'account', expenseacct);
			    record.setCurrentLineItemValue('line', 'department', department);
			    record.setCurrentLineItemValue('line', 'entity',  vendorid);
                record.setCurrentLineItemValue('line', 'memo',  jememo);
                record.setCurrentLineItemValue('line', 'debit', Math.abs(parseFloat(jeamt)));
                record.commitLineItem('line'); 
          
             
             // JE Control Line
                 nlapiLogExecution('DEBUG', 'ACTIVITY', 'Insert Accrual Line');
                 var creditamt = Math.abs(jeamt) ;
                 
                 record.selectNewLineItem('line');
                 record.setCurrentLineItemValue('line', 'account', accrualacct);
                 record.setCurrentLineItemValue('line', 'memo',  jememo);
                 record.setCurrentLineItemValue('line', 'entity',  vendorid);
                 record.setCurrentLineItemValue('line', 'credit', Math.abs(parseFloat(jeamt)));
                 record.commitLineItem('line'); 
    
       
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
             
     } // end arrResult                  
                
             var strRecID = nlapiSubmitRecord(record, true, true);   // save last record
             nlapiLogExecution('DEBUG', 'VALUE', 'Journal Internal ID : '+ strRecID);
             
             var updateid = updateAccrualtrxs() ; //update je internal id in cc trxs
             
         
  }catch(error) 
  {
	   if (error.getDetails != undefined) 
	   {
		   nlapiLogExecution('DEBUG', 'Process Error for Accrual Transaction Internal ID : '+recordid, error.getCode() + ': ' + error.getDetails());
		   var currentrecord = nlapiLoadRecord('customrecord_liv_accruals',recordid, {recordmode: 'dynamic'});
           currentrecord.setFieldValue('custrecord_liv_accruals_ns_je_error_msg',error.getCode() + ': ' + error.getDetails());
           var strCustomID = nlapiSubmitRecord(currentrecord, true, true); 
		   throw nlapiCreateError('Create Accrual JE Error','',recordid,error.getCode(), error.toString());
	   }
	   else 
	   {    	
			nlapiLogExecution('DEBUG', 'Unexpected Error for Accrual Transaction Internal ID : '+recordid, error.toString());
			var currentrecord = nlapiLoadRecord('customrecord_liv_accruals',recordid, {recordmode: 'dynamic'});
            currentrecord.setFieldValue('custrecord_liv_accruals_ns_je_error_msg',error.toString());
            var strCustomID = nlapiSubmitRecord(currentrecord, true, true); 
			throw nlapiCreateError('Create Accrual JE Error ','',+recordid,'Undefined Error Code', error.toString());
	   }
  }
} // end function CreateJE

function updateAccrualtrxs()
/********************************************************************************************/
/*** Purpose: Update Accrual trxs function                                                     ***/
/********************************************************************************************/
{
 try
 {
   var arrFilter = new Array(); 
   var today = new Date(); 
    
   	
    arrFilter[0] = new nlobjSearchFilter('custrecord_liv_accruals_ns_je_id', null, 'isempty',  'null' ); 
    arrFilter[1] = new nlobjSearchFilter('custrecord_liv_accruals_autocreate_je', null, 'is',  'T' ); 

	//Define search columns
	
	var arrColumns = new Array();
	
	arrColumns.push(new nlobjSearchColumn('internalid'));
	arrColumns.push(new nlobjSearchColumn('custrecord_liv_accruals_ns_je_name'));


    var arrResult = nlapiSearchRecord('customrecord_liv_accruals', null, arrFilter, arrColumns);
  	nlapiLogExecution('DEBUG', 'ACTIVITY', 'Start Update Script');
  	
  	if(arrResult)
    {
        for (var i = 0;  i < arrResult.length; i++)
      {
      
        var jeFilter = new Array(); 
        var jeColumns = new Array();
        var customrecord = arrResult[i];
             
        var jenum = customrecord.getValue('custrecord_liv_accruals_ns_je_name');
        var recordid = customrecord.getValue('internalid');

        nlapiLogExecution('DEBUG', 'VALUE', 'jenum '+ jenum);
        nlapiLogExecution('DEBUG', 'VALUE', 'record id '+recordid);  
        
        
         jeFilter[0] = new nlobjSearchFilter('tranid', null, 'is',  jenum ); 
         
       
	     jeColumns.push(new nlobjSearchColumn('datecreated')); 
	     jeColumns.push(new nlobjSearchColumn('internalid')); 
	
         var jeResult = nlapiSearchRecord('journalentry', null, jeFilter, jeColumns);
         
         if (jeResult)
         {
            for (var j = 0;  j < jeResult.length; j++)
            {
              var jerecord = jeResult[j];
              var jeinternalid = jerecord.getValue('internalid');
               nlapiLogExecution('DEBUG', 'VALUE', 'update je internal id '+jeinternalid); 
	
              var currentrecord = nlapiLoadRecord('customrecord_liv_accruals',recordid, {recordmode: 'dynamic'});
              currentrecord.setFieldValue('custrecord_liv_accruals_ns_je_id', jeinternalid);
              currentrecord.setFieldValue('custrecord_liv_accruals_je_creation_date', today); 
              var strCustomID = nlapiSubmitRecord(currentrecord, true, true); 
             }

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
      
    } // if(arrResult)
  
 }catch(error)
 {
	if (error.getDetails != undefined) 
	{
		nlapiLogExecution('DEBUG', 'JE creation error for Accrual Trx. internal id: '+recordid, error.getCode() + ': ' + error.getDetails());
		var currentrecord = nlapiLoadRecord('customrecord_liv_accruals',recordid, {recordmode: 'dynamic'});
        currentrecord.setFieldValue('custrecord_liv_accruals_ns_je_error_msg', error.getCode() + ': ' + error.getDetails());
        nlapiSubmitRecord(currentrecord, true, true);
	}
	else 
	{    
		nlapiLogExecution('DEBUG', 'Unexpected JE creation error for Accrual Trx. internal id : '+recordid, error.toString());
		var currentrecord = nlapiLoadRecord('customrecord_liv_accruals',recordid, {recordmode: 'dynamic'});
        currentrecord.setFieldValue('custrecord_liv_accruals_ns_je_error_msg', error.toString());
        nlapiSubmitRecord(currentrecord, true, true);
	}
}


	nlapiLogExecution('DEBUG', 'VALUE', 'Usage: '+nlapiGetContext().getRemainingUsage());
	nlapiLogExecution('DEBUG', 'ACTIVITY', 'update Accrual Trxs Ended Sucessfully');
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
  if (value1 == null || !value1)
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

