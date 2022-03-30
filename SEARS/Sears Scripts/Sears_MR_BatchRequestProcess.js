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
 * Version      Date            Author      Remark  
 * 1.0          31-Jan-2017     Balaraman   Big Item Shipping Schedule record creation for booking with ClearD service, existing script uncommented.  Reference: /*x*./ marked lines
 */
/**
 * @NApiVersion 2.x
 * @NScriptType MapReduceScript
 * @NModuleScope Public
 */
define(['N/record', 'N/runtime', 'N/search', './NSUtil', 'N/error','N/task','./LibJsonRequest','N/url', 'N/https'],
        
/**
 * @param {record} record
 * @param {runtime} runtime
 * @param {search} search
 * @param {Object} NSUtil
 * @param {error} error
 */
function(record, runtime, search, nsutil, error, task, libJsonReq, url, https) {
    var EndPoint = {};
    var runCount = 0;
    var maxRunTime = 15 * 1000 * 60; 
//  var maxUsageThreshold = 500;
    var maxLines = 500;
    var startTime = (new Date()).getTime();

    function getRandomInt(min, max) {
        min = Math.ceil(min);
        max = Math.floor(max);
        return Math.floor(Math.random() * (max - min)) + min;
    }
    
    EndPoint.getInputData = function ()
    {
        try
        {
            var currentScript = runtime.getCurrentScript();
            var logTitle = ['BatchRequestProcess', 'getInputData',currentScript.deploymentId, runCount].join(':');
            var deltaTime = (new Date()).getTime() - startTime; 
            log.debug(logTitle, '**START SCRIPT**: ' + JSON.stringify([deltaTime, maxRunTime]) );
            
            var objSearchPending = getNextBatches(maxLines);
            log.audit(logTitle, ' >> Search Length: ' + JSON.stringify([objSearchPending.length]) );
            var hashValue = [(new Date()).getTime().toString(),getRandomInt(0,100000000)].join(':');
            
            var arrReturnResults = [];
            var arrInitBatches = [];
            objSearchPending.forEach(function(row){
                var rowData = {};
                rowData.id = row.id;

                rowData.status = row.getValue({name:'custrecord_batchwebreq_status'});
                rowData.requestType = row.getValue({name:'custrecord_batchwebreq_requesttype'});

                var newStatus =  rowData.status=='INIT-CREATION' ? 'INITPROCESSING-CREATION' : 'INITPROCESSING-APIGEE';
                
                //regina - 11/17 - try catch to be sure the status hasn't been changed by another deployment. trigger xedit of beforesubmit script
                try
                {
                    record.submitFields({
                        type : 'customrecord_sears_webrequest_batch',
                        id : row.id,
                        values : {
                            custrecord_batchwebreq_status : newStatus,
                            custrecord_batchwebreq_hashvalue: hashValue
                        }
                    });
                    arrInitBatches.push(rowData.id);
                }
                catch(errorSave)
                {
                    var stMsg = (errorSave.message != undefined) ? errorSave.name + ' ' + errorSave.message : errorSave.toString();
                    log.debug(logTitle, '--Error flaging to initprocessing batch id = '+row.id + ',msg = ' + stMsg);
                }
                
                return true;
            });

            if ( arrInitBatches && arrInitBatches.length)
            {

                // now do a second search //
                var arrBatchToProcess = nsutil.searchAll({
                    recordType: 'customrecord_sears_webrequest_batch',
                    filterExpression: [ 
                       ['custrecord_batchwebreq_hashvalue','is',hashValue]
                       ,'AND', ['internalid','anyof',arrInitBatches]
                    ],
                    columns: [ search.createColumn({name:'custrecord_batchwebreq_status'}), 
                               search.createColumn({name:'custrecord_batchwebreq_requesttype'}) ]
                });

                arrBatchToProcess.forEach(function(row){
                    var rowData = {};
                    rowData.id = row.id;
                    rowData.status = row.getValue({name:'custrecord_batchwebreq_status'});
                    rowData.requestType = row.getValue({name:'custrecord_batchwebreq_requesttype'});

                    arrReturnResults.push(rowData);             
                });
            }
            log.debug(logTitle, '--arrReturnResults.length = ' + arrReturnResults.length);
            return arrReturnResults;
        }
        catch (e)
        {
            if (e.message != undefined)
            {
                log.error('ERROR' , e.name + ' ' + e.message);
                throw e.name + ' ' + e.message;
            }
            else
            {
                log.error('ERROR', 'Unexpected Error' , e.toString()); 
                throw error.create({
                    name: '99999',
                    message: e.toString()
                });
            }
            
        }
    };
    
    EndPoint.map = function(mapContext)
    {
        var currentScript = runtime.getCurrentScript();
        var logTitle = ['BatchRequestProcess::map', currentScript.deploymentId, runCount].join(':');
        var deltaTime = (new Date()).getTime() - startTime; 
        
        try
        {
            var rowData = JSON.parse( mapContext.value );
            logTitle = logTitle + '::' + ((new Date()).getTime() - startTime);
            
            log.debug(logTitle, '>> rowData: ' + JSON.stringify(rowData));          
            if (rowData && rowData.status)
            {
                mapContext.write(rowData.id, rowData);
            }
            return true;
        }
        catch (e)
        {
            if (e.message != undefined)
            {
                log.error('ERROR' , e.name + ' ' + e.message);
                throw e.name + ' ' + e.message;
            }
            else
            {
                log.error('ERROR', 'Unexpected Error' , e.toString()); 
                throw error.create({
                    name: '99999',
                    message: e.toString()
                });
            }
            
        }
    };
    
    EndPoint.reduce = function (reduceContext)
    {
        var currentScript = runtime.getCurrentScript();
        var logTitle = ['BatchRequestProcess::reduce', currentScript.deploymentId, runCount].join(':');
        var deltaTime = (new Date()).getTime() - startTime; 
        
        try
        {
            log.debug(logTitle, "Key: " + reduceContext.key);
            
            reduceContext.values.forEach(function(contextValue){
                var batch = JSON.parse(contextValue);
                log.debug(logTitle, "Values: " + JSON.stringify(batch));
                log.debug(logTitle, "-- Processing Batch = " + batch.id);
//              var batchData = libJsonReq.validateBatchStatus(batch.id);
//              log.debug(logTitle, '>> Batch: ', JSON.stringify({'batch':batch, data:batchData}) );
                var batchStatus = batch.status;
//              if (batchData.custrecord_batchwebreq_status)
//              {
//                  batchStatus = batchData.custrecord_batchwebreq_status;
//              }
                
                var newBatchStatus = '';                
                if (batchStatus == 'INIT-CREATION' || batchStatus == 'QUEUE-CREATION' || batchStatus == 'INITPROCESSING-CREATION')
                {
                    newBatchStatus = 'PENDING-CREATION';
                }
                else if (batchStatus == 'INIT-APIGEE' || batchStatus == 'INITPROCESSING-APIGEE')
                {
                    newBatchStatus = 'PENDING-APIGEE';                  
                    if (batch.requestType == 'SalesOrderRequest')
                    {
                        log.debug(logTitle, "-- Processing Batch for SalesOrderRequest = " + batch.id);
                        
                        //regina - 11/14 - additional checking to prevent duplicate submit
                        var objBatchData = search.lookupFields({
                            type : 'customrecord_sears_webrequest_batch',
                            id : batch.id,
                            columns : [ 'custrecord_batchwebreq_status' ]
                        });
                        log.debug(logTitle, "-- Processing Batch for SalesOrderRequest = " + batch.id + ", current status =" +objBatchData.custrecord_batchwebreq_status);
                        if(objBatchData.custrecord_batchwebreq_status == 'PENDING-APIGEE')
                        {
                            log.debug(logTitle, "-- Skip Processing Batch for SalesOrderRequest = " + batch.id);
                        }
                        else
                        {
                            //regina - 11/23/2016 - commented out location check logic
                            
                            var arrColumns =  ['internalid','custbody_esi_tran_id','custbody_rewards_earned','custbody_esi_event_id','custbody_loyalty_number',
                                               'custbody_delivery_date','custbody_shipping_schedule','custbody_sears_booking_info']; 
/*
                            var listTransactions = nsutil.searchAll({
                                recordType:'transaction',
                                columns: ['internalid',
                                          'tranid',
                                          'custcol_sent_to_apigee',
                                          'custcol_wms_error_sending_chk',
                                          'custcol_wms_sending_errormsg',
                                          'location', 'locationautoassigned',
                                          'noautoassignlocation',
                                          'custcol_bigticket'],
                                filterExpression: [
                                    ['mainline','is','F'],'AND',
                                    ['custbody_sears_webrequest_batch','anyof', batch.id], 'AND',                
                                    [
                                      ['item.type', 'anyof', 'InvtPart'], 'OR',
                                      [
                                        ['item.type', 'anyof', 'Service'], 'AND', 
                                        ['item.isfulfillable', 'is', 'T']                                             
                                      ]
                                    ]
                                ]});
                            */
                            var hasAllLocation = true;
                            
                            //regina - 11/23/2016 - commented out location check logic
                            /*
                            listTransactions.forEach(function(rowRecord)
                            {
                                var locationData = {};
                                locationData.id = rowRecord.getValue({name:'location'});
                                locationData.auto = rowRecord.getValue({name:'locationautoassigned'});
                                locationData.noAuto = rowRecord.getValue({name:'noautoassignlocation'});

                                log.debug(logTitle, '### LOCATIONS: ' + JSON.stringify(locationData) );
                                
                                //if there is location and either auto or noauto is checked
                                if(!(locationData.id && (locationData.auto || locationData.noAuto)))                                
                                //if (!locationData.id || (locationData.id && (!locationData.auto || locationData.noAuto) ) )
                                {
                                    hasAllLocation = false;
                                    return false;
                                }

                                return true;
                            });
                            log.debug(logTitle, "-- Processing Batch for SalesOrderRequest = " + batch.id + ', hasAllLocation = '+hasAllLocation);
                            
                            */
                            
                            if (!hasAllLocation)
                            {
                                newBatchStatus = 'INIT-APIGEE';
                            }
                            else
                            {
                                log.debug(logTitle, "-- Processing Batch for SalesOrderRequest = " + batch.id + ', get all the SO for this batch');
                                // get all the SO for this batch //
                                var listTransactions = nsutil.searchAll({
                                    recordType:'transaction',
                                    columns:arrColumns,
                                    filterExpression: [
                                        ['mainline','is','T'],'AND',
                                        ['custbody_sears_webrequest_batch','anyof', batch.id]
                                    ]});                        
                                log.debug(logTitle, '>>  List Transactions: ' + JSON.stringify(listTransactions) );
                                
                                listTransactions.forEach(function(row)
                                {
                                    log.debug(logTitle, "--- Processing Batch for SalesOrderRequest = " + batch.id + ', Processing transaction id = '+row.id);
                                    
                                    var recordData = {};
                                    var arrColumns =  ['custbody_esi_tran_id','custbody_rewards_earned','custbody_esi_event_id','custbody_loyalty_number',
                                                       'custbody_delivery_date','custbody_shipping_schedule','custbody_sears_booking_info'];                            
                                    
                                    arrColumns.forEach(function(col){
                                        recordData[col] = row.getValue({name:col})||'';
                                    });                         
                                    log.debug(logTitle+':SO Data', JSON.stringify(recordData) );
                                    

                                    if (recordData.custbody_esi_tran_id || recordData.custbody_loyalty_number) {
                                        
                                        try {
                                            libJsonReq.ESILoyalty(row.id);
                                        } catch (err_esi) {
                                            log.system('ESILoyalty', err_esi.toString());
                                        }
                                        
                                    }

/*y*/
                                    if ( recordData.custbody_delivery_date && recordData.custbody_shipping_schedule && !recordData.custbody_sears_booking_info)
                                    {
                                        try {
                                            log.debug(logTitle + "::CREATE BOOKING RECORD");
                                            libJsonReq.verifyBooking(row.id, 'salesorder');
                                        } catch (err_booking) {}
                                    }
/*y*/
                                    //regina - 11/23/2016 - commented out shipping logic
                                    /*
                                    if ( recordData.custbody_delivery_date && recordData.custbody_shipping_schedule && !recordData.custbody_sears_booking_info)
                                    {
                                        try {
                                            libJsonReq.verifyBooking(row.id, 'salesorder');
                                        } catch (err_booking) {}
                                    }
                                    */
                                    
                                    //regina  - 11/13 - added retry logic - will retry to send email after 3 times
                                    var bSuccessSendEmail = false;
                                    var intTryCount = 0;
                                    while(!bSuccessSendEmail && intTryCount < 3)
                                    {
                                        intTryCount++;
                                        log.debug(logTitle, '>>> SEND EMAIL << : Transaction Id = ' + row.id + ', intTryCount = ' + intTryCount);
                                        
                                        try 
                                        {
                                            // call the send email //                           
                                            var stSendEmailURL = url.resolveScript({
                                                scriptId: 'customscript402',
                                                deploymentId: 'customdeploy1',
                                                returnExternalUrl: true,
                                                params: {'reqid': row.id}
                                            });
                                            log.debug(logTitle, '>>> SEND EMAIL << :...URL: ' + stSendEmailURL);                            
                                            var emailResponse = https.post({url: stSendEmailURL,body: ''});
                                            log.debug(logTitle, '>>> SEND EMAIL << : Email Code = ' + emailResponse.code);
                                            log.debug(logTitle, '>>> SEND EMAIL << : Email Body = ' + emailResponse.body);
                                            
                                            if(emailResponse.code == '200')
                                            {
                                                bSuccessSendEmail = true;
                                                log.debug(logTitle, '>>> SEND EMAIL << : Call to Send Email Successful. Transaction Id = ' + row.id);
                                                break;
                                            }
                                            else
                                            {
                                                log.debug(logTitle, '>>> SEND EMAIL << : Call to Send Email Unsuccessful. Transaction Id = ' + row.id);
                                            }
                                        } 
                                        catch (err_sendemail) 
                                        {
                                            if (err_sendemail.message != undefined)
                                            {
                                                log.error(logTitle, '>>> SEND EMAIL << : Call to Send Email Unsuccessful. Transaction Id = ' + row.id + ', error: ' + err_sendemail.name + ' ' + err_sendemail.message);
                                            }
                                            else
                                            {
                                                log.error(logTitle, '>>> SEND EMAIL << : Call to Send Email Unsuccessful. Transaction Id = ' + row.id + ', error: ' + err_sendemail.toString());                                            
                                            }
                                        }                               
                                    }
                                    //regina - 11/13 - end
                                    
                                    return true;
                                });
                            }
                        }
                    }
                }
                
                if (newBatchStatus)
                {
                    log.debug(logTitle, '>>>> New Batch: ' + JSON.stringify([newBatchStatus, batch.id]) );
                    record.submitFields({
                        type : 'customrecord_sears_webrequest_batch',
                        id : batch.id,
                        values :
                        {
                            custrecord_batchwebreq_status : newBatchStatus
                        }
                    });
                }

                return true;
            });
            
            return true;
        }
        catch (e)
        {
            if (e.message != undefined)
            {
                log.error('ERROR' , e.name + ' ' + e.message);
                throw e.name + ' ' + e.message;
            }
            else
            {
                log.error('ERROR', 'Unexpected Error' , e.toString()); 
                throw error.create({
                    name: '99999',
                    message: e.toString()
                });
            }
            
        }
    };
    
    EndPoint.summarize = function(summary)
    {
        var currentScript = runtime.getCurrentScript();
        var logTitle = ['BatchRequestProcess::reduce', currentScript.deploymentId, runCount].join(':');
        
        try
        {
            var mapReduceData = {};
            mapReduceData.deployments = getActiveDeployments('customscript_sears_mr_batchreq_process');
            var isSuccess = false;
            
            mapReduceData.deployments.forEach(function (deployment) {
                if (!isSuccess)
                {
                    try 
                    {
                        var mapReduceObj = task.create({taskType : task.TaskType.MAP_REDUCE});
                        mapReduceObj.scriptId = 'customscript_sears_mr_batchreq_process';
                        mapReduceObj.params = {};
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
//                              log.audit(logTitle, '**ERROR**: ' + err.toString());
                    }
                }
                return isSuccess;
            });         
            
            
        }
        catch (e)
        {
            if (e.message != undefined)
            {
                log.error('ERROR' , e.name + ' ' + e.message);
                throw e.name + ' ' + e.message;
            }
            else
            {
                log.error('ERROR', 'Unexpected Error' , e.toString()); 
                throw error.create({
                    name: '99999',
                    message: e.toString()
                });
            }
            
        }

        log.debug('****  END OF SCRIPT ****');
    };
    
    function getActiveDeployments(script_id) {
        var arrDeployments = [];
        var arrSearch = nsutil.searchAll({
            recordType : 'scriptdeployment',
            columns : [ 'scriptid' ],
            filterExpression : [
                    [ 'script.scriptid', 'is', script_id ], 'AND',
                    [ 'isdeployed', 'is', true ], 'AND',
                    [ 'status', 'anyof', 'NOTSCHEDULED' ]
                ]
        });
        
        arrSearch.forEach(function(row) {
            arrDeployments.push({
                id: row.id,
                name: row.getValue({name : 'scriptid'})
            });
        });
        
        return arrDeployments;
    }
    
    
    function getNextBatches(numLines)
    {
        var maxLines = parseFloat(numLines || '200');
        
        var currentScript = runtime.getCurrentScript();
        var stParamSearch = currentScript.getParameter({name: 'custscript_pending_init_batch'});

        return nsutil.searchAll({'id': stParamSearch,maxResults:maxLines});
    }
    
    return EndPoint;
});