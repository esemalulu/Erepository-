/**
 * Copyright (c) 1998-2017 NetSuite, Inc.
 * 2955 Campus Drive, Suite 100, San Mateo, CA, USA 94403-2511
 * All Rights Reserved.
 *
 * This software is the confidential and proprietary information of
 * NetSuite, Inc. ("Confidential Information"). You shall not
 * disclose such Confidential Information and shall use it only in
 * accordance with the terms of the license agreement you entered into
 * with NetSuite.
 * 
 * 
 * This script gets the cost associated with the applicable Landed Cost categories 
 * from the Item receipts and calculate the Frozen Cost as the sum of Purchase Price
 * and the Landed Costs attributes. The Landed Cost attribute values for each item will be 
 * pulled from the GL impact of the Item Receipt transaction which will be used in 
 * determining the Frozen Landed Cost.
 *
 * Version    Date            Author           	Remarks
 * 1.0        17 May 2017     Pedro Barrios		initial script
 */

 var TRANSACTION_TYPE = '';
 var TRANSACTION_ID = '';

 function scheduled_setAllowanceOnInvoice(){
 	try
 	{
 		nlapiLogExecution('debug', '============== entry ================');
 		var stLoggerTitle = 'scheduled script';
 		var objContext = nlapiGetContext();
 		nlapiLogExecution('debug', 'Getting params');

		//Get script parameters
		var stParamCommoditytypeAll = objContext.getSetting('script', 'custscript_ifd_commtype_all');
		var stParamCommoditytypePartial = objContext.getSetting('script', 'custscript_ifd_commtype_partial');
		var stParamCommoditytypeAlternate = objContext.getSetting('script', 'custscript_ifd_commtype_alternate');
		var stParamItem = objContext.getSetting('script', 'custscript_ifd_item');
		var stParamItemClass = objContext.getSetting('script', 'custscript_ifd_disc_line_class');
		var stParamItemLocation = objContext.getSetting('script', 'custscript_ifd_disc_line_location');
 		nlapiLogExecution('debug', 'Validating params');

		//Throw error if a script parameter is empty
		if (Eval.isEmpty(stParamCommoditytypeAll))
			throw nlapiCreateError('99999', 'Missing script parameter: Commodity Type - All');
		if (Eval.isEmpty(stParamCommoditytypePartial))
			throw nlapiCreateError('99999', 'Missing script parameter: Commodity Type - Partial');
		if (Eval.isEmpty(stParamCommoditytypeAlternate))
			throw nlapiCreateError('99999', 'Missing script parameter: Commodity Type - Alternate');
		if (Eval.isEmpty(stParamItem))
			throw nlapiCreateError('99999', 'Missing script parameter: Commodity Allowance Item');
		if (Eval.isEmpty(stParamItemClass))
			throw nlapiCreateError('99999', 'Missing script parameter: Discount Line Class');
		if (Eval.isEmpty(stParamItemLocation))
			throw nlapiCreateError('99999', 'Missing script parameter: Discount Line Location');

		nlapiLogExecution('debug', stLoggerTitle, 'Script Parameters: Commodity Type: All = ' + stParamCommoditytypeAll + ' | Commodity Type: Partial = ' + stParamCommoditytypePartial + ' | Commodity Type: Alternate = ' + stParamCommoditytypeAlternate + ' | Commodity Allowance Item = ' +
			stParamItem + ' | Discount Line Class = ' + stParamItemClass + ' | Discount Line Location = ' + stParamItemLocation);

		nlapiLoadSearch('transaction','customsearch_allowance_transactions_sear');
		var search  = nlapiSearchRecord('transaction','customsearch_allowance_transactions_sear');

		if(!search || search.length < 1)
		{
			nlapiLogExecution('debug', 'no transactions to process');
			return;
		}
		nlapiLogExecution('debug', 'search.length = ' + search.length);
		for(var iterator = 0; iterator<search.length; iterator++)
		{
			try{
				nlapiLogExecution('debug','iterator ' + iterator);
				var stRecordType = search[iterator].getValue('recordtype');
				var stRecordId = search[iterator].getId();
				nlapiLogExecution('debug', 'stRecordType = ' + stRecordType );
				nlapiLogExecution('debug', 'stRecordId = ' + stRecordId );
				TRANSACTION_TYPE = stRecordType;
				TRANSACTION_ID = stRecordId;
				var objParams = {};
				objParams.stParamCommoditytypeAll = stParamCommoditytypeAll;
				objParams.stParamCommoditytypePartial = stParamCommoditytypePartial;
				objParams.stParamCommoditytypeAlternate = stParamCommoditytypeAlternate;
				objParams.stParamItem = stParamItem;
				objParams.stParamItemClass = stParamItemClass;
				objParams.stParamItemLocation = stParamItemLocation;


				//dhoferica [03/27/2017]: Variable used for scheduled script parameter
				var stScParam = '';

				//Load invoice record
				var recInvoice = nlapiLoadRecord(stRecordType, stRecordId);
				var stCustomer = recInvoice.getFieldValue('entity');
				var intLines = recInvoice.getLineItemCount('item');
				var stCustomerCategory = nlapiLookupField('customer', stCustomer, 'custentityifd_chain_name');

				//Remove pre-existing discount lines
				for (var intLine = intLines; intLine >= 1; intLine--) {
					var stIsAllowanceLine = recInvoice.getLineItemValue('item', 'custcol_ifd_allowance_line', intLine);
					if (stIsAllowanceLine == 'T') {
						recInvoice.removeLineItem('item', intLine);
					}
				}

				nlapiLogExecution('debug', stLoggerTitle, 'Invoice id = ' + stRecordId + ' | Customer category =' + stCustomerCategory);

				//Search for NOI Pool Budgets using customer as filter
				var arrNOIPoolResults = getNOIPoolBudgetsForCustomer(stCustomer, stCustomerCategory);
				nlapiLogExecution('debug', stLoggerTitle, 'arrNOIPoolResults = ' + arrNOIPoolResults.length);
				//If there are NOI Pool Budgets found, continue processing
				if (!Eval.isEmpty(arrNOIPoolResults)) 
				{
					nlapiLogExecution('debug', stLoggerTitle, 'arrNOIPoolResults = ' + arrNOIPoolResults.length);

					intLines = recInvoice.getLineItemCount('item');
				    //Loop through line items to compute allowance amount from NOI pools
				    for (var intLine = 1; intLine <= intLines; intLine++) {
				    	var stLineItem = recInvoice.getLineItemValue('item', 'item', intLine);
				    	var flQuantity = Parse.forceFloat(recInvoice.getLineItemValue('item', 'quantity', intLine));
				    	var stNOIFlag = recInvoice.getLineItemValue('item', 'custcol_ifd_noi_pool_budget', intLine);
				    	var stIsAllowanceLine = recInvoice.getLineItemValue('item', 'custcol_ifd_allowance_line', intLine);

				    	nlapiLogExecution('debug', stLoggerTitle, 'Processing... Item = ' + stLineItem + ' | Quantity = ' + flQuantity + ' | intLine = ' + intLine + ' | NOI Flag = ' + stNOIFlag);

					//If line item is not a discount item and quantity is greater than 0, continue processing for NOI Allowance
					if (stIsAllowanceLine != 'T' && flQuantity > 0) {
						nlapiLogExecution('debug', stLoggerTitle, 'Processing... Item = ' + stLineItem + ' | QUANTITY = ' + recInvoice.getLineItemValue('item', 'quantity', intLine));

						var objAllowances = null;
						var flAllowanceAmount = 0;
						var stAmountsFromPools = '';
					    var stIsFeeForService = nlapiLookupField('inventoryitem', stLineItem, 'custitem_ifd_noi_feeforservice'); //'';

					    //Compute allowance amount/discount for the line item
					    if (!Eval.isEmpty(stLineItem)) {
					    	objAllowances = computeAllowanceAmount(stCustomer, stLineItem, flQuantity, objParams, arrNOIPoolResults);
					    }

					    if (!Eval.isEmpty(objAllowances)) {
					    	flAllowanceAmount = objAllowances['flAllowanceAmount'];
					    	stAmountsFromPools = objAllowances['stAmountsFromPools'];
					    	stIsFeeForService = objAllowances['stIsFeeForService'];
					    }

					    nlapiLogExecution('debug', stLoggerTitle, '*** flAllowanceAmount = ' + flAllowanceAmount + ' | stAmountsFromPools = ' + stAmountsFromPools + ' | stIsFeeForService = ' + stIsFeeForService);

					    //Set discount line if allowance/rebate amount is greater than zero and if item is not fee for service
					    if (flAllowanceAmount > 0 && stRecordType == 'invoice') {
					    	var flAllowanceRate = (flAllowanceAmount / flQuantity) * -1;
					    	recInvoice.selectLineItem('item', intLine);
					    	recInvoice.setCurrentLineItemValue('item', 'custcol_ifd_noi_pool_budget', stAmountsFromPools);
					    	recInvoice.commitLineItem('item');

						//dhoferica [03/27/2017]: Create value of parameter 'Data to Update' for scheduled script 'Update NOI Transactions' on NOI Pool Budget record
						var stItemIdScParam = recInvoice.getCurrentLineItemValue('item', 'item');
						//dhoferica [03/27/2017]: Format of parameter <InvoiceID>@<ItemId>@<stAmountFromPool>| (example: '210305@1386@228-22.2/5.55|')
						stScParam = stScParam + stRecordId + '@' + stItemIdScParam + '@' + stAmountsFromPools + '|';

						if (stIsFeeForService == 'F') {
							if (intLine < intLines) {
								nlapiLogExecution('debug', stLoggerTitle, 'intLine = ' + intLine + ' | intLines = ' + intLines);
								nlapiLogExecution('debug', stLoggerTitle, 'amount = ' + flAllowanceAmount * -1 + ' | quantity = ' + flQuantity);

								recInvoice.insertLineItem('item', intLine + 1);

							//Set discount item for discount/rebate line
							recInvoice.setLineItemValue('item', 'item', intLine + 1, objParams.stParamItem);
							//Set discount amount
							recInvoice.setLineItemValue('item', 'amount', intLine + 1, flAllowanceAmount * -1);
							recInvoice.setLineItemValue('item', 'class', intLine + 1, objParams.stParamItemClass);
							recInvoice.setLineItemValue('item', 'location', intLine + 1, objParams.stParamItemLocation);
							//Set NOI Pool and Used Amount
							recInvoice.setLineItemValue('item', 'custcol_ifd_noi_pool_budget', intLine + 1, stAmountsFromPools);
							recInvoice.setLineItemValue('item', 'custcol_ifd_allowance_line', intLine + 1, 'T');
							recInvoice.setLineItemValue('item', 'quantity', intLine + 1, flQuantity);
							recInvoice.setLineItemValue('item', 'rate', intLine + 1, flAllowanceRate);

							intLines++;

						}

						else {
							nlapiLogExecution('debug', stLoggerTitle, 'intLine = ' + intLine + ' | intLines = ' + intLines);
							nlapiLogExecution('debug', stLoggerTitle, 'amount = ' + flAllowanceAmount * -1 + ' | quantity = ' + flQuantity);

							recInvoice.selectNewLineItem('item');
							//Set discount item for discount/rebate line
							recInvoice.setCurrentLineItemValue('item', 'item', objParams.stParamItem);
							//Set discount amount
							recInvoice.setCurrentLineItemValue('item', 'amount', flAllowanceAmount * -1);
							recInvoice.setCurrentLineItemValue('item', 'class', objParams.stParamItemClass);
							recInvoice.setCurrentLineItemValue('item', 'location', objParams.stParamItemLocation);
							//Set NOI Pool and Used Amount
							recInvoice.setCurrentLineItemValue('item', 'custcol_ifd_noi_pool_budget', stAmountsFromPools);
							recInvoice.setCurrentLineItemValue('item', 'custcol_ifd_allowance_line', 'T');
							recInvoice.setCurrentLineItemValue('item', 'quantity', flQuantity);
							recInvoice.setCurrentLineItemValue('item', 'rate', flAllowanceRate);
							recInvoice.commitLineItem('item');
						}
					}
				}
						//Shraddha Shah [04/4/2017]: updated to close Fee For Service Items where allowance is 0
						else if ( stRecordType == 'salesorder' && flAllowanceAmount <= 0 && stIsFeeForService == 'T')
						{
							try{
								recInvoice.selectLineItem('item', intLine);
								recInvoice.setCurrentLineItemValue('item', 'isclosed', 'T');
								recInvoice.setCurrentLineItemValue('item', 'isopen', 'F');
								recInvoice.commitLineItem('item');
							}catch(e){
								throw e;}
								nlapiLogExecution('debug', stLoggerTitle, 'Inside allowance =0' + stRecordType);
							}
						}
					}
				}

				//dhoferica [03/27/2017]: Call scheduled script 'Update NOI Transactions' which creates NOI Transaction entries on NOI Pool Budget records
				if (!Eval.isEmpty(stScParam)) {
				    //dhoferica [03/27/2017]: Remove last occurence of '|' split char
				    stScParam = stScParam.substring(0, stScParam.length - 1);
				    var params = {
				    	custscript_ifd_data_to_update : stScParam
				    };
				    nlapiScheduleScript('customscript_sc_noi_pool_trans_update', null, params)
				}

				//Submit invoice
				recInvoice.setFieldValue('custbody_transaction_to_be_processed','F');
				var stSubmittedSO = nlapiSubmitRecord(recInvoice, true, true);
				nlapiLogExecution('audit', stLoggerTitle, 'Submitted invoice. Id = ' + stSubmittedSO);
			}catch(erro)
			{
				transactionError(erro);
			}
			nlapiLogExecution('debug', 'iteration finished');
		}


	}catch(err)
	{
		handleError(err);
	}
}


