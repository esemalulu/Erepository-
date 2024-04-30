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
 * Version    Date			      Author           Remarks
 * 1.00       23 Jul 2015     jerfernandez
 * 1.10       07 Jun 2016	  gruiz			       Standardization of code to adhere to MTS coding guidelines (all functions), added customization for partial receipt/fulfillment of  * 											 SO/PO items (cwDetailsHandlerAfterSubmit)
 * 1.2 	      04-25-2017	  Shraddha             updated the script for purchasing side.
 * 1.3        04 Jun 2018     mgotsch		       Adding in beforeSubmit function
 * 1.4		  28 Jun 2018	  mgotsch		       Making code review changes
 * 1.5		  31 Aug 2018     mgotsch		       Adding support for non-lot numbered items
 * 1.6		  12 Sept 2018    mgotsch		       Fixing bug with non-identification of cw items
 * 1.7		  19 Sept 2018    mgotsch		       Removing non-supported API (nlExtOpenWindow)
 * 1.8        11 Oct 2018     dlapp                Added Act Weight functionality - Before Load
 * 1.9        19 Oct 2018     dlapp                Added Act Weight functionality - After Submmit
 * 2.0        25 Oct 2018     dweinstein           Source IF Rate from VRA Price/Price UM
 * 2.1        30 Oct 2018     mgotsch			   Filtering functionality to CW items only
 * 2.2		  21 Nov 2018     dweinstein           Updated aftersubmit so IF could update created from VRA
 * 2.3        28 Nov 2018     pries                Updated cwShowDetailsVBBeforeLoad to fix VB HTML button issue
 * 2.4        05 Dec 2018     mgotsch			   Removing fields
 * 2.5		  10 Dec 2018	  mgotsch			   TI 144 Fixes
 * 2.6        09 Jan 2018     mgotsch			   Optimization for governance
 * 2.7        15 Jan 2018     mgotsch			   Additional optimization for governance
 * 2.8        23 Jul 2019     dweinstein     Updating to correct line number discrepency on partial fulfillments
 * 2.9        09 Aug 2019     dweinstein     TI232 - Updating getLineItemValues to use correct SO line. (2.8 updated setLineItemValue)
 * 3.0		  14 Sep 2023 	  robribei             ACS Case 5359544 - Calculate new rate on IR
 */

//-- Import cw_util.js

var stStep = '';
/**
 * Determines if Catch Weight Details exist for an item. Creates a CW Detail field when this script runs before load.
 * @param {String} type Operation types: create, edit, view, copy, print, email
 * @param {nlobjForm} form Current form
 * @param {nlobjRequest} request Request object
 * @return {void}
 */
