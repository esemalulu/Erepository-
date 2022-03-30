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
var SEGMENT_SOURCED_BY_SALESREP = '1'
var SEGMENT_SOURCED_BY_ORDERTYPE = '2'
var SEGMENT_SOURCED_BY_PRODLINE = '3'
var SEGMENT_SOURCED_BY_NONE = '4';

// Renewal Assign To Type
var ASSIGN_TO_TYPE_CUST_SALES_REP = '1';
var ASSIGN_TO_TYPE_EMPLOYEE = '2';

// Bill to tier types
var BILL_TO_TIER_END_USER = '1';
var BILL_TO_TIER_RESELLER = '2';
var BILL_TO_TIER_DISTRIBUTOR = '3';

// Order Types
var ORDER_TYPE_RENEWAL = '2';
var ORDER_TYPE_RENEWAL_MANUAL = '6';

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

// Contract Types
var CONTRACT_TYPE_MAINTENANCE = "1";
var CONTRACT_TYPE_SUPPORT = "2";
var CONTRACT_TYPE_LICENSE = "3";

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

// End Date Types
var END_DATE_EARLIEST = '1';
var END_DATE_LATEST = '2';

// Yes/No
var YES = '1';
var NO = '2';

// M/S Models
var MS_MODEL_PERCENTAGE = '1';
var MS_MODEL_ITEMIZED = '2';
var MS_MODEL_PERCENTAGE_NET = '8';

// Check Log Types
var CHECK_LOG_TYPE_INSTALL_BASE = '1';
var CHECK_LOG_TYPE_TRANSFORM = '2';
var CHECK_LOG_TYPE_EMAIL_TRAN = '3';
var CHECK_LOG_TYPE_FULFILL = '4';

// Password Generation Types
var PWD_GEN_TYPE_RANDOM = '1';
var PWD_GEN_TYPE_FNAME_1 = '2';
var PWD_GEN_TYPE_FNAME_RANDOM = '3';

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

/**********************************
 * functions                       *
 ***********************************/
/**
 * This computes the number of months between two dates
 *
 * @param (string) dtStartDate The starting date
 * @param (string) dtEndDate The ending date
 * @throws nlobjError No Customer definition found for subsidiary.
 * @author Michael Franz V. Sumulong
 * @version 1.0
 */
function computeTermInMonths(dtStartDate, dtEndDate)
{

    // Make sure that the start date is provided.
    if ((dtStartDate == '' || dtStartDate == null || dtStartDate == undefined)
            || (dtEndDate == '' || dtEndDate == null || dtEndDate == undefined))
    {
        return null;
    }

    dtStartDate = nlapiStringToDate(dtStartDate);
    dtEndDate = nlapiStringToDate(dtEndDate);
    dtEndDate = nlapiAddDays(dtEndDate,1);
 
    // value is converted to months              sec    min  hr   day  year  month
    //return Math.round((dtEndDate - dtStartDate) / 1000 / 60 / 60 / 24 / 365.25 * 12);

    var m1 = dtStartDate.getMonth() + 1;
    var m2 = dtEndDate.getMonth() + 1;
    var d1 = dtStartDate.getDate();
    var d2  = dtEndDate.getDate();
    var y1 = dtStartDate.getFullYear();
    var y2 = dtEndDate.getFullYear();

    var months = 0;

    for(var a=m1,b=y1; ; a++, months++){
        if(a == m2 && b == y2){break;};
        a = a % 12;
        if(a==0){b++};
    }

    if(d2 < d1){
       months--;
    }
    
    /* Round up if needed */
    if(d2 != d1)
    {
    	if(Math.abs((d1-d2)/30)>=0.5)
    	{
    	    months++;
    	}
    }

    return months;
}


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
 * This computes the total discount amount of transaction lines having the same product line & item category
 *
 * @param (string) arrItemCat The list of item categories to lookup
 * @param (string) stProdLine The Product Line to match
 * @return (float) The total discount amount calculated
 * @author Michael Franz V. Sumulong
 * @version 1.0
 */
function computeTotalDiscountAmount(arrItemCat, stProdLine)
{

    var iLineCount = nlapiGetLineItemCount('item');
    var flTotalDiscAmt = 0.00;
	var bLastItemIncluded = false;
    for (var idx = 1; idx <= iLineCount; idx++)
    {
        var stItemType = nlapiGetLineItemValue('item', 'itemtype', idx);
        var stItemCat = nlapiGetLineItemValue('item', 'custcol_item_category', idx);
        var stCurProdLine = nlapiGetLineItemValue('item', 'custcol_product_line', idx);
        var stOptOut = nlapiGetLineItemValue('item', 'custcol_opt_out_ms', idx);
		
        if (stItemType == 'Discount' || stItemType == 'Markup') 
		{
			if(bLastItemIncluded){
				var flCurDiscAmt = nlapiGetLineItemValue('item','amount',idx);
				if(flCurDiscAmt == null || flCurDiscAmt == undefined || flCurDiscAmt == ''){
					flCurDiscAmt = 0.00;
				}else{
					flCurDiscAmt = parseFloat(flCurDiscAmt);
				}
				flTotalDiscAmt = flTotalDiscAmt + flCurDiscAmt;
			}
		}

        if (searchInList(arrItemCat, stItemCat) && stCurProdLine == stProdLine && stOptOut != 'T')
        {
			bLastItemIncluded = true;
        }
		else
		{
	        if (stItemType != 'Discount' 
				&& stItemType != 'Markup' 
				&&	stItemType != 'Description' 
				&&	stItemType != 'Subtotal' 
				&&	stItemType != 'Kit' 
				&&	stItemType != 'Payment' 
				&&	stItemType != 'Group' 
				&& stItemType != 'EndGroup' 
				&& stItemType != null) 
			{
				bLastItemIncluded = false;				
			}
		}
    }
    return flTotalDiscAmt;
}

