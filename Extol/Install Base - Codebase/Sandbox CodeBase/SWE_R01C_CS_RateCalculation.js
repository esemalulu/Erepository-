/**
 * Copyright (c) 1998-2008 NetSuite, Inc.
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
 * GLOBAL VARIABLES
 */
// This variable is used by the CS_resetTranLines function to skip the alerts made by the validate line on resets.
var bSKIP_EMPTY_RESET_DATA_ALERT = false;
// Used so Custom Blocking doesn't go into endless loop
var CUSTOM_PRICE_CHECK_DONE = false;
var CUSTOM_PRICE_CHECK_ITERATION = 0;
// This variable stores all M/S Types
var MS_TYPE_DATA = null;
// This keeps track if the Save Alert message of Item Group processing has been shown
var bItemGroupMsgShown = false;

/**
 * This function validates the transaction lines prior to submit.
 *
 * @author Michael Franz V. Sumulong
 * @version 1.0
 */
function saveRecord_ValidateTranLines()
{
    var logger = new Logger(true);
    var MSG_TITLE = 'saveRecord_ValidateTranLines';
    //logger.enableDebug(); //comment this line to disable debug

    var arrTermCat = splitList(nlapiGetContext().getSetting('SCRIPT', 'custscript_rate_calc_term_item_cat'));
    var arrMaintCat = splitList(nlapiGetContext().getSetting('SCRIPT', 'custscript_rate_calc_mte_item_cat'));
    var arrSupportCat = splitList(nlapiGetContext().getSetting('SCRIPT', 'custscript_rate_calc_support_item_cat'));
    var MS_MODEL = nlapiGetContext().getSetting('SCRIPT', 'custscript_r1c_renewals_ms_model');
    var stTranType = nlapiGetFieldValue('type');
    var ITEM_COMMIT_LIMIT = nlapiGetContext().getSetting('SCRIPT', 'custscript_r01c_process_group_line_limit');
    if(ITEM_COMMIT_LIMIT != null && ITEM_COMMIT_LIMIT != '' && ITEM_COMMIT_LIMIT != undefined)
    {
        ITEM_COMMIT_LIMIT = parseInt(ITEM_COMMIT_LIMIT);
    }
    else
    {
        ITEM_COMMIT_LIMIT = 5;
    }
    var iItemsRecommitted = 0;

    logger.debug(MSG_TITLE, 'arrTermCat:' + arrTermCat);
    logger.debug(MSG_TITLE, 'arrMaintCat:' + arrMaintCat);
    logger.debug(MSG_TITLE, 'arrSupportCat:' + arrSupportCat);
    logger.debug(MSG_TITLE, 'Tran Type:' + stTranType);

    /* Get Tran Start & End Dates */
    var stTranStartDt = nlapiGetFieldValue('startdate');
    var stTranEndDt = nlapiGetFieldValue('enddate');

    logger.debug(MSG_TITLE, 'stTranStartDt:' + stTranStartDt);
    logger.debug(MSG_TITLE, 'stTranEndDt:' + stTranEndDt);

    /* Go through the tran lines */
    logger.debug(MSG_TITLE, 'Line Item Count:' + nlapiGetLineItemCount('item'));
    var bIsItemGroup = false;
    var iItemGroupLineCnt = 0;
    for (var idx = 1; idx <= nlapiGetLineItemCount('item'); idx++)
    {
        /* Make sure that tran line has a list rate. */
        //        var stItemType = nlapiLookupField('item', nlapiGetLineItemValue('item', 'item', idx), 'recordType');
        var stItemType = nlapiGetLineItemValue('item', 'itemtype', idx);
        if (stItemType == 'Discount'
                || stItemType == 'Markup'
                || stItemType == 'Description'
                || stItemType == 'Subtotal'
                || stItemType == 'Kit'
                || stItemType == 'Payment'
                || stItemType == 'Group'
                || stItemType == 'EndGroup'
                || stItemType == null
                )
        {
            logger.debug(MSG_TITLE, 'Skipping discount or markup items.');
            if (stItemType == 'Group')
            {
                bIsItemGroup = true;
                iItemGroupLineCnt = CS_CountItemGroupLines(idx);
                logger.debug(MSG_TITLE,'Item Group Line Count: ' + iItemGroupLineCnt);
            }
            if(stItemType == 'EndGroup'){
                bIsItemGroup = false;
            }
            continue;
        }

        var stItemCat = nlapiGetLineItemValue('item', 'custcol_item_category', idx);
        var bIsProjItem = (nlapiGetLineItemValue('item', FLD_IS_PROJECT_ITEM, idx) == 'T');

        /* If there's an item group, loop through the item's and trigger the codes again. */
        if (bIsItemGroup || bIsProjItem)
        {
            if(iItemsRecommitted >= ITEM_COMMIT_LIMIT)
            {
                alert('You are saving a transaction with an Item Group that has ' + (iItemGroupLineCnt - ITEM_COMMIT_LIMIT) + ' Group Line Items remaining to process, which is more than the ' + ITEM_COMMIT_LIMIT + ' Line Items limit. The next ' + ITEM_COMMIT_LIMIT + ' Group Line Items will be processed when you click the "Process Group" button.');
                return false;
            }

            var flCurListRate = nlapiGetLineItemValue('item','custcol_list_rate',idx);
            var bIsOutOfSynch = (nlapiGetLineItemValue('item','custcol_out_of_synch',idx) == 'T');
            if(flCurListRate == null || flCurListRate == '' || flCurListRate == undefined || bIsOutOfSynch)
            {
                if(!bItemGroupMsgShown)
                {
                    if(iItemGroupLineCnt > ITEM_COMMIT_LIMIT)
                    {
                        alert('You are saving a transaction with an Item Group that has ' + iItemGroupLineCnt + ' Group Line Items to process, which is more than the ' + ITEM_COMMIT_LIMIT + ' Line Items limit. The next ' + ITEM_COMMIT_LIMIT + ' Group Line Items will be processed when you click "Ok". After that you will need to click on the "Process Group" button each cycle.\n\nYou can control the number of Group Line Items processed each time at [ Home > Set Preferences > Custom Preferences > R01C: Process Group Line Item Limit ]. The maximum number of Group Line Items that can be processed at once is 20, due to web browser limitations.');
                        bItemGroupMsgShown = true;
                    }
                }
                nlapiSelectLineItem('item', idx);
                /* Since the M/S percent value doesn't get source through on item groups, get it manually */
                if (searchInList(arrMaintCat, stItemCat) || searchInList(arrSupportCat, stItemCat))
                {
                    var stMSPercent = nlapiGetLineItemValue('item', 'custcol_mtce_support_percent', idx);
                    var stMSType = nlapiGetLineItemValue('item', 'custcol_mtce_support_type', idx);
                    logger.debug(MSG_TITLE, 'Item is an M/S item.\n'
                            + 'M/S Type:' + stMSType
                            + '\nM/S %:' + stMSPercent
                            );
                    if (stMSPercent == null || stMSPercent == undefined || stMSPercent == '')
                    {
                        if (stMSType != null && stMSType != undefined && stMSType != '')
                        {
                            /* Retrieve M/S Types if not yet retrieved. */
                            if(MS_TYPE_DATA == null)
                            {
                                MS_TYPE_DATA = retrieveMSTypes();
                            }
                            
                            /* Find a match for the M/S Type of the item line */
                            for(var iMTDidx = 0; iMTDidx < MS_TYPE_DATA.length; iMTDidx++)
                            {
                                if(MS_TYPE_DATA[iMTDidx].id == stMSType)
                                {
                                    stMSPercent = MS_TYPE_DATA[iMTDidx].percentage;
                                    break;
                                }
                            }
                            logger.debug(MSG_TITLE, 'M/S Percentage is ' + stMSPercent);
                            if (stMSPercent != null && stMSPercent != undefined && stMSPercent != '')
                            {
                                logger.debug(MSG_TITLE, 'Setting M/S Percentage');
                                nlapiSetCurrentLineItemValue('item', 'custcol_mtce_support_percent', stMSPercent, false,true);
                            }
                        }
                    }
                }
                nlapiCommitLineItem('item');
                
                /* Keep track of last recommitted item */
                iItemsRecommitted++;
            }
        }

        /* If M/S Model is based on percentage, then make sure that tran line is not out of synch */
        if(MS_MODEL == MS_MODEL_PERCENTAGE || MS_MODEL == MS_MODEL_PERCENTAGE_NET)
        {
            var bIsOutOfSynch = (nlapiGetLineItemValue('item','custcol_out_of_synch',idx) == 'T');
            if(bIsOutOfSynch)
            {
                nlapiSelectLineItem('item', idx);
                alert('You have edited a transaction line that effects a percentage Maintenance/Support calculation in another transaction line.\nPlease edit and commit each Maintenance/Support transaction line effected by your change.');
                return false;
            }
        }
        
        var flListRate = nlapiGetLineItemValue('item', 'custcol_list_rate', idx);
        if (flListRate == null || flListRate == undefined || flListRate == '')
        {
            alert('The list rate seems to be missing for transaction line ' + idx + '. Please review that transaction line first.');
            return false;
        }

        if (searchInList(arrTermCat, stItemCat) || searchInList(arrMaintCat, stItemCat) || searchInList(arrSupportCat, stItemCat))
        {
            var iTermInMonths = nlapiGetLineItemValue('item', 'revrecterminmonths', idx);
            var stStartDt = nlapiGetLineItemValue('item', 'revrecstartdate', idx);
            var stEndDt = nlapiGetLineItemValue('item', 'revrecenddate', idx);
            if (iTermInMonths == null || iTermInMonths == undefined || iTermInMonths == '')
            {
                alert('The term in months seems to be missing for transaction line ' + idx + '. Please review that transaction line first.');
                return false;
            }
            if(stTranType != 'opprtnty' && stTranType != 'estimate'){
                if (stStartDt == null || stStartDt == undefined || stStartDt == '')
                {
                    alert('The rev. rec. start date seems to be missing for transaction line ' + idx + '. Please review that transaction line first.');
                    return false;
                }
                if (stEndDt == null || stEndDt == undefined || stEndDt == '')
                {
                    alert('The rev. rec. end date seems to be missing for transaction line ' + idx + '. Please review that transaction line first.');
                    return false;
                }
                if(stTranStartDt != null && stTranStartDt != undefined && stTranStartDt != ''){
                    if(stTranStartDt != stStartDt){
                        return confirm('At least one transaction line has a different rev. rec. dates from the transaction\'s start and end dates.\nDo you still want to proceed with saving the record?');
                    }
                }
                if(stTranEndDt != null && stTranEndDt != undefined && stTranEndDt != ''){
                    if(stTranEndDt != stEndDt){
                        return confirm('At least one transaction line has a different rev. rec. dates from the transaction\'s start and end dates.\nDo you still want to proceed with saving the record?');
                    }
                }
            }

        }

    }


    return true;
}


