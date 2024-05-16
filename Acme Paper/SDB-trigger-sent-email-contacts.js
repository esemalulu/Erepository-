/**
 *@NApiVersion 2.1
 *@NScriptType WorkflowActionScript
 */
define(["N/task", "N/record", "N/runtime"], function (task, record, runtime)
{

    function onAction(context)
    {
        const currentUser = runtime.getCurrentUser();
        if (!currentUser) return;

        const userId = currentUser.id;
        if (!userId) return;

        const orderId = context.newRecord.id;
        if (!orderId) return;

        record.submitFields({
            type: record.Type.PURCHASE_ORDER,
            id: orderId,
            values: { custbody_return_confirmation_by_email: currentUser.email || "" }
        });
        
        var mapReduceTask = task.create({
            taskType: task.TaskType.MAP_REDUCE,
            scriptId: 'customscript_sdb_send_documents',
            params: {
                custscript_sdb_current_user_id: userId,
                custscript_sdb_order_id_to_sent: orderId
            }
        });

        // Submit the task
        var taskId = mapReduceTask.submit();
    }

    return {
        onAction: onAction
    }
});
