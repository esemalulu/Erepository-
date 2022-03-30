/* NETSUITE-58 */
//last update date: 10/09/17

function CreateCCJournal()
{
 try
 {
   var arrFilter = new Array(); 
   var today = new Date(); 
    
   	
    arrFilter[0] = new nlobjSearchFilter('custrecord_liv_cc_ns_je_internal_id', null, 'isempty',  'null' ); 
    arrFilter[1] = new nlobjSearchFilter('custrecord_liv_cc_auto_create_je', null, 'is',  'T' ); 

	//Define search columns
	
	var arrColumns = new Array(); 
	arrColumns.push(new nlobjSearchColumn('custrecord_liv_cc_control_account').setSort(false));
	arrColumns.push(new nlobjSearchColumn('custrecord_liv_cc_post_date').setSort(false));
	arrColumns.push(new nlobjSearchColumn('custrecord_liv_cc_ns_je_no').setSort(false));
	arrColumns.push(new nlobjSearchColumn('internalid'));
	arrColumns.push(new nlobjSearchColumn('custrecord_liv_cc_date'));
	arrColumns.push(new nlobjSearchColumn('custrecord_liv_cc_amount'));
	arrColumns.push(new nlobjSearchColumn('custrecord_liv_cc_name'));
	arrColumns.push(new nlobjSearchColumn('custrecord_liv_cc_expense_acct'));
	arrColumns.push(new nlobjSearchColumn('custrecord_liv_cc_dept'));
	arrColumns.push(new nlobjSearchColumn('custrecord_liv_cc_ns_je_memo')); 
	arrColumns.push(new nlobjSearchColumn('custrecord_liv_cc_period_no'));  
	arrColumns.push(new nlobjSearchColumn('custrecord_liv_cc_ns_subsidiary')); 

 
    var previousje = null ;
    var firstline = false ;
    var newheader = false;
    var editje = false;
    var recordid = 0;
    var jeid = 0;
    var previousjeid = 0;
    var lastrecord = false;
    var controltotal = 0;

  
    var arrResult = nlapiSearchRecord('customrecord_liv_cc_trxs', null, arrFilter, arrColumns);
  	nlapiLogExecution('DEBUG', 'VALUE', 'Start Script');
  	
  

  if(arrResult)
  {
    for (var i = 0;  i < arrResult.length; i++)
      {
             nlapiLogExecution('DEBUG', 'VALUE', 'Processing arrResult: '+i +' of '+arrResult.length);
             
             var today = new Date();
             var customrecord = arrResult[i];
             
             var currentje = customrecord.getValue('custrecord_liv_cc_ns_je_no');
             var recordid = customrecord.getValue('internalid');
             var amount = customrecord.getValue('custrecord_liv_cc_amount');
	         var vendorid = customrecord.getValue('custrecord_liv_cc_name');
	         var jenum = customrecord.getValue('custrecord_liv_cc_ns_je_no');
             var trxdate = customrecord.getValue('custrecord_liv_cc_post_date'); 
             var controlacct = customrecord.getValue('custrecord_liv_cc_control_account');
             var expenseacct = customrecord.getValue('custrecord_liv_cc_expense_acct');
             var department = customrecord.getValue('custrecord_liv_cc_dept');
             var jememo = customrecord.getValue('custrecord_liv_cc_ns_je_memo');
             var jeamt = customrecord.getValue('custrecord_liv_cc_amount');
             var periodno = customrecord.getValue('custrecord_liv_cc_period_no');
             var subsidiary = customrecord.getValue('custrecord_liv_cc_ns_subsidiary');
     
        
             nlapiLogExecution('DEBUG', 'VALUE', 'Record ID: '+ recordid);
             nlapiLogExecution('DEBUG', 'VALUE', 'Je No: '+ jenum);
             nlapiLogExecution('DEBUG', 'VALUE', 'Je Amt: '+ jeamt);
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
	         	record.setFieldValue('subsidiary', subsidiary); 
	         	
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
	              record.setFieldValue('subsidiary', subsidiary);   
	         }
	        /*
	         // JE Header
	         record.setFieldValue('tranid', jenum);
	         record.setFieldValue('externalid', jenum);
	         record.setFieldValue('trandate', formatDate(trxdate));
	         record.setFieldValue('memo', jenum); 
	         record.setFieldValue('subsidiary', 1); 
	         */
	             
	         // JE Expense Line    
	         record.selectNewLineItem('line');
	         if (jeamt < 0)
	         {
	            nlapiLogExecution('DEBUG', 'ACTIVITY', 'Insert Expense Line');
	            var debitamt = Math.abs(jeamt);
                record.selectNewLineItem('line');  
                record.setCurrentLineItemValue('line', 'account', expenseacct);
			    record.setCurrentLineItemValue('line', 'department', department);
			    record.setCurrentLineItemValue('line', 'entity',  vendorid);
                record.setCurrentLineItemValue('line', 'memo',  jememo);
                record.setCurrentLineItemValue('line', 'debit', Math.abs(parseFloat(debitamt)));
                record.commitLineItem('line'); 
              }
             else
             {
                nlapiLogExecution('DEBUG', 'ACTIVITY', 'Insert Expense Line');
                var creditamt = Math.abs(jeamt);
                record.selectNewLineItem('line');  
                record.setCurrentLineItemValue('line', 'account', expenseacct);
			    record.setCurrentLineItemValue('line', 'department', department);
			    record.setCurrentLineItemValue('line', 'entity',  vendorid);
                record.setCurrentLineItemValue('line', 'memo',  jememo);
                record.setCurrentLineItemValue('line', 'credit', Math.abs(parseFloat(creditamt)));
                record.commitLineItem('line'); 
             }
             
             // JE Control Line
              record.selectNewLineItem('line');
              record.setCurrentLineItemValue('line', 'account', controlacct);
                
              if (controlacct == 164) //comerica card
              {
                  record.setCurrentLineItemValue('line', 'entity',  1451); // Vendor = Comerica Commercial Card
              }

              if (jeamt < 0)
              {           
                  nlapiLogExecution('DEBUG', 'ACTIVITY', 'Insert Control Line');
                  var creditamt = Math.abs(jeamt) ;
                  record.setCurrentLineItemValue('line', 'memo',  jememo);
                  record.setCurrentLineItemValue('line', 'credit', Math.abs(parseFloat(creditamt)));
                  record.commitLineItem('line'); 
              }
              else
              {
                  nlapiLogExecution('DEBUG', 'ACTIVITY', 'Insert Control Line');
                  var debitamt = Math.abs(jeamt) ;
                  record.setCurrentLineItemValue('line', 'memo',  jememo);
                  record.setCurrentLineItemValue('line', 'debit', Math.abs(parseFloat(debitamt)));
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
             
     } // end arrResult                  
                
             var strRecID = nlapiSubmitRecord(record, true, true);   // save last record
             nlapiLogExecution('DEBUG', 'VALUE', 'Journal Internal ID : '+ strRecID);
             
             var updateid = updateCCtrxs() ; //update je internal id in cc trxs
             
         
  }catch(error) 
  {
	   if (error.getDetails != undefined) 
	   {
		   nlapiLogExecution('DEBUG', 'Process Error for CC Transactions Internal ID : '+recordid, error.getCode() + ': ' + error.getDetails());
		   var currentrecord = nlapiLoadRecord('customrecord_liv_cc_trxs',recordid, {recordmode: 'dynamic'});
           currentrecord.setFieldValue('custrecord_liv_cc_je_creation_error_msg',error.getCode() + ': ' + error.getDetails());
           var strCustomID = nlapiSubmitRecord(currentrecord, true, true); 
		   throw nlapiCreateError('Create JE CC Error','',recordid,error.getCode(), error.toString());
	   }
	   else 
	   {    	
			nlapiLogExecution('DEBUG', 'Unexpected Error for CC Transactions Internal ID : '+recordid, error.toString());
			var currentrecord = nlapiLoadRecord('customrecord_liv_cc_trxs',recordid, {recordmode: 'dynamic'});
            currentrecord.setFieldValue('custrecord_liv_cc_je_creation_error_msg',error.toString());
            var strCustomID = nlapiSubmitRecord(currentrecord, true, true); 
			throw nlapiCreateError('Create JE CC Error ','',+recordid,'Undefined Error Code', error.toString());
	   }
  }
} // end function CreateJE

function updateCCtrxs()
/********************************************************************************************/
/*** Purpose: Update CC trxs function                                                     ***/
/********************************************************************************************/
{
 try
 {
   var arrFilter = new Array(); 
   var today = new Date(); 
    
   	
    arrFilter[0] = new nlobjSearchFilter('custrecord_liv_cc_ns_je_internal_id', null, 'isempty',  'null' ); 
    arrFilter[1] = new nlobjSearchFilter('custrecord_liv_cc_auto_create_je', null, 'is',  'T' ); 

	//Define search columns
	
	var arrColumns = new Array();
	
	arrColumns.push(new nlobjSearchColumn('internalid'));
	arrColumns.push(new nlobjSearchColumn('custrecord_liv_cc_control_account'));
	arrColumns.push(new nlobjSearchColumn('custrecord_liv_cc_date'));
	arrColumns.push(new nlobjSearchColumn('custrecord_liv_cc_post_date'));
	arrColumns.push(new nlobjSearchColumn('custrecord_liv_cc_amount'));
	arrColumns.push(new nlobjSearchColumn('custrecord_liv_cc_name'));
	arrColumns.push(new nlobjSearchColumn('custrecord_liv_cc_expense_acct'));
	arrColumns.push(new nlobjSearchColumn('custrecord_liv_cc_dept'));
	arrColumns.push(new nlobjSearchColumn('custrecord_liv_cc_ns_je_no'));
	arrColumns.push(new nlobjSearchColumn('custrecord_liv_cc_ns_je_memo')); 
	arrColumns.push(new nlobjSearchColumn('custrecord_liv_cc_period_no'));  

    var arrResult = nlapiSearchRecord('customrecord_liv_cc_trxs', null, arrFilter, arrColumns);
  	nlapiLogExecution('DEBUG', 'ACTIVITY', 'Start Update Script');
  	
  	if(arrResult)
    {
        for (var i = 0;  i < arrResult.length; i++)
      {
      
        var jeFilter = new Array(); 
        var jeColumns = new Array();
        var customrecord = arrResult[i];
             
        var jenum = customrecord.getValue('custrecord_liv_cc_ns_je_no');
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
	
              var currentrecord = nlapiLoadRecord('customrecord_liv_cc_trxs',recordid, {recordmode: 'dynamic'});
              currentrecord.setFieldValue('custrecord_liv_cc_ns_je_internal_id', jeinternalid);
              currentrecord.setFieldValue('custrecord_liv_cc_ns_je_creation_date', today); 
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
		nlapiLogExecution('DEBUG', 'JE creation error for CC Trx. internal id: '+recordid, error.getCode() + ': ' + error.getDetails());
		var currentrecord = nlapiLoadRecord('customrecord_liv_cc_trxs',recordid, {recordmode: 'dynamic'});
        currentrecord.setFieldValue('custrecord_liv_cc_je_creation_error_msg', error.getCode() + ': ' + error.getDetails());
        nlapiSubmitRecord(currentrecord, true, true);
	}
	else 
	{    
		nlapiLogExecution('DEBUG', 'Unexpected JE creation error for CC Trx. internal id : '+recordid, error.toString());
		var currentrecord = nlapiLoadRecord('customrecord_liv_cc_trxs',recordid, {recordmode: 'dynamic'});
        currentrecord.setFieldValue('custrecord_liv_cc_je_creation_error_msg', error.toString());
        nlapiSubmitRecord(currentrecord, true, true);
	}
}


	nlapiLogExecution('DEBUG', 'VALUE', 'Usage: '+nlapiGetContext().getRemainingUsage());
	nlapiLogExecution('DEBUG', 'ACTIVITY', 'update CC Trxs Ended Sucessfully');
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


