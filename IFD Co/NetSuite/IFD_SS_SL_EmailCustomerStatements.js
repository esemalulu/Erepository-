/**
 * @NApiVersion 2.0
 * @NScriptType Suitelet
 * @NModuleScope SameAccount
 *
 * 10/19/2021 Kalyani Chintala, NS Case# 4275843
 */

define(['N/error', 'N/https', 'N/record', 'N/runtime', 'N/search', 'N/task', 'N/ui/serverWidget', 'N/url', 'SuiteScripts/NetSuite/IFD_UtilityFunctions_SSV2.js'],
    /**
     * @param {error} error
     * @param {https} https
     * @param {record} record
     * @param {runtime} runtime
     * @param {search} search
     * @param {transaction} transaction
     * @param {serverWidget} serverWidget
     * @param {url} url
     */
    function(error, https, record, runtime, search, task, serverWidget, url, utilityObj) {

        /**
         * Definition of the Suitelet script trigger point.
         *
         * @param {Object} context
         * @param {ServerRequest} context.request - Encapsulation of the incoming request
         * @param {ServerResponse} context.response - Encapsulation of the Suitelet response
         * @Since 2015.2
         */
        function onRequest(context)
        {
            var scriptObj = runtime.getCurrentScript();//script parameter object.
            /*var clScriptPath = scriptObj.getParameter({name: 'custscript_ns_cust_email_cl_scrpt_path'});
            if(clScriptPath == '')
            {
                throw 'Missing client script path!';
                return;
            }*/

            if (context.request.method === 'GET')
            {
                var selecSrchId = utilityObj.convNull(context.request.parameters.custpage_ns_cust_email_srch_id);

                var form = serverWidget.createForm({title: 'Trigger Customer Statements Email Process'});
                var stUrl = url.resolveScript({scriptId : scriptObj.id, deploymentId : scriptObj.deploymentId, returnExternalUrl : false});
                var stUrlFld = form.addField({id: 'custpage_suitelet_url', label: 'Suitelet URL', type: serverWidget.FieldType.TEXTAREA});
                stUrlFld.updateDisplayType({displayType: serverWidget.FieldDisplayType.HIDDEN});
                stUrlFld.defaultValue = stUrl;

                var scriptRunInstanceList = utilityObj.getAllRowsFromSearch(search, null, 'customsearch_ns_acs_cust_stmt_email_in_p');
                if(scriptRunInstanceList != null && scriptRunInstanceList.length > 0)
                {
                    var outputHtmlFld = form.addField({id: 'custpage_ns_cust_output', label: 'Output', type: serverWidget.FieldType.TEXT});
                    outputHtmlFld.updateDisplayType({displayType: serverWidget.FieldDisplayType.INLINE});
                    outputHtmlFld.defaultValue = 'The current process that you are trying to trigger is already running, please wait for it to complete so that you can submit it again! You can refresh the page to see if it is completed!';
                    context.response.writePage(form);
                    return;
                }

                var srchFld = form.addField({id: 'custpage_ns_cust_email_srch_id', type: 'select', label: 'Customers Search'});
                srchFld.addSelectOption({value : '', text : '- Please Select -'});

                //Get Deployment details
                var deployDetailsList = utilityObj.getAllRowsFromSearch(search, null, 'customsearch_ns_get_deply_details');
                var srchIds = new Array();
                for(var idx=0; idx < deployDetailsList.length; idx++)
                {
                    var deploymentScriptId = deployDetailsList[idx].getValue({name: 'scriptid'});
                    var deplomentId = deployDetailsList[idx].id;
                    var deployRec = record.load({type: record.Type.SCRIPT_DEPLOYMENT, id: deplomentId});
                    var srchTxt = utilityObj.convNull(deployRec.getText({fieldId: 'custscript_ns_cust_email_srch_id'}));
                    srchFld.addSelectOption({value : deploymentScriptId, text : srchTxt});
                }

                var stmtDtFld = form.addField({id: 'custpage_ns_cust_email_stmt_dt', type: serverWidget.FieldType.DATE, label: 'Statement Date'});
                stmtDtFld.defaultValue = new Date();
                stmtDtFld.isMandatory = true;

                var startDtFld = form.addField({id: 'custpage_ns_cust_email_start_dt', type: serverWidget.FieldType.DATE, label: 'Start Date'});
                /*var startDate = new Date();
                startDate.setDate(startDate.getDate() - 30);
                startDtFld.defaultValue = startDate;
                startDtFld.isMandatory = true;*/

                var showOnlyOpenTxnsFld = form.addField({id: 'custpage_openonly', type: serverWidget.FieldType.CHECKBOX, label: 'SHOW ONLY OPEN TRANSACTIONS'});
                showOnlyOpenTxnsFld.defaultValue = 'T';

                var consolidateStmtFld = form.addField({id: 'custpage_consolstatement', type: serverWidget.FieldType.CHECKBOX, label: 'CONSOLIDATE STATEMENT'});
                consolidateStmtFld.defaultValue = 'F';

                //log.debug('Checking', 'Adding button Export');
                form.addSubmitButton({label: 'Submit'});
                context.response.writePage(form);
                return;
            }
            else
            {
                var deploymentId = utilityObj.convNull(context.request.parameters.custpage_ns_cust_email_srch_id);
                log.debug({title: 'Checking', details: 'DeploymentId: ' + deploymentId});

                //Schedule the script
                var stmtDt = utilityObj.convNull(context.request.parameters.custpage_ns_cust_email_stmt_dt);
                var startDt = utilityObj.convNull(context.request.parameters.custpage_ns_cust_email_start_dt);
                var openOnly = utilityObj.convNull(context.request.parameters.custpage_openonly);
                var consolidatedStmt = utilityObj.convNull(context.request.parameters.custpage_consolstatement);

                if(deploymentId == '' || stmtDt == '')
                {
                    throw 'Missing required values submission!';
                    return;
                }

                //Generate ad-hoc email template
                var outputHtml = '<p>Customer Statements Email Process triggered</p>';
                try{
                    var custEmailProcScript = task.create({taskType: task.TaskType.MAP_REDUCE});
                    custEmailProcScript.scriptId = 'customscript_ns_acs_email_cust_stmt';
                    custEmailProcScript.deploymentId = deploymentId;
                    var params = {'custscript_ns_cust_email_stmt_dt': stmtDt, 'custscript_ns_cust_email_start_dt': startDt,
                        'custscript_openonly': openOnly, 'custscript_consolstatement': consolidatedStmt};
                    custEmailProcScript.params = params;
                    var taskStatus = custEmailProcScript.submit();
                    log.debug({title: 'Status', details: taskStatus});
                }catch(er){
                    outputHtml = '<p style="color: red;">Error occurred while triggering Customer Statements Email process!' + er.message + '</p>';
                }

                var form = serverWidget.createForm({title: 'Trigger Customer Statements Email Process'});
                var outputHtmlFld = form.addField({id: 'custpage_ns_cust_output', label: 'Output', type: serverWidget.FieldType.TEXT});
                outputHtmlFld.updateDisplayType({displayType: serverWidget.FieldDisplayType.INLINE});
                outputHtmlFld.defaultValue = outputHtml;
                context.response.writePage(form);
                return;
            }
        }

        return {
            onRequest: onRequest
        };

    });