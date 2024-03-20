nlapiLogExecution("audit","FLOStart",new Date().getTime());
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
 * 
 * Version    Date				Author				Remarks
 * 1.00       24 Jul 2015     jerfernandez			Demo version
 * 1.10       08 Jun 2016     memeremilla			Initial version (working copy). Standardization of code to adhere to MTS coding guidelines (all functions).
 * 1.20		  06 Aug 2018     mgotsch				Fixing errors when creating CW details on IF lines from suitelet
 * 1.30		  09 Aug 2018     mgotsch				Code Review changes
 */

//'use strict';

/**
 * @param {nlobjRequest} request Request object
 * @param {nlobjResponse} response Response object
 * @return {void} Any output is written via response object
 */
 
 var ID_NEW = '';
function setCWDetailsFormSuitelet(request, response)
{
	try
	{
		var stLoggerTitle = 'setCWDetailsFormSuitelet'
		nlapiLogExecution('DEBUG', stLoggerTitle, '**** START: Script entry point function.****');

		var stAction = request.getParameter(FLD_SL_ACTION);
      
		if (stAction == null)
		{
			var stIdTransRefNum = request.getParameter(PARAM_ID_ITEM_RECEIPT);
			var stIdLineItem = request.getParameter(PARAM_ID_LINE_ITEM);
			var stNLineNumber = request.getParameter(PARAM_LINE_NUMBER);
			var stMode = request.getParameter(PARAM_PAGE_MODE);
			var stQty = request.getParameter('custpage_ifqty');
			var stCreatedFrom = request.getParameter('custpage_createdfrom');
			var stRecordType = request.getParameter('custpage_rectype');
			var stCWDetailId = request.getParameter('custpage_cwdetailid');
			var stPrefix = '';
			var stSource = '';
			var stTransactionRef = '';
			
			if(stRecordType == 'itemfulfillment')
			{
				stRecordType = 'Item Fulfillment';
				stTransactionRef += 'salesorder';
				stSource = 'Sales Order';
				stPrefix = 'IF';
			}
			else if(stRecordType == 'itemreceipt')
			{
				stRecordType = 'Item Receipt';
				stTransactionRef += 'purchaseorder';
				stSource = 'Purchase Order';
				stPrefix = 'IR';
			}
	
			stTransactionRef += '_' + stCreatedFrom + '_' + stIdLineItem + '_' + stNLineNumber;
			nlapiLogExecution('DEBUG', stLoggerTitle, 'Transaction Ref: ' + stTransactionRef);
			
			var arrParam =
				[
				        stIdTransRefNum, stIdLineItem, stNLineNumber, stMode
				];

			nlapiLogExecution('DEBUG', stLoggerTitle, 'stAction: ' + stAction + ' | stIdTransRefNum: ' + stIdTransRefNum + ' | stIdLineItem: ' + stIdLineItem + ' | stNLineNumber: ' + stNLineNumber
			        + ' | stMode: ' + stMode);

			if (NSUtil.inArray(null, arrParam) || NSUtil.inArray('', arrParam))
			{
				throw nlapiCreateError('9999', 'Missing required parameters.');
			}

			var objFrm = nlapiCreateForm('Catch Weight Inventory Detail', true);
			var stSublistType = 'staticlist';

			if (stMode != 'view')
			{
				objFrm.addSubmitButton('Submit');
				objFrm.setScript(SCRIPT_CATCH_WEIGHT_DETAILS_CS);

				stSublistType = 'inlineeditor';
			}
			//var stIdCatchWeightDetail = stPrefix + stIdTransRefNum + '_' + stIdLineItem + '_' + stNLineNumber;
          	var stIdCatchWeightDetail = stIdTransRefNum + '_' + stIdLineItem + '_' + stNLineNumber;

			var objFldItemReceipt = objFrm.addField(FLD_SL_ITEM_RECEIPT, 'text', 'Ref No');
			objFldItemReceipt.setDefaultValue(stIdCatchWeightDetail);
			objFldItemReceipt.setDisplayType('inline');
			
			var objFldLineItem = objFrm.addField(FLD_SL_IR_ITEM, 'select', 'Item', 'item');
			objFldLineItem.setDefaultValue(stIdLineItem);
			objFldLineItem.setDisplayType('inline');
			
			var objFldLineQuantity = objFrm.addField('custpage_ifqty', 'integer', 'Quantity');
			objFldLineQuantity.setDefaultValue(stQty);
			objFldLineQuantity.setDisplayType('inline');
			
			nlapiLogExecution('DEBUG', stLoggerTitle, 'CW Record ID: ' + stCWDetailId);

			var objFldLotNumber = objFrm.addField(FLD_SL_LOT_NUMBER, 'text', 'Lot Number');
			objFldLotNumber.setDisplayType('inline');

			var objFldAction = objFrm.addField(FLD_SL_ACTION, 'text', '');
			objFldAction.setDisplayType('hidden');
			objFldAction.setDefaultValue('submit');

			var objFldLineNumber = objFrm.addField(FLD_SL_IR_LINE, 'text', '');
			objFldLineNumber.setDisplayType('hidden');
			objFldLineNumber.setDefaultValue(stNLineNumber);

			var objFldTranId = objFrm.addField('custpage_tranid', 'text', 'Transaction #');
			objFldTranId.setDefaultValue(stTransactionRef);
			objFldTranId.setDisplayType('inline');
			
			var objFldType = objFrm.addField('custpage_type', 'text', 'Source Record Type');
			objFldType.setDefaultValue(stSource);
			objFldType.setDisplayType('inline');
			
			//create sublist        
			var objLst = objFrm.addSubList(SBL_CW_DETAILS, stSublistType, 'Catch Weight Details');
			objLst.addField(COL_SL_CASE, 'text', 'Case');
			objLst.addField(COL_SL_WEIGHT, 'text', 'Weight');

			var objFldTotalWeight = objFrm.addField(FLD_SL_TOTAL_WEIGHT, 'float', 'Total Weight').setDisplayType('disabled');

			//Check if Catch Weight Details subrecord already exist
			// var stIdCWDRecord = getCatchWeightDetails(stIdCatchWeightDetail);

			//Load Catch Weight Details subrecord if already exist
			var flTotalCWDWeight = NSUtil.forceFloat(0);
			var stLotNumber = '';
			// if (!NSUtil.isEmpty(stIdCWDRecord))
			
			if (!NSUtil.isEmpty(stCWDetailId))
			{
				nlapiLogExecution('DEBUG', stLoggerTitle, 'CW Record already exists. ID: ' + stCWDetailId);
				
				var recCWDetails = nlapiLoadRecord(REC_CATCH_WEIGHT_DETAILS, stCWDetailId);
				var stNCWDLines = recCWDetails.getLineItemCount(SBL_CASE);
				stLotNumber = recCWDetails.getFieldValue(FLD_CWD_LOT_NUMBER);
				for (var intCtr = 1; intCtr <= stNCWDLines; intCtr++)
				{
					var stCaseName = recCWDetails.getLineItemValue(SBL_CASE, COL_CASE_NAME, intCtr);
					var flCaseWeight = NSUtil.forceFloat(recCWDetails.getLineItemValue(SBL_CASE, COL_CASE_WEIGHT, intCtr));

					objLst.setLineItemValue(COL_SL_CASE, intCtr, stCaseName);
					objLst.setLineItemValue(COL_SL_WEIGHT, intCtr, flCaseWeight);
					flTotalCWDWeight += flCaseWeight;
				}
			}
			objFldLotNumber.setDefaultValue(stLotNumber);
			objFldTotalWeight.setDefaultValue(NSUtil.roundDecimalAmount(flTotalCWDWeight, 2));
			response.writePage(objFrm);
		}
		else if (stAction == 'submit')
		{
			// var stCloseAction = '<script>window.parent.cwDetailsSaveRecord();';
			var stIdTransRefNum = request.getParameter(FLD_SL_ITEM_RECEIPT);
			var stIdLineItem = request.getParameter(FLD_SL_IR_ITEM);
			var stNLineNumber = request.getParameter(FLD_SL_IR_LINE);
			var stSourceType = request.getParameter('custpage_type');
			var flQty = NSUtil.forceFloat(request.getParameter('custpage_ifqty'));
			
          	//v1.20 START
			// Script pulls transaction type, transaction number, and created from ID from suitelet form //v1.30
			// and uses them to search the transaction's internalId
			var stCreatedFromId = stIdTransRefNum.split('_')[0];
          	var stTranRefNum = (stIdTransRefNum.split('_')[0]).split('-')[1];
			nlapiLogExecution('DEBUG', stLoggerTitle, 'stTranRefNum: '+stTranRefNum+' stCreatedFromId: '+stCreatedFromId);
			var stTranType = (stIdTransRefNum.split('_')[0]).substring(0,2);
			if(stTranType == 'IF') {
				var stRecordType = 'itemfulfillment';
			} else {
				var stRecordType = 'itemreceipt'; //v1.30
			}
			var arrSearchFilters = []; //v1.30
			arrSearchFilters[0] = new nlobjSearchFilter('transactionnumber', null, 'any', stTranRefNum);
			arrSearchFilters[1] = new nlobjSearchFilter('mainline', null, 'is', 'T');
			arrSearchFilters[2] = new nlobjSearchFilter('createdfrom', null, 'anyof', stCreatedFromId);
			var arrSearchColumns = []; //v1.30
			arrSearchColumns[0] = new nlobjSearchColumn('internalid');
			var ssTranIdSearch = nlapiCreateSearch(stRecordType, arrSearchFilters, arrSearchColumns); 
			var objTranIdResults = ssTranIdSearch.runSearch();
			var arrresult = objTranIdResults.getResults(0,1);
			//if search returns a value, then pull it's internal id. if not, throw error
			if(!NSUtil.isEmpty(arrresult)) {
				var stTransID = arrresult[0].getValue('internalid');
			} else {
				throw nlapiCreateError('9999', 'Source Transaction ('+stIdTransRefNum+') Cannot Be Found.'); //v1.30
			}
			nlapiLogExecution('DEBUG', stLoggerTitle, stTranType + ' ID: ' + stTransID);
			//v1.20 END
          
          	var stIdCatchWeightDetail = stIdTransRefNum;
			nlapiLogExecution('DEBUG', stLoggerTitle, 'Ref No:' + stIdCatchWeightDetail);
			var arrParam =
				[
				        stIdTransRefNum, stIdLineItem, stNLineNumber
				];

			nlapiLogExecution('DEBUG', stLoggerTitle, 'stAction: ' + stAction + ' | stIdTransRefNum: ' + stIdTransRefNum + ' | stIdLineItem: ' + stIdLineItem + ' | stNLineNumber: ' + stNLineNumber);

			if (NSUtil.inArray(null, arrParam) || NSUtil.inArray('', arrParam))
			{
				throw nlapiCreateError('9999', 'Missing required parameters.');
			}

			//Check if Catch Weight Details subrecord already exist
			var stIdCWDRecord = getCatchWeightDetails(stIdCatchWeightDetail);

			//Load Catch Weight Details subrecord and update if already exist, otherwise, create new record
			// if (!NSUtil.isEmpty(stIdCWDRecord))
			if (!NSUtil.isEmpty(stCWDetailId))
			{
				nlapiLogExecution('DEBUG', stLoggerTitle, 'Update CWD record.');
				var recCatchWeightDetails = nlapiLoadRecord(REC_CATCH_WEIGHT_DETAILS, stCWDetailId);

				//Remove lines from Catch Weight Details record
				var stNRecCWDLines = recCatchWeightDetails.getLineItemCount(SBL_CASE);
				for (var intCtr = stNRecCWDLines; intCtr >= 1; intCtr--)
				{
					recCatchWeightDetails.removeLineItem(SBL_CASE, intCtr);
				}
			} //-----End Update Catch Weight Details Subrecord
			else
			{
				nlapiLogExecution('DEBUG', stLoggerTitle, 'Create new CWD record.');

				var recCatchWeightDetails = nlapiCreateRecord(REC_CATCH_WEIGHT_DETAILS);
				recCatchWeightDetails.setFieldValue(FLD_CATCH_WEIGHT_DETAILS_ID, stIdCatchWeightDetail);
				//v1.20 Start
				if(stTranType == 'IF') {
					recCatchWeightDetails.setFieldValue('custrecord_jf_cwd_item_receipt_id', stTransID);
				} else if (stTranType == 'IR') {
					recCatchWeightDetails.setFieldValue(FLD_ITEM_RECEIPT, stTransID);
				}
				//v1.20 End
              	//recCatchWeightDetails.setFieldValue(FLD_ITEM_RECEIPT, stTransID); //v1.20
				recCatchWeightDetails.setFieldValue(FLD_LINE_ITEM, stIdLineItem);
				recCatchWeightDetails.setFieldValue('custrecord_jf_rec_source_type', stSourceType);
			} //-----End Create new Catch Weight Details Subrecord

			//Insert/re-insert catch weight lines
			var stNLineItemCount = request.getLineItemCount(SBL_CW_DETAILS);
			var flTotalWeight = NSUtil.forceFloat(0);
			for (var intCtr = 1; intCtr <= stNLineItemCount; intCtr++)
			{
				var stCaseName = request.getLineItemValue(SBL_CW_DETAILS, COL_SL_CASE, intCtr);
				var flWeight = request.getLineItemValue(SBL_CW_DETAILS, COL_SL_WEIGHT, intCtr);
				flTotalWeight += NSUtil.forceFloat(flWeight);

				recCatchWeightDetails.selectNewLineItem(SBL_CASE);
				recCatchWeightDetails.setCurrentLineItemValue(SBL_CASE, COL_CASE_NAME, stCaseName);
				recCatchWeightDetails.setCurrentLineItemValue(SBL_CASE, COL_CASE_WEIGHT, flWeight);
				recCatchWeightDetails.commitLineItem(SBL_CASE);
			}
			
			flTotalWeight = NSUtil.roundDecimalAmount(flTotalWeight, 2);
			recCatchWeightDetails.setFieldValue(FLD_TOTAL_CW, flTotalWeight);

			/* Get the total weight variance */
			STEP ='.GetTotalWeightVariance';
			var objCWItemDetails = nlapiLookupField('item', stIdLineItem, [FLD_CW_WEIGHT_TOLERANCE, 'weight']);
			
			var flWeightTolerance = NSUtil.forceFloat(objCWItemDetails.custitem_jf_cw_weight_tolerance);
			flWeightTolerance /= 100;
			var flItemWeight = NSUtil.forceFloat(objCWItemDetails.weight);
	
			var flVariance = flQty * flItemWeight;
			var flThreshold =  flVariance * flWeightTolerance;
			var flPosVariance = flVariance + flThreshold;
			var flNegVariance = flVariance - flThreshold;
			var flVarianceValue = 0.00;
			var stVarianceFlag;
			
			if(flTotalWeight > flPosVariance)
			{
				throw nlapiCreateError('99999', 'Total weight exceeds Threshold of ' + flPosVariance + '. Please go back and try again.');
			}
			
			else if(flTotalWeight < flNegVariance)
			{
				throw nlapiCreateError('99999', 'Total weight does not meet minimum Threshold of ' + flNegVariance + '. Please go back and try again.');
			}
			
			var stIdCWD = nlapiSubmitRecord(recCatchWeightDetails, false, true);
			nlapiLogExecution('AUDIT', stLoggerTitle, 'Catch Weight Details: ' + stIdCWD + ' has been created.');
			
			// var stCloseAction = '<script>window.parent.cwDetailsSaveRecord(' + stIdCWD +',' + stVarianceFlag +',' + flVarianceValue +');</script>';
			var stCloseAction = '<script>window.parent.cwDetailsSaveRecord(' + stIdCWD +');</script>';
			
			response.write(stCloseAction);
		}

		nlapiLogExecution('DEBUG', stLoggerTitle, '**** END: Script entry point function.****');
	}
	catch (error)
	{
		if (error.getDetails != undefined)
		{
			nlapiLogExecution('ERROR', 'Process Error', error.getCode() + ': ' + error.getDetails());
			throw error;
		}
		else
		{
			nlapiLogExecution('ERROR', 'Unexpected Error', error.toString());
			throw nlapiCreateError('99999', error.toString());
		}
	}
}

