/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */
define(['N/log', 'N/query', 'N/record'],
    /**
     * @param{log} log
     * @param{query} query
     * @param{record} record
     */
    (log, query, record) => {
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
            try {
                let getInputData_SuiteQL = `SELECT CUSTOMRECORDRVSUNIT.id as unit_id FROM CUSTOMRECORDRVSUNIT WHERE CUSTOMRECORDRVSUNIT.custrecordunit_onlinedate >= '05/24/2022' AND CUSTOMRECORDRVSUNIT.custrecordunit_onlinedate <= '08/04/2022'`;

                let data = [];
                var getInputData_SuiteQLResult = [];
                getInputData_SuiteQLResult = query.runSuiteQLPaged({
                    query: getInputData_SuiteQL,
                    pageSize: 1000
                }).iterator();
                // Fetch results using an iterator
                if (getInputData_SuiteQLResult != []) {
                    getInputData_SuiteQLResult.each(function (pagedData) {
                        data = data.concat(pagedData.value.data.asMappedResults());
                        return true;
                    });
                }
                return data;
            } catch (e) {
                log.error('error: ', e);
            }

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
                let pagedData = JSON.parse(mapContext.value);
                //log.debug('pagedData', pagedData);
                let map_SuiteQL = `SELECT SUM(CASE WHEN CUSTOMRECORDRVSUNITAPPLIANCES.custrecordgd_unitappliances_category is null THEN 1 ELSE 0 END) AS null_categ, COUNT(CUSTOMRECORDRVSUNITAPPLIANCES.id) AS total_categ FROM CUSTOMRECORDRVSUNITAPPLIANCES WHERE CUSTOMRECORDRVSUNITAPPLIANCES.custrecordunitappliances_unit = ${pagedData.unit_id}`

                var map_SuiteQLResults = [];
                map_SuiteQLResults = query.runSuiteQL({
                    query: map_SuiteQL,
                }).asMappedResults();
                // log.debug('(map_SuiteQLResults[0].null_categ / map_SuiteQLResults[0].total_categ) >= 0.4', (map_SuiteQLResults[0].null_categ / map_SuiteQLResults[0].total_categ).toFixed(2) )
                if( ((map_SuiteQLResults[0].null_categ / map_SuiteQLResults[0].total_categ).toFixed(2) >= 0.40) && ((map_SuiteQLResults[0].null_categ / map_SuiteQLResults[0].total_categ).toFixed(2) <= 0.90) ){
                    log.audit(pagedData.unit_id);
                }
                //log.debug('map_SuiteQLResults', map_SuiteQLResults);
            } catch (err) {
                log.error('error: ', err);
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
            // Log details about script execution
            log.audit('Usage units consumed', summaryContext.usage);
            log.audit('Concurrency', summaryContext.concurrency);
            log.audit('Number of yields', summaryContext.yields);
        }

        return {
            getInputData,
            map,
            //reduce,
            summarize
        }

    });

    const LogToFile = (fileName, contents) => {
        try {
            var fileObj = file.create({
                name: fileName,
                fileType: file.Type.PLAINTEXT,
                contents: contents,
                encoding: file.Encoding.UTF8,
                folder: 4665305, //Log Files Folder in GD Dev
                isOnline: true
            });
            // Save the file
            fileObj.save();
            log.debug(`${fileName} File Saved`);
        } catch (fileErr) {
            log.debug(`${fileName} File error: `, fileErr);
        }
    }