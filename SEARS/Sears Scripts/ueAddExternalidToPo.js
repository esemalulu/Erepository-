/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */
define(['N/error', 'N/record'],
/**
 * @param {error} error
 * @param {record} record
 */
function(error, record) {
   
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
    	log.audit("***STATUS***", "STARTED");
    	var recId;
		try {
			if (scriptContext.type === scriptContext.UserEventType.CREATE) {
				var recordToUpdate = record.load({
					type : record.Type.PURCHASE_ORDER,
					id : scriptContext.newRecord.id,
					isDynamin : false
				});
				recId = updateRecord(recordToUpdate);
				log.debug('***RECORD ID***', 'Record ID: ' + recId);
			}
		} catch (e) {
			log.error("***CREATE PURCHASE ORDER ERR***", e);
		} finally {
			log.audit("***STATUS***", "FINISHED");
		}
    }
    
    function updateRecord(rec) {
		var tranid = rec.getValue({
			fieldId: 'tranid'
		});
		log.debug('***TRAND ID***', 'Trand id: ' + tranid);
		rec.setValue({
			fieldId : 'externalid',
			value : tranid,
			ignoreFieldChange : true
		});
		return rec.save();
	}

    return {
        beforeLoad: beforeLoad,
        beforeSubmit: beforeSubmit,
        afterSubmit: afterSubmit
    };
    
});
