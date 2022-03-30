/* NETSUITE-XX */
//last update date: 04/18/18
//last update date: 06/22/18 - Add parameter
//last update date: 10/03/18 - Add JE Batch Number
//last update date: 10/24/18 - change sort order of data

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
    
    //for debugging only
    //arrFilter[3] = new nlobjSearchFilter('custrecord_liv_dfc_amort_je_name', null, 'is', 'DFC Amort. WK-2018-10-3M'  ); 
    
    


	//Define search columns
	
	var arrColumns = new Array(); 
	arrColumns.push(new nlobjSearchColumn('custrecord_liv_dfc_amort_je_name').setSort(false)); //102418
	//arrColumns.push(new nlobjSearchColumn('custrecord_liv_dfc_amort_je_name'));
	//arrColumns.push(new nlobjSearchColumn('internalid').setSort(false));
	arrColumns.push(new nlobjSearchColumn('custrecord_liv_dfc_doc_number'));
	arrColumns.push(new nlobjSearchColumn('custrecord_liv_dfc_type'));
	arrColumns.push(new nlobjSearchColumn('custrecord_liv_dfc_date'));
	arrColumns.push(new nlobjSearchColumn('custrecord_liv_dfc_account'));
	arrColumns.push(new nlobjSearchColumn('custrecord_liv_dfc_contra_account'));
	arrColumns.push(new nlobjSearchColumn('custrecord_liv_dfc_name'));
	arrColumns.push(new nlobjSearchColumn('custrecord_liv_dfc_amort_template'));
	arrColumns.push(new nlobjSearchColumn('custrecord_liv_dfc_amort_start_date')); 
	arrColumns.push(new nlobjSearchColumn('custrecord_liv_dfc_billable'));  
	arrColumns.push(new nlobjSearchColumn('custrecord_liv_dfc_subsidiary')); 
	arrColumns.push(new nlobjSearchColumn('custrecord_liv_dfc_amount'));
	arrColumns.push(new nlobjSearchColumn('custrecord_liv_dfc_deferred_cogs_acct'));
	arrColumns.push(new nlobjSearchColumn('custrecord_liv_dfc_client_code'));
	arrColumns.push(new nlobjSearchColumn('internalid'));

 

 
    var previousje = null ;
    var previousname = null;
    var previousclientcode = null ;
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
             
             nlapiLogExecution('DEBUG', 'VALUE', 'Record ID: '+ recordid);
             nlapiLogExecution('DEBUG', 'VALUE', 'Je No: '+ jenum);
             nlapiLogExecution('DEBUG', 'VALUE', 'Je Amt: '+ jeamt);
             nlapiLogExecution('DEBUG', 'VALUE', 'i : '+ i);
             nlapiLogExecution('DEBUG', 'VALUE', 'Current Je: '+ currentje);
             nlapiLogExecution('DEBUG', 'VALUE', 'Previous Je: '+ previousje);
     
        
             
             if (i ==0)
             { 
                previousje = currentje ;
                previousname = name;
                previousclientcode = clientcode;
                nlapiLogExecution('DEBUG', 'ACTIVITY', 'nlapiCreateRecord');
	            var record = nlapiCreateRecord('journalentry', {recordmode:'dynamic'});   
	            
	            // JE Header
                record.setFieldValue('tranid', jenum.substring(0, 44));
	         	record.setFieldValue('externalid', jenum.substring(0, 44) );
	         	record.setFieldValue('trandate', formatDate(trxdate)); 
	         	record.setFieldValue('subsidiary', subsidiary);  
	         	record.setFieldValue('custbody_liv_je_batch_number',p_jebatchnumber);
	         	record.setFieldText('custbody_liv_journal_entry_type','Routine');

             }
             
	         
	         if ((previousje != currentje) & (i !=0))
	         {
	              nlapiLogExecution('DEBUG', 'ACTIVITY', 'New JE record - Save Previous Record');
	              nlapiLogExecution('DEBUG', 'VALUE', 'controltotal in Save Previous Record: '+ controltotal);
	              nlapiLogExecution('DEBUG', 'VALUE', 'Current Je: '+ currentje);
                  nlapiLogExecution('DEBUG', 'VALUE', 'Previous Je: '+ previousje);
                  
	              previousje = currentje ;
	              
	               //Insert control line
	              record.selectNewLineItem('line');
                  record.setCurrentLineItemValue('line', 'account', controlacct);
            
                  if (jeamt < 0)
                  {           
                     nlapiLogExecution('DEBUG', 'ACTIVITY', 'Insert Control Line');
                     //var creditamt = Math.abs(jeamt) ;
                     record.setCurrentLineItemValue('line', 'entity',  previousname);  //alex
                     record.setCurrentLineItemText('line', 'schedule',  schedule);
                     record.setCurrentLineItemText('line', 'startdate',  startdate);
                     record.setCurrentLineItemText('line', 'custcol_liv_invoice_client_code',  previousclientcode);
                    // record.setCurrentLineItemValue('line', 'credit', Math.abs(parseFloat(controltotal.toFixed(2))));
                     record.setCurrentLineItemValue('line', 'credit', Math.abs(parseFloat(controltotal.toFixed(2))));
                     record.commitLineItem('line'); 
                  }
                 else
                 {
                     nlapiLogExecution('DEBUG', 'ACTIVITY', 'Insert Control Line');
                     //var debitamt = Math.abs(jeamt) ;
                     record.setCurrentLineItemValue('line', 'entity',  previousname);
                     record.setCurrentLineItemText('line', 'schedule',  schedule);
                     record.setCurrentLineItemText('line', 'startdate',  startdate);
                     record.setCurrentLineItemText('line', 'custcol_liv_invoice_client_code',  previousclientcode);
                     record.setCurrentLineItemValue('line', 'debit', Math.abs(parseFloat(controltotal.toFixed(2))));
                     record.commitLineItem('line');  
                  }
                  
	              previousname = name;
                  previousclientcode = clientcode;
	              
	              var strRecID = nlapiSubmitRecord(record, true, true);
	              nlapiLogExecution('DEBUG', 'VALUE', 'Journal Internal ID : '+ strRecID);
	              
	              nlapiLogExecution('DEBUG', 'ACTIVITY', 'nlapiCreateRecord');
	              var record = nlapiCreateRecord('journalentry', {recordmode:'dynamic'}); 
	              
	              controltotal = 0;

	           // New JE Header
                  record.setFieldValue('tranid', jenum.substring(0, 44));
	         	  record.setFieldValue('externalid', jenum.substring(0, 44) );
	         	  record.setFieldValue('trandate', formatDate(trxdate)); 
	         	  record.setFieldValue('subsidiary', subsidiary);  
	         	  record.setFieldValue('custbody_liv_je_batch_number',p_jebatchnumber);
	         	  record.setFieldText('custbody_liv_journal_entry_type','Routine');
	         }
	         
	         
	             
	         // JE Expense Line    
	         record.selectNewLineItem('line');
	         if (jeamt < 0)
	         {
	            nlapiLogExecution('DEBUG', 'ACTIVITY', 'JEAMT < 0 : Insert Expense Line');
	              
	            var debitamt = Math.abs(jeamt);
	            //var debitamt = parseFloat(jeamt);
	            nlapiLogExecution('DEBUG', 'VALUE', 'debitamt : '+ debitamt); 
	            nlapiLogExecution('DEBUG', 'VALUE', 'parseFloat(debitamt) : '+  parseFloat(debitamt));
	            
	            controltotal = parseFloat(controltotal) + parseFloat(jeamt) ;
	            nlapiLogExecution('DEBUG', 'VALUE', 'controltotal : '+ controltotal); 
	            
                record.selectNewLineItem('line');  
                record.setCurrentLineItemValue('line', 'account', expenseacct);
			    record.setCurrentLineItemValue('line', 'entity',  name);
                record.setCurrentLineItemValue('line', 'memo',  sourcedoc);  
                record.setCurrentLineItemText('line', 'custcol_liv_invoice_client_code',  clientcode);
                record.setCurrentLineItemValue('line', 'debit', Math.abs(parseFloat(debitamt)));
                //record.setCurrentLineItemValue('line', 'debit', parseFloat(debitamt));
                record.commitLineItem('line'); 
              }
             else
             {
                nlapiLogExecution('DEBUG', 'ACTIVITY', 'JEAMT > 0 : Insert Expense Line');
                 
                var creditamt = Math.abs(jeamt);
                //var creditamt = parseFloat(jeamt);
                nlapiLogExecution('DEBUG', 'VALUE', 'creditamt : '+ creditamt); 
	            nlapiLogExecution('DEBUG', 'VALUE', 'parseFloat(creditamt) : '+  parseFloat(jeamt));
                
                //controltotal = parseFloat(controltotal) + parseFloat(debitamt) ;
                controltotal = parseFloat(controltotal) + parseFloat(creditamt) ;
                nlapiLogExecution('DEBUG', 'VALUE', 'controltotal : '+ controltotal);
                
                record.selectNewLineItem('line');  
                record.setCurrentLineItemValue('line', 'account', expenseacct);
			    record.setCurrentLineItemValue('line', 'entity',  name);
                record.setCurrentLineItemValue('line', 'memo',  sourcedoc);  
                record.setCurrentLineItemText('line', 'custcol_liv_invoice_client_code',  clientcode);
                record.setCurrentLineItemValue('line', 'credit', Math.abs(parseFloat(creditamt)));
                //record.setCurrentLineItemValue('line', 'credit', parseFloat(creditamt));
                record.commitLineItem('line'); 
             }
             
             nlapiLogExecution('DEBUG', 'VALUE', 'arrResult.length - 1 : '+ (arrResult.length - 1));
             if (i == (arrResult.length - 1)) //last line
             {
                   //Insert control line
	              record.selectNewLineItem('line');
                  record.setCurrentLineItemValue('line', 'account', controlacct);
                  
                   nlapiLogExecution('DEBUG', 'VALUE', 'controltotal upon saving JE : '+ controltotal); 
                
                  if (jeamt < 0)
                  {           
                     nlapiLogExecution('DEBUG', 'ACTIVITY', 'Insert Control Line');
                     //var creditamt = Math.abs(jeamt) ;
                     record.setCurrentLineItemValue('line', 'entity',  previousname);
                     record.setCurrentLineItemText('line', 'schedule',  schedule);
                     record.setCurrentLineItemText('line', 'startdate',  startdate);
                     record.setCurrentLineItemText('line', 'custcol_liv_invoice_client_code',  previousclientcode);
                     record.setCurrentLineItemValue('line', 'credit', Math.abs(parseFloat(controltotal.toFixed(2))));
                     record.commitLineItem('line'); 
                  }
                 else
                 {
                     nlapiLogExecution('DEBUG', 'ACTIVITY', 'Insert Control Line');
                     //var debitamt = Math.abs(jeamt) ;
                     record.setCurrentLineItemValue('line', 'entity',  previousname);
                     record.setCurrentLineItemText('line', 'schedule',  schedule);
                     record.setCurrentLineItemText('line', 'startdate',  startdate);
                     record.setCurrentLineItemText('line', 'custcol_liv_invoice_client_code',  previousclientcode);
                     record.setCurrentLineItemValue('line', 'debit', Math.abs(parseFloat(controltotal.toFixed(2))));
                     record.commitLineItem('line');  
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
             
     } // end arrResult                  
                
             var strRecID = nlapiSubmitRecord(record, true, true);   // save last record
             nlapiLogExecution('DEBUG', 'VALUE', 'Journal Internal ID : '+ strRecID);
             
             var updateid = updateDefCOGStrxs(p_period, p_amorttemplate) ; //update je internal id in cc trxs
                 
         
  }catch(error) 
  {
	   if (error.getDetails != undefined) 
	   {
		   nlapiLogExecution('DEBUG', 'Process Error for Internal ID : '+recordid, error.getCode() + ': ' + error.getDetails());
		   var currentrecord = nlapiLoadRecord('customrecord_liv_deferred_cogs',recordid, {recordmode: 'dynamic'});
           currentrecord.setFieldValue('custrecord_liv_dfc_ns_je_creation_error',error.getCode() + ': ' + error.getDetails());
           var strCustomID = nlapiSubmitRecord(currentrecord, true, true); 
		   throw nlapiCreateError('Create Amort. JE Error','',recordid,error.getCode(), error.toString());
	   }
	   else 
	   {    	
			nlapiLogExecution('DEBUG', 'Unexpected Error for CC Internal ID : '+recordid, error.toString());
			var currentrecord = nlapiLoadRecord('customrecord_liv_deferred_cogs',recordid, {recordmode: 'dynamic'});
            currentrecord.setFieldValue('custrecord_liv_dfc_ns_je_creation_error',error.toString());
            var strCustomID = nlapiSubmitRecord(currentrecord, true, true); 
			throw nlapiCreateError('Create Amort. JE Error ','',+recordid,'Undefined Error Code', error.toString());
	   }
  }
} // end function CreateJE

