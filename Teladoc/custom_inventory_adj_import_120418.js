/* Last Updated: 07/27/2017 */

function beforeSubmit(type)
{
  //applies only to CSV Import and Create event
  
  if ( (type == 'create' || type == 'edit' ) &&  (nlapiGetContext().getExecutionContext() == 'csvimport'))
  {
      
      // Search record existence in custom record
       var arrFilter = new Array(); 
       var refname = nlapiGetFieldValue('name');
       var pccode = nlapiGetFieldValue('custrecord_liv_invadj_pccode');
    
	   arrFilter[0] = new nlobjSearchFilter('name', null, 'is',  refname ); 

	    //Define search columns
	
	    var arrColumns = new Array();
		arrColumns.push(new nlobjSearchColumn('name'));
	   
	    //Execute search
	    
		var arrResult = nlapiSearchRecord('customrecord_liv_inventory_adjustment', null, arrFilter, arrColumns);
		
		nlapiLogExecution('DEBUG','Ref Name value:'+ refname) ;
		

        if(!arrResult) // not found
        {
            nlapiLogExecution('DEBUG', 'ACTIVITY', 'Call processRecords');
           processRecords(type) ;
           
        }
        else
        {
           if (type == 'create')
           { 
             throw 'Reference # or Name Already Exists.';
           }
           else
           { 
             processRecords(type) ;
           }
        }
  }

} // end function beforeSumit




