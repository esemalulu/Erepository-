//last update date: 09/24/18 Create Alloc. Control Journal NS-212


function CreateAllocCtrlJournal()
{
 try
 {
	 // Search Stat journal for the same month
       
        // Get the value for paramters
       var p_subsidiary = nlapiGetContext().getSetting('SCRIPT', 'custscript_alloc_subsidiary');
       var p_date = nlapiGetContext().getSetting('SCRIPT', 'custscript_alloc_date');
       var p_period = nlapiGetContext().getSetting('SCRIPT', 'custscript_alloc_period');
       var p_department = nlapiGetContext().getSetting('SCRIPT', 'custscript_alloc_dept');
       var p_allocinacct = nlapiGetContext().getSetting('SCRIPT', 'custscript_alloc_in_acct');
       var p_allocoutacct = nlapiGetContext().getSetting('SCRIPT', 'custscript_alloc_out_acct');
       var p_jebatchnumber = nlapiGetContext().getSetting('SCRIPT', 'custscript_alloc_je_batch_number');
       
       var userid = nlapiGetUser();
  
       nlapiLogExecution('DEBUG','param-subsidiary: '+p_subsidiary) ;
       nlapiLogExecution('DEBUG','param-period: '+p_date) ;
       nlapiLogExecution('DEBUG','param-department: '+p_department) ;
       nlapiLogExecution('DEBUG','param-alloc in acct: '+p_allocinacct) ;
       nlapiLogExecution('DEBUG','param-alloc out acct: '+p_allocoutacct) ;
       nlapiLogExecution('DEBUG','param-je batch number: '+p_jebatchnumber) ;

       var arrFilter = new Array(); 
       arrFilter[0] = new nlobjSearchFilter('postingperiod', null, 'is', p_period); 
       arrFilter[1] = new nlobjSearchFilter('subsidiary', null, 'is', p_subsidiary  );
       arrFilter[2] = new nlobjSearchFilter('custbody_liv_je_batch_number', null, 'is', p_jebatchnumber );  
 
    
       
        //Define search columns
	
	    var arrColumns = new Array();
		arrColumns.push(new nlobjSearchColumn('tranid'));
	   
  
       var arrResult = nlapiSearchRecord('journalentry', null, arrFilter, arrColumns);

       if(arrResult) //  found 
        {
          nlapiLogExecution('DEBUG','In arrResult') ;
           for (var i = 0;  i < arrResult.length; i++)
           {
              nlapiLogExecution('DEBUG','Found existing stat journal') ;
              var current_rec = arrResult[i];
              var rec_id = current_rec.getId();
              var tranid = current_rec.getValue('tranid');
              throw nlapiCreateError('Allocations Control Journal for the same period exists. Doc Number : '+tranid);
           }
         }
         

	
	   var searchFilter = new Array(); 
	   
       searchFilter[0] = new nlobjSearchFilter('postingperiod', null, 'is', p_period); 
       searchFilter[1] = new nlobjSearchFilter('subsidiary', null, 'is', p_subsidiary  ); 
       searchFilter[2] = new nlobjSearchFilter('department', null, 'is', p_department  ); 
       
       
	   var searchresults = nlapiSearchRecord('transaction','customsearch_liv_alloc_control_journal', searchFilter , null);

       if(searchresults) 
       { 
           for(var z=0; z < searchresults.length; z++) 
           { 
  
			   var results=searchresults[z];
               var columns=results.getAllColumns();  

			   var subsidiary =results.getValue(columns[0]); 
               var period = results.getValue(columns[1]);  
               var department = results.getValue(columns[2]);  
               var accttype = results.getValue(columns[3]);  
               var amount = results.getValue(columns[4]);  
               
               nlapiLogExecution('DEBUG','period :'+period) ;
               nlapiLogExecution('DEBUG','subsidiary :'+subsidiary) ;
               nlapiLogExecution('DEBUG','department :'+department) ;
               nlapiLogExecution('DEBUG','amount :'+amount) ;
      
		  
			  // Create allocation control journal
			  	try
		        {

		          if (z == 0) //first record
		          {	  
		          
		            var jerecord = nlapiCreateRecord('journalentry', {recordmode:'dynamic'});
		         
				    nlapiLogExecution('DEBUG','Start Create Journal') ;
		            nlapiLogExecution('DEBUG','Start Create Header') ;
		            
		            jerecord.setFieldValue('subsidiary', subsidiary);
				    jerecord.setFieldValue('trandate', p_date);
				    jerecord.setFieldValue('postingperiod', p_period);
	                jerecord.setFieldText('custbody_liv_journal_entry_type','Routine');
	                jerecord.setFieldValue('custbody_liv_je_batch_number',p_jebatchnumber);
	                
	                
	              }
	              
	              
	              //Lines
	                jerecord.selectNewLineItem('line');
	                jerecord.setCurrentLineItemValue('line', 'account', p_allocoutacct);
	                jerecord.setCurrentLineItemValue('line', 'department', department);
	                jerecord.setCurrentLineItemValue('line', 'debit', Math.abs(parseFloat(amount)));
                    jerecord.commitLineItem('line'); 
                    
                    jerecord.selectNewLineItem('line');
	                jerecord.setCurrentLineItemValue('line', 'account', p_allocinacct);
	                jerecord.setCurrentLineItemValue('line', 'department', department);
	                jerecord.setCurrentLineItemValue('line', 'credit', Math.abs(parseFloat(amount)));
                    jerecord.commitLineItem('line'); 

                    
					nlapiLogExecution('DEBUG', 'VALUE', 'z value : '+z);
					
                }catch(error)
		        {
						if (error.getDetails != undefined) 
					   {
							nlapiLogExecution('DEBUG', 'Journal creation error: ', error.getCode() + ': ' + error.getDetails());
							
						
					   }
					   else 
					   {    
							nlapiLogExecution('DEBUG', 'Unexpected journal creation error : ', error.toString());
							
							
					   }
		        }

			  
                // Check Usage
			

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
             
              var strRecID = nlapiSubmitRecord(jerecord, true, true);
              
              
        } // end if
        
  	
  }catch(error) 
  {
	   if (error.getDetails != undefined) 
	   {
		  nlapiLogExecution('DEBUG', 'Journal creation error : ', error.getCode()  + error.getDetails());
		  throw nlapiCreateError('Journal Creation Error : ',error.getCode(), error.toString());
	   }
	   else 
	   {    	
		  nlapiLogExecution('DEBUG', 'Unexpected journal creation : ', error.toString());
		  throw nlapiCreateError('Create Journal ','Undefined Error Code', error.toString());
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

function getreversaldate(inputdate) 
{


  var newdate = new Date(inputdate);
   
    newdate.setDate(newdate.getDate() + 1);
    
    var dd = newdate.getDate();
    var mm = newdate.getMonth() + 1;
    var y = newdate.getFullYear();

    var datestring = mm + '/' + dd + '/' + y;
      
  
     return datestring ;
   }  