/**
 * This script ensures that the List Price field is emptied whenever
 * the Price Level or Item has changed.
 *
 * @param (string) stListName The group name
 * @param (string) stFieldName The field name
 * @param (string) iLineIndex The current tran line index
 * @author Michael Franz V. Sumulong
 * @version 1.0
 */
function fieldChanged_ResetListPrice(stListName, stFieldName, iLineIndex)
{
    var logger = new Logger(true);
    var MSG_TITLE = 'fieldChanged_ResetListPrice';
    //logger.enableDebug(); //comment this line to disable debug


    var arrMaintCat = splitList(nlapiGetContext().getSetting('SCRIPT', 'custscript_rate_calc_mte_item_cat'));
    var arrSupportCat = splitList(nlapiGetContext().getSetting('SCRIPT', 'custscript_rate_calc_support_item_cat'));
    var arrTermCat = splitList(nlapiGetContext().getSetting('SCRIPT', 'custscript_rate_calc_term_item_cat'));
    var arrLimitCat = splitList(nlapiGetContext().getSetting('SCRIPT', 'custscript_r01_item_cat_4_custom_limits'));

    if (stListName == 'item' && (stFieldName == 'price' || stFieldName == 'item'))
    {
        logger.debug(MSG_TITLE, '=====Start=====');
        logger.debug(MSG_TITLE, 'Function Parameters:'
                + '\nList Name:' + stListName
                + '\nFieldName:' + stFieldName
                + '\nLine Index:' + iLineIndex
                );

        /* Clear the List Rate */
        nlapiSetCurrentLineItemValue(stListName, 'custcol_list_rate', '', false,true);

        /* Reset the List Price field. */
        var stItemCat = nlapiGetCurrentLineItemValue(stListName, 'custcol_item_category', iLineIndex);
        var stPriceLevel = nlapiGetCurrentLineItemValue(stListName, stFieldName, iLineIndex);
        logger.debug(MSG_TITLE, 'Price Level=' + stPriceLevel);
        if (stPriceLevel != null && stPriceLevel != undefined && stPriceLevel != '')
        {

            /* If Price Level is custom, no need to populate */
            if (stPriceLevel == -1)
            {
                var isCustomBlocked = (nlapiGetFieldValue('custbody_block_custom_price_level') == YES);
                var isCustomMSAllowed = (nlapiGetFieldValue('custbody_allow_custom_price_lvl_for_ms') == YES);
                logger.debug(MSG_TITLE, 'isCustomBlocked=' + isCustomBlocked);
                logger.debug(MSG_TITLE, 'isCustomMSAllowed=' + isCustomMSAllowed);
                // Check if the item category needs to be limited
                if(searchInList(arrLimitCat, stItemCat))
                {
                    if (isCustomBlocked)
                    {
                        if (!isCustomMSAllowed)
                        {
                            if(!CUSTOM_PRICE_CHECK_DONE)
                            {
                                // Mark the variables for the regression loop
                                CUSTOM_PRICE_CHECK_DONE = true;
                                CUSTOM_PRICE_CHECK_ITERATION++;
                                nlapiSetCurrentLineItemValue(stListName, 'price', 1, true,true);
                                // Reset the variable since the regression is finished
                                CUSTOM_PRICE_CHECK_DONE = false;
                                CUSTOM_PRICE_CHECK_ITERATION = 0;
                            }
                            else
                            {
                                // If the regression is 10 levels deep, stop trying and let the custom price level stick, else try other price levels
                                if(CUSTOM_PRICE_CHECK_ITERATION <= 10)
                                {
                                    CUSTOM_PRICE_CHECK_ITERATION++;
                                    nlapiSetCurrentLineItemValue(stListName, 'price', CUSTOM_PRICE_CHECK_ITERATION, true,true);
                                }
                                else
                                {
                                    return;
                                }
                            }
                        }
                        else
                        {
                            if (!searchInList(arrMaintCat, stItemCat) && !searchInList(arrSupportCat, stItemCat))
                            {
                                if(!CUSTOM_PRICE_CHECK_DONE)
                                {
                                    CUSTOM_PRICE_CHECK_DONE = true;
                                    nlapiSetCurrentLineItemValue(stListName, 'price', 1, true,true);
                                }
                                else
                                {
                                    // Reset the variable since this we have no choice.
                                    CUSTOM_PRICE_CHECK_DONE = false;
                                }
                            }
                        }
                    }
                }
            }

        }

        logger.debug(MSG_TITLE, '======End======');
    }

    /* Enable/Disable Rate fields based on Price Level */
    if (stListName == 'item' && stFieldName == 'price') 
    {
        logger.debug(MSG_TITLE, '=====Start=====');
        logger.debug(MSG_TITLE, 'Function Parameters:'
                + '\nList Name:' + stListName
                + '\nFieldName:' + stFieldName
                + '\nLine Index:' + iLineIndex
                );

        /* Enable/Disable Rate Fields based on Price Level. */
        var stPriceLevel = nlapiGetCurrentLineItemValue(stListName, 'price');
        var stItemType = nlapiGetCurrentLineItemValue('item', 'itemtype');
        if (stItemType != 'Discount'
                && stItemType != 'Markup'
                && stItemType != 'Description'
                && stItemType != 'Subtotal'
                && stItemType != 'Kit'
                && stItemType != 'Payment'
                && stItemType != 'Group'
                && stItemType != 'EndGroup'
                && stItemType != null
                )
        {
            nlapiDisableLineItemField('item', 'rate', true);
            if (stPriceLevel == -1 || stPriceLevel == '')
            {
                nlapiDisableLineItemField('item', 'custcol_list_rate', false);
            }else
            {
                nlapiDisableLineItemField('item', 'custcol_list_rate', true);
            }
        }

    }
    
    /* If List Rate is changed and Price Level is custom, perform calc if Option for Custom Price is Annual Rate = T */
    if (stListName == 'item' && stFieldName == 'custcol_list_rate')
    {
        var stItemCat = nlapiGetCurrentLineItemValue(stListName, 'custcol_item_category', iLineIndex);
        var bIsAnnualRate = (nlapiGetFieldValue('custbody_custom_price_is_annual_rate') == 'T');
        var stPriceLevel = nlapiGetCurrentLineItemValue(stListName, 'price');
        var bIsTerm = searchInList(arrTermCat, stItemCat);
        var bIsMaint = searchInList(arrMaintCat, stItemCat);
        var bIsSupport = searchInList(arrSupportCat, stItemCat);
 
        if(bIsAnnualRate && stPriceLevel == -1)
        {
            var stItemType = nlapiGetCurrentLineItemValue('item', 'itemtype');
            if (stItemType != 'Discount'
                    && stItemType != 'Markup'
                    && stItemType != 'Description'
                    && stItemType != 'Subtotal'
                    && stItemType != 'Kit'
                    && stItemType != 'Payment'
                    && stItemType != 'Group'
                    && stItemType != 'EndGroup'
                    && stItemType != null
                    )
            {
                if(bIsTerm || bIsMaint || bIsSupport)
                {
                    var flCurListRate = nlapiGetCurrentLineItemValue('item','custcol_list_rate');
                    if(flCurListRate!=null && flCurListRate != '' && flCurListRate != undefined && flCurListRate != 0)
                    {
                        nlapiSetCurrentLineItemValue('item','custcol_list_rate',Math.round(flCurListRate/12*10000)/10000,false,true);
                    }
                }
            }
        }
    }
    
    /* If this is an edit of an existing Renewal and if the Bill To Customer was changed, prompt user to update tran lines. */
    if(stFieldName == 'entity')
    {
        var stTranId = nlapiGetFieldValue('id');
        var stOrderType = nlapiGetFieldValue('custbody_order_type');
        if((stOrderType == ORDER_TYPE_RENEWAL || stOrderType == ORDER_TYPE_RENEWAL_MANUAL) 
                && (stTranId != '' && stTranId != null && stTranId != undefined))
        {
            alert('Please make sure to reset each transaction line.\nYou can also do this by clicking on the \"Reset Lines\" button.');
        }
    }

}


