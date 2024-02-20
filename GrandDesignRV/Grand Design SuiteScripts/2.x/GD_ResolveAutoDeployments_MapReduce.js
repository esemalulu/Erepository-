/**
 * @NApiVersion 2.x
 * @NScriptType MapReduceScript
 * @NModuleScope SameAccount
 */
define(['N/record', 'N/search', './GD_Constants'],

/**
 * @param {record} record module
 * @param {search} search module
 * @param {constants} constants
 */
function(record, search, constants) {

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
            var changeLogData = [];
            var customizationIds = [];

            var scriptId = 'customscriptgd_createtransferorder_sch';

            // Search to get all deployment customizations for our script id
            search.create({
                type: 'customrecord_flo_customization',
                filters: [
                    ['custrecord_flo_script_deployment.custrecord_flo_cust_id', 'startswith', scriptId],
                    'AND',
                    ['custrecord_flo_script_deployment.custrecord_flo_cust_type', 'anyof', constants.GD_STRONGPOINT_CUSTOMIZATION_TYPE_SCHEDULED_SCRIPT],
                    'AND',
                    ['custrecord_flo_cust_type', 'anyof', constants.GD_STRONGPOINT_CUSTOMIZATION_TYPE_SCRIPT_DEPLOYMENT]
                ],
                columns: []
            }).run().each(function(result) {
                customizationIds.push(result.id);

                return true;
            });

            // Only continue if we have deployment customizations
            if (customizationIds.length > 0) {
                // We only wish to resolve change logs created by certain users, so we exclude specific ids
                var excludedUserIds = [constants.GD_USER_ID_BRIAN_SUTTER, constants.GD_USER_ID_JOY_CHRISMAN, constants.GD_USER_ID_TWILA_ESHLEMAN];

                // Search to get noncompliant change logs that have not yet been closed
                search.create({
                    type: 'customrecord_flo_change_log',
                    filters: [
                        ['custrecord_flo_customization_record', 'anyof', customizationIds],
                        'AND',
                        ['custrecord_flo_nc', 'is', 'T'],
                        'AND',
                        ['custrecord_flo_user_link','noneof', excludedUserIds],
                        'AND',
                        ['custrecord_flo_changelog_status','anyof','@NONE@']
                    ],
                    columns: ['custrecord_flo_user_link']
                }).run().each(function(result) {
                    // Push the final data object for this Change Log
                    changeLogData.push({
                        changeLogId: result.id,
                        user: result.getValue({name: 'custrecord_flo_user_link'})
                    });

                    return true;
                });

                return changeLogData;
            }
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
            var mapData = JSON.parse(context.value);

            // To resolve a change log, we set the status as closed, and leave a reason for the resolution in the description
            var changeLogRecord = record.load({
                type: 'customrecord_flo_change_log',
                id: mapData.changeLogId
            });

            changeLogRecord.setValue({
                fieldId: 'custrecord_flo_resolution_desc',
                value: 'Script was auto-deployed.'
            });

            changeLogRecord.setValue({
                fieldId: 'custrecord_flo_changelog_status',
                value: constants.GD_STRONGPOINT_CHANGE_LOG_STATUS_CLOSED
            });

            changeLogRecord.save();
        } catch (error) {
            log.error('Map Error for change log: ' + JSON.parse(context.value).changeLogId, error);
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
        reduce: reduce,
        summarize: summarize
    };
});