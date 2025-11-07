/**
 * Update the stage for a batch of charges.
 * 
 * Used by the custom manage pending charging Suitelet for
 * processing updates asynchronously. This is required since it's possible that users may try to
 * update large batches of charges at once. By moving the processing to a map/reduce script we avoid
 * slow UI and potentially running into governance limits.
 * 
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */

/**
 * @typedef ChargeUpdate
 * @property {number} chargeId
 * @property {string} stage
 */

const FILE_ID_PARAM = 'custscript_charge_updates_file_id';

// @ts-ignore
define(['N/runtime', 'N/file', 'N/record', 'N/log'],
    /**
     * @typedef runtime
     * @typedef file
     * @typedef record
     * @typedef log
     * @typedef Search
     * @typedef Query
     * 
     * @param{runtime} runtime
     * @param{file} file
     * @param{record} record
     * @param{log} log
     */
    (runtime, file, record, log) => {
        /**
         * Defines the function that is executed at the beginning of the map/reduce process and generates the input data.
         * @param {Object} inputContext
         * @param {boolean} inputContext.isRestarted - Indicates whether the current invocation of this function is the first
         *     invocation (if true, the current invocation is not the first invocation and this function has been restarted)
         * @param {Object} inputContext.ObjectRef - Object that references the input data
         * @typedef {Object} ObjectRef
         * @property {string|number} ObjectRef.id - Internal ID of the record instance that contains the input data
         * @property {string} ObjectRef.type - Type of the record instance that contains the input data
         * @returns {Array|Object|Search|ObjectRef|File|Query} The input data to use in the map/reduce process
         * @since 2015.2
         */
        const getInputData = (inputContext) => {
            const script = runtime.getCurrentScript();
            const chargesFileId = script.getParameter({name: FILE_ID_PARAM});
            if (!chargesFileId) {
                throw new Error('Missing filepath parameter for charge updates file');
            }

            /** @type {Array<ChargeUpdate>} chargeUpdates */
            const chargeUpdates = JSON.parse(file.load({id: chargesFileId}).getContents());
            const pairs = {};
            for (const c of chargeUpdates) {
                pairs[c.chargeId] = c.stage;
            }

            return pairs;
        }

        /**
         * Defines the function that is executed when the map entry point is triggered. This entry point is triggered automatically
         * when the associated getInputData stage is complete. This function is applied to each key-value pair in the provided
         * context.
         * @param {Object} mapContext - Data collection containing the key-value pairs to process in the map stage. This parameter
         *     is provided automatically based on the results of the getInputData stage.
         * @param {Iterator} mapContext.errors - Serialized errors that were thrown during previous attempts to execute the map
         *     function on the current key-value pair
         * @param {number} mapContext.executionNo - Number of times the map function has been executed on the current key-value
         *     pair
         * @param {boolean} mapContext.isRestarted - Indicates whether the current invocation of this function is the first
         *     invocation (if true, the current invocation is not the first invocation and this function has been restarted)
         * @param {string} mapContext.key - Key to be processed during the map stage
         * @param {string} mapContext.value - Value to be processed during the map stage
         * @since 2015.2
         */

        const map = (mapContext) => {
            const chargeId = mapContext.key;
            const stage = mapContext.value;
            try {
                record.submitFields({
                    type: record.Type.CHARGE,
                    id: chargeId,
                    values: {stage}
                });
                log.debug({
                    title: 'Charge Stage Update',
                    details: `Updated charge: ${chargeId} to stage: ${stage}`
                });
            } catch (e) {
                const msg = `Failed to update charge: ${chargeId} to stage ${stage}: ${e.message}`;
                throw Error(msg);
            }
        }

        /**
         * Defines the function that is executed when the summarize entry point is triggered. This entry point is triggered
         * automatically when the associated reduce stage is complete. This function is applied to the entire result set.
         * @param {Object} summary - Statistics about the execution of a map/reduce script
         * @param {number} summary.concurrency - Maximum concurrency number when executing parallel tasks for the map/reduce
         *     script
         * @param {Date} summary.dateCreated - The date and time when the map/reduce script began running
         * @param {boolean} summary.isRestarted - Indicates whether the current invocation of this function is the first
         *     invocation (if true, the current invocation is not the first invocation and this function has been restarted)
         * @param {Iterator} summary.output - Serialized keys and values that were saved as output during the reduce stage
         * @param {number} summary.seconds - Total seconds elapsed when running the map/reduce script
         * @param {number} summary.usage - Total number of governance usage units consumed when running the map/reduce
         *     script
         * @param {number} summary.yields - Total number of yields when running the map/reduce script
         * @param {Object} summary.inputSummary - Statistics about the input stage
         * @param {Object} summary.mapSummary - Statistics about the map stage
         * @param {Object} summary.reduceSummary - Statistics about the reduce stage
         * @since 2015.2
         */
        const summarize = (summary) => {
            const errors = [];
            summary.mapSummary.errors.iterator().each((_, error) => errors.push(error));
            if (errors.length > 0) {
                for (const e of errors) {
                    log.error({title: 'Charge Update Error', details: e});
                }

                return; // Don't delete the data file if there were errors
            }

            const script = runtime.getCurrentScript();
            const chargesFileId = script.getParameter({name: FILE_ID_PARAM});
            if (!chargesFileId) {
                throw new Error('Missing filepath parameter for charge updates file');
            }

            file.delete({id: chargesFileId});
        }

        return {getInputData, map, summarize}
    }
);
