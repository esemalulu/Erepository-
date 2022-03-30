function updateconvjirakey() 
{
 try
 {
 
      //Search journal transactions
        nlapiLogExecution('DEBUG', 'ACTIVITY', 'Search Transactions : ');
        
       var arrFilter = new Array(); 
     //  arrFilter[0] = new nlobjSearchFilter('custentity_liv_pccode', null, 'anyof',  [pccodeID] );

       var arrResult = nlapiSearchRecord('transaction','customsearch_liv_update_qb_jira_key', null, null);

    

  		if(arrResult)
  		{
    		for (var i = 0;  i < arrResult.length; i++)
      		{
             	var customrecord = arrResult[i];
             	
         
                var columns=customrecord.getAllColumns();  

                var recordid =customrecord.getValue(columns[0]); 
                var tranid = customrecord.getValue(columns[2]);  ;   
                var trandate = customrecord.getValue(columns[1]);  ; 
        
 
             	nlapiLogExecution('DEBUG', 'VALUE', 'Processing arrResult: '+i +' of '+arrResult.length);
             	nlapiLogExecution('DEBUG', 'VALUE', 'JE Internal ID : '+recordid);
             	nlapiLogExecution('DEBUG', 'VALUE', 'Tranid : '+tranid);
             	nlapiLogExecution('DEBUG', 'VALUE', 'Trandate : '+trandate);
             	
             	
             	var jerecord = nlapiLoadRecord('journalentry', recordid) ;
	            var linecount = jerecord.getLineItemCount('line');

                for(x = 1; x <= linecount; x++)
                {
                    var accountnum = jerecord.getLineItemText('line','account', x);
                  //  var accountnum = nlapiGetLineItemText('line','custcol_liv_qb_name', x);
                    var firstacctchar = accountnum.substring(0,1) ;
                    var qbname = jerecord.getLineItemValue('line','custcol_liv_qb_name', x);
                    var qbnamemapped = jerecord.getLineItemValue('line','custcol_liv_qb_name_mapped', x);
                    
          			nlapiLogExecution('DEBUG', 'VALUE', 'Account Num : '+accountnum);
          			nlapiLogExecution('DEBUG', 'VALUE', 'QB Name : '+qbname);
          			nlapiLogExecution('DEBUG', 'VALUE', 'QB Name Mapped : '+qbnamemapped);
          			nlapiLogExecution('DEBUG', 'VALUE', 'Firstacctchar : '+firstacctchar);
          			
          		   if (qbname)
          		   {	
          			//if((firstacctchar == '1') || (firstacctchar == '4')|| (firstacctchar == '5') || (firstacctchar == '6'))
          			//{
  						 nlapiLogExecution('DEBUG', 'ACTIVITY', 'Update entity');
  						 
  						 var arrCustFilter = new Array(); 
      	                 var arrCustColumns = new Array();   
  
     
      	                 arrCustFilter[0] = new nlobjSearchFilter('custrecord_liv_qb_map_name', null, 'is', qbname );  
  
       					//Define search columns

       					arrCustColumns.push(new nlobjSearchColumn('custrecord_liv_qb_map_ns_customer_id'));
       					arrCustColumns.push(new nlobjSearchColumn('custrecord_liv_qb_map_ns_customer_name'));
       					arrCustColumns.push(new nlobjSearchColumn('custrecord_liv_qb_map_name'));
       					arrCustColumns.push(new nlobjSearchColumn('custrecord_liv_qb_map_jira_key'));

  						var arrCustResult = nlapiSearchRecord('customrecord_liv_qb_name_mapping', null, arrCustFilter, arrCustColumns);
  		
  		                if (arrCustResult)
  		                {
  		                nlapiLogExecution('DEBUG', 'ACTIVITY', 'In arrCustResult');
  		                
  		                  for (var c = 0;  c < arrCustResult.length; c++)
  		                  {
                           var custrecord = arrCustResult[c];
                           var customerid = custrecord.getValue('custrecord_liv_qb_map_ns_customer_id');
                           var customername = custrecord.getValue('custrecord_liv_qb_map_ns_customer_name');
                           var jirakey = custrecord.getValue('custrecord_liv_qb_map_jira_key');
                           
                           
                           nlapiLogExecution('DEBUG', 'VALUE', 'CustomerID : '+customerid);
                           nlapiLogExecution('DEBUG', 'VALUE', 'Customer Name : '+customername);
                           
                           jerecord.setLineItemValue('line', 'custcol_liv_qb_jira_key', x, jirakey);
                          } // end for
                        } // end arrCustResult
                         
                  //   } //end if
                    } // end if qbname
                }
 
                var submitRec = nlapiSubmitRecord(jerecord); //20units
             	

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
} // end function 


