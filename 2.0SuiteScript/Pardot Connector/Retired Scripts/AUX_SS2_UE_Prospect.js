/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */
define(['N/record', 'N/format', './AUX_pardot_lib', 'N/runtime'],

function(record, format, pardotLib, runtime) {

    /**
     * Function definition to be triggered before record is loaded.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.newRecord - New record
     * @param {Record} scriptContext.oldRecord - Old record
     * @param {string} scriptContext.type - Trigger type
     * @Since 2015.2
     */
    function afterSubmit(scriptContext)
    {
        log.debug(runtime.executionContext);
        if(runtime.executionContext == runtime.ContextType.USER_INTERFACE || runtime.executionContext == runtime.ContextType.CSV_IMPORT || runtime.executionContext == runtime.ContextType.CUSTOM_MASSUPDATE)
        {
        	var timeStamp = format.format({
        		value: new Date(),
        		type: format.Type.DATETIMETZ
        	});

        	var dt = pardotLib.dateParser(timeStamp);

        	var queueRecord = record.create
        	({
        		type: 'customrecord_pi_queue',
        		isDynamic: true,
        	});

        	queueRecord.setText
        	({
        		fieldId : 'custrecord_pi_queue_recid',
        		text    : scriptContext.newRecord.id.toString()
        	}),
        	queueRecord.setValue
        	({
        		fieldId : 'custrecord_pi_queue_rectype',
        		value   : 1
        	}),
        	queueRecord.setValue
        	({
        		fieldId : 'custrecord_pi_queue_type',
        		value   : 1
        	}),
        	queueRecord.setValue
        	({
        		fieldId : 'custrecord_pi_queue_sync_status',
        		value   : 1
        	}),
        	queueRecord.setValue
        	({
        		fieldId : 'custrecord_pi_queue_date',
        		value   : dt
        	}),
        	queueRecord.setValue
        	({
        		fieldId : 'custrecord_pi_queue_sync_log',
        		value   : 'QUEUE RECORD CREATED > PENDING > '
        	});

        	var queueRecId = queueRecord.save
        	({
        		enableSourcing: true,
        		ignoreMandatoryFields: true
        	});
        }

    }

    return {
        afterSubmit: afterSubmit
    };

});
