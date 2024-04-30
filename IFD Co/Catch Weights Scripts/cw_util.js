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
 * 1.00       18 Aug 2015        			   Demo version
 * 2.00		  06 Jun 2016	  cmartinez		   Applied code review points for optimization
 * 2.01		  09 Oct 2018	  dweinstein	   Update field id variables to remove unused ones
 * 2.02		  15 Jan 2019	  mgotsch		   Deprecating unused functions
 */

//Item Record
var FLD_AVE_COST_PPU = 'custitem_jf_ave_cost_pricing_unit';    
//var FLD_ITEM_CATCH_WEIGHT_PRICING_UNIT = 'custitem_jf_cw_purchase_pricing_unit';	//v2.01
var FLD_ITEM_CATCH_WEIGHT_PRICING_UNIT = 'custitem_jf_cw_pricing_unit';	//v2.01
var FLD_ITEM_SO_CATCH_WEIGHT_PRICING_UNIT = 'custitem_jf_cw_sales_pricing_unit';
var FLD_CATCH_WEIGHT_ITEM = 'custitem_jf_cw_catch_weight_item';
var FLD_CATCH_WEIGHT_REMAINING = 'custitemnumber_jf_cwd_lot_number_weight';
var FLD_CW_WEIGHT_TOLERANCE = 'custitem_jf_cw_weight_tolerance';
var FLD_CW_PRICING_UNITS_TYPE = 'custitem_jf_cw_pricing_units_type'; 


var COL_CW_AMOUNT = 'custcol_jf_cw_amount_so';
var COL_PRICE_UM = 'custcol_jf_cw_price_um';
var COL_AVG_WGHT = 'custcol_jf_cw_avg_wght';
var COL_PRICING_UNIT = 'custcol_jf_cw_pricing_unit';    
var COL_CATCH_WEIGHT = 'custcol_jf_cw_catch_weight';
var COL_PO_ACT_WGHT = 'custcol_jf_cw_act_wght';
var COL_ACTUAL_WEIGHT = 'custcol_jf_cw_act_wght';

var REC_CATCH_WEIGHT_DETAILS = 'customrecord_jf_catch_weight_detail';
var FLD_CATCH_WEIGHT_DETAILS_ID = 'custrecord_jf_cw_cwd_id';   
var FLD_TOTAL_CW = 'custrecord_jf_cw_total_cw';
var FLD_REC_SOURCE_TYPE = 'custrecord_jf_rec_source_type';
var FLD_CWD_LOT_NUMBER = 'custrecord_jf_cwd_lot_number';
var FLD_ITEM_RECEIPT = 'custrecord_jf_cwd_item_receipt';
var FLD_LINE_ITEM = 'custrecord_jf_cwd_line_item';

var FLD_CW_LINK = 'custpage_cw_link';
var FLD_CW_WOI_PRICING_UNIT_TYPE = 'custpage_jf_cw_pricing_unit_type';
   
var HC_POPUP_WIDTH = 700;
var HC_POPUP_HEIGHT = 700;
var HC_POPUP_WINDOW_TITLE = 'Catch Weight Details'; 

var SCRIPT_CATCH_WEIGHT_DETAILS_CS = 'customscript_jf_cw_catch_wght_details_cs';
var FLD_SL_ACTION = 'custpage_action';
var FLD_SL_ITEM_RECEIPT = 'custpage_item_receipt';
var FLD_SL_IR_ITEM = 'custpage_ir_line_item';
var FLD_SL_IR_LINE =  'custpage_line_number';    
var SBL_CW_DETAILS = 'custpage_cw_details_list';
var COL_SL_CASE = 'custpage_case';
var COL_SL_WEIGHT = 'custpage_weight';    
var FLD_SL_TOTAL_WEIGHT = 'custpage_total_weight';
var FLD_SL_LOT_NUMBER = 'custpage_sl_lot_number';

