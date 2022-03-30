/**
 * Copyright (c) 1998-2016 NetSuite, Inc.
 * 2955 Campus Drive, Suite 100, San Mateo, CA, USA 94403-2511
 * All Rights Reserved.
 *
 * This software is the confidential and proprietary information of
 * NetSuite, Inc. ("Confidential Information"). You shall not
 * disclose such Confidential Information and shall use it only in
 * accordance with the terms of the license agreement you entered into
 * with NetSuite.
 * Module Description
 *
 */
/**
 * Module Description
 *
 * Version    Date            Author           Remarks
 * 1.00       12 July2016     bfeliciano       initial
 *
 */

/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope Public
 */
define(['N/record', 'N/runtime', 'N/search', './NSUtil', 'N/error', 'N/task', './LibJsonRequest'],
    /**
     * @param {record} record
     * @param {runtime} runtime
     * @param {search} search
     * @param {Object} NSUtil
     * @param {error} error
     */
    function (record, runtime, search, NSUtil, error, task, libJsonReq)
    {
        
        function hasActiveDeployments(script_id) {
//          log.debug('getActiveDeployments', '>> script_id: ' + JSON.stringify(script_id));
            
            var arrDeployments = [];
            var arrSearch = NSUtil.searchAll({
                recordType : 'scriptdeployment',
                columns : [ 'scriptid' ],
                filterExpression : [
                        [ 'script.scriptid', 'is', script_id ], 'AND',
                        [ 'isdeployed', 'is', true ], 'AND',
                        [ 'status', 'anyof', 'NOTSCHEDULED' ]
                    ]
            });
            
//          log.debug('getActiveDeployments', '>> Length: ' + arrSearch.length);
            arrSearch.forEach(function(row) {
                arrDeployments.push({
                    id: row.id,
                    name: row.getValue({name : 'scriptid'})
                });
            });
            
            return arrDeployments;
        }
        
        function getActiveDeployments(script_id) {
//          log.debug('getActiveDeployments', '>> script_id: ' + JSON.stringify(script_id));
            
            var arrDeployments = [];
            var arrSearch = NSUtil.searchAll({
                recordType : 'scriptdeployment',
                columns : [ 'scriptid' ],
                filterExpression : [
                        [ 'script.scriptid', 'is', script_id ], 'AND',
                        [ 'isdeployed', 'is', true ], 'AND',
                        [ 'status', 'anyof', 'NOTSCHEDULED' ]
                    ]
            });
            
//          log.debug('getActiveDeployments', '>> Length: ' + arrSearch.length);
            arrSearch.forEach(function(row) {
                arrDeployments.push({
                    id: row.id,
                    name: row.getValue({name : 'scriptid'})
                });
            });
            
            return arrDeployments;
        }

        var QueueMRScript = {
            SalesOrderRequest : {
                scriptid : 'customscript_sears_mr_process_jsonwebreq',
                paramfld : 'custscript_procwebrequest_batchid',
                param_rectype: 'custscript_procwebrequest_recordtype',
                value_rectype: 'salesorder'
            },
            FulfillmentRequest : {
                scriptid : 'customscript_sears_mr_process_jsonwebreq',
                param_rectype: 'custscript_procwebrequest_recordtype',
                value_rectype: 'itemfulfillment',
                paramfld : 'custscript_procwebrequest_batchid'
            },
            ItemReceiptRequest : {
                scriptid : 'customscript_sears_mr_process_jsonwebreq',
                param_rectype: 'custscript_procwebrequest_recordtype',
                value_rectype: 'itemreceipt',
                paramfld : 'custscript_procwebrequest_batchid'
            },
            ReturnAuthorizationCreate : {
                scriptid : 'customscript_sears_mr_process_jsonwebreq',
                param_rectype: 'custscript_procwebrequest_recordtype',
                value_rectype: 'returnauthorization',
                paramfld : 'custscript_procwebrequest_batchid'
            },
            ReturnAuthorizationItemReceipt : {
                scriptid : 'customscript_sears_mr_process_jsonwebreq',
                param_rectype: 'custscript_procwebrequest_recordtype',
                value_rectype: 'returnauthorization_ir',
                paramfld : 'custscript_procwebrequest_batchid'
            }
        };
        
        var QueueMRScriptWMS = {
            SalesOrderRequest : {
                scriptid : 'customscript_sears_mr_send_wms_so',
                paramfld : 'custscript_mr_send_wms_batchid',
                param_rectype: 'custscript_mr_send_wms_recordtype',
                value_rectype: 'salesorder'
            }
        };
        
        
        var QueueSchedScript = {
                SalesOrderRequest: {
                    scriptid: 'customscript_sears_ss2_send_salesorders2',
                    paramfld: 'custscript_ss2_sendso_batchid'                       
                },
                ItemReceiptRequest: {
                    scriptid: 'customscript_sears_ss2_send_transforders',
                    paramfld: 'custscript_ss2_sendto_batchid'                       
                },
                ReturnAuthorizationCreate: {
                    scriptid: 'customscript_sears_ss2_send_returns2',
                    paramfld: 'custscript_ss2_sendra_batchid'                       
                }
        };
        
        var EndPoint = {};
        
        EndPoint.beforeSubmit = function (context)
        {
            var logTitle = 'beforeSubmit::trigger Batch ID';
            
            
            if (context.type != context.UserEventType.XEDIT )
            {
                return;
            }
            
            var stBatchId = context.newRecord.id;
            
            var recOldBatch = context.oldRecord;
            var recNewBatch = context.newRecord;
            var newStatus = recNewBatch.getValue({
                fieldId: 'custrecord_batchwebreq_status'
            });
            var oldStatus = recOldBatch.getValue({
                fieldId: 'custrecord_batchwebreq_status'
            });
            
            log.debug(logTitle, '--Batch Id = '  + stBatchId + ', oldStatus = ' + oldStatus + ', newStatus = ' + newStatus);
            if (oldStatus == newStatus)
            {
                log.debug(logTitle, '--Batch Id = '  + stBatchId + ', Cannot save: there is no change in status = ' + newStatus);
                throw 'Error: Batch Id = '  + stBatchId + ', Cannot save: there is no change in status = ' + newStatus
            }
            
            return true;
        };
        
        
        /**
         * @param {context} context
         */
        EndPoint.afterSubmit = function (context)
        {
            var logTitle = 'afterSubmit::trigger Batch ID';
            var currentBatch = context.newRecord.id;
            
            var recordObj = context.newRecord;
            var currentStatus = recordObj.getValue({
                fieldId: 'custrecord_batchwebreq_status'
            });
            
            if (currentStatus != 'PENDING-CREATION' && currentStatus != 'PENDING-APIGEE' && !currentStatus.match(/^INIT-/ig))
            {
                return true;
            }
            
            recordObj = record.load({type:context.newRecord.type, id: currentBatch});

            var currentType = recordObj.getValue({
                fieldId: 'custrecord_batchwebreq_requesttype'
            });
            
            logTitle = ['TriggerBatchID',currentBatch,currentStatus,currentType].join(':');
            
            log.debug(logTitle, '*** Start *** ' + JSON.stringify({'type' : context.type,
                   'op' : runtime.executionContext,
                   'batch': currentBatch,
                   'status' : currentStatus,
                   'reqtype': currentType}));
            
            //regina - 11/14 - fix in order to not change the status from INIT-APIGEE to PENDING-APIGEE
            if(!currentStatus.match(/^INIT-/ig))
            {
                log.debug(logTitle, '>> Call validatebatch status');
                var batchData = libJsonReq.validateBatchStatus(currentBatch);
                currentStatus = batchData.custrecord_batchwebreq_status;
                log.debug(logTitle, '>> status: ' + JSON.stringify([currentStatus, batchData]));
            }
            //regina - 11/14
            
            
            
            if ( currentStatus == 'PENDING-CREATION')
            {
                
                if (QueueMRScript[currentType])
                {
                    var mapReduceData = {};
                    mapReduceData = QueueMRScript[currentType];
                    mapReduceData.deployments = getActiveDeployments(mapReduceData.scriptid);
                    
//                  log.debug(logTitle, '.. mapReduceData: ' + JSON.stringify([currentType, mapReduceData]));
                    
                    var retryNum = 2;
                    var isSuccess = false;
                    
                    for (var i=0; i<retryNum; i++)
                    {
                        mapReduceData.deployments.forEach(
                            function (deployment)
                            {
                                if (!isSuccess)
                                {
                                    try 
                                    {
                                        var mapReduceObj = task.create({taskType : task.TaskType.MAP_REDUCE});
                                        mapReduceObj.scriptId = mapReduceData.scriptid;
                                        mapReduceObj.params = {};
                                        mapReduceObj.params[mapReduceData.paramfld] = currentBatch;
                                        mapReduceObj.deploymentId = deployment.name;
//                                      log.debug(logTitle, i + '.. mapReduceObj: ' + JSON.stringify([mapReduceObj, deployment]));
                                        
                                        // load the script deployment 
                                        var recDeploy = record.load({type:'scriptdeployment', id:deployment.id});
                                        if (mapReduceData.value_rectype == recDeploy.getValue({fieldId:mapReduceData.param_rectype}) )
                                        {                                           
                                            // submit the task
                                            var mapReduceId = mapReduceObj.submit();
                                            var taskStatus = task.checkStatus(mapReduceId);

                                            log.audit(logTitle, '** QUEUE STATUS : ' + JSON.stringify([mapReduceId, taskStatus, task.TaskStatus.FAILED]));
                                            if (taskStatus != task.TaskStatus.FAILED)
                                            {
                                                isSuccess = true;
                                            }
                                        }                                       
                                    }
                                    catch (err)
                                    {
//                                      log.audit(logTitle, '**ERROR**: ' + err.toString());
                                    }
                                }
                                return isSuccess;
                            });
                        
                        if (isSuccess) break;
                    }
                    log.audit(logTitle, '... success? >>' + isSuccess);
                    
                    if (isSuccess)
                    {
                        log.audit(logTitle, '... set Batch ID to  INPROCESS-CREATION >>' + currentBatch);
                        record.submitFields(
                        {
                            type : 'customrecord_sears_webrequest_batch',
                            id : currentBatch,
                            values :
                            {
                                'custrecord_batchwebreq_status' : 'INPROCESS-CREATION'
                            }
                        });
                    }
                    else
                    {
                        log.debug(logTitle, '... current type? >>' + currentType);
                        if (currentType == 'SalesOrderRequest')
                        {
                            var arrPendingWebReq = libJsonReq.listPendingRequests(currentBatch);
                            
                            log.debug(logTitle, '... arrPendingWebReq? >>' + JSON.stringify(arrPendingWebReq));
                            
                            var hasItems =false;
                            
                            arrPendingWebReq.forEach(function(row){
                                var jsonData = row.getValue({name:'custrecord_jsonreq_content'}) ? JSON.parse(row.getValue({name:'custrecord_jsonreq_content'})) : null;
                                var jsonId = row.getValue({name:'internalid'});
                                
                                var errorRequest = true;
                                
                                if (jsonData && jsonData.recordtype)
                                {
                                    var customerId = null, result = {};
                                    if (jsonData.recordtype == 'customer')
                                    {
                                        result = libJsonReq.createCustomer(jsonData, jsonId);
                                        customerId = result.custrecord_jsonreq_recordid;
                                        errorRequest = false;
                                        hasItems = true;
                                    }
                                    else if (jsonData.recordtype == 'salesorder')
                                    {
                                        if ( customerId )
                                        {
                                            jsonData.customer_internalid = customerId;
                                        }
                                        result = libJsonReq.createSalesOrder(jsonData, jsonId);
                                        errorRequest = false;
                                        hasItems = true;
                                    }
                                }
                            });
                            
                            libJsonReq.validateBatchStatus(currentBatch);
                        }                       
                        
//                      log.audit(logTitle, '... set Batch ID to  QUEUE-CREATION >>' + currentBatch);
//                      record.submitFields(
//                      {
//                          type : 'customrecord_sears_webrequest_batch',
//                          id : currentBatch,
//                          values :
//                          {
//                              'custrecord_batchwebreq_status' : 'QUEUE-CREATION'
//                          }
//                      });
                    }
                }

            }
            else if ( currentStatus == 'PENDING-APIGEE')
            {
                var retryNum = 2;
                var isSuccess = false;
                        
                if(currentType = 'SalesOrderRequest')
                {
                    var mapReduceData = {};
                    mapReduceData = QueueMRScriptWMS[currentType];
                    mapReduceData.deployments = getActiveDeployments(mapReduceData.scriptid);
                    
                  log.debug(logTitle, '.. mapReduceData: ' + JSON.stringify([currentType, mapReduceData]));
                                        
                    for (var i=0; i<retryNum; i++)
                    {
                        mapReduceData.deployments.forEach(
                            function (deployment)
                            {
                                if (!isSuccess)
                                {
                                    try 
                                    {
                                        var mapReduceObj = task.create({taskType : task.TaskType.MAP_REDUCE});
                                        mapReduceObj.scriptId = mapReduceData.scriptid;
                                        mapReduceObj.params = {};
                                        mapReduceObj.params[mapReduceData.paramfld] = currentBatch;
                                        mapReduceObj.deploymentId = deployment.name;
                                      log.debug(logTitle, i + '.. mapReduceObj: ' + JSON.stringify([mapReduceObj, deployment]));
                                        
                                        // load the script deployment 
                                        //var recDeploy = record.load({type:'scriptdeployment', id:deployment.id});
                                        //if (mapReduceData.value_rectype == recDeploy.getValue({fieldId:mapReduceData.param_rectype}) )
                                        //{                                           
                                            // submit the task
                                            var mapReduceId = mapReduceObj.submit();
                                            var taskStatus = task.checkStatus(mapReduceId);

                                            log.audit(logTitle, '** QUEUE STATUS : ' + JSON.stringify([mapReduceId, taskStatus, task.TaskStatus.FAILED]));
                                            if (taskStatus != task.TaskStatus.FAILED)
                                            {
                                                isSuccess = true;
                                            }
                                        //}                                       
                                    }
                                    catch (err)
                                    {
//                                      log.audit(logTitle, '**ERROR**: ' + err.toString());
                                    }
                                }
                                return isSuccess;
                            });
                        
                        if (isSuccess) break;
                    }
                    
                }
                else
                {
                    if (QueueSchedScript[currentType])
                    {
                        var schedScriptData = {};
                        schedScriptData = QueueSchedScript[currentType];
                        schedScriptData.deployments = getActiveDeployments(schedScriptData.scriptid);
                        
    //                  log.debug(logTitle, '.. schedScriptParams: ' + JSON.stringify([currentType, schedScriptData]));
                        
                        
                        for (var i=0; i<retryNum; i++)
                        {
                            schedScriptData.deployments.forEach(
                                function (deployment)
                                {
                                    if (!isSuccess)
                                    {
                                        try 
                                        {
                                            var schedScriptObj = task.create({taskType : task.TaskType.SCHEDULED_SCRIPT});
                                            schedScriptObj.scriptId = schedScriptData.scriptid;
                                            schedScriptObj.params = {};
                                            schedScriptObj.params[schedScriptData.paramfld] = currentBatch;
                                            schedScriptObj.deploymentId = deployment.name;
                                            
    //                                      log.debug(logTitle, i + '.. schedScriptObj: ' + JSON.stringify(schedScriptObj));
                                            
                                            // submit the task
                                            var schedScriptId = schedScriptObj.submit();
                                            var taskStatus = task.checkStatus(schedScriptId);
        
                                            log.audit(logTitle, '** QUEUE STATUS : ' + JSON.stringify([schedScriptId, taskStatus, task.TaskStatus.FAILED]));
                                            if (taskStatus != task.TaskStatus.FAILED)
                                            {
                                                isSuccess = true;
                                            }
                                        }
                                        catch (err)
                                        {
    //                                      log.audit(logTitle, '**ERROR**: ' + err.toString());
                                        }
                                    }
                                    return isSuccess;
                                });
                            
                            if (isSuccess) break;
                        }
                    }
                }
                
                if (!isSuccess)
                {
                    log.audit(logTitle, '... set Batch ID to  QUEUE-APIGEE >>' + currentBatch);
                    record.submitFields(
                    {
                        type : 'customrecord_sears_webrequest_batch',
                        id : currentBatch,
                        values :
                        {
                            'custrecord_batchwebreq_status' : 'QUEUE-APIGEE'
                        }
                    });
                }
                       
                        
               
                //////////////////////////////////////////////////////////
            }
            
            else if  (currentStatus && currentStatus.match(/^INIT/ig))
            {
                //regina - 11/14 - trigger only on create
                if (context.type != context.UserEventType.CREATE )
                {
                    return true;
                }
                        
                var mapReduceData = {};
                mapReduceData.deployments = getActiveDeployments('customscript_sears_mr_batchreq_process');
                
                var retryNum = 2;
                var isSuccess = false;
                
                for (var i=0; i<retryNum; i++)
                {
                    mapReduceData.deployments.forEach(
                        function (deployment)
                        {
                            if (!isSuccess)
                            {
                                try 
                                {
                                    var mapReduceObj = task.create({taskType : task.TaskType.MAP_REDUCE});
                                    mapReduceObj.scriptId = 'customscript_sears_mr_batchreq_process';
                                    mapReduceObj.params = {};
                                    mapReduceObj.params[mapReduceData.paramfld] = currentBatch;
                                    mapReduceObj.deploymentId = deployment.name;
                                    
                                    // submit the task
                                    var mapReduceId = mapReduceObj.submit();
                                    var taskStatus = task.checkStatus(mapReduceId);

                                    log.audit(logTitle, '** QUEUE STATUS : ' + JSON.stringify([mapReduceId, taskStatus, task.TaskStatus.FAILED]));
                                    if (taskStatus != task.TaskStatus.FAILED)
                                    {
                                        isSuccess = true;
                                    }
                                }
                                catch (err)
                                {
//                                  log.audit(logTitle, '**ERROR**: ' + err.toString());
                                }
                            }
                            return isSuccess;
                        });
                    
                    if (isSuccess) break;
                }
                log.audit(logTitle, '... success? >>' + isSuccess);
            }

            return true;
        };
        return EndPoint;
});
