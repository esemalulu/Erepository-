/**
 *@NApiVersion 2.x
 *@NScriptType MapReduceScript
 */
define(['N/record', 'N/search', 'N/log'], function (record, search, log) {

    function getInputData() {
        var customrecord_rebate_item_detailsSearchObj = search.create({
            type: "customrecord_rebate_item_details",
            filters: [],
            columns: []
        });
        return customrecord_rebate_item_detailsSearchObj
    }

    function map(context) {
        try {
            var result = JSON.parse(context.value)
            record.delete({
                type: 'customrecord_rebate_item_details',
                id: result.id
            })
        } catch (e) {
            log.error('error at map', e)
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