var SBL_CASE = 'recmachcustrecord_jf_cwd_list_parent';
var COL_CASE_NAME = 'custrecord_jf_cwd_list_case_name';
var COL_CASE_WEIGHT = 'custrecord_jf_cwd_list_case';      
var COL_CW_CATCH_WEIGHT = 'custcol_jf_cw_catch_weight';    

var PARAM_ID_ITEM_RECEIPT = 'custpage_id';
var PARAM_ID_LINE_ITEM = 'custpage_item';
var PARAM_LINE_NUMBER = 'custpage_line';
var PARAM_PAGE_MODE = 'custpage_mode';  

var SCRIPT_CATCH_WEIGHT_SL = 'customscript_jf_cw_details_sl';
var DEPLOY_CATCH_WEIGHT_SL = 'customdeploy_jf_cw_details_sl';

var TAB_CW_COMPONENTS = 'custpage_cw_componenets_tab';
var SUBLIST_COMPONENTS = 'custpage_sbl_components';
var FLD_CW_WOI_CWC_ITEM = 'custpage_cw_woi_cwc_item';
var FLD_CW_WOI_CATCH_WEIGHT = 'custpage_cw_woi_catch_weight';

//Work Order Completion
var FLD_CW_WO_PHYSICAL_UNITS_TYPE = 'custbody_jf_cw_wo_phys_units_type';
var FLD_CW_WO_PRICING_UNITS_TYPE = 'custbody_jf_cw_wo_price_unit_type';

var FLD_CW_WO_DETAIL = 'custpage_cw_woc_catch_weight_icon';
var FLD_CW_WO_CATCH_WEIGHT = 'custpage_cw_woc_catch_weight';


/**
 * Calculate remaining catch weight to be set on the inventory number record
 * @param stSerial
 * @param stItemId
 * @returns {Number}
 */
 //v2.02 Deprecated getSerialCatchWeight function
// function getSerialCatchWeight(stSerial, stItemId)
// {
// 	var stLoggerTitle = 'getSerialCatchWeight';
// 	nlapiLogExecution('debug', stLoggerTitle, 'Serial Number = ' + stSerial
// 											+ ' | Item Id = ' + stItemId);
	
//     var arrFilters = [new nlobjSearchFilter(FLD_CWD_LOT_NUMBER, null, 'is', stSerial),
//                       new nlobjSearchFilter(FLD_LINE_ITEM, null, 'anyof', stItemId)];
    
//     var arrColumns = [new nlobjSearchColumn(FLD_REC_SOURCE_TYPE, null, null),
//                       new nlobjSearchColumn(FLD_TOTAL_CW, null, null)];    

//     var flCWRemaining = 0;
    
//     try
//     {
// 	    var arrResults = NSUtils.search(REC_CATCH_WEIGHT_DETAILS, null, arrFilters, arrColumns);
	    
// 	    if(!Eval.isEmpty(arrResults))
// 	    {
// 	    	//Loop through results to get cumulative catch weight
// 	        for(var i = 0; i < arrResults.length; i++)
// 	        {
// 	            var stType = arrResults[i].getValue(FLD_REC_SOURCE_TYPE);
// 	            var flQuantity = Parse.forceFloat(arrResults[i].getValue(FLD_TOTAL_CW));
	            
// 	            //If type is item receipt or work order completion, add to running catch weight remaining
// 	            if(stType.toLowerCase() == 'item receipt' || stType.toLowerCase() == 'work order completion')
// 	            {
// 	                flCWRemaining += flQuantity;
// 	            }
// 	            //Else, deduct to running catch weight remaining
// 	            else
// 	            {
// 	                flCWRemaining -= flQuantity;
// 	            }
// 	        }
// 	    }
//     }
//     catch(error)
//     {
//     	flCWRemaining = 0;
//     }
    
//     nlapiLogExecution('debug', stLoggerTitle, 'Catch Weight Remaining = ' + flCWRemaining);
//     return flCWRemaining;
// }
/*var sSerial = 'MJH121720151';
var idItem = '1200';
getSerialCatchWeight(sSerial, idItem)
*/

