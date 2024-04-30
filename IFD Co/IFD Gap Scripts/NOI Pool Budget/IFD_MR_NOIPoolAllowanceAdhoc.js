/**
 * Copyright (c) 1998-2020 NetSuite, Inc.
 * 2955 Campus Drive, Suite 100, San Mateo, CA, USA 94403-2511
 * All Rights Reserved.
 * 
 * This software is the confidential and proprietary information of NetSuite, Inc. ("Confidential Information").
 * You shall not disclose such Confidential Information and shall use it only in accordance with the terms of the license agreement
 * you entered into with NetSuite.
 * 
 * Version		Type    	Date            Author           		Remarks
 * 1.00    		Create  	10 Jan 2020     CMargallo				Redesign of previous Scheduled Script
 * 1.01         Update		03 Feb 2020		PRies 					TI 273 - fix search for unprocessed Invoices - filter out closed periods
 * 1.02         Update		04 Feb 2020		PRies 					TI 273 - fix search for unprocessed Invoices - filter out memorized transactions
 * 1.03			Update		12 Feb 2020		CMargallo				TI 273 (CTDT-1880) - fix "ALL" Commodity Type not correctly handled 
 * 1.04			Update		28 Feb 2020		CMargallo				Added retries and delay in calling M/R script.
 * 1.05         Update      11 Mar 2020     PRies                   Replaced all native log calls with NS_IFDLibrary.NOILog calls 
 * 1.06         Update      24 Mar 2020     PRies                   Changed || to && in getInputData, line 143
 * 1.07         Update		24 Mar 2020     PRies                   Added date filter to unprocessed invoice search
 * 1.08         Update      03 Apr 2020     PRies                   Checking for zero ActWeight for Catch Weights items - Added IsNan check for Rate in getInputData
 * 1.09         Update      11 May 2020     Pries                   Changed date filter to use createddate
 */

/**
 * @NApiVersion 2.x
 * @NScriptType MapReduceScript
 * @NModuleScope Public
 */
