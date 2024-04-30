/**
* Copyright (c) 1998-2018 NetSuite, Inc.
* 2955 Campus Drive, Suite 100, San Mateo, CA, USA 94403-2511
* All Rights Reserved
*
* This software is the confidential and proprietary information of NetSuite, Inc. ("Confidential Information").
* You shall not disclose such Confidential Information and shall use it only in accordance with the terms of the license
* you entered into with NetSuite
*
* @NApiVersion 2.x
* @NScriptType Suitelet
* @NModuleScope public
* @author Daniel Lapp dlapp@netsuite.com
*
* Description: Backend Suitelet Script that runs after the "NS | SC Matrix Pricing" Script is finished.
* It creates a Task to execute the "NS | MR | Ship Tomorrow Pricing" Script
*
* Version       Date             Author      Remarks
* 1.0           20 Nov 2018      dlapp       Initial
*
*/
define(['N/runtime', 'N/task', './NSUtilvSS2', 'N/search'],

  function(runtime, task, NSUtil, search) {

    /**
    * Definition of the Suitelet script trigger point.
    *
    * @param {Object} context
    * @param {ServerRequest} context.request - Encapsulation of the incoming request
    * @param {ServerResponse} context.response - Encapsulation of the Suitelet response
    */
    function onRequest(context) {
      try {
        var boCallNextScript = runtime.getCurrentScript().getParameter({name: 'custscript_tst_call_next_script'});
        var stNextScriptID = runtime.getCurrentScript().getParameter({name: 'custscript_tst_next_script_id'});
        var stNextScriptDeploymentID = runtime.getCurrentScript().getParameter({name: 'custscript_tst_next_script_deployment_id'});

        log.debug({
          title: 'Parameters',
          details: {
            boCallNextScript: boCallNextScript,
            stNextScriptID: stNextScriptID,
            stNextScriptDeploymentID: stNextScriptDeploymentID
          }
        });

        if (!boCallNextScript || boCallNextScript == 'F') {
          return;
        } else {
          var boIsOtherScriptRunning = isOtherScriptRunning(stNextScriptDeploymentID);

          if (!boIsOtherScriptRunning) {
            var obMRTask = task.create({
              taskType: task.TaskType.MAP_REDUCE,
              scriptId: stNextScriptID
            });

            log.debug({
              title: 'MR Task',
              details: JSON.stringify(obMRTask)
            });

            var stMRTaskID = obMRTask.submit();
            var stStatus = task.checkStatus(stMRTaskID).status;

            log.audit({
              title: 'Execute Map/Reduce Script',
              details: 'Script:' + stNextScriptID + ' | Deployment: ' + stNextScriptDeploymentID + ' | Status: ' + stStatus
            });

            if (stStatus == 'PENDING') {
              log.audit({
                title: 'Script Status',
                details: 'Queued ' + stNextScriptDeploymentID
              });
            } else {
              log.error({
                title: 'Script Status',
                details: 'Error scheduling script id:' + stNextScriptID + ' deployment id:' + stNextScriptDeploymentID + ' into queue.'
              });
            }
          }
        }
      } catch (error) {
        log.error({
          title: 'ERROR',
          details: error.toString()
        });
      }
    }

    function isOtherScriptRunning(stScriptDeploymentID) {
      var arFilters = [];
      arFilters.push(search.createFilter({
        name: 'status',
        operator: search.Operator.ANYOF,
        values: 'PROCESSING'
      }));
      arFilters.push(search.createFilter({
        name: 'scriptid',
        join: 'scriptdeployment',
        operator: search.Operator.IS,
        values: stScriptDeploymentID
      }));

      var obSearchResults = search.create({
        type: search.Type.SCHEDULED_SCRIPT_INSTANCE,
        filters: arFilters,
        columns: 'status'
      }).run();

      var arSearchResults = obSearchResults.getRange({
        start: 0,
        end: 1
      });

      log.debug({
        title: 'isOtherScriptRunning: Search Results',
        details: arSearchResults
      });

      if (NSUtil.isEmpty(arSearchResults)) {
        return false;
      } else {
        return true;
      }
    }

    return {
      onRequest: onRequest
    };
  }
);