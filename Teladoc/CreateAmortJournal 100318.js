/* NETSUITE-XX */
//last update date: 04/18/18
//last update date: 06/22/18 - Add parameter
//last update date: 10/03/18 - Add JE Batch Number

function CreateAmortJournal()
{
 try
 {
   var arrFilter = new Array(); 
   var today = new Date(); 
      
        // Get the value of the Date parameter 
    var p_period = nlapiGetContext().getSetting('SCRIPT', 'custscript_cogs_period');
    var p_jebatchnumber = nlapiGetContext().getSetting('SCRIPT', 'custscript_cogs_je_batch_number');
    var p_amorttemplate = nlapiGetContext().getSetting('SCRIPT', 'custscript_cogs_amort_template');
    
    nlapiLogExecution('DEBUG', 'VALUE', 'period : '+p_period);
    nlapiLogExecution('DEBUG', 'VALUE', 'je batch number : '+p_jebatchnumber);
    nlapiLogExecution('DEBUG', 'VALUE', 'amort template : '+p_amorttemplate);
  
    
   	
    arrFilter[0] = new nlobjSearchFilter('custrecord_liv_dfc_ns_je_internal_id', null, 'isempty',  'null' ); 
    arrFilter[1] = new nlobjSearchFilter('custrecord_liv_dfc_period', null, 'is', p_period  ); 
    arrFilter[2] = new nlobjSearchFilter('custrecord_liv_dfc_amort_template', null, 'is', p_amorttemplate  ); 
    
    //arrFilter[1] = new nlobjSearchFilter('custrecord_liv_cc_auto_create_je', null, 'is',  'T' ); 

	//Define search columns
	
	var arrColumns = new Array(); 
	arrColumns.push(new nlobjSearchColumn('internalid').setSort(false));
	arrColumns.push(new nlobjSearchColumn('custrecord_liv_dfc_doc_number'));
	arrColumns.push(new nlobjSearchColumn('custrecord_liv_dfc_type'));
	arrColumns.push(new nlobjSearchColumn('custrecord_liv_dfc_date'));
	arrColumns.push(new nlobjSearchColumn('custrecord_liv_dfc_account'));
	arrColumns.push(new nlobjSearchColumn('custrecord_liv_dfc_contra_account'));
	arrColumns.push(new nlobjSearchColumn('custrecord_liv_dfc_name'));
	arrColumns.push(new nlobjSearchColumn('custrecord_liv_dfc_amort_je_name'));
	arrColumns.push(new nlobjSearchColumn('custrecord_liv_dfc_amort_template'));
	arrColumns.push(new nlobjSearchColumn('custrecord_liv_dfc_amort_start_date')); 
	arrColumns.push(new nlobjSearchColumn('custrecord_liv_dfc_billable'));  
	arrColumns.push(new nlobjSearchColumn('custrecord_liv_dfc_subsidiary')); 
	arrColumns.push(new nlobjSearchColumn('custrecord_liv_dfc_amount'));
	arrColumns.push(new nlobjSearchColumn('custrecord_liv_dfc_deferred_cogs_acct'));
	arrColumns.push(new nlobjSearchColumn('custrecord_liv_dfc_client_code'));

 
    var previousje = null ;
    var firstline = false ;
    var newheader = false;
    var editje = false;
    var recordid = 0;
    var jeid = 0;
    var previousjeid = 0;
    var lastrecord = false;
    var controltotal = 0;

  
    var arrResult = nlapiSearchRecord('customrecord_liv_deferred_cogs', null, arrFilter, arrColumns);
  	nlapiLogExecution('DEBUG', 'VALUE', 'Start Script');
  	
  

  if(arrResult)
  {
    for (var i = 0;  i < arrResult.length; i++)
      {
             nlapiLogExecution('DEBUG', 'VALUE', 'Processing arrResult: '+i +' of '+arrResult.length);
             
             var today = new Date();
             var customrecord = arrResult[i];
             
             var currentje = customrecord.getValue('custrecord_liv_dfc_amort_je_name');
             var type = customrecord.getValue('custrecord_liv_dfc_type');
             var recordid = customrecord.getValue('internalid');
             var amount = customrecord.getValue('custrecord_liv_dfc_amount');
	         var name = customrecord.getValue('custrecord_liv_dfc_name');
	         var jenum = customrecord.getValue('custrecord_liv_dfc_amort_je_name');
             var trxdate = customrecord.getValue('custrecord_liv_dfc_date'); 
             var controlacct = customrecord.getValue('custrecord_liv_dfc_deferred_cogs_acct');
             var expenseacct = customrecord.getValue('custrecord_liv_dfc_contra_account');
         
             var sourcedoc = customrecord.getValue('custrecord_liv_dfc_doc_number');
             var jeamt = customrecord.getValue('custrecord_liv_dfc_amount');
             var subsidiary = customrecord.getValue('custrecord_liv_dfc_subsidiary');
             var schedule = customrecord.getValue('custrecord_liv_dfc_amort_template');
             var startdate = customrecord.getValue('custrecord_liv_dfc_amort_start_date');
             var clientcode = customrecord.getValue('custrecord_liv_dfc_client_code');
             
             var externalid = type+recordid ;
     
        
             nlapiLogExecution('DEBUG', 'VALUE', 'Record ID: '+ recordid);
             nlapiLogExecution('DEBUG', 'VALUE', 'Je No: '+ jenum);
             nlapiLogExecution('DEBUG', 'VALUE', 'Je Amt: '+ jeamt);
             nlapiLogExecution('DEBUG', 'VALUE', 'i : '+ i);
             nlapiLogExecution('DEBUG', 'VALUE', 'Current Je: '+ currentje);
             nlapiLogExecution('DEBUG', 'VALUE', 'Previous Je: '+ previousje);
             nlapiLogExecution('DEBUG', 'VALUE', 'current External ID: '+ externalid);
             
              nlapiLogExecution('DEBUG', 'ACTIVITY', 'nlapiCreateRecord');
	          var record = nlapiCreateRecord('journalentry', {recordmode:'dynamic'}); 
             
              // JE Header
	         	record.setFieldValue('tranid', jenum);
	         	record.setFieldValue('externalid', externalid);
	         	record.setFieldValue('trandate', formatDate(trxdate));
	         	record.setFieldValue('memo', sourcedoc); 
	         	record.setFieldValue('subsidiary', subsidiary);  
	         	record.setFieldValue('custbody_liv_je_batch_number',p_jebatchnumber);
	         	record.setFieldText('custbody_liv_journal_entry_type','Routine');
	         	
	          // JE Expense Line    
	         record.selectNewLineItem('line');
	         if (jeamt < 0)
	         {
	            nlapiLogExecution('DEBUG', 'ACTIVITY', 'Insert Expense Line');
	            var debitamt = Math.abs(jeamt);
                record.selectNewLineItem('line');  
                record.setCurrentLineItemValue('line', 'account', expenseacct);
			    record.setCurrentLineItemValue('line', 'entity',  name);
                record.setCurrentLineItemValue('line', 'memo',  sourcedoc);
                //record.setCurrentLineItemValue('line', 'xxx',  clientcode);
                record.setCurrentLineItemValue('line', 'debit', Math.abs(parseFloat(debitamt)));
                record.commitLineItem('line'); 
              }
             else
             {
                nlapiLogExecution('DEBUG', 'ACTIVITY', 'Insert Expense Line');
                var creditamt = Math.abs(jeamt);
                record.selectNewLineItem('line');  
                record.setCurrentLineItemValue('line', 'account', expenseacct);
			    record.setCurrentLineItemValue('line', 'entity',  name);
                record.setCurrentLineItemValue('line', 'memo',  sourcedoc);
                //record.setCurrentLineItemValue('line', 'xxx',  clientcode);
                record.setCurrentLineItemValue('line', 'credit', Math.abs(parseFloat(creditamt)));
                record.commitLineItem('line'); 
             }
             
             // JE Control Line
              record.selectNewLineItem('line');
              record.setCurrentLineItemValue('line', 'account', controlacct);
        

              if (jeamt < 0)
              {           
                  nlapiLogExecution('DEBUG', 'ACTIVITY', 'Insert Control Line');
                  var creditamt = Math.abs(jeamt) ;
                  record.setCurrentLineItemValue('line', 'memo',  sourcedoc);
                  record.setCurrentLineItemValue('line', 'entity',  name);
                  record.setCurrentLineItemText('line', 'schedule',  schedule);
                  record.setCurrentLineItemText('line', 'startdate',  startdate);
                  //record.setCurrentLineItemValue('line', 'xxx',  clientcode);
                  record.setCurrentLineItemValue('line', 'credit', Math.abs(parseFloat(creditamt)));
                  record.commitLineItem('line'); 
              }
              else
              {
                  nlapiLogExecution('DEBUG', 'ACTIVITY', 'Insert Control Line');
                  var debitamt = Math.abs(jeamt) ;
                  record.setCurrentLineItemValue('line', 'memo',  sourcedoc);
                  record.setCurrentLineItemValue('line', 'entity',  name);
                  record.setCurrentLineItemText('line', 'schedule',  schedule);
                  record.setCurrentLineItemText('line', 'startdate',  startdate);
                  //record.setCurrentLineItemValue('line', 'xxx',  clientcode);
                  record.setCurrentLineItemValue('line', 'debit', Math.abs(parseFloat(debitamt)));
                  record.commitLineItem('line');   
               }
            
            var strRecID = nlapiSubmitRecord(record, true, true);   // save last record
            nlapiLogExecution('DEBUG', 'VALUE', 'Journal Internal ID : '+ strRecID);
            
            if (strRecID)
            { 
              var currentrecord = nlapiLoadRecord('customrecord_liv_deferred_cogs',recordid, {recordmode: 'dynamic'});
              currentrecord.setFieldValue('custrecord_liv_dfc_ns_je_internal_id', strRecID);
              currentrecord.setFieldValue('custrecord_liv_dfc_ns_je_creation_date', today); 
              currentrecord.setFieldValue('custrecord_liv_dfc_ns_je_name', strRecID); 
              var strCustomID = nlapiSubmitRecord(currentrecord, true, true); 
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
                
           
             
         
  }catch(error) 
  {
	   if (error.getDetails != undefined) 
	   {
		   nlapiLogExecution('DEBUG', 'Process Error for Deferred COGS Internal ID : '+recordid, error.getCode() + ': ' + error.getDetails());
		   var currentrecord = nlapiLoadRecord('customrecord_liv_deferred_cogs',recordid, {recordmode: 'dynamic'});
           currentrecord.setFieldValue('custrecord_liv_dfc_ns_je_creation_error',error.getCode() + ': ' + error.getDetails());
           var strCustomID = nlapiSubmitRecord(currentrecord, true, true); 
		   throw nlapiCreateError('Create Deferred COGS JE Error','',recordid,error.getCode(), error.toString());
	   }
	   else 
	   {    	
			nlapiLogExecution('DEBUG', 'Unexpected Error for Deferred COGS Internal ID : '+recordid, error.toString());
			var currentrecord = nlapiLoadRecord('customrecord_liv_deferred_cogs',recordid, {recordmode: 'dynamic'});
            currentrecord.setFieldValue('custrecord_liv_dfc_ns_je_creation_error',error.toString());
            var strCustomID = nlapiSubmitRecord(currentrecord, true, true); 
			throw nlapiCreateError('Create Deferred COGS JE Error ','',+recordid,'Undefined Error Code', error.toString());
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


