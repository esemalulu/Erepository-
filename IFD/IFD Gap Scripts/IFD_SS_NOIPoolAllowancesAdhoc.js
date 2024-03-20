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
 * @NScriptType ScheduledScript
 * @NModuleScope public
 * @author Daniel Lapp dlapp@netsuite.com
 *
 * Script Description: Scheduled Script that computes NOI Pool Allowances related to Invoice line items then provides another Scheduled Script
 * with NOI Pool Allowance data to create NOI Custom Records.
 *
 * Version    Date            Author                Remarks
 * 1.0        23 Oct 2018     Daniel Lapp           Redesign of previous Scheduled Script
 * 1.01		 20 Dec 2018	 Albert Lee			   B-63454/TI#45
 * 1.02		 03 Jan 2019	 Albert Lee			   D-03277/TI#113, D-03278/TI#114
 * 1.03 		 07 Jan 2019	 Albert Lee			   D-03279/TI#115
 * 1.04		 17 Jan 2019	 Albert Lee			   B-63454/TI#45 Revision 2
 * 1.05		 23 Jan 2019	 Albert Lee			   D-03285/TI#116
 * 1.06		 02 Feb 2019	 Albert Lee			   D-03286/TI#176
 * 1.07       02 Apr 2019     Jon Ostap             D-02389 - Fix NOI grouping logic, B-63669 - Removed (-1) from length check (bug),*                                                 Don't process task or update budgets if invoice save fails
 * 1.08       16 Apr 2019     P Ries                D-04291 / TI 191 - Changing parameters from Company Preference to script-specific
 * 1.5        07 May 2019     Jon Ostap             TI 193 - Added support for multiple pools belonging to the same item
 * 1.6        11 June 2019    Jon Ostap             Concat array for NOI transactions instead of clearing it
 * 1.7       01 July 2019    Jon Ostap             Set rate as entire amount, not just the most recent
 * 1.8       01 July 2019    Jon Ostap             Empty Array check
 * 1.9       09 July 2019    Jon Ostap             TI 210 - changed Unit Price calculation for NOI Allowance lines1.2799843
 * 2.0       14 July 2019    P Ries                TI 210 - added toFixed(2) to the unit rate column value
 * 2.1       09 Sept 2019    Jon Ostap             Fixed float conversion and rounding logic
 * 2.2       17 Sept 2019    P Ries                TI 260 - Removed Deployment ID from processTask function
 * 2.3       25 Sept 2019    Jon Ostap             TI 267 - Implement sleep functionality and robust logging before Invoice saved
 * 2.4       30 Sept 2019    Jon Ostap             TI 260,262,268 - Add check for NaN
 * 2.5       14 Oct 2019     Jon Ostap             TI 272 Commodity type all fix
 * 2.6       22 Oct 2019     Daniel Lapp           Added location logging to troubleshoot multi-location issue
 * 2.7       29 Oct 2019     Daniel Weinstein      TI 280 Removing NOI line processing when the "Shipped Quantity" is 0
 * 2.8        4 Nov 2019     Daniel Weinstein      TI 269 Adding retry logic on Invoice save
 * 2.9       7  Nov 2019     Daniel Weinstein      TI 283 Adding retry logic on Pool Budget save
 * 3.0       18 Nov 2019     P Ries                TI 283 - correction for when one PB needs to be updated almost simultaneously in two threads
 * 3.1       25 Nov 2019     P Ries                TI 283  - sleep correction for retry logic
 * 3.2       27 Nov 2019     P Ries                TI 283 -increasing the save and retry Num Retries setting for PRD only
 */