/**
 * This function computes for the Rate based on the Revenue Recognition Start & End dates
 * for items which use the item categories in the parameter.
 *
 * NS Script Parameters (fieldname - descr)
 * custscript_rate_calc_term_item_cat - Term Categories to process.
 * custscript_rate_calc_mte_item_cat - Maintenance Categories to process.
 * custscript_rate_calc_support_item_cat - Support Categories to process.
 * custscript_rate_calc_basis_for_support - Categories to pull the rate of Support from.
 * custscript_rate_calc_basis_for_maint - Categories to pull the rate of Maintenance from.
 * custscript_rate_calc_renewals_item_cat - Renewals Categories to be skipped.
 *
 * @param (string) stType The list being validated
 * @type boolean
 * @author Michael Franz V. Sumulong
 * @version 1.1
 */
function validateLine_CalculateRate(stListName)
{
    var logger = new Logger(true);
    var MSG_TITLE = 'validateLine_CalculateRate';
    //logger.enableDebug(); //comment this line to disable debug

    logger.debug(MSG_TITLE, '=====Start=====');

    var iCurIdx = nlapiGetCurrentLineItemIndex(stListName);
    var stItemType = nlapiGetCurrentLineItemValue('item', 'itemtype', iCurIdx);
    var stPriceLevel = nlapiGetCurrentLineItemValue(stListName, 'price', iCurIdx);
    var stClassOfSale = nlapiGetFieldValue('custbody_order_type');
    var stTranType = nlapiGetFieldValue('baserecordtype');
    logger.debug(MSG_TITLE, 'Current Item Index: ' + iCurIdx
            + '\nPrice Level=' + stPriceLevel
            + '\nRecord Type: ' + stItemType
            + '\nClass of Sale: ' + stClassOfSale
            + '\nTransaction type: ' + stTranType
            );

    /* Retrieve Script Parameters */
    var arrTermCat = splitList(nlapiGetContext().getSetting('SCRIPT', 'custscript_rate_calc_term_item_cat'));
    var arrMaintCat = splitList(nlapiGetContext().getSetting('SCRIPT', 'custscript_rate_calc_mte_item_cat'));
    var arrSupportCat = splitList(nlapiGetContext().getSetting('SCRIPT', 'custscript_rate_calc_support_item_cat'));
    var arrSupportBasisCat = splitList(nlapiGetContext().getSetting('SCRIPT', 'custscript_rate_calc_basis_for_support'));
    var arrMaintBasisCat = splitList(nlapiGetContext().getSetting('SCRIPT', 'custscript_rate_calc_basis_for_maint'));
    var arrRenewalsCat = splitList(nlapiGetContext().getSetting('SCRIPT', 'custscript_rate_calc_renewals_item_cat'));

    logger.debug(MSG_TITLE, 'Script Parameters:'
            + '\nTerm: ' + arrTermCat
            + '\nMaintenance:' + arrMaintCat
            + '\nSupport:' + arrSupportCat
            + '\nBasis for Maintenance:' + arrMaintBasisCat
            + '\nBasis for Support:' + arrSupportBasisCat
            + '\nRenewals:' + arrRenewalsCat
            );

    /* Check if the item should be processed. */
    var stItemCat = nlapiGetCurrentLineItemValue(stListName, 'custcol_item_category', iCurIdx);
    var bIsTerm = searchInList(arrTermCat, stItemCat);
    var bIsPerpetual = searchInList(arrMaintBasisCat, stItemCat);
    var bIsMaint = searchInList(arrMaintCat, stItemCat);
    var bIsSupport = searchInList(arrSupportCat, stItemCat);
    var bIsRenewal = searchInList(arrRenewalsCat, stItemCat);
    var bIsRenewalSO = (stClassOfSale == ORDER_TYPE_RENEWAL);
    var bIsManualRenewalSO = (stClassOfSale == ORDER_TYPE_RENEWAL_MANUAL);
    var bIsNewSO = nlapiGetRecordId();
    if(bIsNewSO == null || bIsNewSO == undefined || bIsNewSO == ''){
        bIsNewSO = true;
    }else{
        bIsNewSO = false;
    }

    logger.debug(MSG_TITLE, 'Item Cat=' + stItemCat
            + '\n Is Term=' + bIsTerm
            + '\n Is Maintenance=' + bIsMaint
            + '\n Is Support=' + bIsSupport
            + '\n Is Renewal=' + bIsRenewal
            + '\n Is Renewal SO=' + bIsRenewalSO
            + '\n Is Manual Renewal SO=' + bIsManualRenewalSO
            + '\n Is New SO=' + bIsNewSO
            )

    /* Check if this machine is the item machine. */
    logger.debug(MSG_TITLE, "List Name=" + stListName);
    if (stListName != 'item')
    {
        logger.debug(MSG_TITLE, "======End=====");
        return true;
    }

    /* Check if the item is an Item Group. If it is, raise an alert. */
    if (stItemType == 'Group' || stItemType == 'EndGroup')
    {
        //        alert('After adding the Item Group, please make sure to go through the license terms ' +
        //              'and maintenance/support items so that the calculation script will be triggered.');
        logger.debug(MSG_TITLE, "======End=====");
        return true;
    }
    
    /* Skip Discounts and Markups */
    if (stItemType == 'Discount'
            || stItemType == 'Markup'
            || stItemType == 'Description'
            || stItemType == 'Subtotal'
            || stItemType == 'Kit'
            || stItemType == 'Payment'
            || stItemType == 'Group'
            || stItemType == 'EndGroup'
            || stItemType == null
            )
    {
        logger.debug(MSG_TITLE, 'Skipping \"other\" items.');
        logger.debug(MSG_TITLE, "======End=====");
        return true;
    }

    /* If this affects M/S Lines, then mark those M/S lines as out of synch. */
    if(!bIsMaint && !bIsSupport)
    {
        var iCurTranLineCnt = nlapiGetLineItemCount('item');
        var stProdLine = nlapiGetCurrentLineItemValue('item', 'custcol_product_line');
        
        for(var iTLIdx = 1; iTLIdx <= iCurTranLineCnt; iTLIdx++)
        {
            if(iTLIdx == iCurIdx)
            {
                continue;
            }
            
            var stCurProdLine = nlapiGetLineItemValue('item','custcol_product_line',iTLIdx);
            var stCurItemCat = nlapiGetLineItemValue('item','custcol_item_category',iTLIdx);
            var bCurIsSupport = searchInList(arrSupportCat, stCurItemCat);
            var bCurIsMaint = searchInList(arrMaintCat, stCurItemCat);
            if(stProdLine == stCurProdLine && (bCurIsSupport || bCurIsMaint))
            {
                nlapiSetLineItemValue('item','custcol_out_of_synch',iTLIdx,'T');
            }
        }
    }
   
    /* If this is a line reset, check if there is any reset data available. */
    var bResetLine = (nlapiGetCurrentLineItemValue('item','custcol_reset_renewal_data')=='T');
    if(bResetLine)
    {
        var stResetData = nlapiGetCurrentLineItemValue('item','custcol_renewal_reset_data');
        if(stResetData != null && stResetData != '' && stResetData != undefined)
        {
            var arrResetData = stResetData.split(';');
            for(i in arrResetData)
            {
                var arrValuePair = arrResetData[i].split('=');
                logger.debug(MSG_TITLE,arrValuePair[0] + '=' + arrValuePair[1]);
                nlapiSetCurrentLineItemValue('item',arrValuePair[0],arrValuePair[1],false,true);
            }
            return true;
        }
        else
        {
            if(!bSKIP_EMPTY_RESET_DATA_ALERT)
            {
                if(!confirm('Line cannot be reset because there is no reset data available.\nDo you want to continue with normal calculation?'))
                {
                    return false;
                }
            }
            else
            {
                /* 
                 * Since the reset is triggered by the CS_resetTranLines function then autocalculation 
                 * should not be performed. The function would prompt the users of the tran lines that 
                 * were not updated.
                */
                return true;
            }
        }
    }

    /* If this is a renewal transaction, disallow manual updates. */
    if (bIsRenewalSO) 
    {
        alert('This is an auto-generated renewal transaction. Editing the transaction line is not allowed.\nPlease switch the order type to "Renewal - Manual" to make manual changes.');
        return false;
    }

    /* If renewal item, make sure to prompt the user of the implications of changing the line data. */
    if (bIsRenewal && stPriceLevel != -1)
    {
        alert('Automated computation is skipped for this item.\nPlease make sure to use the "CUSTOM" Price Level and enter the extended rate value for the period defined.');
        return false;
    }
    
    /* Move the rate to the list rate */
    var stItemId = nlapiGetCurrentLineItemValue(stListName, 'item', iCurIdx);
    logger.debug(MSG_TITLE, 'Item Id=' + stItemId);
    
    if (stPriceLevel != null && stPriceLevel != undefined && stPriceLevel != '')
    {
        var flRate = null;
        var stOldPrice = nlapiGetCurrentLineItemValue('item','price');
        var stOrigListRate = nlapiGetCurrentLineItemValue('item','rate');
        logger.debug(MSG_TITLE, 'stOldPrice=' + stOldPrice +
        		'\nstOrigListRate=' + stOrigListRate);
        nlapiSetCurrentLineItemValue('item','price','-1',false,true);
        nlapiSetCurrentLineItemValue('item','price',stOldPrice,false,true);
        /* If Term In Months is needed, retrieve it */
        if (bIsSupport || bIsTerm || bIsMaint) 
        {
            /* Compute for the duration of the license in months if there is any. */
            var flTermInMonths = nlapiGetCurrentLineItemValue('item', "revrecterminmonths");
             // If term in months is set, use it. Else, compute for it!
            if (flTermInMonths == '' || flTermInMonths == null || flTermInMonths == undefined)
            {
                var dtStartDate = nlapiGetCurrentLineItemValue('item', "revrecstartdate");
                var dtEndDate = nlapiGetCurrentLineItemValue('item', "revrecenddate");
                 // Make sure that the start date is provided.
                if ((dtStartDate == '' || dtStartDate == null || dtStartDate == undefined) || (dtEndDate == '' || dtEndDate == null || dtEndDate == undefined))
                {
                    flTermInMonths = null;
                }else
                {
                    flTermInMonths = computeTermInMonths(dtStartDate, dtEndDate);
                }
            }
            logger.debug(MSG_TITLE, 'flTermInMonths =' + flTermInMonths);

        }

        var stItemPricingType = nlapiGetCurrentLineItemValue('item', 'custcol_item_pricing_type');
        /* If Custom Rate is used, List Rate is populated by user, else Extended Rate is Populated */
        if (stPriceLevel != -1)
        {
            flRate = nlapiGetCurrentLineItemValue(stListName, 'rate', iCurIdx);
            if (flTermInMonths == '' || flTermInMonths == null || flTermInMonths == undefined)
            {
                nlapiSetCurrentLineItemValue(stListName, 'custcol_list_rate', flRate, false,true);
            }else
            {
                logger.debug(MSG_TITLE, 'stItemPricingType : ' + stItemPricingType);
                if(stItemPricingType == ITEM_PRICING_ANNUAL && stPriceLevel != -1){
                    nlapiSetCurrentLineItemValue(stListName, 'custcol_list_rate', (Math.round((flRate / flTermInMonths)*10000) / 10000), false,true);
                } else {
                    nlapiSetCurrentLineItemValue(stListName, 'custcol_list_rate', (Math.round((flRate * flTermInMonths)*10000) / 10000), false,true);
                }
            }
        }
        else
        {
        	flRate = nlapiGetCurrentLineItemValue(stListName, 'custcol_list_rate', iCurIdx);
        	if (flRate == '' || flRate == null || flRate == undefined) {
	        	if (stOrigListRate != null && stOrigListRate != '' && stOrigListRate != undefined) {
	        		logger.debug(MSG_TITLE, 'stItemPricingType : ' + stItemPricingType);
	        		flRate = (stItemPricingType == ITEM_PRICING_ANNUAL && (!bIsPerpetual)) ? (Math.round((stOrigListRate / 12) * 10000) / 10000) : stOrigListRate;
	        		nlapiSetCurrentLineItemValue(stListName, 'custcol_list_rate', flRate, false,true);
	        	}
        	}
            if (flTermInMonths == '' || flTermInMonths == null || flTermInMonths == undefined)
            {
                //nlapiSetCurrentLineItemValue(stListName, 'rate', Math.round(flRate*100)/100, false,true);
                //BC: adding 3 zeros of precision
				nlapiSetCurrentLineItemValue(stListName, 'rate', Math.round(flRate*100000)/100000, false,true);
            }else
            {
                //nlapiSetCurrentLineItemValue(stListName, 'rate', (Math.round((flRate * flTermInMonths)*100) / 100), false,true);
				//BC: adding 3 zeros of precision
                nlapiSetCurrentLineItemValue(stListName, 'rate', (Math.round((flRate * flTermInMonths)*100000) / 100000), false,true);
            }
        }

    }

    /* If renewal item, make sure to prompt the user of the implications of changing the line data. */
    if (bIsRenewal)
    {
        logger.debug(MSG_TITLE,'Skipping computation because this is a renewal.');
        return true;
    }

    /* Make sure that start date is provided */
    if (bIsSupport || bIsTerm || bIsMaint)
    {
        if (stTranType == 'salesorder' || stTranType == 'invoice' || stTranType == 'creditmemo' || stTranType == 'returnauthorization')
        {
            var dtStartDate = nlapiGetCurrentLineItemValue('item', "revrecstartdate", iCurIdx);
            if (dtStartDate == '' || dtStartDate == null || dtStartDate == undefined)
            {
                alert("Please make sure that Rev. Rec. Start Date of transaction line " + iCurIdx + " is provided.");
                return false;
            }
        }
    }

    if (bIsTerm)
    {
        logger.debug(MSG_TITLE, 'Term License for Processing');
        logger.debug(MSG_TITLE, '======End======');
        return processTermLicense(stListName, iCurIdx);
    }

    if (bIsMaint && !bIsRenewalSO && (!bIsManualRenewalSO || (bIsNewSO && bIsManualRenewalSO)))
    {
        logger.debug(MSG_TITLE, 'Maintenance for Processing.');
        return processMaintenance(arrMaintBasisCat, iCurIdx);
    }

    if (bIsSupport)
    {
        logger.debug(MSG_TITLE, 'Support for Processing.');
        return processSupport(arrSupportBasisCat, iCurIdx);
    }

    logger.debug(MSG_TITLE, '======End======');
    return true;
}


