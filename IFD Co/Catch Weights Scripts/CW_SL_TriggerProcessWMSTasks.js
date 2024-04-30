/**
 * Copyright (c) 1998-2019 NetSuite, Inc.
 * 2955 Campus Drive, Suite 100, San Mateo, CA, USA 94403-2511
 * All Rights Reserved.
 *
 * This software is the confidential and proprietary information of
 * NetSuite, Inc. ("Confidential Information"). You shall not
 * disclose such Confidential Information and shall use it only in
 * accordance with the terms of the license agreement you entered into
 * with NetSuite.
 *
 * Module Description
 *
 * Version    Date            Author           Remarks
 * 1.00       10 May 2019     jostap           Trigger M/R Process WMS Tasks
 * 1.5        16 July 2019    jostap           Added error handling for task.submit
 * 1.6        17 July 2019    pries            Updated the try-catch and while loops for TI 229, added numRetryAttempts
 * 1.7        30 July 2019    pries            TI 250 - improved error reporting
 */

/**
 * @NApiVersion 2.x
 * @NScriptType Suitelet
 */

define(['N/task','N/runtime'],


    function(task, runtime){

        var logTitle = 'onRequest';

        function onRequest(context){

            var ifID = context.request.parameters.custparam_tranid;
            log.debug(logTitle,'ifID: '+ifID+' now is ' + new Date());

            if(!ifID){
                throw 'No Item Fulfillment Record passed in';
                return;
            }

            var wmsMRTask = task.create({
                taskType: task.TaskType.MAP_REDUCE,
                scriptId: 'customscript_cw_mr_processwmstasks',
                params:{
                    custscript_cw_if_id: ifID
                }
            });

            var secondsDelay = runtime.getCurrentScript().getParameter({name:'custscript_cw_mr_retry_delay'});
            var numRetryAttempts = runtime.getCurrentScript().getParameter({name:'custscript_cw_mr_retry_attempts'});
            log.debug(logTitle,'Delay if Failure: '+secondsDelay + ' -- numRetryAttempts: ' + numRetryAttempts);

            if(!secondsDelay){
                throw 'No retry delay value set';
                return;
            }

            if(!numRetryAttempts){
                throw 'No retry attempts value set';
                return;
            }

            var isSuccess = false;
            var tryCount = 0;

            while((tryCount < numRetryAttempts) && (!isSuccess)){

                var now = new Date();
                var then = new Date().setSeconds(now.getSeconds() + secondsDelay);

                if(tryCount === 0){
                    try{
                        var wmsTaskID = wmsMRTask.submit();
                        isSuccess = isTaskComplete(wmsTaskID);
                    }catch(e){
                        errorHandling(e, tryCount, numRetryAttempts, ifID);
                    }

                }else{
                  log.debug(logTitle, 'Retry #' + tryCount);
                  while(new Date() < then && tryCount > 0){
                      // do nothing;
                  }
                  try{
                    var wmsTaskID = wmsMRTask.submit();
                    isSuccess = isTaskComplete(wmsTaskID);
                  }catch(e){
                    errorHandling(e, tryCount, numRetryAttempts, ifID);
                  }
                }

                tryCount++;
            }
        }

        function errorHandling(e, tryCount, numRetryAttempts, ifID)
        {
            if ( tryCount < numRetryAttempts){
                var message = "IF ID " + ifID + "   Will retry - on Retry #" + tryCount;
            } else {
                var message = "IF ID " + ifID + "   Done trying after Retry #" + tryCount;
            }
            if(e.getDetails != undefined)
            {
                log.error(logTitle,'Processing error caught - ' + message + ': '+e.getCode()+' : '+e.getDetails());
            }
            else
            {
                log.error(logTitle,'Error caught - ' + message + ': ' +e.toString());
            }
        }


        function isTaskComplete(taskId){
            var currentStatus = task.checkStatus(taskId);

            return !(currentStatus.status === task.TaskStatus.FAILED);
        }

        return{
            onRequest:onRequest
        };

});