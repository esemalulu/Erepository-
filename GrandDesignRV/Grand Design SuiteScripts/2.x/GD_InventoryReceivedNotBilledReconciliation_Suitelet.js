/**
 * @NApiVersion 2.x
 * @NScriptType Suitelet
 * @NModuleScope SameAccount
 */
define(['N/file', 'N/redirect', 'N/search', 'N/ui/serverWidget', 'N/task'],
/**
 * @param {file} file
 * @param {redirect} redirect
 * @param {search} search
 * @param {serverWidget} serverWidget
 * @param {task} task
 */
function(file, redirect, search, serverWidget, task) {
   
    /**
     * Definition of the Suitelet script trigger point.
     *
     * @param {Object} context
     * @param {ServerRequest} context.request - Encapsulation of the incoming request
     * @param {ServerResponse} context.response - Encapsulation of the Suitelet response
     * @Since 2015.2
     */
    function onRequest(context) {
        if (context.request.method == 'GET') {
            var form = serverWidget.createForm({ title : 'Inventory Received Not Billed Reconciliation' });

            form.clientScriptModulePath = 'SuiteScripts/Grand Design SuiteScripts/2.x/GD_InventoryReceivedNotBilledReconciliation_Client.js';

            if (context.request.parameters['custpage_step'] == '1' || context.request.parameters['custpage_step'] == undefined) {
                stepOne(context, form);

               form.addSubmitButton('Run New Report');
               form.addButton({
                    id: 'custpage_viewreport',
                    label: 'View Last Report Ran',
                    functionName: "refresh"
                });
            }
            else if (context.request.parameters['custpage_step'] == '2') {
                stepTwo(context, form);

                form.addSubmitButton('Refresh');
                form.addButton({
                    id: 'custpage_startover',
                    label: 'Start Over/View Completed Report',
                    functionName: "location(nlapiResolveURL('SUITELET', 'customscriptgd_invrecvnotbillrec_suite', 'customdeploygd_invrecvnotbillrec_suite'))"
                });
            }
            context.response.writePage(form);
        }
        else {
            if (context.request.parameters['custpage_step'] == '1' || context.request.parameters['custpage_step'] == undefined) {
                // Add parameters for the filters
                var params = context.request.parameters;

                // Run Map Reduce with parameters
                var reportTask = task.create({
                    taskType: task.TaskType.MAP_REDUCE,
                    scriptId: 'customscriptgd_invrecvnotbillrec_mapred',
                    deploymentId: 'customdeploygd_invrecvnotbillrec_mapred',
                    params: {
                        custscriptgd_pofromdate: params['custpage_pofromdate'],
                        custscriptgd_postingperiod: params['custpage_postingperiod'],
                        custscriptgd_showzero: params['custpage_showzero'] == 'T',
                    }
                });
                params['custpage_taskid'] = reportTask.submit();

                // Proceed to step 2
                params['custpage_step'] = '2';

                redirect.toSuitelet({
                    scriptId: 'customscriptgd_invrecvnotbillrec_suite',
                    deploymentId: 'customdeploygd_invrecvnotbillrec_suite',
                    parameters: params
                });
            }
            else if (context.request.parameters['custpage_step'] == '2') {
                var params = context.request.parameters;

                redirect.toSuitelet({
                    scriptId: 'customscriptgd_invrecvnotbillrec_suite',
                    deploymentId: 'customdeploygd_invrecvnotbillrec_suite',
                    parameters: {
                        custpage_step: params['custpage_step'],
                        custpage_taskid: params['custpage_taskid'],
                    }
                });
            }
        }
    }

    function addStepField(form, step)
    {
        var stepField = form.addField({
            id: 'custpage_step',
            type: serverWidget.FieldType.TEXT,
            label: 'Step'
        }).updateDisplayType({
            displayType: serverWidget.FieldDisplayType.HIDDEN
        });

        stepField.defaultValue = step;

        return step;
    }

    function stepOne(context, form)
    {
        addStepField(form, '1');

        var fg = form.addFieldGroup({ id: 'custpage_fgfilters', label: 'New Report Parameters'});
        fg.isSingleColumn = true;

        var poFromDate = form.addField({
            id: 'custpage_pofromdate',
            type: serverWidget.FieldType.DATE,
            label: 'PO Cutoff Date',
            container: 'custpage_fgfilters'
        }).defaultValue = new Date();

        var postingPeriod = form.addField({
            id: 'custpage_postingperiod',
            type: serverWidget.FieldType.SELECT,
            label: 'Posting Period Cutoff',
            source: 'accountingperiod',
            container: 'custpage_fgfilters'
        });

        var showZero = form.addField({
            id: 'custpage_showzero',
            type: serverWidget.FieldType.CHECKBOX,
            label: 'Show Zeros',
            container: 'custpage_fgfilters'
        });

        var fg = form.addFieldGroup({ id: 'custpage_fgreport', label: 'Report View'});

        var fileObj = file.load('/IRNB/IRNB.json');
        var fileId = fileObj.id;
        var fileURL = fileObj.url;

        var lastReportDate = search.lookupFields({
            type: 'file',
            id: fileId,
            columns: ['modified']
        }).modified;

        form.addField({
            id: 'custpage_lastreportdate',
            type: serverWidget.FieldType.INLINEHTML,
            label: 'Last Report Date',
            container: 'custpage_fgreport'
        }).defaultValue = '<span style="font-size: 16px; width: max-content;">Report Last Ran: ' + lastReportDate + '</span>';

        var page = form.addField({
            id: 'custpage_page',
            type: serverWidget.FieldType.INLINEHTML,
            label: 'Page',
            container: 'custpage_fgreport'
        });

        page.defaultValue =
            "<link rel='stylesheet' type='text/css' href='" + file.load('/SuiteScripts/Grand Design SuiteScripts/Libraries/fixedHeader.dataTables.min.css').url + "'>" +
            file.load('/SuiteScripts/Grand Design SuiteScripts/2.x/GD_InventoryReceivedNotBilledReconciliation_View.html').getContents();

        page.updateLayoutType({
            layoutType: serverWidget.FieldLayoutType.OUTSIDEBELOW
        });
    }

    function stepTwo(context, form)
    {
        addStepField(form, '2');

        var taskField = form.addField({
            id: 'custpage_taskid',
            type: serverWidget.FieldType.TEXT,
            label: 'Task ID'
        }).updateDisplayType({
            displayType: serverWidget.FieldDisplayType.HIDDEN
        });

        taskField.defaultValue = context.request.parameters['custpage_taskid']

        var taskStatus = task.checkStatus({ taskId: context.request.parameters['custpage_taskid'] });

        form.addField({
            id: 'custpage_status',
            type: serverWidget.FieldType.INLINEHTML,
            label: 'Status'
        }).defaultValue = '<span style="font-size: 16px;">Status: ' + taskStatus.status + '</span>'

    }

    return {
        onRequest: onRequest
    };
    
});
