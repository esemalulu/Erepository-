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
 * Version    Date			Author           Remarks
 * 1.00       2016 Sep 13		gruiz
 * 1.01		  2016 Sep 16		gruiz		Fixed consolidated flag and increased min usage threshold value
 * 1.02       2019 Feb 05       pries       Correction for error with WMS Order Type field
 * 1.03       2019 Apr 16       jostap      Correction for TI 55 - setting the consolidated flag
 * 1.04       2019 Jul 15       pries       Catching errors in the middle loop to keep the script trying to process more records 
 * 1.05       2019 Jul 16       jostap      TI 228 - set values for Route and Stop fields on Consol. Sales Orders
 * 1.06		  2019 Jul 26		jostap		Logic for restricted items and memo field
 * 1.07		  2019 Jul 26		jostap		Add new columns and combine lines of same item
 * 1.08       2019 Aug 1        pries       TI 231 - fix for memo with '- None -' value
 * 1.09		  2019 Aug 5 		jostap		TI 253 - null check itemdetails of SO object
 * 1.10		  2019 Aug 6		jostap		Added additional try/catch handling and removed 'throw' error from outer most try/catch
 * 1.11       2019 Aug 20       jostap      TI 236 - fix for combining item lines on orders being consolidated
 */
/**
 * Scheduled Script
 * 
 * @param {string}
 *            type - context types: scheduled, ondemand, userinterface, aborted, skipped
 * @returns {void}
 */

var START_TIMESTAMP = new Date().getTime();
var USAGE_THRESHOLD = 200;
var OBJSO = {};
var TEMP_OBJSO = {};