/**
 * Listener to Calculate Catch Weight Button
 */
function calculateCatchWeights()
{
	try
	{
		var stLoggerTitle = 'calculateCatchWeights';
	    var intLines = nlapiGetLineItemCount('item');
	    
	    for(var i = 1; i <= intLines; i++)
	    {
	        var stItemId = nlapiGetLineItemValue('item', 'item', i);
	        
	        if(!Eval.isEmpty(stItemId))
	        {
	        	//Fetch values from item record
	            var objItem = nlapiLookupField('item', stItemId, [FLD_CATCH_WEIGHT_ITEM, FLD_ITEM_CATCH_WEIGHT_PRICING_UNIT, 'purchaseunit', 'unitstype', 'weight']);
	            objItem.stCatchWeightItem = objItem[FLD_CATCH_WEIGHT_ITEM];
	            objItem.flWeight = Parse.forceFloat(objItem['weight']);
	            objItem.stWeightUnitName = objItem[FLD_ITEM_CATCH_WEIGHT_PRICING_UNIT];
	            objItem.stUnitName = objItem['purchaseunit'];
	            objItem.stPhysicalUnitsTypeId = objItem['unitstype'];
	            
	            var stLineUnits = nlapiGetLineItemText('item', 'units', i);
	        
	            nlapiLogExecution('debug', stLoggerTitle, 'Is Catch Weight Item? = ' + objItem.stCatchWeightItem
						+ ' | Weight = ' + objItem.flWeight
						+ ' | Weight Unit Name = ' + objItem.stWeightUnitName
						+ ' | Unit Name = ' + objItem.stUnitName
						+ ' | Physical Units Type = ' + objItem.stPhysicalUnitsTypeId
						+ ' | Units (Line) = ' + stLineUnits);
	            
	            //Check empty values
	            if(objItem.stCatchWeightItem == 'T' && !Eval.isEmpty(objItem.stUnitName) && !Eval.isEmpty(objItem.stPhysicalUnitsTypeId) && !Eval.isEmpty(stLineUnits))
	            {
	            	nlapiSelectLineItem('item', i);
	            	
	            	//Get conversion rate from unit type
	                var flConversionRate = Parse.forceFloat(getUOMConversionRate(objItem.stUnitName, objItem.stPhysicalUnitsTypeId));
	                
	                //Get Vendor price from Item
	                var flPurchasePrice = Parse.forceFloat(getVendorPurchasePrice(stItemId));      
	                
	                //Compute for average weight
	                var flAverageWeight = objItem.flWeight * flConversionRate;                 
	                
	                nlapiLogExecution('debug', stLoggerTitle, 'Purchase Price = ' + flPurchasePrice
	                										+ ' | Conversion Rate = ' + flConversionRate
	                										+ ' | AVERAGE WEIGHT = ' + flAverageWeight);
	                
	                var flQuantity = Parse.forceFloat(nlapiGetCurrentLineItemValue('item', 'quantity'));   
	                
	                //Compute for Cost
	                var flCost = (flAverageWeight * flPurchasePrice) / flQuantity;
	                   
	                //Get conversion rate by unit abbreviation
	                var flUMRate = Parse.forceFloat(getUOMAbbrevConversionRate(stLineUnits, objItem.stPhysicalUnitsTypeId));
	                                
	                flPurchasePrice = flPurchasePrice / flUMRate;
	                
	                //Compute for new rate
	                var flRate = flAverageWeight * flPurchasePrice;
	                flCost = flRate;
	                
	                nlapiLogExecution('debug', stLoggerTitle, 'Updating sublist values. Quantity = ' + flQuantity
	                										+ ' | Rate = ' + flRate
	                										+ ' | UM Rate = ' + flUMRate
	                										+ ' | Cost = ' + flCost
	                										+ ' | New Purchase Price = ' + flPurchasePrice);
	                
	                //Set resulting line item values
	                nlapiSetCurrentLineItemValue('item', COL_PRICE_UM, roundOffValue(flPurchasePrice, 2));
	                nlapiSetCurrentLineItemValue('item', COL_AVG_WGHT, flAverageWeight);
	                nlapiSetCurrentLineItemValue('item', 'rate', flCost);
	                nlapiCommitLineItem('item');
	            }
	        }
	    }    
	    nlapiLogExecution('debug', stLoggerTitle, 'Updated sublist.');
	}
	catch(error)
	{
		if (error.getDetails != undefined) 
	    {
	      	nlapiLogExecution('ERROR','Process Error', 'process() ' + error.getCode() + ': ' + error.getDetails());
	    } 
	    else 
	    {
	   	 	nlapiLogExecution('ERROR','Unexpected Error', 'process() ' + error.toString());   
	    }
	}
}