function cwDetailsHandlerBeforeLoad(type, form, request)
{
	var stLoggerTitle = 'cwDetailsHandlerBeforeLoad';
	stStep = '.Initialization';

	nlapiLogExecution('DEBUG', stLoggerTitle + stStep, 'CW Bundle: Type: ' + type + ' | Form: ' + form + ' | Request: ' + request + ' | Script Start ==>' + Date());

	if (type == 'view' || type == 'edit' || type == 'create')
	{
		try
		{
			stStep = '.AddCWDetailTextArea';
			var objItemSublist = form.getSubList('item');
			objItemSublist.addField(FLD_CW_LINK, 'textarea', 'CW Detail');

			stStep = '.ProcessItems';

			var stItemLines = nlapiGetLineItemCount('item');
			var stItemReceiptID = nlapiGetFieldValue('tranid');
			var stCreatedFrom = nlapiGetFieldValue('createdfrom');
			var stRecordType = nlapiGetRecordType();
			var stIFIRId = nlapiGetRecordId();
			var obCreatedFromRec; // v1.8
			var stCreatedFromRecType = '';

			// v1.8: START
			if (type == 'create') {
				nlapiLogExecution('DEBUG', 'Created From ID', stCreatedFrom);
				//2.6: START - rearranging three try catch blocks into nested try catch so we don't load three records, incurring at least 2 pointless errors. Also attemptin PO load first
				try {
					obCreatedFromRec = nlapiLoadRecord('purchaseorder', stCreatedFrom);
					nlapiLogExecution('DEBUG', 'Purchase Order Loaded', stCreatedFrom);
					stCreatedFromRecType = 'purchaseorder'; // v2.0
				} catch (error) {
					// nlapiLogExecution('DEBUG', 'RMA Load Error', error.toString());
					try {
						obCreatedFromRec = nlapiLoadRecord('vendorreturnauthorization', stCreatedFrom);
						nlapiLogExecution('DEBUG', 'Vendor Return Authorization Loaded', stCreatedFrom);
						stCreatedFromRecType = 'vendorreturnauthorization'; // v2.0
					} catch (error) {
						// nlapiLogExecution('DEBUG', 'Vendor RMA Load Error', error.toString());
						try {
							obCreatedFromRec = nlapiLoadRecord('returnauthorization', stCreatedFrom);
							nlapiLogExecution('DEBUG', 'Return Authorization Loaded', stCreatedFrom);
							stCreatedFromRecType = 'returnauthorization'; // v2.0
						} catch (error) {
							// nlapiLogExecution('DEBUG', 'Purchase Order Load Error', error.toString());
						}
					}
				}
				//2.6: FINISH
				// v1.8: FINISH
			}

			if(type == 'view')
			{
				var recIFIR = nlapiLoadRecord(stRecordType, stIFIRId);
			}

			for(var intCtr = 1; intCtr <= stItemLines; intCtr++)
			{

				// v1.8: START
				if (type == 'create') {
					var obItemReceipt;
					var inActWeight;
					if (Eval.isEmpty(obCreatedFromRec)) {
						return;
					}

					if (stRecordType == 'itemreceipt') {
						var obItemReceipt = nlapiGetNewRecord();
						inActWeight = obCreatedFromRec.getLineItemValue('item', 'custcol_jf_cw_act_wght', intCtr);
						if (!Eval.isEmpty(inActWeight)) {
							nlapiLogExecution('DEBUG', 'RMA Item: ' + intCtr, 'Actual Weight: ' + inActWeight);
							obItemReceipt.setLineItemValue('item', 'custcol_jf_cw_catch_weight', intCtr, inActWeight);
						}
					} else if (stRecordType == 'itemfulfillment') {
						var obItemFulfillment = nlapiGetNewRecord();
						inActWeight = obCreatedFromRec.getLineItemValue('item', 'custcol_jf_cw_act_wght', intCtr);
						if (!Eval.isEmpty(inActWeight)) {
							nlapiLogExecution('DEBUG', 'VRMA Item: ' + intCtr, 'Actual Weight: ' + inActWeight);
							obItemFulfillment.setLineItemValue('item', 'custcol_jf_cw_catch_weight', intCtr, inActWeight);
						}
						//v2.0 If this is an IF created from a VRA, set Rate from the VRA Price/Price UM
						if (stCreatedFromRecType === 'vendorreturnauthorization'){
							var vraPricePriceUM = obCreatedFromRec.getLineItemValue('item','rate', intCtr);
							nlapiLogExecution('DEBUG','VRMA Item: ' + intCtr, 'Price/Price UM: ' + vraPricePriceUM);
							obItemFulfillment.setLineItemValue('item', 'rate', intCtr, vraPricePriceUM);
						}
					}
				}
				// v1.8: FINISH

				//nlapiSetLineItemDisabled('item', 'custcol_ifd_cwrecordid', true, intCtr);

				var stItemId = nlapiGetLineItemValue('item', 'item', intCtr);
				//var stIsCatchWeightItem = nlapiLookupField('item', stItemId, FLD_CATCH_WEIGHT_ITEM); //v2.6 commented out
				var stIsCatchWeightItem = nlapiGetLineItemValue('item', 'custcol_cw_indicator', intCtr); //v2.6 switching from lookupField to pull from line item

				stStep = '.DetermineIfCWItem';

				if(stIsCatchWeightItem == 'T')
				{
					stStep = '.LaunchSuitelet';

					/* Open suitelet to input individual weights/case */
					var stSLUrl = nlapiResolveURL('SUITELET', SCRIPT_CATCH_WEIGHT_SL, DEPLOY_CATCH_WEIGHT_SL);

					var stUrl = stSLUrl +
						'&custpage_id=' + stItemReceiptID +
						'&custpage_item=' + stItemId +
						'&custpage_line=' + intCtr +
						'&custpage_rectype=' + stRecordType +
						'&custpage_mode=' + type;

					if(!Eval.isEmpty(stCreatedFrom))
					{
						stUrl += '&custpage_createdfrom=' + stCreatedFrom;
					}

					// if(!Eval.isEmpty(stQty))
					// {
					// stUrl += '&custpage_ifqty=' + stQty;
					// }

					nlapiLogExecution('DEBUG', stLoggerTitle + stStep, 'Suitelet URL: ' + stUrl + ' | Window Title: ' + HC_POPUP_WINDOW_TITLE + ' | Window Width: ' + HC_POPUP_WIDTH + ' | Window Height: ' + HC_POPUP_HEIGHT);

					// var stAction = 'onclick="nlExtOpenWindow(\'' + stUrl + '\', \'' + HC_POPUP_WINDOW_TITLE + '\', ' +
					// HC_POPUP_WIDTH  + ', ' + HC_POPUP_HEIGHT + ', this, true, null)"';

					if(type == 'view')
					{
						/*Load IF*/
						var stCWRecID = recIFIR.getLineItemValue('item', 'custcol_ifd_cwrecordid', intCtr);
						var stQty = nlapiGetLineItemValue('item', 'quantity', intCtr);

						stUrl += '&custpage_cwdetailid=' + stCWRecID;
						stUrl += '&custpage_ifqty=' + stQty;

						// var stAction = 'onclick="nlExtOpenWindow(\'' + stUrl+ '\', \'' + HC_POPUP_WINDOW_TITLE + '\', ' +  //commented out v1.7
						// 	HC_POPUP_WIDTH  + ', ' + HC_POPUP_HEIGHT + ', this, true, null)"';

						var funcCWDetailUpdate = "require([],function(){window.open('" + stUrl + "','_blank','width=500, height=400',true);});"; //v1.7

					}

					else
					{
						if (!Eval.isEmpty(stIFIRId)) { // v1.8
							// var stAction = 'onclick="nlExtOpenWindow(\'' + stUrl+'&custpage_cwdetailid=' +  '\'' + "+nlapiGetLineItemValue(\'item\', \'custcol_ifd_cwrecordid\'," + intCtr + ")"+', \'' + HC_POPUP_WINDOW_TITLE + '\', ' + //commented out v1.7
							// 	HC_POPUP_WIDTH  + ', ' + HC_POPUP_HEIGHT + ', this, true, null)"';
							/*Load IF*/
							var recIFIR = nlapiLoadRecord(stRecordType, stIFIRId);
							var stCWRecID = recIFIR.getLineItemValue('item', 'custcol_ifd_cwrecordid', intCtr);
							var stQty = nlapiGetLineItemValue('item', 'quantity', intCtr);

							stUrl += '&custpage_cwdetailid=' + stCWRecID;
							stUrl += '&custpage_ifqty=' + stQty;
							var funcCWDetailUpdate = "require([],function(){window.open('" + stUrl + "','_blank','width=500, height=400',true);});"; //v1.7

							//var funcCWDetailUpdate = "require([],function(){window.open('" + stUrl +'&custpage_cwdetailid=' +  '\'' + "+nlapiGetLineItemValue(\'item\', \'custcol_ifd_cwrecordid\'," + intCtr + ")"+",'width=500, height=400',true);});"; //v1.7
						}
					}

					if (!Eval.isEmpty(stIFIRId)) { // v1.8
						//var stLinkText = '<a class="i_inventorydetailset" ' + stAction + '"></a>';//v1.7 commented out
						var html = '<button onclick="' + funcCWDetailUpdate + '">' + 'CW Details' + '</button>';


						//nlapiLogExecution('DEBUG', stLoggerTitle + stStep, 'Link to process: ' + stLinkText);//v1.7 commented out
						nlapiLogExecution('DEBUG', stLoggerTitle + stStep, 'Link to process: ' + html); //v1.7

						//objItemSublist.setLineItemValue(FLD_CW_LINK, intCtr, stLinkText); //v1.7 commented out
						objItemSublist.setLineItemValue(FLD_CW_LINK, intCtr, html); //v1.7

						stStep = '.CheckIFCWDetailsExist';

						var stCWDetailId = stItemReceiptID + '_' + stItemId + '_' + intCtr;
						nlapiLogExecution('DEBUG', 'stCWDetailId: '+stCWDetailId)//v1.6
						// var stCWDetailRecordId = getCatchWeightDetails(stCWDetailId);
						// nlapiLogExecution('DEBUG', 'stCWDetailRecordId: '+stCWDetailRecordId)//v1.6

						// if(!Eval.isEmpty(stCWDetailRecordId))
						// {
						// 	var flCatchWeight = Parse.forceFloat(nlapiGetLineItemValue('item', COL_CATCH_WEIGHT, intCtr));

						// 	if(flCatchWeight > 0)
						// 	{
						// 		nlapiSetLineItemDisabled('item', COL_CATCH_WEIGHT, true, intCtr);
						// 		nlapiLogExecution('DEBUG', stLoggerTitle, 'Catch Weight Field Disabled. Catch Weight: ' + flCatchWeight);
						// 	}

						// 	nlapiLogExecution('DEBUG', stLoggerTitle + stStep, 'Catch Weight: ' + flCatchWeight);
						// }

						// else
						// {
						// 	nlapiLogExecution('DEBUG', stLoggerTitle + stStep, 'CW Details do not exist. | Catch Weight Detail Record: ' + stCWDetailRecordId);
						// }
					}
				}
			}
		}

		catch(error)
		{
			if(error.getDetails != undefined)
			{
				nlapiLogExecution('ERROR', 'Process Error', 'Unable to ' + stStep + ': ' + error.getCode() + ': ' + error.getDetails());
				throw error;
			}
			else
			{
				nlapiLogExecution('ERROR', 'Unexpected Error', 'Unable to ' + stStep + ': ' + error.toString());
				throw nlapiCreateError('99999', error.toString());
			}
		}
	}
	else
	{
		nlapiLogExecution('ERROR', stLoggerTitle + stStep, 'Type: ' + type + ' is not supported for this function. | CW Bundle: Script End ==>' + Date());
		return;
	}

	nlapiLogExecution('DEBUG', stLoggerTitle + stStep, 'CW Bundle: Script End ==>' + Date());
}

