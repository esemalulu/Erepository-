/**
 * Copyright (c) 1998-2010 NetSuite, Inc.
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
 * This script is a compilation of all the R01 CS scripts used for validation and
 * automatic field population for the lines items
 *
 * @author Adriel Tipoe (atipoe)
 * @author Carlo Abiog (mabiog)
 * @author Chris Camacho (ccamacho)
 *
 * @version 1.0
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
//Get Parameters
var isR01ACSEnabled = (SWE.Parameters.isR01ACSEnabled() == 'T');
var isR01CCSEnabled = (SWE.Parameters.isR01CCSEnabled() == 'T');
var isR01DCSEnabled = (SWE.Parameters.isR01DCSEnabled() == 'T');
var arrTermCat = splitList(ITEMCATS_FOR_TERM);
var arrMaintCat = splitList(ITEMCATS_FOR_MAINTENANCE);
var arrSupportCat = splitList(ITEMCATS_FOR_SUPPORT);
var arrPerpCat = splitList(ITEMCATS_FOR_PERPETUAL);
var MS_MODEL = SWE.Parameters.getRenewalMSModel();
var arrLimitCat = splitList(SWE.Parameters.getCustomLimits());
var DFLT_CUST_DISC_ON_TRAN_LINE = (SWE.Parameters.getTranDiscountFlag() == 'T');
var MS_CUST_INLINE_DISC = (SWE.Parameters.getInlineDiscountFlag() == 'T');
var ALLOW_DISCOUNT = (SWE.Parameters.getDiscountFlag() == 'T');
var ITEM_COMMIT_LIMIT = SWE.Parameters.getLineLimit();
var arrItemCatsToProcess = splitList(SWE.Parameters.getItemCatsForTranLineAuto());
var arrSupportBasisCat  = splitList(ITEMCATS_FOR_SUPPORT_BASIS);
var arrMaintenanceBasisCat  = splitList(ITEMCATS_FOR_MAINTENANCE_BASIS);
var arrRenewalsCat      = splitList(SWE.Parameters.getItemCategoriesForRenewal());
var isRevRecOn = SWE.Library.misc.getSWEPreference('feature', 'revenuerecognition');
var NUMBER_OF_PREFERRED_DECIMAL = 4; //Global variable used to instantiate the number of preferred decimal places
var DECIMAL_PLACES_LISTRATE = SWE.Parameters.getDecimalPlacesForListrate();
DECIMAL_PLACES_LISTRATE = SWE.Library.misc.isUndefinedNullOrEmpty(DECIMAL_PLACES_LISTRATE) || parseInt(DECIMAL_PLACES_LISTRATE) < 0 ?
        NUMBER_OF_PREFERRED_DECIMAL : parseInt(DECIMAL_PLACES_LISTRATE);
var DECIMAL_PLACES_RATE = SWE.Parameters.getDecimalPlacesForRate();
DECIMAL_PLACES_RATE = SWE.Library.misc.isUndefinedNullOrEmpty(DECIMAL_PLACES_RATE) || parseInt(DECIMAL_PLACES_RATE) < 0 ?
        NUMBER_OF_PREFERRED_DECIMAL : parseInt(DECIMAL_PLACES_RATE);
var NUMBER_OF_CONTRACT_TERM_DECIMAL = 3; //Global variable used to instantiate the number of preferred decimal places for contract item term

function pageInit_TranLines() {
    /******************** SWE_R01C_CS_RateCalculation.js - pageInit_DisableLineItemFields ********************/
    if (isR01CCSEnabled) {
        nlapiSetLineItemDisabled('item', 'amount', true);
        nlapiSetLineItemDisabled('item', 'custcol_list_rate', true);
    }

    /******************** SWE_R01D_CS_InlineDiscount.js - pageInit_enableDiscountField ********************/
    if (isR01DCSEnabled) {
        nlapiSetLineItemDisabled('item', 'custcol_inline_discount', !ALLOW_DISCOUNT);
    }
}

function fieldChanged_TranLines(stListName, stFieldName, iLineIndex) {

    //for fieldChanged event
    var arrFieldChangeHandlers = {
        'item': itemFieldChangeHandler,
        'price': priceFieldChangeHandler,
        'custcol_list_rate': listRateFieldChangeHandler,
        'custcol_swe_contract_item_term_months': contractItemTermFieldChangeHandler,
        'custcol_swe_contract_start_date': contractStartDateFieldChangeHandler,
        'custcol_swe_contract_end_date': contractEndDateFieldChangeHandler,
        'quantity': quantityFieldChangeHandler
    };

    if(!SWE.Library.misc.isUndefinedNullOrEmpty(arrFieldChangeHandlers[stFieldName])) {
        if (isR01CCSEnabled) {
            var tranLine = new TranLine(iLineIndex);
            var handler = arrFieldChangeHandlers[stFieldName];
            var result = handler(stListName, iLineIndex, tranLine);
            if(result == false) {
                return false;
            }
        }
    }

}

function insertRecord_TranLines() {
	//if(stType == 'Discount') {
    	//nlapiSelectNewLineItem(stListName);
    	//alert(tranLine.getItemType());
    	//nlapiSetLineItemValue(stListName, 'altsalesamt', nlapiGetCurrentLineItemIndex(stListName), '0.00');
    	nlapiInsertLineItem('item', 2);
    //}
}


function saveRecord_TranLines() {
    var logger = new Logger(true);

    //RMA Validation
    if (isRecordTypeRMA() && !validateRMATranLines()){
        return false;
    }

    /******************** SWE_R01C_CS_RateCalculation.js - saveRecord_ValidateTranLines ********************/
    if (isR01CCSEnabled) {
        var stTranType = nlapiGetFieldValue('type');

        if (!SWE.Library.misc.isUndefinedNullOrEmpty(ITEM_COMMIT_LIMIT)) {
            ITEM_COMMIT_LIMIT = parseInt(ITEM_COMMIT_LIMIT);
        } else {
            ITEM_COMMIT_LIMIT = 5;
        }
        var iItemsRecommitted = 0;


        // Get Tran Start & End Dates
        var arrTranDates = getTranDates();
        var stTranStartDt = arrTranDates[0];
        var stTranEndDt = arrTranDates[1];

        // Go through the tran lines
        var bIsItemGroup = false;
        var iItemGroupLineCnt = 0;
        var tranLineItemCount = 0;
        var displayRecalcMessage = false;

        for (var idx = 1; idx <= nlapiGetLineItemCount('item'); idx++) {
            var tranLine = new TranLine(idx);

            // Make sure that tran line has a list rate.
            var stItemType = tranLine.getItemType();
            if (!tranLine.isItemTypeProcessable()) {
                if (stItemType == 'Group') {
                    bIsItemGroup = true;
                    iItemGroupLineCnt = CS_CountItemGroupLines(idx, tranLine);
                }
                if (stItemType == 'EndGroup'){
                    bIsItemGroup = false;
                }
                continue;
            }

            tranLineItemCount++;

            var stItemCat = tranLine.getCategory();
            var bIsProjItem = (nlapiGetLineItemValue('item', FLD_IS_PROJECT_ITEM, idx) == 'T');

            // If there's an item group, loop through the item's and trigger the codes again.
            if (bIsItemGroup || bIsProjItem) {
                if (iItemsRecommitted >= ITEM_COMMIT_LIMIT) {
                    alert(SWE.Library.messages.displayMessage(MSGS_CONSTANTS[12], (iItemGroupLineCnt - ITEM_COMMIT_LIMIT), ITEM_COMMIT_LIMIT, ITEM_COMMIT_LIMIT));
                    return false;
                }

                var flCurListRate = tranLine.getListRate();
                if (SWE.Library.misc.isUndefinedNullOrEmpty(flCurListRate)) {
                    if (!bItemGroupMsgShown) {
                        if (iItemGroupLineCnt > ITEM_COMMIT_LIMIT) {
                            alert(SWE.Library.messages.displayMessage(MSGS_CONSTANTS[13], iItemGroupLineCnt, ITEM_COMMIT_LIMIT, ITEM_COMMIT_LIMIT));
                            bItemGroupMsgShown = true;
                        }
                    }
                    nlapiSelectLineItem('item', idx);
                    setMSValueManually(idx, tranLine);
                    nlapiCommitLineItem('item');

                    // Keep track of last recommitted item
                    iItemsRecommitted++;
                } //end if
            } else {    //this 'else' statement is so items in an item group can pass through server side validation with incomplete data.
                if(validateListRate(tranLine, idx) == false) { return false; }
                if(validateItemDatesAgainstContractDates(tranLine, stTranStartDt, stTranEndDt, idx) == false) { return false; }
                if(validateItemTermsAndDates(tranLine, idx) == false) { return false; }
            }

            //Issue 190421: Automatically recalculate Support & Maintenance Item rates
            if (MS_MODEL == MS_MODEL_PERCENTAGE || MS_MODEL == MS_MODEL_PERCENTAGE_NET) {
                var oldListRate = tranLine.getListRate();
                if (tranLine.isMaintenanceCategoryType()) {
                    nlapiSelectLineItem('item', idx);
                    //if (processSupportOrMaintenance(arrPerpCat, true) != true) {//arrMaintenanceBasisCat
                    if (processSupportOrMaintenance(arrMaintenanceBasisCat, true) != true) {
                        return false;
                    }
                    nlapiCommitLineItem('item');
                } else if (tranLine.isSupportCategoryType()) {
                    nlapiSelectLineItem('item', idx);
                    if (processSupportOrMaintenance(arrSupportBasisCat, false) != true) {
                        return false;
                    }
                    nlapiCommitLineItem('item');
                }
                if (oldListRate != tranLine.getListRate() && !displayRecalcMessage) {
                    displayRecalcMessage = true;
                }
            }
        } //end for

        //Inform the user that a Support/Maintenance Item's rates were recalculated
        if (displayRecalcMessage) {
            alert(MSGS_CONSTANTS[1]);
        }

        // Issue: 199099 SWV-CR > No need to check rev rec dates and compare to transaction start/end dates
        //Confirm if the user wants to proceed with saving even if rev rec dates don't match the transaction dates
        //if (isRevRecOn && confirmRevRecDatesNotTheSameAsContractDates(stTranStartDt, stTranEndDt) == false) {
        //    return false;
        //}

        var recordType = nlapiGetRecordType();
        if (recordType.toLowerCase() == RENEWAL_TRAN_TYPE[3].toLowerCase()) {
            var contractID = nlapiGetFieldValue('custbody_contract_name');
            if (SWE.Library.misc.validateAgainstMaxTranLines(contractID, tranLineItemCount) == false) {
                alert(MSGS_CONSTANTS[4]);
                return false;
            }
        }
    }

    return true;
}