/**
 * This determines the discount/markup rate from the transaction based on the tran line index provided.
 *
 * @param (nlobjRecord) salesorder record
 * @param (int) item tran line index
 * @return (float) The discount/markup rate
 * @author Michael Franz V. Sumulong
 * @version 1.0
 */
function getTranLineDiscountMarkupRate(recSO, intTranLineIndex)
{
    nlapiLogExecution('DEBUG','getTranLineDiscountMarkupRate','intTranLineIndex='+intTranLineIndex);

    var flDiscountRate = 0;
    var flInlineDiscount = recSO.getLineItemValue('item','custcol_inline_discount',intTranLineIndex);
    if(flInlineDiscount != null && flInlineDiscount != '' && flInlineDiscount != undefined)
    {
        flDiscountRate = parseFloat(flInlineDiscount);
    }
    
// This is now replaced by the inline discounting
//    var iLineCount = recSO.getLineItemCount("item");
//    var flDiscountRate = 0;
//    nlapiLogExecution('DEBUG','getTranLineDiscountMarkupRate','iLineCount='+iLineCount);
//
//    for(var idx = intTranLineIndex + 1; idx <= iLineCount; idx++)
//    {
//        var stCurItemType = recSO.getLineItemValue('item', 'itemtype', idx);
//        nlapiLogExecution('DEBUG','getTranLineDiscountMarkupRate','stCurItemType='+stCurItemType);
//        
//        if (stCurItemType == 'Discount' || stCurItemType == 'Markup')
//        {
//            /* If this is directly following the index provided, then use it. */
//            if (idx == intTranLineIndex + 1) 
//            {
//                nlapiLogExecution('DEBUG','getTranLineDiscountMarkupRate','idx == intTranLineIndex + 1');
//                flDiscountRate = recSO.getLineItemValue('item', 'rate', idx);
//                break;
//            }else
//            {
//                nlapiLogExecution('DEBUG','getTranLineDiscountMarkupRate','Prior Current Item Type='+recSO.getLineItemValue('item', 'itemtype', idx - 1));
//                /* Check for the first subtotal that is followed by a discount/markup and use it. */
//                if(recSO.getLineItemValue('item', 'itemtype', idx - 1) == 'Subtotal')
//                {
//                    flDiscountRate = recSO.getLineItemValue('item', 'rate', idx);
//                    break;
//                }
//            }
//        }
//    }

    nlapiLogExecution('DEBUG','getTranLineDiscountMarkupRate','flDiscountRate='+flDiscountRate);
    return flDiscountRate;
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
function searchInList(arrList, varObj)
{
    var bIsFound = false;

    for (var i in arrList)
    {
        if (arrList[i] == varObj)
        {
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
 * This script generates a random string of alphanumeric characters with the requested length.
 *
 * @param (string) intLength The length of the password to be generated
 * @return (string) The password generated
 * @author Michael Franz V. Sumulong
 * @version 1.0
 */
function passwordGenerator(intLength)
{
    var stAlphabet = 'abcdefghijklmnopqrstuvwxyz';
    var stPassword = stAlphabet.charAt(Math.round(Math.random() * 26));

    for (var i = 0; i < intLength; i++)
    {
        if (Math.round(Math.random()) > 0)
        {
            if (Math.round(Math.random()) > 0)
            {
                stPassword = stPassword.concat(stAlphabet.charAt(Math.round(Math.random() * 26)));
            }
            else
            {
                stPassword = stPassword.concat(stAlphabet.charAt(Math.round(Math.random() * 26)).toUpperCase());
            }
        }
        else
        {
            stPassword = stPassword.concat(Math.round(Math.random() * 10));
        }
    }

    return stPassword;
}


/**
 * Adds a transaction in the check log if it isn't there yet.
 *
 * @param (string) stTranId The transaction to be inserted
 * @param (string) stCheckLogType The Type of check log entry
 * @param (string) stCheckLogStatus The defaulted status
 * @return obj Returns null if no record was created, else returns the id for the new record
 * @author Michael Franz V. Sumulong
 * @version 1.0
 */
function insertToCheckLog(stTranId, stCheckLogType, stCheckLogStatus)
{
    /* Check if the transaction is already in the check log */
    var arrCheckLogFilters = [
        new nlobjSearchFilter('custrecord_transaction', null, 'is', stTranId),
        new nlobjSearchFilter('isinactive', null, 'is', 'F'),
        new nlobjSearchFilter('custrecord_check_log_type', null, 'is', stCheckLogType)
    ];
    var arrCheckLogColumns = [new nlobjSearchColumn('custrecord_transaction', null, 'count')];
    var arrCheckLogResults = nlapiSearchRecord('customrecord_check_log', '', arrCheckLogFilters, arrCheckLogColumns);
    var bIsLogged = false;
    if (arrCheckLogResults)
    {
        if (arrCheckLogResults[0].getValue('custrecord_transaction', null, 'count') > 0)
        {
            /* Since this transaction was already logged before, skip it. */
            bIsLogged = true;
        }
    }

    if (!bIsLogged)
    {
        var recCheckLog = nlapiCreateRecord('customrecord_check_log');

        recCheckLog.setFieldValue('custrecord_check_log_status', stCheckLogStatus);
        recCheckLog.setFieldValue('custrecord_transaction', stTranId);
        recCheckLog.setFieldValue('custrecord_check_log_type', stCheckLogType);

        var stCheckLogId = nlapiSubmitRecord(recCheckLog, true, false);
    }
    return stCheckLogId;
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
    }

    this.unindent = function Logger_unindent()
    {
        intTabs--;
    }

    /**
     * Enable printing of DEBUG type messages
     *
     * @author Nestor M. Lim
     * @version 1.0
     */
    this.enableDebug = function Logger_enableDebug()
    {
        bEnableDebug = true;
    }

    /**
     * Disable printing of DEBUG type messages
     *
     * @author Nestor M. Lim
     * @version 1.0
     */
    this.disableDebug = function Logger_disableDebug()
    {
        bEnableDebug = false;
    }

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
        if (isEmpty(stType))
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
    }

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
    }

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
    }

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
    }

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
    }
}