function updateDefCOGStrxs(p_period, p_amorttemplate)
/********************************************************************************************/
/*** Purpose: Update CC trxs function                                                     ***/
/********************************************************************************************/
{
 try
 {
   var arrFilter = new Array(); 
   var today = new Date(); 
    
    
    arrFilter[0] = new nlobjSearchFilter('custrecord_liv_dfc_ns_je_internal_id', null, 'isempty',  'null' ); 
    arrFilter[1] = new nlobjSearchFilter('custrecord_liv_dfc_period', null, 'is', p_period  ); 
    arrFilter[2] = new nlobjSearchFilter('custrecord_liv_dfc_amort_template', null, 'is', p_amorttemplate  ); 
    
    //for debugging only
    //arrFilter[3] = new nlobjSearchFilter('custrecord_liv_dfc_amort_je_name', null, 'is', 'DFC Amort. WK-2018-10-3M	'  ); 
  

	//Define search columns
	
	//Define search columns
	
	var arrColumns = new Array(); 
	arrColumns.push(new nlobjSearchColumn('custrecord_liv_dfc_amort_je_name').setSort(false)); //102418
	//arrColumns.push(new nlobjSearchColumn('custrecord_liv_dfc_amort_je_name'));
	//arrColumns.push(new nlobjSearchColumn('internalid').setSort(false));
	arrColumns.push(new nlobjSearchColumn('custrecord_liv_dfc_doc_number'));
	arrColumns.push(new nlobjSearchColumn('custrecord_liv_dfc_type'));
	arrColumns.push(new nlobjSearchColumn('custrecord_liv_dfc_date'));
	arrColumns.push(new nlobjSearchColumn('custrecord_liv_dfc_account'));
	arrColumns.push(new nlobjSearchColumn('custrecord_liv_dfc_contra_account'));
	arrColumns.push(new nlobjSearchColumn('custrecord_liv_dfc_name'));
	arrColumns.push(new nlobjSearchColumn('custrecord_liv_dfc_amort_template'));
	arrColumns.push(new nlobjSearchColumn('custrecord_liv_dfc_amort_start_date')); 
	arrColumns.push(new nlobjSearchColumn('custrecord_liv_dfc_billable'));  
	arrColumns.push(new nlobjSearchColumn('custrecord_liv_dfc_subsidiary')); 
	arrColumns.push(new nlobjSearchColumn('custrecord_liv_dfc_amount'));
	arrColumns.push(new nlobjSearchColumn('custrecord_liv_dfc_deferred_cogs_acct'));
	arrColumns.push(new nlobjSearchColumn('custrecord_liv_dfc_client_code'));
	arrColumns.push(new nlobjSearchColumn('internalid'));
	arrColumns.push(new nlobjSearchColumn('custrecord_liv_dfc_ns_je_name'));

 
  
    var arrResult = nlapiSearchRecord('customrecord_liv_deferred_cogs', null, arrFilter, arrColumns);
  	nlapiLogExecution('DEBUG', 'VALUE', 'Start Update Script');
  	
  	if(arrResult)
    {
        for (var i = 0;  i < arrResult.length; i++)
      {
      
        var jeFilter = new Array(); 
        var jeColumns = new Array();
        var customrecord = arrResult[i];
             
        var jenum = customrecord.getValue('custrecord_liv_dfc_amort_je_name');
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
              var jerecord = jeResult[0]; 
              var jeinternalid = jerecord.getValue('internalid');
               nlapiLogExecution('DEBUG', 'VALUE', 'update je internal id '+jeinternalid); 

             }

         }
         
         	
              var currentrecord = nlapiLoadRecord('customrecord_liv_deferred_cogs',recordid, {recordmode: 'dynamic'});
              currentrecord.setFieldValue('custrecord_liv_dfc_ns_je_internal_id', jeinternalid);
              currentrecord.setFieldValue('custrecord_liv_dfc_ns_je_creation_date', today); 
              currentrecord.setFieldValue('custrecord_liv_dfc_ns_je_name', jeinternalid); 
              var strCustomID = nlapiSubmitRecord(currentrecord, true, true); 
              
              
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
		nlapiLogExecution('DEBUG', 'JE creation error for internal id: '+recordid, error.getCode() + ': ' + error.getDetails());
		var currentrecord = nlapiLoadRecord('customrecord_liv_deferred_cogs',recordid, {recordmode: 'dynamic'});
        currentrecord.setFieldValue('custrecord_liv_dfc_ns_je_creation_error', error.getCode() + ': ' + error.getDetails());
        nlapiSubmitRecord(currentrecord, true, true);
	}
	else 
	{    
		nlapiLogExecution('DEBUG', 'Unexpected JE creation error for internal id : '+recordid, error.toString());
		var currentrecord = nlapiLoadRecord('customrecord_liv_deferred_cogs',recordid, {recordmode: 'dynamic'});
        currentrecord.setFieldValue('custrecord_liv_dfc_ns_je_creation_error', error.toString());
        nlapiSubmitRecord(currentrecord, true, true);
	}
}


	nlapiLogExecution('DEBUG', 'VALUE', 'Usage: '+nlapiGetContext().getRemainingUsage());
	nlapiLogExecution('DEBUG', 'ACTIVITY', 'update Trxs Ended Sucessfully');
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