function transactionError(error)
{
	var errorDetails = '';
	 if (error.getDetails != undefined) {
 		errorDetails =  error.getDetails();
  	}else{
  		errorDetails = 'Unknown';
  	}
	nlapiLogExecution('audit', 'failed transaction', 'Type = '+ TRANSACTION_TYPE + ' , ID = '+TRANSACTION_ID + ' Details = ' + errorDetails);
}
/**
 * Compute for the rebate amount for the line item based on item pool allowance.
 * 
 * @param stCustomer
 * @param stLineItem
 * @param flQuantity
 * @param objParams
 * @param arrNOIPoolResults
 * @returns
 */
 function computeAllowanceAmount(stCustomer, stLineItem, flQuantity, objParams, arrNOIPoolResults) {
 	try {
 		var stLoggerTitle = 'computeAllowanceAmount';

 		var objAllowances = null;
 		var flAllowanceAmount = 0;
 		var arrAmountsFromPools = [];
 		var arrNOIPoolsUsed = [];
 		var arrNOINewUsedAmount = [];

	//Get commodity type of item
	var objItem = nlapiLookupField('item', stLineItem, [ 'custitem_ifd_commodity_type', 'custitem_ifd_noi_feeforservice' ]);
	objItem.stItemCommodityType = objItem['custitem_ifd_commodity_type'];
	//6/10/2016 cmartinez: check if item is fee for service
	objItem.stIsFeeForService = objItem['custitem_ifd_noi_feeforservice'];

	nlapiLogExecution('debug', stLoggerTitle, 'COMMODITY TYPE OF ITEM = ' + objItem.stItemCommodityType);

	//Search for Item Pool Budget records

	var arrItemPoolResults = getItemPoolAllowancesForItem(stLineItem);

	//If there are no item pools, exit
	if (Eval.isEmpty(arrItemPoolResults) || Eval.isEmpty(objItem.stItemCommodityType))
		return null;

	nlapiLogExecution('debug', stLoggerTitle, 'arrItemPoolResults = ' + arrItemPoolResults.length);

	var boolUpdatePools = true;
	//Loop through item pools
	itemPools: for (var intItemPool = 0; intItemPool < arrItemPoolResults.length; intItemPool++) {
		var objItemPool = {};
		objItemPool.stItemPooId = arrItemPoolResults[intItemPool].id;
		objItemPool.stItemPoolName = arrItemPoolResults[intItemPool].getValue('custrecord_item_pool_name');
		objItemPool.stItemPoolNameText = arrItemPoolResults[intItemPool].getText('custrecord_item_pool_name');
		objItemPool.stItemPoolAlternate = arrItemPoolResults[intItemPool].getValue('custrecord_ifd_item_pool_alternatename');
		objItemPool.flItemAllowance = Parse.forceFloat(arrItemPoolResults[intItemPool].getValue('custrecord_item_alternate_remain_amt'));

		nlapiLogExecution('debug', stLoggerTitle, '--- PROCESSING Item Pool Allowance = ' + objItemPool.stItemPooId + ' | Pool Name = ' + objItemPool.stItemPoolNameText);

	    //Loop through NOI Budget pools
	    noiPools: for (var intNOIPool = 0; intNOIPool < arrNOIPoolResults.length; intNOIPool++) {
	    	var objNOIPool = {};
	    	objNOIPool.stNOIPoolId = arrNOIPoolResults[intNOIPool].id;
	    	objNOIPool.stNOIPoolName = arrNOIPoolResults[intNOIPool].getValue('custrecord_pool_name');
	    	objNOIPool.flNOIRemainingAmount = Parse.forceFloat(nlapiLookupField('customrecord_noi_pool_budget', objNOIPool.stNOIPoolId, 'custrecord_pool3_start_amt'));
	    	objNOIPool.flNOIPoolUsedAmount = Parse.forceFloat(arrNOIPoolResults[intNOIPool].getValue('custrecord_pool_used_amt'));
	    	objNOIPool.flNOIStartingAmount = Parse.forceFloat(arrNOIPoolResults[intNOIPool].getValue('custrecordpool_start_amount'));

		//Check if Item pool and NOI budget pool match and if Item Pool is PRIMARY
		if (objItemPool.stItemPoolName == objNOIPool.stNOIPoolName) {
			var flTotalItemPoolRebate = objItemPool.flItemAllowance * flQuantity;
			flTotalItemPoolRebate = roundOffValue(flTotalItemPoolRebate, 2);

			var flNOIRemainingAmountDynamic = 0;
		    //Check if NOI Pool has been used for this line item
		    if (Eval.inArray(objNOIPool.stNOIPoolId, arrNOIPoolsUsed)) {
		    	nlapiLogExecution('debug', stLoggerTitle, 'NOI Budget already USED for line item.');
		    	var intIndexOfElement = arrNOIPoolsUsed.indexOf(objNOIPool.stNOIPoolId);
			//If yes, subtract running amount used to remaining amount, then evaluate if sufficient for item rebate
			if (intIndexOfElement > -1) {
				var flAmountUsed = arrNOINewUsedAmount[intIndexOfElement];
				flNOIRemainingAmountDynamic = objNOIPool.flNOIRemainingAmount - flAmountUsed;
				flNOIRemainingAmountDynamic = roundOffValue(flNOIRemainingAmountDynamic, 2);
			}
		} else {
			nlapiLogExecution('debug', stLoggerTitle, 'NOI Budget NOT YET USED for line item.');
			//If not, use remaining amount from search result to evaluate if sufficient
			flNOIRemainingAmountDynamic = objNOIPool.flNOIRemainingAmount;
		}

		nlapiLogExecution('debug', stLoggerTitle, '--------- MATCHING NOI Pool Budget and Item Pool. ' + ' | NOI POOL BUDGET = ' + objNOIPool.stNOIPoolId + ' | stItemPoolName = ' + objItemPool.stItemPoolName + ' | stNOIPoolName = ' + objNOIPool.stNOIPoolName +
			' | NOI REMAINING AMOUNT = ' + flNOIRemainingAmountDynamic + ' | ITEM POOL ALLOWANCE = ' + objItemPool.flItemAllowance + ' | TOTAL ITEM POOL REBATE = ' + flTotalItemPoolRebate);

		    //If Rebatable amount from Item Pool is less than or equal remaining amount, give rebate amount. Check to avoid negative NOI Budget.
		    if (flTotalItemPoolRebate <= flNOIRemainingAmountDynamic) {
		    	flAllowanceAmount += flTotalItemPoolRebate;

		    	nlapiLogExecution('debug', stLoggerTitle, '*** m amount is sufficient. RUNNING flAllowanceAmount = ' + flAllowanceAmount);

			//Check if NOI Pool has been used for this line item
			var flAmountUsed = 0;
			if (Eval.inArray(objNOIPool.stNOIPoolId, arrNOIPoolsUsed)) {
				var intIndexOfElement = arrNOIPoolsUsed.indexOf(objNOIPool.stNOIPoolId);
			    //If yes, get current running amount used for the NOI budget, then update array with running amount + item rebate amount
			    if (intIndexOfElement > -1) {
			    	flAmountUsed = arrNOINewUsedAmount[intIndexOfElement];
			    	flAmountUsed += flTotalItemPoolRebate;
			    	arrNOINewUsedAmount[intIndexOfElement] = flAmountUsed;
			    }
			} else {
			    //Else, push NOI Budget id and used amount into arrays
			    flAmountUsed = flTotalItemPoolRebate;
			    arrNOIPoolsUsed.push(objNOIPool.stNOIPoolId);
			    arrNOINewUsedAmount.push(flTotalItemPoolRebate);
			}

			nlapiLogExecution('audit', stLoggerTitle, 'NEW AMOUNT USED FROM NOI POOL = ' + flAmountUsed);

			var stAmountFromPool = objNOIPool.stNOIPoolId + '-' + flTotalItemPoolRebate + '/' + objItemPool.flItemAllowance;
			arrAmountsFromPools.push(stAmountFromPool);
		}

		    //Else, exit and move to next line item
		    else {
			//If commodity type is All, proceed to next item
			if (objItem.stItemCommodityType == objParams.stParamCommoditytypeAll) {
				nlapiLogExecution('debug', stLoggerTitle, 'Remaining amount is NOT sufficient. Will move to next item.');
				boolUpdatePools = false;
				break itemPools;
			}

			//If commodity type is Alternate, check if there's an alternate item pool to process
			else if (objItem.stItemCommodityType == objParams.stParamCommoditytypeAlternate) {
				nlapiLogExecution('debug', stLoggerTitle, 'Remaining PRIMARY amount is NOT sufficient. Will check for ALTERNATE pool.');

				if (!Eval.isEmpty(objItemPool.stItemPoolAlternate)) {
					nlapiLogExecution('debug', stLoggerTitle, 'ALTERNATE POOL ID = ' + objItemPool.stItemPoolAlternate);

					var objItemPoolAlternate = nlapiLookupField('customrecord_item_pool_budget', objItemPool.stItemPoolAlternate, [ 'custrecord_item_pool_name', 'custrecord_item_alternate_remain_amt' ]);
					objItemPoolAlternate.stItemPoolNameAlt = objItemPoolAlternate['custrecord_item_pool_name'];
					objItemPoolAlternate.flItemAllowanceAlt = Parse.forceFloat(objItemPoolAlternate['custrecord_item_alternate_remain_amt']);

				//Check if Item pool and NOI budget pool match and if Item Pool is ALTERNATE
				if (objItemPoolAlternate.stItemPoolNameAlt == objNOIPool.stNOIPoolName) {
					var flTotalItemPoolRebate = objItemPoolAlternate.flItemAllowanceAlt * flQuantity;
					flTotalItemPoolRebate = roundOffValue(flTotalItemPoolRebate, 2);

					var flNOIRemainingAmountDynamic = 0;
				    //Check if NOI Pool has been used for this line item
				    if (Eval.inArray(objNOIPool.stNOIPoolId, arrNOIPoolsUsed)) {
				    	nlapiLogExecution('debug', stLoggerTitle, 'NOI Budget already USED for line item.');
				    	var intIndexOfElement = arrNOIPoolsUsed.indexOf(objNOIPool.stNOIPoolId);
					//If yes, subtract running amount used to remaining amount, then evaluate if sufficient for item rebate
					if (intIndexOfElement > -1) {
						var flAmountUsed = arrNOINewUsedAmount[intIndexOfElement];
						flNOIRemainingAmountDynamic = objNOIPool.flNOIRemainingAmount - flAmountUsed;
						flNOIRemainingAmountDynamic = roundOffValue(flNOIRemainingAmountDynamic, 2);
					}
				} else {
					nlapiLogExecution('debug', stLoggerTitle, 'NOI Budget NOT YET USED for line item.');
					//If not, use remaining amount from search result to evaluate if sufficient
					flNOIRemainingAmountDynamic = objNOIPool.flNOIRemainingAmount;
				}

				nlapiLogExecution('debug', stLoggerTitle, '--------- PROCESSING ALTERNATE POOL. ' + ' | NOI REMAINING AMOUNT = ' + flNOIRemainingAmountDynamic + ' | (ALT) ITEM POOL ALLOWANCE = ' + objItemPoolAlternate.flItemAllowanceAlt + ' | (ALT) TOTAL ITEM POOL REBATE = ' +
					flTotalItemPoolRebate);

				    //If Rebatable amount from Item Pool is less than or equal remaining amount, give rebate amount
				    if (flTotalItemPoolRebate <= flNOIRemainingAmountDynamic) {
				    	flAllowanceAmount += flTotalItemPoolRebate;

				    	nlapiLogExecution('debug', stLoggerTitle, '*** Remaining ALTERNATE amount is sufficient. RUNNING flAllowanceAmount = ' + flAllowanceAmount);

					//Check if NOI Pool has been used for this line item
					var flAmountUsed = 0;
					if (Eval.inArray(objNOIPool.stNOIPoolId, arrNOIPoolsUsed)) {
						var intIndexOfElement = arrNOIPoolsUsed.indexOf(objNOIPool.stNOIPoolId);
					    //If yes, get current running amount used for the NOI budget, then update array with running amount + item rebate amount
					    if (intIndexOfElement > -1) {
					    	flAmountUsed = arrNOINewUsedAmount[intIndexOfElement];
					    	flAmountUsed += flTotalItemPoolRebate;
					    	arrNOINewUsedAmount[intIndexOfElement] = flAmountUsed;
					    }
					} else {
					    //Else, push NOI Budget id and used amount into arrays
					    flAmountUsed = flTotalItemPoolRebate;
					    arrNOIPoolsUsed.push(objNOIPool.stNOIPoolId);
					    arrNOINewUsedAmount.push(flTotalItemPoolRebate);
					}

					nlapiLogExecution('debug', stLoggerTitle, 'NEW USED AMOUNT FROM NOI POOL = ' + flAmountUsed);

					var stAmountFromPool = objNOIPool.stNOIPoolId + '-' + flTotalItemPoolRebate + '/' + objItemPoolAlternate.flItemAllowanceAlt;
					arrAmountsFromPools.push(stAmountFromPool);
				} else {
					nlapiLogExecution('debug', stLoggerTitle, 'Remaining ALTERNATE amount still NOT sufficient. Will move to next item.');
					boolUpdatePools = false;
					break itemPools;
				}
			} else {
				nlapiLogExecution('debug', stLoggerTitle, 'POOL NAMES DO NOT MATCH.');
				boolUpdatePools = false;
				break itemPools;
			}
		} else {
			nlapiLogExecution('debug', stLoggerTitle, 'NO ALTERNATE POOL FOUND.');
			boolUpdatePools = false;
			break itemPools;
		}
	}

			//If commodity type is Partial, loop through all NOI Budgets to check all possible matches
		}

		    //Once script has found matching NOI Pool for item pool, move to next item pool 
		    break noiPools;
		}
	}
}

	//Update remaining amounts and used amounts in the NOI Pools
	if (boolUpdatePools) {
		nlapiLogExecution('debug', stLoggerTitle, 'arrNOIPoolsUsed = ' + arrNOIPoolsUsed.length);
		for (var intPool = 0; intPool < arrNOIPoolsUsed.length; intPool++) {
			var stPoolId = arrNOIPoolsUsed[intPool];
			var objPool = nlapiLookupField('customrecord_noi_pool_budget', stPoolId, [ 'custrecord_pool3_start_amt', 'custrecord_pool_used_amt' ]);

			var flRemainingAmount = Parse.forceFloat(objPool['custrecord_pool3_start_amt']) - Parse.forceFloat(arrNOINewUsedAmount[intPool]);
			var flUsedAmount = Parse.forceFloat(objPool['custrecord_pool_used_amt']) + Parse.forceFloat(arrNOINewUsedAmount[intPool]);

			nlapiSubmitField('customrecord_noi_pool_budget', stPoolId, [ 'custrecord_pool3_start_amt', 'custrecord_pool_used_amt' ], [ flRemainingAmount, flUsedAmount ]);
			nlapiLogExecution('audit', stLoggerTitle, 'Updated NOI Pool Budgets. Id = ' + stPoolId);
		}

		var stAmountsFromPools = arrAmountsFromPools.join(',');

		objAllowances = {};
		objAllowances['flAllowanceAmount'] = flAllowanceAmount;
		objAllowances['stAmountsFromPools'] = stAmountsFromPools;
		objAllowances['stIsFeeForService'] = objItem.stIsFeeForService;
	}

	return objAllowances;

} catch (error) {
	handleError(error);
}
}

