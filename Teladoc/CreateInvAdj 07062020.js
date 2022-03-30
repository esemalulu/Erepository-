/* last updated 113017 - add default subsidiary custrecord_liv_invadj_ns_subsidiary */
/* last updated 120418 - add contractnumber */
/* last updated 032919 - add customer bill to and sold to from contracts record NS-358*/
/* last updated 07062020 - add searchAllRecord function to get more than 1000 search results*/

function CreateInvAdj()
{
 try
 {
  //Search custom inventory adjustments
  
  var arrFilter = new Array(); 
  var arrColumns = new Array();
  var invadjid = 0 ;
  
  arrFilter[0] = new nlobjSearchFilter('custrecord_liv_invadj_ns_internal_id', null, 'isempty',  'null' ); 
  arrFilter[1] = new nlobjSearchFilter('isinactive', null, 'is',  'F' ); 
 // arrFilter[1] = new nlobjSearchFilter('custrecord_liv_invadj_ns_error_msg', null, 'isempty',  'null' ); 
  
  //Define search columns
	
  arrColumns.push(new nlobjSearchColumn('name'));
  arrColumns.push(new nlobjSearchColumn('custrecord_liv_invadj_date'));
  arrColumns.push(new nlobjSearchColumn('custrecord_liv_invadj_pccode'));
  arrColumns.push(new nlobjSearchColumn('custrecord_liv_invadj_supplyupc'));
  arrColumns.push(new nlobjSearchColumn('custrecord_liv_invadj_fulfiller'));
  arrColumns.push(new nlobjSearchColumn('custrecord_liv_invadj_adjust_qty'));
  arrColumns.push(new nlobjSearchColumn('custrecord_liv_invadj_adjustment_type'));
  arrColumns.push(new nlobjSearchColumn('custrecord_liv_invadj_ns_customer'));
  arrColumns.push(new nlobjSearchColumn('custrecord_liv_invadj_ns_dept'));
  arrColumns.push(new nlobjSearchColumn('custrecord_liv_invadj_ns_expense_acct'));
  arrColumns.push(new nlobjSearchColumn('custrecord_liv_invadj_ns_cogs_acct'));
  arrColumns.push(new nlobjSearchColumn('custrecord_liv_invadj_ns_overwrite_qty'));
  arrColumns.push(new nlobjSearchColumn('custrecord_liv_invadj_ns_subsidiary'));
  arrColumns.push(new nlobjSearchColumn('custrecord_liv_invadj_contract_number'));
  arrColumns.push(new nlobjSearchColumn('custrecord_liv_invadj_ns_soldto_customer'));
  
  //var arrResult = nlapiSearchRecord('customrecord_liv_inventory_adjustment', null, arrFilter, arrColumns);
  var arrResult = searchAllRecord('customrecord_liv_inventory_adjustment', null, arrFilter, arrColumns);
  
  if(arrResult)
  {
      for (var i = 0;  i < arrResult.length; i++)
     // for (var i = 0;  i < 2; i++)
      {
             var customrecord = arrResult[i];
             var refname = customrecord.getValue('name');
            
             nlapiLogExecution('DEBUG', 'VALUE', 'Processing arrResult: '+i +' of '+arrResult.length);
              
             createInventoryAdjustment(customrecord) ;
             
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
		   nlapiLogExecution('DEBUG', 'Process Error for Reference Name : '+refname, error.getCode() + ': ' + error.getDetails());
		   throw nlapiCreateError('Inventory Adjustment','',refname,error.getCode(), error.toString());
	   }
	   else 
	   {    	
			nlapiLogExecution('DEBUG', 'Unexpected Error for Reference Name: '+refname, error.toString());
			throw nlapiCreateError('Inventory Adjustment','',name,'Undefined Error Code', error.toString());
	   }
  }
} // end function CreateInvAdj

function createInventoryAdjustment(customrecord)
/********************************************************************************************/
/*** Purpose: Create Inventory Adjustment function                                        ***/
/********************************************************************************************/
{
	nlapiLogExecution('DEBUG', 'ACTIVITY', 'createInventoryAdjustment Started...');
	    var today = new Date();
	    var refname = customrecord.getValue('name');
        var trxdate = customrecord.getValue('custrecord_liv_invadj_date'); 
        var pccode = customrecord.getValue('custrecord_liv_invadj_pccode'); 
        var supplyupc = customrecord.getValue('custrecord_liv_invadj_supplyupc'); 
        var fulfiller = customrecord.getValue('custrecord_liv_invadj_fulfiller'); 
        var adjqty = customrecord.getValue('custrecord_liv_invadj_adjust_qty'); 
        var adjtype = customrecord.getValue('custrecord_liv_invadj_adjustment_type'); 
        var customer = customrecord.getValue('custrecord_liv_invadj_ns_customer'); 
        var soldtocustomer = customrecord.getValue('custrecord_liv_invadj_ns_soldto_customer'); 
        var department = customrecord.getValue('custrecord_liv_invadj_ns_dept'); 
        var expenseacct = customrecord.getValue('custrecord_liv_invadj_ns_expense_acct'); 
        var cogsacct = customrecord.getValue('custrecord_liv_invadj_ns_cogs_acct'); 
        var newqty = customrecord.getValue('custrecord_liv_invadj_ns_overwrite_qty'); 
        var subsidiary = customrecord.getValue('custrecord_liv_invadj_ns_subsidiary');
        var contractnumber = customrecord.getValue('custrecord_liv_invadj_contract_number');
        
             
        nlapiLogExecution('DEBUG', 'VALUE', 'Reference Name: '+refname);
        nlapiLogExecution('DEBUG', 'VALUE', 'Date: '+trxdate);
        nlapiLogExecution('DEBUG', 'VALUE', 'PCCode: '+pccode);
        nlapiLogExecution('DEBUG', 'VALUE', 'SupplyUPC: '+supplyupc);
        nlapiLogExecution('DEBUG', 'VALUE', 'Fulfiller: '+fulfiller);
        nlapiLogExecution('DEBUG', 'VALUE', 'Adj Qty: '+adjqty);
        nlapiLogExecution('DEBUG', 'VALUE', 'Adj Type: '+adjtype);
        nlapiLogExecution('DEBUG', 'VALUE', 'Customer: '+customer);
        nlapiLogExecution('DEBUG', 'VALUE', 'Department: '+department);
        nlapiLogExecution('DEBUG', 'VALUE', 'Expense Acct: '+expenseacct);
        nlapiLogExecution('DEBUG', 'VALUE', 'COGS Acct: '+cogsacct);
        nlapiLogExecution('DEBUG', 'VALUE', 'Overwrite Qty: '+newqty);
        nlapiLogExecution('DEBUG', 'VALUE', 'Subsidiary: '+subsidiary);

        var customrecordid = customrecord.getId();
		var record = nlapiCreateRecord('inventoryadjustment', {recordmode:'dynamic'});
		
		try
		{
		   if (pccode == null)
           { 
               pccode = 'N/A' ;
           }
       
           var pccodeID = getPromoCodeId(pccode) ;
      
           nlapiLogExecution('DEBUG','PCCodeID value:'+ pccodeID) ;
      
            
      
       // Search for Contracts
       
           var arrFilter = new Array(); 
      
           arrFilter[0] = new nlobjSearchFilter('custrecord_liv_cm_client_code', null, 'anyof',  [pccodeID] );

      
           //var arrResult = nlapiSearchRecord('customrecord_liv_contracts','customsearch_liv_contracts', arrFilter, null);
           var arrResult = searchAllRecord('customrecord_liv_contracts','customsearch_liv_contracts', arrFilter, null);

	
           if(arrResult)
           {
           
               var results=arrResult[0];
               var columns=results.getAllColumns();  
               var contractnumber    = results.getValue(columns[4]);
               var btcustomer    = results.getValue(columns[20]);
               var stcustomer    = results.getValue(columns[21]);
               
               
            }     
		
	   
		    // Create inventory adjustment record
		
			nlapiLogExecution('DEBUG', 'VALUE', 'Create inventory adjustment for : '+refname);
			
	        record.setFieldValue('tranid', refname);
	        record.setFieldValue('externalid', refname);
	        record.setFieldValue('subsidiary', subsidiary);
	        record.setFieldValue('trandate', trxdate);
	        record.setFieldValue('customer', customer);
            record.setFieldValue('adjlocation', fulfiller); 
	        record.setFieldValue('department', department);   // 0 - No Department
	        record.setFieldValue('custbody_liv_pccode', pccode);
	        record.setFieldValue('custbody_liv_inventory_adj_type',adjtype);	
	        record.setFieldValue('custbody_liv_so_contract_number', contractnumber);
	        //record.setFieldValue('custbody_liv_sold_to_customer', soldtocustomer); //NS-358
	        record.setFieldValue('custbody_liv_sold_to_customer', stcustomer); //NS-358
	        record.setFieldValue('custbody_liv_so_bill_to_customer', btcustomer); //NS-358
	        
	        if (expenseacct)
	        {
	            record.setFieldValue('account',expenseacct);
	        }
	        else
	        {   
	            record.setFieldValue('account',cogsacct);
	        }
	        
	        nlapiLogExecution('DEBUG', 'VALUE', 'Set NewLineItem');
	        

	        
	        record.selectNewLineItem('inventory');
	        record.setCurrentLineItemValue('inventory','item',supplyupc); 
            record.setCurrentLineItemValue('inventory', 'location', fulfiller);
            record.setCurrentLineItemValue('inventory', 'department', department);
	        if (newqty)
	        {
	            record.setCurrentLineItemValue('inventory', 'adjustqtyby', newqty);
	        }
	        else
	        {   
	            record.setCurrentLineItemValue('inventory', 'adjustqtyby', adjqty);
	        }

            record.commitLineItem('inventory'); 

            var strRecID = nlapiSubmitRecord(record, true, true);
                
            nlapiLogExecution('DEBUG', 'ACTIVITY', 'createInventoryAdjustment Ended Sucessfully');
	
            nlapiLogExecution('DEBUG', 'VALUE', 'strRecID : '+strRecID);
                 
            
            // return response with internal id
            if (strRecID)
            {
                var currentrecord = nlapiLoadRecord('customrecord_liv_inventory_adjustment',customrecordid, {recordmode: 'dynamic'});
                currentrecord.setFieldValue('custrecord_liv_invadj_ns_internal_id', strRecID);
                currentrecord.setFieldValue('custrecord_liv_invadj_ns_creation_date', today);
                currentrecord.setFieldValue('custrecord_liv_invadj_ns_error_msg', ' ');
                var strCustomID = nlapiSubmitRecord(currentrecord, true, true);
                nlapiLogExecution('DEBUG', 'VALUE', 'strCustomID : '+strCustomID);
                
            }
			
		}catch(error)
		{
						if (error.getDetails != undefined) 
					   {
							nlapiLogExecution('DEBUG', 'Inventory adjustment creation error for : '+refname, error.getCode() + ': ' + error.getDetails());
							 var currentrecord = nlapiLoadRecord('customrecord_liv_inventory_adjustment',customrecordid, {recordmode: 'dynamic'});
                             currentrecord.setFieldValue('custrecord_liv_invadj_ns_error_msg', error.getCode() + ': ' + error.getDetails());
                             nlapiSubmitRecord(currentrecord, true, true);
					   }
					   else 
					   {    
							nlapiLogExecution('DEBUG', 'Unexpected inventory adjustment creation error for : '+refname, error.toString());
							 var currentrecord = nlapiLoadRecord('customrecord_liv_inventory_adjustment',customrecordid, {recordmode: 'dynamic'});
                             currentrecord.setFieldValue('custrecord_liv_invadj_ns_error_msg', error.toString());
                             nlapiSubmitRecord(currentrecord, true, true);
					   }
		}


	nlapiLogExecution('DEBUG', 'VALUE', 'Usage: '+nlapiGetContext().getRemainingUsage());
	nlapiLogExecution('DEBUG', 'ACTIVITY', 'createInventoryAdjustment Ended Sucessfully');
}

function getPromoCodeId(pccode) //get internal id for Multi-Select custom list
{
     var col = new Array();
     var arrFilter = new Array(); 
   
     nlapiLogExecution('DEBUG', 'ACTIVITY', 'Search Custom List');
     nlapiLogExecution('DEBUG','Custom List PCCode value:'+ pccode) ;
     
	 arrFilter[0] = new nlobjSearchFilter('name', null, 'is',  pccode );
	 
     col[0] = new nlobjSearchColumn('internalid');
  
     
     //var results = nlapiSearchRecord('customlist_liv_pccode', null, arrFilter, col);
     var results = searchAllRecord('customlist_liv_pccode', null, arrFilter, col);
     
     for ( var i = 0; results != null && i < results.length; i++ )
     {
        var res = results[i];
        var listID = (res.getValue('internalId'));
  
        nlapiLogExecution('DEBUG','Custom List PCCode ID value:'+ listID) ;
        
        return listID ;
      } 
      
}

function searchAllRecord (recordType, searchId, searchFilter, searchColumns)
{
	var arrSearchResults = [];
	var count=1000, min=0, max=1000;

	var searchObj = false;

	if (searchId) 
	{
		searchObj = nlapiLoadSearch(recordType, searchId);
		if (searchFilter)
		{
			searchObj.addFilters(searchFilter);
		}
			
		if (searchColumns)
		{
			searchObj.addColumns(searchColumns);
		}			
	} 
	else 
	{
		searchObj = nlapiCreateSearch(recordType, searchFilter, searchColumns);
	}

	var rs = searchObj.runSearch();

	while( count == 1000 )
	{
		var resultSet = rs.getResults(min, max);
		arrSearchResults = arrSearchResults.concat(resultSet);
		min = max;
		max+=1000;
		count = resultSet.length;
	}

	if(arrSearchResults)
	{
		nlapiLogExecution('DEBUG', 'searchAllRecord', 'Total search results('+recordType+'): '+arrSearchResults.length);
	}
	return arrSearchResults;		
}