/**
 * Update Catch Weight Details Before Submit
 * @param type
 * @param form
 * @param request
 * @author mgotsch - 6/12
 * Commented out, processing now done by MR Script (_CW | M R | Process Open Tasks)

 function beforeSubmit_DetailsHandler(type, form, request)
 {
	var stLoggerTitle = 'cwDetailsHandlerBeforeSubmit';
	var stStep = '.Initialization';


	nlapiLogExecution('DEBUG', stLoggerTitle + stStep, 'CW Bundle: Type: ' + type + ' | Form: ' + form + ' | Request: ' + request + ' | BeforeSubmit Start ==>' + Date());
    if (type == 'view' || type == 'edit' || type == 'create')
	{

    	var stItemLines = nlapiGetLineItemCount('item');
		var stRecordType = nlapiGetRecordType();
		var stIFId = nlapiGetRecordId();
        var arrCWItemIds = [];

		//Check to see if the record is an item fulfillment (deployed on both IF and IR)
		if(stRecordType == 'itemfulfillment')
		{
			nlapiLogExecution('DEBUG', stLoggerTitle + stStep, 'Item Fulfillment ID #' + stIFId);
            //Loop through the line items and determine whether or not that line is being fulfilled
			for(var intCtr = 1; intCtr <= stItemLines; intCtr++)
			{
				stStep = '.DetermineItemReceive';

				var stItemReceived = nlapiGetLineItemValue('item', 'itemreceive', intCtr);

				//If item "Fulfill" check mark is selected, pull the item ID determine if it's a catch weight item
				if(stItemReceived == 'T')
				{
					var stItemId = nlapiGetLineItemValue('item', 'item', intCtr);
					var stIsCatchWeightItem = nlapiLookupField('item', stItemId, FLD_CATCH_WEIGHT_ITEM);

					stStep = '.DetermineIfCWItem';

					if(stIsCatchWeightItem == 'T')
					{
						arrCWItemIds.push(stItemId);
						stStep = '.EndLine';
						nlapiLogExecution('DEBUG', stLoggerTitle + stStep, 'Finished looping through line item id: '+stItemId);

					}
				}
			}
			//Determine if there were any "catch weight" items on the IF
			if(arrCWItemIds.length > 0)
			{
				//Initialize filters for NS Confirmation Ref # == IF ID & WMS Task Item == IF Current Line Item
				var arrSearchFilters = new Array();
				arrSearchFilters[0] = new nlobjSearchFilter('custrecord_wmsse_nsconfirm_ref_no', null, 'anyOf', stIFId);
				arrSearchFilters[1] = new nlobjSearchFilter('custrecord_wmsse_sku', null, 'anyOf', arrCWItemIds);

				//Attempt to run search "***SCRIPT USE*** Active WMS Open Pick Tasks" on array of CW items determined above
				try
				{
					stStep = '.SearchLoad';
					nlapiLogExecution('DEBUG', stLoggerTitle + stStep, 'Attempting to run search of WMS open tasks');
					var objWmsOTSearchResults = nlapiSearchRecord('customrecord_wmsse_trn_opentask','customsearch_wms_open_pick_tasks', arrSearchFilters, null);
				}
				catch(error)
				{
					stStep = '.SearchLoadError';
					nlapiLogExecution('ERROR',stLoggerTitle + stStep, error.toString());
				}

				//Determine if script returned results, otherwise log that no WMS tasks were found by search
				if(objWmsOTSearchResults != null)
				{
					//Loop through array of different "catch weight" items, and sum up the amount of weight from WMS open task records
					for (var intCWArrayIndex=0; intCWArrayIndex<arrCWItemIds.length; intCWArrayIndex++) {
						var flTotalWeightSum = 0.00;
		                var stItemId = arrCWItemIds[intCWArrayIndex];
		                for (var intSearchIndex = 0; intSearchIndex < objWmsOTSearchResults.length; intSearchIndex++)
		                {
		                	var objSearchResult = objWmsOTSearchResults[intSearchIndex];
		                	var stResultItem = objSearchResult.getValue('custrecord_wmsse_sku');
		                	if (stResultItem == stItemId)
	                        {
		    					var flTotalWeight = objSearchResult.getValue('custrecord_wmsse_total_weight');
		    					flTotalWeightSum += parseFloat(flTotalWeight);
	                        }
		                }
		                //Searching through the lines on the IF for the pertaining item to update CW value
		                for(var intLineNum = 1; intLineNum <= stItemLines; intLineNum++)
		                {
							var stLineItemId = nlapiGetLineItemValue('item', 'item', intLineNum);
							if(stItemId == stLineItemId)
							{
								try
								{
									stStep = '.CatchWeightUpdate';
									nlapiLogExecution('DEBUG', stLoggerTitle + stStep, 'Attempting to update CW of item id: '+stItemId+' with a total weight of' + flTotalWeightSum);
									nlapiSetLineItemValue('item', 'custcol_jf_cw_catch_weight', intLineNum, flTotalWeightSum);
								}
								catch(error)
								{
					              	stStep = '.CatchWeightUpdateError';
									nlapiLogExecution('ERROR',stLoggerTitle + stStep, error.toString());
								}
							}
		                }
					}
				}
				else
				{
					stStep = '.NOSearchResults';
					nlapiLogExecution('DEBUG', stLoggerTitle + stStep, 'No search results returned for these items (ids: '+arrCWItemIds+').');
				}
			}
		}
		stStep = '.Exit';
		nlapiLogExecution('DEBUG', stLoggerTitle + stStep, 'Finished looping through line items | BeforeSubmit End ==>' + Date());

	}
}
 */

/**
 * Update Catch Weight Details after submit
 * @param type
 * @param form
 * @param request
 * @author jfernandez
 * @author gruiz - 5/19
 */
