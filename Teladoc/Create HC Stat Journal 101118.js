//last update date: 09/24/18 Create Stat headcount journal NS-212


function CreateHCStatJournal()
{
 try
 {
	 // Search Stat journal for the same month
       
        // Get the value for paramters
       var asofdate = nlapiGetContext().getSetting('SCRIPT', 'custscript_hc_as_of_date');
       var subsidiary = nlapiGetContext().getSetting('SCRIPT', 'custscript_hc_subsidiary');
       var hcaccount = nlapiGetContext().getSetting('SCRIPT', 'custscript_hc_account');
       var jebatchnumber = nlapiGetContext().getSetting('SCRIPT', 'custscript_hc_je_batch_number');
       var savesearchid = nlapiGetContext().getSetting('SCRIPT', 'custscript_hc_save_search_id');
      
       var userid = nlapiGetUser();
  
       nlapiLogExecution('DEBUG','param-as of date: '+asofdate) ;
       nlapiLogExecution('DEBUG','param-subsidiary: '+subsidiary) ;
       nlapiLogExecution('DEBUG','param-hcaccount: '+hcaccount) ;
       nlapiLogExecution('DEBUG','param-save search id: '+savesearchid) ;
 
       
	   var today = new Date();
	   var lineno = 0;
	   var prevdocno = null;
    
       var arrFilter = new Array(); 
       arrFilter[0] = new nlobjSearchFilter('trandate', null, 'on', asofdate); 
       arrFilter[1] = new nlobjSearchFilter('subsidiary', null, 'is', subsidiary  ); 
       arrFilter[2] = new nlobjSearchFilter('custbody_liv_je_batch_number', null, 'is', jebatchnumber  ); 
 
      
       
        //Define search columns
	
	    var arrColumns = new Array();
		arrColumns.push(new nlobjSearchColumn('tranid'));
	   
  
       var arrResult = nlapiSearchRecord('statisticaljournalentry', null, arrFilter, arrColumns);

       if(arrResult) //  found 
        {
          nlapiLogExecution('DEBUG','In arrResult') ;
           for (var i = 0;  i < arrResult.length; i++)
           {
              nlapiLogExecution('DEBUG','Found existing stat journal') ;
              var current_rec = arrResult[i];
              var rec_id = current_rec.getId();
              throw nlapiCreateError('Statistical Journal for the same date exists. Internal ID '+ rec_id);
           }
         }
         

	
	   var searchFilter = new Array(); 
	   
       searchFilter[0] = new nlobjSearchFilter('custrecord_liv_emp_as_of_date', null, 'on', asofdate); 
       searchFilter[1] = new nlobjSearchFilter('custrecord_liv_ns_subsidiary', null, 'is', subsidiary  ); 
       searchFilter[2] = new nlobjSearchFilter('custrecord_liv_emp_hire_date', null, 'onorbefore', asofdate  ); 
       
	   //var searchresults = nlapiSearchRecord('customrecord_liv_employee_snapshot','customsearch_liv_emp_snapshpt_hc', searchFilter , null);
       var searchresults = nlapiSearchRecord('customrecord_liv_employee_snapshot', savesearchid , searchFilter , null);

       if(searchresults) 
       { 
       
           for(var z=0; z < searchresults.length; z++) 
           { 

               
			   var results=searchresults[z];
               var columns=results.getAllColumns();  

               
			   var trandate =results.getValue(columns[0]); 
               var subsidiary = results.getValue(columns[1]);  
               var department = results.getValue(columns[2]);  
               var headcount = results.getValue(columns[3]);  
               
               nlapiLogExecution('DEBUG','trandate :'+trandate) ;
               nlapiLogExecution('DEBUG','subsidiary :'+subsidiary) ;
               nlapiLogExecution('DEBUG','department :'+department) ;
               nlapiLogExecution('DEBUG','headcount :'+headcount) ;
      
		  
			  // Create statistical journal
			  	try
		        {

		          if (z == 0) //first record
		          {	  
		          
		            var statrecord = nlapiCreateRecord('statisticaljournalentry', {recordmode:'dynamic'});
		            var reversaldate = getreversaldate(asofdate);
				
				    nlapiLogExecution('DEBUG','Start Create Stat Journal') ;
		            nlapiLogExecution('DEBUG','Start Create Header') ;
				    statrecord.setFieldValue('trandate', trandate);
				    statrecord.setFieldValue('subsidiary', subsidiary);
	                statrecord.setFieldText('custbody_liv_journal_entry_type','Routine');
	                statrecord.setFieldValue('custbody_liv_je_batch_number',jebatchnumber);
	                statrecord.setFieldText('unitstype','Headcount');
	                statrecord.setFieldValue('reversaldate',reversaldate);
	               
	                
	              }
	              
	              
	              //Lines
	                statrecord.selectNewLineItem('line');
	                statrecord.setCurrentLineItemValue('line', 'account', hcaccount);
	                statrecord.setCurrentLineItemValue('line', 'department', department);
	                statrecord.setCurrentLineItemValue('line', 'debit', headcount);
                    statrecord.commitLineItem('line'); 

                    
					nlapiLogExecution('DEBUG', 'VALUE', 'z value : '+z);
					
                }catch(error)
		        {
						if (error.getDetails != undefined) 
					   {
							nlapiLogExecution('DEBUG', 'Stat journal creation error: ', error.getCode() + ': ' + error.getDetails());
							
						
					   }
					   else 
					   {    
							nlapiLogExecution('DEBUG', 'Unexpected Stat journal creation error : ', error.toString());
							
							
					   }
		        }
		           
			  //  var strRecID = nlapiSubmitRecord(statrecord, true, true);
			  
			  
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
             
              var strRecID = nlapiSubmitRecord(statrecord, true, true);
              
              
        } // end if
  	
  }catch(error) 
  {
	   if (error.getDetails != undefined) 
	   {
		  nlapiLogExecution('DEBUG', 'Stat journal creation error : ', error.getCode()  + error.getDetails());
		  throw nlapiCreateError('Stat Journal Creation Error : ',error.getCode(), error.toString());
	   }
	   else 
	   {    	
		  nlapiLogExecution('DEBUG', 'Unexpected Stat journal creation : ', error.toString());
		  throw nlapiCreateError('Create Stat Journal ','Undefined Error Code', error.toString());
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



