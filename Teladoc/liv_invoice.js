/**
* Livongo Inc,
* Purpose of script : Create invoice transaction
*
*/
var ARRERROR = {};
var ARRRESPONSE = new Array();
var hasError = false ;
var prev_invoiceid = 0;
function acceptParams(json)
{
	try
    {
		nlapiLogExecution('DEBUG', 'ACTIVITY', 'Script Started (acceptParams) ...');
		var obj = Object.keys(json);
		var invoiceid = 0;
	
		
		
		for(var x=0;x<obj.length;x++)
		{
			var record = json[obj[x]];
			var objRecord = Object.keys(record);
			var lineno = x+1 ;
			var eor = obj.length ;
			 
			nlapiLogExecution('DEBUG', 'VALUE', 'x value '+x);
			
			var jsonData = json[obj[x]][[objRecord[0]]];
			
			
			try
				{
				    invoiceid = createInvoice(lineno,eor,jsonData,invoiceid) ;
				    nlapiLogExecution('DEBUG', 'VALUE', 'invoiceid: '+invoiceid);
				    nlapiLogExecution('DEBUG', 'VALUE', 'prev_invoiceid: '+prev_invoiceid);
				    
			
				     if (hasError)
				    {
				       x = 999 ;
				       nlapiLogExecution('DEBUG', 'VALUE', 'reset x to 999 '+x);
				       
				       // delete invoice if created
				       if (lineno > 1)
				       {
				           nlapiLogExecution('DEBUG', 'ACTIVITY', 'inside nlapiDeleteRecord');
				           nlapiDeleteRecord('invoice',prev_invoiceid);
				       }
				    }
			
				    if (lineno == eor && !hasError)
	                {  
			               //return response with internal id
                           formatResponse('Invoice Creation Successful', invoiceid, jsonData.tranid, '', '');
                           nlapiLogExecution('DEBUG', 'ACTIVITY', 'createInvoice Ended Sucessfully');
                    }
		
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

function createInvoice(lineno,eor,jsonData,invoiceid)
/********************************************************************************************/
/*** Purpose: Create Invoice function                                                     ***/
/********************************************************************************************/
{
	nlapiLogExecution('DEBUG', 'ACTIVITY', 'createInvoice Started...');


		var record = nlapiCreateRecord('invoice', {recordmode:'dynamic'});
		
		nlapiLogExecution('DEBUG', 'VALUE', 'lineno value : '+lineno);
		nlapiLogExecution('DEBUG', 'VALUE', 'eor value : '+eor);
	
		
		try
		{
			nlapiLogExecution('DEBUG', 'VALUE', 'Create invoice for : '+jsonData.tranid);
			
		if (lineno == 1 )  //create transaction header fields
		  {
			     nlapiLogExecution('DEBUG', 'VALUE', 'Create invoice header');
			     record.setFieldValue('tranid', jsonData.tranid);
	             record.setFieldValue('externalid', jsonData.tranid);
	             record.setFieldValue('trandate', formatDate(jsonData.trandate));
	             record.setFieldText('entity', jsonData.customer);
	             record.setFieldValue('department', 20);   // 0 - No Department
	             
	            if(jsonData.startdate)
	              {
	                  nlapiLogExecution('DEBUG', 'VALUE', 'inside jsonData.startdate if ');
	                  record.setFieldValue('startdate', formatDate(jsonData.startdate));
	              }else
	              {
		              nlapiLogExecution('DEBUG', 'VALUE', 'inside jsonData.startdate else ');
	              }
	              if(jsonData.enddate)
	              {
	                  nlapiLogExecution('DEBUG', 'VALUE', 'inside jsonData.enddate if ');
	                  record.setFieldValue('enddate', formatDate(jsonData.enddate));
	              }else
	              {
		              nlapiLogExecution('DEBUG', 'VALUE', 'inside jsonData.enddate else ');
	              }

                 nlapiLogExecution('DEBUG', 'VALUE', 'Set NewLineItem');
                 nlapiLogExecution('DEBUG', 'VALUE', 'Item value : '+jsonData.item);
            
                 record.selectNewLineItem('item');	
            
                 record.setCurrentLineItemText('item', 'item', jsonData.item);
	             record.setCurrentLineItemValue('item', 'quantity', jsonData.quantity);
			     record.setCurrentLineItemValue('item', 'description', jsonData.description);
			     record.commitLineItem('item');
			     var strRecID = nlapiSubmitRecord(record, true, true);
			     prev_invoiceid = strRecID;
			     return strRecID ;
			}
			else
			{
			     var invrecord = nlapiLoadRecord('invoice', invoiceid, {recordmode: 'dynamic'});
                 invrecord.insertLineItem('item', lineno);
                 invrecord.setCurrentLineItemText('item','item', jsonData.item); 
                 invrecord.setCurrentLineItemValue('item', 'quantity', jsonData.quantity);
			     invrecord.setCurrentLineItemValue('item', 'description', jsonData.description);
                 invrecord.commitLineItem('item'); 
                 strRecID = nlapiSubmitRecord(invrecord, true, true);
                 return strRecID ;
			}
			
			
		}catch(error)
		{
						if (error.getDetails != undefined) 
					   {
							hasError = true;
							formatResponse('Invoice', '', jsonData.tranid, error.getCode(), error.getDetails());
							nlapiLogExecution('DEBUG', 'Invoice creation error for : '+jsonData.tranid, error.getCode() + ': ' + error.getDetails());
					        return strRecID ;
					   }
					   else 
					   {    
							hasError = true;
							formatResponse('Invoice', '', jsonData.tranid, 'Unexpected Error', error.toString());
							nlapiLogExecution('DEBUG', 'Unexpected invoice creation error for : '+jsonData.tranid, error.toString());
					        return strRecID ;
					   }
		}
		

	nlapiLogExecution('DEBUG', 'VALUE', 'Usage: '+nlapiGetContext().getRemainingUsage());

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
