/**
 * @NApiVersion 2.x
 * @NScriptType ScheduledScript
 * @NModuleScope SameAccount
 */
define(['N/search', 'N/record'],

function(search, record) {
   
    /**
     * Definition of the Scheduled script trigger point.
     *
     * @param {Object} scriptContext
     * @param {string} scriptContext.type - The context in which the script is executed. It is one of the values from the scriptContext.InvocationType enum.
     * @Since 2015.2
     */
    function execute(scriptContext) {

    	try
    	{
        	//Search Results
    		var salesorderSearchObj = search.create({
    			  type: "inventoryadjustment",
   filters:
   [
      ["type","anyof","InvAdjst"], 
      "AND", 
      ["mainline","is","T"]
   ]
    			});
    			var searchResultCount = salesorderSearchObj.runPaged().count;
    			log.debug("salesorderSearchObj result count",searchResultCount);
    			salesorderSearchObj.run().each(function(result)
    			{
    				record.delete({
      	    	      type: record.Type.INVENTORY_ADJUSTMENT, id: result.id});
     				log.debug("Deleted result id",result.id);
    			     return true;
    			});
    		
    	}
    	catch(e)
    	{
             log.debug('Error', e);
    	}
 	
    }

    return {
        execute: execute
    };
    
});