/**
 * Get NOI Pool Budgets linked to customer or customer category.
 * 
 * @param stCustomer
 * @param stCustomerCategory
 * @returns {Array}
 */
 function getNOIPoolBudgetsForCustomer(stCustomer, stCustomerCategory) {
 	var arrResult = [];

 	var arrSearchFilters = [];
 	if (!Eval.isEmpty(stCustomerCategory)) {
 		arrSearchFilters = [ [ 'custrecord_noi_pool_bud_customer', 'is', stCustomer ], 'OR', [ 'custrecord_pool_group_customer', 'is', stCustomerCategory ] ];
 	} else {
 		arrSearchFilters = [ new nlobjSearchFilter('custrecord_noi_pool_bud_customer', null, 'is', stCustomer) ];
 	}

 	var arrSearchColumns = [ new nlobjSearchColumn('custrecord_pool3_start_amt'), new nlobjSearchColumn('custrecord_pool_used_amt'), new nlobjSearchColumn('custrecord_pool_name'), new nlobjSearchColumn('custrecordpool_start_amount') ];
 	try {
 		arrResult = NSUtils.search('customrecord_noi_pool_budget', null, arrSearchFilters, arrSearchColumns);
 	} catch (error) {
 		arrResult = [];
 	}
 	return arrResult;
 }