/**
 * This computes for the amount of the Maintenance item line
 *
 * @param (string) stEventType The type of event triggering this function
 * @throws nlobjError No Customer definition found for subsidiary.
 * @author Michael Franz V. Sumulong
 * @version 1.0
 */
function processMaintenance(arrMaintBasisCat, iLineIndex)
{
    var logger = new Logger(true);
    var MSG_TITLE = 'processMaintenance';
    //logger.enableDebug(); //comment this line to disable debug

    /* Get Script Parameter */
    var MS_MODEL = nlapiGetContext().getSetting('SCRIPT', 'custscript_r1c_renewals_ms_model');
    logger.debug(MSG_TITLE, 'MS_MODEL =' + MS_MODEL);

    var stProdLine = nlapiGetCurrentLineItemValue('item', 'custcol_product_line', iLineIndex);
    var stPriceLevel = nlapiGetCurrentLineItemValue('item', "price", iLineIndex);
    var stItemId = nlapiGetCurrentLineItemValue('item', "item", iLineIndex);

    /* Compute for the duration of the license in months. */
    var flTermInMonths = nlapiGetCurrentLineItemValue('item', "revrecterminmonths", iLineIndex);
     // If term in months is set, use it. Else, compute for it!
    if (flTermInMonths == '' || flTermInMonths == null || flTermInMonths == undefined)
    {
        var dtStartDate = nlapiGetCurrentLineItemValue('item', "revrecstartdate", iLineIndex);
        var dtEndDate = nlapiGetCurrentLineItemValue('item', "revrecenddate", iLineIndex);
         // Make sure that the start date is provided.
        if (dtStartDate == '' || dtStartDate == null || dtStartDate == undefined)
        {
            alert("Please make sure that Rev. Rec. Term in Months of transaction line " + iLineIndex + " is provided.");
            return false;
        }
        if (dtEndDate == '' || dtEndDate == null || dtEndDate == undefined)
        {
            alert("Please make sure that Rev. Rec. Term in Months of transaction line " + iLineIndex + " is provided.");
            return false;
        }
        flTermInMonths = computeTermInMonths(dtStartDate, dtEndDate);
    }
    logger.debug(MSG_TITLE, 'flTermInMonths =' + flTermInMonths);

    /* Clear Out of Synch Field */
    nlapiSetCurrentLineItemValue('item','custcol_out_of_synch','F',false,true);
    
    /* Skip process if Price Level is set to custom */
    if (stPriceLevel == -1)
    {
        logger.debug(MSG_TITLE, 'Skipping computation because Price Level is set to custom.');
        var flCustomRate = nlapiGetCurrentLineItemValue('item', 'custcol_list_rate', iLineIndex);

        //nlapiSetCurrentLineItemValue('item', "rate", (Math.round((flCustomRate * flTermInMonths)*100) / 100), false,true);
        //BC: adding three zeros of precision
		nlapiSetCurrentLineItemValue('item', "rate", (Math.round((flCustomRate * flTermInMonths)*100000) / 100000), false,true);
        
		return true;
    }

    switch (MS_MODEL) {
	
		case MS_MODEL_PERCENTAGE:
		case MS_MODEL_PERCENTAGE_NET:
            logger.debug(MSG_TITLE,'MS_MODEL_PERCENTAGE / MS_MODEL_PERCENTAGE_NET');

		    var flPercentage = nlapiGetCurrentLineItemValue('item', 'custcol_mtce_support_percent', iLineIndex);
            if (flPercentage != null && flPercentage != undefined && flPercentage != '')
            {
                flPercentage = flPercentage.replace('%', '');
                flPercentage = parseFloat(flPercentage);
            }
            else
            {
                /* This item might below to an item group so double check the M/S % value because it doesn't load up for item groups */
                var stMSType = nlapiGetCurrentLineItemValue('item', 'custcol_mtce_support_type');
                var stMSPercent = null;
                if (stMSType != null && stMSType != undefined && stMSType != '')
                {
                    /* Retrieve M/S Types if not yet retrieved. */
                    if(MS_TYPE_DATA == null)
                    {
                        MS_TYPE_DATA = retrieveMSTypes();
                    }
                    
                    /* Find a match for the M/S Type of the item line */
                    for(var iMTDidx = 0; iMTDidx < MS_TYPE_DATA.length; iMTDidx++)
                    {
                        if(MS_TYPE_DATA[iMTDidx].id == stMSType)
                        {
                            stMSPercent = MS_TYPE_DATA[iMTDidx].percentage;
                            break;
                        }
                    }
                    logger.debug(MSG_TITLE, 'M/S Percentage is ' + stMSPercent);
                    if (stMSPercent != null && stMSPercent != undefined && stMSPercent != '')
                    {
                        logger.debug(MSG_TITLE, 'Setting M/S Percentage');
                        nlapiSetCurrentLineItemValue('item', 'custcol_mtce_support_percent', stMSPercent, false,true);
                        flPercentage = stMSPercent;
                        flPercentage = flPercentage.replace('%', '');
                        flPercentage = parseFloat(flPercentage);
                    }
                    else
                    {
                        flPercentage = 0;
                    }
                }
            }
	
	        logger.debug(MSG_TITLE, 'Product Line=' + stProdLine
	                + '\nPercentage=' + flPercentage
	                );
	
            /* Compute total amount based on M/S Model */
            switch(MS_MODEL)
            {
                case MS_MODEL_PERCENTAGE:
        	        var flTotalAmt = computeTotalAmount(arrMaintBasisCat, stProdLine);
                    break;
                case MS_MODEL_PERCENTAGE_NET:
                    var flTotalAmt = computeTotalNetAmount(arrMaintBasisCat, stProdLine);
                    break;
            }
	        var flPercentageAmt = Math.round(flTotalAmt * flPercentage) / 100;
	        logger.debug(MSG_TITLE, 'Total Amount=' + flTotalAmt
	                + '\nPercentage Amt=' + flPercentageAmt
	                );

	        var flListRate = flPercentageAmt / flTermInMonths;
	        flListRate = Math.round(flListRate*10000)/10000;
	        logger.debug(MSG_TITLE, 'List Rate=' + flListRate);
	        
	        var flTermAmt = Math.round(flListRate * flTermInMonths * 100000) / 100000;
	        logger.debug(MSG_TITLE, 'Ext. Rate=' + flTermAmt);
	        
	        nlapiSetCurrentLineItemValue('item', 'custcol_list_rate', flListRate, false,true);
	        nlapiSetCurrentLineItemValue('item', 'rate', flTermAmt, false,true);
	
			break;

		case MS_MODEL_ITEMIZED:
            logger.debug(MSG_TITLE,'MS_MODEL_ITEMIZED');

	        // removed to handle "Itemized" M/S Type which which has an empty Percentage
	        //        alert('Please make sure that there is a defined Maintenance/Support % for this item.');
	        //        return false;
	
            var flListRate = null;
            if(stPriceLevel == null){
                flListRate = getItemRate(stItemId,stPriceLevel);                
            }else{
                if (stPriceLevel != -1)
                {
                    var stOldPrice = nlapiGetCurrentLineItemValue('item','price');
                    nlapiSetCurrentLineItemValue('item','price','-1',false,true);
                    nlapiSetCurrentLineItemValue('item','price',stOldPrice,false,true);
                    var flListRate = nlapiGetCurrentLineItemValue('item', 'rate');
                }
                else
                {
                    flListRate = nlapiGetCurrentLineItemValue(stListName, 'rate');
                }
            }
            /* If Item Pricing Type is annual and not custom, convert to monthly rate. */
            var stItemPricingType = nlapiGetCurrentLineItemValue('item', 'custcol_item_pricing_type');
            if(stItemPricingType == ITEM_PRICING_ANNUAL && stPriceLevel != -1){
                flListRate = flListRate / 12;
            }
	        
			//var flTermAmt = Math.round(flListRate * flTermInMonths * 100) / 100;
			//BC: adding three zeros of precision
			var flTermAmt = Math.round(flListRate * flTermInMonths * 100000) / 100000;
	        
			logger.debug(MSG_TITLE, 'List Rate=' + flListRate);
	
	        nlapiSetCurrentLineItemValue('item', 'rate', Math.round(flTermAmt*100000)/100000, false,true);
	        nlapiSetCurrentLineItemValue('item', 'custcol_list_rate', Math.round(flListRate*100000)/100000, false,true);
		
			break;

	}

    return true;

}


