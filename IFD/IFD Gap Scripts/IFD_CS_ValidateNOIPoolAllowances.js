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
* @NScriptType ClientScript
* @NModuleScope public
* @author Daniel Lapp dlapp@netsuite.com
*
* Script Description: Client Script that computes/validates NOI Pool Allowances related to each Sales Order line item that is added.
*
* Version       Date             Author      Remarks
* 1.0           11 Sep 2018      dlapp       Initial
* 1.1           03 Oct 2018      dlapp       Added code to set custcol_ifd_noi_pool_budget_exceeded back to False if Budget was not exceeded
* 1.2           11 Oct 2018      dlapp       Removed Fee for Service condition
*/
define(['./NSUtilvSS2', 'N/runtime', 'N/search'],

  function (NSUtil, runtime, search) {

    /**
    * Executed when the page completes loading or when the form is reset.
    *
    * @param {Object} context
    * @param {Record} context.currentRecord - Current form record
    * @param {string} context.mode - The mode in which the record is being accessed (create, copy, or edit)
    */
    function pageInit(context) {
      return true;
    }

    /**
    * Executed when a field is changed by a user or client side call.
    *
    * @param {Object} context
    * @param {Record} context.currentRecord - Current form record
    * @param {string} context.sublistId - Sublist name
    * @param {string} context.fieldId - Field name
    * @param {number} context.lineNum - Line number. Will be undefined if not a sublist or matrix field
    * @param {number} context.columnNum - Line number. Will be undefined if not a matrix field
    */
    function fieldChanged(context) {
      return true;
    }

    /**
    * Executed on transaction forms when a field that sources information from another field is modified.
    *
    * @param {Object} context
    * @param {Record} context.currentRecord - Current form record
    * @param {string} context.sublistId - Sublist name
    * @param {string} context.fieldId - Field name
    */
    function postSourcing(context) {
      return true;
    }

    /**
    * Executed after a sublist has been inserted, removed, or edited.
    *
    * @param {Object} context
    * @param {Record} context.currentRecord - Current form record
    * @param {string} context.sublistId - Sublist name
    */
    function sublistChanged(context) {
      return true;
    }

    /**
    * Executed when an existing line is selected.
    *
    * @param {Object} context
    * @param {Record} context.currentRecord - Current form record
    * @param {string} context.sublistId - Sublist name
    */
    function lineInit(context) {
      return true;
    }

    /**
    * Executes when a field is about to be changed by a user or client side call.
    *
    * @param {Object} context
    * @param {Record} context.currentRecord - Current form record
    * @param {string} context.sublistId - Sublist name
    * @param {string} context.fieldId - Field name
    * @param {number} context.lineNum - Line number. Will be undefined if not a sublist or matrix field
    * @param {number} context.columnNum - Line number. Will be undefined if not a matrix field
    *
    * @returns {boolean} Return true if field is valid
    */
    function validateField(context) {
      return true;
    }

    /**
    * Executed before a line is added to an inline editor sublist or editor sublist.
    *
    * @param {Object} context
    * @param {Record} context.currentRecord - Current form record
    * @param {string} context.sublistId - Sublist name
    *
    * @returns {boolean} Return true if sublist line is valid
    */
    function validateLine(context) {
      var obCurRec = context.currentRecord;
      var stSublistId = context.sublistId;

      // If Line on Item Sublist is being submitted...
      if (stSublistId == 'item') {
        try {
          var obParameters = {},
              obBudgetSearch,
              arBudgetResults;

          obParameters.commodityTypeAll = runtime.getCurrentScript().getParameter({ name: 'custscript_commodity_type_all' });
          obParameters.insufficientMsg = runtime.getCurrentScript().getParameter({ name: 'custscript_insufficient_msg' });

          console.log('Script Parameters: ' + JSON.stringify(obParameters));

          var stItem = obCurRec.getCurrentSublistValue({
            sublistId: 'item',
            fieldId: 'item'
          });
          var inItemQty = parseInt(obCurRec.getCurrentSublistValue({
            sublistId: 'item',
            fieldId: 'quantity'
          }));

          // If item field value exists...
          if (!NSUtil.isEmpty(stItem)) {
            var stEntityId = obCurRec.getValue({ fieldId: 'entity' });
            var stCustChain = obCurRec.getValue({ fieldId: 'custbody_ifd_noi_cust_chain' });

            // Search for NOI Pool Budgets
            // var arPbSearchFilters = [
            //   ['isinactive', 'is', false], 'and', [
            //     ['custrecord_noi_pool_bud_customer', 'anyof', stEntityId], 'or',
            //     ['custrecord_pool_group_customer', 'anyof', stCustChain]
            //   ]
            // ];
            // var arPbSearchColumns = [
            //   'custrecord_pool_name',
            //   'custrecordpool_start_amount',
            //   'custrecord_pool3_start_amt',
            //   'custrecord_pool_used_amt'
            // ];

            // var arBudgetResults = NSUtil.search('customrecord_noi_pool_budget', null, arPbSearchFilters, arPbSearchColumns);
            if (!NSUtil.isEmpty(stCustChain)) {
              obBudgetSearch = search.create({
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
              }).run();
              arBudgetResults = obBudgetSearch.getRange({
                start: 0,
                end: 1000
              });
            } else {
              obBudgetSearch = search.create({
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
              }).run();
              arBudgetResults = obBudgetSearch.getRange({
                start: 0,
                end: 1000
              });
            }


            console.log ('Pool Budget Search Results: ' + arBudgetResults.length);

            // If no results, exit
            if (NSUtil.isEmpty(arBudgetResults)) {
              console.log('No Budget Records found, exiting script.');
              return true;
            }

            // If results exist, get field values from line
            else {
              var stItemCommType = obCurRec.getCurrentSublistValue({
                sublistId: 'item',
                fieldId: 'custcol_ifd_noi_item_commodity_type'
              });
              // var boItemFeeForService = obCurRec.getCurrentSublistValue({
              //   sublistId: 'item',
              //   fieldId: 'custcol_ifd_noi_item_fee_for_service'
              // });

              // Search for Item Pool Allowance Custom Records
              // var arIpaSearchFilters = [
              //   ['custrecord_item_pool_item', 'anyof', stItem],
              //   ['isinactive', 'is', false]
              // ];
              // var arIpaSearchColumns = [
              //   'custrecord_item_pool_name',
              //   'custrecord_ifd_item_pool_alternatename',
              //   'custrecord_item_alternate_remain_amt'
              // ];

              // var arItemPoolBudgetResults = NSUtil.search('customrecord_item_pool_budget', null, arIpaSearchFilters, arIpaSearchColumns);
              var obItemPoolBudgetSearch = search.create({
                type: 'customrecord_item_pool_budget',
                filters: [
                  ['custrecord_item_pool_item', 'anyof', stItem],
                  'and',
                  ['isinactive', 'is', false]
                ],
                columns: [
                  'custrecord_item_pool_name',
                  'custrecord_ifd_item_pool_alternatename',
                  'custrecord_item_alternate_remain_amt'
                ]
              }).run();
              var arItemPoolBudgetResults = obItemPoolBudgetSearch.getRange({
                start: 0,
                end: 1000
              });

              console.log ('Item Pool Allowance Search Results: ' + arItemPoolBudgetResults.length);

              // If no results, exit
              if (NSUtil.isEmpty(arItemPoolBudgetResults)) {
                console.log('No Item Pool Budget Custom Records found, exiting script');
                return true;
              }

              // If results exist, Iterate through Item Pool Allowance Records
              else {
                var boUpdatePoolBudget = true;
                var inAllowanceAmt = 0;
                var arPbUsed = [];

                for (var ipaIdx = 0; ipaIdx < arItemPoolBudgetResults.length; ipaIdx++) { // ipaIdx = Item Pool Allowance Index
                  if (boUpdatePoolBudget) {
                    var stIpaName = arItemPoolBudgetResults[ipaIdx].getValue({ name: 'custrecord_item_pool_name' });
                    var stIpaAltName = arItemPoolBudgetResults[ipaIdx].getValue({ name: 'custrecord_ifd_item_pool_alternatename' });

                    var inIpaAltRemAmt = arItemPoolBudgetResults[ipaIdx].getValue({ name: 'custrecord_item_alternate_remain_amt' });
                    if (!NSUtil.isEmpty(inIpaAltRemAmt)) {
                      inIpaAltRemAmt = parseFloat(inIpaAltRemAmt);
                    } else {
                      console.log('custrecord_item_alternate_remain_amt is empty for Item Pool Allowance ' + arItemPoolBudgetResults[ipaIdx].id);
                      return true;
                    }

                    // Iterate through Pool Budget Records
                    for (var pbIdx = 0; pbIdx < arBudgetResults.length; pbIdx++) { // pbIdx = Pool Budget Index
                      var inAllowanceUsedAmt = 0;
                      var stPbName = arBudgetResults[pbIdx].getValue({ name: 'custrecord_pool_name' });
                      var stPbId = arBudgetResults[pbIdx].id;

                      var inPbStartAmt = arBudgetResults[pbIdx].getValue({ name: 'custrecordpool_start_amount' });
                      if (!NSUtil.isEmpty(inPbStartAmt)) {
                        inPbStartAmt = parseFloat(inPbStartAmt);
                      } else {
                        console.log('custrecordpool_start_amount is empty for Pool Budget ' + arBudgetResults[pbIdx].id);
                        return true;
                      }

                      var inPbRemAmt = arBudgetResults[pbIdx].getValue({ name: 'custrecord_pool3_start_amt' });
                      if (!NSUtil.isEmpty(inPbRemAmt)) {
                        inPbRemAmt = parseFloat(inPbRemAmt);
                      } else {
                        console.log('custrecord_pool3_start_amt is empty for Pool Budget ' + arBudgetResults[pbIdx].id);
                        return true;
                      }

                      var inPbUsedAmt = arBudgetResults[pbIdx].getValue({ name: 'custrecord_pool_used_amt' });
                      if (!NSUtil.isEmpty(inPbUsedAmt)) {
                        inPbUsedAmt = parseFloat(inPbUsedAmt);
                      }

                      // If Item Pool Allowance's Pool Name = Pool Budget's Pool Name...
                      if (stIpaName == stPbName) {
                        console.log('Test Case 1: Item Pool Allowance Name "' + stIpaName + '" = Pool Budget\'s name.');

                        // Multiple Item Pool Allowance's Amount by Sales Order Item Quantity
                        var inCalculatedAmt = inIpaAltRemAmt * inItemQty;
                        inCalculatedAmt = parseFloat(inCalculatedAmt.toFixed(2));

                        console.log ('Calculated Amount: ' + inCalculatedAmt);
                        console.log ('Pool Budget Remaining Amount: ' + inPbRemAmt);

                        // If calculated Allowance Amount is <= the Pool Budget's Pool Remaining Amount...
                        if (inCalculatedAmt <= inPbRemAmt) {
                          // Add Calculated Amount Allowance Amount
                          inAllowanceAmt += inCalculatedAmt;

                          // Check if the Project Budget has been used before
                          var boUsedBefore = false;
                          for (var arIdx = 0; arIdx < arPbUsed.length; arIdx++) {
                            var stArPbId = arPbUsed[arIdx];
                            if (stArPbId == stPbId) {
                              boUsedBefore = true;
                            }
                          }

                          // If Project Budget has not been used before, then add calculated amount to allowance used variable and push id to array
                          if (!boUsedBefore) {
                            arPbUsed.push(stPbId);
                            inAllowanceUsedAmt += inCalculatedAmt;
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
                        console.log('Test Case 2: Item Pool Allowance Alternate Name' + stIpaName + '" = Pool Budget\'s name.');

                        // Multiple Item Pool Allowance's Amount by Sales Order Item Quantity
                        var inCalculatedAmt = inIpaAltRemAmt * inItemQty;
                        inCalculatedAmt = parseFloat(inCalculatedAmt.toFixed(2));

                        console.log ('Calculated Amount: ' + inCalculatedAmt);
                        console.log ('Pool Budget Remaining Amount: ' + inPbRemAmt);

                        // If calculated Allowance Amount is <= the Pool Budget's Pool Remaining Amount...
                        if (inCalculatedAmt <= inPbRemAmt) {
                          // Add Calculated Amount Allowance Amount
                          inAllowanceAmt = inCalculatedAmt;
                          boUpdatePoolBudget = false;

                          // Check if the Project Budget has been used before
                          var boUsedBefore = false;
                          for (var arIdx = 0; arIdx < arPbUsed.length; arIdx++) {
                            var stArPbId = arPbUsed[arIdx];
                            if (stArPbId == stPbId) {
                              boUsedBefore = true;
                            }
                          }

                          // If Project Budget has not been used before, then add calculated amount to allowance used variable and push id to array
                          if (!boUsedBefore) {
                            arPbUsed.push(stPbId);
                            inAllowanceUsedAmt += inCalculatedAmt;
                          }
                          break;
                        }

                        // Else If calculated Allowance Amount is < the Pool Budget's Pool Remaining Amount and the Item's Commodity Type = All...
                        // else if ((inCalculatedAmt < inPbRemAmt) && stItemCommType == obParameters.commodityTypeAll) {
                        //   boUpdatePoolBudget = false;
                        //   continue;
                        // }
                      }

                      // Update Pool Budget Record

                    }
                  }
                }

                // console.log ('Allowance Amount: ' + inAllowanceAmt + ' | Fee For Service: ' + boItemFeeForService); // v1.2
                console.log ('Allowance Amount: ' + inAllowanceAmt);
                // if (inAllowanceAmt <= 0 && (!boItemFeeForService || boItemFeeForService === 'F')) { // v1.2
                if (inAllowanceAmt <= 0) { // v1.2
                  console.log ('Alert User and Return False');
                  alert (obParameters.insufficientMsg);

                  return false;
                } else {
                  obCurRec.setCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'custcol_ifd_noi_pool_budget_exceeded',
                    value: false
                  }); // v1.1

                  return true;
                }
              }
            }
          } else { return true; }
        } catch (error) {
          console.log (error.toString());
        }
      } else { return true; }
    }

    /**
    * Executed when you insert a line into an edit sublist.
    *
    * @param {Object} context
    * @param {Record} context.currentRecord - Current form record
    * @param {string} context.sublistId - Sublist name
    *
    * @returns {boolean} Return true if sublist line is valid
    */
    function validateInsert(context) {
      return true;
    }

    /**
    * Executed when removing an existing line from an edit sublist.
    *
    * @param {Object} context
    * @param {Record} context.currentRecord - Current form record
    * @param {string} context.sublistId - Sublist name
    *
    * @returns {boolean} Return true if sublist line is valid
    */
    function validateDelete(context) {
      return true;
    }

    /**
    * Executed after the submit button is pressed but before the form is submitted.
    *
    * @param {Object} context
    * @param {Record} context.currentRecord - Current form record
    * @returns {boolean} Return true if record is valid
    */
    function saveRecord(context) {
      return true;
    }

    return {
      // pageInit: pageInit,
      // fieldChanged: fieldChanged,
      // postSourcing: postSourcing,
      // sublistChanged: sublistChanged,
      // lineInit: lineInit,
      // validateField: validateField,
      validateLine: validateLine,
      // validateInsert: validateInsert,
      // validateDelete: validateDelete,
      // saveRecord: saveRecord
    };
  }
);