/**
* @NApiVersion 2.1
* @NScriptType MapReduceScript
*/
define(['N/record', 'N/search', "N/log", "N/config", "N/format"],
    (record, search, log, config, format) => {
        const getInputData = () => {
            try {
                log.audit("Entry: ", "Running");
                return search.load({
                    id: "customsearch5824"//"customsearch_sdb_wms_transactions"
                });
            } catch (e) {
                log.error({
                    title: "ERROR",
                    details: e,
                })
            }
        }

        const map = (mapContext) => {
            try {
                var json = JSON.parse(mapContext.value);
                var internalId = json.values["GROUP(internalid)"].value;

                var rec = record.load({
                    // type: record.Type.INVOICE,
                    type: record.Type.SALES_ORDER,
                    id: internalId,
                    isDynamic: true
                });
                // var lineCount = rec.getLineCount({ sublistId: 'item' });
                // for (var i = 0; i < lineCount; i++) {
                //     rec.selectLine({ sublistId: 'item', line: i })
                //     var unitCost = rec.getCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_acc_unitcost', line: i });
                //     var estimateType = rec.getCurrentSublistValue({ sublistId: 'item', fieldId: 'costestimatetype', line: i });
                //     var item = rec.getCurrentSublistValue({ sublistId: 'item', fieldId: 'item', line: i });
                //     var hasRebate = rec.getCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_rebate_item_id', line: i });
                //     if (!unitCost && estimateType == "CUSTOM" && !hasRebate) {
                //         log.debug("LINE DATA: ", { internalId, unitCost, estimateType, item, i })
                //         rec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'costestimatetype', line: i, value: "ITEMDEFINED" });
                //         rec.commitLine({ sublistId: 'item' })
                //     }
                // }
                var idSaved = rec.save({
                    ignoreMandatoryFields: true
                });
                log.audit("Order Saved: ", { idSaved })


            } catch (e) {
                log.error({
                    title: "MAP ERROR",
                    details: e,
                })
            }
        }

        return { getInputData, map }
    });