/**************************************************************************************
 * Find Serial ID of a given Serial Number
 * @param {String} Serial number  
 * @return {String} Serial internal id
**************************************************************************************/
//v2.02 deprecating function
// function getSerialID(stSerial, stItemId)
// {
// 	var stLoggerTitle = 'getSerialID';
// 	var stValue = null;
//     var arrFilters = [new nlobjSearchFilter('inventorynumber', null, 'is', stSerial),
//     				  new nlobjSearchFilter('item', null, 'anyof', stItemId)];
    
//     var arrColumns = [new nlobjSearchColumn('internalid', null, null)];
    
//     try
//     {
// 	    var arrResults = NSUtils.search('inventorynumber', null, arrFilters, arrColumns);
	      
// 	    if(!Eval.isEmpty(arrResults))
// 	    {
// 		    stValue = arrResults[0].getValue('internalid');
// 	    }
//     }
//     catch(error)
//     {
//     	stValue = null;
//     }
    
//     nlapiLogExecution('debug', stLoggerTitle, 'Serial Number = ' + stSerial
//     										+ ' | Item Id = ' + stItemId
//     										+ ' | Return Value = ' + stValue);
//     return stValue;
// }

/**************************************************************************************
 * Find Serial Number of a given Serial ID
 * @param {String} Serial internal id  
 * @return {String} Serial number
**************************************************************************************/
function getSerialNumber(stSerialId)
{
	var stLoggerTitle = 'getSerialNumber';
	var stValue = null;
    var arrFilters = [new nlobjSearchFilter('internalid', null, 'anyof', stSerialId)];
    
    var arrColumns = [new nlobjSearchColumn('inventorynumber', null, null)];
    
    try
    {
	    var arrResults = NSUtils.search('inventorynumber', null, arrFilters, arrColumns);
	    
	    if(!Eval.isEmpty(arrResults))
	    {
	    	stValue = arrResults[0].getValue('inventorynumber');
	    }
    }
    catch(error)
    {
    	stValue = null;
    }
    
    nlapiLogExecution('debug', stLoggerTitle, 'Serial Id = ' + stSerialId
											+ ' | Return Value = ' + stValue);
    
    return stValue;
}

/**************************************************************************************
 * Get Variance between two values
 * @param fValue1
 * @param fValue2
 **************************************************************************************/
function getVariance(flOldPrice, flNewPrice)
{
	var stLoggerTitle = 'getVariance';
    var flDifference = null;
     
    flOldPrice = Parse.forceFloat(flOldPrice);
    flNewPrice = Parse.forceFloat(flNewPrice);
    
    if(flNewPrice > flOldPrice)
    {  
    	//Price increase
        flDifference = ((flNewPrice - flOldPrice) / flOldPrice)*100;
    }
    else
    {   
    	//Price decrease
        flDifference = ((flOldPrice - flNewPrice) / flOldPrice)*100;
    }
    
    nlapiLogExecution('debug', stLoggerTitle, 'Old Price = ' + flOldPrice
    										+ ' | New Price = ' + flNewPrice
    										+ ' | Return Value = ' + flDifference);
    
    return flDifference;
}

/**
 * Search Catch Weight Details record
 * @param {String} idRecord
 * @returns {String} Catch Weight Details internal id
 */