/**
 * This computes for the Support Percentage Amount
 *
 * @param (string) arrSupportBasisCat The list of item categories the support item needs to base on
 * @param (string) iLineIndex The current line of the support item
 * @author Michael Franz V. Sumulong
 * @version 1.0
 */
function processSupport(arrSupportBasisCat, iLineIndex)
{
    var logger = new Logger(true);
    var MSG_TITLE = 'processSupport';
    //logger.enableDebug(); //comment this line to disable debug

    /* Get Script Parameter */
    var MS_MODEL = nlapiGetContext().getSetting('SCRIPT', 'custscript_r1c_renewals_ms_model');
    logger.debug(MSG_TITLE, 'MS_MODEL =' + MS_MODEL);

    var stProdLine = nlapiGetCurrentLineItemValue('item', 'custcol_product_line', iLineIndex);
    var stPriceLevel = nlapiGetCurrentLineItemValue('item', "price", iLineIndex);
    var stItemId = nlapiGetCurrentLineItemValue('item', "item", iLineIndex);

    /* Compute for the duration of the license in months. */
    var flTermInMonths = nlapiGetCurrentLineItemValue('item', "revrecterminmonths", iLineIndex);
     // If term in months is set, use it. Else, compute for it!
    if (flTermInMonths == '' || flTermInMonths == null || flTermInMonths == undefined)
    {
        var dtStartDate = nlapiGetCurrentLineItemValue('item', "revrecstartdate", iLineIndex);
        var dtEndDate = nlapiGetCurrentLineItemValue('item', "revrecenddate", iLineIndex);
         // Make sure that the start date is provided.
        if (dtStartDate == '' || dtStartDate == null || dtStartDate == undefined)
        {
            alert("Please make sure that Rev. Rec. Term in Months of transaction line " + iLineIndex + " is provided.");
            return false;
        }
        if (dtEndDate == '' || dtEndDate == null || dtEndDate == undefined)
        {
            alert("Please make sure that Rev. Rec. Term in Months of transaction line " + iLineIndex + " is provided.");
            return false;
        }
        flTermInMonths = computeTermInMonths(dtStartDate, dtEndDate);
    }
    logger.debug(MSG_TITLE, 'flTermInMonths =' + flTermInMonths);

    /* Clear Out of Synch Field */
    nlapiSetCurrentLineItemValue('item','custcol_out_of_synch','F',false,true);
    
    /* Skip process if Price Level is set to custom */
    if (stPriceLevel == -1)
    {
        logger.debug(MSG_TITLE, 'Skipping computation because Price Level is set to custom.;');
        var flCustomRate = nlapiGetCurrentLineItemValue('item', 'custcol_list_rate', iLineIndex);

        //nlapiSetCurrentLineItemValue('item', "rate", Math.round(flCustomRate * flTermInMonths * 100)/100, false,true);
        //BC: adding three zeros of precision
		nlapiSetCurrentLineItemValue('item', "rate", Math.round(flCustomRate * flTermInMonths * 100000)/100000, false,true);
        return true;
    }

    switch(MS_MODEL){
    
        case MS_MODEL_PERCENTAGE:
		case MS_MODEL_PERCENTAGE_NET:
            logger.debug(MSG_TITLE,'Process for MS_MODEL_PERCENTAGE / MS_MODEL_PERCENTAGE_NET');

            var flPercentage = nlapiGetCurrentLineItemValue('item', 'custcol_mtce_support_percent', iLineIndex);
            if (flPercentage != null && flPercentage != undefined && flPercentage != '')
            {
                flPercentage = flPercentage.replace('%', '');
                flPercentage = parseFloat(flPercentage);
            }
            else
            {
                /* This item might below to an item group so double check the M/S % value because it doesn't load up for item groups */
                var stMSType = nlapiGetCurrentLineItemValue('item', 'custcol_mtce_support_type');
                var stMSPercent = null;
                if (stMSType != null && stMSType != undefined && stMSType != '')
                {
                    /* Retrieve M/S Types if not yet retrieved. */
                    if(MS_TYPE_DATA == null)
                    {
                        MS_TYPE_DATA = retrieveMSTypes();
                    }
                    
                    /* Find a match for the M/S Type of the item line */
                    for(var iMTDidx = 0; iMTDidx < MS_TYPE_DATA.length; iMTDidx++)
                    {
                        if(MS_TYPE_DATA[iMTDidx].id == stMSType)
                        {
                            stMSPercent = MS_TYPE_DATA[iMTDidx].percentage;
                            break;
                        }
                    }
                    logger.debug(MSG_TITLE, 'M/S Percentage is ' + stMSPercent);
                    if (stMSPercent != null && stMSPercent != undefined && stMSPercent != '')
                    {
                        logger.debug(MSG_TITLE, 'Setting M/S Percentage');
                        nlapiSetCurrentLineItemValue('item', 'custcol_mtce_support_percent', stMSPercent, false,true);
                        flPercentage = stMSPercent;
                        flPercentage = flPercentage.replace('%', '');
                        flPercentage = parseFloat(flPercentage);
                    }
                    else
                    {
                        flPercentage = 0;
                    }
                }
            }

            logger.debug(MSG_TITLE, 'Product Line=' + stProdLine
                    + '\nPercentage=' + flPercentage
                    );

            /* Compute total amount based on M/S Model */
            switch(MS_MODEL)
            {
                case MS_MODEL_PERCENTAGE:
                    var flTotalAmt = computeTotalAmount(arrSupportBasisCat, stProdLine);
                    break;
                case MS_MODEL_PERCENTAGE_NET:
                    var flTotalAmt = computeTotalNetAmount(arrSupportBasisCat, stProdLine);
                    break;
            }
            var flPercentageAmt = Math.round(flTotalAmt * flPercentage * flTermInMonths) / 100;
            logger.debug(MSG_TITLE, 'Total Amount=' + flTotalAmt
                    + '\nPercentage Amt=' + flPercentageAmt
                    );

            var flListRate = flPercentageAmt / flTermInMonths;
	        flListRate = Math.round(flListRate*10000)/10000;
	        logger.debug(MSG_TITLE, 'List Rate=' + flListRate);
	        
	        var flTermAmt = Math.round(flListRate * flTermInMonths * 100000) / 100000;
	        logger.debug(MSG_TITLE, 'Ext. Rate=' + flTermAmt);
	        
	        nlapiSetCurrentLineItemValue('item', 'custcol_list_rate', flListRate, false,true);
	        nlapiSetCurrentLineItemValue('item', 'rate', flTermAmt, false,true);

            break;

        case MS_MODEL_ITEMIZED:
            logger.debug(MSG_TITLE,'Process for MS_MODEL_ITEMIZED');

            // removed to handle "Itemized" M/S Type which which has an empty Percentage
            //        alert('Please make sure that there is a defined Maintenance/Support % for this item.');
            //        return false;
            /* Get the Original Rate */
            var flListRate = null;
            if(stPriceLevel == null){
                flListRate = getItemRate(stItemId,stPriceLevel);                
            }else{
                if (stPriceLevel != -1)
                {
                    var stOldPrice = nlapiGetCurrentLineItemValue('item','price');
                    nlapiSetCurrentLineItemValue('item','price','-1',false,true);
                    nlapiSetCurrentLineItemValue('item','price',stOldPrice,false,true);
                    var flListRate = nlapiGetCurrentLineItemValue('item', 'rate');
                }
                else
                {
                    flListRate = nlapiGetCurrentLineItemValue(stListName, 'rate');
                }
            }
            /* If Item Pricing Type is annual and not custom, convert to monthly rate. */
            var stItemPricingType = nlapiGetCurrentLineItemValue('item', 'custcol_item_pricing_type');
            if(stItemPricingType == ITEM_PRICING_ANNUAL && stPriceLevel != -1){
                flListRate = flListRate / 12;
            }

            //var flTermAmt = Math.round(flListRate * flTermInMonths * 100) / 100;
            //BC:  adding 3 zeros of precision
			var flTermAmt = Math.round(flListRate * flTermInMonths * 100000) / 100000;
            
			logger.debug(MSG_TITLE, 'List Rate=' + flListRate);

            nlapiSetCurrentLineItemValue('item', 'custcol_list_rate', Math.round(flListRate*100000)/100000, false,true);
			
			nlapiSetCurrentLineItemValue('item', 'rate', Math.round(flTermAmt*100000)/100000, false,true);

            break;
			
    }

    return true;

}


