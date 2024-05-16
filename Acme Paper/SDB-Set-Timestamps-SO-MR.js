/**
 *@NApiVersion 2.1
 *@NScriptType MapReduceScript
 */
 define(["N/log", "N/search", "N/record", "N/format", 'N/config'], function (log, search, record, format, config) {

    function getInputData() {
        try {
           
            return search.load(3187);

        } catch (error) {
            log.error("Error at getInputData", error)
        }
    }

    function map(context) {
        try {
            var json = JSON.parse(context.value);
            var jsonStr = JSON.parse(JSON.stringify(json.values))
            var soId = jsonStr["GROUP(internalid)"].value
            log.debug("soId", soId)
            var cinfo = config.load({ type: config.Type.COMPANY_INFORMATION });
            var rec = record.load({
                type: record.Type.SALES_ORDER,
                id: soId,
            })
            rec.setValue("custbody_a1wms_orderlocked", false);
            if (!rec.getValue("custbody_a1wms_dnloadtimestmp")) {
                rec.setValue("custbody_a1wms_dnloadtimestmp", format.parse({
                  type: format.Type.DATETIMETZ,
                  value: format.format({ value: new Date(), type: format.Type.DATETIMETZ, timezone: cinfo.getValue('timezone')}),
                  timezone: cinfo.getValue('timezone')
                }))
            }
           // 
            var recId = rec.save({ignoreMandatoryFields:true})
            log.debug("recId", recId)
        } catch (error) {
            log.error("Error at map", error)
        }
    }

    function reduce(context) {

    }

    function summarize(summary) {

    }

    return {
        getInputData: getInputData,
        map: map,
        reduce: reduce,
        summarize: summarize
    }
});
