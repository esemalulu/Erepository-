/**
 *@NApiVersion 2.x
 *@NScriptType UserEventScript
 */
define(['N/record', 'N/error'], function (record, error) {
    
    function beforeSubmit(context) {
        if (context.type == context.UserEventType.CREATE) {
            //Load the Record
			try
		   {
            //var recordId = record.id();
			var soRecord = context.newRecord;
			
			
    		var order = soRecord.getValue({fieldId: 'tranid'});
			log.debug("order", order);
    		
    			soRecord.setValue('custbody_transaction_number', order);
				//newRec.save();
              	
    		
		   }//try end
		   
		   catch(e)
    		{
    			log.debug("Error", e);
    		}//end of catch
    	
      }//end of Main IF
	}//End of Function
	
	 return {
    	beforeSubmit: beforeSubmit
    };
    
});			