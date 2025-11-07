/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define(['N/record','N/task', 'N/ui/serverWidget','N/search', 'N/redirect'], function(record, task, serverWidget, search, redirect) {

    function onRequest(context) {
        if (context.request.method === 'GET') {
            // Create a form to show progress
            var form = serverWidget.createForm({
                title: 'Execution Status'
            });
            var statusMessage = 'Processing'
            // Get the project ID passed from the client script
            var projectId = context.request.parameters.projectid;
            var invoiceId = context.request.parameters.invoiceId;
            
            var isMapReduceExecuting = isExecuting('customscript_cp_adjusted_rate_automation','customdeploy_cp_adjusted_rate_automation');

            log.debug('onRequest Status','Project Id:'+projectId+', isMapReduceExecuting:'+isMapReduceExecuting)

            try{
                if(!isMapReduceExecuting){
                    // Create a map/reduce task and pass the projectId as a parameter to the script
                    var mrTask = task.create({
                        taskType: task.TaskType.MAP_REDUCE,
                        scriptId: 'customscript_cp_labour_billing_rate_auto',
                        deploymentId: 'customdeploy_cp_labour_billing_rate_auto',
                        params: {
                            custscript_cp_invoiceid_from_suitelet:invoiceId, 
                            custscript_cp_projectid_from_suitelet: projectId  // Pass the project ID as a script parameter
                        }
                    });

                    var taskId = mrTask.submit();  // Submit the task and get task ID
                }else{
                    log.debug('MAP_REDUCE EXECUTION STATUS','All execution instances are running, try again later')
                    statusMessage = 'All execution instances are running, try again later'
                }
            }catch (e) {
                //statusMessage = e.message;
                statusMessage = 'All execution instances are running, check your record for the calculation in few minutes'
            }


            // Redirect the user back to the project record after submitting the task
            if(invoiceId){
                redirect.toRecord({
                    type: 'invoice',    // Type of the record ('job' is used for projects)
                    id: invoiceId   // Project record ID to redirect to
                });
            }


            form.addField({
                id: 'custpage_taskid',
                type: serverWidget.FieldType.INLINEHTML,
                label: 'Execution Status Message'
            }).defaultValue = statusMessage;

            // form.addSubmitButton({
            //     label: 'Refresh'
            // });

            context.response.writePage(form);
        }
    }

    function isExecuting (scriptId, deploymentId){
        const executingStatuses = ["PENDING","PROCESSING","RESTART","RETRY"];
        return Boolean(search.create({
            type: record.Type.SCHEDULED_SCRIPT_INSTANCE,
            filters: [
                ["status", search.Operator.ANYOF, executingStatuses], "AND",
                ["script.scriptid", search.Operator.IS, scriptId] //,"AND",
                //["scriptDeployment.scriptid", search.Operator.ISNOT, deploymentId]
            ],
            columns: ["script.internalid"]
        }).runPaged().count);
    }

    return {
        onRequest: onRequest
    };
});
