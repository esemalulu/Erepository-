/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */
define(["N/log", "N/record", "N/search"], function (log, record, search) {
    function getInputData(context) {
        try {
            return search.load({
                id: "customsearch_sdb_force_bo_items"
            });
        } catch (e) {
            log.error("error in reading lines of csv", JSON.stringify(e));
        }
    }


    function map(mapContext) {
        try {
            var json = JSON.parse(mapContext.value);
            var internalId = json.values["GROUP(internalid)"].value;
            var newRec = record.load({
                type: record.Type.SALES_ORDER,
                id: internalId
            });
            var itemCount = newRec.getLineCount({ "sublistId": "item" });
            for (var i = 0; i < itemCount; i++) {
                newRec.setSublistValue({ sublistId: 'item', fieldId: 'custcol_sdb_force_bo_date', line: i, value: "" });
            }
            var idSaved = newRec.save({
                ignoreMandatoryFields: true
            });
            log.audit("Order Saved: ", { idSaved })
        } catch (error) {
            log.debug('map', error);
        }

    }


    return {
        getInputData: getInputData,
        map: map
    };
});



