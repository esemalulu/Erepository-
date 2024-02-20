/**
 * @NApiVersion 2.x
 * @NScriptType MapReduceScript
 * @NModuleScope SameAccount
 */
define(['N/record', 'N/file', 'N/search', 'N/log'],

/**
 * @param {record} record module
 * @param {search} search module
 * @param {constants} constants
 */
function(record, file, search, log) {

    /**
     * Marks the beginning of the Map/Reduce process and generates input data.
     *
     * @typedef {Object} ObjectRef
     * @property {number} id - Internal ID of the record instance
     * @property {string} type - Record type id
     *
     * @return {Array|Object|Search|RecordRef} inputSummary
     * @since 2015.1
     */
    function getInputData() {
        try {
            var fileIds = [];

            var scriptId = 'customscriptgd_createtransferorder_sch';

            // Search to get all PCN PDF file Ids from the past week
            var oneWeekAgo = new Date();
            oneWeekAgo.setDate(oneWeekAgo.getDate() - 8); //setting to 8 days instead of 7 because it will be at 11:59 of 8 calendar days ago, encapsulating the entire last week
            oneWeekAgoStr = ((oneWeekAgo.getMonth() + 1) + '/' + (oneWeekAgo.getDate()) + '/' + (oneWeekAgo.getFullYear()) + ' 11:59 pm');
            
            var fileSearch = search.create({
                type: 'file',
                filters: [
                    ["folder","anyof","-10","-14"], 
                    "AND", 
                    ["filetype","anyof","PDF"], 
                    "AND", 
                    ["name","startswith","PCN"],
                    "AND", 
                    ["created","after",oneWeekAgoStr]
                ],
                columns: []
            }).runPaged({pageSize: 1000});
            fileSearch.pageRanges.forEach(function(pageRange){
                fileSearch.fetch({index: pageRange.index}).data.forEach(function(result){
                    fileIds.push(result.id);
                    return true;
                });
            });
            return fileIds;

        } catch (error) {
            log.error('Input error', error);
            throw error;
        }
    }

    /**
     * Executes when the map entry point is triggered and applies to each key/value pair.
     *
     * @param {MapSummary} context - Data collection containing the key/value pairs to process through the map stage
     * @since 2015.1
     */
    function map(context) {
        try {
            // Set every PCN PDF File as inactive so they don't show up in the global search
            var fileRecord = file.load({
                id: context.value
            });
            fileRecord.isInactive = true;
            fileRecord.save();

        } catch (error) {
            log.error('Map Error for file: ' + context.value, error);
            throw error;
        }
    }

    /**
     * Executes when the reduce entry point is triggered and applies to each group.
     *
     * @param {ReduceSummary} context - Data collection containing the groups to process through the reduce stage
     * @since 2015.1
     */
    function reduce(context) {

    }

    /**
     * Executes when the summarize entry point is triggered and applies to the result set.
     *
     * @param {Summary} summary - Holds statistics regarding the execution of a map/reduce script
     * @since 2015.1
     */
    function summarize(summary) {
        // Log details about script execution
        log.audit('Usage units consumed', summary.usage);
        log.audit('Concurrency', summary.concurrency);
        log.audit('Number of yields', summary.yields);
    }

    return {
        getInputData: getInputData,
        map: map,
        // reduce: reduce,
        summarize: summarize
    };
});