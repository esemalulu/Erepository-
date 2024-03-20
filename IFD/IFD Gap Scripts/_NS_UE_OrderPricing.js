/**
 * Copyright (c) 1998-2018 NetSuite, Inc.
 * 2955 Campus Drive, Suite 100, San Mateo, CA, USA 94403-2511
 * All Rights Reserved
 *
 * This software is the confidential and proprietary information of NetSuite, Inc.  ("Confidential Information").
 * You shall not disclose such Confidential Information and shall use it only in accordance with the terms of the license
 * you entered into with NetSuite
 */

/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope Public
 *
 * Script Description
 * Calculate Order Prices on Sales Orders not created through UI
 *
 * Version Date     Author      Remarks
 * 1.0 8/14/2018    JMO         Initial Version
 * 1.5 8/21/2018    JMO         Add Ship Date and M/R validation
 * 1.6 02/20/2019   pries       Added two more so line fields to set, TI 170
 * 1.7 05/08/2019   mgotsch     Adding try/catch to the MR task submission so
 * 1.8 05/09/2019   mgotsch     Adding User event to context TI192
 * 1.9 05/24/2019   pries       Removed Number from parseFDloat calls - TI 204
 * 2.0 06/18/2019   dlapp       Added Rebate Amt and Admin Fee restrictions when setting the values - TI 170
 * 2.1 06/25/2019   pries       Corrected RebateAmount calculation to be RebateAmt - TotalAdmin - TI 170
 * 2.2 06/28/2019   pries       Correction for TI 170 - exec context and fix for last change's variables 
 * 3.0 06/29/2019   pries       Moving the Map/Reduce task call to aftersubmit, since then we have the record ID
 * 3.1 07/12/2019   pries       TI 170 - fix for Rebate Amount when less than Admin Fees
 * 3.2 07/22/2019   jostap      Script should process SO with any ship date
 * 3.3 07/29/2019   jostap      Don't show negative applied rebates or admin fees
 * 3.4 08/06/2019   jostap      Made MR error handling more robust with script parameters
 * 3.5 08/13/2019   jostap      Off by 1 Javascript fix
 * 3.6 10/21/2019   pries       TI 277 - ignore BFC changes on edits
 * 3.7 01/09/2020   pries       TI 274 - fixed for missing Applied Rebate and Total Admin values
 * 3.8 01/10/2020   pries       TI 274 - only set 2 fields if there is a rebate agreement
 * 3.9 03/30/2020   pries       TI 273 - improving BBFC validation by allowing skip when either Route OR Stop was changed
 */

