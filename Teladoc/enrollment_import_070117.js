/* Last Updated: 15-Jun-2017 */

function beforeSubmit(type)
{
  //applies only to CSV Import and Create event
  
  if ( (type == 'create') &&  (nlapiGetContext().getExecutionContext() == 'csvimport'))
  {
      
      // Search record existence in custom record
       var arrFilter = new Array(); 
       var period = nlapiGetFieldValue('custrecord_liv_enrm_period');
       var pccode = nlapiGetFieldValue('custrecord_liv_enrm_client_code');
       
       nlapiLogExecution('DEBUG','Period value:'+ period) ;
       nlapiLogExecution('DEBUG','Client Code value:'+ pccode) ;
    
	   arrFilter[0] = new nlobjSearchFilter('custrecord_liv_enrm_period', null, 'is',  period ); 
	   arrFilter[1] = new nlobjSearchFilter('custrecord_liv_enrm_client_code', null, 'is',  pccode ); 

	    //Define search columns
	
	    var arrColumns = new Array();
		arrColumns.push(new nlobjSearchColumn('custrecord_liv_enrm_period'));
	   
	    //Execute search
	    
		var arrResult = nlapiSearchRecord('customrecord_liv_enrollment', null, arrFilter, arrColumns);
		
		nlapiLogExecution('DEBUG','Period value:'+ period) ;
	
		

       if(arrResult) //  found - delete records first
        {
           var current_rec = arrResult[0];
           var rec_id = current_rec.getId();
           nlapiDeleteRecord('customrecord_liv_enrollment', rec_id);

         }
         
        
        
        nlapiLogExecution('DEBUG', 'ACTIVITY', 'Call processRecords');
        processRecords(type) ;
   

  }

} // end function beforeSumit