function getCatchWeightDetails(stRecordId)
{
	var stLoggerTitle = 'getCatchWeightDetails';
	var stValue = null;
    var arrFilters = [new nlobjSearchFilter(FLD_CATCH_WEIGHT_DETAILS_ID, null, 'is', stRecordId)];

    var arrColumns = [new nlobjSearchColumn('internalid', null, null)];
    
    try
    {
	    var arrResults = NSUtils.search(REC_CATCH_WEIGHT_DETAILS, null, arrFilters, arrColumns);        
	    
	    if(!Eval.isEmpty(arrResults))
	    {
	        stValue = arrResults[0].getId();
	    }
    }
    catch(error)
    {
    	stValue = null;
    }
    
    nlapiLogExecution('debug', stLoggerTitle, 'Record Id = ' + stRecordId
											+ ' | Return Value = ' + stValue);
    
    return stValue;
}  

/**
 * Get Total Catch Weight from Catch Weight Details Suitelet
 * @returns {Number}
 */
function getTotalCWDWeight()
{
	var stLoggerTitle = 'getTotalCWDWeight';
    var intLineCount = nlapiGetLineItemCount(SBL_CW_DETAILS);
    var flTotalWeight = 0;
    
    for(var i = 1; i <= intLineCount; i++)
    {
        var flWeight = Parse.forceFloat(nlapiGetLineItemValue(SBL_CW_DETAILS, COL_SL_WEIGHT, i));
        flTotalWeight += flWeight;
    }    
    
    nlapiLogExecution('debug', stLoggerTitle, 'Return Value = ' + flTotalWeight);
    
    return flTotalWeight;
}


/**
 * Fetch Item Fulfillment record from vendor bill
 * @param stRecordId
 * @returns string
 */
function getItemFulfillment(stRecordId)
{
	var stLoggerTitle = 'getItemFulfillment';
	var stValue = null;
    var arrFilters = [new nlobjSearchFilter('createdfrom', null, 'anyof', stRecordId)];

    var arrColumns = [new nlobjSearchColumn('tranid', null, null)];
       
    try
    {
	    var arrResults = NSUtils.search('itemfulfillment', null, arrFilters, arrColumns);        
	    
	    if(!Eval.isEmpty(arrResults))
	    {
	        stValue = arrResults[0].getValue('tranid');
	    }
    }
    catch(error)
    {
    	stvalue = null;
    }
    
    nlapiLogExecution('debug', stLoggerTitle, 'Record Id = ' + stRecordId
    										+ ' | Return Value = ' + stValue);
    
    return stValue;
}  

/**
 * Fetch Item receipt record from vendor bill
 * @param idRecord
 * @returns string
 */
function getItemReceipt(stRecordId)
{
	var stLoggerTitle = 'getItemReceipt';
	var stValue = null;
    var arrFilters = [new nlobjSearchFilter('createdfrom', null, 'anyof', stRecordId)];

    var arrColumns = [new nlobjSearchColumn('tranid', null, null)];
       
    try
    {
	    var arrResults = NSUtils.search('itemreceipt', null, arrFilters, arrColumns);        
	    
	    if(!Eval.isEmpty(arrResults))
	    {
	       stValue = arrResults[0].getValue('tranid');
	    }
    }
    catch(error)
    {
    	stValue = null;
    }
    
    nlapiLogExecution('debug', stLoggerTitle, 'Record Id = ' + stRecordId
											+ ' | Return Value = ' + stValue);
    
    return stValue;
}  

/**
 * Fetch UOM converstion rate via unit name
 * @param sUnitName
 * @returns string
 */