function processRecords(type)
{   

      var newId = nlapiGetRecordId();
      var newType = nlapiGetRecordType();
      var pccode = nlapiGetFieldValue('custrecord_liv_invadj_pccode');
      var name = nlapiGetFieldValue('name');
      
      nlapiLogExecution('DEBUG','<Before Submit Script> type:'+type+', RecordType: '+newType+', Id:'+newId);
      nlapiLogExecution('DEBUG','PCCode value:'+ pccode) ;
      
      if (pccode == null)
      { 
         pccode = 'N/A' ;
       }
       
      var pccodeID = getPromoCodeId(pccode) ;
      
      nlapiLogExecution('DEBUG','Name value:'+ name) ;
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
             var billinginactive = custrecord.getValue('custentity_liv_billing_inactive'); // 07/09/17
             
             
               nlapiLogExecution('DEBUG', 'VALUE', 'Company Name: '+companyname);
               nlapiLogExecution('DEBUG', 'VALUE', 'Parent Company: '+parent);
               nlapiLogExecution('DEBUG', 'VALUE', 'Client Name: '+clientname);
               nlapiLogExecution('DEBUG', 'VALUE', 'Category: '+category);
               nlapiLogExecution('DEBUG', 'VALUE', 'Expense Department: '+expensedept);
               nlapiLogExecution('DEBUG', 'VALUE', 'Expense Account: '+expenseaccount);

              
            //  nlapiSetFieldValue('custrecord_liv_invadj_ns_customer', custrecordid);
              nlapiSetFieldValue('custrecord_liv_invadj_jira_client_name', clientname);
              nlapiSetFieldValue('custrecord_liv_invadj_ns_category', category);
              nlapiSetFieldValue('custrecord_liv_invadj_ns_client_type', clienttype);
              nlapiSetFieldValue('custrecord_liv_invadj_ns_salesrep', salesrep);
              nlapiSetFieldValue('custrecord_liv_invadj_ns_dept', expensedept);
              nlapiSetFieldValue('custrecord_liv_invadj_ns_expense_acct', expenseaccount);
              nlapiSetFieldValue('custrecord_liv_invadj_ns_billing_inactiv', billinginactive); //07/09/17

            }
          } // arrResult
          
          
          // Search item

          var arrItemFilter = new Array(); 
          var itemid = nlapiGetFieldValue('custrecord_liv_invadj_supplyupc');
      
          nlapiLogExecution('DEBUG', 'ACTIVITY', 'Search Item');
          nlapiLogExecution('DEBUG','ItemID value:'+ itemid) ;
         
	      arrItemFilter[0] = new nlobjSearchFilter('internalid', null, 'is',  itemid ); // Internal ID PromoCode in Custom List

          var arrItemColumns = new Array();
		  arrItemColumns.push(new nlobjSearchColumn('expenseaccount'));
		  arrItemColumns.push(new nlobjSearchColumn('assetaccount'));
		  arrItemColumns.push(new nlobjSearchColumn('averagecost'));
	   
	      //Execute item search
	    
		  var arrItemResult = nlapiSearchRecord('item', null, arrItemFilter, arrItemColumns);
		//  nlapiLogExecution('DEBUG', 'VALUE', 'Item Search Result: '+arrItemResult.length) 
		
          if(arrItemResult)
          {
             for (var i = 0;  i < arrItemResult.length; i++)
             {
                var itemrecord = arrItemResult[i];
                var itemrecordid = itemrecord.getId();
                   
                var cogsaccount = itemrecord.getValue('expenseaccount');
                var assetaccount = itemrecord.getValue('assetaccount');
                var averagecost = itemrecord.getValue('averagecost');
             
                nlapiLogExecution('DEBUG', 'VALUE', 'COGS Account: '+cogsaccount);
                nlapiLogExecution('DEBUG', 'VALUE', 'Asset Account: '+assetaccount);
                nlapiLogExecution('DEBUG', 'VALUE', 'Ave. Cost: '+averagecost);
               
                // Set new Field Value
                if (expenseaccount)
	            {
	                nlapiSetFieldValue('custrecord_liv_invadj_ns_cogs_acct',expenseaccount);
	            }
	            else
	            {   
	                nlapiSetFieldValue('custrecord_liv_invadj_ns_cogs_acct', cogsaccount);
	            }
	        
                nlapiSetFieldValue('custrecord_liv_invadj_ns_asset_acct', assetaccount);
                nlapiSetFieldValue('custrecord_liv_invadj_ns_ave_cost', averagecost);
              }
            } // arrItemResult

       
       // Search ContractPrice 
       
     
       var arrFilter = new Array(); 
       
       arrFilter[0] = new nlobjSearchFilter('custrecord_liv_cm_client_code', null, 'anyof',  [pccodeID] );

       var searchresults = nlapiSearchRecord('customrecord_liv_contracts','customsearch_liv_contracts', arrFilter, null);


       if(searchresults) 
       { 
           for(var z=0; z < searchresults.length; z++) 
           { 
               nlapiLogExecution('DEBUG','inside contracts loop');
               var results=searchresults[z];
               var columns=results.getAllColumns();  

               var search_pccode = results.getValue(columns[3]);
               var upfrontprice = results.getValue(columns[8]);   
               var bundleprice = results.getValue(columns[6]) ;  
               var replacementprice = results.getValue(columns[11]); 
               var contractnumber    = results.getValue(columns[4]);
               var billtocustomer    = results.getValue(columns[20]);
               var soldtocustomer    = results.getValue(columns[21]);
               
      
               nlapiLogExecution('DEBUG','Upfront Price: '+upfrontprice) ;
               nlapiLogExecution('DEBUG','Bundle Price: '+bundleprice) ;
               nlapiLogExecution('DEBUG','Replacement Price: '+replacementprice) ;
               
               // Set new Field Value
         
               nlapiSetFieldValue('custrecord_liv_invadj_ns_upfront_price', Math.abs(parseFloat(upfrontprice)));
               nlapiSetFieldValue('custrecord_liv_invadj_ns_pppm_price', Math.abs(parseFloat(bundleprice)));
               nlapiSetFieldValue('custrecord_liv_invadj_ns_replace_price', Math.abs(parseFloat(replacementprice)));
               nlapiSetFieldValue('custrecord_liv_invadj_contract_number',contractnumber);
               nlapiSetFieldValue('custrecord_liv_invadj_ns_customer', billtocustomer);
               nlapiSetFieldValue('custrecord_liv_invadj_ns_soldto_customer', nvl(soldtocustomer,billtocustomer));
               
               
               
           
               
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
   
function getPrice(pccode)
{   

    nlapiLogExecution('DEBUG','PCCODE: '+pccode) ;
    var arrFilter = new Array(); 
    arrFilter[0] = new nlobjSearchFilter('custentity_liv_pccode', null, 'is', pccode);


    var searchresults = nlapiSearchRecord('customer','customsearch_liv_customers_download', arrFilter, null);

   
   if(searchresults) 
   { 
       for(var z=0; z < searchresults.length; z++) 
       { 

          var results=searchresults[z];
          var columns=results.getAllColumns();  

          var search_pccode =results.getValue(columns[1]); 
          var upfrontprice = results.getValue(columns[5]);  ;   
          var bundleprice = results.getValue(columns[6]);  ; 
          var replacementprice = results.getValue(columns[7]);  ; 
      
          nlapiLogExecution('DEBUG','Search PCCODE: '+search_pccode) ;
          nlapiLogExecution('DEBUG','Upfront Price: '+upfrontprice) ;
          nlapiLogExecution('DEBUG','Bundle Price: '+bundleprice) ;
          nlapiLogExecution('DEBUG','Replacement Price: '+replacementprice) ;
        } //for loop

    } // end if

} // end Function getPrice



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
   