define(['N/config', 'N/runtime', 'N/record', './NSUtilvSS2', 'N/task', 'N/search'],

    function (config, runtime, record, NSUtil, task, search) {

      /**
       * Definition of the Scheduled script trigger point.
       *
       * @param {Object} context
       * @param {string} context.type - The context in which the script is executed. It is one of the values from the context.InvocationType enum.
       */
      function execute(context) {
        // sleep(4000); // used for testing purposes

        var obParams = {},
            stStep = 'Execute',
            boParamValid = true,
            obPBSearchArgs = {},
            arBudgetResults = [],
            arAltBudgetResults = [],
            obInvoice = {},
            stEntityId,
            obCustLookup = {},
            stChainName,
            arNewPBData = [],
            stCommType,
            boFeeForServ; //ADD v1.03

        log.debug({
          title: stStep,
          details: 'START'
        });

        try {
          stStep = 'Load Configuration';

          // v1.08 - updated to use local script parameters:
          obParams.commTypeAll = runtime.getCurrentScript().getParameter({ name: 'custscript_ifd_commtype__all' });
          obParams.commTypePartial = runtime.getCurrentScript().getParameter({ name: 'custscript_ifd_commtype__partial' });
          obParams.commTypeAlt = runtime.getCurrentScript().getParameter({ name: 'custscript_ifd_commtype__alternate' });
          obParams.commAllowItem = runtime.getCurrentScript().getParameter({ name: 'custscript_ifd__item' });
          obParams.commDiscLineClass = runtime.getCurrentScript().getParameter({ name: 'custscript_ifd__disc_line_class' });
          obParams.commDiscLineLoc = runtime.getCurrentScript().getParameter({ name: 'custscript_ifd__disc_line_location' });
          obParams.invoiceId = runtime.getCurrentScript().getParameter({ name: 'custscript_ifd_invoice_id' });
          obParams.contextType = runtime.getCurrentScript().getParameter({ name: 'custscript_ifd_context_type' });
		  obParams.saveRetrySeconds = runtime.getCurrentScript().getParameter({ name: 'custscript_ifd_save_invoice_num_seconds'}); //v2.8 added new parameters for save & retry
		  obParams.saveRetryAttempts = runtime.getCurrentScript().getParameter({ name: 'custscript_ifd_save_invoice_num_retries'});//v2.8 added new parameters for save & retry
		
          log.debug({
            title: stStep,
            details: 'Context Type: ' + obParams.contextType + ', Disc Line Loc: ' + obParams.commDiscLineLoc + ', Item: ' + obParams.commAllowItem
          });

          // If any Preference Parameters are empty then log errors and exit Script
          for (var pKey in obParams) {
            if (!obParams.hasOwnProperty(pKey)) {
              log.error({
                title: stStep,
                details: pKey + ' Parameter is empty'
              });
              boParamValid = false;
            }
          }

          if (!boParamValid) {
            stStep = 'Invalid Parameters';
            log.error({
              title: stStep,
              details: 'All Parameters are not set, exiting Script.'
            });
            return;
          } else {
            // Load Invoice from Parameter passed from UE/CS Scripts
            obInvoice = record.load({
              type: record.Type.INVOICE,
              id: obParams.invoiceId,
              isDynamic: true
            });

            stStep = 'Get Invoice Values';
            stEntityId = obInvoice.getValue({ fieldId: 'entity' });

            obCustLookup = search.lookupFields({
              type: search.Type.CUSTOMER,
              id: stEntityId,
              columns: ['custentityifd_chain_name']
            });

            if (!NSUtil.isEmpty(obCustLookup.custentityifd_chain_name[0])) {
              stChainName = obCustLookup.custentityifd_chain_name[0].value;
            }

            obPBSearchArgs.chain = stChainName;
            obPBSearchArgs.entity = stEntityId;

            log.debug({
              title: stStep,
              details: 'Chain Name: ' + stChainName + ' | Entity: ' + stEntityId
            });

            // If Invoice is being Created...
            if (obParams.contextType == 'create') {
              // Search for Pool Budgets
              arBudgetResults = poolBudgetSearch(obPBSearchArgs);
              log.debug('arBudgetResults',JSON.stringify(arBudgetResults));

              // If no Pool Budget Records found then log error and set to be processed to false
              if (arBudgetResults.length === 0) {
                stStep = 'No Pool Budget Records found';

                log.debug({
                  title: stStep,
                  details: 'Exit Script'
                });

                return;
              } else {
                stStep = 'Invoice Item Loop';
                // Iterate through Line Items remaining on Invoice
                var inItemCount = obInvoice.getLineCount({ sublistId: 'item' });
                log.debug({
                  title: stStep,
                  details: 'Invoice Line Count: ' + inItemCount
                });

                var arrTotPoolUsed = []; //START ADD v1.02
                for (var i=0; i<arBudgetResults.length; i++) {
                  arrTotPoolUsed[i] = 0;
                } //END ADD v1.02

                // Loop through Line Items (non-NOI)
                for (var itemIdx = 0; itemIdx < inItemCount; itemIdx++) {
                  var stItemId,
                      inItemQty,
                      inItemRate,
                      boAllLine,
                      obItemLookup = {},
                      arItemPoolBudgetResults = [],
                      itemNOIData = [];

                  stStep = 'Item Sublist Loop Iteration';
                  log.debug({
                    title: stStep,
                    details: 'Item Line: ' + itemIdx
                  });

                  // Get Line Item Values
                  obInvoice.selectLine({
                    sublistId: 'item',
                    line: itemIdx
                  });

                  stItemId = obInvoice.getCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'item'
                  });
                  inItemQty = parseInt(obInvoice.getCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'quantity'
                  }));
                  inItemRate = NSUtil.forceFloat(obInvoice.getCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'rate'
                  }));
                  inItemActWght = NSUtil.forceFloat(obInvoice.getCurrentSublistValue({ //ADD v1.01
                    sublistId: 'item',
                    fieldId: 'custcol_jf_cw_act_wght'
                  }));
                  boItemCatchWght = obInvoice.getCurrentSublistValue({ //ADD v1.01
                    sublistId: 'item',
                    fieldId: 'custcol_cw_indicator'
                  });
                  boAllLine = obInvoice.getCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'custcol_ifd_allowance_line'
                  });

                  // If Item Rate is 0 then skip item
                  if (inItemRate === 0) {
                    log.debug({
                      title: stStep,
                      details: 'Rate = 0, continue to next Item in Sublist'
                    });

                    continue;
                  }
                  //v2.7 If Invoice Item quantity is 0, skip item
                  if (inItemQty === 0) {
                    log.debug({
                      title: stStep,
                      details: 'Quantity shipped = 0, continue to next Item in Sublist'
                    });

                    continue;
                  }

                  if ((boAllLine === false || boAllLine === 'F') && inItemQty > 0) {
                    stStep = 'Item Lookup';

                    obItemLookup = search.lookupFields({
                      type: search.Type.ITEM,
                      id: stItemId,
                      columns: [
                        'custitem_ifd_noi_feeforservice',
                        'custitem_ifd_commodity_type'
                      ]
                    });

                    log.debug({
                      title: stStep,
                      details: obItemLookup
                    });

                    if (!NSUtil.isEmpty(obItemLookup.custitem_ifd_noi_feeforservice)) {
                      boFeeForServ = obItemLookup.custitem_ifd_noi_feeforservice;
                    }
                    if (!NSUtil.isEmpty(obItemLookup.custitem_ifd_commodity_type[0])) {
                      stCommType = obItemLookup.custitem_ifd_commodity_type[0].value;
                    }

                    /* COMMENT v1.06
                    // If item is Fee for Service, continue to next item
                    if (boFeeForServ == true || boFeeForServ == 'T') { //START ADD v1.03
                      stStep = 'Fee for Service Item Found';
                        log.debug({
                        title: stStep,
                        details: 'Item has been detected to be Fee for Service. Not considering for NOI. '
                      });
                      continue;
                    } //END ADD v1.03 */

                    // Search for Item Pool Allowances
                    arItemPoolBudgetResults = itemPoolAllowanceSearch(stItemId);

                    // If no Item Pool Allowance Records found, continue to next item
                    if (arItemPoolBudgetResults.length === 0) {
                      stStep = 'No Item Pool Allowance Records found';
                      log.debug({
                        title: stStep,
                        details: 'Continuing to next iteration'
                      });

                      continue;
                    } else {


                      // Loop through Item Pool Allowances
                      for (var ipaIdx = 0; ipaIdx < arItemPoolBudgetResults.length; ipaIdx++) {
                        var stIpaName,
                            stIpaAltName,
                            inIpaAltRemAmt,
                            inAltIpaAltRemAmt,
                            stAltIpaPoolName,
                            inAltPbRemAmt,
                            inAltPbUsedAmt,
                            inAltPbId;


                        stIpaName = arItemPoolBudgetResults[ipaIdx].getValue({ name: 'custrecord_item_pool_name' });
                        stIpaAltName = arItemPoolBudgetResults[ipaIdx].getValue({ name: 'custrecord_ifd_item_pool_alternatename' });
                        inIpaAltRemAmt = NSUtil.forceFloat(arItemPoolBudgetResults[ipaIdx].getValue({ name: 'custrecord_item_alternate_remain_amt' }));
                        inAltIpaAltRemAmt = NSUtil.forceFloat(arItemPoolBudgetResults[ipaIdx].getValue({
                          name: 'custrecord_item_alternate_remain_amt',
                          join: 'custrecord_ifd_item_pool_alternatename'
                        }));
                        stAltIpaPoolName = arItemPoolBudgetResults[ipaIdx].getValue({
                          name: 'custrecord_item_pool_name',
                          join: 'custrecord_ifd_item_pool_alternatename'
                        });

                        log.debug({
                          title: stStep,
                          details: {
                            stIpaName: stIpaName,
                            stIpaAltName: stIpaAltName,
                            inIpaAltRemAmt: inIpaAltRemAmt,
                            inAltIpaAltRemAmt: inAltIpaAltRemAmt,
                            stAltIpaPoolName: stAltIpaPoolName
                          }
                        });

                        if (!NSUtil.isEmpty(stAltIpaPoolName)) {
                          obPBSearchArgs.poolName = stAltIpaPoolName;
                          // Search for Pool Budgets
                          arAltBudgetResults = poolBudgetSearch(obPBSearchArgs);
                          log.debug('arAltBudgetResults',JSON.stringify(arAltBudgetResults));

                          if (arAltBudgetResults.length !== 0) {
                            stStep = 'Alternate Pool Budget Search';

                            inAltPbId = arAltBudgetResults[0].id;
                            inAltPbRemAmt = NSUtil.forceFloat(arAltBudgetResults[0].getValue({ name: 'custrecord_pool3_start_amt' }));
                            inAltPbUsedAmt = NSUtil.forceFloat(arAltBudgetResults[0].getValue({ name: 'custrecord_pool_used_amt' }));

                            log.debug({
                              title: stStep,
                              details: {
                                inAltPbRemAmt: inAltPbRemAmt,
                                inAltPbUsedAmt: inAltPbUsedAmt
                              }
                            });
                          }
                        }

                        // Loop through Pool Budgets
                        for (var pbIdx = 0; pbIdx < arBudgetResults.length; pbIdx++) {
                          var stPbName,
                              stPbId,
                              inPbStartAmt,
                              inPbRemAmt,
                              inPbUsedAmt,
                              inCalculatedAmt;

                          var obNewNOIData = {};

                          // Get Column Values from Pool Budget Search
                          stPbName = arBudgetResults[pbIdx].getValue({ name: 'custrecord_pool_name' });
                          stPbId = arBudgetResults[pbIdx].id;
                          inPbStartAmt = NSUtil.forceFloat(arBudgetResults[pbIdx].getValue({ name: 'custrecordpool_start_amount' }));
                          inPbRemAmt = NSUtil.forceFloat(arBudgetResults[pbIdx].getValue({ name: 'custrecord_pool3_start_amt' }));
                          inPbUsedAmt = NSUtil.forceFloat(arBudgetResults[pbIdx].getValue({ name: 'custrecord_pool_used_amt' }));
                          log.debug(stStep,'inPbUsedAmt: '+inPbUsedAmt+' inPbRemAmt: '+inPbRemAmt);
                          inPbRemAmt -= arrTotPoolUsed[pbIdx]; //ADD v1.02
                          log.debug(stStep, 'inPbRemAmt after 1.02: '+inPbRemAmt);
                          log.debug(stStep, 'arrTotPoolUsed: '+JSON.stringify(arrTotPoolUsed));

                          // If Item Pool Allowance's Pool Name = Pool Budget's Pool Name...
                          if (stIpaName == stPbName) {
                            stStep = 'Pool Name Match';

                            log.debug({
                              title: stStep,
                              details: 'Name: ' + stIpaName + ' | ID: ' + stPbId
                            });

                            stStep = 'Calculate Amount';
                            // Multiply Item Pool Allowance's Amount by Sales Order Item Quantity
                            if (boItemCatchWght == true || boItemCatchWght == 'T') { //v1.01: ADD if/else logic. Originally only had the else statement
                              inCalculatedAmt = NSUtil.roundDecimalAmount(NSUtil.forceFloat((inIpaAltRemAmt * inItemActWght)),2);
                            } else {
                              inCalculatedAmt = NSUtil.roundDecimalAmount(NSUtil.forceFloat((inIpaAltRemAmt * inItemQty)),2);
                            }

                            log.debug({
                              title: stStep,
                              details: inCalculatedAmt
                            });

                            // If calculated Allowance Amount is <= the Pool Budget's Pool Remaining Amount...
                            if (inCalculatedAmt <= inPbRemAmt) {
                              stStep = 'Applicable Pool Budget';
                              log.debug({
                                title: stStep,
                                details: 'Calculated Amount: ' + inCalculatedAmt + ' <= Project Budget Remaining Amount: ' + inPbRemAmt
                              });
                              obNewNOIData.amt = inCalculatedAmt;
                              obNewNOIData.pb = stPbId;
                              obNewNOIData.ffs = boFeeForServ;
                              obNewNOIData.item = stItemId;
                              obNewNOIData.rem = inPbRemAmt;
                              obNewNOIData.used = inPbUsedAmt;
                              obNewNOIData.pbRem = inPbRemAmt; //ADD v1.05
                              obNewNOIData.pbUsed = inPbUsedAmt; //ADD v1.05

                              arrTotPoolUsed[pbIdx] += inCalculatedAmt; //ADD v1.02

                            }

                            // Else If calculated Allowance Amount is > the Pool Budget's Pool Remaining Amount and the Item's Commodity Type = All...
                            else if ((inCalculatedAmt > inPbRemAmt) && stCommType == obParams.commTypeAll) {
                              stStep = 'Inapplicable Pool Budget and Commodity Type = All';
                              log.debug({
                                title: stStep,
                                details: 'Calculated Amount: ' + inCalculatedAmt + ' > Project Budget Remaining Amount: ' + inPbRemAmt
                              });

                              obNewNOIData.pb = stPbId;
                              obNewNOIData.ffs = boFeeForServ;
                              obNewNOIData.pbRem = inPbRemAmt;
                              obNewNOIData.pbUsed = inPbUsedAmt;
                              obNewNOIData.rem = inPbRemAmt; //ADD v1.05
                              obNewNOIData.used = inPbUsedAmt; //ADD v1.05

                            }

                            // Else If calculated Allowance Amount is > the Pool Budget's Pool Remaining Amount then look for Alternate Pool
                            else if (inCalculatedAmt > inPbRemAmt && !NSUtil.isEmpty(inAltPbId) && !NSUtil.isEmpty(inAltPbRemAmt) && !NSUtil.isEmpty(inAltPbUsedAmt)) {
                              stStep = 'Inapplicable Pool Budget but Alternate Pool exists';

                              log.debug({
                                title: stStep,
                                details: 'Calculated Amount: ' + inCalculatedAmt + ' > Project Budget Remaining Amount: ' + inPbRemAmt
                              });

                              stStep = 'Calculate Alternate Amount';
                              // Multiply Item Pool Allowance's Amount by Sales Order Item Quantity
                              inCalculatedAmt = NSUtil.roundDecimalAmount(NSUtil.forceFloat((inAltIpaAltRemAmt * inItemQty)),2);

                              log.debug({
                                title: stStep + 'Alternate Calculated Amount',
                                details: inCalculatedAmt
                              });

                              // If calculated Allowance Amount is <= the Pool Budget's Pool Remaining Amount...
                              if (inCalculatedAmt <= inAltPbRemAmt) {
                                stStep = 'Applicable Alternate Pool Budget';

                                log.debug({
                                  title: stStep,
                                  details: 'Calculated Amount: ' + inCalculatedAmt + ' <= Alt Project Budget Remaining Amount: ' + inAltPbRemAmt
                                });
                                obNewNOIData.amt = inCalculatedAmt;
                                obNewNOIData.pb = inAltPbId;
                                obNewNOIData.ffs = boFeeForServ;
                                obNewNOIData.item = stItemId;
                                obNewNOIData.rem = inAltPbRemAmt;
                                obNewNOIData.used = inAltPbUsedAmt;
                                obNewNOIData.pbRem = inAltPbRemAmt;  //ADD v1.05
                                obNewNOIData.pbUsed = inAltPbUsedAmt; //ADD v1.05
                              } else {
                                stStep = 'Inapplicable Alternate Pool Budget';

                                log.debug({
                                  title: stStep,
                                  details: 'Calculated Amount: ' + inCalculatedAmt + ' > Alt Project Budget Remaining Amount: ' + inAltPbRemAmt
                                });
                              }

                              obNewNOIData.pb = inAltPbId;
                              obNewNOIData.ffs = boFeeForServ;
                              obNewNOIData.pbRem = inPbRemAmt;
                              obNewNOIData.pbUsed = inAltPbUsedAmt;
                              obNewNOIData.rem = inPbRemAmt; //ADD v1.05
                              obNewNOIData.used = inAltPbUsedAmt; //ADD v1.05
                            }

                            if(Object.keys(obNewNOIData).length !== 0){
                              itemNOIData.push(obNewNOIData);
                            }

                          }

                          // Else If Item Pool Allowance's Alternate Name = Pool Budget's Pool Name...
                          else if (stIpaAltName == stPbName) {
                            stStep = 'Alternate Pool Name Match';

                            log.debug({
                              title: stStep,
                              details: 'Name: ' + stIpaAltName + ' | ID: ' + stPbId
                            });

                            stStep = 'Calculate Amount';
                            // Multiply Item Pool Allowance's Amount by Sales Order Item Quantity
                            inCalculatedAmt = NSUtil.roundDecimalAmount(NSUtil.forceFloat((inIpaAltRemAmt * inItemQty)),2);

                            log.debug({
                              title: stStep,
                              details: 'calculated Amount: ' + inCalculatedAmt + ', inIpaAltRemAmt: ' + inIpaAltRemAmt + ', inItemQty: ' + inItemQty
                            });

                            // If calculated Allowance Amount is <= the Pool Budget's Pool Remaining Amount...
                            if (inCalculatedAmt <= inAltPbRemAmt) {
                              stStep = 'Applicable Pool Budget';
                              log.debug({
                                title: stStep,
                                details: 'Calculated Amount: ' + inCalculatedAmt + ' <= Alt Project Budget Remaining Amount: ' + inAltPbRemAmt
                              });
                              obNewNOIData.amt = inCalculatedAmt;
                              obNewNOIData.pb = inAltPbId;
                              obNewNOIData.ffs = boFeeForServ;
                              obNewNOIData.item = stItemId;
                              obNewNOIData.rem = inAltPbRemAmt;
                              obNewNOIData.used = inAltPbUsedAmt;
                              obNewNOIData.pbRem = inAltPbRemAmt; //ADD v1.05
                              obNewNOIData.pbUsed = inAltPbUsedAmt; //ADD v1.05
                            }

                            // Else If calculated Allowance Amount is > the Pool Budget's Pool Remaining Amount and the Item's Commodity Type = All...
                            else if ((inCalculatedAmt > inAltPbRemAmt) && stCommType == obParams.commTypeAll) {
                              stStep = 'Inapplicable Pool Budget and Commodity Type = All';
                              log.debug({
                                title: stStep,
                                details: 'Calculated Amount: ' + inCalculatedAmt + ' > Alt Project Budget Remaining Amount: ' + inAltPbRemAmt
                              });

                              obNewNOIData.pb = inAltPbId;
                              obNewNOIData.ffs = boFeeForServ;
                              obNewNOIData.pbRem = inAltPbRemAmt;
                              obNewNOIData.pbUsed = inAltPbUsedAmt;
                              obNewNOIData.rem = inAltPbRemAmt; //ADD v1.05
                              obNewNOIData.used = inAltPbUsedAmt; //ADD v1.05

                            }

                            if(Object.keys(obNewNOIData).length !== 0){
                              itemNOIData.push(obNewNOIData);
                            }


                          }

                        }



                      }
                    }
                  } else {
                    continue;
                  }
                  stStep = 'Post Data Accumulation';

                  var doGrantNOI = true;
                  //v2.5
                  if(stCommType == obParams.commTypeAll){
                    var didAnyAmountFail = itemNOIData.some(function (noiPiece){
                      return !noiPiece.amt;
                    });
                    log.debug(stStep, 'didAnyAmountFail: '+ didAnyAmountFail);

                    if(didAnyAmountFail){
                      doGrantNOI = false;

                      var removeAmount = itemNOIData.reduce(function (pbToRemove, noiPiece){
                        if(!pbToRemove[noiPiece.pb]){
                          pbToRemove[noiPiece.pb] = 0;
                        }

                        if(noiPiece.amt){
                          pbToRemove[noiPiece.pb] += noiPiece.amt;
                          noiPiece.rem = noiPiece.rem += noiPiece.amt;
                        }

                        return pbToRemove
                      },{});
                      log.debug(stStep, 'pbToRemove: '+JSON.stringify(removeAmount));

                      arBudgetResults.forEach(function (budgetResult, index){
                          if(removeAmount[budgetResult.id]){
                            arrTotPoolUsed[index] = arrTotPoolUsed[index] - removeAmount[budgetResult.id];

                          }
                      });
                    }
                  }


                  log.debug(stStep,'itemNOIData: '+JSON.stringify(itemNOIData));

                  var noiPoolBudget = itemNOIData.reduce(function(noiLine, noiPiece, index){

                    if(index>0){
                      noiLine += '|';
                    }

                    if(!NSUtil.isEmpty(noiPiece.amt) && noiPiece.amt <= noiPiece.rem){
                      noiLine += noiPiece.pb + ':' + noiPiece.amt + ':' + inItemQty.toString();
                    }

                    return noiLine;
                  }, '');
                  log.debug(stStep,'noiPoolBudget: '+noiPoolBudget);

                  if(noiPoolBudget && doGrantNOI){
                    // Set Column Array and commit current Line Item
                    obInvoice.setCurrentSublistValue({
                      sublistId: 'item',
                      fieldId: 'custcol_ifd_noi_pool_budget',
                      value: noiPoolBudget
                    });
                    obInvoice.setCurrentSublistValue({ //ADD v1.04
                      sublistId: 'item',
                      fieldId: 'location',
                      value: obParams.commDiscLineLoc
                    });
                  }

                  try{
                    obInvoice.commitLine({
                      sublistId: 'item'
                    });
                  }catch(commitError){
                    log.error({
                      title: stStep,
                      details: commitError.toString()+' Invoice ID: '+obInvoice.id
                    });
                  }

                  var itemCombined = itemNOIData.reduce(function(itemData, noiPiece, index){

                    if(!itemData.amt){
                      itemData.amt = 0;
                    }

                    if(noiPiece.amt && noiPiece.amt <= noiPiece.rem){ //v2.4
                      itemData.amt += noiPiece.amt;
                    }

                    if(index === itemNOIData.length-1){
                      itemData.ffs = noiPiece.ffs;
                    }

                    return itemData;

                  },{});

                  log.debug(stStep,'itemCombined: '+JSON.stringify(itemCombined));

                  // Add NOI Item below current Line Item
                  if (stItemId !== obParams.commAllowItem) {

                    stStep = 'Add NOI Item';

                    // for(var i=0; i<itemNOIData.length; i++){
                    //     var noiLine = itemNOIData[i];

                    if(!NSUtil.isEmpty(itemCombined.amt) && itemCombined.amt !== 0 && doGrantNOI){ //2.4

                      if (itemCombined.ffs == false || itemCombined.ffs == 'F') { //ADD v1.06 if logic and else code
                        if (itemIdx !== (inItemCount - 1)) {
                          obInvoice.insertLine({
                            sublistId: 'item',
                            line: itemIdx + 1
                          });
                          itemIdx++;
                          inItemCount++;
                        } else {
                          obInvoice.selectNewLine({
                            sublistId: 'item'
                          });
                        }

                        // Set New Line Item Values
                        obInvoice.setCurrentSublistValue({
                          sublistId: 'item',
                          fieldId: 'item',
                          value: obParams.commAllowItem
                        });
                        obInvoice.setCurrentSublistValue({
                          sublistId: 'item',
                          fieldId: 'quantity',
                          value: inItemQty
                        });

                        if (boItemCatchWght == true || boItemCatchWght == 'T') { //v1.04 Added if/else logic and code in IF block
                          obInvoice.setCurrentSublistValue({
                            sublistId: 'item',
                            fieldId: 'rate',
                            value: ((itemCombined.amt / inItemActWght)  * -1).toFixed(2) //v1.7   //v1.9    //v2.0
                          });
                          log.debug({
                            title: stStep,
                            details: 'Allowance Used Amount (Catch Weight): ' + itemCombined.amt + ' / Act Wght: ' + inItemActWght + ' * -1'
                          });
                        } else {
                          obInvoice.setCurrentSublistValue({
                            sublistId: 'item',
                            fieldId: 'rate',
                            value: (itemCombined.amt / inItemQty) * -1
                          });
                          log.debug({
                            title: stStep,
                            details: 'Allowance Used Amount: ' + itemCombined.amt + ' / Quantity: ' + inItemQty + ' * -1'
                          });
                        } //END ADD v1.04
                        obInvoice.setCurrentSublistValue({
                          sublistId: 'item',
                          fieldId: 'amount',
                          value: itemCombined.amt * -1
                        });
                        obInvoice.setCurrentSublistValue({
                          sublistId: 'item',
                          fieldId: 'class',
                          value: obParams.commDiscLineClass
                        });
                        obInvoice.setCurrentSublistValue({
                          sublistId: 'item',
                          fieldId: 'location',
                          value: obParams.commDiscLineLoc
                        });
                        obInvoice.setCurrentSublistValue({
                          sublistId: 'item',
                          fieldId: 'custcol_ifd_noi_pool_budget',
                          value: noiPoolBudget
                        });
                        obInvoice.setCurrentSublistValue({
                          sublistId: 'item',
                          fieldId: 'custcol_ifd_allowance_line',
                          value: true
                        });
                        obInvoice.commitLine({
                          sublistId: 'item'
                        });
                      } else {
                        log.debug(stStep, 'Not adding NOI line, since item is Fee for Service. Value: ' + itemCombined.ffs);
                      }


                      // if (!NSUtil.isEmpty(noiLine)) { //ADD v1.06 If logic
                      //     arNewPBData.push(noiLine);
                      // }

                      if(itemNOIData.length !== 0){ //v1.8
                        arNewPBData = arNewPBData.concat(itemNOIData); //v1.6
                      }
                    }
                    // }

                  }
                } //End of item loop

				collectInvoiceLogs(obInvoice); //v2.3 //v2.8 moved above save & retry logic to prevent redundant logging
				var saveResult = saveAndRetryOnError(obInvoice,obParams);	//v2.8 calling save & retry function instead of previous save logic
				if(saveResult == -1)
				{
					stStep = 'Submit Invoice Failed';
					log.error({
						title : stStep,
						details : 'Invoice failed to save after ' + obParams.saveRetryAttempts + ' attempts.  Exiting process'
					});
					return;
				}
                // Save Invoice
                /*
				try {
                  stStep = 'Process Finalization';
                  obInvoice.save();
                  log.audit({
                    title: stStep,
                    details: 'Invoice ' + obInvoice.id + ' has been updated'
                  });
                } catch (error) {
                  stStep = 'Submit Invoice Error';
                  log.error({
                    title: stStep,
                    details: 'Error: '+error.toString()+' Invoice ID: '+obInvoice.id
                  });
                  return;
                }
				*/


                // Create Task and Execute Scheduled Script
                processTask(arNewPBData, obInvoice);

                // Update Pool Budget Records if applicable
                updatePoolBudgets(arNewPBData, obParams);
              }
            }





            // ELSE IF INVOICE IS BEING EDITED (MARKER A)
            else {
              return;
            }
          }
        } catch (error) {
          var stStep = 'Catch';

          log.error({
            title: stStep,
            details: error.toString()
          });
        } finally {
          var stStep = 'Finally';

          log.debug({
            title: stStep,
            details: 'FINISH'
          });
        }
      }
	  
	  //v2.8 Save & Retry function 
	  function saveAndRetryOnError(obRecord,obParams)
	  {
		var stStep = 'saveAndRetryOnError';
		var maxAttempts = obParams.saveRetryAttempts;
		if(!maxAttempts || maxAttempts < 1)
		{
			maxAttempts = 20;	//if parameter is empty, default to 1 retry  // v3.2 - increased
		}
		var retryDelay = obParams.saveRetrySeconds;
		if(!retryDelay || retryDelay < 1)
		{
			retryDelay = 5;	//if parameter is empty, default to a 3 second delay in saves
		}
		log.debug({
			title: stStep,
			details: 'Retries parameters set.  Number of Retries: ' + maxAttempts + ', Retry Delay: ' + retryDelay + '.'
		});
		for (var attemptsRemaining = maxAttempts; attemptsRemaining >= 0; --attemptsRemaining)
		{
			try
			{
        stStep = 'Save Attempt Complete';
				obRecord.save();
        log.audit({
            title: stStep,
            details: 'Record with ID:  ' + obRecord.id + ' has been updated'
        });
				return obRecord.id;
			}
			catch (error)
			{
        stStep = 'Submit Record Attempt Error';
        sleep(retryDelay);                   // v3.1 - added   
        if (attemptsRemaining <= 0) {        // v3.2 - updated
				    log.error({
				        title: stStep,
				        details: 'Record Save Failed. ' + (attemptsRemaining-1) + ' attempts remaining out of ' + maxAttempts + ' attempts.  Error: '+error.toString()+' Record ID: '+obRecord.id
            });
        }
			}
		}
		return -1; //if the code reaches this point, attemptsRemaining == 0 without a successful save
	  }

      function collectInvoiceLogs(invoice){

        var logTitle = 'Invoice Data before Save';

        log.debug(logTitle, 'Start Logs for Invoice: '+invoice.id +' Header Data: '+JSON.stringify({
          subtotal: invoice.getValue('subtotal'),
          shipping: invoice.getValue('altshippingcost'),
          tax: invoice.getValue('taxtotal'),
          total: invoice.getValue('total')
        }));

        var invoiceLines = invoice.getLineCount({
          sublistId: 'item'
        });

        for(var i=0; i<invoiceLines; i++){

          log.debug(logTitle, 'Invoice Line: '+i+' Details: '+JSON.stringify({
            itemID: invoice.getSublistValue({
              sublistId: 'item',
              fieldId: 'item',
              line: i
            }),
            quantity: invoice.getSublistValue({
              sublistId: 'item',
              fieldId: 'quantity',
              line: i
            }),
            itemRate: invoice.getSublistValue({
              sublistId: 'item',
              fieldId: 'rate',
              line: i
            }),
            isPriceOverride: invoice.getSublistValue({
              sublistId: 'item',
              fieldId: 'custcol_ifd_price_override',
              line: i
            }),
            isTaxable: invoice.getSublistValue({
              sublistId: 'item',
              fieldId: 'istaxable',
              line: i
            }),
            taxRate: invoice.getSublistValue({
              sublistId: 'item',
              fieldId: 'taxrate1',
              line: i
            }),
            isCatchWeight: invoice.getSublistValue({
              sublistId: 'item',
              fieldId: 'custcol_cw_indicator',
              line: i
            }),
            itemAmount: invoice.getSublistValue({
              sublistId: 'item',
              fieldId: 'amount',
              line: i
            }),
            location: invoice.getSublistValue({
              sublistId: 'item',
              fieldId: 'location',
              line: i
            }) // v2.6: Add
          }));
        }


      }

      function poolBudgetSearch(obPBSearchArgs) {
        var stStep = 'Pool Budget Search',
            obBudgetSearch = {};

        if (!NSUtil.isEmpty(obPBSearchArgs.poolName)) { //If Pool Name is populated
          if (NSUtil.isEmpty(obPBSearchArgs.chain)) { //If Chain Name is populated
            obBudgetSearch = search.create({
              type: 'customrecord_noi_pool_budget',
              filters: [
                ['isinactive', 'is', false],
                'and',
                ['custrecord_noi_pool_bud_customer', 'anyof', obPBSearchArgs.entity],
                'and',
                ['custrecord_pool_name', 'anyof', obPBSearchArgs.poolName]
              ],
              columns: [
                'custrecord_pool_name',
                'custrecordpool_start_amount',
                'custrecord_pool3_start_amt',
                'custrecord_pool_used_amt'
              ]
            });
          } else {
            obBudgetSearch = search.create({
              type: 'customrecord_noi_pool_budget',
              filters: [
                ['isinactive', 'is', false],
                'and',
                [
                  ['custrecord_noi_pool_bud_customer', 'anyof', obPBSearchArgs.entity],
                  'or',
                  ['custrecord_pool_group_customer', 'anyof', obPBSearchArgs.chain],
                  'and',
                  ['custrecord_pool_name', 'anyof', obPBSearchArgs.poolName]
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
        } else { //If pool name is empty
          if (NSUtil.isEmpty(obPBSearchArgs.chain)) {
            obBudgetSearch = search.create({
              type: 'customrecord_noi_pool_budget',
              filters: [
                ['isinactive', 'is', false],
                'and',
                ['custrecord_noi_pool_bud_customer', 'anyof', obPBSearchArgs.entity]
              ],
              columns: [
                'custrecord_pool_name',
                'custrecordpool_start_amount',
                'custrecord_pool3_start_amt',
                'custrecord_pool_used_amt'
              ]
            });
          } else {
            obBudgetSearch = search.create({
              type: 'customrecord_noi_pool_budget',
              filters: [
                ['isinactive', 'is', false],
                'and',
                [
                  ['custrecord_noi_pool_bud_customer', 'anyof', obPBSearchArgs.entity],
                  'or',
                  ['custrecord_pool_group_customer', 'anyof', obPBSearchArgs.chain]
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

        log.debug({
          title: stStep,
          details: '# of Pool Budgets found: ' + arBudgetResults.length + '. Pool Budgets: ' + JSON.stringify(arBudgetResults)
        });

        return arBudgetResults;
      }

      function itemPoolAllowanceSearch(stItemId) {
        var stStep = 'Item Pool Allowance Search',
            arIPAFilters = [];

        arIPAFilters.push(search.createFilter({
          name: 'isinactive',
          operator: search.Operator.IS,
          values: false
        }));
        arIPAFilters.push(search.createFilter({
          name: 'custrecord_item_pool_item',
          operator: search.Operator.ANYOF,
          values: stItemId
        }));
        var obItemPoolBudgetSearch = search.create({
          type: 'customrecord_item_pool_budget',
          filters: arIPAFilters,
          columns: [
            search.createColumn({
              name: 'custrecord_item_pool_name'
            }),
            search.createColumn({
              name: 'custrecord_ifd_item_pool_alternatename'
            }),
            search.createColumn({
              name: 'custrecord_item_alternate_remain_amt',
              join: 'custrecord_ifd_item_pool_alternatename'
            }),
            search.createColumn({
              name: 'custrecord_item_pool_name',
              join: 'custrecord_ifd_item_pool_alternatename'
            }),
            search.createColumn({
              name: 'custrecord_item_alternate_remain_amt'
            }),
            search.createColumn({
              name: 'custitem_ifd_commodity_type',
              join: 'custrecord_item_pool_item'
            })


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

        log.debug({
          title: stStep,
          details: '# of Pool Allowances for item ' + stItemId + ': ' + arItemPoolBudgetResults.length
        });

        log.debug(stStep, 'Item Pool Budget Results: '+JSON.stringify(arItemPoolBudgetResults));

        return arItemPoolBudgetResults;
      }

      function processTask(arPBData, obInvoice) {
        var stStep = 'Process Task',
            stScParam = '';

        // Use data object to create data string to pass onto other Scheduled Script
        for (arBpIdx = 0; arBpIdx < arPBData.length; arBpIdx++) {

          //v1.08
          if (arBpIdx > 0 && arBpIdx !== (arPBData.length)) {
            stScParam += '|';
          }

          //if (arPBData[arBpIdx].ffs === false || arPBData[arBpIdx].ffs === 'F') { //COMMENT v1.06
          stScParam += obInvoice.id + '@' + arPBData[arBpIdx].item + '@' + arPBData[arBpIdx].pb + '-' + arPBData[arBpIdx].amt;
          // | stInvId @ stItemId @ stNoiId - stAmt , stNoiId - stAmt |
          //}
        }

        if (!NSUtil.isEmpty(stScParam)) {
          log.debug({
            title: stStep,
            details: 'Scheduled Script Parameter: ' + stScParam
          });

          var taskParams = {
            custscript_ifd_data_to_update: stScParam
          };

          submitScheduledTask('customscript_sc_noi_pool_trans_update', taskParams, 25, 10); //v2.3
        }
      }

      function submitScheduledTask(scheduledScriptID, obParams, inMaxRetries, inSecondsDelay) { // v1.01 & v1.06: Update: Restructuring
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
                scriptId: scheduledScriptID,
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

      function sleep(seconds) {
        log.debug({
          title: 'Sleeping',
          details: seconds / 1000 + ' seconds'
        });

        var inMS = seconds * 1000;

        // Get current date
        var obDate = new Date();
        // Add the ms argument to the current date
        var obNewDate = obDate.getTime() + inMS;
        // Compare current date with added ms to a new current date
        while (obNewDate > new Date()) {}
      }

      function updatePoolBudgets(arPBData,obParams) {	//v2.9 added obParams to parameters to pass through to save and retry
        var stStep = 'Update Pool Budgets',
            inRemaining,
            inUsed,
            arPBDataRestructured = [];

        log.debug({
          title: stStep,
          details: 'Array length: ' + arPBData.length + ', Data Array: ' + JSON.stringify(arPBData)
        });

        //v1.07
        arPBDataRestructured = arPBData.reduce(function(groupedPoolData, itemData, itemIndex){

          var existingBudgetIndex = groupedPoolData.map(function(groupedValue){
            return groupedValue.pb;
          }).indexOf(itemData.pb);

          if(existingBudgetIndex !== -1){
            if(itemData.amt){ //v2.4
              groupedPoolData[existingBudgetIndex].amt += itemData.amt;
            }
          }else{
            groupedPoolData.push(itemData);
          }

          return groupedPoolData;
        },[]);



        stStep = 'Update Pool Budgets';
        log.debug({
          title: stStep,
          details: 'Restructured Data Array: ' + JSON.stringify(arPBDataRestructured)
        });

        // Loop through Pool Budget Array and update records
        for (var pbrIdx = 0; pbrIdx < arPBDataRestructured.length; pbrIdx++) {
          //if (arPBDataRestructured[pbrIdx].ffs === false || arPBDataRestructured[pbrIdx].ffs === 'F') { //COMMENT v1.06

          // v3.0 - moved here
          var stBpUsedId = arPBDataRestructured[pbrIdx].pb;
          var obPbRec = record.load({
            type: 'customrecord_noi_pool_budget',
            id: stBpUsedId
          });
          
          var inAmt = NSUtil.forceFloat(arPBDataRestructured[pbrIdx].amt);
          // v3.0 - update - start
          //var inPbRemaining = NSUtil.forceFloat(arPBDataRestructured[pbrIdx].rem);
          //var inPbUsed = NSUtil.forceFloat(arPBDataRestructured[pbrIdx].used);
          var inPbRemaining = obPbRec.getValue('custrecord_pool3_start_amt');
          var inPbUsed = obPbRec.getValue('custrecord_pool_used_amt');
          // v3.0 - update - end
          inRemaining = inPbRemaining - inAmt;
          inUsed = inPbUsed + inAmt;

          log.debug({
            title:stStep,
            details:{
              updateIndex: pbrIdx,
              ogPoolRemaining: inPbRemaining,
              poolRemaining: inRemaining,
              ogPoolUsed:inPbUsed,
              poolUsed: inUsed,
              poolAmount: inAmt
            }
          });

          if (!NSUtil.isEmpty(arPBDataRestructured[pbrIdx].newRem) && !NSUtil.isEmpty(arPBDataRestructured[pbrIdx].newUsed)) {
            obPbRec.setValue({
              fieldId: 'custrecord_pool3_start_amt',
              value: arPBDataRestructured[pbrIdx].newRem
            });
            obPbRec.setValue({
              fieldId: 'custrecord_pool_used_amt',
              value: arPBDataRestructured[pbrIdx].newUsed
            });
            log.audit({
              title: stStep,
              details: {
                id: stBpUsedId,
                custrecord_pool3_start_amt: arPBDataRestructured[pbrIdx].newRem,
                custrecord_pool_used_amt: arPBDataRestructured[pbrIdx].newUsed
              }
            });
          } else {
            obPbRec.setValue({
              fieldId: 'custrecord_pool3_start_amt',
              value: inRemaining
            });
            obPbRec.setValue({
              fieldId: 'custrecord_pool_used_amt',
              value: inUsed
            });
            log.audit({
              title: stStep,
              details: {
                id: stBpUsedId,
                custrecord_pool3_start_amt: inRemaining,
                custrecord_pool_used_amt: inUsed
              }
            });
          }

		  //v2.9 adding saveAndRetry to pool budget save
		  var saveResult = saveAndRetryOnError(obPbRec,obParams);	//v2.9 calling save & retry function instead of previous save logic
		  if(saveResult == -1)
		  {
			stStep = 'Submit Pool Budget Failed';
			log.error({
				title : stStep,
				details : 'Pool Budget failed to save after ' + obParams.saveRetryAttempts + ' attempts.  Exiting process'
			});
			continue;	//if current pool budget fails to save after all retry attempts, skip to next pool budget
		  }
          //var stPoolBudgetId = obPbRec.save();
          log.audit(stStep, 'Updated Pool Budget w/ ID: ' + saveResult);

          //} //COMMENT v1.06
        }
      }

      // function sleep(inMS) { // used for testing purposes
      //   log.debug({
      //     title: 'Sleeping',
      //     details: inMS / 1000 + ' seconds'
      //   });
      //   // Get current date
      //   var obDate = new Date();
      //   // Add the ms argument to the current date
      //   var obNewDate = obDate.getTime() + inMS;
      //   // Compare current date with added ms to a new current date
      //   while (obNewDate > new Date()) {}
      // }

      return {
        execute: execute
      };
    }
);