function getUOMConversionRate(stUnitName, stPhysicalUnitsTypeId)
{
	var stLoggerTitle = 'getUOMConversionRate';
	var stValue = null;
    if(!Eval.isEmpty(stUnitName))
    {
        var arrFilters = [new nlobjSearchFilter('unitname', null, 'is', stUnitName),
                          new nlobjSearchFilter('internalid', null, 'anyof', stPhysicalUnitsTypeId)];
        
        var arrColumns = [new nlobjSearchColumn('conversionrate', null, null)];
          
        try
        {
	        var arrResults = NSUtils.search('unitstype', null, arrFilters, arrColumns);  
	        
	        if(!Eval.isEmpty(arrResults))
	        {
	            stValue = arrResults[0].getValue('conversionrate');
	        }
        }
        catch(error)
        {
        	stValue = null;
        }
    }
    
    nlapiLogExecution('debug', stLoggerTitle, 'Unit Name = ' + stUnitName
											+ ' | Physical Units Type = ' + stPhysicalUnitsTypeId
											+ ' | Return Value = ' + stValue);
    
    return stValue;
}

/**
 * Fetch UOM converstion rate via abbreviation
 * @param sUnitName
 * @returns string
 */
function getUOMAbbrevConversionRate(stUnitAbbrev, stPhysicalUnitsTypeId)
{
	var stLoggerTitle = 'getUOMAbbrevConversionRate';
	var stValue = null;
    if(!Eval.isEmpty(stUnitAbbrev))
    {
        var arrFilters = [new nlobjSearchFilter('abbreviation', null, 'is', stUnitAbbrev),
                          new nlobjSearchFilter('internalid', null, 'anyof', stPhysicalUnitsTypeId)];
        
        var arrColumns = [new nlobjSearchColumn('conversionrate', null, null)];
          
        try
        {
	        var arrResults = NSUtils.search('unitstype', null, arrFilters, arrColumns);  
	        
	        if(!Eval.isEmpty(arrResults))
	        {
	            stValue = arrResults[0].getValue('conversionrate');
	        }
        }
        catch(error)
        {
        	stValue = null;
        }
    }
    
    nlapiLogExecution('debug', stLoggerTitle, 'Unit Abbrev = ' + stUnitAbbrev
											+ ' | Physical Units Type = ' + stPhysicalUnitsTypeId
											+ ' | Return Value = ' + stValue);
    
    return stValue;
}

/**
 * Fetch purchase price from Item record
 * @param idRecord
 * @returns string
 */