/**
 * This is an internal function for the rate calculation script.
 * This processes the License on the tran line idx that was passed.
 *
 * @param (string) stListName The list name
 * @param (string) iLineIndex The tran line index
 * @author Michael Franz V. Sumulong
 * @version 1.0
 */
function processTermLicense(stListName, iLineIndex)
{
    var logger = new Logger(true);
    var MSG_TITLE = 'processTermLicense';
    //logger.enableDebug(); //comment this line to disable debug

    // Retrieve needed field values
    var dtStartDate = nlapiGetCurrentLineItemValue(stListName, "revrecstartdate", iLineIndex);
    var dtEndDate = nlapiGetCurrentLineItemValue(stListName, "revrecenddate", iLineIndex);
    var stPriceLevel = nlapiGetCurrentLineItemValue(stListName, "price", iLineIndex);
    var stItemId = nlapiGetCurrentLineItemValue(stListName, "item", iLineIndex);
    var stCurrency = nlapiGetFieldValue('currency');
    logger.debug(MSG_TITLE, 'Start Date=' + dtStartDate
            + '\nEnd Date=' + dtEndDate
            + '\nPrice Level=' + stPriceLevel
            + '\nCurrency=' + stCurrency
            + '\nItem ID=' + stItemId
            );

    /* Get the Original Rate */
    var flOldRate = null;
    if(stPriceLevel == null){
        flOldRate = getItemRate(stItemId,stPriceLevel);                
    }else{
        if (stPriceLevel != -1)
        {
            var stOldPrice = nlapiGetCurrentLineItemValue('item','price');
            nlapiSetCurrentLineItemValue('item','price','-1',false,true);
            nlapiSetCurrentLineItemValue('item','price',stOldPrice,false,true);
            var flOldRate = nlapiGetCurrentLineItemValue('item', 'rate');
        }
    }
    /* If Item Pricing Type is annual and not custom, convert to monthly rate. */
    var stItemPricingType = nlapiGetCurrentLineItemValue('item', 'custcol_item_pricing_type');
    if(stItemPricingType == ITEM_PRICING_ANNUAL && stPriceLevel != -1){
        flOldRate = flOldRate / 12;
    }
    logger.debug(MSG_TITLE, 'Old Rate=' + flOldRate);

    /* Compute for the duration of the license in months. */
    var flTermInMonths = nlapiGetCurrentLineItemValue(stListName, "revrecterminmonths", iLineIndex);
     // If term in months is set, use it. Else, compute for it!
    if (flTermInMonths == '' || flTermInMonths == null || flTermInMonths == undefined)
    {
        // Make sure that the start date is provided.
        if (dtStartDate == '' || dtStartDate == null || dtStartDate == undefined)
        {
            alert("Please make sure that Rev. Rec. Term in Months of transaction line " + iLineIndex + " is provided.");
            return false;
        }
        if (dtEndDate == '' || dtEndDate == null || dtEndDate == undefined)
        {
            alert("Please make sure that Rev. Rec. Term in Months of transaction line " + iLineIndex + " is provided.");
            return false;
        }
        flTermInMonths = computeTermInMonths(dtStartDate, dtEndDate);
    }
    logger.debug(MSG_TITLE, 'flTermInMonths =' + flTermInMonths);

    /* Skip process if Price Level is set to custom */
    if (stPriceLevel == -1)
    {
        logger.debug(MSG_TITLE, 'Skipping computation because Price Level is set to custom.;');
        var flCustomRate = nlapiGetCurrentLineItemValue(stListName, 'custcol_list_rate', iLineIndex);

        //nlapiSetCurrentLineItemValue(stListName, "rate", Math.round(flCustomRate * flTermInMonths *100)/100, false,true);
        //BC:  adding 3 zeros of precision
		nlapiSetCurrentLineItemValue(stListName, "rate", Math.round(flCustomRate * flTermInMonths *100000)/100000, false,true);
        
		return true;
    }

    /* Compute for new rate. */
    //var flNewRate = Math.round(flOldRate * flTermInMonths * 100) / 100;
    //BC: adding 3 zeros of precision
	var flNewRate = Math.round(flOldRate * flTermInMonths * 100000) / 100000;
    logger.debug(MSG_TITLE, 'New Rate=' + flNewRate);

    /* Set the value for the rate. */
    nlapiSetCurrentLineItemValue(stListName, "custcol_list_rate", Math.round(flNewRate / flTermInMonths * 10000)/10000, false,true);
    //nlapiSetCurrentLineItemValue(stListName, "rate", Math.round(flNewRate*100)/100, false,true);
	//BC: adding 3 zeros of precision
    nlapiSetCurrentLineItemValue(stListName, "rate", Math.round(flNewRate*100000)/100000, false,true);
    return true;
}