function cwDetailsHandlerAfterSubmit(type, form, request)
{

	var stLoggerTitle = 'cwDetailsHandlerAfterSubmit';
	stStep = '.Initialization';

	nlapiLogExecution('DEBUG', stLoggerTitle + stStep, 'CW Bundle: Type: ' + type + ' | Script Start ==>' + Date());

	try
	{
		// v1.9: START
		// v2.4 START removing create
		//      if (type == 'create') {
		//        	var stRecordType = nlapiGetRecordType();
		// var stRecordId = nlapiGetRecordId();
		// var objRecord = nlapiLoadRecord(stRecordType, stRecordId);
		//        	var ordertype = objRecord.getFieldValue('ordertype');
		//        	var stIdRec = objRecord.getFieldValue('createdfrom');
		//        	var stRecUpdate;

		//        	if (ordertype == 'RtnAuth') {
		//          	stRecUpdate = 'returnauthorization';
		//        	} else if (ordertype == 'VendAuth') {
		//          	stRecUpdate = 'vendorreturnauthorization';
		//       	 } else if (ordertype == 'PurchOrd') {
		// 	stRecUpdate = 'purchaseorder';
		// } else if (ordertype == 'SalesOrd') {
		// 	stRecUpdate = 'salesorder';
		// }

		//       	if (Eval.isEmpty(stRecUpdate)) {
		//          	return;
		//        	}

		//        var rec = nlapiLoadRecord(stRecUpdate, stIdRec);
		//        var intItemLines = objRecord.getLineItemCount('item');

		//        for (var intCtr = 1; intCtr <= intItemLines; intCtr++) {
		// 	var stIdItem = objRecord.getLineItemValue('item', 'item', intCtr); //v2.1
		// 			var bCatchWeightItem = nlapiLookupField('item', stIdItem, FLD_CATCH_WEIGHT_ITEM); //v2.1 looking up whether or not item is a CW item
		// 			nlapiLogExecution('DEBUG', stLoggerTitle + stStep, 'bCatchWeightItem: ' + bCatchWeightItem + ' | Item: ' + stIdItem); //v2.1
		// 			if(bCatchWeightItem == 'T') { //v2.1 if it is a cw, complete processing. if not, do not update
		// 				var stIRCatchWeight = objRecord.getLineItemValue('item', COL_CATCH_WEIGHT, intCtr);
		//           var flIRCatchWeight = Parse.forceFloat(stIRCatchWeight);
		//           var flCurrentQty = Parse.forceFloat(objRecord.getLineItemValue('item', 'quantity', intCtr));
		//           var stOrderLine = objRecord.getLineItemValue('item', 'orderline', intCtr);
		//           var stLineRecToUpdate = rec.findLineItemValue('item', 'line', stOrderLine);
		//           var flAvgWeight = Parse.forceFloat(rec.getLineItemValue('item', COL_AVG_WGHT, stLineRecToUpdate));

		//           nlapiLogExecution('DEBUG', 'After Submit - Create - Calculation', 'Catch Wt: ' + stIRCatchWeight + ' | Current Qty: ' + flCurrentQty + ' | Avg Wt: ' + flAvgWeight);

		//           var inRate = Parse.forceFloat(rec.getLineItemValue('item', 'rate', intCtr));
		//           if (Eval.isEmpty(stIRCatchWeight) || flIRCatchWeight === 0) {
		//             flAmount = inRate * flAvgWeight * flCurrentQty;
		//           } else {
		//             flAmount = inRate * flIRCatchWeight;
		//           }
		//           rec.setLineItemValue('item', 'amount', stLineRecToUpdate, roundOffValue(flAmount,2));
		// 			} //v2.1
		//        }
		//        var stRecId = nlapiSubmitRecord(rec, false, true);
		//      }
		//2.4 end
		// v1.9: FINISH

		if(type == 'create' || type == 'edit' || type == 'ship') //commented by Shraddha 3/28 to execute only on Edit.
			//if(type == 'edit' || type == 'ship')
		{
			stStep = '.LoadRecordAfterSubmit';
			var stRecordType = nlapiGetRecordType();
			var stRecordId = nlapiGetRecordId();

			var objRecord = nlapiLoadRecord(stRecordType, stRecordId, {recordmode: 'dynamic'});

			var stIdRec = objRecord.getFieldValue('createdfrom');
			var ordertype = objRecord.getFieldValue('ordertype');
			var stRecType = objRecord.getRecordType();
			var sTranId = objRecord.getFieldValue('tranid');
			var sStatus = objRecord.getFieldValue('status');
			var bReadyToUpdate = false;
			var stPrefix = '';
			var stQtyColumn = '';
			//var stCustomAmountColumn = ''; //v2.4
			//var stPendingColumn = ''; //v2.4
			var arrCWRecords = [];

			nlapiLogExecution('DEBUG', stLoggerTitle + stStep, 'IF Status: ' + sStatus);

			var stRecUpdate = (stRecType == 'itemfulfillment') ? 'salesorder' : 'purchaseorder';

			nlapiLogExecution('DEBUG', stLoggerTitle + stStep, 'ordertype: ' + ordertype);
			if (ordertype == 'RtnAuth') {
				stRecUpdate = 'returnauthorization';
			} else if (ordertype == 'VendAuth') {	//v2.2 include copied logic from the 'if create' area to work for edit/ship
				stRecUpdate = 'vendorreturnauthorization';
			}
			//v2.2 change from stRecordType == 'itemfulfillment' to stRecUpdate =='salesorder' to handle IF from VRA case
			if(stRecUpdate == 'salesorder' && sStatus != 'Shipped'){
				return;
			}


			if(stRecordType == 'itemfulfillment')
			{
				stPrefix = 'IF';
				//stQtyColumn = 'quantityfulfilled'; //Updated by Shraddha on 2/10 to use Quantitypicked instead of fulfilled
				stQtyColumn = 'quantitypicked';
				//stCustomAmountColumn = 'custcol_ifd_cw_fulfilled_amount'; //v2.4
				//stPendingColumn = 'custcol_ifd_cw_pendfulfillamt'; //v2.4
			}

			else if(stRecordType == 'itemreceipt')
			{
				stPrefix = 'IR';
				stQtyColumn = 'quantityreceived';
				//stCustomAmountColumn = 'custcol_ifd_cw_received_amount'; //v2.4
				//stPendingColumn = 'custcol_ifd_cw_pendreceiptamt'; //v2.4

			}

			nlapiLogExecution('DEBUG', stLoggerTitle, 'Qty type: ' + stQtyColumn);

			//Load PO record and update average weight per physical unit with Actual Weight received
			var intItemLines = objRecord.getLineItemCount('item'); //IF/IR

			var rec = nlapiLoadRecord(stRecUpdate, stIdRec);
			var recLines = rec.getLineItemCount('item');

			stStep = '.ActualFulfillment';

			var itemIdArray = new Array();
			for(var intCtr = 1; intCtr <= intItemLines; intCtr++) {
				objRecord.selectLineItem('item', intCtr);
				var bIsChecked = objRecord.getCurrentLineItemValue('item', 'itemreceive');
				var stIdItem = objRecord.getCurrentLineItemValue('item', 'item');

				if (bIsChecked != null && bIsChecked == 'T')
					itemIdArray.push(stIdItem);
			}

			if (itemIdArray != null && itemIdArray.length > 0){
				var filters = new Array();
				filters.push(new nlobjSearchFilter('internalid', null, 'anyof', itemIdArray));

				var itemList = nlapiSearchRecord(null, 'customsearch_css_get_item_details', filters);
			}

			for(var intCtr = 1; intCtr <= intItemLines; intCtr++)
			{
				objRecord.selectLineItem('item', intCtr);

				var objCWRecords = {};
				var stOrderLine = objRecord.getCurrentLineItemValue('item', 'orderline');
				var stIdItem = objRecord.getCurrentLineItemValue('item', 'item');
				var flQty = objRecord.getCurrentLineItemValue('item', 'quantity');
				var isCWprocessed = objRecord.getCurrentLineItemValue('item', 'custcol_is_catch_weight_item');
				var bIsChecked = objRecord.getCurrentLineItemValue('item', 'itemreceive');

				if (bIsChecked == null || bIsChecked == 'F')
					continue;

				nlapiLogExecution('DEBUG', stLoggerTitle + stStep, 'IF Line ' + intCtr + ', Order Line ' + stOrderLine + ', Item: ' + stIdItem + ' Is Processed ' +isCWprocessed);
				//var bCatchWeightItem = nlapiLookupField('item', stIdItem, FLD_CATCH_WEIGHT_ITEM); //v2.6 commented out
				var bCatchWeightItem = getCatchWeightIndicator(itemList, stIdItem);//nlapiGetLineItemValue('item', 'custcol_cw_indicator', intCtr); //v2.6 switching from lookupField to pull from line item

				nlapiLogExecution('DEBUG', stLoggerTitle + stStep, 'bCatchWeightItem: ' + bCatchWeightItem + ' | Is Processed: ' +isCWprocessed);
				if((bCatchWeightItem == 'T' || bCatchWeightItem == true) && isCWprocessed != 'T')
				{
					//Set Actual Weight
					var stIRCatchWeight = objRecord.getCurrentLineItemValue('item', COL_CATCH_WEIGHT);
					//rec.setLineItemValue('item', COL_ACTUAL_WEIGHT, intCtr, flIRCatchWeight);
					bReadyToUpdate = true;


					var stLineRecToUpdate = rec.findLineItemValue('item', 'line', stOrderLine);
					//var flQty = Parse.forceFloat(rec.getLineItemValue('item', stQtyColumn, stLineRecToUpdate));
					var flPreviousActWeight = Parse.forceFloat(rec.getLineItemValue('item', COL_ACTUAL_WEIGHT, stLineRecToUpdate)); //v2.9 DW_8/09/19 fix line reference from IF line to SO line

					var flIRCatchWeight = Parse.forceFloat(stIRCatchWeight);
					var flCombinedWeight = flIRCatchWeight + flPreviousActWeight;

					nlapiLogExecution('DEBUG', 'Log Data', 'IR Act Wt: ' + flIRCatchWeight); // v1.9

					if(!Eval.isEmpty(stIRCatchWeight))
					{
						// rec.setLineItemValue('item', COL_ACTUAL_WEIGHT, stLineRecToUpdate, flCombinedWeight); // v1.9
						rec.setLineItemValue('item', COL_ACTUAL_WEIGHT, stLineRecToUpdate, flIRCatchWeight);
					}
					// var flRecToUpdateQty = Parse.forceFloat(rec.getLineItemValue('item', 'quantity', stLineRecToUpdate));

					//var flPreviousAmount = Parse.forceFloat(rec.getLineItemValue('item', 'custcol_ifd_custom_amount', stLineRecToUpdate)); //2.4
					stStep = '.RecordToBeUpdated='+stRecUpdate;

					var flRate = 0.00;
					var flWeight = 0.00;
					var flFulfilledAmount = 0.00;
					var flPendingAmount = 0.00;
					var flCurrentQty = 0.00;
					// var flQty = 0.00;
					var flPriceUM = 0.00;
					var flRemainingQty = 0.00;
					var flAmount = 0.00;
					var flParentQty = 0.00;
					var flAvgWeight = 0.00;

					if(bIsChecked == 'T')
					{
						stStep = '.ComputeAmountsAndRates';


						flCurrentQty = Parse.forceFloat(objRecord.getCurrentLineItemValue('item', 'quantity'));
						flParentQty = Parse.forceFloat(rec.getLineItemValue('item', 'quantity', stLineRecToUpdate));
						flPriceUM = Parse.forceFloat(rec.getLineItemValue('item', COL_PRICE_UM, stLineRecToUpdate));
						flAvgWeight = Parse.forceFloat(rec.getLineItemValue('item', COL_AVG_WGHT, stLineRecToUpdate));
						flWeight = flCombinedWeight / flQty;

						if(Eval.isEmpty(stIRCatchWeight))
						{
							/* If we don't specify anything for the catch weight, we will ignore it and just use the item weight instead */
							flWeight = flAvgWeight;
							nlapiLogExecution('DEBUG', stLoggerTitle, 'Catch Weight is empty or null. Using avg weight');
						}

						flFulfilledAmount = (flWeight * flPriceUM * flQty);
						flRate = flFulfilledAmount / flQty;
						flFulfilledAmount = roundOffValue(flFulfilledAmount,2); //v2.4 removing flPreviousAmount addition from roundOffValue function
						flRemainingQty = flParentQty - flQty;

						flPendingAmount = Parse.forceFloat(flAvgWeight * flRemainingQty * flPriceUM);
						flAmount = Parse.forceFloat(flPendingAmount + flFulfilledAmount);

						nlapiLogExecution('DEBUG', stLoggerTitle + stStep, 'Transaction Qty: ' + flParentQty + ' IF Qty: ' + flQty + 'Remaining Qty: ' + flRemainingQty + 'Fulfilled Amount: ' + flFulfilledAmount + 'Pending Amount: ' + flPendingAmount + ' Total Amount: ' + flAmount);

						// v1.9: START
						var inRate;
						if (stRecordType == 'itemreceipt') {
							inRate = Parse.forceFloat(objRecord.getCurrentLineItemValue('item', 'custcol_jf_cw_price_um'));
							rec.setLineItemValue('item', COL_PRICE_UM, stLineRecToUpdate, inRate);
							rec.setLineItemValue('item', 'rate', stLineRecToUpdate, inRate);
						} else {
							inRate = Parse.forceFloat(rec.getLineItemValue('item', 'custcol_jf_cw_price_um', stLineRecToUpdate)); //v2.9 DW_8/09/19 fix line reference from IF line to SO line
						}

						if (Eval.isEmpty(stIRCatchWeight)) {
							flAmount = inRate * flAvgWeight * flCurrentQty;
						} else {
							flAmount = inRate * flIRCatchWeight;
						}
						// v1.9: FINISH
						nlapiLogExecution('DEBUG', 'Amount Calculation', 'Price UM: ' + inRate + ' | Avg Wt: ' + flAvgWeight + ' | Qty: ' + flCurrentQty);

						stStep = '.SetLineItems';
						//rec.setLineItemValue('item', 'custcol_ifd_fulfilled_rate', stLineRecToUpdate, flRate); //2.4
						//rec.setLineItemValue('item', stCustomAmountColumn, stLineRecToUpdate, roundOffValue(flFulfilledAmount,2)); //v2.4
						//rec.setLineItemValue('item', stPendingColumn, stLineRecToUpdate, roundOffValue(flPendingAmount,2)); //v2.4
						rec.setLineItemValue('item', 'amount', stLineRecToUpdate, roundOffValue(flAmount,2));
					}

					if(stRecUpdate == 'salesorder')
					{
						rec.setLineItemValue('item', COL_CW_AMOUNT, stLineRecToUpdate, flFulfilledAmount);
						//objRecord.setLineItemValue('item', 'rate', stLineRecToUpdate, flRate);
						objRecord.setCurrentLineItemValue('item', 'custcol_is_catch_weight_item', 'T');  //v2.8 DW_7/23/19 fix line reference from SO line stLineRecToUpdate to IF line intCtr
					}
					//v2.5 adding stRecUpdate != 'returnauthorization' to if condition
					if(stRecordType == 'itemreceipt' && stRecUpdate != 'returnauthorization')
					{
						//objRecord.setLineItemValue('item', 'rate', stLineRecToUpdate, flPriceUM);
						objRecord.setCurrentLineItemValue('item', 'custcol_is_catch_weight_item', 'T'); //v2.8 DW_7/23/19 fix line reference from PO line stLineRecToUpdate to IR line intCtr
						stStep = '.SetItem';
						var recItem = nlapiLoadRecord('inventoryitem', stIdItem);
						recItem.setFieldValue('custitem_price_per_um', flPriceUM);
						recItem.setFieldValue('cost', inRate); // 24 Oct: DLapp: Changed from flPriceUM to inRate
						var Itemrec = nlapiSubmitRecord(recItem, false, true);
						nlapiLogExecution('DEBUG', stLoggerTitle + stStep, 'Record Updated - Item: ' + Itemrec + ' | ID: ' + recItem);
					}
					//v1.5 START
					//v2.7 START - commenting out v1.5 validation
					// var stItemType = objRecord.getLineItemValue('item', 'itemtype', intCtr);
					// if(stItemType == 'InvtPart'){
					// 	var stItemRecType = nlapiLoadRecord('inventoryitem', stIdItem).getRecordType();
					// } else if(stItemType == 'Assembly') {
					// 	var stItemRecType = nlapiLoadRecord('assemblyitem', stIdItem).getRecordType();
					// }
					// var stNonLotItemTypeParam = nlapiGetContext().getSetting('SCRIPT', 'custscript_nonlot_item_types');
					// var arrNonLotItemType = stNonLotItemTypeParam.split(',');
					// nlapiLogExecution('DEBUG', stLoggerTitle + stStep, 'stItemRecType: ' + stItemRecType + ' | arrNonLotItemType: ' + arrNonLotItemType);
					// nlapiLogExecution('DEBUG', stLoggerTitle + stStep, 'typeOf: ' + typeof arrNonLotItemType);

					// if(!(arrNonLotItemType.indexOf(stItemRecType) > -1)){
					//Update catch weight field on Inventory Number record
					updateCatchWeight(stRecUpdate, stIdItem, intCtr, sTranId);
					// }//v2.7 END
					//V1.5 END
				}
				

				else
				{
					nlapiLogExecution('DEBUG', stLoggerTitle + stStep, 'Item #:' + stIdItem + 'is not a catch weight item. Skipping this line...');
				}

				/* Collect CW Custom Record ID */
				var stCWRecordId = objRecord.getCurrentLineItemValue('item', 'custcol_ifd_cwrecordid');

				if(!Eval.isEmpty(stCWRecordId))
				{
					objCWRecords.itemid = stIdItem;
					objCWRecords.custrecordid = stCWRecordId;
					objCWRecords.linenum = intCtr;

					arrCWRecords.push(objCWRecords);
				}

				objRecord.commitLineItem('item');
			}

			// v3.0 - START
			// ACS CASE 5359544
			if(stRecordType == 'itemreceipt')
			{
				var intItemLines = objRecord.getLineItemCount('item');
				for(var intCtr = 1; intCtr <= intItemLines; intCtr++) {
					objRecord.selectLineItem('item', intCtr);
					var bCatchWeightItem = objRecord.getCurrentLineItemValue('item', 'custcol_cw_indicator');
					if(bCatchWeightItem == 'T') {
						var inActWt = objRecord.getCurrentLineItemValue('item', 'custcol_jf_cw_catch_weight');
						nlapiLogExecution('DEBUG', 'IR Item: ' + intCtr, 'Actual Weight: ' + inActWt);
						
						var inPriceUM = objRecord.getCurrentLineItemValue('item', 'custcol_jf_cw_price_um');
						nlapiLogExecution('DEBUG', 'IR Item: ' + intCtr, 'Price/Price UM: ' + inPriceUM);
						var inNewRate;

						if (!Eval.isEmpty(inActWt)) {
							// Price UM * Act Wt / Qty
							var inQty = objRecord.getCurrentLineItemValue('item', 'quantity');
							inNewRate = inPriceUM * inActWt / inQty;
						} else {
							// Price UM * Avg Wt
							var inAvgWt = objRecord.getCurrentLineItemValue('item', 'custcol_jf_cw_avg_wght');
							inNewRate = inPriceUM * inAvgWt;
						}

						nlapiLogExecution('DEBUG', 'IR Item: ' + intCtr, 'New Rate: ' + inNewRate);

						objRecord.setCurrentLineItemValue('item', 'rate', inNewRate.toFixed(2));

						objRecord.commitLineItem('item');
						bReadyToUpdate = true;
					}
				}
			}
			// v3.0 - END

			if(bReadyToUpdate)
			{
				stStep = '.UpdateSubmitRecord';
				//nlapiSubmitField('itemreceipt', objRecord.getFieldValue('id'),'rate',flPriceUM);
				nlapiLogExecution('AUDIT', stLoggerTitle + stStep, 'Record Updated - Type: ' + stRecUpdate + ' | ID: ' + stRecordType);
				var stRecID = nlapiSubmitRecord(rec, false, true);
				nlapiLogExecution('AUDIT', stLoggerTitle + stStep, 'Record Updated - Type: ' + stRecUpdate + ' | ID: ' + stRecID);
				// if(stRecordType == 'itemreceipt'){
				var stIRID = nlapiSubmitRecord(objRecord, true, true);
				nlapiLogExecution('AUDIT', stLoggerTitle + stStep, 'Record Updated - Type: ' + stRecUpdate + ' | ID: ' + stRecID);
				//}
			}

			else
			{
				nlapiLogExecution('DEBUG', stLoggerTitle + stStep, 'No record update required');
			}

			//stTranId = objRecord.getFieldValue('tranid');
			stTranId = objRecord.getFieldValue('id');
			stStep = '.UpdateCustomRecordCatchWeight';

			if(arrCWRecords.length > 0)
			{

				for(var intCtrA = 0; intCtrA < arrCWRecords.length; intCtrA++)
				{
					var objRecordDetail = arrCWRecords[intCtrA];
					var stCustomRecordId = objRecordDetail.custrecordid;

					var stReferenceID = stPrefix + sTranId + '_' + objRecordDetail.itemid + '_' + objRecordDetail.linenum;
					nlapiLogExecution('AUDIT', stLoggerTitle + stStep, +stCustomRecordId +'Tran id:' +stTranId);

					nlapiSubmitField(REC_CATCH_WEIGHT_DETAILS, stCustomRecordId, ['custrecord_jf_cw_cwd_id', FLD_ITEM_RECEIPT], [stReferenceID, stTranId]);
					nlapiLogExecution('AUDIT', stLoggerTitle + stStep, 'Updated ' + stCustomRecordId + ' with new Catch Weight Details ID: ' + stReferenceID +':'+stTranId);
				}
			}

		}
	}
	catch(error)
	{
		if(error.getDetails != undefined)
		{
			nlapiLogExecution('ERROR', 'Process Error', 'Unable to ' + stStep + ': ' + error.getCode() + ': ' + error.getDetails());
			throw error;
		}
		else
		{
			nlapiLogExecution('ERROR', 'Unexpected Error', 'Unable to ' + stStep + ': ' + error.toString());
			throw nlapiCreateError('99999', error.toString());
		}
	}
	nlapiLogExecution('DEBUG', stLoggerTitle + stStep, 'CW Bundle: Script End ==>' + Date());
}


