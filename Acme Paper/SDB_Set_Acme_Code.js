/**
 * @NApiVersion 2.1
 * @NScriptType WorkflowActionScript
 */
define(['N/record', "N/search"], function (record, search) {
    function onAction(context) {
        try {
            log.debug("execute WFA", true);
            const ACME_CODE_RECORD_ID = 1;
            let newRecord = context.newRecord;
            let itemName = newRecord.getValue("itemid");
            log.debug("itemName", itemName);
            if (itemName) return;
            let oldValueCode = search.lookupFields({
                type: "customrecord_sdb_acme_code_value",
                id: ACME_CODE_RECORD_ID,
                columns: ["name"],
            });
            log.debug("oldValueCode", oldValueCode);
            oldValueCode = oldValueCode.name;
            let newValueCode = Number(oldValueCode) + 1;
            record.submitFields({
                type: "customrecord_sdb_acme_code_value",
                id: ACME_CODE_RECORD_ID,
                values: {
                    'name': String(newValueCode),
                },
                options: {
                    ignoreMandatoryFields: true
                }
            });
            newRecord.setValue("itemid", newValueCode);
        } catch (e) {
            log.debug('onAction:', e);
        }
    }

    return {
        onAction: onAction
    }
});

