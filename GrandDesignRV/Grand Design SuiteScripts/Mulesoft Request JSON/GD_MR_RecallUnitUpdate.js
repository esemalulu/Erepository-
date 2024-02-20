/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */
define(['N/record', 'N/runtime', 'N/search', 'N/query', '../Libraries/lodash.min'],
    /**
     * @param{record} record
     * @param{runtime} runtime
     * @param{search} search
     * @param{query} query
     */
    (record, runtime, search, query, lodash) => {
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
            const flatRateCodeId = runtime.getCurrentScript().getParameter({name: 'custscript_gd_flat_rate_code_id'});
            log.debug('flatRateCodeId', flatRateCodeId);
            if (flatRateCodeId) {
                return [flatRateCodeId];
            } else {
                var searchObj = search.create({
                    type: 'customrecordrvsflatratecodes',
                    filters:
                        [
                            ['isinactive', 'is', 'F']
                        ],
                    columns:
                        [
                            search.createColumn({
                                name: 'name',
                                sort: search.Sort.ASC,
                                label: 'ID'
                            }),
                            search.createColumn({name: 'altname', label: 'Name'}),
                        ]
                });
                const flatRateCodes = [];
                searchObj.run().each(function (result) {
                    flatRateCodes.push(result.id);
                    return true;
                });
                return flatRateCodes;
            }
            return [];
        }

        /**
         * Get the attached recall units for the flat rate code.
         * Get the Recall Unit Integration Queues that already exist for the flat rate code.
         * For the Recall Unit Integration Queues that do not exist, create the queue.
         *
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
            log.debug({title: 'mapContext', details: mapContext});
            const scriptObj = runtime.getCurrentScript();
            /**
             * Gets the recall units attached to the flat rate code.
             * @param flatRateCodeId
             * @returns {*[]}
             */
            const getAttachedRecallUnits = (flatRateCodeId) => {
                const searchObj = search.create({
                    type: 'customrecordrvs_recallunit',
                    filters:
                        [
                            ['custrecordrecallunit_recallcode', 'anyof', flatRateCodeId],
                            'AND',
                            ['isinactive', 'is', 'F']
                        ],
                    columns:
                        [
                            search.createColumn({
                                name: 'name',
                                sort: search.Sort.ASC,
                                label: 'ID'
                            }),
                            search.createColumn({name: 'custrecordrecallunit_status', label: 'Status'})
                        ]
                });
                const recallUnits = [];
                const pagedResults = searchObj.runPaged({pageSize: 1000});
                pagedResults.pageRanges.forEach(function (pageRange) {
                    pagedResults.fetch({index: pageRange.index}).data.forEach(function (result) {
                        recallUnits.push({
                            id: Number(result.id),
                            status: result.getValue({name: 'custrecordrecallunit_status'})
                        });
                        return true;
                    });
                });
                log.debug({title: 'recallUnits', details: recallUnits.length})
                return recallUnits;
            }
            /**
             * Gets the existing queue records for the recall units.
             * @param recallUnitIds
             * @returns {*}
             */
            const getExistingQueueRecords = (recallUnitIds) => {
                const ids = `(${recallUnitIds.join(',')})`;
                const sql = `SELECT
                                c9.id,
                                c9.custrecord_9_recordid as recallunitid,
                            FROM
                                CUSTOMRECORD_9_INTEGRATION_QUEUE c9
                            WHERE
                                c9.custrecord_9_recordid IN ${ids} AND c9.isinactive = 'F'`;


                return query.runSuiteQL({query: sql}).asMappedResults();
            }

            const getNewRecallUnits = (flatRateCodeId) => {
                //custscript_gd_ru_ignore_existing
                const setInactive = runtime.getCurrentScript().getParameter({name: 'custscript_gd_ru_set_inactive'});
                const ignoreExisting = runtime.getCurrentScript().getParameter({name: 'custscript_gd_ru_ignore_existing'});
                // Get the attached recall units for the flat rate code.
                const attachedRecallUnits = getAttachedRecallUnits(flatRateCodeId);
                if(ignoreExisting === 'T' || ignoreExisting === true) {
                    return attachedRecallUnits;
                }
                //log.debug('getNewRecallUnits Remaining governance units: ' + scriptObj.getRemainingUsage());
                //log.debug({title: 'attachedRecallUnits', details: attachedRecallUnits.length})
                // Get the Recall Unit Integration Queues that already exist for the flat rate code. 
                const recallUnitIds = attachedRecallUnits.map(recallUnit => recallUnit.id);
                // Use SuiteQL to get the existing queue records. The limit is 1000 records due to the IN clause.
                const chunks = _.chunk(recallUnitIds, 1000);
                let existingQueueRecords = [];
                chunks.forEach(chunk => {
                    const existingQueueRecordsChunk = getExistingQueueRecords(chunk);
                    existingQueueRecords = existingQueueRecords.concat(existingQueueRecordsChunk);
                });
                //log.debug({title: 'existingQueueRecords', details: existingQueueRecords.length})
                //log.debug('existingQueueRecords Remaining governance units: ' + scriptObj.getRemainingUsage());
              
                log.debug({title: 'setInactive', details: setInactive});
                if (runtime.envType === runtime.EnvType.SANDBOX && (setInactive === 'T' || setInactive === true)) {
                    //log.debug('existingQueueRecords', existingQueueRecords.length);
                    return existingQueueRecords;
                }
                const existingQueueRecordIds = existingQueueRecords.map(queueRecord => Number(queueRecord.recallunitid));
                // Filter out the recall units that already have a queue record.
                return attachedRecallUnits.filter(x => !existingQueueRecordIds.includes(x.id));
            }
            
            const flatRateCodeId = Number(mapContext.value);
            const newRecallUnits = getNewRecallUnits(flatRateCodeId);
            //log.debug('newRecallUnits Remaining governance units: ' + scriptObj.getRemainingUsage());
            if (newRecallUnits.length > 0) {
                //log.debug({title: 'Count of newRecallUnits', details: newRecallUnits.length});
                // Chunk the recall units into groups of 800.
                // Only 800 records can be written to the queue at a time, otherwise the script will fail due to a governance limit.
                const chunks = _.chunk(newRecallUnits, 800);
                chunks.forEach((chunk, index) => {
                    mapContext.write({
                        key: `${flatRateCodeId}_${index}`,
                        value: chunk
                    });
                });
            }
        }

        /**
         * Creates the Recall Unit Integration Queue records.
         *
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
            const setInactive = runtime.getCurrentScript().getParameter({name: 'custscript_gd_ru_set_inactive'});
            const searchResults = reduceContext.values.map(result => JSON.parse(result));
            log.debug({title: 'Count of flat rate codes', details: searchResults.length});
            if (searchResults && searchResults.length) {
                log.debug({title: 'Count of integration records to create', details: searchResults[0].length});
                searchResults[0].forEach(result => {
                    log.debug({title: 'result', details: result});
                    if (runtime.envType === runtime.EnvType.SANDBOX && (setInactive === 'T' || setInactive === true)) {
                        try {
                            record.submitFields({
                                type: 'customrecord_9_integration_queue',
                                id: result.id,
                                values: {
                                    custrecord_9_status: 4,
                                    isinactive: true
                                }
                            });
                            log.audit(`${result.id} set to inactive`);
                        } catch (e) {
                            log.error('ERROR SETTING INACTIVE', e);
                        }
                    } else {
                        // Governance: 2
                        const queueRecord = record.create({
                            type: 'customrecord_9_integration_queue'
                        });
                        queueRecord.setValue({
                            fieldId: 'custrecord_9_recordid',
                            value: result.id
                        });
                        queueRecord.setValue({
                            fieldId: 'custrecord_9_reference',
                            value: 'CREATE'
                        });
                        queueRecord.setValue({
                            fieldId: 'custrecord_9_lastattemptdate',
                            value: new Date()
                        });

                        queueRecord.setValue({
                            fieldId: 'custrecord_9_recordtype',
                            value: 3
                        });

                        queueRecord.setValue({
                            fieldId: 'custrecord_9_status',
                            value: 1
                        });
                        // Governance 4
                        const intRecId = queueRecord.save();
                        log.audit(`${result.id} : Created Integration Record`, intRecId);
                    }
                });
            }
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
            if (summaryContext.inputSummary.error) {
                log.error({title: 'Input Error', details: summaryContext.inputSummary.error});
            }
            summaryContext.mapSummary.errors.iterator().each(function (key, error) {
                log.error({title: `Map Error for key: ${key}`, details: error});
                return true;
            });
            summaryContext.reduceSummary.errors.iterator().each(function (key, error) {
                log.error({title: `Reduce Error for key: ${key}`, details: error});
                return true;
            });
        }

        return {getInputData, map, reduce, summarize}

    });
