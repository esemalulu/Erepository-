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
 *
 * Module Description
 *
 * Version    Date            Author           Remarks
 * 1.00       03 May 2016     cmartinez        This script reverses the NOI Pool Allowances upon credit memo submission.
 * 2.00	      10 May 2019     jostap   		     Added logic to 1) support multiple pools per item 2) create NOI transactions
 * 2.10       03 Sep 2019     dlapp            Added logic to add Item from
 * 2.11       24 Sep 2019     dlapp            Fixed rate on CM issue and create context issue
 * 2.12       17 Oct 2019     dlapp            Added setting of custcol_ifd_allowance_line when NOI Line item is added to Item Sublist
 * 2.13       22 Oct 2019     dlapp			   Added else statement in the case where Invoice lines don't have NOI following them
 * 2.14       28 Oct 2019     pries            TI 203 - added 'addNoiItems' logging, moved the continue from 2.13
 * 2.15       29 Oct 2019     pries            TI 281 - updated to only process 'creates'
 * 2.16		  21 Nov 2019	  jostap  		   TI 279 - CTDT-1127
 * 2.17       25 Nov 2019     pries            TI 279 - CTDT-1127 - added NOI allowance validation for CM 
 * 2.18       25 Nov 2019     pries            TI 279 - CTDT-1127 - added set NOI pool budget field on Credit Memo line 
 * 2.19		  6  Dec 2019     jostap           TI 279 - CTDT-1127 - indexOf correction
 * 2.20       9  Dec 2019     pries            TI 279 - CTDT 1127 - RA validation corrections
 * 2.21		  24 Jan 2020	  cmargallo		   TI 286 - New Field on NOI Transaction Records 
 * 2.22/23    21 Apr 2020     pries            TI 291 - correction for when one item is on an invoice more than once
 * 2.24       05 May 2020     pries            TI 286 - make the NOI Trans Qty a negative number
 */