/**
 * Update Catch Weight Details
 * @param sRecUpdate
 */
function updateCatchWeight(stRecordToUpdate, stItemId, stCurrentLine, stTranId)
{
	var stLoggerTitle = 'updateCatchWeight';
	stStep = '.Initialization';

	nlapiLogExecution('DEBUG', stLoggerTitle + stStep, 'Function entry: Record to update: ' + stRecordToUpdate + ' | Item: ' + stItemId + ' | Current Line ' + stCurrentLine + ' | Transaction ID: ' + stTranId);

	try
	{
		stStep = '.GetInventoryDetail';
		nlapiSelectLineItem('item', stCurrentLine);
		var flTotalCatchWeight = Parse.forceFloat(nlapiGetCurrentLineItemValue('item', COL_CATCH_WEIGHT));
		var objInvDetailSubrecord = nlapiViewCurrentLineItemSubrecord('item', 'inventorydetail');

		if(objInvDetailSubrecord)
		{
			var flItemQty = nlapiGetCurrentLineItemValue('item', 'quantity');
			var flQtyCounter = 0;
			var intDetailLineCounter = 1;

			stStep = '.ProcessItems';
			while(flQtyCounter < flItemQty)
			{
				try
				{
					/*Loop inside the Inventory Detail*/
					objInvDetailSubrecord.selectLineItem('inventoryassignment', intDetailLineCounter);
					//var stInvDetailId = objInvDetailSubrecord.getCurrentLineItemValue('inventoryassignment','internalid'); - jfernandez original comment

					var stSerialNumber, stSerialId;
					var stSourceType = 'Item Fulfillment';

					if(stRecordToUpdate == 'salesorder')
					{
						stSerialId = objInvDetailSubrecord.getCurrentLineItemValue('inventoryassignment','issueinventorynumber');
						stSerialNumber = getSerialNumber(stSerialId);
					}
					else
					{
						stSerialNumber = objInvDetailSubrecord.getCurrentLineItemValue('inventoryassignment','receiptinventorynumber');
						stSourceType = 'Item Receipt';
					}

					nlapiLogExecution('DEBUG', stLoggerTitle + stStep, 'Record: ' + stRecordToUpdate + ' | Serial Number:' + stSerialNumber + ' | Item ID:' + stItemId);

					var flSubrecQty = Parse.forceFloat(objInvDetailSubrecord.getCurrentLineItemValue('inventoryassignment','quantity'));
					flQtyCounter += flSubrecQty;
					intDetailLineCounter++;

					/*Get Inventory Number record id*/
					//var stInvDetailId = (stRecordToUpdate == 'salesorder') ? stSerialId : getSerialID(stSerialNumber, stItemId); v2.7 commenting out, unused

					//var fCatchWeight = (flTotalCatchWeight / flItemQty) * flSubrecQty; -- original comment by jfernandez
					// var stCWDetailId = getCatchWeightDetails(stTranId + '_' + stItemId + '_' + stCurrentLine);
					var stCWDetailId = nlapiGetCurrentLineItemValue('item', 'custcol_ifd_cwrecordid');

					if(!Eval.isEmpty(stCWDetailId))
					{
						nlapiLogExecution('DEBUG', 'REC_CATCH_WEIGHT_DETAILS: '+ REC_CATCH_WEIGHT_DETAILS+' | stCWDetailId: '+ stCWDetailId);
						//var recCWDetail = nlapiLoadRecord(REC_CATCH_WEIGHT_DETAILS, stCWDetailId); v2.6
						// var stCWLotNumber = recCWDetail.getFieldValue(FLD_CWD_LOT_NUMBER); v2.6
						var stCWLotNumber = nlapiLookupField(REC_CATCH_WEIGHT_DETAILS, stCWDetailId, FLD_CWD_LOT_NUMBER); //v2.6 replacing load and get value with lookup

						nlapiLogExecution('DEBUG', 'TRACER', 'stCWLotNumber:' + stCWLotNumber);

						if(Eval.isEmpty(stCWLotNumber))
						{
							nlapiSubmitField(REC_CATCH_WEIGHT_DETAILS, stCWDetailId, [FLD_CWD_LOT_NUMBER, FLD_REC_SOURCE_TYPE], [stSerialNumber, stSourceType]); //v2.6 replaced setfieldvalues with submit field
							//recCWDetail.setFieldValue(FLD_CWD_LOT_NUMBER, stSerialNumber); v2.6
							//recCWDetail.setFieldValue(FLD_REC_SOURCE_TYPE, stSourceType); v2.6
						}
						else
						{
							nlapiSubmitField(REC_CATCH_WEIGHT_DETAILS, stCWDetailId, FLD_CWD_LOT_NUMBER, stSerialNumber); //v2.6 replaced setfieldvalues with submit field
							//recCWDetail.setFieldValue(FLD_CWD_LOT_NUMBER, stSerialNumber); v2.6
						}

						//stStep = '.Update'+REC_CATCH_WEIGHT_DETAILS; //v2.7 commenting out, unused
						//var stRecCWDetailId = nlapiSubmitRecord(recCWDetail, false, true); v2.6
						//nlapiLogExecution('AUDIT', stLoggerTitle + stStep, 'CW Detail ID: ' + stCWDetailId + ' Inventory Detail ID:' + stInvDetailId); //changing from stRecCWDetailId to stCWDetailId //v2.7 commenting out, unused

						//stStep = '.UpdateInventoryNumber'; //v2.7 commenting out, unused
						//var flRemainingCatchWeight = getSerialCatchWeight(stSerialNumber, stItemId); //v2.7 commenting out, unused
						//nlapiLogExecution('DEBUG', stLoggerTitle + stStep, 'Remaining Catch Weight for Item# ' + stItemId + ' with Serial Number:' + stSerialNumber + ':' + flRemainingCatchWeight); //v2.7 commenting out, unused

						// var recInvNumber = nlapiLoadRecord('inventorynumber', stInvDetailId);
						/*if(stRecordToUpdate == 'salesorder'){//Deduct Catch Weight from inventory detail
							fCatchWeight = flRemainingCatchWeight - flTotalCatchWeight;
							nlapiLogExecution('DEBUG', 'Sales Order', 'fCatchWeight:' + fCatchWeight);
						}*/

						// recInvNumber.setFieldValue(FLD_CATCH_WEIGHT_REMAINING, flRemainingCatchWeight);
						// nlapiSubmitRecord(recInvNumber, false, true);

						//nlapiSubmitField('inventorynumber', stInvDetailId, FLD_CATCH_WEIGHT_REMAINING, flRemainingCatchWeight) //v2.7 commenting out, unused
						//nlapiLogExecution('AUDIT', stLoggerTitle + stStep, 'Inventory Detail ID:' + stInvDetailId + 'Field(s) :' + FLD_CATCH_WEIGHT_REMAINING + 'Val(s) : ' + flRemainingCatchWeight); //v2.7 commenting out, unused

					}

				}

				catch(error)
				{
					if(error.getDetails != undefined)
					{
						nlapiLogExecution('ERROR', 'Process Error', 'Unable to ' + stStep + ': ' + error.getCode() + ': ' + error.getDetails());
						throw error;
					}
					else
					{
						nlapiLogExecution('ERROR', 'Unexpected Error', 'Unable to ' + stStep + ': ' + error.toString());
						throw nlapiCreateError('99999', error.toString());
					}
				}


			}//--End loop inside Inventory Detail
		} //--Check if Lot Numbered Item

		else
		{
			nlapiLogExecution('DEBUG', stLoggerTitle + stStep, 'Item is not a Lot Numbered Item.');
		}
	}

	catch(error)
	{
		if(error.getDetails != undefined)
		{
			nlapiLogExecution('ERROR', 'Process Error', 'Unable to ' + stStep + ': ' + error.getCode() + ': ' + error.getDetails());
			throw error;
		}
		else
		{
			nlapiLogExecution('ERROR', 'Unexpected Error', 'Unable to ' + stStep + ': ' + error.toString());
			throw nlapiCreateError('99999', error.toString());
		}
	}

}


