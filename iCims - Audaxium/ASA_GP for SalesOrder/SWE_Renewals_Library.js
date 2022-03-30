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

/* CONSTANTS */

// Segment Sourcing Methods
var SEGMENT_SOURCED_BY_SALESREP = '1';
var SEGMENT_SOURCED_BY_ORDERTYPE = '2';
var SEGMENT_SOURCED_BY_PRODLINE = '3';
var SEGMENT_SOURCED_BY_NONE = '4';

// Renewal Assign To Type
var ASSIGN_TO_TYPE_CUST_SALES_REP = '1';
var ASSIGN_TO_TYPE_EMPLOYEE = '2';

// Bill to tier types
var BILL_TO_TIER_END_USER = '1';
var BILL_TO_TIER_RESELLER = '2';
var BILL_TO_TIER_DISTRIBUTOR = '3';

// Order Types
var ORDER_TYPE_NEW = '1';
var ORDER_TYPE_RENEWAL = '2';
var ORDER_TYPE_UPSELL = '3';
var ORDER_TYPE_RENEWAL_MANUAL = '6';
var ORDER_TYPE_DOWNSELL = '13';

// Price Levels
var PRICE_LEVEL_BASE = 1;

// Suitescript Status
var SS_STATUS_ERROR = '1';
var SS_STATUS_INCOMPLETE = '2';
var SS_STATUS_COMPLETE = '3';

// Synch Status
var SYNCH_STATUS_FUTURE = '1';
var SYNCH_STATUS_ACTIVE = '2';
var SYNCH_STATUS_EXPIRED = '3';
var SYNCH_STATUS_CREDITED = '4';

// Pricing Models
var PRICING_MODEL_CURRENT_LIST = "1";
var PRICING_MODEL_HISTORIC_LIST = "2";
var PRICING_MODEL_HISTORIC_NET = "3";
var PRICING_MODEL_CURRENT_LIST_CONTRACT = "4";

// Contract Types
var CONTRACT_TYPE_TRAN_RENEWAL = "1";
var CONTRACT_TYPE_AUTO_RENEWAL = "2";
var CONTRACT_TYPE_EVERGREEN = "3";
var CONTRACT_TYPE_NON_RENEWING = "4";

// Contract Status
var CONTRACT_STATUS_NEW = '1';
var CONTRACT_STATUS_RENEWED = '2';

// Check Log Status
var CHECK_LOG_STATUS_PENDING = "2";
var CHECK_LOG_STATUS_PROCESSED = "1";
var CHECK_LOG_STATUS_ERROR = "3";

// Renewal Transaction Output Type
var RENEWAL_TRAN_TYPE = new Array();
RENEWAL_TRAN_TYPE[1] = 'opportunity';
RENEWAL_TRAN_TYPE[2] = 'estimate';
RENEWAL_TRAN_TYPE[3] = 'salesorder';
RENEWAL_TRAN_TYPE[4] = 'invoice';
RENEWAL_TRAN_TYPE[5] = 'returnauthorization';
RENEWAL_TRAN_TYPE[6] = 'creditmemo';

// Yes/No
var YES = '1';
var NO = '2';

// M/S Models
var MS_MODEL_PERCENTAGE = '1';
var MS_MODEL_ITEMIZED = '2';
var MS_MODEL_PERCENTAGE_NET = '8';

// Item Pricing Types
var ITEM_PRICING_MONTHLY = '1';
var ITEM_PRICING_ANNUAL = '2';

// Renewal Tran Form Sources
var RENEWAL_TRAN_FORM_SOURCE_CLASS = '1';
var RENEWAL_TRAN_FORM_SOURCE_LOCATION = '2';
var RENEWAL_TRAN_FORM_SOURCE_DEPARTMENT = '3';
var RENEWAL_TRAN_FORM_SOURCE_SUBSIDIARY = '4';
var RENEWAL_TRAN_FORM_SOURCE_CHANNEL = '5';

// Renewal Tran Form Mapping Fields
var RENEWAL_TRAN_FORM_MAP_FIELDS = [];
RENEWAL_TRAN_FORM_MAP_FIELDS[RENEWAL_TRAN_FORM_SOURCE_CLASS]     = 'custrecord_renewal_tran_form_class';
RENEWAL_TRAN_FORM_MAP_FIELDS[RENEWAL_TRAN_FORM_SOURCE_LOCATION]  = 'custrecord_renewal_tran_form_location';
RENEWAL_TRAN_FORM_MAP_FIELDS[RENEWAL_TRAN_FORM_SOURCE_DEPARTMENT]= 'custrecord_renewal_tran_form_department';
RENEWAL_TRAN_FORM_MAP_FIELDS[RENEWAL_TRAN_FORM_SOURCE_SUBSIDIARY]= 'custrecord_renewal_tran_form_subsidiary';
RENEWAL_TRAN_FORM_MAP_FIELDS[RENEWAL_TRAN_FORM_SOURCE_CHANNEL]   = 'custrecord_renewal_tran_form_channel';

// Mapping Direction
var MAP_ORIG_TRAN_TO_IB = '1';
var MAP_IB_TO_RENEWAL_TRAN_MAP = '2';
var MAP_ORIG_TRAN_TO_IB_TO_RENEWAL_MAP = '3';

// Transaction Field Type
var TRAN_BODY_FIELD = '1';
var TRAN_LINE_FIELD = '2';

// Field ID for Project Item flag
var FLD_IS_PROJECT_ITEM = 'fromjob';

// Item Category Type
var ITEMCAT_TYPE_LICENSE_PERP = "1";
var ITEMCAT_TYPE_LICENSE_TERM = "2";
var ITEMCAT_TYPE_MAINT_NEW = "3";
var ITEMCAT_TYPE_MAINT_RENEWAL = "4";
var ITEMCAT_TYPE_SUPPORT_NEW = "5";
var ITEMCAT_TYPE_SUPPORT_RENEWAL = "6";
var ITEMCAT_TYPE_SERVICES = "7";
var ITEMCAT_TYPE_TRAINING = "8";
var ITEMCAT_TYPE_OTHER = "9";
var ITEMCAT_TYPE_PARENT_ITEM = "10";
var ITEMCAT_TYPE_HARDWARE = "11";
var ITEMCAT_TYPE_SERVICES_PERP = "12";

//Item Categories Lists
var ITEMCATS_FOR_PERPETUAL = "1,12";
var ITEMCATS_FOR_TERM = "2";
var ITEMCATS_FOR_MAINTENANCE = "3,4";
var ITEMCATS_FOR_SUPPORT = "5,6";
var ITEMCATS_FOR_LICENSE = "1,2";
var ITEMCATS_FOR_MAINTENANCE_BASIS = "1,11";
var ITEMCATS_FOR_SUPPORT_BASIS = "2";
var ITEMCATS_FOR_RENEWAL = "2,3,4,5,6";
var ITEMCATS_FOR_REVREC_CHK = "2,3,4,5,6";

// Product Quantity Types
var PRODUCT_QTY_TYPES = "5";

// Sales Order Status
var SO_STATUS_PENDING_FULFILLMENT = "B";
var SO_STATUS_BILLED = "G";

// Script IDs
var INSTALLBASE_SCRIPT_ID = "customscript_swe_create_contract_items";
var RENEWALS_SCRIPT_ID = "customscript_swe_create_renewals";

// Transaction Status
var TRAN_STATUS_SO_PENDING_APPROVAL = 'SalesOrd:A';
var TRAN_STATUS_SO_PENDING_FULFILLMENT = 'SalesOrd:B';
var TRAN_STATUS_SO_BILLED = 'SalesOrd:G';
var TRAN_STATUS_RMA_PENDING_RECEIPT = 'RtnAuth:B';

// Field Type
var FIELD_TYPE_FREEFORM_TEXT = '1';
var FIELD_TYPE_EMAIL_ADDRESS = '2';
var FIELD_TYPE_PHONE_NUMBER = '3';
var FIELD_TYPE_DATE = '4';
var FIELD_TYPE_CURRENCY = '5';
var FIELD_TYPE_DECIMAL_NUMBER = '6';
var FIELD_TYPE_INTEGER_NUMBER = '7';
var FIELD_TYPE_CHECK_BOX = '8';
var FIELD_TYPE_LIST_RECORD = '9';
var FIELD_TYPE_HYPERLINK = '10';
var FIELD_TYPE_TIME_OF_DAY = '11';
var FIELD_TYPE_TEXT_AREA = '12';
var FIELD_TYPE_MULTIPLE_SELECT = '13';
var FIELD_TYPE_IMAGE = '14';
var FIELD_TYPE_INLINE_HTML = '15';
var FIELD_TYPE_PASSWORD = '16';
var FIELD_TYPE_HELP = '17';
var FIELD_TYPE_PERCENT = '18';
var FIELD_TYPE_LONG_TEXT = '19';
var FIELD_TYPE_RICH_TEXT = '20';

// Item Types
var ITEM_TYPE_NON_INVENTORY = 'NonInvtPart';
var ITEM_TYPE_SUBTOTAL = 'Subtotal';
var ITEM_TYPE_DISCOUNT = 'Discount';
var ITEM_TYPE_DESCRIPTION = 'Description';
var ITEM_TYPE_INVPART = 'InvtPart';

// Custom Records
var CUSTOMRECORD_CONTRACT = 'customrecord_contracts';
var CUSTOMRECORD_CONTRACT_ITEM = 'customrecord_contract_item';

// Dynamic Scripting
var dynamicParam = {
        recordmode: 'dynamic',
        enablefieldtriggers: true
    };

// Contract Item State
var CONTRACT_ITEM_FUTURE    = 'Future';
var CONTRACT_ITEM_ACTIVE    = 'Active';
var CONTRACT_ITEM_EXPIRED   = 'Expired';

// Roles
var ROLEID_SHOPPER = 17;
var ROLEID_SHOPPER_WSDK = 14; //issue 224887

/**********************************
 * functions                       *
 ***********************************/

/**
 * This computes the total amount of transaction lines having the same product line & item category
 *
 * @param (string) arrItemCat The list of item categories to lookup
 * @param (string) stProdLine The Product Line to match
 * @return (float) The total amount calculated
 * @author Michael Franz V. Sumulong
 * @version 1.0
 */
function computeTotalAmount(arrItemCat, stProdLine)
{

    var iLineCount = nlapiGetLineItemCount('item');
    var flTotalAmt = 0;
    for (var idx = 1; idx <= iLineCount; idx++)
    {
        var stItemCat = nlapiGetLineItemValue('item', 'custcol_item_category', idx);
        var stCurProdLine = nlapiGetLineItemValue('item', 'custcol_product_line', idx);
        var stOptOut = nlapiGetLineItemValue('item', 'custcol_opt_out_ms', idx);

        if (searchInList(arrItemCat, stItemCat) && stCurProdLine == stProdLine && stOptOut != 'T')
        {
            var flCurAmt = nlapiGetLineItemValue('item', 'custcol_list_rate', idx);
            if (flCurAmt == null || flCurAmt == '' || flCurAmt == undefined)
                flCurAmt = nlapiGetLineItemValue('item', 'rate', idx);
            var flQty = nlapiGetLineItemValue('item', 'quantity', idx);
            if (flCurAmt != null && flCurAmt != undefined && flCurAmt != '')
            {
                flCurAmt = parseFloat(flCurAmt);
                flQty = parseFloat(flQty);
                flTotalAmt += (flCurAmt * flQty);
            }
        }
    }
    return flTotalAmt;
}

/**
 * This computes the total *NET* amount of transaction lines having the same product line & item category
 *
 * @param (string) arrItemCat The list of item categories to lookup
 * @param (string) stProdLine The Product Line to match
 * @return (float) The total amount calculated
 * @author Michael Franz V. Sumulong
 * @version 1.0
 */
function computeTotalNetAmount(arrItemCat, stProdLine)
{

    var iLineCount = nlapiGetLineItemCount('item');
    var flTotalAmt = 0;
    for (var idx = 1; idx <= iLineCount; idx++)
    {
        var stItemCat = nlapiGetLineItemValue('item', 'custcol_item_category', idx);
        var stCurProdLine = nlapiGetLineItemValue('item', 'custcol_product_line', idx);
        var stOptOut = nlapiGetLineItemValue('item', 'custcol_opt_out_ms', idx);

        if (searchInList(arrItemCat, stItemCat) && stCurProdLine == stProdLine && stOptOut != 'T')
        {
            var flDiscountRate = nlapiGetLineItemValue('item','custcol_inline_discount',idx);
            if(flDiscountRate != null && flDiscountRate != '' && flDiscountRate != undefined)
            {
                flDiscountRate = flDiscountRate.replace('%','');
                flDiscountRate = parseFloat(flDiscountRate);
                flDiscountRate = flDiscountRate / 100;
            }
            else
            {
                flDiscountRate = 0;
            }

            var flCurAmt = nlapiGetLineItemValue('item', 'custcol_list_rate', idx);
            var flQty = nlapiGetLineItemValue('item', 'quantity', idx);
            if (flCurAmt != null && flCurAmt != undefined && flCurAmt != '')
            {
                flCurAmt = parseFloat(flCurAmt);
                flQty = parseFloat(flQty);
                if (flDiscountRate != 0)
                {
                    flTotalAmt += (flCurAmt * flQty * (1 - flDiscountRate));
                }
                else
                {
                    flTotalAmt += (flCurAmt * flQty);
                }
            }
        }
    }
    return flTotalAmt;
}

/**
 * Searches an array for a given object
 *
 * @param (array) arrList The array to search
 * @param (var) varObj The object to be searched for
 * @return (boolean) The Item was found in the list
 * @author Michael Franz V. Sumulong
 * @version 1.0
 */