/**
 * This disables fields on page init.
 *
 * @author Michael Franz V. Sumulong
 * @version 1.0
 */
function pageInit_DisableLineItemFields(){
    nlapiDisableLineItemField('item', 'amount', true);
}

/**
 * This disables tran line fields on init
 *
 * @author Michael Franz V. Sumulong
 * @version 1.0
 */
function lineInit_DisableLineItemFields(stListName){
    var arrLimitCat = splitList(nlapiGetContext().getSetting('SCRIPT', 'custscript_r01_item_cat_4_custom_limits'));
    var arrMaintCat = splitList(nlapiGetContext().getSetting('SCRIPT', 'custscript_rate_calc_mte_item_cat'));
    var arrSupportCat = splitList(nlapiGetContext().getSetting('SCRIPT', 'custscript_rate_calc_support_item_cat'));
    var stItemCat = nlapiGetCurrentLineItemValue(stListName, 'custcol_item_category');
    var isCustomBlocked = (nlapiGetFieldValue('custbody_block_custom_price_level') == YES);
    var isCustomMSAllowed = (nlapiGetFieldValue('custbody_allow_custom_price_lvl_for_ms') == YES);

    if(stListName == 'item')
    {
        var stPriceLevel = nlapiGetCurrentLineItemValue(stListName, 'price');
        var stItemType = nlapiGetCurrentLineItemValue('item', 'itemtype');
        if (stItemType != 'Discount'
                && stItemType != 'Markup'
                && stItemType != 'Description'
                && stItemType != 'Subtotal'
                && stItemType != 'Kit'
                && stItemType != 'Payment'
                && stItemType != 'Group'
                && stItemType != 'EndGroup'
                && stItemType != null
                )
        {
            nlapiDisableLineItemField('item', 'rate', true);
            if (stPriceLevel == -1)
            {
                nlapiDisableLineItemField('item', 'custcol_list_rate', false);
            }else
            {
                nlapiDisableLineItemField('item', 'custcol_list_rate', true);
            }
        }
        
        /* Enable/Disable Line Reset based on renewal reset data availability */
        var stResetData = nlapiGetCurrentLineItemValue('item','custcol_renewal_reset_data');
        if (stResetData != null && stResetData != '' && stResetData != undefined) 
        {
            nlapiDisableLineItemField('item', 'custcol_reset_renewal_data', false);
        }
        else
        {
            nlapiDisableLineItemField('item', 'custcol_reset_renewal_data', true);
        }
    }
}


/**
 * This function goes through each tran line and resets the data based on the stored reset data
 */