/**
 * Display Catch Weight Details on Sales Order and Invoice
 * @param type
 * @param form
 * @param request
 */
function cwShowDetailsBeforeLoad(type, form, request)
{
	var stLoggerTitle = 'cwShowDetailsBeforeLoad';
	stStep = '.Initialization';

	nlapiLogExecution('DEBUG', stLoggerTitle + stStep, 'CW Bundle: Type: ' + type + ' | Form: ' + form + ' | Request: ' + request + ' | Script Start ==>' + Date());

	try
	{
		var stRecordType = nlapiGetRecordType();


		if((stRecordType == 'invoice' || stRecordType == 'salesorder') && type == 'view')
		{

			var stRecId = '';


			if(stRecordType == 'invoice')
			{
				stRecId = nlapiGetFieldValue('createdfrom');
			}

			else
			{
				stRecId	= nlapiGetRecordId();
			}

			stStep='.GetItemFulfillment';

			var stStatus = nlapiGetFieldValue('status');
			var stItemLines = nlapiGetLineItemCount('item');
			var stItemFulfillmentId = getItemFulfillment(stRecId);

			stStep = '.ProcessItemsPerFulfillment';

			if(!Eval.isEmpty(stItemFulfillmentId))
			{
				var objItemSublist = form.getSubList('item');
				objItemSublist.addField(FLD_CW_LINK, 'text', 'CW Detail');

				stStep='.AssembleUrlPerLine';

				for(var intCtr = 1; intCtr <= stItemLines; intCtr++)
				{
					var stLineItemId = nlapiGetLineItemValue('item', 'item', intCtr);
					var stSLUrl = nlapiResolveURL('SUITELET', SCRIPT_CATCH_WEIGHT_SL, DEPLOY_CATCH_WEIGHT_SL);
					var stUrl = stSLUrl +
						'&custpage_id=' + stItemFulfillmentId +
						'&custpage_item=' + stLineItemId +
						'&custpage_line=' + intCtr +
						'&custpage_mode=' + 'view';
					// var stAction = 'onclick="nlExtOpenWindow(\'' + stUrl + '\', \'' + HC_POPUP_WINDOW_TITLE + '\', ' + //v1.7 commented out
					// 		HC_POPUP_WIDTH  + ', ' + HC_POPUP_HEIGHT + ', this, true, null)"';
					var funcCWDetailUpdate = "require([],function(){window.open('" + stUrl + "','_blank','width=500, height=400',true);});"; //v1.7
					//var stLinkText = '<a class="i_inventorydetailset" ' + stAction + '"></a>';//v1.7 commented out
					var html = '<button onclick="' + funcCWDetailUpdate + '">' + 'CW Details' + '</button>';

					//objItemSublist.setLineItemValue(FLD_CW_LINK, intCtr, stLinkText); //v1.7 commented out
					objItemSublist.setLineItemValue(FLD_CW_LINK, intCtr, html); //v1.7

					//nlapiLogExecution('DEBUG', stLoggerTitle + stStep, 'Index[' + intCtr+ '] : URL: ' + stUrl + 'Link Text: ' + stLinkText); //v1.7 commented out
					nlapiLogExecution('DEBUG', stLoggerTitle + stStep, 'Index[' + intCtr+ '] : URL: ' + stUrl + 'Link Text: ' + html); //v1.7
				}
			}

			else
			{
				nlapiLogExecution('DEBUG', stLoggerTitle + stStep, 'Invoice does not have fulfillments');
			}
		}

		else
		{
			nlapiLogExecution('DEBUG', stLoggerTitle + stStep, 'Record type ' + stRecordType + ' not supported by this function. Exiting script.');
		}
	}

	catch(error)
	{
		if(error.getDetails != undefined)
		{
			nlapiLogExecution('ERROR', 'Process Error', 'Unable to ' + stStep + ': ' + error.getCode() + ': ' + error.getDetails());
			throw error;
		}
		else
		{
			nlapiLogExecution('ERROR', 'Unexpected Error', 'Unable to ' + stStep + ': ' + error.toString());
			throw nlapiCreateError('99999', error.toString());
		}
	}

	nlapiLogExecution('DEBUG', stLoggerTitle + stStep, 'CW Bundle: Script End ==>' + Date());
}

