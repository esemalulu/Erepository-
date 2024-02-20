/**
 * @NApiVersion 2.1
 */
define(['N/task', 'N/search', 'N/record'],
    /**
     * @param{task} task
     * @param{search} search
     * @param{record} record
     */
    (task, search, record) => {
        
        const duplicateMapReduceDeployment = (scriptId) => {
            let deploymentInternalId;
            const scriptdeploymentSearchObj = search.create({
                type: 'scriptdeployment',
                filters:
                    [
                        ['isdeployed', 'is', 'T'],
                        'AND',
                        ['status', 'anyof', 'NOTSCHEDULED'],
                        'AND',
                        ['script.scripttype', 'anyof', 'MAPREDUCE'],
                        'AND',
                        ['script.scriptid', 'is', scriptId]
                    ],
                columns:
                    [
                        search.createColumn({name: 'internalid', label: 'Internal ID'})
                    ]
            });
            scriptdeploymentSearchObj.run().each(function (result) {
                deploymentInternalId = result.id;
                return false; // only need the first one.
            });
            if (deploymentInternalId) {
                var newRecord = record.copy({
                    type: record.Type.SCRIPT_DEPLOYMENT,
                    id: deploymentInternalId,
                    isDynamic: false
                });
                return newRecord.save();
            }
            return false;
        }
        /**
         * Executes/schedules a map/reduce script.
         * @param scriptId {String} The script id `customscript_` of the script.
         * @param [deploymentId] {String} The deployment to execute. If one isn't specified the first non-running deployment will be executed.
         * @param [duplicateIfRunning] {Boolean} Set to true to duplicate a deployment.
         * @param [params] {Object} Any params to set on the deployment.
         * @return {String|void}
         */
        const executeMapReduceScript = (scriptId, deploymentId, duplicateIfRunning, params) => {
            let mrTaskId;
            let mrTask = task.create({
                taskType: task.TaskType.MAP_REDUCE,
                scriptId: scriptId
            });
            if (deploymentId)
                mrTask.deploymentId = deploymentId;

            try {
                if (params) {
                    mrTask.params = params;
                    log.debug('PARAMS', params);
                }
                mrTaskId = mrTask.submit();
            } catch (e) {
                log.error('TASK FAILED', e);
                if (e.name === 'MAP_REDUCE_ALREADY_RUNNING' && duplicateIfRunning) {
                    const newDeploymentId = duplicateMapReduceDeployment(scriptId);
                    if (newDeploymentId) {
                        log.debug('NEW DEPLOYMENT ID', `Successfully copied deployment, new id: ${newDeploymentId}`);
                        mrTask = task.create({
                            taskType: task.TaskType.MAP_REDUCE,
                            scriptId: scriptId
                        });
                        mrTaskId = mrTask.submit();
                    }
                }
            }
            if (mrTaskId)
                log.debug('MAP/REDUCE', `Task ID: ${mrTaskId} Submitted task using deployment: ${mrTask.deploymentId}`);
            return mrTaskId;
        }
        
        const getMapReduceStatus = (taskId, stageForTotal) => {
            if (taskId) {
                // get the status of the running script
                let total = 1;
                let pending = 1;
                let percentageCompleted;
                let taskStatus = task.checkStatus(taskId);
                if (taskStatus.stage === 'GET_INFO') {
                    total = 1;
                    pending = 1;
                } else {
                    switch (taskStatus.stage) {
                        case 'MAP' :
                            total = taskStatus.getTotalMapCount();
                            pending = taskStatus.getPendingMapCount();
                            percentageCompleted = taskStatus.getPercentageCompleted();
                            break;
                        case 'REDUCE':
                            total = taskStatus.getTotalReduceCount();
                            pending = taskStatus.getPendingReduceCount();
                            percentageCompleted = taskStatus.getPercentageCompleted();
                            break;
                        case 'SUMMARIZE':
                            total = taskStatus.getTotalOutputCount();
                            pending = 0;
                            percentageCompleted = taskStatus.getPercentageCompleted();
                            if (stageForTotal) {
                                if (stageForTotal === 'MAP') {
                                    total = taskStatus.getTotalMapCount();
                                    percentageCompleted = taskStatus.getPercentageCompleted();
                                } else {
                                    total = taskStatus.getTotalReduceCount();
                                    percentageCompleted = taskStatus.getPercentageCompleted();
                                }
                            }
                            break;
                    }
                }
                let processed = total - pending;

                let status = {
                    taskId: taskId,
                    stage: taskStatus.stage,
                    status: taskStatus.status,
                    totalCount: total,
                    pendingCount: pending,
                    processed: processed,
                    percentComplete: ((processed / total) * 100).toFixed(2),
                    percentageCompleted: percentageCompleted
                };
                log.audit('Status', status);
                return status;
            }
            return null;
        }
        
        const areTasksRunnning = (scriptid) => {
            const scheduledscriptinstanceSearchObj = search.create({
                type: 'scheduledscriptinstance',
                filters:
                    [
                        ['script.scriptid', 'is', scriptid],
                        'AND',
                        ['status', 'anyof', 'RETRY', 'PROCESSING', 'PENDING']
                    ],
                columns:
                    [
                        search.createColumn({name: 'status', label: 'Status'}),
                        search.createColumn({name: 'taskid', label: 'TaskId'}),
                        search.createColumn({name: 'mapreducestage', label: 'Map/Reduce Stage'}),
                        search.createColumn({name: 'percentcomplete', label: 'Percent Complete'}),
                        search.createColumn({name: 'queueposition', label: 'Queue Position'})
                    ]
            });
            let runningTasks = [];
            scheduledscriptinstanceSearchObj.run().each(function (result) {
                const runningTask = {
                    status: result.getValue({name: 'status'}),
                    taskId: result.getValue({name: 'taskid'})
                };
                runningTasks.push(runningTask);
                return false; // don't need to keep looking.
            });
            log.debug('Running tasks', 'Running tasks count: ' + runningTasks.length);
            return runningTasks;
        }
        return {executeMapReduceScript, getMapReduceStatus, areTasksRunnning}
    });
