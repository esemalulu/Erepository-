/**
 *@NApiVersion 2.1
 *@NScriptType UserEventScript
 */
define(["N/log", "N/record"], function (log, record) {
    function afterSubmit(context) {
        try {
            var itemRecord = record.load({
                type: context.newRecord.type,
                id: context.newRecord.id
            });
            var basePrice = itemRecord.getValue("costestimate");
            if (basePrice) setLineLevel(itemRecord, basePrice);
            if (basePrice) itemRecord.save({ enableSourcing: false, ignoreMandatoryFields: true });
        } catch (e) {
            log.error("ERROR: ", e);
        }
    }

    // Auxiliar functions

    function setLineLevel(itemRecord, basePrice) {
        const priceIndex = itemRecord.findSublistLineWithValue({
            sublistId: "price",
            fieldId: "pricelevel",
            value: "1" //Price Level Base
        });
        if (priceIndex < 0) return;
        log.debug('Item to Update', {
            item: itemRecord.id,
            basePrice: basePrice
        });
        itemRecord.setSublistValue({
            sublistId: 'price',
            fieldId: "price_1_",
            line: priceIndex,
            value: basePrice
        });
        itemRecord.setValue("custitem_sdb_update_base_price", true);
    }

    return {
        afterSubmit: afterSubmit
    }
});