/**
 * @param {String} type Operation types: create, edit, view, copy, print, email
 * @param {nlobjForm} form Current form
 * @param {nlobjRequest} request Request object
 * @return {void}
 */
function cwShowDetailsVBBeforeLoad(type, form, request)
{
	var stLoggerTitle = 'cwShowDetailsVBBeforeLoad';
	stStep = '.Initialization';

	nlapiLogExecution('DEBUG', stLoggerTitle + stStep, 'CW Bundle: Type: ' + type + ' | Form: ' + form + ' | Request: ' + request + ' | Script Start ==>' + Date());

	try
	{
		var stRecordType = nlapiGetRecordType();

		if(stRecordType == 'vendorbill' && type == 'view')
		{
			nlapiLogExecution('DEBUG', stLoggerTitle + stStep, 'Record Type: ' + stRecordType);

			var stItemLines = nlapiGetLineItemCount('item');
			var stLinePOId = nlapiGetLineItemValue('purchaseorders', 'id', 1);

			stStep = '.ProcessPurchaseOrderItems';
			nlapiLogExecution('DEBUG', stLoggerTitle + stStep, 'Record Type: ' + stLinePOId);

			if(!Eval.isEmpty(stLinePOId))
			{
				var stItemReceiptId = getItemReceipt(stLinePOId);

				if(!Eval.isEmpty(stItemReceiptId))
				{
					var objItemSublist = form.getSubList('item');
					objItemSublist.addField(FLD_CW_LINK, 'text', 'CW Detail');

					stStep = '.AssembleURLPerLine';
					for(var intCtr = 1; intCtr <= stItemLines; intCtr++)
					{
						var stLineItemId = nlapiGetLineItemValue('item', 'item', intCtr);
						var stSLUrl = nlapiResolveURL('SUITELET', SCRIPT_CATCH_WEIGHT_SL, DEPLOY_CATCH_WEIGHT_SL);

						var stUrl = stSLUrl +
							'&custpage_id=' + stItemReceiptId +
							'&custpage_item=' + stLineItemId +
							'&custpage_line=' + intCtr +
							'&custpage_mode=view';

						// var stAction = 'onclick="nlExtOpenWindow(\'' + stUrl + '\', \'' + HC_POPUP_WINDOW_TITLE + '\', ' + //v1.7 commented out
						// 		HC_POPUP_WIDTH  + ', ' + HC_POPUP_HEIGHT + ', this, true, null)"';
						var funcCWDetailUpdate = "require([],function(){window.open('" + stUrl + "','_blank','width=500, height=400');});"; //v1.7  //v2.3

						//var stLinkText = '<a class="i_inventorydetailset" ' + stAction + '"></a>';//v1.7 commented out
						var html = '<button onclick="' + funcCWDetailUpdate + '">' + '   ' + '</button>';

						//objItemSublist.setLineItemValue(FLD_CW_LINK, intCtr, stLinkText); //v1.7 commented out
						objItemSublist.setLineItemValue(FLD_CW_LINK, intCtr, html); //v1.7

						//nlapiLogExecution('DEBUG', stLoggerTitle + stStep, 'Index[' + intCtr+ '] : URL: ' + stUrl + 'Link Text: ' + stLinkText); //v1.7 commented out
						nlapiLogExecution('DEBUG', stLoggerTitle + stStep, 'Index[' + intCtr+ '] : URL: ' + stUrl + 'Link Text: ' + html); //v1.7
					}
				}
			}

			else
			{
				nlapiLogExecution('DEBUG', stLoggerTitle + stStep, 'Vendor Bill does not have Purchase Order IDs');
			}
		}

		else
		{
			nlapiLogExecution('DEBUG', stLoggerTitle + stStep, 'Record type ' + stRecordType + ' on ' + type + ' mode not supported by this function. Exiting script.');
		}

	}

	catch(error)
	{
		if(error.getDetails != undefined)
		{
			nlapiLogExecution('ERROR', 'Process Error', 'Unable to ' + stStep + ': ' + error.getCode() + ': ' + error.getDetails());
			throw error;
		}
		else
		{
			nlapiLogExecution('ERROR', 'Unexpected Error', 'Unable to ' + stStep + ': ' + error.toString());
			throw nlapiCreateError('99999', error.toString());
		}
	}

	nlapiLogExecution('DEBUG', stLoggerTitle + stStep, 'CW Bundle: Script End ==>' + Date());
}

