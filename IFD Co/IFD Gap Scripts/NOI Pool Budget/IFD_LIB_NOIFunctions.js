/**
 * Copyright (c) 1998-2019 NetSuite, Inc.
 * 2955 Campus Drive, Suite 100, San Mateo, CA, USA 94403-2511
 * All Rights Reserved
 *
 * This software is the confidential and proprietary information of NetSuite, Inc.  ('Confidential Information').
 * You shall not disclose such Confidential Information and shall use it only in accordance with the terms of the license
 * you entered into with NetSuite
 */

/**
 * @NApiVersion 2.x
 * @NModuleScope Public
 * @issue : Common functions
 * @author: Kushal Joshi
 *
 * Version      Date        Author      Remarks
 * 1.0             Jan 2020     kjoshi      Initial Version
 * 1.01     	03 Feb 2020		PRies 		TI 273 - fix search for unprocessed Invoices - filter out closed periods
 * 1.02         04 Feb 2020		PRies 		TI 273 - fix search for unprocessed Invoices - filter out memorized transactions
 * 1.03			28 Feb 2020		CMargallo	Added retries and delay in calling M/R script.
 * 1.04         06 Mar 2020     PRies       Corrected the name of the task (not Task) module
 * 1.05         11 Mar 2020     PRies       Added NOILog function to get more details into the logs and Replaced all native log calls with NS_IFDLibrary.NOILog calls 
 * 1.06         24 Mar 2020     PRies       Added dadte filter to unprocessed Invoices search
 * 1.07          2 Apr 2020     PRies       Changed callMR function to allow it to run again at the end of the process if more Invoices found
 * 1.08          9 Apr 2020     PRies       Added util module and randomDelay function
 * 1.09         11 May 2020     PRies       Changed date filter to use createddate
 *
 */

