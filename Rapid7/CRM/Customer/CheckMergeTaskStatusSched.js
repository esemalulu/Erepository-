/**
 * @NApiVersion 2.x
 * @NScriptType ScheduledScript
 * @NModuleScope SameAccount
 * https://issues.corp.rapid7.com/browse/APPS-3161
 */
define(['N/search', 'N/record', 'N/runtime', 'N/task', 'N/error', 'N/https', 'N/url'],

    function (search, record, runtime, task, error, https, url) {

        function execute(scriptContext) {
            scriptObj = runtime.getCurrentScript();
            clearFailedRecord = scriptObj.getParameter({
                name: 'custscript_r7_clearfailedrecords'
            });
            if (!clearFailedRecord) {
                processSubmittedRecords();
            } else {
                processFailedRecords()
            }
        }

        function processSubmittedRecords() {

            var searchId = scriptObj.getParameter({
                name: 'custscript_r7_task_search_id'
            });
            var taskSearch = search.load({
                type: 'customrecord_r7_customer_merge_task',
                id: searchId
            });
            taskRecordSearchResult = taskSearch.run();
            var searchid = 0;
            do {
                var resultSlice = taskRecordSearchResult.getRange({
                    start: searchid,
                    end: searchid + 1000
                });
                log.debug('Number of tasks found: ', resultSlice.length);

                for (var i in resultSlice) {
                    try {
                        var result = resultSlice[i];
                        var taskId = result.getValue({
                            name: 'custrecord_r7_merge_task_id'
                        });
                        // can lead to error if task is outdated
                        var taskStatus = task.checkStatus(taskId);
                        log.debug('Check task Status: ', taskStatus.status);

                        switch (taskStatus.status) {
                            case 'COMPLETE':
                                processCompleteReq(result)
                                break;
                            case 'FAILED':
                                record.submitFields({
                                    type: 'customrecord_r7_customer_merge_task',
                                    id: result.id,
                                    values: {
                                        'custrecord_r7_merge_task_status': 2 // failed
                                    }
                                });
                                break;
                            case 'PENDING':
                            case 'PROCESSING':
                                log.debug('Task is still pending or in process, will skip for now');
                                break;
                        }
                    } catch (e) {
                        log.debug('Error Occured: Task ID can be invalid if the Task was completed for a while, the failed tasks are not removed and are accessible. So mark this as completed.', e);
                        processCompleteReq(result)
                    }
                    searchid++;
                }
                var unitsLeft = scriptObj.getRemainingUsage();
                log.debug('Units Left', unitsLeft);
            } while (resultSlice.length > 0 && unitsLeft > 1800)
            if (scriptObj.getRemainingUsage() <= 1800) {
                var scriptId = scriptObj.id;
                var deploymentId = scriptObj.deploymentId;
                restartScript(searchId, scriptId, deploymentId, false);
            }

        }

        function processCompleteReq(result) {
            try {
                var oldCustomerId = record.load({
                    type: record.Type.CUSTOMER,
                    id: result.getValue({
                        name: 'custrecord_r7_child_customer_num'
                    })
                });
                // if the child record still exists (it's not completed then)
                if (oldCustomerId) {
                    var scriptURL = url.resolveScript({
                        scriptId: 'customscriptretrieveurl',
                        deploymentId: 'customdeployretrieveurl',
                        returnExternalUrl: true
                    });
                    var toURL = https.get(scriptURL).body;
                    var urlToTask = toURL + '/app/common/entity/duplicatemanagement/dupejoberrors.nl?jobId=' + result.getValue('custrecord_r7_merge_task_id').substr(6);
                    // fix issue in link to dedup failure
                    var newUrlToTask = urlToTask.replace(/extsystem/g, 'app');
                    record.submitFields({
                        type: 'customrecord_r7_customer_merge_task',
                        id: result.id,
                        values: {
                            'custrecord_r7_merge_task_status': 2, // failed
                            'custrecord_r7_link_to_dedup': newUrlToTask
                        }
                    });
                }
            } catch (e) {
                log.debug('Could not load record. Looks like it is merged ok', e);
                record.submitFields({
                    type: 'customrecord_r7_customer_merge_task',
                    id: result.id,
                    values: {
                        'custrecord_r7_merge_task_status': 3 // completed
                    }
                });
                record.submitFields({
                    type: record.Type.CUSTOMER,
                    id: result.getValue('custrecord_r7_parent_customer'),
                    values: {
                        'custentity_r7_merge_status': 2 // completed
                    }
                });
            }
        }

        function processFailedRecords() {
            var searchId = scriptObj.getParameter({
                name: 'custscript_r7_task_search_id'
            });
            var taskSearch = search.load({
                type: 'customrecord_r7_customer_merge_task',
                id: searchId
            });
            taskSearchResult = taskSearch.run();
            var searchid = 0;
            do {
                var resultSlice = taskSearchResult.getRange({
                    start: searchid,
                    end: searchid + 1000
                });
                log.debug('Number of tasks found: ', resultSlice.length);
                for (var i in resultSlice) {
                    var result = resultSlice[i];

                    record.submitFields({
                        type: record.Type.CUSTOMER,
                        id: result.getValue('custrecord_r7_parent_customer'),
                        values: {
                            // reset the field, so that merge script will be able to process this record
                            'custentity_r7_submitted_isabel_merge': false,
                            'custentity_r7_merge_status': 1 // failed
                        }
                    });
                    record.submitFields({
                        type: 'customrecord_r7_customer_merge_task',
                        id: result.id,
                        values: {
                            'custrecord_r7_merge_task_status': 4 // finished
                        }
                    })
                    searchid++;
                }
                var unitsLeft = scriptObj.getRemainingUsage();
                log.debug('Units Left', unitsLeft);
            } while (resultSlice.length > 0 && unitsLeft > 1800)
            if (scriptObj.getRemainingUsage() <= 1800) {
                var scriptId = scriptObj.id;
                var deploymentId = scriptObj.deploymentId;
                restartScript(searchId, scriptId, deploymentId, true);
            }
        }

        function restartScript(searchId, scriptId, deploymentId, clearErrors) {
            log.debug('Rescheduling script');
            var scheduleScriptTaskObj = task.create({
                taskType: task.TaskType.SCHEDULED_SCRIPT,
                scriptId: scriptId,
                deploymentId: deploymentId,
                params: {
                    'custscript_r7_unproc_customer_merge_t': searchId,
                    'custscript_r7_clearfailerecords': clearErrors
                }
            })
            log.debug('Schedule Object', scheduleScriptTaskObj);
            var taskSubmitId = scheduleScriptTaskObj.submit();
            log.debug('New task is submitted.', 'Thank you! Come again!')
        };
        return {
            execute: execute,
            restartScript: restartScript,
            processSubmittedRecords: processSubmittedRecords,
        };
    });
