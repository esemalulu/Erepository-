/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 * @NModuleScope SameAccount
 */
define(['N/record', 'N/search','N/runtime'],
/**
 * @param {record} record
 * @param {search} search
 * @param {runtime} runtime
 */
function(record, search, runtime) {
    function handleErrorAndLog(e, stage) {
        log.error('Stage: ' + stage + ' failed', e);
    }

    function handleErrorIfAny(summary) {
        var inputSummary = summary.inputSummary;
        var mapSummary = summary.mapSummary;
        var reduceSummary = summary.reduceSummary;

        if (inputSummary.error) {
            handleErrorAndLog(inputSummary.error, 'getInputData');
        }

        handleErrorInStage('map', mapSummary);
        handleErrorInStage('reduce', reduceSummary);
    }

    function handleErrorInStage(stage, summary) {
        var errorMsg = [];
        summary.errors.iterator().each(function(key, value) {
            var msg = 'Failed to process record id: ' + key + '. Error was: ' + JSON.parse(value).message + '\n';
            errorMsg.push(msg);
            return true;
        });
    }

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
        var script = runtime.getCurrentScript();
        var recordType = script.getParameter({name:'custscriptgd_deleterec_rectype'});
        var filter1Field = script.getParameter({name:'custscriptgd_deleterec_filter1field'})||'';
        var filter1Operator = script.getParameter({name:'custscriptgd_deleterec_filter1operator'})||'';
        var filter1Value = script.getParameter({name:'custscriptgd_deleterec_filter1value'})||'';
        var filter2Field = script.getParameter({name:'custscriptgd_deleterec_filter2field'})||'';
        var filter2Operator = script.getParameter({name:'custscriptgd_deleterec_filter2operator'})||'';
        var filter2Value = script.getParameter({name:'custscriptgd_deleterec_filter2value'})||'';
        var filters = [];

        log.audit('Record Type', recordType);

        if(filter1Field != '') filters.push([filter1Field, filter1Operator, filter1Value]);

        if(filter1Field != '' && filter2Field != '')
        {
            filters.push('AND');
            filters.push([filter2Field, filter2Operator, filter2Value]);
        }

        log.audit('Applied Filters', filters);

        var recordCountSearch =  search.create({
            type: recordType,
            filters: filters
        });

        var searchResultCount = recordCountSearch.runPaged().count;
        log.audit('Records to Delete', searchResultCount);

        return recordCountSearch;
    }

    /**
     * Executes when the map entry point is triggered and applies to each key/value pair.
     *
     * @param {MapSummary} context - Data collection containing the key/value pairs to process through the map stage
     * @since 2015.1
     */
    function map(context) {
        var searchResult = JSON.parse(context.value);
        var internalId = searchResult.id;
        var recordType = searchResult.recordType;

        try {
            var taskIsRunning = false;

            // Make sure that, if we're deleting a Script Deployment, it is not currently running.
            if (recordType == search.Type.SCHEDULED_SCRIPT_INSTANCE) {
                taskIsRunning = search.create({
                    type: search.Type.SCHEDULED_SCRIPT_INSTANCE,
                    filters:
                    [
                        ['script.internalid', 'anyof', internalId],
                        'AND',
                        ['status', 'noneof', 'PROCESSING', 'PENDING', 'RESTART', 'RETRY'],
                    ],
                    columns:
                    [
                        'Internalid'
                    ]
                }).runPaged().count > 0;
            }

            if (taskIsRunning) {
                log.audit('Skipping Running Deployment', internalId);
            }
            else {
                record.delete({
                   type: recordType,
                   id: internalId,
                });
            }
        }
        catch(er) {
            log.error('Failed ID: ' + internalId, er);
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

    }

    return {
        getInputData: getInputData,
        map: map,
        reduce: reduce,
        summarize: summarize
    };

});
