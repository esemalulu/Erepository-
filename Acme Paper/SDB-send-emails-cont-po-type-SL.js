/**
 *@NApiVersion 2.1
 *@NScriptType Suitelet
 */
define(["N/runtime", "N/task", "N/record"], function (runtime, task, record)
{

    function onRequest(context)
    {
        log.debug("context", context);
        
        const recordId = context.request.parameters?.recordId;
        if (!recordId) return;

        const currentUser = runtime.getCurrentUser();
        if (!currentUser) return;

        const userId = currentUser.id;
        if (!userId) return;

        record.submitFields({
            type: record.Type.PURCHASE_ORDER,
            id: recordId,
            values: { custbody_return_confirmation_by_email: currentUser.email || "" }
        });

        var mapReduceTask = task.create({
            taskType: task.TaskType.MAP_REDUCE,
            scriptId: 'customscript_sdb_send_documents',
            params: {
                custscript_sdb_current_user_id: userId,
                custscript_sdb_order_id_to_sent: recordId
            }
        });

        // Submit the task
        var taskId = mapReduceTask.submit();
    }

    return {
        onRequest: onRequest
    }
});
