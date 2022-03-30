/**
 * @param {String} type Context Types: scheduled, ondemand, userinterface, aborted, skipped
 * @returns {Void}
 */
function CopyProjectDetails(type) 
{
	var searchResults = nlapiSearchRecord ('job', null, null, null);
	         
	for (i=0; searchResults && i < searchResults.length; i++)
	{
			
	    var recType = searchResults[i].getRecordType();    
	    var recID = searchResults[i].getId();		    
		var record = nlapiLoadRecord(recType, recID);
	    
		var value1 = record.getFieldValue('custentity_proj_sales_projected_sum'); 
		var value2 = record.getFieldValue('custentity_proj_ven_bill_sum');
		var value3 = record.getFieldValue('custentity_proj_inv_sum_amount'); 
			
	    if(value1 || value2 || value3)
	    {
		
	    	try 
	    	{
			
	    		record.setFieldValue('custentity_copy_projected_summary', value1);
	    		record.setFieldValue('custentity_copy_vendor_sum_amount', value2);
	    		record.setFieldValue('custentity_copy_inv_sum_amount', value3);	
	    		nlapiSubmitRecord(record, true, true);
			
	    	}
	    	catch (e)
	    	{
			
	    		log('ERROR','Error Copying Values', getErrText(e));
			
	    	}
		

		
	    }
	
	
	}
	
	
}