define(['N/search', 'N/runtime', 'N/record', 'N/task', '/SuiteScripts/IFD Gap Scripts/NSUtilvSS2', 'SuiteScripts/IFD Gap Scripts/NOI Pool Budget/IFD_LIB_NOIFunctions'],

function(NS_Search, NS_Runtime, NS_Record, NS_Task, NS_Util, NS_IFDLibrary) {
   
    /**
     * Marks the beginning of the Map/Reduce process and generates input data.
     *
     * @typedef {Object} ObjectRef
     * @property {number} id - Internal ID of the record instance
     * @property {string} type - Record type id
     *
     * @return {Array|Object|Search|RecordRef} inputSummary
     * @since 2015.1
     */
    function getInputData() 
    {
    	var stMethodName = 'getInputData';
		//log.debug(stMethodName, ' - Entry -');
		NS_IFDLibrary.NOILog('debug', stMethodName, '- Entry - ');
				
    	try
    	{   
    		var stChain = null;
    		var stItemID = null;
    		var stEntity = null;
    		var stInvoiceID = null;
    		var stLineUniqueKey = null;
    		var stNOIPoolBudgetID = null;
    		var stLineNOIPoolBudget = null;
    		var stAlternativeNOIPoolBudgetID = null;
    		
    		var arrFilters = [];
    		var arrColumns = [];
    		var arrResults = [];
    		var arrDataUsedPerLine = [];
    		var arrItemPoolAllowance = [];
    		var arrEligibleItemForNOI = [];
    		var arrNOIPoolBudgetResults = [];
    		var arrNOITransactionDataPerInvoice = [];
    		var arrAlternateNOIPoolBudgetResults = [];
    		
    		var arrPrevDataUsedPerLine = [];
    		var objPrevUpdatedDataList = {};
    		var arrPrevNOITransactionDataPerInvoice = [];
    		
    		var objChainList = {};
    		var objLineDataList = {};
    		var objItemDataList = {};
    		var objInvoiceDataList = {};
    		var objUpdatedDataList = {};

    		var objPoolBudgetSearchArgs = {};
    		var objNewNOIPoolBudgetData = {};
    		var objItemPoolAllowanceList = {};

    		var fltResult = null;
    		var flItemQty = null;
    		var flItemRate = null;
    		var flItemActWght = null;
    		var flNOIUsedAmount = null;
    		var flCalculatedAmount = null;
    		var flItemPoolAllowance = null;
    		var flNOIRemainingAmount = null;
    		
    		var flAlternativeNOIUsedAmount = null;
    		var flAlternativeNOIRemainingAmount = null;

    		var blnIsAllowanceLine = null;
    		var blnItemIsCatchWeight = null;
    		
    		var recInvoice = null;
    		
    	    if (NS_IFDLibrary.getNOIMRScriptRunning(NS_Runtime.getCurrentScript().deploymentId) > 0)
    	    {
				//log.debug(stMethodName,'M/R Already Running');
				NS_IFDLibrary.NOILog('debug', stMethodName, 'M/R Already Running');
    	        return;
    	    } 
    	    
    	    var objScriptParameter = getScriptParameter();
    	    arrResults = getUnprocessInvoice();
    	    for (var intIndex = 0; intIndex < arrResults.length; intIndex++)
    	    {
    	    	objLineDataList = {};
    	    	arrNOITransactionDataPerInvoice = [];
				//log.debug(stMethodName, 'Process Invoice ID : ' + arrResults[intIndex].id);
				NS_IFDLibrary.NOILog('debug', stMethodName, 'Process Invoice ID : ' + arrResults[intIndex].id);
    	    	
    	    	try 
    	    	{
        	    	recInvoice = NS_Record.load({
        	            type: NS_Record.Type.INVOICE,
        	            id: arrResults[intIndex].id,
        	            isDynamic: true
        	    	});
    	    	}
    	    	catch(error)
    	    	{
    				var stError = error.name+' : '+error.message;
					///log.error(stMethodName, 'Record Load Error : ' + stError);
					NS_IFDLibrary.NOILog('error', stMethodName, 'Record Load Error : ' + stError);
    				continue;
    	    	}
    	    	
    	    	arrEligibleItemForNOI = getEligibleItemForNOI(recInvoice);
    	    	
                // Search for Pool Budgets
    	    	stEntity = recInvoice.getValue({ fieldId: 'entity' });
    	    	objChainList[stEntity] = getChainName(objChainList, stEntity);
				//log.debug(stMethodName, 'Chain Name: ' + objChainList[stEntity] + ' | Entity: ' + stEntity);
				NS_IFDLibrary.NOILog('debug', stMethodName, 'Chain Name: ' + objChainList[stEntity] + ' | Entity: ' + stEntity);
    	    	
    	    	objPoolBudgetSearchArgs.entity = stEntity;
    	    	objPoolBudgetSearchArgs.chain = objChainList[stEntity];
    	    	arrNOIPoolBudgetResults = getNOIPoolBudget(objPoolBudgetSearchArgs);
				//log.debug(stMethodName, 'Total Item Eligible for NOI : ' + arrEligibleItemForNOI.length + ' | Total NOI Pool Budget Results : ' + arrNOIPoolBudgetResults.length);
				NS_IFDLibrary.NOILog('debug', stMethodName, 'Total Item Eligible for NOI : ' + arrEligibleItemForNOI.length + ' | Total NOI Pool Budget Results : ' + arrNOIPoolBudgetResults.length);
    	    	
    	    	if (!NS_Util.isEmpty(arrEligibleItemForNOI) && !NS_Util.isEmpty(arrNOIPoolBudgetResults))
    	    	{
        	    	objItemDataList = getItemDataList(arrEligibleItemForNOI);
        	    	objItemPoolAllowanceList = getItemPoolAllowance(arrEligibleItemForNOI);
        	    	
        	    	// Iterate line item
        	    	for (var intLineNum = 0; intLineNum < recInvoice.getLineCount({sublistId: 'item'}); intLineNum++)
        	    	{
        	    		arrDataUsedPerLine = []
        	    		recInvoice.selectLine({sublistId: 'item', line: intLineNum});
        	    		stLineUniqueKey = recInvoice.getCurrentSublistValue({
							sublistId: 'item',
							fieldId: 'lineuniquekey'
						});
        	    		stItemID = recInvoice.getCurrentSublistValue({
							sublistId: 'item',
							fieldId: 'item'
						});
						flItemQty = parseInt(recInvoice.getCurrentSublistValue({
							sublistId: 'item',
							fieldId: 'quantity'
						}));
						blnIsAllowanceLine = recInvoice.getCurrentSublistValue({
							sublistId: 'item',
							fieldId: 'custcol_ifd_allowance_line'
                        });
						blnItemIsCatchWeight = recInvoice.getCurrentSublistValue({ //ADD v1.01
							sublistId: 'item',
							fieldId: 'custcol_cw_indicator'
                        });
						flItemRate = NS_Util.forceFloat(recInvoice.getCurrentSublistValue({
                        	sublistId: 'item',
                        	fieldId: 'rate'
                        }));
						flItemActWght = NS_Util.forceFloat(recInvoice.getCurrentSublistValue({ //ADD v1.01
							sublistId: 'item',
							fieldId: 'custcol_jf_cw_act_wght'
                        }));
						/*
						log.debug(stMethodName, 'Invoice ID :' + arrResults[intIndex].id + ' | Item : ' + stItemID +
							' | Item Quantity : ' + flItemQty + ' | Is Allowance Line : ' + blnIsAllowanceLine +
							' | Item Is Catch Weight : ' + blnItemIsCatchWeight + ' | Item Rate : ' + flItemRate +
							' | Actual Weight : ' + flItemActWght);
						*/
						NS_IFDLibrary.NOILog('debug', stMethodName, 
							'Invoice ID :' + arrResults[intIndex].id + ' | Item : ' + stItemID +
							' | Item Quantity : ' + flItemQty + ' | Is Allowance Line : ' + blnIsAllowanceLine +
							' | Item Is Catch Weight : ' + blnItemIsCatchWeight + ' | Item Rate : ' + flItemRate +
							' | Actual Weight : ' + flItemActWght);
						 
						if (flItemRate != 0 && (blnIsAllowanceLine == false || blnIsAllowanceLine == 'F') && flItemQty > 0)
						{
							arrItemPoolAllowance = objItemPoolAllowanceList[stItemID];
							if (!NS_Util.isEmpty(arrItemPoolAllowance))
							{
								// Create a deep copy of the data for revert back
					    		arrPrevDataUsedPerLine = JSON.parse(JSON.stringify(arrDataUsedPerLine));
					    		objPrevUpdatedDataList = JSON.parse(JSON.stringify(objUpdatedDataList));
					    		arrPrevNOITransactionDataPerInvoice = JSON.parse(JSON.stringify(arrNOITransactionDataPerInvoice));
								
								// Iterate Item Pool Allowance
								for (var intPoolAllowanceIndex = 0; intPoolAllowanceIndex < arrItemPoolAllowance.length; intPoolAllowanceIndex++)
								{
					    	    	flAlternativeNOIUsedAmount = null;
					    	    	stAlternativeNOIPoolBudgetID = null;
					        		flAlternativeNOIRemainingAmount = null;
									//log.debug(stMethodName, 'Item Pool Allowance : ' + JSON.stringify(arrItemPoolAllowance[intPoolAllowanceIndex]));
									NS_IFDLibrary.NOILog('debug', stMethodName, 'Item Pool Allowance : ' + JSON.stringify(arrItemPoolAllowance[intPoolAllowanceIndex]));
									
									flItemPoolAllowance = NS_Util.forceFloat(arrItemPoolAllowance[intPoolAllowanceIndex].itempoolallowance);
									// Get the alternate NOI Pool Budget
									if (!NS_Util.isEmpty(arrItemPoolAllowance[intPoolAllowanceIndex].alternatepoolname))
									{
						    	    	objPoolBudgetSearchArgs.poolname = arrItemPoolAllowance[intPoolAllowanceIndex].alternatepoolname;
						    	    	arrAlternateNOIPoolBudgetResults = getNOIPoolBudget(objPoolBudgetSearchArgs);
										//log.debug(stMethodName, 'Alternate NOI Pool Budget Length : ' + arrAlternateNOIPoolBudgetResults.length);
										NS_IFDLibrary.NOILog('debug', stMethodName, 'Alternate NOI Pool Budget Length : ' + arrAlternateNOIPoolBudgetResults.length);
						    	    	
						    	    	stAlternativeNOIPoolBudgetID = arrAlternateNOIPoolBudgetResults[0].noipoolbudgetid;
										// Get the remaining amount from the NOI updated object if available else get from the search
										if (!NS_Util.isEmpty(objUpdatedDataList['PB_' + stAlternativeNOIPoolBudgetID]))
										{
											flAlternativeNOIUsedAmount = NS_Util.forceFloat(objUpdatedDataList['PB_' + stAlternativeNOIPoolBudgetID].used);
											flAlternativeNOIRemainingAmount = NS_Util.forceFloat(objUpdatedDataList['PB_' + stAlternativeNOIPoolBudgetID].rem);
										}
										else
										{
											flAlternativeNOIUsedAmount = NS_Util.forceFloat(arrAlternateNOIPoolBudgetResults[stAlternativeNOIPoolBudgetID].poolusedamount);
											flAlternativeNOIRemainingAmount = NS_Util.forceFloat(arrAlternateNOIPoolBudgetResults[stAlternativeNOIPoolBudgetID].poolremainingamount);
										}
									}
									
									// Iterate NOI Pool Budget
									for (var intNOIPoolBudgetIndex = 0; intNOIPoolBudgetIndex < arrNOIPoolBudgetResults.length; intNOIPoolBudgetIndex++)
									{
										stNOIPoolBudgetID = arrNOIPoolBudgetResults[intNOIPoolBudgetIndex].noipoolbudgetid;
										// Get the remaining amount from the NOI updated object if available else get from the search
										if (!NS_Util.isEmpty(objUpdatedDataList['PB_' + stNOIPoolBudgetID]))
										{
											flNOIUsedAmount = NS_Util.forceFloat(objUpdatedDataList['PB_' + stNOIPoolBudgetID].used);
											flNOIRemainingAmount = NS_Util.forceFloat(objUpdatedDataList['PB_' + stNOIPoolBudgetID].rem);
										}
										else
										{
											flNOIUsedAmount = NS_Util.forceFloat(arrNOIPoolBudgetResults[intNOIPoolBudgetIndex].poolusedamount);
											flNOIRemainingAmount = NS_Util.forceFloat(arrNOIPoolBudgetResults[intNOIPoolBudgetIndex].poolremainingamount);
										}
										
										// Match the pool name
										if (arrItemPoolAllowance[intPoolAllowanceIndex].poolname == arrNOIPoolBudgetResults[intNOIPoolBudgetIndex].poolname)
										{
											if (blnItemIsCatchWeight == true || blnItemIsCatchWeight == 'T')
											{
												flCalculatedAmount = NS_Util.forceFloat((flItemPoolAllowance * flItemActWght)).toFixed(2);
											}
											else
											{
												flCalculatedAmount = NS_Util.forceFloat((flItemPoolAllowance * flItemQty)).toFixed(2);
											}
											//log.debug(stMethodName, 'Calculated Amount : ' + flCalculatedAmount + ' | NOI Remaining Amount : ' + flNOIRemainingAmount);
											NS_IFDLibrary.NOILog('debug', stMethodName, 'Calculated Amount : ' + flCalculatedAmount + ' | NOI Remaining Amount : ' + flNOIRemainingAmount);
											
											// Calculated Amount Less than NOI Pool Budget Remaining Amount
											if (flCalculatedAmount <= flNOIRemainingAmount) 
											{
												//log.debug(stMethodName, 'CASE 1 : Calculated Amount Less than (<) NOI Pool Budget Remaining Amount');
												NS_IFDLibrary.NOILog('debug', stMethodName, 'CASE 1 : Calculated Amount Less than (<) NOI Pool Budget Remaining Amount');
												objNewNOIPoolBudgetData = {
													transactionid : arrResults[intIndex].id,
													amt : flCalculatedAmount,
						                            pb : stNOIPoolBudgetID,
						                            ffs : objItemDataList[stItemID].feeforservice,
						                            item : stItemID,
						                            itemqty : flItemQty,
						                            rem : NS_Util.roundDecimalAmount(NS_Util.forceFloat(flNOIRemainingAmount) - NS_Util.forceFloat(flCalculatedAmount), 2),
						                            used : NS_Util.roundDecimalAmount(NS_Util.forceFloat(flNOIUsedAmount) + NS_Util.forceFloat(flCalculatedAmount), 2),
													pbRem : NS_Util.roundDecimalAmount(NS_Util.forceFloat(flNOIRemainingAmount) - NS_Util.forceFloat(flCalculatedAmount), 2), //ADD v1.05
						                            pbUsed : NS_Util.roundDecimalAmount(NS_Util.forceFloat(flNOIUsedAmount) + NS_Util.forceFloat(flCalculatedAmount), 2) //ADD v1.05
												};
												objUpdatedDataList['PB_' + stNOIPoolBudgetID] = objNewNOIPoolBudgetData;
												arrNOITransactionDataPerInvoice.push(objNewNOIPoolBudgetData);
												arrDataUsedPerLine.push(objNewNOIPoolBudgetData);
											}
											// Else If calculated Allowance Amount is > the Pool Budget's Pool Remaining Amount and the Item's Commodity Type = All...
				                            else if ((flCalculatedAmount > flNOIRemainingAmount) && objItemDataList[stItemID].commoditytype == objScriptParameter.commTypeAll)
				                            {
												//log.debug(stMethodName, 'CASE 2 : Calculated Allowance Amount is greater than (>) the Pool Budget Pool Remaining Amount and the Item Commodity Type = All');
												NS_IFDLibrary.NOILog('debug', stMethodName, 'CASE 2 : Calculated Allowance Amount is greater than (>) the Pool Budget Pool Remaining Amount and the Item Commodity Type = All');
				                            	// ADDED CMARGALLO v1.03 START
				                            	// Revert the data before processing the current line item
									    		arrDataUsedPerLine = JSON.parse(JSON.stringify(arrPrevDataUsedPerLine));
									    		objUpdatedDataList = JSON.parse(JSON.stringify(objPrevUpdatedDataList));
									    		arrNOITransactionDataPerInvoice = JSON.parse(JSON.stringify(arrPrevNOITransactionDataPerInvoice));
									    		
									    		intPoolAllowanceIndex = arrItemPoolAllowance.length;
									    		intNOIPoolBudgetIndex = arrNOIPoolBudgetResults.length;
				                            	// ADDED CMARGALLO v1.03 END
				                            }
											// Else If calculated Allowance Amount is > the Pool Budget's Pool Remaining Amount then look for Alternate Pool
				                            else if (flCalculatedAmount > flNOIRemainingAmount && !NS_Util.isEmpty(stAlternativeNOIPoolBudgetID) && !NS_Util.isEmpty(flAlternativeNOIRemainingAmount) && !NS_Util.isEmpty(flAlternativeNOIUsedAmount))
				                            {
												//log.debug(stMethodName, 'Used the Alternate Pool Budget');
												NS_IFDLibrary.NOILog('debug', stMethodName, 'Used the Alternate Pool Budget');
				                            	
				                            	flCalculatedAmount = NS_Util.forceFloat((flAlternativeNOIRemainingAmount * flItemQty)).toFixed(2);
												//log.debug(stMethodName, 'Alternative Calculated Amount : ' + flCalculatedAmount + ' | Alternative NOI Pool Budget Remaining Amount : ' + flAlternativeNOIRemainingAmount);
												NS_IFDLibrary.NOILog('debug', stMethodName, 'Alternative Calculated Amount : ' + flCalculatedAmount + ' | Alternative NOI Pool Budget Remaining Amount : ' + flAlternativeNOIRemainingAmount);
				                            	
				                            	if (flCalculatedAmount <= flAlternativeNOIRemainingAmount)
				                            	{
													//log.debug(stMethodName, 'CASE 3 : Alternative calculated Amount Less than equal (<=) alternative NOI Pool Budget Remaining Amount');
													NS_IFDLibrary.NOILog('debug', stMethodName, 'CASE 3 : Alternative calculated Amount Less than equal (<=) alternative NOI Pool Budget Remaining Amount');
				                            		objNewNOIPoolBudgetData = {
														transactionid : arrResults[intIndex].id,
														amt : flCalculatedAmount,
														pb : stAlternativeNOIPoolBudgetID,
														ffs : objItemDataList[stItemID].feeforservice,
														item : stItemID,
														itemqty : flItemQty,
														rem : NS_Util.roundDecimalAmount(NS_Util.forceFloat(flAlternativeNOIRemainingAmount) - NS_Util.forceFloat(flCalculatedAmount), 2),
														used : NS_Util.roundDecimalAmount(NS_Util.forceFloat(flAlternativeNOIUsedAmount) + NS_Util.forceFloat(flCalculatedAmount), 2),
														pbRem : NS_Util.roundDecimalAmount(NS_Util.forceFloat(flAlternativeNOIRemainingAmount) - NS_Util.forceFloat(flCalculatedAmount), 2), //ADD v1.05
														pbUsed : NS_Util.roundDecimalAmount(NS_Util.forceFloat(flAlternativeNOIUsedAmount) + NS_Util.forceFloat(flCalculatedAmount), 2) //ADD v1.05
													};
				                            		objUpdatedDataList['PB_' + stAlternativeNOIPoolBudgetID] = objNewNOIPoolBudgetData;
				                            		arrNOITransactionDataPerInvoice.push(objNewNOIPoolBudgetData);
				                            		arrDataUsedPerLine.push(objNewNOIPoolBudgetData);
				                            	}
				                            	else
				                            	{
													//log.debug(stMethodName, 'In applicable alternate pool budget.');
													NS_IFDLibrary.NOILog('debug', stMethodName, 'In applicable alternate pool budget.');
				                            	}
				                            	
			                            		objNewNOIPoolBudgetData = {
													pb : stAlternativeNOIPoolBudgetID,
													ffs : objItemDataList[stItemID].feeforservice,
													rem : flAlternativeNOIRemainingAmount,
													used : flAlternativeNOIUsedAmount,
													pbRem : flAlternativeNOIRemainingAmount, //ADD v1.05
													pbUsed : flAlternativeNOIUsedAmount //ADD v1.05
												};
			                            		arrDataUsedPerLine.push(objNewNOIPoolBudgetData);
				                            }
										}
										else if (arrItemPoolAllowance[intPoolAllowanceIndex].alternatepool == arrNOIPoolBudgetResults[intNOIPoolBudgetIndex].poolname)
										{
											//log.debug(stMethodName, 'Item Pool Allowance Alternate Name equal (=) Pool Budget Pool Name');
											NS_IFDLibrary.NOILog('debug', stMethodName, 'Item Pool Allowance Alternate Name equal (=) Pool Budget Pool Name');
											flCalculatedAmount = NS_Util.forceFloat((flItemPoolAllowance * flItemQty)).toFixed(2);
											//log.debug(stMethodName, 'Calculated Amount : ' + flCalculatedAmount + ' | NOI Remaining Amount : ' + flNOIRemainingAmount);
											NS_IFDLibrary.NOILog('debug', stMethodName, 'Calculated Amount : ' + flCalculatedAmount + ' | NOI Remaining Amount : ' + flNOIRemainingAmount);
											
											// Calculated Amount Less than NOI Pool Budget Remaining Amount
											if (flCalculatedAmount <= flNOIRemainingAmount) 
											{
												//log.debug(stMethodName, 'CASE 4 : Calculated Amount Less than (<) NOI Pool Budget Remaining Amount for alternative pool allowance');
												NS_IFDLibrary.NOILog('debug', stMethodName, 'CASE 4 : Calculated Amount Less than (<) NOI Pool Budget Remaining Amount for alternative pool allowance');
												objNewNOIPoolBudgetData = {
													transactionid : arrResults[intIndex].id,
													amt : flCalculatedAmount,
													pb : stAlternativeNOIPoolBudgetID,
													ffs : objItemDataList[stItemID].feeforservice,
													item : stItemID,
													itemqty : flItemQty,
													rem : NS_Util.roundDecimalAmount(NS_Util.forceFloat(flAlternativeNOIRemainingAmount) - NS_Util.forceFloat(flCalculatedAmount), 2),
													used : NS_Util.roundDecimalAmount(NS_Util.forceFloat(flAlternativeNOIUsedAmount) + NS_Util.forceFloat(flCalculatedAmount), 2),
													pbRem : NS_Util.roundDecimalAmount(NS_Util.forceFloat(flAlternativeNOIRemainingAmount) - (flCalculatedAmount), 2), //ADD v1.05
													pbUsed : NS_Util.roundDecimalAmount(NS_Util.forceFloat(flAlternativeNOIUsedAmount) + NS_Util.forceFloat(flCalculatedAmount), 2) //ADD v1.05
												};
			                            		objUpdatedDataList['PB_' + stAlternativeNOIPoolBudgetID] = objNewNOIPoolBudgetData;
			                            		arrNOITransactionDataPerInvoice.push(objNewNOIPoolBudgetData);
			                            		arrDataUsedPerLine.push(objNewNOIPoolBudgetData);
											}
											// Else If calculated Allowance Amount is > the Pool Budget's Pool Remaining Amount and the Item's Commodity Type = All...
											else if ((flCalculatedAmount > flNOIRemainingAmount) && objItemDataList[stItemID].commoditytype == objScriptParameter.commTypeAll)
											{
												//log.debug(stMethodName, 'CASE 5 : Calculated Amount Greater than (>) NOI Pool Budget Remaining Amount for alternative pool allowance and Commodity Type = All');
												NS_IFDLibrary.NOILog('debug', stMethodName, 'CASE 5 : Calculated Amount Greater than (>) NOI Pool Budget Remaining Amount for alternative pool allowance and Commodity Type = All');
				                            	// ADDED CMARGALLO v1.03 START
				                            	// Revert the data before processing the current line item
									    		arrDataUsedPerLine = JSON.parse(JSON.stringify(arrPrevDataUsedPerLine));
									    		objUpdatedDataList = JSON.parse(JSON.stringify(objPrevUpdatedDataList));
									    		arrNOITransactionDataPerInvoice = JSON.parse(JSON.stringify(arrPrevNOITransactionDataPerInvoice));
									    		
									    		intPoolAllowanceIndex = arrItemPoolAllowance.length;
									    		intNOIPoolBudgetIndex = arrNOIPoolBudgetResults.length;
				                            	// ADDED CMARGALLO v1.03 END
											}
										}
									}
								}
							}
							else
							{
								//log.debug(stMethodName, 'No Item Pool Allowance for item : ' + stItemID);
								NS_IFDLibrary.NOILog('debug', stMethodName, 'No Item Pool Allowance for item : ' + stItemID);
								continue;
							}
						}
						
						//log.debug(stMethodName, 'NOI Pool Budget Count Per Line : ' + arrDataUsedPerLine.length);
						NS_IFDLibrary.NOILog('debug', stMethodName, 'NOI Pool Budget Count Per Line : ' + arrDataUsedPerLine.length);
						if (!NS_Util.isEmpty(arrDataUsedPerLine))
						{
							// Populate the Line NOI Pool Budget based on the NOI Pool Budget
				    		stLineNOIPoolBudget = populateLineNOIPoolBudget(arrDataUsedPerLine, flItemQty);
				    		if(!NS_Util.isEmpty(stLineNOIPoolBudget))
				    		{
					    		objLineDataList['update_'+stLineUniqueKey] = {
					    			custcol_ifd_noi_pool_budget : stLineNOIPoolBudget,
					    			location : objScriptParameter.commDiscLineLoc
					    		}
				    		}
	
				    		objCombineData = combinedLineNOIPoolBudget(arrDataUsedPerLine, objItemDataList[stItemID].feeforservice);
				    		if(!NS_Util.isEmpty(objCombineData.amount) && stItemID != objScriptParameter.commAllowItem && (objCombineData.feeforservice == false || objCombineData.feeforservice == 'F'))
				    		{
				    			if (blnItemIsCatchWeight == true || blnItemIsCatchWeight == 'T')
				    			{
									// v1.08 added:
									if (flItemRate === 0)
									{
										NS_IFDLibrary.NOILog('debug', stMethodName, 'Act Weight is zero on line ' + intLineNum + '. Can\'t process this line. Skipping.');
										continue;
									}
									flItemRate =  ((objCombineData.amount / flItemActWght)  * -1).toFixed(2);
				    			}
				    			else
				    			{
				    				flItemRate =  ((objCombineData.amount / flItemQty)  * -1).toFixed(2);
								}
								
								// v1.08 added
								if (isNaN(flItemRate))
								{
									flItemRate = 0.00;
								}
				    			
					    		objLineDataList['insert_'+stLineUniqueKey] = {
					    			item : objScriptParameter.commAllowItem,
					    			quantity : flItemQty,
					    			rate : flItemRate,
					    			amount : objCombineData.amount * -1,
					    			classid : objScriptParameter.commDiscLineClass,
					    			location : objScriptParameter.commDiscLineLoc,
					    			custcol_ifd_noi_pool_budget : stLineNOIPoolBudget,
					    			custcol_ifd_allowance_line : true
					    		}
				    		}
						}
        	    	} // Loop of line item
        	    	
        	    	if(!NS_Util.isEmpty(objLineDataList))
        	    	{
        	    		objUpdatedDataList['INV_' + arrResults[intIndex].id] = {
        	    			invoicedata : objLineDataList,
        	    			noitransactiondata : arrNOITransactionDataPerInvoice
        	    		}; 	
        	    	}
        	    	else
        	    	{
        	    		objUpdatedDataList['INV_' + arrResults[intIndex].id] = {}; 
        	    	}
    	    	}
    	    	else
    	    	{
    	    		objUpdatedDataList['INV_' + arrResults[intIndex].id] = {
    	    			invoicedata : objLineDataList,
        	    		noitransactiondata : arrNOITransactionDataPerInvoice
        	    	};
    	    	}
    	    } // End of invoice search results
    	    
			//log.debug(stMethodName, 'Data Object : ' + JSON.stringify(objUpdatedDataList));
			NS_IFDLibrary.NOILog('debug', stMethodName, 'Data Object : ' + JSON.stringify(objUpdatedDataList));
    	    return objUpdatedDataList;
    	}
    	catch(error)
		{
			var stError = error.name+' : '+error.message;
			//log.error(stMethodName, 'Catch : ' + stError);
			NS_IFDLibrary.NOILog('error', stMethodName, 'Catch : ' + stError);
		}
    	finally
    	{
			//log.debug(stMethodName, ' - Exit -');
			NS_IFDLibrary.NOILog('debug', stMethodName, ' - Exit -');
    	}
    }
    
    /**
     * This function combine the amount of all NOI Pool Budget used in specific line.
     * 
     * @param {Array} arrDataUsedPerLine - Hold the list of NOI Pool Budget used in specific line.
     * @param {Boolean} blnIsFeeForService - Hold the flag if the item is fee for service.
     * @return {Object} objCombineData - Hold the combine data of all NOI Pool Budget used in specific line
     */
    function combinedLineNOIPoolBudget(arrDataUsedPerLine, blnIsFeeForService)
    {
    	var stMethodName = 'combinedLineNOIPoolBudget';
		//log.debug(stMethodName, ' - Entry -');
		NS_IFDLibrary.NOILog('debug', stMethodName, ' - Entry -');
    	
    	var objCombineData = {};
    	
    	var flTotalAmount = null;
    	
    	for (var intIndex = 0; intIndex < arrDataUsedPerLine.length; intIndex++)
    	{
    		if(!NS_Util.isEmpty(arrDataUsedPerLine[intIndex].amt))
    		{
    			flTotalAmount += NS_Util.forceFloat(arrDataUsedPerLine[intIndex].amt);
    		}
    	}
    	
    	objCombineData = {
    		amount : flTotalAmount,
    		feeforservice : blnIsFeeForService
    	}
    	
		//log.debug(stMethodName, 'Return : ' + JSON.stringify(objCombineData));
		NS_IFDLibrary.NOILog('debug', stMethodName, 'Return : ' + JSON.stringify(objCombineData) + ' - Exit -');
    	return objCombineData;
    }
    
    /**
     * This function populate the NOI Budget Pool for the specific line item.
     * 
     * @param {Array} arrDataUsedPerLine - Hold the data used in a specific line.
     * @param {Float} flItemQty - Hold the quantity for the specific line.
     * @return {String} stLineNOIPoolBudget - Hold the populated line NOI Pool Budget.
     */
    function populateLineNOIPoolBudget(arrDataUsedPerLine, flItemQty)
    {
    	var stMethodName = 'populateLineNOIPoolBudget';
		//log.debug(stMethodName, ' - Entry -');
		NS_IFDLibrary.NOILog('debug', stMethodName, ' - Entry -');
    	
    	var stLineNOIPoolBudget = '';
    	
    	for (var intIndex = 0; intIndex < arrDataUsedPerLine.length; intIndex++)
    	{
    		if(!NS_Util.isEmpty(arrDataUsedPerLine[intIndex].amt))
    		{
    			if (!NS_Util.isEmpty(stLineNOIPoolBudget))
        		{
    				stLineNOIPoolBudget += ' | ';
        		}
    			stLineNOIPoolBudget += arrDataUsedPerLine[intIndex].pb + ':' + arrDataUsedPerLine[intIndex].amt + ':' + flItemQty.toString();
    		}
    	}
    	
		//log.debug(stMethodName, 'Return : ' + stLineNOIPoolBudget);
		NS_IFDLibrary.NOILog('debug', stMethodName, 'Return : ' + stLineNOIPoolBudget + ' - Exit -');
    	return stLineNOIPoolBudget;
    }
    
    /**
     *	This function get the item for eligible for NOI.
     *
     *	@param {Object} recCurrent - Hold the invoice record.
     *	@return {Array} arrItemList - Hold the item for eligible for NOI
     */
    function getEligibleItemForNOI(recCurrent)
    {
    	var stMethodName = 'getEligibleItemForNOI';
		//log.debug(stMethodName, ' - Entry -');
		NS_IFDLibrary.NOILog('debug', stMethodName, ' - Entry -');
    	
    	var arrItemList = [];
    	
    	var flRate = 0.00;
    	var flQuantity = 0.00
    	
    	var stItem = null;
    	var blnIsAllowanceLine = null;
    	
    	var intLineCount = recCurrent.getLineCount({
    		sublistId: 'item'
    	});
    	for (var intLineNum = 0; intLineNum < intLineCount; intLineNum++)
    	{
    		stItem = recCurrent.getSublistValue({
				sublistId: 'item',
				fieldId: 'item',
				line: intLineNum
			});
    		blnIsAllowanceLine = recCurrent.getSublistValue({
				sublistId: 'item',
				fieldId: 'custcol_ifd_allowance_line',
				line: intLineNum
			});
    		flQuantity = NS_Util.forceFloat(recCurrent.getSublistValue({
				sublistId: 'item',
				fieldId: 'quantity',
				line: intLineNum
			}));
    		flRate = NS_Util.forceFloat(recCurrent.getSublistValue({
				sublistId: 'item',
				fieldId: 'rate',
				line: intLineNum
			}));
    		
			//log.debug(stMethodName, 'Item : ' + stItem +' | Rate : ' + flRate + ' | Allowance Line : ' + blnIsAllowanceLine + ' | Rate : ' + flRate);
			NS_IFDLibrary.NOILog('debug', stMethodName, 'Item : ' + stItem +' | Rate : ' + flRate + ' | Allowance Line : ' + blnIsAllowanceLine + ' | Rate : ' + flRate);
    		if (flRate != 0 && (blnIsAllowanceLine == false || blnIsAllowanceLine == 'F') && flQuantity > 0)
    		{
    			if (arrItemList.indexOf(stItem) == -1)
    			{
    				arrItemList.push(stItem);
    			}
    		}
    	}
    	
		//log.debug(stMethodName, 'Total Number of Eligible for NOI : ' + arrItemList.length + ' | Item List : ' + JSON.stringify(arrItemList));
		NS_IFDLibrary.NOILog('debug', stMethodName, 'Total Number of Eligible for NOI : ' + arrItemList.length + ' | Item List : ' + JSON.stringify(arrItemList) + ' - Exit -');
    	return arrItemList;
    }
    
    /**
     * Get the corresponding NOI Pool Budget for specific invoice.
     * 
     * @param {Object} objOption.poolname - Hold the pool name.
     * @param {Object} objOption.chain - Hold the chain of the entity/customer.
     * @param {Object} objOption.entity - Hold the entity of the specific invoice.
     * @return {Array} arrNOIPoolBudgetList - Hold the NOI budget list pf the specific invoice.
     */
    function getNOIPoolBudget(objOption)
    {
    	var stMethodName = 'getNOIPoolBudget';
		//log.debug(stMethodName, ' - Entry -');
		NS_IFDLibrary.NOILog('debug', stMethodName, ' - Entry -');
    	
    	var arrColumns = [];
    	var arrFilters = null;
    	var arrNOIPoolBudgetList = [];
    	
    	var objNOIPoolBudgetData = null;
    	
    	arrColumns.push(NS_Search.createColumn({
            name: 'custrecord_pool_name'
        }));
    	arrColumns.push(NS_Search.createColumn({
            name: 'custrecordpool_start_amount'
        }));
    	arrColumns.push(NS_Search.createColumn({
            name: 'custrecord_pool3_start_amt'
        }));
    	arrColumns.push(NS_Search.createColumn({
            name: 'custrecord_pool_used_amt'
        }));
    	
    	if (!NS_Util.isEmpty(objOption.poolname))
    	{
    		if (NS_Util.isEmpty(objOption.chain)) 
    		{
    			arrFilters = [
					['isinactive', 'is', false],
					'and',
					['custrecord_noi_pool_bud_customer', 'anyof', objOption.entity],
					'and',
					['custrecord_pool_name', 'anyof', objOption.poolname]
    	        ];
    		}
    		else
    		{
    			arrFilters = [
					['isinactive', 'is', false],
					'and',
					[
						['custrecord_noi_pool_bud_customer', 'anyof', objOption.entity],
						'or',
						['custrecord_pool_group_customer', 'anyof', objOption.chain],
						'and',
						['custrecord_pool_name', 'anyof', objOption.poolname]
					]
    	        ];
    		}
    	}
    	else
    	{
    		if (NS_Util.isEmpty(objOption.chain))
    		{
    			arrFilters = [
    				['isinactive', 'is', false],
    	            'and',
    	            ['custrecord_noi_pool_bud_customer', 'anyof', objOption.entity]
    	        ];
    		}
    		else
    		{
    			arrFilters = [
    				['isinactive', 'is', false],
    	            'and',
    	            [
    	            	['custrecord_noi_pool_bud_customer', 'anyof', objOption.entity],
    	                'or',
    	                ['custrecord_pool_group_customer', 'anyof', objOption.chain]
    	            ]
    	        ];
    		}
    	}
    	
		//log.debug(stMethodName, 'Filters : ' + JSON.stringify(arrFilters));
		NS_IFDLibrary.NOILog('debug', stMethodName, 'Filters : ' + JSON.stringify(arrFilters));
    	var arrResults = NS_Util.updatedSearch('customrecord_noi_pool_budget', null, arrFilters, arrColumns);
    	for (var intIndex = 0; intIndex < arrResults.length; intIndex++)
    	{
    		objNOIPoolBudgetData = {
    			noipoolbudgetid : arrResults[intIndex].id,
    			poolname : arrResults[intIndex].getValue({name: 'custrecord_pool_name'}),
    			poolstartingamount : arrResults[intIndex].getValue({name: 'custrecordpool_start_amount'}),
    			poolremainingamount : arrResults[intIndex].getValue({name: 'custrecord_pool3_start_amt'}),
    			poolusedamount : arrResults[intIndex].getValue({name: 'custrecord_pool_used_amt'})
    		};
    		arrNOIPoolBudgetList.push(objNOIPoolBudgetData);
    	}
    	
		//log.debug(stMethodName, 'Return : ' + JSON.stringify(arrNOIPoolBudgetList));
		NS_IFDLibrary.NOILog('debug', stMethodName, 'Return : ' + JSON.stringify(arrNOIPoolBudgetList) + ' - Exit -');
    	return arrNOIPoolBudgetList;
    }
    
    /**
     * This function get the corresponding 'Item Pool Allowance' record per item.
     * 
     * @param {Array} arrItemList - Hold the items eligible for NOI
     * @return {Object} objItemPoolAllowanceList - Hold the 'Item Pool Allowance' data list 
     */
    function getItemPoolAllowance(arrItemList)
    {
    	var stMethodName = 'getItemPoolAllowance';
		//log.debug(stMethodName, ' - Entry -');
		NS_IFDLibrary.NOILog('debug', stMethodName, ' - Entry -');
    	
    	var stItem = null;
    	
    	var arrFilters = [];
    	var arrColumns = [];
    	
    	var objItemPoolAllowanceList = {};
    	var objItemPoolAllowanceData = {};
    	
    	arrFilters.push(NS_Search.createFilter({
    		name: 'isinactive',
    		operator: NS_Search.Operator.IS,
    		values : false
    	}));
    	arrFilters.push(NS_Search.createFilter({
    		name: 'custrecord_item_pool_item',
    		operator: NS_Search.Operator.ANYOF,
    		values : arrItemList
    	}));
    	
    	arrColumns.push(NS_Search.createColumn({
            name: 'custrecord_item_pool_item'
        }));
    	arrColumns.push(NS_Search.createColumn({
            name: 'custrecord_item_alternate_remain_amt'
        }));
    	arrColumns.push(NS_Search.createColumn({
            name: 'custrecord_item_pool_name'
        }));
    	arrColumns.push(NS_Search.createColumn({
            name: 'custrecord_ifd_item_pool_alternatename'
        }));
    	arrColumns.push(NS_Search.createColumn({
    		name: 'custrecord_item_alternate_remain_amt',
            join: 'custrecord_ifd_item_pool_alternatename'
        }));
    	arrColumns.push(NS_Search.createColumn({
    		name: 'custrecord_item_pool_name',
    		join: 'custrecord_ifd_item_pool_alternatename'
        }));
    	arrColumns.push(NS_Search.createColumn({
            name: 'custitem_ifd_commodity_type',
            join: 'custrecord_item_pool_item'
        }));
    	
    	var arrResults = NS_Util.updatedSearch('customrecord_item_pool_budget', null, arrFilters, arrColumns);
    	for (var intIndex = 0; intIndex < arrResults.length; intIndex++)
    	{
    		stItem = arrResults[intIndex].getValue({name: 'custrecord_item_pool_item'});
    		objItemPoolAllowanceData = {
				id : arrResults[intIndex].id,
				itempoolallowance : arrResults[intIndex].getValue({name: 'custrecord_item_alternate_remain_amt'}),
				poolname : arrResults[intIndex].getValue({name: 'custrecord_item_pool_name'}),
				alternatepool : arrResults[intIndex].getValue({name: 'custrecord_ifd_item_pool_alternatename'}),
				alternatepoolname : arrResults[intIndex].getValue({	name: 'custrecord_item_pool_name', join: 'custrecord_ifd_item_pool_alternatename'}),
				alternateitempoolallowance : arrResults[intIndex].getValue({name: 'custrecord_item_alternate_remain_amt', join: 'custrecord_ifd_item_pool_alternatename'}),
				commoditytype : arrResults[intIndex].getValue({name: 'custitem_ifd_commodity_type', join: 'custrecord_item_pool_item'})
			};
    		
    		if (NS_Util.isEmpty(objItemPoolAllowanceList[stItem]))
    		{
    			objItemPoolAllowanceList[stItem] = [objItemPoolAllowanceData];
    		}
    		else
    		{
    			objItemPoolAllowanceList[stItem].push(objItemPoolAllowanceData);
    		}
    	}
    	
		//log.debug(stMethodName, 'Return : ' + JSON.stringify(objItemPoolAllowanceList));
		NS_IFDLibrary.NOILog('debug', stMethodName, 'Return : ' + JSON.stringify(objItemPoolAllowanceList) + ' - Exit -');
    	return objItemPoolAllowanceList;
    }

    /**
     *	This function get the item data.
     *
     *	@param {Array} arrItemList - Hold the item list eligible for NOI.
     *	@return {Object} objItemDataList - Hold the item data list.
     */
    function getItemDataList(arrItemList)
    {
    	var stMethodName = 'getItemDataList';
		//log.debug(stMethodName, ' - Entry -');
		NS_IFDLibrary.NOILog('debug', stMethodName, ' - Entry -');
    	
    	var arrFilters = [];
    	var arrColumns = [];
    	var objItemDataList = {};
    	
    	arrColumns.push(NS_Search.createColumn({
            name: 'custitem_ifd_noi_feeforservice'
        }));
    	arrColumns.push(NS_Search.createColumn({
            name: 'custitem_ifd_commodity_type'
        }));
    	
    	arrFilters.push(NS_Search.createFilter({
    		name: 'isinactive',
    		operator: NS_Search.Operator.IS,
    		values : false
    	}));
    	arrFilters.push(NS_Search.createFilter({
    		name: 'internalid',
    		operator: NS_Search.Operator.ANYOF,
    		values : arrItemList
    	}));
    	
    	var arrResults = NS_Util.updatedSearch(NS_Search.Type.ITEM, null, arrFilters, arrColumns);
    	for (var intIndex = 0; intIndex < arrResults.length; intIndex++)
    	{
    		objItemDataList[arrResults[intIndex].id] = {
    			feeforservice : arrResults[intIndex].getValue({name: 'custitem_ifd_noi_feeforservice'}),
    			commoditytype : arrResults[intIndex].getValue({name: 'custitem_ifd_commodity_type'})
    		};
    	}
    	
		//log.debug(stMethodName, 'Return : ' + JSON.stringify(objItemDataList));
		NS_IFDLibrary.NOILog('debug', stMethodName, 'Return : ' + JSON.stringify(objItemDataList) + ' - Exit -');
    	return objItemDataList;
    }
    
    /**
     * This function get the chain name of the entity/customer
     * 
     * @param {Object} objChainList - Hold the existing chain per customer
     * @return {String} stChain - Hold the chain based on the entity/customer
     */
    function getChainName(objChainList, stEntity)
    {
    	var stMethodName = 'getChainName';
		//log.debug(stMethodName, ' - Entry -');
		NS_IFDLibrary.NOILog('debug', stMethodName, ' - Entry -');
    	
    	var stChain = null;
		var objCustLookup = null;
    	
    	if (!NS_Util.isEmpty(objChainList[stEntity]))
    	{
    		stChain = objChainList[stEntity];
    	}
    	else
    	{
    		objCustLookup = NS_Search.lookupFields({
    			type: NS_Search.Type.CUSTOMER,
    			id: stEntity,
    			columns: ['custentityifd_chain_name']
    		});
    		 
			if (!NS_Util.isEmpty(objCustLookup.custentityifd_chain_name[0])) 
			{
				stChain = objCustLookup.custentityifd_chain_name[0].value;
			}
    	}
    	
		//log.debug(stMethodName, 'Return : ' + stChain);
		NS_IFDLibrary.NOILog('debug', stMethodName, 'Return : ' + stChain + ' - Exit -');
    	return stChain;
    }
    
    /**
     * This function get all the unprocess invoices.
     * 
     * @return {Array} arrResults - Hold the unprocess invoices.
     */
    function getUnprocessInvoice()
    {
    	var stMethodName = 'getUnprocessInvoice';
		//log.debug(stMethodName, ' - Entry -');
		NS_IFDLibrary.NOILog('debug', stMethodName, ' - Entry -');
    	
    	var arrFilters = [];
    	var arrColumns = [];
    	var arrResults = [];
    	
	    arrFilters.push(NS_Search.createFilter({
    		name: 'mainline',
    		operator: NS_Search.Operator.IS,
    		values : true
    	}));
	    arrFilters.push(NS_Search.createFilter({
    		name: 'custbody_ifd_noi_process_complete',
    		operator: NS_Search.Operator.IS,
    		values : false
    	}));
		// v1.01 - added filter
		arrFilters.push(NS_Search.createFilter({
			name: 'closed',
			join: 'accountingperiod',
    		operator: NS_Search.Operator.IS,
    		values : false
		}));
		// v1.02 - added filter
		arrFilters.push(NS_Search.createFilter({
			name: 'memorized',
    		operator: NS_Search.Operator.IS,
    		values : false
		}));
		// v1.07 - added     // v1.09 - updated
		arrFilters.push(NS_Search.createFilter({
			name: 'datecreated',
    		operator: NS_Search.Operator.ONORAFTER,
    		values : "twodaysago"
		}));
	    arrColumns.push(NS_Search.createColumn({
            name: 'internalid',
            sort: NS_Search.Sort.ASC
        }));
	    arrResults = NS_Util.updatedSearch(NS_Search.Type.INVOICE, null, arrFilters, arrColumns);
	    
		//log.debug(stMethodName, 'Total Invoice Search : ' + arrResults.length);
		NS_IFDLibrary.NOILog('debug', stMethodName, 'Total Invoice Search : ' + arrResults.length + ' - Exit -');
    	return arrResults;
    }
    
    /**
     * This function get all the script parameter locally.
     * 
     * @return {Void} objScriptParameter - Get all the local script parameter.
     */
    function getScriptParameter()
    {
    	var stMethodName = 'getScriptParameter';
		//log.debug(stMethodName, ' - Entry -');
		NS_IFDLibrary.NOILog('debug', stMethodName, ' - Entry -');
    	
    	var objScript = NS_Runtime.getCurrentScript();
    	
    	var objScriptParameter = {};
    	objScriptParameter.commTypeAll = objScript.getParameter({ name: 'custscript_mr_ifd_commtype_all'});
    	objScriptParameter.commTypePartial = objScript.getParameter({ name: 'custscript_mr_ifd_commtype_partial'});
    	objScriptParameter.commTypeAlt = objScript.getParameter({ name: 'custscript_mr_ifd_commtype_alternate'});
    	objScriptParameter.commAllowItem = objScript.getParameter({ name: 'custscript_mr_ifd_item'});
    	objScriptParameter.commDiscLineClass = objScript.getParameter({ name: 'custscript_mr_ifd_disc_line_class'});
    	objScriptParameter.commDiscLineLoc = objScript.getParameter({ name: 'custscript_mr_ifd_disc_line_location'});
    	
		//log.debug(stMethodName, 'Return : ' + JSON.stringify(objScriptParameter));
		NS_IFDLibrary.NOILog('debug', stMethodName, 'Return : ' + JSON.stringify(objScriptParameter) + ' - Exit -');
    	return objScriptParameter;
    }


    /**
     * Executes when the reduce entry point is triggered and applies to each group.
     *
     * @param {ReduceSummary} context - Data collection containing the groups to process through the reduce stage
     * @since 2015.1
     */
    function reduce(context)
    {
    	var stMethodName = 'reduce';
		//log.debug(stMethodName, ' - Entry -');
		NS_IFDLibrary.NOILog('debug', stMethodName, ' - Entry -');
    	
    	var stRecordID = null;
    	var stRecordType = null;
    	var arrFailedInvoiceUpdate = [];
    	var blnUpdateSuccessful = false;
    	
    	try
    	{
        	var stKey = context.key;
        	var objData = JSON.parse(context.values[0]);
			//log.debug(stMethodName, 'Key : ' + stKey + ' | Data : ' + JSON.stringify(objData));
			NS_IFDLibrary.NOILog('debug', stMethodName, 'Key : ' + stKey + ' | Data : ' + JSON.stringify(objData));
        	
        	if (!NS_Util.isEmpty(stKey))
        	{
	        	// Expected Key (INV_XXX or PB_XXX) where INV is Invoice, PB is NOI Pool Budget and XXX is corresponding internal ID. 
	        	var arrKey = stKey.split('_');
	        	if (!NS_Util.isEmpty(arrKey))
	        	{
	        		stRecordType = arrKey[0];
	        		stRecordID =  arrKey[1];
					//log.debug(stMethodName, 'Record Type : ' + stRecordType + ' | Record ID : ' + stRecordID);
					NS_IFDLibrary.NOILog('debug', stMethodName, 'Record Type : ' + stRecordType + ' | Record ID : ' + stRecordID);
	        		// Invoice
	        		if (!NS_Util.isEmpty(stRecordType) && (stRecordType.trim()).toString() == 'INV')
	        		{
	        			blnUpdateSuccessful = updateInvoice(stRecordID.trim(), objData.invoicedata);
	        			if (blnUpdateSuccessful == true)
	        			{
	        				createNOITransaction(objData.noitransactiondata);
	        			}
	        		}
	        		else
	        		{
	        			// NOI Pool Budget
	        			updateNOIPoolBudget(stRecordID.trim(), objData)
	        		}
	        	}
        	}
    	}
    	catch(error)
		{
			var stError = error.name+' : '+error.message;
			//log.error(stMethodName, 'Catch : ' + stError);
			NS_IFDLibrary.NOILog('error', stMethodName, 'Catch : ' + stError);
		}
    	finally
    	{
			//log.debug(stMethodName, ' - Exit -');
			NS_IFDLibrary.NOILog('debug', stMethodName, ' - Exit -');
    	}
    }
    
    /**
     * This function Create NOI Transaction records for every line of Invoice which has a related NOI Pool Budget.
     * 
     * @param {Object} objNewData - Hold the data to be used in creating NOI Transaction.
     * @return {Void}
     */
    function createNOITransaction(arrNewData)
    {
    	var stMethodName = 'createNOITransaction';
		//log.debug(stMethodName, ' - Entry -');
		NS_IFDLibrary.NOILog('debug', stMethodName, ' - Entry -');
    	
    	var intResult = 0;
    	
    	if (!NS_Util.isEmpty(arrNewData))
    	{
    		for (var intIndex = 0; intIndex < arrNewData.length; intIndex++)
        	{
            	var recNOITransaction = NS_Record.create({
            		type: 'customrecord_noi_transaction',
            		isDynamic: true
        		});
            	recNOITransaction.setValue({
            		fieldId: 'custrecord_invoice_num',
            		value: arrNewData[intIndex].transactionid
            	});
            	recNOITransaction.setValue({
            		fieldId: 'custrecord_noi_bedget',
            		value: arrNewData[intIndex].pb
            	});
            	recNOITransaction.setValue({
            		fieldId: 'custrecord_item_inv',
            		value: arrNewData[intIndex].item
            	});
            	recNOITransaction.setValue({
            		fieldId: 'custrecord_pool_amount_used',
            		value: NS_Util.forceFloat(arrNewData[intIndex].amt)
            	});
            	recNOITransaction.setValue({
            		fieldId: 'custrecord_noi_trans_item_qty',
            		value: arrNewData[intIndex].itemqty
            	});
            	
            	intResult = NS_IFDLibrary.TryToSave(recNOITransaction);
            	if (intResult != 1)
            	{
					//log.error(stMethodName, 'Failed to create NOI transaction.');
					NS_IFDLibrary.NOILog('error', stMethodName, 'Failed to create NOI transaction.');
            	}
        	}
    	}
		//log.debug(stMethodName, ' - Exit -');
		NS_IFDLibrary.NOILog('debug', stMethodName, '- Exit -');
    }

    /**
     * This function update the NOI Pool Budget.
     * 
     * @param {String} stNOIPoolBudgetID - Hold the NOI Pool Budget ID.
     * @param {Object} objNewData - Hold the data to be used for update.
     * @return {Void}
     */
    function updateNOIPoolBudget(stNOIPoolBudgetID, objNewData)
    {
    	var stMethodName = 'updateNOIPoolBudget';
		//log.debug(stMethodName, ' - Entry -');
		NS_IFDLibrary.NOILog('debug', stMethodName, ' - Entry -');
    	
    	var intResult = null;
    	var blnUpdateSuccessful = false;
    	
    	var recNOIPoolBudget = NS_Record.load({
    		type: 'customrecord_noi_pool_budget',
    		id: stNOIPoolBudgetID,
    		isDynamic: true,
    	});
    	
    	recNOIPoolBudget.setValue({
    		fieldId: 'custrecord_pool3_start_amt',
    		value: NS_Util.forceFloat(objNewData.rem)
    	});
    	recNOIPoolBudget.setValue({
    		fieldId: 'custrecord_pool_used_amt',
    		value: NS_Util.forceFloat(objNewData.used)
    	});
    	
    	intResult = NS_IFDLibrary.TryToSave(recNOIPoolBudget);
    	if (intResult == 1)
    	{
			//log.audit(stMethodName, 'Updated NOI Pool Budget ID : ' + stNOIPoolBudgetID);
			NS_IFDLibrary.NOILog('audit', stMethodName, 'Updated NOI Pool Budget ID : ' + stNOIPoolBudgetID);
    	}
    	else
    	{
			//log.error(stMethodName, 'Failed to update NOI Pool Budget ID : ' + stNOIPoolBudgetID);
			NS_IFDLibrary.NOILog('error', stMethodName, 'Failed to update NOI Pool Budget ID : ' + stNOIPoolBudgetID);
    	}
		//log.debug(stMethodName, ' - Exit -');
		NS_IFDLibrary.NOILog('debug', stMethodName, ' - Exit -');
    }
    
    /**
     * This function update the invoice based on the data received.
     * 
     * @param {String} stInvoiceID - Hold the invoice id to be updated.
     * @param {Object} objLineDataList - Hold the data to be used for update.
     * @return {Boolean} blnUpdateSuccessful - TRUE 
     * 										   FALSE
     */
    function updateInvoice(stInvoiceID, objLineDataList)
    {
    	var stMethodName = 'updateInvoice';
		//log.debug(stMethodName, ' - Entry -');
		NS_IFDLibrary.NOILog('debug', stMethodName, ' - Entry -');
		//log.debug(stMethodName, 'Parameter : Invoice ID : ' + stInvoiceID + ' | Line Data : ' + JSON.stringify(objLineDataList));
		NS_IFDLibrary.NOILog('debug', stMethodName, 'Parameter : Invoice ID : ' + stInvoiceID + ' | Line Data : ' + JSON.stringify(objLineDataList));
    	
    	var stAction = null;
    	var intLineNum = null;
    	var blnUpdateSuccessful = false;
    	var arrLineUniqueKeyAndAction = null;
    	
    	var recInvoice = NS_Record.load({
    		type: NS_Record.Type.INVOICE,
    		id: stInvoiceID,
    		isDynamic: true,
    	});
    	recInvoice.setValue({
    		fieldId: 'custbody_ifd_noi_process_complete',
    		value: true
    	});
    	
    	var intLineCount = recInvoice.getLineCount({sublistId: 'item'});
    	
    	for ( var stLineUniqueKey in objLineDataList) 
    	{
    		if (!NS_Util.isEmpty(stLineUniqueKey))
    		{
	    		// The value either 'insert_XXX' or 'update_XXX', where XXX is the unique key of the line item
	    		arrLineUniqueKeyAndAction = stLineUniqueKey.split('_');
	    		intLineNum = recInvoice.findSublistLineWithValue({
	    			sublistId: 'item',
	    			fieldId: 'lineuniquekey',
	    			value: ((arrLineUniqueKeyAndAction[1]).trim()).toString()
				});
	    		
	    		if (intLineNum != -1)
	    		{
	    			stAction = ((arrLineUniqueKeyAndAction[0]).trim()).toString();
	    			if (stAction == 'update')
	    			{
						//log.debug(stMethodName, 'Update Line Item : ' + intLineNum);
						NS_IFDLibrary.NOILog('debug', stMethodName, 'Update Line Item : ' + intLineNum);
	    				recInvoice.selectLine({sublistId: 'item', line: intLineNum});
	    			}
	    			else
	    			{
						//log.debug(stMethodName, 'Insert/Add New Line Item : ' + (intLineNum + 1));
						NS_IFDLibrary.NOILog('debug', stMethodName, 'Insert/Add New Line Item : ' + (intLineNum + 1));
	    				if ((intLineNum + 1) != intLineCount)
	    				{
	    					recInvoice.insertLine({sublistId: 'item', line: intLineNum + 1});
	    				}
	    				else
	    				{
	    					recInvoice.selectNewLine({sublistId: 'item'});
	    				}
	    				intLineCount++;
	    			}
	    			
					for ( var stFieldID in objLineDataList[stLineUniqueKey]) 
					{
						recInvoice.setCurrentSublistValue({
							sublistId: 'item',
							fieldId: stFieldID,
							value: objLineDataList[stLineUniqueKey][stFieldID]
						});
					}
					recInvoice.commitLine({sublistId: 'item'});
	    		}
    		}
		}
    	
    	var intResult = NS_IFDLibrary.TryToSave(recInvoice);
    	if (intResult == 1)
    	{
			//log.audit(stMethodName, 'Updated Invoice ID : ' + stInvoiceID);
			NS_IFDLibrary.NOILog('audit', stMethodName, 'Updated Invoice ID : ' + stInvoiceID);
        	blnUpdateSuccessful = true;
    	}
    	else
    	{
			//log.error(stMethodName, 'Failed to update Invoice ID : ' + stInvoiceID);
			NS_IFDLibrary.NOILog('error', stMethodName, 'Failed to update Invoice ID : ' + stInvoiceID);
    	}
		//log.debug(stMethodName, ' - Exit -');
		NS_IFDLibrary.NOILog('debug', stMethodName, ' - Exit -');
    	return blnUpdateSuccessful;
    }
    
    
    /**
     * Executes when the summarize entry point is triggered and applies to the result set.
     *
     * @param {Summary} summary - Holds statistics regarding the execution of a map/reduce script
     * @since 2015.1
     */
    function summarize(summary) 
    {
    	var stMethodName = 'summarize';
		//log.debug(stMethodName, ' - Entry -');
		NS_IFDLibrary.NOILog('debug', stMethodName, ' - Entry -');
    	
        /*log.audit({
            title : stMethodName,
            details : 'Duration : ' + summary.seconds
		});*/
		NS_IFDLibrary.NOILog('audit', stMethodName, 'Duration : ' + summary.seconds);

        /*log.audit({
            title : stMethodName,
            details : 'Usage Consumed : ' + summary.usage
		});*/
		NS_IFDLibrary.NOILog('audit', stMethodName, 'Usage Consumed : ' + summary.usage);

        /*log.audit({
            title : stMethodName,
            details : 'Number of Queues : ' + summary.concurrency
		});*/
		NS_IFDLibrary.NOILog('audit', stMethodName, 'Number of Queues : ' + summary.concurrency);

        /*log.audit({
            title : stMethodName,
            details : 'Number of Yields : ' + summary.yields
		});*/
		NS_IFDLibrary.NOILog('audit', stMethodName, 'Number of Yields : ' + summary.yields);
        
        // Check if there is a NO same M/R script instance running and there still unprocess invoices
        if (NS_IFDLibrary.getNOIMRScriptRunning(NS_Runtime.getCurrentScript().deploymentId) <= 0 && NS_IFDLibrary.totalUnprocessedNOIInvoices() > 0)
        {
	    	var objScript = NS_Runtime.getCurrentScript();
	    	var stScriptRec = objScript.getParameter({name: 'custscript_mr_ifd_mr_noi_script_record'});
	    	
    		NS_IFDLibrary.callMapReduce({
    			scriptid : stScriptRec
    		});
        }
    	
    	log.debug(stMethodName, ' - Exit -');
    }

    return {
        getInputData: getInputData,
        reduce: reduce,
        summarize: summarize
    };
});
