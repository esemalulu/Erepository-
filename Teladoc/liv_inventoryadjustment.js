/**
* Livongo Inc,
* Purpose of script : Create inventory adjustment
*
*/
var ARRERROR = {};
var ARRRESPONSE = new Array();
function acceptParams(json)
{
	try
    {
		nlapiLogExecution('DEBUG', 'ACTIVITY', 'Script Started (acceptParams) ...');
		var obj = Object.keys(json);
		
		
		for(var x=0;x<obj.length;x++)
		{
			var record = json[obj[x]];
			var objRecord = Object.keys(record);
			
			
			for(var y=0;y<objRecord.length;y++)
			{
				
				var jsonData = json[obj[x]][[objRecord[y]]];
		
				nlapiLogExecution('DEBUG', 'VALUE', 'Currently processing tranid [y] : '+jsonData.tranid);
			
				try
				{
				     createInventoryAdjustment(jsonData)
		
				}
				catch(error)
				{
					if (error.getDetails != undefined) 
					   {
						   formatResponse(objRecord[y], '', jsonData.tranid, error.getCode(), error.getDetails());
							nlapiLogExecution('DEBUG', 'Process Error for tranid : '+jsonData.tranid, error.getCode() + ': ' + error.getDetails());
					   }
					   else 
					   {    
						    formatResponse(objRecord[y], '', jsonData.tranid, 'Unexpected Error', error.toString());
						    nlapiLogExecution('DEBUG', 'Unexpected Error for tranid : '+jsonData.tranid, error.toString());
					   }  
				}
			}
		}
		nlapiLogExecution('DEBUG', 'ACTIVITY', 'Script Ended Successfully (acceptParams) ...');
			return ARRRESPONSE;
	}catch(error) 
	{
	   if (error.getDetails != undefined) 
	   {
		   formatResponse('', '', jsonData.tranid, error.getCode(), error.getDetails());
		   nlapiLogExecution('DEBUG', 'Process Error for tranid : '+jsonData.tranid, error.getCode() + ': ' + error.getDetails());
		   throw nlapiCreateError('','',jsonData.tranid,error.getCode(), error.toString());
	   }
	   else 
	   {    	
            formatResponse('', '', jsonData.tranid, 'Unexpected Error', error.toString());
			nlapiLogExecution('DEBUG', 'Unexpected Error for tranid: '+jsonData.createdfrom, error.toString());
			throw nlapiCreateError('','',jsonData.tranid,'Undefined Error Code', error.toString());
	   }
	}
}

