/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */
define(['N/log','N/record','N/search','./itr_ifd_lib_common.js'],

function(log,record,search,common) {
   

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
    	var DEBUG_IDENTIFIER = 'afterSubmit';
    	log.debug(DEBUG_IDENTIFIER,'--START--');  	
	    try{
	    	var type = scriptContext.type;
	    	if(type == 'delete'){
	    		log.debug(DEBUG_IDENTIFIER,'Item Receipt is being deleted');
	    		return;
	    	}
	    	var itemReceipt = scriptContext.newRecord;

	    	var poRec = itemReceipt.getValue('createdfrom');
	    	var cReceived = common.getScriptParameter('custscript_itr_received_d_type');
	    	var lookup = search.lookupFields({
	    		type: 'purchaseorder',
	    	    id: poRec,
				columns: ['custbody_export_rds']
	    	});
	    	var exportToRds = lookup.custbody_export_rds;
	    	if(exportToRds == true){
	    		log.debug(DEBUG_IDENTIFIER,'Purchase Order cannot be changed, Export to RDS is true');
	    		// return;
	    		
	    	}
	    	log.debug(DEBUG_IDENTIFIER,'PO Internal ID: ' + poRec);
	    	if(!common.isNullOrEmpty(poRec)){
	    	var poId = record.submitFields({
	    			type: 'purchaseorder',
	    			id: poRec,
	  		    	values: {      
	  		    	    'custbody_rds_download_type' : cReceived,	
	  		    	    'custbody_export_rds': true,
	  		    	    }
	    		});
	    	log.debug(DEBUG_IDENTIFIER,'Purchase Order has been updated: ' + poId);
	    	}
	    	
	    	
	    }catch(ex){
	    	var errorStr = 'Type: ' + ex.type + ' | ' +'Name: ' + ex.name +' | ' +'Error Message: ' + ex.message;
	    	
			log.debug('ERROR', 'error on ' + DEBUG_IDENTIFIER + ' function : '+ errorStr);
	    }
    }

    return {
       
        afterSubmit: afterSubmit
    };
    
});
