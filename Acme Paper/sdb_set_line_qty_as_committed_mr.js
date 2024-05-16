/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 * @NModuleScope SameAccount
 */

define([
    "N/record",
    "N/search",
    "N/log",
], function (record, search, log) {
    function todayIsHoliday() {
        try {
            var holidaySearch = search.create({
                type: "customrecord_acme_official_holidays",
                filters:
                    [
                        ["custrecord_aoh_holiday_date", "on", "today"]
                    ],
                columns:
                    [
                    ],
            });
            log.debug("todayIsHoliday() return condition", holidaySearch.runPaged().count != 0);
            return holidaySearch.runPaged().count != 0;
        } catch (error) {
            log.error("isHoliday() ERROR", error);
        }
    }
    function getInputData(context) {
        try {
            if (todayIsHoliday()) return [];
            return search.load({ type: "salesorder", id: 3776 });
        } catch (e) {
            log.error("Error - getInputData", e.message);
        }
    }

    function map(context) {
        try {
            var data = JSON.parse(context.value);
            var internalId = data.values["GROUP(internalid)"]?.value;
            if (!internalId) return;
            var objRecord = record.load({ type: record.Type.SALES_ORDER, id: parseInt(internalId), isDynamic: false });
            var i_line_cnt = objRecord.getLineCount({ sublistId: "item" });
            var recordUpdated = false;
            log.debug("Initial Data", { internalId, i_line_cnt });
            for (var i = 0; i < i_line_cnt; i++) {
                var quantityAvailable = objRecord.getSublistValue({
                    sublistId: "item",
                    fieldId: "quantityavailable",
                    line: i
                });
                var commitinventory = objRecord.getSublistValue({
                    sublistId: "item",
                    fieldId: "commitinventory",
                    line: i
                });
                if (Number(quantityAvailable) > 0 && commitinventory != 1) {
                    objRecord.setSublistValue({
                        sublistId: "item",
                        fieldId: "commitinventory",
                        line: i,
                        value: 1
                    });
                    // objRecord.setValue("custbody_a1wms_dnloadtimestmp", new Date()); COMMENTED 08/05/2024 
                    recordUpdated = true;
                }
            }
            log.debug("Finish Data", { internalId, recordUpdated });
            //if (recordUpdated) 
              objRecord.save({ enableSourcing: true, ignoreMandatoryFields: true });

        } catch (e) {
            log.error("Error - map", e.message);
        }
    }

    return {
        getInputData: getInputData,
        map: map
    };
});
