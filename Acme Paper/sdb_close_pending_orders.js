/**
* @NApiVersion 2.1
* @NScriptType MapReduceScript
*/
define(['N/record', 'N/search', "N/log", "N/config", "N/format"],
    /**
   * @param{record} record
   * @param{search} search
   */
    (record, search, log, config, format) => {
        const getInputData = (inputContext) => {
            return search.load({
                id: "customsearch6196"
            });
        }

        const map = (mapContext) => {
            try {
                var json = JSON.parse(mapContext.value);
                var id = json.values.createdfrom.value;
                var rec = record.load({
                    id: id,
                    type: record.Type.SALES_ORDER
                });
                var lineCount = rec.getLineCount({ sublistId: "item" });
                for (var i = 0; i < lineCount; i++) {
                    rec.setSublistValue({
                        sublistId: "item",
                        fieldId: "isclosed",
                        value: true,
                        line: i
                    });
                }
                var idClosed = rec.save({ enableSourcing: false, ignoreMandatoryFields: true });
                log.debug("idClosed", idClosed)
            } catch (e) {
                log.error({
                    title: json.values.createdfrom.value,
                    details: e,
                })
            }
        }
        const reduce = (reduceContext) => {
        }
        const summarize = (summaryContext) => {
        }

        return { getInputData, map }
    });