function searchInList(arrList, varObj) {
    var bIsFound = false;

    for (var i = 0; i < arrList.length; i++) {
        if (arrList[i] == varObj) {
            bIsFound = true;
            break;
        }
    }

    return bIsFound;
}

/**
 * Splits a comma-delimited string into an array.
 *
 * @param (string) stList The string representing the list
 * @return (array) The list as an array
 * @author Michael Franz V. Sumulong
 * @version 1.0
 */
function splitList(stList)
{
    if (stList)
    {
        stList = stList.split(',');
    }
    else
    {
        stList = new Array();
    }
    return stList;
}

/**
 * Retrieves the Item's Price based on the Price Level
 *
 * @param (string) stItemId The Item ID
 * @param (string) stPriceLevel The Price Level
 * @throws nlobjError No Customer definition found for subsidiary.
 * @returns (float) The Item Rate
 * @author Michael Franz V. Sumulong
 * @version 1.0
 */
function getItemRate(stItemId, stPriceLevel)
{

    if (parseInt(stPriceLevel) > PRICE_LEVEL_BASE)
    {
        if (stItemId != null && stItemId != undefined && stItemId != '')
        {
            var arrRateFilters = [new nlobjSearchFilter('internalid', null, 'is', stItemId)];
            var arrRateColumns = [new nlobjSearchColumn('otherprices')];
            var arrRateResults = nlapiSearchRecord('item', '', arrRateFilters, arrRateColumns);
            return arrRateResults[0].getValue('price' + stPriceLevel);
        }
    }
    else
    {
        return nlapiLookupField('item', stItemId, 'baseprice');
    }

    return null;
}

/**
 * The Logger object contains functions which simplifies the logging of messages
 * by:
 * 1.  Removing the need to determine if the log is for a Server Side or Client
 *     Side SuiteScript
 * 2.  Allows you to toggle printing of DEBUG type messages programmatically
 *     or through a Script parameter.
 *
 * @author Nestor M. Lim
 * @version 2.0
 */
function Logger(isClientside)
{
    /** Determines whether to print DEBUG type messages or not */
    var bEnableDebug = false;
    var bIsClientside = (isClientside == undefined) ? false : isClientside;
    var intTabs = 0;


    this.indent = function Logger_indent()
    {
        intTabs++;
    };

    this.unindent = function Logger_unindent()
    {
        intTabs--;
    };

    /**
     * Enable printing of DEBUG type messages
     *
     * @author Nestor M. Lim
     * @version 1.0
     */
    this.enableDebug = function Logger_enableDebug()
    {
        bEnableDebug = true;
    };

    /**
     * Disable printing of DEBUG type messages
     *
     * @author Nestor M. Lim
     * @version 1.0
     */
    this.disableDebug = function Logger_disableDebug()
    {
        bEnableDebug = false;
    };

    /**
     * Prints a log either as an alert for CSS or a server side log for SSS
     *
     * @param (string) stType The type of log being printed. Can be set to DEBUG, ERROR, AUDIT, EMERGENCY
     * @param (string) stTitle The title of the log message - used in organizing logs
     * @param (string) stMessage The actual log message
     * @throws nlobjError No Log Type Defined
     * @author Nestor M. Lim
     * @version 1.0
     */
    this.log = function Logger_log(stType, stTitle, stMessage)
    {
        for (var x = 0; x < intTabs; x++)
        {
            stMessage = '\t' + stMessage;
        }
        stMessage = '<pre>' + stMessage + '</pre>';
        if (isEmptyString(stType))
        {
            throw nlapiCreateError('ERROR', 'Logging Error', 'No Log Type Defined');
        }

        if (stType.trim() === 'DEBUG')
        {
            if (!bEnableDebug)
            {
                return;
            }
        }

        if (bIsClientside)
        {
            alert(stType + ' : ' + stTitle + ' : ' + stMessage);
        }
        else
        {
            nlapiLogExecution(stType, stTitle, stMessage);
        }
    };

    /**
     * Convenience method to log a DEBUG message
     *
     * @param (string) stTitle The title of the log message - used in organizing logs
     * @param (string) stMessage The actual log message
     * @throws nlobjError No Log Type Defined
     * @author Nestor M. Lim
     * @version 1.0
     */
    this.debug = function Logger_debug(stTitle, stMessage)
    {
        this.log('DEBUG', stTitle, stMessage);
    };

    /**
     * Convenience method to log an AUDIT message
     *
     * @param (string) stTitle The title of the log message - used in organizing logs
     * @param (string) stMessage The actual log message
     * @throws nlobjError No Log Type Defined
     * @author Nestor M. Lim
     * @version 1.0
     */
    this.audit = function Logger_audit(stTitle, stMessage)
    {
        this.log('AUDIT', stTitle, stMessage);
    };

    /**
     * Convenience method to log an ERROR message
     *
     * @param (string) stTitle The title of the log message - used in organizing logs
     * @param (string) stMessage The actual log message
     * @throws nlobjError No Log Type Defined
     * @author Nestor M. Lim
     * @version 1.0
     */
    this.error = function Logger_error(stTitle, stMessage)
    {
        this.log('ERROR', stTitle, stMessage);
    };

    /**
     * Convenience method to log an EMERGENCY message
     *
     * @param (string) stTitle The title of the log message - used in organizing logs
     * @param (string) stMessage The actual log message
     * @throws nlobjError No Log Type Defined
     * @author Nestor M. Lim
     * @version 1.0
     */
    this.emergency = function Logger_emergency(stTitle, stMessage)
    {
        this.log('EMERGENCY', stTitle, stMessage);
    };
}

/**
 * Determines if a string variable is empty or not.  An empty string variable
 * is one which is null or undefined or has a length of zero.
 *
 * @param (string) stValue The string value to test for emptiness.
 * @return true if the variable is empty, false if otherwise.
 * @type boolean
 * @throws nlobjError isEmptyString should be passed a string value.  The data type passed is {x} whose class name is {y}
 * @author Nestor M. Lim
 * @see isNullOrUndefined
 * @version 1.5
 */
function isEmptyString(stValue)
{
    if (isNullOrUndefined(stValue))
    {
        return true;
    }

    if (typeof stValue != 'string' && getObjectName(stValue) != 'String')
    {
        throw nlapiCreateError('10000', 'isEmptyString should be passed a string value.  The data type passed is ' + typeof stValue + ' whose class name is ' + getObjectName(stValue));
    }

    if (stValue.length == 0)
    {
        return true;
    }

    return false;
}

/**
 * Determines if a variable is either set to null or is undefined.
 *
 * @param (object) value The object value to test
 * @return true if the variable is null or undefined, false if otherwise.
 * @type boolean
 * @author Nestor M. Lim
 * @version 1.0
 */
function isNullOrUndefined(value)
{
    if (value === null)
    {
        return true;
    }

    if (value === undefined)
    {
        return true;
    }

    return false;
}

/**
 * Removes all leading and trailing spaces on the string object.
 *
 * @return the trimmed String object
 * @type String
 * @author Nestor M. Lim
 * @version 1.0
 */
String.prototype.trim = function String_trim()
{
    if (this === null)
    {
        return null;
    }

    return this.replace(/^\s*/, '').replace(/\s+$/, '');
};

/**
 * Returns the object / class name of a given instance
 *
 * @param (object) a variable representing an instance of an object
 * @return the class name of the object
 * @type string
 * @author Nestor M. Lim
 * @version 1.0
 */
