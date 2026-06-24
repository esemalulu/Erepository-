/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 */

define(['N/record'], function (record) {

    function afterSubmit(context) {
        if (context.type !== context.UserEventType.CREATE &&
            context.type !== context.UserEventType.EDIT) {
            return;
        }

        var rec = context.newRecord;
        var itemUpdates = {}; // store item+location updates to avoid duplicate loads

        var lineCount = rec.getLineCount({ sublistId: 'item' });

        for (var i = 0; i < lineCount; i++) {

            var itemId = rec.getSublistValue({
                sublistId: 'item',
                fieldId: 'item',
                line: i
            });

            var locationId = rec.getSublistValue({
                sublistId: 'item',
                fieldId: 'location',
                line: i
            });

            var invDetail = rec.getSublistSubrecord({
                sublistId: 'item',
                fieldId: 'inventorydetail',
                line: i
            });

            if (!invDetail) continue;

            var assignCount = invDetail.getLineCount({
                sublistId: 'inventoryassignment'
            });

            if (assignCount === 0) continue;

            // Take first bin (you can enhance logic later if needed)
            var binId = invDetail.getSublistValue({
                sublistId: 'inventoryassignment',
                fieldId: 'binnumber',
                line: 0
            });

            if (!binId) continue;

            // Track unique item + location combination
            var key = itemId + '_' + locationId;

            if (!itemUpdates[key]) {
                itemUpdates[key] = {
                    itemId: itemId,
                    locationId: locationId,
                    binId: binId
                };
            }
        }

        // Process updates (one load per item/location)
        for (var key in itemUpdates) {

            var data = itemUpdates[key];

            try {
                var itemRec = record.load({
                    type: record.Type.INVENTORY_ITEM,
                    id: data.itemId,
                    isDynamic: true
                });

                var locCount = itemRec.getLineCount({
                    sublistId: 'locations'
                });

                for (var j = 0; j < locCount; j++) {

                    var loc = itemRec.getSublistValue({
                        sublistId: 'locations',
                        fieldId: 'location',
                        line: j
                    });

                    if (loc == data.locationId) {

                        var currentPreferredBin = itemRec.getSublistValue({
                            sublistId: 'locations',
                            fieldId: 'preferredbin',
                            line: j
                        });

                        // ✅ ONLY set if blank
                        if (!currentPreferredBin) {

                            itemRec.selectLine({
                                sublistId: 'locations',
                                line: j
                            });

                            itemRec.setCurrentSublistValue({
                                sublistId: 'locations',
                                fieldId: 'preferredbin',
                                value: data.binId
                            });

                            itemRec.commitLine({
                                sublistId: 'locations'
                            });

                            itemRec.save();
                        }

                        break;
                    }
                }

            } catch (e) {
                log.error('Error updating item ' + data.itemId, e);
            }
        }
    }

    return {
        afterSubmit: afterSubmit
    };
});