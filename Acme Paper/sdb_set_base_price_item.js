/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 * @NModuleScope Public
 */
define(["N/log", "N/record", "N/search"],
    function (log, record, search) {
        function getInputData() {
            try {
                const searchId = "customsearch_sdb_all_items";
                var mySearch = search.load({
                    id: searchId
                });
                return mySearch;
            } catch (e) {
                log.audit("ERROR getInputData: ", e);
            }
        }

        function map(context) {
            try {
                var ctx = JSON.parse(context.value);
                setBasePrice(context);
            } catch (e) {
                log.audit("ERROR map: " + ctx.id, e);
            }
        }

        // Auxiliar functions

        function setBasePrice(context) {
            var ctx = JSON.parse(context.value);
            if (!ctx.id) return;
            var itemRecord = record.load({ type: ctx.recordType, id: ctx.id })
            var basePrice = itemRecord.getValue("costestimate");
            if (basePrice) setLineLevel(itemRecord, basePrice);
        }

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
            itemRecord.save({
                enableSourcing: false,
                ignoreMandatoryFields: true
            });
        }

        return {
            getInputData: getInputData,
            map: map
        };
    });