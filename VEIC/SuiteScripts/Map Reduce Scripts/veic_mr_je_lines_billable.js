/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */
define(['N/format', 'N/record', 'N/search'],
    /**
 * @param{format} format
 * @param{record} record
 * @param{search} search
 */
    (format, record, search) => {

        // Constants
        const SAVED_SEARCH_JE_LINES_BILLABLE = 'customsearch_veic_je_lines_billable';    
        const JE_ID_COLUMN = 'GROUP(internalid)';
        const JE_LINE_IDS_COLUMN = 'MIN(formulatext)';
        const JE_BILLING_STATUS_BILLABLE_NOT_BILLED = 2; // Billable - Not Billed

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
            return search.load({ id: SAVED_SEARCH_JE_LINES_BILLABLE });
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
            try {
                const searchResult = JSON.parse(mapContext.value);
                log.debug('Search Result', searchResult);                
                const jeId = searchResult.values[JE_ID_COLUMN] ? searchResult.values[JE_ID_COLUMN].value : null;
                const jeLineIds = searchResult.values[JE_LINE_IDS_COLUMN] ? searchResult.values[JE_LINE_IDS_COLUMN] : null;
                
                log.debug('JE ' + jeId + ' Billable Lines', jeLineIds);

                if(!jeId || !jeLineIds){
                    log.error('Missing JE ID or JE Line IDs', mapContext.value);
                    return;
                }

                const lines = jeLineIds.split(',');
                //log.debug('Parsed JE Lines', lines);      

                // Load the JE record
                const jeRecord = record.load({ type: record.Type.JOURNAL_ENTRY, id: jeId, isDynamic: false });
                // For each value in lines, find the matching JE line and update the Billing Status and Charge Link
                for (let i = 0; i < lines.length; i++) {                
                    try {
                        const jeLine = lines[i];
                        jeRecord.setSublistValue({
                            sublistId: 'line',
                            line: jeLine,
                            fieldId: 'custcol_veic_je_billing_status',
                            value: JE_BILLING_STATUS_BILLABLE_NOT_BILLED
                        });

                        log.debug('JE ' + jeId + ' Line ' + jeLine, 'JE Billing Status set to Billable - Not Billed');
                    } catch (lineErr) {
                        log.error('Error updating JE line', 'JE ' + jeId + ' line ' + jeLine + ' - ' + lineErr);
                        // continue to next line without failing the whole map for this JE
                        continue;
                    }
                }
                // Save the JE record after all lines have been updated
                try {
                    const id = jeRecord.save();
                    log.audit('JE ' + id + ' Updated Sucessfully', jeLineIds + ' lines updated to Billable - Not Billed');
                } catch (saveErr) {
                    log.error('Failed to save JE after updates', 'JE ID ' + jeId + ' - ' + saveErr);
                }         

            } catch (e) {
                log.error('Error processing JE line', mapContext.value);
                log.error('Error in map function', e);
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

        }

        return { getInputData, map/*, reduce, summarize*/ }

    });
