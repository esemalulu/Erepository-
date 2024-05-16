/**
 * @NApiVersion 2.0
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define(['N/record', 'N/ui/dialog', 'N/log', 'N/currentRecord'],
function (record, dialog, log, currentRecord) {
	       
function pageInit(scriptContext) {
	        
         
		log.debug({ title: 'Script Context', details: scriptContext });
		try {
			if  (scriptContext.sublistId == 'item' && scriptContext.fieldId == 'item') {
				var currentRecord = scriptContext.currentRecord;
                 
				   var newItem = record.create({
                    type: record.Type.ITEM,
                    isDynamic: true,
                });
				
				log.debug("newItem", newItem);

				// Perform checking of the item type
				
					//newItem.setValue({fieldId: 'customform', value: 308});
              
				
			}
			return true;
		} catch (error) {
			log.debug({ title: 'Catch - Error', details: error.message });
			return true;
		}
	}
	return {
	pageInit: pageInit 
	
	};

});