/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 */
define(['N/record', 'N/search', 'N/error', 'N/task', 'N/runtime'], function (record, search, error, task, runtime) {
	function afterSubmit_rollbackToNOIBudget(context) {
		try {
			var stLoggerTitle = 'beforeSubmit_rollbackToNOIBudget';
			log.debug(stLoggerTitle, '=================== Entry Script ===================');

			//Exit if event is neither create nor edit
			// 2.15 - update - start
			//if (context.type !== context.UserEventType.CREATE && context.type !== context.UserEventType.EDIT) {
			if (context.type !== context.UserEventType.CREATE) {
				return;
			}

			addNOIItems(context);
			// 2.15 - update - end

			log.debug(stLoggerTitle, 'Credit Memo Id = ' + context.newRecord.id);

			// var recCreditMemo = context.newRecord;
			var recCreditMemo = record.load({
				type: record.Type.CREDIT_MEMO,
				id: context.newRecord.id
			});
			var intLines = recCreditMemo.getLineCount('item');

			var stCreatedFrom = recCreditMemo.getValue('createdfrom');
			log.debug(stLoggerTitle, 'Created From = ' + stCreatedFrom);

			//Exit if there's no parent invoice/transaction
			if (NSUtil.isEmpty(stCreatedFrom)) return;

			var transactionUpdates = [];

			//Loop through credit memo lines
			a: for (var intLine = 0; intLine < intLines; intLine++) {

				var itemID = recCreditMemo.getSublistValue('item', 'item', intLine);

				//Check if line is rebate line
				var stIsAllowanceLine = recCreditMemo.getSublistValue('item', 'custcol_ifd_allowance_line', intLine);

				//If line is a rebate line, skip
				if (stIsAllowanceLine == true) continue a;

				//Get quantity set by user
				var flQuantity = NSUtil.forceFloat(recCreditMemo.getSublistValue('item', 'quantity', intLine));

				//Get previous quantity rolled back to NOI
				var flOldRollbackQty = NSUtil.forceFloat(recCreditMemo.getSublistValue('item', 'custcol_ifd_rollbackqtytonoipool', intLine));

				var stNOIPool = recCreditMemo.getSublistValue('item', 'custcol_ifd_noi_pool_budget', intLine);

				log.debug(stLoggerTitle, 'Line index = ' + intLine
					+ ' | Quantity = ' + flQuantity
					+ ' | NOI Pools = ' + stNOIPool
					+ ' | Is Rebate Line = ' + stIsAllowanceLine
					+ ' | Old Rollback Qty = ' + flOldRollbackQty);

				var isValidNOI = stNOIPool.indexOf(':');

				if (isValidNOI === -1) {
					log.debug('Not a valid NOI format.  Exiting script...');
					continue a;
				}

				var noiPools = stNOIPool.split('|');

				noiPools.forEach(function (poolLine) {
					//Process each NOI Pool used in order to rollback amounts
					try {

						var poolUpdates = {};

						var poolValues = poolLine.split(':');
						log.debug(stLoggerTitle, 'poolValues: ' + JSON.stringify(poolValues));

						poolUpdates.item = itemID;
						
						// ADDED CMARGALLO TI 286 START
						poolUpdates.itemqty = (flQuantity * -1);           // 2.24 - updated
						// ADDED CMARGALLO TI 286 END

						//Internal Id of NOI Pool
						var stPoolId = Number(poolValues[0]);
						poolUpdates.pb = stPoolId;

						//NOI Pool amount used on parent Invoice
						var stPoolUsedAmount = Number(poolValues[1]);

						//Invoice Line Qty
						var flInvoiceLineQty = Number(poolValues[2]);

						log.debug(stLoggerTitle, 'Pool Values for Line: ' + intLine + ' ' + JSON.stringify({
							stPoolId: stPoolId,
							stPoolUsedAmount: stPoolUsedAmount,
							flInvoiceLineQty: flInvoiceLineQty
						}));

						//If pool id, used amount or item pool value is empty, or invoice qty empty, move to next NOI Pool
						if (NSUtil.isEmpty(stPoolId) || NSUtil.isEmpty(stPoolUsedAmount) || NSUtil.isEmpty(flInvoiceLineQty)) {
							return;
						}

						//Get NOI Pool values for Remaining Amount and Used Amount
						var objPool = search.lookupFields({
							type: 'customrecord_noi_pool_budget',
							id: stPoolId,
							columns: ['custrecord_pool3_start_amt', 'custrecord_pool_used_amt']
						});
						log.debug(stLoggerTitle, 'objPool: ' + JSON.stringify(objPool));

						//Compute previous rollback amount by multiplying previous rollback quantity and item pool allowance
						var flOldAmountToRollback = 0;
						if (flOldRollbackQty > 0) {
							flOldAmountToRollback = Number(stPoolUsedAmount * (flOldRollbackQty / flInvoiceLineQty));
						}

						//Reverse previous rollback amount
						var flOldRemainingAmount = NSUtil.forceFloat(objPool['custrecord_pool3_start_amt']) - flOldAmountToRollback;
						var flOldUsedAmount = NSUtil.forceFloat(objPool['custrecord_pool_used_amt']) + flOldAmountToRollback;

						log.debug(stLoggerTitle, 'Pool Id = ' + stPoolId
							+ ' | Old Remaining Amount = ' + flOldRemainingAmount
							+ ' | Old Used Amount = ' + flOldUsedAmount);

						//If new CM quantity is < invoice quantity, set new rollback quantity as invoice quantity
						var flNewRollbackQty = flQuantity;
						if (flQuantity > flInvoiceLineQty) {
							flNewRollbackQty = flInvoiceLineQty;
						}

						//Compute NEW rollback amount by multiplying new rollback quantity (quantity) and item pool allowance
						var flNewAmountToRollback = Number(stPoolUsedAmount * (flNewRollbackQty / flInvoiceLineQty));

						poolUpdates.amt = flNewAmountToRollback.toString();
						//Indicates negative value for Transaction update script
						poolUpdates.amt += '()';

						//Set new Remaining Amount and Used Amount
						var flNewRemainingAmount = flOldRemainingAmount + flNewAmountToRollback;
						var flNewUsedAmount = flOldUsedAmount - flNewAmountToRollback;
						log.debug(stLoggerTitle, 'flNewRemainingAmount: ' + flNewRemainingAmount + ' flNewUsedAmount: ' + flNewUsedAmount);

						//Update NOI Pool with new remaining and used amounts
						var stUpdatedPool = record.submitFields({
							type: 'customrecord_noi_pool_budget',
							id: stPoolId,
							values: {
								custrecord_pool3_start_amt: flNewRemainingAmount,
								custrecord_pool_used_amt: flNewUsedAmount
							},
							options: {
								enableSourcing: false,
								ignoreMandatoryFields: true
							}
						});

						//Set new rollback quantity value
						recCreditMemo.setSublistValue('item', 'custcol_ifd_rollbackqtytonoipool', intLine, flNewRollbackQty);




						log.audit(stLoggerTitle, 'Updated NOI Budget Pool = ' + stUpdatedPool);
						log.debug(stLoggerTitle, 'New Remaining Amount = ' + flNewRemainingAmount + ' | New Used Amount = ' + flNewUsedAmount);

						transactionUpdates.push(poolUpdates);
					}
					catch (error) {
						if (error.message != undefined) {
							log.error('Process Error', error.name + ' : ' + error.message);
						}
						else {
							log.error('Unexpected Error', error.toString());
						}
					}
				});



			}

			try {
				recCreditMemo.save();
			} catch (e) {
				if (error.message != undefined) {
					log.error('Process Error', error.name + ' : ' + error.message);
					throw error.message;
				}
				else {
					log.error('Unexpected Error', error.toString());
					throw error.create('99999', error.toString(), true);
				}
			}

			processTask(transactionUpdates, recCreditMemo);

			log.debug(stLoggerTitle, '=================== Exit Script ====================');
		}
		catch (error) {
			if (error.message != undefined) {
				log.error('Process Error', error.name + ' : ' + error.message);
				throw error.message;
			}
			else {
				log.error('Unexpected Error', error.toString());
				throw error.create('99999', error.toString(), true);
			}
		}
	}

	function addNOIItems(context) {
		// v2.10: START
		// Check if Created From is a Return Auth.
		try {
			var obCredMem = record.load({
				type: record.Type.CREDIT_MEMO,
				id: context.newRecord.id,
				isDynamic: true
			});
            var stCreatedFrom = obCredMem.getValue({ fieldId: 'createdfrom' });
            var obReturnAuthLookup = null;
            // v2.20 - added:
			
			var obCurScript = runtime.getCurrentScript();
			var stValidNOIAllItem = obCurScript.getParameter({ name: 'custscript_ns_valid_noiall_item' });

			try { // v2.11: Add Try Catch
				if (stCreatedFrom) {	//v2.16 start
					obReturnAuthLookup = search.lookupFields({
						type: search.Type.TRANSACTION,
						id: stCreatedFrom,
						columns: ['createdfrom', 'type']
                    });
                    // v2.20 - added:
					if (obReturnAuthLookup) {
                        var typeRA = obReturnAuthLookup.type[0].value;                        
						log.debug({
							title: 'addNOIItems',
							details: '    RA Type - ' + typeRA
						});
						if (typeRA !== 'RtnAuth') {
							log.debug({
								title: 'addNOIItems - Credit Memo not created from RA. exiting function',
								details: stCreatedFrom + ' -- ' + typeRA
							});
							return;
						}
					} else {
						log.debug({
							title: 'addNOIItems - Couldn\'t get Credit Memo fields, exiting function',
							details: ' Credit Memo Created From - ' + stCreatedFrom
						});
						return;
					}
				} else {
                    // v2.20 - added
					log.debug({
                        title: 'addNOIItems - No Credit Memo createdFrom, exiting function',
                        details: ''
                    });
                    return;
				}	//v2.16 end
			} catch (error) {
				log.error({
					title: 'addNOIItems - Return Authorization Lookup Error',
					details: error.toString()
				});
				return;
			}

			if (obReturnAuthLookup.createdfrom) {	//v2.17 start
				if (obReturnAuthLookup.createdfrom[0]) {
					var stInvoiceId = obReturnAuthLookup.createdfrom[0].value;
					log.debug({
						title: 'Return Authorization Created From',
						details: 'Invoice: ' + stInvoiceId
					});

					try {
						// Validate if RA Created From is Invoice, if so, load the Invoice
						var obInvoice = record.load({
							type: record.Type.INVOICE,
							id: stInvoiceId
                        });
                        
                        // Find NOI Allowance Item Lines and build Array of Objects
						var inInvItemCount = obInvoice.getLineCount({ sublistId: 'item' });
						var arInvItemData = [];
						var boNOIItems = false;

						for (var invItemIdx = 0; invItemIdx < inInvItemCount; invItemIdx++) {
							var obInvItemData = {};
							obInvItemData.item = obInvoice.getSublistValue({
								sublistId: 'item',
								fieldId: 'item',
								line: invItemIdx
							});
							obInvItemData.qty = obInvoice.getSublistValue({
								sublistId: 'item',
								fieldId: 'quantity',
								line: invItemIdx
							});
							obInvItemData.noipoolbudget = obInvoice.getSublistValue({
								sublistId: 'item',
								fieldId: 'custcol_ifd_noi_pool_budget',
								line: invItemIdx
							});
							obInvItemData.isallowanceline = obInvoice.getSublistValue({
								sublistId: 'item',
								fieldId: 'custcol_ifd_allowance_line',
								line: invItemIdx
							});
							obInvItemData.catchWeightItem = obInvoice.getSublistValue({
								sublistId: 'item',
								fieldId: 'custcol_cw_indicator',
								line: invItemIdx
							}); // v2.11
							obInvItemData.ranum = obInvoice.getSublistValue({
								sublistId: 'item',
								fieldId: 'custcol_ra',
								line: invItemIdx
							}); // v2.23

							if (invItemIdx != inInvItemCount - 1 && (obInvItemData.isallowanceline === false || obInvItemData.isallowanceline == 'F')) {
								var nextItemAllowance = obInvoice.getSublistValue({
									sublistId: 'item',
									fieldId: 'custcol_ifd_allowance_line',
									line: invItemIdx + 1
								});
								if (nextItemAllowance === true || nextItemAllowance == 'T') {
									obInvItemData.noiRate = obInvoice.getSublistValue({
										sublistId: 'item',
										fieldId: 'rate',
										line: invItemIdx + 1
									}); // v2.11

									// v2.11: If Item is Catch Weight Item...
									if (obInvItemData.catchWeightItem == 'T' || obInvItemData.catchWeightItem === true) {
										obInvItemData.noiAmt = obInvoice.getSublistValue({
											sublistId: 'item',
											fieldId: 'amount',
											line: invItemIdx + 1
										}); // v2.11
									}
								} else {            // v2.13 and 2.14
									continue;
								}
							}
							if (obInvItemData.isallowanceline === true || obInvItemData.isallowanceline == 'T') {
								boNOIItems = true;
							}

							obInvItemData.line = invItemIdx;
							arInvItemData.push(obInvItemData);
						}

						if (arInvItemData.length > 0) {
							log.debug({
								title: 'Invoice Item Array Data',
								details: JSON.stringify(arInvItemData)
							});
						}

						// If no NOI Allowance Item Lines are found, exit Script
						if (!boNOIItems) {
							log.audit({
								title: 'Exit Script',
								details: 'No NOI Allowance Items Found'
							});
							return;
						} else {
							// Compare lines on Invoice to Credit Memo
							var inCrMemItemCount = obCredMem.getLineCount({ sublistId: 'item' });

							for (var cmItemIdx = 0; cmItemIdx < inCrMemItemCount; cmItemIdx++) {
								// v2.17 - added
								var lineIsNOIAllowance = obCredMem.getSublistValue({
									sublistId: 'item',
									fieldId: 'custcol_ifd_allowance_line',
									line: cmItemIdx
								});
								if (lineIsNOIAllowance === true || lineIsNOIAllowance == 'T') {
									log.debug({
										title: 'CM Line NOI Allowance validation',
										details: 'Credit Memo line is an NOI Allowance. Skipping.'
									});
									continue;
								}
								var stCMItem = obCredMem.getSublistValue({
									sublistId: 'item',
									fieldId: 'item',
									line: cmItemIdx
								});
								var inCMItemQty = obCredMem.getSublistValue({
									sublistId: 'item',
									fieldId: 'quantity',
									line: cmItemIdx
								});
								var stCMNOIPoolBudget = obCredMem.getSublistValue({
									sublistId: 'item',
									fieldId: 'custcol_ifd_noi_pool_budget',
									line: cmItemIdx
								});
								for (var arIdx = 0; arIdx < arInvItemData.length; arIdx++) {
									var obInvItem = arInvItemData[arIdx];
									if (obInvItem.item == stCMItem) {
										log.debug({
											title: 'Line Item Validation',
											details: 'CM Item: ' + stCMItem + ' | Data Item: ' + obInvItem.item
										});

										// v2.23 - added
										if (!obInvItem.ranum || !stCreatedFrom || !obInvItem.noipoolbudget || (obInvItem.ranum !== stCreatedFrom || obInvItem.noipoolbudget  !== stCMNOIPoolBudget)) {
											log.debug({
											  title: 'Line Item Validation for line ' + arIdx + ' - RA Num',
											  details: 'Invoice line RA Number (' + obInvItem.ranum + ' doesn\'t match Created From RA (' + stCreatedFrom + ') - skipping.'
											});
											continue;
										} else {
											log.debug({
												title: 'Line Item Validation for line ' + arIdx + ' - RA Num',
												details: 'Inv. line RA Number (' + obInvItem.ranum + ' matches Created From RA (' + stCreatedFrom + ')'
											  });
										}

										// Insert new line below item line on Credit Memo
										if (inCrMemItemCount == 1 || inCrMemItemCount - 1 == cmItemIdx) {
											obCredMem.selectNewLine({
												sublistId: 'item'
											});
											// v2.14
											log.debug({
												title: 'New line selected',
												details: 'CM Item: ' + stCMItem
											});
										} else {
											obCredMem.insertLine({
												sublistId: 'item',
												line: cmItemIdx + 1
											});
											// v2.14
											log.debug({
												title: 'Line Item inserted',
												details: 'for ' + cmItemIdx + 1
											});
										}

										cmItemIdx++;
										inCrMemItemCount++;

										// Copy Item and NOI related fields from the Invoice onto new Credit Memo line
										obCredMem.setCurrentSublistValue({
											sublistId: 'item',
											fieldId: 'item',
											value: stValidNOIAllItem
										});
										// v2.12: Add setting of new checkbox field
										obCredMem.setCurrentSublistValue({
											sublistId: 'item',
											fieldId: 'custcol_ifd_allowance_line',
											value: true
										});
										// Set Qty of the new line to match the item above it
										obCredMem.setCurrentSublistValue({
											sublistId: 'item',
											fieldId: 'quantity',
											value: inCMItemQty
										});
										obCredMem.setCurrentSublistValue({
											sublistId: 'item',
											fieldId: 'rate',
											value: obInvItem.noiRate
										}); // v2.11: Update value property

										if (obInvItem.noiAmt) {
											obCredMem.setCurrentSublistValue({
												sublistId: 'item',
												fieldId: 'amount',
												value: obInvItem.noiAmt
											}); // v2.11
										}
										obCredMem.setCurrentSublistValue({
											sublistId: 'item',
											fieldId: 'custcol_ifd_noi_pool_budget',
											value: obInvItem.noipoolbudget
										}); // v2.18 - added
										// obCredMem.setCurrentSublistValue({
										// 	sublistId: 'item',
										// 	fieldId: 'amount',
										// 	value: 0
										// }); // v2.11: Remove
										obCredMem.commitLine({
											sublistId: 'item'
										});
										// v2.14
										log.debug({
											title: 'Committed Line Item',
											details: 'CM Item: ' + stCMItem + ' at line ' + cmItemIdx
										});
										break;   // v2.23
									}
								}
							}
							obCredMem.save();
							log.debug({
								title: 'Finish',
								details: 'Credit Memo Saved'
							});

						}
					} catch (error) {
						log.error({
							title: 'INV Load Failed',
							details: error.toString()
						});
						return;
					}
				}
			} //v2.17 end

		} catch (error) {
			log.error({
				title: 'RA Created From Type Validation Failed',
				details: error.toString()
			});
			return;
		}
		// v2.10: FINISH
	}

	function processTask(transactionUpdates, creditMemoRec) {
		var stStep = 'Process Task',
			stScParam = '';

		// Use data object to create data string to pass onto other Scheduled Script
		for (arBpIdx = 0; arBpIdx < transactionUpdates.length; arBpIdx++) {

			//v1.08
			if (arBpIdx > 0 && arBpIdx !== (transactionUpdates.length)) {
				stScParam += '|';
			}

			//if (transactionUpdates[arBpIdx].ffs === false || transactionUpdates[arBpIdx].ffs === 'F') { //COMMENT v1.06
			// UPDATED CMARGALLO TI 286 START
			// stScParam += creditMemoRec.id + '@' + transactionUpdates[arBpIdx].item + '@' + transactionUpdates[arBpIdx].pb + '-' + transactionUpdates[arBpIdx].amt;
			stScParam += creditMemoRec.id + '@' + transactionUpdates[arBpIdx].item + '@' + transactionUpdates[arBpIdx].pb + '-' + transactionUpdates[arBpIdx].amt + '@' + transactionUpdates[arBpIdx].itemqty;
			// UPDATED CMARGALLO TI 286 END
			// | stInvId @ stItemId @ stNoiId - stAmt , stNoiId - stAmt |
			//}
		}

		if (!NSUtil.isEmpty(stScParam)) {
			log.debug({
				title: stStep,
				details: 'Scheduled Script Parameter: ' + stScParam
			});

			var obScTask = task.create({
				taskType: task.TaskType.SCHEDULED_SCRIPT,
				scriptId: 'customscript_sc_noi_pool_trans_update',
				deploymentId: 1,
				params: {
					custscript_ifd_data_to_update: stScParam
				}
			});

			try {
				var stScTaskId = obScTask.submit();
				var obScTaskStatus = task.checkStatus({
					taskId: stScTaskId
				});

				log.audit({
					title: stStep,
					details: 'Task Status: ' + obScTaskStatus.status
				});

			} catch (error) {
				stStep = 'Task Error';
				log.error({
					title: stStep,
					details: error.toString()
				});
			}
		}
	}

	return {
		afterSubmit: afterSubmit_rollbackToNOIBudget
	}
});


