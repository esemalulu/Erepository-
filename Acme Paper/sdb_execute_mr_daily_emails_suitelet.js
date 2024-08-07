/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define(['N/ui/serverWidget','N/log','N/task'],
    (serverWidget,log,task) => {
        const onRequest = (context) => {
            try {
                var request = context.request;
                var response = context.response;
                if (request.method == 'GET') {
                    var form = serverWidget.createForm({
                        title: 'Send Invoices and Credit Memos Emails',
                        hideNavBar: false
                    });
                    form.addButton({
                        id: 'custpage_btn_execute_mr',
                        label: 'Send Emails',
                        functionName: 'executeMapReduce()'
                    });
                    var clientPath = "SuiteScripts/_sdb_execute_mr_daily_email_cs.js"
                    form.clientScriptModulePath = clientPath;
                    response.writePage(form);
                }else if(request.method == 'POST'){
                    var mrTask = task.create({
                        taskType: task.TaskType.MAP_REDUCE,
                        scriptId: 'customscript_sdb_send_daily_invoice_emai',
                        deploymentId: 'customdeploy_sdb_send_daily_invoice_emai',
                    });
                    var mrTaskId = mrTask.submit();
                    log.debug('mrTaskId',mrTaskId)
                }
            } catch (error) {
                log.error('onRequest error',error)
            }
        }
        return {onRequest}

    });