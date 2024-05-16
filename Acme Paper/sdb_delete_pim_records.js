/**
 * @NApiVersion 2.x
 * @NScriptType MapReduceScript
 */
define([
    'N/runtime', 'N/https', 'N/http', 'N/url', 'N/log', 'N/search', 'N/record', 'N/file'
], function (runtime, https, http, urlMod, myLog, search, record, file) {
    function getInputData() {
        try {
            var recordType = runtime.getCurrentScript().getParameter({
                name: "custscript_sdb_record_type",
            });
            var deleteRecordSearch = search.create({
                type: recordType,
                filters: [],
                columns: []
             });
             return deleteRecordSearch
             
        } catch (e) {
            log.error("getInputData() ERROR", JSON.stringify(e));
        }
    }

    function map(context) {
        try {
            var values = JSON.parse(context.value);
            var recordType = runtime.getCurrentScript().getParameter({
                name: "custscript_sdb_record_type",
            });
            var deletedID = record.delete({
                type: recordType,
                id: values.id
            });
            log.debug("map() deletedId is: ", deletedID);
        } catch (error) {
            log.error("map() ERROR", error);
        }
    }

    return {
        getInputData: getInputData,
        map: map,
    };
});
