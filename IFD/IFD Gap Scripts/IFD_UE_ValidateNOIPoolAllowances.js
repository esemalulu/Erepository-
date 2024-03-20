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
* Script Description: User Event Script that computes/validates NOI Pool Allowances related to Sales Order line items
*
* Version   Date            Author                Remarks
* 1.0       19 Sep 2018     Daniel Lapp           Initial Version
* 1.1       03 Oct 2018     Daniel Lapp           Added code to set custcol_ifd_noi_pool_budget_exceeded back to False if Budget was not exceeded
* 1.2       09 Oct 2018     Daniel Lapp           Added Match condition to stop processing if Project Budget is not matched with Item Pool Allowance Record
*/

define(['N/runtime', './NSUtilvSS2', 'N/search'],

  function (runtime, NSUtil, search) {
    /**
     * Executed whenever a read operation occurs on a record, and prior to returning the record or page.
     *
     * @param {Object} context
     * @param {Record} context.newRecord - New record
     * @param {string} context.type - Trigger type
     * @param {Form} context.form - Current form
    */
    function beforeLoad(context) {

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
      var stLogTitle = 'beforeSubmit: ';
      var stContextType = context.type;
      var stExContext = runtime.executionContext;
      var boMatch = false;

      if ((stContextType === context.UserEventType.CREATE ||
        stContextType === context.UserEventType.EDIT) &&
        stExContext !== runtime.ContextType.WEBSERVICES &&
        stExContext !== runtime.ContextType.CSV_IMPORT &&
        stExContext !== runtime.ContextType.PORTLET &&
        stExContext !== runtime.ContextType.SUITELET &&
        stExContext !== runtime.ContextType.CUSTOM_MASSUPDATE &&
        stExContext !== runtime.ContextType.WORKFLOW &&
        stExContext !== runtime.ContextType.WEBAPPLICATION &&
        stExContext !== runtime.ContextType.WEBSTORE) {

        log.debug({
          title: stLogTitle,
          details: 'Context Type: ' + stContextType + ' | Execution Context: ' + stExContext
        });

        return;
      } else {
        try {
          var obRec = context.newRecord;
          var obParameters = {};
          obParameters.commodityTypeAll = runtime.getCurrentScript().getParameter({ name: 'custscript_commodity_type_all_ue' });
          var stEntityId = obRec.getValue({fieldId: 'entity'});
          var stCustChain = obRec.getValue({fieldId: 'custbody_ifd_noi_cust_chain'});

          // ---------- Search for NOI Pool Budgets: START ---------- //
          if (NSUtil.isEmpty(stCustChain)) {
            var obBudgetSearch = search.create({
              type: 'customrecord_noi_pool_budget',
              filters: [
                ['isinactive', 'is', false],
                'and',
                ['custrecord_noi_pool_bud_customer', 'anyof', stEntityId]
              ],
              columns: [
                'custrecord_pool_name',
                'custrecordpool_start_amount',
                'custrecord_pool3_start_amt',
                'custrecord_pool_used_amt'
              ]
            });
          } else {
            var obBudgetSearch = search.create({
              type: 'customrecord_noi_pool_budget',
              filters: [
                ['isinactive', 'is', false],
                'and',
                [
                  ['custrecord_noi_pool_bud_customer', 'anyof', stEntityId],
                  'or',
                  ['custrecord_pool_group_customer', 'anyof', stCustChain]
                ]
              ],
              columns: [
                'custrecord_pool_name',
                'custrecordpool_start_amount',
                'custrecord_pool3_start_amt',
                'custrecord_pool_used_amt'
              ]
            });
          }

          var obBudgetResultSet = obBudgetSearch.run();
          var arBudgetResults = [];
          var inSearchIndex = 0;
          var arResultSlice = null;

          do {
            arResultSlice = obBudgetResultSet.getRange({
              start: inSearchIndex,
              end: inSearchIndex + 1000
            });

            if (arResultSlice == null) {
              break;
            }

            arBudgetResults = arBudgetResults.concat(arResultSlice);
            inSearchIndex = arBudgetResults.length;
          }
          while (arResultSlice.length >= 1000);

          // ---------- Search for NOI Pool Budgets: FINISH ---------- //

          log.debug({
            title: stLogTitle + 'Pool Budget Result Count',
            details: arBudgetResults.length
          });

          // If no results, exit
          if (NSUtil.isEmpty(arBudgetResults)) {
            log.error({
              title: stLogTitle + 'Exiting Script',
              details: 'No Budget Records found, exiting script.'
            });
            return;
          }

          // If results exist, search for Item Pool Allowance Records
          else {
            // ---------- Search for NOI Item Pool Allowance Records: START ---------- //
            var obItemPoolBudgetSearch = search.create({
              type: 'customrecord_item_pool_budget',
              filters: [['isinactive', 'is', false]],
              columns: [
                'custrecord_item_pool_name',
                'custrecord_ifd_item_pool_alternatename',
                'custrecord_item_alternate_remain_amt',
                'custrecord_item_pool_item'
              ]
            });

            var obItemPoolResultSet = obItemPoolBudgetSearch.run();
            var arItemPoolBudgetResults = [];
            var inSearchIndex = 0;
            var arResultSlice = null;
            do {
              arResultSlice = obItemPoolResultSet.getRange({
                start: inSearchIndex,
                end: inSearchIndex + 1000
              });

              if (arResultSlice == null) {
                break;
              }

              arItemPoolBudgetResults = arItemPoolBudgetResults.concat(arResultSlice);
              inSearchIndex = arItemPoolBudgetResults.length;
            }
            while (arResultSlice.length >= 1000);

            // ---------- Search for NOI Item Pool Allowance Records: FINISH ---------- //

            log.debug({
              title: stLogTitle + 'Item Pool Allowance Search Result Count',
              details: arItemPoolBudgetResults.length
            });

            // If no results, exit
            if (NSUtil.isEmpty(arItemPoolBudgetResults)) {
              log.error({
                title: stLogTitle + 'Exiting Script',
                details: 'No Item Pool Budget Custom Records found, exiting script.'
              });
              return;
            }

            // If results exist, Iterate through line Items on the Sales Order
            else {
              var inItemLineCount = obRec.getLineCount({sublistId: 'item'});
              var arUsedBudgets = [];

              for (var itemIdx = 0; itemIdx < inItemLineCount; itemIdx++) {
                var stItemId = obRec.getSublistValue({
                  sublistId: 'item',
                  fieldId: 'item',
                  line: itemIdx
                });
                var inItemQty = parseInt(obRec.getSublistValue({
                  sublistId: 'item',
                  fieldId: 'quantity',
                  line: itemIdx
                }));

                if (NSUtil.isEmpty(stItemId)) {
                  continue;
                } else {
                  var stItemCommType = obRec.getSublistValue({
                    sublistId: 'item',
                    fieldId: 'custcol_ifd_noi_item_commodity_type',
                    line: itemIdx
                  });
                  // var boItemFeeForServ = obRec.getSublistValue({
                  //   sublistId: 'item',
                  //   fieldId: 'custcol_ifd_noi_item_fee_for_service',
                  //   line: itemIdx
                  // });

                  var boUpdatePoolBudget = true;
                  var inAllowanceAmt = 0;

                  // Iterate through Item Pool Allowance Records
                  for (var ipaIdx = 0; ipaIdx < arItemPoolBudgetResults.length; ipaIdx++) { // ipaIdx = Item Pool Allowance Index
                    if (boUpdatePoolBudget) {
                      var stIpaName = arItemPoolBudgetResults[ipaIdx].getValue({ name: 'custrecord_item_pool_name' });
                      var stIpaAltName = arItemPoolBudgetResults[ipaIdx].getValue({ name: 'custrecord_ifd_item_pool_alternatename' });
                      var stIpaItemId = arItemPoolBudgetResults[ipaIdx].getValue({name: 'custrecord_item_pool_item'});

                      if (stIpaItemId == stItemId) {
                        var inIpaAltRemAmt = arItemPoolBudgetResults[ipaIdx].getValue({ name: 'custrecord_item_alternate_remain_amt' });
                        if (!NSUtil.isEmpty(inIpaAltRemAmt)) {
                          inIpaAltRemAmt = parseFloat(inIpaAltRemAmt);
                        } else {
                          log.error({
                            title: stLogTitle + 'Exiting Script',
                            details: 'custrecord_item_alternate_remain_amt is empty for Item Pool Allowance ' + arItemPoolBudgetResults[ipaIdx].id
                          });
                          continue;
                        }

                        // Iterate through Pool Budget Records
                        for (var pbIdx = 0; pbIdx < arBudgetResults.length; pbIdx++) { // pbIdx = Pool Budget Index

                          var stPbName = arBudgetResults[pbIdx].getValue({ name: 'custrecord_pool_name' });
                          var stPbId = arBudgetResults[pbIdx].id;

                          var inPbStartAmt = arBudgetResults[pbIdx].getValue({ name: 'custrecordpool_start_amount' });
                          if (!NSUtil.isEmpty(inPbStartAmt)) {
                            inPbStartAmt = parseFloat(inPbStartAmt);
                          } else {
                            log.error({
                              title: stLogTitle + 'Exiting Script',
                              details: 'custrecordpool_start_amount is empty for Pool Budget ' + arBudgetResults[pbIdx].id
                            });
                            continue;
                          }

                          var inPbRemAmt = arBudgetResults[pbIdx].getValue({ name: 'custrecord_pool3_start_amt' });
                          if (!NSUtil.isEmpty(inPbRemAmt)) {
                            inPbRemAmt = parseFloat(inPbRemAmt);
                          } else {
                            log.error({
                              title: stLogTitle + 'Exiting Script',
                              details: 'custrecord_pool3_start_amt is empty for Pool Budget ' + arBudgetResults[pbIdx].id
                            });
                            continue;
                          }

                          var inPbUsedAmt = arBudgetResults[pbIdx].getValue({ name: 'custrecord_pool_used_amt' });
                          if (!NSUtil.isEmpty(inPbUsedAmt)) {
                            inPbUsedAmt = parseFloat(inPbUsedAmt);
                          }

                          // If Item Pool Allowance's Pool Name = Pool Budget's Pool Name...
                          if (stIpaName == stPbName) {
                            log.debug({
                              title: stLogTitle + 'Test Case 1',
                              details: 'Item Pool Allowance Name "' + stIpaName + '" = Pool Budget\'s name.'
                            });
                            boMatch = true;

                            // Check PB ID in Array
                            for (var baIdx = 0; baIdx < arUsedBudgets.length; baIdx++) {
                              var inBudgetAmt = arUsedBudgets[baIdx].amt;
                              var stBudgetId = arUsedBudgets[baIdx].id;

                              if (stBudgetId == stPbId) {
                                inPbRemAmt = inBudgetAmt;
                              }
                            }

                            // Multiple Item Pool Allowance's Amount by Sales Order Item Quantity
                            var inCalculatedAmt = inIpaAltRemAmt * inItemQty;
                            inCalculatedAmt = parseFloat(inCalculatedAmt.toFixed(2));

                            log.debug({
                              title: stLogTitle + 'Calculated Amount',
                              details: inCalculatedAmt
                            });
                            log.debug({
                              title: stLogTitle + 'Pool Budget Remaining Amount',
                              details: inPbRemAmt
                            });

                            // If calculated Allowance Amount is <= the Pool Budget's Pool Remaining Amount...
                            if (inCalculatedAmt <= inPbRemAmt) {
                              // Add Calculated Amount Allowance Amount
                              inAllowanceAmt += inCalculatedAmt;

                              var boPbMatch = false;
                              // Check PB ID in Array, if it exists then update amount
                              for (var baIdx = 0; baIdx < arUsedBudgets.length; baIdx++) {
                                var inBudgetAmt = arUsedBudgets[baIdx].amt;
                                var stBudgetId = arUsedBudgets[baIdx].id;

                                if (stBudgetId == stPbId) {
                                  boPbMatch = true;
                                  arUsedBudgets[baIdx].amt = inPbRemAmt - inCalculatedAmt
                                }
                              }

                              // If PB does not exist in array then add it
                              if (!boPbMatch) {
                                var obUsedBudgetData = {};
                                obUsedBudgetData.id = stPbId;
                                obUsedBudgetData.amt = inPbRemAmt - inCalculatedAmt;
                                arUsedBudgets.push(obUsedBudgetData);
                              }
                            }

                            // Else If calculated Allowance Amount is < the Pool Budget's Pool Remaining Amount and the Item's Commodity Type = All...
                            else if ((inCalculatedAmt < inPbRemAmt) && stItemCommType == obParameters.commodityTypeAll) {
                              boUpdatePoolBudget = false;
                              continue;
                            }
                          }

                          // Else If Item Pool Allowance's Alternate Name = Pool Budget's Pool Name...
                          else if (stIpaAltName == stPbName) {
                            log.debug({
                              title: stLogTitle + 'Test Case 2',
                              details: 'Item Pool Allowance Alternate Name' + stIpaName + '" = Pool Budget\'s name.'
                            });
                            boMatch = true;

                            // Check PB ID in Array
                            for (var baIdx = 0; baIdx < arUsedBudgets.length; baIdx++) {
                              var inBudgetAmt = arUsedBudgets[baIdx].amt;
                              var stBudgetId = arUsedBudgets[baIdx].id;

                              if (stBudgetId == stPbId) {
                                inPbRemAmt = inBudgetAmt;
                              }
                            }

                            // Multiple Item Pool Allowance's Amount by Sales Order Item Quantity
                            var inCalculatedAmt = inIpaAltRemAmt * inItemQty;
                            inCalculatedAmt = parseFloat(inCalculatedAmt.toFixed(2));

                            log.debug({
                              title: stLogTitle + 'Calculated Amount',
                              details: inCalculatedAmt
                            });
                            log.debug({
                              title: stLogTitle + 'Pool Budget Remaining Amount',
                              details: inPbRemAmt
                            });

                            // If calculated Allowance Amount is <= the Pool Budget's Pool Remaining Amount...
                            if (inCalculatedAmt <= inPbRemAmt) {
                              // Add Calculated Amount Allowance Amount
                              inAllowanceAmt = inCalculatedAmt;

                              var boPbMatch = false;
                              // Check PB ID in Array, if it exists then update amount
                              for (var baIdx = 0; baIdx < arUsedBudgets.length; baIdx++) {
                                var inBudgetAmt = arUsedBudgets[baIdx].amt;
                                var stBudgetId = arUsedBudgets[baIdx].id;

                                if (stBudgetId == stPbId) {
                                  arUsedBudgets[baIdx].amt = inPbRemAmt - inCalculatedAmt
                                }
                              }

                              // If PB does not exist in array then add it
                              if (!boPbMatch) {
                                var obUsedBudgetData = {};
                                obUsedBudgetData.id = stPbId;
                                obUsedBudgetData.amt = inPbRemAmt - inCalculatedAmt;
                                arUsedBudgets.push(obUsedBudgetData);
                              }

                              boUpdatePoolBudget = false;
                              break;
                            }
                          }
                        }
                      }
                    }
                  }
                  log.debug({
                    title: stLogTitle + 'Allowance Amount',
                    details: inAllowanceAmt
                  });

                  if (boMatch) {
                    if (inAllowanceAmt <= 0) {
                      obRec.setSublistValue({
                        sublistId: 'item',
                        fieldId: 'custcol_ifd_noi_pool_budget_exceeded',
                        line: itemIdx,
                        value: true
                      });
                    } else { // v1.1
                      obRec.setSublistValue({
                        sublistId: 'item',
                        fieldId: 'custcol_ifd_noi_pool_budget_exceeded',
                        line: itemIdx,
                        value: false
                      });
                    }
                  } else {
                    log.debug({
                      title: stLogTitle,
                      details: 'No Pool Budget Record was matched with an Item Pool Allowance Record'
                    });
                  }
                }
              }
              log.debug({
                title: stLogTitle + 'Pool Budget Array',
                details: arUsedBudgets
              });
            }
          }
        } catch (error) {
          log.error({
            title: stLogTitle,
            details: error.toString()
          });
        }
      }
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

    }

    return {
      // beforeLoad: beforeLoad,
      beforeSubmit: beforeSubmit,
      // afterSubmit: afterSubmit
    };
  }
);