function scheduled_consolidateSOs(type)
{
	var stLoggerTitle = 'scheduled_consolidateSOs';

	try
	{
		nlapiLogExecution('DEBUG', stLoggerTitle, '****** SCHEDULED SCRIPT START =>' + Date());

		var objContext = nlapiGetContext();

		var stSOSearchId = objContext.getSetting('SCRIPT', 'custscript_ifd_sosearchconsolidated');
		var stPendingFulfillment = 'B'; // Script parameter Order Status returns value of '12' instead of 'B' which is incorrect. B = Pending Fulfillment

		if(NSUtil.isEmpty(stSOSearchId) || NSUtil.isEmpty(stPendingFulfillment))
		{
			nlapiLogExecution('DEBUG', stLoggerTitle, 'Script parameters are incorrectly set. Please check script record and try again.');
			return;
		}

		var arrSO = NSUtil.search('transaction', stSOSearchId);
		nlapiLogExecution('DEBUG',stLoggerTitle,'arrSO: '+JSON.stringify(arrSO));

		if(arrSO.length < 1)
		{

			nlapiLogExecution('DEBUG', stLoggerTitle, 'No Sales Order found with ship date = today');
			return;
		}

		var arrSOIds = [];


		// Due to known issue with Ship date, group SO IDs first before processing the items in each transaction

		for(var intCtr = 0; intCtr < arrSO.length; intCtr++)
		{

			try{
				var objSalesOrder = arrSO[intCtr];

				var stTranId = objSalesOrder.getValue('internalid', null, 'GROUP');
				arrSOIds.push(stTranId);

				var stCustomerId = objSalesOrder.getValue('entity', null, 'GROUP');
				var stPONum = objSalesOrder.getValue('otherrefnum', null, 'GROUP');
				var stHeaderLocation = objSalesOrder.getValue('location', null, 'GROUP');
				var stShipDate = objSalesOrder.getValue('shipdate', null, 'GROUP');
				var memo = objSalesOrder.getValue('memo', null, 'GROUP'); //v1.06
				memo = memo.replace("- None -", "");  //v1.08
				// v1.02 - added:
				var stWMSOrderType = objSalesOrder.getValue('custbody_wmsse_ordertype', null, 'GROUP');
				// v2.0 - removed - nlapiLogExecution('DEBUG', stLoggerTitle, 'stWMSOrderType is ' + stWMSOrderType);

				if(stPONum === '- None -'){                                          // v1.05
					stPONum = '';
				}

				var key = [ stCustomerId, stPONum ].join('_');

				if(!TEMP_OBJSO[key])
				{

					TEMP_OBJSO[key] = {};
					TEMP_OBJSO[key].customer = stCustomerId;
					TEMP_OBJSO[key].location = stHeaderLocation;
					TEMP_OBJSO[key].ponum = stPONum;
					TEMP_OBJSO[key].shipdate = stShipDate;
					TEMP_OBJSO[key].memo = memo; //v1.06
					TEMP_OBJSO[key].wmsordertype = stWMSOrderType;      // v1.02 - added
					TEMP_OBJSO[key].soids = [];
				}else if(memo && TEMP_OBJSO[key].memo.length < 1000){ //v1.06
					TEMP_OBJSO[key].memo += ' '+memo;
				}

				if(TEMP_OBJSO[key].memo.length > 1000){ //v1.06
					TEMP_OBJSO[key].memo = TEMP_OBJSO[key].memo.substring(0,1000);
				}



				TEMP_OBJSO[key].soids.push(stTranId);
			}catch(error){
				if(error.getDetails != undefined)
				{
					nlapiLogExecution('ERROR', 'Process Error', error.getCode() + ': ' + error.getDetails());

				}
				else
				{
					nlapiLogExecution('ERROR', 'Unexpected Error', error.toString());

				}
			}
		}

		nlapiLogExecution('DEBUG',stLoggerTitle,'TEMP_OBJSO: '+JSON.stringify(TEMP_OBJSO));

		var nonConsolOrdersToMark = [];

		for(var group in TEMP_OBJSO){
			if(TEMP_OBJSO[group].soids.length <= 1){
				nonConsolOrdersToMark.push(TEMP_OBJSO[group].soids[0]);
				delete TEMP_OBJSO[group];
			}
		}

		nonConsolOrdersToMark.forEach(function(orderID){
			try{
				nlapiSubmitField('salesorder',orderID,'custbody_consolidated','T');
			}catch(error){
				if(error.getDetails != undefined)
				{
					nlapiLogExecution('ERROR', 'Process Error', error.getCode() + ': ' + error.getDetails());

				}
				else
				{
					nlapiLogExecution('ERROR', 'Unexpected Error', error.toString());

				}
			}
		})

		if(Object.keys(TEMP_OBJSO).length === 0){
			return;
		}

		nlapiLogExecution('DEBUG', stLoggerTitle, 'Sales Orders to process: ' + JSON.stringify(arrSOIds));

		// Search SO Items
		var arrFilters = [];
		var arrCols = [];

		arrFilters.push(new nlobjSearchFilter('internalid', null, 'anyof', arrSOIds));
		arrFilters.push(new nlobjSearchFilter('taxline', null, 'is', 'F'));
		arrFilters.push(new nlobjSearchFilter('cogs', null, 'is', 'F'));
		arrFilters.push(new nlobjSearchFilter('shipping', null, 'is', 'F'));
		arrFilters.push(new nlobjSearchFilter('mainline', null, 'is', 'F'));

		// arrCols.push(new nlobjSearchColumn('mainline'));
		arrCols.push(new nlobjSearchColumn('otherrefnum').setSort());
		arrCols.push(new nlobjSearchColumn('entity').setSort());
		arrCols.push(new nlobjSearchColumn('custbody_ifd_so_route_number'));             // v1.05
		arrCols.push(new nlobjSearchColumn('custbody_ifd_stop'))                         // v1.05
		arrCols.push(new nlobjSearchColumn('location'));
		arrCols.push(new nlobjSearchColumn('internalid'));
		arrCols.push(new nlobjSearchColumn('item'));
		arrCols.push(new nlobjSearchColumn('quantity'));
		arrCols.push(new nlobjSearchColumn('rate'));
		arrCols.push(new nlobjSearchColumn('costestimate'));
		arrCols.push(new nlobjSearchColumn('costestimaterate'));
		arrCols.push(new nlobjSearchColumn('estgrossprofit'));
		arrCols.push(new nlobjSearchColumn('locationnohierarchy'));
		arrCols.push(new nlobjSearchColumn('custbody_restrict_items_approved')); //v1.06

		//v1.07 start
		arrCols.push(new nlobjSearchColumn('linesequencenumber'));
		arrCols.push(new nlobjSearchColumn('custcol_ifd_subitemindicator'));
		arrCols.push(new nlobjSearchColumn('custcol_ifd_price_override'));
		arrCols.push(new nlobjSearchColumn('custcol_ifd_pallet_key_type'));
		arrCols.push(new nlobjSearchColumn('custcol_ifd_pallet_type_code'));
		//v1.07 end

		var arrSOItems = NSUtil.search('transaction', null, arrFilters, arrCols);

		// v1.05
		arrSOItems = arrSOItems.sort(function(orderA, orderB){
			return orderA - orderB;
		});
		nlapiLogExecution('DEBUG',stLoggerTitle,'arrSOItems: '+JSON.stringify(arrSOItems));


		if(arrSOItems < 1)
		{
			nlapiLogExecution('DEBUG', stLoggerTitle, 'No Sales Orders found');
			return;
		}

		for(var intCtrA = 0; intCtrA < arrSOItems.length; intCtrA++)
		{

			try { 
				var objSOItem = arrSOItems[intCtrA];

				var stCustomerId = objSOItem.getValue('entity');
				var stPONum = objSOItem.getValue('otherrefnum');
				var route = objSOItem.getValue('custbody_ifd_so_route_number');                // v1.05
				var stop = objSOItem.getValue('custbody_ifd_stop');                            // v1.05
				var areRestrictedItemsApproved = objSOItem.getValue('custbody_restrict_items_approved');
				stop = stop === '- None -' ? '' : stop;

				var key = [ stCustomerId, stPONum ].join('_');

				if(!OBJSO[key])                            // v2.0 added
				{
                    if (TEMP_OBJSO[key]) 
                    {
                        // Initialize Line Variables

                        OBJSO[key] = {};
                        var intCounter = 0;


                        OBJSO[key].customer = TEMP_OBJSO[key].customer;
                        OBJSO[key].memo = TEMP_OBJSO[key].memo;
                        OBJSO[key].location = TEMP_OBJSO[key].location;
                        OBJSO[key].ponum = TEMP_OBJSO[key].ponum;
                        OBJSO[key].shipdate = TEMP_OBJSO[key].shipdate;
                        OBJSO[key].soids = TEMP_OBJSO[key].soids;
                        OBJSO[key].wmsordertype = TEMP_OBJSO[key].wmsordertype;      // v1.02 - added
                        OBJSO[key].salesOrderId = objSOItem.getValue('internalid');
                        nlapiLogExecution('DEBUG', stLoggerTitle,'Sales Order Id: '+OBJSO[key].salesOrderId);
                    } else {
                        nlapiLogExecution('DEBUG', stLoggerTitle,'TEMP_OBJSO[key] is empty for key '+ key);
                    }
                } else {
                    nlapiLogExecution('DEBUG', stLoggerTitle,'OBJSO[key] is not empty for key ' + key);
                }

				if(OBJSO[key]){
					// v1.05
					if(!OBJSO[key].route){
						OBJSO[key].route = route;
					}

					if(!OBJSO[key].stop){
						OBJSO[key].stop = stop;
					}

					if(!OBJSO[key].itemdetails){
						OBJSO[key].itemdetails = [];
					}

					if(OBJSO[key].areRestrictedItemsApproved === 'F' || !OBJSO[key].areRestrictedItemsApproved){ //v1.06
						OBJSO[key].areRestrictedItemsApproved = areRestrictedItemsApproved;
					}

					OBJSO[key].itemdetails.push({
						'itemid' : objSOItem.getValue('item'),
						'itemqty' : Number(objSOItem.getValue('quantity')),
						'itemrate' : objSOItem.getValue('rate'),
						'itemcostestrate' : objSOItem.getValue('costestimaterate'),
						'itemestgross' : objSOItem.getValue('estgrossprofit'),
						'itemcostest' : objSOItem.getValue('costestimate'),
						'itemlocation' : objSOItem.getValue('locationnohierarchy'),
						//v1.07 start
						'lineSequence': Number(objSOItem.getValue('linesequencenumber')),
						'subItem': objSOItem.getValue('custcol_ifd_subitemindicator'),
						'priceOverride': objSOItem.getValue('custcol_ifd_price_override'),
						'keyType': objSOItem.getValue('custcol_ifd_pallet_key_type'),
						'typeCode': objSOItem.getValue('custcol_ifd_pallet_type_code')
					});

					OBJSO[key].linecount = ++intCounter;

				}

			} catch(error) { 
				if(error.getDetails != undefined)
				{
					nlapiLogExecution('ERROR', 'Middle Process Error', 'key is ' + key + ' -- ' + error.getCode() + ': ' + error.getDetails());
				}
				else
				{
					nlapiLogExecution('ERROR', 'Middle Unexpected Error', 'key is ' + key + ' -- ' + error.toString());
				}
			}

		}



		nlapiLogExecution('DEBUG', stLoggerTitle, 'SO Transaction: ' + JSON.stringify(OBJSO));

		var keys = Object.keys(OBJSO);

		// This block consolidates the Sales Orders
		for(var i = 0; i < keys.length; i++)
		{

			var sortKey = keys[i]

			try{
				if(OBJSO[sortKey]){
					if(OBJSO[sortKey].itemdetails){
						//v1.07 start
						OBJSO[sortKey].itemdetails = OBJSO[sortKey].itemdetails.sort(function (itemLineA, itemLineB){
							return itemLineA.lineSequence - itemLineB.lineSequence
						}).reduce(function(itemDetails, itemLine, index){

							var indexToUpdate = -1;
							var indexToSplice = -1;

							var qty = itemLine.itemqty;

							itemDetails.forEach(function(existingLine, existingIndex){

								if(existingLine.itemid === itemLine.itemid){
									if(existingLine.priceOverride === 'T'){
										indexToUpdate = existingIndex;
									}else if(itemLine.priceOverride === 'T'){
										indexToSplice = existingIndex;
										qty += existingLine.itemqty;
									}else{
										indexToUpdate = existingIndex
									}
								}
							});

							if(indexToUpdate === -1){
								itemDetails.push(itemLine);
							}else{
								itemDetails[indexToUpdate].itemqty += itemLine.itemqty;
							}

							if(indexToSplice !== -1){
								itemDetails.splice(indexToSplice,1);
								itemLine.itemqty = qty;
							}

							return itemDetails;
						},[]);
						//v1.07 end

						nlapiLogExecution('DEBUG', stLoggerTitle, 'Item Details after sort: ' + JSON.stringify(OBJSO[sortKey].itemdetails));
					}
				}



				// for( var intKey in OBJSO)

			}catch(error){
				if(error.getDetails != undefined)
				{
					nlapiLogExecution('ERROR', 'Process Error', error.getCode() + ': ' + error.getDetails());

				}
				else
				{
					nlapiLogExecution('ERROR', 'Unexpected Error', error.toString());

				}
			}

			try
			{

				TEMP_OBJSO = {};
				var START_TIMESTAMP = NSUtil.rescheduleScript(USAGE_THRESHOLD, START_TIMESTAMP);

				var intKey = keys[i];
				if(OBJSO[intKey]){
					var stCustomerId = OBJSO[intKey].customer;
					var stLocation = OBJSO[intKey].location;
					var stPONum = OBJSO[intKey].ponum;
					var intLineCount = OBJSO[intKey].linecount;
					var stShippingDate = OBJSO[intKey].shipdate;
					// v1.02 - added:
					var stWMSOrderType = OBJSO[intKey].wmsordertype;
					// nlapiLogExecution('DEBUG', stLoggerTitle, '2 - stWMSOrderType is ' + stWMSOrderType);
					// v1.05 - added:
					var route = OBJSO[intKey].route;
					var stop = OBJSO[intKey].stop;
					var memo = OBJSO[intKey].memo; //v1.06
					var areRestrictedItemsApproved = OBJSO[intKey].areRestrictedItemsApproved;

					var originalSO = OBJSO[intKey].salesOrderId;

					// Create Sales Order
					var recSO = nlapiCreateRecord('salesorder', {
						recordmode : 'dynamic'
					});

					// Set header fields
					recSO.setFieldValue('entity', stCustomerId);
					recSO.setFieldValue('memo', memo); //v1.06
					recSO.setFieldValue('custbody_restrict_items_approved',areRestrictedItemsApproved);
					recSO.setFieldValue('location', stLocation);
					recSO.setFieldValue('otherrefnum', stPONum);
					recSO.setFieldValue('orderstatus', stPendingFulfillment);
					recSO.setFieldValue('shipdate', stShippingDate);
					recSO.setFieldValue('custbody_ifd_so_route_number', route);
					recSO.setFieldValue('custbody_ifd_stop', stop);
					if (stWMSOrderType) recSO.setFieldValue('custbody_wmsse_ordertype', stWMSOrderType);  // v1.02 - added
					recSO.setFieldValue('custbody_ifd_used_so', JSON.stringify(OBJSO[intKey].soids));

					recSO.setFieldValue('custbody_consolidate_so_parent', originalSO);


					if(OBJSO[intKey].itemdetails){
						// Set lines
						for(var intCtrB = 0; intCtrB < OBJSO[intKey].itemdetails.length; intCtrB++)
						{
							var stItemId = OBJSO[intKey].itemdetails[intCtrB].itemid;
							var stItemQty = OBJSO[intKey].itemdetails[intCtrB].itemqty;
							var stItemRate = OBJSO[intKey].itemdetails[intCtrB].itemrate;
							var stCostEstimate = OBJSO[intKey].itemdetails[intCtrB].itemcostest;
							var stCostEstimateRate = OBJSO[intKey].itemdetails[intCtrB].itemcostestrate;
							var stItemLocation = OBJSO[intKey].itemdetails[intCtrB].itemlocation;
							var stEstGross = OBJSO[intKey].itemdetails[intCtrB].itemestgross;

							//v1.07 start
							var subItem = OBJSO[intKey].itemdetails[intCtrB].subItem;
							var priceOverride = OBJSO[intKey].itemdetails[intCtrB].priceOverride;
							var keyType = OBJSO[intKey].itemdetails[intCtrB].keyType;
							var typeCode = OBJSO[intKey].itemdetails[intCtrB].typeCode;
							//v1.07 end

							recSO.selectNewLineItem('item');
							recSO.setCurrentLineItemValue('item', 'item', stItemId, true);
							recSO.setCurrentLineItemValue('item', 'quantity', stItemQty, true);
							recSO.setCurrentLineItemValue('item', 'rate', stItemRate, true);
							recSO.setCurrentLineItemValue('item', 'costestimate', stCostEstimate, true);
							recSO.setCurrentLineItemValue('item', 'costestimaterate', stCostEstimateRate, true);
							recSO.setCurrentLineItemValue('item', 'location', stItemLocation, true);
							recSO.setCurrentLineItemValue('item', 'estgrossprofit', stEstGross, true);
							//v1.07 start
							recSO.setCurrentLineItemValue('item', 'custcol_ifd_subitemindicator',subItem);
							recSO.setCurrentLineItemValue('item', 'custcol_ifd_price_override',priceOverride);
							recSO.setCurrentLineItemValue('item', 'custcol_ifd_pallet_key_type',keyType);
							recSO.setCurrentLineItemValue('item', 'custcol_ifd_pallet_type_code',typeCode);


							recSO.commitLineItem('item');

						}
					}

					var stSO = nlapiSubmitRecord(recSO);
					nlapiLogExecution('AUDIT', stLoggerTitle, 'Record Created: ' + stSO);

					// Update the original SO records
					var arrValidSO = OBJSO[intKey].soids;

					for(var intIdx = 0; intIdx < arrValidSO.length; intIdx++)
					{

						var START_TIMESTAMP = NSUtil.rescheduleScript(USAGE_THRESHOLD, START_TIMESTAMP);

						var recSOClose = nlapiLoadRecord('salesorder', arrValidSO[intIdx]);
						recSOClose.setFieldValue('custbody_consolidated', 'T');

						var intLines = recSOClose.getLineItemCount('item');

						// Close each SO line
						for(var intIdxA = 1; intIdxA <= intLines; intIdxA++)
						{
							recSOClose.setLineItemValue('item', 'isclosed', intIdxA, 'T');
						}

						var stClosedSO = nlapiSubmitRecord(recSOClose);
						nlapiLogExecution('AUDIT', stLoggerTitle, 'Record: ' + stClosedSO + ' closed.');

					}
				}
			}

			catch(error)
			{
				if(error.getDetails != undefined)
				{
					nlapiLogExecution('ERROR', 'Process Error', error.getCode() + ': ' + error.getDetails());

				}
				else
				{
					nlapiLogExecution('ERROR', 'Unexpected Error', error.toString());

				}
			}
		}

		// // Set the original non-errored Sales Orders to Closed
		// for(var intIdx = 0; intIdx < arrValidSO.length; intIdx++)
		// {
		// var START_TIMESTAMP = NSUtil.rescheduleScript(USAGE_THRESHOLD, START_TIMESTAMP);
		//
		// var recSOClose = nlapiLoadRecord('salesorder', arrValidSO[intIdx]);
		// recSOClose.setFieldValue('custbody_consolidated', 'T');
		//
		// var intLines = recSOClose.getLineItemCount('item');
		//
		// for(var intIdxA = 1; intIdxA <= intLines; intIdxA++)
		// {
		// recSOClose.setLineItemValue('item', 'isclosed', intIdxA, 'T');
		// }
		//
		// var stClosedSO = nlapiSubmitRecord(recSOClose);
		// nlapiLogExecution('AUDIT', stLoggerTitle, 'Record: ' + stClosedSO + ' closed.');
		//
		// }

		nlapiLogExecution('DEBUG', stLoggerTitle, '****** SCHEDULED SCRIPT END =>' + Date());
	}

	catch(error)
	{
		if(error.getDetails != undefined)
		{
			nlapiLogExecution('ERROR', 'Process Error', error.getCode() + ': ' + error.getDetails());
			// throw error;
		}
		else
		{
			nlapiLogExecution('ERROR', 'Unexpected Error', error.toString());
			// throw nlapiCreateError('99999', error.toString());
		}
	}
}

