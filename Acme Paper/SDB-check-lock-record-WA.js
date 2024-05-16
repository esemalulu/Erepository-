/**
 *@NApiVersion 2.1
 *@NScriptType WorkflowActionScript
 */
define(["N/search"], function (search)
{

    function onAction(context)
    {
        try
        {
            return isTransactionLocked(context.newRecord.id);

        } catch (error)
        {
            log.error("error", error);
        }
    }

    return {
        onAction: onAction
    }

    // This function will check if the transaction is able to be locked if the transaction it is inside the custom record
    function isTransactionLocked(salesOrderId)
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

        log.debug("Transaction already exist in locking");


        if (searchResultCount > 0) return 1;
        
        log.debug("Transaction is non existing in locking");

        return 0;
    }
});
