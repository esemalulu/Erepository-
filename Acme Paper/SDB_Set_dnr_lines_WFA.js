/**
 * @NApiVersion 2.1
 * @NScriptType WorkflowActionScript
 */
define(['N/record', 'N/error', 'N/ui/message', 'N/runtime', 'N/search'], function (record, error, message, runtime, search) {
    function onAction(context) {

        try {
            var newRecord = context.newRecord;
            log.debug('newRecord ID', newRecord.id)
            var lineCount = newRecord.getLineCount({ sublistId: "item" });
            if (!newRecord.isDynamic) notDynamicRec(newRecord, lineCount);
            if (newRecord.isDynamic) isDynamicRec(newRecord, lineCount);

        } catch (e) {
            log.error('onAction: ', e)
        }
    }

    function getItemDnr(id) {
        try {
            var itemDnr = search.lookupFields({
                type: record.Type.INVENTORY_ITEM,
                id: id,
                columns: ['custitem_dnr']
            });
            return itemDnr ? itemDnr.custitem_dnr[0].value : ''
        } catch (error) {
            log.error('getItemDnr', error)
        }
    }

    function notDynamicRec(newRecord, lineCount) {
        try {
            log.debug('notDynamicRec: ', 'run..')
            for (var i = 0; i < lineCount; i++) {
                if (!newRecord.sDynamic)
                    var item = newRecord.getSublistValue({
                        sublistId: "item",
                        fieldId: "item",
                        line: i,
                    });
                var itemtype = newRecord.getSublistValue({
                    sublistId: "item",
                    fieldId: "itemtype",
                    line: i,
                });
                var dnr = newRecord.getSublistValue({
                    sublistId: "item",
                    fieldId: "custcol_sdb_dnr",
                    line: i,
                });
                if (itemtype != "InvtPart" || dnr) continue;
                var itemDnr = getItemDnr(item);
                if (!itemDnr) continue;

                newRecord.setSublistValue({
                    sublistId: "item",
                    fieldId: "custcol_sdb_dnr",
                    line: i,
                    value: itemDnr
                });
            }

        } catch (error) {
            log.error('notDynamicRec', error)
        }

    }

    function isDynamicRec(newRecord, lineCount) {
        try {
            log.debug('isDynamicRec: ', 'run..')
            for (var i = 0; i < lineCount; i++) {
                newRecord.selectLine({
                    sublistId: 'item',
                    line: i
                })
                var item = newRecord.getCurrentSublistValue({
                    sublistId: "item",
                    fieldId: "item",
                    line: i,
                });
                var itemtype = newRecord.getCurrentSublistValue({
                    sublistId: "item",
                    fieldId: "itemtype",
                    line: i,
                });
                var dnr = newRecord.getCurrentSublistValue({
                    sublistId: "item",
                    fieldId: "custcol_sdb_dnr",
                    line: i,
                });
                if (itemtype != "InvtPart" || dnr) continue;
                var itemDnr = getItemDnr(item);
                if (!itemDnr) continue;

                newRecord.setCurrentSublistValue({
                    sublistId: "item",
                    fieldId: "custcol_sdb_dnr",
                    line: i,
                    value: itemDnr
                });
                newRecord.commitLine({
                    sublistId: 'item',
                })
            }

        } catch (error) {
            log.error('isDynamicRec', error)
        }

    }

    return {
        onAction: onAction
    }
});

