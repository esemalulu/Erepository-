/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
*/
define(['N/task'],
    function (task) {
        function onRequest(context) {
            try {
              log.debug('context',context);
                const idTask = context.request.parameters.idTask;
                log.debug('idTask', idTask);
                if (!idTask) return;
                const taskStatus = task.checkStatus({
                    taskId: idTask
                });
              log.debug('taskStatus',taskStatus);
                context.response.write(JSON.stringify({ taskInformation: taskStatus }));
            } catch (error) {
                log.debug('Error', error)
                context.response.write(JSON.stringify(error));
            }
        }
        return {
            onRequest: onRequest
        };
    }
);