//Library//
var NSUtil = (typeof NSUtil === 'undefined') ? {} : NSUtil;
/**
 * Evaluate if the given string or object value is empty, null or undefined.
 * @param {String} stValue - string or object to evaluate
 * @returns {Boolean} - true if empty/null/undefined, false if not
 * @author mmeremilla
 */
NSUtil.isEmpty = function(stValue)
{
	if ((stValue === '') //Strict checking for this part to properly evaluate integer value.
	        || (stValue == null) || (stValue == undefined) || (stValue == 'null'))
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
};

/**
 * Evaluate if the given string is an element of the array, using reverse looping
 * @param {String} stValue - String value to find in the array
 * @param {String[]} arrValue - Array to be check for String value
 * @returns {Boolean} - true if string is an element of the array, false if not
 */
NSUtil.inArray = function(stValue, arrValue)
{
	var bIsValueFound = false;

	for (var i = 0; i < arrValue.length; i++)
	{
		if (stValue == arrValue[i])
		{
			bIsValueFound = true;
			break;
		}
	}
	return bIsValueFound;
};
/**
 * Converts string to float. If value is infinity or can't be converted to a number, 0.00 will be returned.
 * @param {String} stValue - any string
 * @returns {Number} - a floating point number
 * @author jsalcedo
 */
NSUtil.forceFloat = function(stValue)
{
	var flValue = parseFloat(stValue);

	if (isNaN(flValue) || (stValue == Infinity))
	{
		return 0.00;
	}

	return flValue;
};

/**
 * Round decimal number
 * @param {Number} flDecimalNumber - decimal number value
 * @param {Number} intDecimalPlace - decimal places
 *
 * @returns {Number} - a floating point number value
 * @author memeremilla and lochengco
 */
NSUtil.roundDecimalAmount = function(flDecimalNumber, intDecimalPlace)
{
	//this is to make sure the rounding off is correct even if the decimal is equal to -0.995
	var bNegate = false;
	if (flDecimalNumber < 0)
	{
		flDecimalNumber = Math.abs(flDecimalNumber);
		bNegate = true;
	}
	var flReturn = 0.00;

	if (intDecimalPlace == null || intDecimalPlace == '')
	{
		intDecimalPlace = 0;
	}

	var intMultiplierDivisor = Math.pow(10, intDecimalPlace);

	flReturn = Math.round(parseFloat(flDecimalNumber) * intMultiplierDivisor) / intMultiplierDivisor;

	if (bNegate)
	{
		flReturn = flReturn * -1;
	}

	return flReturn.toFixed(intDecimalPlace);
};