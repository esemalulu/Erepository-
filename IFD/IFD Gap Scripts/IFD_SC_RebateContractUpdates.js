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
 */

/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       07 Jul 2016     lochengco        Initial Commit
 * 1.01       05 May 2017     lochengco        Adjusted correct function in rescheduling script
 * 1.02       01 Jun 2017     lochengco        Incorporate NSUtils library to the script file
 * 1.03       13 Jun 2017     lochengco        Adding Time Limit Threshold and Percent Allowed Time, Moved objCustContItemPriceResult before rescheduling the script
 */

var OBJ_CONTEXT = nlapiGetContext();
var OBJ_SCRIPT_PARAMETERS = {};
var INT_USAGE_LIMIT_THRESHOLD = 500;
var INT_START_TIME = new Date().getTime();
var INT_TIME_LIMIT_THRESHOLD = 3600000; // 3600000ms = 1hr
var INT_PERCENT_ALLOWED_TIME = 90;

/**
 * @param {String} stType Context Types: scheduled, ondemand, userinterface, aborted, skipped
 * @returns {Void}
 */
function scheduled_updateRebateContract(stType) 
{
    try
    {
        var stLoggerTitle = 'scheduled_updateRebateContract';
        
        nlapiLogExecution('DEBUG', stLoggerTitle, '>>Entry<< | Server Date = ' + new Date());
        
        // Get Script Parameters
        OBJ_SCRIPT_PARAMETERS['search_new_rebate_agree'] = OBJ_CONTEXT.getSetting('SCRIPT', 'custscript_new_rebate_agreement');
        OBJ_SCRIPT_PARAMETERS['search_rebate_agree_det'] = OBJ_CONTEXT.getSetting('SCRIPT', 'custscript_search_rebate_agree_det');
        OBJ_SCRIPT_PARAMETERS['search_cust_item_pricing_new'] = OBJ_CONTEXT.getSetting('SCRIPT', 'custscript_search_cust_item_pricing_new');
        OBJ_SCRIPT_PARAMETERS['contract_status_processed'] = OBJ_CONTEXT.getSetting('SCRIPT', 'custscript_contract_status_processed');
        OBJ_SCRIPT_PARAMETERS['contract_status_failed'] = OBJ_CONTEXT.getSetting('SCRIPT', 'custscript_contract_status_failed');
        OBJ_SCRIPT_PARAMETERS['rcm_perc_flc'] = OBJ_CONTEXT.getSetting('SCRIPT', 'custscript_rcm_perc_flc');
        OBJ_SCRIPT_PARAMETERS['rcm_dollar_flc'] = OBJ_CONTEXT.getSetting('SCRIPT', 'custscript_rcm_dollar_flc');
        OBJ_SCRIPT_PARAMETERS['rcm_perc_fob'] = OBJ_CONTEXT.getSetting('SCRIPT', 'custscript_rcm_perc_fob');
        OBJ_SCRIPT_PARAMETERS['rcm_dollar_fob'] = OBJ_CONTEXT.getSetting('SCRIPT', 'custscript_rcm_dollar_fob');
        OBJ_SCRIPT_PARAMETERS['rcm_amt_guarantee_fob'] = OBJ_CONTEXT.getSetting('SCRIPT', 'custscript_rcm_amt_guarantee_fob');
            
        nlapiLogExecution('DEBUG', stLoggerTitle, '- Script Parameters -'
                + ' | Search: New Rebate Agreements = ' + OBJ_SCRIPT_PARAMETERS['search_new_rebate_agree']
                + ' | Search: Rebate Agreements Details = ' + OBJ_SCRIPT_PARAMETERS['search_rebate_agree_det']
                + ' | Search: Customer Item Pricing (new) = ' + OBJ_SCRIPT_PARAMETERS['search_cust_item_pricing_new']
                + ' | Contract Status: Processed = ' + OBJ_SCRIPT_PARAMETERS['contract_status_processed']
                + ' | Contract Status: Failed = ' + OBJ_SCRIPT_PARAMETERS['contract_status_failed']
                + ' | Rebate Amount Calc: Percent FLC = ' + OBJ_SCRIPT_PARAMETERS['rcm_perc_flc']
                + ' | Rebate Amount Calc: Dollar FLC = ' + OBJ_SCRIPT_PARAMETERS['rcm_dollar_flc']
                + ' | Rebate Amount Calc: Percent FOB = ' + OBJ_SCRIPT_PARAMETERS['rcm_perc_fob']
                + ' | Rebate Amount Calc: Dollar FOB = ' + OBJ_SCRIPT_PARAMETERS['rcm_dollar_fob']
                + ' | Rebate Amount Calc: Amount Guaranteed Cost FOB = ' + OBJ_SCRIPT_PARAMETERS['rcm_amt_guarantee_fob']
                );
            
        // Collect Script Parameters Values
        var arrRequiredScriptParams = [OBJ_SCRIPT_PARAMETERS['search_new_rebate_agree'],
                                       OBJ_SCRIPT_PARAMETERS['search_rebate_agree_det'],
                                       OBJ_SCRIPT_PARAMETERS['search_cust_item_pricing_new'],
                                       OBJ_SCRIPT_PARAMETERS['contract_status_processed'],
                                       OBJ_SCRIPT_PARAMETERS['contract_status_failed'],
                                       OBJ_SCRIPT_PARAMETERS['rcm_perc_flc'],
                                       OBJ_SCRIPT_PARAMETERS['rcm_dollar_flc'],
                                       OBJ_SCRIPT_PARAMETERS['rcm_perc_fob'],
                                       OBJ_SCRIPT_PARAMETERS['rcm_dollar_fob'],
                                       OBJ_SCRIPT_PARAMETERS['rcm_amt_guarantee_fob']
                                        ];
        
        // Check if there's empty mandatory script parameter
        if (NSUtil.inArray(null, arrRequiredScriptParams) || NSUtil.inArray('', arrRequiredScriptParams))
        {
            // Throw an error if there were missing script parameters (exit)
            throw nlapiCreateError('99999', 'Please enter value for required script parameters.');
        }
        
        NSUtil.rescheduleScript(INT_USAGE_LIMIT_THRESHOLD, INT_START_TIME, INT_TIME_LIMIT_THRESHOLD, INT_PERCENT_ALLOWED_TIME);
        
nlapiLogExecution('DEBUG', stLoggerTitle, '[START] getAllNewRebateAgreement() = ' + new Date().getTime());
        // Search for all 'New' Rebate Agreement WHERE Start Date >= TODAY
        var arrNewRebateAgreements = getAllNewRebateAgreement();
nlapiLogExecution('DEBUG', stLoggerTitle, '[END] getAllNewRebateAgreement() = ' + new Date().getTime());
        
        nlapiLogExecution('DEBUG', 'Total Number of Rebate Agreement = ' + arrNewRebateAgreements.length);
        
        if (NSUtil.isEmpty(arrNewRebateAgreements))
        {
            nlapiLogExecution('DEBUG', stLoggerTitle, 'No New Rebate Agreement Found.>>Exit<<');
            return;
        }
        
        // Loop through all 'New' Rebate Agreement
        for (var inNewRebAgreeCtr = 0; inNewRebAgreeCtr < arrNewRebateAgreements.length; inNewRebAgreeCtr++)
        {
            var stNewRebAgreeID = arrNewRebateAgreements[inNewRebAgreeCtr].getId();
            var arrRebateAgreeDet = null;
            NSUtil.rescheduleScript(INT_USAGE_LIMIT_THRESHOLD, INT_START_TIME, INT_TIME_LIMIT_THRESHOLD, INT_PERCENT_ALLOWED_TIME);
nlapiLogExecution('DEBUG', stLoggerTitle, '[START] getRebateAgreementDetByAgreement() = ' + new Date().getTime());
            arrRebateAgreeDet = getRebateAgreementDetByAgreement(stNewRebAgreeID);
nlapiLogExecution('DEBUG', stLoggerTitle, '[END] getRebateAgreementDetByAgreement() = ' + new Date().getTime());
            
            if (NSUtil.isEmpty(arrRebateAgreeDet))
            {
                nlapiLogExecution('DEBUG', stLoggerTitle, 'No Rebate Agreement Detail found. NEW Rebate Agreement ID = ' + stNewRebAgreeID);
                continue; // Proceed to next Rebate Agreement Detail
            }
            
            // Loop through all Agreement Details
            for (var intRebateAgreeDetCtr = 0; intRebateAgreeDetCtr < arrRebateAgreeDet.length; intRebateAgreeDetCtr++)
            {
                try // TRY-CATCH (START)
                {
                    // Get Customer-Item Combination
                    var objResultRebateAgreeDet = arrRebateAgreeDet[intRebateAgreeDetCtr];
                    var objRebAgreeDetData = {};
                    var objCustContItemPriceResult = {};
                    
                    NSUtil.rescheduleScript(INT_USAGE_LIMIT_THRESHOLD, INT_START_TIME, INT_TIME_LIMIT_THRESHOLD, INT_PERCENT_ALLOWED_TIME);
                    
                        objRebAgreeDetData.reb_agree_det_id = objResultRebateAgreeDet.getId();
                        objRebAgreeDetData.customer = objResultRebateAgreeDet.getValue('custrecord_nsts_rm_eligible_customer');
                        objRebAgreeDetData.item = objResultRebateAgreeDet.getValue('custrecord_nsts_rm_eligible_item');
                        objRebAgreeDetData.item_lastpurchprice = objResultRebateAgreeDet.getValue('lastpurchaseprice', 'custrecord_nsts_rm_eligible_item');
                        objRebAgreeDetData.calc_method = objResultRebateAgreeDet.getValue('custrecord_nsts_rm_calculation_method');
                        objRebAgreeDetData.amount = objResultRebateAgreeDet.getValue('custrecord_nsts_rm_rebate_amount');
                        objRebAgreeDetData.percent = objResultRebateAgreeDet.getValue('custrecord_nsts_rm_rebate_percent');
                        objRebAgreeDetData.guaranteed_amount = objResultRebateAgreeDet.getValue('custrecord_ifd_guaranteedamt');
                    
                    nlapiLogExecution('DEBUG', stLoggerTitle, '- Rebate Agreement Detail -'
                            + ' | Rebate Agreement Det. ID (ID) = ' + objRebAgreeDetData.reb_agree_det_id
                            + ' | Customer = ' + objRebAgreeDetData.customer
                            + ' | Item = ' + objRebAgreeDetData.item
                            + ' | Item: Last Purchase Price = ' + objRebAgreeDetData.item_lastpurchprice
                            + ' | Calculation Method = ' + objRebAgreeDetData.calc_method
                            + ' | Amount = ' + objRebAgreeDetData.amount
                            + ' | Percent = ' + objRebAgreeDetData.percent
                            + ' | Guaranteed Amount = ' + objRebAgreeDetData.guaranteed_amount
                            );
                    
                    if (NSUtil.isEmpty(objRebAgreeDetData.customer) 
                    || NSUtil.isEmpty(objRebAgreeDetData.item)
                    || NSUtil.isEmpty(objRebAgreeDetData.calc_method))
                    {
                        nlapiLogExecution('DEBUG', stLoggerTitle, 'Customer, Item, or Rebate Calculation is empty. Rebate Agreement Detail = ' + objRebAgreeDetData.reb_agree_id);
                        nlapiSubmitField('customrecord_nsts_rm_agreement_detail', objRebAgreeDetData.reb_agree_det_id, 'custrecord_ifd_contractstatus', OBJ_SCRIPT_PARAMETERS['contract_status_failed']);
                        nlapiLogExecution('AUDIT', stLoggerTitle, 'Rebate Agreement Detail failed processing. ID = ' + objRebAgreeDetData.reb_agree_det_id);
                        continue; // Proceed to next Rebate Agreement Detail
                    }
                    
nlapiLogExecution('DEBUG', stLoggerTitle, '[START] getCustItemPricingByCustAndItem() = ' + new Date().getTime());
                    // Search the 'Customer Item Pricing (New)' record using the Customer-Item Combination - NOTE: It is expected to have unique Customer-Item combination in Rebate Agreement
                    objCustContItemPriceResult = getCustItemPricingByCustAndItem(objRebAgreeDetData);
nlapiLogExecution('DEBUG', stLoggerTitle, '[END] getCustItemPricingByCustAndItem() = ' + new Date().getTime());
                    
                    // Skip process if 'Customer Item Pricing (New)' is empty
                    if (NSUtil.isEmpty(objCustContItemPriceResult))
                    {
                        nlapiLogExecution('DEBUG', stLoggerTitle, 'No Customer Item Price Data Found.');
                        continue; // Proceed to next Rebate Agreement Detail
                    }
                    
                    var objContCustItemPriceData = {};
                        objContCustItemPriceData.id = objCustContItemPriceResult.getId();
                        objContCustItemPriceData.reb_agree_det_id = objCustContItemPriceResult.getValue('custrecord_cip_rebagreement_detail');
                        objContCustItemPriceData.customer = objCustContItemPriceResult.getValue('custrecord_cip_customer');
                        objContCustItemPriceData.item = objCustContItemPriceResult.getValue('custrecord_cip_item');
                        objContCustItemPriceData.item_lastpurchprice = objCustContItemPriceResult.getValue('lastpurchaseprice', 'custrecord_cip_item');
                        objContCustItemPriceData.calc_method = objCustContItemPriceResult.getValue('custrecord_nsts_rm_calculation_method', 'custrecord_cip_rebagreement_detail');
                        objContCustItemPriceData.amount = objCustContItemPriceResult.getValue('custrecord_nsts_rm_rebate_amount', 'custrecord_cip_rebagreement_detail');
                        objContCustItemPriceData.percent = objCustContItemPriceResult.getValue('custrecord_nsts_rm_rebate_percent', 'custrecord_cip_rebagreement_detail');
                        objContCustItemPriceData.guaranteed_amount = objCustContItemPriceResult.getValue('custrecord_ifd_guaranteedamt', 'custrecord_cip_rebagreement_detail');
                    
                    nlapiLogExecution('DEBUG', stLoggerTitle, '- Customer Item Pricing Data -'
                            + ' | ID = ' + objContCustItemPriceData.id
                            + ' | Rebate Agreement Det. ID = ' + objContCustItemPriceData.reb_agree_det_id
                            + ' | Customer = ' + objContCustItemPriceData.customer
                            + ' | Item = ' + objContCustItemPriceData.item
                            + ' | Item: Last Purchase Price = ' + objContCustItemPriceData.item_lastpurchprice
                            + ' | Calculation Method = ' + objContCustItemPriceData.calc_method
                            + ' | Amount = ' + objContCustItemPriceData.amount
                            + ' | Percent = ' + objContCustItemPriceData.percent
                            + ' | Guaranteed Amount = ' + objContCustItemPriceData.guaranteed_amount
                            );
                    
                    if (NSUtil.isEmpty(objContCustItemPriceData.customer) 
                    || NSUtil.isEmpty(objContCustItemPriceData.item)
                    || NSUtil.isEmpty(objContCustItemPriceData.calc_method))
                    {
                        nlapiLogExecution('DEBUG', stLoggerTitle, 'Customer, Item, or Rebate Calculation is empty. Rebate Agreement Detail = ' + objContCustItemPriceData.reb_agree_det_id);
                        continue; // Proceed to next Rebate Agreement Detail
                    }

nlapiLogExecution('DEBUG', stLoggerTitle, '[START] getAgreementDetailRebateAmt() = ' + new Date().getTime());
                    var flCurrentRebAgreeDetAmt = getAgreementDetailRebateAmt(objContCustItemPriceData);
                    var flNewRebAgreeDetAmt = getAgreementDetailRebateAmt(objRebAgreeDetData);
nlapiLogExecution('DEBUG', stLoggerTitle, '[END] getAgreementDetailRebateAmt() = ' + new Date().getTime());
                    
                    // If the rebate amount of 'Rebate Agreement Detail' >= rebate amount of 'Customer Item Pricing (New)' record
                    if (flCurrentRebAgreeDetAmt < flNewRebAgreeDetAmt)
                    {
                        // Update 'Rebate Agreement Detail' field of 'Customer Item Pricing (New)' record
                        nlapiSubmitField('customrecord_item_pricing_cust', objContCustItemPriceData.id, 'custrecord_cip_rebagreement_detail', objRebAgreeDetData.reb_agree_det_id, true);
                        nlapiLogExecution('AUDIT', stLoggerTitle, 'Customer Item Pricing has been successfully processed. ID = ' + objContCustItemPriceData.id);
                    }
                    
                    // Update Rebate Agreement Detail
                    nlapiSubmitField('customrecord_nsts_rm_agreement_detail', objRebAgreeDetData.reb_agree_det_id, 'custrecord_ifd_contractstatus', OBJ_SCRIPT_PARAMETERS['contract_status_processed']);
                    nlapiLogExecution('AUDIT', stLoggerTitle, 'Rebate Agreement Detail has been successfully processed. ID = ' + objContCustItemPriceData.id);
                }
                catch (err) // TRY-CATCH (---)
                {
                    if (err.getDetails != undefined)
                    {
                        nlapiLogExecution('ERROR', 'Process Error', err.getCode() + ': ' + err.getDetails());
                    }
                    else
                    {
                        nlapiLogExecution('ERROR', 'Unexpected Error', err.toString());
                    }
nlapiLogExecution('DEBUG', stLoggerTitle, '[START] nlapiSubmitField(customrecord_nsts_rm_agreement_detail) = ' + new Date().getTime());
                    nlapiSubmitField('customrecord_nsts_rm_agreement_detail', objRebAgreeDetData.reb_agree_det_id, 'custrecord_ifd_contractstatus', OBJ_SCRIPT_PARAMETERS['contract_status_failed']);
nlapiLogExecution('DEBUG', stLoggerTitle, '[END] nlapiSubmitField(customrecord_nsts_rm_agreement_detail) = ' + new Date().getTime());
                    nlapiLogExecution('AUDIT', stLoggerTitle, 'Rebate Agreement Detail failed processing. ID = ' + objRebAgreeDetData.reb_agree_det_id);
                }// TRY-CATCH (END)
            } // Loop ends here
            
nlapiLogExecution('DEBUG', stLoggerTitle, '[START] nlapiSubmitField(customrecord_nsts_rm_rebate_agreement) = ' + new Date().getTime());
            // Set 'Rebate Agreement Detail' record > Status => Processed
            nlapiSubmitField('customrecord_nsts_rm_rebate_agreement', stNewRebAgreeID, 'custrecord_ifd_contract_status', OBJ_SCRIPT_PARAMETERS['contract_status_processed']);
nlapiLogExecution('DEBUG', stLoggerTitle, '[END] nlapiSubmitField(customrecord_nsts_rm_rebate_agreement) = ' + new Date().getTime());
            nlapiLogExecution('AUDIT', stLoggerTitle, 'New Rebate Agreement has been successfully processed. ID = ' + stNewRebAgreeID);
        } // Loop ends here
        
        nlapiLogExecution('DEBUG', stLoggerTitle, '>>Exit<<');
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

/**
 * This function calculates the rebate amount using based from the Calculation Method 
 * 
 * @param {Object} objData
 * @return {Float} flAmount
 */
function getAgreementDetailRebateAmt(objData)
{
    var flAmount = 0;
    
    // Rebate Calculation Action
    switch(objData.calc_method)
    {
        case OBJ_SCRIPT_PARAMETERS['rcm_perc_flc']:
            flAmount = calcFixedPctLandedCost(objData);
            break;
        case OBJ_SCRIPT_PARAMETERS['rcm_dollar_flc']:
            flAmount = calcFixedDollarLandedCost(objData);
            break;
        case OBJ_SCRIPT_PARAMETERS['rcm_perc_fob']:
            flAmount = calcFixedPctFOB(objData);
            break;
        case OBJ_SCRIPT_PARAMETERS['rcm_dollar_fob']:
            flAmount = calcFixedDollarFOB(objData);
            break;
        case OBJ_SCRIPT_PARAMETERS['rcm_amt_guarantee_fob']:
            flAmount = calcFixedGuaranteedLPP(objData);
            break;
    }
    
    return flAmount;
}

/***************************************************************************************
 *                              Calculation Methods                                    *
 ****************************************************************************************/

function calcFixedPctLandedCost(objData)
{
    var stLoggerTitle = 'calcFixedPctLandedCost';

    var flAmount = 0.00;
    var stFrozenLandCost = nlapiLookupField('item', objData.item, 'custitem_flc_weekly');
    var flFrozenLandCost = Parse.forceFloat(stFrozenLandCost);
    var flPercent = convertPercentageToDecimal(objData.percent);

    flAmount = flFrozenLandCost * flPercent;
    
    nlapiLogExecution('DEBUG', stLoggerTitle, 'Frozen Landed Cost = ' + flFrozenLandCost 
            + ' | Percent = ' + flPercent
            + ' | Calculated Amount = ' + flAmount);

    return flAmount;
}

function calcFixedDollarLandedCost(objData)
{
    var stLoggerTitle = 'calcFixedDollarLandedCost';
    nlapiLogExecution('DEBUG', stLoggerTitle, 'Retail Agreement Detail Amount = ' + objData.amount);
    return objData.amount;
}

function calcFixedPctFOB(objData)
{
    var stLoggerTitle = 'calcFixedPctFOB';

    var flAmount = 0.00;
    var flItemLastPurchPrice = Parse.forceFloat(objData.item_lastpurchprice);
    var flPercent = convertPercentageToDecimal(objData.percent);

    flAmount = flItemLastPurchPrice * flPercent;
    
    nlapiLogExecution('DEBUG', stLoggerTitle, 'Last Purchase Price = ' + flItemLastPurchPrice
            + ' | Percent = ' + flPercent
            + ' | Calculated Amount = ' + flAmount);

    return flAmount;
}

function calcFixedDollarFOB(objData)
{
    var stLoggerTitle = 'calcFixedDollarFOB';
    nlapiLogExecution('DEBUG', stLoggerTitle, 'Retail Agreement Detail Amount = ' + objData.amount);
    return objData.amount;
}

function calcFixedGuaranteedLPP(objData)
{
    var stLoggerTitle = 'calcFixedGuaranteedLPP';

    var flAmount = 0.00;
    var flGuaranteedAmt = Parse.forceFloat(objData.guaranteed_amount);
    var flItemLastPurchPrice = Parse.forceFloat(objData.item_lastpurchprice);

    flAmount = flItemLastPurchPrice - flGuaranteedAmt;

    nlapiLogExecution('DEBUG', stLoggerTitle, 'Guaranteed Amount = ' + flGuaranteedAmt
            + ' | Last Purchase Price = ' + flItemLastPurchPrice
            + ' | Calculated Amount = ' + flAmount);
    
    return flAmount;
}

/***************************************************************************************
 *                                    SEARCHES                                         *
 ****************************************************************************************/

function getAllNewRebateAgreement(objResultRebateAgreeDet)
{
    var arrResult = [];
    
    var arrSearchFilters = [];
    var arrSearchColumns = [];
        
    try
    {
        arrResult = NSUtil.search('', OBJ_SCRIPT_PARAMETERS['search_new_rebate_agree'], arrSearchFilters, arrSearchColumns);
    }
    catch (error)
    {
        arrResult = [];
    }
    
    return arrResult;
}

function getRebateAgreementDetByAgreement(stNewRebAgreeID)
{
    var arrResult = [];
    
    var arrSearchFilters = [new nlobjSearchFilter('custrecord_nsts_rm_rebate_agreement', null, 'anyof', stNewRebAgreeID)];
    var arrSearchColumns = [];
        
    try
    {
        arrResult = NSUtil.search('', OBJ_SCRIPT_PARAMETERS['search_rebate_agree_det'], arrSearchFilters, arrSearchColumns);
    }
    catch (error)
    {
        arrResult = [];
    }
    
    return arrResult;
}

function getCustItemPricingByCustAndItem(objRebAgreeDetData)
{
    var arrResult = [];
    
    var arrSearchFilters = [new nlobjSearchFilter('custrecord_cip_customer', null, 'anyof', objRebAgreeDetData.customer),
                            new nlobjSearchFilter('custrecord_cip_item', null, 'anyof', objRebAgreeDetData.item),];
    var arrSearchColumns = [];
        
    try
    {
        arrResult = NSUtil.search('', OBJ_SCRIPT_PARAMETERS['search_cust_item_pricing_new'], arrSearchFilters, arrSearchColumns);
    }
    catch (error)
    {
        arrResult = [];
    }
    
    return arrResult[0];
}

/***************************************************************************************
 *                                    Utils                                            *
 ****************************************************************************************/

/**
 * Check if an object is empty
 * @param obj (string) value to check
 * @returns {Boolean}
 */
function isEmptyObj(obj) {
    for(var prop in obj) {
        if(obj.hasOwnProperty(prop))
        {
            return false;
        }
    }

    return true;
}

/**
 * Converts a percent string to percent decimal
 * @param {String}
 * @returns {Float} 
 */
function convertPercentageToDecimal(stPercentage)
{
    stPercentage = stPercentage.replace('%', '');
    var flPercentage = parseFloat(stPercentage);
    var flDecimal = flPercentage/100;
    
    if (isNaN(flDecimal))
    {
        return 0;
    }
    
    return flDecimal;
}

/**
 * Mapping of item ids
 * 
 * @param stRecordType
 * @returns
 */
function toItemRecordInternalId(stRecordType) {
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
}

var NSUtil = (typeof NSUtil === 'undefined') ? {} : NSUtil;

/**
 * 
 * Version 1:
 * @author memeremilla
 * Details: Initial version
 * 
 * Version 2: 
 * @author bfeliciano
 * Details: Revised shorthand version.
 *
 * @param {String} stValue - string or object to evaluate
 * @returns {Boolean} - true if empty/null/undefined, false if not
 * 
 */
NSUtil.isEmpty = function(stValue)
{
    return ((stValue === '' || stValue == null || stValue == undefined) || (stValue.constructor === Array && stValue.length == 0) || (stValue.constructor === Object && (function(v)
    {
        for ( var k in v)
            return false;
        return true;
    })(stValue)));
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
    for (var i = arrValue.length - 1; i >= 0; i--)
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
 * Get all of the results from the search even if the results are more than 1000.
 * @param {String} stRecordType - the record type where the search will be executed.
 * @param {String} stSearchId - the search id of the saved search that will be used.
 * @param {nlobjSearchFilter[]} arrSearchFilter - array of nlobjSearchFilter objects. The search filters to be used or will be added to the saved search if search id was passed.
 * @param {nlobjSearchColumn[]} arrSearchColumn - array of nlobjSearchColumn objects. The columns to be returned or will be added to the saved search if search id was passed.
 * @returns {nlobjSearchResult[]} - an array of nlobjSearchResult objects
 * @author memeremilla - initial version
 * @author gmanarang - used concat when combining the search result
 */
NSUtil.search = function(stRecordType, stSearchId, arrSearchFilter, arrSearchColumn)
{
    if (stRecordType == null && stSearchId == null)
    {
        throw nlapiCreateError('SSS_MISSING_REQD_ARGUMENT', 'search: Missing a required argument. Either stRecordType or stSearchId should be provided.');
    }

    var arrReturnSearchResults = new Array();
    var objSavedSearch;

    if (stSearchId != null)
    {
        objSavedSearch = nlapiLoadSearch((stRecordType) ? stRecordType : null, stSearchId);

        // add search filter if one is passed
        if (arrSearchFilter != null)
        {
            objSavedSearch.addFilters(arrSearchFilter);
        }

        // add search column if one is passed
        if (arrSearchColumn != null)
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
        if ((nlapiGetContext().getExecutionContext() === 'scheduled'))
        {
            try
            {
                this.rescheduleScript(1000);
            }
            catch (e)
            {
            }
        }

        arrResultSlice = objResultset.getResults(intSearchIndex, intSearchIndex + 1000);
        if (arrResultSlice == null)
        {
            break;
        }

        arrReturnSearchResults = arrReturnSearchResults.concat(arrResultSlice);
        intSearchIndex = arrReturnSearchResults.length;
    }

    while (arrResultSlice.length >= 1000);

    return arrReturnSearchResults;
};

/**
 * A call to this API places a scheduled script into the NetSuite scheduling queue.
 *
 * @param {String}
 *            stScheduledScriptId - String or number. The script internalId or custom scriptId{String}.
 * @param {String}
 *            stDeployId [optional] - String or number. The deployment internal ID or script ID. If empty, the first "free" deployment will be used.
 *            Free means that the script's deployment status appears as Not Scheduled or Completed.
 *            If there are multiple "free" scripts, the NetSuite scheduler will take the first free script that appears in the scheduling queue.
 * @param {Object}
 *            objParams [optional] - Object of name/values used in this schedule script instance - used to override the script parameters values for this execution.
 * @returns {String} - status
 * @author memeremilla
 */
NSUtil.scheduleScript = function(stScheduledScriptId, stDeployId, objParams)
{

    var stLoggerTitle = 'scheduleScript';

    if (stScheduledScriptId == null)
    {
        throw nlapiCreateError('SSS_MISSING_REQD_ARGUMENT', 'scheduleScript: Missing a required argument "stScheduledScriptId".');
    }

    // Deployment name character limit
    var intCharLimit = 28;

    // Invoke script
    var stStatus = nlapiScheduleScript(stScheduledScriptId, stDeployId, objParams);
    nlapiLogExecution('DEBUG', stLoggerTitle, 'Scheduled Script Status : ' + stStatus);

    var stDeployInternalId = null;
    var stBaseName = null;
    if (stStatus != 'QUEUED')
    {
        var arrFilter = new Array();
        arrFilter =
            [
                        [
                                'script.scriptid', 'is', stScheduledScriptId
                        ], 'OR',
                        [
                                [
                                        'formulatext:{script.id}', 'is', stScheduledScriptId
                                ]
                        ]
            ];

        var arrColumn = new Array();
        arrColumn.push(new nlobjSearchColumn('internalid', 'script'));
        arrColumn.push(new nlobjSearchColumn('scriptid', 'script'));
        arrColumn.push(new nlobjSearchColumn('script'));
        arrColumn.push(new nlobjSearchColumn('scriptid'));
        arrColumn.push(new nlobjSearchColumn('internalid').setSort(false));

        var arrResults = nlapiSearchRecord('scriptdeployment', null, arrFilter, arrColumn);

        if ((arrResults != null) && (arrResults.length > 0))
        {
            stDeployInternalId = arrResults[0].getId();
            stBaseName = arrResults[0].getValue('scriptid', 'script');
        }
    }

    if ((stDeployInternalId == null) || (stDeployInternalId == ''))
    {
        return stStatus;
    }

    stBaseName = stBaseName.toUpperCase().split('CUSTOMSCRIPT')[1];

    // If not queued, create deployment
    while (stStatus != 'QUEUED')
    {
        // Copy deployment
        var recDeployment = nlapiCopyRecord('scriptdeployment', stDeployInternalId);

        var stOrder = recDeployment.getFieldValue('title').split(' ').pop();
        var stNewDeploymentId = stBaseName + stOrder;
        var intExcess = stNewDeploymentId.length - intCharLimit;

        stNewDeploymentId = (intExcess > 0) ? (stBaseName.substring(0, (stBaseName.length - intExcess)) + stOrder) : stNewDeploymentId;

        recDeployment.setFieldValue('isdeployed', 'T');
        recDeployment.setFieldValue('status', 'NOTSCHEDULED');
        recDeployment.setFieldValue('scriptid', stNewDeploymentId);

        var intCountQueue = nlapiGetContext().getQueueCount();
        if (intCountQueue > 1)
        {
            var stQueue = Math.floor(Math.random() * intCountQueue).toString();
            stQueue = (stQueue == '0') ? '1' : stQueue;

            recDeployment.setFieldValue('queueid', stQueue);
        }

        // Save deployment
        var stRecID = nlapiSubmitRecord(recDeployment);
        nlapiLogExecution('AUDIT', stLoggerTitle, 'Script Deployment Record has been created.' + ' | ' + 'ID: ' + stRecID + ' | ' + 'Record Type: ' + recDeployment.getRecordType());

        // Invoke deployment
        stStatus = nlapiScheduleScript(stScheduledScriptId, null, objParams);
        nlapiLogExecution('DEBUG', stLoggerTitle, 'Scheduled Script Status : ' + stStatus);

    }

    return stStatus;
};

/**
 * Pauses the scheduled script either if the remaining usage is less than
 * the specified governance threshold usage amount or the allowed time is
 * @param {Number} intGovernanceThreshold - The value of the governance threshold  usage units before the script will be rescheduled.
 * @param {Number} intStartTime - The time when the scheduled script started
 * @param {Number} intMaxTime - The maximum time (milliseconds) for the script to reschedule. Default is 1 hour.
 * @param {Number} flPercentOfAllowedTime - the percent of allowed time based from the maximum running time. The maximum running time is 3600000 ms.
 * @returns {Number} - intCurrentTime
 * @author memeremilla
 * 
 * Version 2
 * @author redelacruz
 * Details: throws an error with error code FAILURE_TO_YIELD when yielding fails
 */
NSUtil.rescheduleScript = function(intGovernanceThreshold, intStartTime, intMaxTime, flPercentOfAllowedTime)
{
    if (intGovernanceThreshold == null && intStartTime == null)
    {
        throw nlapiCreateError('SSS_MISSING_REQD_ARGUMENT', 'rescheduleScript: Missing a required argument. Either intGovernanceThreshold or intStartTime should be provided.');
    }

    var stLoggerTitle = 'rescheduleScript';
    nlapiLogExecution('DEBUG', stLoggerTitle, 'Script State : ' + JSON.stringify(
    {
        'Remaining usage' : nlapiGetContext().getRemainingUsage()
    }));

    if (intMaxTime == null)
    {
        intMaxTime = 3600000;
    }

    var intRemainingUsage = nlapiGetContext().getRemainingUsage();
    var intRequiredTime = 900000; // 25% of max time
    if ((flPercentOfAllowedTime))
    {
        var flPercentRequiredTime = 100 - flPercentOfAllowedTime;
        intRequiredTime = intMaxTime * (flPercentRequiredTime / 100);
    }

    // check if there is still enough usage units
    if ((intGovernanceThreshold))
    {
        nlapiLogExecution('DEBUG', stLoggerTitle, 'Script State : ' + 'Checking if there is still enough usage units.');

        if (intRemainingUsage < (parseInt(intGovernanceThreshold, 10) + parseInt(20, 10)))
        {
            nlapiLogExecution('DEBUG', stLoggerTitle, 'Script State : ' + JSON.stringify(
            {
                'Remaining usage' : nlapiGetContext().getRemainingUsage()
            }));
            nlapiLogExecution('DEBUG', stLoggerTitle, 'Script State : ' + 'Rescheduling script.');

            var objYield = null;
            try
            {
                objYield = nlapiYieldScript();
            }
            catch (e)
            {
                if (e.getDetails != undefined)
                {
                    throw e;
                }
                else
                {
                    if (e.toString().indexOf('NLServerSideScriptException') <= -1)
                    {
                        throw e;
                    }
                    else
                    {
                        objYield =
                        {
                            'Status' : 'FAILURE',
                            'Reason' : e.toString(),
                        };
                    }
                }
            }

            if (objYield.status == 'FAILURE')
            {
                nlapiLogExecution('ERROR', stLoggerTitle, 'Script State : ' + 'Unable to Yield.');
                nlapiLogExecution('ERROR', stLoggerTitle, 'Script State : ' + JSON.stringify(
                {
                    'Status' : objYield.status,
                    'Information' : objYield.information,
                    'Reason' : objYield.reason
                }));
                throw nlapiCreateError('FAILURE_TO_YIELD', 'Unable to Yield.',true);
            }
            else
            {
                nlapiLogExecution('AUDIT', stLoggerTitle, 'Script State : ' + 'Successfully reschedule the script.');
                nlapiLogExecution('AUDIT', stLoggerTitle, 'Script State : ' + JSON.stringify(
                {
                    'After resume with' : intRemainingUsage,
                    'Remaining vs governance threshold' : intGovernanceThreshold
                }));
            }
        }
    }

    if ((intStartTime != null && intStartTime != 0))
    {
        // get current time
        var intCurrentTime = new Date().getTime();

        // check if elapsed time is near the arbitrary value
        nlapiLogExecution('DEBUG', stLoggerTitle, 'Script State : ' + 'Check if elapsed time is near the arbitrary value.');

        var intElapsedTime = intMaxTime - (intCurrentTime - intStartTime);
        nlapiLogExecution('DEBUG', stLoggerTitle, 'Script State : ' + 'Remaining time is ' + intElapsedTime + ' ms.');

        if (intElapsedTime < intRequiredTime)
        {
            nlapiLogExecution('AUDIT', stLoggerTitle, 'Script State : ' + 'Rescheduling script.');

            // check if we are not reaching the max processing time which is 3600000 secondsvar objYield = null;
            try
            {
                objYield = nlapiYieldScript();
            }
            catch (e)
            {
                if (e.getDetails != undefined)
                {
                    throw e;
                }
                else
                {
                    if (e.toString().indexOf('NLServerSideScriptException') <= -1)
                    {
                        throw e;
                    }
                    else
                    {
                        objYield =
                        {
                            'Status' : 'FAILURE',
                            'Reason' : e.toString(),
                        };
                    }
                }
            }

            if (objYield.status == 'FAILURE')
            {
                nlapiLogExecution('ERROR', stLoggerTitle, 'Script State : ' + 'Unable to Yield.');
                nlapiLogExecution('ERROR', stLoggerTitle, 'Script State : ' + JSON.stringify(
                {
                    'Status' : objYield.status,
                    'Information' : objYield.information,
                    'Reason' : objYield.reason
                }));
                throw nlapiCreateError('FAILURE_TO_YIELD', 'Unable to Yield.',true);
            }
            else
            {
                nlapiLogExecution('AUDIT', stLoggerTitle, 'Script State : ' + 'Successfully reschedule the script.');
                nlapiLogExecution('AUDIT', stLoggerTitle, 'Script State : ' + JSON.stringify(
                {
                    'After resume with' : intRemainingUsage,
                    'Remaining vs governance threshold' : intGovernanceThreshold
                }));

                // return new start time
                intStartTime = new Date().getTime();
            }
        }
    }

    return intStartTime;
};

/**
 * (DEPRECATED, use NSUtil.reschedule instead) Checks governance then calls yield
 * @param   {Integer} intGovernanceThreshold     *
 * @returns {Void}
 * @author memeremilla
 */
NSUtil.checkGovernance = function(intGovernanceThreshold)
{
    if (intGovernanceThreshold == null)
    {
        throw nlapiCreateError('SSS_MISSING_REQD_ARGUMENT', 'checkGovernance: Missing a required argument "intGovernanceThreshold".');
    }

    var objContext = nlapiGetContext();

    if (objContext.getRemainingUsage() < intGovernanceThreshold)
    {
        var objState = nlapiYieldScript();
        if (objState.status == 'FAILURE')
        {
            nlapiLogExecution("ERROR", "Failed to yield script, exiting: Reason = " + objState.reason + " / Size = " + objState.size);
            throw "Failed to yield script";
        }
        else if (objState.status == 'RESUME')
        {
            nlapiLogExecution("AUDIT", "Resuming script because of " + objState.reason + ".  Size = " + objState.size);
        }
    }
};