function createInventoryAdjustment(jsonData)
/********************************************************************************************/
/*** Purpose: Create Inventory Adjustment function                                        ***/
/********************************************************************************************/
{
	nlapiLogExecution('DEBUG', 'ACTIVITY', 'createInventoryAdjustment Started...');

	   
		var record = nlapiCreateRecord('inventoryadjustment', {recordmode:'dynamic'});
		
		try
		{
		
	
		      // Search and load customer record.  Throw error is Customer record does not exists.
		    
		      nlapiLogExecution('DEBUG', 'VALUE', 'Search/load customer record for : '+jsonData.customerid);
		      var arrFilter = new Array();
		      arrFilter.push(new nlobjSearchFilter('internalid', null, 'is',  jsonData.customerid ));
	    
	          //Define search columns
	    
	          var arrColumns = new Array();
	          arrColumns.push(new nlobjSearchColumn('custentity_liv_expense_dept'));
		      arrColumns.push(new nlobjSearchColumn('custentity_liv_expense_acct'));
		      arrColumns.push(new nlobjSearchColumn('companyname'));
		      arrColumns.push(new nlobjSearchColumn('parent'));
		
	          //Execute search
	    
		      var arrResult = nlapiSearchRecord('customer', null, arrFilter, arrColumns); 
		      		         
		      
		      if (!arrResult)
		      {
		         formatResponse('InventoryAdjustment', '', jsonData.tranid, 'INVALID_FLD_VALUE', 'Customer ID not found in NetSuite');	 
		         return; 
		         
		      }
		
		         var companyname = arrResult[0].getValue('companyname');
		         var parent = arrResult[0].getText('parent');
		         var department = arrResult[0].getText('custentity_liv_expense_dept');
		         var custaccount = arrResult[0].getText('custentity_liv_expense_acct');
		         var customer = parent+" : "+companyname;
		         
		         nlapiLogExecution('DEBUG', 'VALUE', 'Companyname : '+companyname);  
		         nlapiLogExecution('DEBUG', 'VALUE', 'Expense Account for Item : '+custaccount);  
		         nlapiLogExecution('DEBUG', 'VALUE', 'Expense Department for Item : '+department);     
		         nlapiLogExecution('DEBUG', 'VALUE', 'Parent + Company Name : '+customer);  
		         nlapiLogExecution('DEBUG', 'VALUE', 'Parent  : '+parent);
		
		      
              // Search item
              
		      var arrFilter = new Array();
		      
		      // Search and load item
		    
		      nlapiLogExecution('DEBUG', 'VALUE', 'Search/load item record for : '+jsonData.item);
		
		      arrFilter.push(new nlobjSearchFilter('itemid', null, 'is',  jsonData.item ));
	    
	          //Define search columns
	    
	          var arrColumns = new Array();
	          arrColumns.push(new nlobjSearchColumn('expenseaccount'));
		
	          //Execute item search
	    
		      var arrResult = nlapiSearchRecord('item', null, arrFilter, arrColumns);
		      
		      if (!arrResult)
		      {
		         formatResponse('InventoryAdjustment', '', jsonData.tranid, 'INVALID_FLD_VALUE', 'Item not found in NetSuite');	 
		         return;  
		      }
		      
		      var itemaccount = arrResult[0].getValue('expenseaccount');
		      
		      nlapiLogExecution('DEBUG', 'VALUE', 'Expense Account for Item : '+itemaccount);  

		    // Create inventory adjustment record
		
			nlapiLogExecution('DEBUG', 'VALUE', 'Create inventory adjustment for : '+jsonData.tranid);
			
	        record.setFieldValue('tranid', jsonData.tranid);
	        record.setFieldValue('externalid', jsonData.tranid);
	        record.setFieldValue('trandate', formatDate(jsonData.trandate));
	        
	        if (parent != companyname)
	        {
	           record.setFieldText('customer', customer);
	           nlapiLogExecution('DEBUG', 'VALUE', 'Customer : '+customer); 
	        }
	        else
	        {
	           record.setFieldText('customer', companyname);
	           nlapiLogExecution('DEBUG', 'VALUE', 'Customer : '+companyname); 
	        }
	        
	        record.setFieldText('adjlocation', jsonData.adjlocation); 
	        
	        record.setFieldText('department', department);   // 0 - No Department
	        record.setFieldValue('custbody_liv_pccode', jsonData.pccode);
	        record.setFieldText('custbody_liv_inventory_adj_type','Shipment');	
	        
	        if (custaccount)
	        {
	            record.setFieldText('account',custaccount);
	        }
	        else
	        {   
	            record.setFieldValue('account',itemaccount);
	        }
	        
	        //record.setFieldValue('account', 124);   // add if condition for billing type to derive adjustment account


            nlapiLogExecution('DEBUG', 'VALUE', 'Set NewLineItem');
	        record.selectNewLineItem('inventory');
            record.setCurrentLineItemText('inventory','item',jsonData.item); 
            record.setCurrentLineItemValue('inventory', 'adjustqtyby', jsonData.adjustqtyby);
            record.setCurrentLineItemText('inventory', 'location', jsonData.adjlocation);
            
            nlapiLogExecution('DEBUG', 'VALUE', 'Department before set current line : '+department); 
            
            
            record.setCurrentLineItemText('inventory', 'department', department);
            record.commitLineItem('inventory'); 

	
            var strRecID = nlapiSubmitRecord(record, true, true);
             
            
            nlapiLogExecution('DEBUG', 'ACTIVITY', 'createInventoryAdjustment Ended Sucessfully');
	
            
            // return response with internal id
            if (strRecID)
            {
                 formatResponse('InventoryAdjustment Creation Successful', strRecID, jsonData.tranid, '', '');
            }

			
		}catch(error)
		{
						if (error.getDetails != undefined) 
					   {
							formatResponse('InventoryAdjustment', '', jsonData.tranid, error.getCode(), error.getDetails());
							nlapiLogExecution('DEBUG', 'Inventory adjustment creation error for : '+jsonData.tranid, error.getCode() + ': ' + error.getDetails());
					   }
					   else 
					   {    
							formatResponse('InventoryAdjustment', '', jsonData.tranid, 'Unexpected Error', error.toString());
							nlapiLogExecution('DEBUG', 'Unexpected inventory adjustment creation error for : '+jsonData.tranid, error.toString());
					   }
		}
		

	nlapiLogExecution('DEBUG', 'VALUE', 'Usage: '+nlapiGetContext().getRemainingUsage());
	nlapiLogExecution('DEBUG', 'ACTIVITY', 'createInventoryAdjustment Ended Sucessfully');
}


function formatResponse(type, internalid, tranid, errorcode, errormsg)
{
	var arrResponse = {};
	arrResponse[type] = {};
	arrResponse[type]['ns_internalid'] = internalid;
	arrResponse[type]['tranid'] = tranid;
	arrResponse[type]['error_code'] = errorcode;
	arrResponse[type]['error_message'] = errormsg;
	arrResponse[type]['create_datetime'] = setDate(new Date());
	ARRRESPONSE.push(arrResponse);
}


function formatDate(strDate)
{
	if(strDate.indexOf('/') != -1)
	{
		return strDate;
	}
	return strDate.substring(0,2)+'/'+strDate.substring(2,4)+'/'+strDate.substring(4);
}
