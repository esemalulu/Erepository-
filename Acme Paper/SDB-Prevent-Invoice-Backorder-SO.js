/**
 *@NApiVersion 2.1
 *@NScriptType WorkflowActionScript
 */
define(["N/log", "N/search"], function (log, search) {

    function onAction(scriptContext) {
        //This script returns 1 unless there is only the fuel charge item in the invoice, in that case it returns 0
        try {
            var newRecord = scriptContext.newRecord;
            var itemCount = newRecord.getLineCount({
                sublistId: 'item'
            });
            if (itemCount > 1) return 1;
            var itemId = newRecord.getSublistValue({
                sublistId: 'item',
                fieldId: 'item',
                line: 0
            });
            var type = search.lookupFields({
                type: "item",
                id: itemId,
                columns: ["type"]
            });
            type = type.type[0]?.value;
            log.debug("Item Info: ", { itemId, type });
            return type == "InvtPart" ? 1 : 0;
        } catch (e) {
            log.error("Error onAction", e);
            return 1;
        }
    }

    return {
        onAction: onAction
    }
});
