/**
 * @NApiVersion 2.x
 * @NScriptType ScheduledScript
 * @NModuleScope SameAccount
 */
define(['N/task', 'N/error', 'N/record', 'N/search', 'N/runtime'],

    function(task, error, record, search, runtime) {

        /**
         * Definition of the Scheduled script trigger point.
         *
         * @param {Object} scriptContext
         * @param {string} scriptContext.type - The context in which the script is executed. It is one of the values from the scriptContext.InvocationType enum.
         * @Since 2015.2
         */
        function execute(scriptContext) {
            var arrSearchRes = search.load({
                id: runtime.getCurrentScript().getParameter({
                    name: 'custscript_r7_arr_search'
                })
            }).run();
            var searchId = 0;
            do {
                var resultSlice = arrSearchRes.getRange({
                    start: searchId,
                    end: searchId + 50
                });
                if (resultSlice && resultSlice.length > 0) {
                    for (var i = 0; i < resultSlice.length; i++) {
                        try {
                            restartArr(resultSlice[i]);
                            searchId++;
                        } catch (ex) {
                            log.error('ERROR_IN_EXECUTE', ex);
                        }
                    }
                }
            } while (!unitsLeft(runtime) && resultSlice.length >= 50);
            log.debug('ended loop check for units');
            if(unitsLeft(runtime)){
                restartScript(
                    runtime.getCurrentScript().id,
                    runtime.getCurrentScript().deploymentId
                    );
            }
        }

        function restartArr(result) {
            var ARR_EVENT_RESPONSE_UPDATED = 2;

            try{
                log.debug('resubmitting arr with id ',result.id);
                var arrRecord = record.load({
                    type:'customrecord_arr_event',
                    id:result.id
                });
                arrRecord.setValue({
                    fieldId:'custrecord_r7_publishing_status',
                    value: ARR_EVENT_RESPONSE_UPDATED
                });
                arrRecord.save();
            }catch(ex){
                log.error('ERROR_IN_RESTART_ARR', ex);
            }
            log.debug('arr was re-submitted',result.id);
        }

        function unitsLeft(runtimeObj) {
            var unitsLeft = runtimeObj.getCurrentScript().getRemainingUsage();
            log.audit('units left ', unitsLeft);
            if (unitsLeft <= 2500) {
                log.audit('Ran out of units');
                return true;
            }

            return false;
        }

        function restartScript(scriptId, deploymentId) {
            log.debug('Rescheduling script');
            var scheduleScriptTaskObj = task.create({
                taskType: task.TaskType.SCHEDULED_SCRIPT,
                scriptId: scriptId,
                deploymentId: deploymentId
            });
            log.debug('Schedule Object', scheduleScriptTaskObj);
            var taskSubmitId = scheduleScriptTaskObj.submit();
            log.debug('New task is submitted.', 'Thank you! Come again!');
        }


        return {
            execute: execute
        };

    });
