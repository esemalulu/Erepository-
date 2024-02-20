/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define(['N/query', 'N/task', './lib/GD_LIB_WorkbookQuery'],
    /**
     * @param{query} query
     * @param{task} task
     */
    (query, task, workbookQuery) => {

        const getSQL = (workbookid) => {
            // Load the workbook by name (record ID)
            var workbook = query.load(workbookid);

            // Convert the query to its SuiteQL representation
            var suiteSQL = workbook.toSuiteQL();

            //Examine the SuiteQL query string
            var suiteQL = suiteSQL.query;
            return suiteQL;
        }
        const getSuiteQL = (workbookid) => {
            // Load the workbook by name (record ID)
            const workbook = query.load(workbookid);
            // Convert the query to its SuiteQL representation
            return workbook.toSuiteQL();
        }
        /**
         * Defines the Suitelet script trigger point.
         * @param {Object} scriptContext
         * @param {ServerRequest} scriptContext.request - Incoming request
         * @param {ServerResponse} scriptContext.response - Suitelet response
         * @since 2015.2
         */
        const onRequest = (scriptContext) => {
            if (scriptContext.request.method === 'GET') {
                if(scriptContext.request.parameters.taskId) {
                    const taskInfo = task.checkStatus(scriptContext.request.parameters.taskId);
                    log.debug('taskStatus', taskInfo);
                    if (taskInfo) {
                        const status = {
                            status: taskInfo.status,
                            percentComplete: taskInfo.percentComplete,
                            isQueued: taskInfo.isQueued,
                            isNotStarted: taskInfo.isNotStarted,
                            isFailed: taskInfo.isFailed,
                            isCompleted: taskInfo.isCompleted,
                            isPending: taskInfo.isPending,
                            isProcessing: taskInfo.isProcessing,
                            isAborted: taskInfo.isAborted,
                            isPartiallyFailed: taskInfo.isPartiallyFailed,
                            isPartiallyCompleted: taskInfo.isPartiallyCompleted,
                            isSuccessfullyCompleted: taskInfo.isSuccessfullyCompleted
                        }
                        scriptContext.response.write(JSON.stringify(status));
                        return;
                    }
                }
                const workbookId = 'custworkbook34';
                const suiteQL = getSQL(workbookId);
                //scriptContext.response.write(suiteQL);
                const queryTask = task.create({
                    taskType: task.TaskType.SUITE_QL
                });
                const sql = workbookQuery;
               
                queryTask.query = sql;
               // queryTask.params = ['4/1/2022', '1/1/2023']
                queryTask.filePath = '/Supply Chain Query Export/ExportTest6.csv';
                try {
                    const taskId = queryTask.submit();
                    log.debug('Task ID', taskId);
                    scriptContext.response.write(`&taskId=${taskId}`);
                    scriptContext.response.write(`\r\n`);
                    scriptContext.response.write(sql);
                    
                } catch (e) {
                    log.error('ERROR OCCURED SUBMITTING SEARCH TASK', e);
                    scriptContext.response.write(e.message);
                }
            }
        }

        return {onRequest}

    });
