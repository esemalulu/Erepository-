/**
 * @NApiVersion 2.1
 * @NScriptType WorkflowActionScript
 */
define(['N/record'], function (record) {
    function onAction(context) {
        try {
            let newRecord = context.newRecord;
            var itemRecord = record.load({
                type: newRecord.type,
                id: newRecord.id
            });
            log.debug("itemRecord", itemRecord);
            if (!itemRecord) return;
            var itemId = itemRecord.save({ ignoreMandatoryFields: true });
            log.debug("Item Updated: ", itemId);
        } catch (e) {
            log.error('ERROR:', e);
        }
    }

    return {
        onAction: onAction
    }
});