define(['./_NS_LIB_IFDPricing', 'N/runtime', './NSUtilvSS2', 'N/format', 'N/task'],

  function (libPrices, runtime, NSUtil, format, task) {

    // v3.0 - added
    function afterSubmit(context) {
      var logTitle = 'afterSubmit';
      try {
        if (!validContext(context)) {
          return;
        }
        
        var objRecord = context.newRecord;
        
        if (processShipDate(objRecord) === false) {
          log.audit(logTitle, 'Ship Date is blank.  Exiting Script');
          return;
        }

        if (!processOrderStatus(objRecord)) {
          return;
        }

        // 3.6 - added:
        if (wasUpdatedByBFC(context, objRecord)) {
            log.audit(logTitle, "Was updated by BFC. Ignoring these changes.");
            return;
        }
        
        var intLineCount = objRecord.getLineCount({
          sublistId: 'item'
        });
        var intMrThreshold = runtime.getCurrentScript().getParameter('custscript_ns_ue_threshold');
        if (intLineCount >= intMrThreshold) {
          log.debug(logTitle, 'Line Count exceeds Threshold');
          var intMrScript = runtime.getCurrentScript().getParameter('custscript_ns_ue_mrscript');
          var intId = objRecord.id;
          log.debug(logTitle + ' intId', intId);
          var objMrTask = task.create({
            taskType: task.TaskType.MAP_REDUCE,
            scriptId: intMrScript,
            params: { custscript_ns_mr_sofromue: intId }
          });

          //v3.4 start
          var secondsDelay = runtime.getCurrentScript().getParameter({name:'custscript_ns_ue_delay'});
          secondsDelay = (secondsDelay) ? secondsDelay : 10;
          var numRetryAttempts = runtime.getCurrentScript().getParameter({name:'custscript_ns_ue_numretries'});
          numRetryAttempts = (numRetryAttempts) ? numRetryAttempts : 10;
          log.debug(logTitle,'Delay if Failure: '+secondsDelay + ' -- numRetryAttempts: ' + numRetryAttempts);

          var isSuccess = false;
          var tryCount = 0;

          while((tryCount <= numRetryAttempts) && (!isSuccess)){

              try{
                var priceScript = objMrTask.submit();
                isSuccess = isTaskComplete(priceScript);
              }catch(e){
                if(tryCount === numRetryAttempts){

                  errorHandling(e, tryCount, numRetryAttempts, intId, logTitle);

                }

              }

              log.debug(logTitle,'tryCount: '+tryCount+' isSuccess:'+isSuccess);

              tryCount++;

          }
          //v3.4 end
        } else {
          log.debug(logTitle, 'Lines fewer than threshold. Exiting.');
          return;
        }
      } catch (e) {
        log.error('AfterSubmit Error', e);
      }
    }

    function errorHandling(e, tryCount, numRetryAttempts, soID, logTitle)
    {
      if ( tryCount < numRetryAttempts){
        var message = "SO ID " + soID + "   Will retry - on Retry #" + tryCount;
      } else {
        var message = "SO ID " + soID + "   Done trying after Retry #" + tryCount;
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

    function beforeSubmit(context) {
      var logTitle = 'beforeSubmit';
      try {
        if (!validContext(context)) {
          return;
        }

        var objRecord = context.newRecord;

        var shipdate = processShipDate(objRecord);
        if (shipdate === false) {
          log.audit(logTitle, 'Ship Date is blank.  Exiting Script');
          return;
        }
        
        if (!processOrderStatus(objRecord)) {
          return;
        }

        // v3 - logic moved to aftersubmit
        var intLineCount = objRecord.getLineCount({
          sublistId: 'item'
        });
        var intMrThreshold = runtime.getCurrentScript().getParameter('custscript_ns_ue_threshold');
        if (intLineCount >= intMrThreshold) {
          log.debug(logTitle, 'Line Count exceeds threshold - handle in AfterSubmit.');
          return;
        }

        // 3.6 - added:
        if (wasUpdatedByBFC(context, objRecord)) {
          log.audit(logTitle, "Was updated by BFC. Ignoring these changes.");
          return;
        } 

        //Loop through lines and update prices
        for (var i = 0; i < intLineCount; i++) {
          var inRebateAmt = 0; // v2.0 Add      v2.2 - moved here
          var inTotalAdmin = 0; // v2.0 Add

          var blPriceOverride = objRecord.getSublistValue({
            sublistId: 'item',
            fieldId: 'custcol_ifd_price_override',
            line: i
          });
          log.debug(logTitle + ' blPriceOverride', blPriceOverride);
          if (blPriceOverride == false) {
            var intCustomerId = objRecord.getValue('entity');
            var intItemId = objRecord.getSublistValue({
              sublistId: 'item',
              fieldId: 'item',
              line: i
            });

            var objGetOrderLinePrice = libPrices.getOrderLinePrice(intCustomerId, intItemId, shipdate);
            if (!NSUtil.isEmpty(objGetOrderLinePrice.error) && objGetOrderLinePrice.error !== 'No custom price could be found for this item') {
              log.error(logTitle + ' objGetOrderLinePrice Error: ', objGetOrderLinePrice);
            }
            else {
              log.debug(logTitle + ' objGetOrderLinePrice', objGetOrderLinePrice);
              try {
                objRecord.setSublistValue({
                  sublistId: 'item',
                  fieldId: 'rate',
                  value: objGetOrderLinePrice.sellprice,
                  line: i
                });
                if (!NSUtil.isEmpty(objGetOrderLinePrice.contract)) {
                  objRecord.setSublistValue({
                    sublistId: 'item',
                    fieldId: 'custcol_ifd_contract_name',
                    value: objGetOrderLinePrice.contract,
                    line: i
                  });
                }
                if (!NSUtil.isEmpty(objGetOrderLinePrice.rebateagreement)) {
                  var stRebateInfo = 'Rebate Agreement: ' + objGetOrderLinePrice.rebateagreement;
                  objRecord.setSublistValue({
                    sublistId: 'item',
                    fieldId: 'custcol_ifd_rebate_agreement',
                    value: stRebateInfo,
                    line: i
                  });
                
                  // v1.6 - added:
                  if (!NSUtil.isEmpty(objGetOrderLinePrice.appliedrebateamount) && !isNaN(objGetOrderLinePrice.appliedrebateamount)) // v2.0 Updated rebateamount to appliedrebateamount
                  {
                    inRebateAmt = parseFloat(objGetOrderLinePrice.appliedrebateamount).toFixed(2); // v2.0 Updated rebateamount to appliedrebateamount and set variable inRebateAmount
                  }

                  var newRebateAmount = 0.00;                     // v3.1 added

                  if (!NSUtil.isEmpty(objGetOrderLinePrice.totaladmin) && !isNaN(objGetOrderLinePrice.totaladmin)) {
                    inTotalAdmin = objGetOrderLinePrice.totaladmin; // v2.0 Set new variable inTotalAdmin //v2.1

                    if (inRebateAmt < inTotalAdmin) {
                      inTotalAdmin = inRebateAmt;
                      // newRebateAmount stays zero in this case
                    } else {
                      newRebateAmount = (inRebateAmt - inTotalAdmin).toFixed(2);   // v3.1 added
                    }
                  }

                  // v2.1 - new if:   // v3.7 - updated:
                  if (!NSUtil.isEmpty(newRebateAmount) && !NSUtil.isEmpty(inTotalAdmin)) {

                    newRebateAmount = (newRebateAmount < 0) ? 0 : newRebateAmount;
                    // v1.9 - updated:
                    objRecord.setSublistValue({
                      sublistId: 'item',
                      fieldId: 'custcol_ifd_applied_rebate_amt',
                      value: newRebateAmount,   // v3.1 updated
                      line: i
                    });

                    inTotalAdmin = (inTotalAdmin < 0) ? 0 : inTotalAdmin;

                    // v1.9 - updated:
                    objRecord.setSublistValue({
                      sublistId: 'item',
                      fieldId: 'custcol_ifd_total_admin_fees',
                      value: inTotalAdmin, // v2.0 Replaced with newly defined inTotalAdmin variable
                      line: i
                    });
                  }
                  // v1.6 - end
                }   // v3.8 - moved block end here
              }
              catch (e) {
                log.error(logTitle + ' Error Saving Line:', e);
              }
            }
          }
          else {
            log.audit(logTitle + ' Line ' + i, 'Price Override is True. Skip to next line');
          }
        }
      } catch (e) { //1.7
        log.error(logTitle + 'BeforeSubmit Error', e);
      }
    }

    function _sleep(secondsDelay) {
      log.debug('setTimeout', 'entering... ' + new Date());
      var now = new Date(),
        then = new Date().setSeconds(now.getSeconds() + secondsDelay);

      while (new Date() < then) {
        //nothing
      };
      log.debug('setTimeout', 'exiting... ' + new Date());
    }

    function validContext(context) {
      var logTitle = 'validContext';
      log.audit(logTitle + ' - exec context', runtime.executionContext);
      if (runtime.executionContext === runtime.ContextType.USER_INTERFACE || runtime.executionContext === runtime.ContextType.MAP_REDUCE || runtime.executionContext === runtime.ContextType.USEREVENT) //v1.8 added User Event context
      {
        log.audit(logTitle, 'Context is User Interface');
        return false;
      }

      if (context.type === context.UserEventType.DELETE) {
        log.audit(logTitle, 'Sales Order is being deleted');
        return false;
      }
      return true;
    }

    function processShipDate(objRecord) {
      var logTitle = 'processShipDate';
      var shipDate = objRecord.getValue('shipdate');
      if (!shipDate) {
        return false;
      }
      var objParsedDate = format.parse({
        value: shipDate,
        type: format.Type.DATE
      });
      var objCurrentDate = new Date();
      var intTimeBetween = NSUtil.getTimeBetween(objCurrentDate, objParsedDate, 'D');
      log.debug(logTitle, 'intTimeBetween ' + intTimeBetween);

      return shipDate;

    }

    function processOrderStatus(objRecord) {
      var logTitle = 'processOrderStatus';
      var stValidStatuses = runtime.getCurrentScript().getParameter('custscript_ns_ue_validstatuses');
      var arrValidStatuses = stValidStatuses.split(',');
      var stOrderStatus = objRecord.getValue({
        fieldId: 'orderstatus'
      });
      log.debug(logTitle, 'stOrderStatus ' + stOrderStatus);
      if (!NSUtil.inArray(stOrderStatus, arrValidStatuses)) {
        log.audit(logTitle, 'Order Status is Not Valid');
        return false;
      } else {
        return true;
      }
    }

    // 3.6 - added:
    function wasUpdatedByBFC(context, objRecord) {
      var result = false; 
      try { 
        if (context.type === context.UserEventType.EDIT) {
          // read the Old Record
          var oldRecord = context.oldRecord;
          var oldRoute = oldRecord.getValue({fieldId: 'custbody_ifd_so_route_number'});
          var oldStop = oldRecord.getValue({fieldId: 'custbody_ifd_stop'});
          var oldBFCRead = oldRecord.getValue({fieldId: 'custbody_ifd_bfc_read'});

          // read the New Record
          var newRoute = objRecord.getValue({fieldId: 'custbody_ifd_so_route_number'});
          var newStop = objRecord.getValue({fieldId: 'custbody_ifd_stop'});
          var newBFCRead = objRecord.getValue({fieldId: 'custbody_ifd_bfc_read'});

          //v3.9 updated - was &&
          if ((oldRoute !== newRoute) || (oldStop !== newStop)) {
              result = true;
          }

          if (oldBFCRead !== newBFCRead) {
              result = true;
          }
        }
      } catch(err) {
        log.error({
          title: 'Error in wasUpdatedsByBFC',
          details: err.details
        });
      }
      return result; 
    }

    return {
      afterSubmit: afterSubmit,
      beforeSubmit: beforeSubmit,
    };

  });
