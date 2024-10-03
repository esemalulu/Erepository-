/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */
define(['N/ui/message'],

function(message) {
   
    /**
     * Function definition to be triggered before record is loaded.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.newRecord - New record
     * @param {string} scriptContext.type - Trigger type
     * @param {Form} scriptContext.form - Current form
     * @Since 2015.2
     */
    function beforeLoad(scriptContext) {

    }

    /**
     * Function definition to be triggered before record is loaded.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.newRecord - New record
     * @param {Record} scriptContext.oldRecord - Old record
     * @param {string} scriptContext.type - Trigger type
     * @Since 2015.2
     */
    function beforeSubmit(scriptContext) {
    	
    	if(scriptContext.type == "create")
    	{
    		
    	var recordId = scriptContext.newRecord.id;
   		var tranid = scriptContext.newRecord.getValue({fieldId: 'tranid'});
   		log.debug('Debug', ' tranid'+tranid );
    	
    	var salesorderSearchObj = search.create({
    		   type: "salesorder",
    		   filters:
    		   [
    		      ["type","anyof","SalesOrd"], 
    		      "AND", 
    		      ["numbertext","is",tranid], 
    		      "AND", 
    		      ["mainline","is","T"]
    		   ],
    		   columns:
    		   [
    		      search.createColumn({name: "internalid", label: "Internal ID"}),
    		      search.createColumn({name: "tranid", label: "Document Number"})
    		   ]
    		});
    		var searchResultCount = salesorderSearchObj.runPaged().count;
    		log.debug("salesorderSearchObj result count",searchResultCount);
    		if(searchResultCount > 0){
    			
    			let myMsg4 = message.create({
    		        title: 'My Title 4',
    		        message: 'My Message 4',
    		        type: message.Type.ERROR
    		    });
    		    myMsg4.show();
    			
    		
    		}
    	}

    }

    /**
     * Function definition to be triggered before record is loaded.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.newRecord - New record
     * @param {Record} scriptContext.oldRecord - Old record
     * @param {string} scriptContext.type - Trigger type
     * @Since 2015.2
     */
    function afterSubmit(scriptContext) {

    }

    return {
        beforeLoad: beforeLoad,
        beforeSubmit: beforeSubmit,
        afterSubmit: afterSubmit
    };
    
});
