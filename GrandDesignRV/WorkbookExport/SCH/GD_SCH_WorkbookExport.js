/**
 * @NApiVersion 2.1
 * @NScriptType ScheduledScript
 */
define(['N/record', 'N/search', 'N/task', 'N/format', 'N/runtime', '../lib/GD_LIB_WorkbookExport', '../lib/GD_LIB_Constants', '../lib/GD_LIB_WorkbookQuery', '../lib/moment.min'],
    /**
     * @param{record} record
     * @param{search} search
     * @param{task} task
     * @param{format} format
     * @param{runtime} runtime
     * @param {WorkbookExport} WorkbookExport
     * @param Constants
     * @param workbookQuery
     * @param moment
     */
    (record, search, task, format, runtime, WorkbookExport, Constants, workbookQuery, moment) => {

        /**
         * Defines the Scheduled script trigger point.
         * @param {Object} scriptContext
         * @param {string} scriptContext.type - Script execution context. Use values from the scriptContext.InvocationType enum.
         * @since 2015.2
         */
        const execute = (scriptContext) => {
            const workbookExport = new WorkbookExport();
            const SCHEDULED_DEPLOYMENT = 'customdeploy_gd_sch_workbook_export_sch';
            if (workbookExport.shouldAbort()) {
                log.emergency('ABORTING SCRIPT', 'Script aborted!');
                return;
            }

            let runInfo = workbookExport.getRunInfo();
            log.debug('scriptContext', scriptContext);


            const executeMainTask = (runInfo) => {
                log.debug('EXECUTING TASK', runInfo);
                const scheduledScript = task.create({
                    taskType: task.TaskType.SCHEDULED_SCRIPT
                });
                scheduledScript.scriptId = Constants.SCHEDULED_SCRIPT.scriptId;

                const queryTask = task.create({
                    taskType: task.TaskType.SUITE_QL
                });
                queryTask.addInboundDependency(scheduledScript);
                const sql = workbookQuery;
                queryTask.query = sql;
                const startDate = moment(runInfo.startDate).format('YYYY/MM/DD HH:mm:ss');
                let duration = Constants.TIMESPAN[runInfo.timespan].duration;
                // Set the start date to the next duration.
                const endDate = moment(runInfo.startDate).add(Constants.TIMESPAN[runInfo.timespan].value, Constants.TIMESPAN[runInfo.timespan].duration).format('YYYY/MM/DD HH:mm:ss');
                queryTask.params = [startDate, endDate]
                log.debug('Query Params', queryTask.params);
                //'2022/04/01 00:00:00'
                const filename = `GDRVTransactions_${moment(runInfo.startDate).format('YYYYMMM')}_${runInfo.nextCounter}.csv`;
                queryTask.filePath = `/Supply Chain Query Export/${filename}`;
                try {
                    const taskId = queryTask.submit();
                    log.debug('Task ID', taskId);
                    //const taskStatus = task.checkStatus(taskId);
                    record.submitFields({
                        type: Constants.CUSTOM_RECORD_ID,
                        id: runInfo.id,
                        values: {
                            custrecord_scep_task_id: taskId,
                            custrecord_scep_task_status: 'PENDING',
                            custrecord_scep_filename: filename,
                        }
                    })
                } catch (e) {
                    log.error('ERROR OCCURRED SUBMITTING TASK', e);
                }
            }

            // The script is being executed from the UI
            if (scriptContext.type === scriptContext.InvocationType.USER_INTERFACE) {
                log.debug('Execution Type', 'User Interface');
                if (runInfo && runInfo.id && runInfo.startDate && runInfo.endDate) {
                    // Create a scheduled script task
                    executeMainTask(runInfo);
                    return;
                }
            }

            // Create the first record to run the next day
            if (runtime.getCurrentScript().deploymentId === SCHEDULED_DEPLOYMENT) {
                const unprocessedRecords = workbookExport.getUnprocessedRecords();
                if (unprocessedRecords.length > 0) {
                    unprocessedRecords.forEach((id) => {
                        const values = {
                            custrecord_scep_processed: true,
                            custrecord_scep_task_status: 'IGNORED',
                        }
                        record.submitFields({
                            type: Constants.CUSTOM_RECORD_ID,
                            id: id,
                            values: values,
                            options: {
                                enableSourcing: false,
                                ignoreMandatoryFields: true
                            }
                        });
                    })
                }
                const createdRecord = workbookExport.createInitialRunInfo();
                if (createdRecord) {
                    log.debug('CREATED INITIAL RECORD', createdRecord);
                    runInfo = workbookExport.getRunInfo();
                    // Execute the main task
                    // Create a scheduled script task
                    executeMainTask(runInfo);
                    return;
                }
            }
            

            if (scriptContext.type === scriptContext.InvocationType.ON_DEMAND) {

                runInfo = workbookExport.getExecutionInfo();
                if (runInfo.taskId) {
                    try {
                        const taskStatus = task.checkStatus(runInfo.taskId);
                        log.debug('Task Status', taskStatus.status);
                        // The task completed.
                        if (taskStatus.status === task.TaskStatus.COMPLETE || taskStatus.status === task.TaskStatus.FAILED) {
                            log.debug('UPDATING CURRENT RECORD', runInfo.id);
                            const fileInfo = workbookExport.loadFileFromCabinet(runInfo.filename);
                            const values = {
                                custrecord_scep_processed: true,
                                custrecord_scep_task_status: taskStatus.status,
                            }

                            if (taskStatus.status === task.TaskStatus.COMPLETE && fileInfo)
                                values.custrecord_scep_export_file = fileInfo.id;

                            record.submitFields({
                                type: Constants.CUSTOM_RECORD_ID,
                                id: runInfo.id,
                                values: values,
                                options: {
                                    enableSourcing: false,
                                    ignoreMandatoryFields: true
                                }
                            });

                            // The task completed, move on to the next day.
                            if (taskStatus.status === task.TaskStatus.COMPLETE) {
                                log.debug('CREATING NEXT RECORD', runInfo);
                                // Create a new record to run the next day
                                runInfo.nextCounter++;
                                workbookExport.createRunInfo(runInfo);
                                runInfo = workbookExport.getRunInfo();
                                log.debug('CHECKING NEXT RECORD', runInfo);
                            }

                            // The task failed. Break up the date range and try again.
                            if (taskStatus.status === task.TaskStatus.FAILED) {
                                log.debug('FAILED RECORD', runInfo);
                                let useSameStartDate = true;
                                const currentTimespan = runInfo.timespan;
                                let newTimespan = Number(currentTimespan) + 1;
                                if (newTimespan > Object.keys(Constants.TIMESPAN).length) {
                                    log.audit('FAILED RECORD', 'Too many timespans, aborting this date range.');
                                    newTimespan = 1;
                                    useSameStartDate = false;
                                }
                                runInfo.timespan = newTimespan;
                                // Create a new record, but use the same start date.
                                workbookExport.createRunInfo(runInfo, useSameStartDate);
                                runInfo = workbookExport.getRunInfo();
                                log.debug('CHECKING NEXT RECORD - PREVIOUS FAILED', runInfo);
                            }

                            if (runInfo && runInfo.id && runInfo.startDate && runInfo.endDate) {
                                // Create a scheduled script task
                                executeMainTask(runInfo);
                            } else {
                                log.debug('NO MORE RECORDS TO PROCESS', runInfo);
                                // Check that the last record is complete.
                                const completed = workbookExport.isCompleted();
                                if (completed) {
                                    // Kick off upload script
                                    try {
                                        const mrUploadTask = task.create({
                                            taskType: task.TaskType.MAP_REDUCE,
                                            scriptId: 'customscript_gd_mr_upload_export_files',
                                            deploymentId: 'customdeploy_gd_mr_upload_export_files'
                                        }).submit();
                                        log.debug('MAP REDUCE TASK ID', mrUploadTask);
                                    } catch (e) {
                                        log.error('ERROR OCCURRED SUBMITTING MAP REDUCE TASK TO UPLOAD FILES', e);
                                    }
                                }
                            }
                        }
                    } catch (e) {
                        log.error('ERROR OCCURRED CHECKING TASK STATUS', e);
                    }
                }
            }
        }

        return {execute}

    })
;
