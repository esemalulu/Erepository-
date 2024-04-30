/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 * @NModuleScope SameAccount
 *
 * 10/19/2021 Kalyani Chintala, NS Case# 4275843
 */

define(['N/runtime', 'N/search', 'N/record', 'N/error', 'N/email', 'N/render', 'N/task', 'N/format', 'SuiteScripts/NetSuite/IFD_UtilityFunctions_SSV2.js'],
    function(runtime, search, record, errorMod, emailMod, renderMod, task, format, utilityObj) {

        /**
         * Marks the beginning of the Map/Reduce process and generates input data.
         *
         * @typedef {Object} ObjectRef
         * @property {number} id - Internal ID of the record instance
         * @property {string} type - Record type id
         * @return {Array|Object|Search|RecordRef} inputSummary
         * @since 2015.1
         */

        String.prototype.trim = function() {
            return this.replace(/^\s+|\s+$/g,"");
        };

        function getInputData()
        {
            var scriptObj = runtime.getCurrentScript();
            var srchId = utilityObj.convNull(scriptObj.getParameter({name: 'custscript_ns_cust_email_srch_id'}));
            var stmtDt = utilityObj.convNull(scriptObj.getParameter({name: 'custscript_ns_cust_email_stmt_dt'}));
            var startDt = utilityObj.convNull(scriptObj.getParameter({name: 'custscript_ns_cust_email_start_dt'}));
            var emailTmpl = utilityObj.convNull(scriptObj.getParameter({name: 'custscript_ns_cust_email_tmpl'}));
            var emailFrom = utilityObj.convNull(scriptObj.getParameter({name: 'custscript_ns_cust_email_from'}));
            if(srchId == '' || stmtDt == '' || emailFrom == '' || emailTmpl == '')
            {
                throw 'Missing required parameters';
                return ;
            }

            var lastProcCustomerId = utilityObj.convNull(scriptObj.getParameter({name: 'custscript_ns_cust_stmt_email_lst_procid'}));
            log.debug({title: 'Chekcing', details: 'lastProcCustomerId: '  + lastProcCustomerId});
            if(lastProcCustomerId == '')
                lastProcCustomerId = 0;

            var srchResults = getPagedDataSrchResults(srchId, lastProcCustomerId);
            var inputDataArray = [];
            for(idx=0; idx < srchResults.length; idx++)
            {
                var customerId = srchResults[idx].getValue({name: 'internalid', summary: search.Summary.GROUP});
                var customerName = srchResults[idx].getValue({name: 'entityid', summary: search.Summary.GROUP});

                inputDataArray.push({'id': customerId, 'name': customerName});
            }
            return inputDataArray;
        }

        function getPagedDataSrchResults(srchId, lastProcCustomerId)
        {
            var srchResults = new Array();
            var newCols = [search.createColumn({name: 'internalid', summary: search.Summary.GROUP, sort: search.Sort.ASC}), search.createColumn({name: 'entityid', summary: search.Summary.GROUP})];
            var srchObj = search.load({id: srchId});
            var existFilters = srchObj.filters;
            if(utilityObj.convNull(existFilters) == '')
                existFilters = new Array();
            existFilters.push(search.createFilter({name: 'internalidnumber', operator: search.Operator.GREATERTHAN, values: lastProcCustomerId}));
            srchObj.filters = existFilters;
            srchObj.columns = newCols;
            var pagedData = srchObj.runPaged({pageSize: 1000});
            var resultsCount = pagedData.count;
            log.debug({title: 'Checking', details: 'Results Count(Paged Data): ' + resultsCount});
            if(resultsCount > 0)
            {
                var page = pagedData.fetch({index: 0});
                srchResults = page.data;
            }
            return srchResults;
        }



        /**
         * Executes when the map entry point is triggered and applies to each key/value pair.
         *
         * @param {MapSummary} context - Data collection containing the key/value pairs to process through the map stage
         * @since 2015.1
         */
        function map(context)
        {
            try
            {
                var inputData = JSON.parse(context.value);
                //log.debug({title: 'Checking', details: 'inputData: ' + JSON.stringify(inputData)});
                //{"recordType":null,"id":"1","values":{"GROUP(internalid)":{"value":"3508022","text":"3508022"},"GROUP(internalid.customer)":{"value":"216475","text":"216475"},"GROUP(email)":"Tyng.Pan@hbo.com"}}
                var customerId = inputData.id;
                var customerName = inputData.name;
                context.write({key: customerId, value: customerName});
            } catch (errorObject) {
                log.error({ title: 'Map Error', details: 'Error occurred while reading search result. Details: ' + errorObject.message});
                throw errorObject;
            }
        }

        /**
         * Executes when the reduce entry point is triggered and applies to each group.
         *
         * @param {ReduceSummary} context - Data collection containing the groups to process through the reduce stage
         * @since 2015.1
         */
        function reduce(context)
        {
            var errorInEmail = '';
            var customerId = context.key;
            var scriptObj = runtime.getCurrentScript();
            var stmtDt = utilityObj.convNull(scriptObj.getParameter({name: 'custscript_ns_cust_email_stmt_dt'}));
            var startDt = utilityObj.convNull(scriptObj.getParameter({name: 'custscript_ns_cust_email_start_dt'}));
            var emailTmpl = utilityObj.convNull(scriptObj.getParameter({name: 'custscript_ns_cust_email_tmpl'}));
            var emailFrom = utilityObj.convNull(scriptObj.getParameter({name: 'custscript_ns_cust_email_from'}));
            var openOnly = utilityObj.convNull(scriptObj.getParameter({name: 'custscript_openonly'}));
            var consolidatedStmt = utilityObj.convNull(scriptObj.getParameter({name: 'custscript_consolstatement'}));

            log.debug({title: 'Checking', details: 'StmtDt: ' + stmtDt + ', startDt: ' + startDt + ', Open Only: ' + openOnly + ', Consolidated Stmt: ' + consolidatedStmt + ', Email Tmpl: ' + emailTmpl + ', emailFrom: ' + emailFrom});
            try{
                var startDateStr = null;
                if(startDt != '')
                    startDateStr = format.format({value:startDt, type: format.Type.DATE});
                var stmtDateStr = stmtDt;
                try{
                    stmtDateStr = format.format({value: stmtDt, type: format.Type.DATE});
                }catch(er){

                }
                log.debug({title: 'Checking', details: 'Start Date: ' + startDateStr + ', stmtDateStr: ' + stmtDateStr});

                var stmtFile = renderMod.statement({entityId: parseInt(customerId), printMode: renderMod.PrintMode.PDF, startDate: startDateStr, statementDate: stmtDateStr,
                    openTransactionsOnly: (openOnly == 'T' || openOnly == true) ? true : false,
                    consolidateStatements: (consolidatedStmt == 'T' || consolidatedStmt == true) ? true : false
                });

                var customerRec = record.load({type: record.Type.CUSTOMER, id: customerId});
                var salesRep = utilityObj.convNull(customerRec.getValue({fieldId: 'salesrep'}));
                if(salesRep != '')
                {
                    var salesRepRec = record.load({type: record.Type.EMPLOYEE, id: salesRep});
                    var repEmail = utilityObj.convNull(salesRepRec.getValue({fieldId: 'email'}));
                    if(repEmail == '' || salesRepRec.getValue({fieldId: 'isinactive'}) == true || salesRepRec.getValue({fieldId: 'isinactive'}) == 'T')
                        salesRep = null;
                }
                var stmtEmailsStr = utilityObj.convNull(customerRec.getValue({fieldId: 'custentity_acs_statement_email_addrs'}));
                log.debug({title: 'Checking', details: 'Email To: ' + stmtEmailsStr + ', sales rep: ' + salesRep});
                var stmtEmails = new Array();
                var tmpStmtEmails = stmtEmailsStr.split(/[;,]/gi);
                for(var idx=0; idx < tmpStmtEmails.length; idx++)
                {
                    var tmpEmailTo = utilityObj.convNull(tmpStmtEmails[idx]).trim();
                    if(tmpEmailTo == '')
                        continue;
                    stmtEmails.push(tmpEmailTo);
                }

                //Now send emails to
                if(stmtEmails.length > 0)
                {
                    log.debug({title: 'Checking', details: 'stmtEmails: ' + stmtEmails.join(',')});
                    var mergetResult = renderMod.mergeEmail({templateId: emailTmpl, entity: customerRec});
                    var emailBody = mergetResult.body;
                    var emailSubject = mergetResult.subject;
                    log.debug({title: 'Checking', details: 'Email Subj: ' + emailSubject + ', Body: ' + emailBody})
                    emailMod.send({author: emailFrom, recipients: stmtEmails, cc: salesRep == null ? null : [salesRep], subject: emailSubject, body: emailBody, attachments: [stmtFile], relatedRecords: {entityId: customerId}});
                }
                else
                    errorInEmail = 'No emails specified to send statements!';
            }catch(er){
                log.error({title: 'Checking', details: 'Error occurred while sending Statement Email to Customer: ' + er.message});
                errorInEmail = 'Error occurred while sending Statement Email to Customer: ' + er.message;
            }
            record.submitFields({type: record.Type.CUSTOMER, id: customerId, values: {'custentity_ns_acs_err_email_stmts': errorInEmail}, options: {ignoreMandatoryFields: true, enablesourcing: false}});
        }

        String.prototype.trim = function() {
            return this.replace(/^\s+|\s+$/g,"");
        };

        /**
         * Executes when the summarize entry point is triggered and applies to the result set.
         *
         * @param {Summary} summary - Holds statistics regarding the execution of a map/reduce script
         * @since 2015.1
         */
        function summarize(summary)
        {
            var scriptObj = runtime.getCurrentScript();
            var reduceKeys = new Array(), lastProcCustomerId = null;
            summary.reduceSummary.keys.iterator().each(function (key){
                reduceKeys.push(parseInt(key));
                lastProcCustomerId = key;
                return true;
            });
            //Sort ReduceKeys
            reduceKeys.sort(function(a, b){return a-b});
            log.emergency({title: 'Checking-SUMMARY', details: 'reduceKeys.length: ' + reduceKeys.length});
            if(reduceKeys.length > 0)
            {
                lastProcCustomerId = reduceKeys[reduceKeys.length-1];
                log.debug({title: 'Checking-SUMMARY', details: 'lastProcCustomerId: ' + lastProcCustomerId});
                //Now reschedule the same script to make sure all orders got processed
                log.debug({title: 'Checking-SUMMARY', details: 'Rescheduling MAP/REDUCE!'});
                var schTask = task.create({taskType: task.TaskType.MAP_REDUCE});
                schTask.scriptId = runtime.getCurrentScript().id;
                schTask.deploymentId = runtime.getCurrentScript().deploymentId;

                var srchId = utilityObj.convNull(scriptObj.getParameter({name: 'custscript_ns_cust_email_srch_id'}));
                var stmtDt = utilityObj.convNull(scriptObj.getParameter({name: 'custscript_ns_cust_email_stmt_dt'}));
                var startDt = utilityObj.convNull(scriptObj.getParameter({name: 'custscript_ns_cust_email_start_dt'}));
                var openOnly = utilityObj.convNull(scriptObj.getParameter({name: 'custscript_openonly'}));
                var consolidatedStmt = utilityObj.convNull(scriptObj.getParameter({name: 'custscript_consolstatement'}));
                var params = {'custscript_ns_cust_email_srch_id': srchId, 'custscript_ns_cust_email_stmt_dt': stmtDt, 'custscript_ns_cust_email_start_dt': startDt,
                    'custscript_openonly': openOnly, 'custscript_consolstatement': consolidatedStmt, 'custscript_ns_cust_stmt_email_lst_procid': lastProcCustomerId};
                schTask.params = params;
                var taskId = schTask.submit();
                log.debug({title: 'Checking-SUMMARY', details: 'taskId: ' + taskId});
            }
        }

        return {
            getInputData: getInputData,
            map: map,
            reduce: reduce,
            summarize: summarize
        };

    });
