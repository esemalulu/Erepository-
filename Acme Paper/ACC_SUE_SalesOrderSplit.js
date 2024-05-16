/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 *
 */
//var ALLOWED_TRIGGER_MODES = ["create", "edit"]; commented 07/03/2024
var ALLOWED_TRIGGER_MODES = ["create"];

define(["N/record", "N/task", "N/https", "N/url"], function (record, task, https, url) {
    function afterSubmit(context) {
        try {
            var triggerMode = context.type;
            if (ALLOWED_TRIGGER_MODES.indexOf(triggerMode) == -1) return;

            var rec = context.newRecord;
            var createdFrom = rec.getValue({ fieldId: "createdfrom" });
            if (isEmpty(createdFrom)) return;

            // Call Schedule to trigger copy and split sales order
            var taskObj = task.create({
                taskType: task.TaskType.SCHEDULED_SCRIPT,
                scriptId: 'customscript_sdb_split_orders_invoice_ss',
                params: {
                    custscript_sdb_created_from_sales_order: createdFrom,
                    custscript_sdb_invoice_id: rec.id
                }
            });
            if (!taskObj) return;

            if (!taskObj) log.error("ERROR Task Empty: ", { invoiceId: rec.id, taskObj });

            // Submit the task to schedule the script
            var taskId = taskObj.submit();

            if (taskId) log.debug("Running Split Order Functionality: ", { invoiceId: rec.id, taskId });

        } catch (error) {
            log.error("ERROR: ", { invoiceId: rec ? rec.id : "Empty", error });
            try {
                var suitletURL = url.resolveScript({
                    scriptId: 'customscript_sdb_split_orders_sl',
                    deploymentId: 'customdeploy_sdb_split_orders_sl',
                    returnExternalUrl: true
                });
                var resp = https.get({
                    url: suitletURL + '&recordid=' + createdFrom
                });
            } catch (error) {
                log.error("ERROR: Run SL createdFrom:"+createdFrom, error);
            }

        }
    }

    function isEmpty(stValue) {
        if (
            stValue == null ||
            stValue == "" ||
            stValue == " " ||
            stValue == undefined
        ) {
            return true;
        } else {
            return false;
        }
    }

    return {
        afterSubmit: afterSubmit,
    };
});
