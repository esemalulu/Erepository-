/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */
define(['N/record', 'N/search', 'N/sftp', 'N/file', 'N/runtime'],
    /**
     * @param{record} record
     * @param{search} search
     * @param{sftp} sftp
     * @param{file} file
     * @param{runtime} runtime
     */
    (record, search, sftp, file, runtime) => {

        const createConnection = () => {
            try {
                const guid = runtime.envType === runtime.EnvType.SANDBOX ? '55d89eed22b14c6cb65a8d6cfbea17bc' : '38955cfd1d314a68aa254a7bdad0d796';
                const connection = sftp.createConnection({
                    username: 'wgogdrvns.gdrvnetsuite',
                    passwordGuid: guid,
                    url: 'wgogdrvns.blob.core.windows.net',
                    port: 22,
                    hostKeyType: 'ecdsa',
                    hostKey: 'AAAAE2VjZHNhLXNoYTItbmlzdHAyNTYAAAAIbmlzdHAyNTYAAABBBN6KpNy9XBIlV6jsqyRDSxPO2niTAEesFjIScsq8q36bZpKTXOLV4MjML0rOTD4VLm0mPGCwhY5riLZ743fowWA='
                });
                if (connection) {
                    return connection;
                }
            } catch (e) {
                log.debug('CONNECTION FAILED', e.message);
                return null;
            }
            return null;
        }

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
            return search.create({
                type: 'customrecord_gd_supply_chain_export_proc',
                filters:
                    [
                        ['isinactive', 'is', 'F'],
                        'AND',
                        ['custrecord_scep_uploaded', 'is', 'F'],
                        'AND',
                        ['custrecord_scep_processed', 'is', 'T'],
                        'AND',
                        ['custrecord_scep_export_file', 'noneof', '@NONE@'],
                    ],
                columns:
                    [
                        search.createColumn({name: 'internalid', label: 'Internal ID'}),
                        search.createColumn({name: 'custrecord_scep_start_date', label: 'Start Date'}),
                        search.createColumn({name: 'custrecord_scep_uploaded', label: 'Uploaded'}),
                        search.createColumn({name: 'custrecord_scep_export_file', label: 'Export File'}),

                    ]
            });
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
            const mapContextValue = JSON.parse(mapContext.value);
            const searchResult = mapContextValue.values;
            log.debug('SEARCH RESULT', searchResult);
            const dummy = {
                recordType: 'customrecord_gd_supply_chain_export_proc',
                id: '21302',
                values: {
                    internalid: {
                        value: '21302',
                        text: '21302'
                    },
                    custrecord_scep_start_date: '5/3/2022 12:00:01 am',
                    custrecord_scep_uploaded: 'F',
                    custrecord_scep_export_file: {
                        value: '26020396',
                        text: 'GDRVTransactions_2022May_3.csv'
                    }
                }
            }
            // get the connection
            let objConnection = createConnection();
            const path = '';
            if (objConnection) {
                log.debug('CONNECTED!', 'Connected.');
                try {
                    const nsFile = file.load(searchResult.custrecord_scep_export_file.value);
                    // upload the file
                    objConnection.upload({
                        directory: path,
                        filename: searchResult.custrecord_scep_export_file.text,
                        file: nsFile,
                        replaceExisting: true
                    });
                    log.audit('UPLOADED!', `Uploaded ${searchResult.custrecord_scep_export_file.text}.`);
                    // Set the file as uploaded
                    record.submitFields({
                        type: 'customrecord_gd_supply_chain_export_proc',
                        id: mapContext.key,
                        values: {
                            custrecord_scep_uploaded: true
                        },
                        options: {
                            enableSourcing: false,
                            ignoreMandatoryFields: true
                        }
                    });
                } catch (e) {
                    if (e.name && e.name === 'FTP_INVALID_DIRECTORY')
                        log.error('DIRECTORY DOES NOT EXIST', 'The path ' + path + ' does not exist!');
                    else
                        log.error('ERROR CONNECTING OR DOWNLOADING', e);
                }
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
            let objConnection = createConnection();
            const path = '';
            if (objConnection) {
                const listing = objConnection.list({
                    path: path
                })
                log.debug('LISTING ONCE COMPLETE', listing);
            }
        }

        return {getInputData, map, summarize}

    });