function processRecords(type)
{   

      var newId = nlapiGetRecordId();
      var newType = nlapiGetRecordType();
      var clientcode = nlapiGetFieldValue('custrecord_liv_enrm_client_code');
      var period = nlapiGetFieldValue('custrecord_liv_enrm_period');
      var mtd_enrollees = nlapiGetFieldValue('custrecord_liv_enrm_mtd_enrollees');
      var ltd_enrollees = nlapiGetFieldValue('custrecord_liv_enrm_cum_enrollees');
      var name = nlapiGetFieldValue('name');
      
      nlapiLogExecution('DEBUG','<Before Submit Script> type:'+type+', RecordType: '+newType+', Id:'+newId);
      nlapiLogExecution('DEBUG','Client Code value:'+ clientcode) ;
      
      if (clientcode == null)
      { 
         clientcode = 'N/A' ;
       }
       
      var pccodeID = getPromoCodeId(clientcode) ;
      
      nlapiLogExecution('DEBUG','PCCodeID value:'+ pccodeID) ;
      

  
      
// Search for Client

       var arrFilter = new Array(); 
    
	   arrFilter[0] = new nlobjSearchFilter('custentity_liv_pccode', null, 'anyof',  [pccodeID] ); // Internal ID PromoCode in Custom List

	    //Define search columns
	
	    var arrColumns = new Array();
		arrColumns.push(new nlobjSearchColumn('companyname'));
		arrColumns.push(new nlobjSearchColumn('category'));
		arrColumns.push(new nlobjSearchColumn('salesrep'));
		arrColumns.push(new nlobjSearchColumn('custentity_liv_jira_client_name'));
		arrColumns.push(new nlobjSearchColumn('custentity_liv_client_type'));
		arrColumns.push(new nlobjSearchColumn('custentity_liv_expense_dept'));
		arrColumns.push(new nlobjSearchColumn('custentity_liv_expense_acct'));
	   
	    //Execute customer search
	    
		var arrResult = nlapiSearchRecord('customer', null, arrFilter, arrColumns);
	 	//nlapiLogExecution('DEBUG', 'VALUE', 'Customer Search Result: '+arrResult.length)
		
        if(arrResult)
        {
          for (var i = 0;  i < arrResult.length; i++)
           {
             var custrecord = arrResult[i];
             var custrecordid = custrecord.getId();
             var companyname = custrecord.getValue('companyname');
             var parent = custrecord.getValue('parent');
             var clientname = custrecord.getValue('custentity_liv_jira_client_name');
             var category = custrecord.getValue('category');
             var clienttype = custrecord.getValue('custentity_liv_client_type');
             var salesrep = custrecord.getValue('salesrep');
             var expenseaccount = custrecord.getValue('custentity_liv_expense_acct');
             var expensedept = custrecord.getValue('custentity_liv_expense_dept');
             
             
               nlapiLogExecution('DEBUG', 'VALUE', 'Company Name: '+companyname);
               nlapiLogExecution('DEBUG', 'VALUE', 'Parent Company: '+parent);
               nlapiLogExecution('DEBUG', 'VALUE', 'Client Name: '+clientname);
               nlapiLogExecution('DEBUG', 'VALUE', 'Category: '+category);
               nlapiLogExecution('DEBUG', 'VALUE', 'Expense Department: '+expensedept);
               nlapiLogExecution('DEBUG', 'VALUE', 'Expense Account: '+expenseaccount);

              nlapiSetFieldValue('custrecord_liv_enrm_ns_customer', custrecordid);
              nlapiSetFieldValue('custrecord_liv_enrm_ns_category', category);
              nlapiSetFieldValue('custrecord_liv_enrm_ns_client_type', clienttype);
              nlapiSetFieldValue('custrecord_liv_enrm_ns_salesrep', salesrep);
              
              
              // Update customer record with cumulative enrollment
              
              	var updaterec = nlapiLoadRecord('customer', custrecordid);  //10 units
              	updaterec.setFieldValue('custentity_liv_cumulative_enrollment', ltd_enrollees);
              	nlapiSubmitRecord(updaterec); //20 units
	
            }
          } // arrResult
          
            // Search Price 
       
     
       var arrFilter = new Array(); 
       arrFilter[0] = new nlobjSearchFilter('custentity_liv_pccode', null, 'anyof',  [pccodeID] );

       var searchresults = nlapiSearchRecord('customer','customsearch_liv_customers_download', arrFilter, null);

       if(searchresults) 
       { 
           for(var z=0; z < searchresults.length; z++) 
           { 

               var results=searchresults[z];
               var columns=results.getAllColumns();  

               var search_pccode =results.getValue(columns[1]); 
               var upfrontprice = results.getValue(columns[9]);  ;   
               var bundleprice = results.getValue(columns[10]);  ; 
               var replacementprice = results.getValue(columns[11]);  ; 
      
               nlapiLogExecution('DEBUG','Upfront Price: '+upfrontprice) ;
               nlapiLogExecution('DEBUG','Bundle Price: '+bundleprice) ;
               nlapiLogExecution('DEBUG','Replacement Price: '+replacementprice) ;
               
               // Set new Field Value
         
               nlapiSetFieldValue('custrecord_liv_enrm_ns_pppm_price', Math.abs(parseFloat(bundleprice)));
               nlapiSetFieldValue('custrecord_liv_enrm_ns_upfront_price', Math.abs(parseFloat(upfrontprice)));
           
               
             } //for loop
        } // end if
          
       // Search MTD Lapsed 
        
        nlapiLogExecution('DEBUG', 'VALUE', 'Lapsed Client Code: '+clientcode);
        nlapiLogExecution('DEBUG', 'VALUE', 'Lapsed Period: '+period);
     
       var arrFilter = new Array(); 
       arrFilter[0] = new nlobjSearchFilter('custrecord_liv_churn_client_code', null, 'is',  clientcode );
       arrFilter[1] = new nlobjSearchFilter('custrecord_liv_churn_period', null, 'is',  period );

       var searchresults = nlapiSearchRecord('customrecord_liv_churn','customsearch_liv_churn_lapsed', arrFilter, null);

       if(searchresults) 
       { 
           for(var z=0; z < searchresults.length; z++) 
           { 

               var results=searchresults[z];
               var columns=results.getAllColumns();  

               var mtd_lapsed =results.getValue(columns[2]); 
           
      
               nlapiLogExecution('DEBUG','mtd_lapsed: '+mtd_lapsed) ;
           
               
               // Set new Field Value
         
               nlapiSetFieldValue('custrecord_liv_enrm_mtd_lapsed', Math.abs(parseFloat(mtd_lapsed)));
             //  nlapiSetFieldValue('custrecord_liv_enrm_ns_upfront_price', Math.abs(parseFloat(upfrontprice)));
           
               
             } //for loop
        } // end if
    
      // Search MTD Attrition
        
        nlapiLogExecution('DEBUG', 'VALUE', 'Attrition Client Code: '+clientcode);
        nlapiLogExecution('DEBUG', 'VALUE', 'Attrition Period: '+period);
     
       var arrFilter = new Array(); 
       arrFilter[0] = new nlobjSearchFilter('custrecord_liv_churn_client_code', null, 'is',  clientcode );
       arrFilter[1] = new nlobjSearchFilter('custrecord_liv_churn_period', null, 'is',  period );

       var searchresults = nlapiSearchRecord('customrecord_liv_churn','customsearch_liv_churn_attrition', arrFilter, null);

       if(searchresults) 
       { 
           for(var z=0; z < searchresults.length; z++) 
           { 

               var results=searchresults[z];
               var columns=results.getAllColumns();  

               var mtd_attrition =results.getValue(columns[2]); 
           
      
               nlapiLogExecution('DEBUG','mtd_attrition: '+mtd_attrition) ;
           
               
               // Set new Field Value
         
               nlapiSetFieldValue('custrecord_liv_enrm_mtd_attrition', Math.abs(parseFloat(mtd_attrition))); 
           
               
             } //for loop
        } // end if
    

} //end processRecords

function getPromoCodeId(pccode) //get internal id for Multi-Select custom list
{
     var col = new Array();
     var arrFilter = new Array(); 
   
     nlapiLogExecution('DEBUG', 'ACTIVITY', 'Search Custom List');
     nlapiLogExecution('DEBUG','Custom List PCCode value:'+ pccode) ;
     
	 arrFilter[0] = new nlobjSearchFilter('name', null, 'is',  pccode );
	 
     col[0] = new nlobjSearchColumn('internalid');
  
     
     var results = nlapiSearchRecord('customlist_liv_pccode', null, arrFilter, col);
     
     for ( var i = 0; results != null && i < results.length; i++ )
     {
        var res = results[i];
        var listID = (res.getValue('internalId'));
  
        nlapiLogExecution('DEBUG','Custom List PCCode ID value:'+ listID) ;
        
        return listID ;
      } 
      
}

function asofdate() 
{
var asofdate = new Date();
asofdate.setDate(0); 
var tdate = asofdate.getDate();
var month = asofdate.getMonth() + 1; // jan = 0
var year = asofdate.getFullYear();
return newDate = month + '/' + tdate + '/' + year;
}
   

   