/**
 * Get Item Pool Allowances linked to item.
 * 
 * @param stLineItem
 * @returns {Array}
 */
 function getItemPoolAllowancesForItem(stLineItem) {
 	var arrResult = [];
 	var arrSearchFilters = [ new nlobjSearchFilter('custrecord_item_pool_item', null, 'is', stLineItem) ];
 	var arrSearchColumns = [ new nlobjSearchColumn('custrecord_item_pool_name').setSort(false), new nlobjSearchColumn('custrecord_item_alternate_remain_amt'), new nlobjSearchColumn('custitem_ifd_commodity_type', 'custrecord_item_pool_item'),
 	new nlobjSearchColumn('custrecord_ifd_item_pool_alternatename') ];

 	try {
 		arrResult = NSUtils.search('customrecord_item_pool_budget', null, arrSearchFilters, arrSearchColumns);
 	} catch (error) {
 		arrResult = [];
 	}
 	return arrResult;
 }

/**
 * Log and throw error
 * 
 * @param error
 */
 function handleError(error) {
 	if (error.getDetails != undefined) {
 		nlapiLogExecution('ERROR', 'Process Error', 'process() ' + error.getCode() + ': ' + error.getDetails());
 		throw error;
 	} else {
 		nlapiLogExecution('ERROR', 'Unexpected Error', 'process() ' + error.toString());
 		throw nlapiCreateError('99999', error.toString());
 	}
 }

 function roundOffValue(flValue, intDecimalPlace) {
 	var bNegate = false;

 	if (flValue < 0) {
 		flValue = Math.abs(flValue);
 		bNegate = true;
 	}

 	var flResult = null;
 	var intMultiplierDivisor = Math.pow(10, intDecimalPlace || 0);
 	flResult = Math.round(flValue * intMultiplierDivisor) / intMultiplierDivisor;
 	flResult = bNegate ? flResult * -1 : flResult;

 	return flResult;
 }

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
 * Compilation of utility functions that utilizes SuiteScript API
 * 
 */

 var NSUtils = {
    /**
     * Convert item record type to its corresponding internal id (e.g. 'invtpart' to 'inventoryitem')
     * @param {String} stRecordType - record type of the item
     * @return {String} stRecordTypeInLowerCase - record type internal id
     */
     toItemInternalId : function(stRecordType) {
     	if (isEmpty(stRecordType)) {
     		throw nlapiCreateError('10003', 'Item record type should not be empty.');
     	}

     	var stRecordTypeInLowerCase = stRecordType.toLowerCase().trim();

     	switch (stRecordTypeInLowerCase) {
     		case 'invtpart':
     		return 'inventoryitem';
     		case 'description':
     		return 'descriptionitem';
     		case 'assembly':
     		return 'assemblyitem';
     		case 'discount':
     		return 'discountitem';
     		case 'group':
     		return 'itemgroup';
     		case 'markup':
     		return 'markupitem';
     		case 'noninvtpart':
     		return 'noninventoryitem';
     		case 'othcharge':
     		return 'otherchargeitem';
     		case 'payment':
     		return 'paymentitem';
     		case 'service':
     		return 'serviceitem';
     		case 'subtotal':
     		return 'subtotalitem';
     		case 'giftcert':
     		return 'giftcertificateitem';
     		case 'dwnlditem':
     		return 'downloaditem';
     		case 'kit':
     		return 'kititem';
     		default:
     		return stRecordTypeInLowerCase;
     	}
     },

    /**
     * Get the posting period internal id for the given date
     * @param {String} stDate - date to search for posting period
     * @return {String} stPostingPeriod - internal id of posting period retrieved for the date
     * @author redelacruz
     */
     getPostingPeriodByDate : function(stDate) {
     	var stPostingPeriod = '';

     	var arrFilters = [];
     	arrFilters.push(new nlobjSearchFilter('startdate', null, 'onorbefore', stDate));
     	arrFilters.push(new nlobjSearchFilter('enddate', null, 'onorafter', stDate));
     	arrFilters.push(new nlobjSearchFilter('isquarter', null, 'is', 'F'));
     	arrFilters.push(new nlobjSearchFilter('isyear', null, 'is', 'F'));

     	var arrColumns = [ new nlobjSearchColumn('startdate').setSort(), new nlobjSearchColumn('enddate') ];

     	var arrResults = nlapiSearchRecord('accountingperiod', null, arrFilters, arrColumns);
     	if (arrResults) {
     		stPostingPeriod = arrResults[0].getId();
     	}

     	return stPostingPeriod;
     },

    /**
     * Determine whether the posting period for a given date is closed or not
     * @param {String} stDate - date to search for posting period
     * @return {Boolean} bIsClosed - returns true if posting period is closed; otherwise returns false
     * @author redelacruz
     */
     isClosedDatePostingPeriod : function(stDate) {
     	var bIsClosed = true;

     	var arrFilters = [];
     	arrFilters.push(new nlobjSearchFilter('startdate', null, 'onorbefore', stDate));
     	arrFilters.push(new nlobjSearchFilter('enddate', null, 'onorafter', stDate));
     	arrFilters.push(new nlobjSearchFilter('isyear', null, 'is', 'F'));
     	arrFilters.push(new nlobjSearchFilter('isquarter', null, 'is', 'F'));
     	arrFilters.push(new nlobjSearchFilter('closed', null, 'is', 'F'));
     	arrFilters.push(new nlobjSearchFilter('alllocked', null, 'is', 'F'));

     	var arrcolumns = [];
     	arrcolumns.push(new nlobjSearchColumn('startdate').setSort());
     	arrcolumns.push(new nlobjSearchColumn('periodname'));

     	var arrResults = nlapiSearchRecord('accountingperiod', null, arrFilters, arrcolumns);
     	if (arrResults) {
     		bIsClosed = false;
     	}

     	return bIsClosed;
     },

    /**
     * Determine whether the posting period is closed or not
     * @param {String} stPeriodName - name of posting period to search
     * @return {Boolean} bIsClosed - returns true if posting period is closed; otherwise returns false
     * @author redelacruz
     */
     isClosedPostingPeriod : function(stPeriodName) {
     	var bIsClosed = true;

     	var arrFilters = [];
     	arrFilters.push(new nlobjSearchFilter('periodname', null, 'is', stPeriodName));
     	arrFilters.push(new nlobjSearchFilter('isyear', null, 'is', 'F'));
     	arrFilters.push(new nlobjSearchFilter('isquarter', null, 'is', 'F'));
     	arrFilters.push(new nlobjSearchFilter('closed', null, 'is', 'F'));
     	arrFilters.push(new nlobjSearchFilter('alllocked', null, 'is', 'F'));

     	var arrColumns = [];
     	arrColumns.push(new nlobjSearchColumn('periodname'));

     	var arrResults = nlapiSearchRecord('accountingperiod', null, arrFilters, arrColumns);
     	if (arrResults) {
     		bIsClosed = false;
     	}

     	return bIsClosed;
     },

    /** 
     * Get the item price using the price level
     * @param {String} stItemId - item internal id
     * @param {String} stPriceLevel - price level internal id
     * @return {Number} the price of the item at the given price level
     */
     getItemPrice : function(stItemId, stPriceLevel) {
     	if (stPriceLevel == '1') {
     		return nlapiLookupField('item', stItemId, 'baseprice');
     	} else {
     		var arrFilters = [ new nlobjSearchFilter('internalid', null, 'is', stItemId) ];
     		var arrColumns = [ new nlobjSearchColumn('otherprices') ];
     		var arrResults = nlapiSearchRecord('item', null, arrFilters, arrColumns);
     		if (arrResults != null) {
     			return arrResults[0].getValue('price' + stPriceLevel);
     		}
     	}
     	return null;
     },

    /**
     * Get all of the results from the search even if the results are more than 1000. 
     * @param {String} stRecordType - the record type where the search will be executed.
     * @param {String} stSearchId - the search id of the saved search that will be used.
     * @param {Array} arrSearchFilter - array of nlobjSearchFilter objects. The search filters to be used or will be added to the saved search if search id was passed.
     * @param {Array} arrSearchColumn - array of nlobjSearchColumn objects. The columns to be returned or will be added to the saved search if search id was passed.
     * @returns {Array} - an array of nlobjSearchResult objects
     * @author memeremilla - initial version
     * @author gmanarang - used concat when combining the search result
     */
     search : function(stRecordType, stSearchId, arrSearchFilter, arrSearchColumn) {
     	var arrReturnSearchResults = new Array();
     	var nlobjSavedSearch;

     	if (stSearchId != null) {
     		nlobjSavedSearch = nlapiLoadSearch((stRecordType) ? stRecordType : null, stSearchId);

	    // add search filter if one is passed
	    if (arrSearchFilter != null) {
	    	nlobjSavedSearch.addFilters(arrSearchFilter);
	    }

	    // add search column if one is passed
	    if (arrSearchColumn != null) {
	    	nlobjSavedSearch.addColumns(arrSearchColumn);
	    }
	} else {
		nlobjSavedSearch = nlapiCreateSearch((stRecordType) ? stRecordType : null, arrSearchFilter, arrSearchColumn);
	}

	var nlobjResultset = nlobjSavedSearch.runSearch();
	var intSearchIndex = 0;
	var nlobjResultSlice = null;
	do {
		if ((nlapiGetContext().getExecutionContext() === 'scheduled')) {
			try {
				this.rescheduleScript(1000);
			} catch (e) {
			}
		}

		nlobjResultSlice = nlobjResultset.getResults(intSearchIndex, intSearchIndex + 1000);
		if (!(nlobjResultSlice)) {
			break;
		}

		arrReturnSearchResults = arrReturnSearchResults.concat(nlobjResultSlice);
		intSearchIndex = arrReturnSearchResults.length;
	}

	while (nlobjResultSlice.length >= 1000);

	return arrReturnSearchResults;
},

    /**
     * Pauses the scheduled script either if the remaining usage is less than
     * the specified governance threshold usage amount or the allowed time is
     * @param {Number} intGovernanceThreshold - The value of the governance threshold  usage units before the script will be rescheduled.
     * @param {Number} intStartTime - The time when the scheduled script started
     * @param {Number} intMaxTime - The maximum time (milliseconds) for the script to reschedule. Default is 1 hour.
     * @param {Number} flPercentOfAllowedTime - the percent of allowed time based from the maximum running time. The maximum running time is 3600000 ms.
     * @returns void
     * @author memeremilla
     */
     rescheduleScript : function(intGovernanceThreshold, intStartTime, intMaxTime, flPercentOfAllowedTime) {
     	var stLoggerTitle = 'SuiteUtil.rescheduleScript';
     	nlapiLogExecution('DEBUG', stLoggerTitle, 'Script State : ' + JSON.stringify({
     		'Remaining usage' : nlapiGetContext().getRemainingUsage()
     	}));

     	if (intMaxTime == null) {
     		intMaxTime = 3600000;
     	}

     	var intRemainingUsage = nlapiGetContext().getRemainingUsage();
	var intRequiredTime = 900000; // 25% of max time
	if ((flPercentOfAllowedTime)) {
		var flPercentRequiredTime = 100 - flPercentOfAllowedTime;
		intRequiredTime = intMaxTime * (flPercentRequiredTime / 100);
	}

	// check if there is still enough usage units
	if ((intGovernanceThreshold)) {
		nlapiLogExecution('DEBUG', stLoggerTitle, 'Script State : ' + 'Checking if there is still enough usage units.');

		if (intRemainingUsage < (parseInt(intGovernanceThreshold, 10) + parseInt(20, 10))) {
			nlapiLogExecution('DEBUG', stLoggerTitle, 'Script State : ' + JSON.stringify({
				'Remaining usage' : nlapiGetContext().getRemainingUsage()
			}));
			nlapiLogExecution('DEBUG', stLoggerTitle, 'Script State : ' + 'Rescheduling script.');

			var objYield = null;
			try {
				objYield = nlapiYieldScript();
			} catch (e) {
				if (e.getDetails != undefined) {
					throw e;
				} else {
					if (e.toString().indexOf('NLServerSideScriptException') <= -1) {
						throw e;
					} else {
						objYield = {
							'Status' : 'FAILURE',
							'Reason' : e.toString(),
						};
					}
				}
			}

			if (objYield.status == 'FAILURE') {
				nlapiLogExecution('DEBUG', stLoggerTitle, 'Script State : ' + 'Unable to Yield.');
				nlapiLogExecution('DEBUG', stLoggerTitle, 'Script State : ' + JSON.stringify({
					'Status' : objYield.status,
					'Information' : objYield.information,
					'Reason' : objYield.reason
				}));
			} else {
				nlapiLogExecution('DEBUG', stLoggerTitle, 'Script State : ' + 'Successfully reschedule the script.');
				nlapiLogExecution('DEBUG', stLoggerTitle, 'Script State : ' + JSON.stringify({
					'After resume with' : intRemainingUsage,
					'Remaining vs governance threshold' : intGovernanceThreshold
				}));
			}
		}
	}

	if ((intStartTime)) {
	    // get current time
	    var intCurrentTime = new Date().getTime();

	    // check if elapsed time is near the arbitrary value
	    nlapiLogExecution('DEBUG', stLoggerTitle, 'Script State : ' + 'Check if elapsed time is near the arbitrary value.');

	    var intElapsedTime = intMaxTime - (intCurrentTime - intStartTime);
	    nlapiLogExecution('DEBUG', stLoggerTitle, 'Script State : ' + 'Remaining time is ' + intElapsedTime + ' ms.');

	    if (intElapsedTime < intRequiredTime) {
	    	nlapiLogExecution('AUDIT', stLoggerTitle, 'Script State : ' + 'Rescheduling script.');

		// check if we are not reaching the max processing time which is 3600000 secondsvar objYield = null;
		try {
			objYield = nlapiYieldScript();
		} catch (e) {
			if (e.getDetails != undefined) {
				throw e;
			} else {
				if (e.toString().indexOf('NLServerSideScriptException') <= -1) {
					throw e;
				} else {
					objYield = {
						'Status' : 'FAILURE',
						'Reason' : e.toString(),
					};
				}
			}
		}

		if (objYield.status == 'FAILURE') {
			nlapiLogExecution('DEBUG', stLoggerTitle, 'Script State : ' + 'Unable to Yield.');
			nlapiLogExecution('DEBUG', stLoggerTitle, 'Script State : ' + JSON.stringify({
				'Status' : objYield.status,
				'Information' : objYield.information,
				'Reason' : objYield.reason
			}));
		} else {
			nlapiLogExecution('DEBUG', stLoggerTitle, 'Script State : ' + 'Successfully reschedule the script.');
			nlapiLogExecution('DEBUG', stLoggerTitle, 'Script State : ' + JSON.stringify({
				'After resume with' : intRemainingUsage,
				'Remaining vs governance threshold' : intGovernanceThreshold
			}));

		    // return new start time        
		    intStartTime = new Date().getTime();
		}
	}
}

return intStartTime;
},

    /**  
     * Checks governance then calls yield
     * @param 	{Integer} myGovernanceThreshold 	 * 
     * @returns {Void} 
     * @author memeremilla
     */
     checkGovernance : function(myGovernanceThreshold) {
     	var context = nlapiGetContext();

     	if (context.getRemainingUsage() < myGovernanceThreshold) {
     		var state = nlapiYieldScript();
     		if (state.status == 'FAILURE') {
     			nlapiLogExecution("ERROR", "Failed to yield script, exiting: Reason = " + state.reason + " / Size = " + state.size);
     			throw "Failed to yield script";
     		} else if (state.status == 'RESUME') {
     			nlapiLogExecution("AUDIT", "Resuming script because of " + state.reason + ".  Size = " + state.size);
     		}
     	}
     }
 };

 var Eval = {
    /**
     * Evaluate if the given string or object value is empty, null or undefined.
     * @param {String} stValue - string or object to evaluate
     * @returns {Boolean} - true if empty/null/undefined, false if not
     * @author mmeremilla
     */
     isEmpty : function(stValue) {
     	if ((stValue == '') || (stValue == null) || (stValue == undefined)) {
     		return true;
     	} else {
     		if (typeof stValue == 'string') {
     			if ((stValue == '')) {
     				return true;
     			}
     		} else if (typeof stValue == 'object') {
     			if (stValue.length == 0 || stValue.length == 'undefined') {
     				return true;
     			}
     		}

     		return false;
     	}
     },

    /**
     * Evaluate if the given string is an element of the array
     * @param {String} stValue - String value to find in the array
     * @param {Array} arrValue - Array to be check for String value
     * @returns {Boolean} - true if string is an element of the array, false if not
     */
     inArray : function(stValue, arrValue) {
     	var bIsValueFound = false;

     	for (var i = 0; i < arrValue.length; i++) {
     		if (stValue == arrValue[i]) {
     			bIsValueFound = true;
     			break;
     		}
     	}

     	return bIsValueFound;
     }
 };

 var Parse = {
    /**
     * Converts string to float. If value is infinity or can't be converted to a number, 0.00 will be returned.
     * @param {String} stValue - any string
     * @returns {Number} - a floating point number
     * @author jsalcedo
     */
     forceFloat : function(stValue) {
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
     forceInt : function(stValue) {
     	var intValue = parseInt(stValue);

     	if (isNaN(intValue) || (stValue == Infinity)) {
     		return 0;
     	}

     	return intValue;
     },

    /**
     * Removes duplicate values from an array
     * @param {Array} arrValue - any array
     * @returns {Array} - array without duplicate values
     */
     removeDuplicates : function(arrValue) {
     	if (!arrValue) {
     		return arrValue;
     	}

     	var arrNewValue = new Array();

     	o: for (var i = 0, n = arrValue.length; i < n; i++) {
     		for (var x = 0, y = arrNewValue.length; x < y; x++) {
     			if (arrNewValue[x] == arrValue[i]) {
     				continue o;
     			}
     		}

     		arrNewValue[arrNewValue.length] = arrValue[i];
     	}

     	return arrNewValue;
     },

    /**
     * Replaces the character based on the position defined (0-based index)
     * @param {String} stValue - any string
     * @param {Number} intPos - index/position of the character to be replaced
     * @param {stReplacement} - any string to replace the character in the intPos
     * @returns {String} - new value
     * @author jsalcedo
     * 
     * Example: replaceCharAt('hello', 0, 'X'); //"Xello"
     */
     replaceCharAt : function(stValue, intPos, stReplacement) {
     	return stValue.substr(0, intPos) + stReplacement + stValue.substr(intPos + 1);
     },

    /**
     * Inserts string to the position defined (0-based index)
     * @param {String} stValue - any string
     * @param {Number} intPos - index of the character to be replaced
     * @param {String} stInsert - any string to insert 
     * @param {String} - new value
     * @returns {String} - new value
     * @author jsalcedo
     * 
     * Example: insertCharAt('hello', 0, 'X'); //"Xhello"
     */
     insertStringAt : function(stValue, intPos, stInsert) {
     	return [ stValue.slice(0, intPos), stInsert, stValue.slice(intPos) ].join('');
     },

    /**
     * Round off floating number and appends it with currency symbol 
     * @param {Number} flValue - a floating number
     * @param {String} stCurrencySymbol - currency symbol
     * @param {Number} intDecimalPrecision - number of decimal precisions to use when rounding off the floating number
     * @author redelacruz
     */
     formatCurrency : function(flValue, stCurrencySymbol, intDecimalPrecision) {
     	var flAmount = flValue;

     	if (typeof (flValue) != 'number') {
     		flAmount = parseFloat(flValue);
     	}

     	var arrDigits = flAmount.toFixed(intDecimalPrecision).split(".");
     	arrDigits[0] = arrDigits[0].split("").reverse().join("").replace(/(\d{3})(?=\d)/g, "$1,").split("").reverse().join("");

     	return stCurrencySymbol + arrDigits.join(".");
     },

    /**
     * Round off floating number and appends it with percent symbol 
     * @param {Number} flValue - a floating number
     * @param {String} stPercentSymbol - percent symbol
     * @param {Number} intDecimalPrecision - number of decimal precisions to use when rounding off the floating number
     * @author redelacruz
     */
     formatPercent : function(flValue, stPercentSymbol, intDecimalPrecision) {
     	var flAmount = flValue;

     	if (typeof (flValue) != 'number') {
     		flAmount = parseFloat(flValue);
     	}

     	arrDigits = flAmount.toFixed(intDecimalPrecision).split(".");
     	arrDigits[0] = arrDigits[0].split("").reverse().join("").replace(/(\d{3})(?=\d)/g, "$1,").split("").reverse().join("");

     	return arrDigits.join(".") + stPercentSymbol;
     }
 };

 var DateHelper = {
    /**
     * Returns the difference between 2 dates based on time type
     * @param {Date} stStartDate - Start Date
     * @param {Date} stEndDate - End Date
     * @param {String} stTime - 'D' = Days, 'HR' = Hours, 'MI' = Minutes, 'SS' = Seconds
     * @returns {Number} - difference in days, hours, minutes, or seconds
     * @author jsalcedo
     */
     getTimeBetween : function(dtStartDate, dtEndDate, stTime) {
	// The number of milliseconds in one time unit
	var intOneTimeUnit = 1;

	switch (stTime) {
		case 'D':
		intOneTimeUnit *= 24;
		case 'HR':
		intOneTimeUnit *= 60;
		case 'MI':
		intOneTimeUnit *= 60;
		case 'SS':
		intOneTimeUnit *= 1000;
	}

	// Convert both dates to milliseconds
	var intStartDate = dStartDate.getTime();
	var intEndDate = dEndDate.getTime();

	// Calculate the difference in milliseconds
	var intDifference = intEndDate - intStartDate;

	// Convert back to time units and return
	return Math.round(intDifference / intOneTimeUnit);
},
};