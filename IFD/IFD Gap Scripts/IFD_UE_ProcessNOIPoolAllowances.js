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
* @NScriptType UserEventScript
* @NModuleScope public
* @author Daniel Lapp dlapp@netsuite.com
*
* Script Description: User Event Script that triggers on afterSubmit. This script will execute the NS | SS | NOI Pool Allowances Adhoc Script.
* A script parameter will store the value of the specific Scheduled Script that it will execute.
*
* Version    Date            Author                Remarks
* 1.00       02 Oct 2018     Daniel Lapp           Initial Version
* 1.01       10 Oct 2018     Daniel Lapp           Added Record ID Parameter for Scheduled Task
* 1.02       18 Oct 2018     Daniel Lapp           Added Context Type to Parameters
* 1.03		   02 Feb 2019	   Albert Lee			       TI #175/B-63586: Scheduled Script is now not submitted for the edit context
* 1.04       15 Mar 2019     P Ries                TI #58 - script should process on create from bulk "Invoice Orders" screen
* 1.05       22 May 2019     P Ries                TI #207 - fix how Task.create is called - remove Deployment ID
* 1.06       31 Jul 2019     Daniel Lapp           TI #230 - Restructure and add to submitScheduledTask function, create timingResubmit function
* 1.07       06 Aug 2019     Daniel Lapp           TI #230 - Removed unused variable and used global variable in sleep function call
* 1.08       13 Aug 2019     P Ries                TI 230 - increased inMaxRetries 
*/

define(['N/runtime', 'N/task'],

  function(runtime, task) {
        var inMaxRetries = 25,
        inSecondsDelay = 10000; // milliseconds, v1.06: Add

    /**
     * Executed whenever a read operation occurs on a record, and prior to returning the record or page.
     *
     * @param {Object} context
     * @param {Record} context.newRecord - New record
     * @param {string} context.type - Trigger type
     * @param {Form} context.form - Current form
    */
    function beforeLoad(context) {
      // Function not used
    }

    /**
     * Executed prior to any write operation on the record.
     *
     * @param {Object} context
     * @param {Record} context.newRecord - New record
     * @param {Record} context.oldRecord - Old record
     * @param {string} context.type - Trigger type
     */
    function beforeSubmit(context) {
      // Function not used
    }

    /**
     * Executed immediately after a write operation on a record
     *
     * @param {Object} context
     * @param {Record} context.newRecord - New record
     * @param {Record} context.oldRecord - Old record
     * @param {string} context.type - Trigger type
    */
    function afterSubmit(context) {
      var stLogTitle = 'afterSubmit: ',
          stContextType = context.type,
          stExecContext = runtime.executionContext,
          obNewRec = context.newRecord,
          obParams = {}, // v1.01
          stNoiSchedScriptId;

      obParams.custscript_ifd_invoice_id = obNewRec.id // v1.01
      obParams.custscript_ifd_context_type = stContextType; // v1.02

      log.debug({
        title: stLogTitle,
        details: 'START'
      });

      log.debug({
        title: stLogTitle + 'Context/Runtime Details',
        details: {
          stContextType: stContextType,
          stExecContext: stExecContext,
          stNoiSchedScriptId: stNoiSchedScriptId,
          obParams: obParams // v1.01
        }
      });

      // v1.04 - If Context Type is not Create or Edit, or Execution Context is Scheduled, exit Script
      if ((stExecContext === runtime.ContextType.SCHEDULED) ||
        (stContextType !== context.UserEventType.CREATE)) { //v1.03 Got rid of '&& stContextType !== context.UserEventType.EDIT'
        log.debug({
          title: stLogTitle + 'Exit Script',
          details: 'Context Type is either Scheduled or User Event, or Execution Context is not Create. Execution Context: ' + stContextType
        });
        log.debug({
          title: stLogTitle,
          details: 'FINISH'
        });
        return;
      } else {
        try {
          // Get Scheduled Script Parameter and create task to execute the script
          stNoiSchedScriptId = runtime.getCurrentScript().getParameter({name: 'custscript_ifd_noi_sched_script'});

          submitScheduledTask(stNoiSchedScriptId, obParams); // v1.01

        } catch (error) {
          // If the Scheduled Task fails, wait 5 seconds and try one more time
          // window.setTimeout(function() {
          //   submitScheduledTask(stNoiSchedScriptId)
          // }, 5000);
          log.error({
            title: stLogTitle + 'ERROR',
            details: error.toString()
          });
        } finally {
          log.debug({
            title: stLogTitle,
            details: 'FINISH'
          });
        }
      }
    }

    function submitScheduledTask(stNoiSchedScriptId, obParams) { // v1.01 & v1.06: Update: Restructuring
      var stLogTitle = 'submitScheduledTask: ';

      for (var i = 1; i <= inMaxRetries; i++) {
        try {
          log.debug({
            title: stLogTitle + 'Retry Number',
            details: i
          });

          if (i === inMaxRetries) {
            // Maximum number of retries reached, exit script
            log.error({
              title: stLogTitle + 'Maximum Number of Retries reached, Exiting Script.',
              details: 'Maximum Retries: ' + inMaxRetries
            });
            return;
          } else {
            // v1.05 - removed Deployment ID
            var obScTask = task.create({
              taskType: task.TaskType.SCHEDULED_SCRIPT,
              scriptId: stNoiSchedScriptId,
              params: obParams // v1.01
            });

            var stScTaskId = obScTask.submit();
            var obScTaskStatus = task.checkStatus({ taskId: stScTaskId });

            log.audit({
              title: stLogTitle + 'Task Information',
              details: 'Status: ' + obScTaskStatus.status + ' | Deployment ID: ' + obScTaskStatus.deploymentId
            });

            // If Status is not 'FAILED' then log and continue processing
            if (obScTaskStatus.status == task.TaskStatus.FAILED) {
              sleep(inSecondsDelay);
            } else {return;}
          }
        } catch (error) {
          // log.error({
          //   title: 'Catch Block',
          //   details: error.toString()
          // });

          if (i === inMaxRetries-1) {
            // If the last retry fails, log error and exit script
            log.error({
              title: stLogTitle + 'Maximum Number of Retries reached, Script exited.',
              details: 'Maximum Retries: ' + inMaxRetries + ' | ' + error.toString()
            });
            return;
          } else {
            sleep(inSecondsDelay);
          }
        }
      }
    }

    function sleep(inMS) {
      log.debug({
        title: 'Sleeping',
        details: inMS / 1000 + ' seconds'
      });

      // Get current date
      var obDate = new Date();
      // Add the ms argument to the current date
      var obNewDate = obDate.getTime() + inMS;
      // Compare current date with added ms to a new current date
      while (obNewDate > new Date()) {}
    }

    return {
      // beforeLoad: beforeLoad,
      // beforeSubmit: beforeSubmit,
      afterSubmit: afterSubmit
    };
  }
);