/**
 *@NApiVersion 2.1
 *@NScriptType UserEventScript
 */
 define(["N/log", "N/search", "N/record", "N/https", "N/task", "N/runtime"], function (log, search, record, https, task, runtime) {

    function beforeLoad(context) {
       
    }

    // FUNCTIONALITY
    function afterSubmit(context) {
        try {
            if (context.type === context.UserEventType.DELETE) return;
                const salesRecord = context.newRecord;
                var soId = salesRecord.getValue("custrecord_sdb_transaction_id_replace")
                var mrTask = task.create({
                    taskType: task.TaskType.MAP_REDUCE,
                    scriptId: 'customscript_sdb_replace_items_error_mr',
                    deploymentId: null,
                    params: {
                        custscript_order_id: soId,
                    },
                });
                var taskId = mrTask.submit();
                log.debug('map reduce task id', taskId)
            
        }
        catch (error) {
            log.error("error", error);
        }
    }
    function beforeSubmit(context) {
        
    }
    return {
        beforeLoad,
        //beforeSubmit,
        afterSubmit
    }

    // ------------------------- AUXLIAR FUNCTIONS ------------------------------------------



});


