/* last updated 113017 - add default subsidiary custrecord_liv_invadj_ns_subsidiary */

function CreateInvAdj()
{
 try
 {
  //Search custom inventory adjustments
  
  var arrFilter = new Array(); 
  var arrColumns = new Array();
  var invadjid = 0 ;
  
  arrFilter[0] = new nlobjSearchFilter('custrecord_liv_invadj_ns_internal_id', null, 'isempty',  'null' ); 
  arrFilter[1] = new nlobjSearchFilter('custrecord_liv_invadj_ns_error_msg', null, 'isempty',  'null' ); 
  
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
  
  var arrResult = nlapiSearchRecord('customrecord_liv_inventory_adjustment', null, arrFilter, arrColumns);

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
        var department = customrecord.getValue('custrecord_liv_invadj_ns_dept'); 
        var expenseacct = customrecord.getValue('custrecord_liv_invadj_ns_expense_acct'); 
        var cogsacct = customrecord.getValue('custrecord_liv_invadj_ns_cogs_acct'); 
        var newqty = customrecord.getValue('custrecord_liv_invadj_ns_overwrite_qty'); 
        var subsidiary = customrecord.getValue('custrecord_liv_invadj_ns_subsidiary');
             
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
	   
		    // Create inventory adjustment record
		
			nlapiLogExecution('DEBUG', 'VALUE', 'Create inventory adjustment for : '+refname);
			
	        record.setFieldValue('tranid', refname);
	        record.setFieldValue('externalid', refname);
	        record.setFieldValue('trandate', trxdate);
	        record.setFieldValue('customer', customer);
            record.setFieldValue('adjlocation', fulfiller); 
	        record.setFieldValue('department', department);   // 0 - No Department
	        record.setFieldValue('custbody_liv_pccode', pccode);
	        record.setFieldValue('custbody_liv_inventory_adj_type',adjtype);	
	        record.setFieldValue('subsidiary', subsidiary);
	        
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