/**
 * Copyright (c) 1998-2016 NetSuite, Inc.
 * 2955 Campus Drive, Suite 100, San Mateo, CA, USA 94403-2511
 * All Rights Reserved.
 *
 * This software is the confidential and proprietary information of NetSuite, Inc. ("Confidential Information").
 * You shall not disclose such Confidential Information and shall use it only in accordance with the terms of the license agreement
 * you entered into with NetSuite.
 */

/**
 * Module Description:
 *
 * Compilation of utility functions that utilizes SuiteScript API
 *
 * Version    Date				Author				Remarks
 * 1.00       June 8, 2016		MTS Team			Initial version.
 *
 */

var NSUtil =
{
	/**
	 * Evaluate if the given string or object value is empty, null or undefined.
	 * @param {String} stValue - string or object to evaluate
	 * @returns {Boolean} - true if empty/null/undefined, false if not
	 * @author mmeremilla
	 */
	isEmpty: function (stValue) {
		if ((stValue === '') //Strict checking for this part to properly evaluate integer value.
			|| (stValue == null) || (stValue == undefined)) {
			return true;
		}
		else {
			if (stValue.constructor === Array)//Strict checking for this part to properly evaluate constructor type.
			{
				if (stValue.length == 0) {
					return true;
				}
			}
			else if (stValue.constructor === Object)//Strict checking for this part to properly evaluate constructor type.
			{
				for (var stKey in stValue) {
					return false;
				}
				return true;
			}

			return false;
		}
	},

	/**
	 * Shorthand version of isEmpty
	 *
	 * @param {String} stValue - string or object to evaluate
	 * @returns {Boolean} - true if empty/null/undefined, false if not
	 * @author bfeliciano
	 */
	_isEmpty: function (stValue) {
		return ((stValue === '' || stValue == null || stValue == undefined)
			|| (stValue.constructor === Array && stValue.length == 0)
			|| (stValue.constructor === Object && (function (v) { for (var k in v) return false; return true; })(stValue)));
	},

	/**
	 * Converts string to float. If value is infinity or can't be converted to a number, 0.00 will be returned.
	 * @param {String} stValue - any string
	 * @returns {Number} - a floating point number
	 * @author jsalcedo
	 */
	forceFloat: function (stValue) {
		var flValue = parseFloat(stValue);

		if (isNaN(flValue) || (stValue == Infinity)) {
			return 0.00;
		}

		return flValue;
	},

	/**
	 * Converts string to integer. If value is infinity or can't be converted to a number, 0 will be returned.
	 * @param {String} stValue - any string
	 * @returns {Number} - an integer
	 * @author jsalcedo
	 */
	forceInt: function (stValue) {
		var intValue = parseInt(stValue);

		if (isNaN(intValue) || (stValue == Infinity)) {
			return 0;
		}

		return intValue;
	}
};