function getVendorPurchasePrice(stRecordId)
{
	var stLoggerTitle = 'getVendorPurchasePrice';
	var stValue = 0;
    var arrFilters = [new nlobjSearchFilter('internalid', null, 'anyof', stRecordId)];

    var arrColumns = [new nlobjSearchColumn('vendorcost', null, null)];
    
    try
    {
	    var arrResults = NSUtils.search('item', null, arrFilters, arrColumns);        
	    
	    if(!Eval.isEmpty(arrResults))
	    {
	        stValue = arrResults[0].getValue('vendorcost');
	    }
    }
    catch(error)
    {
    	stValue = 0;
    }
    
    nlapiLogExecution('debug', stLoggerTitle, 'Record Id = ' + stRecordId
											+ ' | Return Value = ' + stValue);
    
    return stValue;
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
var NSUtils =
{
	/**
	 * Convert item record type to its corresponding internal id (e.g. 'invtpart' to 'inventoryitem')
	 * @param {String} stRecordType - record type of the item
	 * @return {String} stRecordTypeInLowerCase - record type internal id
	 */
		toItemInternalId : function(stRecordType)
		{
			if (isEmpty(stRecordType))
		    {
		        throw nlapiCreateError('10003', 'Item record type should not be empty.');
		    }
		    
		    var stRecordTypeInLowerCase = stRecordType.toLowerCase().trim();
		    
		    switch (stRecordTypeInLowerCase)
		    {
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
	 * Get all of the results from the search even if the results are more than 1000. 
	 * @param {String} stRecordType - the record type where the search will be executed.
	 * @param {String} stSearchId - the search id of the saved search that will be used.
	 * @param {Array} arrSearchFilter - array of nlobjSearchFilter objects. The search filters to be used or will be added to the saved search if search id was passed.
	 * @param {Array} arrSearchColumn - array of nlobjSearchColumn objects. The columns to be returned or will be added to the saved search if search id was passed.
	 * @returns {Array} - an array of nlobjSearchResult objects
	 * @author memeremilla - initial version
	 * @author gmanarang - used concat when combining the search result
	 */
	search : function(stRecordType, stSearchId, arrSearchFilter, arrSearchColumn)
	{
		var arrReturnSearchResults = new Array();
		var nlobjSavedSearch;

		if (stSearchId != null)
		{
			nlobjSavedSearch = nlapiLoadSearch((stRecordType) ? stRecordType : null, stSearchId);

			// add search filter if one is passed
			if (arrSearchFilter != null)
			{
				nlobjSavedSearch.addFilters(arrSearchFilter);
			}

			// add search column if one is passed
			if (arrSearchColumn != null)
			{
				nlobjSavedSearch.addColumns(arrSearchColumn);
			}
		}
		else
		{
			nlobjSavedSearch = nlapiCreateSearch((stRecordType) ? stRecordType : null, arrSearchFilter, arrSearchColumn);
		}

		var nlobjResultset = nlobjSavedSearch.runSearch();
		var intSearchIndex = 0;
		var nlobjResultSlice = null;
		do
		{
			if ((nlapiGetContext().getExecutionContext() === 'scheduled'))
			{
				try
				{
					this.rescheduleScript(1000);
				}
				catch (e)
				{}
			}

			nlobjResultSlice = nlobjResultset.getResults(intSearchIndex, intSearchIndex + 1000);
			if (!(nlobjResultSlice))
			{
				break;
			}
			
			arrReturnSearchResults = arrReturnSearchResults.concat(nlobjResultSlice);
			intSearchIndex = arrReturnSearchResults.length;
		}

		while (nlobjResultSlice.length >= 1000);

		return arrReturnSearchResults;
	}
};

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
 * Compilation of common utility functions used for:
 * - Evaluating objects
 * - Parsing objects
 * - Date helper
 */

function roundOffValue(flValue, intDecimalPlace)
{
    var bNegate = false;

    if (flValue < 0)
    {
        flValue = Math.abs(flValue);
        bNegate = true;
    }

    var flResult = null;
    var intMultiplierDivisor = Math.pow(10, intDecimalPlace || 0);
    flResult = Math.round(flValue * intMultiplierDivisor) / intMultiplierDivisor;
    flResult = bNegate ? flResult * -1 : flResult;

    return flResult;
}

var Eval =
{
	/**
	 * Evaluate if the given string or object value is empty, null or undefined.
	 * @param {String} stValue - string or object to evaluate
	 * @returns {Boolean} - true if empty/null/undefined, false if not
	 * @author mmeremilla
	 */
	isEmpty : function(stValue)
	{
		if ((stValue == '') || (stValue == null) || (stValue == undefined))
		{
			return true;
		}
		else
		{
			if (typeof stValue == 'string')
			{
				if ((stValue == ''))
				{
					return true;
				}
			}
			else if (typeof stValue == 'object')
			{
				if (stValue.length == 0 || stValue.length == 'undefined')
				{
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
	inArray : function(stValue, arrValue)
	{
		var bIsValueFound = false;

		for ( var i = 0; i < arrValue.length; i++)
		{
			if (stValue == arrValue[i])
			{
				bIsValueFound = true;
				break;
			}
		}

		return bIsValueFound;
	},
};


var Parse =
{
		/**
		 * Converts string to float. If value is infinity or can't be converted to a number, 0.00 will be returned.
		 * @param {String} stValue - any string
		 * @returns {Number} - a floating point number
		 * @author jsalcedo
		 */
		forceFloat : function(stValue)
		{
			var flValue = parseFloat(stValue);

			if (isNaN(flValue) || (stValue == Infinity))
			{
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
		forceInt : function(stValue)
		{
			var intValue = parseInt(stValue);

			if (isNaN(intValue)  || (stValue == Infinity))
			{
				return 0;
			}

			return intValue;
		}
};