function getObjectName(object)
{
    if (isNullOrUndefined(object))
    {
        return object;
    }

    return /(\w+)\(/.exec(object.constructor.toString())[1];
}

/**
 * Computes for the Product's List Rate
 */
function getProductListRate(stContractId, arrPerpContractItemsProcessed, stProdId, arrItemCatsToCompute, MS_MODEL/*, stCoTermDate*/, PRICING_MODEL) {
    var logger = new Logger(false);
    var MSG_TITLE = 'Create Renewal Transaction';
    //logger.enableDebug(); // comment this line to turn debugging off.
    logger.debug(MSG_TITLE, 'Computing Product Current List Rate.');

    var flNewCurrentProdRate = 0;

    var arrContractAmtFilters = [
        new nlobjSearchFilter('custrecord_ci_product_line', null, 'is', stProdId),
        new nlobjSearchFilter('custrecord_ci_contract_id', null, 'is', stContractId),
        new nlobjSearchFilter('custrecord_ci_startdate', null, 'isnotempty'),
        new nlobjSearchFilter('isinactive', null, 'is', 'F'),
        new nlobjSearchFilter('custrecord_ci_opt_out_ms', null, 'is', 'F'),
        new nlobjSearchFilter('custrecord_ci_renewals_exclusion', null, 'is', 'F')
    ];
    /*if (stCoTermDate != null && stCoTermDate != undefined && stCoTermDate != '') {
        logger.debug(MSG_TITLE, 'Adding filter for Co-Term Date');
        arrContractAmtFilters.push(new nlobjSearchFilter('custrecord_ci_startdate', null, 'onorbefore', stCoTermDate));
    }*/
    var arrContractAmtColumns = [
        new nlobjSearchColumn('custrecord_ci_original_discount'),
        new nlobjSearchColumn('custrecord_ci_item_category'),
        new nlobjSearchColumn('custrecord_ci_quantity'),
        new nlobjSearchColumn('custrecord_swe_contract_currency', 'custrecord_ci_contract_id'), //Issue 219708
        new nlobjSearchColumn('custrecord_ci_item'), //Issue 219708
        new nlobjSearchColumn('custrecord_ci_current_list_rate'), //Issue 222273
        new nlobjSearchColumn('custrecord_ci_original_list_rate'), //Issue 222273
        new nlobjSearchColumn('custrecord_ci_orig_list_rate_with_uplift'), //Issue 222273
        new nlobjSearchColumn('custrecord_ci_price_level'),
        new nlobjSearchColumn('custrecord_contracts_bill_to_customer', 'custrecord_ci_contract_id')
    ];
    /*if (PRICING_MODEL == PRICING_MODEL_CURRENT_LIST) {
        logger.debug(MSG_TITLE, 'Retrieving current list rate...');
        arrContractAmtColumns.push(new nlobjSearchColumn('custrecord_ci_current_list_rate'));
    } else if (PRICING_MODEL == PRICING_MODEL_HISTORIC_LIST) {
        logger.debug(MSG_TITLE, 'Retrieving historic list rate...');
        arrContractAmtColumns.push(new nlobjSearchColumn('custrecord_ci_original_list_rate'));
        arrContractAmtColumns.push(new nlobjSearchColumn('custrecord_ci_orig_list_rate_with_uplift')); //Issue 201246
    }*/ //Issue 222273

    //get product rate from contract items in the contract
    logger.debug(MSG_TITLE, 'Getting product rate from contract items in the contract...');
    var arrContractAmtResults = nlapiSearchRecord('customrecord_contract_item', null, arrContractAmtFilters, arrContractAmtColumns);
    flNewCurrentProdRate = getTotalProductRate(flNewCurrentProdRate, arrPerpContractItemsProcessed, arrContractAmtResults, arrItemCatsToCompute, MS_MODEL, PRICING_MODEL);

    //get product rate from perpetual contract items referenced in the contract (if not yet included in the result above)
    logger.debug(MSG_TITLE, 'Getting product rate from perpetual contract items referenced in the contract...');
    var arrPerpContractItems = nlapiLookupField('customrecord_contracts', stContractId, 'custrecord_swe_contract_perp_cntrct_itms');
    if (arrPerpContractItems != null && arrPerpContractItems != '' && arrPerpContractItems != undefined) {
        arrPerpContractItems = arrPerpContractItems.split(','); //Convert comma-separated value from (multi-select type) field to array
        if (arrPerpContractItems.length > 0) {
            var arrContractAmtFilters = [
                new nlobjSearchFilter('custrecord_ci_product_line', null, 'is', stProdId),
                new nlobjSearchFilter('internalid', null, 'anyof', arrPerpContractItems),
                new nlobjSearchFilter('custrecord_ci_startdate', null, 'isnotempty'),
                new nlobjSearchFilter('isinactive', null, 'is', 'F'),
                new nlobjSearchFilter('custrecord_ci_opt_out_ms', null, 'is', 'F')
            ];
            if (arrPerpContractItemsProcessed.length > 0) {
                arrContractAmtFilters.push(new nlobjSearchFilter('internalid', null, 'noneof', arrPerpContractItemsProcessed));
            }
            var arrContractAmtResults = nlapiSearchRecord('customrecord_contract_item', null, arrContractAmtFilters, arrContractAmtColumns);
            flNewCurrentProdRate = getTotalProductRate(flNewCurrentProdRate, arrPerpContractItemsProcessed, arrContractAmtResults, arrItemCatsToCompute, MS_MODEL, PRICING_MODEL);
        }
    }

    return flNewCurrentProdRate;
}

function addToPerpContractItemsProcessed(arrPerpContractItemsProcessed, contractItemId) {
    var bFound = false;
    for (var i = 0; i < arrPerpContractItemsProcessed.length; i++) {
        if (arrPerpContractItemsProcessed[i] == contractItemId) {
            bFound = true;
            break;
        }
    }
    if (!bFound) arrPerpContractItemsProcessed.push(contractItemId);
    return arrPerpContractItemsProcessed;
}

function getTotalProductRate(flNewCurrentProdRate, arrPerpContractItemsProcessed, arrContractAmtResults, arrItemCatsToCompute, MS_MODEL, PRICING_MODEL) {
    var logger = new Logger(false);
    var MSG_TITLE = 'Create Renewal Transaction';
    logger.enableDebug(); // comment this line to turn debugging off.
    logger.debug(MSG_TITLE, 'Loop through contracts');
    logger.indent();
    // if (arrContractAmtResults != null && arrContractAmtResults != undefined && arrContractAmtResults != '') {
    if (!SWE.Library.misc.isUndefinedNullOrEmpty(arrContractAmtResults)) {
    	var customerId = arrContractAmtResults[0].getValue('custrecord_contracts_bill_to_customer', 'custrecord_ci_contract_id');
    	var currency = arrContractAmtResults[0].getValue('custrecord_swe_contract_currency', 'custrecord_ci_contract_id');
		var tempTransaction = null;

		if (PRICING_MODEL == PRICING_MODEL_CURRENT_LIST ||
				PRICING_MODEL == PRICING_MODEL_CURRENT_LIST_CONTRACT) { // Use sales order to determine the current list rate of item
    		tempTransaction = nlapiCreateRecord('salesorder', {recordmode: 'dynamic'});
        	tempTransaction.setFieldValue('entity', customerId);
        	tempTransaction.setFieldValue('currency', currency);
    	}
    	
        for (var x = 0; x < arrContractAmtResults.length; x++) {
            logger.debug(MSG_TITLE, 'Looping through contract ' + arrContractAmtResults[x].getId());
            if (searchInList(arrItemCatsToCompute, arrContractAmtResults[x].getValue('custrecord_ci_item_category'))) {
                logger.debug(MSG_TITLE, 'Including this to computation');
                arrPerpContractItemsProcessed = addToPerpContractItemsProcessed(arrPerpContractItemsProcessed, arrContractAmtResults[x].getId());

                var flContractQty = parseFloatOrZero(arrContractAmtResults[x].getValue('custrecord_ci_quantity'));
                var flContractListRate = 0;

                if ( PRICING_MODEL == PRICING_MODEL_CURRENT_LIST_CONTRACT ) {
                	logger.debug(MSG_TITLE, 'Retrieving current list rate from item record ...');
                	var itemId = arrContractAmtResults[x].getValue('custrecord_ci_item');
                	var priceLevel = arrContractAmtResults[x].getValue('custrecord_ci_price_level');
                	// var currency = arrContractAmtResults[x].getValue('custrecord_swe_contract_currency', 'custrecord_ci_contract_id');
                	var itemDetails = SWE.Library.record.getItemRateFromContract(tempTransaction, customerId, itemId, priceLevel, flContractQty);
                	// var origListRate = parseFloatOrZero(arrContractAmtResults[x].getValue('custrecord_ci_original_list_rate'));

                	// flContractListRate = SWE.Library.record.getItemRate(itemId, priceLevel);
                	flContractListRate = itemDetails[0];;
                	/* if ((!SWE.Library.misc.isUndefinedNullOrEmpty(currency) && currency != 1) || //not base currency
                            (nlapiGetContext().getFeature('quantitypricing') && flContractListRate != origListRate)) { //uses quantity pricingi_price_level');
                        flContractListRate = getCurrencySpecificPrice(itemId, priceLevel, currency, flContractListRate, flContractQty);
                    } */
                    logger.debug(MSG_TITLE, itemId + ' rate is : ' + flContractListRate);                	

                } else if ( PRICING_MODEL == PRICING_MODEL_CURRENT_LIST ) {
                    logger.debug(MSG_TITLE, 'Retrieving current list rate from customer record...');
                	var itemId = arrContractAmtResults[x].getValue('custrecord_ci_item');
                	var itemDetails = SWE.Library.record.getItemRateFromCustomer(tempTransaction, customerId, itemId, flContractQty);
                	var itemRate = itemDetails[0];
                	var priceLevel = itemDetails[1];

            		flContractListRate = itemRate;
                    var origListRate = parseFloatOrZero(arrContractAmtResults[x].getValue('custrecord_ci_original_list_rate'));
                    //Issue 219708: Get price in customer's currency
                    var currency = arrContractAmtResults[x].getValue('custrecord_swe_contract_currency', 'custrecord_ci_contract_id');

                    if ((currency != 1) && (SWE.Library.misc.isUndefinedNullOrEmpty(flContractListRate))) {
                    	flContractListRate = parseFloatOrZero(arrContractAmtResults[x].getValue('custrecord_ci_current_list_rate'));
                    }
                    
                    /*if ((!SWE.Library.misc.isUndefinedNullOrEmpty(currency) && currency != 1) || //not base currency
                            (nlapiGetContext().getFeature('quantitypricing') && flContractListRate != origListRate)) { //uses quantity pricing
                        itemId = arrContractAmtResults[x].getValue('custrecord_ci_item');
                        // priceLevel = 1; //arrContractAmtResults[x].getValue('custrecord_ci_price_level');
                        flContractListRate = getCurrencySpecificPrice(itemId, priceLevel, currency, flContractListRate, flContractQty);
                    }*/
                    logger.debug(MSG_TITLE, itemId + ' rate is : ' + flContractListRate);

                } else if (PRICING_MODEL == PRICING_MODEL_HISTORIC_LIST) {
                    logger.debug(MSG_TITLE, 'Retrieving historic list rate...');
                    flContractListRate = parseFloatOrZero(arrContractAmtResults[x].getValue('custrecord_ci_orig_list_rate_with_uplift')); //Issue 201246
                    if (flContractListRate == 0) {
                        flContractListRate = parseFloatOrZero(arrContractAmtResults[x].getValue('custrecord_ci_original_list_rate'));
                    }
                }
                logger.debug(MSG_TITLE, 'flContractQty=' + flContractQty);
                logger.debug(MSG_TITLE, 'flContractListRate=' + flContractListRate);

                flNewCurrentProdRate += flContractQty * flContractListRate;
                logger.debug(MSG_TITLE, 'Running Total:' + flNewCurrentProdRate);
            }
        }
    }
    logger.unindent();
    return flNewCurrentProdRate;
}

/**
 * Gets the item price based on the specified currency (Issue 219708)
 * @author atipoe
 */
function getCurrencySpecificPrice(itemId, priceLevel, currency, flContractListRate, flContractQty) {
    var MSG_TITLE = 'getCurrencySpecificPrice';
    nlapiLogExecution('DEBUG', MSG_TITLE, 'Start');
    nlapiLogExecution('DEBUG', MSG_TITLE, 'itemId: ' + itemId + ', priceLevel: ' + priceLevel +
            ', currency: ' + currency + ', flContractListRate: ' + flContractListRate +
            ', flContractQty: ' + flContractQty);

    var sFilters = new Array();
    sFilters.push(new nlobjSearchFilter('internalid', null, 'is', itemId));
    sFilters.push(new nlobjSearchFilter('pricelevel', 'pricing', 'is', (priceLevel < 1 ? 1 : priceLevel)));
    if (nlapiGetContext().getFeature('multicurrency')) {
        sFilters.push(new nlobjSearchFilter('currency', 'pricing', 'is', currency));
    }
    if (nlapiGetContext().getFeature('quantitypricing')) {
        nlapiLogExecution('DEBUG', MSG_TITLE, 'quantitypricing = true');
        sFilters.push(new nlobjSearchFilter('minimumquantity', 'pricing', 'lessthanorequalto', flContractQty));
        var sFilterA = new nlobjSearchFilter('maximumquantity', 'pricing', 'greaterthan', flContractQty);
        var sFilterB = new nlobjSearchFilter('maximumquantity', 'pricing', 'isempty');
        sFilterA.setOr(true);
        sFilterA.setLeftParens(1);
        sFilterB.setRightParens(1);
        sFilters.push(sFilterA);
        sFilters.push(sFilterB);
    }
    var sColumns = new Array();
    sColumns.push(new nlobjSearchColumn('unitprice', 'pricing', 'max'));
    sColumns.push(new nlobjSearchColumn('internalid', null, 'group'));
    var sResults = nlapiSearchRecord('item', null, sFilters, sColumns);
    var price = null;
    if (sResults != null) {
        price = sResults[0].getValue('unitprice', 'pricing', 'max');
        nlapiLogExecution('DEBUG', MSG_TITLE, 'price = ' + price);
    }

    if (SWE.Library.misc.isUndefinedNullOrEmpty(price) && nlapiGetContext().getFeature('multicurrency')) {
        var cFilters = new Array();
        cFilters.push(new nlobjSearchFilter('internalid', null, 'is', currency));
        var cColumns = new Array();
        cColumns.push(new nlobjSearchColumn('exchangerate'));
        var cResults = nlapiSearchRecord('currency', null, cFilters, cColumns);
        if (cResults != null) {
            var fxRate = parseFloatOrZero(cResults[0].getValue('exchangerate'));
            if (fxRate != 0) {
                price = flContractListRate / fxRate;
            }
            nlapiLogExecution('DEBUG', MSG_TITLE, 'fxRate = ' + fxRate);
            nlapiLogExecution('DEBUG', MSG_TITLE, 'flContractListRate = ' + flContractListRate);
            nlapiLogExecution('DEBUG', MSG_TITLE, 'price = ' + price);
        }
    }

    nlapiLogExecution('DEBUG', MSG_TITLE, 'End');
    return parseFloatOrZero(price);
}

/**
 * Computes for the Product's Future List Rate
 */
function getProductFutureRate(flUpliftRate, stContractId, arrPerpContractItemsProcessed, stProdId, arrItemCatsToCompute, MS_MODEL/*, stCoTermDate*/, PRICING_MODEL) {
    var flNewCurrentProdRate = getProductListRate(stContractId, arrPerpContractItemsProcessed, stProdId, arrItemCatsToCompute, MS_MODEL/*, stCoTermDate*/, PRICING_MODEL);
    if (flUpliftRate > 0) flNewCurrentProdRate = flNewCurrentProdRate + (flNewCurrentProdRate * (flUpliftRate / 100));
    return flNewCurrentProdRate;
}

/**
 * Applies the Customer Uplift to Perpetual License Contract Items (Issue 201246)
 * @param flUpliftRate
 * @param stProdId
 * @param stContractId
 * @param arrMaintenanceBasisCat
 * @author atipoe
 */
function applyUpliftToPerpetualLicenseCIs(flUpliftRate, stProdId, stContractId, arrMaintenanceBasisCat, DECIMAL_PLACES_LISTRATE) {
    var logger = new Logger(false);
    var MSG_TITLE = 'applyUpliftToPerpetualLicenseCIs';
    logger.debug(MSG_TITLE, '====== Start ======');

    if (flUpliftRate != 0) {
        var arrContractItemFilters = [
            new nlobjSearchFilter('custrecord_ci_product_line', null, 'is', stProdId),
            new nlobjSearchFilter('custrecord_ci_contract_id', null, 'is', stContractId),
            new nlobjSearchFilter('custrecord_ci_startdate', null, 'isnotempty'),
            new nlobjSearchFilter('isinactive', null, 'is', 'F'),
            new nlobjSearchFilter('custrecord_ci_opt_out_ms', null, 'is', 'F'),
            new nlobjSearchFilter('custrecord_ci_renewals_exclusion', null, 'is', 'F'),
            new nlobjSearchFilter('custrecord_ci_item_category', null, 'anyof', arrMaintenanceBasisCat)
        ];
        var arrContractItemColumns = [
            new nlobjSearchColumn('custrecord_ci_original_list_rate'),
            new nlobjSearchColumn('custrecord_ci_orig_list_rate_with_uplift')
        ];
        var arrContractItemResults = nlapiSearchRecord('customrecord_contract_item', null, arrContractItemFilters, arrContractItemColumns);
        var arrProcessedContractItems = new Array();
        if (arrContractItemResults != null) {
            for (var i = 0; i < arrContractItemResults.length; i++) {
                logger.debug(MSG_TITLE, 'Contract Item ID = ' + arrContractItemResults[i].getId());
                var listRateWithUplift = parseFloatOrZero(arrContractItemResults[i].getValue('custrecord_ci_orig_list_rate_with_uplift'));
                if (listRateWithUplift == 0) {
                    listRateWithUplift = parseFloatOrZero(arrContractItemResults[i].getValue('custrecord_ci_original_list_rate'));
                }
                logger.debug(MSG_TITLE, 'before listRateWithUplift = ' + listRateWithUplift);
                listRateWithUplift = SWE.Library.misc.getRoundedDec(listRateWithUplift * (1 + (flUpliftRate / 100)), DECIMAL_PLACES_LISTRATE);
                logger.debug(MSG_TITLE, 'after listRateWithUplift = ' + listRateWithUplift);
                nlapiSubmitField('customrecord_contract_item', arrContractItemResults[i].getId(), 'custrecord_ci_orig_list_rate_with_uplift', listRateWithUplift);
                arrProcessedContractItems.push(arrContractItemResults[i].getId());
            }
        }

        logger.debug(MSG_TITLE, 'Applying uplift to the Contract\'s "Perpetual Contract Items"...');
        var arrPerpContractItems = nlapiLookupField('customrecord_contracts', stContractId, 'custrecord_swe_contract_perp_cntrct_itms');
        if (!SWE.Library.misc.isUndefinedNullOrEmpty(arrPerpContractItems)) {
            arrPerpContractItems = arrPerpContractItems.split(','); //Convert comma-separated value from (multi-select type) field to array
            var arrContractItemFilters = [
                new nlobjSearchFilter('custrecord_ci_product_line', null, 'is', stProdId),
                new nlobjSearchFilter('internalid', null, 'anyof', arrPerpContractItems),
                new nlobjSearchFilter('custrecord_ci_startdate', null, 'isnotempty'),
                new nlobjSearchFilter('isinactive', null, 'is', 'F'),
                new nlobjSearchFilter('custrecord_ci_opt_out_ms', null, 'is', 'F'),
                new nlobjSearchFilter('custrecord_ci_renewals_exclusion', null, 'is', 'F'),
                new nlobjSearchFilter('custrecord_ci_item_category', null, 'anyof', arrMaintenanceBasisCat)
            ];
            if (arrProcessedContractItems.length > 0) {
                arrContractItemFilters.push(new nlobjSearchFilter('internalid', null, 'noneof', arrProcessedContractItems));
            }
            var arrContractItemResults = nlapiSearchRecord('customrecord_contract_item', null, arrContractItemFilters, arrContractItemColumns);
            if (arrContractItemResults != null) {
                for (var i = 0; i < arrContractItemResults.length; i++) {
                    logger.debug(MSG_TITLE, 'Contract Item ID = ' + arrContractItemResults[i].getId());
                    var listRateWithUplift = parseFloatOrZero(arrContractItemResults[i].getValue('custrecord_ci_orig_list_rate_with_uplift'));
                    if (listRateWithUplift == 0) {
                        listRateWithUplift = parseFloatOrZero(arrContractItemResults[i].getValue('custrecord_ci_original_list_rate'));
                    }
                    logger.debug(MSG_TITLE, 'before listRateWithUplift = ' + listRateWithUplift);
                    listRateWithUplift = SWE.Library.misc.getRoundedDec(listRateWithUplift * (1 + (flUpliftRate / 100)), DECIMAL_PLACES_LISTRATE);
                    logger.debug(MSG_TITLE, 'after listRateWithUplift = ' + listRateWithUplift);
                    nlapiSubmitField('customrecord_contract_item', arrContractItemResults[i].getId(), 'custrecord_ci_orig_list_rate_with_uplift', listRateWithUplift);
                }
            }
        }
    }

    logger.debug(MSG_TITLE, '====== End ======');
}

function isProductLicenseExists(stContractId, stProdLine, arrQtyTypesForProduct) {
    var arrProductFilters = [
        new nlobjSearchFilter('custrecord_ci_contract_id', null, 'is', stContractId),
        new nlobjSearchFilter('custrecord_ci_product_line', null, 'is', stProdLine),
        new nlobjSearchFilter('custrecord_ci_quantity_type', null, 'anyof', arrQtyTypesForProduct),
        new nlobjSearchFilter('isinactive', null, 'is', 'F'),
        new nlobjSearchFilter('isinactive', 'custrecord_ci_bill_to_customer', 'is', 'F')
    ];
    var arrProductColumns = [
        new nlobjSearchColumn('internalid', null, 'count')
    ];

    var arrProductResults = nlapiSearchRecord('customrecord_contract_item', null, arrProductFilters, arrProductColumns);
    var recordCount = arrProductResults[0].getValue('internalid', null, 'count');
    if (recordCount > 0) {
        return true;
    }

    return false;
}

function productLineExists(contractId, stProdLine){
	nlapiLogExecution('DEBUG', 'stProdLine', 'contractId: ' + contractId + '  |  stProdLine: ' + stProdLine);
    var contract = nlapiLoadRecord('customrecord_contracts', contractId);

    // var perpContractItems = contract.getFieldValue('custrecord_swe_contract_perp_cntrct_itms');
    var pci = contract.getFieldValues('custrecord_swe_contract_perp_cntrct_itms');
    pci = pci != null ? pci : {};

    for (var i = 0; i < pci.length; i++) {
        if (SWE.Library.misc.isUndefinedNullOrEmpty( pci[i] )) {
            continue;
        }
        nlapiLogExecution('DEBUG', 'pci[i]', pci[i]);
        var perpItem = nlapiLoadRecord('customrecord_contract_item', pci[i]);

        var prodLine = perpItem.getFieldValue('custrecord_ci_product_line');
        nlapiLogExecution('DEBUG', 'prodLine', 'prodLine: ' + prodLine);

        if(prodLine == stProdLine){
            return true;
        }
    }

    return false;
}

function isProductLicenseFoundOnPendingTrans(stContractId, stProdLine, searchProductPendingCreation) {
    var arrProductFilters = [
        new nlobjSearchFilter('custbody_contract_name', null, 'is', stContractId),
        new nlobjSearchFilter('custcol_product_line', null, 'is', stProdLine)
    ];

    var arrProductResults = nlapiSearchRecord('transaction', searchProductPendingCreation, arrProductFilters);
    if (!SWE.Library.misc.isUndefinedNullOrEmpty(arrProductResults)) {
        if (arrProductResults.length > 0) return true;
    }

    return false;
}

/**
 * This function retrieves all M/S Types
 */
function retrieveMSTypes()
{
    var logger = new Logger((nlapiGetContext().getExecutionContext() == 'userinterface'));
    var MSG_TITLE = 'retrieveMSTypes';
    if(nlapiGetContext().getExecutionContext() != 'userinterface')
    {
        logger.enableDebug(); // comment this line to turn debugging off.
    }

    logger.debug(MSG_TITLE,'Retrieve M/S Types');

    var arrMSTypeColumns = [
        new nlobjSearchColumn('custrecord_support_percentage')
    ];

    var arrMSTypeResults = nlapiSearchRecord('customrecord_mtce_support_types', '', null, arrMSTypeColumns);

    var arrMSTypes = new Array();
    var iMSTypeCount = 0;

    logger.debug(MSG_TITLE, 'Loop through M/S Types');
    logger.indent();
    if (arrMSTypeResults != null && arrMSTypeResults != undefined && arrMSTypeResults != '')
    {

        for (var i = 0; i < arrMSTypeResults.length; i++)
        {
            var stMSTypeId = '';
            try
            {
                stMSTypeId = arrMSTypeResults[i].getId();
                arrMSTypes[iMSTypeCount] = new Array();
                arrMSTypes[iMSTypeCount].id = stMSTypeId;
                arrMSTypes[iMSTypeCount].percentage = arrMSTypeResults[i].getValue('custrecord_support_percentage');
                iMSTypeCount++;
                logger.debug(MSG_TITLE,'ID: ' + arrMSTypes[iMSTypeCount].id + ' VALUE: ' + arrMSTypes[iMSTypeCount].percentage);
            }
            catch(ex)
            {
                logger.debug(MSG_TITLE, 'Error Occurred.');
                if (ex.getDetails != undefined)
                {
                    nlapiLogExecution('ERROR', ex.getCode(), 'Retrieving M/S Type ' + stMSTypeId + ':' + ex.getDetails());
                }
                else
                {
                    nlapiLogExecution('ERROR', 'UNEXPECTED ERROR', 'Retrieving M/S Type ' + stMSTypeId + ':' + ex.toString());
                }
            }

        }
    }
    logger.unindent();

    return arrMSTypes;
}

/**
 *
 * @param {Object} MAP_TYPE that should be retrieved
 */
function retrieveFieldMappings(MAP_TYPE)
{
    var logger = new Logger((nlapiGetContext().getExecutionContext() == 'userinterface'));
    var MSG_TITLE = 'SS_ReinstateCustomer';
    if(nlapiGetContext().getExecutionContext() != 'userinterface')
    {
        logger.enableDebug(); // comment this line to turn debugging off.
    }

    logger.debug(MSG_TITLE,'retrieveFieldMappings');

    var arrFieldMapFilters = [
        new nlobjSearchFilter('isinactive', '', 'is', 'F')
    ];
    if(MAP_TYPE != null && MAP_TYPE != undefined && MAP_TYPE != '')
    {
        arrFieldMapFilters.push(new nlobjSearchFilter('custrecord_swe_mapping_direction', '', 'anyof', [MAP_TYPE, MAP_ORIG_TRAN_TO_IB_TO_RENEWAL_MAP]));
    }
    else
    {
        arrFieldMapFilters.push(new nlobjSearchFilter('custrecord_swe_mapping_direction', '', 'is', MAP_ORIG_TRAN_TO_IB_TO_RENEWAL_MAP));
    }

    var arrFieldMapColumns = [
        new nlobjSearchColumn('custrecord_swe_tran_field_type'),
        new nlobjSearchColumn('custrecord_swe_tran_field_id_map'),
        new nlobjSearchColumn('custrecord_swe_install_base_field_id_map')
    ];

    var arrFieldMapResults = nlapiSearchRecord('customrecord_contract_item_fld_maps', '', arrFieldMapFilters, arrFieldMapColumns);

    var arrFieldMaps = new Array();

    logger.debug(MSG_TITLE, 'Loop through Field Mappings');
    logger.indent();
    if (arrFieldMapResults != null && arrFieldMapResults != undefined && arrFieldMapResults != '')
    {

        for (var idxFldMaps = 0; idxFldMaps < arrFieldMapResults.length; idxFldMaps++)
        {
            try
            {
                var objFieldMap = new Object();
                objFieldMap['internalid'] = arrFieldMapResults[idxFldMaps].getId();
                objFieldMap['custrecord_swe_tran_field_type'] = arrFieldMapResults[idxFldMaps].getValue('custrecord_swe_tran_field_type');
                objFieldMap['custrecord_swe_tran_field_id_map'] = arrFieldMapResults[idxFldMaps].getValue('custrecord_swe_tran_field_id_map');
                objFieldMap['custrecord_swe_install_base_field_id_map'] = arrFieldMapResults[idxFldMaps].getValue('custrecord_swe_install_base_field_id_map');

                logger.debug(MSG_TITLE,'Field Map Retrieved: '
                    + '\n' + 'internalid=' + objFieldMap['internalid']
                    + '\n' + 'custrecord_swe_tran_field_type=' + objFieldMap['custrecord_swe_tran_field_type']
                    + '\n' + 'custrecord_swe_tran_field_id_map=' + objFieldMap['custrecord_swe_tran_field_id_map']
                    + '\n' + 'custrecord_swe_install_base_field_id_map=' + objFieldMap['custrecord_swe_install_base_field_id_map']
                    );

                arrFieldMaps.push(objFieldMap);

            }
            catch(ex)
            {
                logger.debug(MSG_TITLE, 'Error Occurred.');
                if (ex.getDetails != undefined)
                {
                    nlapiLogExecution('ERROR', ex.getCode(), 'Getting details for Field Map #' + arrFieldMapResults[idxFldMaps].getId() + ':' + ex.getDetails());
                }
                else
                {
                    nlapiLogExecution('ERROR', 'UNEXPECTED ERROR', 'Getting details for Field Map #' + arrFieldMapResults[idxFldMaps].getId() + ':' + ex.toString());
                }
            }
        }
    }

    return arrFieldMaps;
}

/**
 * Checks if the current record is of type RMA
 * @type boolean
 * @author mabiog
 */
function isRecordTypeRMA(){
    return nlapiGetRecordType() == RENEWAL_TRAN_TYPE[5];
}

/**
 * Checks if the current record is of type Credit Memo
 * @type boolean
 * @author mabiog
 */
function isRecordTypeCreditMemo(){
    return nlapiGetRecordType() == RENEWAL_TRAN_TYPE[6];
}

/**
 * Checks if the current record is RMA
 * @type boolean
 * @author mabiog
 */
function isRecordTypeRefund(){
    return isRecordTypeRMA() || isRecordTypeCreditMemo();
}

/**
 * Checks if the current record is Sales Order
 * @type boolean
 * @author mabiog
 */
function isRecordTypeSalesOrder(){
    return nlapiGetRecordType() == RENEWAL_TRAN_TYPE[3];
}

/**
 * Checks if the current record is Invoice
 * @type boolean
 * @author mabiog
 */
function isRecordTypeInvoice(){
    return nlapiGetRecordType() == RENEWAL_TRAN_TYPE[4];
}

function isRecordTypeOpportunity(){
    return nlapiGetRecordType() == RENEWAL_TRAN_TYPE[1];
}

function isRecordTypeQuote() {
    return nlapiGetRecordType() == RENEWAL_TRAN_TYPE[2];
}

/**
 * Checks if item category is required to have a contract for RMA record
 * @type boolean
 * @param {Object} itemCategory to be checked
 * @author mabiog
 */
function itemCategoryRequiresContract(itemCategory){
     /* var arrCats = new Array(ITEMCAT_TYPE_LICENSE_PERP, ITEMCAT_TYPE_LICENSE_TERM, ITEMCAT_TYPE_MAINT_NEW, ITEMCAT_TYPE_MAINT_RENEWAL,
        ITEMCAT_TYPE_SUPPORT_NEW, ITEMCAT_TYPE_SUPPORT_RENEWAL, ITEMCAT_TYPE_HARDWARE); */
    var arrCats = splitList(SWE.Parameters.getItemCategoriesToProcess());

    return searchInList(arrCats, itemCategory);
}

/**
 * Returns an array of transaction dates.
 * @return Array of transaction dates(start and end)
 * @author Carlo Abiog (mabiog)
 */
function getTranDates(){
    var stTranStartDt, stTranEndDt;

    if(isRecordTypeRefund()){
        stTranStartDt = nlapiGetFieldValue('custbody_swe_rma_header_start_date');
        stTranEndDt = nlapiGetFieldValue('custbody_swe_rma_header_end_date');
    }
    else{
        stTranStartDt = nlapiGetFieldValue('startdate');
        stTranEndDt = nlapiGetFieldValue('enddate');
    }

    return new Array(stTranStartDt, stTranEndDt);
}

/**
 * @author Victor L. Sayas
 * @version 1.0
 */
function RMAitemExistsInSalesOrder( request, response ) {
    var stContractId = request.getParameter( 'ContractID' );
    var stItemId     = request.getParameter( 'ItemId' );
    var stType       = request.getParameter( 'Type' );
    nlapiLogExecution('DEBUG', 'Suitelet Type', 'Type: ' + stType);
    var result = '';
    if(!stType || stType == null) { stType = ''; }
    switch(stType.toLowerCase()) {
        case 'createdownsell':
            //var stCustomerId = request.getParameter( 'CustomerId' );
            var endUser = request.getParameter('EndUser');
            var distributor = request.getParameter('Distributor');
            var reseller = request.getParameter('Reseller');
            var billToTier = request.getParameter('BillToTier');
            var shipToTier = request.getParameter('ShipToTier');
            var stItems = request.getParameter( 'Items' );
            //var stQuantity = request.getParameter( 'Quantity' );
            var stDiscount = request.getParameter( 'Discount' );
            var stLineNo = request.getParameter( 'LineNo' );
            var stCIDates = request.getParameter( 'CIDates' );
            var stPriceLevel = request.getParameter( 'PriceLevel' );
            var stCustListRate = request.getParameter( 'CustListRate' );
            var stRate = request.getParameter( 'Rate' );
            var stRMAUrl   = request.getParameter( 'RMAUrl' );
            var arrItems = splitList( stItems );
            //var arrQuantity = splitList( stQuantity );
            var arrItemDiscount = splitList( stDiscount );
            var arrLineNo = splitList( stLineNo );
            var arrContractItemDates = splitList( stCIDates );
            var arrPriceLevel = splitList( stPriceLevel );
            var arrCustListRate = splitList( stCustListRate );
            var arrRate = splitList( stRate );

            result = CreateDownSell(stContractId, /*stCustomerId, */endUser, distributor, reseller, billToTier, shipToTier, arrItems, /*arrQuantity, */arrItemDiscount, arrLineNo, arrContractItemDates, arrPriceLevel, arrCustListRate, arrRate, stRMAUrl);
            break;
        case 'getcontractitemfield':
            var stFieldName = request.getParameter( 'FieldName' );
            var stGroup     = request.getParameter( 'Group' );
            nlapiLogExecution('DEBUG', 'Parameters', 'Contract ID: ' + stContractId
                + '\nItem ID: ' + stItemId
                + '\nField Name: ' + stFieldName
                + '\nGroup: ' + stGroup
                + '\nType: \'' + stType + '\'');
            result = getContractItemField( stContractId, stItemId, stFieldName, stGroup );
            result = ( result == null || result == undefined ? 0 : result);
            break;
        case 'verifyrmaitem':   //let verifyrmaitem and the default case be one and the same.
        default:
            var iQuantity       = request.getParameter( 'Quantity' );
            var flListRate      = request.getParameter( 'ListRate' );
            var iOtherQuantity  = request.getParameter( 'OtherQuantity' );
            var stExceptionId   = request.getParameter( 'ExceptionId' );
            var IsCheckRate     = request.getParameter( 'CheckRate' );
            var itemTerms       = request.getParameter( 'Terms' );
            var bRenewalsExclution = request.getParameter( 'RenewalsExclusion' ) == 'true';
            var itemCategory    = request.getParameter('ItemCategory');
            nlapiLogExecution('DEBUG', 'Parameters', 'Contract ID: ' + stContractId
                + '\nItem ID: ' + stItemId
                + '\nList Rate: ' + flListRate
                + '\nQuantity: ' + iQuantity
                + '\nCheck Rate: ' + IsCheckRate
                + '\nOther Quantity: ' + iOtherQuantity
                + '\Terms: ' + itemTerms
                + '\nException ID: ' + stExceptionId
                + '\nType: \'' + stType + '\''
                + '\nRenewals Exclusion: ' + bRenewalsExclution
                + '\nItem Category: ' + itemCategory);

            result = verifyRMAItem(stContractId, stItemId, flListRate, iQuantity, iOtherQuantity, stExceptionId, IsCheckRate, false, itemTerms, bRenewalsExclution, itemCategory);
            break;
    }

    response.write(result);
}

function CreateDownSell(stContractId, /*stCustomerId, */endUser, distributor, reseller, billToTier, shipToTier, arrItems, /*arrQuantity, */arrItemDiscount, arrLineNo, arrContractItemDates, arrPriceLevel, arrCustListRate, arrRate, stRMAUrl) {
    try {
        nlapiLogExecution('DEBUG', 'Parameters', 'Contract ID: ' + stContractId
                //+ ' | Customer: '   + stCustomerId
                + ' | End User: '   + endUser
                + ' | Distributor: '   + distributor
                + ' | Reseller: '   + reseller
                + ' | Bill To Tier: '   + billToTier
                + ' | Ship To Tier: '   + shipToTier
                + ' | Items: '      + arrItems.join(',').toString()
                //+ ' | Quantity: '   + arrQuantity.join(',').toString()
                + ' | Discount: '   + arrItemDiscount.join(',').toString()
                + ' | Line No: '    + arrLineNo.join(',').toString()
                + ' | Contract Items Dates: '    + arrContractItemDates.join(',').toString()
                + ' | Price Level: '    + arrPriceLevel.join(',').toString()
                + ' | Custom List Rate '    + arrCustListRate.join(',').toString()
                + ' | Rate '    + arrRate.join(',').toString()
                + ' | RMA Url: '    + stRMAUrl);

        /*//Get field values from SO w/ same Contract
        var SOFilters = new Array();
        SOFilters[SOFilters.length] = new nlobjSearchFilter('custbody_contract_name', null, 'is', stContractId);
        var SOColumns = new Array();
        SOColumns[SOColumns.length] = new nlobjSearchColumn('internalid', null, 'min');
        SOColumns[SOColumns.length] = new nlobjSearchColumn('custbody_distributor', null, 'group');
        SOColumns[SOColumns.length] = new nlobjSearchColumn('custbody_reseller', null, 'group');
        SOColumns[SOColumns.length] = new nlobjSearchColumn('custbody_bill_to_tier', null, 'group');
        SOColumns[SOColumns.length] = new nlobjSearchColumn('custbody_ship_to_tier', null, 'group');
        var SOResults = nlapiSearchRecord('salesorder', null, SOFilters, SOColumns);
        var siblingSO = SOResults[0];*/

        //Create RMA record
        var rma = nlapiCreateRecord('returnauthorization' , dynamicParam);
        /*rma.setFieldValue('custbody_end_user', stCustomerId);
        rma.setFieldValue('custbody_distributor', siblingSO.getValue('custbody_distributor', null, 'group'));
        rma.setFieldValue('custbody_reseller', siblingSO.getValue('custbody_reseller', null, 'group'));
        rma.setFieldValue('custbody_bill_to_tier', siblingSO.getValue('custbody_bill_to_tier', null, 'group'));
        rma.setFieldValue('custbody_ship_to_tier', siblingSO.getValue('custbody_ship_to_tier', null, 'group'));*/
        rma.setFieldValue('custbody_end_user', endUser);
        rma.setFieldValue('custbody_distributor', distributor);
        rma.setFieldValue('custbody_reseller', reseller);
        rma.setFieldValue('custbody_bill_to_tier', billToTier);
        rma.setFieldValue('custbody_ship_to_tier', shipToTier);
        rma.setFieldValue('custbody_contract_name', stContractId);
      
		var stHiddenField = rma.getFieldValue('custbody_hidden_field');
		var bIsAnnualRate = (rma.getFieldValue('custbody_custom_price_is_annual_rate') == 'T');
				
        rma.setFieldValue('custbody_hidden_field', stHiddenField + (stHiddenField.length > 0 ? '|' : '') + 'rmaUrlPrefix' + '~' + stRMAUrl, false);
        nlapiLogExecution('DEBUG', 'RMA Dates', 'Start Date: ' + rma.getFieldValue('custbody_swe_rma_header_start_date')
                + ' | End Date: ' + rma.getFieldValue('custbody_swe_rma_header_end_date')
                + ' | RMA Url Prefix: ' + stRMAUrl );

        var iLineCount = arrItems.length;
        for (var i = 0; i < iLineCount; i++) {
            rma.selectNewLineItem('item');
            nlapiLogExecution('DEBUG', 'RMA Item', 'Processing Item : ' + arrItems[i].toString());
            rma.setCurrentLineItemValue('item', 'item', arrItems[i].toString());
            nlapiLogExecution('DEBUG', 'RMA Item Discount', 'Discount: ' + arrItemDiscount[i].toString());
            //rma.setCurrentLineItemValue( 'item', 'quantity', Math.abs(arrQuantity[i].toString()) );
            rma.setCurrentLineItemValue('item', 'quantity', 0); //total available quantity for return will be set later in R02
            if (parseFloat(arrItemDiscount[i].toString()) > 0) {
                rma.setCurrentLineItemValue('item', 'custcol_inline_discount', arrItemDiscount[i].toString());
            }
            rma.setCurrentLineItemValue('item', 'custcol_err_line_no', parseInt(arrLineNo[i]));

            var dates = arrContractItemDates[i].toString().split('|');

            rma.setCurrentLineItemValue('item', 'custcol_swe_contract_start_date', dates[0]);
            rma.setCurrentLineItemValue('item', 'custcol_swe_contract_end_date', dates[1]);

			var itemCategory = rma.getCurrentLineItemValue('item', 'custcol_item_category');
            if (arrPriceLevel[i] < 0) {                
                if (searchInList(splitList(ITEMCATS_FOR_SUPPORT), itemCategory) || searchInList(splitList(ITEMCATS_FOR_MAINTENANCE), itemCategory)) {
                    rma.setFieldValue('custbody_allow_custom_price_lvl_for_ms', 1);
                }
                else{
                    rma.setFieldValue('custbody_block_custom_price_level', 2);
                }
            }

            rma.setCurrentLineItemValue('item', 'price', arrPriceLevel[i]);

			var multiplier = 1;
			if(bIsAnnualRate && 
			   (searchInList(splitList(ITEMCATS_FOR_TERM), itemCategory) ||
			    searchInList(splitList(ITEMCATS_FOR_SUPPORT), itemCategory) || 
				searchInList(splitList(ITEMCATS_FOR_MAINTENANCE), itemCategory))) {
			 	multiplier = 12;
			}
			nlapiLogExecution('DEBUG', 'CreateDownSell', ' RMA Item : Item Category' + itemCategory 
				+ ' Multiplier:  ' + multiplier + ' List Rate: ' + arrCustListRate[i] + ' Rate: ' + arrRate[i]);
			if (arrPriceLevel[i] < 0) {
				rma.setCurrentLineItemValue('item', 'custcol_list_rate', arrCustListRate[i]*multiplier);
                rma.setCurrentLineItemValue('item', 'rate', arrRate[i]);
            }

            rma.commitLineItem('item');
            nlapiLogExecution('DEBUG', 'RMA Item', 'Added Item No. ' + arrItems[i].toString() /*+ ' with Quantity  ' + arrQuantity[i].toString()*/);
        }

        var rtnAuthId = nlapiSubmitRecord(rma, true, true);
        nlapiLogExecution('DEBUG', 'Create DownSell', 'RMA created in dynamic mode: ' + ' \nInternal ID: ' + rtnAuthId);

        return rtnAuthId;
    } catch(ex) {
//        if (ex.getCode() == 'USER_ERROR') {
        if (ex.getDetails != undefined) {
            nlapiLogExecution('DEBUG', 'CreateDownSell - error occured', 'Error: ' + ex.getDetails().toString() );
            return ex.getDetails().toString();
        } else {
            nlapiLogExecution('DEBUG', 'CreateDownSell - error occured', 'Error: ' + ex.toString() );
            return ex.toString();
        }
    }
}

function verifyRMAItem(stContractId, stItemId, flListRate, iQuantity, iOtherQuantity, stExceptionId, IsCheckRate, getAvailableQty, itemTerms, bRenewalsExclusion, itemCategory){
    var result = '';

    // Issue: 199577 SWV-CR > allow for RMA that does not reference contract
    // No need to search for contracts if the contract is not specified
    // Allow an RMA item to not be associated with a contract
    if (SWE.Library.misc.isUndefinedNullOrEmpty(stContractId)) {
        return result;
    }

    var filters = new SearchFilters();
    filters.addFilter('custrecord_ci_contract_id', null, 'anyof', stContractId);
    filters.addFilter('custrecord_ci_item', null, 'anyof', stItemId);

    var columns = new SearchColumns();
    columns.addColumn('custrecord_ci_contract_id', '', 'group');
    columns.addColumn('custrecord_ci_original_list_rate', '', 'group');
    columns.addColumn('custrecord_ci_quantity', '', 'sum');
    columns.addColumn('custrecord_ci_term', '', 'sum');

    var arrResults = searchContractItem(filters, columns);

    //Issue 219398: Search in Contract's list of Perpetual Contract Items
    if (arrResults == null && searchInList(splitList(ITEMCATS_FOR_MAINTENANCE_BASIS), itemCategory)) {
        var arrPerpContractItems = nlapiLookupField('customrecord_contracts', stContractId, 'custrecord_swe_contract_perp_cntrct_itms');
        if (!SWE.Library.misc.isUndefinedNullOrEmpty(arrPerpContractItems)) {
        	arrPerpContractItems = arrPerpContractItems.split(',');
            filters = new SearchFilters();
            filters.addFilter('internalid', null, 'anyof', arrPerpContractItems);
            filters.addFilter('custrecord_ci_item', null, 'anyof', stItemId);
            arrResults = searchContractItem(filters, columns);
        }
    }

    if (arrResults != null) {
        if (IsCheckRate == 'T') {
            //consider list rate if not renewals exclusion
            if (!bRenewalsExclusion) {
                filters.addFilter('custrecord_ci_original_list_rate', null, 'equalto', flListRate);
            }
            arrResults = searchContractItem(filters, columns);
        }
        else {
            var contractsListRate = 0; //Total list rate from Contract Items
            for (var j = 0; j < arrResults.length; j++) {
                var rate = arrResults[j].getValue('custrecord_ci_original_list_rate', '', 'group');
                var qty = arrResults[j].getValue('custrecord_ci_quantity', '', 'sum');
                contractsListRate += (rate * qty);
            }
            nlapiLogExecution('DEBUG', 'verifyRMAItem()', 'contractsListRate = ' + contractsListRate);

            var otherRMAsTotalQuantity = countItemQuantityInRMA(stContractId, stItemId, stExceptionId, flListRate, bRenewalsExclusion);
            nlapiLogExecution('DEBUG', 'verifyRMAItem()', 'otherRMAsTotalQuantity = ' + otherRMAsTotalQuantity);

            var otherRMAsTotalListRate = otherRMAsTotalQuantity * flListRate;
            nlapiLogExecution('DEBUG', 'verifyRMAItem()', 'otherRMAsTotalListRate = ' + otherRMAsTotalListRate);
            nlapiLogExecution('DEBUG', 'verifyRMAItem()', 'flListRate = ' + flListRate);

            if (parseFloat(contractsListRate) - parseFloat(otherRMAsTotalListRate) - parseFloat(iOtherQuantity * flListRate) >= flListRate) {
                result = getAvailableQty ? 1 : 'T';
            }
            else {
                result = 'R';
            }
            arrResults = null;
        }

        if (arrResults != null) {
            var iItemQuantity = countItemQuantityInRMA(stContractId, stItemId, stExceptionId, flListRate, bRenewalsExclusion); //total item qty in other RMAs
            nlapiLogExecution('DEBUG', 'verifyRMAItem()', 'countItemQuantityInRMA = ' + iItemQuantity);
            //iItemQuantity = this item's qty (0 when getAvailableQty is 'true') + other item qty in this RMA + total item qty in other RMAs
            iItemQuantity = parseInt(iQuantity) + parseInt(iOtherQuantity) + parseInt(iItemQuantity);
            nlapiLogExecution('DEBUG', 'RMA Item Quantity', 'Count: ' + iItemQuantity);

            //filters.addFilter('custrecord_ci_quantity', null, 'greaterthan', 0); //removed: include negative quantities from RMAs; exclude quantities from processed RMAs

            arrResults = searchContractItem(filters, columns);
            if (arrResults != null) { //T - ok; Q - quantity problems
                var iContractItemQuantity = 0;

                //get all item qty regardless of listrate
                for (var i = 0; i < arrResults.length; i++) {
                    iContractItemQuantity += parseInt(arrResults[i].getValue('custrecord_ci_quantity', '', 'sum'));
                }
                nlapiLogExecution('DEBUG', 'Contract Item Quantity', 'Count: ' + iContractItemQuantity);
                if (getAvailableQty) {
                    result = parseInt(iContractItemQuantity) - parseInt(iItemQuantity); //total qty from contract items - total qty from existing RMAs
                    if (result <= 0) {
                        result = 'Q';
                    }
                }
                else {
                    result = (iContractItemQuantity >= iItemQuantity ? 'T' : 'Q');
                }
            }
            else {
                result = 'Q';
            }

            nlapiLogExecution('DEBUG', 'result', result);
            if (itemTerms && result == 'T') {
                //check for terms
                var terms = 0;
                for (var i = 0; i < arrResults.length; i++) {
                    terms += (parseInt(arrResults[i].getValue('custrecord_ci_term', '', 'sum')) * arrResults[i].getValue('custrecord_ci_quantity', '', 'sum'));
                }

                nlapiLogExecution('DEBUG', 'termsx', terms);

                var rmaCF = new SearchFilters();
                rmaCF.addFilter('custrecord_ci_contract_id', null, 'is', stContractId);
                var rmaCC = new SearchColumns();
                rmaCC.addColumn('custrecord_ci_original_transaction');
                rmaCC.addColumn('custrecord_ci_quantity');
                var rmaRC = searchContractItem(rmaCF, rmaCC);

                var processedRMA = new Array();
                for (var i = 0; i < rmaRC.length; i++) {
                    var rmaID = rmaRC[i].getValue('custrecord_ci_original_transaction');
                    if (parseInt(rmaRC[i].getValue('custrecord_ci_quantity')) < 0) {
                        processedRMA.push(rmaID);
                    }
                }

                var rmaF = new SearchFilters();
                rmaF.addFilter('custbody_contract_name', null, 'is', stContractId);
                if (!bRenewalsExclusion) {
                    rmaF.addFilter('custcol_list_rate', null, 'equalto', flListRate);
                }
                var rmaC = new SearchColumns();

                var rmaR = searchRMA(rmaF, rmaC);

                if (rmaR) {
                    for (var j = 0; j < rmaR.length; j++) {
                        if (processedRMA.indexOf(rmaR[j].getId()) == -1 && rmaR[j].getId() != stExceptionId) {
                            var rmaRec = nlapiLoadRecord('returnauthorization', rmaR[j].getId());
                            if(rmaRec.getFieldValue('status') == 'Cancelled'){
                                continue;
                            }

                            for (var i = 1; i <= rmaRec.getLineItemCount('item'); i++) {
                                if (rmaRec.getLineItemValue('item', 'item', i) == stItemId) {
                                    terms -= (parseInt(rmaRec.getLineItemValue('item', 'custcol_swe_contract_item_term_months', i)) * parseInt(rmaRec.getLineItemValue('item', 'quantity', i)));
                                    nlapiLogExecution('DEBUG', 'termsi', terms);
                                }
                            }
                            processedRMA.push(rmaR[j].getId());
                        }
                    }
                }

                nlapiLogExecution('DEBUG', 'stContractId', stContractId);
                nlapiLogExecution('DEBUG', 'itemTerms', itemTerms);
                nlapiLogExecution('DEBUG', 'termsy', terms);

                if ((parseInt(itemTerms) * parseInt(iQuantity)) > parseInt(terms)) {
                    return 'M';
                }
            }
        }
        else {
            if (IsCheckRate == 'T') {
                result = 'R'; //rates has a problem
            }
        }
    }
    else {
        result = 'F'; //false or item does not exist in the contract
    }

    return result;
}

function getContractItemField( stContractId, stItemId, stFieldName, stGroup ) {
    var flDiscountRate = 0;

    var filters = new Array();
    filters[filters.length] = new nlobjSearchFilter( 'custrecord_ci_contract_id', null, 'anyof', stContractId);
    filters[filters.length] = new nlobjSearchFilter( 'custrecord_ci_item', null, 'anyof', stItemId );

    var columns = new Array();
    columns[columns.length] = new nlobjSearchColumn( stFieldName, '', stGroup );

    var arrResults = nlapiSearchRecord( 'customrecord_contract_item', null, filters, columns );
    if (arrResults != null) {
        flDiscountRate = arrResults[0].getValue( stFieldName, '', stGroup );
        nlapiLogExecution('DEBUG', 'Search Results:', 'Discount Rate: ' + flDiscountRate);
    }

    return flDiscountRate;
}

function hasContractItems(contractId, tranId){
    nlapiLogExecution('DEBUG', 'hasContractItems()', 'Checking for contract items...');
    nlapiLogExecution('DEBUG', 'hasContractItems()', 'Contract ID: ' + contractId);
    nlapiLogExecution('DEBUG', 'hasContractItems()', 'Original Transaction ID: ' + tranId);
    var result = false;

    var filters = new SearchFilters();
    //filters.addFilter('custrecord_ci_contract_id', null, 'anyof', contractId);
    filters.addFilter('custrecord_ci_contract_id', null, 'is', contractId);
    filters.addFilter('custrecord_ci_original_transaction', null, 'is', tranId);

    var columns = new SearchColumns();
    //columns.addColumn('custrecord_ci_contract_id', '', 'group');
    columns.addColumn('internalid', null, 'count');

    var arrResults = searchContractItem(filters, columns);
    //nlapiLogExecution('DEBUG', 'arr results', arrResults);
    var recordCount = arrResults[0].getValue('internalid', null, 'count');
    //if (arrResults != null && arrResults.length > 0) {
    if (recordCount > 0) {
        result = true;
    }
    nlapiLogExecution('DEBUG', 'hasContractItems()', 'recordCount: ' + recordCount);
    return result;
}

/*function isReferredToByOtherSO(contractId) {
    nlapiLogExecution('DEBUG', 'isReferredToByOtherSO()', 'Checking for referencing SOs...');
    nlapiLogExecution('DEBUG', 'isReferredToByOtherSO()', 'Contract ID: ' + contractId);
    var objSearchFilter = new nlobjSearchFilter('custbody_contract_name', null, 'is', contractId);
    var objSearchColumn = new nlobjSearchColumn('internalid', '', 'count');
    var arrSearchResults = nlapiSearchRecord('salesorder', null, objSearchFilter, objSearchColumn);
    var recordCount = arrSearchResults[0].getValue('internalid', '', 'count');
    nlapiLogExecution('DEBUG', 'isReferredToByOtherSO()', 'recordCount: ' + recordCount);
    if (recordCount > 0) {
        return true;
    } else {
        return false;
    }
}*/ //Issue 200324

function Contract(contractId){
    var filters = new SearchFilters();
    filters.addFilter('internalid', null, 'is', contractId);

    var columns = new SearchColumns();
    columns.addColumn('id');
    columns.addColumn('custrecord_contract_date_renewed');

    var arrResults = searchContract(filters, columns);

    if (arrResults != null && arrResults.length > 0) {
        this.renewalDate = arrResults[0].getValue('custrecord_contract_date_renewed');
    }
}

Contract.prototype = {
    getRenewalsDate: function(){
        return this.renewalDate;
    }
};

function searchContractItem(filters, columns){
    return searchRecord('customrecord_contract_item', null, filters.filters, columns.columns);
}

function searchContract(filters, columns){
    return searchRecord('customrecord_contracts', null, filters.filters, columns.columns);
}

function searchRMA(filters, columns){
    return searchRecord('returnauthorization', null, filters.filters, columns.columns);
}

function searchSalesOrder(filters, columns){
    return searchRecord('salesorder', null, filters.filters, columns.columns);
}

function searchInvoice(filters, columns){
    return searchRecord('invoice', null, filters.filters, columns.columns);
}

function searchCashSale(filters, columns){
    return searchRecord('cashsale', null, filters.filters, columns.columns);
}

function searchRecord(type, id, filter, columns){
    return nlapiSearchRecord(type, id, filter, columns);
}

function countItemQuantityInRMA(stContractId, stItemId, stExceptionId, flListRate, bRenewalsExclusion){
    var iQuantity = 0;
    var stTemp;
    var arrRMA1Filters = new Array();
    arrRMA1Filters[arrRMA1Filters.length] = new nlobjSearchFilter('custbody_check_log_status', null, 'noneof', '1'), //'Processed'; already in Contract Items
//    arrRMA1Filters[arrRMA1Filters.length] = new nlobjSearchFilter('custbody_check_log_status', null, 'is', CHECK_LOG_STATUS_PENDING);
    arrRMA1Filters[arrRMA1Filters.length] = new nlobjSearchFilter('status', null, 'noneof', 'RtnAuth:C'); //not cancelled
    arrRMA1Filters[arrRMA1Filters.length] = new nlobjSearchFilter('createdfrom', null, 'is', '@NONE@');
    arrRMA1Filters[arrRMA1Filters.length] = new nlobjSearchFilter('mainline', null, 'is', 'F');
    arrRMA1Filters[arrRMA1Filters.length] = new nlobjSearchFilter('custbody_contract_name', null, 'is', stContractId);
    if ( stExceptionId != null && stExceptionId != '' && stExceptionId != undefined) {
        nlapiLogExecution('DEBUG', 'Other RMA Item Quantity', 'Exception ID: ' + stExceptionId);
        arrRMA1Filters[arrRMA1Filters.length] = new nlobjSearchFilter('internalidnumber', null, 'notequalto', parseInt(stExceptionId));
    }
    arrRMA1Filters[arrRMA1Filters.length] = new nlobjSearchFilter('item', null, 'is', stItemId);
    if(!bRenewalsExclusion){
        //add list rate filter if not renewals exclusion
        arrRMA1Filters[arrRMA1Filters.length] = new nlobjSearchFilter('custcol_list_rate', null, 'equalto', flListRate);
    }

    var arrRMA1Columns = new Array();
    arrRMA1Columns[arrRMA1Columns.length] = new nlobjSearchColumn( 'item', null, 'group' );
    arrRMA1Columns[arrRMA1Columns.length] = new nlobjSearchColumn( 'custcol_list_rate', null, 'group' );
    arrRMA1Columns[arrRMA1Columns.length] = new nlobjSearchColumn( 'quantity', null, 'sum' );

    var arrRMA1 = nlapiSearchRecord('returnauthorization', null, arrRMA1Filters, arrRMA1Columns);

    if (arrRMA1 != null && arrRMA1 != undefined && arrRMA1 != '') {
        for (var idx = 0; idx < arrRMA1.length; idx++) {
            stTemp = arrRMA1[idx].getValue( 'quantity', null, 'sum' );
            iQuantity += ( (stTemp != null && stTemp != '' ? parseInt(stTemp) : 0) );
        }
        //iQuantity = iQuantity / 2;
        nlapiLogExecution('DEBUG', 'Other RMA Item Quantity', 'Count: ' + iQuantity);
    }

    var arrRMA2Filters = new Array();
    arrRMA2Filters[arrRMA2Filters.length] = new nlobjSearchFilter('custbody_check_log_status', null, 'noneof', '1'), //'Processed'; already in Contract Items
//    arrRMA2Filters[arrRMA2Filters.length] = new nlobjSearchFilter('custbody_check_log_status', null, 'is', CHECK_LOG_STATUS_PENDING);
    arrRMA2Filters[arrRMA2Filters.length] = new nlobjSearchFilter('status', null, 'noneof', 'RtnAuth:C'); //not cancelled
    arrRMA2Filters[arrRMA2Filters.length] = new nlobjSearchFilter('createdfrom', null, 'noneof', '@NONE@');
    arrRMA2Filters[arrRMA2Filters.length] = new nlobjSearchFilter('mainline', null, 'is', 'F');
    arrRMA2Filters[arrRMA2Filters.length] = new nlobjSearchFilter('custbody_contract_name', null, 'is', stContractId);
    if ( stExceptionId != null && stExceptionId != '' && stExceptionId != undefined) {
        nlapiLogExecution('DEBUG', 'Other RMA Item Quantity', 'Exception ID: ' + stExceptionId);
        arrRMA2Filters[arrRMA2Filters.length] = new nlobjSearchFilter('internalidnumber', null, 'notequalto', parseInt(stExceptionId));
    }
    arrRMA2Filters[arrRMA2Filters.length] = new nlobjSearchFilter('item', null, 'is', stItemId);

    if(!bRenewalsExclusion){
        //add list rate filter if not renewals exclusion
        arrRMA2Filters[arrRMA2Filters.length] = new nlobjSearchFilter('custcol_list_rate', null, 'equalto', flListRate);
    }

    var arrRMA2 = nlapiSearchRecord('returnauthorization', null, arrRMA2Filters, arrRMA1Columns);

    if (arrRMA2 != null && arrRMA2 != undefined && arrRMA2 != '') {
        for (var idx = 0; idx < arrRMA2.length; idx++) {
            stTemp = arrRMA2[idx].getValue( 'quantity', null, 'sum' );
            iQuantity += (stTemp != null && stTemp != '' ? parseInt(stTemp) : 0);
        }
        nlapiLogExecution('DEBUG', 'Other RMA Item Quantity', 'Countx: ' + iQuantity);
    }

    return (Math.abs(iQuantity));
}

function computeItemQuantity(stItemId, iLineNo, flListRate, bRenewalsExclusion) {
    var iLineCount = nlapiGetLineItemCount('item');
    var iTotalQuantity = 0;
    for (var idx = 1; idx <= iLineCount; idx++) {
        var stCurItemId = nlapiGetLineItemValue('item', 'item', idx);
        if ((stCurItemId == stItemId) && (idx != iLineNo)) {
            var flQty = nlapiGetLineItemValue('item', 'quantity', idx);
            var flLRate = nlapiGetLineItemValue('item', 'custcol_list_rate', idx);
            var bRenExc = nlapiGetLineItemValue('item', 'custcol_renewals_exclusion', idx);
            if ((flQty != null && flQty != undefined && flQty != '') &&
                (flLRate != null && flLRate != undefined && flLRate != '')) {
                if (bRenewalsExclusion) {   //disregard listrate if renewals exclusion is yes
                    iTotalQuantity += parseInt(flQty);
                }else{
                    if ((bRenExc == 'F')&&(flLRate == flListRate)){ //compare listrate if renewals exclusion is no
                        iTotalQuantity += parseInt(flQty);
                    }
                }
            }
        }
    }
    return iTotalQuantity;
}

function setContractValue(contractId) {
    var MSG_TITLE = 'setContractValue';
    var recordType = CUSTOMRECORD_CONTRACT;
    var record = nlapiLoadRecord(recordType, contractId);

    var contractValueOLR = record.getFieldValue('custrecord_swe_contract_value_olr'); //get Contract Value (OLR Contract Currency)
    contractValueOLR = isNaN(contractValueOLR) ? 0 : contractValueOLR;
    nlapiLogExecution('DEBUG', MSG_TITLE, 'Original Current Contract Value (OLR Contract Currency) = ' + contractValueOLR);

    var contractValueOLRBase = record.getFieldValue('custrecord_swe_contract_value_olr_base'); //get Contract Value (OLR Base Currency)
    contractValueOLRBase = isNaN(contractValueOLRBase) ? 0 : contractValueOLRBase;
    nlapiLogExecution('DEBUG', MSG_TITLE, 'Original Current Contract Value (OLR Base Currency) = ' + contractValueOLRBase);

    var contractValueCLRCont_cust = record.getFieldValue('custrecord_swe_contract_value_clr_cont'); //get Contract Value (CLR Customer Contract Currency)
    contractValueCLRCont_cust = isNaN(contractValueCLRCont_cust) ? 0 : contractValueCLRCont_cust;
    nlapiLogExecution('DEBUG', MSG_TITLE, 'Original Current Contract Value (CLR Customer-Contract Currency) = ' + contractValueCLRCont_cust);
    
    var contractValueCLRCont_cont = record.getFieldValue('custrecord_swe_contract_value_clr2_cont'); //get Contract Value (CLR Customer Contract Currency)
    contractValueCLRCont_cont = isNaN(contractValueCLRCont_cont) ? 0 : contractValueCLRCont_cont;
    nlapiLogExecution('DEBUG', MSG_TITLE, 'Original Current Contract Value (CLR Contract-Contract Currency) = ' + contractValueCLRCont_cont);

    var contractValueCLR_cust = record.getFieldValue('custrecord_swe_contract_value_clr'); //get Contract Value (CLR Customer Base Currency)
    contractValueCLR_cust = isNaN(contractValueCLR_cust) ? 0 : contractValueCLR_cust;
    nlapiLogExecution('DEBUG', MSG_TITLE, 'Original Current Contract Value (CLR Customer Base Currency) = ' + contractValueCLR_cust);
    
    var contractValueCLR_cont = record.getFieldValue('custrecord_swe_contract_value_clr2'); //get Contract Value (CLR Contract Base Currency)
    contractValueCLR_cont = isNaN(contractValueCLR_cont) ? 0 : contractValueCLR_cont;
    nlapiLogExecution('DEBUG', MSG_TITLE, 'Original Current Contract Value (CLR Contract Base Currency) = ' + contractValueCLR_cont);

    var annualContractValueGrossOLR = record.getFieldValue('custrecord_swe_annual_cv_gross_olr'); //get Annual Contract Value - Gross (OLR)
    annualContractValueGrossOLR = isNaN(annualContractValueGrossOLR) ? 0 : annualContractValueGrossOLR;
    nlapiLogExecution('DEBUG', MSG_TITLE, 'Original Annual Contract Value - Gross (OLR) = ' + annualContractValueGrossOLR);

    var annualContractValueGrossCLR_cust = record.getFieldValue('custrecord_swe_annual_cv_gross_clr'); //get Annual Contract Value - Gross (CLR Customer)
    annualContractValueGrossCLR_cust = isNaN(annualContractValueGrossCLR_cust) ? 0 : annualContractValueGrossCLR_cust;
    nlapiLogExecution('DEBUG', MSG_TITLE, 'Original Annual Contract Value - Gross (CLR Customer) = ' + annualContractValueGrossCLR_cust);
    
    var annualContractValueGrossCLR_cont = record.getFieldValue('custrecord_swe_annual_cv_gross_clr2'); //get Annual Contract Value - Gross (CLR Contract)
    annualContractValueGrossCLR_cont = isNaN(annualContractValueGrossCLR_cont) ? 0 : annualContractValueGrossCLR_cont;
    nlapiLogExecution('DEBUG', MSG_TITLE, 'Original Annual Contract Value - Gross (CLR Contract) = ' + annualContractValueGrossCLR_cont);

    var annualContractValueNetOLR = record.getFieldValue('custrecord_swe_annual_cv_net_olr'); //get Annual Contract Value - Net (OLR)
    annualContractValueNetOLR = isNaN(annualContractValueNetOLR) ? 0 : annualContractValueNetOLR;
    nlapiLogExecution('DEBUG', MSG_TITLE, 'Original Annual Contract Value - Net (OLR) = ' + annualContractValueNetOLR);

    var annualContractValueNetCLR_cust = record.getFieldValue('custrecord_swe_annual_cv_net_clr'); //get Annual Contract Value - Net (CLR Customer)
    annualContractValueNetCLR_cust = isNaN(annualContractValueNetCLR_cust) ? 0 : annualContractValueNetCLR_cust;
    nlapiLogExecution('DEBUG', MSG_TITLE, 'Original Annual Contract Value - Net (CLR Customer) = ' + annualContractValueNetCLR_cust);
    
    var annualContractValueNetCLR_cont = record.getFieldValue('custrecord_swe_annual_cv_net_clr2'); //get Annual Contract Value - Net (CLR Contract)
    annualContractValueNetCLR_cont = isNaN(annualContractValueNetCLR_cont) ? 0 : annualContractValueNetCLR_cont;
    nlapiLogExecution('DEBUG', MSG_TITLE, 'Original Annual Contract Value - Net (CLR Contract) = ' + annualContractValueNetCLR_cont);
	
    var annualRenewValGross = record.getFieldValue('custrecord_swe_annual_renew_val_gross'); //get Annual Renew Value (Gross)
    annualRenewValGross = isNaN(annualRenewValGross) ? 0 : annualRenewValGross;
    nlapiLogExecution('DEBUG', MSG_TITLE, 'Annual Renew Value (Gross) = ' + annualRenewValGross);
	
    var annualRenewValNet = record.getFieldValue('custrecord_swe_annual_renew_val_net'); //get Annual Renew Value (Net)
    annualRenewValNet = isNaN(annualRenewValNet) ? 0 : annualRenewValNet;
    nlapiLogExecution('DEBUG', MSG_TITLE, 'Annual Renew Value (Net) = ' + annualRenewValNet);
    
    var reneralTermRenewValGross = record.getFieldValue('custrecord_swe_term_renew_val_gross'); //get Renewal Term Renew Value (Gross)
    reneralTermRenewValGross = isNaN(reneralTermRenewValGross) ? 0 : reneralTermRenewValGross;
    nlapiLogExecution('DEBUG', MSG_TITLE, 'Renewal Term Renew Value (Gross) = ' + reneralTermRenewValGross);
    
    var reneralTermRenewValNet = record.getFieldValue('custrecord_swe_term_renew_val_net'); //get Renewal Term Renew Value (Net)
    reneralTermRenewValNet = isNaN(reneralTermRenewValNet) ? 0 : reneralTermRenewValNet;
    nlapiLogExecution('DEBUG', MSG_TITLE, 'Renewal Term Renew Value (Net) = ' + reneralTermRenewValNet);

    var newContractValue = getLatestContractValue(contractId); //get Latest Contract Value
    var contractRenewValues = getContractRenewValues(contractId); //get Latest Contract Renew Values
    
    //Current Contract Value (OLR Contract Currency)
    if (parseFloat(contractValueOLR) != parseFloatOrZero(newContractValue.currentCV_OLR)) {
        nlapiLogExecution('AUDIT', MSG_TITLE, 'Updating Current Contract Value (OLR Contract Currency) :: newContractValue.currentCV_OLR = ' + newContractValue.currentCV_OLR);
        nlapiSubmitField(recordType, contractId, 'custrecord_swe_contract_value_olr', newContractValue.currentCV_OLR);
    }
    //Current Contract Value (OLR Base Currency)
    if (parseFloat(contractValueOLRBase) != parseFloatOrZero(newContractValue.currentCV_OLR_base)) {
        nlapiLogExecution('AUDIT', MSG_TITLE, 'Updating Current Contract Value (OLR Base Currency) :: newContractValue.currentCV_OLR_base = ' + newContractValue.currentCV_OLR_base);
        nlapiSubmitField(recordType, contractId, 'custrecord_swe_contract_value_olr_base', newContractValue.currentCV_OLR_base);
    }
    //Current Contract Value (CLR Contract Currency)
    if (nlapiGetContext().getFeature('multicurrency') && record.getFieldValue('custrecord_swe_contract_currency') != 1) {
        nlapiLogExecution('AUDIT', MSG_TITLE, 'Will update Current Contract Value (CLR Contract Currency) via SWE_SS_UpdateContractValue...');
        nlapiSubmitField(recordType, contractId, 'custrecord_contract_is_updated', 'F');
    } else {
        if (parseFloat(contractValueCLRCont_cust) != parseFloatOrZero(newContractValue.currentCV_CLR_cust)) {
            nlapiLogExecution('AUDIT', MSG_TITLE, 'Updating Current Contract Value (CLR Customer-Contract Currency) :: newContractValue.currentCV_CLR_cust = ' + newContractValue.currentCV_CLR_cust);
            nlapiSubmitField(recordType, contractId, 'custrecord_swe_contract_value_clr_cont', newContractValue.currentCV_CLR_cust);
        }
        if (parseFloat(contractValueCLRCont_cont) != parseFloatOrZero(newContractValue.currentCV_CLR_cont)) {
            nlapiLogExecution('AUDIT', MSG_TITLE, 'Updating Current Contract Value (CLR Contract-Contract Currency) :: newContractValue.currentCV_CLR_cont = ' + newContractValue.currentCV_CLR_cont);
            nlapiSubmitField(recordType, contractId, 'custrecord_swe_contract_value_clr2_cont', newContractValue.currentCV_CLR_cont);
        }
    }
    //Current Contract Value (CLR Customer Base Currency)
    if (parseFloat(contractValueCLR_cust) != parseFloatOrZero(newContractValue.currentCV_CLR_cust)) {
        nlapiLogExecution('AUDIT', MSG_TITLE, 'Updating Current Contract Value (CLR Customer Base Currency) :: newContractValue.currentCV_CLR_cust = ' + newContractValue.currentCV_CLR_cust);
        nlapiSubmitField(recordType, contractId, 'custrecord_swe_contract_value_clr', newContractValue.currentCV_CLR_cust);
    }
    //Current Contract Value (CLR Contract Base Currency)
    if (parseFloat(contractValueCLR_cont) != parseFloatOrZero(newContractValue.currentCV_CLR_cont)) {
        nlapiLogExecution('AUDIT', MSG_TITLE, 'Updating Current Contract Value (CLR Contract Base Currency) :: newContractValue.currentCV_CLR_cont = ' + newContractValue.currentCV_CLR_cont);
        nlapiSubmitField(recordType, contractId, 'custrecord_swe_contract_value_clr2', newContractValue.currentCV_CLR_cont);
    }
    //Annual Contract Value - Gross (OLR)
    if (parseFloat(annualContractValueGrossOLR) != parseFloatOrZero(newContractValue.annualCVGross_OLR)) {
        nlapiLogExecution('AUDIT', MSG_TITLE, 'Updating Annual Contract Value - Gross (OLR) :: newContractValue.annualCVGross_OLR = ' + newContractValue.annualCVGross_OLR);
        nlapiSubmitField(recordType, contractId, 'custrecord_swe_annual_cv_gross_olr', newContractValue.annualCVGross_OLR);
    }
    //Annual Contract Value - Gross (CLR Customer)
    if (parseFloat(annualContractValueGrossCLR_cust) != parseFloatOrZero(newContractValue.annualCVGross_CLR_cust)) {
        nlapiLogExecution('AUDIT', MSG_TITLE, 'Updating Annual Contract Value - Gross (CLR Customer) :: newContractValue.annualCVGross_CLR_cust = ' + newContractValue.annualCVGross_CLR_cust);
        nlapiSubmitField(recordType, contractId, 'custrecord_swe_annual_cv_gross_clr', newContractValue.annualCVGross_CLR_cust);
    }
    //Annual Contract Value - Gross (CLR Contract)
    if (parseFloat(annualContractValueGrossCLR_cont) != parseFloatOrZero(newContractValue.annualCVGross_CLR_cont)) {
        nlapiLogExecution('AUDIT', MSG_TITLE, 'Updating Annual Contract Value - Gross (CLR Contract) :: newContractValue.annualCVGross_CLR_cont = ' + newContractValue.annualCVGross_CLR_cont);
        nlapiSubmitField(recordType, contractId, 'custrecord_swe_annual_cv_gross_clr2', newContractValue.annualCVGross_CLR_cont);
    }
    //Annual Contract Value - Net (OLR)
    if (parseFloat(annualContractValueNetOLR) != parseFloatOrZero(newContractValue.annualCVNet_OLR)) {
        nlapiLogExecution('AUDIT', MSG_TITLE, 'Updating Annual Contract Value - Net (OLR) :: newContractValue.annualCVNet_OLR = ' + newContractValue.annualCVNet_OLR);
        nlapiSubmitField(recordType, contractId, 'custrecord_swe_annual_cv_net_olr', newContractValue.annualCVNet_OLR);
    }
    //Annual Contract Value - Net (CLR Customer)
    if (parseFloat(annualContractValueNetCLR_cust) != parseFloatOrZero(newContractValue.annualCVNet_CLR_cust)) {
        nlapiLogExecution('AUDIT', MSG_TITLE, 'Updating Annual Contract Value - Net (CLR Customer) :: newContractValue.annualCVNet_CLR_cust = ' + newContractValue.annualCVNet_CLR_cust);
        nlapiSubmitField(recordType, contractId, 'custrecord_swe_annual_cv_net_clr', newContractValue.annualCVNet_CLR_cust);
    }
    //Annual Contract Value - Net (CLR Contract)
    if (parseFloat(annualContractValueNetCLR_cont) != parseFloatOrZero(newContractValue.annualCVNet_CLR_cont)) {
        nlapiLogExecution('AUDIT', MSG_TITLE, 'Updating Annual Contract Value - Net (CLR Contract) :: newContractValue.annualCVNet_CLR_cont = ' + newContractValue.annualCVNet_CLR_cont);
        nlapiSubmitField(recordType, contractId, 'custrecord_swe_annual_cv_net_clr2', newContractValue.annualCVNet_CLR_cont);
    }

	//Annual Renew Value (Gross)
    if (parseFloat(annualRenewValGross) != parseFloatOrZero(contractRenewValues.annualRVGross)) {
        nlapiLogExecution('AUDIT', MSG_TITLE, 'Updating Annual Renew Value (Gross) :: contractRenewValues.annualRVGross = ' + contractRenewValues.annualRVGross);
        nlapiSubmitField(recordType, contractId, 'custrecord_swe_annual_renew_val_gross', contractRenewValues.annualRVGross);
    }

	//Annual Renew Value (Net)
    if (parseFloat(annualRenewValNet) != parseFloatOrZero(contractRenewValues.annualRVNet)) {
        nlapiLogExecution('AUDIT', MSG_TITLE, 'Updating Annual Renew Value (Net) :: contractRenewValues.annualRVNet = ' + contractRenewValues.annualRVNet);
        nlapiSubmitField(recordType, contractId, 'custrecord_swe_annual_renew_val_net', contractRenewValues.annualRVNet);
    }

	//Renewal Term Renew Value (Gross)
    if (parseFloat(reneralTermRenewValGross) != parseFloatOrZero(contractRenewValues.renewalTermRVGross)) {
        nlapiLogExecution('AUDIT', MSG_TITLE, 'Updating Renewal Term Renew Value (Gross) :: contractRenewValues.renewalTermRVGross = ' + contractRenewValues.renewalTermRVGross);
        nlapiSubmitField(recordType, contractId, 'custrecord_swe_term_renew_val_gross', contractRenewValues.renewalTermRVGross);
    }

	//Renewal Term Renew Value (Net)
    if (parseFloat(reneralTermRenewValNet) != parseFloatOrZero(contractRenewValues.renewalTermRVNet)) {
        nlapiLogExecution('AUDIT', MSG_TITLE, 'Updating Renewal Term Renew Value (Net) :: contractRenewValues.renewalTermRVNet = ' + contractRenewValues.renewalTermRVNet);
        nlapiSubmitField(recordType, contractId, 'custrecord_swe_term_renew_val_net', contractRenewValues.renewalTermRVNet);
    }
}

function getLatestContractValue(contractId) {
    var MSG_TITLE = 'getLatestContractValue';

    var arrContractItemFilters = [
        new nlobjSearchFilter('custrecord_ci_contract_id', null, 'is', contractId),
        new nlobjSearchFilter('isinactive', null, 'is', 'F')
    ];

    var arrContractItemResults = nlapiSearchRecord(CUSTOMRECORD_CONTRACT_ITEM, 'customsearch_swe_ci_contract_value', arrContractItemFilters);
    if (!SWE.Library.misc.isUndefinedNullOrEmpty(arrContractItemResults)) {
        if (arrContractItemResults.length > 0) {
            var contractItemResult = arrContractItemResults[0];
            var arrContractItemColumns = contractItemResult.getAllColumns();
            var currentCV_OLR = contractItemResult.getValue(arrContractItemColumns[0]);
            var currentCV_OLR_base = contractItemResult.getValue(arrContractItemColumns[1]);
            var currentCV_CLR_cust = contractItemResult.getValue(arrContractItemColumns[2]);
            var currentCV_CLR_cont = contractItemResult.getValue(arrContractItemColumns[3]);
            var annualCVGross_OLR = contractItemResult.getValue(arrContractItemColumns[4]);
            var annualCVGross_CLR_cust = contractItemResult.getValue(arrContractItemColumns[5]);
            var annualCVGross_CLR_cont = contractItemResult.getValue(arrContractItemColumns[6]);
            var annualCVNet_OLR = contractItemResult.getValue(arrContractItemColumns[7]);
            var annualCVNet_CLR_cust = contractItemResult.getValue(arrContractItemColumns[8]);
            var annualCVNet_CLR_cont = contractItemResult.getValue(arrContractItemColumns[9]);
            nlapiLogExecution('DEBUG', MSG_TITLE, 'Current CV (OLR Contract Currency) = ' + currentCV_OLR + '\nCurrent CV (OLR Base Currency) = ' + currentCV_OLR_base
                    + '\n Current CV (CLR Customer Base Currency) = ' + currentCV_CLR_cust + '\n Current CV (CLR Contract Base Currency) = ' + currentCV_CLR_cont
                    + '\n Annual CV Gross (OLR) = ' + annualCVGross_OLR + '\n Annual CV Gross (CLR Customer) = ' + annualCVGross_CLR_cust + '\n Annual CV Gross (CLR Contract) = ' + annualCVGross_CLR_cont
                    + '\n Annual CV Net (OLR) = ' + annualCVNet_OLR + '\n Annual CV Net (CLR Customer) = ' + annualCVNet_CLR_cust  + '\n Annual CV Net (CLR Contract) = ' + annualCVNet_CLR_cont);
            /*if (!SWE.Library.misc.isUndefinedNullOrEmpty(currentCV_OLR) && !SWE.Library.misc.isUndefinedNullOrEmpty(currentCV_CLR) &&
                !SWE.Library.misc.isUndefinedNullOrEmpty(annualCVGross_OLR) && !SWE.Library.misc.isUndefinedNullOrEmpty(annualCVGross_CLR) &&
                !SWE.Library.misc.isUndefinedNullOrEmpty(annualCVNet_OLR) && !SWE.Library.misc.isUndefinedNullOrEmpty(annualCVNet_CLR)) {*/
                return { currentCV_OLR : currentCV_OLR, currentCV_OLR_base : currentCV_OLR_base, currentCV_CLR_cust : currentCV_CLR_cust, currentCV_CLR_cont : currentCV_CLR_cont, 
                	annualCVGross_OLR : annualCVGross_OLR, annualCVGross_CLR_cust : annualCVGross_CLR_cust, annualCVGross_CLR_cont : annualCVGross_CLR_cont, 
                	annualCVNet_OLR : annualCVNet_OLR, annualCVNet_CLR_cust : annualCVNet_CLR_cust, annualCVNet_CLR_cont : annualCVNet_CLR_cont};
            //}
        }
    }

    return { currentCV_OLR : 0, currentCV_OLR_base : 0, currentCV_CLR_cust : 0, currentCV_CLR_cont : 0, annualCVGross_OLR : 0, annualCVGross_CLR_cust : 0, annualCVGross_CLR_cont : 0, 
    		 annualCVNet_OLR : 0, annualCVNet_CLR_cust : 0, annualCVNet_CLR_cont : 0 }; //return zero if no contract items
}

/**
 * Computes for the following Contract fields.
 * 	- Annual Renew Value (Gross)
 *  - Annual Renew Value (Net)
 *  - Renewal Term Renew Value (Gross) 
 *  - Renewal Term Renew Value (Net)
 * 
 * @param {Object} contractId the Contract ID of the Contract
 */
function getContractRenewValues(contractId) {

    var arrContractItemFilters = [
        new nlobjSearchFilter('custrecord_ci_contract_id', null, 'is', contractId)
    ];

	/*
 	 * Use Saved Search: Contract Item Renewal Value Search
 	 * 
 	 * (if you just need to add filters for new Item Categories to handle, 
 	 * simply update the saved search)
 	 */
    var arrContractItemResults = nlapiSearchRecord(CUSTOMRECORD_CONTRACT_ITEM, 'customsearch_swe_ci_renewal_value', arrContractItemFilters);

    if (!SWE.Library.misc.isUndefinedNullOrEmpty(arrContractItemResults)) {
        if (arrContractItemResults.length > 0) {
            var contractItemResult = arrContractItemResults[0];
            var arrContractItemColumns = contractItemResult.getAllColumns();
            var annualRVGross = contractItemResult.getValue(arrContractItemColumns[0]);
            var annualRVNet = contractItemResult.getValue(arrContractItemColumns[1]);
            var renewalTermRVGross = contractItemResult.getValue(arrContractItemColumns[2]);
            var renewalTermRVNet = contractItemResult.getValue(arrContractItemColumns[3]);

            nlapiLogExecution('DEBUG', 'getContractRenewValues', 'Annual RV (Gross) = ' + annualRVGross+ '\n Annual RV (Net) = ' + annualRVNet
                    + '\n Renewal Term RV (Gross) = ' + renewalTermRVGross+ '\n Renewal Term RV (Net) = ' + renewalTermRVNet);

            return { annualRVGross : annualRVGross, annualRVNet : annualRVNet, renewalTermRVGross : renewalTermRVGross, renewalTermRVNet : renewalTermRVNet };
        }
    }

    /*
     * Just return 0 for all values if no Contract Item records retrieved
     */
    return { annualRVGross : 0, annualRVNet : 0, renewalTermRVGross : 0, renewalTermRVNet : 0  };
}

function SearchFilters(){
    this.filters = new Array();
}

SearchFilters.prototype.addFilter = function(name, join, operator, value1, value2){
    this.filters[this.filters.length] = new nlobjSearchFilter(name, join, operator, value1, value2);
};

function SearchColumns(){
    this.columns = new Array();
}

SearchColumns.prototype.addColumn = function(name, join, summary){
    this.columns[this.columns.length] = new nlobjSearchColumn(name, join, summary);
};

function parseFloatOrZero(f) {
    var r=parseFloat(f);
    return isNaN(r) ? 0 : r;
};