function getCatchWeightIndicator(itemList, stIdItem){
	for (var intPos = 0; intPos < itemList.length; intPos++){
		if (itemList[intPos].getId() == stIdItem)
			return itemList[intPos].getValue('custitem_jf_cw_catch_weight_item');
	}
}

/**
 * Search Catch Weight Details record
 * @param idRecord
 * @returns
 */
function getCatchWeightDetails(stRecordId)
{
	var stLoggerTitle = 'getCatchWeightDetails';
	stStep = '.Initialization';
	nlapiLogExecution('Debug', 'Record ID', 'stRecordId: ' + stRecordId + ' | FLD_CATCH_WEIGHT_DETAILS_ID: '+FLD_CATCH_WEIGHT_DETAILS_ID);

	try
	{
		var arrSearchFilters = [];
		arrSearchFilters.push(new nlobjSearchFilter(FLD_CATCH_WEIGHT_DETAILS_ID, null, 'is', stRecordId));

		var arrColumns = [];
		arrColumns.push(new nlobjSearchColumn('internalid', null, null));

		var arrSearchResults = [];
		var arrSearchResults = nlapiSearchRecord(REC_CATCH_WEIGHT_DETAILS, null, arrSearchFilters, arrColumns);

		nlapiLogExecution('Debug', 'Search Results', 'arrSearchResults: ' + JSON.stringify(arrSearchResults));
		//nlapiLogExecution('Debug', 'Search Results', 'arrSearchResults[0]' + arrSearchResults[0]);

		if(arrSearchResults)
		{
			return arrSearchResults[0].getId();
		}

		return null;
	}

	catch(error)
	{
		if(error.getDetails != undefined)
		{
			nlapiLogExecution('ERROR', 'Process Error', 'Unable to ' + stStep + ': ' + error.getCode() + ': ' + error.getDetails());
			throw error;
		}
		else
		{
			nlapiLogExecution('ERROR', 'Unexpected Error', 'Unable to ' + stStep + ': ' + error.toString());
			throw nlapiCreateError('99999', error.toString());
		}
	}
}

var Parse = {
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
	}
};

var Eval = {
	/**
	 * Evaluate if the given string or object value is empty, null or undefined.
	 * @param {String} stValue - string or object to evaluate
	 * @returns {Boolean} - true if empty/null/undefined, false if not
	 * @author mmeremilla
	 */
	isEmpty : function(stValue)
	{
		if ((stValue === '') || (stValue == null) || (stValue == undefined)) //Strict checking for this part to properly evaluate integer value.
		{
			return true;
		}
		else
		{
			if (stValue.constructor === Array)//Strict checking for this part to properly evaluate constructor type.
			{
				if (stValue.length == 0)
				{
					return true;
				}
			}
			else if (stValue.constructor === Object)//Strict checking for this part to properly evaluate constructor type.
			{
				for ( var stKey in stValue)
				{
					return false;
				}
				return true;
			}

			return false;
		}
	}
};
