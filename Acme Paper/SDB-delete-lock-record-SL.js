/**
 *@NApiVersion 2.1
 *@NScriptType Suitelet
 */

define(["N/search", "N/record"], function (search, record)
{
    function onRequest(context)
    {
        try
        {
            const salesOrderId = context.request.parameters?.salesOrderId;

            const searchObj = search.create({
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

            const searchResultCount = searchObj.runPaged().count;

            if (searchResultCount < 1) return;

            const arrayResult = searchObj.run().getRange(0, 1);
            log.debug("onRequest() arrayResult is: ", arrayResult);

            var deletedRecordId = record.delete({
                type: "customrecord_sdb_require_lock",
                id: arrayResult[0]?.id,
            });
            log.debug("onRequest() deletedRecordId is: ", deletedRecordId);

        } catch (error)
        {
            log.error("Error deleting custom lock record", error);
        }
    }

    return {
        onRequest: onRequest,
    };
});
