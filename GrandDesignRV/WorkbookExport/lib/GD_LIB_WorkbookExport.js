/**
 * @NApiVersion 2.1
 */
define(['N/record', 'N/search', 'N/format', 'N/file', './moment.min', './GD_LIB_Constants'],
    /**
     * @param{record} record
     * @param{search} search
     * @param moment
     * @param Constants
     */
    (record, search, format, file, moment, Constants) => {

        class WorkbookExport {
            constructor(props) {

            }

            static getEasternDate(dateToFormat) {
                const currentDate = moment(dateToFormat).toDate();
                const formattedDate = format.format({
                    value: currentDate,
                    type: format.Type.DATETIMETZ,
                    timezone: format.Timezone.AMERICA_NEW_YORK
                });
                return moment(formattedDate).subtract(3, 'hours').toDate();
            }

            shouldAbort() {
                const customrecord_gd_supply_chain_export_procSearchObj = search.create({
                    type: 'customrecord_gd_supply_chain_export_proc',
                    filters:
                        [
                            ['custrecord_scep_abort', 'is', 'T']
                        ],
                    columns:
                        [
                            search.createColumn({name: 'id', label: 'ID'})
                        ]
                });
                return customrecord_gd_supply_chain_export_procSearchObj.runPaged().count;
            }

            createInitialRunInfo() {
                const recordObj = record.create({
                    type: 'customrecord_gd_supply_chain_export_proc',
                    isDynamic: true
                });
                const startOfLastMonth = moment().subtract(1, 'month').startOf('month').format('M/DD/YYYY hh:mm:ss a');
                const startOfThisMonth = moment().startOf('month').toDate();
                recordObj.setText({fieldId: 'custrecord_scep_start_date', text: startOfLastMonth});
                recordObj.setValue({fieldId: 'custrecord_scep_timespan', value: 1});
                recordObj.setValue({fieldId: 'custrecord_scep_end_date', value: startOfThisMonth});
                return recordObj.save();
            }
            /* function setDateText(text) {
                 const recordObj = record.load({
                     type: 'customrecord_gd_supply_chain_export_proc',
                     id: 2904,
                     isDynamic: true
                 });
                 recordObj.setText({fieldId: 'custrecord_scep_start_date', text: text});
                 recordObj.save();
             }*/
            createRunInfo(runInfo, useSameStartDate = false) {
                log.debug('runInfo', runInfo);
                log.debug('startDate', runInfo.startDate);
                let startDate = runInfo.startDate;
                try {
                    const recordObj = record.create({
                        type: 'customrecord_gd_supply_chain_export_proc',
                        isDynamic: true
                    });
                    let duration = Constants.TIMESPAN[runInfo.timespan].duration;
                    // Use the current date if the task failed.
                    let nextDay = moment(startDate).format('M/DD/YYYY hh:mm:ss a');
                    if (!useSameStartDate) {
                        nextDay = moment(startDate).add(Constants.TIMESPAN[runInfo.timespan].value, Constants.TIMESPAN[runInfo.timespan].duration).toDate();
                        // If the next day is after the start date, set the duration back to the default of days.
                        if (moment(nextDay).isSameOrAfter(moment(startDate).add(1, 'days'))) {
                            log.debug('createRunInfo', 'Setting duration back to days.');
                            runInfo.timespan = 1;
                            //nextDay = moment(startDate).add(1, duration).toDate();
                            nextDay = moment(startDate).add(1, duration).format('M/DD/YYYY hh:mm:ss a');
                        }
                        nextDay = moment(nextDay).format('M/DD/YYYY hh:mm:ss a');
                    }
                    const currentEndDate = moment(runInfo.endDate).toDate();
                    log.debug('createRunInfo', `Timespan: ${Constants.TIMESPAN[runInfo.timespan].value} ${Constants.TIMESPAN[runInfo.timespan].duration} Start date: ${startDate} End date: ${runInfo.endDate} Next day: ${nextDay} Current end date: ${currentEndDate}`);
                    recordObj.setText({fieldId: 'custrecord_scep_start_date', text: nextDay});
                    recordObj.setValue({fieldId: 'custrecord_scep_timespan', value: runInfo.timespan});
                    // Keep the same end date. This is when the process will terminate.
                    recordObj.setValue({fieldId: 'custrecord_scep_end_date', value: currentEndDate});
                    recordObj.setValue({fieldId: 'custrecord_scep_next_counter', value: runInfo.nextCounter});

                    // Don't save the record if the start date is greater or the same as the process termination end date.
                    // This will prevent the process from running again.
                    if (!moment(nextDay).isSameOrAfter(moment(runInfo.endDate))) {
                        recordObj.save();
                        log.debug('createRunInfo', 'Created new record with start date: ' + nextDay + ' and end date: ' + runInfo.endDate)
                    } else {
                        log.debug('createRunInfo', 'Start date is greater than or the same as the process termination end date. Not creating a new record.');
                        // TODO: SFTP the files to the server.
                    }
                } catch (e) {
                    log.error('createRunInfo', e);
                }
            }

            _getRecord(executing = false) {
                const criteria = executing ? 'isnotempty' : 'isempty';
                const searchObj = search.create({
                    type: 'customrecord_gd_supply_chain_export_proc',
                    filters:
                        [
                            ['custrecord_scep_processed', 'is', 'F'],
                            'AND',
                            ['formulanumeric: rownum', 'equalto', '1'],
                            'AND',
                            ['custrecord_scep_task_id', criteria, '']
                        ],
                    columns:
                        [
                            search.createColumn({name: 'id', label: 'ID'}),
                            search.createColumn({name: 'custrecord_scep_start_date', label: 'Start Date'}),
                            search.createColumn({name: 'custrecord_scep_end_date', label: 'End Date'}),
                            search.createColumn({name: 'custrecord_scep_export_file', label: 'Export File'}),
                            search.createColumn({name: 'custrecord_scep_processed', label: 'Processed'}),
                            search.createColumn({name: 'custrecord_scep_task_status', label: 'Task Status'}),
                            search.createColumn({name: 'custrecord_scep_task_id', label: 'Task ID'}),
                            search.createColumn({name: 'custrecord_scep_timespan', label: 'Timespan'}),
                            search.createColumn({name: 'custrecord_scep_next_counter', label: 'Next Counter'}),
                            search.createColumn({name: 'custrecord_scep_filename', label: 'Filename'}),
                        ]
                });
                const runInfo = {};
                searchObj.run().each(function (result) {
                    runInfo.id = result.getValue({name: 'id'});
                    runInfo.startDate = result.getValue({name: 'custrecord_scep_start_date'});
                    runInfo.endDate = result.getValue({name: 'custrecord_scep_end_date'});
                    runInfo.taskId = result.getValue({name: 'custrecord_scep_task_id'});
                    runInfo.timespan = Number(result.getValue({name: 'custrecord_scep_timespan'}));
                    runInfo.nextCounter = Number(result.getValue({name: 'custrecord_scep_next_counter'})) || 1;
                    runInfo.filename = result.getValue({name: 'custrecord_scep_filename'});
                    return false;
                });
                return runInfo;
            }

            getUnprocessedRecords() {
                const searchObj = search.create({
                    type: 'customrecord_gd_supply_chain_export_proc',
                    filters:
                        [
                            ['custrecord_scep_processed', 'is', 'F'],
                            'AND',
                            ['isinactive', 'is', 'F'],
                        ],
                    columns:
                        [
                            search.createColumn({name: 'id', label: 'ID'})
                        ]
                });
                const unprocessedRecords = [];
                searchObj.run().each(function (result) {
                    unprocessedRecords.push(result.getValue({name: 'id'}));
                    return true;
                });
                return unprocessedRecords;
            }

            getRunInfo() {
                return this._getRecord(false);
            }

            getExecutionInfo() {
                return this._getRecord(true);
            }

            /**
             * Loads a file from the file cabinet.
             * @param filename {string} The name of the file to load.
             * @returns {null|*} A file object if the file exists, null otherwise.
             */
            loadFileFromCabinet(filename) {
                const filter = search.createFilter({
                    name: 'name',
                    join: 'file',
                    operator: search.Operator.IS,
                    values: filename
                });
                const column = search.createColumn({name: 'internalid', join: 'file'});
                const result = search.create({
                    type: search.Type.FOLDER,
                    filters: filter,
                    columns: column
                }).run().getRange({start: 0, end: 1});

                let fileId;

                if (result && result.length > 0) {
                    fileId = result[0].getValue({name: 'internalid', join: 'file'});
                }
                if (fileId) {
                    return file.load({
                        id: fileId
                    });
                }
                return null;
            }

            isCompleted() {
                const searchObj = search.create({
                    type: 'customrecord_gd_supply_chain_export_proc',
                    filters:
                        [
                            ['custrecord_scep_task_status', 'is', 'COMPLETE'],
                            'AND',
                            ['custrecord_scep_task_id', 'isnotempty', ''],
                            'AND',
                            ['custrecord_scep_processed', 'is', 'T'],
                            'AND',
                            ['formulanumeric: TO_DATE({custrecord_scep_end_date}) - TO_DATE({custrecord_scep_start_date})', 'equalto', '1'],
                            'AND',
                            ['custrecord_scep_filename', 'isnotempty', '']
                        ],
                    columns:
                        [
                            search.createColumn({name: 'custrecord_scep_start_date', label: 'Start Date'}),
                            search.createColumn({name: 'custrecord_scep_filename', label: 'Filename'}),
                            search.createColumn({name: 'custrecord_scep_export_file', label: 'Export File'}),
                            search.createColumn({name: 'custrecord_scep_processed', label: 'Processed'}),
                            search.createColumn({name: 'custrecord_scep_task_status', label: 'Task Status'}),
                            search.createColumn({name: 'custrecord_scep_task_id', label: 'Task ID'}),
                            search.createColumn({name: 'custrecord_scep_end_date', label: 'Process Termination Date'}),
                            search.createColumn({name: 'lastmodified', label: 'Last Modified'}),
                            search.createColumn({
                                name: 'created',
                                sort: search.Sort.DESC,
                                label: 'Date Created'
                            }),
                            search.createColumn({
                                name: 'formulanumeric',
                                formula: 'TO_DATE({custrecord_scep_end_date}) - TO_DATE({custrecord_scep_start_date})',
                                label: 'Formula (Numeric)'
                            })
                        ]
                });
                const searchResultCount = searchObj.runPaged().count;
                if (searchResultCount)
                    return true;
                return false;
            }
        }

        return WorkbookExport;

    });
