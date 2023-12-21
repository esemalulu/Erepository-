/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 * @NModuleScope SameAccount
 *
 * This script was provided by Starling Solutions.
 *
 * Fix your mistakes with this! Use this like the ss_map script in other accounts.
 *
 *  Version        Date          Author        Ticket            Remarks
 *************************************************************************
 *  1.0            30 Jul 2021   Nicholas Bell                  Initial Version
 *************************************************************************
 */

define(['N/record', 'N/search'],

    /**
     * @param {record} record
     * @param {search} search
     */
    function (record, search) {

        /**
         * Marks the beginning of the Map/Reduce process and generates input data.
         *
         * @typedef {Object} ObjectRef
         * @property {number} id - Internal ID of the record instance
         * @property {string} type - Record type id
         *
         * @return {Array|Object|Search|RecordRef} inputSummary
         */
        function getInputData () {
            log.debug({ title : '** START **', details : '******' });

            //Load up Custom Blend Shipping Group Search
            return getSearchResults(search.load({ id : 1044 }));
        }


        /**
         * Executes when the map entry point is triggered and applies to each key/value pair.
         *
         * @param {MapSummary} context - Data collection containing the key/value pairs to process through the map stage
         */
        function map (context) {
            log.debug({ title : 'Processing result ' + context.key, details : 'Value: ' + context.value });
            let currentData = JSON.parse(context.value);

            record.delete({ type : 'customrecord_blend_shipping_group', id : currentData.id });
        }


        /**
         * Executes when the reduce entry point is triggered and applies to each group.
         *
         * @param {ReduceSummary} context - Data collection containing the groups to process through the reduce stage
         */
        function reduce (context) {

        }


        /**
         * Executes when the summarize entry point is triggered and applies to the result set.
         *
         * @param {Summary} summary - Holds statistics regarding the execution of a map/reduce script
         */
        function summarize (summary) {
            log.debug({ title : 'Summary', details : JSON.stringify(summary) });

            summary.mapSummary.errors.iterator().each(function (key, error, executionNo) {
                log.error({
                    title   : 'Map error for key: ' + key + ', execution no.  ' + executionNo,
                    details : error
                });
                return true;
            });

            summary.reduceSummary.errors.iterator().each(function (key, error, executionNo) {
                log.error({
                    title   : 'Reduce error for key: ' + key + ', execution no.  ' + executionNo,
                    details : error
                });
                return true;
            });

            log.debug({ title : '** END **', details : '******' });
        }


        // Helper Functions

        /**
         *    Returns all the results of a search by grabbing them 1000 at a time.
         *
         * @param {Search} thisSearch - Object representation of a search
         * @return {Result[]} results - Array of object representations of search results
         */
        function getSearchResults (thisSearch) {

            var results   = [];
            var pagedData = thisSearch.runPaged({ pageSize : 1000 });

            if (pagedData.count == 0) {
                return results;
            }

            var page = pagedData.fetch({ index : 0 });
            results  = page.data;

            while (!page.isLast) {
                page    = page.next();
                results = results.concat(page.data);
            }
            return results;
        }


        return {
            getInputData : getInputData,
            map          : map,
            reduce       : reduce,
            summarize    : summarize
        };

    });