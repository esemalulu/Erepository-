/**
 * @NApiVersion 2.x
 * @NScriptType ScheduledScript
 * @NModuleScope SameAccount
 * https://issues.corp.rapid7.com/browse/APPS-3161
 */
define(['N/search', 'N/record', 'N/runtime', 'N/task', 'N/error'],

    function (search, record, runtime, task, error) {

        function execute(scriptContext) {
            var scriptObj = runtime.getCurrentScript();
            var searchId = scriptObj.getParameter({ name: 'custscript_r7_customer_search_id' });

            log.debug("execution started");
            try {
                var customerSearch = search.load({ type: search.Type.CUSTOMER, id: searchId });
                var searchResult = customerSearch.run();
                
                var step = 10;
                for (var i = 0; scriptObj.getRemainingUsage() > 1800; i += step) {
                    var start = i;
                    var end = i + step;
                    var resultSlice = searchResult.getRange({ start: start, end: end });
                    
                    log.debug("resultSlice.length", resultSlice.length);
                    // leaves from 5 to 30 records unprocessed.
                    // solution is to run the script endless and kill the process when all records are processed.
                    
                    if (resultSlice.length > 0) {

                        resultSlice.forEach(function (result) {
                            var childCustomerId = result.id;
                            var masterCustomerId = result.getValue({ name: "custentityr7linkedcustomer" });

                            // log.debug("childCustomerId", childCustomerId);
                            // log.debug("masterCustomerId", masterCustomerId);

                            // set this field to true to exclude child duplicated records from the search
                            record.submitFields({
                                type: record.Type.CUSTOMER,
                                id: masterCustomerId,
                                values: { 'custentity_r7_submitted_isabel_merge': 'T' }
                            });

                            var dedupeTask = task.create({
                                taskType: task.TaskType.ENTITY_DEDUPLICATION,
                                entityType: task.DedupeEntityType.CUSTOMER,
                                masterRecordId: masterCustomerId,
                                masterSelectionMode: task.MasterSelectionMode.SELECT_BY_ID,
                                dedupeMode: task.DedupeMode.MERGE,
                                recordIds: [childCustomerId]
                            });

                            var dedupeTaskId = dedupeTask.submit();
                            var taskRecId = createTaskrecord(dedupeTaskId, masterCustomerId, childCustomerId);

                            log.debug("single record proccesed");
                            log.debug("dedup task.submit id: ", dedupeTaskId);
                            log.debug("dedup task isabel id: ", taskRecId);
                            log.debug("remaining usage:", scriptObj.getRemainingUsage());

                        })
                    }
                }

            } catch (e) {
                log.error('FAILED_TO_SUBMIT_JOB_REQUEST', e.message)
            }

            if (scriptObj.getRemainingUsage() <= 1800) {
                log.debug("remaining usage:", scriptObj.getRemainingUsage());
                var scriptId = scriptObj.id;
                var deploymentId = scriptObj.deploymentId;
                restartScript(scriptId, deploymentId);
            }

            log.debug("execution ended");
        }

        function restartScript(scriptId, deploymentId) {
            log.debug('Rescheduling script');
            var scheduleScriptTaskObj = task.create({
                taskType: task.TaskType.SCHEDULED_SCRIPT,
                scriptId: scriptId,
                deploymentId: deploymentId,
            })
            log.debug('Schedule Object', scheduleScriptTaskObj);
            var taskSubmitId = scheduleScriptTaskObj.submit();
            log.debug('New task is submitted.', taskSubmitId, 'Thank you! Come again!')
        };

        function createTaskrecord(dedupeTaskId, masterCustomerId, childCustomerId) {
            try {
                var taskRec = record.create({ type: 'customrecord_r7_customer_merge_task' });
                taskRec.setValue({ fieldId: 'custrecord_r7_merge_task_id', value: dedupeTaskId });
                taskRec.setValue({ fieldId: 'custrecord_r7_merge_task_status', value: 1 });
                taskRec.setValue({ fieldId: 'custrecord_r7_parent_customer', value: masterCustomerId });
                taskRec.setValue({ fieldId: 'custrecord_r7_parent_customer_num', value: masterCustomerId });
                taskRec.setValue({ fieldId: 'custrecord_r7_child_customer', value: childCustomerId });
                taskRec.setValue({ fieldId: 'custrecord_r7_child_customer_num', value: childCustomerId });
                return taskRec.save();
            } catch (e) {
                log.error('createTaskrecord', e);
                return false;
            }
        }

        function createError(errCode, errMessage) {
            return errorObj = error.create({
                name: errCode,
                message: errMessage,
                notifyOff: true
            });
        }

        return {
            execute: execute,
            restartScript: restartScript,
            createError: createError
        };
    });
