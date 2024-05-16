/**
 *@NApiVersion 2.1
 *@NScriptType Suitelet
 */

define(["N/search", "N/record"], function (search, record)
{
    function onRequest(context)
    {
        const parameters = context.request.parameters;
        const salesOrderId = parameters.salesOrderId;

        if (!salesOrderId) return;

        deleteLockRecord(salesOrderId);
    }

    return {
        onRequest: onRequest,
    };

    function deleteLockRecord(salesOrderId)
    {
        try
        {
            var searchObj = search.create({
                type: "customrecord_sdb_require_lock",
                filters: [["custrecord_sdb_sales_order_locked", "anyof", salesOrderId]],
                columns: [
                    search.createColumn({
                        name: "scriptid",
                        sort: search.Sort.ASC,
                        label: "Script ID",
                    }),
                ],
            });

            var searchResultCount = searchObj.runPaged().count;

            if (searchResultCount < 1) return;

            let arrayResult = searchObj.run().getRange(0, 1);
            log.debug("onRequest() arrayResult is: ", arrayResult);

            let lockCustomRecordId = arrayResult[0]?.id;
            if (!lockCustomRecordId) return;

            log.debug("onRequest() lockCustomRecordId is: ", lockCustomRecordId);

            var deletedRecordId = record.delete({
                type: "customrecord_sdb_require_lock",
                id: lockCustomRecordId,
            });

            log.debug("onRequest() deletedRecordId is: ", deletedRecordId);

        }
        catch (error)
        {
            log.error("Error deleting custom record lock", error);
        }
    }
});
