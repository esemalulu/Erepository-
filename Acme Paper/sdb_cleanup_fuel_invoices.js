/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 * @NModuleScope Public
 */
define(["N/log", "N/search", "N/record", "N/runtime"], function (
    log,
    search,
    record,
    runtime
) {
    function getInputData(context) {
        try {
            var scriptObj = runtime.getCurrentScript();
            var searchIdParam = scriptObj.getParameter("custscript_sdb_fuel_invoices_search");

            return search.load({
                type: "invoice",
                id: searchIdParam,
            });
        } catch (e) {
            log.error("getInputData ERROR", e)
        }
    }

    function map(context) {
        var data = JSON.parse(context.value);
        try {
            var scriptObj = runtime.getCurrentScript();
            var fuelItem = scriptObj.getParameter("custscript_sdb_fuel_item");

            var recordObj = record.load({
                type: data.recordType,
                id: data.id,
                isDynamic: true
            });

            var lineCount = recordObj.getLineCount("item");
            if(lineCount > 1) {
                log.audit("NOT VALID ORDER", data.id)
                return;
            }

            recordObj.selectLine({
                sublistId: "item",
                line: 0
            });

            var item = recordObj.getCurrentSublistValue({
                sublistId: "item",
                fieldId: "item"
            });

            if(item === fuelItem){
                log.debug("REMOVE ORDER", data.id)
                record.delete({
                    type: data.recordType,
                    id: data.id
                });
            }
        } catch (error) {
            log.error("error map", error);
        }
    }
    return {
        getInputData: getInputData,
        map: map
    };
});
