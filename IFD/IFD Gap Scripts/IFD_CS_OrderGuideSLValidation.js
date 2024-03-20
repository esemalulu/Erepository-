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
 * 1.00       21 Apr 2016     lochengco
 *
 */

/**
 * The recordType (internal id) corresponds to the "Applied To" record in your script deployment. 
 * @appliedtorecord recordType
 *   
 * @returns {Boolean} True to continue save, false to abort save
 */
function saveRecord_promptUser()
{
    try
    {
        var objContext = nlapiGetContext();
        var intTotalOrderGuideItem = nlapiGetLineItemCount('custpage_items_sublist');
        
        if (intTotalOrderGuideItem == 0)
        {
            alert(MESSAGES['empty_guide_items']);
            return false;
        }
        else
        {
            var bHasItemSelected = false;
            
            for (var intOrdGuideItemCount = 1; intOrdGuideItemCount <= intTotalOrderGuideItem; intOrdGuideItemCount++)
            {
                var stItemQty = nlapiGetLineItemValue('custpage_items_sublist', 'custpage_subcol_qty_to_ord', intOrdGuideItemCount);
                
                var intItemQty = OGSV.Parse.forceInt(stItemQty);
                
                if (intItemQty > 0)
                {
                    bHasItemSelected = true;
                    break;
                }
            }
            
            if (!bHasItemSelected)
            {
                alert(MESSAGES['zero_qty_guide_items']);
                return false;
            }
        }
        
        return true;
    }
    catch(error)
    {
         if (error.getDetails != undefined)
         {
             nlapiLogExecution('ERROR', 'Process Error', error.getCode() + ': '+ error.getDetails());
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
 * The recordType (internal id) corresponds to the "Applied To" record in your script deployment. 
 * @appliedtorecord recordType
 * 
 * @param {String} stType Sublist internal id
 * @param {String} stName Field internal id
 * @param {Number} intLinenum Optional line item number, starts from 1
 * @returns {Void}
 */
function fieldChanged_searchOrderGuide(stType, stName, intLinenum)
{
    try
    {
        if (stName == 'custpage_customer_order_guides')
        {
            nlapiSetFieldValue('custpage_action', 'search');
            window.ischanged = false;
            document.forms[0].submit();
            
            return;
        }
    }
    catch(error)
    {
         if (error.getDetails != undefined)
         {
             nlapiLogExecution('ERROR', 'Process Error', error.getCode() + ': '+ error.getDetails());
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
 * This funciton is used the the "Cancel" button from the suitelet
 */
function cancel_orderGuide()
{
    try
    {
        nlapiSetFieldValue('custpage_action', 'cancel');
        window.ischanged = false;
        document.forms[0].submit();
    }
    catch(error)
    {
         if (error.getDetails != undefined)
         {
             nlapiLogExecution('ERROR', 'Process Error', error.getCode() + ': '+ error.getDetails());
             throw error;
         }
         else
         {
             nlapiLogExecution('ERROR', 'Unexpected Error', error.toString());
             throw nlapiCreateError('99999', error.toString());
         }
    }
}

var OGSV = {};
OGSV.Parse =
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
        },
};