/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @NModuleScope SameAccount
 */

define(['N/task'],
    function (task) {
        function onRequest(context) {
            try {
                var recordid = context.request.parameters.recordid;
              log.debug("orderid", recordid);
                var taskObj = task.create({
                    taskType: task.TaskType.SCHEDULED_SCRIPT,
                    scriptId: 'customscript_sdb_split_orders_invoice_ss',
                    params: {
                        custscript_sdb_created_from_sales_order: recordid
                    }
                });
                var taskId = taskObj.submit();
                log.debug("taskId", taskId);

            } catch (e) {
                log.error('Error Occured ', e);
            }
        }



        return {
            onRequest: onRequest
        };
    });