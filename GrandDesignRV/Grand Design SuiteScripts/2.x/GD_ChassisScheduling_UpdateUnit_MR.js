/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */
define(['N/config', 'N/query', 'N/record', 'N/runtime', './GD_Constants.js'],
/**
* @param{query} query
* @param{record} record
* @param{runtime} runtime
*/
(config, query, record, runtime, GD_Constants) => {
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
        // Grab the data from the parameter passed through
        return JSON.parse(runtime.getCurrentScript().getParameter({name: 'custscriptgd_updateunits_data'}));
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
        // Update the Unit record
        var unitData = JSON.parse(mapContext.value);
        let tryCount = 5;

        while (tryCount != 0) {
            try {
                // Update fields on the Unit
                record.submitFields({
                    type: 'customrecordrvsunit',
                    id: unitData.unit_id,
                    values: {
                        'custrecordgd_unit_chassisinvnum': unitData.unit_chassisinvnum_id,
                        'name': unitData.unit_chassisinvnum
                    }
                });
                break;
            } catch (e) {
                // If there was a record collision, try again, if not, throw the error
                log.audit('ERROR while updating SO: ' + unitData.transaction_internalid, e);
                if (e.name == 'RCRD_HAS_BEEN_CHANGED' && tryCount > 0) {
                    tryCount--;
                    continue;
                }
                else {
                    // We only want to throw the error if we didn't solve the issue by retrying
                    throw e;
                }
            }
        }
    }

    /**
     * Defines the function that is executed when the reduce entry point is triggered. This entry point is triggered
     * automatically when the associated map stage is complete. This function is applied to each group in the provided context.
     * @param {Object} reduceContext - Data collection containing the groups to process in the reduce stage. This parameter is
     *     provided automatically based on the results of the map stage.
     * @param {Iterator} reduceContext.errors - Serialized errors that were thrown during previous attempts to execute the
     *     reduce function on the current group
     * @param {number} reduceContext.executionNo - Number of times the reduce function has been executed on the current group
     * @param {boolean} reduceContext.isRestarted - Indicates whether the current invocation of this function is the first
     *     invocation (if true, the current invocation is not the first invocation and this function has been restarted)
     * @param {string} reduceContext.key - Key to be processed during the reduce stage
     * @param {List<String>} reduceContext.values - All values associated with a unique key that was passed to the reduce stage
     *     for processing
     * @since 2015.2
     */
    const reduce = (reduceContext) => {

    }


    /**
     * Defines the function that is executed when the summarize entry point is triggered. This entry point is triggered
     * automatically when the associated reduce stage is complete. This function is applied to the entire result set.
     * @param {Object} summaryContext - Statistics about the execution of a map/reduce script
     * @param {number} summaryContext.concurrency - Maximum concurrency number when executing parallel tasks for the map/reduce
     *     script
     * @param {Date} summaryContext.dateCreated - The date and time when the map/reduce script began running
     * @param {boolean} summaryContext.isRestarted - Indicates whether the current invocation of this function is the first
     *     invocation (if true, the current invocation is not the first invocation and this function has been restarted)
     * @param {Iterator} summaryContext.output - Serialized keys and values that were saved as output during the reduce stage
     * @param {number} summaryContext.seconds - Total seconds elapsed when running the map/reduce script
     * @param {number} summaryContext.usage - Total number of governance usage units consumed when running the map/reduce
     *     script
     * @param {number} summaryContext.yields - Total number of yields when running the map/reduce script
     * @param {Object} summaryContext.inputSummary - Statistics about the input stage
     * @param {Object} summaryContext.mapSummary - Statistics about the map stage
     * @param {Object} summaryContext.reduceSummary - Statistics about the reduce stage
     * @since 2015.2
     */
    const summarize = (summaryContext) => {
        // Grab the Processing Record ID that was passed in.
        let processingRecordID = runtime.getCurrentScript().getParameter({name: 'custscriptgd_updateunits_procid'});
        let anyErrors = false;

        // Log any errors that occurred during the map stage for debugging purposes.
        summaryContext.mapSummary.errors.iterator().each(function (key, error) {
            log.error('Map Error for key: ' + key, error);
            anyErrors = true;
            return true;
        });

        // Add the fields that we need to update
        let updateFields = {'custrecordgd_chassissched_unitmrcomplete': true}
        if (anyErrors) 
            updateFields['custrecordgd_chassissched_status'] = GD_Constants.GD_CHASSISSCHEDULINGSTATUS_ERROR;
        
        // Update the Processing Record
        record.submitFields({
            type: 'customrecordgd_chassissched_procrec',
            id: processingRecordID,
            values: updateFields
        });
    }

    return {getInputData, map, reduce, summarize}

});