/**
 * Determines if a string variable is empty or not.  An empty string variable
 * is one which is null or undefined or has a length of zero.
 *
 * @param (string) stValue The string value to test for emptiness.
 * @return true if the variable is empty, false if otherwise.
 * @type boolean
 * @throws nlobjError isEmpty should be passed a string value.  The data type passed is {x} whose class name is {y}
 * @author Nestor M. Lim
 * @see isNullOrUndefined
 * @version 1.5
 */
function isEmpty(stValue)
{
    if (isNullOrUndefined(stValue))
    {
        return true;
    }

    if (typeof stValue != 'string' && getObjectName(stValue) != 'String')
    {
        throw nlapiCreateError('10000', 'isEmpty should be passed a string value.  The data type passed is ' + typeof stValue + ' whose class name is ' + getObjectName(stValue));
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
}

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
 * Batch Scheduler Lib
 */
/**
 * This function should be used for Scheduled scripts to be able to run to complete
 *
 * @author Michael Franz V. Sumulong
 * @version 1.0
 */
function BatchScheduler(ScriptID, DeploymentID, PointsThresholdPercentage)
{
    var logger    = new Logger(false);
    var MSG_TITLE = 'Batch Scheduler Object';
    //logger.enableDebug(); // comment this line to turn debugging off.

    var iThreshold              = (PointsThresholdPercentage == undefined) ? 20 : PointsThresholdPercentage; // Percent
    var iCurSection             = 0;
    var iCurParagraph           = 0;
    var iLastParagraph          = 0;
    var iLastSection            = 0;
    var stScriptID              = ScriptID;
    var stDeployID              = (DeploymentID == null || DeploymentID == undefined) ? '' : DeploymentID;
    var bIsNewRun               = true;
    var dtStart                 = new Date();
    var iStartTime              = new Date().getTime();
    var iInitialUsagePoints     = nlapiGetContext().getRemainingUsage();
    var stRunVars               = '';
    var arrAveUsagePerParagraph = new Array();
    var iCurInitialUsagePoints  = 0;
    var funcVariableSetter      = null;
    var bForTermination         = false;
    var bHasError               = false;
    var stSSTrackerID           = '';

	var startTimeInSecs = (new Date( )).getTime( ) / 1000;      

    this.errorOccurred = function () {
        bHasError = true;
    }

    this.setBForTermination = function() {
        bForTermination = true;  
    } 

    this.unsetBForTermination = function() {
        bForTermination = false;  
    } 

    this.isBForTermination = function() {
        return bForTermination;
    }

	/**
	 * Check wether the run is a new execution of the script. If not a new execution, 
	 * get all variables and reprocess the script considering the variables saved by 
	 * the previous execution of the script.
	 */
    this.begin = function () {
        logger.debug(MSG_TITLE, 'Initialize Batch Scheduler Object for script (' + stScriptID + ')');

        /* Check if this is a new run or not */
        var arrSSFilter = [
            new nlobjSearchFilter('custrecord_suitescript_run_status', null, 'is', SS_STATUS_INCOMPLETE),
            new nlobjSearchFilter('custrecord_ss_tracking_deploy_id',  null, 'is', stDeployID),
            new nlobjSearchFilter('custrecord_suitescript_script_id',  null, 'is', stScriptID)
        ];
        var arrSSColumn = [
            new nlobjSearchColumn('custrecord_suitescript_script_id'),
            new nlobjSearchColumn('custrecord_ss_tracking_deploy_id'),
            new nlobjSearchColumn('custrecord_suitescript_run_status'),
            new nlobjSearchColumn('custrecord_suitescript_initial_run_date'),
            new nlobjSearchColumn('custrecord_suitescript_initial_run_time'),
            new nlobjSearchColumn('custrecord_suitescript_paragraph'),
            new nlobjSearchColumn('custrecord_suitescript_section'),
            new nlobjSearchColumn('custrecord_suitescript_last_run_time'),
            new nlobjSearchColumn('custrecord_suitescript_last_run_date'),
            new nlobjSearchColumn('custrecord_suitescript_last_run_vars'),
            new nlobjSearchColumn('custrecord_ss_ave_par_pt_usage')
        ];
        var arrSSResults = nlapiSearchRecord('customrecord_scheduled_script_tracker', null, arrSSFilter, arrSSColumn);

        if (arrSSResults != null && arrSSResults != undefined && arrSSResults != '') {
            if (arrSSResults.length > 0) {
                logger.debug(MSG_TITLE, 'This is not a new run.');
                
                bIsNewRun      = false;
                stSSTrackerID  = arrSSResults[0].getId();
                var recObj     = nlapiLoadRecord('customrecord_scheduled_script_tracker',stSSTrackerID);
                
                iLastParagraph = recObj.getFieldValue('custrecord_suitescript_paragraph');
                iLastSection   = recObj.getFieldValue('custrecord_suitescript_section');
                stRunVars      = recObj.getFieldValue('custrecord_suitescript_last_run_vars');
                
                arrAveUsagePerParagraph = splitList(recObj.getFieldValue('custrecord_ss_ave_par_pt_usage'));
                
                logger.debug(MSG_TITLE,
                        'Run Values:'
                                + '\n' + 'Tracker ID:' + stSSTrackerID
                                + '\n' + 'Paragraph:' + iLastParagraph
                                + '\n' + 'Section:' + iLastSection
                                + '\n' + 'Variables:' + stRunVars
                                + '\n' + 'Paragraph Point Usage:' + arrAveUsagePerParagraph
                        );
            }
        }
    }

    /**
     * This is used to determine if a part of the script should be executed or not.
     * @param iAveUsagePoints
     */
    this.startParagraph = function(iAveUsagePoints) {

        /* If already for Termination skip it */
        if (bForTermination) {
            logger.debug(MSG_TITLE, 'Skipping because script is set for termination.');
            return false;
        }

        var bShouldProceed = true;
        
        iCurParagraph++;
        iCurInitialUsagePoints = nlapiGetContext().getRemainingUsage();

        /* Determine what the Average Usage Point is upon starting. */
        if (arrAveUsagePerParagraph[iCurParagraph] == undefined) {
            if (iAveUsagePoints != undefined) {
                arrAveUsagePerParagraph[iCurParagraph] = iAveUsagePoints;
            } else {
                arrAveUsagePerParagraph[iCurParagraph] = 0;
            }
        } else {
            if (iAveUsagePoints != undefined) {
                if (arrAveUsagePerParagraph[iCurParagraph] < iAveUsagePoints) {
                    arrAveUsagePerParagraph[iCurParagraph] = iAveUsagePoints;
                }
            }
        }
        logger.debug(MSG_TITLE, 'Average Usage Points for Paragraph ' + iCurParagraph + ': ' + arrAveUsagePerParagraph[iCurParagraph]);

        /* Check first if there is enough usage points or time remaining */
        if (((iCurInitialUsagePoints / iInitialUsagePoints) * 100) <= iThreshold) {
            bForTermination = true;
            bShouldProceed  = false;
        } else {
			var nowTimeInSecs = (new Date( )).getTime( ) / 1000;      
			if (((nowTimeInSecs - startTimeInSecs) / 3600) * 100 >= (100 - iThreshold)) {
                bForTermination = true;
                bShouldProceed = false;
			}	
					
            if ((((iCurInitialUsagePoints - arrAveUsagePerParagraph[iCurParagraph]) / iInitialUsagePoints) * 100) <= iThreshold) {
                bForTermination = true;
                bShouldProceed  = false;
            }
        }

        /* Issue termination routine. */
        if (bForTermination) {
            return false;
        }

        if (bShouldProceed) {
            if (iCurParagraph < iLastParagraph) {
                bShouldProceed = false;
            }
        }

        if (bShouldProceed) {
            logger.debug(MSG_TITLE, 'Processing paragraph ' + iCurParagraph);
        } else {
            logger.debug(MSG_TITLE, 'Skipping paragraph ' + iCurParagraph);
        }
        return bShouldProceed;
    }

    /**
     * This is used whenever a paragraph ends or iterates. This script determines if it should continue or skip processing.
     */
    this.endParagraph = function() {

        var bStopProcessing = false;

        /* If already for termination skip it */
        if (bForTermination) {
            return true;
        }

        /* Calculate the usage points used. */
        var iUsage = iCurInitialUsagePoints - nlapiGetContext().getRemainingUsage();
        
        logger.debug(MSG_TITLE, 'Current Paragraph run usage: ' + iUsage);
        if (arrAveUsagePerParagraph[iCurParagraph] < iUsage) {
            arrAveUsagePerParagraph[iCurParagraph] = iUsage;
        }

        /* Check first if there is enough usage points or time remaining */
        if (((iCurInitialUsagePoints / iInitialUsagePoints) * 100) <= iThreshold) {
            bStopProcessing = true;
            bForTermination = true;
        } else {
			var nowTimeInSecs = (new Date( )).getTime( ) / 1000;      
			if (((nowTimeInSecs - startTimeInSecs) / 3600) * 100 >= (100 - iThreshold)) {
                bStopProcessing = true;
                bForTermination = true;
			}			
			
            if ((((iCurInitialUsagePoints - arrAveUsagePerParagraph[iCurParagraph]) / iInitialUsagePoints) * 100) <= iThreshold) {
                bStopProcessing = true;
                bForTermination = true;
            }
        }

        /* Issue termination routine. */
        if (bForTermination) {
            return true;
        }

        iCurInitialUsagePoints = nlapiGetContext().getRemainingUsage();
        return bStopProcessing;
    }

    /**
     * Sets the function to call in order to save the needed variables
     * @param objFunc
     */
    this.setVariableFunction = function(objFunc) {
        funcVariableSetter = objFunc;
    }

    /**
     * This sets/creates the Suitescript Tracker record.
     * @param stStatus
     */
    this.end = function() {
        var stStatus = '';
        
        if (bHasError) {
            stStatus = SS_STATUS_ERROR;
        } else {
            if (bForTermination) {
                stStatus = SS_STATUS_INCOMPLETE;
            } else {
                // add 1 to Paragraph to make sure that everything has been finished.
                iCurParagraph++;
                stStatus = SS_STATUS_COMPLETE
            }
        }

        if (bIsNewRun) {
            logger.debug(MSG_TITLE, 'Adding new SS Tracker.');
            var recSSTracker = nlapiCreateRecord('customrecord_scheduled_script_tracker');
            recSSTracker.setFieldValue('custrecord_ss_tracking_deploy_id',        stDeployID);
            recSSTracker.setFieldValue('custrecord_suitescript_script_id',        stScriptID);
            recSSTracker.setFieldValue('custrecord_suitescript_run_status',       stStatus);
            recSSTracker.setFieldValue('custrecord_suitescript_initial_run_date', nlapiDateToString(dtStart));
            recSSTracker.setFieldValue('custrecord_suitescript_initial_run_time', (dtStart.getHours() > 12 ? dtStart.getHours() - 11 : dtStart.getHours()) + ':' + dtStart.getMinutes() + ' ' + (dtStart.getHours() >= 12 ? 'pm' : 'am'));
            recSSTracker.setFieldValue('custrecord_suitescript_paragraph',        iCurParagraph);
            recSSTracker.setFieldValue('custrecord_suitescript_section',          iCurSection);
            recSSTracker.setFieldValue('custrecord_suitescript_last_run_date',    nlapiDateToString(dtStart));
            recSSTracker.setFieldValue('custrecord_suitescript_last_run_time',    (dtStart.getHours() > 12 ? dtStart.getHours() - 11 : dtStart.getHours()) + ':' + dtStart.getMinutes() + ' ' + (dtStart.getHours() >= 12 ? 'pm' : 'am'));
            recSSTracker.setFieldValue('custrecord_suitescript_last_run_vars',    (funcVariableSetter == null) ? '' : funcVariableSetter());
            recSSTracker.setFieldValue('custrecord_ss_ave_par_pt_usage',          arrAveUsagePerParagraph.toString());
            stSSTrackerID = nlapiSubmitRecord(recSSTracker, true);
            logger.debug(MSG_TITLE, 'SS Tracker ID:' + stSSTrackerID);
        }
        else
        {
            logger.debug(MSG_TITLE, 'Updating SS Tracker.');
            var arrFieldsToUpdate = [
                'custrecord_suitescript_run_status',
                'custrecord_suitescript_paragraph',
                'custrecord_suitescript_section',
                'custrecord_suitescript_last_run_date',
                'custrecord_suitescript_last_run_time',
                'custrecord_suitescript_last_run_vars',
                'custrecord_ss_ave_par_pt_usage'
            ];
            var arrFieldValues = [
                stStatus,
                iCurParagraph,
                iCurSection,
                nlapiDateToString(dtStart),
                (dtStart.getHours() > 12 ? dtStart.getHours() - 11 : dtStart.getHours()) + ':' + dtStart.getMinutes() + ' ' + (dtStart.getHours() >= 12 ? 'pm' : 'am'),
                (funcVariableSetter == null) ? '' : funcVariableSetter(),
                arrAveUsagePerParagraph.toString()
            ];
            nlapiSubmitField('customrecord_scheduled_script_tracker', stSSTrackerID, arrFieldsToUpdate, arrFieldValues, true);
        }

    }

    this.getVariables = function()
    {
        if (bIsNewRun)
        {
            return null;
        }
        else
        {
            try
            {
                if (stRunVars != null && stRunVars != undefined && stRunVars != '')
                {
                    var tmp = eval(stRunVars);
                }
                else
                {
                    return null;
                }
            }
            catch(ex)
            {
                logger.error(MSG_TITLE, 'An error occurred during retrieval of Run Vars.\n' + ex.toString());
                return null;
            }
            return tmp;
        }
    }
}


/**
 * Computes for the Product's current List Rate
 *
 * @param (string) Product ID
 * @param (array)  Item Categories to process
 * @param (string) Co-Term Date
 * @param (string) M/S Model
 * @return (float) The product's current list rate.
 * @type boolean
 * @author Michael Sumulong
 * @version 1.0
 */
function getProductCurrentListRate(stProdId,arrItemCatsToCompute, MS_MODEL, stCoTermDate ){

    var logger = new Logger(true);
    var MSG_TITLE = 'Batch Scheduler Object';
    //logger.enableDebug(); // comment this line to turn debugging off.

    logger.debug(MSG_TITLE, 'Computing Product Current List Rate.');

    var flNewCurrentProdRate = 0;
    var arrContractAmtColumns = [
        new nlobjSearchColumn('custrecord_orignal_list_rate'),
        new nlobjSearchColumn('custrecord_original_discount'),
        new nlobjSearchColumn('custrecord_item_category'),
        new nlobjSearchColumn('custrecord_quantity')
    ];
    var arrContractAmtFilters = [
        new nlobjSearchFilter('custrecord_install_base_product', null, 'is', stProdId),
        new nlobjSearchFilter('custrecord_install_base_start_date',   '', 'isnotempty'),
        new nlobjSearchFilter('custrecord_install_base_synch_status', null, 'is', SYNCH_STATUS_ACTIVE),
        new nlobjSearchFilter('isinactive', null, 'is', 'F'),
        new nlobjSearchFilter('custrecord_install_base_opt_out_ms', null, 'is', 'F')
    ];

    if(stCoTermDate != null && stCoTermDate != undefined && stCoTermDate != ''){
        logger.debug(MSG_TITLE, 'Adding filter for Co-Term Date');
        arrContractAmtFilters.push(new nlobjSearchFilter('custrecord_install_base_start_date', null, 'onorbefore', stCoTermDate));
    }

    var arrContractAmtResults = nlapiSearchRecord('customrecord_install_base', null, arrContractAmtFilters, arrContractAmtColumns);
    logger.debug(MSG_TITLE, 'Loop through contracts');
    logger.indent();
    if (arrContractAmtResults != null && arrContractAmtResults != undefined && arrContractAmtResults != '')
    {

        for (var x = 0; x < arrContractAmtResults.length; x++)
        {
            logger.debug(MSG_TITLE, 'Looping through contract ' + arrContractAmtResults[x].getId());
            if (searchInList(arrItemCatsToCompute, arrContractAmtResults[x].getValue('custrecord_item_category')))
            {
                logger.debug(MSG_TITLE, 'Including this to computation');
                var flContractQty = arrContractAmtResults[x].getValue('custrecord_quantity');
                var flContractListRate = arrContractAmtResults[x].getValue('custrecord_orignal_list_rate');
                logger.debug(MSG_TITLE, 'flContractQty=' + flContractQty);
                logger.debug(MSG_TITLE, 'flContractListRate=' + flContractListRate);
                flContractQty = parseFloatOrZero(flContractQty);
                flContractListRate = parseFloatOrZero(flContractListRate);

                /* Deduct discount if needed */
                if(MS_MODEL_PERCENTAGE_NET == MS_MODEL)
                {
                    /* Get the discount rate */    
                    var flDiscountRate = arrContractAmtResults[x].getValue('custrecord_original_discount');
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
                   
                    logger.debug(MSG_TITLE, 'flDiscountRate=' + flDiscountRate);
                    if (flDiscountRate != 0) 
                    {
                        flContractListRate = flContractListRate * (1 - flDiscountRate);
                    }
                    logger.debug(MSG_TITLE, 'flContractListRate - discount =' + flContractListRate);
                }

                flNewCurrentProdRate += flContractQty * flContractListRate;
                logger.debug(MSG_TITLE, 'Running Total:' + flNewCurrentProdRate);
            }
        }
    }
    logger.unindent();

    return flNewCurrentProdRate;
}


/**
 * Computes for the Product's CPR value
 *
 * @param {Object} stCurCustomerId
 * @param {Object} stProdId
 * @param {Object} recProd
 * @param {Object} stProductMSItemId
 * @param {Object} arrItemCatsTerm
 * @param {Object} arrItemCatsPerpetual
 * @param {Object} arrItemCatsToCompute
 * @param {Object} CO_TERM_BASIS
 * @param {Object} MS_MODEL
 * @return (percent) The product's CPR.
 * @author Michael Sumulong
 * @version 1.0
 */
function getCPRValue(stCurCustomerId, stProdId, recProd, stProductMSItemId, arrItemCatsTerm, arrItemCatsPerpetual,arrItemCatsToCompute, CO_TERM_BASIS, MS_MODEL){

    var logger = new Logger(true);
    var MSG_TITLE = 'Batch Scheduler Object';
    //logger.enableDebug(); // comment this line to turn debugging off.
                                                  
    logger.debug(MSG_TITLE,'Compute for CPR Value');
    /* Compute for the CPR value */
    var stCPR = '100%';
    var stProdItemCat = recProd.getValue('custrecord_product_item_category');
    var stProdEndUser = recProd.getValue('custrecord_end_user');
    logger.debug(MSG_TITLE,'Product Item Category=' + stProdItemCat);
    var flMSPercent = parseFloatOrZero(nlapiLookupField('item',stProductMSItemId,'custitem_m_s_percentage'));
    logger.debug(MSG_TITLE,'M/S %=' + flMSPercent);

    if(flMSPercent != null && flMSPercent != undefined && flMSPercent != '' && flMSPercent != 0){

        /* Processing for License - Term / Support Use Case */
        // No need to compute for these because they are always computed realtime using the licenses being renewed

        /* Processing for License - Perpetual / Maintenance Use Case */
        if (searchInList(arrItemCatsPerpetual, stProdItemCat)){

            logger.debug(MSG_TITLE,'Computing for License Perpetual / Maintenance');

            /* Get Co-Term End Dates */
            var arrMaintEndDatesColumns = [
                new nlobjSearchColumn('custrecord_install_base_end_date', null, 'max'),
                new nlobjSearchColumn('custrecord_install_base_end_date', null, 'min')
            ];
            var arrMaintEndDatesFilters = [
                new nlobjSearchFilter('custrecord_install_base_synch_status', null, 'anyof', [SYNCH_STATUS_EXPIRED,SYNCH_STATUS_ACTIVE]),
                new nlobjSearchFilter('custrecord_install_base_end_date', null, 'isnotempty'),
                new nlobjSearchFilter('custrecord_install_base_bill_to_customer', null, 'is', stCurCustomerId),
                new nlobjSearchFilter('isinactive', null, 'is', 'F')
            ];
            if(arrItemCatsPerpetual != null && arrItemCatsPerpetual != undefined && arrItemCatsPerpetual != ''){
                if(arrItemCatsPerpetual.length > 0){
                    logger.debug(MSG_TITLE, 'Adding filter for Perpetual Item Cats');
                    arrMaintEndDatesFilters.push(new nlobjSearchFilter('custrecord_item_category', null, 'noneof', arrItemCatsPerpetual));
                }
            }
            if(stProdEndUser != null && stProdEndUser != undefined && stProdEndUser != ''){
                logger.debug(MSG_TITLE, 'End User is not empty.');
                arrMaintEndDatesFilters.push(new nlobjSearchFilter('custrecord_ib_end_user', null, 'is', stProdEndUser));
            }else{
                logger.debug(MSG_TITLE, 'End User is empty.');
                arrMaintEndDatesFilters.push(new nlobjSearchFilter('custrecord_ib_end_user', null, 'is', '@NONE@'));
            }

            var arrMaintEndDatesResults = nlapiSearchRecord('customrecord_install_base', null, arrMaintEndDatesFilters, arrMaintEndDatesColumns);

            if (arrMaintEndDatesResults)
            {
                var stMaintEndDateEarliest = arrMaintEndDatesResults[0].getValue('custrecord_install_base_end_date', null, 'min');
                var stMaintEndDateLatest = arrMaintEndDatesResults[0].getValue('custrecord_install_base_end_date', null, 'max');
                var flProratedRate = 0;
                
                var stCoTermDate = null;
                switch (CO_TERM_BASIS)
                        {
                    case END_DATE_EARLIEST:
                        stCoTermDate = stMaintEndDateEarliest;
                        break;
                    case END_DATE_LATEST:
                        stCoTermDate = stMaintEndDateLatest;
                        break;
                }
                if (stCoTermDate) stCoTermDate = nlapiDateToString(nlapiAddMonths(nlapiStringToDate(stCoTermDate), 12));
                
                logger.debug(MSG_TITLE, 'stEndDateEarliest=' + stMaintEndDateEarliest
                            + '\n' + 'stEndDateLatest=' + stMaintEndDateLatest
                            + '\n' + 'Co-Term End Date:' + stCoTermDate
                    );

                if(stCoTermDate != null && stCoTermDate != undefined && stCoTermDate != ''){

                    var flMSProdListRate = getProductCurrentListRate(stProdId,arrItemCatsToCompute, MS_MODEL, stCoTermDate );
                    var flNewListRate = flMSProdListRate / 12 * flMSPercent / 100;
                    var intMaxTerm = computeTermInMonths(stMaintEndDateEarliest,stCoTermDate);
                    logger.debug(MSG_TITLE, 'flMSProdListRate=' + flMSProdListRate
                            + '\n' + 'flNewListRate=' + flNewListRate
                            + '\n' + 'intMaxTerm=' + intMaxTerm
                        );

                    /* Get Maintenance records and prorate values */
                    var arrMaintIBColumns = [
                        new nlobjSearchColumn('custrecord_install_base_end_date'),
                        new nlobjSearchColumn('custrecord_orignal_list_rate'),
                        new nlobjSearchColumn('custrecord_quantity')
                    ];
                    var arrMaintIBFilters = [
                        new nlobjSearchFilter('custrecord_install_base_end_date', null, 'isnotempty'),
                        new nlobjSearchFilter('custrecord_install_base_end_date', null, 'onorbefore', stCoTermDate),
                        new nlobjSearchFilter('custrecord_install_base_product', null, 'is', stProdId),
                        new nlobjSearchFilter('custrecord_renewal_processed_on', null, 'isempty'),
                        new nlobjSearchFilter('custrecord_renewals_exclusion', null, 'is', 'F'),
                        new nlobjSearchFilter('custrecord_install_base_type', null, 'anyof',[CONTRACT_TYPE_MAINTENANCE]),
                        new nlobjSearchFilter('custrecord_install_base_synch_status', null, 'anyof',[SYNCH_STATUS_ACTIVE,SYNCH_STATUS_EXPIRED]),
                        new nlobjSearchFilter('isinactive', null, 'is', 'F')
                    ];

                    var arrMaintIBResults = nlapiSearchRecord('customrecord_install_base', null, arrMaintIBFilters, arrMaintIBColumns);

                    if(arrMaintIBResults != null && arrMaintIBResults != undefined && arrMaintIBResults != ''){
                        for(var intMaintIBIdx =0; intMaintIBIdx < arrMaintIBResults.length; intMaintIBIdx++){
                            var stIBEndDate = arrMaintIBResults[intMaintIBIdx].getValue('custrecord_install_base_end_date');
                            var intIBTerm = computeTermInMonths(stIBEndDate,stCoTermDate);
                            var flIBListRate = arrMaintIBResults[intMaintIBIdx].getValue('custrecord_orignal_list_rate');
                            var intIBQty = arrMaintIBResults[intMaintIBIdx].getValue('custrecord_quantity');
                            var flTIMRatio = Math.abs(intIBTerm / intMaxTerm - 1);
                            var flRateRatio = Math.abs((flIBListRate * intIBQty) / flNewListRate);
                            var flIBProrate = Math.abs(flTIMRatio * flRateRatio);
                            flProratedRate += flIBProrate;
                            logger.debug(MSG_TITLE, 'Install Base=' + arrMaintIBResults[intMaintIBIdx].getId()
                                        + '\n' + 'stIBEndDate=' + stIBEndDate
                                        + '\n' + 'intIBTerm=' + intIBTerm
                                        + '\n' + 'flIBListRate=' + flIBListRate
                                        + '\n' + 'flTIMRatio=' + flTIMRatio
                                        + '\n' + 'flRateRatio=' + flRateRatio
                                        + '\n' + 'flIBProrate=' + flIBProrate
                                        + '\n' + 'flProratedRate=' + flProratedRate
                                    );
                        }
                        if(flProratedRate != 0){
                            flProratedRate = Math.round((1 - flProratedRate) * 10000)/100;
                        }
                        logger.debug(MSG_TITLE,'Prorated Rate = ' + flProratedRate);
                    }

                }

                if(flProratedRate > 0){
                    stCPR = flProratedRate + '%';
                    logger.debug(MSG_TITLE,'CPR = ' + stCPR);
                }
            }

        }
    }

    return stCPR;
}



/**
 * Check if a product record exists
 *
 * @return searchResult, null if not found.
 * @author Michael Sumulong
 * @version 1.0
 */
function SS_CheckProdExists(stProdLine,stBillTo,stEndUser){

    var arrProductFilters = [
        new nlobjSearchFilter('isinactive', null, 'is', 'F')
        ,new nlobjSearchFilter('custrecord_p_product_line', null, 'is', stProdLine)
        ,new nlobjSearchFilter('custrecord_bill_to_customer', null, 'is', stBillTo)
    ];

    if (stEndUser != null && stEndUser != undefined && stEndUser != '')
    {
        arrProductFilters.push(new nlobjSearchFilter('custrecord_end_user', null, 'anyof', stEndUser));
    }
    else
    {
        arrProductFilters.push(new nlobjSearchFilter('custrecord_end_user', null, 'anyof', '@NONE@'));
    }

    var arrProductResults = nlapiSearchRecord('customrecord_product', null, arrProductFilters);

    if(arrProductResults == null || arrProductResults == undefined || arrProductResults == ''){
        return null;
    }else{
        return arrProductResults;
    }

}




/**
 * Create a product record
 *
 * @return (string) Product record ID
 * @author Michael Sumulong
 * @version 1.0
 */
function SS_CreateProductRecord(stBillTo,stEndUser,stItem,stTransaction){
    // Create the product record
    var recProd = nlapiCreateRecord('customrecord_product');

    recProd.setFieldValue('custrecord_bill_to_customer', stBillTo);
    if (stEndUser != null && stEndUser != undefined && stEndUser != '')
    {
        recProd.setFieldValue('custrecord_end_user', stEndUser);
    }
    recProd.setFieldValue('custrecord_product_item', stItem);
    if (stTransaction != null && stTransaction != undefined && stTransaction != '')
    {
        recProd.setFieldValue('custrecord_p_original_tran', stTransaction);
    }

    var stProdId = nlapiSubmitRecord(recProd, true);

    return stProdId;
}


/**
 * This function will be used by the Synchronization scripts
 * 
 * @param {Object} REINSTATED_ENTITY_STATUS
 * @param {Object} EXPIRED_ENTITY_STATUS
 * @param {Object} beacon
 * @param {Object} arrCustId
 */
function reinstateCustomers(REINSTATED_ENTITY_STATUS,EXPIRED_ENTITY_STATUS,beacon)
{
    var logger = new Logger((nlapiGetContext().getExecutionContext() == 'userinterface'));
    var MSG_TITLE = 'SS_ReinstateCustomer';
    if(nlapiGetContext().getExecutionContext() != 'userinterface')
    {
        logger.enableDebug(); // comment this line to turn debugging off.
    }

    logger.debug(MSG_TITLE,'Reinstating Customers');

    var arrExpiredCustomerFilter = [
        new nlobjSearchFilter('entitystatus', '', 'is', EXPIRED_ENTITY_STATUS),
        new nlobjSearchFilter('custrecord_install_base_synch_status', 'CUSTRECORD_INSTALL_BASE_BILL_TO_CUSTOMER', 'is', SYNCH_STATUS_ACTIVE),
        new nlobjSearchFilter('internalid', null, 'noneof', '@NONE@')
    ];
    var arrExpiredCustomerColumns = [
        new nlobjSearchColumn('internalid', null, 'group')
    ];

    var arrExpiredCustomerResults = nlapiSearchRecord('customer', '', arrExpiredCustomerFilter, arrExpiredCustomerColumns);

    logger.debug(MSG_TITLE, 'Loop through customers');
    logger.indent();
    if (arrExpiredCustomerResults != null && arrExpiredCustomerResults != undefined && arrExpiredCustomerResults != '')
    {

        for (var idxExpiredCust = 0; idxExpiredCust < arrExpiredCustomerResults.length; idxExpiredCust++)
        {
            try
            {
                var stCustId = arrExpiredCustomerResults[idxExpiredCust].getValue('internalid','','group');
				
	            if(stCustId == null) continue;
				
                logger.debug(MSG_TITLE, 'Customer ID: ' + stCustId);
                        
                logger.debug(MSG_TITLE, 'Reinstating customer ' + stCustId);
                nlapiSubmitField('customer', stCustId, 'entitystatus', REINSTATED_ENTITY_STATUS, true);
            }
            catch(ex)
            {
                logger.debug(MSG_TITLE, 'Error Occurred.');
                if (ex.getDetails != undefined)
                {
                    nlapiLogExecution('ERROR', ex.getCode(), 'Reinstating customer ' + stCustId + ':' + ex.getDetails());
                }
                else
                {
                    nlapiLogExecution('ERROR', 'UNEXPECTED ERROR', 'Reinstating customer ' + stCustId + ':' + ex.toString());
                }
            }

            if(beacon != null && beacon != undefined && beacon != '')
            {
                /* For Paragraph Processing */
                if (beacon.endParagraph())
                {
                    break;
                }
                /* **************************/
            }
        }
    }
    logger.unindent();
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

    var arrMSTypeResults = nlapiSearchRecord('customrecord_mtce_support_types', '', '', arrMSTypeColumns);

    var arrMSTypes = new Array();
    var iMSTypeCount = 0;

    logger.debug(MSG_TITLE, 'Loop through M/S Types');
    logger.indent();
    if (arrMSTypeResults != null && arrMSTypeResults != undefined && arrMSTypeResults != '')
    {

        for (var i = 0; i < arrMSTypeResults.length; i++)
        {
            try
            {
                var stMSTypeId = arrMSTypeResults[i].getId();
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

    var arrFieldMapResults = nlapiSearchRecord('customrecord_swe_install_base_fld_maps', '', arrFieldMapFilters, arrFieldMapColumns);

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