function CS_resetTranLines()
{
    var stOldOrderType = nlapiGetFieldValue('custbody_order_type');
    if(stOldOrderType!= ORDER_TYPE_RENEWAL && stOldOrderType != ORDER_TYPE_RENEWAL_MANUAL)
    {
        alert('This can only be used on renewal transactions.');
    }
    else
    {
        bSKIP_EMPTY_RESET_DATA_ALERT = true;
        var iTranLineCnt = nlapiGetLineItemCount('item');
        var arrLinesSkipped = new Array();
        for(var x=1; x<= iTranLineCnt; x++)
        {
            nlapiSelectLineItem('item',x);
            var stResetData = nlapiGetLineItemValue('item','custcol_renewal_reset_data',x);
            if(stResetData != null && stResetData != '' && stResetData != undefined)
            {
                nlapiSetCurrentLineItemValue('item','custcol_reset_renewal_data','T',false,true);
                nlapiCommitLineItem('item');
            }
            else
            {
                arrLinesSkipped.push(x);
            }
        }
        if(arrLinesSkipped.length > 0)
        {
            nlapiSelectNewLineItem('item');
            alert('The following transaction lines were not reset because it did not contain any reset information: ' + arrLinesSkipped);
        }
        bSKIP_EMPTY_RESET_DATA_ALERT = false;
    }
}


function recalc_PopulateDisplayAmount(stType)
{
    if(stType == 'item')
    {
        var iItemLineCnt = nlapiGetLineItemCount('item');
        for(var iLineIdx = 1; iLineIdx <= iItemLineCnt; iLineIdx++)
        {
            nlapiSetLineItemValue('item','custcol_reset_renewal_data',iLineIdx,'F');

            var flAmount = nlapiGetLineItemValue('item','amount',iLineIdx);
            var bDisplayAmt = ('T' == nlapiGetLineItemValue('item','custcol_display_printed_amount', iLineIdx));
            if(bDisplayAmt)
            {
                nlapiSetLineItemValue('item','custcol_display_amount',iLineIdx,flAmount);
            }
        }
    }
}


function CS_CommitItemGroupLines()
{
    var ITEM_COMMIT_LIMIT = nlapiGetContext().getSetting('SCRIPT', 'custscript_r01c_process_group_line_limit');
    if(ITEM_COMMIT_LIMIT != null && ITEM_COMMIT_LIMIT != '' && ITEM_COMMIT_LIMIT != undefined)
    {
        ITEM_COMMIT_LIMIT = parseInt(ITEM_COMMIT_LIMIT);
    }
    else
    {
        ITEM_COMMIT_LIMIT = 5;
    }
    
    /* Check first if there are any items for processing. */
    if(CS_CountItemGroupLines() == 0)
    {
        alert('There are no Group Line Items below to process.');        
    }
    else
    {
        saveRecord_ValidateTranLines();
    }
}


/**
 * Retrieves the number of items that need processing
 * @param {Object} iStartIdx
 */
function CS_CountItemGroupLines(iStartIdx)
{
    var iCount = 0;
    var bInGroup = false;
    var bIsProjItem = false;

    if(iStartIdx == null || iStartIdx == undefined || iStartIdx == '')
    {
        iStartIdx = 1;
    }
    
    // added by ruel
    if (nlapiGetLineItemCount('item') > 0) 
    {
        bIsProjItem = (nlapiGetLineItemValue('item', FLD_IS_PROJECT_ITEM, iStartIdx) == 'T');    
    }

    for(var x=iStartIdx; x<=nlapiGetLineItemCount('item'); x++)
    {
        var stItemType = nlapiGetLineItemValue('item', 'itemtype', x);
        if (stItemType == 'Discount'
                || stItemType == 'Markup'
                || stItemType == 'Description'
                || stItemType == 'Subtotal'
                || stItemType == 'Kit'
                || stItemType == 'Payment'
                || stItemType == 'Group'
                || stItemType == 'EndGroup'
                || stItemType == null
                )
        {
            if (stItemType == 'Group')
            {
                bInGroup =true;
                continue;
            }
            if(stItemType == 'EndGroup'){
                bInGroup = false;
                continue;
            }
            continue;
        }
        
        if(bInGroup || bIsProjItem)
        {
            var flCurListRate = nlapiGetLineItemValue('item','custcol_list_rate',x);
            var bIsOutOfSynch = (nlapiGetLineItemValue('item','custcol_out_of_synch',x) == 'T');
            if (flCurListRate == null || flCurListRate == '' || flCurListRate == undefined || bIsOutOfSynch) 
            {
                iCount++;
            }
        }
    }
    return iCount;
}



function postSourcing_DisableFields(stListName, stFieldName)
{
    var DFLT_CUST_DISC_ON_TRAN_LINE = (nlapiGetContext().getSetting('SCRIPT', 'custscript_r01c_dflt_cust_disc_on_tran') == YES );
    var MS_CUST_INLINE_DISC = (nlapiGetContext().getSetting('SCRIPT', 'custscript_r01c_ms_cust_inline_disc') == YES );
    var arrMaintCat = splitList(nlapiGetContext().getSetting('SCRIPT', 'custscript_rate_calc_mte_item_cat'));
    var arrSupportCat = splitList(nlapiGetContext().getSetting('SCRIPT', 'custscript_rate_calc_support_item_cat'));

    if(stListName == 'item' && stFieldName == 'item')
    {
        var stPriceLevel = nlapiGetCurrentLineItemValue(stListName, 'price');
        var stItemType = nlapiGetCurrentLineItemValue('item', 'itemtype');
        if (stItemType != 'Discount'
                && stItemType != 'Markup'
                && stItemType != 'Description'
                && stItemType != 'Subtotal'
                && stItemType != 'Kit'
                && stItemType != 'Payment'
                && stItemType != 'Group'
                && stItemType != 'EndGroup'
                && stItemType != null
                )
        {
            nlapiDisableLineItemField('item', 'rate', true);
            if (stPriceLevel == -1 || stPriceLevel == '')
            {
                nlapiDisableLineItemField('item', 'custcol_list_rate', false);
            }else
            {
                nlapiDisableLineItemField('item', 'custcol_list_rate', true);
            }
			
			/* Customer In-line Discounting */
			// Default Customer Level discount if turned on
	        var stItemCat = nlapiGetCurrentLineItemValue('item', 'custcol_item_category');
			
			if(DFLT_CUST_DISC_ON_TRAN_LINE)
			{
				var bDfltCustDisc = true;
				var flCurDiscount = nlapiGetCurrentLineItemValue('item','custcol_inline_discount');
				
				/* Do not defualt if there is already a discount provided */
				if(flCurDiscount != null && flCurDiscount != '' && flCurDiscount != undefined)
				{
					bDfltCustDisc = false;
				}
				
				/* Do not default if this is an M/S Item and the M/S Customer Inline Discount is set to NO */
				if((searchInList(arrMaintCat, stItemCat) || searchInList(arrSupportCat, stItemCat)) && !MS_CUST_INLINE_DISC)
				{
					bDfltCustDisc = false;
				}
				
				/* Do not defualt if there is no Customer Discount set */
				var flCustDiscount = nlapiGetFieldValue('custbody_swe_customer_discount');
				if(flCustDiscount!= null && flCustDiscount != '' && flCustDiscount != undefined)
				{
					flCustDiscount = flCustDiscount.replace('%','');
					flCustDiscount = parseFloat(flCustDiscount);
					if(isNaN(flCustDiscount))
					{
						flCustDiscount = false;
					}
				}
				else
				{
					bDfltCustDisc = false;
				}
				
				/* Default the discount rate */
				if(bDfltCustDisc)
				{
					nlapiSetCurrentLineItemValue('item','custcol_inline_discount',flCustDiscount);
				}
				
			}
			/* ******************************/
        }
        
        /* Enable/Disable Line Reset based on renewal reset data availability */
        var stResetData = nlapiGetCurrentLineItemValue('item','custcol_renewal_reset_data');
        if (stResetData != null && stResetData != '' && stResetData != undefined) 
        {
            nlapiDisableLineItemField('item', 'custcol_reset_renewal_data', false);
        }
        else
        {
            nlapiDisableLineItemField('item', 'custcol_reset_renewal_data', true);
        }
    }
}
