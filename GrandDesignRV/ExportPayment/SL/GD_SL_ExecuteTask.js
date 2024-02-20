/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define(['N/task', 'N/runtime', '../lib/GD_LIB_ScriptExecutor', '../lib/GD_LIB_ExportConstants'],
    /**
     * @param{task} task
     */
    (task, runtime, ScriptExecutor, Constants) => {
        /**
         * Defines the Suitelet script trigger point.
         * @param {Object} scriptContext
         * @param {ServerRequest} scriptContext.request - Incoming request
         * @param {ServerResponse} scriptContext.response - Suitelet response
         * @since 2015.2
         */
        const onRequest = (scriptContext) => {
            if (scriptContext.request.method === 'POST') {
                const payload = JSON.parse(scriptContext.request.body);
                log.debug('onRequest', payload);
                const isDealerRefund = payload.data.isDealerRefund;
                let taskId = undefined;
                log.debug('createPaymentFile', `Role: ${runtime.getCurrentUser().role}`);
                try {
                    if (!isDealerRefund) {
                        taskId = ScriptExecutor.executeMapReduceScript(Constants.EXPORT_MR_SCRIPT_VENDOR.scriptId, Constants.EXPORT_MR_SCRIPT_VENDOR.deploymentId);
                    } else {
                        taskId = ScriptExecutor.executeMapReduceScript(Constants.EXPORT_MR_SCRIPT_DEALER.scriptId, Constants.EXPORT_MR_SCRIPT_DEALER.deploymentId);
                    }
                } catch (e) {
                    log.error('ERROR IN MAP REDUCE', e);
                }
                scriptContext.response.write(JSON.stringify({taskId: taskId}));
            }
        }

        return {onRequest}

    });