define(['N/runtime', 'N/search', 'N/task', 'N/util'],
    function(runtime, search, NS_Task, NS_Util){

        var utility = {};

        utility.getNOIMRScriptRunning = function(stDeploymentID)
        {	
        	var arrFilters = [];
        	var arrColumns = [];
        	
        	arrColumns.push(search.createColumn({name: 'taskid'}));
        	arrFilters.push(search.createFilter({
        		name: 'status',
        		operator: search.Operator.ANYOF,
        		values : ["@NONE@","PENDING","PROCESSING","RESTART","RETRY"]
        	}));
        	arrFilters.push(search.createFilter({
        		join : 'script',
        		name: 'scriptid',
        		operator: search.Operator.IS,
        		values : ['customscript_ns_mr_noi_pool_allow_adhoc']
        	}));
        	
        	if (stDeploymentID)
        	{
        		arrFilters.push(search.createFilter({
            		join : 'scriptdeployment',
            		name: 'scriptid',
            		operator: search.Operator.ISNOT,
            		values : [stDeploymentID]
            	}));
        	}
        	
            var mapreducescriptinstanceSearchObj = search.create({
                type: 'scheduledscriptinstance',
                filters: arrFilters,
                columns: arrColumns
            });
        	
            var searchResultCount = mapreducescriptinstanceSearchObj.runPaged().count;
            //log.debug('utility.getNOIMRScriptRunning','Total M/R Script Instance Running : ' + searchResultCount);
            utility.NOILog('debug', 'utility.getNOIMRScriptRunning','Total M/R Script Instance Running : ' + searchResultCount);
            return searchResultCount;
        };

        utility.totalUnprocessedNOIInvoices = function(){
            var invoiceSearchObj = search.create({
                type: "invoice",
                filters:
                [
                   ["type","anyof","CustInvc"], 
                   "AND", 
                   ["custbody_ifd_noi_process_complete","is","F"], 
                   "AND", 
                   ["mainline","is","T"],
                            // v1.01 - added filter
                   "AND",
                   ["accountingperiod.closed", "is", false],
                           // v1.02 - added filter
                   "AND",
                   ["memorized", "is", false],
                   "AND",                   
                   ["datecreated", "onorafter", "twodaysago"]  // v1.06 added // v1.09 - updated
                ],
                columns:
                [
                   search.createColumn({name: "internalid", label: "Internal ID"})
                ]
            });
            var invoiceSearchResultCount = invoiceSearchObj.runPaged().count;
            //log.debug('invoiceSearchResultCount',invoiceSearchResultCount);
            utility.NOILog('debug', 'invoiceSearchResultCount',invoiceSearchResultCount);
            return invoiceSearchResultCount;
        };

        utility.TryToSave = function(objRecord, numSecondsDelay, maxRetries)
        {
        	var stRecordID = null;
            var maxRetries = maxRetries || 3;
            var timeDelay = numSecondsDelay || 3;
           
            var delay = function(s)
            {
                if (!s) return;
                var timeEnd = (new Date().getTime()) + (s * 1000); 
                while(new Date().getTime() <= timeEnd){}
            }
            
            for (var numRetries = 0; numRetries < maxRetries; numRetries++)
            {
                try 
                {
                	stRecordID = objRecord.save({
                		enableSourcing: true,
                		ignoreMandatoryFields: true
                	});
                    //log.audit('SUCCESS','RECORD (' + objRecord.type + ') SUCCESSFULLY SAVED (' + stRecordID + ')');
                    utility.NOILog('audit', 'SUCCESS','RECORD (' + objRecord.type + ') SUCCESSFULLY SAVED (' + stRecordID + ')');
                    return 1;
                } 
                catch(e)
                {
                    //log.error('utility.TryToSave', e.name+' : '+e.message);
                    utility.NOILog('error', 'utility.TryToSave', e.name+' : '+e.message);
                }
            	delay(timeDelay);
            }
            return 0;
        };

        utility.callMapReduce = function(option)
        {
            var maxRetries = option.retry || 3;
            var timeDelay = option.delay || 3;
                       
            var delay = function(s)
            {
                if (!s) return;
                var timeEnd = (new Date().getTime()) + (s * 1000); 
                while(new Date().getTime() <= timeEnd){}
            }
            
            for (var numRetries = 0; numRetries < maxRetries; numRetries++)
            {
                try 
                {
                    var objScriptTask = NS_Task.create({
                        taskType : NS_Task.TaskType.MAP_REDUCE,
                        scriptId : option.scriptid
                    });
                    var stTaskID = objScriptTask.submit();
                    //log.audit('utility.callMapReduce', 'Task ID : ' + stTaskID);
                    utility.NOILog('audit','utility.callMapReduce', 'Task ID : ' + stTaskID);
                    return 1;
                }
                catch(e)
                {
                    // log.error('utility.callMapReduce', e.name+' : '+e.message);
                    utility.NOILog('error','utility.callMapReduce', e.name+' : '+e.message);
                }
            	delay(timeDelay);
            }
            
            return 0;
        };

        utility.NOILog = function (logLevel, title, details) 
        {
            if (logLevel == undefined || logLevel == null || logLevel == '') 
            {
                logLevel = 'debug';
            }
            if (title == undefined || title == null || title == '') 
            {
                title = 'NOILog';
            }
            if (details == undefined || details == null) 
            {
                details = '';
            }            
            var script = runtime.getCurrentScript();
            var deployment = script.deploymentId;
            var execContext = runtime.executionContext; 
            var logDetails = 'ExecContext: ' + execContext +
                ' --- Deployment: ' + deployment +
                ' --- Details: ' + details;

            switch(logLevel) {
                case 'debug':
                    log.debug({
                        title: title,
                        details: logDetails
                    });                  
                    break;
                case 'error':
                    log.error({
                        title: title,
                        details: logDetails
                    });                  
                    break;
                default:
                    log.audit({
                        title: title,
                        details: logDetails
                    });
            }
        };

        utility.randomDelay = function()
        {
            var rnd = randomIntFromInterval(0,10);
            utility.NOILog('debug', 'randomDelay - ' + NS_Util.nanoTime(), 'Delay will be ' + rnd);
            var timeEnd = (new Date().getTime()) + (rnd * 1000); 
            while(new Date().getTime() <= timeEnd){}
        }

        return utility;

        function _isEmpty(value) {
            if (value == null) {
                return true;
            }
            if (value == undefined) {
                return true;
            }
            if (value == 'undefined') {
                return true;
            }
            if (value == '') {
                return true;
            }
            if (value == ' ') {
                return true;
            }
            return false;
        }

        function randomIntFromInterval(min, max) { // min and max included 
            return Math.floor(Math.random() * (max - min + 1) + min);
        }
    });