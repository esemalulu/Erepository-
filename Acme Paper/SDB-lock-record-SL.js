/**
 *@NApiVersion 2.1
 *@NScriptType Suitelet
 */
define(["N/record", "N/search", "N/workflow"], function (record, search, workflow)
{

    function onRequest(context)
    {
        try
        {
            const salesOrderId = context.request.parameters?.salesOrderId;
            if (!salesOrderId) return;
            log.debug("🚀 ~ salesOrderId:", salesOrderId)

            // if order is not already to be locked
            if (isOrderAlreadyLocked(salesOrderId)) return;

            var lockCustomRecord = record.create({
                type: 'customrecord_sdb_require_lock',
                isDynamic: false,
            });

            lockCustomRecord.setValue('custrecord_sdb_sales_order_locked', salesOrderId);

            var lockCustomRecordId = lockCustomRecord.save();
            log.debug("🚀 ~ lockCustomRecordId:", lockCustomRecordId);

            // Trigger workflow to lock record
            workflow.initiate({
                recordType: 'salesorder',
                recordId: salesOrderId,
                workflowId: 'customworkflow53',
            });

            log.debug("Workflow has been initiated");
        }
        catch (error)
        {
            log.error("Error", error);
        }
    }

    return {
        onRequest: onRequest
    }

    function isOrderAlreadyLocked(salesOrderId)
    {
        var customrecord_sdb_require_lockSearchObj = search.create({
            type: "customrecord_sdb_require_lock",
            filters:
                [
                    ["custrecord_sdb_sales_order_locked", "anyof", salesOrderId]
                ],
            columns:
                [
                    search.createColumn({
                        name: "scriptid",
                        sort: search.Sort.ASC,
                        label: "Script ID"
                    })
                ]
        });
        var searchResultCount = customrecord_sdb_require_lockSearchObj.runPaged().count;

        if (searchResultCount > 0) return true;

        return false;
    }
});
