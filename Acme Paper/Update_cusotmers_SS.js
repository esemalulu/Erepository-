/**
 * @NApiVersion 2.x
 * @NScriptType ScheduledScript
 * @NModuleScope SameAccount
 */
define(['N/search', 'N/record', 'N/task', 'N/runtime'],

function(search, record, task, runtime) {
   
    /**
     * Definition of the Scheduled script trigger point.
     *
     * @param {Object} scriptContext
     * @param {string} scriptContext.type - The context in which the script is executed. It is one of the values from the scriptContext.InvocationType enum.
     * @Since 2015.2
     */
    function execute(scriptContext)
    {

    	var customerSearchObj = search.create({
    		   type: "customer",
    		   filters:
    		   [
    		      ["stage","anyof","CUSTOMER"], 
    		     /* "AND", 
    		      ["isdefaultbilling","is","F"], 
    		      "AND", 
    		      ["isdefaultshipping","any",""], */
    		      "AND", 
    		      ["internalid","noneof","51592"],
                   "AND", 
                  ["internalidnumber","greaterthan","60613"]
    		   ],
    		   columns:
    		   [
    		      //search.createColumn({name: "addressinternalid", label: "Address Internal ID"}),
    		     // search.createColumn({name: "address", label: "Address"}),
    		      search.createColumn({
    		         name: "internalid",
    		         sort: search.Sort.ASC,
    		         label: "Internal ID"
    		      })
    		   ]
    		});
    		var searchResultCount = customerSearchObj.runPaged().count;
    		log.debug("customerSearchObj result count",searchResultCount);
    		customerSearchObj.run().each(function(result){
    			try
    			{
        			var itemId = result.id;   			
        			var itemRec = record.load({type: "customer", id:itemId, isDynamic: true });	
        			var addressCount = itemRec.getLineCount({sublistId:'addressbook'});
    				log.debug('addressCount', addressCount);
    				for(var i = addressCount-1 ; i >= 0 ; i--)
    				{
    					try
    					{
    						 var defBillingAddress = itemRec.getSublistValue({sublistId: "addressbook",  fieldId : 'defaultbilling', line: i});
    						 log.debug('defBillingAddress', defBillingAddress);
    						 if(defBillingAddress === false)
    						 {
    							  itemRec.selectLine({sublistId: "addressbook", line: i });
        						  itemRec.removeLine({sublistId: 'addressbook', line: i});	
    						 }    						
    					}
    					catch(e)
    					{
    						log.debug('Error', e);
    					}
    		
    				}
    					
    				var recordId = itemRec.save();
    			}
    			catch(e)
				{
					log.debug('Error', e);
				}

				log.debug('recordId', recordId);
				
    		   return true;
    		});
    }

    return {
        execute: execute
    };
    
});