var NSUtil = {

/**
 * 
 * Version 1:
 * 
 * @author memeremilla Details: Initial version
 * 
 * Version 2:
 * @author bfeliciano Details: Revised shorthand version.
 * 
 * @param {String}
 *            stValue - string or object to evaluate
 * @returns {Boolean} - true if empty/null/undefined, false if not
 * 
 */
isEmpty : function(stValue)
{
	return((stValue === '' || stValue == null || stValue == undefined) || (stValue.constructor === Array && stValue.length == 0) || (stValue.constructor === Object && (function(
			v)
	{
		for( var k in v)
			return false;
		return true;
	})(stValue)));
},

/**
 * Converts string to float. If value is infinity or can't be converted to a number, 0.00 will be returned.
 * 
 * @param {String}
 *            stValue - any string
 * @returns {Number} - a floating point number
 * @author jsalcedo
 */
forceFloat : function(stValue)
{
	var flValue = parseFloat(stValue);

	if(isNaN(flValue) || (stValue == Infinity))
	{
		return 0.00;
	}

	return flValue;
},

/**
 * Get all of the results from the search even if the results are more than 1000.
 * 
 * @param {String}
 *            stRecordType - the record type where the search will be executed.
 * @param {String}
 *            stSearchId - the search id of the saved search that will be used.
 * @param {nlobjSearchFilter[]}
 *            arrSearchFilter - array of nlobjSearchFilter objects. The search filters to be used or will be added to the saved search if search id was passed.
 * @param {nlobjSearchColumn[]}
 *            arrSearchColumn - array of nlobjSearchColumn objects. The columns to be returned or will be added to the saved search if search id was passed.
 * @returns {nlobjSearchResult[]} - an array of nlobjSearchResult objects
 * @author memeremilla - initial version
 * @author gmanarang - used concat when combining the search result
 */
search : function(stRecordType, stSearchId, arrSearchFilter, arrSearchColumn)
{
	if(stRecordType == null && stSearchId == null)
	{
		throw nlapiCreateError('SSS_MISSING_REQD_ARGUMENT',
				'search: Missing a required argument. Either stRecordType or stSearchId should be provided.');
	}

	var arrReturnSearchResults = new Array();
	var objSavedSearch;

	if(stSearchId != null)
	{
		objSavedSearch = nlapiLoadSearch((stRecordType) ? stRecordType : null, stSearchId);

		// add search filter if one is passed
		if(arrSearchFilter != null)
		{
			objSavedSearch.addFilters(arrSearchFilter);
		}

		// add search column if one is passed
		if(arrSearchColumn != null)
		{
			objSavedSearch.addColumns(arrSearchColumn);
		}
	}
	else
	{
		objSavedSearch = nlapiCreateSearch((stRecordType) ? stRecordType : null, arrSearchFilter, arrSearchColumn);
	}

	var objResultset = objSavedSearch.runSearch();
	var intSearchIndex = 0;
	var arrResultSlice = null;
	do
	{
		if((nlapiGetContext().getExecutionContext() === 'scheduled'))
		{
			try
			{
				this.rescheduleScript(1000);
			} catch(e)
			{
			}
		}

		arrResultSlice = objResultset.getResults(intSearchIndex, intSearchIndex + 1000);
		if(arrResultSlice == null)
		{
			break;
		}

		arrReturnSearchResults = arrReturnSearchResults.concat(arrResultSlice);
		intSearchIndex = arrReturnSearchResults.length;
	}

	while(arrResultSlice.length >= 1000);

	return arrReturnSearchResults;
},

/**
 * Pauses the scheduled script either if the remaining usage is less than the specified governance threshold usage amount or the allowed time is
 * 
 * @param {Number}
 *            intGovernanceThreshold - The value of the governance threshold usage units before the script will be rescheduled.
 * @param {Number}
 *            intStartTime - The time when the scheduled script started
 * @param {Number}
 *            intMaxTime - The maximum time (milliseconds) for the script to reschedule. Default is 1 hour.
 * @param {Number}
 *            flPercentOfAllowedTime - the percent of allowed time based from the maximum running time. The maximum running time is 3600000 ms.
 * @returns {Number} - intCurrentTime
 * @author memeremilla
 */
rescheduleScript : function(intGovernanceThreshold, intStartTime, intMaxTime, flPercentOfAllowedTime)
{
	if(intGovernanceThreshold == null && intStartTime == null)
	{
		throw nlapiCreateError('SSS_MISSING_REQD_ARGUMENT',
				'rescheduleScript: Missing a required argument. Either intGovernanceThreshold or intStartTime should be provided.');
	}

	var stLoggerTitle = 'rescheduleScript';
	nlapiLogExecution('DEBUG', stLoggerTitle, 'Script State : ' + JSON.stringify({
		'Remaining usage' : nlapiGetContext().getRemainingUsage()
	}));

	if(intMaxTime == null)
	{
		intMaxTime = 3600000;
	}

	var intRemainingUsage = nlapiGetContext().getRemainingUsage();
	var intRequiredTime = 900000; // 25% of max time
	if((flPercentOfAllowedTime))
	{
		var flPercentRequiredTime = 100 - flPercentOfAllowedTime;
		intRequiredTime = intMaxTime * (flPercentRequiredTime / 100);
	}

	// check if there is still enough usage units
	if((intGovernanceThreshold))
	{
		nlapiLogExecution('DEBUG', stLoggerTitle, 'Script State : ' + 'Checking if there is still enough usage units.');

		if(intRemainingUsage < (parseInt(intGovernanceThreshold, 10) + parseInt(20, 10)))
		{
			nlapiLogExecution('DEBUG', stLoggerTitle, 'Script State : ' + JSON.stringify({
				'Remaining usage' : nlapiGetContext().getRemainingUsage()
			}));
			nlapiLogExecution('DEBUG', stLoggerTitle, 'Script State : ' + 'Rescheduling script.');

			var objYield = null;
			try
			{
				objYield = nlapiYieldScript();
			} catch(e)
			{
				if(e.getDetails != undefined)
				{
					throw e;
				}
				else
				{
					if(e.toString().indexOf('NLServerSideScriptException') <= -1)
					{
						throw e;
					}
					else
					{
						objYield = {
						'Status' : 'FAILURE',
						'Reason' : e.toString(),
						};
					}
				}
			}

			if(objYield.status == 'FAILURE')
			{
				nlapiLogExecution('DEBUG', stLoggerTitle, 'Script State : ' + 'Unable to Yield.');
				nlapiLogExecution('DEBUG', stLoggerTitle, 'Script State : ' + JSON.stringify({
				'Status' : objYield.status,
				'Information' : objYield.information,
				'Reason' : objYield.reason
				}));
			}
			else
			{
				nlapiLogExecution('DEBUG', stLoggerTitle, 'Script State : ' + 'Successfully reschedule the script.');
				nlapiLogExecution('DEBUG', stLoggerTitle, 'Script State : ' + JSON.stringify({
				'After resume with' : intRemainingUsage,
				'Remaining vs governance threshold' : intGovernanceThreshold
				}));
			}
		}
	}

	if((intStartTime != null && intStartTime != 0))
	{
		// get current time
		var intCurrentTime = new Date().getTime();

		// check if elapsed time is near the arbitrary value
		nlapiLogExecution('DEBUG', stLoggerTitle, 'Script State : ' + 'Check if elapsed time is near the arbitrary value.');

		var intElapsedTime = intMaxTime - (intCurrentTime - intStartTime);
		nlapiLogExecution('DEBUG', stLoggerTitle, 'Script State : ' + 'Remaining time is ' + intElapsedTime + ' ms.');

		if(intElapsedTime < intRequiredTime)
		{
			nlapiLogExecution('AUDIT', stLoggerTitle, 'Script State : ' + 'Rescheduling script.');

			// check if we are not reaching the max processing time which is 3600000 secondsvar objYield = null;
			try
			{
				objYield = nlapiYieldScript();
			} catch(e)
			{
				if(e.getDetails != undefined)
				{
					throw e;
				}
				else
				{
					if(e.toString().indexOf('NLServerSideScriptException') <= -1)
					{
						throw e;
					}
					else
					{
						objYield = {
						'Status' : 'FAILURE',
						'Reason' : e.toString(),
						};
					}
				}
			}

			if(objYield.status == 'FAILURE')
			{
				nlapiLogExecution('DEBUG', stLoggerTitle, 'Script State : ' + 'Unable to Yield.');
				nlapiLogExecution('DEBUG', stLoggerTitle, 'Script State : ' + JSON.stringify({
				'Status' : objYield.status,
				'Information' : objYield.information,
				'Reason' : objYield.reason
				}));
			}
			else
			{
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
}

};