function lineInit_TranLines(stListName) {
    /******************** SWE_R01C_CS_RateCalculation.js - lineInit_DisableLineItemFields ********************/
    if (isR01CCSEnabled && stListName == 'item') {
        var iLineNo = nlapiGetCurrentLineItemIndex(stListName);
        var tranLine = new TranLine(iLineNo);

        nlapiSetLineItemDisabled('item', 'amount', true);
        enableListRateFieldOnItemType(tranLine);

        /* Enable/Disable Line Reset based on renewal reset data availability */
        enableResetRenewalFieldOnResetData(tranLine);

        /* Enable/Disable contract fields based on Order Status and if new record is selected and if record type is invoice */
        var stOrderStatus = nlapiGetFieldValue('orderstatus');
        enableFieldOnOrderStatus(stOrderStatus, tranLine);

        //nlapiSetLineItemDisabled('item', 'quantity', nlapiGetFieldValue('custbody_order_type') == ORDER_TYPE_RENEWAL);
    }
}


function validateLine_TranLines(stListName) {
    var logger = new Logger(true);

    var tranLine = new TranLine(null);
	
    if(isRecordTypeRMA() && itemCategoryRequiresContract(tranLine.getCategory())){
        var contractID = nlapiGetFieldValue('custbody_contract_name');
        if(!(contractID != null && contractID != '' && parseInt(contractID) > 0)){
            // Issue: 199577 SWV-CR > allow for RMA that does not reference contract
            // alert(MSGS_CONSTANTS[29]);
            // return false;
            alert(MSGS_CONSTANTS[51]);
        }
    }

    if(validateRenewalSOAndPerpetualLicenses(tranLine) == false){
        alert(MSGS_CONSTANTS[38]);
        return false;
    }

    /******************** SWE_R01A_CS_DefaultStartDates.js - validateLine_defaultRevRecStartDate ********************/
    if (isR01ACSEnabled) {
    	
        if (stListName == "item") {
            var arrTranDates = getTranDates();
            var stStartDate = SWE.Library.misc.isUndefinedNullOrEmpty(arrTranDates[0]) ? nlapiDateToString(new Date()) : arrTranDates[0] ;
            var stEndDate = arrTranDates[1];

            //Dates will not be validated if record type is opportunity
            if (!isRecordTypeOpportunity()) {
                if (tranLine.isProcessableCategoryType()) {
                    if (!isRecordTypeCreditMemo()) { // credit memo has no header start and end dates
                        if(!isValidTransactionDates(stStartDate, stEndDate)) { return false; }
                    }

                    var iTermInMonths = getTermInMonths();
                    iTermInMonths = SWE.Library.misc.isUndefinedNullOrEmpty(iTermInMonths) ? 12 : iTermInMonths;

                    updateContractItemDateFields(tranLine, stStartDate, stEndDate, iTermInMonths);

                    //validate date ranges for rma
                    if( !isValidContractItemDates(tranLine, stStartDate, stEndDate) ) { return false; }

                } else if ( tranLine.isPerpetualCategoryType() || tranLine.isHardwareCategoryType() || // for Perpetual or Hardware item category
                            (tranLine.getCategory() == ITEMCAT_TYPE_OTHER) ) { // Issue 204869 : SWV-CR | Compatibility with VSOE Feature >
                                                                               // Remove auto-population logic of Term and End Date when Item Category = "Other"
                    if(!isValidTransactionDates(stStartDate, stEndDate)){ return false; }
                    updateContractItemDatesForPerpItem(tranLine, stStartDate);
                    if(!isValidContractItemDates(tranLine, stStartDate, stEndDate)){ return false; }

                }
                // Issue 204869 : SWV-CR | Compatibility with VSOE Feature > Remove auto-population logic of Term and End Date when Item Category = "Other"
                // Removed since the auto-population for the perpetual items and others will just be the same
            }
        }
    }

    /******************** SWE_R01C_CS_RateCalculation.js - validateLine_CalculateRate ********************/
    if (isR01CCSEnabled) {
    	
        var stItemType = tranLine.getItemType();
        var stPriceLevel = tranLine.getPrice();
        var stClassOfSale = nlapiGetFieldValue('custbody_order_type');
        var stTranType = nlapiGetFieldValue('baserecordtype');

        // Check if the item should be processed.
        var bIsRenewalSO = (stClassOfSale == ORDER_TYPE_RENEWAL);

        // Check if this machine is the item machine.
        if (stListName != 'item') {
            //do nothing
        } else if (stItemType == 'Group' || stItemType == 'EndGroup') {        /* Check if the item is an Item Group. */
            //do nothing
        } else if (!tranLine.isItemTypeProcessable()) { /* Skip Discounts and Markups */
            //do nothing
        } else {
            // If this is a line reset, check if there is any reset data available.
            if (tranLine.isResetLine()) {
                var stResetData = tranLine.getResetData();
                if (!SWE.Library.misc.isUndefinedNullOrEmpty(stResetData)) {
                    processResetData(stResetData);
                } else {
                    if (!bSKIP_EMPTY_RESET_DATA_ALERT) {
                        if (!confirm(MSGS_CONSTANTS[8])) {
                            return false;
                        }
                    } else {
                        /*
                         * Since the reset is triggered by the CS_resetTranLines function then autocalculation
                         * should not be performed. The function would prompt the users of the tran lines that
                         * were not updated.
                        */
                    }
                }
            } else {

                /* If this is a renewal transaction, disallow manual updates. */
                //Issue#189641
                if (bIsRenewalSO) {
                    //alert(MSGS_CONSTANTS[9]);
                    //return false;
                    nlapiSetFieldValue('custbody_manual_renewal', 'T', true);
                }

                /* If renewal item, make sure to prompt the user of the implications of changing the line data. */
                if (tranLine.isRenewal() && stPriceLevel != -1) {
                    alert(MSGS_CONSTANTS[10]);
                    return false;
                }

                /* Move the rate to the list rate */
                if (!SWE.Library.misc.isUndefinedNullOrEmpty(stPriceLevel)) {
                    var flRate = null;
                    var stOldPrice = tranLine.getPrice();
                    var stOrigListRate = tranLine.getExtendedRate();
                    var flListRate = 0;

                    tranLine.setPrice('-1', false, true);
                    tranLine.setPrice(stOldPrice,false,true);

                    /* If Term In Months is needed, retrieve it */
                    if (tranLine.isSupportCategoryType() || tranLine.isTermCategoryType() || tranLine.isMaintenanceCategoryType()) {
                        /* Compute for the duration of the license in months if there is any. */
                        var flTermInMonths = tranLine.getItemTermInMonths();
                        // If term in months is set, use it. Else, compute for it!
                        if (SWE.Library.misc.isUndefinedNullOrEmpty(flTermInMonths)) {
                            var dtStartDate = tranLine.getContractItemStartDate();
                            var dtEndDate = tranLine.getContractItemEndDate();
                             // Make sure that the start date is provided.
                            flTermInMonths = (SWE.Library.misc.isUndefinedNullOrEmpty(dtStartDate) || SWE.Library.misc.isUndefinedNullOrEmpty(dtEndDate)) ?
                                null : SWE.Library.dates.dateDiff(dtStartDate, dtEndDate);
                        }
                    }

                    var stItemPricingType = tranLine.getPricingType();
                    /* If Custom Rate is used, List Rate is populated by user, else Extended Rate is Populated */
                    if (stPriceLevel != -1) {
                        flRate = tranLine.getExtendedRate();

                        if (SWE.Library.misc.isUndefinedNullOrEmpty(flTermInMonths)) {
                            tranLine.setListRate(SWE.Library.misc.getRoundedDec(flRate, DECIMAL_PLACES_LISTRATE), false, true);
                        } else {
                            if (stItemPricingType == ITEM_PRICING_ANNUAL && stPriceLevel != -1){
                                flListRate = parseFloatOrZero(flRate / flTermInMonths);
                            } else {
                                flListRate = parseFloatOrZero(flRate * flTermInMonths);
                            }

                            tranLine.setListRate(SWE.Library.misc.getRoundedDec(flListRate, DECIMAL_PLACES_LISTRATE), false,true);
                        }
                    } else {
                        flRate = tranLine.getListRate();
                        if (SWE.Library.misc.isUndefinedNullOrEmpty(flRate)) {
                            if (!SWE.Library.misc.isUndefinedNullOrEmpty(stOrigListRate)) {
//                              flRate = (stItemPricingType == ITEM_PRICING_ANNUAL && (!tranLine.isPerpetualCategoryType())) ? (Math.round((stOrigListRate / 12) * 10000) / 10000) : stOrigListRate;
                                flRate = (stItemPricingType == ITEM_PRICING_ANNUAL && (!tranLine.isPerpetualCategoryType())) ?
                                          SWE.Library.misc.getRoundedDec(stOrigListRate / 12, DECIMAL_PLACES_LISTRATE) : stOrigListRate;
                                tranLine.setListRate(flRate, false,true);
                            }
                        }
                        //Issue 202027 - Change all round off code to 4 decimal places
                        //var extendedRateValue = SWE.Library.misc.isUndefinedNullOrEmpty(flTermInMonths) ? Math.round(flRate * 100000) / 100000 : Math.round((flRate * flTermInMonths)*100000) / 100000;
                        var extendedRateValue = SWE.Library.misc.isUndefinedNullOrEmpty(flTermInMonths) ?
                                                parseFloatOrZero(flRate) :
                                                parseFloatOrZero(flRate) * flTermInMonths;

                        tranLine.setExtendedRate(extendedRateValue, false,true); //round off in updateExtendedRate()
                    }

                }

                //validate list rates whether it's renewal or not
                /* Make sure that start date is provided */
                // Issue 199100: SWV-CR > Remove validation of rev rec dates on line validate
                //if (isRevRecOn && (tranLine.isSupportCategoryType() || tranLine.isTermCategoryType() || tranLine.isMaintenanceCategoryType())) {
                //    if (stTranType == 'salesorder' || stTranType == 'invoice' || stTranType == 'creditmemo' || stTranType == 'returnauthorization') {
                //        var dtStartDate = nlapiGetCurrentLineItemValue('item', "revrecstartdate", iLineNo);
                //        if (SWE.Library.misc.isUndefinedNullOrEmpty(dtStartDate)) {
                //            alert(SWE.Library.messages.displayMessage(MSGS_CONSTANTS[19], iLineNo));
                //            return false;
                //        }
                //    }
                //}

                //Exclude Opportunity in processing terms
                if (tranLine.isTermCategoryType()) {
                    var iLineNo = nlapiGetCurrentLineItemIndex(stListName);
                    if (processTermLicense(stListName, iLineNo) != true) {
                        return false;
                    }
                } else if (tranLine.isMaintenanceCategoryType()) {
                    //if (processSupportOrMaintenance(arrPerpCat, true) != true) {//arrMaintenanceBasisCat
                    if (processSupportOrMaintenance(arrMaintenanceBasisCat, true) != true) {//
                        return false;
                    }
                } else if (tranLine.isSupportCategoryType()) {
                    if (processSupportOrMaintenance(arrSupportBasisCat, false) != true) {
                        return false;
                    }
                }
            }
        }
    }

    /******************** SWE_R01D_CS_InlineDiscount.js - validateLine_CalculateDiscounts ********************/
    //if (isR01DCSEnabled) {
        if (stListName == 'item' && !tranLine.isResetLine() && tranLine.isItemTypeProcessable()) {
            /* Get the discount rate and update Extended rate*/
            updateExtendedRate(tranLine);
        }
    //}

    /***********************RMA Validations*********************/
    if (isRecordTypeRMA() && itemCategoryRequiresContract(tranLine.getCategory())) {
        if (!isValidRMAItem( tranLine, null )) {
            return false;
        }
    }

    /**********************GENRATE CMRR - ICIMS -PAR************************/
    var stItemType = nlapiGetCurrentLineItemValue(stListName, "itemtype");
    
    if(stItemType == "NonInvtPart")
    	updateCMRR(stListName);
	
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
function processTermLicense(stListName, iLineIndex) {
    var logger = new Logger(true);

    // Retrieve needed field values
    var dtStartDate = nlapiGetCurrentLineItemValue(stListName, "custcol_swe_contract_start_date", iLineIndex);
    var dtEndDate = nlapiGetCurrentLineItemValue(stListName, "custcol_swe_contract_end_date", iLineIndex);
    var stPriceLevel = nlapiGetCurrentLineItemValue(stListName, "price", iLineIndex);
    var stItemId = nlapiGetCurrentLineItemValue(stListName, "item", iLineIndex);
    var stCurrency = nlapiGetFieldValue('currency');

    /* Get the Original Rate */
    var flOldRate = null;
    if (stPriceLevel == null){
        flOldRate = getItemRate(stItemId,stPriceLevel);
    } else {
        if (stPriceLevel != -1) {
            var stOldPrice = nlapiGetCurrentLineItemValue('item','price');
            nlapiSetCurrentLineItemValue('item','price','-1',false,true);
            nlapiSetCurrentLineItemValue('item','price',stOldPrice,false,true);
            var flOldRate = nlapiGetCurrentLineItemValue('item', 'rate');
        }
    }
    /* If Item Pricing Type is annual and not custom, convert to monthly rate. */
    var stItemPricingType = nlapiGetCurrentLineItemValue('item', 'custcol_item_pricing_type');
    if (stItemPricingType == ITEM_PRICING_ANNUAL && stPriceLevel != -1){
        flOldRate = flOldRate / 12;
    }

    /* Compute for the duration of the license in months. */
    var flTermInMonths = nlapiGetCurrentLineItemValue(stListName, "custcol_swe_contract_item_term_months", iLineIndex);
    // If term in months is set, use it. Else, compute for it!
    if (SWE.Library.misc.isUndefinedNullOrEmpty(flTermInMonths)) {
        // Make sure that the dates are provided.
        if (SWE.Library.misc.isUndefinedNullOrEmpty(dtStartDate)
                || SWE.Library.misc.isUndefinedNullOrEmpty(dtEndDate)) {
            if (isRecordTypeOpportunity()) {
				//if not term is set, we can blank out CMRR -ICIMS -PAR
				nlapiSetCurrentLineItemValue(stListName, "altsalesamt", "", false, true);
                return true;
            } else {
                var stContractID = nlapiGetFieldValue('custbody_contract_name');
                if (isRecordTypeCreditMemo() && SWE.Library.misc.isUndefinedNullOrEmpty(stContractID)) {
                    return true;
                } else {
                    alert(SWE.Library.messages.displayMessage(MSGS_CONSTANTS[16], iLineIndex));
                    return false;
                }
            }
        }
        flTermInMonths = SWE.Library.dates.dateDiff(dtStartDate, dtEndDate);
    } else if (isRecordTypeOpportunity() && flTermInMonths <= 0) {
        if (!SWE.Library.misc.isUndefinedNullOrEmpty(dtStartDate)
                && !SWE.Library.misc.isUndefinedNullOrEmpty(dtEndDate)
                && SWE.Library.dates.compare(dtStartDate, dtEndDate) == 1) {
            alert(MSGS_CONSTANTS[7]);
            return false;
        } else {
            alert(SWE.Library.messages.displayMessage(MSGS_CONSTANTS[20], iLineIndex));
            return false;
        }
    }

	
	
    /* Skip process if Price Level is set to custom */
    if (stPriceLevel == -1) {
        var flCustomRate = nlapiGetCurrentLineItemValue(stListName, 'custcol_list_rate', iLineIndex);

        //BC:  adding 3 zeros of precision
        //Issue 202027 - Change all round off code to 4 decimal places
        //nlapiSetCurrentLineItemValue(stListName, "rate", Math.round(flCustomRate * flTermInMonths *100000)/100000, false,true);
        //nlapiSetCurrentLineItemValue(stListName, "rate", Math.round(flCustomRate * flTermInMonths *10000)/10000, false,true);
        nlapiSetCurrentLineItemValue(stListName, 'rate', parseFloatOrZero(flCustomRate * flTermInMonths), false,true); //round off in updateExtendedRate()
		
		
        return true;
    }

    // Compute for new rate.
    //var flNewRate = Math.round(flOldRate * flTermInMonths * 100) / 100;
    //BC: adding 3 zeros of precision
    //Issue 202027 - Change all round off code to 4 decimal places
    //var flNewRate = Math.round(flOldRate * flTermInMonths * 100000) / 100000;
    //var flNewRate = Math.round(flOldRate * flTermInMonths * 10000) / 10000;
    var flNewRate = parseFloatOrZero(flOldRate * flTermInMonths);
	  

    // Set the value for the rate.
    if (flTermInMonths == 0) {
        nlapiSetCurrentLineItemValue(stListName, 'custcol_list_rate', 0, false, true);
    } else {
      //nlapiSetCurrentLineItemValue(stListName, "custcol_list_rate", Math.round(flNewRate / flTermInMonths * 10000)/10000, false, true);
        nlapiSetCurrentLineItemValue(stListName, 'custcol_list_rate', SWE.Library.misc.getRoundedDec(flNewRate / flTermInMonths, DECIMAL_PLACES_LISTRATE), false,true);
    }
  //BC: adding 3 zeros of precision
  //Issue 202027 - Change all round off code to 4 decimal places
  //nlapiSetCurrentLineItemValue(stListName, "rate", Math.round(flNewRate*100000)/100000, false, true);
  //nlapiSetCurrentLineItemValue(stListName, "rate", Math.round(flNewRate*10000)/10000, false, true);
    nlapiSetCurrentLineItemValue(stListName, 'rate', parseFloatOrZero(flNewRate), false, true); //round off in updateExtendedRate()
    return true;
}

/** ICIMS PAR
 * This updates the CMRR field on each line item based on calculated amount and term
 *
 * @param (string) The type of list item to apply this too
 **/
function updateCMRR(stListName)
{
	//********FORMER METHOD**********
	var flTerm = parseFloatOrZero(nlapiGetCurrentLineItemValue(stListName, "custcol_swe_contract_item_term_months"));
	//var flRate = parseFloatOrZero(nlapiGetCurrentLineItemValue(stListName, "custcol_list_rate"));
	var flRate = parseFloatOrZero(nlapiGetCurrentLineItemValue(stListName, "rate"));
	
	var flQuantity = parseFloatOrZero(nlapiGetCurrentLineItemValue(stListName, "quantity"));
	var flDiscount = parseFloatOrZero(nlapiGetCurrentLineItemValue(stListName, "custcol_inline_discount"));
	
	
	//if any are zero,
	if( flTerm == 0 || flRate == 0 || flQuantity == 0 ){
		//set CMRR to empty
		nlapiSetCurrentLineItemValue(stListName, "altsalesamt", "", false, true);
		return;
	}
	
	//if Quantity, or Rate or Term are zero
	var flCMRR = ((flRate * flQuantity * flTerm) * ((100.0 - flDiscount) / 100.0)) / flTerm;
	
	
	//flCMRR = flRate * flQuantity / Term;
	nlapiSetCurrentLineItemValue(stListName, "altsalesamt", flCMRR, false, true); 
	
	//***********NEW METHOD************
	/*var flAmount = parseFloatOrZero(nlapiGetCurrentLineItemValue(stListName, "amount"));
	var flTerm = parseFloatOrZero(nlapiGetCurrentLineItemValue(stListName, "custcol_swe_contract_item_term_months"));
	
	//prevent divide by zero or nonsense CMRR
	if(flTerm == 0 || flAmount == 0 || flTerm < 0){
		nlapiSetCurrentLineItemValue(stListName, "altsalesamt", "", false, true);
		return;
	}

	//get CMRR
	nlapiSetCurrentLineItemValue(stListName, "altsalesamt", flAmount / flTerm, false, true);*/
}

/**
 * This computes for the amount of the Support/Maintenance item line
 *
 * @param (array) arrBasisCat The list of item categories the support/maintenance item needs to base on
 * @param (boolean) isMaintenance
 * @author Michael Franz V. Sumulong / Adriel Tipoe
 * @version 1.1
 */
function processSupportOrMaintenance(arrBasisCat, isMaintenance) {
    var logger = new Logger(true);

    var stProdLine = nlapiGetCurrentLineItemValue('item', 'custcol_product_line');
    var stPriceLevel = nlapiGetCurrentLineItemValue('item', 'price');
    var stItemId = nlapiGetCurrentLineItemValue('item', 'item');
    var flTermInMonths = nlapiGetCurrentLineItemValue('item', 'custcol_swe_contract_item_term_months');

    // Skip process if Price Level is set to custom
    if (stPriceLevel != -1) {
        // Compute for the List Rate
        switch (MS_MODEL) {
            case MS_MODEL_PERCENTAGE:

            case MS_MODEL_PERCENTAGE_NET:
                var flPercentage = nlapiGetCurrentLineItemValue('item', 'custcol_mtce_support_percent');
                if (!SWE.Library.misc.isUndefinedNullOrEmpty(flPercentage)) {
                    flPercentage = flPercentage.replace('%', '');
                    flPercentage = parseFloat(flPercentage);
                } else {
                    // This item might belong to an item group so double check the M/S % value because it doesn't load up for item groups
                    var stMSType = nlapiGetCurrentLineItemValue('item', 'custcol_mtce_support_type');
                    var stMSPercent = null;
                    if (!SWE.Library.misc.isUndefinedNullOrEmpty(stMSType)) {
                        // Retrieve M/S Types if not yet retrieved.
                        if (MS_TYPE_DATA == null) {
                            MS_TYPE_DATA = retrieveMSTypes();
                        }

                        // Find a match for the M/S Type of the item line
                        for (var iMTDidx = 0; iMTDidx < MS_TYPE_DATA.length; iMTDidx++) {
                            if (MS_TYPE_DATA[iMTDidx].id == stMSType) {
                                stMSPercent = MS_TYPE_DATA[iMTDidx].percentage;
                                break;
                            }
                        }
                        if (!SWE.Library.misc.isUndefinedNullOrEmpty(stMSPercent)) {
                            nlapiSetCurrentLineItemValue('item', 'custcol_mtce_support_percent', stMSPercent, false, true);
                            flPercentage = stMSPercent;
                            flPercentage = flPercentage.replace('%', '');
                            flPercentage = parseFloat(flPercentage);
                        } else {
                            flPercentage = 0;
                        }
                    }
                }

                // Compute total amount based on M/S Model
                switch (MS_MODEL) {
                    case MS_MODEL_PERCENTAGE:
                        var flTotalAmt = computeTotalAmount(arrBasisCat, stProdLine);
                        break;
                    case MS_MODEL_PERCENTAGE_NET:
                        var flTotalAmt = computeTotalNetAmount(arrBasisCat, stProdLine);
                        break;
                }

                //var flListRate = Math.round(flTotalAmt * flPercentage) / 100;
                var flListRate = (flTotalAmt * flPercentage) / 100;
                if (isMaintenance) flListRate = flListRate / 12;
                //flListRate = Math.round(flListRate * 10000) / 10000;
                flListRate = SWE.Library.misc.getRoundedDec(flListRate, DECIMAL_PLACES_LISTRATE);
                nlapiSetCurrentLineItemValue('item', 'custcol_list_rate', flListRate, false, true);

                break;

            case MS_MODEL_ITEMIZED:
                // Get the Original Rate
                var flListRate = null;
                if (stPriceLevel == null) {
                    flListRate = getItemRate(stItemId, stPriceLevel);
                } else {
                    var stOldPrice = nlapiGetCurrentLineItemValue('item', 'price');
                    nlapiSetCurrentLineItemValue('item', 'price', '-1', false, true);
                    nlapiSetCurrentLineItemValue('item', 'price', stOldPrice, false, true);
                    var flListRate = nlapiGetCurrentLineItemValue('item', 'rate');
                }
                // If Item Pricing Type is annual and not custom, convert to monthly rate.
                var stItemPricingType = nlapiGetCurrentLineItemValue('item', 'custcol_item_pricing_type');

                if (stItemPricingType == ITEM_PRICING_ANNUAL/* && stPriceLevel != -1*/) {
//                  var cmptdTermAmt = Math.round(((flListRate * flTermInMonths) / 12) * 10000) / 10000;
                    var cmptdTermAmt = parseFloatOrZero(flListRate * flTermInMonths / 12); //round off in updateExtendedRate()
                    flListRate = flListRate / 12;
                }

                //Issue 202027 - Change all round off code to 4 decimal places
                //nlapiSetCurrentLineItemValue('item', 'custcol_list_rate', Math.round(flListRate * 100000) / 100000, false, true);
//              nlapiSetCurrentLineItemValue('item', 'custcol_list_rate', Math.round(flListRate * 10000) / 10000, false, true);
                nlapiSetCurrentLineItemValue('item', 'custcol_list_rate', SWE.Library.misc.getRoundedDec(flListRate, DECIMAL_PLACES_LISTRATE), false, true);
                break;
        }

        if (!isRecordTypeOpportunity()) {
            //Term, startdate, enddate should have been validated/populated by this point
        } else {
            if (SWE.Library.misc.isUndefinedNullOrEmpty(flTermInMonths)) {
                flTermInMonths = 1;
            }
        }
    } else {
        if (SWE.Library.misc.isUndefinedNullOrEmpty(flTermInMonths)) {
            flTermInMonths = 1;
        }
    }

    // Compute for the Rate
    flListRate = nlapiGetCurrentLineItemValue('item', 'custcol_list_rate');
    //Issue 202027 - Change all round off code to 4 decimal places
    //var flTermAmt = Math.round(flListRate * flTermInMonths * 100000) / 100000;
    //var flTermAmt = Math.round(flListRate * flTermInMonths * 10000) / 10000;
    var flTermAmt = parseFloatOrZero(flListRate * flTermInMonths); //round off in updateExtendedRate()
    nlapiSetCurrentLineItemValue('item', 'rate', flTermAmt, false, true);

    if(cmptdTermAmt){
        nlapiSetCurrentLineItemValue('item', 'rate', cmptdTermAmt, false, true);
    }

    return true;
}

/**
 * This function goes through each tran line and resets the data based on the stored reset data
 */
function CS_resetTranLines() {
    var stOldOrderType = nlapiGetFieldValue('custbody_order_type');
    if (stOldOrderType!= ORDER_TYPE_RENEWAL && stOldOrderType != ORDER_TYPE_RENEWAL_MANUAL) {
        alert(MSGS_CONSTANTS[23]);
    } else {
        bSKIP_EMPTY_RESET_DATA_ALERT = true;
        var iTranLineCnt = nlapiGetLineItemCount('item');
        var arrLinesSkipped = new Array();
        for (var x=1; x<= iTranLineCnt; x++) {
            nlapiSelectLineItem('item',x);
            var stResetData = nlapiGetLineItemValue('item','custcol_renewal_reset_data',x);
            if (!SWE.Library.misc.isUndefinedNullOrEmpty(stResetData)) {
                nlapiSetCurrentLineItemValue('item','custcol_reset_renewal_data','T',false,true);
                nlapiCommitLineItem('item');
            } else {
                arrLinesSkipped.push(x);
            }
        }
        if (arrLinesSkipped.length > 0) {
            nlapiSelectNewLineItem('item');
            alert(SWE.Library.messages.displayMessage(MSGS_CONSTANTS[21], arrLinesSkipped));
        }
        bSKIP_EMPTY_RESET_DATA_ALERT = false;
    }
}

function recalc_TranLines(stType, stAction) {
	
	/******************** SWE_R01C_CS_RateCalculation.js - recalc_PopulateDisplayAmount ********************/
    if (isR01CCSEnabled) {
        if (stType == 'item') {
            var iItemLineCnt = nlapiGetLineItemCount('item');
            for (var iLineIdx = 1; iLineIdx <= iItemLineCnt; iLineIdx++) {
                nlapiSetLineItemValue('item', 'custcol_reset_renewal_data', iLineIdx, 'F');
            }
        }
    }
}

/**
 * Retrieves the number of items that need processing
 * @param {Object} iStartIdx
 */
function CS_CountItemGroupLines(iStartIdx, tranLine) {
    var iCount = 0;
    var bInGroup = false;
    var bIsProjItem = false;

    if (SWE.Library.misc.isUndefinedNullOrEmpty(iStartIdx)) {
        iStartIdx = 1;
    }

    // added by ruel
    if (nlapiGetLineItemCount('item') > 0) {
        bIsProjItem = (nlapiGetLineItemValue('item', FLD_IS_PROJECT_ITEM, iStartIdx) == 'T');
    }

    for (var x=iStartIdx; x<=nlapiGetLineItemCount('item'); x++) {
        var stItemType = nlapiGetLineItemValue('item', 'itemtype', x);
        if (!tranLine.isItemTypeProcessable()) {
            if (stItemType == 'Group') {
                bInGroup =true;
                continue;
            }
            if (stItemType == 'EndGroup'){
                bInGroup = false;
                continue;
            }
            continue;
        }

        if (bInGroup || bIsProjItem) {
            var flCurListRate = nlapiGetLineItemValue('item','custcol_list_rate',x);
            if (SWE.Library.misc.isUndefinedNullOrEmpty(flCurListRate)) {
                iCount++;
            }
        }
    }
    return iCount;
}

function postSourcing_TranLines(stListName, stFieldName){
	/******************** SWE_R01C_CS_RateCalculation.js - postSourcing_DisableFields ********************/
    if (isR01CCSEnabled) {
        var logger = new Logger(true);

        if (stListName == 'item' && stFieldName == 'item') {
            var stPriceLevel = nlapiGetCurrentLineItemValue(stListName, 'price');
            var stItemType = nlapiGetCurrentLineItemValue('item', 'itemtype');

            if (stItemType != 'Discount' &&
                    stItemType != 'Markup' &&
                    stItemType != 'Description' &&
                    stItemType != 'Subtotal' &&
                    stItemType != 'Payment' &&
                    stItemType != 'Group' &&
                    stItemType != 'EndGroup' &&
                    stItemType != null &&
                    stItemType != '') {
                nlapiSetLineItemDisabled('item', 'rate', true);
                if (stPriceLevel == -1 || stPriceLevel == '') {
                    nlapiSetLineItemDisabled('item', 'custcol_list_rate', false);
                }
                else {
                    nlapiSetLineItemDisabled('item', 'custcol_list_rate', true);
                }

                // Customer In-line Discounting
                // Default Customer Level discount if turned on
                var stItemCat = nlapiGetCurrentLineItemValue('item', 'custcol_item_category');

                // Do not default if this is an M/S Item and the M/S Customer Inline Discount is set to NO
                if ((searchInList(arrMaintCat, stItemCat) || searchInList(arrSupportCat, stItemCat)) && MS_CUST_INLINE_DISC) {
                    applyDefaultCustomerDiscount();
                }
                else {
                    if (!(searchInList(arrMaintCat, stItemCat) || searchInList(arrSupportCat, stItemCat)) && DFLT_CUST_DISC_ON_TRAN_LINE) {
                        applyDefaultCustomerDiscount();
                    }
                }

                if (isRecordTypeRMA()) {
                    var stContractId = nlapiGetFieldValue('custbody_contract_name');
                    if (!SWE.Library.misc.isUndefinedNullOrEmpty(stContractId)) {
                        var tranLine = new TranLine(null);
                        var flDiscountRate = getContractItemDiscount(stContractId, tranLine, 'custrecord_ci_original_discount', 'min');
                        if (flDiscountRate.indexOf("%") != -1) {
                            nlapiSetCurrentLineItemValue('item', 'custcol_inline_discount', flDiscountRate, false);
                        }
                    }
                }
            }

            // Enable/Disable Line Reset based on renewal reset data availability
            var stResetData = nlapiGetCurrentLineItemValue('item', 'custcol_renewal_reset_data');
            if (!SWE.Library.misc.isUndefinedNullOrEmpty(stResetData)) {
                nlapiSetLineItemDisabled('item', 'custcol_reset_renewal_data', false);
            }
            else {
                nlapiSetLineItemDisabled('item', 'custcol_reset_renewal_data', true);
            }

            // Disable contract and rev. rec. end dates for Perpetual line items.
            var stItemCat = nlapiGetCurrentLineItemValue('item', 'custcol_item_category');
            if (searchInList(arrPerpCat, stItemCat)) {
                nlapiSetCurrentLineItemValue('item', 'custcol_swe_contract_item_term_months', '', false);
                nlapiSetLineItemDisabled('item', 'custcol_swe_contract_item_term_months', true);
                nlapiSetCurrentLineItemValue('item', 'custcol_swe_contract_end_date', '', false);
                nlapiSetLineItemDisabled('item', 'custcol_swe_contract_end_date', true);
            }
            else {
                nlapiSetLineItemDisabled('item', 'custcol_swe_contract_item_term_months', false);
                nlapiSetLineItemDisabled('item', 'custcol_swe_contract_end_date', false);
            }

            if (nlapiGetCurrentLineItemValue('item', 'item') == '') {
                if (!isRecordTypeOpportunity()) { //Quick fix for Issue 215719
                    clearLineItemFields();
                }
            }
        }
    }
	
	/**************iCIMS PAR*****************/
	var stItemType = nlapiGetCurrentLineItemValue(stListName, "itemtype");
    
    if(stItemType == "NonInvtPart"){
		//pull the contract term field
		var term = nlapiGetFieldValue('custbody_tran_term_in_months');
		
		//set on current line item
		nlapiSetCurrentLineItemValue('item', 'custcol_swe_contract_item_term_months', term, false);
	}
}

function clearLineItemFields() {
    nlapiSetCurrentLineItemValue('item', 'description', '', false);
    nlapiSetCurrentLineItemValue('item', 'price', '', false);
    nlapiSetCurrentLineItemValue('item', 'custcol_list_rate', '', false);
    nlapiSetCurrentLineItemValue('item', 'custcol_inline_discount', '', false);
    nlapiSetCurrentLineItemValue('item', 'quantity', '', false);
    nlapiSetCurrentLineItemValue('item', 'custcol_mtce_support_percent', '', false);
    nlapiSetCurrentLineItemValue('item', 'custcol_renewal_reset_data', '', false);
    nlapiSetCurrentLineItemValue('item', 'custcol_reset_renewal_data', '', false);
    nlapiSetCurrentLineItemValue('item', 'custcol_swe_contract_item_term_months', '', false);
    nlapiSetCurrentLineItemValue('item', 'custcol_swe_contract_start_date', '', false);
    nlapiSetCurrentLineItemValue('item', 'custcol_swe_contract_end_date', '', false);
    nlapiSetCurrentLineItemValue('item', 'revrecterminmonths', '', false);
    nlapiSetCurrentLineItemValue('item', 'revrecstartdate', '', false);
    nlapiSetCurrentLineItemValue('item', 'revrecenddate', '', false);
    nlapiSetCurrentLineItemValue('item', 'isclosed', '', false);
}

function applyDefaultCustomerDiscount(){
    var bDfltCustDisc = true;
    var flCurDiscount = nlapiGetCurrentLineItemValue('item', 'custcol_inline_discount');

    /* Do not defualt if there is already a discount provided */
    if (!SWE.Library.misc.isUndefinedNullOrEmpty(flCurDiscount)) {
        //bDfltCustDisc = false;
        return;
    }

    /* Do not defualt if there is no Customer Discount set */
    var flCustDiscount = nlapiGetFieldValue('custbody_swe_customer_discount');
    if (!SWE.Library.misc.isUndefinedNullOrEmpty(flCustDiscount)) {
        flCustDiscount = flCustDiscount.replace('%', '');
        flCustDiscount = parseFloat(flCustDiscount);

        if (isNaN(flCustDiscount)) {
            return;
        }
    }
    else {
        return;
    }

    /* Default the discount rate */
    if (bDfltCustDisc) {
        nlapiSetCurrentLineItemValue('item', 'custcol_inline_discount', flCustDiscount);
    }
}

/**
 * Gets the term in months based on record type.
 * @return int The term in months
 * @author Carlo Abiog (mabiog)
 */
function getTermInMonths(){
    var term;
    if(isRecordTypeRefund()){
        term = SWE.Library.dates.dateDiff(nlapiGetFieldValue('custbody_swe_contract_start_date'), nlapiGetFieldValue('custbody_swe_contract_end_date'));
    }
    else{
        term = nlapiGetFieldValue('custbody_tran_term_in_months');
    }

    return term;
}

function isValidTransactionDates(stStartDate, stEndDate)
{
    var iResult = SWE.Library.dates.compare(stStartDate, stEndDate); //make sure it is not greater than transaction end date.
    if (iResult == 1) {
        alert(SWE.Library.messages.getErrorMessage('1'));
        return false;
    }
    return true;
}

/**
 * Updates contract item-related-date fields
 * @return void
 * @author Chris Camacho (ccamacho)
 */
function updateContractItemDateFields(tranLine, start, end, term){
    var iTermContractItem = tranLine.getItemTermInMonths();
    var stContractStartDate = tranLine.getContractItemStartDate();
    var stContractEndDate = tranLine.getContractItemEndDate();
    var stContractID = nlapiGetFieldValue('custbody_contract_name');

    if (isRecordTypeCreditMemo()) {
        if (SWE.Library.misc.isUndefinedNullOrEmpty(stContractID)) {
            return;
        } else {
            start = nlapiGetFieldValue('custbody_swe_contract_start_date');
            end = nlapiGetFieldValue('custbody_swe_contract_end_date');
        }
    }

    if (SWE.Library.misc.isUndefinedNullOrEmpty(iTermContractItem)) {
        iTermContractItem = SWE.Library.dates.dateDiff(SWE.Library.misc.isUndefinedNullOrEmpty(stContractStartDate) ? start : stContractStartDate,
                SWE.Library.misc.isUndefinedNullOrEmpty(stContractEndDate) ? end : stContractEndDate);
        //iTermContractItem = Math.round(iTermContractItem * 1000) / 1000;
        iTermContractItem = SWE.Library.misc.getRoundedDec(iTermContractItem, NUMBER_OF_CONTRACT_TERM_DECIMAL);
        tranLine.setItemTermInMonths(iTermContractItem, false);
    }

    if (SWE.Library.misc.isUndefinedNullOrEmpty(stContractStartDate)) {
        if (SWE.Library.misc.isUndefinedNullOrEmpty(stContractEndDate)) {
            tranLine.setContractItemStartDate(start);
        } else {
            var dtNewDate = SWE.Library.dates.addMonths2(tranLine.getItemTermInMonths() * -1, nlapiStringToDate(tranLine.getContractItemEndDate()));
            tranLine.setContractItemStartDate(nlapiDateToString(dtNewDate), false);
        }
    }

    if (SWE.Library.misc.isUndefinedNullOrEmpty(stContractEndDate)) {
        var dtNewDate = SWE.Library.dates.addMonths2(tranLine.getItemTermInMonths(), nlapiStringToDate(tranLine.getContractItemStartDate()));
        tranLine.setContractItemEndDate(nlapiDateToString(dtNewDate), false);
    }
}

/**
 * Checks if line item's dates are valid (contract dates)
 * @return boolean, true if success
 * @author Chris Camacho (ccamacho)
 */
function isValidContractItemDates(tranLine, startDate, endDate){
    stContractStartDate = tranLine.getContractItemStartDate();
    stContractEndDate = tranLine.getContractItemEndDate();
    var stContractID = nlapiGetFieldValue('custbody_contract_name');

    if (isRecordTypeCreditMemo()) {
        if (!SWE.Library.misc.isUndefinedNullOrEmpty(stContractID)) {
            startDate = nlapiGetFieldValue('custbody_swe_contract_start_date');
            endDate = nlapiGetFieldValue('custbody_swe_contract_end_date');
        } else {
            startDate = null;
            endDate = null;
        }
    }

    /* Check if line item contract start date is in range with the header's contract start and end date */
    if ( (!SWE.Library.misc.isUndefinedNullOrEmpty(stContractStartDate))
        && (!SWE.Library.misc.isUndefinedNullOrEmpty(startDate)) ) {
        if (SWE.Library.dates.inRange(stContractStartDate, startDate, endDate) != true) {
            if (SWE.Library.dates.compare(stContractStartDate, startDate) == -1) {
                alert( isRecordTypeCreditMemo() ? MSGS_CONSTANTS[47] : MSGS_CONSTANTS[2]);
            } else {
                alert( isRecordTypeCreditMemo() ? MSGS_CONSTANTS[48] : MSGS_CONSTANTS[3]);
            }
            return false;
        }
    }
    /* Check if line item contract end date is in range with the header's contract start and end date */
    if (!SWE.Library.misc.isUndefinedNullOrEmpty(stContractEndDate)
        && !SWE.Library.misc.isUndefinedNullOrEmpty(endDate)) {
        if (SWE.Library.dates.inRange(stContractEndDate, startDate, endDate) != true) {
            if (SWE.Library.dates.compare(stContractEndDate, startDate) == -1) {
                alert( isRecordTypeCreditMemo() ? MSGS_CONSTANTS[49] : MSGS_CONSTANTS[5]);
            } else {
                alert( isRecordTypeCreditMemo() ? MSGS_CONSTANTS[50] : MSGS_CONSTANTS[6]);
            }
            return false;
        }
    }
    /* Check if contract item start date is not later than contract item end date */
    if (!SWE.Library.misc.isUndefinedNullOrEmpty(stContractStartDate) && !SWE.Library.misc.isUndefinedNullOrEmpty(stContractEndDate)) {
        if (SWE.Library.dates.compare(stContractStartDate, stContractEndDate) == 1) {
            alert(MSGS_CONSTANTS[7]);
            return false;
        }
    }

    return true;
}

function updateContractItemDatesForPerpItem(tranLine, stStartDate)
{
    var stContractStartDate = tranLine.getContractItemStartDate();
    var stContractID = nlapiGetFieldValue('custbody_contract_name');

    if (isRecordTypeCreditMemo()) {
        if (SWE.Library.misc.isUndefinedNullOrEmpty(stContractID)) {
            return;
        } else {
            stStartDate = nlapiGetFieldValue('custbody_swe_contract_start_date');
        }
    }

    if(SWE.Library.misc.isUndefinedNullOrEmpty(stContractStartDate)){
        tranLine.setContractItemStartDate(stStartDate);
    }
    tranLine.setContractItemEndDate('', false);
    nlapiSetLineItemDisabled('item', 'custcol_swe_contract_end_date', true);
    tranLine.setItemTermInMonths('', false);
}

/**
 * Apply discount and round off to specified number of decimal places
 */
function updateExtendedRate(tranLine) {
    var flExtendedRate = tranLine.getExtendedRate();
    if (!SWE.Library.misc.isUndefinedNullOrEmpty(flExtendedRate) && flExtendedRate != 0) {
        flExtendedRate = parseFloat(flExtendedRate);

        if (isR01DCSEnabled && ALLOW_DISCOUNT) { //Apply discount
            var discountRate = tranLine.getDiscountRate();
            if (!SWE.Library.misc.isUndefinedNullOrEmpty(discountRate)) {
                discountRate = discountRate.replace('%','');
                discountRate = parseFloat(discountRate);
                discountRate = discountRate / 100;

                if (discountRate != 0) {
                    // Apply the discount rate to the extended rate
                    flExtendedRate = flExtendedRate * (1 - discountRate);
                }
            }
        }

        //Round off to specified number of decimal places
        flExtendedRate = SWE.Library.misc.getRoundedDec(flExtendedRate, DECIMAL_PLACES_RATE);
        tranLine.setExtendedRate(flExtendedRate, false, true);
    }
}

function processResetData(stResetData) {
    var arrResetData = stResetData.split(';');
    for (var i = 0; i < arrResetData.length; i++) {
        var arrValuePair = arrResetData[i].split('=');
        nlapiSetCurrentLineItemValue('item', arrValuePair[0], arrValuePair[1], false, true);
    }
}

function itemFieldChangeHandler(stListName, iLineIndex, tranLine) {
    if (stListName != 'item') { return; }
    if (nlapiGetCurrentLineItemValue('item', 'item') != '') { //Fix for Issue 215719
        updateRateAndPrice(tranLine);
    }
}

function quantityFieldChangeHandler(stListName, iLineIndex, tranLine){
}

function priceFieldChangeHandler(stListName, iLineIndex, tranLine)
{
    if(stListName != 'item') { return; }

    updateRateAndPrice(tranLine);

    /* Enable/Disable Rate Fields based on Price Level. */
    var stPriceLevel = tranLine.getPrice();
    var stItemType = tranLine.getItemType();
    if (tranLine.isItemTypeProcessable()) {
        nlapiSetLineItemDisabled('item', 'rate', true);
        if (tranLine.getPrice() == -1 || tranLine.getPrice() == '') {
            nlapiSetLineItemDisabled('item', 'custcol_list_rate', false);
        } else {
            nlapiSetLineItemDisabled('item', 'custcol_list_rate', true);
        }
    }
}

function listRateFieldChangeHandler(stListName, iLineIndex, tranLine)
{
    if(stListName != 'item') { return; }

    var bIsAnnualRate = (nlapiGetFieldValue('custbody_custom_price_is_annual_rate') == 'T');

    var flCurListRate = tranLine.getListRate();
    if (flCurListRate.indexOf(".") != -1 ) {
        /*var iDecIndex = flCurListRate.indexOf("."); //truncates (not rounds) to 4 decimal places!
        iDecIndex = flCurListRate.length - (iDecIndex + 1);
        flCurListRate = flCurListRate.substring( 0, (flCurListRate.indexOf(".") + 1 + (iDecIndex > 3 ? 4 : 3) ));*/
        flCurListRate = SWE.Library.misc.getRoundedDec(flCurListRate, DECIMAL_PLACES_LISTRATE);
        tranLine.setListRate(flCurListRate, false , false);
    }

    if (bIsAnnualRate && tranLine.getPrice() == -1) {
        if (tranLine.isItemTypeProcessable()) {
            if (tranLine.isTermCategoryType() || tranLine.isMaintenanceCategoryType() || tranLine.isSupportCategoryType()) {
                var flCurListRate = tranLine.getListRate();
                if (!SWE.Library.misc.isUndefinedNullOrEmpty(flCurListRate) && flCurListRate != 0) {
                    //tranLine.setListRate(Math.round(flCurListRate/12*10000)/10000, false, true);
                    tranLine.setListRate(SWE.Library.misc.getRoundedDec(flCurListRate/12, DECIMAL_PLACES_LISTRATE), false, true);
                }
            }
        }
    }
}


function contractItemTermFieldChangeHandler(stListName, iLineIndex, tranLine)
{
    var iTerm = tranLine.getItemTermInMonths();
    //make sure the term is a valid number
    if(SWE.Library.misc.isUndefinedNullOrEmpty(iTerm) && !SWE.Library.misc.isNumeric(iTerm)) { return false; }

    if (iTerm.indexOf(".") != -1 ) {
        var iDecIndex = iTerm.indexOf(".");
        iDecIndex = iTerm.length - (iDecIndex + 1);
        iTerm = iTerm.substring( 0, (iTerm.indexOf(".") + 1 + (iDecIndex > 2 ? 3 : 2) ));
        tranLine.setItemTermInMonths(iTerm, false);
    }

    var stContractStartDate = tranLine.getContractItemStartDate();

    if (!SWE.Library.misc.isUndefinedNullOrEmpty(stContractStartDate)) {
        var dtNewDate = SWE.Library.dates.addMonths2(iTerm, nlapiStringToDate(stContractStartDate));
        tranLine.setContractItemEndDate(nlapiDateToString(dtNewDate), false);

        var newTerm = SWE.Library.dates.dateDiff(stContractStartDate, dtNewDate);
        //newTerm = Math.round(newTerm * 1000) / 1000;
        newTerm = SWE.Library.misc.getRoundedDec(newTerm, NUMBER_OF_CONTRACT_TERM_DECIMAL);

        tranLine.setItemTermInMonths(newTerm, false);
        // Issue 199100: SWV-CR > Remove validation of rev rec dates on line validate
        //if (isRevRecOn) {
        //    tranLine.setRevRecEndDate(nlapiDateToString(dtNewDate), false);
        //}
    } else {
        if (!SWE.Library.misc.isUndefinedNullOrEmpty(tranLine.getContractItemEndDate())) {
            var dtNewDate = SWE.Library.dates.addMonths2(tranLine.getItemTermInMonths() * -1, nlapiStringToDate(tranLine.getContractItemEndDate()));
            tranLine.setContractItemStartDate(nlapiDateToString(dtNewDate), false);

            var newTerm = SWE.Library.dates.dateDiff(dtNewDate, tranLine.getContractItemEndDate());
            //newTerm = Math.round(newTerm * 1000) / 1000;
            newTerm = SWE.Library.misc.getRoundedDec(newTerm, NUMBER_OF_CONTRACT_TERM_DECIMAL);

            tranLine.setItemTermInMonths(newTerm, false);
            // Issue 199100: SWV-CR > Remove validation of rev rec dates on line validate
            //if (isRevRecOn) {
            //    tranLine.setRevRecStartDate(nlapiDateToString(dtNewDate), false);
            //}
        }
    }
}

function contractStartDateFieldChangeHandler(stListName, iLineIndex, tranLine)
{
//    var stContractStartDate = nlapiGetCurrentLineItemValue('item','custcol_swe_contract_start_date');
    var stContractStartDate = tranLine.getContractItemStartDate();
    // Issue 199100: SWV-CR > Remove validation of rev rec dates on line validate
    //if (isRevRecOn) {
    //     tranLine.setRevRecStartDate( stContractStartDate , false );
    //}

    //Update Contract Item End Date
    if (tranLine.getCategory() != ITEMCAT_TYPE_LICENSE_PERP && tranLine.getCategory() != ITEMCAT_TYPE_HARDWARE) {
        var iTerm = tranLine.getItemTermInMonths();
        if (!SWE.Library.misc.isUndefinedNullOrEmpty(iTerm) && !SWE.Library.misc.isUndefinedNullOrEmpty(stContractStartDate)) {
            var dtNewDate = SWE.Library.dates.addMonths2(iTerm, nlapiStringToDate(stContractStartDate));
            tranLine.setContractItemEndDate(nlapiDateToString(dtNewDate), false);

            var newTerm = SWE.Library.dates.dateDiff(stContractStartDate, dtNewDate);
            //newTerm = Math.round(newTerm * 1000) / 1000;
            newTerm = SWE.Library.misc.getRoundedDec(newTerm, NUMBER_OF_CONTRACT_TERM_DECIMAL);

            tranLine.setItemTermInMonths(newTerm, false);

            // Issue 199100: SWV-CR > Remove validation of rev rec dates on line validate
            //if (isRevRecOn) {
            //
            //    tranLine.setRevRecEndDate(nlapiDateToString(dtNewDate), false);
            //}
        }
    }
}

function contractEndDateFieldChangeHandler(stListName, iLineIndex, tranLine)
{
    var stContractEndDate = tranLine.getContractItemEndDate();

    // Issue 199100: SWV-CR > Remove validation of rev rec dates on line validate
    //if (isRevRecOn) {
    //    tranLine.setRevRecEndDate(stContractEndDate, false);
    //}

    /* update contract term in months */
    if (tranLine.getCategory() != ITEMCAT_TYPE_LICENSE_PERP) {
        var stContractStartDate = nlapiGetCurrentLineItemValue('item','custcol_swe_contract_start_date');
        if (!SWE.Library.misc.isUndefinedNullOrEmpty(stContractStartDate)) {
            if (!SWE.Library.misc.isUndefinedNullOrEmpty(stContractEndDate)) {
                var iTerm = SWE.Library.dates.dateDiff(stContractStartDate, stContractEndDate);
                //iTerm = Math.round(iTerm * 1000)/1000;
                iTerm = SWE.Library.misc.getRoundedDec(iTerm, NUMBER_OF_CONTRACT_TERM_DECIMAL);

                tranLine.setItemTermInMonths(iTerm, false);
                // Issue 199100: SWV-CR > Remove validation of rev rec dates on line validate
                //if (isRevRecOn) {
                //    tranLine.setRevRecTermInMonths(iTerm, false);
                //}
            }
        } else {
            if (!SWE.Library.misc.isUndefinedNullOrEmpty(stContractEndDate) && !SWE.Library.misc.isUndefinedNullOrEmpty(tranLine.getItemTermInMonths())) {
                var dtNewDate = SWE.Library.dates.addMonths2(tranLine.getItemTermInMonths() * -1, nlapiStringToDate(tranLine.getContractItemEndDate()));
                tranLine.setContractItemStartDate(nlapiDateToString(dtNewDate), false);

                var newTerm = SWE.Library.dates.dateDiff(dtNewDate, tranLine.getContractItemEndDate());
                //newTerm = Math.round(newTerm * 1000) / 1000;
                newTerm = SWE.Library.misc.getRoundedDec(newTerm, NUMBER_OF_CONTRACT_TERM_DECIMAL);

                tranLine.setItemTermInMonths(newTerm, false);

                // Issue 199100: SWV-CR > Remove validation of rev rec dates on line validate
                //if (isRevRecOn) {
                //    tranLine.setRevRecStartDate(nlapiDateToString(dtNewDate), false);
                //}
            }
        }
    }
}

function updateRateAndPrice(tranLine)
{
    /* Clear the List Rate */
    //tranLine.setListRate('', false, true);
    nlapiSetCurrentLineItemValue('item', 'custcol_list_rate', '', false, true);

    /* Reset the List Price field. */
    var stPriceLevel = tranLine.getPrice();

    //exit if price level does not meet our criteria
    if(SWE.Library.misc.isUndefinedNullOrEmpty(stPriceLevel)) { return; }
    if(stPriceLevel != -1) { return; }

    var isCustomBlocked = (nlapiGetFieldValue('custbody_block_custom_price_level') == YES);
    var isCustomMSAllowed = (nlapiGetFieldValue('custbody_allow_custom_price_lvl_for_ms') == YES);

    // Check if the item category needs to be limited
    if (tranLine.isCustomLimitableCategoryType()) {
        if (isCustomBlocked) {
            if (!isCustomMSAllowed) {
                if (!CUSTOM_PRICE_CHECK_DONE) {
                    // Mark the variables for the regression loop
                    CUSTOM_PRICE_CHECK_DONE = true;
                    // Issue 203019
                    //CUSTOM_PRICE_CHECK_ITERATION++;
                    tranLine.setPrice(1, true, true);

                    // Reset the variable since the regression is finished
                    CUSTOM_PRICE_CHECK_DONE = false;
                    CUSTOM_PRICE_CHECK_ITERATION = 0;
                } else {
                    // Issue 203019
                    // If the regression is 10 levels deep or you've reached the Custom price already,
                    // stop trying and let the custom price level stick, else try other price levels
                    if ((CUSTOM_PRICE_CHECK_ITERATION <= 10) && (tranLine.getPrice() != -1)) {
                        CUSTOM_PRICE_CHECK_ITERATION++;
                        tranLine.setPrice(CUSTOM_PRICE_CHECK_ITERATION, true, true);
                    } else {
                        return;
                    }
                }
            }
            else {
                if (!tranLine.isMaintenanceCategoryType() && !tranLine.isSupportCategoryType()) {
                    if (tranLine.getPrice() == "-1"){//(!CUSTOM_PRICE_CHECK_DONE) {
                        CUSTOM_PRICE_CHECK_DONE = true;
                        tranLine.setPrice(1, true, true);
                    } else {
                        // Reset the variable since this we have no choice.
                        CUSTOM_PRICE_CHECK_DONE = false;
                        tranLine.setPrice(-1, true, true);
                    }
                }
            }
        }
    }
}

function enableFieldOnOrderStatus(stOrderStatus, tranLine)
{   /* Enable/Disable contract fields based on Order Status and if new record is selected and if record type is invoice */
    var dtContractStartDate = tranLine.getContractItemStartDate();

    if ((isRecordTypeInvoice() || ((isRecordTypeSalesOrder())&&(stOrderStatus == SO_STATUS_PENDING_FULFILLMENT || stOrderStatus == SO_STATUS_BILLED))) && dtContractStartDate != '')  {
        nlapiSetLineItemDisabled('item', 'custcol_swe_contract_item_term_months', true);
        nlapiSetLineItemDisabled('item', 'custcol_swe_contract_start_date', true);
        nlapiSetLineItemDisabled('item', 'custcol_swe_contract_end_date', true);
    } else {
        nlapiSetLineItemDisabled('item', 'custcol_swe_contract_item_term_months', false);
        nlapiSetLineItemDisabled('item', 'custcol_swe_contract_start_date', false);
        nlapiSetLineItemDisabled('item', 'custcol_swe_contract_end_date', false);
    }

    //Disable fields for Perpetual item types
    if (tranLine.isPerpetualCategoryType()) {
        tranLine.setItemTermInMonths('', false);
        nlapiSetLineItemDisabled('item', 'custcol_swe_contract_item_term_months', true);
        tranLine.setContractItemEndDate('', false);
        nlapiSetLineItemDisabled('item', 'custcol_swe_contract_end_date', true);
    }
}

function enableResetRenewalFieldOnResetData(tranLine)
{   /* Enable/Disable Line Reset based on renewal reset data availability */
    var stResetData = tranLine.getResetData();
    if (!SWE.Library.misc.isUndefinedNullOrEmpty(stResetData)) {
        nlapiSetLineItemDisabled('item', 'custcol_reset_renewal_data', false);
    } else {
        nlapiSetLineItemDisabled('item', 'custcol_reset_renewal_data', true);
    }
}

function enableListRateFieldOnItemType(tranLine)
{
    if (tranLine.isItemTypeProcessable()) {
        nlapiSetLineItemDisabled('item', 'rate', true);
        if (tranLine.getPrice() == -1) {
            nlapiSetLineItemDisabled('item', 'custcol_list_rate', false);
        } else {
            nlapiSetLineItemDisabled('item', 'custcol_list_rate', true);
        }
    }
}

function getContractItemDiscount( stContractId, tranLine, stFieldName, stGroup ){
    try {
    var stItemId = tranLine.getItemId();
    var stParameters = '&ContractID=' + stContractId + '&ItemId=' + stItemId
            + '&FieldName=' +  stFieldName
            + '&Group=' +  stGroup
            + '&Type=getContractItemField';

    var rmaUrlPrefix = SWE.Library.misc.getHiddenFieldValue( 'rmaUrlPrefix' );
    rmaUrlPrefix = ( SWE.Library.misc.isUndefinedNullOrEmpty( rmaUrlPrefix ) ? '' : rmaUrlPrefix );
    nlapiLogExecution('DEBUG', 'getContractItemDiscount', 'RMA URL Prefix: ' + rmaUrlPrefix);

    var var_url_servlet = nlapiResolveURL('SUITELET', 'customscript_swe_optimize_suitelet', 'customdeploy_swe_optimize_suitelet');
    var requesturl = rmaUrlPrefix + var_url_servlet + stParameters;

    //ajax call details
    var a = new Array();
    a['User-Agent-x'] = 'SuiteScript-Call';
    var response = nlapiRequestURL( requesturl, null, a, null );
    var stResult = response.getBody();

    return stResult;
    } catch(ex) {
        nlapiLogExecution('DEBUG', 'getContractItemDiscount - error occured', 'Field Name: ' + stFieldName
            + ' | Link Prefix: ' + rmaUrlPrefix );
        if (ex.getDetails != undefined) {
            nlapiLogExecution('ERROR', ex.getCode() + ' - getContractItemDiscount', ex.getDetails());
        } else {
            nlapiLogExecution('ERROR', 'UNEXPECTED ERROR' + ' - getContractItemDiscount', ex.toString());
        }
    }
}

function isValidRMAItem(tranLine, lineNo){
    try {
        /***********************RMA Validations*********************/
        var contractID = nlapiGetFieldValue('custbody_contract_name');
        var stExceptionId = nlapiGetRecordId();
        var flListRate = tranLine.getListRate();
        var stItemId = tranLine.getItemId();
        var iQuantity = tranLine.getQuantity();
        var CHECK_RATE = ( ((tranLine.isSupportCategoryType() || tranLine.isMaintenanceCategoryType())
                && (MS_MODEL == MS_MODEL_PERCENTAGE || MS_MODEL == MS_MODEL_PERCENTAGE_NET)) ? 'F' : 'T' );
        var iOtherQuantity = 0;

        var itemTerms = tranLine.getItemTermInMonths();

        if (lineNo == null){
            var bRenewalsExclusion = (tranLine.getRenewalsExclusion() == 'T');
             var iOtherQuantity = computeItemQuantity( stItemId, nlapiGetCurrentLineItemIndex('item'), flListRate, bRenewalsExclusion); // Get Quantity of item in other line items
        } else {
            var bRenewalsExclusion = ( nlapiGetLineItemValue('item', 'custcol_renewals_exclusion', lineNo) == 'T');
            var iOtherQuantity = computeItemQuantity( stItemId, lineNo, flListRate, bRenewalsExclusion); // Get Quantity of item in other line items
        }
        var stParameters = '&ContractID=' + contractID + '&ItemId=' + stItemId +
                '&Quantity=' +  iQuantity + '&ListRate=' +  flListRate
                + '&ExceptionId=' +  stExceptionId
                + '&CheckRate=' +  CHECK_RATE
                + '&Terms=' + itemTerms
                + '&Type=verifyRMAItem'

        var stOthParameter = '&RenewalsExclusion=' + bRenewalsExclusion
                             + '&OtherQuantity=' +  parseInt(iOtherQuantity);

        var rmaUrlPrefix = SWE.Library.misc.getHiddenFieldValue( 'rmaUrlPrefix' );
        rmaUrlPrefix = ( SWE.Library.misc.isUndefinedNullOrEmpty( rmaUrlPrefix ) ? '' : rmaUrlPrefix );
        nlapiLogExecution('DEBUG', 'getContractItemDiscount', 'RMA URL Prefix: ' + rmaUrlPrefix);
        var var_url_servlet = nlapiResolveURL('SUITELET', 'customscript_swe_optimize_suitelet', 'customdeploy_swe_optimize_suitelet');
        var requesturl = rmaUrlPrefix + var_url_servlet + stParameters + stOthParameter;

        //ajax call details
        var a = new Array();
        a['User-Agent-x'] = 'SuiteScript-Call';
        var response = nlapiRequestURL(requesturl, null, a, null);
        var stResult = response.getBody();

        if(!isValidRMAItemError(stResult, lineNo, bRenewalsExclusion)) return false;

        //additional checking for total quantity in RMA for non-renewal exclusion items
        if (!bRenewalsExclusion) {
            if (lineNo == null){
                iOtherQuantity = computeItemQuantity( stItemId, nlapiGetCurrentLineItemIndex('item'), flListRate, true); // Get Quantity of item in other line items
            } else {
                iOtherQuantity = computeItemQuantity( stItemId, lineNo, flListRate, true); // Get Quantity of item in other line items
            }
            stOthParameter = '&RenewalsExclusion=true'
                             + '&OtherQuantity=' +  parseInt(iOtherQuantity);

            requesturl = rmaUrlPrefix + var_url_servlet + stParameters + stOthParameter;
            response = nlapiRequestURL(requesturl, null, a, null);
            stResult = response.getBody();

            if(!isValidRMAItemError(stResult, lineNo, bRenewalsExclusion)) return false;
        }

        return true;
    } catch(ex) {
        nlapiLogExecution('DEBUG', 'isValidRMAItem - error occured', 'Field Name: ' + ''//stFieldName
            + ' | Link Prefix: ' + rmaUrlPrefix );
        if (ex.getDetails != undefined) {
            nlapiLogExecution('ERROR', ex.getCode() + ' - isValidRMAItem', ex.getDetails());
        } else {
            nlapiLogExecution('ERROR', 'UNEXPECTED ERROR' + ' - isValidRMAItem', ex.toString());
        }
        return false;
    }
}

function isValidRMAItemError(stResult, lineNo, bRenewalsExclusion){
    if (stResult == 'F') {  //item is not present
        alert(lineNo != null ? SWE.Library.messages.displayMessage(MSGS_CONSTANTS[35], lineNo) : MSGS_CONSTANTS[31]);
        return false;
    }
    if ( (stResult == 'R') && (bRenewalsExclusion == false) ) {  //Do not validate rate of rma item if not included for renewal
        alert(lineNo != null ? SWE.Library.messages.displayMessage(MSGS_CONSTANTS[36], lineNo) : MSGS_CONSTANTS[32]);
        return false;
    }
    if (stResult == 'Q') {  //quantity error
        alert(lineNo != null ? SWE.Library.messages.displayMessage(MSGS_CONSTANTS[37], lineNo) : MSGS_CONSTANTS[33]);
        return false;
    }
    if(stResult == 'M'){ //terms error
        alert(lineNo != null ? SWE.Library.messages.displayMessage(MSGS_CONSTANTS[45], lineNo) : MSGS_CONSTANTS[46]);
        return false;
    }
    return true;
}
function validateRMATranLines() {
    for (var idx = 1; idx <= nlapiGetLineItemCount('item'); idx++) {
        var tranLine = new TranLine(idx);
        var stItemCat = tranLine.getCategory();
        if (itemCategoryRequiresContract(stItemCat)) {
            var stContractID = nlapiGetFieldValue('custbody_contract_name');
            if (SWE.Library.misc.isUndefinedNullOrEmpty(stContractID)) {
                // Issue: 199577 SWV-CR > allow for RMA that does not reference contract
                // alert(SWE.Library.messages.displayMessage(MSGS_CONSTANTS[34], idx));
                // return false;
            }

            if (!isValidRMAItem(tranLine, idx)) {
                return false;
            }
        }
    }
    return true;
}

//Confirm if the user wants to proceed with saving even if rev rec dates don't match the transaction dates
function confirmRevRecDatesNotTheSameAsContractDates(stTranStartDt, stTranEndDt){
    for (var idx = 1; idx <= nlapiGetLineItemCount('item'); idx++) {
        var tranLine = new TranLine(idx);
        var stItemCat = tranLine.getCategory();

        if (tranLine.isTermCategoryType() || tranLine.isMaintenanceCategoryType() || tranLine.isSupportCategoryType()) {
            var stTranType = nlapiGetFieldValue('type');
            if (stTranType != 'opprtnty' && stTranType != 'estimate') {
                if (!SWE.Library.misc.isUndefinedNullOrEmpty(stTranStartDt)) {
                    var stStartDt = tranLine.getRevRecStartDate();
                    if (stTranStartDt != stStartDt){
                        if (confirm(MSGS_CONSTANTS[22])) {
                            break; //Exit loop and continue to next validation
                        } else {
                            return false;
                        }
                    }
                }
                if (!SWE.Library.misc.isUndefinedNullOrEmpty(stTranEndDt)) {
                    var stEndDt = tranLine.getRevRecEndDate();
                    if (stTranEndDt != stEndDt){
                        if (confirm(MSGS_CONSTANTS[22])) {
                            break; //Exit loop and continue to next validation
                        } else {
                            return false;
                        }
                    }
                }
            }
        } //end if
    } //end for
    return true;
}

function setMSValueManually(idx, tranLine){
    // Since the M/S percent value doesn't get source through on item groups, get it manually
    if (tranLine.isMaintenanceCategoryType() || tranLine.isSupportCategoryType()) {
        var stMSPercent = nlapiGetLineItemValue('item', 'custcol_mtce_support_percent', idx);
        var stMSType = nlapiGetLineItemValue('item', 'custcol_mtce_support_type', idx);
        if (SWE.Library.misc.isUndefinedNullOrEmpty(stMSPercent)) {
            if (!SWE.Library.misc.isUndefinedNullOrEmpty(stMSType)) {
                // Retrieve M/S Types if not yet retrieved.
                if (MS_TYPE_DATA == null) {
                    MS_TYPE_DATA = retrieveMSTypes();
                }

                // Find a match for the M/S Type of the item line
                for (var iMTDidx = 0; iMTDidx < MS_TYPE_DATA.length; iMTDidx++) {
                    if (MS_TYPE_DATA[iMTDidx].id == stMSType) {
                        stMSPercent = MS_TYPE_DATA[iMTDidx].percentage;
                        break;
                    }
                }
                if (!SWE.Library.misc.isUndefinedNullOrEmpty(stMSPercent)) {
                    nlapiSetLineItemValue('item', 'custcol_mtce_support_percent', idx, stMSPercent);
                }
            }
        }
    }
}

function validateListRate(tranLine, idx) {
    var flListRate = tranLine.getListRate();
    if (SWE.Library.misc.isUndefinedNullOrEmpty(flListRate)) {
        alert(SWE.Library.messages.displayMessage(MSGS_CONSTANTS[14], idx));
        return false;
    }
    return true;
}

function validateItemDatesAgainstContractDates(tranLine, stTranStartDt, stTranEndDt, idx){
    if (!isRecordTypeOpportunity()) {
        /* Validate Sales Order contract start date against tran line's start date */
        var stContractStartDt = tranLine.getContractItemStartDate();
        var iResult = SWE.Library.dates.compare(stTranStartDt, stContractStartDt);
        if (iResult == 1) {
            alert(SWE.Library.messages.displayMessage(MSGS_CONSTANTS[15], idx));
            return false;
        }

        /* Validate Sales Order contract end date against tran line's end date */
        var stContractEndDt = tranLine.getContractItemEndDate();
        var iResult = SWE.Library.dates.compare(stTranEndDt, stContractEndDt);
        if (iResult == -1) {
            alert(SWE.Library.messages.displayMessage(MSGS_CONSTANTS[24], idx));
            return false;
        }
    }
    return true;
}

function validateItemTermsAndDates(tranLine, idx){
    if (tranLine.isTermCategoryType() || tranLine.isMaintenanceCategoryType() || tranLine.isSupportCategoryType()) {
        var iTermInMonths = tranLine.getItemTermInMonths();
        var stStartDt = tranLine.getContractItemStartDate();
        var stEndDt = tranLine.getContractItemEndDate();

        if (!isRecordTypeOpportunity() && SWE.Library.misc.isUndefinedNullOrEmpty(iTermInMonths)) {
            var stContractID = nlapiGetFieldValue('custbody_contract_name');
            if (isRecordTypeCreditMemo() && SWE.Library.misc.isUndefinedNullOrEmpty(stContractID)) {
                return true;
            } else {
                alert(SWE.Library.messages.displayMessage(MSGS_CONSTANTS[16], idx));
                return false;
            }
        }
        var stTranType = nlapiGetFieldValue('type');
        if (stTranType != 'opprtnty' && stTranType != 'estimate'){
            if (SWE.Library.misc.isUndefinedNullOrEmpty(stStartDt)) {
                alert(SWE.Library.messages.displayMessage(MSGS_CONSTANTS[17], idx));
                return false;
            }
            if (SWE.Library.misc.isUndefinedNullOrEmpty(stEndDt)) {
                alert(SWE.Library.messages.displayMessage(MSGS_CONSTANTS[18], idx));
                return false;
            }
        }
    }
    return true;
}

/*
 * validates a renewal sales order and is a perpetual item
 */
function validateRenewalSOAndPerpetualLicenses(tranLine){
    if(nlapiGetFieldValue('custbody_order_type') == ORDER_TYPE_RENEWAL &&
            tranLine.isPerpetualCategoryType() &&
            ((MS_MODEL == MS_MODEL_PERCENTAGE_NET) ||
            (MS_MODEL == MS_MODEL_PERCENTAGE))){
        //loop through and check if there's a maintenance item
        for(var i=1 ; i<=nlapiGetLineItemCount('item') ; i++){
            var stCurItemCat = nlapiGetLineItemValue('item', 'custcol_item_category', i);
            if(searchInList(arrMaintCat, stCurItemCat)){
                return false;
            }
        }
    }
    return true;
}